"""Independent source-vector rasterization, network distances and withheld GCP checks."""

import io
import numpy as np
import cv2
from PIL import Image, ImageColor
from affine import Affine
from rasterio.features import rasterize
from scipy.ndimage import distance_transform_edt
from pyproj import CRS, Transformer
from app.models.georef_models import AlignmentQcReport

QC_VERSION = "network-v1"
MAX_QC_SIDE = 1600


def river_mask(image, manifest):
    rgba = np.asarray(image.convert("RGBA"))
    colors = manifest.render_settings.get("resolved_colors", {})
    palette = [
        ImageColor.getrgb(v)[:3] for k, v in colors.items() if k.startswith("feature_")
    ]
    rgb = rgba[:, :, :3].astype(np.float32)
    if palette:
        # Recover antialiased strokes by projecting onto each background->stroke color segment.
        bg = np.array(
            ImageColor.getrgb(colors.get("background", "#ffffff"))[:3], dtype=float
        )
        mask = np.zeros(rgba.shape[:2], dtype=bool)
        for color in palette:
            direction = np.array(color) - bg
            length = float(direction @ direction)
            if length < 100:
                continue
            coverage = np.sum((rgb - bg) * direction, axis=2) / length
            error = np.linalg.norm(
                (rgb - bg) - coverage[:, :, None] * direction, axis=2
            )
            mask |= (coverage > 0.12) & (coverage < 1.3) & (error < 30)
        if np.any(rgba[:, :, 3] < 250):
            # Transparent exports retain their stroke RGB rather than background blending.
            nearest = np.min(
                [np.linalg.norm(rgb - np.array(c), axis=2) for c in palette], axis=0
            )
            mask |= (nearest < 45) & (rgba[:, :, 3] > 30)
    else:
        gray = cv2.cvtColor(rgba, cv2.COLOR_RGBA2GRAY)
        border = np.concatenate([gray[0], gray[-1], gray[:, 0], gray[:, -1]])
        mask = abs(gray.astype(float) - float(np.median(border))) > 35
    return mask & (rgba[:, :, 3] > 30)


