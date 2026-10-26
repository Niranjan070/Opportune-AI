"""
Location Intelligence Service.
Provides robust city/region normalization, geographic scope detection,
and relevance scoring for job search matching.
"""
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple


@dataclass
class LocationProfile:
    raw_query: str
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    is_india: bool = False
    is_remote: bool = False
    is_hybrid: bool = False
    search_scope: str = "global"  # "city", "state", "country", "remote", "global"
    aliases: List[str] = field(default_factory=list)


# Comprehensive Indian City & Region Database
INDIAN_CITIES: Dict[str, Dict[str, str]] = {
    # Tier 1 Tech Hubs
    "bangalore": {"canonical": "Bengaluru", "state": "Karnataka", "aliases": ["bengaluru", "blr"]},
    "bengaluru": {"canonical": "Bengaluru", "state": "Karnataka", "aliases": ["bangalore", "blr"]},
    "hyderabad": {"canonical": "Hyderabad", "state": "Telangana", "aliases": ["hyd", "cyberabad"]},
    "chennai": {"canonical": "Chennai", "state": "Tamil Nadu", "aliases": ["madras", "maa"]},
    "pune": {"canonical": "Pune", "state": "Maharashtra", "aliases": ["poona"]},
    "mumbai": {"canonical": "Mumbai", "state": "Maharashtra", "aliases": ["bombay"]},
    "delhi": {"canonical": "Delhi", "state": "Delhi NCR", "aliases": ["new delhi", "ncr", "dcr"]},
    "noida": {"canonical": "Noida", "state": "Uttar Pradesh", "aliases": ["greater noida"]},
    "gurgaon": {"canonical": "Gurugram", "state": "Haryana", "aliases": ["gurugram", "gurgoan"]},
    "gurugram": {"canonical": "Gurugram", "state": "Haryana", "aliases": ["gurgaon"]},
    "kolkata": {"canonical": "Kolkata", "state": "West Bengal", "aliases": ["calcutta"]},

    # Tamil Nadu Cities (High Relevance for user queries like Coimbatore)
    "coimbatore": {"canonical": "Coimbatore", "state": "Tamil Nadu", "aliases": ["kovai", "cbe"]},
    "madurai": {"canonical": "Madurai", "state": "Tamil Nadu", "aliases": []},
    "trichy": {"canonical": "Tiruchirappalli", "state": "Tamil Nadu", "aliases": ["tiruchirappalli", "tiruchi"]},
    "tiruchirappalli": {"canonical": "Tiruchirappalli", "state": "Tamil Nadu", "aliases": ["trichy"]},
    "salem": {"canonical": "Salem", "state": "Tamil Nadu", "aliases": []},
    "tirunelveli": {"canonical": "Tirunelveli", "state": "Tamil Nadu", "aliases": ["nellai"]},
    "vellore": {"canonical": "Vellore", "state": "Tamil Nadu", "aliases": []},
    "erode": {"canonical": "Erode", "state": "Tamil Nadu", "aliases": []},
    "tirupur": {"canonical": "Tirupur", "state": "Tamil Nadu", "aliases": ["tiruppur"]},

    # Kerala
    "kochi": {"canonical": "Kochi", "state": "Kerala", "aliases": ["cochin", "ernakulam"]},
    "cochin": {"canonical": "Kochi", "state": "Kerala", "aliases": ["kochi", "ernakulam"]},
    "trivandrum": {"canonical": "Thiruvananthapuram", "state": "Kerala", "aliases": ["thiruvananthapuram"]},
    "thiruvananthapuram": {"canonical": "Thiruvananthapuram", "state": "Kerala", "aliases": ["trivandrum"]},
    "calicut": {"canonical": "Kozhikode", "state": "Kerala", "aliases": ["kozhikode"]},
    "kozhikode": {"canonical": "Kozhikode", "state": "Kerala", "aliases": ["calicut"]},

    # Karnataka
    "mysore": {"canonical": "Mysuru", "state": "Karnataka", "aliases": ["mysuru"]},
    "mysuru": {"canonical": "Mysuru", "state": "Karnataka", "aliases": ["mysore"]},
    "mangalore": {"canonical": "Mangaluru", "state": "Karnataka", "aliases": ["mangaluru"]},
    "mangaluru": {"canonical": "Mangaluru", "state": "Karnataka", "aliases": ["mangalore"]},
    "hubli": {"canonical": "Hubballi", "state": "Karnataka", "aliases": ["hubballi", "dharwad"]},

    # Andhra & Telangana
    "visakhapatnam": {"canonical": "Visakhapatnam", "state": "Andhra Pradesh", "aliases": ["vizag"]},
    "vizag": {"canonical": "Visakhapatnam", "state": "Andhra Pradesh", "aliases": ["visakhapatnam"]},
    "vijayawada": {"canonical": "Vijayawada", "state": "Andhra Pradesh", "aliases": []},
    "warangal": {"canonical": "Warangal", "state": "Telangana", "aliases": []},

    # Gujarat & Maharashtra
    "ahmedabad": {"canonical": "Ahmedabad", "state": "Gujarat", "aliases": ["amdavad"]},
    "surat": {"canonical": "Surat", "state": "Gujarat", "aliases": []},
    "vadodara": {"canonical": "Vadodara", "state": "Gujarat", "aliases": ["baroda"]},
    "nagpur": {"canonical": "Nagpur", "state": "Maharashtra", "aliases": []},
    "nashik": {"canonical": "Nashik", "state": "Maharashtra", "aliases": ["nasik"]},
    "aurangabad": {"canonical": "Chhatrapati Sambhajinagar", "state": "Maharashtra", "aliases": ["chhatrapati sambhajinagar"]},

    # North & Central India
    "indore": {"canonical": "Indore", "state": "Madhya Pradesh", "aliases": []},
    "bhopal": {"canonical": "Bhopal", "state": "Madhya Pradesh", "aliases": []},
    "jaipur": {"canonical": "Jaipur", "state": "Rajasthan", "aliases": []},
    "chandigarh": {"canonical": "Chandigarh", "state": "Punjab & Haryana", "aliases": ["mohali", "panchkula"]},
    "mohali": {"canonical": "Mohali", "state": "Punjab", "aliases": ["chandigarh"]},
    "lucknow": {"canonical": "Lucknow", "state": "Uttar Pradesh", "aliases": []},
    "kanpur": {"canonical": "Kanpur", "state": "Uttar Pradesh", "aliases": []},
    "dehradun": {"canonical": "Dehradun", "state": "Uttarakhand", "aliases": []},
    "bhubaneswar": {"canonical": "Bhubaneswar", "state": "Odisha", "aliases": []},
    "patna": {"canonical": "Patna", "state": "Bihar", "aliases": []},
    "ranchi": {"canonical": "Ranchi", "state": "Jharkhand", "aliases": []},
    "guwahati": {"canonical": "Guwahati", "state": "Assam", "aliases": []},
}

