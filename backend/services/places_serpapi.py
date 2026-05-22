# backend/services/places_serpapi.py
# Tripzio — Real hotels, restaurants, tourist places via SerpAPI + TripAdvisor
# Free: 250 searches/month, no credit card needed

import os
import httpx
import asyncio
import logging

logger = logging.getLogger(__name__)

SERPAPI_KEY = os.getenv("SERPAPI_KEY", "")
SERPAPI_BASE = "https://serpapi.com/search.json"


async def serpapi_search(query: str, ssrc: str = "h", max_results: int = 10) -> list:
    """Search TripAdvisor via SerpAPI. ssrc: h=hotels r=restaurants A=attractions"""
    if not SERPAPI_KEY:
        logger.warning("SERPAPI_KEY not set")
        return []
    params = {
        "engine": "tripadvisor",
        "q": query,
        "ssrc": ssrc,
        "api_key": SERPAPI_KEY,
    }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(SERPAPI_BASE, params=params)
            data = r.json()
            if data.get("error"):
                logger.error(f"SerpAPI error: {data['error']}")
                return []
            return data.get("results", [])[:max_results]
    except Exception as e:
        logger.error(f"SerpAPI error: {e}")
        return []


def fmt_hotel(p: dict) -> dict:
    return {
        "name": p.get("title", ""),
        "rating": p.get("rating"),
        "reviews": p.get("reviews", 0),
        "address": p.get("address", ""),
        "photo_url": p.get("thumbnail"),
        "tripadvisor_url": p.get("link", ""),
        "price_range": p.get("price", ""),
        "category": p.get("type", "Hotel"),
        "recommended": False,
        "tier": "recommended",
        "source": "TripAdvisor",
    }


def fmt_restaurant(p: dict) -> dict:
    return {
        "name": p.get("title", ""),
        "rating": p.get("rating"),
        "reviews": p.get("reviews", 0),
        "address": p.get("address", ""),
        "photo_url": p.get("thumbnail"),
        "tripadvisor_url": p.get("link", ""),
        "cuisine": p.get("type", "Restaurant"),
        "price_range": p.get("price", ""),
        "source": "TripAdvisor",
    }


def fmt_attraction(p: dict) -> dict:
    return {
        "name": p.get("title", ""),
        "rating": p.get("rating"),
        "reviews": p.get("reviews", 0),
        "address": p.get("address", ""),
        "photo_url": p.get("thumbnail"),
        "tripadvisor_url": p.get("link", ""),
        "type": p.get("type", "Attraction"),
        "source": "TripAdvisor",
    }


async def get_destination_places(destination: str) -> dict:
    """Fetch hotels, restaurants, attractions — uses 3 API searches"""
    dest_q = f"{destination} India"

    hotels_raw, restaurants_raw, attractions_raw = await asyncio.gather(
        serpapi_search(f"hotels {dest_q}", "h", 10),
        serpapi_search(f"restaurants {dest_q}", "r", 10),
        serpapi_search(f"things to do {dest_q}", "A", 10),
        return_exceptions=True
    )

    def safe(raw, formatter):
        if isinstance(raw, Exception) or not raw:
            return []
        return [formatter(p) for p in raw if p.get("title")]

    hotels      = sorted(safe(hotels_raw, fmt_hotel),
                         key=lambda x: float(x.get("rating") or 0), reverse=True)
    restaurants = sorted(safe(restaurants_raw, fmt_restaurant),
                         key=lambda x: float(x.get("rating") or 0), reverse=True)
    attractions = sorted(safe(attractions_raw, fmt_attraction),
                         key=lambda x: float(x.get("rating") or 0), reverse=True)

    # Assign tiers to hotels
    for i, h in enumerate(hotels):
        if i == 0:
            h["recommended"] = True
            h["tier"] = "recommended"
        elif i == 1:
            h["tier"] = "luxury"
        elif i == len(hotels) - 1:
            h["tier"] = "budget"
        else:
            h["tier"] = "alternative"

    return {
        "destination": destination,
        "hotels": hotels,
        "restaurants": restaurants,
        "attractions": attractions,
        "data_available": len(hotels) > 0 or len(attractions) > 0,
        "source": "TripAdvisor via SerpAPI",
        "total": {
            "hotels": len(hotels),
            "restaurants": len(restaurants),
            "attractions": len(attractions),
        }
    }


def build_prompt_context(places: dict, plan_tier: str = "silver") -> str:
    """
    Build context string to inject into AI prompt.
    AI uses these REAL names instead of hallucinating.
    """
    if not places or not places.get("data_available"):
        return ""

    TIER_ORDER = ["bronze", "silver", "gold", "diamond", "platinum"]
    t_idx = TIER_ORDER.index(plan_tier) if plan_tier in TIER_ORDER else 2

    lines = []

    # Hotels context
    hotels = places.get("hotels", [])
    if hotels:
        lines.append("=== REAL HOTELS from TripAdvisor (use these exact names) ===")
        for i, h in enumerate(hotels[:8], 1):
            r = f"⭐{h['rating']}" if h.get("rating") else ""
            rv = f"({h['reviews']} reviews)" if h.get("reviews") else ""
            pr = f"| {h['price_range']}" if h.get("price_range") else ""
            lines.append(f"{i}. {h['name']} {r} {rv} {pr}")
        lines.append(f"→ For {plan_tier.upper()} tier recommend hotel #{min(t_idx+1, len(hotels))}")
        lines.append("")

    # Restaurants context
    restaurants = places.get("restaurants", [])
    if restaurants:
        lines.append("=== REAL RESTAURANTS from TripAdvisor (use in Food & Dining) ===")
        for i, r in enumerate(restaurants[:6], 1):
            rating = f"⭐{r['rating']}" if r.get("rating") else ""
            cuisine = r.get("cuisine", "")
            lines.append(f"{i}. {r['name']} {rating} — {cuisine}")
        lines.append("")

    # Attractions context
    attractions = places.get("attractions", [])
    if attractions:
        lines.append("=== REAL TOURIST ATTRACTIONS from TripAdvisor (use in places_to_visit) ===")
        for i, a in enumerate(attractions[:10], 1):
            rating = f"⭐{a['rating']}" if a.get("rating") else ""
            atype = a.get("type", "")
            lines.append(f"{i}. {a['name']} {rating} — {atype}")
        lines.append("")

    lines.append("IMPORTANT: Use the exact hotel/restaurant/attraction names above in your JSON response.")
    lines.append("Do NOT invent names — use real TripAdvisor data provided above.")

    return "\n".join(lines)
