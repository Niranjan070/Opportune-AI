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

        # Strategy 2: Dynamic Multi-Board Search via MCP Tools
        # Determine exact search location from user input or extracted criteria
        if locations:
            search_loc = locations[0]
            if loc_profile.is_india and loc_profile.city and "india" not in search_loc.lower():
                search_loc = f"{search_loc}, India"
        elif loc_profile.city:
            search_loc = f"{loc_profile.city}, India" if loc_profile.is_india else loc_profile.city
        elif loc_profile.state:
            search_loc = f"{loc_profile.state}, India" if loc_profile.is_india else loc_profile.state
        elif loc_profile.country:
            search_loc = loc_profile.country
        else:
            search_loc = None if loc_profile.is_remote else None

        # 1. Query aggregate job boards (LinkedIn, Glassdoor, Indeed, Naukri) via JobSpy
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
                description=f"Query major boards for '{primary_keywords}' in {search_loc or 'All Locations'}",
            )
        )

        # 2. Query public tech and aggregator boards (Arbeitnow & Remotive)
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
                description=f"Query public boards for '{primary_keywords}' in {search_loc or 'Remote/Global'}",
            )
        )

        # 3. If user asked for a specific local city and remote is not forbidden,
        # also search for country/regional remote listings
        if loc_profile.search_scope == "city" and workplace != "on_site":
            fallback_region = "India" if loc_profile.is_india else (loc_profile.country or "Remote")
            plan.append(
                SearchPlanItem(
                    tool_name="search_jobspy_sources",
                    arguments={
                        "keywords": f"{primary_keywords} Remote",
                        "location": fallback_region,
                        "workplace_type": "remote",
                        "limit": 20,
                    },
                    priority=2,
                    description=f"Search regional remote listings for '{primary_keywords}'",
                )
            )

        # 4. Fallback to curated tech company ATS boards if no companies were given and no location specified
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
