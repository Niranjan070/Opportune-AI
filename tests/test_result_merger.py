"""
Tests for Result Merger Service.
Verifies cross-source deduplication, canonical URL parsing, and geographic ranking.
"""
from backend.app.schemas.job import NormalizedJob, WorkplaceType, EmploymentType
from backend.app.services.location_intelligence import resolve_location
from backend.app.services.result_merger import (
    merge_and_filter_results,
    normalize_job_url,
)


def test_normalize_job_url():
    raw = "https://www.linkedin.com/jobs/view/12345/?utm_source=share&utm_medium=member_desktop&ref=opportune"
    normalized = normalize_job_url(raw)
    assert "utm_source" not in normalized
    assert "ref" not in normalized
    assert normalized == "https://www.linkedin.com/jobs/view/12345"


def test_merge_and_deduplicate():
    job1 = NormalizedJob(
        source="jobspy-linkedin",
        source_job_id="1",
        title="AI Engineer Intern",
        company="TechCorp Inc",
        location="Coimbatore, India",
        job_url="https://job1.com?utm_source=twitter",
        description="Great AI internship in Coimbatore.",
        workplace_type=WorkplaceType.ON_SITE,
        employment_type=EmploymentType.INTERNSHIP,
    )
    job2 = NormalizedJob(
        source="jobspy-naukri",
        source_job_id="2",
        title="AI Engineer Intern",
        company="TechCorp",  # Fuzzy match with TechCorp Inc
        location="Coimbatore, Tamil Nadu",
        job_url="https://job2.com",
        description="Great AI internship in Coimbatore.",
        workplace_type=WorkplaceType.ON_SITE,
        employment_type=EmploymentType.INTERNSHIP,
    )
    job3_foreign = NormalizedJob(
        source="arbeitnow",
        source_job_id="3",
        title="AI Engineer Intern",
        company="Munich AI GmbH",
        location="Munich, Germany",
        job_url="https://job3.com",
        description="On-site internship in Munich, Germany.",
        workplace_type=WorkplaceType.ON_SITE,
        employment_type=EmploymentType.INTERNSHIP,
    )

    profile = resolve_location("Coimbatore")
    merged = merge_and_filter_results([job1, job2, job3_foreign], location_profile=profile)

    # job2 should be deduped out (same company + title combo)
    # job3 should be filtered out (foreign on-site in Munich when user wanted Coimbatore)
    assert len(merged) == 1
    assert merged[0].company == "TechCorp Inc"
    assert "Coimbatore" in merged[0].location
