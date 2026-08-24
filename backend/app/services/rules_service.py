"""Rules service: DB-backed preset loader with category-level fallback.

Presets are loaded from platform_rules at startup and cached in memory.
If the DB is unreachable, all categories fall back to app.config.*.  If the
database is reachable but an entire category is absent (for example, no flag
rows before migration 016), only that category falls back.  Existing database
rows remain authoritative for every category they represent.
"""
import logging
from typing import Dict, Optional

import asyncpg

from app.config.density_presets import DENSITY_PRESETS
from app.config.palette_presets import PALETTE_PRESETS
from app.config.typography_presets import TYPOGRAPHY_PRESETS
from app.config.flag_presets import FLAG_PRESETS
from app.models.preset_models import DensityPreset, PalettePreset, TypographyPreset, FlagPreset
from app.models.style_models import StyleSelection, ResolvedStyle

logger = logging.getLogger(__name__)

class RulesService:
    def __init__(self):
        self._density: Dict[str, DensityPreset] = {}
        self._palette: Dict[str, PalettePreset] = {}
        self._typography: Dict[str, TypographyPreset] = {}
        self._flags: Dict[str, FlagPreset] = {}
        self._source: str = "none"  # "database" or "hardcoded"
        self._rule_versions: Dict[str, int] = {}  # rule_id -> version

    async def load(self, pool: Optional[asyncpg.Pool]):
        """Load rules from DB. Fall back to hardcoded if DB unavailable."""
        if pool:
            try:
                fallback_categories = await self._load_from_db(pool)
                self._source = "database+hardcoded" if fallback_categories else "database"
                logger.info(
                    "Rules loaded from database (%d total); fallback categories=%s",
                    len(self._rule_versions),
                    fallback_categories or "none",
                )
                return
            except Exception as exc:
                logger.warning("Failed to load rules from DB, falling back to hardcoded: %s", exc)
        self._load_from_hardcoded()
        self._source = "hardcoded"

    async def _load_from_db(self, pool: asyncpg.Pool) -> list[str]:
        self._density = {}
        self._palette = {}
        self._typography = {}
        self._flags = {}
        self._rule_versions = {}
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id, rule_type, version, payload FROM platform_rules WHERE is_active = TRUE"
            )
        for row in rows:
            rule_type = row["rule_type"]
            payload = row["payload"]
            if isinstance(payload, str):
                import json
                payload = json.loads(payload)
            self._rule_versions[row["id"]] = row["version"]
            if rule_type == "density":
                # Convert classification_map keys from string to int
                if "classification_map" in payload:
                    payload["classification_map"] = {int(k): v for k, v in payload["classification_map"].items()}
                self._density[payload["id"]] = DensityPreset(**payload)
            elif rule_type == "palette":
                self._palette[payload["id"]] = PalettePreset(**payload)
            elif rule_type == "typography":
                self._typography[payload["id"]] = TypographyPreset(**payload)
            elif rule_type == "flag":
                self._flags[payload["id"]] = FlagPreset(**payload)
        return self._load_empty_categories_from_hardcoded()

    def _load_empty_categories_from_hardcoded(self) -> list[str]:
        fallback_categories: list[str] = []
        if not self._density:
            self._density = {k: DensityPreset(**v) for k, v in DENSITY_PRESETS.items()}
            fallback_categories.append("density")
        if not self._palette:
            self._palette = {k: PalettePreset(**v) for k, v in PALETTE_PRESETS.items()}
            fallback_categories.append("palette")
        if not self._typography:
            self._typography = {
                k: TypographyPreset(**v) for k, v in TYPOGRAPHY_PRESETS.items()
            }
            fallback_categories.append("typography")
        if not self._flags:
            self._flags = {k: FlagPreset(**v) for k, v in FLAG_PRESETS.items()}
            fallback_categories.append("flag")
        return fallback_categories

    def _load_from_hardcoded(self):
        self._rule_versions = {}
        self._density = {k: DensityPreset(**v) for k, v in DENSITY_PRESETS.items()}
        self._palette = {k: PalettePreset(**v) for k, v in PALETTE_PRESETS.items()}
        self._typography = {k: TypographyPreset(**v) for k, v in TYPOGRAPHY_PRESETS.items()}
        self._flags = {k: FlagPreset(**v) for k, v in FLAG_PRESETS.items()}

    async def reload(self, pool: asyncpg.Pool):
        """Hot-reload rules from DB without restart."""
        fallback_categories = await self._load_from_db(pool)
        self._source = "database+hardcoded" if fallback_categories else "database"
        logger.info(
            "Rules hot-reloaded from database; fallback categories=%s",
            fallback_categories or "none",
        )

    def get_density_preset(self, preset_id: str) -> DensityPreset:
        preset = self._density.get(preset_id)
        if not preset:
            raise ValueError(f"Density preset '{preset_id}' not found (source: {self._source})")
        return preset

    def get_palette_preset(self, preset_id: str) -> PalettePreset:
        preset = self._palette.get(preset_id)
        if not preset:
            raise ValueError(f"Palette preset '{preset_id}' not found (source: {self._source})")
        return preset

    def get_typography_preset(self, preset_id: str) -> TypographyPreset:
        preset = self._typography.get(preset_id)
        if not preset:
            raise ValueError(f"Typography preset '{preset_id}' not found (source: {self._source})")
        return preset

    def resolve_style(self, style: StyleSelection) -> ResolvedStyle:
        if style.mode == "standard":
            preset = self.get_palette_preset(style.preset_id)
            tokens = preset.tokens.model_dump()
        elif style.mode == "flag":
            flag = self._flags.get(style.preset_id)
            if not flag:
                raise ValueError(f"Flag preset '{style.preset_id}' not found (source: {self._source})")
            variant = style.variant or "light"
            if variant not in flag.variants:
                raise ValueError(f"Variant '{variant}' not found in flag '{style.preset_id}'")
            tokens = flag.variants[variant].model_dump()
        else:
            raise ValueError(f"Unknown style mode: {style.mode}")
            
        if style.overrides:
            for k, v in style.overrides.items():
                if v:
                    tokens[k] = v
                    
        return ResolvedStyle(source=style, tokens=tokens)

    @property
    def source(self) -> str:
        return self._source

    @property
    def rule_versions(self) -> Dict[str, int]:
        return dict(self._rule_versions)

# Singleton instance
rules_service = RulesService()
