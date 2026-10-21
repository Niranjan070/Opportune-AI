"""
Job Discovery Scheduler and Pipeline Execution Engine
Orchestrates the complete multi-source discovery, canonical deduplication,
deterministic scoring, ranking, and email digest dispatch pipeline.
"""
import asyncio
from datetime import datetime, timezone
import logging
from typing import Dict, List, Optional
import uuid

from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.database import SessionLocal
from backend.app.models.job import Job
from backend.app.models.profile import SearchProfile
from backend.app.models.search_run import ScoredJob, SearchRun, SourceExecutionLog
from backend.app.services.job_storage import JobStorageService
from backend.app.services.orchestrator import discovery_orchestrator
from backend.app.services.reporting import EmailReportService
from backend.app.services.scorer import DeterministicScoringService

logger = logging.getLogger("scheduler")


class JobScheduler:
    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._active_run_locks: Dict[str, asyncio.Lock] = {}
        self._last_scheduled_date: Optional[str] = None

    def _get_lock(self, profile_id: str) -> asyncio.Lock:
        if profile_id not in self._active_run_locks:
            self._active_run_locks[profile_id] = asyncio.Lock()
        return self._active_run_locks[profile_id]

    def _ensure_default_profile(self, db: Session) -> SearchProfile:
        """
        Ensure at least one active SearchProfile exists in the database.
        """
        profile = db.query(SearchProfile).filter(SearchProfile.is_active == True).first()
        if not profile:
            profile = SearchProfile(
                id=str(uuid.uuid4()),
                name="Software & AI Engineer",
                target_titles=["Software Engineer", "Full Stack Developer", "Backend Engineer", "AI Engineer"],
                skills=["Python", "TypeScript", "React", "FastAPI", "Docker", "SQL", "Git"],
                experience_level="Mid-Senior",
                workplace_preference="remote",
                preferred_locations=["Remote", "United States", "India", "Europe"],
                target_ats_companies=["Automattic", "GitLab", "Shopify", "GitHub", "Vercel"],
                excluded_employers=["Revature", "CyberCoders"],
                excluded_keywords=["C#", ".NET", "PHP", "Unpaid"],
                enabled_sources=["arbeitnow", "greenhouse", "lever", "remotive"],
                email_digest_enabled=True,
                notification_email=settings.DEFAULT_RECIPIENT_EMAIL,
                is_active=True,
            )
            db.add(profile)
            db.commit()
            db.refresh(profile)
            logger.info(f"Created default search profile: '{profile.name}' ({profile.id})")
        return profile

    async def run_discovery_pipeline(
        self,
        db: Session,
        profile_id: Optional[str] = None,
        trigger_type: str = "manual",
        send_email: bool = True,
        limit_per_source: int = 50,
    ) -> SearchRun:
        """
        Execute the complete end-to-end pipeline:
        1. Fetch target SearchProfile
        2. Create SearchRun (status="running")
        3. Execute multi-source job discovery via DiscoveryOrchestrator
        4. Ingest, normalize, and canonically deduplicate listings
        5. Score candidate jobs using DeterministicScoringService
        6. Persist ScoredJob entries with component breakdowns & explanations
        7. Generate and idempotently dispatch email digest
        8. Update SearchRun status and completed timestamp
        """
        # 1. Resolve Profile
        if profile_id:
            profile = db.query(SearchProfile).filter(SearchProfile.id == profile_id).first()
            if not profile:
                raise ValueError(f"SearchProfile with ID '{profile_id}' not found.")
        else:
            profile = self._ensure_default_profile(db)

        # 2. Concurrency Lock check
        lock = self._get_lock(profile.id)
        if lock.locked():
            raise RuntimeError(f"A discovery run is already in progress for profile '{profile.name}'.")

        async with lock:
            search_run = SearchRun(
                id=str(uuid.uuid4()),
                search_profile_id=profile.id,
                trigger_type=trigger_type,
                status="running",
                started_at=datetime.now(timezone.utc),
            )
            db.add(search_run)
            db.commit()
            db.refresh(search_run)

            try:
                # 3. Discover across enabled sources
                sources = profile.enabled_sources if profile.enabled_sources else None
                primary_keyword = profile.target_titles[0] if profile.target_titles else None
                primary_loc = profile.preferred_locations[0] if profile.preferred_locations else None

                discovery_result = await discovery_orchestrator.execute_discovery_run(
                    db=db,
                    search_run=search_run,
                    enabled_sources=sources,
                    keywords=primary_keyword,
                    location=primary_loc,
                    workplace_type=profile.workplace_preference,
                    limit_per_source=limit_per_source,
                    target_companies=profile.target_ats_companies,
                )

                # 4. Fetch candidate jobs from DB for scoring
                candidate_jobs = (
                    db.query(Job)
                    .order_by(Job.last_verified_at.desc(), Job.created_at.desc())
                    .limit(200)
                    .all()
                )

                # 5. Score candidate jobs deterministically
                scored_entries: List[ScoredJob] = []
                for job in candidate_jobs:
                    norm_job = JobStorageService.job_to_normalized(job)
                    breakdown, is_excluded = DeterministicScoringService.evaluate_job(norm_job, profile)

                    scored_job = ScoredJob(
                        id=str(uuid.uuid4()),
                        search_run_id=search_run.id,
                        job_id=job.id,
                        match_score=breakdown.total_score,
                        score_tier=breakdown.tier.value,
                        score_skills=breakdown.score_skills,
                        score_title=breakdown.score_title,
                        score_experience=breakdown.score_experience,
                        score_location=breakdown.score_location,
                        score_domain=breakdown.score_domain,
                        score_compensation=breakdown.score_compensation,
                        matched_skills=breakdown.matched_skills,
                        missing_skills=breakdown.missing_skills,
                        explanation=breakdown.explanation,
                        is_new_for_user=True,
                        created_at=datetime.now(timezone.utc),
                    )
                    db.add(scored_job)
                    scored_entries.append(scored_job)

                db.flush()

                # 6. Rank and finalize SearchRun statistics
                search_run.total_ranked = len(scored_entries)
                search_run.completed_at = datetime.now(timezone.utc)
                if search_run.status != "partial_success":
                    search_run.status = "completed"

                # 7. Discard exclusions and fetch top ranked jobs for reporting
                top_ranked_jobs = (
                    db.query(ScoredJob)
                    .filter(ScoredJob.search_run_id == search_run.id)
                    .order_by(ScoredJob.match_score.desc())
                    .limit(10)
                    .all()
                )

                # 8. Dispatch Email Digest
                if send_email and profile.email_digest_enabled:
                    source_logs = (
                        db.query(SourceExecutionLog)
                        .filter(SourceExecutionLog.search_run_id == search_run.id)
                        .all()
                    )
                    try:
                        await EmailReportService.dispatch_email(
                            db=db,
                            search_run=search_run,
                            profile=profile,
                            scored_jobs=top_ranked_jobs,
                            source_logs=source_logs,
                            recipient_email=profile.notification_email,
                        )
                    except Exception as email_err:
                        logger.error(f"Failed to dispatch email digest: {email_err}", exc_info=True)

                db.commit()
                db.refresh(search_run)
                return search_run

            except Exception as e:
                logger.error(f"Search run {search_run.id} failed: {e}", exc_info=True)
                search_run.status = "failed"
                search_run.error_message = str(e)
                search_run.completed_at = datetime.now(timezone.utc)
                db.commit()
                raise e

    async def _scheduler_loop(self):
        """
        Background scheduler daemon checking at periodic intervals.
        Defaults to daily execution at 09:00 AM or per settings.SCHEDULE_CRON.
        """
        logger.info(f"Daily scheduler daemon started. Timezone: {settings.SCHEDULE_TIMEZONE}")
        while self._running:
            try:
                now = datetime.now()
                today_str = now.strftime("%Y-%m-%d")

                # Parse simple hour/minute schedule (e.g. 9:00 AM)
                cron_parts = settings.SCHEDULE_CRON.split()
                target_minute = int(cron_parts[0]) if len(cron_parts) > 0 and cron_parts[0].isdigit() else 0
                target_hour = int(cron_parts[1]) if len(cron_parts) > 1 and cron_parts[1].isdigit() else 9

                if (
                    settings.SCHEDULE_ENABLED
                    and now.hour == target_hour
                    and now.minute == target_minute
                    and self._last_scheduled_date != today_str
                ):
                    logger.info(f"Executing daily scheduled job discovery at {now.isoformat()}...")
                    self._last_scheduled_date = today_str
                    
                    db = SessionLocal()
                    try:
                        active_profiles = db.query(SearchProfile).filter(SearchProfile.is_active == True).all()
                        if not active_profiles:
                            active_profiles = [self._ensure_default_profile(db)]

                        for prof in active_profiles:
                            try:
                                await self.run_discovery_pipeline(
                                    db=db,
                                    profile_id=prof.id,
                                    trigger_type="scheduled",
                                    send_email=prof.email_digest_enabled,
                                )
                            except Exception as run_err:
                                logger.error(f"Scheduled discovery failed for profile {prof.id}: {run_err}")
                    finally:
                        db.close()

            except Exception as loop_err:
                logger.error(f"Error in scheduler tick: {loop_err}", exc_info=True)

            # Sleep 30 seconds before next tick check
            await asyncio.sleep(30)

    def start(self):
        """Start the background scheduler task."""
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._scheduler_loop())
            logger.info("JobScheduler service started.")

    def stop(self):
        """Stop the background scheduler task."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            logger.info("JobScheduler service stopped.")


# Global singleton scheduler instance
job_scheduler = JobScheduler()
