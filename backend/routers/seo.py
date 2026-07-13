# backend/routers/seo.py
# Handles dynamic SEO destination page generation + caching
# Called by Vercel Edge Function for Google bot + users
# Generates page content via Haiku, caches in Supabase seo_pages table

import os
import re
import json
import logging
import httpx
from datetime import datetime
from fastapi import APIRouter, HTTPException, Request
from database import get_supabase_client

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Destination name normalisation ────────────────────────────────────────
def slug_to_name(slug: str) -> str:
    """
    Convert URL slug to proper destination name.
    "coorg" → "Coorg"
    "spiti-valley" → "Spiti Valley"
    "char-dham" → "Char Dham"
    "mcleod-ganj" → "McLeod Ganj"
    """
    special_cases = {
        "char-dham": "Char Dham",
        "mcleod-ganj": "McLeod Ganj",
        "jim-corbett": "Jim Corbett",
        "rann-of-kutch": "Rann of Kutch",
        "valley-of-flowers": "Valley of Flowers",
        "rishikesh": "Rishikesh",
        "haridwar": "Haridwar",
    }
    if slug in special_cases:
        return special_cases[slug]
    return " ".join(word.capitalize() for word in slug.split("-"))


def name_to_slug(name: str) -> str:
    """Convert destination name to URL slug."""
    return re.sub(r'[^a-z0-9-]', '', name.lower().replace(" ", "-"))


# ── Haiku page generation ─────────────────────────────────────────────────
async def generate_destination_page(destination_name: str) -> dict:
    """
    Call Haiku to generate complete SEO page data for any Indian destination.
    Returns structured JSON used to render the destination page.
    Fail-open: returns minimal data on any error.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY not set — cannot generate SEO page")
        return None

    prompt = f"""You are an expert Indian travel writer and SEO specialist.
Generate complete travel page content for: {destination_name} (India)

Return ONLY a valid JSON object with this EXACT structure (no markdown, no explanation):
{{
  "destination_name": "{destination_name}",
  "meta_title": "SEO title under 60 chars — include '{destination_name} Trip Planner AI'",
  "meta_description": "SEO description under 155 chars — mention key attractions and AI planning",
  "hero_title": "Compelling H1 heading for {destination_name} trip planning page",
  "hero_subtitle": "One sentence describing the top 3 experiences in {destination_name}",
  "sample_prompts": [
    "natural Hinglish/English trip prompt for {destination_name}",
    "another prompt with budget and duration",
    "another prompt with trip type"
  ],
  "quick_facts": [
    {{"icon": "emoji", "value": "factual value", "label": "short label"}},
    {{"icon": "emoji", "value": "factual value", "label": "short label"}},
    {{"icon": "emoji", "value": "factual value", "label": "short label"}},
    {{"icon": "emoji", "value": "factual value", "label": "short label"}},
    {{"icon": "emoji", "value": "factual value", "label": "short label"}}
  ],
  "sample_plan": {{
    "days": <integer — realistic number of days>,
    "budget": "₹X,XXX total estimated budget for couple",
    "trip_type": "trip type from city",
    "day_plans": [
      {{
        "title": "Day title",
        "description": "2-3 sentences of what to do this day. Specific places, timings.",
        "stay": "Real hotel name or area (₹X,XXX/night)",
        "transport": "How to get around this day",
        "cost": "₹X,XXX estimated daily cost"
      }}
    ]
  }},
  "why_tripzio": [
    {{"title": "Feature title", "desc": "How Tripzio specifically helps for {destination_name}"}},
    {{"title": "Feature title", "desc": "Another specific benefit"}},
    {{"title": "Feature title", "desc": "Another specific benefit"}},
    {{"title": "Feature title", "desc": "Another specific benefit"}}
  ],
  "best_months": [
    {{"month": "MonthName", "icon": "weather emoji", "rating": "excellent|good|avoid", "reason": "one line reason"}}
  ],
  "faqs": [
    {{"q": "Specific question about {destination_name} trip", "a": "Detailed helpful answer 2-3 sentences"}},
    {{"q": "Another common question", "a": "Detailed answer"}},
    {{"q": "Another common question", "a": "Detailed answer"}},
    {{"q": "Another common question", "a": "Detailed answer"}},
    {{"q": "Another common question", "a": "Detailed answer"}}
  ]
}}

