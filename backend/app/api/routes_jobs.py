"""
Job Endpoints: Listing, Retrieval, Saved Jobs, and On-Demand Ingestion Sync
"""
import csv
import io
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.connectors.arbeitnow import ArbeitnowConnector
from backend.app.connectors.greenhouse import GreenhouseConnector
from backend.app.models.job import SavedJob
from backend.app.schemas.job import JobResponse, SavedJobCreate, SavedJobResponse
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


# ---------------------------------------------------------------------------
# Saved Jobs & Bookmarking Endpoints (Declared before /{job_id} to avoid collision)
# ---------------------------------------------------------------------------

@router.get("/saved", response_model=List[SavedJobResponse])
def list_saved_jobs(
    keyword: Optional[str] = None,
    source: Optional[str] = None,
    sort_by: str = Query("match_score", pattern="^(match_score|created_at|company)$"),
    db: Session = Depends(get_db),
):
    """
    List candidate saved jobs with optional keyword search and sorting.
    """
    query = db.query(SavedJob)

    if keyword:
        pattern = f"%{keyword.strip().lower()}%"
        query = query.filter(
            (SavedJob.title.ilike(pattern)) | (SavedJob.company.ilike(pattern)) | (SavedJob.location.ilike(pattern))
        )

    if source:
        query = query.filter(SavedJob.source.ilike(f"%{source.strip()}%"))

    if sort_by == "created_at":
        query = query.order_by(SavedJob.created_at.desc())
    elif sort_by == "company":
        query = query.order_by(SavedJob.company.asc())
    else:
        query = query.order_by(SavedJob.match_score.desc())

    return query.all()


@router.post("/saved", response_model=SavedJobResponse, status_code=status.HTTP_201_CREATED)
def save_job(payload: SavedJobCreate, db: Session = Depends(get_db)):
    """
    Save or update a bookmarked job.
    """
    existing = db.query(SavedJob).filter(SavedJob.job_id == payload.job_id).first()
    if existing:
        existing.title = payload.title
        existing.company = payload.company
        existing.location = payload.location or existing.location
        existing.workplace_type = payload.workplace_type or existing.workplace_type
        existing.apply_url = payload.apply_url
        existing.source = payload.source or existing.source
        existing.source_display = payload.source_display or existing.source_display
        existing.match_score = payload.match_score if payload.match_score is not None else existing.match_score
        existing.score_tier = payload.score_tier or existing.score_tier
        existing.salary_display = payload.salary_display or existing.salary_display
        existing.company_logo = payload.company_logo or existing.company_logo
        existing.matched_skills = payload.matched_skills or existing.matched_skills
        existing.missing_skills = payload.missing_skills or existing.missing_skills
        existing.score_explanation = payload.score_explanation or existing.score_explanation
        db.commit()
        db.refresh(existing)
        return existing

    new_saved = SavedJob(
        job_id=payload.job_id,
        title=payload.title,
        company=payload.company,
        location=payload.location or "Unspecified",
        workplace_type=payload.workplace_type or "unknown",
        apply_url=payload.apply_url,
        source=payload.source or "web",
        source_display=payload.source_display,
        match_score=payload.match_score or 0.0,
        score_tier=payload.score_tier or "strong",
        salary_display=payload.salary_display,
        company_logo=payload.company_logo,
        matched_skills=payload.matched_skills or [],
        missing_skills=payload.missing_skills or [],
        score_explanation=payload.score_explanation,
        posted_at=payload.posted_at,
    )
    db.add(new_saved)
    db.commit()
    db.refresh(new_saved)
    return new_saved


@router.delete("/saved/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_job(job_id: str, db: Session = Depends(get_db)):
    """
    Remove a job from saved bookmarks.
    """
    item = db.query(SavedJob).filter(SavedJob.job_id == job_id).first()
    if not item:
        # Also check by DB UUID
        item = db.query(SavedJob).filter(SavedJob.id == job_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved job not found")

    db.delete(item)
    db.commit()
    return None


@router.get("/saved/check/{job_id}")
def check_saved_job(job_id: str, db: Session = Depends(get_db)):
    """
    Check if a specific job_id is bookmarked.
    """
    exists = db.query(SavedJob).filter(SavedJob.job_id == job_id).first() is not None
    return {"job_id": job_id, "is_saved": exists}


@router.get("/saved/export")
def export_saved_jobs_csv(db: Session = Depends(get_db)):
    """
    Export all saved opportunities to a standard CSV file for tracking and spreadsheets.
    """
    saved_jobs = db.query(SavedJob).order_by(SavedJob.match_score.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Headers
    writer.writerow([
        "Title",
        "Company",
        "Location",
        "Workplace Type",
        "Source Platform",
        "Match Score (%)",
        "Score Tier",
        "Compensation",
        "Matched Skills",
        "Apply URL",
        "Saved Date",
    ])

    for job in saved_jobs:
        skills_str = ", ".join(job.matched_skills) if job.matched_skills else ""
        saved_date_str = job.created_at.strftime("%Y-%m-%d %H:%M") if job.created_at else ""
        writer.writerow([
            job.title,
            job.company,
            job.location,
            job.workplace_type,
            job.source_display or job.source,
            f"{job.match_score:.1f}",
            job.score_tier,
            job.salary_display or "Undisclosed",
            skills_str,
            job.apply_url,
            saved_date_str,
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": 'attachment; filename="opportune_saved_jobs.csv"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


# ---------------------------------------------------------------------------
# General Job Listing & Sync Endpoints
# ---------------------------------------------------------------------------

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
        except Exception:
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
        except Exception:
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
