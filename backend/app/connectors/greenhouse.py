"""
Connector for Greenhouse Public Job Board API
Keyless read-only access to published openings for companies using Greenhouse ATS.
"""
from datetime import datetime, timezone
import html
import logging
from typing import List, Optional
import httpx

from backend.app.connectors.base import BaseJobConnector, is_safe_url
from backend.app.schemas.job import NormalizedJob, WorkplaceType, EmploymentType

logger = logging.getLogger(__name__)

DEFAULT_GREENHOUSE_COMPANIES = [
    "gitlab",
    "figma",
    "stripe",
    "airbnb",
    "datadog",
]


class GreenhouseConnector(BaseJobConnector):
    BASE_URL_TEMPLATE = "https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true"

    def __init__(self, target_companies: Optional[List[str]] = None, timeout_seconds: int = 15):
        super().__init__(timeout_seconds=timeout_seconds)
        self.target_companies = target_companies or DEFAULT_GREENHOUSE_COMPANIES

    @property
    def source_name(self) -> str:
        return "greenhouse"

    async def check_health(self) -> bool:
        # Check health using a stable public board (e.g. gitlab)
        url = self.BASE_URL_TEMPLATE.format(board_token="gitlab").replace("content=true", "content=false")
        if not is_safe_url(url):
            return False
        try:
            async with httpx.AsyncClient(timeout=10, headers=self.headers) as client:
                resp = await client.get(url)
                return resp.status_code == 200
        except Exception as e:
            logger.warning(f"Greenhouse health check failed: {e}")
            return False

    async def search_company_board(
        self,
        board_token: str,
        keywords: Optional[str] = None,
        location: Optional[str] = None,
        workplace_type: Optional[str] = None,
        limit: int = 50,
    ) -> List[NormalizedJob]:
        """
        Fetch postings for a single Greenhouse board token.
        """
        url = self.BASE_URL_TEMPLATE.format(board_token=board_token)
        if not is_safe_url(url):
            logger.warning(f"Rejected unsafe Greenhouse URL: {url}")
            return []

        kw_lower = keywords.lower() if keywords else None
        loc_lower = location.lower() if location else None
        results: List[NormalizedJob] = []

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds, headers=self.headers) as client:
                resp = await client.get(url)
                if resp.status_code == 404:
                    logger.info(f"Greenhouse board '{board_token}' not found (404).")
                    return []
                if resp.status_code != 200:
                    logger.error(f"Greenhouse board '{board_token}' returned status {resp.status_code}")
                    return []

                payload = resp.json()
                jobs = payload.get("jobs", [])

                company_display = board_token.replace("-", " ").title()

                for item in jobs:
                    job_id = str(item.get("id"))
                    title = item.get("title", "").strip()
                    content = html.unescape(item.get("content", ""))
                    loc_dict = item.get("location", {})
                    job_location = loc_dict.get("name", "Unspecified") if isinstance(loc_dict, dict) else str(loc_dict)
                    updated_at_str = item.get("updated_at")
                    requisition_id = item.get("requisition_id")
                    job_url = item.get("absolute_url") or f"https://boards.greenhouse.io/{board_token}/jobs/{job_id}"

                    # Filter keywords if provided
                    if kw_lower:
                        searchable = f"{title.lower()} {content.lower()}"
                        if not any(term in searchable for term in kw_lower.split()):
                            continue

                    # Filter location
                    if loc_lower and loc_lower not in job_location.lower():
                        continue

                    # Determine workplace type
                    loc_text = job_location.lower()
                    if "remote" in loc_text or "anywhere" in loc_text:
                        wp_type = WorkplaceType.REMOTE
                    elif "hybrid" in loc_text:
                        wp_type = WorkplaceType.HYBRID
                    else:
                        wp_type = WorkplaceType.ON_SITE

                    if workplace_type and workplace_type.lower() != "any":
                        if workplace_type.lower() == "remote" and wp_type != WorkplaceType.REMOTE:
                            continue

                    # Parse updated_at
                    posted_at = None
                    if updated_at_str:
                        try:
                            posted_at = datetime.fromisoformat(updated_at_str.replace("Z", "+00:00"))
                        except Exception:
                            posted_at = None

                    job = NormalizedJob(
                        source=self.source_name,
                        source_job_id=job_id,
                        title=title,
                        company=company_display,
                        location=job_location,
                        workplace_type=wp_type,
                        employment_type=EmploymentType.FULL_TIME,
                        description=content,
                        job_url=job_url,
                        posted_at=posted_at,
                        requisition_id=str(requisition_id) if requisition_id else None,
                        raw_metadata={
                            "board_token": board_token,
                            "departments": item.get("departments", []),
                            "offices": item.get("offices", []),
                        }
                    )
                    results.append(job)

                    if len(results) >= limit:
                        break

        except Exception as e:
            logger.error(f"Error querying Greenhouse board '{board_token}': {e}")

        return results

    async def search(
        self,
        keywords: Optional[str] = None,
        location: Optional[str] = None,
        workplace_type: Optional[str] = None,
        limit: int = 50,
        companies: Optional[List[str]] = None,
        **kwargs
    ) -> List[NormalizedJob]:
        """
        Search across target Greenhouse company boards.
        """
        target_list = companies or self.target_companies
        all_jobs: List[NormalizedJob] = []

        for board_token in target_list:
            jobs = await self.search_company_board(
                board_token=board_token,
                keywords=keywords,
                location=location,
                workplace_type=workplace_type,
                limit=limit - len(all_jobs)
            )
            all_jobs.extend(jobs)
            if len(all_jobs) >= limit:
                break

        return all_jobs
