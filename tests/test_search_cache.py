"""
Tests for Search Cache Service.
Verifies cache key generation, TTL expiration, and cache hits.
"""
import time
from backend.app.services.search_cache import SearchCacheService


def test_search_cache_hit_and_expiration():
    cache = SearchCacheService(default_ttl_seconds=1)
    tool = "search_jobspy_sources"
    args = {"keywords": "AI Engineer", "location": "Coimbatore, India"}

    data = [{"title": "AI Intern", "company": "Kovai Tech"}]

    # Initially missing
    assert cache.get(tool, args) is None

    # Set and hit
    cache.set(tool, args, data)
    assert cache.get(tool, args) == data

    # Wait for expiration
    time.sleep(1.1)
    assert cache.get(tool, args) is None
