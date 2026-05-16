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


# ── Prompt validation — detect vague/invalid prompts ──────────
INDIA_LOCATIONS = {
    # Major cities
    "delhi","mumbai","kolkata","chennai","bangalore","bengaluru","hyderabad","pune","ahmedabad",
    "jaipur","lucknow","kanpur","nagpur","indore","bhopal","patna","vadodara","surat","rajkot",
    # Popular destinations
    "goa","manali","shimla","dharamshala","kasol","spiti","mussoorie","nainital","rishikesh",
    "haridwar","dehradun","darjeeling","gangtok","sikkim","leh","ladakh","srinagar","jammu",
    "amritsar","chandigarh","agra","varanasi","allahabad","prayagraj","ayodhya","mathura",
    "vrindavan","jaisalmer","jodhpur","udaipur","pushkar","ajmer","bikaner","mount abu",
    "kochi","thiruvananthapuram","munnar","alleppey","alappuzha","thrissur","kozhikode",
    "mysore","mysuru","hampi","coorg","ooty","kodaikanal","madurai","pondicherry","puducherry",
    "andaman","port blair","lakshadweep","daman","diu","puri","bhubaneswar","konark",
    "kaziranga","guwahati","shillong","cherrapunji","tawang","ziro","majuli","imphal",
    "kohima","aizawl","agartala","raipur","jagdalpur","bhopal","khajuraho","orchha",
    "tirupati","hyderabad","vijayawada","visakhapatnam","warangal","lonavala","nashik",
    "aurangabad","shirdi","mahabaleshwar","kolhapur","solapur","nagpur","alibag","tarkarli",
    # States and regions
    "rajasthan","kerala","himachal","uttarakhand","karnataka","tamil nadu","maharashtra",
    "gujarat","punjab","haryana","up","uttar pradesh","mp","madhya pradesh","odisha",
    "west bengal","assam","meghalaya","nagaland","manipur","mizoram","tripura","arunachal",
    "jharkhand","chhattisgarh","andhra pradesh","telangana","bihar","northeast","india",
}

import re as _re

