"""
Conversational AI Job Discovery Agent Service
Coordinates natural language query interpretation, approved MCP tool execution,
deduplication, deterministic 6-component scoring, and conversational synthesis.
"""
import asyncio
import logging
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
import httpx
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.models.chat import ChatSession, ChatMessage
from backend.app.models.profile import SearchProfile
from backend.app.schemas.job import NormalizedJob, WorkplaceType, EmploymentType
from backend.app.schemas.profile import SearchProfileBase
from backend.app.services.mcp_client import MCPToolRegistry
from backend.app.services.job_storage import JobStorageService
from backend.app.services.scorer import DeterministicScoringService

logger = logging.getLogger("chat-agent")

COMMON_TECH_SKILLS = [
    "python", "javascript", "typescript", "react", "next.js", "vue", "angular",
    "node.js", "express", "fastapi", "django", "flask", "golang", "go", "rust",
    "java", "spring boot", "c++", "c#", ".net", "sql", "postgresql", "mysql",
    "mongodb", "redis", "docker", "kubernetes", "aws", "gcp", "azure", "terraform",
    "graphql", "rest api", "kafka", "rabbitmq", "git", "linux", "pytorch",
    "tensorflow", "machine learning", "deep learning", "llm", "ai"
]

KNOWN_ATS_COMPANIES = [
    "gitlab", "figma", "stripe", "airbnb", "palantir", "github", "datadog",
    "uber", "spotify", "hashicorp", "automattic", "cloudflare", "elastic",
    "gusto", "ramp", "brex", "affirm", "coinbase", "robinhood"
]

ROLE_KEYWORDS = [
    "software engineer", "backend engineer", "frontend engineer", "full stack engineer",
    "fullstack engineer", "devops engineer", "platform engineer", "site reliability engineer",
    "sre", "machine learning engineer", "data engineer", "data scientist", "ai engineer",
    "product manager", "engineering manager", "architect", "developer"
]


