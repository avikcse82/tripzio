# backend/routers/seo.py
# Handles dynamic SEO destination page generation + caching
# Called by Vercel Edge Function for Google bot + users
# Generates page content via Haiku, caches in Supabase seo_pages table

import os
import re
import json
import html as html_lib
import logging
import httpx
from datetime import datetime, date
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


# ── Route pages: "delhi-to-manali-trip-planner" ───────────────────────────
# A destination-only page ("manali-trip-planner") answers "what do I do in
# Manali". A route page answers the much more common, higher-intent search
# "how do I get from Delhi to Manali" — and can answer it with REAL train
# data via services.railway_service, which a generic travel blog can't.
#
# Deliberately a curated allowlist, not "any two cities someone types":
# get_trains_between_stations() shares a hard 450-CALLS-PER-MONTH quota with
# every real user's live generation (see services/railway_service.py). An
# unbounded from/to combination space is trivially enumerable by a bot —
# a handful of scripted requests to made-up route slugs could burn through
# a quota real, paying-adjacent users depend on for accurate train info.
# Curating the list bounds this to a one-time, known, small cost.
CURATED_ROUTES = {
    "delhi-to-manali", "delhi-to-shimla", "delhi-to-rishikesh",
    "delhi-to-jaipur", "delhi-to-agra", "delhi-to-amritsar",
    "mumbai-to-goa", "mumbai-to-lonavala", "pune-to-goa",
    "kolkata-to-darjeeling", "kolkata-to-digha", "kolkata-to-puri",
    "bangalore-to-ooty", "bangalore-to-coorg", "chennai-to-pondicherry",
}


def related_routes_for(slug: str, limit: int = 3) -> list[str]:
    """Other curated routes sharing this one's departure city — fully
    deterministic (CURATED_ROUTES is already the complete, real universe of
    route pages, so there is nothing to guess at or hallucinate here)."""
    route = parse_route_slug(slug)
    if not route:
        return []
    from_slug, _ = route
    return sorted(r for r in CURATED_ROUTES if r != slug and r.startswith(f"{from_slug}-to-"))[:limit]


# ── Related destinations for cross-linking ─────────────────────────────────
# The itinerary generator already computes "similar destinations at the same
# budget" per real trip (a DIFFERENT prompt/schema in itinerary.py) — but
# that reasoning happens per-generation, at AI cost, and isn't reusable here
# as-is. Rather than adding a second AI call and risking it link to a
# destination that doesn't have its own page, this groups the destinations
# that are ACTUALLY live today (or obviously will be) into hand-picked
# clusters. Deterministic on purpose, same reasoning as CURATED_ROUTES: this
# controls what internal link graph gets built, rather than trusting a model
# to invent one. A destination with no cluster below simply gets no related-
# destinations section — silence over a guess, matching
# _looks_like_a_real_destination's philosophy right above it.
_DESTINATION_CLUSTERS = [
    {"manali", "shimla", "kasol", "mcleod-ganj", "dharamshala", "spiti-valley"},
    {"char-dham", "kedarnath", "rishikesh", "haridwar", "mussoorie", "nainital"},
    {"darjeeling", "gangtok", "kaziranga", "shillong", "northeast"},
    {"kashmir", "ladakh", "leh-ladakh"},
    {"rajasthan", "jaisalmer", "udaipur", "jaipur", "jodhpur", "pushkar"},
    {"goa", "gokarna"},
    {"kerala", "munnar", "alleppey", "wayanad", "kovalam", "varkala"},
    {"hampi", "coorg", "mysore", "ooty", "chikmagalur"},
    {"varanasi", "bodh-gaya", "prayagraj"},
    {"andaman", "lakshadweep"},
]


def related_destinations_for(slug: str, limit: int = 4) -> list[str]:
    """Other destinations in the same hand-picked cluster as this one."""
    for cluster in _DESTINATION_CLUSTERS:
        if slug in cluster:
            return sorted(cluster - {slug})[:limit]
    return []


