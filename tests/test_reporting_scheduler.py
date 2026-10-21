"""
Unit and Integration Tests for Email Reporting and Scheduler Services
Tests HTML generation, multiple dispatch providers, database-backed idempotency, and discovery pipeline execution.
"""
import asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
import pytest
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models.job import Job, JobSourceReference
from backend.app.models.profile import SearchProfile
from backend.app.models.search_run import EmailDispatchLog, ScoredJob, SearchRun, SourceExecutionLog
from backend.app.schemas.job import WorkplaceType, EmploymentType, VerificationStatus
from backend.app.services.reporting import EmailReportService
from backend.app.services.scheduler import JobScheduler, job_scheduler


def _create_sample_fixtures(db: Session):
    profile = SearchProfile(
        id="test-profile-1",
        name="Backend Engineer Profile",
        target_titles=["Backend Engineer", "Python Developer"],
        skills=["Python", "FastAPI", "SQL", "Docker"],
        experience_level="Mid-Level",
        workplace_preference="remote",
        preferred_locations=["Remote"],
        target_ats_companies=["Automattic"],
        enabled_sources=["arbeitnow", "greenhouse"],
        email_digest_enabled=True,
        notification_email="tester@example.com",
        is_active=True,
    )
    db.add(profile)

    run = SearchRun(
        id="test-run-1",
        search_profile_id=profile.id,
        trigger_type="manual",
        status="completed",
        total_discovered=10,
        total_deduplicated=8,
        total_ranked=5,
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
    )
    db.add(run)

    job1 = Job(
        id="job-1",
        canonical_hash="hash-job-1",
        title="Senior Python Backend Engineer",
        company="Automattic",
        normalized_company="automattic",
        location="Remote",
        workplace_type="remote",
        employment_type="full_time",
        description="We are looking for a Senior Python Backend Engineer skilled in FastAPI, SQL, and Docker.",
        primary_url="https://example.com/jobs/1",
        verification_status="recently_checked",
    )
    db.add(job1)

    scored1 = ScoredJob(
        id="scored-1",
        search_run_id=run.id,
        job_id=job1.id,
        match_score=92.5,
        score_tier="excellent",
        score_skills=95.0,
        score_title=90.0,
        score_experience=100.0,
        score_location=100.0,
        score_domain=80.0,
        score_compensation=75.0,
        matched_skills=["Python", "FastAPI", "Docker"],
        missing_skills=["SQL"],
        explanation="Matched 3/4 skills • Strong role title alignment • 100% Remote match",
    )
    db.add(scored1)

    src_log1 = SourceExecutionLog(
        id="src-log-1",
        search_run_id=run.id,
        source_name="arbeitnow",
        status="success",
        items_retrieved=6,
        latency_ms=250,
    )
    src_log2 = SourceExecutionLog(
        id="src-log-2",
        search_run_id=run.id,
        source_name="greenhouse",
        status="success",
        items_retrieved=4,
        latency_ms=310,
    )
    db.add(src_log1)
    db.add(src_log2)
    db.commit()

    return profile, run, [scored1], [src_log1, src_log2]


def test_html_digest_generation(db_session: Session):
    profile, run, scored_jobs, source_logs = _create_sample_fixtures(db_session)
    html = EmailReportService.generate_html_digest(run, profile, scored_jobs, source_logs)

    assert "Daily Opportunity Intelligence" in html
    assert "Backend Engineer Profile" in html
    assert "Senior Python Backend Engineer" in html
    assert "Automattic" in html
    assert "92.5%" in html
    assert "Excellent Match" in html
    assert "Source Execution Audit" in html
    assert "Arbeitnow" in html
    assert "Greenhouse" in html
    assert "https://example.com/jobs/1" in html


def test_plain_text_digest_generation(db_session: Session):
    profile, run, scored_jobs, _ = _create_sample_fixtures(db_session)
    text = EmailReportService.generate_plain_text_digest(run, profile, scored_jobs)

    assert "OPPORTUNE AI — DAILY INTELLIGENCE DIGEST" in text
    assert "Senior Python Backend Engineer @ Automattic" in text
    assert "92.5% - EXCELLENT" in text
    assert "https://example.com/jobs/1" in text


