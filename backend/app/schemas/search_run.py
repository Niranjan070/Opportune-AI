"""
Pydantic Schemas for Search Runs and Execution Logs
"""
from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from backend.app.schemas.scoring import ScoredJobResponse


class SearchRunTrigger(str, Enum):
    MANUAL = "manual"
    SCHEDULED = "scheduled"


class SearchRunStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    PARTIAL_SUCCESS = "partial_success"
    FAILED = "failed"


class SourceLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source_name: str
    status: str
    items_retrieved: int
    latency_ms: int
    error_details: Optional[str] = None
    executed_at: datetime


class SearchRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    search_profile_id: Optional[str]
    trigger_type: SearchRunTrigger
    status: SearchRunStatus
    total_discovered: int
    total_deduplicated: int
    total_ranked: int
    started_at: datetime
    completed_at: Optional[datetime]
    error_message: Optional[str] = None


class EmailDispatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    search_run_id: str
    recipient_email: str
    idempotency_key: str
    status: str
    provider: str
    provider_message_id: Optional[str] = None
    sent_at: datetime


class TriggerRunRequest(BaseModel):
    search_profile_id: Optional[str] = None
    send_email: bool = True
    limit_per_source: int = 50


class SearchRunDetailResponse(SearchRunResponse):
    source_logs: List[SourceLogResponse] = Field(default_factory=list)
    top_jobs: List[ScoredJobResponse] = Field(default_factory=list)
    email_logs: List[EmailDispatchResponse] = Field(default_factory=list)
