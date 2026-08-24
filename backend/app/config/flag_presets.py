"""Canonical country-flag-inspired cartographic palette catalog.

The source definitions intentionally store only flag colors.  The application
derives accessible light and dark river-map tokens deterministically, while the
two presets that shipped before this catalog (Guyana and USA) retain their exact
tokens for saved-output compatibility.
"""

from __future__ import annotations

from typing import TypedDict


class FlagDefinition(TypedDict):
    name: str
    colors: tuple[str, ...]


# Every Admin-0 geography currently exposed by the production poster registry.
# French Guiana is included because it is independently poster-generatable even
# though its official flag is the French tricolour.
POSTER_GEOGRAPHY_PRESET_BY_ISO3 = {
    "ATG": "antigua-and-barbuda",
    "BHS": "bahamas",
    "BRB": "barbados",
    "BLZ": "belize",
    "CRI": "costa-rica",
    "CUB": "cuba",
    "DMA": "dominica",
    "DOM": "dominican-republic",
    "ECU": "ecuador",
    "SLV": "el-salvador",
    "GUF": "french-guiana",
    "GRD": "grenada",
    "GTM": "guatemala",
    "GUY": "guyana",
    "HTI": "haiti",
    "HND": "honduras",
    "JAM": "jamaica",
    "NIC": "nicaragua",
    "PAN": "panama",
    "PRY": "paraguay",
    "KNA": "saint-kitts-and-nevis",
    "LCA": "saint-lucia",
    "VCT": "saint-vincent-and-the-grenadines",
    "SUR": "suriname",
    "TTO": "trinidad-and-tobago",
    "URY": "uruguay",
}

# The G20 contains 19 countries plus the EU and AU.  Only country members are
# flag presets; the two regional bodies are deliberately excluded.
G20_COUNTRY_PRESET_BY_ISO3 = {
    "ARG": "argentina",
    "AUS": "australia",
    "BRA": "brazil",
    "CAN": "canada",
    "CHN": "china",
    "FRA": "france",
    "DEU": "germany",
    "IND": "india",
    "IDN": "indonesia",
    "ITA": "italy",
    "JPN": "japan",
    "MEX": "mexico",
    "RUS": "russia",
    "SAU": "saudi-arabia",
    "ZAF": "south-africa",
    "KOR": "south-korea",
    "TUR": "turkiye",
    "GBR": "united-kingdom",
    "USA": "usa",
}


