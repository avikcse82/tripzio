import sys
import os
import time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# SerpAPI cache — avoid burning free quota on repeated searches
# Cache expires after 24 hours
_SERP_CACHE = {}  # key: "city_type" -> (timestamp, data)
_CACHE_TTL = 86400  # 24 hours

def _serp_cache_get(key):
    if key in _SERP_CACHE:
        ts, data = _SERP_CACHE[key]
        if time.time() - ts < _CACHE_TTL:
            return data
        del _SERP_CACHE[key]
    return None

def _serp_cache_set(key, data):
    _SERP_CACHE[key] = (time.time(), data)

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from models.schemas import ItineraryRequest, AgentItineraryRequest
from core.config import settings
from core.security import decode_access_token
from database import get_user_by_email, get_user_by_id, save_trip
from routers.weather import get_weather
import httpx
import json
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/itinerary", tags=["Itinerary"])
security = HTTPBearer()

# ── India-only destination validation ─────────────────────────
INTERNATIONAL_KEYWORDS = {
    "london","england","uk","united kingdom","britain","france","paris","germany","berlin",
    "usa","america","new york","los angeles","san francisco","chicago","washington",
    "dubai","uae","abu dhabi","singapore","malaysia","kuala lumpur","bangkok","thailand",
    "australia","sydney","melbourne","canada","toronto","vancouver",
    "japan","tokyo","china","beijing","shanghai","korea","seoul",
    "italy","rome","milan","spain","madrid","barcelona","portugal","lisbon",
    "switzerland","zurich","geneva","austria","vienna","netherlands","amsterdam",
    "maldives","sri lanka","colombo","nepal","kathmandu","bhutan","thimphu",
    "pakistan","bangladesh","myanmar","vietnam","indonesia","bali","jakarta",
    "philippines","hong kong","taiwan","egypt","cairo","kenya","south africa",
    "brazil","rio","mexico","europe","africa","abroad","overseas","international",
    "foreign","outside india","world tour",
}

INDIA_SAFE_WORDS = {
    "delhi","mumbai","kolkata","chennai","bangalore","bengaluru","hyderabad",
    "goa","kochi","darjeeling","gangtok","leh","ladakh","manali","shimla",
    "jaipur","agra","varanasi","rishikesh","ooty","munnar","andaman",
    "rajasthan","kerala","himachal","uttarakhand","sikkim","india","indian",
}

def is_international_destination(destination: str, from_city: str = ""):
    """
    Detects international destinations in text.
    IMPORTANT: Even ONE international keyword = block.
    Mixed trips like Darjeeling + London are INVALID — block them.
    """
    combined = (destination + " " + from_city).lower()
    # Check every international keyword — ANY match = block
    # We don't care if Indian destinations are also mentioned
    # A "Darjeeling + London" circuit is still invalid
    for keyword in INTERNATIONAL_KEYWORDS:
        if keyword in combined:
            return True, keyword
    return False, ""


TIER_CONFIG = {
    "bronze": {
        "stay": "budget guesthouses, hostels, or dharamshalas (₹500-1,500/night)",
        "food": "local dhabas, street food, and budget restaurants (₹150-300/day)",
        "transport": "state buses, general train coaches, and shared autos",
        "activities": "free attractions, local markets, and self-guided walks",
        "vibe": "authentic, local, budget-conscious traveler"
    },
    "silver": {
        "stay": "2-3 star hotels or well-reviewed guesthouses (₹1,500-4,000/night)",
        "food": "mix of local restaurants and mid-range dining (₹300-600/day)",
        "transport": "AC train sleeper, Volvo buses, and app-based cabs",
        "activities": "popular paid attractions and guided tours",
        "vibe": "comfortable, value-for-money, smart traveler"
    },
    "gold": {
        "stay": "4-star hotels and premium resorts (₹5,000-15,000/night)",
        "food": "good restaurants, some fine dining, hotel breakfast (₹600-1,200/day)",
        "transport": "flights for long distances, AC taxis, premium trains",
        "activities": "curated experiences, guided tours, and premium attractions",
        "vibe": "comfortable, relaxed, experience-focused traveler"
    },
    "diamond": {
        "stay": "5-star hotels and luxury resorts (₹12,000-30,000/night)",
        "food": "fine dining restaurants and hotel dining (₹1,200-2,500/day)",
        "transport": "flights, private cab transfers, airport pickups",
        "activities": "exclusive experiences, private guides, luxury activities",
        "vibe": "premium, curated, luxury-conscious traveler"
    },
    "platinum": {
        "stay": "ultra-luxury hotels, heritage properties (₹25,000+/night)",
        "food": "finest restaurants, chef experiences, in-room dining (₹2,500+/day)",
        "transport": "business class, chauffeur-driven cars, private transfers",
        "activities": "completely private, exclusive access, bespoke itineraries",
        "vibe": "ultra-luxury, completely personalized, no compromises"
    }
}

TRANSPORT_DESCRIPTIONS = {
    "cheapest": "most economical routes using state transport and budget options",
    "balanced": "best combination of cost and comfort",
    "fastest": "quickest way to reach with premium transport",
    "all": "all transport options compared"
}


