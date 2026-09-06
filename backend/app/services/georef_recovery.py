"""Recovery v1: bounded canonical-mask registration, similarity then affine."""

import copy
import cv2
import numpy as np
from PIL import Image
from affine import Affine
from app.models.export_models import ExportRequest
from app.models.georef_models import GroundControlPoint
from app.services.georef_service import (
    render_poster,
    manifest_affine,
    frame_box,
    write_geotiff,
)
from app.services.georef_validation import (
    river_mask,
    apply_affine,
    validate_raster,
    alignment_preview,
)

MAX_REGISTRATION_SIDE = 1600


def small_mask(image, manifest):
    factor = min(1, MAX_REGISTRATION_SIDE / max(image.size))
    width, height = (
        max(1, round(image.width * factor)),
        max(1, round(image.height * factor)),
    )
    scaled = image.resize((width, height), Image.Resampling.LANCZOS)
    mask = river_mask(scaled, manifest).astype("uint8") * 255
    distance = cv2.distanceTransform(255 - mask, cv2.DIST_L2, cv2.DIST_MASK_PRECISE)
    ribbons = np.round(255 * np.exp(-((distance / 4) ** 2))).astype("uint8")
    return ribbons, image.width / width, image.height / height


def correspondences(image, clip, manifest):
    settings = dict(manifest.render_settings)
    settings.pop("resolved_colors", None)
    settings.pop("renderer_canvas", None)
    settings.pop("rule_versions", None)
    request = ExportRequest.model_validate(settings)
    canonical = render_poster(clip, request, rivers_only=True)
    source, sx, sy = small_mask(canonical, manifest)
    target, tx, ty = small_mask(image, manifest)
    sift = cv2.SIFT_create(nfeatures=2500, contrastThreshold=0.02, edgeThreshold=15)
    kp_a, desc_a = sift.detectAndCompute(source, None)
    kp_b, desc_b = sift.detectAndCompute(target, None)
    if desc_a is None or desc_b is None or min(len(desc_a), len(desc_b)) < 12:
        raise ValueError(
            "Too few distinctive river landmarks. Select the correct source or provide control points."
        )
    matcher = cv2.BFMatcher(cv2.NORM_L2)
    forward = matcher.knnMatch(desc_a, desc_b, k=2)
    backward = matcher.knnMatch(desc_b, desc_a, k=2)
    reverse = {
        m.queryIdx: m.trainIdx
        for pair in backward
        if len(pair) == 2
        for m, n in [pair]
        if m.distance < 0.65 * n.distance
    }
    accepted = [
        m
        for pair in forward
        if len(pair) == 2
        for m, n in [pair]
        if m.distance < 0.65 * n.distance and reverse.get(m.trainIdx) == m.queryIdx
    ]
    accepted.sort(key=lambda m: (m.distance, m.queryIdx))
    # One point per image neighborhood avoids several orientations at one SIFT keypoint.
    points = []
    seen = set()
    inverse = ~manifest_affine(manifest)
    for m in accepted:
        ax, ay = kp_a[m.queryIdx].pt
        bx, by = kp_b[m.trainIdx].pt
        key = (round(ax / 5), round(ay / 5), round(bx / 5), round(by / 5))
        if key in seen:
            continue
        seen.add(key)
        world = inverse * ((ax + 0.5) * sx, (ay + 0.5) * sy)
        points.append(
            GroundControlPoint(
                source_x=world[0],
                source_y=world[1],
                pixel_x=(bx + 0.5) * tx,
                pixel_y=(by + 0.5) * ty,
                score=max(0, 1 - float(m.distance) / 600),
            )
        )
        if len(points) >= 200:
            break
    return points


