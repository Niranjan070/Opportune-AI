"""
Tests for JobStorageService
"""
from datetime import datetime, timezone
from backend.app.schemas.job import NormalizedJob, WorkplaceType, EmploymentType
from backend.app.services.job_storage import JobStorageService
from backend.app.models.job import Job, JobSourceReference


def test_persist_new_job_and_source_reference(db_session):
    db = db_session
    norm_job = NormalizedJob(
        source="arbeitnow",
        source_job_id="test-slug-101",
        title="Senior Python Architect",
        company="Globex Corporation",
        location="Remote",
        workplace_type=WorkplaceType.REMOTE,
        employment_type=EmploymentType.FULL_TIME,
        description="<p>Designing modern systems.</p>",
        job_url="https://www.arbeitnow.com/jobs/globex-101",
        posted_at=datetime.now(timezone.utc),
    )

    stats = JobStorageService.persist_jobs([norm_job], db)
    assert stats["discovered"] == 1
    assert stats["total_processed"] == 1

    # Query back
    jobs, total = JobStorageService.get_jobs(db, keyword="Globex")
    assert total >= 1
    job = jobs[0]
    assert job.company == "Globex Corporation"
    assert len(job.sources) == 1
    assert job.sources[0].source_name == "arbeitnow"
    assert job.sources[0].source_job_id == "test-slug-101"


def test_persist_duplicate_job_links_multi_source(db_session):
    db = db_session
    # Job first discovered on Greenhouse
    job_gh = NormalizedJob(
        source="greenhouse",
        source_job_id="gh-777",
        title="Lead DevOps Engineer",
        company="Initech LLC",
        location="Austin, TX",
        workplace_type=WorkplaceType.HYBRID,
        employment_type=EmploymentType.FULL_TIME,
        description="Managing Kubernetes infrastructure",
        job_url="https://boards.greenhouse.io/initech/jobs/777",
        posted_at=datetime.now(timezone.utc),
    )

    stats1 = JobStorageService.persist_jobs([job_gh], db)
    assert stats1["discovered"] == 1

    # Same logical job subsequently discovered on Arbeitnow
    job_ab = NormalizedJob(
        source="arbeitnow",
        source_job_id="initech-lead-devops-777",
        title="Lead DevOps Engineer",
        company="Initech",
        location="Austin, TX",
        workplace_type=WorkplaceType.HYBRID,
        employment_type=EmploymentType.FULL_TIME,
        description="Managing Kubernetes infrastructure",
        job_url="https://boards.greenhouse.io/initech/jobs/777?utm_source=feed",
        posted_at=datetime.now(timezone.utc),
    )

    stats2 = JobStorageService.persist_jobs([job_ab], db)
    assert stats2["discovered"] == 0
    assert stats2["updated"] == 1

    # Verify only 1 Job entity exists, but has 2 source references!
    jobs, total = JobStorageService.get_jobs(db, keyword="Initech")
    assert total == 1
    saved_job = jobs[0]
    assert len(saved_job.sources) == 2
    source_names = {s.source_name for s in saved_job.sources}
    assert source_names == {"greenhouse", "arbeitnow"}
