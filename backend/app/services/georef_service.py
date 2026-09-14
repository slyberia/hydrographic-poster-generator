"""Native export and shared raster/provenance operations. All artifacts are in memory."""

import hashlib
import io
import math
from datetime import datetime, timezone
from uuid import uuid4

import numpy as np
from affine import Affine
from PIL import Image, PngImagePlugin
from rasterio.io import MemoryFile
from rasterio.enums import ColorInterp

from app.models.georef_models import PosterGeospatialManifest, RenderTransform
from app.services.coordinate_projector import CoordinateProjector
from app.services.export_service import ExportService
from app.services.svg_renderer import SVGRenderer
from app.services.rules_service import rules_service

MAX_IMAGE_PIXELS = 40_000_000
MAX_UPLOAD_BYTES = 25 * 1024 * 1024


def manifest_affine(manifest):
    t = manifest.geographic_to_pixel
    return Affine(t.x_scale, 0, t.x_offset, 0, t.y_scale, t.y_offset)


def frame_box(manifest):
    f = manifest.map_frame
    return int(f["x"]), int(f["y"]), int(f["x"] + f["width"]), int(f["y"] + f["height"])


def build_manifest(clip, request, *, poster_id=None):
    size = ExportService.resolve_size(request)
    canvas = ExportService.render_canvas(request)
    renderer = SVGRenderer(request, canvas=canvas)
    projector = CoordinateProjector(clip.metadata.bbox_3857 or [], renderer.zone)
    layout = renderer.layout.rivers
    factor = size.width / canvas[0]
    cx, cy = canvas[0] / 2, canvas[1] / 2
    # Exact composition of projector, SVG river-group transform, export scaling.
    scale = projector.scale * layout.scale * factor
    ox = (
        (projector.origin_x - projector.min_x * projector.scale) * layout.scale
        + cx * (1 - layout.scale)
        + layout.x
    ) * factor
    oy = (
        (projector.origin_y + projector.max_y * projector.scale) * layout.scale
        + cy * (1 - layout.scale)
        + layout.y
    ) * factor
    zx, zy, zw, zh = renderer.zone
    # The declared map zone follows river layout, then clips to the poster.
    left = max(
        0, math.floor((layout.scale * zx + cx * (1 - layout.scale) + layout.x) * factor)
    )
    top = max(
        0, math.floor((layout.scale * zy + cy * (1 - layout.scale) + layout.y) * factor)
    )
    right = min(
        size.width,
        math.ceil(
            (layout.scale * (zx + zw) + cx * (1 - layout.scale) + layout.x) * factor
        ),
    )
    bottom = min(
        size.height,
        math.ceil(
            (layout.scale * (zy + zh) + cy * (1 - layout.scale) + layout.y) * factor
        ),
    )
    if right <= left or bottom <= top:
        raise ValueError(
            "The river map is outside the poster. Reset its layout before georeferencing."
        )
    references = sorted(
        str(f.get("properties", {}).get("hydrorivers_id", "")) for f in clip.features
    )
    settings = request.model_dump(mode="json")
    settings["resolved_colors"] = renderer.tokens
    settings["rule_versions"] = rules_service.rule_versions
    settings["renderer_canvas"] = list(canvas)
    return PosterGeospatialManifest(
        poster_id=poster_id or uuid4(),
        generated_at=datetime.now(timezone.utc),
        generator={"name": "hydrographic-poster-generator", "version": "georef-2"},
        source={
            "rivers": clip.metadata.data_source,
            "boundary": clip.metadata.boundary_source,
            "geography_id": request.geography_id,
            "region_code": clip.metadata.region_code,
            "dataset_version": "HydroRIVERS v1.0",
        },
        source_crs="EPSG:4326",
        source_bbox_3857=clip.metadata.bbox_3857,
        source_bbox_4326=clip.metadata.bbox_4326,
        map_frame={"x": left, "y": top, "width": right - left, "height": bottom - top},
        render_dimensions={"width": size.width, "height": size.height},
        render_settings=settings,
        geographic_to_pixel=RenderTransform(
            x_scale=scale, x_offset=ox, y_scale=-scale, y_offset=oy
        ),
        hydro_rivers_reference={
            "table": "hydro_rivers",
            "id_field": "hydrorivers_id",
            "geography_id": request.geography_id,
            "min_stream_order": rules_service.get_density_preset(
                request.density_preset
            ).min_stream_order,
            "feature_count": len(clip.features),
            "feature_ids_sha256": hashlib.sha256(
                "\n".join(references).encode()
            ).hexdigest(),
            "geometry_in_manifest": False,
        },
    )