class ChatAgentService:
    def __init__(self):
        self.mcp_registry = MCPToolRegistry(default_timeout_seconds=settings.MCP_TIMEOUT_SECONDS)

    async def _extract_criteria_with_gemini(self, text: str) -> Optional[Dict[str, Any]]:
        """Call Google Gemini to extract search intent and structured criteria."""
        if not settings.GEMINI_API_KEY:
            return None

        prompt = (
            "You are Opportune AI's Job Discovery Agent. Analyze the candidate's message and extract search criteria.\n"
            "Respond ONLY with valid JSON (no markdown formatting, no code fences) with exactly these keys:\n"
            "{\n"
            '  "roles": ["list of job titles/roles mentioned or implied"],\n'
            '  "skills": ["list of technical skills/languages/frameworks"],\n'
            '  "companies": ["list of company tokens/slugs lowercase, e.g. gitlab, stripe"],\n'
            '  "workplace_type": "remote" | "hybrid" | "on_site" | "any",\n'
            '  "locations": ["list of cities, countries, or regions mentioned"],\n'
            '  "min_salary": number or null,\n'
            '  "summary": "one concise sentence summarizing search intent"\n'
            "}\n\n"
            f"Candidate message: {text}"
        )

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.LLM_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json",
            },
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidate_part = data["candidates"][0]["content"]["parts"][0]["text"]
                    clean_json = candidate_part.strip()
                    if clean_json.startswith("```json"):
                        clean_json = clean_json[7:]
                    if clean_json.startswith("```"):
                        clean_json = clean_json[3:]
                    if clean_json.endswith("```"):
                        clean_json = clean_json[:-3]
                    import json
                    return json.loads(clean_json.strip())
        except Exception as e:
            logger.warning(f"Gemini criteria extraction call failed: {e}. Falling back to rule engine.")

        return None

    async def _generate_conversational_response_with_gemini(
        self,
        user_message: str,
        criteria: Dict[str, Any],
        top_jobs: List[Dict[str, Any]],
        total_discovered: int,
    ) -> Optional[str]:
        """Synthesize a natural, conversational response using Gemini."""
        if not settings.GEMINI_API_KEY:
            return None

        prompt = (
            "You are Opportune AI, an intelligent conversational AI job discovery assistant designed with the personality and clarity of ChatGPT and Claude.\n"
            f"Candidate query: {repr(user_message)}\n\n"
            "Search findings:\n"
            f"- Extracted Criteria: {criteria}\n"
            f"- Total Openings Evaluated: {total_discovered}\n"
            f"- Top Scored Matches: {[{'title': j['title'], 'company': j['company'], 'match_score': j['match_score'], 'location': j['location'], 'matched_skills': j['matched_skills'], 'missing_skills': j['missing_skills']} for j in top_jobs[:4]]}\n\n"
            "Instructions:\n"
            "1. Write a direct, intelligent, and warm response (1 to 2 paragraphs).\n"
            "2. Summarize where you searched (e.g. ATS boards, public feeds) and highlight what makes the top roles attractive.\n"
            "3. Mention any interesting skill matches or potential trade-offs (e.g. tech stack fit).\n"
            "4. Do NOT output JSON or repeating card details (the UI renders rich cards automatically below your response).\n"
            "5. Keep the formatting in clean markdown with bold highlights."
        )

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.LLM_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.4},
        }

        try:
            async with httpx.AsyncClient(timeout=12.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            logger.warning(f"Gemini conversational synthesis call failed: {e}")

        return None

    def _extract_criteria_rule_based(self, text: str) -> Dict[str, Any]:
        """
        Deterministic rule and regex criteria extractor for offline execution.
        Guarantees zero external dependency blockers.
        """
        text_lower = text.lower()

        # 1. Detect target ATS companies
        companies = []
        for comp in KNOWN_ATS_COMPANIES:
            if re.search(r"\b" + re.escape(comp) + r"\b", text_lower):
                companies.append(comp)

        # 2. Detect technical skills
        skills = []
        for skill in COMMON_TECH_SKILLS:
            pattern = r"(?<!\w)" + re.escape(skill) + r"(?!\w)"
            if re.search(pattern, text_lower):
                skills.append(skill.title() if len(skill) > 3 else skill.upper())

        # 3. Detect roles
        roles = []
        for role in ROLE_KEYWORDS:
            if re.search(r"\b" + re.escape(role) + r"\b", text_lower):
                roles.append(role.title())

        if not roles:
            # Fallback to general software engineer if skills detected
            if skills:
                roles.append(f"{skills[0]} Engineer")
            else:
                roles.append("Software Engineer")

        # 4. Workplace type
        workplace = "any"
        if re.search(r"\b(remote|work from home|telecommute|wfh)\b", text_lower):
            workplace = "remote"
        elif re.search(r"\b(hybrid)\b", text_lower):
            workplace = "hybrid"
        elif re.search(r"\b(on-site|onsite|in-office|office)\b", text_lower):
            workplace = "on_site"

        # 5. Locations
        locations = []
        for loc in ["germany", "berlin", "europe", "usa", "us", "united states", "india", "london", "uk", "remote", "worldwide"]:
            if re.search(r"\b" + re.escape(loc) + r"\b", text_lower):
                locations.append(loc.title())

        # 6. Salary detection (e.g. $140k, 120k, $150,000)
        salary_match = re.search(r"\$?(\d{2,3})k\b", text_lower)
        min_salary = int(salary_match.group(1)) * 1000 if salary_match else None

        summary = f"Search for {', '.join(roles)} with {', '.join(skills[:3]) if skills else 'relevant skills'}"

        return {
            "roles": roles,
            "skills": skills,
            "companies": companies,
            "workplace_type": workplace,
            "locations": locations,
            "min_salary": min_salary,
            "summary": summary,
        }

    async def _execute_mcp_tools(self, criteria: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], List[NormalizedJob]]:
        """
        Call approved MCP tools according to extracted intent.
        Returns (tool_call_records, normalized_jobs).
        """
        tool_records: List[Dict[str, Any]] = []
        all_raw_jobs: List[NormalizedJob] = []

        skills = criteria.get("skills", [])
        roles = criteria.get("roles", [])
        primary_keyword = skills[0] if skills else (roles[0] if roles else "Engineer")
        workplace = criteria.get("workplace_type")
        location = criteria.get("locations", [None])[0] if criteria.get("locations") else None

        # 1. If specific ATS companies were mentioned, call get_company_postings for each
        target_companies = criteria.get("companies", [])
        if target_companies:
            for company in target_companies:
                start_t = time.perf_counter()
                try:
                    res = await self.mcp_registry.invoke_tool(
                        "get_company_postings",
                        {
                            "company_token": company,
                            "keywords": primary_keyword if primary_keyword != "Engineer" else None,
                            "limit": 30,
                        }
                    )
                    lat = int((time.perf_counter() - start_t) * 1000)
                    job_dicts = res.get("data") or res.get("output") or []
                    tool_records.append({
                        "tool": "get_company_postings",
                        "args": {"company": company},
                        "latency_ms": lat,
                        "success": res.get("status") == "success",
                        "result_summary": f"Fetched {len(job_dicts)} openings from {company.title()} ATS",
                    })

                    for jd in job_dicts:
                        if isinstance(jd, dict):
                            all_raw_jobs.append(NormalizedJob(**jd))
                except Exception as e:
                    lat = int((time.perf_counter() - start_t) * 1000)
                    tool_records.append({
                        "tool": "get_company_postings",
                        "args": {"company": company},
                        "latency_ms": lat,
                        "success": False,
                        "result_summary": f"Error querying {company}: {str(e)}",
                    })

        # 2. Query broad permitted public sources via search_job_sources
        start_t = time.perf_counter()
        try:
            res = await self.mcp_registry.invoke_tool(
                "search_job_sources",
                {
                    "keywords": primary_keyword,
                    "location": location,
                    "workplace_type": workplace if workplace != "any" else None,
                    "limit": 30,
                }
            )
            lat = int((time.perf_counter() - start_t) * 1000)
            job_dicts = res.get("data") or res.get("output") or []
            tool_records.append({
                "tool": "search_job_sources",
                "args": {"keywords": primary_keyword, "workplace": workplace},
                "latency_ms": lat,
                "success": res.get("status") == "success",
                "result_summary": f"Discovered {len(job_dicts)} openings across public job sources",
            })

            for jd in job_dicts:
                if isinstance(jd, dict):
                    all_raw_jobs.append(NormalizedJob(**jd))
        except Exception as e:
            lat = int((time.perf_counter() - start_t) * 1000)
            tool_records.append({
                "tool": "search_job_sources",
                "args": {"keywords": primary_keyword},
                "latency_ms": lat,
                "success": False,
                "result_summary": f"Error: {str(e)}",
            })

        return tool_records, all_raw_jobs

    async def process_user_message(
        self,
        session: ChatSession,
        user_message_text: str,
        db: Session,
    ) -> ChatMessage:
        """
        Full conversational agent pipeline:
        1. Parse intent (Gemini -> fallback)
        2. Execute MCP tools
        3. Persist and deduplicate
        4. Score deterministically
        5. Formulate response and save message
        """
        # Step 1: Extract criteria
        criteria = await self._extract_criteria_with_gemini(user_message_text)
        if not criteria:
            criteria = self._extract_criteria_rule_based(user_message_text)

        # Merge with existing session search criteria if present
        merged_criteria = {**(session.search_criteria or {}), **criteria}
        session.search_criteria = merged_criteria

        # Step 2: Execute approved MCP tools
        tool_records, raw_jobs = await self._execute_mcp_tools(merged_criteria)

        # Step 3: Persist raw jobs into database with canonical deduplication
        if raw_jobs:
            JobStorageService.persist_jobs(raw_jobs, db)

        # Step 4: Deterministic 6-component scoring against extracted criteria
        profile_spec = SearchProfileBase(
            name=session.title or "Chat Session Profile",
            target_titles=merged_criteria.get("roles", []),
            skills=merged_criteria.get("skills", []),
            workplace_preference=merged_criteria.get("workplace_type", "any"),
            preferred_locations=merged_criteria.get("locations", []),
            excluded_employers=[],
            excluded_keywords=[],
        )

        scored_candidates: List[Dict[str, Any]] = []
        for job in raw_jobs:
            breakdown, is_excluded = DeterministicScoringService.evaluate_job(job, profile_spec)
            if not is_excluded:
                scored_candidates.append({
                    "job_id": job.source_job_id,
                    "title": job.title,
                    "company": job.company,
                    "location": job.location or "Remote",
                    "workplace_type": job.workplace_type.value if hasattr(job.workplace_type, "value") else str(job.workplace_type),
                    "match_score": round(breakdown.total_score, 1),
                    "score_tier": breakdown.tier.value if hasattr(breakdown.tier, "value") else str(breakdown.tier),
                    "apply_url": job.job_url,
                    "matched_skills": breakdown.matched_skills,
                    "missing_skills": breakdown.missing_skills,
                    "score_explanation": breakdown.explanation,
                    "posted_at": job.posted_at.isoformat() if job.posted_at else None,
                })

        # Rank by match_score descending and take top 6
        scored_candidates.sort(key=lambda x: x["match_score"], reverse=True)
        top_scored_jobs = scored_candidates[:6]

        # Step 5: Compose conversational markdown response
        roles_str = ", ".join(merged_criteria.get("roles", [])) or "roles"
        skills_str = ", ".join(merged_criteria.get("skills", [])) or "your skills"
        companies_str = ", ".join([c.title() for c in merged_criteria.get("companies", [])])
        total_found = len(raw_jobs)
        top_matches_count = len(top_scored_jobs)

        # Try generating conversational response with Gemini
        llm_reply = await self._generate_conversational_response_with_gemini(
            user_message=user_message_text,
            criteria=merged_criteria,
            top_jobs=top_scored_jobs,
            total_discovered=total_found,
        )

        if llm_reply:
            assistant_content = llm_reply
        else:
            content_parts = []
            content_parts.append(f"I searched for **{roles_str}** matching **{skills_str}**.")

            if companies_str:
                content_parts.append(f"Targeting company ATS boards: **{companies_str}**.")

            if top_matches_count > 0:
                content_parts.append(
                    f"Discovered **{total_found} total openings** and evaluated them through our deterministic scoring engine. "
                    f"Here are the **top {top_matches_count} matching opportunities**:"
                )
            else:
                content_parts.append(
                    f"I queried the job sources but found no immediate openings perfectly matching these specific constraints. "
                    f"Try broadening the keywords or workplace preferences, or subscribe to receive alerts when matching roles appear!"
                )

            assistant_content = "\n\n".join(content_parts)

        # Step 6: Update ChatSession title if this is the first exchange
        if session.title in ("New Job Search Chat", None, ""):
            first_role = merged_criteria.get("roles", ["Software"])[0]
            first_skill = merged_criteria.get("skills", ["Engineer"])[0] if merged_criteria.get("skills") else "Tech"
            session.title = f"{first_role} ({first_skill})"

        session.updated_at = datetime.now(timezone.utc)

        # Step 7: Create ChatMessage records
        # Save user message
        user_msg = ChatMessage(
            session_id=session.id,
            sender="user",
            content=user_message_text,
            tool_calls=[],
            scored_jobs=[],
        )
        db.add(user_msg)

        # Save assistant message
        assistant_msg = ChatMessage(
            session_id=session.id,
            sender="assistant",
            content=assistant_content,
            tool_calls=tool_records,
            scored_jobs=top_scored_jobs,
        )
        db.add(assistant_msg)
        db.commit()
        db.refresh(assistant_msg)

        return assistant_msg


chat_agent_service = ChatAgentService()
