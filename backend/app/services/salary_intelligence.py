"""
Salary Intelligence Service
Extracts, parses, and normalizes compensation data from job descriptions and raw metadata.
Supports multi-currency (USD, EUR, GBP, INR) and interval normalization (hourly, monthly, annual, LPA).
"""
import re
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple


@dataclass
class SalaryInfo:
    min_amount: Optional[float]
    max_amount: Optional[float]
    currency: str
    period: str  # 'year', 'month', 'hour', 'lpa'
    display: str
    annual_usd_estimate: Optional[float] = None
    annual_inr_estimate: Optional[float] = None


class SalaryIntelligenceService:
    """
    Parses and standardizes compensation structures across disparate job board formats.
    """

    # Approximate conversion rates for annual estimation
    USD_TO_INR = 86.0
    EUR_TO_USD = 1.08
    GBP_TO_USD = 1.28

    # Regex Patterns for Compensation Extraction
    # 1. INR Lakhs per annum (e.g. "12-18 LPA", "₹12 - 20 Lakhs", "8 to 15 Lacs per annum")
    RE_INR_LPA = re.compile(
        r"(?:₹|Rs\.?|INR\s*)?\s*(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(?:LPA|Lakhs?|Lacs?|lac|lakh)(?:\s*(?:per\s+annum|p\.a\.?))?",
        re.IGNORECASE,
    )
    RE_INR_LPA_SINGLE = re.compile(
        r"(?:₹|Rs\.?|INR\s*)?\s*(\d+(?:\.\d+)?)\s*(?:LPA|Lakhs?|Lacs?|lac|lakh)(?:\s*(?:per\s+annum|p\.a\.?))?",
        re.IGNORECASE,
    )

    # 2. INR Standard Numbers (e.g. "₹8,00,000 - ₹15,00,000", "Rs 600000 - 1000000")
    RE_INR_FULL = re.compile(
        r"(?:₹|Rs\.?|INR)\s*(\d{1,2}(?:,\d{2})*,\d{3}|\d{5,8})\s*(?:-|–|to)\s*(?:₹|Rs\.?|INR\s*)?\s*(\d{1,2}(?:,\d{2})*,\d{3}|\d{5,8})(?:\s*(?:per\s+annum|p\.a\.?|yearly|per\s+year))?",
        re.IGNORECASE,
    )

    # 3. Monthly Stipend / Salary (e.g. "₹25,000 - ₹40,000 / month", "30k - 50k per month")
    RE_MONTHLY = re.compile(
        r"(?:(₹|Rs\.?|\$|€|£)\s*)?(\d+(?:\.\d+)?(?:k)?|\d{1,3}(?:,\d{3})*)\s*(?:-|–|to)\s*(?:(₹|Rs\.?|\$|€|£)\s*)?(\d+(?:\.\d+)?(?:k)?|\d{1,3}(?:,\d{3})*)\s*(?:\/|\s*per\s*)(?:month|mo|stipend)",
        re.IGNORECASE,
    )

    # 4. Standard Western Salary Range with k or full numbers (e.g. "$120k - $160k", "$120,000 - $160,000 / year", "€60,000 - €80,000")
    RE_WESTERN_RANGE = re.compile(
        r"(\$|€|£|USD|EUR|GBP)\s*(\d{2,3}k|\d{2,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:-|–|to)\s*(?:\$|€|£|USD|EUR|GBP\s*)?\s*(\d{2,3}k|\d{2,3}(?:,\d{3})*(?:\.\d+)?)(?:\s*(?:\/|\s*per\s*)(?:year|yr|annum|annual|p\.a\.?))?",
        re.IGNORECASE,
    )

    # 5. Hourly Rate (e.g. "$50 - $80 / hr", "$60/hour", "$45 - $65 an hour")
    RE_HOURLY = re.compile(
        r"(\$|€|£)\s*(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(?:\$|€|£)?\s*(\d+(?:\.\d+)?)\s*(?:\/|\s*per\s*|\s*an\s*)(?:hr|hour)",
        re.IGNORECASE,
    )
    RE_HOURLY_SINGLE = re.compile(
        r"(\$|€|£)\s*(\d+(?:\.\d+)?)\s*(?:\/|\s*per\s*|\s*an\s*)(?:hr|hour)",
        re.IGNORECASE,
    )

    @classmethod
    def extract_salary(
        cls,
        description: str = "",
        raw_metadata: Optional[Dict[str, Any]] = None,
        existing_min: Optional[float] = None,
        existing_max: Optional[float] = None,
        existing_currency: Optional[str] = None,
    ) -> Optional[SalaryInfo]:
        """
        Main extraction entry point.
        Evaluates existing fields first, then structured metadata (JobSpy/Remotive), then description regex.
        """
        # Case A: Already structured on job
        if (existing_min and existing_min > 0) or (existing_max and existing_max > 0):
            curr = (existing_currency or "USD").upper()
            return cls._build_info_from_numbers(
                min_val=existing_min or existing_max or 0.0,
                max_val=existing_max or existing_min or 0.0,
                currency=curr,
                period="year",
            )

        # Case B: Check raw_metadata fields from scrapers
        if raw_metadata:
            meta_salary = cls._extract_from_metadata(raw_metadata)
            if meta_salary:
                return meta_salary

        # Case C: Scan text description
        if description:
            text_salary = cls._extract_from_text(description)
            if text_salary:
                return text_salary

        return None

    @classmethod
    def _extract_from_metadata(cls, meta: Dict[str, Any]) -> Optional[SalaryInfo]:
        """Extract from connector-specific raw_metadata dicts"""
        # Remotive format: {"salary": "$130k - $160k"}
        if "salary" in meta and isinstance(meta["salary"], str) and meta["salary"].strip():
            extracted = cls._extract_from_text(meta["salary"])
            if extracted:
                return extracted

        # JobSpy format: min_amount, max_amount, currency, interval
        min_amt = meta.get("min_amount")
        max_amt = meta.get("max_amount")
        curr = (meta.get("currency") or "USD").upper()
        interval = (meta.get("interval") or "yearly").lower()

        if min_amt is not None or max_amt is not None:
            try:
                min_f = float(min_amt) if min_amt is not None else float(max_amt)
                max_f = float(max_amt) if max_amt is not None else float(min_amt)
                if min_f > 0 or max_f > 0:
                    period = "year"
                    if "hour" in interval:
                        period = "hour"
                    elif "month" in interval:
                        period = "month"

                    return cls._build_info_from_numbers(min_f, max_f, curr, period)
            except (ValueError, TypeError):
                pass

        return None

    @classmethod
    def _extract_from_text(cls, text: str) -> Optional[SalaryInfo]:
        """Runs regex patterns against raw job text description"""
        if not text:
            return None

        # 1. INR LPA Range
        match = cls.RE_INR_LPA.search(text)
        if match:
            min_lpa = float(match.group(1))
            max_lpa = float(match.group(2))
            min_amt = min_lpa * 100000
            max_amt = max_lpa * 100000
            display = f"₹{min_lpa:g} – {max_lpa:g} LPA"
            annual_inr = (min_amt + max_amt) / 2
            annual_usd = annual_inr / cls.USD_TO_INR
            return SalaryInfo(
                min_amount=min_amt,
                max_amount=max_amt,
                currency="INR",
                period="lpa",
                display=display,
                annual_usd_estimate=round(annual_usd, 0),
                annual_inr_estimate=round(annual_inr, 0),
            )

        # 2. INR LPA Single
        match = cls.RE_INR_LPA_SINGLE.search(text)
        if match:
            lpa = float(match.group(1))
            amt = lpa * 100000
            display = f"₹{lpa:g} LPA"
            annual_inr = amt
            annual_usd = annual_inr / cls.USD_TO_INR
            return SalaryInfo(
                min_amount=amt,
                max_amount=amt,
                currency="INR",
                period="lpa",
                display=display,
                annual_usd_estimate=round(annual_usd, 0),
                annual_inr_estimate=round(annual_inr, 0),
            )

        # 3. INR Full Number Range
        match = cls.RE_INR_FULL.search(text)
        if match:
            min_raw = match.group(1).replace(",", "")
            max_raw = match.group(2).replace(",", "")
            try:
                min_amt = float(min_raw)
                max_amt = float(max_raw)
                min_lpa = min_amt / 100000
                max_lpa = max_amt / 100000
                display = f"₹{min_lpa:g} – {max_lpa:g} LPA"
                annual_inr = (min_amt + max_amt) / 2
                annual_usd = annual_inr / cls.USD_TO_INR
                return SalaryInfo(
                    min_amount=min_amt,
                    max_amount=max_amt,
                    currency="INR",
                    period="year",
                    display=display,
                    annual_usd_estimate=round(annual_usd, 0),
                    annual_inr_estimate=round(annual_inr, 0),
                )
            except ValueError:
                pass

        # 4. Hourly Western
        match = cls.RE_HOURLY.search(text)
        if match:
            curr_sym = match.group(1)
            curr = cls._symbol_to_currency(curr_sym)
            try:
                min_h = float(match.group(2))
                max_h = float(match.group(3))
                display = f"{curr_sym}{min_h:g} – {curr_sym}{max_h:g}/hr"
                # Assume 2000 work hours/year
                annual_usd = ((min_h + max_h) / 2) * 2000
                if curr == "EUR":
                    annual_usd *= cls.EUR_TO_USD
                elif curr == "GBP":
                    annual_usd *= cls.GBP_TO_USD
                return SalaryInfo(
                    min_amount=min_h,
                    max_amount=max_h,
                    currency=curr,
                    period="hour",
                    display=display,
                    annual_usd_estimate=round(annual_usd, 0),
                    annual_inr_estimate=round(annual_usd * cls.USD_TO_INR, 0),
                )
            except ValueError:
                pass

        # 5. Western Range ($120k - $160k, €60k - €80k, etc.)
        match = cls.RE_WESTERN_RANGE.search(text)
        if match:
            curr_sym = match.group(1)
            curr = cls._symbol_to_currency(curr_sym)
            min_val = cls._parse_number_with_k(match.group(2))
            max_val = cls._parse_number_with_k(match.group(3))

            if min_val and max_val and (min_val > 5000 or max_val > 5000):
                display = f"{curr_sym}{min_val/1000:g}k – {curr_sym}{max_val/1000:g}k/yr"
                annual_usd = (min_val + max_val) / 2
                if curr == "EUR":
                    annual_usd *= cls.EUR_TO_USD
                elif curr == "GBP":
                    annual_usd *= cls.GBP_TO_USD
                return SalaryInfo(
                    min_amount=min_val,
                    max_amount=max_val,
                    currency=curr,
                    period="year",
                    display=display,
                    annual_usd_estimate=round(annual_usd, 0),
                    annual_inr_estimate=round(annual_usd * cls.USD_TO_INR, 0),
                )

        # 6. Monthly Range
        match = cls.RE_MONTHLY.search(text)
        if match:
            c1 = match.group(1) or match.group(3) or "$"
            curr = cls._symbol_to_currency(c1)
            min_val = cls._parse_number_with_k(match.group(2))
            max_val = cls._parse_number_with_k(match.group(4))

            if min_val and max_val:
                display = f"{c1}{min_val:g} – {c1}{max_val:g}/mo"
                annual_val = ((min_val + max_val) / 2) * 12
                if curr == "INR":
                    annual_inr = annual_val
                    annual_usd = annual_inr / cls.USD_TO_INR
                else:
                    annual_usd = annual_val
                    annual_inr = annual_usd * cls.USD_TO_INR

                return SalaryInfo(
                    min_amount=min_val,
                    max_amount=max_val,
                    currency=curr,
                    period="month",
                    display=display,
                    annual_usd_estimate=round(annual_usd, 0),
                    annual_inr_estimate=round(annual_inr, 0),
                )

        return None

    @classmethod
    def _build_info_from_numbers(cls, min_val: float, max_val: float, currency: str, period: str) -> SalaryInfo:
        """Constructs formatted SalaryInfo from raw numeric values"""
        curr = currency.upper()
        sym = cls._currency_to_symbol(curr)

        if curr == "INR":
            # Express in LPA if large enough
            if max_val >= 100000:
                min_lpa = min_val / 100000
                max_lpa = max_val / 100000
                display = f"₹{min_lpa:g} – {max_lpa:g} LPA"
            else:
                display = f"₹{int(min_val):,} – ₹{int(max_val):,}"

            annual_inr = (min_val + max_val) / 2
            if period == "month":
                annual_inr *= 12
            annual_usd = annual_inr / cls.USD_TO_INR

            return SalaryInfo(
                min_amount=min_val,
                max_amount=max_val,
                currency="INR",
                period=period,
                display=display,
                annual_usd_estimate=round(annual_usd, 0),
                annual_inr_estimate=round(annual_inr, 0),
            )

        # Non-INR (e.g. USD, EUR, GBP)
        if period == "hour":
            display = f"{sym}{min_val:g} – {sym}{max_val:g}/hr"
            annual_usd = ((min_val + max_val) / 2) * 2000
        elif period == "month":
            display = f"{sym}{min_val:g} – {sym}{max_val:g}/mo"
            annual_usd = ((min_val + max_val) / 2) * 12
        else:
            # Yearly
            if min_val >= 1000 or max_val >= 1000:
                display = f"{sym}{min_val/1000:g}k – {sym}{max_val/1000:g}k/yr"
            else:
                display = f"{sym}{int(min_val):,} – {sym}{int(max_val):,}/yr"
            annual_usd = (min_val + max_val) / 2

        if curr == "EUR":
            annual_usd *= cls.EUR_TO_USD
        elif curr == "GBP":
            annual_usd *= cls.GBP_TO_USD

        annual_inr = annual_usd * cls.USD_TO_INR

        return SalaryInfo(
            min_amount=min_val,
            max_amount=max_val,
            currency=curr,
            period=period,
            display=display,
            annual_usd_estimate=round(annual_usd, 0),
            annual_inr_estimate=round(annual_inr, 0),
        )

    @staticmethod
    def _parse_number_with_k(val_str: str) -> Optional[float]:
        if not val_str:
            return None
        clean = val_str.strip().lower().replace(",", "")
        if clean.endswith("k"):
            try:
                return float(clean[:-1]) * 1000
            except ValueError:
                return None
        try:
            return float(clean)
        except ValueError:
            return None

    @staticmethod
    def _symbol_to_currency(sym: str) -> str:
        s = sym.strip().upper()
        if s in ("$", "USD"):
            return "USD"
        if s in ("₹", "RS.", "RS", "INR"):
            return "INR"
        if s in ("€", "EUR"):
            return "EUR"
        if s in ("£", "GBP"):
            return "GBP"
        return "USD"

    @staticmethod
    def _currency_to_symbol(curr: str) -> str:
        c = curr.strip().upper()
        if c == "USD":
            return "$"
        if c == "INR":
            return "₹"
        if c == "EUR":
            return "€"
        if c == "GBP":
            return "£"
        return "$"
