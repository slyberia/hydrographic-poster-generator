"""SVG poster renderer.

Normative math source: docs/PROJECTION_SCALEBAR_NOTES.md. All coordinate
mapping goes through one CoordinateProjector instance (§4); the scale bar
reads the same projector (§6). The canvas is parametric so the Phase 5
re-render path (§10) can target non-2:3 aspects with proportional zones.
"""

import math
from datetime import date
from typing import List, Optional, Tuple
from xml.sax.saxutils import escape

from app.config import render_constants as rc
from app.models.clip_models import ClipResult
from app.models.render_models import RenderRequest
from app.services.coordinate_projector import CoordinateProjector
from app.services.rules_service import rules_service

DISPLAY_CLASSES = ["major", "primary", "secondary", "minor", "headwater"]


def _nice_number_leq(value: float) -> float:
    """Largest {1, 2, 5}·10^n that is <= value (contract §6.1)."""
    if value <= 0:
        return 0
    exp = math.floor(math.log10(value))
    for mantissa in (5, 2, 1):
        candidate = mantissa * 10 ** exp
        if candidate <= value:
            return candidate
    return 10 ** (exp - 1) * 5


class SVGRenderer:
    def __init__(self, request: RenderRequest,
                 canvas: Tuple[int, int] = (rc.CANVAS_W, rc.CANVAS_H)):
        self.request = request
        self.canvas_w, self.canvas_h = canvas
        # Style lengths (strokes, type) scale off the reference canvas (§10).
        self.s_style = min(self.canvas_w / rc.CANVAS_W, self.canvas_h / rc.CANVAS_H)

        resolved_style = rules_service.resolve_style(request.style)
        self.tokens = resolved_style.tokens
        
        # Palette fallbacks: presets define 8 tokens; layout chrome maps onto
        # them rather than extending the preset schema (§ review decision).
        self.tokens.setdefault("accent", self.tokens["feature_major"])
        self.tokens.setdefault("scale_bar", self.tokens["text_secondary"])
        self.tokens.setdefault("metadata", self.tokens["text_secondary"])

        self.typography = rules_service.get_typography_preset(request.typography)

        if request.design_asset_mode:
            m = rc.ASSET_MARGIN_F * min(self.canvas_w, self.canvas_h)
            self.zone = (m, m, self.canvas_w - 2 * m, self.canvas_h - 2 * m)
        else:
            self.zone = (
                rc.ZONE_X_F * self.canvas_w,
                rc.ZONE_Y_F * self.canvas_h,
                rc.ZONE_W_F * self.canvas_w,
                rc.ZONE_H_F * self.canvas_h,
            )

    # ------------------------------------------------------------------ #

    def generate_svg(self, clip_result: ClipResult) -> str:
        bbox = clip_result.metadata.bbox_3857
        if not bbox:
            raise ValueError("ClipResult.metadata.bbox_3857 is required for rendering")

        projector = CoordinateProjector(bbox, self.zone)

        parts = [self._svg_open(), self._style_block()]
        if not self.request.design_asset_mode:
            parts.append(
                f'<rect width="{self.canvas_w}" height="{self.canvas_h}" '
                f'fill="{self.tokens["background"]}"/>'
            )
        parts.append(self._render_rivers(clip_result, projector))
        if not self.request.design_asset_mode:
            parts.append(self._render_title_block())
            parts.append(self._render_north_arrow())
            if self.request.show_legend:
                parts.append(self._render_legend(clip_result))
            if self.request.show_metadata:
                parts.append(self._render_metadata_and_scale(projector, clip_result))
        parts.append("</svg>")
        return "\n".join(p for p in parts if p)

    # ------------------------------------------------------------------ #

    def _get_transform(self, element_id: str) -> str:
        if not self.request.element_transforms:
            return ""
        t = self.request.element_transforms.get(element_id)
        if not t:
            return ""
        x = t.get("x", 0)
        y = t.get("y", 0)
        s = t.get("scale", 1.0)
        if x == 0 and y == 0 and s == 1.0:
            return ""
        return f' transform="translate({x:g},{y:g}) scale({s:g})"'

    def _svg_open(self) -> str:
        # Root element contract (§14): viewBox + explicit width/height,
        # default preserveAspectRatio. Never set preserveAspectRatio="none".
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" '
            f'viewBox="0 0 {self.canvas_w} {self.canvas_h}" '
            f'width="{self.canvas_w}" height="{self.canvas_h}">'
        )

    def _style_block(self) -> str:
        t = self.tokens
        typ = self.typography
        families = {typ.title_font, typ.subtitle_font}
        imports = "".join(
            f"@import url('https://fonts.googleapis.com/css2?family="
            f"{f.replace(' ', '+')}:wght@300;400;500;600;700&amp;display=swap');"
            for f in sorted(families)
        )
        strokes = "".join(
            f".{cls}{{stroke:{t[f'feature_{cls}']};"
            f"stroke-width:{w * self.s_style:g};}}"
            for cls, w in rc.STROKE_WIDTHS.items()
        )
        return (
            "<style>"
            f"{imports}"
            f"path.river{{fill:none;stroke-linecap:round;stroke-linejoin:round;}}"
            f"{strokes}"
            f".title{{font-family:'{typ.title_font}',sans-serif;"
            f"font-weight:{typ.title_weight};letter-spacing:{typ.title_tracking};"
            f"font-size:{rc.TITLE_SIZE * self.s_style:g}px;fill:{t['text_primary']};}}"
            f".subtitle{{font-family:'{typ.subtitle_font}',sans-serif;"
            f"font-weight:{typ.subtitle_weight};letter-spacing:{typ.subtitle_tracking};"
            f"font-size:{rc.SUBTITLE_SIZE * self.s_style:g}px;fill:{t['text_secondary']};}}"
            f".label{{font-family:'{typ.subtitle_font}',sans-serif;"
            f"font-size:{48 * self.s_style:g}px;fill:{t['metadata']};}}"
            f".scalebar{{stroke:{t['scale_bar']};stroke-width:{4 * self.s_style:g};}}"
            "</style>"
        )

    def _render_rivers(self, clip_result: ClipResult,
                       projector: CoordinateProjector) -> str:
        paths = []
        for feature in clip_result.features:
            geometry = feature.get("geometry") or {}
            gtype = geometry.get("type")
            coords = geometry.get("coordinates")
            if not coords:
                continue
            # Normalize to list-of-lines (§5.1): one code path for both types.
            if gtype == "LineString":
                lines = [coords]
            elif gtype == "MultiLineString":
                lines = coords
            else:
                continue

            subpaths = []
            for line in lines:
                pts = []
                for x, y in line:
                    p = projector.project(x, y)
                    if not pts or pts[-1] != p:  # dedupe after rounding (§5.2)
                        pts.append(p)
                if len(pts) >= 2:
                    d = "M" + " L".join(f"{px:g},{py:g}" for px, py in pts)
                    subpaths.append(d)
            if not subpaths:
                continue

            cls = feature.get("properties", {}).get("display_class", "minor")
            if cls not in DISPLAY_CLASSES:
                cls = "minor"
            props = feature.get("properties", {})
            hr_id = props.get("hydrorivers_id", "")
            s_order = props.get("stream_order", "")
            up_area = props.get("upstream_area", "")
            length = props.get("length_km", "")
            paths.append(
                f'<path class="river {cls}" '
                f'data-river-id="{hr_id}" '
                f'data-stream-order="{s_order}" '
                f'data-upstream-area="{up_area}" '
                f'data-length-km="{length}" '
                f'data-display-class="{cls}" '
                f'd="{" ".join(subpaths)}"/>'
            )
        return f'<g id="rivers"{self._get_transform("rivers")}>{"".join(paths)}</g>'

    def _render_title_block(self) -> str:
        x = rc.TITLE_BLOCK_X * self.s_style
        title_y = (rc.TITLE_BLOCK_X + rc.TITLE_SIZE) * self.s_style
        subtitle_y = title_y + rc.SUBTITLE_SIZE * 1.8 * self.s_style
        out = []
        if self.request.title:
            out.append(f'<text class="title"{self._get_transform("title")} x="{x:g}" y="{title_y:g}">'
                       f'{escape(self.request.title)}</text>')
        if self.request.subtitle:
            out.append(f'<text class="subtitle"{self._get_transform("subtitle")} x="{x:g}" y="{subtitle_y:g}">'
                       f'{escape(self.request.subtitle)}</text>')
        return "".join(out)

    def _render_north_arrow(self) -> str:
        cx = self.canvas_w - 300 * self.s_style
        cy = 350 * self.s_style
        s = 60 * self.s_style
        return (
            f'<g id="north-arrow"{self._get_transform("north-arrow")} fill="{self.tokens["text_secondary"]}">'
            f'<polygon points="{cx:g},{cy - s:g} {cx - s * 0.5:g},{cy + s * 0.6:g} '
            f'{cx:g},{cy + s * 0.2:g} {cx + s * 0.5:g},{cy + s * 0.6:g}"/>'
            f'<text class="label" x="{cx:g}" y="{cy + s * 1.6:g}" '
            f'text-anchor="middle">N</text></g>'
        )

    def _render_legend(self, clip_result: ClipResult) -> str:
        present = {f.get("properties", {}).get("display_class")
                   for f in clip_result.features}
        classes = [c for c in DISPLAY_CLASSES if c in present]
        if not classes:
            return ""
        x = 300 * self.s_style
        y0 = self.canvas_h - 700 * self.s_style
        step = 90 * self.s_style
        rows = []
        for i, cls in enumerate(classes):
            y = y0 + i * step
            w = rc.STROKE_WIDTHS[cls] * self.s_style
            rows.append(
                f'<line x1="{x:g}" y1="{y:g}" x2="{x + 200 * self.s_style:g}" '
                f'y2="{y:g}" stroke="{self.tokens[f"feature_{cls}"]}" '
                f'stroke-width="{max(w, 2 * self.s_style):g}" stroke-linecap="round"/>'
                f'<text class="label" x="{x + 260 * self.s_style:g}" '
                f'y="{y + 16 * self.s_style:g}">{cls.capitalize()}</text>'
            )
        return f'<g id="legend"{self._get_transform("legend")}>{"".join(rows)}</g>'


    def _render_metadata_and_scale(self, projector: CoordinateProjector, clip_result: ClipResult) -> str:
        right = self.canvas_w - 300 * self.s_style
        y0 = self.canvas_h - 700 * self.s_style
        step = 70 * self.s_style

        lines: List[str] = [
            f"Data source: {rc.DATA_SOURCE}",
            f"Boundary source: {rc.BOUNDARY_SOURCE}",
            f"Projection: {rc.PROJECTION_LABEL}",
            f"Generated: {date.today().isoformat()}",
        ]
        
        if clip_result.metadata.distortion_warning:
            lines.append("Scale varies across map")
            
        if clip_result.metadata.confidence_level == "low":
            lines.append("Warning: High volume of repaired data")

        scale_bar_svg = ""

        # Scale bar honesty rule (§6.2): omit when distortion spread > 1.20.
        if not clip_result.metadata.scale_bar_valid:
            pass # Scale bar hidden, warning already added to metadata block
        else:
            # ground_meters_per_px is already in actual-canvas px (§6.1);
            # only the target bar length scales with the canvas.
            m_per_px = projector.ground_meters_per_px()
            nice_m = _nice_number_leq(rc.SCALE_BAR_TARGET_PX * self.s_style * m_per_px)
            if nice_m > 0:
                bar_px = nice_m / m_per_px
                label = (f"{nice_m / 1000:g} km" if nice_m >= 1000
                         else f"{nice_m:g} m") + " (approx.)"
                bar_y = y0 - 120 * self.s_style
                scale_bar_svg = (
                    f'<g id="scale-bar"{self._get_transform("scale-bar")}>'
                    f'<line class="scalebar" x1="{right - bar_px:g}" y1="{bar_y:g}" '
                    f'x2="{right:g}" y2="{bar_y:g}"/>'
                    f'<line class="scalebar" x1="{right - bar_px:g}" '
                    f'y1="{bar_y - 15 * self.s_style:g}" x2="{right - bar_px:g}" '
                    f'y2="{bar_y + 15 * self.s_style:g}"/>'
                    f'<line class="scalebar" x1="{right:g}" '
                    f'y1="{bar_y - 15 * self.s_style:g}" x2="{right:g}" '
                    f'y2="{bar_y + 15 * self.s_style:g}"/>'
                    f'<text class="label" x="{right:g}" '
                    f'y="{bar_y - 30 * self.s_style:g}" text-anchor="end">{label}</text>'
                    f'</g>'
                )

        text_rows = "".join(
            f'<text class="label" x="{right:g}" y="{y0 + i * step:g}" '
            f'text-anchor="end">{escape(line)}</text>'
            for i, line in enumerate(lines)
        )
        return f'{scale_bar_svg}<g id="metadata"{self._get_transform("metadata")}>{text_rows}</g>'
