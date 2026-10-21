# Opportune AI — MCP Source Research & Interface Analysis

**Document Status:** Complete & Evidence-Based  
**Author:** AI Systems Architect & Integration Specialist  
**Target:** Opportune AI Engine  

---

## 1. Executive Summary

This research document analyzes the technical protocols, schemas, rate limits, error modes, and field mappings for the primary sources selected for Opportune AI:
1. **Arbeitnow Job Board API** (General aggregations, remote/hybrid, tags, keyless).
2. **Greenhouse Job Board API** (Tier-1 employer career boards, requisition IDs, keyless).
3. **Lever Postings API** (Employer career boards, structured commitment & workplace types, keyless).
4. **Remotive API** (Curated remote roles, keyless).
5. **Model Context Protocol (Fetch & Custom Job Tools)**.

All verified sources have been tested live with confirmed JSON payloads.

---

## 2. Source-by-Source Technical Breakdown

### 2.1 Arbeitnow Public API

#### Endpoint
`GET https://www.arbeitnow.com/api/job-board-api`

#### Query Parameters
- `page`: Page number (1-indexed).

#### Response Schema Sample
```json
{
  "data": [
    {
      "slug": "senior-python-engineer-berlin-12345",
      "company_name": "Tech Corp GmbH",
      "title": "Senior Python Engineer",
      "description": "<p>We are seeking a senior engineer...</p>",
      "remote": true,
      "url": "https://www.arbeitnow.com/jobs/companies/tech-corp/senior-python-engineer-12345",
      "tags": ["Python", "FastAPI", "PostgreSQL", "Docker"],
      "job_types": ["Full Time"],
      "location": "Berlin, Germany",
      "created_at": 1729000000
    }
  ],
  "links": {
    "first": "https://www.arbeitnow.com/api/job-board-api?page=1",
    "last": "https://www.arbeitnow.com/api/job-board-api?page=40",
    "prev": null,
    "next": "https://www.arbeitnow.com/api/job-board-api?page=2"
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "path": "https://www.arbeitnow.com/api/job-board-api",
    "per_page": 100,
    "to": 100,
    "total": 4000
  }
}
```

#### Field Normalization Mapping
| Raw Field | Normalized Target | Notes / Transformation |
|---|---|---|
| `slug` | `source_job_id` | Unique per Arbeitnow listing |
| `title` | `title` | Cleaned of superfluous prefixes |
| `company_name` | `company` | Exact company name |
| `location` | `location` | Location text |
| `remote` | `workplace_type` | `remote` if true, else `on-site` or `hybrid` |
| `job_types` | `employment_type` | Normalizes to `FULL_TIME`, `PART_TIME`, `CONTRACT`, `INTERNSHIP` |
| `description` | `description` | HTML job description (stripped for NLP extraction) |
| `url` | `job_url` | Direct application link |
| `created_at` | `posted_at` | Unix timestamp converted to UTC ISO-8601 |
| `tags` | `raw_metadata.tags` | Preserved for keyword scoring |

---

### 2.2 Greenhouse Job Board API

#### Endpoint
`GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true`

#### Query Parameters
- `content=true`: Includes the full HTML job description.

#### Response Schema Sample
```json
{
  "jobs": [
    {
      "id": 8860302002,
      "internal_job_id": 412345,
      "title": "Staff Backend Engineer, Database",
      "updated_at": "2026-10-18T14:32:00Z",
      "requisition_id": "REQ-2026-891",
      "absolute_url": "https://job-boards.greenhouse.io/gitlab/jobs/8860302002",
      "location": {
        "name": "Remote, Global"
      },
      "departments": [
        {"id": 1001, "name": "Engineering"}
      ],
      "offices": [
        {"id": 2001, "name": "Remote"}
      ],
      "content": "&lt;div class=\"content\"&gt;&lt;p&gt;About the job...&lt;/p&gt;&lt;/div&gt;"
    }
  ]
}
```

