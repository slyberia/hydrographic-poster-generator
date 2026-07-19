"""In-process LRU caches for hot spatial query results.

Rivers and boundaries change only via offline imports, so entries have no TTL;
POST /admin/reload-rules clears both caches for the rare mid-flight refresh.
The clip cache is keyed on (geography_id, min_stream_order) — the only inputs
the SQL depends on — so density-preset edits that keep the same min order reuse
entries safely (classification is applied per-request in ClippingService).

Sizes are small on purpose: a country-scale clip result can be tens of MiB and
the backend runs at 2 GiB / concurrency 2 (see cloudbuild.yaml sizing note).
"""
import os
from collections import OrderedDict
from typing import Any, Hashable, Optional


class LRUCache:
    def __init__(self, maxsize: int):
        self.maxsize = maxsize
        self._data: "OrderedDict[Hashable, Any]" = OrderedDict()
        self.hits = 0
        self.misses = 0

    def get(self, key: Hashable) -> Optional[Any]:
        try:
            value = self._data[key]
        except KeyError:
            self.misses += 1
            return None
        self._data.move_to_end(key)
        self.hits += 1
        return value

    def put(self, key: Hashable, value: Any) -> None:
        self._data[key] = value
        self._data.move_to_end(key)
        while len(self._data) > self.maxsize:
            self._data.popitem(last=False)

    def clear(self) -> int:
        count = len(self._data)
        self._data.clear()
        return count

    def __len__(self) -> int:
        return len(self._data)


clip_cache = LRUCache(maxsize=int(os.getenv("CLIP_CACHE_SIZE", "8")))
boundary_cache = LRUCache(maxsize=int(os.getenv("BOUNDARY_CACHE_SIZE", "64")))