def decode_image(payload, declared_type=None):
    if len(payload) > MAX_UPLOAD_BYTES:
        raise ValueError("Image exceeds the 25 MB upload limit")
    try:
        with Image.open(io.BytesIO(payload)) as im:
            if im.format not in ("PNG", "JPEG", "TIFF"):
                raise ValueError("Upload a PNG, JPEG or TIFF poster")
            actual_type = {"PNG": "image/png", "JPEG": "image/jpeg", "TIFF": "image/tiff"}[im.format]
            if declared_type and declared_type.split(";")[0].lower() not in (actual_type, "application/octet-stream"):
                raise ValueError("Image content does not match its declared file type")
            if getattr(im, "n_frames", 1) != 1:
                raise ValueError("Upload a single-frame poster image")
            if im.width * im.height > MAX_IMAGE_PIXELS or max(im.size) > 9000:
                raise ValueError("Image exceeds the 40 megapixel / 9000 pixel limit")
            metadata = im.info.get("poster_manifest")
            metadata_size = sum(len(value.encode("utf-8")) if isinstance(value, str) else len(value)
                                for value in im.info.values() if isinstance(value, (str, bytes)))
            if metadata_size > 65536:
                raise ValueError("Embedded metadata exceeds 64 KB")
            if metadata is not None and (not isinstance(metadata, str) or len(metadata.encode("utf-8")) > 65536):
                raise ValueError("Embedded metadata exceeds 64 KB")
            image = im.convert("RGBA")
            image.load()
        return image, metadata
    except (OSError, SyntaxError, Image.DecompressionBombError) as exc:
        raise ValueError("Unable to decode the uploaded image") from exc


def png_bytes(image, manifest=None):
    out = io.BytesIO()
    metadata = PngImagePlugin.PngInfo()
    if manifest is not None:
        metadata.add_text("poster_manifest", manifest.model_dump_json())
    image.save(out, format="PNG", pnginfo=metadata)
    return out.getvalue()


def render_poster(clip, request, *, rivers_only=False):
    size = ExportService.resolve_size(request)
    if size.width * size.height > MAX_IMAGE_PIXELS:
        raise ValueError("Georeferencing exports are limited to 40 megapixels")
    renderer = SVGRenderer(request, canvas=ExportService.render_canvas(request))
    if rivers_only:
        projector = CoordinateProjector(clip.metadata.bbox_3857, renderer.zone)
        svg = "\n".join(
            [
                renderer._svg_open(),
                renderer._style_block(),
                renderer._render_rivers(clip, projector),
                "</svg>",
            ]
        )
    else:
        svg = renderer.generate_svg(clip)
    import cairosvg

    payload = cairosvg.svg2png(bytestring=svg.encode(), output_width=size.width)
    return Image.open(io.BytesIO(payload)).convert("RGBA")


def write_geotiff(image, pixel_to_world, manifest, qc=None):
    if qc:
        qc.metrics["raster"] = {"crs": "EPSG:3857", "width": image.width, "height": image.height,
            "pixel_to_world": list(pixel_to_world)[:6], "coordinate_convention": "pixel_edges"}
    array = np.asarray(image.convert("RGBA"))
    with MemoryFile() as memory:
        with memory.open(
            driver="GTiff",
            width=image.width,
            height=image.height,
            count=4,
            dtype="uint8",
            crs="EPSG:3857",
            transform=pixel_to_world,
            compress="deflate",
            predictor=2,
        ) as dataset:
            dataset.write(np.moveaxis(array, 2, 0))
            dataset.colorinterp = (
                ColorInterp.red,
                ColorInterp.green,
                ColorInterp.blue,
                ColorInterp.alpha,
            )
            dataset.update_tags(
                AREA_OR_POINT="Area", poster_manifest=manifest.model_dump_json()
            )
            if qc:
                dataset.update_tags(alignment_qc=qc.model_dump_json())
        return memory.read()


def viewer_image(payload):
    """Bounded display derivative; preserve the complete affine, including rotation/shear."""
    from rasterio.enums import Resampling
    with MemoryFile(payload) as memory, memory.open() as dataset:
        factor = min(1, 1000 / max(dataset.width, dataset.height))
        width, height = max(1, round(dataset.width * factor)), max(1, round(dataset.height * factor))
        pixels = dataset.read(out_shape=(4, height, width), resampling=Resampling.bilinear)
        transform = dataset.transform * Affine.scale(dataset.width / width, dataset.height / height)
    return png_bytes(Image.fromarray(np.moveaxis(pixels, 0, 2))), {
        "width": width, "height": height, "crs": "EPSG:3857", "pixel_to_world": list(transform)[:6]}


def native_result(clip, request, manifest=None):
    from app.services.georef_validation import validate_raster, alignment_preview

    manifest = manifest or build_manifest(clip, request)
    image = render_poster(clip, request).crop(frame_box(manifest))
    left, top, _, _ = frame_box(manifest)
    pixel_to_world = ~manifest_affine(manifest) * Affine.translation(left, top)
    qc, observed, reference = validate_raster(
        image, pixel_to_world, clip, manifest, mode="native"
    )
    payload = write_geotiff(image, pixel_to_world, manifest, qc)
    return payload, qc, alignment_preview(observed, reference)


def generate_native_geotiff(clip, request, manifest):
    payload, qc, _ = native_result(clip, request, manifest)
    return payload, qc
