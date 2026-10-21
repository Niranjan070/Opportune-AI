# Opportune AI — Product Requirements Document (PRD)

**Product Name:** Opportune AI  
**Tagline:** The right opportunities, delivered daily.  
**Category:** MCP-Powered AI Job Discovery and Opportunity Intelligence Assistant  
**Target Users:** Tech professionals, students, interns, career switchers, and job seekers looking for roles matching their skills and constraints.

---

## 1. Product Vision & Goals

Opportune AI solves the overwhelming noise and fragmentation of the modern job search. Instead of endlessly scrolling through sponsored, stale, and duplicate listings across dozens of career sites, Opportune AI runs scheduled, intelligent searches across official, permitted job sources and direct employer ATS boards (Greenhouse, Lever, Arbeitnow, Remotive). 

It normalizes listings, applies conservative deduplication, assesses freshness and confidence, deterministically ranks opportunities against the candidate's exact profile or target job description, generates evidence-based match explanations, and sends a daily consolidated email report accompanied by an interactive dashboard.

---

## 2. Core Search Modes

### Mode 1: Reusable Job Search Profile
Users configure persistent preferences:
- Target Job Titles (e.g. `Backend Engineer`, `Full Stack Developer`, `AI Engineer`).
- Core Technical Skills (e.g. `Python`, `FastAPI`, `React`, `PostgreSQL`, `Docker`).
- Preferred Experience Level (`Internship`, `Entry-level`, `Mid-level`, `Senior`).
- Years of Experience.
- Locations & Work Arrangement (`Remote`, `Hybrid`, `On-site`, preferred cities/countries).
- Excluded Employers & Excluded Keywords.
- Active Sources & Enabled ATS Boards.

### Mode 2: Pasted Job Description (Target Role Mode)
Users paste a sample JD of their ideal target job.
- AI extracts structured requirements (title, required skills, nice-to-have skills, seniority, responsibilities, location constraints).
- System queries sources using extracted criteria.
- User can review and edit extracted criteria before executing the search.

### Mode 3: Combined Profile + JD Mode
Merges the personal constraints (location, remote preference, seniority) of the profile with the technical requirements of the pasted JD.

---

## 3. Functional Requirements

### 3.1 Multi-Source Job Discovery
- Query verified public job sources:
  1. **Arbeitnow API** (Global tech & remote listings).
  2. **Greenhouse Public ATS API** (Direct employer boards: Gitlab, Figma, Stripe, Airbnb, Datadog, etc.).
  3. **Lever Public ATS API** (Direct employer boards: Palantir, etc.).
  4. **Remotive API** (Curated remote listings).
- Support custom employer addition: Users can specify any Greenhouse board token or Lever company handle to track specific dream companies.
- Provide MCP server access for tool discovery and external AI agent queries.

### 3.2 Data Normalization & Validation
- Convert all incoming listings into a unified Pydantic v2 `NormalizedJob` schema.
- Preserve source provenance, raw metadata, and requisition IDs.
- Timezone-aware UTC timestamp parsing.

### 3.3 Deduplication Engine
- Multi-signal conservative deduplication:
  1. Exact Source ID match.
  2. Canonical URL matching (stripping UTM and tracking query parameters).
  3. ATS Requisition ID match.
  4. Normalized Title + Employer Name + Location fuzzy match.
  5. SHA-256 content fingerprinting.
- Preserve all source references on merged records. Never merge ambiguous listings based on title alone.

### 3.4 Deterministic Ranking & Scoring
- 6-Component Weighted Formula:
  - Skills Match: 35%
  - Title Alignment: 20%
  - Experience / Seniority: 15%
  - Location / Work Arrangement: 15%
  - Domain / Responsibilities: 10%
  - Employment Type / Compensation: 5%
- Hard exclusion filters (e.g., must be remote, excluded companies).
- Clear tier classification:
  - 85–100: Excellent Match
  - 70–84: Strong Match
  - 50–69: Possible Match
  - <50: Low Priority

### 3.5 Listing Freshness & Verification
- State labels:
  - `Recently Checked` (< 24 hours).
  - `Likely Active` (Posting date < 30 days, reachable URL).
  - `Needs Review` (Missing dates or ambiguous status).
  - `Possibly Stale` (Posting date > 45 days).
  - `Unavailable at Source` (URL returned 404 or inactive page).

### 3.6 Explainability
- Provide transparent, evidence-based bullet points for every scored job:
  - Matched skills vs. missing skills.
  - Seniority alignment.
  - Location/workplace match.
  - Direct employer link with freshness timestamp.

### 3.7 Scheduling & Reporting
- Daily scheduled execution (Default: 9:00 AM Asia/Kolkata, configurable).
- Manual "Run Now" trigger from dashboard.
- Consolidated HTML email report sent to the user with top ranked new/updated listings.
- Database-backed idempotency to prevent duplicate emails during retries.
- Transparent reporting of source health and any partial failures.

### 3.8 Dashboard
- Modern React + TypeScript + Tailwind CSS UI:
  - **Overview / Dashboard:** Search run summary, top opportunities, source health.
  - **Ranked Jobs:** Filter by score tier, source, remote status, keywords; sort by score or date.
  - **Job Detail Modal/Page:** Complete description, score breakdown, evidence explanation, source links.
  - **Search Profiles:** Profile editor, target skills, location preferences, ATS company list.
  - **JD Analyzer:** Paste JD, extract requirements, run immediate discovery.
  - **Search Run History:** Execution logs, source success/failure rates, timing.
  - **Settings:** Schedule time, timezone, email preferences, API keys.

---

## 4. Strict Scope Boundaries (Out of Scope)

The following capabilities are **explicitly prohibited**:
1. Automatic job applications or bot submission of forms.
2. Automated resume or cover letter generation.
3. Recruiter messaging, cold outreach, or interview scheduling.
4. Application status tracking or applicant tracking system emulation.
5. Unauthorized scraping of authenticated platforms (LinkedIn, Indeed).
6. Circumvention of access controls, CAPTCHAs, or rate limits.
7. Custom foundation model training.

---

## 5. Non-Functional Requirements

- **Security:** Secrets stored in `.env`, SSRF protection on outbound requests, HTML escaping in emails, prompt-injection defense.
- **Reliability:** Graceful handling of source timeouts, network partitions, and individual board errors without crashing the search run.
- **Explainability:** All scores are mathematically verifiable; AI extraction is bounded and auditable.
- **Maintainability:** Clean separation of concerns across 5 architectural layers.
