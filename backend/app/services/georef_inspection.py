"""Bounded display-only source inspection using the existing clipped network."""
from pyproj import Transformer


def clip_segment(start, end, bounds):
    """Liang–Barsky clipping; retains segments crossing a viewport without vertices inside."""
    x, y = start[:2]
    dx, dy = end[0] - x, end[1] - y
    low, high = 0.0, 1.0
    for p, q in zip((-dx, dx, -dy, dy),
                    (x-bounds[0], bounds[2]-x, y-bounds[1], bounds[3]-y)):
        if p == 0:
            if q < 0:
                return None
        elif p < 0:
            low = max(low, q/p)
        else:
            high = min(high, q/p)
        if low >= high:
            return None
    return [[x+low*dx, y+low*dy], [x+high*dx, y+high*dy]]


def inspect_features(clip, bounds, limit=250):
    project = Transformer.from_crs(4326, 3857, always_xy=True).transform
    geographic = Transformer.from_crs(3857, 4326, always_xy=True).transform
    viewport = (*project(bounds[0], bounds[1]), *project(bounds[2], bounds[3]))
    features = []
    truncated = False
    for feature in clip.features:
        geometry = feature["geometry"]
        lines = ([geometry["coordinates"]] if geometry["type"] == "LineString"
                 else geometry["coordinates"] if geometry["type"] == "MultiLineString" else [])
        display = []
        for line in lines:
            current = []
            for start, end in zip(line, line[1:]):
                segment = clip_segment(start, end, viewport)
                if segment is None:
                    if current:
                        display.append(current)
                        current = []
                    continue
                if current and current[-1] == segment[0]:
                    current.append(segment[1])
                else:
                    if current:
                        display.append(current)
                    current = segment
            if current:
                display.append(current)
        if not display:
            continue
        if len(features) == limit:
            truncated = True
            break
        properties = {k: feature.get("properties", {}).get(k) for k in
            ("hydrorivers_id", "stream_order", "upstream_area", "length_km", "display_class")}
        properties["name_status"] = "not_evaluated"
        features.append({"type": "Feature", "geometry": {"type": "MultiLineString",
            "coordinates": [[list(geographic(*point)) for point in line] for line in display]},
                         "properties": properties})
    return {"type": "FeatureCollection", "features": features, "truncated": truncated,
        "limit": limit, "source": "HydroRIVERS v1.0 (WWF)",
        "geometry_purpose": "viewport-clipped display only; not used for QC or export"}