# ── Festival pages: "goa-diwali-trip-planner" ─────────────────────────────
# Timed to a real, specific event ("plan your Diwali trip to Varanasi") is a
# sharper, more urgent search than either a bare destination or a route —
# and, per the lesson from seeding the route pages, only pays off if the
# page exists and is indexed BEFORE the festival, not after the search
# spike has already passed.
#
# Keyed against the real festivals table (backend/routers/festivals.py) that
# already computes accurate, year-correct dates for real Indian festivals —
# never left to Haiku's own idea of "when is Diwali", the same reasoning
# that kept train numbers out of the model's hands for route pages. A
# curated (destination, festival) allowlist rather than every combination:
# most destinations don't actually have a notable tie to most festivals, and
# an ungrounded pairing ("andaman-holi") would be exactly the kind of
# plausible-sounding-but-empty page the destination-validation guard above
# was built to stop.
CURATED_FESTIVAL_PAGES = {
    "goa-ganesh-chaturthi": ("Goa", "Ganesh Chaturthi"),
    "mumbai-ganesh-chaturthi": ("Mumbai", "Ganesh Chaturthi"),
    "jaipur-navratri": ("Jaipur", "Navratri Begins"),
    "udaipur-navratri": ("Udaipur", "Navratri Begins"),
    "manali-dussehra": ("Manali", "Dussehra Kullu"),
    "mysore-dussehra": ("Mysore", "Dussehra Mysore"),
    "pushkar-camel-fair": ("Pushkar", "Pushkar Camel Fair"),
    "varanasi-diwali": ("Varanasi", "Diwali"),
    "jaipur-diwali": ("Jaipur", "Diwali"),
    "goa-christmas": ("Goa", "Christmas in Goa"),
    "goa-new-year": ("Goa", "New Year Celebrations"),
    "goa-sunburn": ("Goa", "Sunburn Festival"),
}


def parse_festival_slug(slug: str) -> tuple[str, str] | None:
    """Returns (destination_name, festival_name_in_db) for a curated
    festival slug, else None. Direct lookup rather than a regex split —
    unlike routes there's no single separator token to split on ("goa-new-
    year" has no marker between destination and festival), so the allowlist
    itself carries the parse."""
    return CURATED_FESTIVAL_PAGES.get(slug)


def related_festivals_for(slug: str, limit: int = 3) -> list[str]:
    """Other curated festival pages for the SAME destination — e.g. Goa's
    Christmas page links to its New Year and Sunburn pages. Deterministic,
    same reasoning as related_routes_for."""
    pair = CURATED_FESTIVAL_PAGES.get(slug)
    if not pair:
        return []
    dest_name, _ = pair
    return sorted(s for s, (d, _) in CURATED_FESTIVAL_PAGES.items() if s != slug and d == dest_name)[:limit]


async def _lookup_festival(festival_name: str, today: date) -> dict | None:
    """Real date/description/price-impact for a named festival, from the
    same festivals table festivals.py's own endpoint reads — never Haiku's
    guess. Tries the current year first; if that year's occurrence has
    already passed, tries next year so a page built in December about a
    March festival still points at the UPCOMING one, not one already over.
    Returns None (fail-open) if the table has neither — the caller falls
    back to a generic, undated page rather than a wrong date."""
    supabase = get_supabase_client()
    if not supabase:
        return None
    for year in (today.year, today.year + 1):
        try:
            res = supabase.table("festivals").select("*").eq("name", festival_name).eq("year", year).limit(1).execute()
            rows = res.data or []
            if not rows:
                continue
            row = rows[0]
            try:
                if date.fromisoformat(row["date"]) < today:
                    continue  # this year's instance is over — try next year
            except (ValueError, TypeError):
                pass
            return row
        except Exception as e:
            logger.warning(f"Festival lookup failed for {festival_name} {year}: {e}")
    return None


_ROUTE_RE = re.compile(r'^([a-z0-9]+)-to-([a-z0-9-]+)$')


def parse_route_slug(slug: str) -> tuple[str, str] | None:
    """Returns (from_slug, dest_slug) if this is a curated route slug, else
    None — including for a route-SHAPED slug that just isn't on the
    allowlist, which callers must treat as not-found, not "generate it
    anyway"."""
    if slug not in CURATED_ROUTES:
        return None
    m = _ROUTE_RE.match(slug)
    return (m.group(1), m.group(2)) if m else None


# ── Destination validation ─────────────────────────────────────────────────
# Found live in production data, not hypothetical: slugs like "day" and
# "need" had reached generate_destination_page() and Haiku FABRICATED entire
# fictional places for them rather than refusing — "Day: Ancient Temples &
# Scenic Beauty in Maharashtra", a place that does not exist, written with
# the same confident, specific detail as a real destination page. It was
# never asked "is this real" — only "write a page for X" — and it complied
# regardless of whether X existed. One cached row was a whole free-text
# prompt ("goa-5-days-from-kolkata-couple-75000"), not a place name at all.
#
# Extends the trip-vocabulary stopword list already used elsewhere
# (itinerary.py's free-text destination extraction) with a few general
# non-place English words that list was never scoped to catch. Cheap and
# deterministic, not exhaustive — a plausible-sounding but fake single word
# can still slip through — but it closes both failure modes actually
# observed: a single common English word, and a whole phrase.
_NON_DESTINATION_WORDS = {
    'day', 'days', 'trip', 'tour', 'plan', 'budget', 'need', 'want', 'from',
    'with', 'and', 'the', 'for', 'via', 'this', 'that', 'have', 'will',
    'also', 'our', 'your', 'some', 'good', 'best', 'nice', 'great', 'more',
    'people', 'total', 'there', 'north', 'south', 'east', 'west',
}