def fit_registration(gcps, manifest, model, image_size):
    if len(gcps) < 12:
        raise ValueError(
            "At least 12 distinct correspondences are required, including withheld validation points"
        )
    canonical = apply_affine(
        manifest_affine(manifest), np.array([[g.source_x, g.source_y] for g in gcps])
    )
    pixels = np.array([[g.pixel_x, g.pixel_y] for g in gcps])
    if (
        not np.isfinite(canonical).all()
        or not np.isfinite(pixels).all()
        or (pixels < 0).any()
        or (pixels[:, 0] > image_size[0]).any()
        or (pixels[:, 1] > image_size[1]).any()
        or (canonical < 0).any()
        or (canonical[:, 0] > manifest.render_dimensions["width"]).any()
        or (canonical[:, 1] > manifest.render_dimensions["height"]).any()
    ):
        raise ValueError(
            "Control points must lie inside the source poster and uploaded image"
        )
    # Split before RANSAC, so withheld matches never influence fit or inlier selection.
    rng = np.random.default_rng(20260905)
    order = rng.permutation(len(gcps))
    hold = order[: max(3, len(gcps) // 4)]
    train = order[max(3, len(gcps) // 4) :]
    tolerance = 3 * max(1, max(image_size) / MAX_REGISTRATION_SIDE)
    cv2.setRNGSeed(260905)
    estimator = (
        cv2.estimateAffinePartial2D if model == "similarity" else cv2.estimateAffine2D
    )
    matrix, inliers = estimator(
        canonical[train],
        pixels[train],
        method=cv2.RANSAC,
        ransacReprojThreshold=tolerance,
        maxIters=4000,
        confidence=0.995,
        refineIters=10,
    )
    if matrix is None or inliers is None or int(inliers.sum()) < 6:
        raise ValueError("Registration has insufficient inliers")
    affine = Affine(*matrix.ravel())
    singular = np.linalg.svd(matrix[:, :2], compute_uv=False)
    if (
        np.linalg.det(matrix[:, :2]) <= 0
        or singular.min() < 0.03
        or singular.max() > 30
        or singular.max() / singular.min() > 4
    ):
        raise ValueError("Unstable or unsupported image transformation")
    errors = np.linalg.norm(apply_affine(affine, canonical) - pixels, axis=1)
    held_good = np.mean(errors[hold] <= tolerance * 2)
    if held_good < 0.75 or np.median(errors[hold]) > tolerance:
        raise ValueError(
            "Independent withheld landmarks do not validate this registration"
        )
    hull = cv2.convexHull(
        canonical[train][inliers.ravel().astype(bool)].astype("float32")
    )
    frame = manifest.map_frame
    coverage = cv2.contourArea(hull) / max(1, frame["width"] * frame["height"])
    if coverage < 0.015:
        raise ValueError("Control points are too clustered for a stable georeference")
    updated = copy.deepcopy(gcps)
    inlier_indices = set(train[inliers.ravel().astype(bool)])
    for i, g in enumerate(updated):
        g.used_for_fit = bool(i in train)
        g.is_inlier = (
            bool(i in inlier_indices)
            if g.used_for_fit
            else bool(errors[i] <= tolerance * 2)
        )
        g.residual = float(errors[i])
    return (
        affine,
        updated,
        {
            "inlier_count": len(inlier_indices),
            "withheld_count": len(hold),
            "withheld_match_ratio": float(held_good),
            "withheld_median_px": float(np.median(errors[hold])),
            "landmark_coverage": float(coverage),
        },
    )


def recover_result(image, clip, manifest, options):
    gcps = options.gcps or correspondences(image, clip, manifest)
    models = (
        ["similarity", "affine"] if options.transform == "auto" else [options.transform]
    )
    candidates = []
    reasons = []
    for model in models:
        try:
            registered, points, fit_metrics = fit_registration(
                gcps, manifest, model, image.size
            )
            left, top, right, bottom = frame_box(manifest)
            corners = apply_affine(
                registered, [[left, top], [right, top], [right, bottom], [left, bottom]]
            )
            x0, y0 = np.maximum(0, np.floor(corners.min(axis=0))).astype(int)
            x1, y1 = np.minimum(image.size, np.ceil(corners.max(axis=0))).astype(int)
            if x1 <= x0 or y1 <= y0:
                raise ValueError("Recovered map frame is outside the uploaded image")
            cropped = image.crop((x0, y0, x1, y1))
            rgba = np.array(cropped)
            polygon = np.round(corners - [x0, y0]).astype("int32")
            valid = np.zeros(rgba.shape[:2], dtype="uint8")
            cv2.fillConvexPoly(valid, polygon, 255)
            rgba[:, :, 3] = np.minimum(rgba[:, :, 3], valid)
            cropped = Image.fromarray(rgba)
            pixel_to_world = (
                ~manifest_affine(manifest) * ~registered * Affine.translation(x0, y0)
            )
            for g in points:
                g.pixel_x -= int(x0)
                g.pixel_y -= int(y0)
            qc, observed, reference = validate_raster(
                cropped,
                pixel_to_world,
                clip,
                manifest,
                mode="recovery",
                gcps=points,
                transformation=model,
            )
            qc.metrics.update(fit_metrics)
            qc.metrics["input_crop"] = [int(x0), int(y0), int(x1), int(y1)]
            qc.metrics["canonical_to_upload"] = list(registered)[:6]
            qc.metrics["gcp_residual_units"] = "uploaded pixels"
            qc.metrics["gcps_coordinate_space"] = "output cropped raster pixel edges"
            candidates.append(
                (
                    qc.metrics.get("network_f1", 0),
                    model,
                    cropped,
                    pixel_to_world,
                    qc,
                    points,
                    alignment_preview(observed, reference),
                )
            )
        except ValueError as exc:
            reasons.append(f"{model}: {exc}")
    if not candidates:
        raise ValueError("; ".join(reasons) or "Unable to register this poster")
    candidates.sort(key=lambda c: c[0], reverse=True)
    best = candidates[0]
    # Prefer the simpler model if its independently measured network score is comparable.
    for candidate in candidates:
        if candidate[1] == "similarity" and candidate[0] >= best[0] - 0.015:
            best = candidate
            break
    _, _, cropped, pixel_to_world, qc, points, preview = best
    if qc.status == "failed":
        raise ValueError(
            "Recovered transform failed source-network validation; select the correct source or provide better control points"
        )
    return write_geotiff(cropped, pixel_to_world, manifest, qc), qc, points, preview