def local_transform(manifest):
    b = manifest.source_bbox_3857
    lon, lat = Transformer.from_crs(3857, 4326, always_xy=True).transform(
        (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
    )
    return Transformer.from_crs(
        3857,
        CRS.from_proj4(f"+proj=aeqd +lat_0={lat} +lon_0={lon} +datum=WGS84 +units=m"),
        always_xy=True,
    )


def ground_errors(world_a, world_b, manifest):
    projection = local_transform(manifest)
    ax, ay = projection.transform(world_a[:, 0], world_a[:, 1])
    bx, by = projection.transform(world_b[:, 0], world_b[:, 1])
    return np.hypot(np.asarray(ax) - bx, np.asarray(ay) - by)


def apply_affine(transform, points):
    points = np.asarray(points, dtype=float)
    return np.column_stack(
        [
            transform.a * points[:, 0] + transform.b * points[:, 1] + transform.c,
            transform.d * points[:, 0] + transform.e * points[:, 1] + transform.f,
        ]
    )


def error_summary(values):
    if not len(values):
        return {
            "count": 0,
            "median_m": None,
            "rmse_m": None,
            "p95_m": None,
            "max_m": None,
        }
    return {
        "count": len(values),
        "median_m": float(np.median(values)),
        "rmse_m": float(np.sqrt(np.mean(values**2))),
        "p95_m": float(np.percentile(values, 95)),
        "max_m": float(np.max(values)),
    }


def validate_raster(
    image,
    pixel_to_world,
    clip,
    manifest,
    *,
    mode,
    gcps=(),
    transformation="known_render_transform",
):
    factor = min(1, MAX_QC_SIDE / max(image.size))
    small = image.resize(
        (max(1, round(image.width * factor)), max(1, round(image.height * factor))),
        Image.Resampling.LANCZOS,
    )
    transform = pixel_to_world * Affine.scale(
        image.width / small.width, image.height / small.height
    )
    observed = river_mask(small, manifest)
    geometries = [
        f["geometry"]
        for f in clip.features
        if (f.get("geometry") or {}).get("type") in ("LineString", "MultiLineString")
    ]
    reference = (
        rasterize(
            [(g, 1) for g in geometries],
            out_shape=observed.shape,
            transform=transform,
            all_touched=True,
        ).astype(bool)
        if geometries
        else np.zeros_like(observed)
    )
    report = AlignmentQcReport(
        poster_id=manifest.poster_id,
        mode=mode,
        status="failed",
        river_count=clip.metadata.river_count,
        projected_feature_count=len(geometries),
        transformation=transformation,
    )
    metrics = {
        "version": QC_VERSION,
        "qc_width": small.width,
        "qc_height": small.height,
        "thresholds": {
            "pass_network_f1": 0.85,
            "review_network_f1": 0.6,
            "tolerance_qc_px": 3,
        },
        "threshold_status": "provisional; evaluate on regional benchmarks",
        "distance_crs": "local azimuthal equidistant centered on source bbox",
    }
    if not observed.any() or not reference.any():
        report.warnings.append("No visible river network to validate")
        report.metrics = metrics
        return report, observed, reference
    to_ref = distance_transform_edt(~reference)
    to_obs, nearest = distance_transform_edt(~observed, return_indices=True)
    precision = float(np.mean(to_ref[observed] <= 3))
    recall = float(np.mean(to_obs[reference] <= 3))
    f1 = 2 * precision * recall / max(precision + recall, 1e-12)
    # Sample independently rasterized source centers, locate closest observed ink,
    # and measure both in a local metric CRS (not Mercator "ground meters").
    y, x = np.where(reference)
    selected = np.linspace(0, len(x) - 1, min(len(x), 10000), dtype=int)
    x, y = x[selected], y[selected]
    expected_px = np.column_stack([x + 0.5, y + 0.5])
    actual_px = np.column_stack([nearest[1, y, x] + 0.5, nearest[0, y, x] + 0.5])
    displacements = ground_errors(
        apply_affine(transform, expected_px),
        apply_affine(transform, actual_px),
        manifest,
    )
    metrics.update(
        network_precision=precision,
        network_recall=recall,
        network_f1=f1,
        network_displacement=error_summary(displacements),
        network_p95_qc_px=float(np.percentile(to_obs[reference], 95)),
        coverage_fraction=float(np.mean(reference)),
    )
    report.status = "passed" if f1 >= 0.85 else "warning" if f1 >= 0.6 else "failed"
    if gcps:
        all_held = [g for g in gcps if not g.used_for_fit]
        held = [g for g in all_held if g.is_inlier]
        metrics["withheld_rejected_count"] = len(all_held) - len(held)
        metrics["withheld_reporting"] = (
            "All withheld correspondences reported; verified subset and rejected count also shown. Independent benchmark grid tests the full transform."
        )
        fitted = [g for g in gcps if g.used_for_fit and g.is_inlier]
        for label, points in (
            ("withheld", all_held),
            ("withheld_verified", held),
            ("fit", fitted),
        ):
            if points:
                pixels = np.array([[g.pixel_x, g.pixel_y] for g in points])
                world = np.array([[g.source_x, g.source_y] for g in points])
                metrics[label] = error_summary(
                    ground_errors(apply_affine(pixel_to_world, pixels), world, manifest)
                )
        if len(held) < 3:
            report.status = "warning" if report.status == "passed" else report.status
            report.warnings.append(
                "Fewer than three independent withheld correspondences"
            )
    if report.status != "passed":
        report.warnings.append(
            "Alignment requires review; confidence is based on measured overlap, not a probability"
        )
    if clip.metadata.distortion_warning:
        report.warnings.append(clip.metadata.distortion_warning)
    report.metrics = metrics
    return report, observed, reference


def alignment_preview(observed, reference):
    rgb = np.zeros((*observed.shape, 3), dtype=np.uint8)
    rgb[:] = [18, 25, 35]
    rgb[observed] = [244, 140, 50]
    rgb[reference] = [70, 175, 255]
    rgb[observed & reference] = [235, 245, 255]
    out = io.BytesIO()
    Image.fromarray(rgb).save(out, format="PNG")
    return out.getvalue()
