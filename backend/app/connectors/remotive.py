"""
Connector for Remotive Public Remote Jobs API
Keyless public remote tech jobs feed.
"""
from datetime import datetime, timezone
import logging
from typing import List, Optional
import httpx

from backend.app.connectors.base import BaseJobConnector, is_safe_url
from backend.app.schemas.job import NormalizedJob, WorkplaceType, EmploymentType

logger = logging.getLogger(__name__)


class RemotiveConnector(BaseJobConnector):
    BASE_URL = "https://remotive.com/api/remote-jobs"

    @property
    def source_name(self) -> str:
        return "remotive"

    async def check_health(self) -> bool:
        if not is_safe_url(self.BASE_URL):
            return False
        try:
            async with httpx.AsyncClient(timeout=10, headers=self.headers) as client:
                resp = await client.get(f"{self.BASE_URL}?limit=1")
                return resp.status_code == 200
        except Exception as e:
            logger.warning(f"Remotive health check failed: {e}")
            return False

    async def search(
        self,
        keywords: Optional[str] = None,
        location: Optional[str] = None,
        workplace_type: Optional[str] = None,
        limit: int = 50,
        **kwargs
    ) -> List[NormalizedJob]:
        """
        Search listings from Remotive.
        """
        if not is_safe_url(self.BASE_URL):
            return []

        # If user specifically asked for non-remote (on-site only), Remotive has none
        if workplace_type and workplace_type.lower() in ("on_site", "onsite"):
            return []

        results: List[NormalizedJob] = []
        loc_lower = location.lower() if location else None

        params = {"limit": str(min(limit * 2, 100))}
        if keywords:
            params["search"] = keywords

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds, headers=self.headers) as client:
                resp = await client.get(self.BASE_URL, params=params)
                if resp.status_code != 200:
                    logger.error(f"Remotive API returned status {resp.status_code}")
                    return []

                payload = resp.json()
                raw_jobs = payload.get("jobs", [])

                for item in raw_jobs:
                    job_id = str(item.get("id"))
                    title = item.get("title", "").strip()
                    company = item.get("company_name", "").strip()
                    candidate_location = item.get("candidate_required_location", "Worldwide")
                    salary_str = item.get("salary")
                    job_type_str = str(item.get("job_type", "")).lower()
                    pub_date_str = item.get("publication_date")
                    job_url = item.get("url", "")
                    description = item.get("description", "")

                    # Filter candidate location
                    if loc_lower and loc_lower != "remote":
                        cand_loc_low = candidate_location.lower()
                        is_global = any(w in cand_loc_low for w in ("worldwide", "anywhere", "global", "all", "apac"))
                        if not is_global and loc_lower not in cand_loc_low:
                            continue

                    # Employment type
                    if "contract" in job_type_str or "freelance" in job_type_str:
                        emp_type = EmploymentType.CONTRACT
                    elif "part" in job_type_str:
                        emp_type = EmploymentType.PART_TIME
                    elif "intern" in job_type_str:
                        emp_type = EmploymentType.INTERNSHIP
                    else:
                        emp_type = EmploymentType.FULL_TIME

                    # Publication date
                    posted_at = None
                    if pub_date_str:
                        try:
                            posted_at = datetime.fromisoformat(pub_date_str.replace("Z", "+00:00"))
                        except Exception:
                            posted_at = None

                    job = NormalizedJob(
                        source=self.source_name,
                        source_job_id=job_id,
                        title=title,
                        company=company,
                        location=f"Remote ({candidate_location})",
                        workplace_type=WorkplaceType.REMOTE,
                        employment_type=emp_type,
                        description=description,
                        job_url=job_url,
                        posted_at=posted_at,
                        raw_metadata={
                            "salary_text": salary_str,
                            "category": item.get("category"),
                            "candidate_required_location": candidate_location,
                        }
                    )
                    results.append(job)

                    if len(results) >= limit:
                        break

        except Exception as e:
            logger.error(f"Error querying Remotive: {e}", exc_info=True)

        return results