def _looks_like_a_real_destination(slug: str) -> bool:
    """First line of defence before a new (never-cached) slug is allowed to
    spend a real Haiku call and a permanent cache row. Deliberately only
    applied to NEW generation, not to reads of already-cached pages — a
    false positive here should never hide a page that's already serving
    fine; it should only stop a new bad one from being created."""
    words = slug.split('-')
    if len(words) > 5:
        return False  # a real Indian place name is not a 6+-word phrase
    if len(words) == 1 and words[0] in _NON_DESTINATION_WORDS:
        return False
    if any(w.isdigit() for w in words):
        return False  # e.g. a budget figure ("75000") leaked into the slug
    return True


def _extract_json_object(text: str) -> dict | None:
    """Pull the first complete JSON object out of a Haiku reply.

    Slicing first-{ to last-} (the previous approach here) breaks the moment
    the model appends anything after its JSON — a trailing note, a second
    object — producing a JSONDecodeError that this function's callers then
    treat as total generation failure. raw_decode stops at the end of the
    first complete object instead, so trailing content is simply ignored
    rather than corrupting the parse. Same fix already applied to the
    itinerary consistency check for the same observed failure mode.
    """
    s = text.find("{")
    if s < 0:
        return None
    try:
        data, _ = json.JSONDecoder().raw_decode(text[s:])
        return data
    except json.JSONDecodeError:
        return None


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
        data = _extract_json_object(text)
        if data is None:
            logger.error(f"No JSON found in Haiku response for {destination_name}")
            return None

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


def _format_duration(raw) -> str:
    """The raw duration field's shape depends on which of the two data
    sources actually answered — confirmed against a real request: irctc27
    (the primary source) returns an integer count of MINUTES (213), while
    the erail.in fallback returns an already-formatted string scraped from
    its own page. Rendered as-is, 213 would show as a bare "213" on the
    page with no unit — normalise the integer-minutes case into "3h 33m";
    anything else is passed through rather than guessed at."""
    if isinstance(raw, (int, float)) or (isinstance(raw, str) and raw.strip().isdigit()):
        minutes = int(raw)
        h, m = divmod(minutes, 60)
        if h and m:
            return f"{h}h {m}m"
        return f"{h}h" if h else (f"{m}m" if m else "")
    return str(raw) if raw else ""


def _format_trains_for_page(trains: list) -> list:
    """Raw irctc27 train dicts -> the small, stable shape the route-page
    template renders directly. Field-extraction mirrors
    railway_service.build_train_context, which already handles the API's
    inconsistent field naming (trainName vs train_name vs name, etc.) —
    kept independent rather than imported so a future prompt-text change to
    that function can't silently reshape what this page displays.

    These numbers are shown to the page as-is, never rewritten by Haiku —
    the whole point of a route page is a real train number a searcher can
    act on, not a plausible-sounding one.
    """
    formatted = []
    for t in trains[:6]:
        name = (t.get("trainName") or t.get("train_name") or t.get("name") or "")
        number = (t.get("trainNumber") or t.get("train_number") or t.get("number") or "")
        if not name and number:
            name = f"Train {number}"
        dep = (t.get("departureTime") or t.get("departure_time") or t.get("dep_time") or t.get("fromTime") or "")
        arr = (t.get("arrivalTime") or t.get("arrival_time") or t.get("arr_time") or t.get("toTime") or "")
        dur = _format_duration(t.get("duration") or t.get("travelTime") or t.get("travel_time") or "")
        classes = t.get("avlClasses") or t.get("allowedQuotas") or t.get("classes") or []
        if isinstance(classes, list):
            classes = "/".join(str(x) for x in classes)
        if name or number:
            formatted.append({
                "name": name, "number": str(number), "departure": dep,
                "arrival": arr, "duration": dur, "classes": classes,
            })
    return formatted


async def generate_route_page(from_name: str, to_name: str, trains: list) -> dict | None:
    """Same contract as generate_destination_page (fail-open, returns None
    on any error) but for a from-city -> destination ROUTE page. Real train
    data is fetched by the caller (it's the thing being rationed against the
    monthly quota) and passed in — Haiku only writes the prose around it, it
    never invents or is asked to transcribe train numbers itself."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY not set — cannot generate route page")
        return None

    train_summary = "No live train data available for this route right now."
    if trains:
        lines = [f"{t.get('trainName') or t.get('train_name') or t.get('name') or 'Train'} "
                 f"({t.get('trainNumber') or t.get('train_number') or t.get('number') or '?'}): "
                 f"dep {t.get('departureTime') or t.get('departure_time') or '?'}, "
                 f"arr {t.get('arrivalTime') or t.get('arrival_time') or '?'}, "
                 f"{_format_duration(t.get('duration') or t.get('travelTime')) or '?'}"
                 for t in trains[:6]]
        train_summary = "Real trains on this route (use these exact names/numbers if you mention any specific train — do not invent others):\n" + "\n".join(lines)

    prompt = f"""You are an expert Indian travel writer and SEO specialist.
