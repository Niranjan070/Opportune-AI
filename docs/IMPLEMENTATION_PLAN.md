# Opportune AI — Implementation Roadmap & Execution Plan

**Project:** Opportune AI  
**Execution Strategy:** Incremental, test-driven modular monolith with controlled MCP boundary.

---

## Phase Overview & Progress Tracking

| Phase | Milestone Title | Key Deliverables | Status |
|:---:|---|---|:---:|
| **Phase 1** | **Repository & Integration Research** | Research docs, Inventory, ADRs, PRD, Architecture, Data Model | **COMPLETED** |
| **Phase 2** | **Foundation Setup** | FastAPI backend, SQLAlchemy models, Pydantic schemas, Health check | **IN PROGRESS** |
| **Phase 3** | **First Working Job Sources** | Arbeitnow & Greenhouse connectors, live normalization, fixture tests | **READY** |
| **Phase 4** | **MCP Server & Client Integration** | `opportune-jobs-mcp` server, Python MCP client, Tool registry | **READY** |
| **Phase 5** | **Source Expansion** | Lever ATS & Remotive connectors, multi-source orchestration | **READY** |
| **Phase 6** | **Intelligence & Deterministic Ranking** | 6-component scoring engine, conservative deduper, JD extractor | **READY** |
| **Phase 7** | **Scheduler & Idempotent Email Reporting** | Persistent scheduler, HTML digest generator, Resend/SMTP dispatch | **READY** |
| **Phase 8** | **Full-Stack Dashboard UI** | React + TypeScript + Tailwind CSS interactive job discovery dashboard | **READY** |
| **Phase 9** | **Hardening, Testing & Documentation** | End-to-end integration tests, SSRF checks, run instructions | **READY** |

---

## Detailed Deliverables by Phase

### Phase 1: Research & Discovery (Done)
- [x] Investigate workspace environment (Python 3.11, Node v24, uv, Docker).
- [x] Test public ATS APIs (Greenhouse, Lever) and job board feeds (Arbeitnow, Remotive).
- [x] Create `docs/MCP_INTEGRATION_INVENTORY.md`.
- [x] Create `docs/MCP_SOURCE_RESEARCH.md`.
- [x] Create `docs/ARCHITECTURE_DECISIONS.md`.
- [x] Create `docs/PRODUCT_REQUIREMENTS.md`.
- [x] Create `docs/ARCHITECTURE.md`.
- [x] Create `docs/DATA_MODEL.md`.
- [x] Create `docs/IMPLEMENTATION_PLAN.md`.

### Phase 2: Foundation (Immediate Next Step)
- [ ] Initialize Python backend with `uv` virtual environment.
- [ ] Implement core Pydantic v2 schemas (`NormalizedJob`, `SearchProfile`, `SearchRun`, `ScoredJob`).
- [ ] Implement SQLAlchemy 2.0 ORM models and database session manager (SQLite default with PostgreSQL support).
- [ ] Implement FastAPI application with health check endpoints (`/api/health`, `/api/ready`).
- [ ] Establish pytest test suite with test fixtures.

### Phase 3: First Working Job Sources
- [ ] Implement `ArbeitnowConnector` with pagination and HTML tag extraction.
- [ ] Implement `GreenhouseConnector` with company board token lookup and requisition parsing.
- [ ] Implement `NormalizationService` guaranteeing consistent `NormalizedJob` output.
- [ ] Write unit tests with real recorded fixtures to verify zero-breakage parsing.

### Phase 4: MCP Integration Layer
- [ ] Implement `opportune-jobs-mcp` server using official Python MCP SDK (`mcp`).
- [ ] Expose tools: `search_job_sources`, `get_company_postings`, `check_source_status`, `verify_job_url`.
- [ ] Implement FastAPI MCP Client & Tool Registry with strict allowlists, timeouts, and error isolation.
- [ ] Write tests invoking MCP tools via Stdio / in-process transport.

### Phase 5: Expanded Source Coverage
- [ ] Implement `LeverConnector` (Palantir and configured tech employers).
- [ ] Implement `RemotiveConnector` (Remote tech listings).
- [ ] Build `DiscoveryOrchestrator` running concurrent, timeout-bounded source queries.
- [ ] Record source execution health and latency logs in the database.

### Phase 6: Intelligence, Deduplication & Ranking
- [ ] Implement conservative 5-signal deduplication engine.
- [ ] Implement deterministic 6-component weighted ranking formula ($35\%$ skills, $20\%$ title, $15\%$ seniority, $15\%$ location, $10\%$ domain, $5\%$ comp).
- [ ] Implement JD requirement extraction with structured JSON schemas and robust deterministic fallback.
- [ ] Implement evidence-based match explanation generator.
- [ ] Add listing freshness and verification status calculations.

### Phase 7: Daily Scheduling & Idempotent Email Reporting
- [ ] Implement persistent Asyncio/APScheduler runner for daily 9:00 AM job discovery.
- [ ] Implement manual "Run Now" trigger endpoint.
- [ ] Implement HTML digest email template generator with score badges and direct links.
- [ ] Implement `EmailReportService` with database-backed idempotency logs (`email_dispatch_logs`).

### Phase 8: Full-Stack React + TypeScript Dashboard
- [ ] Initialize Vite + React + TypeScript + Tailwind CSS frontend.
- [ ] Build pages:
  - Overview / Metrics Dashboard.
  - Ranked Job Results with filters (tier, remote, location) and sorting.
  - Job Detail Modal with complete description and score breakdown.
  - Search Profile & Company ATS management.
  - Target JD Analyzer.
  - Run History & Source Health monitoring.
  - Settings & Email notification test.

### Phase 9: Hardening & Testing
- [ ] End-to-end API and connector test suite.
- [ ] SSRF defense testing on URL verifications.
- [ ] Prompt injection defense testing on untrusted JD text.
- [ ] Complete `README.md` and operational guide.
