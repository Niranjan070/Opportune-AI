"""
Search Profiles & JD Analysis REST Endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.profile import SearchProfile, JobDescription
from backend.app.schemas.profile import (
    SearchProfileCreate,
    SearchProfileUpdate,
    SearchProfileResponse,
    JobDescriptionCreate,
    JobDescriptionResponse,
    ExtractedCriteria,
)
from backend.app.services.ai_intelligence import AIIntelligenceService

router = APIRouter(prefix="/profiles", tags=["Profiles"])


class AnalyzeJDRequest(BaseModel):
    raw_text: str


@router.get("", response_model=List[SearchProfileResponse])
def list_profiles(db: Session = Depends(get_db)):
    """List all saved search profiles"""
    return db.query(SearchProfile).order_by(SearchProfile.created_at.desc()).all()


@router.post("", response_model=SearchProfileResponse, status_code=status.HTTP_201_CREATED)
def create_profile(payload: SearchProfileCreate, db: Session = Depends(get_db)):
    """Create a new job search profile"""
    profile = SearchProfile(**payload.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/{profile_id}", response_model=SearchProfileResponse)
def get_profile(profile_id: str, db: Session = Depends(get_db)):
    """Get profile by ID"""
    profile = db.query(SearchProfile).filter(SearchProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Profile '{profile_id}' not found",
        )
    return profile


@router.put("/{profile_id}", response_model=SearchProfileResponse)
def update_profile(profile_id: str, payload: SearchProfileUpdate, db: Session = Depends(get_db)):
    """Update profile fields"""
    profile = db.query(SearchProfile).filter(SearchProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Profile '{profile_id}' not found",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(profile, field, val)

    db.commit()
    db.refresh(profile)
    return profile


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(profile_id: str, db: Session = Depends(get_db)):
    """Delete a profile"""
    profile = db.query(SearchProfile).filter(SearchProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Profile '{profile_id}' not found",
        )
    db.delete(profile)
    db.commit()
    return None


@router.post("/analyze-jd", response_model=ExtractedCriteria)
async def analyze_job_description(payload: AnalyzeJDRequest):
    """
    Analyze an unstructured pasted job description and extract structured criteria.
    """
    if not payload.raw_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description text cannot be empty.",
        )
    criteria = await AIIntelligenceService.extract_criteria_from_jd(payload.raw_text)
    return criteria


@router.post("/{profile_id}/jds", response_model=JobDescriptionResponse, status_code=status.HTTP_201_CREATED)
async def attach_jd_to_profile(profile_id: str, payload: JobDescriptionCreate, db: Session = Depends(get_db)):
    """
    Analyze and attach a target job description to a search profile.
    """
    profile = db.query(SearchProfile).filter(SearchProfile.id == profile_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Profile '{profile_id}' not found",
        )

    criteria = await AIIntelligenceService.extract_criteria_from_jd(payload.raw_text)

    jd_model = JobDescription(
        search_profile_id=profile.id,
        title=payload.title or criteria.title,
        raw_text=payload.raw_text,
        extracted_skills=criteria.required_skills + criteria.preferred_skills,
        extracted_seniority=criteria.seniority,
        extracted_locations=criteria.locations,
        extracted_responsibilities=criteria.responsibilities,
    )
    db.add(jd_model)
    db.commit()
    db.refresh(jd_model)
    return jd_model
