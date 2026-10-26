"""
Result Merger & Cross-Source Deduplication Service.
Combines job results from multiple sources (JobSpy, Arbeitnow, Remotive, Greenhouse, Lever),
eliminates duplicates using URL normalization, company+title similarity, and content fingerprints,
and applies geographic relevance filtering based on user location intent.
"""
import hashlib
import logging
import re
from typing import Dict, List, Optional, Set, Tuple
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from backend.app.schemas.job import NormalizedJob
from backend.app.services.location_intelligence import (
    LocationProfile,
    compute_geographic_relevance,
)

logger = logging.getLogger("result-merger")

TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "ref", "source", "fbclid", "gclid", "gh_src", "lever-source", "trk",
}


def normalize_job_url(raw_url: Optional[str]) -> str:
    """Strips tracking query parameters and trailing slashes for canonical comparison."""
    if not raw_url:
        return ""
    try:
        parsed = urlparse(raw_url.strip())
        filtered_queries = [
            (k, v) for k, v in parse_qsl(parsed.query)
            if k.lower() not in TRACKING_PARAMS
        ]
        clean_query = urlencode(sorted(filtered_queries))
        path = parsed.path.rstrip("/")
        return urlunparse((parsed.scheme.lower(), parsed.netloc.lower(), path, "", clean_query, "")).strip()
    except Exception:
        return raw_url.strip().lower().rstrip("/")


def clean_text_for_match(text: Optional[str]) -> str:
    """Normalizes title or company name for fuzzy matching."""
    if not text:
        return ""
    t = text.lower()
    # Remove common suffixes like inc, llc, pvt ltd, technologies, etc.
    t = re.sub(r"\b(inc|llc|pvt|ltd|limited|technologies|corporation|corp|systems|labs)\b", "", t)
    # Remove non-alphanumeric chars
    t = re.sub(r"[^a-z0-9\s]", " ", t)
    return " ".join(t.split())


def create_job_fingerprint(job: NormalizedJob) -> str:
    """Generates a stable fingerprint based on company, title, and partial description."""
    norm_comp = clean_text_for_match(job.company)
    norm_title = clean_text_for_match(job.title)
    sample_desc = (job.description or "")[:150].lower().strip()
    clean_desc = re.sub(r"\s+", " ", sample_desc)
    raw = f"{norm_comp}|{norm_title}|{clean_desc}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def merge_and_filter_results(
    raw_jobs: List[NormalizedJob],
    location_profile: LocationProfile,
    allow_remote: bool = True,
    max_results: int = 50,
) -> List[NormalizedJob]:
    """
    Deduplicates jobs across sources and filters/ranks by geographic intent.
    """
    if not raw_jobs:
        return []

    seen_urls: Set[str] = set()
    seen_fingerprints: Set[str] = set()
    seen_combos: Set[Tuple[str, str]] = set()

    filtered_jobs: List[Tuple[float, NormalizedJob]] = []

    for job in raw_jobs:
        # 1. Deduplication by canonical URL
        norm_url = normalize_job_url(job.job_url)
        if norm_url and norm_url in seen_urls:
            continue

        # 2. Deduplication by company + title combo
        c_clean = clean_text_for_match(job.company)
        t_clean = clean_text_for_match(job.title)
        combo = (c_clean, t_clean)
        if combo in seen_combos and c_clean and t_clean:
            continue

        # 3. Deduplication by content fingerprint
        fprint = create_job_fingerprint(job)
        if fprint in seen_fingerprints:
            continue

        # 4. Geographic Relevance Filtering & Scoring
        is_acceptable, geo_multiplier, match_reason = compute_geographic_relevance(
            job.location,
            location_profile,
            allow_remote=allow_remote,
        )

        if not is_acceptable:
            logger.debug(
                f"Filtered out job '{job.title}' at '{job.company}' ({job.location}) due to geo-mismatch: {match_reason}"
            )
            continue

        # Register deduplication tokens
        if norm_url:
            seen_urls.add(norm_url)
        if c_clean and t_clean:
            seen_combos.add(combo)
        seen_fingerprints.add(fprint)

        # Enhance metadata
        if job.raw_metadata is None:
            job.raw_metadata = {}
        job.raw_metadata["geo_multiplier"] = geo_multiplier
        job.raw_metadata["geo_match_reason"] = match_reason
        job.raw_metadata["source_display"] = format_source_display(job.source)

        filtered_jobs.append((geo_multiplier, job))

    # Sort descending by geographic relevance multiplier so best local matches come first
    filtered_jobs.sort(key=lambda x: x[0], reverse=True)

    final_results = [job for _, job in filtered_jobs]
    return final_results[:max_results]


def format_source_display(source: Optional[str]) -> str:
    """Produces clean, user-friendly source labels for UI badges."""
    s = (source or "").lower()
    if "naukri" in s:
        return "Naukri"
    if "linkedin" in s:
        return "LinkedIn"
    if "indeed" in s:
        return "Indeed"
    if "glassdoor" in s:
        return "Glassdoor"
    if "zip_recruiter" in s or "ziprecruiter" in s:
        return "ZipRecruiter"
    if "greenhouse" in s:
        return "Greenhouse ATS"
    if "lever" in s:
        return "Lever ATS"
    if "remotive" in s:
        return "Remotive"
    if "arbeitnow" in s:
        return "Arbeitnow"
    return (source or "Web").capitalize()
