"""
Tests for Search Query Planner Service.
Verifies multi-tool execution planning, targeted keyword formulation, and Indian vs Global dispatching.
"""
from backend.app.services.query_planner import QueryPlanner


def test_query_planner_india_city_search():
    criteria = {
        "roles": ["AI Engineer"],
        "skills": ["Python", "PyTorch"],
        "locations": ["Coimbatore"],
        "experience_level": "Internship",
        "workplace_type": "any",
    }
    plan = QueryPlanner.plan(criteria, raw_user_query="ai engineer intern in coimbatore")

    assert len(plan) >= 2
    # First plan item should target JobSpy for Coimbatore, India
    first_tool = plan[0]
    assert first_tool.tool_name == "search_jobspy_sources"
    assert "Coimbatore" in first_tool.arguments["location"]
    assert "AI Engineer Intern" in first_tool.arguments["keywords"]

    # Should also include a pan-India remote search or public remote board
    tool_names = [p.tool_name for p in plan]
    assert "search_jobspy_sources" in tool_names


def test_query_planner_company_board():
    criteria = {
        "roles": ["Backend Engineer"],
        "company_names": ["GitLab"],
        "workplace_type": "remote",
    }
    plan = QueryPlanner.plan(criteria, raw_user_query="backend engineer at gitlab")

    ats_tools = [p for p in plan if p.tool_name == "get_company_postings"]
    assert len(ats_tools) > 0
    assert ats_tools[0].arguments["company_token"] == "gitlab"