Generate complete travel page content for the route: {from_name} to {to_name} (India), for a traveller deciding how to make this specific journey.

{train_summary}

Return ONLY a valid JSON object with this EXACT structure (no markdown, no explanation):
{{
  "route_name": "{from_name} to {to_name}",
  "meta_title": "SEO title under 60 chars — include '{from_name} to {to_name}'",
  "meta_description": "SEO description under 155 chars — mention travel time/mode and trip planning",
  "hero_title": "Compelling H1 for planning a {from_name} to {to_name} trip",
  "hero_subtitle": "One sentence on why/how people make this specific journey",
  "sample_prompts": [
    "natural Hinglish/English trip prompt mentioning both {from_name} and {to_name}",
    "another prompt with budget and duration"
  ],
  "quick_facts": [
    {{"icon": "emoji", "value": "factual value (distance, typical journey time, etc.)", "label": "short label"}},
    {{"icon": "emoji", "value": "factual value", "label": "short label"}},
    {{"icon": "emoji", "value": "factual value", "label": "short label"}},
    {{"icon": "emoji", "value": "factual value", "label": "short label"}}
  ],
  "sample_plan": {{
    "days": <integer — realistic trip length once arrived at {to_name}>,
    "budget": "₹X,XXX total estimated budget for couple, including the {from_name}-{to_name} journey",
    "trip_type": "trip type",
    "day_plans": [
      {{"title": "Day title", "description": "2-3 sentences, specific places, timings.", "stay": "Real hotel name or area", "transport": "How to get around this day", "cost": "₹X,XXX estimated daily cost"}}
    ]
  }},
  "why_tripzio": [
    {{"title": "Feature title", "desc": "How Tripzio specifically helps for the {from_name} to {to_name} route"}},
    {{"title": "Feature title", "desc": "Another specific benefit"}},
    {{"title": "Feature title", "desc": "Another specific benefit"}}
  ],
  "best_months": [
    {{"month": "MonthName", "icon": "weather emoji", "rating": "excellent|good|avoid", "reason": "one line reason, considering {to_name}'s climate"}}
  ],
  "faqs": [
    {{"q": "How do I get from {from_name} to {to_name}?", "a": "Detailed helpful answer 2-3 sentences — do not state specific train numbers here, that data is shown separately on the page"}},
    {{"q": "How long does the {from_name} to {to_name} journey take?", "a": "Detailed answer"}},
    {{"q": "Another common question about this specific route", "a": "Detailed answer"}},
    {{"q": "Another common question about {to_name} itself", "a": "Detailed answer"}}
  ]
}}

Rules:
- Do NOT state specific train numbers, names, or timings anywhere in your response — real ones are displayed separately on the page from live data, and yours would conflict with them.
- All content must be factually accurate for this specific route and destination
- best_months: include ALL 12 months with accurate ratings for visiting {to_name}
- sample_plan: include 3-6 day_plans depending on realistic trip length
- faqs: 4 questions specific to this route/journey
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
            logger.error(f"Haiku route-page generation failed [{r.status_code}] for {from_name}->{to_name}")
            return None

        text = r.json()["content"][0]["text"].strip()
        data = _extract_json_object(text)
        if data is None:
            logger.error(f"No JSON found in Haiku response for route {from_name}->{to_name}")
            return None

        required = ["route_name", "meta_title", "meta_description", "hero_title", "sample_plan", "best_months", "faqs"]
        for field in required:
            if field not in data:
                logger.error(f"Missing field '{field}' in Haiku route response for {from_name}->{to_name}")
                return None

        # The real data, not AI output — attached here rather than trusted
        # to the model, per this function's whole reason for existing.
        data["destination_name"] = to_name
        data["from_name"] = from_name
        data["page_type"] = "route"
        data["trains"] = _format_trains_for_page(trains)
        return data

    except Exception as e:
        logger.error(f"Haiku route-page generation exception for {from_name}->{to_name}: {e}")
        return None