# Colors are representative official/national flag colors, not a flag renderer.
# Their order is not semantic; token hierarchy is calculated from contrast.
FLAG_DEFINITIONS: dict[str, FlagDefinition] = {
    "antigua-and-barbuda": {
        "name": "Antigua and Barbuda",
        "colors": ("#CE1126", "#0072C6", "#FCD116", "#000000", "#FFFFFF"),
    },
    "argentina": {
        "name": "Argentina",
        "colors": ("#74ACDF", "#FFFFFF", "#F6B40E"),
    },
    "australia": {
        "name": "Australia",
        "colors": ("#00008B", "#FFFFFF", "#FF0000"),
    },
    "bahamas": {
        "name": "Bahamas",
        "colors": ("#00778B", "#FFC72C", "#000000"),
    },
    "barbados": {
        "name": "Barbados",
        "colors": ("#00267F", "#FFC726", "#000000"),
    },
    "belize": {
        "name": "Belize",
        "colors": ("#003F87", "#CE1126", "#FFFFFF"),
    },
    "brazil": {
        "name": "Brazil",
        "colors": ("#009C3B", "#FFDF00", "#002776", "#FFFFFF"),
    },
    "canada": {
        "name": "Canada",
        "colors": ("#FF0000", "#FFFFFF"),
    },
    "china": {
        "name": "China",
        "colors": ("#DE2910", "#FFDE00"),
    },
    "costa-rica": {
        "name": "Costa Rica",
        "colors": ("#002B7F", "#CE1126", "#FFFFFF"),
    },
    "cuba": {
        "name": "Cuba",
        "colors": ("#002A8F", "#CF142B", "#FFFFFF"),
    },
    "dominica": {
        "name": "Dominica",
        "colors": ("#006B3F", "#FCD116", "#D41C30", "#000000", "#FFFFFF"),
    },
    "dominican-republic": {
        "name": "Dominican Republic",
        "colors": ("#002D62", "#CE1126", "#FFFFFF"),
    },
    "ecuador": {
        "name": "Ecuador",
        "colors": ("#FFD100", "#034EA2", "#EF3340"),
    },
    "el-salvador": {
        "name": "El Salvador",
        "colors": ("#0047AB", "#F9D616", "#FFFFFF"),
    },
    "france": {
        "name": "France",
        "colors": ("#0055A4", "#EF4135", "#FFFFFF"),
    },
    "french-guiana": {
        "name": "French Guiana",
        "colors": ("#0055A4", "#EF4135", "#FFFFFF"),
    },
    "germany": {
        "name": "Germany",
        "colors": ("#000000", "#DD0000", "#FFCE00"),
    },
    "grenada": {
        "name": "Grenada",
        "colors": ("#CE1126", "#FCD116", "#007A5E"),
    },
    "guatemala": {
        "name": "Guatemala",
        "colors": ("#4997D0", "#F9D616", "#FFFFFF"),
    },
    "guyana": {
        "name": "Guyana",
        "colors": ("#009E49", "#FCD116", "#CE1126", "#000000", "#FFFFFF"),
    },
    "haiti": {
        "name": "Haiti",
        "colors": ("#00209F", "#D21034", "#FFFFFF"),
    },
    "honduras": {
        "name": "Honduras",
        "colors": ("#00BCE4", "#FFFFFF"),
    },
    "india": {
        "name": "India",
        "colors": ("#FF9933", "#138808", "#000080", "#FFFFFF"),
    },
    "indonesia": {
        "name": "Indonesia",
        "colors": ("#FF0000", "#FFFFFF"),
    },
    "italy": {
        "name": "Italy",
        "colors": ("#009246", "#CE2B37", "#FFFFFF"),
    },
    "jamaica": {
        "name": "Jamaica",
        "colors": ("#009B3A", "#FED100", "#000000"),
    },
    "japan": {
        "name": "Japan",
        "colors": ("#BC002D", "#FFFFFF"),
    },
    "mexico": {
        "name": "Mexico",
        "colors": ("#006847", "#CE1126", "#FFFFFF"),
    },
    "nicaragua": {
        "name": "Nicaragua",
        "colors": ("#0067C6", "#FFFFFF"),
    },
    "panama": {
        "name": "Panama",
        "colors": ("#DA121A", "#072357", "#FFFFFF"),
    },
    "paraguay": {
        "name": "Paraguay",
        "colors": ("#D52B1E", "#0038A8", "#FFFFFF"),
    },
    "russia": {
        "name": "Russia",
        "colors": ("#0039A6", "#D52B1E", "#FFFFFF"),
    },
    "saint-kitts-and-nevis": {
        "name": "Saint Kitts and Nevis",
        "colors": ("#009E49", "#CE1126", "#FCD116", "#000000", "#FFFFFF"),
    },
    "saint-lucia": {
        "name": "Saint Lucia",
        "colors": ("#65CFFF", "#FCD116", "#000000", "#FFFFFF"),
    },
    "saint-vincent-and-the-grenadines": {
        "name": "Saint Vincent and the Grenadines",
        "colors": ("#0072C6", "#FCD116", "#009E60"),
    },
    "saudi-arabia": {
        "name": "Saudi Arabia",
        "colors": ("#006C35", "#FFFFFF"),
    },
    "south-africa": {
        "name": "South Africa",
        "colors": ("#007749", "#FFB81C", "#DE3831", "#002395", "#000000", "#FFFFFF"),
    },
    "south-korea": {
        "name": "South Korea",
        "colors": ("#CD2E3A", "#0047A0", "#000000", "#FFFFFF"),
    },
    "suriname": {
        "name": "Suriname",
        "colors": ("#377E3F", "#B40A2D", "#ECC81D", "#FFFFFF"),
    },
    "trinidad-and-tobago": {
        "name": "Trinidad and Tobago",
        "colors": ("#CE1126", "#000000", "#FFFFFF"),
    },
    "turkiye": {
        "name": "Türkiye",
        "colors": ("#E30A17", "#FFFFFF"),
    },
    "united-kingdom": {
        "name": "United Kingdom",
        "colors": ("#012169", "#C8102E", "#FFFFFF"),
    },
    "usa": {
        "name": "United States",
        "colors": ("#B31942", "#0A3161", "#FFFFFF"),
    },
    "uruguay": {
        "name": "Uruguay",
        "colors": ("#0038A8", "#FCD116", "#FFFFFF"),
    },
}


LIGHT_BACKGROUND = "#FDFBF7"
DARK_BACKGROUND = "#0B1020"
LIGHT_TEXT = "#111827"
DARK_TEXT = "#F8FAFC"
LIGHT_MUTED = "#475569"
DARK_MUTED = "#94A3B8"


def _rgb(color: str) -> tuple[int, int, int]:
    value = color.removeprefix("#")
    if len(value) != 6:
        raise ValueError(f"Expected six-digit hex color, got {color!r}")
    return tuple(int(value[index:index + 2], 16) for index in (0, 2, 4))  # type: ignore[return-value]


def _linear(channel: int) -> float:
    value = channel / 255
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def _luminance(color: str) -> float:
    red, green, blue = _rgb(color)
    return 0.2126 * _linear(red) + 0.7152 * _linear(green) + 0.0722 * _linear(blue)


def _contrast(first: str, second: str) -> float:
    brighter, darker = sorted((_luminance(first), _luminance(second)), reverse=True)
    return (brighter + 0.05) / (darker + 0.05)


def _mix(first: str, second: str, amount: float) -> str:
    first_rgb = _rgb(first)
    second_rgb = _rgb(second)
    mixed = tuple(
        round(start + (end - start) * amount)
        for start, end in zip(first_rgb, second_rgb)
    )
    return "#" + "".join(f"{channel:02X}" for channel in mixed)


