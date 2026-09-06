"""Procedural benchmark recipes. Derivatives are generated and discarded in memory."""

import io
from dataclasses import dataclass, asdict
import numpy as np
import cv2
from affine import Affine
from PIL import Image
from app.models.georef_models import RecoveryOptions
from app.services.georef_service import (
    build_manifest,
    render_poster,
    manifest_affine,
    frame_box,
)
from app.services.georef_recovery import recover_result
from app.services.georef_validation import apply_affine, ground_errors, error_summary


@dataclass(frozen=True)
class Recipe:
    name: str
    rotation: float = 0
    scale_x: float = 1
    scale_y: float = 1
    crop_fraction: float = 0
    jpeg_quality: int | None = None


RECIPES = [
    Recipe("unchanged"),
    Recipe("rotation_17", rotation=17),
    Recipe("rotation_90", rotation=90),
    Recipe("resize", scale_x=0.75, scale_y=0.75),
    Recipe("anisotropic", scale_x=0.85, scale_y=1.1),
    Recipe("crop", crop_fraction=0.10),
    Recipe("jpeg", jpeg_quality=70),
    Recipe(
        "combined",
        rotation=-12,
        scale_x=0.9,
        scale_y=1.05,
        crop_fraction=0.05,
        jpeg_quality=80,
    ),
]


def alter(image, recipe):
    width, height = image.size
    transform = (
        Affine.rotation(recipe.rotation)
        * Affine.scale(recipe.scale_x, recipe.scale_y)
        * Affine.translation(-width / 2, -height / 2)
    )
    corners = apply_affine(
        transform, [[0, 0], [width, 0], [width, height], [0, height]]
    )
    low = np.floor(corners.min(axis=0))
    high = np.ceil(corners.max(axis=0))
    transform = Affine.translation(-low[0], -low[1]) * transform
    out_size = (int(high[0] - low[0]), int(high[1] - low[1]))
    # OpenCV measures centers from zero; exported affine uses pixel-edge coordinates.
    cv_transform = (
        Affine.translation(-0.5, -0.5) * transform * Affine.translation(0.5, 0.5)
    )
    rgba = np.asarray(image)
    border = tuple(int(v) for v in rgba[0, 0])
    changed = cv2.warpAffine(
        rgba,
        np.array(list(cv_transform)[:6]).reshape(2, 3),
        out_size,
        flags=cv2.INTER_LINEAR,
        borderValue=border,
    )
    margin_x, margin_y = (
        int(out_size[0] * recipe.crop_fraction),
        int(out_size[1] * recipe.crop_fraction),
    )
    if margin_x or margin_y:
        changed = changed[
            margin_y : out_size[1] - margin_y, margin_x : out_size[0] - margin_x
        ]
        transform = Affine.translation(-margin_x, -margin_y) * transform
    result = Image.fromarray(changed)
    if recipe.jpeg_quality is not None:
        data = io.BytesIO()
        result.convert("RGB").save(data, format="JPEG", quality=recipe.jpeg_quality)
        result = Image.open(io.BytesIO(data.getvalue())).convert("RGBA")
    return result, transform


def evaluate(clip, request, recipes=RECIPES):
    manifest = build_manifest(clip, request)
    original = render_poster(clip, request)
    results = []
    for recipe in recipes:
        image, truth = alter(original, recipe)
        record = {
            "recipe": asdict(recipe),
            "truth_canonical_to_upload": list(truth)[:6],
        }
        try:
            _, qc, _, _ = recover_result(image, clip, manifest, RecoveryOptions())
            recovered = Affine(*qc.metrics["canonical_to_upload"])
            left, top, right, bottom = frame_box(manifest)
            grid = np.array(
                [
                    [x, y]
                    for x in np.linspace(left, right, 9)
                    for y in np.linspace(top, bottom, 9)
                ]
            )
            uploaded = apply_affine(truth, grid)
            visible = (
                (uploaded[:, 0] >= 0)
                & (uploaded[:, 0] < image.width)
                & (uploaded[:, 1] >= 0)
                & (uploaded[:, 1] < image.height)
            )
            grid = grid[visible]
            uploaded = uploaded[visible]
            inverse = ~manifest_affine(manifest)
            truth_world = apply_affine(inverse, grid)
            recovered_world = apply_affine(inverse * ~recovered, uploaded)
            errors = ground_errors(truth_world, recovered_world, manifest)
            record.update(
                status=qc.status,
                transformation=qc.transformation,
                qc=qc.metrics,
                independent_grid=error_summary(errors),
                p95_error_pixels=float(
                    np.percentile(
                        np.linalg.norm(
                            apply_affine(recovered, grid) - uploaded, axis=1
                        ),
                        95,
                    )
                ),
            )
        except ValueError as exc:
            record.update(status="failed", reason=str(exc))
        results.append(record)
    return {
        "version": 1,
        "source_reference": manifest.hydro_rivers_reference,
        "renderer": manifest.generator,
        "recipes": results,
        "retention": "Recipes and numeric results only; derivative images discarded",
    }
