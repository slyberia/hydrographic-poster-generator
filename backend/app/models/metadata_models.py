from pydantic import BaseModel, ConfigDict

class MetadataOptions(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    show_title: bool = True
    show_subtitle: bool = True
    show_legend: bool = True
    show_north_arrow: bool = True
    show_scale_bar: bool = True
    show_data_credits: bool = True

class ResolvedMetadata(BaseModel):
    show_title: bool
    show_subtitle: bool
    show_legend: bool
    show_north_arrow: bool
    show_scale_bar: bool
    show_data_credits: bool
