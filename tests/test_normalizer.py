"""
Tests for NormalizationService
"""
from backend.app.services.normalizer import NormalizationService
from backend.app.schemas.job import NormalizedJob, WorkplaceType, EmploymentType


def test_strip_html():
    raw_html = "<p>Join our team as a <b>Python Engineer</b>.<br/>Required skills:<ul><li>FastAPI</li><li>Docker</li></ul></p>"
    clean = NormalizationService.strip_html(raw_html)
    assert "<b>" not in clean
    assert "Python Engineer" in clean
    assert "FastAPI" in clean
    assert "Docker" in clean


def test_sanitize_url():
    url_with_tracking = "https://boards.greenhouse.io/gitlab/jobs/12345?gh_src=custom_source&utm_campaign=winter2026&utm_medium=email"
    sanitized = NormalizationService.sanitize_url(url_with_tracking)
    assert sanitized == "https://boards.greenhouse.io/gitlab/jobs/12345"


def test_normalize_company():
    assert NormalizationService.normalize_company("Stripe, Inc.") == "stripe"
    assert NormalizationService.normalize_company("GitLab LLC") == "gitlab"
    assert NormalizationService.normalize_company("Aquadraulic Wassertechnik GmbH") == "aquadraulic wassertechnik"


def test_normalize_title():
    assert NormalizationService.normalize_title("Backend Engineer (m/w/d)") == "backend engineer"
    assert NormalizationService.normalize_title("[Remote] Staff Software Engineer - Hybrid") == "staff software engineer"


def test_generate_canonical_hash():
    job1 = NormalizedJob(
        source="greenhouse",
        source_job_id="123",
        title="Senior Python Engineer (m/w/d)",
        company="GitLab, Inc.",
        job_url="https://boards.greenhouse.io/gitlab/jobs/123?utm_source=twitter",
        description="Build software",
    )
    job2 = NormalizedJob(
        source="arbeitnow",
        source_job_id="gitlab-senior-python-123",
        title="Senior Python Engineer",
        company="GitLab",
        job_url="https://boards.greenhouse.io/gitlab/jobs/123",
        description="Build software",
    )
    hash1 = NormalizationService.generate_canonical_hash(job1)
    hash2 = NormalizationService.generate_canonical_hash(job2)
    assert hash1 == hash2
    assert len(hash1) == 64
