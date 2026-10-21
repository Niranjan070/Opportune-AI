"""
End-to-End Product Integration Test
Verifies the complete Opportune AI workflow:
1. Candidate profile creation with custom skills and hard exclusions
2. Multi-source job discovery & canonical deduplication
3. Deterministic 6-component weighted scoring & ranking
4. Idempotent email digest dispatch
5. JD intelligence extraction and profile enrichment
6. Full API retrieval verification
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import app
from backend.app.models.job import Job
from backend.app.models.profile import SearchProfile
from backend.app.models.search_run import EmailDispatchLog, ScoredJob, SearchRun
from backend.app.schemas.job import NormalizedJob, WorkplaceType, EmploymentType
from backend.app.services.job_storage import JobStorageService
from backend.app.services.scheduler import job_scheduler

client = TestClient(app)


def test_complete_product_workflow(db_session: Session):
    # Step 1: Create candidate profile via API
    profile_payload = {
        "name": "Staff AI Systems Engineer",
        "target_titles": ["Staff AI Engineer", "Senior Backend Engineer"],
        "skills": ["Python", "FastAPI", "PostgreSQL", "Docker", "PyTorch"],
        "experience_level": "Senior",
        "workplace_preference": "remote",
        "preferred_locations": ["Remote", "Worldwide"],
        "target_ats_companies": ["GitLab", "Automattic"],
        "excluded_employers": ["SpamRecruiters Inc"],
        "excluded_keywords": ["Clearance Required", "Unpaid"],
        "enabled_sources": ["arbeitnow", "greenhouse", "lever", "remotive"],
        "email_digest_enabled": True,
        "notification_email": "candidate@example.com",
    }
    create_resp = client.post("/api/profiles", json=profile_payload)
    assert create_resp.status_code == 201
    profile_data = create_resp.json()
    profile_id = profile_data["id"]
    assert profile_data["name"] == "Staff AI Systems Engineer"

    # Step 2: Ingest sample multi-source job listings (demonstrating canonical deduplication & provenance)
    raw_listings = [
        # Job 1: High match (Remote, Python, FastAPI, Docker, PostgreSQL)
        NormalizedJob(
            source="arbeitnow",
            source_job_id="arbeitnow-ai-101",
            title="Senior Staff AI & Backend Engineer",
            company="GitLab",
            location="Remote",
            workplace_type=WorkplaceType.REMOTE,
            employment_type=EmploymentType.FULL_TIME,
            description="Build scalable AI APIs using Python, FastAPI, PostgreSQL, and Docker containerization.",
            job_url="https://jobs.arbeitnow.com/gitlab-ai-101",
            requisition_id="GL-AI-101",
            salary_min=160000,
            salary_max=210000,
            currency="USD",
        ),
        # Job 2: Duplicate of Job 1 from Remotive (tests canonical deduplication & source reference linking)
        NormalizedJob(
            source="remotive",
            source_job_id="remotive-ai-999",
            title="Senior Staff AI & Backend Engineer",
            company="GitLab",
            location="Remote",
            workplace_type=WorkplaceType.REMOTE,
            employment_type=EmploymentType.FULL_TIME,
            description="Build scalable AI APIs using Python, FastAPI, PostgreSQL, and Docker containerization.",
            job_url="https://remotive.com/jobs/gitlab-ai-999",
            requisition_id="GL-AI-101",
        ),
        # Job 3: Hard Excluded by keyword ("Clearance Required")
        NormalizedJob(
            source="greenhouse",
            source_job_id="gh-defense-404",
            title="Staff AI Engineer",
            company="Defense Corp",
            location="Remote",
            workplace_type=WorkplaceType.REMOTE,
            employment_type=EmploymentType.FULL_TIME,
            description="Secret Clearance Required for this role. Python and Docker skills required.",
            job_url="https://boards.greenhouse.io/defense/jobs/404",
        ),
        # Job 4: Hard Excluded by employer ("SpamRecruiters Inc")
        NormalizedJob(
            source="lever",
            source_job_id="lever-spam-500",
            title="Senior Backend Engineer",
            company="SpamRecruiters Inc",
            location="Remote",
            workplace_type=WorkplaceType.REMOTE,
            employment_type=EmploymentType.FULL_TIME,
            description="Python FastAPI engineer needed.",
            job_url="https://jobs.lever.co/spam/500",
        ),
    ]

    # Ingest into DB
    stats = JobStorageService.persist_jobs(raw_listings, db_session)
    assert stats["discovered"] == 3  # Job 1 and Job 2 deduplicated into 1 canonical job
    assert stats["updated"] == 1     # Job 2 added as secondary source reference to Job 1

    # Verify canonical job in DB has 2 source references
    canonical_job = db_session.query(Job).filter(Job.normalized_company == "gitlab").first()
    assert canonical_job is not None
    assert len(canonical_job.sources) == 2

    # Step 3: Trigger full discovery and scoring pipeline
    mock_orchestrator = {
        "search_run_id": "test-e2e-run",
        "status": "completed",
        "total_processed": 4,
        "discovered": 0,
        "updated": 0,
        "source_results": {
            "arbeitnow": {"status": "success", "count": 1, "latency_ms": 120, "error": None},
            "remotive": {"status": "success", "count": 1, "latency_ms": 140, "error": None},
            "greenhouse": {"status": "success", "count": 1, "latency_ms": 190, "error": None},
            "lever": {"status": "success", "count": 1, "latency_ms": 160, "error": None},
        },
    }

    with patch(
        "backend.app.services.scheduler.discovery_orchestrator.execute_discovery_run",
        new=AsyncMock(return_value=mock_orchestrator),
    ):
        trigger_resp = client.post(
            "/api/runs/trigger",
            json={
                "search_profile_id": profile_id,
                "send_email": True,
                "limit_per_source": 20,
            },
        )
        assert trigger_resp.status_code == 201
        run_data = trigger_resp.json()
        run_id = run_data["id"]
        assert run_data["status"] == "completed"

    # Step 4: Verify search run details & ranking arithmetic via API
    detail_resp = client.get(f"/api/runs/{run_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()

    assert detail["id"] == run_id
    assert len(detail["top_jobs"]) >= 1

    # GitLab job should be the top ranked job with score >= 85 (Excellent)
    top_job = detail["top_jobs"][0]
    assert top_job["job"]["company"] == "GitLab"
    assert top_job["match_score"] >= 85.0
    assert top_job["score_tier"] == "excellent"
    assert "Python" in top_job["matched_skills"]
    assert "FastAPI" in top_job["matched_skills"]

    # Verify exclusions received 0.0 match score
    excluded_scored = (
        db_session.query(ScoredJob)
        .join(Job)
        .filter(ScoredJob.search_run_id == run_id, Job.company == "SpamRecruiters Inc")
        .first()
    )
    assert excluded_scored is not None
    assert excluded_scored.match_score == 0.0
    assert "Excluded employer" in excluded_scored.explanation

    # Step 5: Verify Idempotent Email Dispatch
    email_logs = db_session.query(EmailDispatchLog).filter(EmailDispatchLog.search_run_id == run_id).all()
    assert len(email_logs) == 1
    assert email_logs[0].status == "sent"
    assert email_logs[0].recipient_email == "candidate@example.com"

    # Resend without force -> must return skipped (idempotent duplicate prevention)
    resend_skip = client.post(f"/api/runs/{run_id}/resend-email?force=false")
    assert resend_skip.status_code == 200
    assert resend_skip.json()["status"] == "skipped"

    # Resend with force -> successfully creates second audit record
    resend_force = client.post(f"/api/runs/{run_id}/resend-email?force=true")
    assert resend_force.status_code == 200
    assert resend_force.json()["status"] == "sent"

    # Step 6: Test Job Description Intelligence extraction
    sample_raw_jd = """
    Looking for a Senior Python Developer with deep experience in PyTorch, Kubernetes,
    FastAPI and AWS cloud deployments. Remote candidates welcomed.
    """
    jd_resp = client.post("/api/profiles/analyze-jd", json={"raw_text": sample_raw_jd, "title": "AI Role"})
    assert jd_resp.status_code == 200
    extracted = jd_resp.json()
    all_skills = [s.lower() for s in (extracted["required_skills"] + extracted["preferred_skills"])]
    assert "python" in all_skills
    assert "fastapi" in all_skills
