"""
Connector for Lever Public Postings API
Keyless read-only access to published job postings for companies using Lever ATS.
"""
from datetime import datetime, timezone
import logging
from typing import List, Optional
import httpx

from backend.app.connectors.base import BaseJobConnector, is_safe_url
from backend.app.schemas.job import NormalizedJob, WorkplaceType, EmploymentType

logger = logging.getLogger(__name__)

DEFAULT_LEVER_COMPANIES = [
    "palantir",
]


class LeverConnector(BaseJobConnector):
    BASE_URL_TEMPLATE = "https://api.lever.co/v0/postings/{company}?mode=json"

    def __init__(self, target_companies: Optional[List[str]] = None, timeout_seconds: int = 15):
        super().__init__(timeout_seconds=timeout_seconds)
        self.target_companies = target_companies or DEFAULT_LEVER_COMPANIES

    @property
    def source_name(self) -> str:
        return "lever"

    async def check_health(self) -> bool:
        url = self.BASE_URL_TEMPLATE.format(company="palantir")
        if not is_safe_url(url):
            return False
        try:
            async with httpx.AsyncClient(timeout=10, headers=self.headers) as client:
                resp = await client.get(url)
                return resp.status_code == 200
        except Exception as e:
            logger.warning(f"Lever health check failed: {e}")
            return False

    async def search_company_postings(
        self,
        company_handle: str,
        keywords: Optional[str] = None,
        location: Optional[str] = None,
        workplace_type: Optional[str] = None,
        limit: int = 50,
    ) -> List[NormalizedJob]:
        """
        Fetch postings for a single Lever company handle.
        """
        url = self.BASE_URL_TEMPLATE.format(company=company_handle)
        if not is_safe_url(url):
            logger.warning(f"Rejected unsafe Lever URL: {url}")
            return []

        kw_lower = keywords.lower() if keywords else None
        loc_lower = location.lower() if location else None
        results: List[NormalizedJob] = []

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds, headers=self.headers) as client:
                resp = await client.get(url)
                if resp.status_code == 404:
                    logger.info(f"Lever company '{company_handle}' not found (404).")
                    return []
                if resp.status_code != 200:
                    logger.error(f"Lever company '{company_handle}' returned status {resp.status_code}")
                    return []

                postings = resp.json()
                if not isinstance(postings, list):
                    return []

                company_display = company_handle.replace("-", " ").title()

                for item in postings:
                    posting_id = str(item.get("id"))
                    title = item.get("text", "").strip()
                    desc_html = item.get("description", "")
                    categories = item.get("categories", {})
                    job_location = categories.get("location", "Unspecified") if isinstance(categories, dict) else "Unspecified"
                    raw_wp_type = str(item.get("workplaceType", "")).lower()
                    commitment = str(item.get("commitment", "")).lower()
                    created_at_ms = item.get("createdAt")
                    job_url = item.get("hostedUrl") or item.get("applyUrl") or f"https://jobs.lever.co/{company_handle}/{posting_id}"

                    # Filter keywords
                    if kw_lower:
                        searchable = f"{title.lower()} {desc_html.lower()}"
                        if not any(term in searchable for term in kw_lower.split()):
                            continue

                    # Filter location
                    if loc_lower and loc_lower not in job_location.lower():
                        continue

                    # Determine workplace type
                    if "remote" in raw_wp_type or "remote" in job_location.lower():
                        wp_type = WorkplaceType.REMOTE
                    elif "hybrid" in raw_wp_type or "hybrid" in job_location.lower():
                        wp_type = WorkplaceType.HYBRID
                    elif "onsite" in raw_wp_type or "on-site" in raw_wp_type:
                        wp_type = WorkplaceType.ON_SITE
                    else:
                        wp_type = WorkplaceType.UNKNOWN

                    if workplace_type and workplace_type.lower() != "any":
                        if workplace_type.lower() == "remote" and wp_type != WorkplaceType.REMOTE:
                            continue

                    # Determine employment type
                    if "part" in commitment:
                        emp_type = EmploymentType.PART_TIME
                    elif "contract" in commitment or "intern" not in commitment and "full" not in commitment:
                        emp_type = EmploymentType.CONTRACT
                    elif "intern" in commitment:
                        emp_type = EmploymentType.INTERNSHIP
                    else:
                        emp_type = EmploymentType.FULL_TIME

                    # Posted at timestamp in ms
                    posted_at = None
                    if created_at_ms:
                        try:
                            posted_at = datetime.fromtimestamp(created_at_ms / 1000.0, tz=timezone.utc)
                        except Exception:
                            posted_at = None

                    job = NormalizedJob(
                        source=self.source_name,
                        source_job_id=posting_id,
                        title=title,
                        company=company_display,
                        location=job_location,
                        workplace_type=wp_type,
                        employment_type=emp_type,
                        description=desc_html,
                        job_url=job_url,
                        posted_at=posted_at,
                        raw_metadata={
                            "company_handle": company_handle,
                            "categories": categories,
                            "commitment": item.get("commitment"),
                            "lists": item.get("lists", []),
                        }
                    )
                    results.append(job)

                    if len(results) >= limit:
                        break

        except Exception as e:
            logger.error(f"Error querying Lever company '{company_handle}': {e}", exc_info=True)

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
        Search across target Lever companies.
        """
        target_list = companies or self.target_companies
        all_jobs: List[NormalizedJob] = []

        for company_handle in target_list:
            jobs = await self.search_company_postings(
                company_handle=company_handle,
                keywords=keywords,
                location=location,
                workplace_type=workplace_type,
                limit=limit - len(all_jobs)
            )
            all_jobs.extend(jobs)
            if len(all_jobs) >= limit:
                break

        return all_jobs
