"""
Tests for Profiles & JD Analysis API Endpoints
"""
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app


def test_profile_crud_endpoints(db_session):
    client = TestClient(app)

    # 1. Create Profile
    create_payload = {
        "name": "Full Stack AI Specialist",
        "target_titles": ["Full Stack Engineer", "AI Engineer"],
        "skills": ["Python", "FastAPI", "React", "TypeScript", "PostgreSQL"],
        "experience_level": "Mid-level",
        "min_years_experience": 3,
        "preferred_locations": ["Remote", "London", "San Francisco"],
        "workplace_preference": "remote",
        "excluded_employers": ["SpamTech"],
        "excluded_keywords": ["legacy"],
        "enabled_sources": ["arbeitnow", "greenhouse"],
        "target_ats_companies": ["figma", "stripe"],
    }

    res_create = client.post("/api/profiles", json=create_payload)
    assert res_create.status_code == 201
    profile = res_create.json()
    assert profile["name"] == "Full Stack AI Specialist"
    profile_id = profile["id"]

    # 2. List Profiles
    res_list = client.get("/api/profiles")
    assert res_list.status_code == 200
    profiles = res_list.json()
    assert len(profiles) >= 1

    # 3. Get Profile by ID
    res_get = client.get(f"/api/profiles/{profile_id}")
    assert res_get.status_code == 200
    assert res_get.json()["id"] == profile_id

    # 4. Update Profile
    update_payload = {"name": "Staff AI Platform Engineer"}
    res_update = client.put(f"/api/profiles/{profile_id}", json=update_payload)
    assert res_update.status_code == 200
    assert res_update.json()["name"] == "Staff AI Platform Engineer"

    # 5. Delete Profile
    res_delete = client.delete(f"/api/profiles/{profile_id}")
    assert res_delete.status_code == 204

    # 6. Verify 404
    res_404 = client.get(f"/api/profiles/{profile_id}")
    assert res_404.status_code == 404


def test_analyze_jd_endpoint():
    client = TestClient(app)

    sample_jd = """
    About the Role:
    We are looking for a Senior Backend Engineer to join our Core Infrastructure team.
    
    Responsibilities:
    - Architect and scale distributed services.
    - Build performant REST APIs.
    
    Requirements:
    - 5+ years of experience with Python, FastAPI, and Docker.
    - Deep knowledge of PostgreSQL and Redis.
    - Strong communication skills.
    
    Location:
    Remote (Worldwide).
    """

    res = client.post("/api/profiles/analyze-jd", json={"raw_text": sample_jd})
    assert res.status_code == 200
    criteria = res.json()
    assert "Senior Backend Engineer" in criteria["title"] or "Engineer" in criteria["title"]
    all_extracted_skills = [s.lower() for s in (criteria["required_skills"] + criteria["preferred_skills"])]
    assert "python" in all_extracted_skills
    assert "fastapi" in all_extracted_skills
    assert "postgresql" in all_extracted_skills
    assert criteria["workplace_type"] == "remote"
