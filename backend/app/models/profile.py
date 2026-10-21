"""
Search Profile and Job Description SQLAlchemy Models
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from backend.app.models.base import Base


class SearchProfile(Base):
    __tablename__ = "search_profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    target_titles = Column(JSON, default=list)
    skills = Column(JSON, default=list)
    experience_level = Column(String(50), default="Any")
    min_years_experience = Column(Integer, default=0)
    preferred_locations = Column(JSON, default=list)
    workplace_preference = Column(String(50), default="any")
    excluded_employers = Column(JSON, default=list)
    excluded_keywords = Column(JSON, default=list)
    enabled_sources = Column(JSON, default=lambda: ["arbeitnow", "greenhouse", "lever", "remotive"])
    target_ats_companies = Column(JSON, default=lambda: ["gitlab", "figma", "stripe", "airbnb", "palantir"])
    email_digest_enabled = Column(Boolean, default=True)
    notification_email = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    job_descriptions = relationship("JobDescription", back_populates="search_profile", cascade="all, delete-orphan")
    search_runs = relationship("SearchRun", back_populates="search_profile", cascade="all, delete-orphan")


class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    search_profile_id = Column(String(36), ForeignKey("search_profiles.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(255), nullable=True)
    raw_text = Column(Text, nullable=False)
    extracted_skills = Column(JSON, default=list)
    extracted_seniority = Column(String(50), nullable=True)
    extracted_locations = Column(JSON, default=list)
    extracted_responsibilities = Column(JSON, default=list)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    search_profile = relationship("SearchProfile", back_populates="job_descriptions")