def build_itinerary_prompt(req: ItineraryRequest, weather_data: dict) -> str:
    tier = TIER_CONFIG.get(req.plan_tier.value, TIER_CONFIG["silver"])
    destination = req.destination or "the best destination for this budget and season"
    trip_type_str = f"for a {req.trip_type} trip" if req.trip_type else ""
    date_str = f"starting {req.start_date}" if req.start_date else "starting soon"
    flexible_str = "Dates flexible ±3 days — suggest best window" if req.is_flexible else ""
    weather_str = f"""
Current weather at destination:
- Temperature: {weather_data.get('temperature', 'Moderate')}
- Condition: {weather_data.get('condition', 'Pleasant')}
- Season: {weather_data.get('season', 'Good')}
- Advisory: {weather_data.get('advisory', 'None')}
""" if weather_data else ""

    return f"""You are Tripzio's AI travel expert specializing ONLY in Indian travel.
CRITICAL: If the destination is outside India (e.g. London, Dubai, Singapore, USA, Europe), you MUST return: {{"error": "INTERNATIONAL_DESTINATION", "message": "Only Indian destinations supported"}}
Do NOT generate itineraries for international destinations under any circumstances.

Generate a comprehensive, personalized travel itinerary for Indian destinations only.

TRIP DETAILS:
- Traveler from: {req.from_city}
- Destination: {destination}
- Duration: {req.days} days {date_str}
- Total budget: Rs {req.budget}
- Trip type: {trip_type_str}
- Experience tier: {req.plan_tier.value.upper()} — {tier['vibe']}
- Transport preference: {TRANSPORT_DESCRIPTIONS.get(req.transport_mode.value, 'balanced')}
{flexible_str}

TIER GUIDELINES for {req.plan_tier.value.upper()}:
- Stay: {tier['stay']}
- Food: {tier['food']}
- Transport: {tier['transport']}
- Activities: {tier['activities']}

{weather_str}

CRITICAL TRANSPORT INSTRUCTION:
For transport from {req.from_city} to {destination}:
1. Use REAL train names and numbers (e.g. "Darjeeling Mail 12343", "Rajdhani Express 12301")
2. Include COMPLETE journey time including last mile from railhead/airport to destination
   Example: "Train 10hrs + Taxi/Jeep 3hrs = Total 13hrs"
3. For hill stations reachable via NJP/Siliguri, mention the shared jeep/taxi leg clearly
4. Include specific departure stations from {req.from_city}

Generate ONLY valid JSON, no markdown:
{{
  "destination": "actual destination name",
  "summary": "2-3 line engaging summary",
  "highlights": ["highlight1", "highlight2", "highlight3", "highlight4"],
  "transport_options": [
    {{
      "mode": "Train Option 1 — Recommended",
      "type": "Train",
      "operator": "Real Train Name + Number (e.g. Tamralipta Express 12224)",
      "description": "Departure HH:MM → Arrival HH:MM",
      "estimated_cost": "₹XXX Sleeper / ₹X,XXX 3AC / ₹X,XXX 2AC per person",
      "duration": "X hrs X mins",
      "details": ["Board at [station] at [time]", "Arrive [destination] at [time]", "Last mile to hotel"],
      "booking_tip": "Book on IRCTC 60 days ahead. 3AC recommended.",
      "best_for": "Most travelers"
    }},
    {{
      "mode": "Train Option 2 — Faster/Different Timing",
      "type": "Train",
      "operator": "Different Train Name + Number on same route",
      "description": "Departure HH:MM → Arrival HH:MM",
      "estimated_cost": "₹XXX Sleeper / ₹X,XXX 3AC per person",
      "duration": "X hrs (faster or different time)",
      "details": ["Board at [station] at [time]", "Arrive at [time]"],
      "booking_tip": "Book on IRCTC",
      "best_for": "Different departure time preference"
    }},
    {{
      "mode": "Train Option 3 — Overnight",
      "type": "Train",
      "operator": "Overnight Train Name + Number if available on route",
      "description": "Overnight — depart evening arrive morning",
      "estimated_cost": "₹XXX Sleeper / ₹X,XXX 3AC per person",
      "duration": "X hrs overnight",
      "details": ["Depart evening", "Arrive morning fresh"],
      "booking_tip": "3AC for comfortable sleep",
      "best_for": "Save hotel night cost"
    }},
    {{
      "mode": "Government Bus",
      "type": "State Bus",
      "operator": "WBTC/MSRTC/KSRTC/HRTC/RSRTC/TNSTC — use correct state operator",
      "description": "Cheapest option",
      "estimated_cost": "₹XX-₹XXX per person",
      "duration": "X hrs",
      "details": ["Board at main bus terminal"],
      "booking_tip": "Buy at counter or redbus.in",
      "best_for": "Budget travelers"
    }},
    {{
      "mode": "Private AC Bus",
      "type": "Volvo/AC Sleeper",
      "operator": "Redbus/Greenline/SRS/NEETA/VRL — real operators on this route",
      "description": "Comfortable AC bus",
      "estimated_cost": "₹XXX-₹X,XXX per person",
      "duration": "X hrs",
      "details": ["Book on redbus.in"],
      "booking_tip": "Book 3-5 days ahead",
      "best_for": "Comfort without train"
    }},
    {{
      "mode": "Private Taxi",
      "type": "Outstation Cab",
      "operator": "Ola Outstation / Uber Intercity",
      "description": "Door to door flexible",
      "estimated_cost": "₹X,XXX-₹X,XXX total per car",
      "duration": "X hrs by road",
      "details": ["Book Ola/Uber app → Outstation", "Pick up from home"],
      "booking_tip": "Split among 4+ people",
      "best_for": "Families, groups, luggage"
    }}
  ],
  "accommodation": [
    {{
      "name": "Real hotel name",
      "type": "Hotel / Resort / Homestay",
      "area": "specific area in destination",
      "why": "why suits this tier and trip type",
      "price_range": "₹X,XXX - ₹X,XXX per night",
      "rating": "4.2",
      "highlight": "one standout feature"
    }}
  ],
  "places_to_visit": [
    {{
      "name": "Place name — be specific",
      "type": "Viewpoint/Temple/Beach/Market/Nature/Heritage/Museum/Adventure/Waterfall/Lake",
      "description": "2 engaging lines — what makes it special and unmissable",
      "entry_fee": "₹XX or Free",
      "best_time": "Early Morning/Morning/Afternoon/Evening/Anytime",
      "duration": "X hours",
      "must_see": true
    }}
  ],
  IMPORTANT — places_to_visit RULES:
  - Minimum 15 entries for any destination, 8-10 per city for circuit trips
  - Include EVERY place mentioned in day_plans morning/afternoon/evening
  - Add MORE places beyond day_plans — viewpoints, temples, markets, nature, heritage, adventure, day trips nearby
  - Cover ALL categories — never repeat same type more than 3 times
  - places_to_visit array MUST have MORE entries than total day_plans activities combined
  "things_to_do": [
    {{
      "category": "Adventure",
      "activities": ["activity — ₹XXX"]
    }},
    {{
      "category": "Food & Dining",
      "activities": ["must-try dish", "restaurant name"]
    }},
    {{
      "category": "Shopping",
      "activities": ["what to buy — price range"]
    }},
    {{
      "category": "Culture & Heritage",
      "activities": ["experience"]
    }}
  ],
  "packing_list": ["item1", "item2", "item3", "item4", "item5", "item6", "item7", "item8"],
  "local_tips": ["tip1", "tip2", "tip3", "tip4", "tip5"],
  "permit_info": ["permit if required, else null"],
  "cost_breakdown": {{
    "transport": "₹X,XXX",
    "accommodation": "₹X,XXX ({req.days} nights)",
    "food": "₹X,XXX ({req.days} days)",
    "activities": "₹X,XXX",
    "miscellaneous": "₹X,XXX",
    "total": "₹X,XXX"
  }},
  "alternatives": [
    {{
      "name": "Alternative 1",
      "reason": "why similar",
      "estimated_budget": "₹X,XXX",
      "highlight": "unique thing"
    }},
    {{
      "name": "Alternative 2",
      "reason": "why similar",
      "estimated_budget": "₹X,XXX",
      "highlight": "unique thing"
    }}
  ]
}}

BUDGET UTILIZATION RULES:
- Bronze tier: Target spending 70-80% of budget. Maximize value, use budget stays. Show savings.
- Silver tier: Target spending 85-90% of budget. Good quality without splurging. Small buffer for shopping.
- Gold tier: Target spending 90-95% of budget. Better hotels, premium experiences. Don't leave money unused.
- Diamond tier: Target spending 95-100% of budget. Luxury hotels, private transport, fine dining.
- Platinum tier: Spend 100% of budget. Best of everything — 5-star, private charter, no compromises.

Current tier: {req.plan_tier.value} — follow the rule above for this tier.
Total budget: Rs {req.budget}

GENERAL RULES:
1. REAL train names and numbers always
2. COMPLETE journey time (train + last mile)
3. REAL named hotels matching {req.plan_tier.value} tier
4. India-specific, culturally accurate
5. {req.days} days realistic plan
6. Transport specifically from {req.from_city}
7. If Gold/Diamond/Platinum — suggest upgrades to use full budget
8. Return ONLY valid JSON"""