def validate_custom_prompt(text: str) -> tuple[bool, str]:
    """
    Validates custom plan prompt:
    1. At least one Indian destination
    2. Travel intent keywords
    3. Invalid date detection (45/18/2024, Feb 30 etc)
    4. Source city validation if mentioned
    Returns (is_valid, error_message)
    """
    if not text or len(text.strip()) < 10:
        return False, "Please describe your trip in more detail"

    t = text.lower()

    # ── 1. Invalid date detection ──────────────────────────────
    # Detect numeric dates like dd/mm/yyyy or dd-mm-yyyy
    date_patterns = _re.findall(r"\b(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2,4})\b", t)
    for day_s, mon_s, yr_s in date_patterns:
        day, mon = int(day_s), int(mon_s)
        yr = int(yr_s) if len(yr_s) == 4 else int("20" + yr_s)
        if mon < 1 or mon > 12:
            return False, f"Invalid date detected — month '{mon_s}' does not exist. Please use a valid date (DD/MM/YYYY)."
        max_days = [0,31,29,31,30,31,30,31,31,30,31,30,31]
        if day < 1 or day > max_days[mon]:
            return False, f"Invalid date detected — {day}/{mon} does not exist. Please use a valid travel date."
        if yr < 2024 or yr > 2030:
            return False, f"Invalid year '{yr}' detected. Please use a future travel year (2025-2030)."

    # Detect written dates like "Feb 30", "January 45", "March 32"
    MONTH_DAYS = {
        "january":31,"jan":31,"february":29,"feb":29,"march":31,"mar":31,
        "april":30,"apr":30,"may":31,"june":30,"jun":30,"july":31,"jul":31,
        "august":31,"aug":31,"september":30,"sep":30,"october":31,"oct":31,
        "november":30,"nov":30,"december":31,"dec":31,
    }
    for month, max_d in MONTH_DAYS.items():
        # "March 45" or "45 March"
        m1 = _re.search(rf"\b{month}\s+(\d{{1,2}})\b", t)
        m2 = _re.search(rf"\b(\d{{1,2}})\s+{month}\b", t)
        for m in [m1, m2]:
            if m:
                day = int(m.group(1))
                if day > max_d:
                    return False, f"Invalid date — {month.capitalize()} {day} does not exist. Please use a valid travel date."
                if day < 1:
                    return False, f"Invalid date detected. Please use a valid travel date."

    # ── 2. Check for at least one India location ───────────────
    has_location = any(loc in t for loc in INDIA_LOCATIONS)

    # ── 3. Travel intent keywords ──────────────────────────────
    TRAVEL_KEYWORDS = {
        "trip","travel","visit","tour","plan","days","din","night","budget","hajar","thousand",
        "honeymoon","family","couple","solo","adventure","holiday","vacation","weekend",
        "circuit","route","from","se","jana","jaana","jao","ghoomna","explore","ke liye",
    }
    has_intent = any(kw in t for kw in TRAVEL_KEYWORDS)

    # ── 4. Meaningful content check ────────────────────────────
    words = t.split()
    meaningful_words = [w for w in words if len(w) >= 3]
    if len(meaningful_words) < 2:
        return False, "Please provide more details — destination, duration, and budget help us plan better."

    if not has_location:
        return False, "Please mention a destination in India — e.g. Goa, Manali, Kerala, Rajasthan, Darjeeling, Leh etc."

    if not has_intent:
        return False, "Please describe your trip — add details like number of days, budget, or trip type."

    # ── 5. Source city hint (optional — warn not block) ────────
    # We don't block if source is missing — AI can infer
    # But if source is clearly invalid (just numbers, gibberish), warn
    FROM_PATTERNS = [
        _re.search(r"from\s+([a-zA-Z\s]{3,25})(?:,|\.|$|\s)", t),
        _re.search(r"([a-zA-Z\s]{3,25})\s+se", t),
    ]
    for fp in FROM_PATTERNS:
        if fp:
            source = fp.group(1).strip()
            # Check if source is all numbers or gibberish
            if _re.match(r"^[0-9]+$", source):
                return False, f"'{source}' doesn't look like a valid source city. Please mention where you're travelling from — e.g. 'from Mumbai' or 'Delhi se'."

    return True, ""


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
      "mode": "Cheapest Route",
      "description": "e.g. Kolkata → NJP by Darjeeling Mail + Shared Jeep to Darjeeling",
      "estimated_cost": "₹X,XXX per person",
      "duration": "Total Xhrs (Train Xhrs + Last mile Xhrs)",
      "details": [
        "Board Darjeeling Mail 12343 from Howrah Station at 10:05 PM",
        "Arrive New Jalpaiguri (NJP) at 8:12 AM (10hr 7min)",
        "Take shared jeep from NJP to Darjeeling (3hrs, ₹200/person)",
        "Total journey: ~13 hours"
      ],
      "booking_tip": "Book train on IRCTC 60 days in advance. Sleeper class fills fast."
    }},
    {{
      "mode": "Balanced Route",
      "description": "AC train + reserved taxi",
      "estimated_cost": "₹X,XXX per person",
      "duration": "Total Xhrs",
      "details": ["step1", "step2", "step3"],
      "booking_tip": "booking tip"
    }},
    {{
      "mode": "Fastest Route",
      "description": "flight or premium option",
      "estimated_cost": "₹X,XXX per person",
      "duration": "Total Xhrs",
      "details": ["step1", "step2", "step3"],
      "booking_tip": "booking tip"
    }}
  ],
  "local_transport": {{
    "options": [
      {{
        "name": "specific transport name e.g. Toy Train, Shared Jeep, Auto",
        "type": "Shared Jeep / Toy Train / Auto / Cable Car / Boat",
        "route": "From → To",
        "cost": "₹XX per person",
        "duration": "X hours/minutes",
        "tip": "practical tip",
        "best_for": "sightseeing / transfers / adventure"
      }}
    ],
    "taxi_apps": ["Ola", "local app if any"],
    "note": "important local transport note"
  }},
  "day_plans": [
    {{
      "day": 1,
      "title": "Day title",
      "morning": "detailed plan with specific place names",
      "afternoon": "detailed afternoon plan",
      "evening": "detailed evening plan",
      "meals": "specific restaurant names for breakfast, lunch, dinner",
      "stay": "specific hotel name with area",
      "tips": "one practical local tip",
      "estimated_cost": "₹X,XXX"
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
      "name": "Place name",
      "type": "Temple/Market/Nature/Museum",
      "description": "2 line description",
      "entry_fee": "₹XX or Free",
      "best_time": "Morning/Evening",
      "duration": "1-2 hours"
    }}
  ],
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
                "model": "gpt-4o-mini",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are Tripzio's expert Indian travel AI. Generate detailed, accurate, budget-appropriate travel itineraries. Always use real train names, numbers and complete journey times. Always respond with valid JSON only."
                    },
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 4000,
                "response_format": {"type": "json_object"}
            }
        )

        if response.status_code != 200:
            error_detail = response.json().get("error", {}).get("message", "OpenAI API error")
            logger.error(f"OpenAI error: {error_detail}")
            raise HTTPException(status_code=503, detail=f"AI service error: {error_detail}")

        result = response.json()
        content = result["choices"][0]["message"]["content"]
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            raise HTTPException(status_code=500, detail="Failed to parse AI response")


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

        prompt = build_itinerary_prompt(req, weather_data)
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

        # ── Layer 1B: Validate prompt has destination + intent ─
        is_valid, validation_msg = validate_custom_prompt(req.free_text)
        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "INVALID_PROMPT",
                    "message": validation_msg,
                    "suggestion": "Try: 'Goa 5 days from Mumbai, budget 25000, couple trip' or 'Manali circuit March mein, 7 din, solo backpacker'"
                }
            )

        # ── Layer 2: India-only validation ────────────────────
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
      "name": "place",
      "type": "type",
      "description": "2 lines",
      "entry_fee": "₹XX or Free",
      "best_time": "Morning/Evening",
      "duration": "X hours"
    }}
  ],
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
- CRITICAL: If the request does not mention any real Indian destination or is too vague/gibberish, return:
  {{"error": "INVALID_PROMPT", "message": "Please mention a specific destination in India and trip details"}}
- CRITICAL: If date mentioned is clearly invalid (e.g. Feb 30, Jan 45), return:
  {{"error": "INVALID_DATE", "message": "Please provide a valid travel date"}}
- CRITICAL: Only plan trips to real places in India — if destination is fictional/nonsensical, return the error JSON
- Return ONLY valid JSON"""

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

        logger.info(f"✓ Custom plan generated: {ai_response.get('destination')}")
        return ai_response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Custom plan error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate custom plan: {str(e)}")
