"""
Tests for Lever ATS and Remotive Connectors
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from backend.app.connectors.lever import LeverConnector
from backend.app.connectors.remotive import RemotiveConnector
from backend.app.schemas.job import WorkplaceType, EmploymentType


@pytest.mark.asyncio
async def test_lever_connector_parsing():
    connector = LeverConnector(target_companies=["palantir"])

    fake_response = MagicMock()
    fake_response.status_code = 200
    fake_response.json.return_value = [
        {
            "id": "lever-uuid-444",
            "text": "Forward Deployed Software Engineer",
            "hostedUrl": "https://jobs.lever.co/palantir/lever-uuid-444",
            "applyUrl": "https://jobs.lever.co/palantir/lever-uuid-444/apply",
            "createdAt": 1729000000000,
            "commitment": "Full-time",
            "workplaceType": "hybrid",
            "categories": {
                "location": "New York, NY",
                "team": "Defense",
            },
            "description": "<p>Deploying mission critical software</p>",
        }
    ]

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = fake_response
        jobs = await connector.search(keywords="Deployed", limit=10)

        assert len(jobs) == 1
        job = jobs[0]
        assert job.source == "lever"
        assert job.title == "Forward Deployed Software Engineer"
        assert job.company == "Palantir"
        assert job.workplace_type == WorkplaceType.HYBRID
        assert job.employment_type == EmploymentType.FULL_TIME
        assert "New York" in job.location


@pytest.mark.asyncio
async def test_remotive_connector_parsing():
    connector = RemotiveConnector()

    fake_response = MagicMock()
    fake_response.status_code = 200
    fake_response.json.return_value = {
        "jobs": [
            {
                "id": 883311,
                "url": "https://remotive.com/jobs/883311",
                "title": "Lead Python Developer",
                "company_name": "Distributed Labs",
                "candidate_required_location": "Worldwide",
                "job_type": "full_time",
                "publication_date": "2026-10-18T10:00:00Z",
                "salary": "$130k - $160k",
                "description": "<p>Asyncio and distributed databases</p>",
            }
        ]
    }

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = fake_response
        jobs = await connector.search(keywords="Python", limit=10)

        assert len(jobs) == 1
        job = jobs[0]
        assert job.source == "remotive"
        assert job.title == "Lead Python Developer"
        assert job.company == "Distributed Labs"
        assert job.workplace_type == WorkplaceType.REMOTE
        assert "Remote (Worldwide)" in job.location
        assert job.raw_metadata["salary_text"] == "$130k - $160k"
