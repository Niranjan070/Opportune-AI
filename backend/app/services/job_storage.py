"""
Job Storage and Ingestion Service
Manages persistence, canonical deduplication, source provenance, and query retrieval.
"""
from datetime import datetime, timezone
import logging
from typing import Dict, List, Optional, Tuple
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from backend.app.models.job import Job, JobSourceReference
from backend.app.schemas.job import NormalizedJob, VerificationStatus
from backend.app.services.normalizer import NormalizationService

logger = logging.getLogger(__name__)


class JobStorageService:
    @classmethod
    def persist_jobs(cls, jobs: List[NormalizedJob], db: Session) -> Dict[str, int]:
        """
        Persists a batch of NormalizedJobs.
        Performs canonical deduplication, creates or updates Job records,
        and records source references for provenance.
        """
        stats = {
            "total_processed": len(jobs),
            "discovered": 0,
            "updated": 0,
            "unchanged": 0,
        }

        now = datetime.now(timezone.utc)

        for norm_job in jobs:
            try:
                canonical_hash = NormalizationService.generate_canonical_hash(norm_job)
                sanitized_url = NormalizationService.sanitize_url(norm_job.job_url)
                norm_company = NormalizationService.normalize_company(norm_job.company)

                # Check if job exists by canonical hash
                existing_job = db.query(Job).filter(Job.canonical_hash == canonical_hash).first()

                if existing_job:
                    # Update verification status and timestamp
                    existing_job.last_verified_at = now
                    existing_job.verification_status = VerificationStatus.RECENTLY_CHECKED.value

                    # Check if source reference already exists
                    existing_ref = (
                        db.query(JobSourceReference)
                        .filter(
                            JobSourceReference.job_id == existing_job.id,
                            JobSourceReference.source_name == norm_job.source,
                            JobSourceReference.source_job_id == norm_job.source_job_id,
                        )
                        .first()
                    )

                    if not existing_ref:
                        new_ref = JobSourceReference(
                            job_id=existing_job.id,
                            source_name=norm_job.source,
                            source_job_id=norm_job.source_job_id,
                            source_url=sanitized_url,
                            requisition_id=norm_job.requisition_id,
                            raw_metadata=norm_job.raw_metadata,
                            fetched_at=now,
                        )
                        db.add(new_ref)
                        stats["updated"] += 1
                    else:
                        stats["unchanged"] += 1

                else:
                    # Create new Job record
                    new_job = Job(
                        canonical_hash=canonical_hash,
                        title=norm_job.title.strip(),
                        company=norm_job.company.strip(),
                        normalized_company=norm_company,
                        location=norm_job.location or "Unspecified",
                        workplace_type=norm_job.workplace_type.value,
                        employment_type=norm_job.employment_type.value,
                        description=norm_job.description,
                        primary_url=sanitized_url,
                        posted_at=norm_job.posted_at,
                        salary_min=norm_job.salary_min,
                        salary_max=norm_job.salary_max,
                        currency=norm_job.currency,
                        verification_status=VerificationStatus.RECENTLY_CHECKED.value,
                        last_verified_at=now,
                    )
                    db.add(new_job)
                    db.flush()  # Populates new_job.id

                    # Create initial source reference
                    ref = JobSourceReference(
                        job_id=new_job.id,
                        source_name=norm_job.source,
                        source_job_id=norm_job.source_job_id,
                        source_url=sanitized_url,
                        requisition_id=norm_job.requisition_id,
                        raw_metadata=norm_job.raw_metadata,
                        fetched_at=now,
                    )
                    db.add(ref)
                    stats["discovered"] += 1

            except Exception as e:
                logger.error(f"Error persisting job '{norm_job.title}': {e}", exc_info=True)

        db.commit()
        return stats

    @classmethod
    def get_jobs(
        cls,
        db: Session,
        skip: int = 0,
        limit: int = 50,
        source: Optional[str] = None,
        workplace_type: Optional[str] = None,
        keyword: Optional[str] = None,
    ) -> Tuple[List[Job], int]:
        """
        Query jobs with filtering, eager loading of sources, and pagination.
        """
        query = db.query(Job).options(joinedload(Job.sources))

        if workplace_type and workplace_type.lower() != "any":
            query = query.filter(Job.workplace_type == workplace_type.lower())

        if keyword:
            kw = f"%{keyword.strip().lower()}%"
            query = query.filter(
                or_(
                    Job.title.ilike(kw),
                    Job.company.ilike(kw),
                    Job.location.ilike(kw),
                )
            )

        if source:
            query = query.join(Job.sources).filter(JobSourceReference.source_name == source)

        total = query.count()
        jobs = query.order_by(Job.posted_at.desc().nullslast(), Job.created_at.desc()).offset(skip).limit(limit).all()

        return jobs, total

    @classmethod
    def get_job_by_id(cls, db: Session, job_id: str) -> Optional[Job]:
        """
        Retrieve single job by ID with linked sources.
        """
        return db.query(Job).options(joinedload(Job.sources)).filter(Job.id == job_id).first()
