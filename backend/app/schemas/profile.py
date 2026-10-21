"""
Pydantic Schemas for Search Profiles and Job Descriptions
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class ExtractedCriteria(BaseModel):
    title: str
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    seniority: Optional[str] = None
    locations: List[str] = Field(default_factory=list)
    workplace_type: Optional[str] = None
    responsibilities: List[str] = Field(default_factory=list)
    exclusions: List[str] = Field(default_factory=list)


class SearchProfileBase(BaseModel):
    name: str
    target_titles: List[str] = Field(default_factory=list)
    skills: List[str] = Field(default_factory=list)
    experience_level: Optional[str] = "Any"  # Entry-level, Mid-level, Senior, Internship
    min_years_experience: Optional[int] = 0
    preferred_locations: List[str] = Field(default_factory=list)
    workplace_preference: Optional[str] = "any"  # remote, hybrid, on_site, any
    excluded_employers: List[str] = Field(default_factory=list)
    excluded_keywords: List[str] = Field(default_factory=list)
    enabled_sources: List[str] = Field(default_factory=lambda: ["arbeitnow", "greenhouse", "lever", "remotive"])
    target_ats_companies: List[str] = Field(default_factory=lambda: ["gitlab", "figma", "stripe", "airbnb", "palantir"])
    is_active: bool = True


class SearchProfileCreate(SearchProfileBase):
    pass


class SearchProfileUpdate(BaseModel):
    name: Optional[str] = None
    target_titles: Optional[List[str]] = None
    skills: Optional[List[str]] = None
    experience_level: Optional[str] = None
    min_years_experience: Optional[int] = None
    preferred_locations: Optional[List[str]] = None
    workplace_preference: Optional[str] = None
    excluded_employers: Optional[List[str]] = None
    excluded_keywords: Optional[List[str]] = None
    enabled_sources: Optional[List[str]] = None
    target_ats_companies: Optional[List[str]] = None
    is_active: Optional[bool] = None


class SearchProfileResponse(SearchProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime


class JobDescriptionCreate(BaseModel):
    search_profile_id: Optional[str] = None
    title: Optional[str] = None
    raw_text: str


class JobDescriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    search_profile_id: Optional[str]
    title: Optional[str]
    raw_text: str
    extracted_skills: List[str] = Field(default_factory=list)
    extracted_seniority: Optional[str] = None
    extracted_locations: List[str] = Field(default_factory=list)
    extracted_responsibilities: List[str] = Field(default_factory=list)
    created_at: datetime
