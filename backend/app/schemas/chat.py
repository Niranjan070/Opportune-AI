"""
Chat Pydantic Schemas for Request/Response Validation
"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ToolCallRecord(BaseModel):
    tool: str
    args: Dict[str, Any] = Field(default_factory=dict)
    latency_ms: int = 0
    success: bool = True
    result_summary: str = ""


class EmbeddedScoredJob(BaseModel):
    job_id: str
    title: str
    company: str
    location: str = "Remote"
    workplace_type: str = "remote"
    match_score: float
    score_tier: str
    apply_url: str
    source: Optional[str] = None
    source_display: Optional[str] = None
    geo_match_reason: Optional[str] = None
    salary_display: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: Optional[str] = None
    company_logo: Optional[str] = None
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    score_explanation: str = ""
    posted_at: Optional[datetime] = None


class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, description="Candidate chat message text")


class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    sender: str
    content: str
    tool_calls: List[Dict[str, Any]] = Field(default_factory=list)
    scored_jobs: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionCreate(BaseModel):
    title: Optional[str] = None
    initial_message: Optional[str] = None


class ChatSessionUpdate(BaseModel):
    title: Optional[str] = None
    is_email_subscribed: Optional[bool] = None
    subscriber_email: Optional[str] = None


class ChatSubscribeRequest(BaseModel):
    email: str = Field(..., description="Email address for daily 9:00 AM job opportunity digests")


class ChatSessionResponse(BaseModel):
    id: str
    title: str
    search_criteria: Dict[str, Any] = Field(default_factory=dict)
    is_email_subscribed: bool
    subscriber_email: Optional[str] = None
    search_profile_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    model_config = {"from_attributes": True}


class ChatSessionDetailResponse(BaseModel):
    id: str
    title: str
    search_criteria: Dict[str, Any] = Field(default_factory=dict)
    is_email_subscribed: bool
    subscriber_email: Optional[str] = None
    search_profile_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}
