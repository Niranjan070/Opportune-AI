# Opportune AI

> **The right opportunities, delivered daily.**  
> *MCP-Powered AI Job Discovery and Opportunity Intelligence Assistant*

---

## 1. Overview

**Opportune AI** is a reliable, intelligent job discovery assistant designed to search permitted job sources daily, interpret candidate preferences and target job descriptions, deterministically rank matching roles, evaluate listing freshness, eliminate duplicates across sources, and deliver a consolidated digest via dashboard and email.

Opportune AI operates as a **Modular Monolith with a Controlled MCP Integration Boundary**.

---

## 2. The 5 Architectural Layers

1. **MCP Integration Layer:** Connects the application to approved MCP servers (`opportune-jobs-mcp`, `fetch`) over stdio/subprocess with strict schema validation, timeouts, and tool allowlists.
2. **External Source Layer:** Interfaces with permitted, keyless job sources:
   - **Greenhouse Public ATS API** (Direct employer boards: Gitlab, Figma, Stripe, Airbnb, Datadog, etc.)
   - **Lever Public ATS API** (Direct employer boards: Palantir, etc.)
   - **Arbeitnow Public API** (Broad tech and remote opportunities)
   - **Remotive Public API** (Curated remote listings)
3. **AI Intelligence Layer:** Analyzes unstructured job descriptions into structured requirements and provides qualitative match explanations with deterministic rule-based fallbacks.
4. **Application Logic Layer:** Houses business logic:
   - Unified Pydantic v2 data normalization
   - Conservative 5-signal cross-source deduplication
   - Deterministic 6-component weighted scoring formula
   - Persistent daily scheduler (9:00 AM Asia/Kolkata)
   - Idempotent email reporting service
5. **User Interface Layer:** Interactive React + TypeScript + Vite + Tailwind CSS dashboard.

---

## 3. Strict Scope Boundaries

To ensure security, compliance, and user trust, Opportune AI explicitly **does not**:
- Submit automated job applications or fill out recruiter forms.
- Generate resumes or cover letters.
- Track application pipeline stages (offer/interview/rejection).
- Send automated cold outreach to recruiters.
- Perform unauthenticated scraping of logged-in websites (LinkedIn, Indeed).
- Circumvent access restrictions, rate limits, or CAPTCHAs.

---

## 4. Documentation Index

Comprehensive architecture, research, and technical specifications are maintained in the [`docs/`](file:///c:/Users/nirth/Documents/PROJECTS/OPPORTUNE%20AI/docs) directory:
- [docs/MCP_INTEGRATION_INVENTORY.md](file:///c:/Users/nirth/Documents/PROJECTS/OPPORTUNE%20AI/docs/MCP_INTEGRATION_INVENTORY.md): Comprehensive inventory of MCP servers, direct APIs, and classifications (Categories A–E).
- [docs/MCP_SOURCE_RESEARCH.md](file:///c:/Users/nirth/Documents/PROJECTS/OPPORTUNE%20AI/docs/MCP_SOURCE_RESEARCH.md): Live-tested API schemas, endpoints, field mappings, and error handling for all sources.
- [docs/ARCHITECTURE_DECISIONS.md](file:///c:/Users/nirth/Documents/PROJECTS/OPPORTUNE%20AI/docs/ARCHITECTURE_DECISIONS.md): 8 Architecture Decision Records (ADRs).
- [docs/PRODUCT_REQUIREMENTS.md](file:///c:/Users/nirth/Documents/PROJECTS/OPPORTUNE%20AI/docs/PRODUCT_REQUIREMENTS.md): Detailed product requirements and user modes.
- [docs/ARCHITECTURE.md](file:///c:/Users/nirth/Documents/PROJECTS/OPPORTUNE%20AI/docs/ARCHITECTURE.md): System architecture diagrams and end-to-end data flow.
- [docs/DATA_MODEL.md](file:///c:/Users/nirth/Documents/PROJECTS/OPPORTUNE%20AI/docs/DATA_MODEL.md): Database schemas, ERD, and Pydantic models.
- [docs/IMPLEMENTATION_PLAN.md](file:///c:/Users/nirth/Documents/PROJECTS/OPPORTUNE%20AI/docs/IMPLEMENTATION_PLAN.md): Multi-phase implementation roadmap.

---

## 5. Quick Start (Development)

### Prerequisites
- Python 3.11+
- [uv](https://docs.astral.sh/uv/) package manager
- Node.js v20+ (for frontend)

### Setup & Run

1. **Clone repository and set up environment:**
   ```bash
   cp .env.example .env
   uv sync
   ```

2. **Run test suite (Backend):**
   ```bash
   uv run pytest -v
   # 49 tests passing in ~4s
   ```

3. **Start FastAPI Backend Server:**
   ```bash
   uv run uvicorn backend.app.main:app --reload --port 8000
   ```
   - API Docs: `http://localhost:8000/docs`
   - Health Check: `http://localhost:8000/api/health`
   - Readiness Check: `http://localhost:8000/api/ready`

4. **Start React + TypeScript Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   - Dashboard: `http://localhost:5173`
   - Production Build: `npm run build`

---

## 6. Implementation Progress

- [x] **Phase 1: Research & Discovery** — MCP inventory, source research, ADRs, PRD, architecture, and data model.
- [x] **Phase 2: Foundation** — FastAPI backend, Pydantic v2 schemas, SQLAlchemy models, database initialization, health endpoints, and foundation test suite.
- [x] **Phase 3: First Working Job Sources** — Arbeitnow & Greenhouse live connectors, SSRF protection, NormalizationService, JobStorageService, and Jobs REST API (`GET /api/jobs`, `POST /api/jobs/sync`).
- [x] **Phase 4: MCP Integration Layer** — `opportune-jobs-mcp` custom server, Python MCP client, Tool Registry with allowlist enforcement, and MCP REST API (`GET /api/mcp/tools`, `POST /api/mcp/invoke`).
- [x] **Phase 5: Source Expansion** — Lever ATS & Remotive connectors, DiscoveryOrchestrator with bounded concurrency, timeout enforcement, and partial failure isolation.
- [x] **Phase 6: Intelligence & Deterministic Ranking** — 6-component scoring formula, hard exclusions, AI requirement extraction with deterministic fallback, and Search Profile CRUD REST APIs (`/api/profiles`).
- [x] **Phase 7: Daily Scheduling & Idempotent Email Reporting** — Persistent scheduler (9:00 AM Asia/Kolkata), responsive HTML email digest generator, console/SMTP/Resend providers, and strict database-backed duplicate prevention.
- [x] **Phase 8: Full-Stack React + TypeScript Dashboard** — Modern dark glassmorphism dashboard featuring Overview, Ranked Opportunities, Candidate Profile manager, JD Intelligence Analyzer, and Audit & Telemetry explorer.
- [x] **Phase 9: Hardening & End-to-End Testing** — 49/49 passing automated tests, SSRF defense with RFC 6052 NAT64 IPv6 handling, full-loop E2E verification, and zero build warnings.
