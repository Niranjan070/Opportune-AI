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
    is_europe: bool = False
    is_remote: bool = False
    is_hybrid: bool = False
    search_scope: str = "global"  # "city", "state", "country", "europe", "remote", "global"
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

EUROPEAN_REGIONS = {
    "europe", "eu", "emea", "european union"
}

EUROPE_INDICATORS = {
    "europe", "eu", "emea", "germany", "berlin", "munich", "frankfurt", "hamburg",
    "united kingdom", "uk", "london", "manchester", "ireland", "dublin",
    "netherlands", "amsterdam", "rotterdam", "france", "paris",
    "switzerland", "zurich", "geneva", "sweden", "stockholm",
    "spain", "madrid", "barcelona", "poland", "warsaw", "krakow",
    "italy", "milan", "rome", "austria", "vienna", "denmark", "copenhagen",
    "norway", "oslo", "finland", "helsinki", "belgium", "brussels",
    "portugal", "lisbon", "czech", "czech republic", "prague", "estonia", "tallinn",
    "romania", "bucharest", "hungary", "budapest", "greece", "athens"
}

NON_INDIA_COUNTRIES = {
    "usa": "United States",
    "united states": "United States",
    "us": "United States",
    "uk": "United Kingdom",
    "united kingdom": "United Kingdom",
    "london": "United Kingdom",
    "germany": "Germany",
    "berlin": "Germany",
    "munich": "Germany",
    "canada": "Canada",
    "australia": "Australia",
    "singapore": "Singapore",
    "netherlands": "Netherlands",
    "amsterdam": "Netherlands",
    "france": "France",
    "paris": "France",
    "ireland": "Ireland",
    "dublin": "Ireland",
    "switzerland": "Switzerland",
    "zurich": "Switzerland",
    "sweden": "Sweden",
    "spain": "Spain",
    "poland": "Poland",
    "italy": "Italy",
    "new zealand": "New Zealand",
    "newzealand": "New Zealand",
    "nz": "New Zealand",
    "japan": "Japan",
    "tokyo": "Japan",
    "uae": "United Arab Emirates",
    "dubai": "United Arab Emirates",
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
    country_val: Optional[str] = "India" if is_india else None

    # Check for Europe region / countries
    is_europe_region = any(re.search(rf"\b{re.escape(reg)}\b", cleaned) for reg in EUROPEAN_REGIONS)

    # Determine scope
    if matched_city:
        scope = "city"
    elif matched_state:
        scope = "state"
    elif is_india:
        scope = "country"
    elif is_europe_region:
        return LocationProfile(
            raw_query=raw,
            country="Europe",
            is_india=False,
            is_europe=True,
            is_remote=is_remote,
            is_hybrid=is_hybrid,
            search_scope="europe",
            aliases=["eu", "emea", "europe"],
        )
    elif is_remote and not (matched_city or matched_state):
        scope = "remote"
        country_val = None
    else:
        # Check non-India countries
        matched_country = None
        for country_key, country_name in NON_INDIA_COUNTRIES.items():
            if re.search(rf"\b{re.escape(country_key)}\b", cleaned):
                matched_country = country_name
                break
        if matched_country:
            is_matched_euro = any(e in matched_country.lower() or matched_country.lower() in e for e in EUROPE_INDICATORS)
            return LocationProfile(
                raw_query=raw,
                country=matched_country,
                is_india=False,
                is_europe=is_matched_euro,
                is_remote=is_remote,
                is_hybrid=is_hybrid,
                search_scope="country",
            )
        if is_remote:
            scope = "remote"
            country_val = None
        else:
            scope = "location"
            country_val = raw.strip().title()

    return LocationProfile(
        raw_query=raw,
        city=matched_city,
        state=matched_state,
        country=country_val if not is_india else "India",
        is_india=is_india,
        is_europe=False,
        is_remote=is_remote,
        is_hybrid=is_hybrid,
        search_scope=scope,
        aliases=aliases,
    )


def check_location_match(job_location: Optional[str], target: Optional[str]) -> bool:
    """
    Dynamically checks if a job location matches a target location string.
    Works for any city, country, region, or continent without rigid restrictions.
    """
    if not job_location or not target:
        return False
    j_loc = job_location.lower()
    t_loc = target.lower().strip()

    if t_loc in j_loc or j_loc in t_loc:
        return True

    # Token overlap for multi-word locations (e.g. "San Francisco", "Tamil Nadu", "United Kingdom")
    t_tokens = [tok for tok in re.findall(r"\w+", t_loc) if len(tok) > 2]
    j_tokens = [tok for tok in re.findall(r"\w+", j_loc) if len(tok) > 2]
    if t_tokens and any(tt in j_tokens for tt in t_tokens):
        return True

    # Regional indicators
    if t_loc in ("europe", "eu", "emea"):
        return any(e in j_loc for e in EUROPE_INDICATORS)
    if t_loc in ("india", "ind"):
        return any(i in j_loc for i in ("india", "bengaluru", "bangalore", "hyderabad", "chennai", "pune", "delhi", "noida", "gurgaon", "mumbai", "coimbatore"))
    if t_loc in ("usa", "united states", "us"):
        return any(u in j_loc for u in ("usa", "united states", "us", "california", "new york", "texas", "washington"))

    return False


def compute_geographic_relevance(
    job_location: Optional[str],
    target_profile: LocationProfile,
    allow_remote: bool = True,
) -> Tuple[bool, float, str]:
    """
    Evaluates whether a job location matches the user's target location dynamically.
    Returns: (is_acceptable, relevance_multiplier, match_reason)
    """
    job_loc = (job_location or "").lower()
    is_job_remote = any(k in job_loc for k in ("remote", "anywhere", "wfh", "telecommute", "work from home"))

    # If the user specifically wanted remote or hybrid, remote jobs are great matches
    if target_profile.is_remote and is_job_remote:
        return True, 1.0, "remote-match"

    target_name = (
        target_profile.city
        or target_profile.state
        or target_profile.country
        or (target_profile.raw_query if not target_profile.is_remote else None)
    )

    if not target_name or (target_profile.search_scope == "global" and not target_profile.is_india and not target_profile.is_europe):
        return True, 1.0, "global-search"

    target_clean = target_name.lower().strip()

    # 1. Direct or regional match
    if check_location_match(job_loc, target_clean):
        if is_job_remote:
            if target_profile.is_europe:
                return True, 1.15, "remote-europe"
            return True, 1.15, f"remote-match ({target_name})"
        if target_profile.city and target_profile.city.lower() in job_loc:
            return True, 1.15, f"city-match ({target_profile.city})"
        if target_profile.state and target_profile.state.lower() in job_loc:
            return True, 0.90, f"state-match ({target_profile.state})"
        if target_profile.is_europe:
            return True, 1.10, "europe-match"
        return True, 1.10, f"location-match ({target_name})"

    # 2. Country-wide fallback for India cities
    if target_profile.is_india:
        is_india_job = any(k in job_loc for k in ("india", "bengaluru", "bangalore", "hyderabad", "chennai", "pune", "delhi", "noida", "gurgaon", "mumbai"))
        if is_india_job:
            if target_profile.search_scope == "city":
                return True, 0.75, "country-wide-match (India)"
            return True, 0.95, "country-match (India)"

    # 3. Remote worldwide / international allowed
    if is_job_remote and (allow_remote or target_profile.is_remote):
        return True, 0.70, "remote-worldwide" if target_profile.is_europe else "remote-international"

    # 4. Explicit on-site location mismatch
    is_foreign_onsite = False
    if target_profile.is_india:
        is_foreign_onsite = any(f in job_loc for f in ("germany", "berlin", "munich", "london", "uk", "united states", "usa", "san francisco", "paris", "amsterdam"))
    elif target_profile.is_europe:
        is_foreign_onsite = any(f in job_loc for f in ("india", "bengaluru", "chennai", "mumbai", "delhi", "usa", "united states", "canada", "australia"))
    elif target_profile.country and target_profile.country.lower() not in job_loc:
        is_foreign_onsite = True

    if is_foreign_onsite and not is_job_remote:
        return False, 0.05, "foreign-onsite-mismatch"

    # 5. Ambiguous location
    if not job_loc or job_loc in ("unspecified", "remote / unspecified", "multiple"):
        return True, 0.60, "unspecified-location"

    return True, 0.50, "approximate-location"
