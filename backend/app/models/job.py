"""
Job and Job Source Reference SQLAlchemy Models
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Text, JSON, Index
from sqlalchemy.orm import relationship
from backend.app.models.base import Base


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    canonical_hash = Column(String(64), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    normalized_company = Column(String(255), index=True, nullable=False)
    location = Column(String(255), default="Unspecified")
    workplace_type = Column(String(50), default="unknown")
    employment_type = Column(String(50), default="unknown")
    description = Column(Text, nullable=False)
    primary_url = Column(Text, nullable=False)
    posted_at = Column(DateTime, nullable=True)
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    currency = Column(String(10), nullable=True)
    verification_status = Column(String(50), default="recently_checked")
    last_verified_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    sources = relationship("JobSourceReference", back_populates="job", cascade="all, delete-orphan")
    scores = relationship("ScoredJob", back_populates="job", cascade="all, delete-orphan")


class JobSourceReference(Base):
    __tablename__ = "job_source_references"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    source_name = Column(String(100), nullable=False)
    source_job_id = Column(String(255), nullable=False)
    source_url = Column(Text, nullable=False)
    requisition_id = Column(String(255), nullable=True)
    raw_metadata = Column(JSON, default=dict)
    fetched_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    job = relationship("Job", back_populates="sources")

    __table_args__ = (
        Index("idx_source_lookup", "source_name", "source_job_id"),
    )
