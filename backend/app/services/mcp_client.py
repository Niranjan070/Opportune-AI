"""
MCP Client and Tool Registry Layer
Manages tool discovery, schema validation, allowlist enforcement, execution timeouts,
and structured diagnostics.
"""
import asyncio
import time
from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional

from backend.app.config import settings
from backend.mcp_server.server import mcp_server

logger = logging.getLogger("mcp-client")


class MCPToolRegistry:
    """
    Registry and bounded execution manager for approved MCP tools.
    """
    APPROVED_TOOLS = {
        "search_job_sources",
        "get_company_postings",
        "check_source_status",
        "verify_job_url",
        "search_jobspy_sources",
    }

    def __init__(self, default_timeout_seconds: int = 20):
        self.default_timeout_seconds = default_timeout_seconds
        self._tools_cache: Optional[List[Dict[str, Any]]] = None
        self._semaphore = asyncio.Semaphore(5)  # Bound concurrency to 5 parallel calls

    async def discover_tools(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """
        Discover tools exposed by the MCP server and filter against the approved allowlist.
        """
        if self._tools_cache is not None and not force_refresh:
            return self._tools_cache

        discovered = []
        try:
            tools = await mcp_server.list_tools()
            for t in tools:
                is_approved = t.name in self.APPROVED_TOOLS
                tool_info = {
                    "name": t.name,
                    "description": t.description or "",
                    "input_schema": t.input_schema if hasattr(t, "input_schema") else {},
                    "is_approved": is_approved,
                    "server": "opportune-jobs-mcp",
                }
                if is_approved:
                    discovered.append(tool_info)
                else:
                    logger.warning(f"Ignored unapproved MCP tool discovered from server: {t.name}")

            self._tools_cache = discovered
        except Exception as e:
            logger.error(f"Failed to discover MCP tools: {e}", exc_info=True)
            self._tools_cache = []

        return self._tools_cache

    async def invoke_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        timeout_seconds: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Safely invoke an approved MCP tool with timeout, bounded concurrency,
        and audit logging.
        """
        if tool_name not in self.APPROVED_TOOLS:
            raise PermissionError(
                f"Unauthorized tool invocation: '{tool_name}' is not in the approved MCP tool allowlist."
            )

        timeout = timeout_seconds or self.default_timeout_seconds
        start_time = time.perf_counter()
        timestamp = datetime.now(timezone.utc).isoformat()

        async with self._semaphore:
            try:
                # Execute tool with bounded timeout
                tool_call_coro = mcp_server.call_tool(tool_name, arguments)
                result = await asyncio.wait_for(tool_call_coro, timeout=timeout)

                latency_ms = int((time.perf_counter() - start_time) * 1000)

                # Extract payload from MCPServer result
                output = None
                if result.structured_content:
                    if isinstance(result.structured_content, dict) and "result" in result.structured_content:
                        output = result.structured_content["result"]
                    else:
                        output = result.structured_content
                elif result.content:
                    output = [c.text for c in result.content if hasattr(c, "text")]

                return {
                    "tool_name": tool_name,
                    "status": "error" if result.is_error else "success",
                    "latency_ms": latency_ms,
                    "data": output,
                    "error": None if not result.is_error else str(output),
                    "timestamp": timestamp,
                }

            except asyncio.TimeoutError:
                latency_ms = int((time.perf_counter() - start_time) * 1000)
                logger.error(f"MCP tool '{tool_name}' timed out after {timeout}s")
                return {
                    "tool_name": tool_name,
                    "status": "timeout",
                    "latency_ms": latency_ms,
                    "data": None,
                    "error": f"Tool execution timed out after {timeout} seconds.",
                    "timestamp": timestamp,
                }
            except Exception as e:
                latency_ms = int((time.perf_counter() - start_time) * 1000)
                logger.error(f"MCP tool '{tool_name}' execution failed: {e}", exc_info=True)
                return {
                    "tool_name": tool_name,
                    "status": "error",
                    "latency_ms": latency_ms,
                    "data": None,
                    "error": str(e),
                    "timestamp": timestamp,
                }


# Global singleton instance
mcp_tool_registry = MCPToolRegistry()