async def generate_festival_page(destination_name: str, festival_row: dict) -> dict | None:
    """Same contract as generate_destination_page/generate_route_page (fail-
    open, returns None on any error), for a destination-tied-to-a-festival
    page. The date, description and price impact come from festival_row —
    the real festivals table row the caller already looked up — and are
    attached directly to the response, never left to Haiku to state itself.
    A festival page is worthless if it puts the wrong month in front of a
    real search, so the one fact a reader most needs is exactly the one
    kept out of the model's hands."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        logger.error("ANTHROPIC_API_KEY not set — cannot generate festival page")
        return None

    festival_name = festival_row.get("name", "")
    festival_date = festival_row.get("date", "")
    festival_desc = festival_row.get("description", "")
    price_impact = festival_row.get("price_impact", "")
    festival_tip = festival_row.get("tip", "")

    try:
        # %-d (no leading zero) is a Linux/Mac-only strftime extension —
        # %d then a manual lstrip keeps this portable to any host, since
        # this code needs to run correctly wherever it's tested, not just
        # in production.
        _dt = datetime.strptime(festival_date, "%Y-%m-%d")
        pretty_date = f"{_dt.strftime('%B')} {_dt.day}, {_dt.year}" if festival_date else ""
    except ValueError:
        pretty_date = festival_date  # unfamiliar format — show it raw rather than crash

    prompt = f"""You are an expert Indian travel writer and SEO specialist.
Generate complete travel page content for visiting {destination_name} (India) during {festival_name}.

REAL FACTS about this festival (use these, do not invent or restate a different date):
- Festival: {festival_name}
- Date: {pretty_date or "date to be confirmed"}
- About: {festival_desc or "a notable regional celebration"}
- Typical price/crowd impact: {price_impact or "moderate"}
- Practical tip: {festival_tip or "book accommodation and transport well in advance"}

Return ONLY a valid JSON object with this EXACT structure (no markdown, no explanation):
{{
  "meta_title": "SEO title under 60 chars — include '{destination_name}' and '{festival_name}'",
  "meta_description": "SEO description under 155 chars — mention the festival and trip planning",
  "hero_title": "Compelling H1 for planning a {destination_name} trip around {festival_name}",
  "hero_subtitle": "One sentence on what makes experiencing {festival_name} in {destination_name} special",
  "sample_prompts": [
    "natural Hinglish/English trip prompt mentioning {destination_name} and {festival_name}",
    "another prompt with budget and duration"
  ],
  "quick_facts": [
    {{"icon": "emoji", "value": "factual value about the festival experience (crowd level, best viewing spot, duration of celebrations, etc.)", "label": "short label"}},
    {{"icon": "emoji", "value": "factual value", "label": "short label"}},
    {{"icon": "emoji", "value": "factual value", "label": "short label"}}
  ],
  "sample_plan": {{
    "days": <integer — realistic trip length to properly experience the festival>,
    "budget": "₹X,XXX total estimated budget for couple — factor in festival-season price increases",
    "trip_type": "trip type",
    "day_plans": [
      {{"title": "Day title, tied to the festival where relevant", "description": "2-3 sentences, specific to the festival experience or {destination_name} sightseeing.", "stay": "Real hotel name or area — note if advance booking is essential", "transport": "How to get around this day", "cost": "₹X,XXX estimated daily cost"}}
    ]
  }},
  "why_tripzio": [
    {{"title": "Feature title", "desc": "How Tripzio specifically helps plan around {festival_name} timing"}},
    {{"title": "Feature title", "desc": "Another specific benefit"}},
    {{"title": "Feature title", "desc": "Another specific benefit"}}
  ],
  "faqs": [
    {{"q": "When is {festival_name} in {destination_name}?", "a": "State that the exact date is shown above on this page, and describe the general time of year — do not state a specific date yourself"}},
    {{"q": "Should I book accommodation in advance for {festival_name}?", "a": "Detailed answer given the price/crowd impact level"}},
    {{"q": "Another common question specific to experiencing this festival here", "a": "Detailed answer"}},
    {{"q": "Another common question about {destination_name} itself", "a": "Detailed answer"}}
  ]
}}

