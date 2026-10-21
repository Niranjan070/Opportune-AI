"""
Search Runs and Execution REST API Router
Endpoints for triggering discovery runs, inspecting execution history,
viewing detailed logs with scored jobs, and re-dispatching emails with idempotency control.
"""
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from backend.app.database import get_db
from backend.app.models.profile import SearchProfile
from backend.app.models.search_run import EmailDispatchLog, ScoredJob, SearchRun, SourceExecutionLog
from backend.app.models.job import Job
from backend.app.schemas.search_run import (
    SearchRunDetailResponse,
    SearchRunResponse,
    TriggerRunRequest,
)
from backend.app.services.reporting import EmailReportService
from backend.app.services.scheduler import job_scheduler

logger = logging.getLogger("api.runs")

router = APIRouter(prefix="/runs", tags=["Search Runs"])


@router.post("/trigger", response_model=SearchRunResponse, status_code=status.HTTP_201_CREATED)
async def trigger_search_run(
    request: Optional[TriggerRunRequest] = None,
    db: Session = Depends(get_db),
):
    """
    Manually trigger an immediate end-to-end job discovery, scoring, and digest pipeline.
    """
    req = request or TriggerRunRequest()
    try:
        run = await job_scheduler.run_discovery_pipeline(
            db=db,
            profile_id=req.search_profile_id,
            trigger_type="manual",
            send_email=req.send_email,
            limit_per_source=req.limit_per_source,
        )
        return run
    except RuntimeError as r_err:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(r_err),
        )
    except ValueError as v_err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(v_err),
        )
    except Exception as e:
        logger.error(f"Error executing manual search run: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute discovery pipeline: {str(e)}",
        )


@router.get("", response_model=List[SearchRunResponse])
def list_search_runs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    """
    List past search runs with execution status, counts, and duration.
    """
    query = db.query(SearchRun)
    if status_filter:
        query = query.filter(SearchRun.status == status_filter.lower())
    runs = query.order_by(SearchRun.started_at.desc()).offset(skip).limit(limit).all()
    return runs


@router.get("/{run_id}", response_model=SearchRunDetailResponse)
def get_search_run_detail(
    run_id: str,
    db: Session = Depends(get_db),
):
    """
    Get detailed breakdown of a specific search run including:
    - Per-source execution telemetry (status, items retrieved, latency)
    - Top ranked scored jobs with mathematical component breakdown
    - Email delivery audit logs
    """
    run = db.query(SearchRun).filter(SearchRun.id == run_id).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SearchRun with ID '{run_id}' not found.",
        )

    # Fetch source logs
    source_logs = (
        db.query(SourceExecutionLog)
        .filter(SourceExecutionLog.search_run_id == run_id)
        .order_by(SourceExecutionLog.executed_at.asc())
        .all()
    )

    # Fetch top scored jobs with eager-loaded Job and its sources
    top_jobs = (
        db.query(ScoredJob)
        .options(joinedload(ScoredJob.job).joinedload(Job.sources))
        .filter(ScoredJob.search_run_id == run_id)
        .order_by(ScoredJob.match_score.desc())
        .limit(25)
        .all()
    )

    # Fetch email logs
    email_logs = (
        db.query(EmailDispatchLog)
        .filter(EmailDispatchLog.search_run_id == run_id)
        .order_by(EmailDispatchLog.sent_at.desc())
        .all()
    )

    return SearchRunDetailResponse(
        id=run.id,
        search_profile_id=run.search_profile_id,
        trigger_type=run.trigger_type,
        status=run.status,
        total_discovered=run.total_discovered,
        total_deduplicated=run.total_deduplicated,
        total_ranked=run.total_ranked,
        started_at=run.started_at,
        completed_at=run.completed_at,
        error_message=run.error_message,
        source_logs=source_logs,
        top_jobs=top_jobs,
        email_logs=email_logs,
    )


@router.post("/{run_id}/resend-email")
async def resend_email_digest(
    run_id: str,
    force: bool = Query(False, description="Bypass idempotency cache to force resending"),
    recipient_email: Optional[str] = Query(None, description="Override recipient email"),
    db: Session = Depends(get_db),
):
    """
    Resend or verify the email digest for a completed search run.
    Demonstrates database-backed idempotency protection when force=False.
    """
    run = db.query(SearchRun).filter(SearchRun.id == run_id).first()
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SearchRun with ID '{run_id}' not found.",
        )

    profile = db.query(SearchProfile).filter(SearchProfile.id == run.search_profile_id).first()
    source_logs = (
        db.query(SourceExecutionLog)
        .filter(SourceExecutionLog.search_run_id == run.id)
        .all()
    )
    top_jobs = (
        db.query(ScoredJob)
        .options(joinedload(ScoredJob.job).joinedload(Job.sources))
        .filter(ScoredJob.search_run_id == run.id)
        .order_by(ScoredJob.match_score.desc())
        .limit(10)
        .all()
    )

    result = await EmailReportService.dispatch_email(
        db=db,
        search_run=run,
        profile=profile,
        scored_jobs=top_jobs,
        source_logs=source_logs,
        recipient_email=recipient_email,
        force=force,
    )

    return result
