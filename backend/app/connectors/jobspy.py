"""
Connector for JobSpy multi-board job scraper (LinkedIn, Indeed, Glassdoor, ZipRecruiter).
Provides bounded, fault-tolerant execution with NormalizedJob schema transformation.
"""
import asyncio
from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional

from backend.app.connectors.base import BaseJobConnector
from backend.app.schemas.job import NormalizedJob, WorkplaceType, EmploymentType

logger = logging.getLogger("jobspy-connector")


class JobSpyConnector(BaseJobConnector):
    """
    JobSpy aggregator connector.
    Runs scrape_jobs inside an asyncio worker thread to avoid blocking the event loop.
    """

    def __init__(self, timeout_seconds: int = 25):
        super().__init__(timeout_seconds=timeout_seconds)

    @property
    def source_name(self) -> str:
        return "jobspy"

    async def check_health(self) -> bool:
        """Lightweight verification that jobspy is importable and ready."""
        try:
            from jobspy import scrape_jobs
            return callable(scrape_jobs)
        except Exception as e:
            logger.warning(f"JobSpy health check failed: {e}")
            return False

    async def search(
        self,
        keywords: Optional[str] = None,
        location: Optional[str] = None,
        workplace_type: Optional[str] = None,
        limit: int = 20,
        sites: Optional[List[str]] = None,
        **kwargs
    ) -> List[NormalizedJob]:
        """
        Query jobs using python-jobspy across requested sites.
        Default sites: ['indeed', 'zip_recruiter', 'linkedin', 'glassdoor']
        """
        if not keywords and not location:
            return []

        # Use Location Intelligence to resolve location semantics
        from backend.app.services.location_intelligence import resolve_location
        loc_profile = resolve_location(f"{location or ''} {keywords or ''}")
        is_india = loc_profile.is_india

        if is_india:
            country_indeed = "india"
            target_sites = sites or ["naukri", "linkedin", "indeed", "glassdoor"]
            if loc_profile.city:
                job_search_location = f"{loc_profile.city}, India"
            elif location:
                job_search_location = f"{location}, India" if "india" not in location.lower() else location
            else:
                job_search_location = "India"
        else:
            country_indeed = "usa"
            target_sites = sites or ["indeed", "zip_recruiter", "linkedin", "glassdoor"]
            job_search_location = location or ""

        is_remote = workplace_type and workplace_type.lower() in ("remote", "anywhere")

        def _execute_scrape(search_loc: str, wanted: int = 30):
            from jobspy import scrape_jobs
            import pandas as pd

            df: pd.DataFrame = scrape_jobs(
                site_name=target_sites,
                search_term=keywords or "",
                location=search_loc,
                results_wanted=min(wanted, 40),
                is_remote=bool(is_remote),
                country_indeed=country_indeed,
                description_format="markdown",
                verbose=0,
            )
            return df

        results: List[NormalizedJob] = []

        try:
            df = await asyncio.wait_for(
                asyncio.to_thread(_execute_scrape, job_search_location, limit),
                timeout=self.timeout_seconds
            )

            # If empty and specific city was queried in India, fallback to searching India wide
            if (df is None or df.empty) and is_india and loc_profile.city:
                logger.info(f"Zero JobSpy results for {loc_profile.city}, attempting fallback for India wide...")
                try:
                    df = await asyncio.wait_for(
                        asyncio.to_thread(_execute_scrape, "India", limit),
                        timeout=min(self.timeout_seconds, 15)
                    )
                except Exception as fb_err:
                    logger.debug(f"JobSpy fallback failed: {fb_err}")

            if df is None or df.empty:
                return []

            # Transform DataFrame records to NormalizedJob objects
            for _, row in df.iterrows():
                try:
                    site_id = str(row.get("id", "")) or f"jobspy-{abs(hash(str(row.get('job_url', ''))))}"
                    title = str(row.get("title", "")).strip()
                    company = str(row.get("company", "")).strip() or "Unknown Company"
                    job_url = str(row.get("job_url", "")).strip()
                    description = str(row.get("description", "")).strip()
                    loc_val = str(row.get("location", "")).strip() or (location or "Unspecified")

                    if not title or not job_url:
                        continue

                    # Workplace Type mapping
                    row_is_remote = row.get("is_remote")
                    if row_is_remote is True or "remote" in loc_val.lower():
                        wp_type = WorkplaceType.REMOTE
                    elif "hybrid" in loc_val.lower():
                        wp_type = WorkplaceType.HYBRID
                    else:
                        wp_type = WorkplaceType.ON_SITE

                    # Employment Type mapping
                    row_job_type = str(row.get("job_type", "")).lower()
                    if "contract" in row_job_type:
                        emp_type = EmploymentType.CONTRACT
                    elif "part" in row_job_type:
                        emp_type = EmploymentType.PART_TIME
                    elif "intern" in row_job_type:
                        emp_type = EmploymentType.INTERNSHIP
                    else:
                        emp_type = EmploymentType.FULL_TIME

                    # Date parsing
                    posted_at = None
                    raw_date = row.get("date_posted")
                    if raw_date and not pd.isna(raw_date):
                        try:
                            if hasattr(raw_date, "to_pydatetime"):
                                posted_at = raw_date.to_pydatetime().replace(tzinfo=timezone.utc)
                            elif isinstance(raw_date, datetime):
                                posted_at = raw_date.replace(tzinfo=timezone.utc)
                            else:
                                posted_at = datetime.fromisoformat(str(raw_date)).replace(tzinfo=timezone.utc)
                        except Exception:
                            posted_at = None

                    job = NormalizedJob(
                        source=f"jobspy-{str(row.get('site', 'board')).lower()}",
                        source_job_id=str(site_id),
                        title=title,
                        company=company,
                        location=loc_val,
                        workplace_type=wp_type,
                        employment_type=emp_type,
                        description=description,
                        job_url=job_url,
                        posted_at=posted_at,
                        raw_metadata={
                            "scraper": "python-jobspy",
                            "site": str(row.get("site", "")),
                            "min_amount": str(row.get("min_amount", "")),
                            "max_amount": str(row.get("max_amount", "")),
                            "currency": str(row.get("currency", "")),
                            "emails": row.get("emails", []),
                        }
                    )
                    results.append(job)

                    if len(results) >= limit:
                        break
                except Exception as row_err:
                    logger.debug(f"Skipping malformed JobSpy row: {row_err}")
                    continue

        except asyncio.TimeoutError:
            logger.warning(f"JobSpy scrape timed out after {self.timeout_seconds}s")
        except Exception as e:
            logger.error(f"Error querying JobSpy: {e}", exc_info=True)

        return results