def _chroma(color: str) -> float:
    channels = tuple(channel / 255 for channel in _rgb(color))
    return max(channels) - min(channels)


def _ensure_contrast(color: str, background: str, minimum: float) -> str:
    if _contrast(color, background) >= minimum:
        return color
    target = "#000000" if _luminance(background) > 0.5 else "#FFFFFF"
    for step in range(1, 21):
        candidate = _mix(color, target, step / 20)
        if _contrast(candidate, background) >= minimum:
            return candidate
    return target


def _feature_colors(colors: tuple[str, ...], *, dark: bool) -> tuple[str, str, str]:
    chromatic = [color for color in colors if _chroma(color) >= 0.08]
    candidates = chromatic or list(colors)
    candidates.sort(key=_luminance, reverse=dark)

    while len(candidates) < 3:
        seed = candidates[(len(candidates) - 1) % len(candidates)]
        target = "#FFFFFF" if dark else "#000000"
        candidates.append(_mix(seed, target, 0.18 + 0.08 * len(candidates)))

    background = DARK_BACKGROUND if dark else LIGHT_BACKGROUND
    minimums = (3.0, 2.5, 2.0)
    return tuple(
        _ensure_contrast(color, background, minimum)
        for color, minimum in zip(candidates[:3], minimums)
    )  # type: ignore[return-value]


def _build_variant(colors: tuple[str, ...], *, dark: bool) -> dict[str, str]:
    background = DARK_BACKGROUND if dark else LIGHT_BACKGROUND
    text = DARK_TEXT if dark else LIGHT_TEXT
    muted = DARK_MUTED if dark else LIGHT_MUTED
    major, primary, secondary = _feature_colors(colors, dark=dark)
    return {
        "background": background,
        "feature_major": major,
        "feature_primary": primary,
        "feature_secondary": secondary,
        "feature_minor": _ensure_contrast(_mix(secondary, muted, 0.45), background, 1.8),
        "feature_headwater": _ensure_contrast(_mix(secondary, background, 0.45), background, 1.4),
        "text_primary": text,
        "text_secondary": _ensure_contrast(major, background, 4.5),
    }


def _build_preset(preset_id: str, definition: FlagDefinition) -> dict[str, object]:
    return {
        "id": preset_id,
        "name": definition["name"],
        "variants": {
            "light": _build_variant(definition["colors"], dark=False),
            "dark": _build_variant(definition["colors"], dark=True),
        },
    }


FLAG_PRESETS = {
    preset_id: _build_preset(preset_id, definition)
    for preset_id, definition in FLAG_DEFINITIONS.items()
}


# Compatibility anchors: preserve the exact two palettes that were previously
# available so existing exports and persisted sessions do not change appearance.
FLAG_PRESETS["guyana"]["variants"] = {
    "light": {
        "background": "#FDFBF7",
        "feature_major": "#CE1126",
        "feature_primary": "#FCD116",
        "feature_secondary": "#009E49",
        "feature_minor": "#000000",
        "feature_headwater": "#4A4A4A",
        "text_primary": "#000000",
        "text_secondary": "#009E49",
    },
    "dark": {
        "background": "#111111",
        "feature_major": "#CE1126",
        "feature_primary": "#FCD116",
        "feature_secondary": "#009E49",
        "feature_minor": "#FDFBF7",
        "feature_headwater": "#AAAAAA",
        "text_primary": "#FDFBF7",
        "text_secondary": "#FCD116",
    },
}
FLAG_PRESETS["usa"]["variants"] = {
    "light": {
        "background": "#FDFBF7",
        "feature_major": "#B31942",
        "feature_primary": "#0A3161",
        "feature_secondary": "#3B82F6",
        "feature_minor": "#000000",
        "feature_headwater": "#4A4A4A",
        "text_primary": "#000000",
        "text_secondary": "#0A3161",
    },
    "dark": {
        "background": "#0A3161",
        "feature_major": "#B31942",
        "feature_primary": "#FFFFFF",
        "feature_secondary": "#60A5FA",
        "feature_minor": "#94A3B8",
        "feature_headwater": "#334155",
        "text_primary": "#FFFFFF",
        "text_secondary": "#B31942",
    },
}


EXPECTED_FLAG_PRESET_IDS = frozenset(
    POSTER_GEOGRAPHY_PRESET_BY_ISO3.values()
) | frozenset(G20_COUNTRY_PRESET_BY_ISO3.values())

if set(FLAG_PRESETS) != EXPECTED_FLAG_PRESET_IDS:
    missing = sorted(EXPECTED_FLAG_PRESET_IDS - set(FLAG_PRESETS))
    unexpected = sorted(set(FLAG_PRESETS) - EXPECTED_FLAG_PRESET_IDS)
    raise RuntimeError(
        f"Flag catalog does not match its coverage contract; "
        f"missing={missing}, unexpected={unexpected}"
    )