async def call_openai(prompt: str) -> dict:
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")

    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are Tripzio's expert Indian travel AI. Generate detailed, accurate, budget-appropriate travel itineraries. Always use real train names, numbers and complete journey times. Always respond with valid JSON only."
                    },
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0,
                "max_tokens": 4096,
                "response_format": {"type": "json_object"}
            }
        )

        result = response.json()
        if response.status_code != 200:
            error_detail = result.get("error", {}).get("message", "OpenAI API error")
            logger.error(f"OpenAI error: {error_detail}")
            raise HTTPException(status_code=503, detail=f"AI service error: {error_detail}")

        content = result["choices"][0]["message"]["content"]
        content = content.strip()
        if content.startswith("```"):
            content = content.split(chr(10), 1)[-1].rsplit("```", 1)[0].strip()
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            raise HTTPException(status_code=500, detail="Failed to parse AI response")


def post_process_itinerary(data: dict, budget: int = 0, from_city: str = "", plan_tier: str = "silver", cached_trains: list = None) -> dict:
    """Enforce rules deterministically after AI response — runs every time."""
    if not data or not isinstance(data, dict):
        return data

    import re as _re
    dest = data.get("destination", "destination").split("→")[-1].strip().split(":")[0].strip()
    from_city = (from_city or data.get("from_city", "")).strip()

    # ── Inject cached trains — replace AI trains with real data ──
    if cached_trains:
        opts = data.get("transport_options", [])
        # Keep only non-train options (bus, taxi, flight) from AI
        non_train_opts = [o for o in opts if "train" not in (o.get("type","") + o.get("mode","")).lower()]
        # Build real trains from cache — top 8, deduplicated
        seen_nums = set()
        real_trains = []
        for t in cached_trains:
            num = str(t.get("trainNumber", t.get("train_number", ""))).strip()
            if not num or num in seen_nums:
                continue
            seen_nums.add(num)
            name = t.get("trainName", t.get("train_name", f"Train {num}")).strip()
            dep  = t.get("departureTime", t.get("departure_time", "")).strip()
            arr  = t.get("arrivalTime",   t.get("arrival_time",   "")).strip()
            dur  = t.get("duration", "").strip()
            real_trains.append({
                "mode":           f"Train — {name} ({num})",
                "type":           "Train",
                "operator":       f"{name} ({num})",
                "description":    f"{from_city.title()} → {dest.title()} by {name}",
                "estimated_cost": "SL: ₹200-600 | 3A: ₹600-1500 | 2A: ₹1000-2500 per person",
                "duration":       dur,
                "details":        [
                    f"Dep: {dep} → Arr: {arr} ({dur})",
                    "Book on IRCTC.co.in 60 days ahead"
                ],
                "booking_tip":    "Book on IRCTC.co.in — 60 days in advance for confirmed seats",
                "train_number":   num,
                "departure":      dep,
                "arrival":        arr,
            })

        # Replace: real trains first, then bus/taxi
        if real_trains:
            data["transport_options"] = real_trains + non_train_opts

    # ── Fix 1: Source city in Day 1 ──────────────────────────
    from_lower = from_city.lower()
    day_plans = data.get("day_plans", [])
    if day_plans and from_lower:
        d1 = day_plans[0]
        for field in ["morning", "afternoon", "evening", "title"]:
            val = str(d1.get(field, ""))
            val_lower = val.lower()
            if from_lower in val_lower and not any(
                kw in val_lower for kw in ["depart","leave","board","catch","travel","journey","from"]
            ):
                if field == "morning":
                    d1[field] = f"Early departure from {from_city.title()} — board train/bus to {dest}."
                elif field == "afternoon":
                    d1[field] = f"Arrive {dest} — check into hotel, freshen up, have lunch."
                elif field == "evening":
                    d1[field] = f"Evening walk around {dest} — explore the main area."
                elif field == "title":
                    d1[field] = f"{dest} Day 1 — Travel & Arrival"
        data["day_plans"][0] = d1

    # ── Fix 2: Ensure 4 hotels ───────────────────────────────
    TIER_PRICES = {
        "bronze":   (500,   1500),
        "silver":   (1500,  4000),
        "gold":     (4000,  12000),
        "diamond":  (12000, 30000),
        "platinum": (30000, 100000),
    }
    TIER_ORDER = ["bronze","silver","gold","diamond","platinum"]
    t_idx = TIER_ORDER.index(plan_tier) if plan_tier in TIER_ORDER else 2
    budget_tier = TIER_ORDER[max(0, t_idx-1)]
    luxury_tier = TIER_ORDER[min(len(TIER_ORDER)-1, t_idx+1)]

    accom = data.get("accommodation", [])
    if accom and not any(h.get("recommended") for h in accom):
        accom[0]["recommended"] = True
        accom[0]["tier"] = "recommended"

    existing = {h.get("tier","") for h in accom}

    FILL = {
        "budget":      (budget_tier,  False, "Budget guesthouse",    "Cheapest clean option"),
        "luxury":      (luxury_tier,  False, "Premium resort",       "Best experience — pool/spa/premium"),
        "alternative": (plan_tier,    False, "Alternative hotel",    "If first choice is full"),
    }
    for tier_name, (price_tier, is_rec, label, why) in FILL.items():
        if tier_name not in existing:
            lo, hi = TIER_PRICES.get(price_tier, (2000, 8000))
            accom.append({
                "name": f"{label} near {dest}",
                "type": "Resort" if tier_name == "luxury" else "Hotel",
                "area": f"Central {dest}",
                "why": why,
                "price_range": f"₹{lo:,} - ₹{hi:,} per night",
                "rating": "4.5" if tier_name == "luxury" else "3.8",
                "highlight": "Pool, premium amenities" if tier_name == "luxury" else "Clean, good location",
                "recommended": is_rec,
                "tier": tier_name
            })
    data["accommodation"] = accom  # No limit — show all

    # ── Fix 3: Budget utilisation 90-95% ─────────────────────
    if budget > 0:
        cb = data.get("cost_breakdown", {})
        def parse_amt(v):
            nums = _re.findall(r"[0-9][0-9,]*", str(v))
            return int(nums[0].replace(",","")) if nums else 0

        parts = ["transport","accommodation","food","activities","miscellaneous"]
        amounts = {p: parse_amt(cb.get(p,0)) for p in parts}
        total = sum(amounts.values())
        util = (total/budget*100) if budget > 0 else 100

        if util < 85:
            gap = int(budget * 0.92) - total
            amounts["accommodation"] += int(gap * 0.45)
            amounts["activities"]    += int(gap * 0.30)
            amounts["food"]          += int(gap * 0.15)
            amounts["miscellaneous"] += int(gap * 0.10)
            new_total = sum(amounts.values())
            people = max(1, data.get("people", 1) or 1)
            for p in parts:
                cb[p] = f"₹{amounts[p]:,}"
            cb["total"]              = f"₹{new_total:,}"
            cb["per_person"]         = f"₹{new_total//people:,}"
            cb["budget_utilisation"] = f"{int(new_total/budget*100)}%"
            cb["savings_tip"]        = f"₹{budget-new_total:,} kept as buffer"
            data["cost_breakdown"]   = cb
            logger.info(f"Budget corrected: {int(util)}% → {int(new_total/budget*100)}%")

    # ── Fix 4: Ensure all transport modes present ─────────────
    opts = data.get("transport_options", [])
    combined = " ".join(
        (t.get("mode","") + " " + t.get("type","") + " " + t.get("operator","")).lower()
        for t in opts
    )

    dest_l = dest.lower()
    state_bus = "WBTC/SBSTC"
    if "goa" in dest_l: state_bus = "KTC/Kadamba"
    elif any(x in dest_l for x in ["maharashtra","mumbai","pune"]): state_bus = "MSRTC"
    elif "kerala" in dest_l: state_bus = "KSRTC Kerala"
    elif any(x in dest_l for x in ["karnataka","bangalore","bengaluru","mysore"]): state_bus = "KSRTC Karnataka"
    elif any(x in dest_l for x in ["rajasthan","jaipur","udaipur","jodhpur"]): state_bus = "RSRTC"
    elif any(x in dest_l for x in ["himachal","shimla","manali","dharamshala"]): state_bus = "HRTC"
    elif any(x in dest_l for x in ["uttarakhand","dehradun","rishikesh"]): state_bus = "UTC"
    elif any(x in dest_l for x in ["tamil","chennai","ooty","madurai"]): state_bus = "TNSTC"
    elif any(x in dest_l for x in ["andhra","hyderabad","vizag"]): state_bus = "APSRTC"
    elif any(x in dest_l for x in ["gujarat","ahmedabad"]): state_bus = "GSRTC"
    elif any(x in dest_l for x in ["punjab","amritsar"]): state_bus = "PRTC"

    # Fix wrong direct routes — these need intermediate stops
    INDIRECT_ROUTES = {
        "darjeeling": ("NJP/Siliguri", "shared jeep from NJP to Darjeeling (3hrs, ₹200)"),
        "gangtok":    ("NJP/Bagdogra", "shared taxi from NJP to Gangtok (4hrs, ₹300)"),
        "kalimpong":  ("NJP",          "shared taxi from NJP to Kalimpong (3hrs, ₹250)"),
        "pelling":    ("NJP",          "shared taxi from NJP to Pelling (4hrs)"),
        "lachung":    ("NJP",          "taxi from NJP to Lachung (5hrs)"),
        "manali":     ("Chandigarh/Kullu", "HRTC bus or taxi from Kullu to Manali (2hrs)"),
        "spiti":      ("Shimla",       "HRTC bus Shimla to Kaza (12hrs)"),
        "kaza":       ("Shimla",       "HRTC bus Shimla to Kaza (12hrs)"),
        "chopta":     ("Rishikesh",    "taxi from Rishikesh to Chopta (5hrs)"),
        "tawang":     ("Guwahati",     "taxi from Guwahati to Tawang (12hrs)"),
    }
    dest_key = dest_l.split()[0] if dest_l else ""
    indirect = None
    for key, (hub, last_mile) in INDIRECT_ROUTES.items():
        if key in dest_l:
            indirect = (hub, last_mile)
            break

    # Fix ALL wrong direct descriptions if route is indirect
    if indirect:
        hub, last_mile = indirect
        for opt in opts:
            desc = opt.get("description", "").lower()
            op   = opt.get("operator", "").lower()
            mode = opt.get("mode", "").lower()
            from_l = from_city.lower()

            # Match any option that wrongly says direct from_city → dest
            is_wrong_direct = (from_l in desc and dest_l in desc)

            if is_wrong_direct:
                if "taxi" in op or "taxi" in mode or "cab" in mode or "ola" in op or "uber" in op:
                    opt["description"] = f"{from_city.title()} → {hub} by train/bus → {last_mile}"
                    opt["details"] = [
                        f"Train or bus from {from_city.title()} to {hub}",
                        f"Then {last_mile}",
                        "No direct road route recommended — train+shared taxi is faster and cheaper"
                    ]
                    opt["booking_tip"] = f"Book train to {hub} on IRCTC, then shared taxi to {dest.title()}"
                elif "bus" in op or "bus" in desc or "bus" in mode:
                    opt["description"] = f"{from_city.title()} → {hub} by bus → {last_mile}"
                    opt["details"] = [
                        f"Bus from {from_city.title()} to {hub}",
                        f"Then {last_mile}"
                    ]
                elif "train" in desc or "train" in mode or "mail" in op or "express" in op:
                    opt["description"] = f"{from_city.title()} → {hub} by train → {last_mile}"
                    opt["details"] = [
                        f"Train from {from_city.title()} to {hub}",
                        f"Then {last_mile}"
                    ]
                opt["details"] = [
                    f"Train from {from_city.title()} to {hub}",
                    f"Then {last_mile}"
                ]

    # Always ensure all 3 modes exist — check by operator name specifically
    has_govt_bus = any(
        any(sb.lower() in (t.get("operator","") + t.get("type","")).lower()
            for sb in state_bus.split("/"))
        or "government bus" in (t.get("mode","") + t.get("type","")).lower()
        for t in opts
    )
    if not has_govt_bus:
        if indirect:
            bus_desc = f"{from_city} → {indirect[0]} by {state_bus} → then {indirect[1]}"
            bus_details = [f"{state_bus} bus from {from_city} to {indirect[0]}", f"Then {indirect[1]}"]
        else:
            bus_desc = f"State bus from {from_city} to {dest}"
            bus_details = [f"Board {state_bus} from main bus terminal"]
        opts.append({
            "mode": "Government Bus",
            "type": "State Bus",
            "operator": state_bus,
            "description": bus_desc,
            "estimated_cost": "₹80 - ₹250 per person",
            "duration": "Varies",
            "details": bus_details,
            "booking_tip": "Buy at counter or redbus.in",
            "best_for": "Budget travelers"
        })

    has_private_bus = any(
        any(op.lower() in (t.get("operator","") + t.get("type","") + t.get("mode","")).lower()
            for op in ["redbus","volvo","greenline","ac bus","private bus","ac sleeper","dreamliner"])
        for t in opts
    )
    if not has_private_bus:
        ac_desc = f"{from_city} → {indirect[0]} by Redbus/Volvo → then {indirect[1]}" if indirect else f"Private AC bus from {from_city} to {dest}"
        opts.append({
            "mode": "Private AC Bus",
            "type": "Volvo/AC Sleeper",
            "operator": "Redbus / Greenline / Volvo AC",
            "description": ac_desc,
            "estimated_cost": "₹300 - ₹900 per person",
            "duration": "Varies",
            "details": ["Book on redbus.in or abhibus.com"] if not indirect else [f"Redbus/Volvo to {indirect[0]}", f"Then {indirect[1]}"],
            "booking_tip": "Book 3-5 days ahead on Redbus",
            "best_for": "Comfort without booking train"
        })

    has_taxi = any(
        any(op.lower() in (t.get("operator","") + t.get("mode","")).lower()
            for op in ["ola","uber","outstation","intercity","private taxi","cab"])
        for t in opts
    )
    if not has_taxi:
        if indirect:
            taxi_desc = f"{from_city} → {indirect[0]} by train → then {indirect[1]} (road not recommended for long distance)"
            taxi_details = [f"Train to {indirect[0]}", f"Then {indirect[1]}"]
            taxi_tip = f"For {dest}, train+shared taxi is better than full outstation cab"
        else:
            taxi_desc = f"Door to door from {from_city} to {dest}"
            taxi_details = ["Book on Ola or Uber app → Outstation/Intercity"]
            taxi_tip = "Split among 4+ people. Book 1 day ahead."
        opts.append({
            "mode": "Private Taxi",
            "type": "Outstation Cab",
            "operator": "Ola Outstation / Uber Intercity",
            "description": taxi_desc,
            "estimated_cost": "₹2,500 - ₹6,000 total per car",
            "duration": "By road",
            "details": taxi_details,
            "booking_tip": taxi_tip,
            "best_for": "Families, groups, luggage"
        })

    data["transport_options"] = opts
    return data


