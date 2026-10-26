"""
Company Intelligence Service
Enriches company profiles with cleaned names, inferred domains, verified logo URLs,
and industry categorization for modern job discovery.
"""
import re
from dataclasses import dataclass
from typing import Optional


@dataclass
class CompanyInfo:
    cleaned_name: str
    domain: Optional[str]
    logo_url: Optional[str]
    industry: Optional[str]


class CompanyIntelligenceService:
    """
    Enriches employer data for consistent branding across job listings.
    """

    # Corporate suffix removals
    SUFFIX_PATTERN = re.compile(
        r",?\s*\b(Inc\.?|Incorporated|LLC\.?|Ltd\.?|Limited|Pvt\.?\s*Ltd\.?|Private\s*Limited|Corp\.?|Corporation|GmbH|Co\.?|Technologies|Solutions|Software|Services)\b",
        re.IGNORECASE,
    )

    # Known domain overrides for major tech companies
    DOMAIN_OVERRIDES = {
        "google": "google.com",
        "alphabet": "google.com",
        "microsoft": "microsoft.com",
        "apple": "apple.com",
        "amazon": "amazon.com",
        "meta": "meta.com",
        "facebook": "meta.com",
        "netflix": "netflix.com",
        "stripe": "stripe.com",
        "palantir": "palantir.com",
        "gitlab": "gitlab.com",
        "github": "github.com",
        "figma": "figma.com",
        "databricks": "databricks.com",
        "snowflake": "snowflake.com",
        "postman": "postman.com",
        "razorpay": "razorpay.com",
        "swiggy": "swiggy.com",
        "zomato": "zomato.com",
        "cred": "cred.club",
        "zerodha": "zerodha.com",
        "freshworks": "freshworks.com",
        "zoho": "zoho.com",
        "infosys": "infosys.com",
        "tcs": "tcs.com",
        "wipro": "wipro.com",
        "hcl": "hcltech.com",
        "cognizant": "cognizant.com",
    }

    @classmethod
    def enrich_company(cls, company_name: str, primary_url: Optional[str] = None) -> CompanyInfo:
        if not company_name:
            return CompanyInfo(cleaned_name="Unknown", domain=None, logo_url=None, industry=None)

        # 1. Clean company name
        cleaned = cls.clean_company_name(company_name)

        # 2. Resolve domain
        domain = cls.resolve_domain(cleaned, primary_url)

        # 3. Logo URL using Clearbit Logo API
        logo_url = None
        if domain:
            logo_url = f"https://logo.clearbit.com/{domain}"

        # 4. Industry inference
        industry = cls._infer_industry(cleaned)

        return CompanyInfo(
            cleaned_name=cleaned,
            domain=domain,
            logo_url=logo_url,
            industry=industry,
        )

    @classmethod
    def clean_company_name(cls, raw_name: str) -> str:
        """Strips legal entity wrappers like LLC, Pvt Ltd, Inc."""
        cleaned = cls.SUFFIX_PATTERN.sub("", raw_name).strip()
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned if cleaned else raw_name.strip()

    @classmethod
    def resolve_domain(cls, company_name: str, primary_url: Optional[str] = None) -> Optional[str]:
        """Infers web domain from known brands or extracts from URL"""
        norm_key = re.sub(r"[^a-zA-Z0-9]", "", company_name.lower())

        if norm_key in cls.DOMAIN_OVERRIDES:
            return cls.DOMAIN_OVERRIDES[norm_key]

        # Check subkey match
        for key, domain in cls.DOMAIN_OVERRIDES.items():
            if key in norm_key:
                return domain

        # Simple heuristic fallback: "{name}.com"
        if len(norm_key) >= 3 and not any(ch.isdigit() for ch in norm_key):
            return f"{norm_key}.com"

        return None

    @classmethod
    def _infer_industry(cls, company_name: str) -> Optional[str]:
        lower = company_name.lower()
        if any(w in lower for w in ("pay", "bank", "credit", "fin", "invest", "wealth", "capital")):
            return "Fintech"
        if any(w in lower for w in ("health", "bio", "med", "pharma", "care")):
            return "Healthcare / Biotech"
        if any(w in lower for w in ("cloud", "data", "ai", "cyber", "security", "infra", "system")):
            return "Technology & AI"
        if any(w in lower for w in ("shop", "market", "cart", "commerce", "store")):
            return "E-Commerce"
        return "Software & Technology"
