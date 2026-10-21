"""
Tests for Opportune AI MCP Server Tools
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from backend.mcp_server.server import mcp_server
from backend.app.schemas.job import NormalizedJob, WorkplaceType, EmploymentType


@pytest.mark.asyncio
async def test_mcp_tool_discovery():
    tools = await mcp_server.list_tools()
    tool_names = {t.name for t in tools}
    assert "search_job_sources" in tool_names
    assert "get_company_postings" in tool_names
    assert "check_source_status" in tool_names
    assert "verify_job_url" in tool_names


@pytest.mark.asyncio
async def test_mcp_verify_job_url_ssrf():
    # Attempt SSRF on private / loopback IP
    result = await mcp_server.call_tool("verify_job_url", {"url": "http://127.0.0.1:8000/admin"})
    assert result.is_error is False
    data = result.structured_content
    if isinstance(data, dict):
        res_dict = data.get("result", data)
        assert res_dict.get("is_safe") is False
    else:
        assert '"is_safe": false' in str(result.content[0].text).lower()


@pytest.mark.asyncio
async def test_mcp_check_source_status():
    with patch("backend.app.connectors.arbeitnow.ArbeitnowConnector.check_health", new_callable=AsyncMock) as m_ab, \
         patch("backend.app.connectors.greenhouse.GreenhouseConnector.check_health", new_callable=AsyncMock) as m_gh:
        m_ab.return_value = True
        m_gh.return_value = True

        result = await mcp_server.call_tool("check_source_status", {})
        assert result.is_error is False
        assert len(result.content) >= 1


@pytest.mark.asyncio
async def test_mcp_search_job_sources_invocation():
    mock_job = NormalizedJob(
        source="arbeitnow",
        source_job_id="mcp-test-job-1",
        title="Senior Cloud Engineer",
        company="CloudTech",
        location="Remote",
        workplace_type=WorkplaceType.REMOTE,
        employment_type=EmploymentType.FULL_TIME,
        description="Kubernetes & Terraform",
        job_url="https://example.com/mcp-test-1",
    )

    with patch("backend.app.connectors.arbeitnow.ArbeitnowConnector.search", new_callable=AsyncMock) as mock_search:
        mock_search.return_value = [mock_job]

        result = await mcp_server.call_tool("search_job_sources", {"keywords": "Cloud", "limit": 5})
        assert result.is_error is False
        assert len(result.content) >= 1