@pytest.mark.asyncio
async def test_email_dispatch_console_and_idempotency(db_session: Session):
    profile, run, scored_jobs, source_logs = _create_sample_fixtures(db_session)

    # 1. Initial Dispatch
    result1 = await EmailReportService.dispatch_email(
        db=db_session,
        search_run=run,
        profile=profile,
        scored_jobs=scored_jobs,
        source_logs=source_logs,
        recipient_email="tester@example.com",
    )
    assert result1["status"] == "sent"
    assert result1["provider"] == "console"
    assert "idempotency_key" in result1

    # Verify log entry persisted in DB
    log = db_session.query(EmailDispatchLog).filter(EmailDispatchLog.search_run_id == run.id).first()
    assert log is not None
    assert log.status == "sent"
    assert log.recipient_email == "tester@example.com"

    # 2. Second Dispatch (Idempotency Triggered)
    result2 = await EmailReportService.dispatch_email(
        db=db_session,
        search_run=run,
        profile=profile,
        scored_jobs=scored_jobs,
        source_logs=source_logs,
        recipient_email="tester@example.com",
        force=False,
    )
    assert result2["status"] == "skipped"
    assert "already dispatched" in result2["message"]

    # Verify no second log was created
    total_logs = db_session.query(EmailDispatchLog).filter(EmailDispatchLog.search_run_id == run.id).count()
    assert total_logs == 1

    # 3. Third Dispatch with force=True
    result3 = await EmailReportService.dispatch_email(
        db=db_session,
        search_run=run,
        profile=profile,
        scored_jobs=scored_jobs,
        source_logs=source_logs,
        recipient_email="tester@example.com",
        force=True,
    )
    assert result3["status"] == "sent"
    total_logs_after = db_session.query(EmailDispatchLog).filter(EmailDispatchLog.search_run_id == run.id).count()
    assert total_logs_after == 2


@pytest.mark.asyncio
async def test_run_discovery_pipeline_end_to_end(db_session: Session):
    profile, _, _, _ = _create_sample_fixtures(db_session)

    # Mock discovery orchestrator to return simulated results
    mock_orchestrator_res = {
        "search_run_id": "test-run",
        "status": "completed",
        "total_processed": 5,
        "discovered": 2,
        "updated": 0,
        "source_results": {"arbeitnow": {"status": "success", "count": 2, "latency_ms": 200, "error": None}},
    }

    scheduler = JobScheduler()

    with patch(
        "backend.app.services.scheduler.discovery_orchestrator.execute_discovery_run",
        new=AsyncMock(return_value=mock_orchestrator_res),
    ):
        search_run = await scheduler.run_discovery_pipeline(
            db=db_session,
            profile_id=profile.id,
            trigger_type="manual",
            send_email=True,
            limit_per_source=10,
        )

        assert search_run.id is not None
        assert search_run.status == "completed"
        assert search_run.search_profile_id == profile.id
        assert search_run.total_ranked >= 1

        # Check ScoredJob entries
        scored = db_session.query(ScoredJob).filter(ScoredJob.search_run_id == search_run.id).all()
        assert len(scored) >= 1
        assert scored[0].match_score > 0
        assert scored[0].explanation != ""


@pytest.mark.asyncio
async def test_scheduler_concurrency_lock(db_session: Session):
    profile, _, _, _ = _create_sample_fixtures(db_session)
    scheduler = JobScheduler()

    # Acquire lock manually to simulate an active running discovery
    lock = scheduler._get_lock(profile.id)
    await lock.acquire()

    try:
        with pytest.raises(RuntimeError, match="already in progress"):
            await scheduler.run_discovery_pipeline(
                db=db_session,
                profile_id=profile.id,
            )
    finally:
        lock.release()
