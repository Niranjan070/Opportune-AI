"""
Integration Tests for Jobs API Endpoints
"""
import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.schemas.job import NormalizedJob, WorkplaceType, EmploymentType
from backend.app.services.job_storage import JobStorageService


def test_list_jobs_empty_or_paginated():
    client = TestClient(app)
    response = client.get("/api/jobs?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "items" in data
    assert isinstance(data["items"], list)
    assert data["limit"] == 10


def test_get_job_detail_and_not_found(db_session):
    client = TestClient(app)
    db = db_session

    # 404 test
    res_404 = client.get("/api/jobs/non-existent-uuid-1234")
    assert res_404.status_code == 404

    # Seed one job
    norm = NormalizedJob(
        source="arbeitnow",
        source_job_id="api-seed-1",
        title="Senior API Platform Engineer",
        company="API Corp",
        location="Remote",
        workplace_type=WorkplaceType.REMOTE,
        employment_type=EmploymentType.FULL_TIME,
        description="REST & GraphQL APIs",
        job_url="https://example.com/api-seed-1",
        posted_at=datetime.now(timezone.utc),
    )
    JobStorageService.persist_jobs([norm], db)

    # Query list to get its ID
    res_list = client.get("/api/jobs?keyword=API%20Corp")
    assert res_list.status_code == 200
    items = res_list.json()["items"]
    assert len(items) >= 1
    job_id = items[0]["id"]

    # Query single detail
    res_detail = client.get(f"/api/jobs/{job_id}")
    assert res_detail.status_code == 200
    job_data = res_detail.json()
    assert job_data["id"] == job_id
    assert job_data["company"] == "API Corp"
    assert len(job_data["sources"]) >= 1


@pytest.mark.asyncio
async def test_sync_jobs_endpoint():
    client = TestClient(app)

    mock_job = NormalizedJob(
        source="greenhouse",
        source_job_id="gh-sync-99",
        title="Principal AI Research Engineer",
        company="SyncLab",
        location="San Francisco, CA",
        workplace_type=WorkplaceType.HYBRID,
        employment_type=EmploymentType.FULL_TIME,
        description="Pioneering agentic systems",
        job_url="https://boards.greenhouse.io/synclab/jobs/99",
        posted_at=datetime.now(timezone.utc),
    )

    with patch("backend.app.connectors.greenhouse.GreenhouseConnector.search", new_callable=AsyncMock) as mock_gh:
        mock_gh.return_value = [mock_job]

        sync_payload = {
            "sources": ["greenhouse"],
            "keywords": "AI",
            "limit_per_source": 5,
            "companies": ["synclab"],
        }

        response = client.post("/api/jobs/sync", json=sync_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert "greenhouse" in data["sources_polled"]
        assert data["total_retrieved"] == 1
        assert data["discovered"] >= 1
