"""
Tests for DiscoveryOrchestrator and Partial Failure Isolation
"""
import pytest
from unittest.mock import AsyncMock, patch
from backend.app.models.search_run import SearchRun
from backend.app.schemas.job import NormalizedJob, WorkplaceType, EmploymentType
from backend.app.services.orchestrator import discovery_orchestrator


@pytest.mark.asyncio
async def test_orchestrator_multi_source_execution(db_session):
    db = db_session

    search_run = SearchRun(trigger_type="manual", status="running")
    db.add(search_run)
    db.commit()
    db.refresh(search_run)

    job1 = NormalizedJob(
        source="arbeitnow",
        source_job_id="orch-1",
        title="Backend Engineer",
        company="AlphaCorp",
        job_url="https://example.com/orch-1",
        description="Python backend",
    )
    job2 = NormalizedJob(
        source="greenhouse",
        source_job_id="orch-2",
        title="Staff Engineer",
        company="BetaCorp",
        job_url="https://example.com/orch-2",
        description="Distributed systems",
    )

    with patch("backend.app.connectors.arbeitnow.ArbeitnowConnector.search", new_callable=AsyncMock) as m_ab, \
         patch("backend.app.connectors.greenhouse.GreenhouseConnector.search", new_callable=AsyncMock) as m_gh, \
         patch("backend.app.connectors.lever.LeverConnector.search", new_callable=AsyncMock) as m_lv, \
         patch("backend.app.connectors.remotive.RemotiveConnector.search", new_callable=AsyncMock) as m_rm:

        m_ab.return_value = [job1]
        m_gh.return_value = [job2]
        m_lv.return_value = []
        m_rm.return_value = []

        summary = await discovery_orchestrator.execute_discovery_run(
            db=db,
            search_run=search_run,
            enabled_sources=["arbeitnow", "greenhouse", "lever", "remotive"],
            keywords="Engineer",
            limit_per_source=10,
        )

        assert summary["status"] == "completed"
        assert summary["total_processed"] == 2
        assert summary["discovered"] == 2
        assert "arbeitnow" in summary["source_results"]
        assert summary["source_results"]["arbeitnow"]["count"] == 1
        assert summary["source_results"]["greenhouse"]["count"] == 1


@pytest.mark.asyncio
async def test_orchestrator_isolates_partial_source_failure(db_session):
    db = db_session

    search_run = SearchRun(trigger_type="manual", status="running")
    db.add(search_run)
    db.commit()
    db.refresh(search_run)

    good_job = NormalizedJob(
        source="arbeitnow",
        source_job_id="orch-good",
        title="Full Stack Developer",
        company="Resilient Systems",
        job_url="https://example.com/orch-good",
        description="FastAPI & React",
    )

    with patch("backend.app.connectors.arbeitnow.ArbeitnowConnector.search", new_callable=AsyncMock) as m_ab, \
         patch("backend.app.connectors.greenhouse.GreenhouseConnector.search", new_callable=AsyncMock) as m_gh:

        m_ab.return_value = [good_job]
        m_gh.side_effect = RuntimeError("Greenhouse upstream connection timeout")

        summary = await discovery_orchestrator.execute_discovery_run(
            db=db,
            search_run=search_run,
            enabled_sources=["arbeitnow", "greenhouse"],
            keywords="Developer",
            limit_per_source=5,
        )

        # Run finishes as partial_success, not a complete crash!
        assert summary["status"] == "partial_success"
        assert summary["total_processed"] == 1
        assert summary["discovered"] == 1
        assert summary["source_results"]["arbeitnow"]["status"] == "success"
        assert summary["source_results"]["greenhouse"]["status"] == "failure"
        assert "timeout" in summary["source_results"]["greenhouse"]["error"]
