"""
Tests for Location Intelligence Service.
Verifies Indian city detection, tier resolution, alias mapping, and geographic relevance scoring.
"""
from backend.app.services.location_intelligence import (
    LocationProfile,
    compute_geographic_relevance,
    resolve_location,
)


def test_resolve_coimbatore():
    profile = resolve_location("AI Engineer Intern in Coimbatore")
    assert profile.city == "Coimbatore"
    assert profile.state == "Tamil Nadu"
    assert profile.is_india is True
    assert profile.search_scope == "city"


def test_resolve_bengaluru_alias():
    profile = resolve_location("Software Engineer in Bangalore")
    assert profile.city == "Bengaluru"
    assert profile.state == "Karnataka"
    assert profile.is_india is True


def test_resolve_remote_query():
    profile = resolve_location("Remote Machine Learning Engineer")
    assert profile.is_remote is True
    assert profile.search_scope == "remote"


def test_geographic_relevance_local_match():
    profile = resolve_location("Coimbatore")
    is_match, multiplier, reason = compute_geographic_relevance("Coimbatore, Tamil Nadu, India", profile)
    assert is_match is True
    assert multiplier >= 1.0
    assert "city-match" in reason


def test_geographic_relevance_pan_india_fallback():
    profile = resolve_location("Coimbatore")
    is_match, multiplier, reason = compute_geographic_relevance("Bengaluru, India", profile)
    assert is_match is True
    assert multiplier == 0.75
    assert "country-wide-match" in reason


def test_geographic_relevance_foreign_onsite_rejection():
    profile = resolve_location("Coimbatore")
    is_match, multiplier, reason = compute_geographic_relevance("Berlin, Germany", profile)
    assert is_match is False
    assert multiplier < 0.2
    assert "foreign-onsite-mismatch" in reason


def test_geographic_relevance_remote_allowed():
    profile = resolve_location("Coimbatore")
    is_match, multiplier, reason = compute_geographic_relevance("Remote, Worldwide", profile, allow_remote=True)
    assert is_match is True
    assert multiplier >= 0.7
    assert "remote" in reason


def test_resolve_europe_query():
    profile = resolve_location("find me job opportunities for ai engineer in europe")
    assert profile.is_europe is True
    assert profile.search_scope == "europe"
    assert profile.country == "Europe"


def test_geographic_relevance_europe_match():
    profile = resolve_location("europe")
    is_match, multiplier, reason = compute_geographic_relevance("Berlin, Germany", profile)
    assert is_match is True
    assert multiplier >= 1.10
    assert "europe-match" in reason


def test_geographic_relevance_europe_remote():
    profile = resolve_location("europe")
    is_match, multiplier, reason = compute_geographic_relevance("Remote (Europe, UK, Germany)", profile)
    assert is_match is True
    assert multiplier >= 1.15
    assert "remote-europe" in reason


def test_geographic_relevance_europe_reject_foreign():
    profile = resolve_location("europe")
    is_match, multiplier, reason = compute_geographic_relevance("Chennai, India", profile)
    assert is_match is False
    assert multiplier < 0.2
    assert "foreign-onsite-mismatch" in reason
