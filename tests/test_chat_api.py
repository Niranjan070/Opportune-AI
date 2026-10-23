"""
Tests for Conversational AI Job Discovery Chat API Endpoints
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.schemas.job import NormalizedJob, WorkplaceType, EmploymentType


@pytest.fixture
def mock_mcp_discovery():
    """Mock MCP tool registry so tests run deterministically and fast without external network calls"""
    mock_jobs = [
        NormalizedJob(
            id="job-1",
            source="greenhouse",
            source_job_id="gh-101",
            title="Senior Python Backend Engineer",
            company="GitLab",
            location="Remote",
            workplace_type=WorkplaceType.REMOTE,
            employment_type=EmploymentType.FULL_TIME,
            description="We are hiring a Senior Python Engineer experienced in FastAPI, PostgreSQL, and Docker.",
            job_url="https://boards.greenhouse.io/gitlab/jobs/gh-101",
        ).model_dump(mode="json"),
        NormalizedJob(
            id="job-2",
            source="arbeitnow",
            source_job_id="arb-202",
            title="Python Developer",
            company="Tech Corp",
            location="Berlin, Germany",
            workplace_type=WorkplaceType.HYBRID,
            employment_type=EmploymentType.FULL_TIME,
            description="Python developer role with Django and React knowledge.",
            job_url="https://arbeitnow.com/jobs/arb-202",
        ).model_dump(mode="json"),
    ]

    with patch("backend.app.services.chat_agent.MCPToolRegistry.invoke_tool") as mock_invoke:
        mock_invoke.return_value = {
            "status": "success",
            "output": mock_jobs,
            "latency_ms": 42,
            "diagnostics": {},
        }
        yield mock_invoke


def test_chat_session_creation_and_listing(db_session):
    client = TestClient(app)

    # 1. Create a session
    res = client.post("/api/chat/sessions", json={"title": "Python Remote Opportunities"})
    assert res.status_code == 201
    session_data = res.json()
    assert session_data["title"] == "Python Remote Opportunities"
    assert session_data["is_email_subscribed"] is False
    session_id = session_data["id"]

    # 2. List sessions
    res_list = client.get("/api/chat/sessions")
    assert res_list.status_code == 200
    sessions = res_list.json()
    assert len(sessions) >= 1
    assert any(s["id"] == session_id for s in sessions)

    # 3. Retrieve session details
    res_detail = client.get(f"/api/chat/sessions/{session_id}")
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["id"] == session_id
    assert isinstance(detail["messages"], list)


def test_send_chat_message_and_retrieve_stream(db_session, mock_mcp_discovery):
    client = TestClient(app)

    # Create session
    res_create = client.post("/api/chat/sessions", json={"title": "New Chat"})
    session_id = res_create.json()["id"]

    # Send user query
    user_msg_payload = {"content": "Find remote senior Python FastAPI roles at GitLab"}
    res_msg = client.post(f"/api/chat/sessions/{session_id}/messages", json=user_msg_payload)
    assert res_msg.status_code == 200
    msg_data = res_msg.json()

    assert msg_data["sender"] == "assistant"
    assert "GitLab" in msg_data["content"] or "Python" in msg_data["content"]
    assert len(msg_data["tool_calls"]) >= 1
    assert len(msg_data["scored_jobs"]) >= 1

    top_job = msg_data["scored_jobs"][0]
    assert "title" in top_job
    assert "match_score" in top_job
    assert top_job["match_score"] > 0
    assert "apply_url" in top_job

    # Retrieve session history and verify both user and assistant messages exist
    res_hist = client.get(f"/api/chat/sessions/{session_id}")
    assert res_hist.status_code == 200
    history = res_hist.json()
    assert len(history["messages"]) == 2
    assert history["messages"][0]["sender"] == "user"
    assert history["messages"][1]["sender"] == "assistant"


def test_chat_email_subscription_flow(db_session, mock_mcp_discovery):
    client = TestClient(app)

    # Create session and send a message so criteria is extracted
    res_create = client.post("/api/chat/sessions", json={
        "title": "FastAPI Roles",
        "initial_message": "Find remote Python FastAPI jobs at GitLab",
    })
    session_id = res_create.json()["id"]

    # Subscribe to email digests
    sub_payload = {"email": "candidate@example.com"}
    res_sub = client.post(f"/api/chat/sessions/{session_id}/subscribe", json=sub_payload)
    assert res_sub.status_code == 200
    sub_data = res_sub.json()
    assert sub_data["is_email_subscribed"] is True
    assert sub_data["subscriber_email"] == "candidate@example.com"
    assert sub_data["search_profile_id"] is not None

    # Verify linked search profile was created in database
    profile_id = sub_data["search_profile_id"]
    res_profile = client.get(f"/api/profiles/{profile_id}")
    assert res_profile.status_code == 200
    profile = res_profile.json()
    assert profile["notification_email"] == "candidate@example.com"
    assert profile["email_digest_enabled"] is True

    # Test unsubscribe
    res_unsub = client.delete(f"/api/chat/sessions/{session_id}/subscribe")
    assert res_unsub.status_code == 200
    unsub_data = res_unsub.json()
    assert unsub_data["is_email_subscribed"] is False


def test_delete_chat_session(db_session):
    client = TestClient(app)

    res_create = client.post("/api/chat/sessions", json={"title": "Temporary Chat"})
    session_id = res_create.json()["id"]

    # Delete session
    res_del = client.delete(f"/api/chat/sessions/{session_id}")
    assert res_del.status_code == 204

    # Verify 404
    res_get = client.get(f"/api/chat/sessions/{session_id}")
    assert res_get.status_code == 404
