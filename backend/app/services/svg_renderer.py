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
from app.services.typography_resolver import resolve_typography
from app.services.metadata_resolver import resolve_metadata
from app.services.layout_resolver import resolve_layout

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

        preset_typography = rules_service.get_typography_preset(request.typography)
        self.typography = resolve_typography(preset_typography, request.typography_overrides)
        
        self.metadata = resolve_metadata(request.show_metadata, request.show_legend, request.metadata_options)
        self.layout = resolve_layout(request.element_transforms, request.layout_overrides)

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
            if self.metadata.show_title or self.metadata.show_subtitle:
                parts.append(self._render_title_block())
            if self.metadata.show_north_arrow:
                parts.append(self._render_north_arrow())
            if self.metadata.show_legend:
                parts.append(self._render_legend(clip_result))
            if self.metadata.show_scale_bar or self.metadata.show_data_credits:
                parts.append(self._render_metadata_and_scale(projector, clip_result))
        parts.append("</svg>")
        return "\n".join(p for p in parts if p)

    # ------------------------------------------------------------------ #

    def _get_transform(self, element_id: str, cx: float, cy: float) -> str:
        t = getattr(self.layout, element_id, None)
        if not t:
            return ""
        if t.x == 0.0 and t.y == 0.0 and t.scale == 1.0:
            return ""
        return f' transform="translate({cx:g}, {cy:g}) translate({t.x:g}, {t.y:g}) scale({t.scale:g}) translate({-cx:g}, {-cy:g})"'

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
        cx = self.canvas_w / 2.0
        cy = self.canvas_h / 2.0
        return f'<g id="rivers"{self._get_transform("rivers", cx, cy)}>{"".join(paths)}</g>'

    def _render_title_block(self) -> str:
        x = rc.TITLE_BLOCK_X * self.s_style
        title_y = (rc.TITLE_BLOCK_X + rc.TITLE_SIZE) * self.s_style
        subtitle_y = title_y + rc.SUBTITLE_SIZE * 1.8 * self.s_style
        cx = x + 300 * self.s_style
        cy = title_y + (subtitle_y - title_y) / 2
        out = [f'<g id="title_block"{self._get_transform("title_block", cx, cy)}>']
        if self.metadata.show_title and self.request.title:
            out.append(f'<text class="title" x="{x:g}" y="{title_y:g}">'
                       f'{escape(self.request.title)}</text>')
        if self.metadata.show_subtitle and self.request.subtitle:
            out.append(f'<text class="subtitle" x="{x:g}" y="{subtitle_y:g}">'
                       f'{escape(self.request.subtitle)}</text>')
        out.append('</g>')
        return "".join(out)

    def _render_north_arrow(self) -> str:
        cx = self.canvas_w - 300 * self.s_style
        cy = 350 * self.s_style
        s = 60 * self.s_style
        return (
            f'<g id="north_arrow"{self._get_transform("north_arrow", cx, cy)}>'
            f'<path d="M {cx:g} {cy - s * 2:g} L {cx - s * 0.8:g} {cy + s * 1.5:g} '
            f'L {cx:g} {cy + s * 0.8:g} Z" fill="{self.tokens["text_secondary"]}"/>'
            f'<path d="M {cx:g} {cy - s * 2:g} L {cx + s * 0.8:g} {cy + s * 1.5:g} '
            f'L {cx:g} {cy + s * 0.8:g} Z" fill="{self.tokens["background"]}"/>'
            f'<text x="{cx:g}" y="{cy - s * 2.5:g}" class="label" '
            f'text-anchor="middle">N</text>'
            f'</g>'
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
        cx = x + 150 * self.s_style
        cy = y0 + (len(classes) * step) / 2
        return f'<g id="legend"{self._get_transform("legend", cx, cy)}>{"".join(rows)}</g>'


    def _render_metadata_and_scale(self, projector: CoordinateProjector, clip_result: ClipResult) -> str:
        right = self.canvas_w - 300 * self.s_style
        y0 = self.canvas_h - 700 * self.s_style
        step = 70 * self.s_style

        lines: List[str] = []
        if self.metadata.show_data_credits:
            lines.extend([
                f"Data source: {rc.DATA_SOURCE}",
                f"Boundary source: {rc.BOUNDARY_SOURCE}",
                f"Projection: {rc.PROJECTION_LABEL}",
                f"Generated: {date.today().isoformat()}",
            ])
            
            if clip_result.metadata.distortion_warning:
                lines.append("Scale varies across map")
                
            if clip_result.metadata.confidence_level == "low":
                lines.append("Warning: High volume of repaired data")

        scale_bar_svg = ""

        # Scale bar honesty rule (§6.2): omit when distortion spread > 1.20.
        if self.metadata.show_scale_bar and clip_result.metadata.scale_bar_valid:
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
                )

        text_rows = "".join(
            f'<text class="label" x="{right:g}" y="{y0 + i * step:g}" '
            f'text-anchor="end">{escape(line)}</text>'
            for i, line in enumerate(lines)
        )
        cx = right - 150 * self.s_style
        cy = y0 + (len(lines) * step) / 2
        return f'<g id="metadata"{self._get_transform("metadata", cx, cy)}>{scale_bar_svg}{text_rows}</g>'
