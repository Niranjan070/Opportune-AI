"""
Opportune AI — FastAPI Application Entrypoint
"""
from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.database import init_db
from backend.app.api.routes_health import router as health_router
from backend.app.api.routes_jobs import router as jobs_router
from backend.app.api.routes_mcp import router as mcp_router
from backend.app.api.routes_profiles import router as profiles_router
from backend.app.api.routes_runs import router as runs_router
from backend.app.services.scheduler import job_scheduler

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("opportune-ai")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB models
    logger.info("Initializing database schemas...")
    init_db()
    logger.info("Database initialized successfully.")
    if settings.SCHEDULE_ENABLED:
        logger.info("Starting background JobScheduler...")
        job_scheduler.start()
    yield
    # Shutdown
    if settings.SCHEDULE_ENABLED:
        logger.info("Stopping background JobScheduler...")
        job_scheduler.stop()
    logger.info("Application shutting down.")


app = FastAPI(
    title=settings.APP_NAME,
    description="MCP-Powered AI Job Discovery and Opportunity Intelligence Assistant",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(health_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(mcp_router, prefix="/api")
app.include_router(profiles_router, prefix="/api")
app.include_router(runs_router, prefix="/api")


@app.get("/")
def root_endpoint():
    return {
        "app": settings.APP_NAME,
        "tagline": "The right opportunities, delivered daily.",
        "status": "online",
        "docs_url": "/docs",
        "health_check": "/api/health",
        "readiness_check": "/api/ready",
    }
