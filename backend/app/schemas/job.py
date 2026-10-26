"""
Pydantic Schemas for Job Listings and Sources
"""
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, HttpUrl, ConfigDict


class WorkplaceType(str, Enum):
    REMOTE = "remote"
    HYBRID = "hybrid"
    ON_SITE = "on_site"
    UNKNOWN = "unknown"


class EmploymentType(str, Enum):
    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    INTERNSHIP = "internship"
    TEMPORARY = "temporary"
    UNKNOWN = "unknown"


class VerificationStatus(str, Enum):
    RECENTLY_CHECKED = "recently_checked"
    LIKELY_ACTIVE = "likely_active"
    NEEDS_REVIEW = "needs_review"
    POSSIBLY_STALE = "possibly_stale"
    UNAVAILABLE = "unavailable"


class NormalizedJob(BaseModel):
    """
    Unified Normalized Job Model fed by all MCP and direct connectors.
    """
    model_config = ConfigDict(from_attributes=True)

    source: str
    source_job_id: str
    title: str
    company: str
    location: Optional[str] = "Unspecified"
    workplace_type: WorkplaceType = WorkplaceType.UNKNOWN
    employment_type: EmploymentType = EmploymentType.UNKNOWN
    description: str
    job_url: str
    posted_at: Optional[datetime] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: Optional[str] = None
    requisition_id: Optional[str] = None
    raw_metadata: Dict[str, Any] = Field(default_factory=dict)
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class JobSourceRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source_name: str
    source_job_id: str
    source_url: str
    requisition_id: Optional[str] = None
    fetched_at: datetime


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    canonical_hash: str
    title: str
    company: str
    location: Optional[str]
    workplace_type: WorkplaceType
    employment_type: EmploymentType
    description: str
    primary_url: str
    posted_at: Optional[datetime]
    salary_min: Optional[float]
    salary_max: Optional[float]
    currency: Optional[str]
    verification_status: VerificationStatus
    last_verified_at: Optional[datetime]
    sources: List[JobSourceRef] = Field(default_factory=list)
    created_at: datetime


class SavedJobCreate(BaseModel):
    job_id: str
    title: str
    company: str
    location: Optional[str] = "Unspecified"
    workplace_type: Optional[str] = "unknown"
    apply_url: str
    source: Optional[str] = "web"
    source_display: Optional[str] = None
    match_score: Optional[float] = 0.0
    score_tier: Optional[str] = "strong"
    salary_display: Optional[str] = None
    company_logo: Optional[str] = None
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    score_explanation: Optional[str] = None
    posted_at: Optional[datetime] = None


class SavedJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    job_id: str
    title: str
    company: str
    location: Optional[str] = "Unspecified"
    workplace_type: Optional[str] = "unknown"
    apply_url: str
    source: Optional[str] = "web"
    source_display: Optional[str] = None
    match_score: float = 0.0
    score_tier: str = "strong"
    salary_display: Optional[str] = None
    company_logo: Optional[str] = None
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    score_explanation: Optional[str] = None
    posted_at: Optional[datetime] = None
    created_at: datetime

