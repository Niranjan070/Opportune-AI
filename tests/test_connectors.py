"""
Tests for Job Connectors & SSRF Protection
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from backend.app.connectors.base import is_safe_url
from backend.app.connectors.arbeitnow import ArbeitnowConnector
from backend.app.connectors.greenhouse import GreenhouseConnector
from backend.app.schemas.job import WorkplaceType


def test_ssrf_protection_filters_private_and_loopback_ips():
    assert is_safe_url("http://127.0.0.1:8000/api") is False
    assert is_safe_url("http://localhost:8080") is False
    assert is_safe_url("http://10.0.0.1/admin") is False
    assert is_safe_url("http://192.168.1.1/secret") is False
    assert is_safe_url("http://169.254.169.254/latest/meta-data/") is False
    assert is_safe_url("file:///etc/passwd") is False
    assert is_safe_url("ftp://example.com/file") is False
    # Safe public URL
    assert is_safe_url("https://www.arbeitnow.com/api/job-board-api") is True
    assert is_safe_url("https://boards-api.greenhouse.io/v1/boards/gitlab/jobs") is True


@pytest.mark.asyncio
async def test_arbeitnow_connector_parsing():
    connector = ArbeitnowConnector()

    fake_response = MagicMock()
    fake_response.status_code = 200
    fake_response.json.return_value = {
        "data": [
            {
                "slug": "senior-python-dev-123",
                "company_name": "TestCorp",
                "title": "Senior Python Developer",
                "description": "<p>We are hiring a Senior Python Developer.</p>",
                "remote": True,
                "url": "https://www.arbeitnow.com/jobs/companies/testcorp/senior-python-dev-123",
                "tags": ["Python", "Django", "FastAPI"],
                "job_types": ["Full Time"],
                "location": "Berlin, Germany",
                "created_at": 1729000000,
            }
        ]
    }

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = fake_response
        jobs = await connector.search(keywords="Python", limit=10)

        assert len(jobs) == 1
        job = jobs[0]
        assert job.source == "arbeitnow"
        assert job.title == "Senior Python Developer"
        assert job.company == "TestCorp"
        assert job.workplace_type == WorkplaceType.REMOTE
        assert "FastAPI" in job.raw_metadata["tags"]


@pytest.mark.asyncio
async def test_greenhouse_connector_parsing():
    connector = GreenhouseConnector(target_companies=["gitlab"])

    fake_response = MagicMock()
    fake_response.status_code = 200
    fake_response.json.return_value = {
        "jobs": [
            {
                "id": 998877,
                "title": "Staff Backend Engineer, Data",
                "updated_at": "2026-10-18T12:00:00Z",
                "requisition_id": "REQ-101",
                "absolute_url": "https://boards.greenhouse.io/gitlab/jobs/998877",
                "location": {"name": "Remote, Global"},
                "departments": [{"name": "Engineering"}],
                "offices": [{"name": "Remote"}],
                "content": "&lt;p&gt;About the role...&lt;/p&gt;",
            }
        ]
    }

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = fake_response
        jobs = await connector.search(keywords="Backend", limit=10)

        assert len(jobs) == 1
        job = jobs[0]
        assert job.source == "greenhouse"
        assert job.title == "Staff Backend Engineer, Data"
        assert job.company == "Gitlab"
        assert job.workplace_type == WorkplaceType.REMOTE
        assert job.requisition_id == "REQ-101"
        assert job.posted_at is not None