Rules:
- Do NOT state a specific calendar date anywhere in your response — the real date is displayed separately on the page from verified data, and a date you write yourself risks contradicting it.
- All content must be factually accurate for this specific destination and festival
- sample_plan: include 2-5 day_plans depending on realistic trip length
- faqs: exactly 4 questions
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
            logger.error(f"Haiku festival-page generation failed [{r.status_code}] for {destination_name}/{festival_name}")
            return None

        text = r.json()["content"][0]["text"].strip()
        data = _extract_json_object(text)
        if data is None:
            logger.error(f"No JSON found in Haiku response for festival {destination_name}/{festival_name}")
            return None

        required = ["meta_title", "meta_description", "hero_title", "sample_plan", "faqs"]
        for field in required:
            if field not in data:
                logger.error(f"Missing field '{field}' in Haiku festival response for {destination_name}/{festival_name}")
                return None

        # Real data, not AI output — attached here, matching every other
        # page type this session: the fact a reader most needs is exactly
        # the one kept out of the model's hands.
        data["destination_name"] = destination_name
        data["festival_name"] = festival_name
        data["page_type"] = "festival"
        data["festival_date"] = festival_date
        data["festival_date_display"] = pretty_date
        data["price_impact"] = price_impact
        data["festival_tip"] = festival_tip
        return data

    except Exception as e:
        logger.error(f"Haiku festival-page generation exception for {destination_name}/{festival_name}: {e}")
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
@router.get("/stats/public")
async def public_stats():
    """
    Public stats for landing page — trip count, destinations etc.
    No auth required. Cached-friendly (returns same data for 5 min).
    Fail-open: returns zeros on any error.
    """
    try:
        supabase = get_supabase_client()

        # Total trips generated
        trips_result = supabase.table("trips")\
            .select("id", count="exact")\
            .execute()
        trip_count = trips_result.count or 0

        # Total registered users
        users_result = supabase.table("users")\
            .select("id", count="exact")\
            .execute()
        user_count = users_result.count or 0

        # Total destinations cached (SEO pages generated)
        dest_result = supabase.table("seo_pages")\
            .select("destination_slug", count="exact")\
            .execute()
        dest_count = dest_result.count or 0

        return {
            "trip_count": trip_count,
            "user_count": user_count,
            "dest_count": dest_count,
        }

    except Exception as e:
        logger.warning(f"public_stats failed: {e}")
        return {
            "trip_count": 0,
            "user_count": 0,
            "dest_count": 0,
        }





# ── Trip OG endpoint — dynamic WhatsApp/social preview ───────────────────
@router.get("/trip-og/{slug}")
async def trip_og(slug: str):
    """
    Returns HTML with dynamic OG meta tags for a shared trip.
    WhatsApp/Facebook crawl this URL to generate rich previews.
    Fail-open: returns generic OG tags if trip not found.
    """
    from fastapi.responses import HTMLResponse

    if not re.match(r'^[a-zA-Z0-9_-]{1,80}$', slug):
        raise HTTPException(status_code=400, detail="Invalid slug")

    og_title = "Tripzio — AI Travel Planner for India"
    og_desc = "Plan your perfect Indian trip in minutes. Real trains, hotels & budget. Free to start."
    og_image = "https://tripzio.io/og-image.png"
    canonical = f"https://tripzio.io/trip/{slug}"
    # Raw destination, exposed as its own tag below (not folded into og_title)
    # so the calling Vercel Edge Function (trip-og.js) can look it up against
    # its own destination-photo database and swap in a real Goa/Manali/etc.
    # photo instead of the generic graphic every shared trip used to show.
    dest_raw = ""

    try:
        supabase = get_supabase_client()
        result = supabase.table("trips")\
            .select("title, destination, days, budget, trip_type")\
            .eq("share_slug", slug)\
            .single()\
            .execute()

        if result.data:
            trip = result.data
            dest = trip.get("destination", "India")
            dest_raw = dest
            days = trip.get("days", "")
            budget = trip.get("budget", "")
            trip_type = trip.get("trip_type", "")
            parts = [dest]
            if days: parts.append(f"{days} Days")
            if budget: parts.append(f"₹{int(budget):,}")
            og_title = f"{' · '.join(parts)} — AI Trip Plan | Tripzio"
            desc_parts = ["AI-generated"]
            if trip_type: desc_parts.append(trip_type)
            desc_parts.append(f"trip to {dest}.")
            desc_parts.append("Full itinerary with trains, hotels & budget.")
            og_desc = " ".join(desc_parts)
    except Exception as e:
        logger.warning(f"trip_og: slug {slug}: {e}")

    # Escaped once, used everywhere below — og_title/og_desc previously went
    # straight into HTML attributes unescaped, so a destination or title
    # containing a `"` would break the attribute (or, in the worst case,
    # inject markup) rather than just rendering oddly.
    og_title = html_lib.escape(og_title)
    og_desc = html_lib.escape(og_desc)
    dest_raw = html_lib.escape(dest_raw)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>{og_title}</title>
  <meta property="og:type" content="website"/>
  <meta property="og:url" content="{canonical}"/>
  <meta property="og:title" content="{og_title}"/>
  <meta property="og:description" content="{og_desc}"/>
  <meta property="og:image" content="{og_image}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta property="og:site_name" content="Tripzio"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="{og_title}"/>
  <meta name="twitter:description" content="{og_desc}"/>
  <meta name="twitter:image" content="{og_image}"/>
  <link rel="canonical" href="{canonical}"/>
  <!-- Not an OG tag Google/WhatsApp read — read by trip-og.js (the Vercel
       Edge Function that actually serves /trip/{{slug}}) to pick a real
       destination photo instead of the generic one above. -->
  <meta name="tripzio:destination-raw" content="{dest_raw}"/>
  <script>window.location.replace("{canonical}")</script>
