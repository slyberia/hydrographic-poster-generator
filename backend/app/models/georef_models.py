"""Versioned metadata only; no raster bytes or duplicate source geometry."""

import math
from datetime import datetime
from typing import Any, Literal
from uuid import UUID, uuid4
from pydantic import BaseModel, ConfigDict, Field, model_validator


class RenderTransform(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)
    crs: Literal["EPSG:3857"] = "EPSG:3857"
    x_scale: float
    x_offset: float
    y_scale: float
    y_offset: float
    formula: str = "pixel_x=x_scale*x+x_offset; pixel_y=y_scale*y+y_offset"


class PosterGeospatialManifest(BaseModel):
    schema_version: Literal[2] = 2
    poster_id: UUID
    generated_at: datetime
    generator: dict[str, str]
    source: dict[str, str]
    source_crs: Literal["EPSG:4326"] = "EPSG:4326"
    source_bbox_3857: list[float] = Field(min_length=4, max_length=4)
    source_bbox_4326: list[float] | None = Field(
        default=None, min_length=4, max_length=4
    )
    map_frame: dict[str, float]
    render_dimensions: dict[str, int]
    render_settings: dict[str, Any]
    geographic_to_pixel: RenderTransform
    hydro_rivers_reference: dict[str, Any]

    @model_validator(mode="after")
    def valid_frame(self):
        for key in ("width", "height"):
            if not 1 <= self.render_dimensions.get(key, 0) <= 9000:
                raise ValueError("Invalid manifest image dimensions")
        b = self.source_bbox_3857
        if not all(math.isfinite(v) for v in b) or b[0] >= b[2] or b[1] >= b[3]:
            raise ValueError("Invalid source bbox")
        if self.source_bbox_4326 is not None:
            geographic = self.source_bbox_4326
            if (
                not all(math.isfinite(v) for v in geographic)
                or not -180 <= geographic[0] < geographic[2] <= 180
                or not -90 <= geographic[1] < geographic[3] <= 90
            ):
                raise ValueError("Invalid geographic source bbox")
        f = self.map_frame
        if not all(
            math.isfinite(f.get(k, float("nan"))) for k in ("x", "y", "width", "height")
        ):
            raise ValueError("Invalid map frame")
        if min(f["x"], f["y"]) < 0 or min(f["width"], f["height"]) <= 0:
            raise ValueError("Empty map frame")
        if (
            f["x"] + f["width"] > self.render_dimensions["width"]
            or f["y"] + f["height"] > self.render_dimensions["height"]
        ):
            raise ValueError("Map frame exceeds poster")
        t = self.geographic_to_pixel
        if t.x_scale <= 0 or t.y_scale >= 0:
            raise ValueError("Invalid north-up render transform")
        return self


class GroundControlPoint(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)
    source_x: float
    source_y: float
    pixel_x: float
    pixel_y: float
    score: float = Field(default=1, ge=0, le=1)
    residual: float | None = None
    is_inlier: bool = False
    used_for_fit: bool = False


class AlignmentQcReport(BaseModel):
    poster_id: UUID
    run_id: UUID = Field(default_factory=uuid4)
    mode: Literal["native", "recovery"]
    status: Literal["passed", "warning", "failed"]
    river_count: int
    projected_feature_count: int = 0
    out_of_frame_vertices: int = 0
    max_round_trip_error_m: float | None = None
    transformation: str = "known_render_transform"
    metrics: dict[str, Any] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)


class RecoveryOptions(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    poster_id: UUID | None = None
    geography_id: str | None = None
    density_preset: str = "balanced"
    classification_preset: str = "standard"
    manifest: PosterGeospatialManifest | None = None
    transform: Literal["auto", "similarity", "affine"] = "auto"
    render_settings: dict[str, Any] = Field(default_factory=dict)
    gcps: list[GroundControlPoint] = Field(default_factory=list, max_length=200)
