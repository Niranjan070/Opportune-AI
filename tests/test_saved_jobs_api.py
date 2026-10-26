"""
Tests for Saved Jobs and Bookmarking API Endpoints
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    init_db()


def test_save_and_list_saved_job():
    payload = {
        "job_id": "test-job-unique-123",
        "title": "Senior AI Engineer",
        "company": "DeepMind",
        "location": "Coimbatore, India",
        "workplace_type": "hybrid",
        "apply_url": "https://careers.google.com/jobs/123",
        "source": "jobspy_linkedin",
        "source_display": "LinkedIn",
        "match_score": 92.5,
        "score_tier": "excellent",
        "salary_display": "₹25 – 35 LPA",
        "matched_skills": ["Python", "PyTorch", "FastAPI"],
        "missing_skills": ["C++"],
        "score_explanation": "Strong AI match",
    }

    # 1. Save Job
    post_res = client.post("/api/jobs/saved", json=payload)
    assert post_res.status_code == 201
    saved_data = post_res.json()
    assert saved_data["job_id"] == "test-job-unique-123"
    assert saved_data["title"] == "Senior AI Engineer"
    assert saved_data["salary_display"] == "₹25 – 35 LPA"

    # 2. Check Saved
    check_res = client.get("/api/jobs/saved/check/test-job-unique-123")
    assert check_res.status_code == 200
    assert check_res.json()["is_saved"] is True

    # 3. List Saved Jobs
    list_res = client.get("/api/jobs/saved")
    assert list_res.status_code == 200
    items = list_res.json()
    assert len(items) >= 1
    found = any(j["job_id"] == "test-job-unique-123" for j in items)
    assert found is True

    # 4. Export CSV
    export_res = client.get("/api/jobs/saved/export")
    assert export_res.status_code == 200
    assert "text/csv" in export_res.headers.get("content-type", "")
    assert "Senior AI Engineer" in export_res.text
    assert "DeepMind" in export_res.text

    # 5. Delete Saved Job
    del_res = client.delete("/api/jobs/saved/test-job-unique-123")
    assert del_res.status_code == 204

    # 6. Verify Deleted
    check_after = client.get("/api/jobs/saved/check/test-job-unique-123")
    assert check_after.json()["is_saved"] is False
