# Opportune AI — Data Model & Schema Specifications

**Version:** 1.0.0  
**Target ORM:** SQLAlchemy 2.0 (PostgreSQL / SQLite)  
**Schema Validation:** Pydantic v2  

---

## 1. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    SEARCH_PROFILE ||--o{ SEARCH_RUN : triggers
    SEARCH_PROFILE ||--o{ JOB_DESCRIPTION : contains
    SEARCH_RUN ||--o{ SCORED_JOB : produces
    SEARCH_RUN ||--o{ SOURCE_EXECUTION_LOG : records
    SEARCH_RUN ||--o{ EMAIL_DISPATCH_LOG : sends
    JOB ||--o{ JOB_SOURCE_REFERENCE : has
    JOB ||--o{ SCORED_JOB : evaluated_in

    SEARCH_PROFILE {
        uuid id PK
        string name
        jsonb target_titles
        jsonb skills
        string experience_level
        int min_years_experience
        jsonb preferred_locations
        string workplace_preference
        jsonb excluded_employers
        jsonb excluded_keywords
        jsonb enabled_sources
        jsonb target_ats_companies
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    JOB_DESCRIPTION {
        uuid id PK
        uuid search_profile_id FK
        string title
        text raw_text
        jsonb extracted_skills
        string extracted_seniority
        jsonb extracted_locations
        jsonb extracted_responsibilities
        datetime created_at
    }

    JOB {
        uuid id PK
        string canonical_hash UK
        string title
        string company
        string normalized_company
        string location
        string workplace_type
        string employment_type
        text description
        string primary_url
        datetime posted_at
        numeric salary_min
        numeric salary_max
        string currency
        string verification_status
        datetime last_verified_at
        datetime created_at
        datetime updated_at
    }

    JOB_SOURCE_REFERENCE {
        uuid id PK
        uuid job_id FK
        string source_name
        string source_job_id
        string source_url
        string requisition_id
        jsonb raw_metadata
        datetime fetched_at
    }

    SEARCH_RUN {
        uuid id PK
        uuid search_profile_id FK
        string trigger_type
        string status
        int total_discovered
        int total_deduplicated
        int total_ranked
        datetime started_at
        datetime completed_at
        string error_message
    }

    SCORED_JOB {
        uuid id PK
        uuid search_run_id FK
        uuid job_id FK
        float match_score
        string score_tier
        float score_skills
        float score_title
        float score_experience
        float score_location
        float score_domain
        float score_compensation
        jsonb matched_skills
        jsonb missing_skills
        text explanation
        boolean is_new_for_user
        datetime created_at
    }

    SOURCE_EXECUTION_LOG {
        uuid id PK
        uuid search_run_id FK
        string source_name
        string status
        int items_retrieved
        int latency_ms
        string error_details
        datetime executed_at
    }

    EMAIL_DISPATCH_LOG {
        uuid id PK
        uuid search_run_id FK
        string recipient_email
        string idempotency_key UK
        string status
        string provider
        string provider_message_id
        datetime sent_at
    }
```

---

## 2. Core Pydantic Schemas

### 2.1 `NormalizedJob`
```python
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
    source: str
    source_job_id: str
    title: str
    company: str
    location: Optional[str] = None
    workplace_type: WorkplaceType = WorkplaceType.UNKNOWN
    employment_type: EmploymentType = EmploymentType.UNKNOWN
    description: str
    job_url: HttpUrl
    posted_at: Optional[datetime] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    currency: Optional[str] = None
    requisition_id: Optional[str] = None
    raw_metadata: Dict[str, Any] = Field(default_factory=dict)
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
```

### 2.2 `ScoreBreakdown`
```python
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
```

---

## 3. Database Indexes & Performance Strategy

1. **`canonical_hash`:** Unique index on `jobs.canonical_hash` for instantaneous duplicate lookups ($O(1)$).
2. **`source_lookup`:** Compound index on `job_source_references(source_name, source_job_id)` for lightning-fast source deduplication.
3. **`run_ranking`:** Compound index on `scored_jobs(search_run_id, match_score DESC)` for ranked pagination.
4. **`idempotency_key`:** Unique index on `email_dispatch_logs.idempotency_key` ensuring zero duplicate emails across scheduler retries.
