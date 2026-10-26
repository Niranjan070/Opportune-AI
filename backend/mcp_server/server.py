"""
Opportune AI — Custom Job Source MCP Server
Exposes standardized, typed MCP tools for job discovery, ATS board queries,
source health verification, and URL reachability checks.
"""
import asyncio
from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional
import httpx

from mcp.server.mcpserver import MCPServer
from backend.app.connectors.base import is_safe_url
from backend.app.connectors.arbeitnow import ArbeitnowConnector
from backend.app.connectors.greenhouse import GreenhouseConnector

logger = logging.getLogger("opportune-jobs-mcp")

# Initialize MCP Server
mcp_server = MCPServer(
    name="opportune-jobs-mcp",
    version="1.0.0",
    description="MCP Server providing access to permitted job boards, ATS feeds, and listing verification",
)


from backend.app.connectors.remotive import RemotiveConnector

@mcp_server.tool(
    name="search_job_sources",
    description="Discover job openings across permitted public sources (Arbeitnow, Remotive, etc.) with keyword, location, and workplace filters."
)
async def search_job_sources(
    keywords: Optional[str] = None,
    location: Optional[str] = None,
    workplace_type: Optional[str] = None,
    limit: int = 25,
) -> List[Dict[str, Any]]:
    """
    Search permitted public job sources (Arbeitnow & Remotive) concurrently.
    """
    results: List[Dict[str, Any]] = []

    try:
        arb_conn = ArbeitnowConnector()
        rem_conn = RemotiveConnector()

        tasks = [
            arb_conn.search(keywords=keywords, location=location, workplace_type=workplace_type, limit=limit),
            rem_conn.search(keywords=keywords, location=location, workplace_type=workplace_type, limit=limit),
        ]
        responses = await asyncio.gather(*tasks, return_exceptions=True)

        for resp in responses:
            if isinstance(resp, list):
                for j in resp:
                    results.append(j.model_dump(mode="json"))
            elif isinstance(resp, Exception):
                logger.warning(f"Source search sub-task error: {resp}")
    except Exception as e:
        logger.error(f"Error executing search_job_sources: {e}", exc_info=True)

    return results


@mcp_server.tool(
    name="get_company_postings",
    description="Retrieve published open positions directly from an employer's official ATS board (Greenhouse or Lever)."
)
async def get_company_postings(
    company_token: str,
    keywords: Optional[str] = None,
    location: Optional[str] = None,
    workplace_type: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """
    Fetch direct listings from a company's Greenhouse job board.
    """
    results: List[Dict[str, Any]] = []
    try:
        gh_connector = GreenhouseConnector()
        jobs = await gh_connector.search_company_board(
            board_token=company_token.strip().lower(),
            keywords=keywords,
            location=location,
            workplace_type=workplace_type,
            limit=limit,
        )
        for j in jobs:
            results.append(j.model_dump(mode="json"))
    except Exception as e:
        logger.error(f"Error executing get_company_postings for '{company_token}': {e}", exc_info=True)

    return results


@mcp_server.tool(
    name="check_source_status",
    description="Check reachability, health, and status across job sources (arbeitnow, greenhouse)."
)
async def check_source_status(
    source_name: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Check the health of job discovery sources.
    """
    statuses = {}
    sources_to_check = [source_name] if source_name else ["arbeitnow", "greenhouse"]

    if "arbeitnow" in sources_to_check:
        try:
            c = ArbeitnowConnector()
            ok = await c.check_health()
            statuses["arbeitnow"] = {
                "healthy": ok,
                "type": "public_job_board_api",
                "auth": "keyless",
            }
        except Exception as e:
            statuses["arbeitnow"] = {"healthy": False, "error": str(e)}

    if "greenhouse" in sources_to_check:
        try:
            gh = GreenhouseConnector()
            ok = await gh.check_health()
            statuses["greenhouse"] = {
                "healthy": ok,
                "type": "ats_job_board_api",
                "auth": "keyless",
            }
        except Exception as e:
            statuses["greenhouse"] = {"healthy": False, "error": str(e)}

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sources": statuses,
    }


@mcp_server.tool(
    name="verify_job_url",
    description="Verify if a job posting URL is live and reachable, enforced with SSRF defense."
)
async def verify_job_url(url: str) -> Dict[str, Any]:
    """
    Safely check URL status code and reachability with SSRF protection.
    """
    if not is_safe_url(url):
        return {
            "url": url,
            "is_safe": False,
            "is_active": False,
            "reason": "URL rejected by SSRF protection policy (private or loopback destination).",
        }

    try:
        headers = {"User-Agent": "OpportuneAI-Verifier/1.0"}
        async with httpx.AsyncClient(timeout=10, follow_redirects=True, headers=headers) as client:
            resp = await client.head(url)
            # Some servers block HEAD, fallback to GET if 405 Method Not Allowed
            if resp.status_code == 405:
                resp = await client.get(url)

            is_active = resp.status_code in (200, 301, 302)
            return {
                "url": url,
                "is_safe": True,
                "status_code": resp.status_code,
                "is_active": is_active,
                "final_url": str(resp.url),
            }
    except Exception as e:
        return {
            "url": url,
            "is_safe": True,
            "is_active": False,
            "error": str(e),
        }


@mcp_server.tool(
    name="search_jobspy_sources",
    description="Discover listings across major aggregate boards (LinkedIn, Indeed, Glassdoor, ZipRecruiter) powered by JobSpy."
)
async def search_jobspy_sources(
    keywords: Optional[str] = None,
    location: Optional[str] = None,
    workplace_type: Optional[str] = None,
    limit: int = 15,
    sites: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Search major external job boards via JobSpy concurrently.
    """
    try:
        from backend.app.connectors.jobspy import JobSpyConnector
        connector = JobSpyConnector(timeout_seconds=25)
        jobs = await connector.search(
            keywords=keywords,
            location=location,
            workplace_type=workplace_type,
            limit=limit,
            sites=sites
        )
        return [j.model_dump(mode="json") for j in jobs]
    except Exception as e:
        logger.error(f"search_jobspy_sources failed: {e}", exc_info=True)
        return []


def main():
    """Run the MCP server over stdio transport"""
    asyncio.run(mcp_server.run_stdio_async())


if __name__ == "__main__":
    main()
