"""
Phase 2 Foundation Verification Tests
"""
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import text

from backend.app.main import app
from backend.app.database import SessionLocal, init_db
from backend.app.schemas.job import NormalizedJob, WorkplaceType, EmploymentType
from backend.app.schemas.profile import SearchProfileCreate
from backend.app.schemas.scoring import ScoreBreakdown, ScoreTier
from backend.app.models.profile import SearchProfile
from backend.app.models.job import Job


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    init_db()


def test_root_endpoint():
    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "Opportune AI"
    assert data["status"] == "online"


def test_health_endpoint():
    client = TestClient(app)
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data


def test_readiness_endpoint():
    client = TestClient(app)
    response = client.get("/api/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["database_connected"] is True


def test_normalized_job_schema():
    job = NormalizedJob(
        source="test_source",
        source_job_id="job_123",
        title="Full Stack Software Engineer",
        company="Acme Corp",
        location="Remote",
        workplace_type=WorkplaceType.REMOTE,
        employment_type=EmploymentType.FULL_TIME,
        description="<p>Building scalable systems.</p>",
        job_url="https://example.com/jobs/123",
        posted_at=datetime.now(timezone.utc),
    )
    assert job.source == "test_source"
    assert job.workplace_type == WorkplaceType.REMOTE
    assert job.job_url == "https://example.com/jobs/123"


def test_score_breakdown_schema():
    score = ScoreBreakdown(
        total_score=88.5,
        tier=ScoreTier.EXCELLENT,
        score_skills=90.0,
        score_title=85.0,
        score_experience=90.0,
        score_location=100.0,
        score_domain=80.0,
        score_compensation=70.0,
        matched_skills=["Python", "FastAPI"],
        missing_skills=["Kubernetes"],
        explanation="Strong technical skill overlap and 100% remote match.",
    )
    assert score.tier == ScoreTier.EXCELLENT
    assert score.total_score == 88.5


def test_database_model_operations():
    db = SessionLocal()
    try:
        # Create a test search profile
        profile = SearchProfile(
            name="Backend AI Engineer Profile",
            target_titles=["AI Engineer", "Backend Developer"],
            skills=["Python", "FastAPI", "PostgreSQL"],
            workplace_preference="remote",
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

        assert profile.id is not None
        assert profile.name == "Backend AI Engineer Profile"
        assert "Python" in profile.skills

        # Query back
        fetched = db.query(SearchProfile).filter(SearchProfile.id == profile.id).first()
        assert fetched is not None
        assert fetched.name == "Backend AI Engineer Profile"

        # Clean up
        db.delete(profile)
        db.commit()
    finally:
        db.close()