def get_current_user_from_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user_id = payload.get("id")
    email = payload.get("sub")
    user = get_user_by_id(user_id) if user_id else None
    if not user:
        user = get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/generate")
async def generate_itinerary(
    req: ItineraryRequest,
    current_user: dict = Depends(get_current_user_from_token)
):
    try:
        logger.info(f"Generating itinerary: {req.from_city} -> {req.destination}, {req.days}d")

        # ── Layer 1: India-only validation ────────────────────
        is_intl, detected = is_international_destination(
            req.destination or "", req.from_city or ""
        )
        if is_intl:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "INTERNATIONAL_DESTINATION",
                    "message": f"Tripzio specialises in incredible Indian destinations. International travel planning is coming soon!",
                    "detected_keyword": detected,
                    "suggestion": "Try destinations like Goa, Manali, Kerala, Rajasthan, or Darjeeling!"
                }
            )

        if req.days < 1 or req.days > 30:
            raise HTTPException(status_code=400, detail="Days must be between 1 and 30")
        if req.budget < 1000:
            raise HTTPException(status_code=400, detail="Minimum budget is ₹1,000")

        weather_data = {}
        try:
            dest_for_weather = req.destination or "india"
            weather_data = await get_weather(dest_for_weather, req.start_date)
        except Exception as e:
            logger.warning(f"Weather fetch failed: {e}")

        # SerpAPI — fetch real TripAdvisor data
        places_context = ""
        serp_hotels = []
        serpapi_key = os.getenv("SERPAPI_KEY", "")
        if serpapi_key:
            try:
                dest_q = (req.destination or destination or "").split(":")[-1].strip().split("→")[-1].strip()
                if dest_q and "best destination" not in dest_q:
                    async with httpx.AsyncClient(timeout=10) as _cl:
                        _r1 = await _cl.get("https://serpapi.com/search.json", params={"engine":"tripadvisor","q":f"hotels {dest_q} India","ssrc":"h","api_key":serpapi_key})
                        _r2 = await _cl.get("https://serpapi.com/search.json", params={"engine":"tripadvisor","q":f"restaurants {dest_q} India","ssrc":"r","api_key":serpapi_key})
                        _r3 = await _cl.get("https://serpapi.com/search.json", params={"engine":"tripadvisor","q":f"things to do {dest_q} India","ssrc":"A","api_key":serpapi_key})
                    _hotels = _r1.json().get("places", _r1.json().get("results",[]))
                    _rests  = _r2.json().get("places", _r2.json().get("results",[]))
                    _attrs  = _r3.json().get("places", _r3.json().get("results",[]))
                    serp_hotels = _hotels
                    logger.info(f"SerpAPI ✅ {dest_q}: hotels={len(_hotels)} rest={len(_rests)} attr={len(_attrs)}")
                    _lines = [f"=== REAL TripAdvisor data for {dest_q} — use these exact names ==="]
                    if _hotels:
                        _lines.append("HOTELS:")
                        for _i,_h in enumerate(_hotels,1):
                            _lines.append(f"{_i}. {_h.get('title','')} ⭐{_h.get('rating','')} ({_h.get('reviews','')} reviews)")
                    if _rests:
                        _lines.append("RESTAURANTS:")
                        for _i,_r in enumerate(_rests,1):
                            _lines.append(f"{_i}. {_r.get('title','')} ⭐{_r.get('rating','')}")
                    if _attrs:
                        _lines.append("TOURIST ATTRACTIONS:")
                        for _i,_a in enumerate(_attrs,1):
                            _lines.append(f"{_i}. {_a.get('title','')} ⭐{_a.get('rating','')}")
                    places_context = "\n".join(_lines)
            except Exception as _se:
                logger.warning(f"SerpAPI skip: {_se}")

        # Fetch LIVE train data via RapidAPI
        train_context = ""
        try:
            from services.railway_service import get_trains_between_stations, build_train_context as _btc
            dest_for_trains = req.destination or destination
            import os as _os
            print(f"RAILWAY API KEY SET: {bool(_os.getenv('RAPIDAPI_KEY'))}")
            if dest_for_trains and req.from_city:
                _live_trains = await get_trains_between_stations(req.from_city, dest_for_trains)
                print(f"LIVE TRAINS FOUND: {len(_live_trains)} for {req.from_city}→{dest_for_trains}")
                if _live_trains:
                    train_context = _btc(req.from_city, dest_for_trains, _live_trains)
                    logger.info(f"Live trains: {len(_live_trains)} for {req.from_city}→{dest_for_trains}")
        except Exception as _te:
            print(f"RAILWAY API ERROR: {type(_te).__name__}: {_te}")
            logger.warning(f"Live train fetch failed: {_te}")

        prompt = build_itinerary_prompt(req, weather_data)
        if places_context:
            prompt = prompt + "\n\n" + places_context
        if train_context:
            prompt = prompt + "\n\n" + train_context
        ai_response = await call_openai(prompt)

        if weather_data:
            ai_response["weather"] = {
                "temperature": weather_data.get("temperature", ""),
                "condition": weather_data.get("condition", ""),
                "humidity": weather_data.get("humidity"),
                "wind": weather_data.get("wind"),
                "pack": weather_data.get("pack", []),
                "season": weather_data.get("season", ""),
                "advisory": weather_data.get("advisory")
            }

        ai_response["from_city"] = req.from_city
        ai_response["days"] = req.days
        ai_response["budget"] = req.budget
        ai_response["plan_tier"] = req.plan_tier.value
        ai_response["trip_type"] = req.trip_type
        ai_response["start_date"] = req.start_date
        ai_response["generated_at"] = datetime.now().isoformat()

        try:
            save_trip({
                "user_id": str(current_user["id"]),
                "title": f"{ai_response.get('destination', 'Trip')} — {req.days} days",
                "from_city": req.from_city,
                "destination": ai_response.get("destination", req.destination or ""),
                "start_date": req.start_date or datetime.now().strftime("%Y-%m-%d"),
                "end_date": req.start_date or datetime.now().strftime("%Y-%m-%d"),
                "days": req.days,
                "budget": req.budget,
                "trip_type": req.trip_type,
                "plan_tier": req.plan_tier.value,
                "transport_mode": req.transport_mode.value,
                "status": "generated",
                "itinerary": ai_response,
                "climate_data": weather_data,
            })
        except Exception as e:
            logger.warning(f"Failed to save trip: {e}")

        ai_response = post_process_itinerary(
            ai_response,
            budget=req.budget or 0,
            from_city=req.from_city or "",
            plan_tier=req.plan_tier.value if req.plan_tier else "silver",
            cached_trains=_live_trains if '_live_trains' in locals() else None
        )
        # Attach real TripAdvisor photos to accommodation
        if places_context:
            try:
                from services.places_serpapi import get_destination_places
                dest_for_photos = req.destination or destination
                places_data = await get_destination_places(dest_for_photos)
                real_hotels = places_data.get("hotels", [])
                for i, hotel in enumerate(ai_response.get("accommodation", [])):
                    if i < len(real_hotels) and real_hotels[i].get("photo_url"):
                        hotel["photo_url"] = real_hotels[i]["photo_url"]
                        hotel["tripadvisor_url"] = real_hotels[i].get("tripadvisor_url", "")
                ai_response["tripadvisor_places"] = {
                    "restaurants": places_data.get("restaurants", []),
                    "attractions": places_data.get("attractions", []),
                }
            except Exception as e:
                logger.warning(f"Photo attach failed: {e}")
        logger.info(f"✓ Generated itinerary for {ai_response.get('destination')}")
        return ai_response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate itinerary: {str(e)}")


