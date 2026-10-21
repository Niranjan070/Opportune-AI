"""
Integration Tests for MCP Client Registry and REST Endpoints
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.mcp_client import mcp_tool_registry


@pytest.mark.asyncio
async def test_mcp_registry_discover_approved_tools():
    tools = await mcp_tool_registry.discover_tools(force_refresh=True)
    tool_names = [t["name"] for t in tools]
    assert "search_job_sources" in tool_names
    assert "verify_job_url" in tool_names
    for t in tools:
        assert t["is_approved"] is True


@pytest.mark.asyncio
async def test_mcp_registry_blocks_unauthorized_tool():
    with pytest.raises(PermissionError) as exc_info:
        await mcp_tool_registry.invoke_tool("arbitrary_unapproved_tool", {})
    assert "Unauthorized tool invocation" in str(exc_info.value)


@pytest.mark.asyncio
async def test_mcp_registry_invoke_tool_success():
    res = await mcp_tool_registry.invoke_tool(
        "verify_job_url",
        {"url": "https://www.arbeitnow.com/api/job-board-api"}
    )
    assert res["tool_name"] == "verify_job_url"
    assert "latency_ms" in res
    assert res["status"] == "success"
    assert res["data"]["is_safe"] is True


def test_api_list_mcp_tools():
    client = TestClient(app)
    response = client.get("/api/mcp/tools")
    assert response.status_code == 200
    tools = response.json()
    assert isinstance(tools, list)
    assert len(tools) >= 4
    names = [t["name"] for t in tools]
    assert "search_job_sources" in names
    assert "get_company_postings" in names


def test_api_invoke_mcp_tool_success():
    client = TestClient(app)

    with patch("backend.app.connectors.arbeitnow.ArbeitnowConnector.check_health", new_callable=AsyncMock) as m_ab, \
         patch("backend.app.connectors.greenhouse.GreenhouseConnector.check_health", new_callable=AsyncMock) as m_gh:
        m_ab.return_value = True
        m_gh.return_value = True

        payload = {
            "tool_name": "check_source_status",
            "arguments": {"source_name": "arbeitnow"},
        }
        response = client.post("/api/mcp/invoke", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["tool_name"] == "check_source_status"
        assert data["status"] == "success"
        assert "latency_ms" in data


def test_api_invoke_unauthorized_mcp_tool_forbidden():
    client = TestClient(app)
    payload = {
        "tool_name": "execute_shell_command",
        "arguments": {"cmd": "whoami"},
    }
    response = client.post("/api/mcp/invoke", json=payload)
    assert response.status_code == 403
    assert "Unauthorized tool invocation" in response.json()["detail"]
