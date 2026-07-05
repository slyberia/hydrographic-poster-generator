from typing import Literal, Optional

from pydantic import BaseModel, model_validator

from app.models.render_models import RenderRequest

ExportFormat = Literal["svg", "png", "pdf"]
ExportSize = Literal[
    "digital_poster",
    "high_res_poster",
    "instagram_portrait",
    "print_18x24",
    "square_design_asset",
    "custom",
]

# Spec §19.2 custom size limits
CUSTOM_MIN_SHORT_SIDE = 1000
CUSTOM_MAX_LONG_SIDE = 9000


class ExportRequest(RenderRequest):
    export_format: ExportFormat = "png"
    export_size: ExportSize = "high_res_poster"
    # Required when export_size == "custom"
    custom_width: Optional[int] = None
    custom_height: Optional[int] = None

    @model_validator(mode="after")
    def validate_combination(self):
        # Contract §12: design assets are PNG/SVG only (transparent media).
        if self.design_asset_mode and self.export_format == "pdf":
            raise ValueError("Design asset exports support PNG and SVG only")
        if self.export_size == "custom":
            if not self.custom_width or not self.custom_height:
                raise ValueError("custom export_size requires custom_width and custom_height")
            short, long = sorted((self.custom_width, self.custom_height))
            if short < CUSTOM_MIN_SHORT_SIDE:
                raise ValueError(f"Custom size: shortest side must be >= {CUSTOM_MIN_SHORT_SIDE}px")
            if long > CUSTOM_MAX_LONG_SIDE:
                raise ValueError(f"Custom size: longest side must be <= {CUSTOM_MAX_LONG_SIDE}px")
        return self
