"""
Integration test for Chat Agent Phase 1 Search Intelligence.
Verifies end-to-end processing of a query for 'AI engineer intern in Coimbatore'.
"""
import pytest
from unittest.mock import AsyncMock, patch
from backend.app.database import SessionLocal
from backend.app.models.chat import ChatSession
from backend.app.services.chat_agent import chat_agent_service
from backend.app.schemas.job import NormalizedJob, WorkplaceType, EmploymentType


@pytest.mark.asyncio
async def test_chat_agent_coimbatore_intern_flow():
    db = SessionLocal()
    session = ChatSession(title="Test Coimbatore Search")
    db.add(session)
    db.commit()
    db.refresh(session)

    mock_jobs = [
        NormalizedJob(
            source="jobspy-linkedin",
            source_job_id="cb-ai-1",
            title="AI Engineer Intern",
            company="Coimbatore Tech Labs",
            location="Coimbatore, Tamil Nadu, India",
            job_url="https://linkedin.com/jobs/cb1",
            description="Looking for an AI engineer intern experienced in Python, PyTorch, and Machine Learning.",
            workplace_type=WorkplaceType.ON_SITE,
            employment_type=EmploymentType.INTERNSHIP,
        ),
        NormalizedJob(
            source="arbeitnow",
            source_job_id="eu-ai-2",
            title="Senior AI Engineer",
            company="Berlin Auto GmbH",
            location="Berlin, Germany",
            job_url="https://arbeitnow.com/jobs/eu2",
            description="On-site Senior AI Engineer in Berlin.",
            workplace_type=WorkplaceType.ON_SITE,
            employment_type=EmploymentType.FULL_TIME,
        )
    ]

    # Mock the tool invocation so test doesn't hit live scraping networks
    with patch.object(
        chat_agent_service.mcp_registry,
        "invoke_tool",
        new=AsyncMock(return_value={"status": "success", "data": [j.model_dump() for j in mock_jobs]})
    ):
        msg = await chat_agent_service.process_user_message(
            session=session,
            user_message_text="looking for ai engineer intern in coimbatore",
            db=db
        )

        assert msg is not None
        assert msg.sender == "assistant"
        assert len(msg.scored_jobs) > 0

        # Verify that the top scored job is the Coimbatore job, NOT the Berlin on-site job
        top_job = msg.scored_jobs[0]
        assert "Coimbatore" in top_job["location"]
        assert top_job["company"] == "Coimbatore Tech Labs"
        assert top_job["source_display"] == "LinkedIn"

        # Verify Berlin job was filtered out
        company_names = [j["company"] for j in msg.scored_jobs]
        assert "Berlin Auto GmbH" not in company_names

    db.close()