INDIAN_STATES = {
    "tamil nadu", "karnataka", "telangana", "maharashtra", "kerala",
    "andhra pradesh", "gujarat", "delhi", "haryana", "uttar pradesh",
    "west bengal", "rajasthan", "madhya pradesh", "punjab", "odisha",
    "bihar", "jharkhand", "assam", "uttarakhand", "goa",
}

NON_INDIA_COUNTRIES = {
    "usa": "United States",
    "united states": "United States",
    "us": "United States",
    "uk": "United Kingdom",
    "united kingdom": "United Kingdom",
    "germany": "Germany",
    "berlin": "Germany",
    "munich": "Germany",
    "canada": "Canada",
    "australia": "Australia",
    "singapore": "Singapore",
    "netherlands": "Netherlands",
    "france": "France",
    "ireland": "Ireland",
    "switzerland": "Switzerland",
}


def resolve_location(query_location: Optional[str]) -> LocationProfile:
    """
    Analyzes a raw location string or search context and returns a structured LocationProfile.
    """
    if not query_location or not query_location.strip():
        return LocationProfile(raw_query="", search_scope="global")

    cleaned = query_location.strip().lower()
    raw = query_location.strip()

    is_remote = bool(re.search(r"\b(remote|anywhere|wfh|work from home|telecommute)\b", cleaned))
    is_hybrid = bool(re.search(r"\b(hybrid|flexible)\b", cleaned))

    # Check for direct India keywords
    has_india_mention = bool(re.search(r"\b(india|ind)\b", cleaned))

    # Match Indian Cities
    matched_city: Optional[str] = None
    matched_state: Optional[str] = None
    aliases: List[str] = []

    for city_key, data in INDIAN_CITIES.items():
        pattern = rf"\b{re.escape(city_key)}\b"
        if re.search(pattern, cleaned):
            matched_city = data["canonical"]
            matched_state = data["state"]
            aliases = [city_key] + data["aliases"]
            break

    # Match Indian States if city not found
    if not matched_city:
        for state in INDIAN_STATES:
            if re.search(rf"\b{re.escape(state)}\b", cleaned):
                matched_state = state.title()
                break

    is_india = bool(matched_city or matched_state or has_india_mention)

    # Determine scope
    if matched_city:
        scope = "city"
    elif matched_state:
        scope = "state"
    elif is_india:
        scope = "country"
    elif is_remote and not (matched_city or matched_state):
        scope = "remote"
    else:
        # Check non-India countries
        matched_country = None
        for country_key, country_name in NON_INDIA_COUNTRIES.items():
            if re.search(rf"\b{re.escape(country_key)}\b", cleaned):
                matched_country = country_name
                break
        if matched_country:
            return LocationProfile(
                raw_query=raw,
                country=matched_country,
                is_india=False,
                is_remote=is_remote,
                is_hybrid=is_hybrid,
                search_scope="country",
            )
        scope = "remote" if is_remote else "global"

    return LocationProfile(
        raw_query=raw,
        city=matched_city,
        state=matched_state,
        country="India" if is_india else None,
        is_india=is_india,
        is_remote=is_remote,
        is_hybrid=is_hybrid,
        search_scope=scope,
        aliases=aliases,
    )