</head>
<body><p>Loading trip plan...</p></body>
</html>"""

    return HTMLResponse(content=html, status_code=200)


# ── Main SEO page endpoint ────────────────────────────────────────────────
@router.get("/seo/page/{destination_slug}")
async def get_seo_page(destination_slug: str, request: Request):
    """Thin wrapper around _get_seo_page_impl that attaches cross-links
    (related_destinations / related_routes) to whatever it returns —
    computed fresh on every response rather than baked into the cached
    page_data, so an edit to a cluster or the route allowlist takes effect
    immediately without needing every affected page manually refreshed.
    Kept separate from the already-tested generation/caching logic below so
    adding this couldn't touch any of its six existing return points."""
    result = await _get_seo_page_impl(destination_slug, request)
    slug = result.get("slug")
    data = result.get("data")
    if isinstance(data, dict) and slug:
        page_type = data.get("page_type")
        if page_type == "route":
            data["related_routes"] = related_routes_for(slug)
        elif page_type == "festival":
            data["related_festivals"] = related_festivals_for(slug)
        else:
            data["related_destinations"] = related_destinations_for(slug)
    return result


async def _get_seo_page_impl(destination_slug: str, request: Request):
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

    # ── Route pages ("delhi-to-manali") branch off entirely here — the
    # destination-only flow below is completely unaffected either way ──────
    route = parse_route_slug(slug)
    if route:
        from_slug, dest_slug = route
        cached_route = await get_cached_page(slug)
        if cached_route:
            logger.info(f"SEO cache HIT (route): {slug}")
            return {"source": "cache", "slug": slug, "data": cached_route}

        from_name = slug_to_name(from_slug)
        dest_name = slug_to_name(dest_slug)
        logger.info(f"SEO cache MISS (route): {slug} — generating via Haiku")

        try:
            from services.railway_service import get_trains_between_stations
            trains = await get_trains_between_stations(from_name, dest_name)
        except Exception as e:
            logger.warning(f"Route page train fetch failed for {slug}: {e}")
            trains = []

        route_page_data = await generate_route_page(from_name, dest_name, trains)
        if route_page_data:
            await save_cached_page(slug, dest_name, route_page_data)
            return {"source": "generated", "slug": slug, "data": route_page_data}

        logger.error(f"Route page generation failed for {slug} — returning fallback")
        return {
            "source": "fallback",
            "slug": slug,
            "data": {
                "destination_name": dest_name,
                "from_name": from_name,
                "page_type": "route",
                "meta_title": f"{from_name} to {dest_name} Trip Planner | Tripzio",
                "meta_description": f"Plan your {from_name} to {dest_name} trip with AI. Real trains and a full itinerary in minutes.",
                "hero_title": f"Plan Your {from_name} to {dest_name} Trip",
                "hero_subtitle": f"Get a complete itinerary for travelling from {from_name} to {dest_name}.",
                "sample_prompts": [f"{from_name} to {dest_name} trip 5 days"],
                "quick_facts": [],
                "trains": _format_trains_for_page(trains),
                "sample_plan": {"days": 5, "budget": "₹20,000", "trip_type": "couple trip", "day_plans": []},
                "why_tripzio": [],
                "best_months": [],
                "faqs": [],
            }
        }

    # A route-SHAPED slug ("random-to-random") that isn't curated is a
    # not-found, not a destination page called "Random To Random" — without
    # this it would fall through to slug_to_name() below and quietly render
    # as if that were a real place.
    if _ROUTE_RE.match(slug):
        raise HTTPException(status_code=404, detail="This route isn't available yet")

    # ── Festival pages ("goa-diwali") also branch off entirely here, before
    # the destination-only flow — a slug like "goa-diwali" would otherwise
    # pass _looks_like_a_real_destination (two clean words, no stopwords)
    # and get generated as if "Goa Diwali" were a place name ──────────────
    festival_pair = parse_festival_slug(slug)
    if festival_pair:
        dest_name_f, festival_name = festival_pair
        cached_festival = await get_cached_page(slug)
        # A cached page whose festival_date has already passed is treated as
        # a miss, not a hit — the whole point of this page type is pointing
        # at the UPCOMING occurrence, and Supabase upsert() means
        # regenerating just overwrites the same row rather than duplicating it.
        is_stale = False
        if cached_festival:
            try:
                cached_date = cached_festival.get("festival_date")
                is_stale = bool(cached_date) and date.fromisoformat(cached_date) < date.today()
            except (ValueError, TypeError):
                is_stale = False
        if cached_festival and not is_stale:
            logger.info(f"SEO cache HIT (festival): {slug}")
            return {"source": "cache", "slug": slug, "data": cached_festival}
        if is_stale:
            logger.info(f"SEO cache STALE (festival, date passed): {slug} — regenerating")

        festival_row = await _lookup_festival(festival_name, date.today())
        if not festival_row:
            logger.error(f"No real festival data found for {festival_name} — refusing to guess a date")
            raise HTTPException(status_code=404, detail="Festival details not available")

        logger.info(f"SEO cache MISS (festival): {slug} — generating via Haiku")
        festival_page_data = await generate_festival_page(dest_name_f, festival_row)
        if festival_page_data:
            await save_cached_page(slug, dest_name_f, festival_page_data)
            return {"source": "generated", "slug": slug, "data": festival_page_data}

        logger.error(f"Festival page generation failed for {slug} — returning fallback")
        try:
            _dt = datetime.strptime(festival_row.get("date", ""), "%Y-%m-%d")
            _pretty = f"{_dt.strftime('%B')} {_dt.day}, {_dt.year}"
        except (ValueError, TypeError):
            _pretty = festival_row.get("date", "")
        return {
            "source": "fallback",
            "slug": slug,
            "data": {
                "destination_name": dest_name_f,
                "festival_name": festival_name,
                "page_type": "festival",
                "festival_date": festival_row.get("date", ""),
                "festival_date_display": _pretty,
                "price_impact": festival_row.get("price_impact", ""),
                "festival_tip": festival_row.get("tip", ""),
                "meta_title": f"{dest_name_f} {festival_name} Trip Planner | Tripzio",
                "meta_description": f"Plan your {dest_name_f} trip around {festival_name}. Real dates, real itinerary, in minutes.",
                "hero_title": f"Plan Your {dest_name_f} Trip for {festival_name}",
                "hero_subtitle": f"Experience {festival_name} in {dest_name_f} with a complete AI-planned itinerary.",
                "sample_prompts": [f"{dest_name_f} trip for {festival_name}"],
                "quick_facts": [],
                "sample_plan": {"days": 4, "budget": "₹25,000", "trip_type": "couple trip", "day_plans": []},
                "why_tripzio": [],
                "faqs": [],
            }
        }

    # ── 2. Check cache ────────────────────────────────────────────────────
    cached = await get_cached_page(slug)
    if cached:
        logger.info(f"SEO cache HIT: {slug}")
        return {
            "source": "cache",
            "slug": slug,
            "data": cached
        }

    # A brand-new slug gets one more check before it's allowed to spend a
    # real Haiku call and a permanent cache row — see
    # _looks_like_a_real_destination for what this catches and why. Only
    # gates NEW generation; already-cached pages are unaffected either way.
    if not _looks_like_a_real_destination(slug):
        logger.warning(f"Rejected non-destination slug before generation: {slug}")
        raise HTTPException(status_code=404, detail="Destination not found")

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
            "meta_description": f"Plan your {destination_name} trip with AI. Real trains, hotels and budget breakdown in minutes. Free to start.",
            "hero_title": f"Plan Your {destination_name} Trip with AI",
            "hero_subtitle": f"Get a complete {destination_name} itinerary with real trains, hotels and budget in minutes.",
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