@router.post("/suggest-destinations")
async def suggest_destinations(
    req: ItineraryRequest,
    current_user: dict = Depends(get_current_user_from_token)
):
    try:
        month = datetime.now().month
        if req.start_date:
            try:
                month = datetime.strptime(req.start_date, "%Y-%m-%d").month
            except:
                pass

        seasons = {1:"winter",2:"winter",3:"summer",4:"summer",5:"summer",
                   6:"monsoon",7:"monsoon",8:"monsoon",9:"monsoon",
                   10:"post-monsoon",11:"winter",12:"winter"}
        season = seasons.get(month, "winter")
        tier = TIER_CONFIG.get(req.plan_tier.value, TIER_CONFIG["silver"])
        trip_type_str = f"for a {req.trip_type} trip" if req.trip_type else ""
        per_day = req.budget // req.days

        prompt = f"""You are Tripzio's Indian travel expert. Suggest 4 best destinations.

TRAVELER:
- From: {req.from_city}
- Duration: {req.days} days
- Budget: Rs {req.budget} (₹{per_day}/day)
- Type: {trip_type_str}
- Tier: {req.plan_tier.value.upper()} — {tier['vibe']}
- Season: {season}

Rules:
- All 4 must fit Rs {req.budget} budget
- For {req.days} days prefer within 12-15 hours of {req.from_city}
- Make diverse suggestions (not all same type)
- Season appropriate only
- Be specific to {req.from_city} departure

Return ONLY JSON:
{{
  "suggestions": [
    {{
      "name": "Destination",
      "region": "State/Region",
      "type": "Hill Station / Beach / Heritage / Nature / Adventure",
      "why": "One sentence why perfect for this specific traveler",
      "highlight": "Must-do experience",
      "estimated_budget": "₹XX,XXX",
      "budget_fit": "perfect / comfortable / slight stretch",
      "travel_time": "Xhrs total from {req.from_city} (train Xhrs + last mile Xhrs)",
      "best_for": "{req.trip_type or 'All travelers'}",
      "season_rating": "excellent / good / avoid",
      "season_note": "One line about weather in {season}",
      "emoji": "single emoji"
    }}
  ]
}}"""

        ai_response = await call_openai(prompt)
        suggestions = ai_response.get("suggestions", [])

        for suggestion in suggestions:
            try:
                weather = await get_weather(suggestion["name"], req.start_date)
                suggestion["weather_preview"] = {
                    "temp": weather.get("temperature", ""),
                    "condition": weather.get("condition", ""),
                    "season": weather.get("season", "")
                }
            except:
                suggestion["weather_preview"] = None

        return {
            "suggestions": suggestions,
            "from_city": req.from_city,
            "days": req.days,
            "budget": req.budget,
            "plan_tier": req.plan_tier.value,
            "trip_type": req.trip_type,
            "season": season
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Suggestion error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {str(e)}")


@router.get("/history")
async def get_itinerary_history(current_user: dict = Depends(get_current_user_from_token)):
    from database import get_user_trips
    trips = get_user_trips(str(current_user["id"]))
    return {"trips": trips, "total": len(trips)}


@router.get("/history/client/{client_id}")
async def get_client_trip_history(
    client_id: str,
    current_user: dict = Depends(get_current_user_from_token)
):
    """Get all trips for a specific client — agent only"""
    try:
        from database import get_supabase_client
        supabase = get_supabase_client()
        agent_id = current_user.get("email", str(current_user["id"]))
        result = supabase.table("trips") \
            .select("id,title,destination,days,budget,plan_tier,created_at,status,itinerary") \
            .eq("agent_id", agent_id) \
            .eq("client_id", client_id) \
            .order("created_at", desc=True) \
            .execute()
        trips = result.data or []
        # Clean up itinerary data for list view
        for trip in trips:
            if trip.get("itinerary"):
                itin = trip["itinerary"]
                trip["summary"] = itin.get("summary", "")
                trip["from_city"] = itin.get("from_city", "")
                trip["highlights"] = itin.get("highlights", [])[:3]
                del trip["itinerary"]  # don't send full itinerary in list
        return {"trips": trips, "total": len(trips), "client_id": client_id}
    except Exception as e:
        logger.error(f"Client trip history error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/feedback")
async def submit_feedback(
    req: dict,
    current_user: dict = Depends(get_current_user_from_token)
):
    """Submit rating and feedback for a trip"""
    try:
        from database import get_supabase_client
        supabase = get_supabase_client()
        trip_id = req.get("trip_id")
        rating = req.get("rating")
        feedback = req.get("feedback", "")
        if not trip_id or not rating:
            raise HTTPException(status_code=400, detail="trip_id and rating required")
        # Store feedback
        supabase.table("trip_feedback").upsert({
            "trip_id": trip_id,
            "user_id": str(current_user["id"]),
            "user_email": current_user.get("email",""),
            "rating": int(rating),
            "feedback": feedback,
            "destination": req.get("destination",""),
            "created_at": datetime.now().isoformat()
        }).execute()
        return {"message": "Thank you for your feedback! 🙏"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Feedback error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── CUSTOM PLAN ENDPOINT ──────────────────────
class CustomPlanRequest(BaseModel):
    free_text: str
    start_date: Optional[str] = None

@router.post("/generate-custom")
async def generate_custom_itinerary(
    req: CustomPlanRequest,
    current_user: dict = Depends(get_current_user_from_token)
):
    try:
        if len(req.free_text.strip()) < 10:
            raise HTTPException(status_code=400, detail="Please describe your trip in more detail")

        # ── Layer 1: India-only validation ────────────────────
        is_intl, detected = is_international_destination(req.free_text)
        if is_intl:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "INTERNATIONAL_DESTINATION",
                    "message": f"Tripzio specialises in incredible Indian destinations. International travel planning is coming soon! Detected: '{detected}'",
                    "detected_keyword": detected,
                    "suggestion": "Try destinations like Goa, Manali, Kerala, Rajasthan, or Darjeeling!"
                }
            )

        logger.info(f"Custom plan request from {current_user['email']}: {req.free_text[:80]}...")

        prompt = f"""You are Tripzio's AI travel expert for India. A user has described their dream trip in natural language. It may be in Hindi, English, or a mix.

USER'S REQUEST:
"{req.free_text}"

Your tasks:
1. Parse the user's request to extract:
   - Departure city (if mentioned)
   - Destinations and days per destination
   - Total budget (if mentioned)
   - Trip type (if mentioned)
   - Travel dates (if mentioned)
   - Plan tier based on budget
   - Any special requirements

2. Build a complete, detailed itinerary for this trip

3. For multi-destination trips (circuits), generate day plans for ALL destinations in sequence

4. Use REAL train names and numbers for transport between cities
   Include complete journey time (train + last mile)

5. Suggest real named hotels matching the implied budget

Return ONLY valid JSON in this format:
{{
  "destination": "Main destination or 'Circuit: City1 → City2 → City3'",
  "from_city": "departure city or 'Not specified'",
  "days": total_days_as_number,
  "budget": budget_as_number_or_0,
  "plan_tier": "bronze/silver/gold/diamond/platinum",
  "trip_type": "trip type or null",
  "start_date": null,
  "summary": "2-3 line engaging summary of this specific trip",
  "highlights": ["highlight1", "highlight2", "highlight3", "highlight4"],
  "is_circuit": true_or_false,
  "circuit_legs": [
    {{"city": "City1", "days": 2, "highlights": ["thing1", "thing2"]}},
    {{"city": "City2", "days": 3, "highlights": ["thing1", "thing2"]}}
  ],
  "transport_options": [
    {{
      "mode": "Recommended Route",
      "description": "specific route with real train names",
      "estimated_cost": "₹X,XXX per person",
      "duration": "Total Xhrs (breakdown per leg)",
      "details": ["step1 with train name/number", "step2", "step3"],
      "booking_tip": "practical tip"
    }},
    {{
      "mode": "Alternative Route",
      "description": "alternative option",
      "estimated_cost": "₹X,XXX per person",
      "duration": "Total Xhrs",
      "details": ["step1", "step2"],
      "booking_tip": "tip"
    }}
  ],
  "local_transport": {{
    "options": [
      {{
        "name": "transport name",
        "type": "type",
        "route": "from → to",
        "cost": "₹XX per person",
        "duration": "X hours",
        "tip": "practical tip",
        "best_for": "use case"
      }}
    ],
    "taxi_apps": ["app names"],
    "note": "important note"
  }},
  "day_plans": [
    {{
      "day": 1,
      "title": "City Name — Day title",
      "morning": "detailed plan",
      "afternoon": "detailed plan",
      "evening": "detailed plan",
      "meals": "specific meal recommendations",
      "stay": "specific hotel with area",
      "tips": "local tip",
      "estimated_cost": "₹X,XXX"
    }}
  ],
  "accommodation": [
    {{
      "name": "hotel name",
      "type": "type",
      "area": "area",
      "why": "why it suits",
      "price_range": "₹X,XXX - ₹X,XXX",
      "rating": "4.2",
      "highlight": "standout feature"
    }}
  ],
  "places_to_visit": [
    {{
      "name": "specific place name",
      "type": "Viewpoint/Temple/Beach/Market/Nature/Heritage/Museum/Adventure/Waterfall",
      "description": "2 engaging lines — what makes it special",
      "entry_fee": "₹XX or Free",
      "best_time": "Early Morning/Morning/Afternoon/Evening/Anytime",
      "duration": "X hours",
      "must_see": true/false
    }}
  ],
  PLACES RULE: Minimum 15 entries. Include EVERY place from day_plans PLUS more. All categories covered.
  "things_to_do": [
    {{"category": "Adventure", "activities": ["activity — ₹XXX"]}},
    {{"category": "Food & Dining", "activities": ["dish", "restaurant"]}},
    {{"category": "Shopping", "activities": ["what to buy"]}}
  ],
  "packing_list": ["item1", "item2", "item3", "item4", "item5", "item6"],
  "local_tips": ["tip1", "tip2", "tip3", "tip4", "tip5"],
  "permit_info": ["permit if needed, else null"],
  "cost_breakdown": {{
    "transport": "₹X,XXX",
    "accommodation": "₹X,XXX",
    "food": "₹X,XXX",
    "activities": "₹X,XXX",
    "miscellaneous": "₹X,XXX",
    "total": "₹X,XXX"
  }},
  "alternatives": [
    {{"name": "alt1", "reason": "why", "estimated_budget": "₹X,XXX", "highlight": "unique thing"}},
    {{"name": "alt2", "reason": "why", "estimated_budget": "₹X,XXX", "highlight": "unique thing"}}
  ],
  "parsed_from": "Brief summary of what you understood from the user's request"
}}

RULES:
- For multi-destination/circuit trips, day_plans must cover ALL cities in sequence
- Day titles must mention the city e.g. "Shimla Day 1 — Arrival & Mall Road"
- Use real hotel names, real train names
- If budget not mentioned, estimate reasonable amount for the trip type
- If departure city not mentioned, use most logical city
- Return ONLY valid JSON"""

        # SerpAPI — fetch real TripAdvisor data
        cust_serp_context = ""
        _skey = os.getenv("SERPAPI_KEY", "")
        if _skey:
            try:
                print(f"SERP SCAN: {req.free_text[:60]}")
                # Dynamic extraction — no hardcoded city list
                _words = req.free_text.lower().replace(',', ' ').replace('—', ' ').replace('→', ' ').split()
                _from_city = ""
                _all_words = []
                _skip_next = False
                for _w in _words:
                    if _w in ('from', 'se'):
                        _skip_next = True
                        continue
                    if _skip_next:
                        _fc = _w.strip('.,')
                        if _fc.isalpha(): _from_city = _fc
                        _skip_next = False
                        continue
                    _clean = _w.strip('.,!?-')
                    if len(_clean) >= 3 and _clean.isalpha():
                        _all_words.append(_clean)
                _stop = {'din','day','days','trip','tour','plan','budget','hajar','thousand','and','the','for','with','from','via','to','ka','ki','ke','mein','tak','se','aur','start','date','jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec','january','february','march','april','june','july','august','september','october','november','december','adventure','couple','family','solo','group','honeymoon','circuit','road','night','nights','silver','gold','bronze','diamond','platinum'}
                _big_cities = {'kolkata','mumbai','delhi','bangalore','bengaluru','chennai','hyderabad','pune','ahmedabad','surat','lucknow','nagpur','indore','bhopal','patna','ranchi','guwahati','jaipur','kanpur','chandigarh'}
                if _from_city:
                    _big_cities.add(_from_city)
                _dest_list = [w for w in _all_words if w not in _stop and w not in _big_cities and len(w) >= 4 and w.isalpha()]
                if not _dest_list:
                    _dest_list = [w for w in _all_words if w not in _stop and len(w) >= 4 and w.isalpha()]
                print(f"SERP FOUND: {_dest_list[:5]}")
                if _dest_list:
                    # Fetch for each destination separately (circuit support)
                    _all_city_hotels = {}  # city -> hotels list
                    _all_ctx = []
                    for _dname in [d.title() for d in _dest_list]:
                        print(f"SERP DEST: {_dname}")
                        # Check cache first — saves SerpAPI quota
                        _cached_h = _serp_cache_get(f"{_dname}_h")
                        _cached_r = _serp_cache_get(f"{_dname}_r")
                        _cached_a = _serp_cache_get(f"{_dname}_a")
                        if _cached_h is not None:
                            _h, _r, _a = _cached_h, _cached_r or [], _cached_a or []
                            print(f"SERP CACHE HIT: {_dname} h={len(_h)}")
                        else:
                            async with httpx.AsyncClient(timeout=10) as _acl:
                                _rh = await _acl.get("https://serpapi.com/search.json", params={"engine":"tripadvisor","q":f"hotels {_dname} India","ssrc":"h","api_key":_skey})
                                _rr = await _acl.get("https://serpapi.com/search.json", params={"engine":"tripadvisor","q":f"restaurants {_dname} India","ssrc":"r","api_key":_skey})
                                _ra = await _acl.get("https://serpapi.com/search.json", params={"engine":"tripadvisor","q":f"things to do {_dname} India","ssrc":"A","api_key":_skey})
                            _rh_j = _rh.json()
                            _h = _rh_j.get("places", _rh_j.get("results", []))
                            _r = _rr.json().get("places", _rr.json().get("results", []))
                            _a = _ra.json().get("places", _ra.json().get("results", []))
                            _serp_cache_set(f"{_dname}_h", _h)
                            _serp_cache_set(f"{_dname}_r", _r)
                            _serp_cache_set(f"{_dname}_a", _a)
                            print(f"SERP RESULT: {_dname} h={len(_h)} r={len(_r)} a={len(_a)}")
                        _all_city_hotels[_dname] = _h
                        _ctx = [f"=== REAL TripAdvisor data for {_dname} ==="]
                        if _h: _ctx += ["HOTELS:"] + [f"{i}. {x.get('title',x.get('name',''))} ⭐{x.get('rating','')}" for i,x in enumerate(_h,1)]
                        if _r: _ctx += ["RESTAURANTS:"] + [f"{i}. {x.get('title',x.get('name',''))} ⭐{x.get('rating','')}" for i,x in enumerate(_r,1)]
                        if _a: _ctx += ["ATTRACTIONS:"] + [f"{i}. {x.get('title',x.get('name',''))} ⭐{x.get('rating','')}" for i,x in enumerate(_a,1)]
                        _all_ctx.append("\n".join(_ctx))
                    cust_serp_context = "\n\n".join(_all_ctx)
                    prompt = prompt + "\n\n" + cust_serp_context
                    # Fetch live trains
                    try:
                        from services.railway_service import get_trains_between_stations, build_train_context as _btc2
                        if _from_city and _dest_list:
                            _ltrains = await get_trains_between_stations(_from_city, _dest_list[0])
                            if _ltrains:
                                _tctx = _btc2(_from_city, _dest_list[0], _ltrains)
                                if _tctx:
                                    prompt = prompt + "\n\n" + _tctx
                                    logger.info(f"Live trains custom: {len(_ltrains)} trains {_from_city}→{_dest_list[0]}")
                    except Exception as _lte:
                        logger.warning(f"Live train custom skip: {_lte}")
                    # Store for photo attachment later
                    _h = _all_city_hotels.get(_dest_list[0].lower(), [])
            except Exception as _cse:
                print(f"SERPAPI ERROR: {type(_cse).__name__}: {_cse}")
                logger.error(f"SerpAPI custom FAILED: {type(_cse).__name__}: {_cse}")
        ai_response = await call_openai(prompt)

        # Try to get weather for main destination
        try:
            main_dest = ai_response.get("destination", "").split(":")[0].replace("Circuit", "").strip()
            if main_dest and "→" in main_dest:
                main_dest = main_dest.split("→")[0].strip()
            if main_dest:
                weather = await get_weather(main_dest)
                ai_response["weather"] = {
                    "temperature": weather.get("temperature", ""),
                    "condition": weather.get("condition", ""),
                    "humidity": weather.get("humidity"),
                    "wind": weather.get("wind"),
                    "pack": weather.get("pack", []),
                    "season": weather.get("season", ""),
                    "advisory": weather.get("advisory")
                }
        except:
            pass

        ai_response["generated_at"] = datetime.now().isoformat()
        ai_response["source"] = "custom_plan"

        # Save to DB
        try:
            save_trip({
                "user_id": str(current_user["id"]),
                "title": ai_response.get("destination", "Custom Trip"),
                "from_city": ai_response.get("from_city", ""),
                "destination": ai_response.get("destination", ""),
                "start_date": datetime.now().strftime("%Y-%m-%d"),
                "end_date": datetime.now().strftime("%Y-%m-%d"),
                "days": ai_response.get("days", 0),
                "budget": ai_response.get("budget", 0),
                "trip_type": ai_response.get("trip_type"),
                "plan_tier": ai_response.get("plan_tier", "silver"),
                "transport_mode": "balanced",
                "status": "generated",
                "itinerary": ai_response,
                "climate_data": {},
            })
        except Exception as e:
            logger.warning(f"Save failed: {e}")

        # Inject start_date so FestivalAlert fires on result page
        if req.start_date:
            ai_response['start_date'] = req.start_date

        ai_response = post_process_itinerary(
            ai_response,
            budget=ai_response.get("budget", 0),
            from_city=ai_response.get("from_city", ""),
            plan_tier=ai_response.get("plan_tier", "silver"),
            cached_trains=_ltrains if '_ltrains' in locals() else None
        )

        # Store per-city hotels in response — each city gets its own list
        try:
            if _all_city_hotels:
                def fmt_hotel(h, city):
                    return {
                        "name":            h.get("title", h.get("name", "")),
                        "type":            h.get("place_type", "Hotel"),
                        "area":            h.get("location", city.title()),
                        "city":            city.title(),
                        "rating":          str(h.get("rating", "")),
                        "reviews":         h.get("reviews", 0),
                        "price_range":     h.get("price", ""),
                        "photo_url":       h.get("thumbnail", ""),
                        "tripadvisor_url": h.get("link", ""),
                        "maps_url":        f"https://www.google.com/maps/search/{h.get('title','').replace(' ','+')}+{city.title()}",
                        "why":             h.get("highlighted_review", {}).get("text", "") if isinstance(h.get("highlighted_review"), dict) else "",
                        "highlight":       h.get("place_type", ""),
                        "recommended":     False,
                        "tier":            "recommended",
                    }

                # Per-city hotels dict — key is city name
                city_hotels_formatted = {}
                for city_key, city_hotels in _all_city_hotels.items():
                    formatted = [fmt_hotel(h, city_key) for h in city_hotels]
                    if formatted:
                        formatted[0]["recommended"] = True  # First = recommended
                    city_hotels_formatted[city_key.title()] = formatted

                # Store SerpAPI hotels per city — for Hotels tab display
                ai_response["city_hotels"] = city_hotels_formatted

                # Keep AI accommodation INTACT — used for tier upgrade feature
                # Do NOT override ai_response["accommodation"]

                total = sum(len(v) for v in city_hotels_formatted.values())
                print(f"SerpAPI: {total} hotels across {list(city_hotels_formatted.keys())}")
                print(f"CITY_HOTELS_KEYS: {list(city_hotels_formatted.keys())}")
                print(f"AI_ACCOM_KEYS: {[h.get('name','') for h in ai_response.get('accommodation',[])[:3]]}")
        except Exception as _pe:
            print(f"Hotel store error: {_pe}")

        logger.info(f"✓ Custom plan generated: {ai_response.get('destination')}")
        return ai_response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Custom plan error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate custom plan: {str(e)}")