def compute_geographic_relevance(
    job_location: Optional[str],
    target_profile: LocationProfile,
    allow_remote: bool = True,
) -> Tuple[bool, float, str]:
    """
    Evaluates whether a job location matches the user's target location.
    Returns: (is_acceptable, relevance_multiplier, match_reason)
    - multiplier 1.0+: Exact city or strong local match
    - multiplier 0.85: Same state/region
    - multiplier 0.75: Same country (India / country wide)
    - multiplier 0.70: Remote worldwide (when remote is acceptable)
    - multiplier 0.0 - 0.2: Location mismatch (e.g. EU on-site when user wanted India)
    """
    if target_profile.search_scope == "global" and not target_profile.is_india:
        return True, 1.0, "global-search"

    job_loc = (job_location or "").lower()
    is_job_remote = any(k in job_loc for k in ("remote", "anywhere", "wfh", "telecommute", "work from home"))

    # If the user specifically wanted remote or hybrid, remote jobs are great matches
    if target_profile.is_remote and is_job_remote:
        return True, 1.0, "remote-match"

    # Target is in India
    if target_profile.is_india:
        # Check city match
        if target_profile.city:
            target_city_lower = target_profile.city.lower()
            city_variants = [target_city_lower] + [a.lower() for a in target_profile.aliases]
            if any(cv in job_loc for cv in city_variants):
                return True, 1.15, f"city-match ({target_profile.city})"

        # Check state match
        if target_profile.state and target_profile.state.lower() in job_loc:
            return True, 0.90, f"state-match ({target_profile.state})"

        # Check country match (India or Indian tech hubs)
        is_india_job = any(k in job_loc for k in ("india", "bengaluru", "bangalore", "hyderabad", "chennai", "pune", "delhi", "noida", "gurgaon", "mumbai"))
        if is_india_job:
            if target_profile.search_scope == "city":
                # User asked for Coimbatore, but this is Bangalore/Hyderabad/Pan-India
                return True, 0.75, "country-wide-match (India)"
            return True, 0.95, "country-match (India)"

        # If job is remote worldwide
        if is_job_remote and (allow_remote or target_profile.is_remote):
            return True, 0.75, "remote-international"

        # Explicit foreign on-site locations when user asked for India -> Filter out / severe penalty
        foreign_indicators = ("germany", "berlin", "munich", "london", "uk", "united states", "usa", "san francisco", "new york", "paris", "france", "amsterdam", "netherlands", "switzerland", "zurich")
        if any(f in job_loc for f in foreign_indicators) and not is_job_remote:
            return False, 0.05, "foreign-onsite-mismatch"

        # Ambiguous location
        if not job_loc or job_loc in ("unspecified", "remote / unspecified", "multiple"):
            return True, 0.60, "unspecified-location"

        return True, 0.50, "approximate-location"

    # Non-India specific queries
    if target_profile.country:
        if target_profile.country.lower() in job_loc:
            return True, 1.0, f"country-match ({target_profile.country})"
        if is_job_remote and allow_remote:
            return True, 0.70, "remote-match"
        return False, 0.10, "country-mismatch"

    return True, 1.0, "default-match"
