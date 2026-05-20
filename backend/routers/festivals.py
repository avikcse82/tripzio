"""
backend/routers/festivals.py
Tripzio Module 4B — Festival Calendar API

Synced to project patterns:
- Supabase via: from database import get_supabase_client
- No auth required — public endpoint
- Strict destination matching (both directions)
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from database import get_supabase_client
from datetime import date, timedelta
import logging
import os
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/festivals", tags=["Festivals"])


def extract_destination_words(destination: str) -> list[str]:
    """
    Extract individual city/region words from destination string.
    Handles: "Darjeeling", "Circuit: Darjeeling -> Gangtok", "Goa + Mumbai"
    Returns list of clean lowercase words with length > 3
    """
    clean = (destination or "")
    # Remove common prefixes
    for prefix in ["circuit:", "circuit :", "route:"]:
        clean = clean.lower().replace(prefix, "")
    # Split on common separators
    import re
    words = re.split(r"[→\->,+|&\s]+", clean)
    # Filter: length > 3, not common words
    stopwords = {"from", "trip", "tour", "days", "night", "the", "and", "via", "with"}
    return [w.strip() for w in words if len(w.strip()) >= 3 and w.strip() not in stopwords]


def destination_matches_keywords(dest_words: list[str], keywords: list[str]) -> bool:
    """
    Strict bidirectional matching.
    Special case: if festival has 'india' keyword it matches ALL destinations.
    Prevents Pushkar showing for Darjeeling but allows Republic Day everywhere.
    """
    # National holidays — match everywhere in India
    if 'india' in keywords:
        return True
    for dest_word in dest_words:
        for keyword in keywords:
            if dest_word in keyword or keyword in dest_word:
                return True
    return False


@router.get("/")
def get_festivals(
    destination: str = Query(..., description="Destination string e.g. 'Goa' or 'Darjeeling -> Gangtok'"),
    start_date: Optional[str] = Query(None, description="Travel start date YYYY-MM-DD"),
    days: Optional[int] = Query(7, description="Trip duration in days"),
    upcoming_days: Optional[int] = Query(180, description="Days ahead for upcoming festivals (when no start_date)"),
):
    """
    Get festivals for a destination and date range.
    
    Smart matching strategy:
    1. DURING trip  — festival overlaps travel dates → show with urgency
    2. SAME MONTH   — festival in same month(s) as trip → show with "consider extending" tip
    3. NO date      — show upcoming festivals in next upcoming_days
    """
    try:
        supabase = get_supabase_client()
        if not supabase:
            raise HTTPException(status_code=500, detail="Database unavailable")

        dest_words = extract_destination_words(destination)
        if not dest_words:
            return []

        today = date.today()
        current_year = today.year

        # Fixed-date national holidays — same MM-DD every year
        FIXED_HOLIDAYS = {
            "01-26": ("Republic Day",       "very_high", "🇮🇳", "India's Republic Day — national holiday everywhere"),
            "08-15": ("Independence Day",   "very_high", "🇮🇳", "India's Independence Day — national holiday everywhere"),
            "10-02": ("Gandhi Jayanti",     "low",       "🕊️",  "Gandhi Jayanti — national holiday"),
            "12-25": ("Christmas Day",      "medium",    "🎄",  "Christmas — celebrated across India"),
            "01-01": ("New Year's Day",     "medium",    "🎆",  "New Year's Day — national holiday"),
        }

        # Fetch variable festivals from DB for current year
        today = date.today()
        current_year = today.year

        res = supabase.table("festivals") \
            .select("*") \
            .eq("year", current_year) \
            .eq("is_active", True) \
            .order("date") \
            .execute()

        festivals_db = res.data or []

        # Determine trip year
        trip_year = current_year
        if start_date:
            try:
                trip_year = date.fromisoformat(start_date).year
            except ValueError:
                pass

        # Adjust DB festival dates to trip year if different
        festivals = []
        for f in festivals_db:
            f_copy = dict(f)
            if trip_year != current_year:
                f_copy["date"] = f["date"].replace(str(current_year), str(trip_year))
                if f_copy.get("end_date"):
                    f_copy["end_date"] = f["end_date"].replace(str(current_year), str(trip_year))
                f_copy["year"] = trip_year
            festivals.append(f_copy)

        # Add fixed holidays for trip year — always present, year-independent
        for mmdd, (name, impact, emoji, desc) in FIXED_HOLIDAYS.items():
            f_date = f"{trip_year}-{mmdd}"
            # Avoid duplicates if already in DB
            if not any(f.get("date","").endswith(mmdd) for f in festivals):
                festivals.append({
                    "id": f"fixed-{mmdd}",
                    "name": name,
                    "date": f_date,
                    "end_date": f_date,
                    "year": trip_year,
                    "locations": ["India"],
                    "keywords": ["india"],
                    "type": "national",
                    "emoji": emoji,
                    "description": desc,
                    "price_impact": impact,
                    "price_warning": "National holiday — expect crowds at tourist destinations",
                    "tip": "Plan around this holiday — many businesses closed",
                    "urgency": None,
                    "is_active": True,
                    "match_type": None,
                    "match_note": None,
                })

        # Filter by destination
        matched = [
            f for f in festivals
            if destination_matches_keywords(dest_words, f.get("keywords") or [])
        ]

        if start_date:
            try:
                travel_start = date.fromisoformat(start_date)
                travel_end   = travel_start + timedelta(days=days or 7)

                # Smart proximity windows based on festival importance
                # More important festivals get wider awareness window
                proximity_days = {
                    "very_high": 30,   # Diwali, Holi, Navratri — show if within 30 days
                    "high":      21,   # Onam, Ganesh Chaturthi — 21 days
                    "medium":    14,   # Regional festivals — 14 days
                    "low":        7,   # Minor festivals — 7 days
                }

                result = []
                for f in matched:
                    f_start = date.fromisoformat(f["date"])
                    f_end   = date.fromisoformat(f["end_date"]) if f.get("end_date") else f_start
                    f_end_check = f_end + timedelta(days=1)
                    impact  = f.get("price_impact", "low")
                    window  = proximity_days.get(impact, 14)

                    # TIER 1: Festival overlaps trip exactly — always show
                    if f_start <= travel_end and f_end_check >= travel_start:
                        f["match_type"] = "during"
                        f["match_note"] = None
                        result.append(f)

                    # TIER 2: Festival just before trip starts
                    elif f_end_check >= (travel_start - timedelta(days=window)) and f_start < travel_start:
                        days_before = (travel_start - f_end).days
                        f["match_type"] = "nearby_before"
                        f["match_note"] = f"Starts {days_before} day{'s' if days_before != 1 else ''} before your trip — consider arriving early!"
                        result.append(f)

                    # TIER 3: Festival just after trip ends
                    elif f_start <= (travel_end + timedelta(days=window)) and f_start > travel_end:
                        days_after = (f_start - travel_end).days
                        f["match_type"] = "nearby_after"
                        f["match_note"] = f"Falls {days_after} day{'s' if days_after != 1 else ''} after your trip — consider extending!"
                        result.append(f)

                matched = result

            except ValueError:
                pass
        else:
            # No date — upcoming within upcoming_days
            cutoff = today + timedelta(days=upcoming_days)
            matched = [
                f for f in matched
                if today <= date.fromisoformat(f["date"]) <= cutoff
            ][:3]
            for f in matched:
                f["match_type"] = "upcoming"
                f["match_note"] = None

        # Sort: during > nearby_before > nearby_after > upcoming, then by price impact
        impact_order = {"very_high": 0, "high": 1, "medium": 2, "low": 3}
        type_order   = {"during": 0, "nearby_before": 1, "nearby_after": 2, "upcoming": 3}

        matched.sort(key=lambda f: (
            type_order.get(f.get("match_type", "upcoming"), 3),
            impact_order.get(f.get("price_impact", "low"), 3)
        ))

        return matched

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get festivals error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/all")
def get_all_festivals(year: Optional[int] = Query(None)):
    """Get all festivals for a given year (defaults to current year). Admin use."""
    try:
        supabase = get_supabase_client()
        if not supabase:
            raise HTTPException(status_code=500, detail="Database unavailable")

        current_year = year or date.today().year
        res = supabase.table("festivals") \
            .select("*") \
            .eq("year", current_year) \
            .eq("is_active", True) \
            .order("date") \
            .execute()

        return res.data or []

    except Exception as e:
        logger.error(f"Get all festivals error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
