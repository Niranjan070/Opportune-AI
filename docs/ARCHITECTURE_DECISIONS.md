# Opportune AI — Architecture Decision Records (ADRs)

---

## ADR-001: System Architecture — Modular Monolith with Controlled MCP Boundary

### Context
Opportune AI requires multi-source job discovery, AI relevance matching, deterministic ranking, deduplication, scheduling, reporting, and a dashboard. The system must be maintainable by an individual developer while providing enterprise-grade reliability and testability.

### Decision
Implement Opportune AI as a **Modular Monolith** consisting of:
- **Frontend:** React + TypeScript + Vite + Tailwind CSS.
- **Backend:** FastAPI (Python 3.11+) with Pydantic v2.
- **Persistence:** PostgreSQL via SQLAlchemy 2.0 (with SQLite support for zero-dependency testing).
- **Scheduler & Background Worker:** Persistent asyncio-based scheduler with SQLite/PostgreSQL transactional locks.
- **MCP Integration Layer:** Official Python MCP SDK (`mcp>=1.2.0`) client with typed tool registry, timeouts, schema validation, and strict capability bounding.

### Rationale
A distributed microservices architecture introduces unnecessary operational complexity, network latency, distributed transaction overhead, and deployment headaches for a solo engineer. A clean modular monolith enforces strict domain boundaries while sharing in-process transactional guarantees.

---

## ADR-002: Source Selection and Permitted Access Policy

### Context
Job discovery requires accessing job listings. Many commercial job boards (LinkedIn, Indeed) prohibit automated scraping, enforce CAPTCHAs, require expensive enterprise licenses, or ban IP addresses.

### Decision
Adopt a strict **Permitted & Sustainable Source Policy**:
1. Integrate official, public, keyless ATS APIs:
   - **Greenhouse Public Job Board API** (Gitlab, Figma, Stripe, Airbnb, etc.).
   - **Lever Public Postings API** (Palantir, etc.).
2. Integrate permitted public job board APIs:
   - **Arbeitnow Public API** (Free, CC BY-SA 4.0, structured metadata).
   - **Remotive Public API** (Remote tech listings).
3. **Strict Prohibition:** Reject all unauthorized web scrapers targeting logged-in platforms (LinkedIn, Indeed). No CAPTCHA-solving, no header spoofing.

### Rationale
Building on official APIs and permitted feeds guarantees 100% uptime stability, legal compliance, zero API costs, and avoids brittle HTML parsing that breaks with every website redesign.

---

## ADR-003: MCP Server Strategy — Unified `opportune-jobs-mcp` vs. Fragmentation

### Context
MCP provides a standardized protocol for tool discovery and invocation. We need to decide whether to wrap every individual job board into its own MCP server, or provide a unified, typed job source server alongside direct connectors.

### Decision
1. Implement a **Unified Custom MCP Server (`opportune-jobs-mcp`)** using the official Python MCP SDK.
   - Tools exposed:
     - `search_job_sources`: Query unified aggregator sources (keywords, location, workplace type).
     - `get_company_postings`: Query verified ATS boards (Greenhouse / Lever) by company handle.
     - `check_source_status`: Health check across all enabled connectors.
     - `verify_job_url`: HTTP status and reachability check with SSRF protection.
2. Implement **Dual-Path Internal Architecture**:
   - The application connector layer can query sources directly in-process or route queries through the MCP client.
   - Both paths produce identical `NormalizedJob` models.

### Rationale
Creating 10 separate MCP servers for 10 individual job boards introduces massive IPC overhead, process management nightmare, and brittle configuration. A unified job server encapsulates rate limiting and error handling while presenting a cohesive interface to any MCP client.

---

## ADR-004: Persistence and Storage — Rejection of Database MCP

### Context
MCP offers database servers (e.g., `@modelcontextprotocol/server-postgres`).

### Decision
**Reject Database MCP for the internal application database.**
All database interactions (search profiles, jobs, search runs, idempotency logs) must be executed directly by the FastAPI backend using SQLAlchemy ORM and Alembic migrations.

### Rationale
Allowing an LLM or MCP tool direct access to execute arbitrary SQL against the application database violates the principle of least privilege, bypasses application business logic, creates SQL injection risks, and circumvents database audit trails.

---

## ADR-005: Reporting and Email Delivery — Rejection of Autonomous Email MCP

### Context
Reports must be delivered daily via email. Email MCP servers exist that allow an agent to call `send_email`.

### Decision
**Implement email reporting as a direct, deterministic application service.**
- Use Resend / SMTP with a persistent `EmailReportService`.
- Enforce strict database idempotency: Record each sent report with a composite key `(search_run_id, recipient, date)`.
- If a background worker retries, the database lock and idempotency check prevents duplicate emails.
- Prompt injection cannot trick the AI into emailing arbitrary addresses because the LLM is never given an email-sending tool.

### Rationale
Giving an autonomous LLM tool access to send emails is a known security vulnerability (prompt injection leading to data exfiltration or spamming). Application code must strictly control when, to whom, and what is emailed.

---

## ADR-006: Deterministic Scoring vs. LLM Invention

### Context
Job ranking must evaluate candidate fit against user search criteria or job descriptions.

### Decision
Implement a **Deterministic 6-Component Weighted Formula**:
$$Score = 0.35 \times S_{skills} + 0.20 \times S_{title} + 0.15 \times S_{exp} + 0.15 \times S_{loc} + 0.10 \times S_{domain} + 0.05 \times S_{comp}$$

- When data is missing, redistribute weights across evaluable components proportionally.
- AI is used solely for unstructured requirement extraction and qualitative natural language match explanations.
- Final rank is strictly mathematical and reproducible.

### Rationale
LLMs hallucinate scores and cannot provide repeatable sorting across runs. Deterministic arithmetic ensures user confidence, auditability, and immediate explainability.

---

## ADR-007: Conservative Cross-Source Deduplication

### Context
The same job opening may appear on an employer ATS, on Arbeitnow, and across other feeds.

### Decision
Implement conservative, multi-signal deduplication:
1. Signal 1: Exact `(source, source_job_id)` match.
2. Signal 2: Canonical URL match (normalized without tracking parameters).
3. Signal 3: ATS Requisition ID match (`requisition_id`).
4. Signal 4: Employer name similarity ($\ge 90\%$) + normalized Job Title match + Location overlap.
5. Signal 5: Description text fingerprint (SHA-256 of normalized token stream).

When duplicate jobs are detected across multiple sources, preserve all source URLs and provenance records on a single unified `Job` entity. Never merge ambiguous jobs based on title alone.

---

## ADR-008: Security and Prompt-Injection Defense

### Context
External job descriptions may contain adversarial prompts designed to manipulate LLM extraction.

### Decision
1. External content is strictly sanitized and wrapped in unambiguous XML isolation boundaries (`<untrusted_job_content>`).
2. System prompts explicitly instruct the model to treat external text strictly as inert data to extract from.
3. All AI extraction outputs must conform to rigid Pydantic schemas; malformed outputs trigger an immediate deterministic fallback parser.
4. SSRF defense: All outgoing HTTP requests validate that target URLs resolve to public IP addresses and reject loopback/private ranges (`127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`, `169.254.169.254`).
