# Opportune AI — MCP Integration Inventory

**Status:** Verified & Active  
**Last Updated:** October 2026  
**Scope:** Evaluation of MCP servers, public job APIs, ATS integrations, web search engines, and email transports.

---

## 1. Classification Categories

Every candidate integration is classified into one of the following five architectural categories:

| Category | Definition | Architectural Policy |
|---|---|---|
| **Category A** | **Reuse directly** | Existing maintained MCP server providing safe, verified capabilities. |
| **Category B** | **Use an existing API or SDK directly** | Documented API or official SDK simpler, safer, and more deterministic than an MCP wrapper. |
| **Category C** | **Wrap an existing API behind a custom MCP server** | Useful API where a standardized MCP interface enables tool discovery, reuse, and AI interoperability. |
| **Category D** | **Build a custom source integration** | Permitted feed/API without an existing server; implemented directly in the connector layer. |
| **Category E** | **Defer or reject** | Inaccessible, ToS-violating, scraping-dependent, unmaintained, or out-of-scope. |

---

## 2. Comprehensive Integration Matrix

| Integration Name | Type | Category | Primary Function | Auth / Quota | Verification Date & Evidence | Status & Verdict |
|---|---|:---:|---|---|---|---|
| **Arbeitnow Public API** | REST API | **Category C** | Broad multi-industry job board | Keyless; Free; Open CC-BY-SA | Tested live 2026-10-19: 300 jobs/page with full HTML, tags, URLs | **Selected**: Wrapped in MCP & Direct Connector |
| **Greenhouse Job Board API** | Public REST API | **Category C** | ATS Job Board (Direct Employer) | Keyless public read; Free | Tested live 2026-10-19: Gitlab (229), Figma (140), Airbnb (175), Stripe (724) | **Selected**: Wrapped in MCP & Direct Connector |
| **Lever Postings API** | Public REST API | **Category C** | ATS Job Board (Direct Employer) | Keyless public read; Free | Tested live 2026-10-19: Palantir (310 jobs) | **Selected**: Wrapped in MCP & Direct Connector |
| **Remotive API** | REST API | **Category D** | Curated remote tech listings | Keyless (requires User-Agent); Free | Tested live 2026-10-19: Returns active remote tech roles | **Selected**: Direct Source Connector |
| **Fetch MCP (`@modelcontextprotocol/server-fetch`)** | MCP Server | **Category A** | Webpage retrieval & verification | Local stdio / npx; No auth | Official Anthropic reference server; tested on Node v24 | **Selected**: Candidate for link verification |
| **Brave Search MCP (`@modelcontextprotocol/server-brave-search`)** | MCP Server | **Category A** | Career site & requisition discovery | Requires `BRAVE_API_KEY` (Free tier 2,000 queries/mo) | Official Anthropic reference server | **Selected (Optional)**: For supplementary career site search |
| **Resend / SMTP Provider** | REST API / SMTP | **Category B** | Daily email report dispatch | API key or SMTP credentials | Python standard libraries (`aiosmtplib` / `requests`) | **Selected**: Direct Application Service (Idempotent) |
| **PostgreSQL Database** | Storage / ORM | **Category B** | Persistent storage & search runs | Database credentials via `.env` | SQLAlchemy 2.0 + Alembic migrations | **Selected**: Direct Application Service (No MCP) |
| **LinkedIn Unofficial Scrapers (JobSpy / Selenium)** | Web Scraper | **Category E** | Scraping LinkedIn | Unauthenticated scraping violates ToS, CAPTCHA | Documented ToS prohibition; aggressive IP bans | **REJECTED**: Strict scope boundary violation |
| **Indeed Web Scrapers** | Web Scraper | **Category E** | Scraping Indeed | Cloudflare Turnstile; ToS violation | Direct publisher API requires enterprise partnership | **REJECTED**: Strict scope boundary violation |
| **Postgres MCP Server (`@modelcontextprotocol/server-postgres`)** | MCP Server | **Category E** | Direct LLM DB access | Connection string | Security risk: Uncontrolled LLM read/write access to DB | **REJECTED**: Persistence belongs in backend services |
| **Email Sending MCP Servers (Community)** | MCP Server | **Category E** | Sending emails via LLM tool | Mailgun/Sendgrid credentials | Security risk: Prompt injection could trigger unauthorized emails | **REJECTED**: Email dispatch must be deterministic |

---

## 3. Detailed Evidence for Evaluated Candidates

### 3.1 Arbeitnow Public Job Board API
* **URL:** `https://www.arbeitnow.com/api/job-board-api`
* **Type:** Public REST API (JSON).
* **Maintainer:** Arbeitnow GmbH.
* **Authentication:** None required.
* **Pricing & Quota:** Free public tier. Respect standard polite rate limits (1 req/sec).
* **Capabilities:** 
  - Retrieves 300 job listings per request.
  - Fields: `slug`, `company_name`, `title`, `description` (HTML), `remote` (boolean), `url`, `tags`, `job_types`, `location`, `created_at`.
  - Pagination via `links.next`.
