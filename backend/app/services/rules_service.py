"""Rules service: DB-backed preset loader with hardcoded fallback.

Presets are loaded from platform_rules at startup and cached in memory.
If the DB is unreachable, falls back to the Python dicts in app.config.*.
"""
import logging
from typing import Dict, Optional

import asyncpg

from app.config.density_presets import DENSITY_PRESETS
from app.config.palette_presets import PALETTE_PRESETS
from app.config.typography_presets import TYPOGRAPHY_PRESETS
from app.models.preset_models import DensityPreset, PalettePreset, TypographyPreset

logger = logging.getLogger(__name__)

class RulesService:
    def __init__(self):
        self._density: Dict[str, DensityPreset] = {}
        self._palette: Dict[str, PalettePreset] = {}
        self._typography: Dict[str, TypographyPreset] = {}
        self._source: str = "none"  # "database" or "hardcoded"
        self._rule_versions: Dict[str, int] = {}  # rule_id -> version

    async def load(self, pool: Optional[asyncpg.Pool]):
        """Load rules from DB. Fall back to hardcoded if DB unavailable."""
        if pool:
            try:
                await self._load_from_db(pool)
                self._source = "database"
                logger.info("Rules loaded from database (%d total)", len(self._rule_versions))
                return
            except Exception as exc:
                logger.warning("Failed to load rules from DB, falling back to hardcoded: %s", exc)
        self._load_from_hardcoded()
        self._source = "hardcoded"

    async def _load_from_db(self, pool: asyncpg.Pool):
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT id, rule_type, version, payload FROM platform_rules WHERE is_active = TRUE"
            )
        for row in rows:
            rule_type = row["rule_type"]
            payload = row["payload"]  # already a dict from JSONB
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

    def _load_from_hardcoded(self):
        self._density = {k: DensityPreset(**v) for k, v in DENSITY_PRESETS.items()}
        self._palette = {k: PalettePreset(**v) for k, v in PALETTE_PRESETS.items()}
        self._typography = {k: TypographyPreset(**v) for k, v in TYPOGRAPHY_PRESETS.items()}

    async def reload(self, pool: asyncpg.Pool):
        """Hot-reload rules from DB without restart."""
        await self._load_from_db(pool)
        self._source = "database"
        logger.info("Rules hot-reloaded from database")

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

    @property
    def source(self) -> str:
        return self._source

    @property
    def rule_versions(self) -> Dict[str, int]:
        return dict(self._rule_versions)

# Singleton instance
rules_service = RulesService()