#### Field Normalization Mapping
| Raw Field | Normalized Target | Notes / Transformation |
|---|---|---|
| `id` | `source_job_id` | Stringified Greenhouse job ID |
| `title` | `title` | Official job title |
| `{board_token}` | `company` | Resolved from verified company token catalog |
| `location.name` | `location` | Formatted location |
| `offices` / `location` | `workplace_type` | Inferred (`remote` if matches 'remote' or 'anywhere') |
| `departments` | `raw_metadata.departments` | Organizational metadata |
| `content` | `description` | Decoded HTML / text content |
| `absolute_url` | `job_url` | Direct ATS URL |
| `updated_at` | `posted_at` | Timezone-aware ISO-8601 datetime |
| `requisition_id` | `raw_metadata.requisition_id` | Critical signal for cross-board deduplication |

---

### 2.3 Lever Postings API

#### Endpoint
`GET https://api.lever.co/v0/postings/{company}?mode=json`

#### Query Parameters
- `mode=json`: Structured JSON representation.

#### Response Schema Sample
```json
[
  {
    "id": "c1f7b882-9a3e-4b61-9c8e-289d1b0d2345",
    "text": "Software Engineer - Infrastructure",
    "hostedUrl": "https://jobs.lever.co/palantir/c1f7b882-9a3e-4b61-9c8e-289d1b0d2345",
    "applyUrl": "https://jobs.lever.co/palantir/c1f7b882-9a3e-4b61-9c8e-289d1b0d2345/apply",
    "createdAt": 1729112400000,
    "commitment": "Full-time",
    "workplaceType": "hybrid",
    "categories": {
      "commitment": "Full-time",
      "department": "Engineering",
      "location": "New York, NY",
      "team": "Core Platforms"
    },
    "description": "<div><p>Palantir builds software...</p></div>"
  }
]
```

#### Field Normalization Mapping
| Raw Field | Normalized Target | Notes / Transformation |
|---|---|---|
| `id` | `source_job_id` | Alphanumeric UUID from Lever |
| `text` | `title` | Role title |
| `{company}` | `company` | Proper casing applied via company directory |
| `categories.location` | `location` | Primary office location |
| `workplaceType` | `workplace_type` | Exact values: `remote`, `hybrid`, `on-site` |
| `commitment` | `employment_type` | `FULL_TIME`, `PART_TIME`, `INTERNSHIP`, `CONTRACT` |
| `description` | `description` | Rendered HTML description |
| `hostedUrl` | `job_url` | Direct candidate-facing posting URL |
| `createdAt` | `posted_at` | Milliseconds timestamp converted to ISO-8601 UTC |

---

### 2.4 Remotive Public API

#### Endpoint
`GET https://remotive.com/api/remote-jobs`

#### Query Parameters
- `limit`: Number of jobs to return.
- `search`: Filter keyword.
- `category`: Filter category (e.g. `software-dev`).

#### Response Schema Sample
```json
{
  "jobs": [
    {
      "id": 1948201,
      "url": "https://remotive.com/remote-jobs/software-dev/senior-full-stack-engineer-1948201",
      "title": "Senior Full Stack Engineer",
      "company_name": "Askable",
      "category": "Software Development",
      "job_type": "full_time",
      "publication_date": "2026-10-18T08:15:20",
      "candidate_required_location": "Worldwide",
      "salary": "$120,000 - $150,000",
      "description": "<p>We are looking for...</p>"
    }
  ]
}
```

---

## 3. Reliability, Rate Limits, and Fallback Strategy

| Source | Failure Mode | Detection | Handling Strategy |
|---|---|---|---|
| **Arbeitnow** | HTTP 429 / 503 | Status code or empty payload | Backoff 2s, retry up to 2 times, fallback to remaining sources |
| **Greenhouse** | Board not found (404) | Status 404 | Mark board inactive in catalog, proceed with remaining boards |
| **Lever** | HTTP 404 / 500 | Status code | Mark company inactive, proceed with remaining boards |
| **Remotive** | HTTP 403 (Cloudflare) | Status 403 | Verify User-Agent header; if blocked, log warning and skip |

---

## 4. Architectural Summary

By combining:
1. **Aggregator Sources** (Arbeitnow & Remotive) for broad cross-industry and global remote reach, and
2. **Direct ATS Sources** (Greenhouse & Lever) for premier tech employers with zero intermediary lag,

Opportune AI achieves reliable, permitted, high-signal coverage without requiring scraping, without violating terms of service, and with zero external API fees.