@router.get("/sitemap.xml")
async def sitemap():
    """
    Dynamic sitemap — reads all cached destination pages from Supabase.
    As new destinations get generated they automatically appear here.
    Google uses this to discover all tripzio.io pages.
    """
    from fastapi.responses import Response

    try:
        supabase = get_supabase_client()
        result = supabase.table("seo_pages")\
            .select("destination_slug, updated_at")\
            .execute()
        cached_pages = result.data or []
    except Exception:
        cached_pages = []

    static_routes = [
        "/", "/guest", "/login", "/register",
        "/agent/login", "/explore",
    ]

    base_url = "https://tripzio.io"
    today = datetime.utcnow().strftime("%Y-%m-%d")

    urls = []

    # Static pages
    for route in static_routes:
        urls.append(f"""  <url>
    <loc>{base_url}{route}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <lastmod>{today}</lastmod>
  </url>""")

    # Dynamic destination pages — only what's been generated and cached
    for page in sorted(cached_pages, key=lambda x: x["destination_slug"]):
        slug = page["destination_slug"]
        lastmod = page.get("updated_at", today)[:10] if page.get("updated_at") else today
        urls.append(f"""  <url>
    <loc>{base_url}/{slug}-trip-planner</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
    <lastmod>{lastmod}</lastmod>
  </url>""")

    sitemap_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{chr(10).join(urls)}
</urlset>"""

    return Response(
        content=sitemap_xml,
        media_type="application/xml"
    )
