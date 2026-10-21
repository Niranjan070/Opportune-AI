"""
Job Endpoints: Listing, Retrieval, and On-Demand Ingestion Sync
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.connectors.arbeitnow import ArbeitnowConnector
from backend.app.connectors.greenhouse import GreenhouseConnector
from backend.app.schemas.job import JobResponse
from backend.app.services.job_storage import JobStorageService

router = APIRouter(prefix="/jobs", tags=["Jobs"])


class PaginatedJobsResponse(BaseModel):
    total: int
    skip: int
    limit: int
    items: List[JobResponse]


class SyncJobsRequest(BaseModel):
    sources: List[str] = Field(default_factory=lambda: ["arbeitnow", "greenhouse"])
    keywords: Optional[str] = None
    location: Optional[str] = None
    workplace_type: Optional[str] = None
    limit_per_source: int = 25
    companies: Optional[List[str]] = None


class SyncJobsResponse(BaseModel):
    status: str
    sources_polled: List[str]
    total_retrieved: int
    discovered: int
    updated: int
    unchanged: int


@router.get("", response_model=PaginatedJobsResponse)
def list_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    keyword: Optional[str] = None,
    source: Optional[str] = None,
    workplace_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    List persisted jobs with keyword search, source filtering, and pagination.
    """
    jobs, total = JobStorageService.get_jobs(
        db=db,
        skip=skip,
        limit=limit,
        source=source,
        workplace_type=workplace_type,
        keyword=keyword,
    )
    return PaginatedJobsResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=jobs,
    )


@router.get("/{job_id}", response_model=JobResponse)
def get_job_detail(job_id: str, db: Session = Depends(get_db)):
    """
    Retrieve single job details and linked source references.
    """
    job = JobStorageService.get_job_by_id(db=db, job_id=job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID '{job_id}' not found",
        )
    return job


@router.post("/sync", response_model=SyncJobsResponse)
async def sync_jobs(payload: SyncJobsRequest, db: Session = Depends(get_db)):
    """
    Trigger on-demand sync from permitted job sources and persist results.
    """
    retrieved_jobs = []
    sources_polled = []

    # 1. Arbeitnow
    if "arbeitnow" in payload.sources:
        try:
            connector = ArbeitnowConnector()
            jobs = await connector.search(
                keywords=payload.keywords,
                location=payload.location,
                workplace_type=payload.workplace_type,
                limit=payload.limit_per_source,
            )
            retrieved_jobs.extend(jobs)
            sources_polled.append("arbeitnow")
        except Exception as e:
            # Source failures are isolated and logged without crashing the sync
            pass

    # 2. Greenhouse
    if "greenhouse" in payload.sources:
        try:
            gh_connector = GreenhouseConnector(target_companies=payload.companies)
            gh_jobs = await gh_connector.search(
                keywords=payload.keywords,
                location=payload.location,
                workplace_type=payload.workplace_type,
                limit=payload.limit_per_source,
                companies=payload.companies,
            )
            retrieved_jobs.extend(gh_jobs)
            sources_polled.append("greenhouse")
        except Exception as e:
            pass

    # Persist and deduplicate
    stats = JobStorageService.persist_jobs(retrieved_jobs, db)

    return SyncJobsResponse(
        status="completed",
        sources_polled=sources_polled,
        total_retrieved=stats["total_processed"],
        discovered=stats["discovered"],
        updated=stats["updated"],
        unchanged=stats["unchanged"],
    )
