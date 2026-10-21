"""
Normalization Service
Provides robust cleaning, HTML stripping, URL sanitization, and canonical hash generation.
"""
import hashlib
import re
from typing import Optional
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
from bs4 import BeautifulSoup
from backend.app.schemas.job import NormalizedJob


class NormalizationService:
    TRACKING_PARAMS = {
        "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
        "ref", "source", "lever-source", "gh_src", "fbclid", "gclid", "mc_cid", "mc_eid"
    }

    COMPANY_SUFFIX_REGEX = re.compile(
        r"\b(inc|incorporated|llc|ltd|limited|gmbh|corp|corporation|co|technologies|tech|solutions|pvt|sa|bv)\b\.?",
        re.IGNORECASE
    )

    TITLE_CLEAN_REGEX = re.compile(
        r"(\(m/w/d\)|\[remote\]|\(remote\)|-\s*remote|\bhybrid\b|\bfull[\s-]time\b|\bpart[\s-]time\b)",
        re.IGNORECASE
    )

    @classmethod
    def strip_html(cls, html_content: Optional[str]) -> str:
        """Strip HTML tags and convert entities to plain clean text"""
        if not html_content:
            return ""
        try:
            soup = BeautifulSoup(html_content, "html.parser")
            for script_or_style in soup(["script", "style", "noscript"]):
                script_or_style.decompose()
            text = soup.get_text(separator="\n")
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            return "\n".join(lines)
        except Exception:
            # Fallback regex strip if parser fails
            clean = re.sub(r"<[^>]+>", " ", html_content)
            return re.sub(r"\s+", " ", clean).strip()

    @classmethod
    def sanitize_url(cls, url: str) -> str:
        """
        Strip analytics and tracking parameters from job URLs while preserving structure.
        """
        if not url:
            return ""
        try:
            parsed = urlparse(url.strip())
            query_pairs = parse_qsl(parsed.query, keep_blank_values=False)
            filtered_pairs = [
                (k, v) for k, v in query_pairs if k.lower() not in cls.TRACKING_PARAMS
            ]
            clean_query = urlencode(filtered_pairs)
            clean_url = urlunparse((
                parsed.scheme.lower(),
                parsed.netloc.lower(),
                parsed.path,
                parsed.params,
                clean_query,
                ""  # Strip fragment
            ))
            return clean_url
        except Exception:
            return url.strip()

    @classmethod
    def normalize_company(cls, company: str) -> str:
        """
        Normalize company name for matching: lowercase, strip common corporate suffixes and punctuation.
        """
        if not company:
            return ""
        name = company.strip().lower()
        name = cls.COMPANY_SUFFIX_REGEX.sub("", name)
        name = re.sub(r"[^\w\s]", "", name)
        return re.sub(r"\s+", " ", name).strip()

    @classmethod
    def normalize_title(cls, title: str) -> str:
        """
        Normalize job title for matching: remove parentheticals like (m/w/d) and remote tags.
        """
        if not title:
            return ""
        t = cls.TITLE_CLEAN_REGEX.sub("", title)
        t = re.sub(r"[^\w\s]", " ", t)
        return re.sub(r"\s+", " ", t).strip().lower()

    @classmethod
    def generate_canonical_hash(cls, job: NormalizedJob) -> str:
        """
        Generate a deterministic SHA-256 canonical hash for cross-source deduplication.
        Uses normalized company, normalized title, and sanitized primary identifier.
        """
        norm_company = cls.normalize_company(job.company)
        norm_title = cls.normalize_title(job.title)

        # If a requisition ID exists, it's the strongest identifier
        if job.requisition_id:
            raw_id = f"{norm_company}:{job.requisition_id.strip().lower()}"
        else:
            clean_url = cls.sanitize_url(job.job_url)
            # Use host + path of clean URL
            parsed = urlparse(clean_url)
            url_identifier = f"{parsed.netloc}{parsed.path}"
            raw_id = f"{norm_company}:{norm_title}:{url_identifier}"

        return hashlib.sha256(raw_id.encode("utf-8")).hexdigest()
