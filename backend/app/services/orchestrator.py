"""
Discovery Orchestrator Service
Coordinates concurrent, timeout-bounded job discovery across multiple sources,
handles partial failure isolation, records execution audit logs, and persists listings.
"""
import asyncio
import time
from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from backend.app.connectors.arbeitnow import ArbeitnowConnector
from backend.app.connectors.greenhouse import GreenhouseConnector
from backend.app.connectors.lever import LeverConnector
from backend.app.connectors.remotive import RemotiveConnector
from backend.app.connectors.jobspy import JobSpyConnector
from backend.app.models.search_run import SearchRun, SourceExecutionLog
from backend.app.schemas.job import NormalizedJob
from backend.app.services.job_storage import JobStorageService

logger = logging.getLogger("orchestrator")


class DiscoveryOrchestrator:
    def __init__(self, per_source_timeout: int = 25, max_concurrency: int = 5):
        self.per_source_timeout = per_source_timeout
        self.semaphore = asyncio.Semaphore(max_concurrency)

    def _get_connector(self, source_name: str, target_companies: Optional[List[str]] = None):
        name = source_name.lower().strip()
        if name == "arbeitnow":
            return ArbeitnowConnector(timeout_seconds=self.per_source_timeout)
        elif name == "greenhouse":
            return GreenhouseConnector(target_companies=target_companies, timeout_seconds=self.per_source_timeout)
        elif name == "lever":
            return LeverConnector(target_companies=target_companies, timeout_seconds=self.per_source_timeout)
        elif name == "remotive":
            return RemotiveConnector(timeout_seconds=self.per_source_timeout)
        elif name == "jobspy":
            return JobSpyConnector(timeout_seconds=self.per_source_timeout)
        else:
            raise ValueError(f"Unsupported job source connector: '{source_name}'")

    async def _query_single_source(
        self,
        source_name: str,
        keywords: Optional[str] = None,
        location: Optional[str] = None,
        workplace_type: Optional[str] = None,
        limit: int = 50,
        companies: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Execute query against a single source with timing, timeout, and exception isolation.
        """
        start = time.perf_counter()
        async with self.semaphore:
            try:
                connector = self._get_connector(source_name, target_companies=companies)
                coro = connector.search(
                    keywords=keywords,
                    location=location,
                    workplace_type=workplace_type,
                    limit=limit,
                )
                jobs: List[NormalizedJob] = await asyncio.wait_for(coro, timeout=self.per_source_timeout)
                latency_ms = int((time.perf_counter() - start) * 1000)

                return {
                    "source": source_name,
                    "status": "success",
                    "jobs": jobs,
                    "count": len(jobs),
                    "latency_ms": latency_ms,
                    "error": None,
                }
            except asyncio.TimeoutError:
                latency_ms = int((time.perf_counter() - start) * 1000)
                logger.warning(f"Source '{source_name}' timed out after {self.per_source_timeout}s")
                return {
                    "source": source_name,
                    "status": "timeout",
                    "jobs": [],
                    "count": 0,
                    "latency_ms": latency_ms,
                    "error": f"Timed out after {self.per_source_timeout}s",
                }
            except Exception as e:
                latency_ms = int((time.perf_counter() - start) * 1000)
                logger.error(f"Source '{source_name}' failed: {e}", exc_info=True)
                return {
                    "source": source_name,
                    "status": "failure",
                    "jobs": [],
                    "count": 0,
                    "latency_ms": latency_ms,
                    "error": str(e),
                }

    async def execute_discovery_run(
        self,
        db: Session,
        search_run: SearchRun,
        enabled_sources: Optional[List[str]] = None,
        keywords: Optional[str] = None,
        location: Optional[str] = None,
        workplace_type: Optional[str] = None,
        limit_per_source: int = 50,
        target_companies: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Execute a full multi-source discovery workflow for a search run:
        1. Queries all sources concurrently.
        2. Logs each source's outcome to SourceExecutionLog.
        3. Persists and deduplicates all discovered listings.
        4. Updates SearchRun statistics.
        """
        sources = enabled_sources or ["arbeitnow", "greenhouse", "lever", "remotive"]
        logger.info(f"Starting discovery run {search_run.id} across sources: {sources}")

        tasks = [
            self._query_single_source(
                source_name=src,
                keywords=keywords,
                location=location,
                workplace_type=workplace_type,
                limit=limit_per_source,
                companies=target_companies,
            )
            for src in sources
        ]

        source_results = await asyncio.gather(*tasks)

        all_retrieved_jobs: List[NormalizedJob] = []
        source_summary = {}

        now = datetime.now(timezone.utc)

        for res in source_results:
            src_name = res["source"]
            all_retrieved_jobs.extend(res["jobs"])

            source_summary[src_name] = {
                "status": res["status"],
                "count": res["count"],
                "latency_ms": res["latency_ms"],
                "error": res["error"],
            }

            # Record in SourceExecutionLog
            log_entry = SourceExecutionLog(
                search_run_id=search_run.id,
                source_name=src_name,
                status=res["status"],
                items_retrieved=res["count"],
                latency_ms=res["latency_ms"],
                error_details=res["error"],
                executed_at=now,
            )
            db.add(log_entry)

        # Persist and deduplicate jobs
        stats = JobStorageService.persist_jobs(all_retrieved_jobs, db)

        # Update SearchRun metadata
        search_run.total_discovered = stats["discovered"]
        search_run.total_deduplicated = stats["total_processed"]
        # Check if partial success (any source failed)
        any_failures = any(r["status"] in ("failure", "timeout") for r in source_results)
        search_run.status = "partial_success" if any_failures else "completed"
        search_run.completed_at = datetime.now(timezone.utc)

        db.commit()

        return {
            "search_run_id": search_run.id,
            "status": search_run.status,
            "total_processed": stats["total_processed"],
            "discovered": stats["discovered"],
            "updated": stats["updated"],
            "source_results": source_summary,
        }


# Singleton orchestrator
discovery_orchestrator = DiscoveryOrchestrator()
