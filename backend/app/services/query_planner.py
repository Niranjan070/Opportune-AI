"""
Search Query Planner Service.
Intelligently decomposes user job search requests into coordinated,
specialized MCP tool queries across multiple platforms (JobSpy, ATS, Public Boards).
"""
import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from backend.app.services.location_intelligence import LocationProfile, resolve_location

logger = logging.getLogger("query-planner")


@dataclass
class SearchPlanItem:
    tool_name: str
    arguments: Dict[str, Any]
    priority: int  # 1 (Highest) to 3 (Broad fallback)
    description: str


class QueryPlanner:
    """
    Plans multi-tool search execution based on extracted search criteria,
    geographic intent, seniority level, and role specificity.
    """

    @staticmethod
    def plan(
        criteria: Dict[str, Any],
        raw_user_query: str = "",
    ) -> List[SearchPlanItem]:
        """
        Generates an ordered list of search execution items tailored for
        the available MCP tools.
        """
        roles: List[str] = criteria.get("roles") or []
        skills: List[str] = criteria.get("skills") or []
        locations: List[str] = criteria.get("locations") or []
        companies: List[str] = criteria.get("company_names") or []
        workplace: Optional[str] = criteria.get("workplace_type")
        exp_level: Optional[str] = criteria.get("seniority") or criteria.get("employment_type")

        # 1. Resolve Location Intelligence
        raw_loc_input = " ".join(locations) if locations else raw_user_query
        loc_profile: LocationProfile = resolve_location(raw_loc_input)

        # 2. Formulate Core Keyword Strings
        base_role = roles[0] if roles else (" ".join(skills[:2]) if skills else "Software Engineer")
        is_intern = (
            exp_level == "Internship"
            or "intern" in raw_user_query.lower()
            or "internship" in raw_user_query.lower()
            or any("intern" in r.lower() for r in roles)
        )

        # Build clean search keywords
        if is_intern and "intern" not in base_role.lower():
            primary_keywords = f"{base_role} Intern"
        else:
            primary_keywords = base_role

        plan: List[SearchPlanItem] = []

        # Strategy 1: Targeted Company ATS Search if user named specific companies
        if companies:
            for comp in companies:
                token = comp.lower().replace(" ", "").replace(".", "")
                plan.append(
                    SearchPlanItem(
                        tool_name="get_company_postings",
                        arguments={
                            "company_token": token,
                            "keywords": primary_keywords,
                            "limit": 25,
                        },
                        priority=1,
                        description=f"Query {comp.title()} direct ATS board for '{primary_keywords}'",
                    )
                )

        # Strategy 2: Geographic Search via JobSpy (Naukri, LinkedIn, Indeed, Glassdoor)
        if loc_profile.is_india:
            # India-specific multi-board query
            target_city = loc_profile.city or (locations[0] if locations else None)
            search_loc = f"{target_city}, India" if target_city else "India"

            # Primary: Exact local city / region on Indian platforms
            plan.append(
                SearchPlanItem(
                    tool_name="search_jobspy_sources",
                    arguments={
                        "keywords": primary_keywords,
                        "location": search_loc,
                        "workplace_type": workplace if workplace != "any" else None,
                        "limit": 30,
                    },
                    priority=1,
                    description=f"Scrape LinkedIn, Naukri, & Indeed for '{primary_keywords}' in {search_loc}",
                )
            )

            # Secondary: If user asked for a specific Tier-2/3 city (like Coimbatore),
            # also search for pan-India remote opportunities for the same role
            if loc_profile.search_scope == "city" or loc_profile.is_remote:
                plan.append(
                    SearchPlanItem(
                        tool_name="search_jobspy_sources",
                        arguments={
                            "keywords": f"{primary_keywords} Remote",
                            "location": "India",
                            "workplace_type": "remote",
                            "limit": 20,
                        },
                        priority=2,
                        description=f"Search pan-India remote listings for '{primary_keywords}'",
                    )
                )

            # Tertiary: Public boards for global remote jobs if user didn't forbid remote
            if workplace != "on_site":
                plan.append(
                    SearchPlanItem(
                        tool_name="search_job_sources",
                        arguments={
                            "keywords": primary_keywords,
                            "location": None,
                            "workplace_type": "remote",
                            "limit": 20,
                        },
                        priority=2,
                        description=f"Query global remote boards (Remotive/Arbeitnow) for '{primary_keywords}'",
                    )
                )

        else:
            # Global or Non-India regional search
            search_loc = locations[0] if locations else None

            plan.append(
                SearchPlanItem(
                    tool_name="search_jobspy_sources",
                    arguments={
                        "keywords": primary_keywords,
                        "location": search_loc,
                        "workplace_type": workplace if workplace != "any" else None,
                        "limit": 25,
                    },
                    priority=1,
                    description=f"Search general boards for '{primary_keywords}' in {search_loc or 'Global'}",
                )
            )

            plan.append(
                SearchPlanItem(
                    tool_name="search_job_sources",
                    arguments={
                        "keywords": primary_keywords,
                        "location": search_loc,
                        "workplace_type": workplace if workplace != "any" else None,
                        "limit": 25,
                    },
                    priority=1,
                    description=f"Search Arbeitnow and Remotive for '{primary_keywords}'",
                )
            )

            # Fallback to curated tech company ATS boards if no companies were given
            if not companies and not search_loc:
                for default_comp in ["gitlab", "figma"]:
                    plan.append(
                        SearchPlanItem(
                            tool_name="get_company_postings",
                            arguments={
                                "company_token": default_comp,
                                "keywords": primary_keywords,
                                "limit": 15,
                            },
                            priority=3,
                            description=f"Check {default_comp.title()} tech board",
                        )
                    )

        return plan
