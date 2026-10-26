"""
Tests for Salary Intelligence Extraction and Normalization
"""
import pytest
from backend.app.services.salary_intelligence import SalaryIntelligenceService


def test_extract_inr_lpa_range():
    text = "We are hiring an AI Engineer Intern. Package: ₹12 - 18 LPA depending on performance."
    info = SalaryIntelligenceService.extract_salary(description=text)
    assert info is not None
    assert info.currency == "INR"
    assert info.min_amount == 1200000.0
    assert info.max_amount == 1800000.0
    assert "₹12 – 18 LPA" in info.display
    assert info.annual_inr_estimate == 1500000.0


def test_extract_inr_lpa_single():
    text = "Fresher stipend/salary starts at 8 LPA."
    info = SalaryIntelligenceService.extract_salary(description=text)
    assert info is not None
    assert info.currency == "INR"
    assert info.min_amount == 800000.0
    assert "₹8 LPA" in info.display


def test_extract_inr_full_numbers():
    text = "Salary offered: ₹6,00,000 to ₹12,00,000 per annum for the role."
    info = SalaryIntelligenceService.extract_salary(description=text)
    assert info is not None
    assert info.currency == "INR"
    assert info.min_amount == 600000.0
    assert info.max_amount == 1200000.0
    assert "₹6 – 12 LPA" in info.display


def test_extract_western_k_range():
    text = "Senior Python Engineer. Base salary $130k - $160k with equity."
    info = SalaryIntelligenceService.extract_salary(description=text)
    assert info is not None
    assert info.currency == "USD"
    assert info.min_amount == 130000.0
    assert info.max_amount == 160000.0
    assert "$130k – $160k/yr" in info.display


def test_extract_hourly_rate():
    text = "Contract rate is $60 - $85/hr for 40 hours a week."
    info = SalaryIntelligenceService.extract_salary(description=text)
    assert info is not None
    assert info.currency == "USD"
    assert info.period == "hour"
    assert info.min_amount == 60.0
    assert info.max_amount == 85.0
    assert "$60 – $85/hr" in info.display
    assert info.annual_usd_estimate == 145000.0


def test_extract_from_metadata():
    meta = {"salary": "$140k - $175k"}
    info = SalaryIntelligenceService.extract_salary(raw_metadata=meta)
    assert info is not None
    assert info.currency == "USD"
    assert "$140k – $175k/yr" in info.display


def test_extract_from_jobspy_numeric():
    meta = {
        "min_amount": 100000,
        "max_amount": 130000,
        "currency": "USD",
        "interval": "yearly"
    }
    info = SalaryIntelligenceService.extract_salary(raw_metadata=meta)
    assert info is not None
    assert info.currency == "USD"
    assert "$100k – $130k/yr" in info.display