Rules:
- destination_name: use "{destination_name}" exactly
- All content must be factually accurate for this specific Indian destination
- best_months: include ALL 12 months with accurate ratings
- sample_plan: include 3-7 day_plans depending on realistic trip length
- faqs: 5 questions specific to {destination_name} travel planning
- meta_title: must be under 60 characters
- meta_description: must be under 155 characters
- Return ONLY the JSON object, nothing else"""

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 4000,
                    "temperature": 0.2,
                    "messages": [{"role": "user", "content": prompt}]
                }
            )

        if r.status_code != 200:
            logger.error(f"Haiku SEO generation failed [{r.status_code}] for {destination_name}")
            return None

        text = r.json()["content"][0]["text"].strip()
        # Extract JSON from response
        s = text.find("{")
        e = text.rfind("}") + 1
        if s < 0 or e <= s:
            logger.error(f"No JSON found in Haiku response for {destination_name}")
            return None

        data = json.loads(text[s:e])

        # Validate required fields
        required = ["destination_name", "meta_title", "meta_description",
                    "hero_title", "sample_plan", "best_months", "faqs"]
        for field in required:
            if field not in data:
                logger.error(f"Missing field '{field}' in Haiku response for {destination_name}")
                return None

        # Ensure best_months has all 12 months
        if len(data.get("best_months", [])) < 8:
            logger.warning(f"Only {len(data.get('best_months', []))} months returned for {destination_name}")

        return data

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error for {destination_name}: {e}")
        return None
    except Exception as e:
        logger.error(f"Haiku SEO generation exception for {destination_name}: {e}")
        return None


# ── Supabase cache helpers ────────────────────────────────────────────────
async def get_cached_page(slug: str) -> dict | None:
    """Check Supabase for cached page data. Returns None if not found."""
    try:
        supabase = get_supabase_client()
        result = supabase.table("seo_pages")\
            .select("page_data, destination_name")\
            .eq("destination_slug", slug)\
            .single()\
            .execute()
        if result.data:
            # Increment view count asynchronously (fire and forget)
            try:
                supabase.rpc("increment_seo_page_views", {"slug": slug}).execute()
            except Exception:
                pass  # Non-critical
            return result.data["page_data"]
        return None
    except Exception as e:
        logger.warning(f"Supabase cache read failed for {slug}: {e}")
        return None  # Fail open — regenerate


async def save_cached_page(slug: str, name: str, data: dict) -> bool:
    """Save generated page data to Supabase. Fail silent."""
    try:
        supabase = get_supabase_client()
        supabase.table("seo_pages").upsert({
            "destination_slug": slug,
            "destination_name": name,
            "page_data": data,
            "created_at": datetime.utcnow().isoformat(),
        }).execute()
        return True
    except Exception as e:
        logger.warning(f"Supabase cache write failed for {slug}: {e}")
        return False  # Fail silent — page still served


# ── Main endpoint ─────────────────────────────────────────────────────────
@router.get("/seo/page/{destination_slug}")
async def get_seo_page(destination_slug: str, request: Request):
    """
    Returns page data for any Indian destination.
    Flow:
      1. Validate slug
      2. Check Supabase cache → return if found (instant)
      3. Generate via Haiku → cache → return
      4. Fail-open: return minimal data if generation fails

    Called by:
      - Vercel Edge Function (for Google bot + direct URL visits)
      - React component (for SPA navigation)

    Cost: ~$0.01 per NEW destination (Haiku), zero for cached.
    """
    # ── 1. Validate and normalise slug ───────────────────────────────────
    slug = destination_slug.lower().strip()
    # Allow only alphanumeric + hyphens, max 60 chars
    if not re.match(r'^[a-z0-9-]{1,60}$', slug):
        raise HTTPException(status_code=400, detail="Invalid destination slug")

    # Remove common suffixes users might include
    for suffix in ['-trip-planner', '-trip', '-travel', '-tourism']:
        if slug.endswith(suffix):
            slug = slug[:-len(suffix)]
            break

    destination_name = slug_to_name(slug)

    # ── 2. Check cache ────────────────────────────────────────────────────
    cached = await get_cached_page(slug)
    if cached:
        logger.info(f"SEO cache HIT: {slug}")
        return {
            "source": "cache",
            "slug": slug,
            "data": cached
        }

    # ── 3. Generate via Haiku ─────────────────────────────────────────────
    logger.info(f"SEO cache MISS: {slug} — generating via Haiku")
    page_data = await generate_destination_page(destination_name)

    if page_data:
        # Cache in Supabase (fire and forget — don't block response)
        await save_cached_page(slug, destination_name, page_data)
        return {
            "source": "generated",
            "slug": slug,
            "data": page_data
        }

    # ── 4. Fail-open: return minimal data ─────────────────────────────────
    logger.error(f"SEO generation failed for {slug} — returning fallback")
    return {
        "source": "fallback",
        "slug": slug,
        "data": {
            "destination_name": destination_name,
            "meta_title": f"{destination_name} Trip Planner AI | Tripzio",
            "meta_description": f"Plan your {destination_name} trip with AI. Real trains, hotels and budget breakdown in 60 seconds. Free to start.",
            "hero_title": f"Plan Your {destination_name} Trip with AI",
            "hero_subtitle": f"Get a complete {destination_name} itinerary with real trains, hotels and budget in 60 seconds.",
            "sample_prompts": [
                f"{destination_name} trip 5 days from Delhi",
                f"{destination_name} tour couple trip, budget ₹25,000",
            ],
            "quick_facts": [],
            "sample_plan": {"days": 5, "budget": "₹20,000", "trip_type": "couple trip", "day_plans": []},
            "why_tripzio": [],
            "best_months": [],
            "faqs": [],
        }
    }


@router.get("/seo/page/{destination_slug}/refresh")
async def refresh_seo_page(destination_slug: str, request: Request):
    """
    Force regenerate a destination page (admin use only).
    Bypasses cache and regenerates via Haiku.
    Protected by admin token in production.
    """
    admin_token = request.headers.get("X-Admin-Token", "")
    expected = os.getenv("ADMIN_TOKEN", "")
    if expected and admin_token != expected:
        raise HTTPException(status_code=403, detail="Forbidden")

    slug = destination_slug.lower().strip()
    destination_name = slug_to_name(slug)

    page_data = await generate_destination_page(destination_name)
    if not page_data:
        raise HTTPException(status_code=500, detail="Generation failed")

    await save_cached_page(slug, destination_name, page_data)
    return {"status": "refreshed", "slug": slug, "destination": destination_name}


@router.get("/seo/pages")
async def list_seo_pages():
    """List all cached SEO pages with view counts. For admin/monitoring."""
    try:
        supabase = get_supabase_client()
        result = supabase.table("seo_pages")\
            .select("destination_slug, destination_name, created_at, view_count")\
            .order("view_count", desc=True)\
            .execute()
        return {
            "total": len(result.data),
            "pages": result.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
