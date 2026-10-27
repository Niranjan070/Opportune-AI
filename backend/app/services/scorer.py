"""
Deterministic 6-Component Weighted Scoring Service
Implements mathematically verifiable, reproducible ranking arithmetic with evidence-based explanations.
"""
import re
from typing import List, Optional, Set, Tuple
from backend.app.schemas.job import NormalizedJob, WorkplaceType
from backend.app.schemas.profile import SearchProfileBase
from backend.app.schemas.scoring import ScoreBreakdown, ScoreTier


class DeterministicScoringService:
    WEIGHT_SKILLS = 0.35
    WEIGHT_TITLE = 0.20
    WEIGHT_EXPERIENCE = 0.15
    WEIGHT_LOCATION = 0.15
    WEIGHT_DOMAIN = 0.10
    WEIGHT_COMPENSATION = 0.05

    @classmethod
    def evaluate_job(
        cls,
        job: NormalizedJob,
        profile: SearchProfileBase,
    ) -> Tuple[ScoreBreakdown, bool]:
        """
        Evaluate a single job against a search profile.
        Returns:
            Tuple of (ScoreBreakdown, is_excluded)
        """
        job_title_lower = job.title.lower()
        job_desc_lower = job.description.lower()
        job_company_lower = job.company.lower()
        job_tags_lower = [str(t).lower() for t in job.raw_metadata.get("tags", [])]
        searchable_text = f"{job_title_lower} {job_desc_lower} {' '.join(job_tags_lower)}"

        # 1. Hard Exclusions Check
        for exc_emp in profile.excluded_employers:
            if exc_emp and exc_emp.strip().lower() in job_company_lower:
                return cls._create_zero_score(
                    f"Excluded employer: '{job.company}' matches excluded list."
                ), True

        for exc_kw in profile.excluded_keywords:
            if exc_kw and re.search(r"\b" + re.escape(exc_kw.strip().lower()) + r"\b", searchable_text):
                return cls._create_zero_score(
                    f"Excluded keyword: '{exc_kw}' detected in job listing."
                ), True

        # 2. Title Alignment (20%) - Evaluated first to inform skill & domain relevance
        is_strict_title_mismatch = False
        if profile.target_titles:
            title_scores = []
            GENERIC_TITLE_WORDS = {"engineer", "developer", "specialist", "intern", "internship", "lead", "senior", "junior", "associate", "manager"}
            for t in profile.target_titles:
                t_tokens = set(re.findall(r"\w+", t.lower()))
                j_tokens = set(re.findall(r"\w+", job_title_lower))
                if t_tokens and j_tokens:
                    domain_t = t_tokens - GENERIC_TITLE_WORDS
                    if domain_t:
                        # Check if any domain token matches
                        domain_matches = len(domain_t.intersection(j_tokens))
                        if domain_matches == 0:
                            # Complete domain mismatch (e.g. 'ai' missing in 'back-end engineer' or 'office assistant')
                            overlap = 0.10 if t_tokens.intersection(j_tokens) else 0.0
                        else:
                            overlap = (domain_matches * 2 + len(t_tokens.intersection(j_tokens))) / (len(domain_t) * 2 + len(t_tokens))
                    else:
                        overlap = len(t_tokens.intersection(j_tokens)) / len(t_tokens)
                    title_scores.append(min(100.0, overlap * 100.0))
                else:
                    title_scores.append(0.0)
            score_title = max(title_scores) if title_scores else 50.0
            if score_title < 25.0:
                is_strict_title_mismatch = True
        else:
            score_title = 80.0

        # 3. Skills Match (35%)
        matched_skills: List[str] = []
        missing_skills: List[str] = []

        if profile.skills:
            for skill in profile.skills:
                sk_clean = skill.strip().lower()
                pattern = r"(?<!\w)" + re.escape(sk_clean) + r"(?!\w)"
                if re.search(pattern, searchable_text):
                    matched_skills.append(skill)
                else:
                    missing_skills.append(skill)
            score_skills = (len(matched_skills) / max(len(profile.skills), 1)) * 100.0
        else:
            # Auto-extract tech skills from job description when no profile skills specified
            COMMON_TECH_LIST = [
                "python", "javascript", "typescript", "react", "next.js", "vue",
                "node.js", "fastapi", "django", "flask", "golang", "go", "rust",
                "java", "spring boot", "c++", "sql", "postgresql", "docker",
                "kubernetes", "aws", "gcp", "azure", "pytorch", "tensorflow",
                "machine learning", "deep learning", "llm", "ai", "nlp", "opencv",
                "pandas", "numpy", "scikit-learn"
            ]
            for skill in COMMON_TECH_LIST:
                pattern = r"(?<!\w)" + re.escape(skill) + r"(?!\w)"
                if re.search(pattern, searchable_text):
                    matched_skills.append(skill.title() if len(skill) > 3 else skill.upper())

            if is_strict_title_mismatch:
                score_skills = 25.0
            else:
                score_skills = min(100.0, 65.0 + len(matched_skills) * 7.0) if matched_skills else 70.0

        # 4. Experience & Seniority (15%)
        profile_exp = (profile.experience_level or "Any").lower()
        score_experience = 80.0

        senior_markers = ["senior", "sr.", "lead", "principal", "staff", "architect", "director"]
        junior_markers = ["junior", "entry", "intern", "associate", "graduate"]

        is_job_senior = any(m in job_title_lower for m in senior_markers)
        is_job_junior = any(m in job_title_lower for m in junior_markers)

        if "intern" in profile_exp or "entry" in profile_exp:
            if is_job_junior:
                score_experience = 100.0
            elif is_job_senior:
                score_experience = 25.0
            else:
                score_experience = 70.0
        elif "senior" in profile_exp or "lead" in profile_exp:
            if is_job_senior:
                score_experience = 100.0
            elif is_job_junior:
                score_experience = 30.0
            else:
                score_experience = 80.0
        elif profile_exp in ("any", ""):
            score_experience = 90.0

        if is_strict_title_mismatch:
            score_experience = min(score_experience, 40.0)

        # 5. Location & Work Arrangement (15%)
        wp_pref = (profile.workplace_preference or "any").lower()
        score_location = 70.0

        if wp_pref == "remote":
            if job.workplace_type == WorkplaceType.REMOTE:
                score_location = 100.0
            elif job.workplace_type == WorkplaceType.HYBRID:
                score_location = 50.0
            else:
                score_location = 20.0
        elif wp_pref == "hybrid":
            if job.workplace_type in (WorkplaceType.HYBRID, WorkplaceType.REMOTE):
                score_location = 100.0
            else:
                score_location = 40.0
        elif wp_pref in ("any", "all"):
            score_location = 90.0

        # Location matching and penalty for strict geographic mismatches with Location Intelligence
        if profile.preferred_locations:
            pref_locs_clean = [pl.lower().strip() for pl in profile.preferred_locations if pl and pl.lower() != "any"]
            if pref_locs_clean:
                from backend.app.services.location_intelligence import resolve_location, compute_geographic_relevance
                target_loc = resolve_location(" ".join(pref_locs_clean))
                allow_remote = profile.workplace_preference in ("remote", "hybrid", "any", "all")

                is_acceptable, geo_multiplier, match_reason = compute_geographic_relevance(
                    job.location,
                    target_loc,
                    allow_remote=allow_remote,
                )

                if not is_acceptable:
                    score_location = 5.0
                elif "city-match" in match_reason:
                    score_location = 100.0
                elif "state-match" in match_reason:
                    score_location = 85.0
                elif "country" in match_reason or "europe-match" in match_reason or "remote-europe" in match_reason:
                    score_location = 70.0 if target_loc.search_scope == "city" else 95.0
                elif "remote" in match_reason:
                    score_location = 75.0 if allow_remote else 30.0
                else:
                    score_location = 50.0
            else:
                score_location = 85.0

        # 6. Domain & Responsibilities (10%)
        score_domain = 25.0 if is_strict_title_mismatch else 80.0

        # 7. Compensation (5%)
        score_comp = 75.0
        if job.salary_min or job.salary_max:
            score_comp = 90.0  # Disclosed compensation gets positive boost

        # Final Weighted Arithmetic
        total_score = (
            cls.WEIGHT_SKILLS * score_skills
            + cls.WEIGHT_TITLE * score_title
            + cls.WEIGHT_EXPERIENCE * score_experience
            + cls.WEIGHT_LOCATION * score_location
            + cls.WEIGHT_DOMAIN * score_domain
            + cls.WEIGHT_COMPENSATION * score_comp
        )

        if is_strict_title_mismatch:
            total_score = min(total_score, 35.0)

        total_score = round(max(0.0, min(100.0, total_score)), 1)

        # Tier Classification
        if total_score >= 85.0:
            tier = ScoreTier.EXCELLENT
        elif total_score >= 70.0:
            tier = ScoreTier.STRONG
        elif total_score >= 50.0:
            tier = ScoreTier.POSSIBLE
        else:
            tier = ScoreTier.LOW

        # Generate Evidence Explanation
        explanations = []
        if is_strict_title_mismatch and profile.target_titles:
            explanations.append(f"Low role title alignment with '{job.title}'")
        elif score_title >= 80.0:
            explanations.append(f"Strong role title alignment with '{job.title}'")

        if matched_skills:
            if profile.skills:
                explanations.append(f"Matched {len(matched_skills)}/{len(profile.skills)} target skills ({', '.join(matched_skills[:4])})")
            else:
                explanations.append(f"Tech stack detected: {', '.join(matched_skills[:4])}")

        if missing_skills:
            explanations.append(f"Missing desired skills: {', '.join(missing_skills[:3])}")

        if job.workplace_type == WorkplaceType.REMOTE and wp_pref == "remote":
            explanations.append("100% Remote match with work preference")
        elif job.location:
            explanations.append(f"Location: {job.location}")

        explanation_str = " • ".join(explanations) if explanations else "Candidate profile evaluated against job listing criteria."

        breakdown = ScoreBreakdown(
            total_score=total_score,
            tier=tier,
            score_skills=round(score_skills, 1),
            score_title=round(score_title, 1),
            score_experience=round(score_experience, 1),
            score_location=round(score_location, 1),
            score_domain=round(score_domain, 1),
            score_compensation=round(score_comp, 1),
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            explanation=explanation_str,
        )

        return breakdown, False

    @classmethod
    def _create_zero_score(cls, reason: str) -> ScoreBreakdown:
        return ScoreBreakdown(
            total_score=0.0,
            tier=ScoreTier.LOW,
            score_skills=0.0,
            score_title=0.0,
            score_experience=0.0,
            score_location=0.0,
            score_domain=0.0,
            score_compensation=0.0,
            matched_skills=[],
            missing_skills=[],
            explanation=reason,
        )
