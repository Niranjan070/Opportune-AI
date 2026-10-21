"""
Search Run, Scored Job, Source Execution Log, and Email Dispatch Log Models
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Text, JSON, Index
from sqlalchemy.orm import relationship
from backend.app.models.base import Base


class SearchRun(Base):
    __tablename__ = "search_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    search_profile_id = Column(String(36), ForeignKey("search_profiles.id", ondelete="SET NULL"), nullable=True)
    trigger_type = Column(String(50), default="manual")  # manual, scheduled
    status = Column(String(50), default="running")       # running, completed, partial_success, failed
    total_discovered = Column(Integer, default=0)
    total_deduplicated = Column(Integer, default=0)
    total_ranked = Column(Integer, default=0)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)

    # Relationships
    search_profile = relationship("SearchProfile", back_populates="search_runs")
    scored_jobs = relationship("ScoredJob", back_populates="search_run", cascade="all, delete-orphan")
    source_logs = relationship("SourceExecutionLog", back_populates="search_run", cascade="all, delete-orphan")
    email_logs = relationship("EmailDispatchLog", back_populates="search_run", cascade="all, delete-orphan")


class ScoredJob(Base):
    __tablename__ = "scored_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    search_run_id = Column(String(36), ForeignKey("search_runs.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(String(36), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    match_score = Column(Float, nullable=False)
    score_tier = Column(String(50), nullable=False)  # excellent, strong, possible, low
    score_skills = Column(Float, default=0.0)
    score_title = Column(Float, default=0.0)
    score_experience = Column(Float, default=0.0)
    score_location = Column(Float, default=0.0)
    score_domain = Column(Float, default=0.0)
    score_compensation = Column(Float, default=0.0)
    matched_skills = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)
    explanation = Column(Text, nullable=False)
    is_new_for_user = Column(Boolean, default=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    search_run = relationship("SearchRun", back_populates="scored_jobs")
    job = relationship("Job", back_populates="scores")

    __table_args__ = (
        Index("idx_run_score", "search_run_id", "match_score"),
    )


class SourceExecutionLog(Base):
    __tablename__ = "source_execution_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    search_run_id = Column(String(36), ForeignKey("search_runs.id", ondelete="CASCADE"), nullable=False)
    source_name = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False)  # success, failure, timeout
    items_retrieved = Column(Integer, default=0)
    latency_ms = Column(Integer, default=0)
    error_details = Column(Text, nullable=True)
    executed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    search_run = relationship("SearchRun", back_populates="source_logs")


class EmailDispatchLog(Base):
    __tablename__ = "email_dispatch_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    search_run_id = Column(String(36), ForeignKey("search_runs.id", ondelete="CASCADE"), nullable=False)
    recipient_email = Column(String(255), nullable=False)
    idempotency_key = Column(String(255), unique=True, index=True, nullable=False)
    status = Column(String(50), nullable=False)  # sent, failed, skipped
    provider = Column(String(50), nullable=False)
    provider_message_id = Column(String(255), nullable=True)
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    search_run = relationship("SearchRun", back_populates="email_logs")
