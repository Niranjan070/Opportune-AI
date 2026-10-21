"""
MCP Tools REST Endpoints: Discovery, Inspection, and Safe Invocation
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.app.services.mcp_client import mcp_tool_registry

router = APIRouter(prefix="/mcp", tags=["MCP"])


class MCPToolInfo(BaseModel):
    name: str
    description: str
    input_schema: Dict[str, Any] = Field(default_factory=dict)
    is_approved: bool
    server: str


class MCPInvokeRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    timeout_seconds: Optional[int] = 20


class MCPInvokeResponse(BaseModel):
    tool_name: str
    status: str
    latency_ms: int
    data: Optional[Any] = None
    error: Optional[str] = None
    timestamp: str


@router.get("/tools", response_model=List[MCPToolInfo])
async def list_mcp_tools():
    """
    List all discovered and approved MCP tools.
    """
    tools = await mcp_tool_registry.discover_tools()
    return tools


@router.post("/invoke", response_model=MCPInvokeResponse)
async def invoke_mcp_tool(payload: MCPInvokeRequest):
    """
    Safely invoke an approved MCP tool with timeout and schema bounding.
    """
    try:
        result = await mcp_tool_registry.invoke_tool(
            tool_name=payload.tool_name,
            arguments=payload.arguments,
            timeout_seconds=payload.timeout_seconds,
        )
        return result
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"MCP invocation failed: {str(e)}",
        )
