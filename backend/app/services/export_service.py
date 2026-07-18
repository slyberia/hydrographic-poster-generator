"""Export pipeline: SVG → SVG/PNG/PDF at preset or custom sizes.

Normative math source: docs/PROJECTION_SCALEBAR_NOTES.md Part II.
Two paths only (§9): same-aspect sizes rasterize the reference-canvas SVG
with width-only scaling; mismatched aspects re-render the SVG at the target
canvas (§10). Mismatched raster dimensions are never passed to CairoSVG —
that letterboxes with transparent bars (verified failure mode).
"""

from dataclasses import dataclass
from typing import Optional, Tuple


from app.config import render_constants as rc
from app.models.clip_models import ClipResult
from app.models.export_models import ExportRequest
from app.services.svg_renderer import SVGRenderer

ASPECT_TOLERANCE = 1e-6


@dataclass(frozen=True)
class SizeSpec:
    width: int
    height: int
    # Physical print dimensions in inches; sets the PDF page size (§11.2).
    physical_in: Optional[Tuple[float, float]] = None


SIZE_REGISTRY = {
    "digital_poster": SizeSpec(1600, 2400),
    "high_res_poster": SizeSpec(3600, 5400),
    "instagram_portrait": SizeSpec(1080, 1350),
    "print_18x24": SizeSpec(5400, 7200, physical_in=(18.0, 24.0)),
    "square_design_asset": SizeSpec(3000, 3000),
}

MEDIA_TYPES = {
    "svg": "image/svg+xml",
    "png": "image/png",
    "pdf": "application/pdf",
}


class ExportService:
    @staticmethod
    def resolve_size(request: ExportRequest) -> SizeSpec:
        if request.export_size == "custom":
            return SizeSpec(request.custom_width, request.custom_height)
        return SIZE_REGISTRY[request.export_size]

    @staticmethod
    def export(clip_result: ClipResult, request: ExportRequest) -> Tuple[bytes, str, str]:
        """Returns (payload_bytes, media_type, filename)."""
        size = ExportService.resolve_size(request)
        ref_aspect = rc.CANVAS_W / rc.CANVAS_H
        target_aspect = size.width / size.height

        if abs(target_aspect - ref_aspect) < ASPECT_TOLERANCE:
            canvas = (rc.CANVAS_W, rc.CANVAS_H)   # scale path (§11.1)
        else:
            canvas = (size.width, size.height)    # re-render path (§10)

        svg = SVGRenderer(request, canvas=canvas).generate_svg(clip_result)

        # Post-condition of the two-path rule: raster dims match SVG aspect.
        assert abs(size.width / size.height - canvas[0] / canvas[1]) < 1e-3, \
            "export dimensions do not match rendered SVG aspect"

        fmt = request.export_format
        mode = "asset" if request.design_asset_mode else "poster"
        filename = f"hydro_{mode}_{request.export_size}.{fmt}"

        if fmt == "svg":
            return svg.encode("utf-8"), MEDIA_TYPES["svg"], filename

        if fmt == "png":
            import cairosvg
            payload = cairosvg.svg2png(bytestring=svg.encode("utf-8"),
                                       output_width=size.width)
            return payload, MEDIA_TYPES["png"], filename

        # PDF. CairoSVG treats px as CSS 96/in; page pt = px * 0.75 (§11.2).
        # For physical print sizes, output dims = inches * 96 give an exact
        # page (verified: 18x24in -> 1296x1728 pt).
        if size.physical_in:
            out_w = int(round(size.physical_in[0] * 96))
            out_h = int(round(size.physical_in[1] * 96))
        else:
            out_w, out_h = size.width, size.height
        import cairosvg
        payload = cairosvg.svg2pdf(bytestring=svg.encode("utf-8"),
                                   output_width=out_w, output_height=out_h)
        return payload, MEDIA_TYPES["pdf"], filename