* **Live Test Evidence:** Tested on 2026-10-19 via Python `urllib.request`. Successfully retrieved 300 jobs including titles, slugs, and direct apply URLs.
* **Assessment:** Outstanding zero-friction job discovery source for tech, marketing, engineering, and remote/hybrid roles.
* **Recommendation:** Wrap in `opportune-jobs-mcp` and provide direct connector.

### 3.2 Greenhouse Public Job Board API
* **URL:** `https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true`
* **Type:** Official ATS Public API.
* **Maintainer:** Greenhouse Software, Inc.
* **Authentication:** None required for public job board listings.
* **Pricing & Quota:** Free read-only access for published jobs.
* **Capabilities:**
  - Retrieve all active openings for any company using Greenhouse (e.g., Gitlab, Figma, Stripe, Airbnb, Datadog).
  - Fields: `id`, `title`, `updated_at`, `requisition_id`, `absolute_url`, `location` (`name`), `departments`, `offices`, `content` (HTML job description).
* **Live Test Evidence:** Tested on 2026-10-19:
  - Gitlab (`gitlab`): 229 open jobs.
  - Stripe (`stripe`): 724 open jobs.
  - Airbnb (`airbnb`): 175 open jobs.
  - Figma (`figma`): 140 open jobs.
* **Assessment:** High-integrity, zero-spam, direct employer requisition data. Excellent freshness signals (`updated_at`).
* **Recommendation:** Wrap in `opportune-jobs-mcp` with pre-configured tech company catalog + custom employer addition.

### 3.3 Lever Public Postings API
* **URL:** `https://api.lever.co/v0/postings/{company}?mode=json`
* **Type:** Official ATS Public API.
* **Maintainer:** Lever (Employ Inc.).
* **Authentication:** None required for published postings.
* **Pricing & Quota:** Free read-only access.
* **Capabilities:**
  - Retrieve all published postings for any company using Lever (e.g., Palantir).
  - Fields: `id`, `text` (title), `hostedUrl`, `applyUrl`, `createdAt`, `commitment` (Full-time, etc.), `workplaceType` (remote, hybrid, on-site), `categories` (`location`, `team`, `department`), `description` (HTML), `lists`.
* **Live Test Evidence:** Tested on 2026-10-19:
  - Palantir (`palantir`): 310 open jobs with full descriptions and metadata.
* **Assessment:** High-fidelity direct employer source. Clean workplace type classification (remote/hybrid).
* **Recommendation:** Wrap in `opportune-jobs-mcp` and direct connector.

### 3.4 Remotive Public Remote Jobs API
* **URL:** `https://remotive.com/api/remote-jobs`
* **Type:** Curated Remote Job Feed API.
* **Authentication:** Keyless with standard User-Agent header.
* **Live Test Evidence:** Tested on 2026-10-19. Returned active listings with required candidate locations, salary bands where available, and clean markdown/HTML descriptions.
* **Assessment:** Excellent supplement for remote job seekers.

### 3.5 Fetch MCP (`@modelcontextprotocol/server-fetch`)
* **Repository:** `modelcontextprotocol/servers/tree/main/src/fetch`
* **Transport:** Stdio / subprocess.
* **Capabilities:** Tool `fetch` takes a URL and returns converted Markdown content.
* **Security Note:** In production, Fetch MCP must be bounded with SSRF protection (prohibiting private IPs like 127.0.0.1, 10.0.0.0/8, 192.168.0.0/16, 169.254.169.254) and response size limits.
* **Recommendation:** Include in the MCP client registry as an approved tool for link validation.

### 3.6 Brave Search MCP (`@modelcontextprotocol/server-brave-search`)
* **Repository:** `modelcontextprotocol/servers/tree/main/src/brave-search`
* **Capabilities:** `brave_web_search` and `brave_local_search`.
* **Requirement:** `BRAVE_API_KEY`.
* **Recommendation:** Supported as an optional integration in the registry. When the API key is not configured, the orchestrator gracefully marks the source as disabled without failing the search run.

### 3.7 Rejected Integrations (Category E)
1. **Unofficial LinkedIn Scrapers:** Completely rejected. LinkedIn actively blocks IP ranges, serves CAPTCHAs, and violates terms of service. Opportune AI adheres strictly to permitted, sustainable, documented interfaces.
2. **Indeed Web Scrapers:** Completely rejected due to Cloudflare Turnstile and ToS barriers.
3. **Database MCP Servers:** Exposing raw SQL execution or table mutations to an LLM creates severe security risks (SQL injection, accidental data loss, schema corruption). Database operations remain exclusively in FastAPI backend services using SQLAlchemy ORM.
4. **Autonomous Email MCP Servers:** Email dispatch must be controlled by deterministic application code with deduplication and idempotency keys, never triggered directly by an autonomous LLM loop.
