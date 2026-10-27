"""
Connector for Arbeitnow Public Job Board API
Keyless, Free, Open API with CC-BY-SA 4.0 listings
"""
from datetime import datetime, timezone
import logging
from typing import List, Optional
import httpx
from bs4 import BeautifulSoup

from backend.app.connectors.base import BaseJobConnector, is_safe_url
from backend.app.schemas.job import NormalizedJob, WorkplaceType, EmploymentType

logger = logging.getLogger(__name__)


class ArbeitnowConnector(BaseJobConnector):
    BASE_URL = "https://www.arbeitnow.com/api/job-board-api"

    @property
    def source_name(self) -> str:
        return "arbeitnow"

    async def check_health(self) -> bool:
        if not is_safe_url(self.BASE_URL):
            return False
        try:
            async with httpx.AsyncClient(timeout=10, headers=self.headers) as client:
                resp = await client.get(f"{self.BASE_URL}?page=1")
                return resp.status_code == 200
        except Exception as e:
            logger.warning(f"Arbeitnow health check failed: {e}")
            return False

    async def search(
        self,
        keywords: Optional[str] = None,
        location: Optional[str] = None,
        workplace_type: Optional[str] = None,
        limit: int = 50,
        page: int = 1,
        **kwargs
    ) -> List[NormalizedJob]:
        """
        Search listings from Arbeitnow.
        """
        if not is_safe_url(self.BASE_URL):
            raise ValueError(f"Insecure target URL: {self.BASE_URL}")

        normalized_jobs: List[NormalizedJob] = []
        kw_lower = keywords.lower() if keywords else None
        loc_lower = location.lower() if location else None

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds, headers=self.headers) as client:
                url = f"{self.BASE_URL}?page={page}"
                resp = await client.get(url)
                if resp.status_code != 200:
                    logger.error(f"Arbeitnow API returned status {resp.status_code}")
                    return []

                payload = resp.json()
                raw_items = payload.get("data", [])

                for item in raw_items:
                    title = item.get("title", "").strip()
                    company = item.get("company_name", "").strip()
                    desc_html = item.get("description", "")
                    job_location = item.get("location", "Unspecified")
                    is_remote = bool(item.get("remote", False))
                    tags = item.get("tags", [])
                    raw_types = item.get("job_types", [])
                    created_at_ts = item.get("created_at")

                    # Filter keywords if specified
                    if kw_lower:
                        import re
                        tags_str = " ".join(tags).lower()
                        searchable = f"{title.lower()} {company.lower()} {tags_str}"
                        terms = [t.strip() for t in kw_lower.split() if t.strip()]
                        generic_terms = {"engineer", "developer", "specialist", "intern", "internship", "lead", "senior", "junior", "associate", "manager", "roles", "jobs"}
                        domain_terms = [t for t in terms if t not in generic_terms]

                        if domain_terms:
                            has_domain = any(re.search(rf"\b{re.escape(dt)}\b", searchable) for dt in domain_terms)
                            if not has_domain:
                                continue
                        else:
                            if not any(term in searchable for term in terms):
                                continue

                    # Filter location dynamically
                    if loc_lower and loc_lower not in ("remote", "any", "all"):
                        from backend.app.services.location_intelligence import check_location_match
                        if not check_location_match(job_location.lower(), loc_lower) and not (is_remote and "remote" in loc_lower):
                            continue

                    # Workplace Type
                    if is_remote:
                        wp_type = WorkplaceType.REMOTE
                    else:
                        wp_type = WorkplaceType.ON_SITE

                    if workplace_type and workplace_type.lower() != "any":
                        if workplace_type.lower() == "remote" and wp_type != WorkplaceType.REMOTE:
                            continue

                    # Employment Type mapping
                    emp_type = EmploymentType.FULL_TIME
                    for t in raw_types:
                        t_low = t.lower()
                        if "part" in t_low:
                            emp_type = EmploymentType.PART_TIME
                        elif "contract" in t_low or "freelance" in t_low:
                            emp_type = EmploymentType.CONTRACT
                        elif "intern" in t_low:
                            emp_type = EmploymentType.INTERNSHIP

                    # Posted At
                    posted_at = None
                    if created_at_ts:
                        try:
                            posted_at = datetime.fromtimestamp(created_at_ts, tz=timezone.utc)
                        except Exception:
                            posted_at = None

                    job = NormalizedJob(
                        source=self.source_name,
                        source_job_id=str(item.get("slug", item.get("url"))),
                        title=title,
                        company=company,
                        location=job_location,
                        workplace_type=wp_type,
                        employment_type=emp_type,
                        description=desc_html,
                        job_url=item.get("url", ""),
                        posted_at=posted_at,
                        raw_metadata={
                            "tags": tags,
                            "slug": item.get("slug"),
                            "job_types": raw_types,
                        }
                    )
                    normalized_jobs.append(job)

                    if len(normalized_jobs) >= limit:
                        break

        except Exception as e:
            logger.error(f"Error querying Arbeitnow: {e}", exc_info=True)

        return normalized_jobs
