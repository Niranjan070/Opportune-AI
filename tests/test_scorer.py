"""
Tests for Deterministic 6-Component Weighted Scoring Service
"""
import pytest
from backend.app.schemas.job import NormalizedJob, WorkplaceType, EmploymentType
from backend.app.schemas.profile import SearchProfileBase
from backend.app.schemas.scoring import ScoreTier
from backend.app.services.scorer import DeterministicScoringService


def test_scorer_excellent_match():
    profile = SearchProfileBase(
        name="Backend Lead",
        target_titles=["Backend Engineer", "Senior Backend Engineer"],
        skills=["Python", "FastAPI", "PostgreSQL", "Docker"],
        experience_level="Senior",
        workplace_preference="remote",
        excluded_employers=[],
        excluded_keywords=[],
    )

    job = NormalizedJob(
        source="greenhouse",
        source_job_id="101",
        title="Senior Backend Engineer - Python",
        company="Stripe",
        location="Remote",
        workplace_type=WorkplaceType.REMOTE,
        employment_type=EmploymentType.FULL_TIME,
        description="We are looking for a Senior Backend Engineer proficient in Python, FastAPI, and PostgreSQL with Docker experience.",
        job_url="https://example.com/job/101",
    )

    breakdown, is_excluded = DeterministicScoringService.evaluate_job(job, profile)

    assert is_excluded is False
    assert breakdown.tier == ScoreTier.EXCELLENT
    assert breakdown.total_score >= 85.0
    assert breakdown.score_skills == 100.0
    assert "Python" in breakdown.matched_skills
    assert "FastAPI" in breakdown.matched_skills
    assert len(breakdown.missing_skills) == 0
    assert "100% Remote match" in breakdown.explanation


def test_scorer_hard_exclusion_employer():
    profile = SearchProfileBase(
        name="Standard Profile",
        target_titles=["Software Engineer"],
        skills=["Python"],
        workplace_preference="remote",
        excluded_employers=["SpamCorp", "UnwantedInc"],
        excluded_keywords=[],
    )

    job = NormalizedJob(
        source="arbeitnow",
        source_job_id="202",
        title="Senior Software Engineer",
        company="SpamCorp LLC",
        location="Remote",
        workplace_type=WorkplaceType.REMOTE,
        description="Write Python code for SpamCorp.",
        job_url="https://example.com/job/202",
    )

    breakdown, is_excluded = DeterministicScoringService.evaluate_job(job, profile)

    assert is_excluded is True
    assert breakdown.total_score == 0.0
    assert breakdown.tier == ScoreTier.LOW
    assert "Excluded employer" in breakdown.explanation


def test_scorer_hard_exclusion_keyword():
    profile = SearchProfileBase(
        name="Standard Profile",
        target_titles=["Engineer"],
        skills=["Python"],
        workplace_preference="any",
        excluded_employers=[],
        excluded_keywords=["blockchain", "crypto", "gambling"],
    )

    job = NormalizedJob(
        source="arbeitnow",
        source_job_id="303",
        title="Python Engineer - Crypto Platform",
        company="BlockPay",
        location="Berlin",
        workplace_type=WorkplaceType.ON_SITE,
        description="Build scalable high-frequency trading for crypto assets.",
        job_url="https://example.com/job/303",
    )

    breakdown, is_excluded = DeterministicScoringService.evaluate_job(job, profile)

    assert is_excluded is True
    assert breakdown.total_score == 0.0
    assert breakdown.tier == ScoreTier.LOW
    assert "Excluded keyword: 'crypto'" in breakdown.explanation
