"""
In-Memory Asynchronous TTL Cache Service for MCP Search Invocations.
Avoids redundant web scraping and API hammering by caching search outputs for 15-30 minutes.
"""
import hashlib
import json
import logging
import time
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger("search-cache")


class SearchCacheService:
    def __init__(self, default_ttl_seconds: int = 900):  # 15 minutes default
        self.default_ttl_seconds = default_ttl_seconds
        self._cache: Dict[str, Tuple[float, Any]] = {}

    def _generate_key(self, tool_name: str, arguments: Dict[str, Any]) -> str:
        clean_args = {k: v for k, v in arguments.items() if v is not None}
        serialized = json.dumps(clean_args, sort_keys=True)
        return f"{tool_name}:{hashlib.sha256(serialized.encode()).hexdigest()}"

    def get(self, tool_name: str, arguments: Dict[str, Any]) -> Optional[Any]:
        key = self._generate_key(tool_name, arguments)
        entry = self._cache.get(key)
        if not entry:
            return None
        expires_at, data = entry
        if time.time() > expires_at:
            del self._cache[key]
            return None
        return data

    def set(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        data: Any,
        ttl_seconds: Optional[int] = None,
    ) -> None:
        if not data:
            return
        key = self._generate_key(tool_name, arguments)
        ttl = ttl_seconds or self.default_ttl_seconds
        self._cache[key] = (time.time() + ttl, data)

    def clear(self) -> None:
        self._cache.clear()


search_cache = SearchCacheService()
