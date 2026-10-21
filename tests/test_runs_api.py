"""
Integration Tests for Search Runs REST API Endpoints
Tests /api/runs/trigger, /api/runs, /api/runs/{id}, and /api/runs/{id}/resend-email.
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.main import app
from backend.app.models.job import Job
from backend.app.models.profile import SearchProfile
from backend.app.models.search_run import EmailDispatchLog, ScoredJob, SearchRun, SourceExecutionLog

client = TestClient(app)


def _seed_run_data(db: Session):
    profile = SearchProfile(
        id="profile-api-test",
        name="API Test Profile",
        target_titles=["Frontend Developer"],
        skills=["React", "TypeScript"],
        experience_level="Mid-Level",
        workplace_preference="remote",
        preferred_locations=["Remote"],
        target_ats_companies=["Shopify"],
        enabled_sources=["arbeitnow"],
        email_digest_enabled=True,
        notification_email="api_test@example.com",
        is_active=True,
    )
    db.add(profile)

    run = SearchRun(
        id="run-api-test-1",
        search_profile_id=profile.id,
        trigger_type="manual",
        status="completed",
        total_discovered=12,
        total_deduplicated=10,
        total_ranked=4,
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
    )
    db.add(run)

    job = Job(
        id="job-api-1",
        canonical_hash="canonical-api-job-1",
        title="Frontend React Engineer",
        company="Shopify",
        normalized_company="shopify",
        location="Remote",
        workplace_type="remote",
        employment_type="full_time",
        description="Build responsive UI apps with React and TypeScript.",
        primary_url="https://shopify.com/careers/1",
        verification_status="recently_checked",
    )
    db.add(job)

    scored = ScoredJob(
        id="scored-api-1",
        search_run_id=run.id,
        job_id=job.id,
        match_score=88.0,
        score_tier="excellent",
        score_skills=90.0,
        score_title=85.0,
        score_experience=90.0,
        score_location=100.0,
        score_domain=80.0,
        score_compensation=75.0,
        matched_skills=["React", "TypeScript"],
        missing_skills=[],
        explanation="Matched all required skills • Excellent match",
    )
    db.add(scored)

    src_log = SourceExecutionLog(
        id="src-log-api-1",
        search_run_id=run.id,
        source_name="arbeitnow",
        status="success",
        items_retrieved=12,
        latency_ms=280,
    )
    db.add(src_log)

    db.commit()
    return profile, run, job, scored


def test_list_search_runs(db_session: Session):
    _seed_run_data(db_session)
    response = client.get("/api/runs")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["id"] == "run-api-test-1"
    assert data[0]["status"] == "completed"
    assert data[0]["total_discovered"] == 12


def test_get_search_run_detail(db_session: Session):
    _, run, job, scored = _seed_run_data(db_session)
    response = client.get(f"/api/runs/{run.id}")
    assert response.status_code == 200
    data = response.json()

    assert data["id"] == run.id
    assert data["status"] == "completed"
    assert len(data["source_logs"]) == 1
    assert data["source_logs"][0]["source_name"] == "arbeitnow"
    assert len(data["top_jobs"]) == 1
    assert data["top_jobs"][0]["match_score"] == 88.0
    assert data["top_jobs"][0]["job"]["title"] == "Frontend React Engineer"
    assert data["top_jobs"][0]["job"]["company"] == "Shopify"


def test_get_search_run_detail_not_found():
    response = client.get("/api/runs/non-existent-uuid")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_trigger_search_run_success(db_session: Session):
    profile, _, _, _ = _seed_run_data(db_session)

    mock_orchestrator_res = {
        "search_run_id": "test-run",
        "status": "completed",
        "total_processed": 3,
        "discovered": 3,
        "updated": 0,
        "source_results": {"arbeitnow": {"status": "success", "count": 3, "latency_ms": 150, "error": None}},
    }

    with patch(
        "backend.app.services.scheduler.discovery_orchestrator.execute_discovery_run",
        new=AsyncMock(return_value=mock_orchestrator_res),
    ):
        response = client.post(
            "/api/runs/trigger",
            json={
                "search_profile_id": profile.id,
                "send_email": True,
                "limit_per_source": 15,
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["id"] is not None
        assert data["status"] == "completed"
        assert data["search_profile_id"] == profile.id


def test_resend_email_idempotency_api(db_session: Session):
    _, run, _, _ = _seed_run_data(db_session)

    # First send
    resp1 = client.post(f"/api/runs/{run.id}/resend-email?force=false")
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["status"] == "sent"

    # Second send without force -> idempotency returns skipped
    resp2 = client.post(f"/api/runs/{run.id}/resend-email?force=false")
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["status"] == "skipped"
    assert "already dispatched" in data2["message"]

    # Third send with force=true -> bypasses idempotency
    resp3 = client.post(f"/api/runs/{run.id}/resend-email?force=true")
    assert resp3.status_code == 200
    data3 = resp3.json()
    assert data3["status"] == "sent"
