"""
Pydantic Schemas for Deterministic Scoring and Explanations
"""
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from backend.app.schemas.job import JobResponse


class ScoreTier(str, Enum):
    EXCELLENT = "excellent"    # 85 - 100
    STRONG = "strong"          # 70 - 84
    POSSIBLE = "possible"      # 50 - 69
    LOW = "low"                # < 50


class ScoreBreakdown(BaseModel):
    total_score: float = Field(ge=0.0, le=100.0)
    tier: ScoreTier
    score_skills: float = Field(ge=0.0, le=100.0)
    score_title: float = Field(ge=0.0, le=100.0)
    score_experience: float = Field(ge=0.0, le=100.0)
    score_location: float = Field(ge=0.0, le=100.0)
    score_domain: float = Field(ge=0.0, le=100.0)
    score_compensation: float = Field(ge=0.0, le=100.0)
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    explanation: str


class ScoredJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    search_run_id: str
    job_id: str
    job: JobResponse
    match_score: float
    score_tier: ScoreTier
    score_skills: float
    score_title: float
    score_experience: float
    score_location: float
    score_domain: float
    score_compensation: float
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    explanation: str
    is_new_for_user: bool = True
    created_at: str
