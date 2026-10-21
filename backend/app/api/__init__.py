from backend.app.api.routes_health import router as health_router
from backend.app.api.routes_jobs import router as jobs_router
from backend.app.api.routes_mcp import router as mcp_router

__all__ = ["health_router", "jobs_router", "mcp_router"]
