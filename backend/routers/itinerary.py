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
import os
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

_WORD_BOUNDARY_KEYWORDS = {
    "uk","us","eu","rio","iran","oman","mali","peru","laos","togo","chad",
    "cuba","iraq","syria","ghana","milan","rome","vienna","geneva","zurich",
    "korea","china","japan","spain","egypt","kenya","uae","abu","bali",
}

def is_international_destination(destination: str, from_city: str = ""):
    """
    Detects international destinations in text.
    Uses word boundary for short keywords to avoid false positives
    e.g. 'uk' in 'Dzukou', 'us' in 'Munsiyari'
    """
    import re as _re
    combined = (destination + " " + from_city).lower()
    for keyword in INTERNATIONAL_KEYWORDS:
        if keyword in _WORD_BOUNDARY_KEYWORDS or len(keyword) <= 3:
            if _re.search(r'\b' + _re.escape(keyword) + r'\b', combined):
                return True, keyword
        else:
            if keyword in combined:
                return True, keyword
    return False, ""


INDIA_LOCATIONS = {
    "delhi","mumbai","kolkata","chennai","bangalore","bengaluru","hyderabad","pune","ahmedabad",
    "goa","manali","shimla","dharamshala","kasol","spiti","mussoorie","nainital","rishikesh",
    "haridwar","darjeeling","gangtok","leh","ladakh","srinagar","jammu","amritsar","chandigarh",
    "agra","varanasi","allahabad","prayagraj","ayodhya","mathura","vrindavan","jaisalmer",
    "jodhpur","udaipur","pushkar","ajmer","bikaner","kochi","thiruvananthapuram","munnar",
    "alleppey","alappuzha","thrissur","kozhikode","mysore","mysuru","hampi","coorg","ooty",
    "kodaikanal","andaman","port blair","lakshadweep","daman","diu","puri","bhubaneswar",
    "kaziranga","guwahati","shillong","cherrapunji","tawang","ziro","majuli","imphal",
    "kohima","aizawl","agartala","raipur","jagdalpur","khajuraho","orchha","tirupati",
    "lonavala","nashik","aurangabad","shirdi","mahabaleshwar","alibag","tarkarli",
    "rajasthan","kerala","himachal","uttarakhand","karnataka","tamil nadu","maharashtra",
    "gujarat","punjab","haryana","up","uttar pradesh","mp","madhya pradesh","odisha",
    "west bengal","assam","meghalaya","nagaland","manipur","mizoram","tripura","arunachal",
    "jharkhand","chhattisgarh","andhra pradesh","telangana","bihar","northeast","india",
    "sikkim","pondicherry","puducherry","kalimpong","kurseong","mirik","siliguri",
    "pelling","ravangla","lachung","rumtek","tashiding","yuksom","dzukou","loktak",
    "vantawng","dawki","mawlynnong","nongriat","netarhat","deoghar","phawngpui",
    "dzukou valley","loktak lake","sela pass","bumla pass","dzongri","chopta",
    "kedarnath","badrinath","gangotri","yamunotri","valley of flowers","hemkund",
}

def validate_custom_prompt(text: str) -> tuple:
    if not text or len(text.strip()) < 10:
        return False, "Please describe your trip in more detail"
    t = text.lower()
    import re as _re
    VALID_MONTHS = {
        'jan','january','feb','february','mar','march','apr','april',
        'may','jun','june','jul','july','aug','august','sep','september',
        'oct','october','nov','november','dec','december'
    }
    # Invalid numeric dates
    for m in _re.findall(r'\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b', t):
        day, mon = int(m[0]), int(m[1])
        yr = int(m[2]) if len(m[2]) == 4 else int("20" + m[2])
        if mon < 1 or mon > 12:
            return False, f"Invalid date — month \"{m[1]}\" doesn't exist (use 1-12)"
        max_days = [0,31,29,31,30,31,30,31,31,30,31,30,31]
        if day < 1 or day > max_days[mon]:
            return False, f"Invalid date — {m[0]}/{m[1]} doesn't exist"
        if yr > 2035 or (yr > 2000 and yr < 2025):
            return False, f"Invalid year \"{m[2]}\" — use 2025-2035"
    # Ordinal + invalid month
    for om in _re.findall(r'\b(\d{1,2})(?:st|nd|rd|th)\s+([a-z]{2,15})\b', t):
        if om[1] not in VALID_MONTHS:
            return False, f"\"{om[1].upper()}\" is not a valid month. Did you mean Jan, Feb, Mar... Dec?"
    # Written invalid dates
    month_days = {
        'january':31,'jan':31,'february':29,'feb':29,'march':31,'mar':31,
        'april':30,'apr':30,'may':31,'june':30,'jun':30,'july':31,'jul':31,
        'august':31,'aug':31,'september':30,'sep':30,'october':31,'oct':31,
        'november':30,'nov':30,'december':31,'dec':31
    }
    for mon, max_d in month_days.items():
        m1 = _re.search(rf'\b{mon}\s+(\d{{1,2}})\b', t, _re.I)
        m2 = _re.search(rf'\b(\d{{1,2}})(?:st|nd|rd|th)?\s+{mon}\b', t, _re.I)
        for m in [m1, m2]:
            if m:
                day = int(m.group(1))
                if day > max_d:
                    return False, f"Invalid date — {mon.capitalize()} {day} doesn't exist"
    # Year after month context
    MONTH_RE = r'(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
    for pattern in [MONTH_RE + r'\s+(\d{5,})', r'\b\d{1,2}(?:st|nd|rd|th)\s+\w+\s+(\d{5,})']:
        m = _re.search(pattern, t, _re.I)
        if m:
            yr = int(m.group(len(m.groups())))
            if yr > 2035:
                return False, f"\"{yr}\" doesn't look like a valid travel year. Use 2025-2035."
    # Check destination
    has_location = any(loc in t for loc in INDIA_LOCATIONS)
    TRAVEL_KEYWORDS = {
        "trip","travel","visit","tour","plan","days","din","night","budget","hajar",
        "honeymoon","family","couple","solo","adventure","holiday","vacation","weekend",
        "circuit","route","from","se","jana","jaana","explore",
    }
    has_intent = any(kw in t for kw in TRAVEL_KEYWORDS)
    meaningful = [w for w in t.split() if len(w) >= 3]
    if len(meaningful) < 2:
        return False, "Please provide more details about your trip"
    if not has_location:
        return False, "Please mention a destination in India — e.g. Goa, Manali, Kerala, Darjeeling etc."
    if not has_intent:
        return False, "Please describe your trip — add details like days, budget, or trip type"
    # Source city check
    SKIP = {'the','and','or','for','with','my','our','a','an','this','that',
            'trip','tour','plan','days','budget','here','there','home','solo','couple','family'}
    from_m = _re.search(r'(?:from|starting from)\s+([a-zA-Z]{3,25})(?:\s|,|$|\.)', t, _re.I)
    se_m = _re.search(r'([a-zA-Z]{3,25})\s+se\b', t, _re.I)
    for match in [from_m, se_m]:
        if match:
            word = match.group(1).strip().lower()
            if word not in SKIP and _re.search(r'\d', word):
                return False, f"\"{match.group(1)}\" doesn't look like a valid source city"
            if word not in SKIP and len(word) >= 3 and word not in INDIA_LOCATIONS:
                return False, f"\"{match.group(1)}\" doesn't seem to be a valid Indian city"
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
      "mode": "Recommended",
      "type": "Train/Bus/Flight/Ferry — pick best for this route",
      "operator": "Real operator name — train number+name OR Redbus/MSRTC/WBTC/KSRTC/HRTC/SNT",
      "description": "specific route with real names",
      "estimated_cost": "₹X,XXX per person",
      "duration": "Total Xhrs",
      "details": ["step 1 with real operator name", "step 2", "step 3"],
      "booking_tip": "Book on IRCTC/Redbus/Ola app",
      "best_for": "Most travelers"
    }},
    {{
      "mode": "Budget Option",
      "type": "Government Bus OR Sleeper Train",
      "operator": "WBTC/MSRTC/KSRTC/HRTC/ASTC/SNT/RSRTC — use correct state operator",
      "description": "cheapest way",
      "estimated_cost": "₹X,XXX per person",
      "duration": "Total Xhrs",
      "details": ["step 1", "step 2"],
      "booking_tip": "Book at state bus stand or redbus.in",
      "best_for": "Budget travelers"
    }},
    {{
      "mode": "Private AC Bus",
      "type": "Volvo/AC Sleeper/Semi-sleeper Bus",
      "operator": "Redbus/Greenline/SRS/NEETA/Orange/VRL/Dreamliner — real operators for this route",
      "description": "comfortable overnight or day bus",
      "estimated_cost": "₹X,XXX per person",
      "duration": "Total Xhrs",
      "details": ["step 1", "step 2"],
      "booking_tip": "Book on redbus.in or abhibus.com 1 week ahead",
      "best_for": "Couples, families wanting comfort"
    }},
    {{
      "mode": "Private Taxi / Self Drive",
      "type": "Outstation Cab / Self-drive",
      "operator": "Ola Outstation / Uber Intercity / Zoomcar / Revv / local taxi",
      "description": "door to door, flexible timing",
      "estimated_cost": "₹X,XXX total for car (not per person)",
      "duration": "Total Xhrs by road",
      "details": ["Book Ola Outstation/Uber intercity from app", "Pick up from home/hotel"],
      "booking_tip": "Book on Ola or Uber app 1 day ahead. Split cost among group.",
      "best_for": "Families, groups, those with luggage"
    }},
    {{
      "mode": "Fastest Option",
      "type": "Flight (if >500km) / Fastest Train / Helicopter (if available)",
      "operator": "IndiGo/Air India/SpiceJet OR fastest train name+number",
      "description": "fastest way to reach",
      "estimated_cost": "₹X,XXX per person",
      "duration": "Total Xhrs",
      "details": ["step 1", "step 2"],
      "booking_tip": "Book on MakeMyTrip/Cleartrip/IRCTC",
      "best_for": "Those short on time"
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
      "name": "Best recommended hotel for this budget",
      "type": "Hotel / Resort / Homestay",
      "area": "specific area",
      "why": "why best for this budget, trip type, group size",
      "price_range": "₹X,XXX - ₹X,XXX per night",
      "rating": "4.X",
      "highlight": "standout feature",
      "recommended": true,
      "tier": "recommended"
    }},
    {{
      "name": "Budget option — save money here",
      "type": "Hotel / Guesthouse",
      "area": "area",
      "why": "good basic option if wanting to save",
      "price_range": "₹X,XXX per night",
      "rating": "3.X",
      "highlight": "clean, basic, good location",
      "recommended": false,
      "tier": "budget"
    }},
    {{
      "name": "Premium upgrade option",
      "type": "Resort / Luxury Hotel",
      "area": "best area",
      "why": "splurge option — best amenities, views, experience",
      "price_range": "₹X,XXX - ₹X,XXX per night",
      "rating": "4.X",
      "highlight": "pool/spa/beachfront/heritage",
      "recommended": false,
      "tier": "luxury"
    }},
    {{
      "name": "Alternative same tier as recommended",
      "type": "Hotel / Resort / Boutique",
      "area": "different area of destination",
      "why": "good alternative if first choice full — different location/style",
      "price_range": "₹X,XXX per night",
      "rating": "4.X",
      "highlight": "different standout feature",
      "recommended": false,
      "tier": "alternative"
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
      "activities": ["activity 1 — ₹XXX", "activity 2 — ₹XXX", "activity 3 — ₹XXX"]
    }},
    {{
      "category": "Food & Dining",
      "activities": ["Restaurant 1 — specialty dish — price range",
                     "Restaurant 2 — local cuisine — price range",
                     "Restaurant 3 — seafood/specialty — price range",
                     "Street food stall — must-try item — ₹XX",
                     "Best place for breakfast/lunch/dinner separately"]
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
    "total": "₹X,XXX",
    "per_person": "₹X,XXX",
    "budget_utilisation": "XX%",
    "savings_tip": "How to use remaining budget if any — upgrade hotel / add activity / extend trip"
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
1. REAL transport operator names always — train names/numbers, bus operator (Redbus/Greenline/WBTC/MSRTC/KSRTC), taxi apps (Ola Outstation/Uber), flight operators
2. COMPLETE journey time including last mile for every option
3. ALWAYS suggest ALL relevant transport modes for the route:
   - Train (if rail connectivity exists — with real train name + number)
   - Government bus (state bus — WBTC/MSRTC/KSRTC/HRTC/ASTC/SNT/KSRTC)
   - Private AC bus (Redbus/Greenline/Volvo/NEETA/SRS/Orange)
   - Private taxi booked (Ola Outstation/Uber/local taxi — per car cost)
   - Shared taxi (for hill stations — Darjeeling/Manali/Shimla/Sikkim)
   - Self-drive (Zoomcar/Revv — if destination suitable)
   - Flight (if distance > 500km or journey > 8hrs by train)
   - Ferry/boat (coastal/island destinations — Andaman, Kerala, Goa, Lakshadweep)
   - Metro (within city — Delhi, Mumbai, Bangalore, Kolkata, Chennai, Hyderabad)
   - Skip irrelevant modes — don't suggest flight for Kolkata→Digha
3. REAL named hotels — only names you are 100% certain exist. If unsure, describe as "Well-reviewed [type] near [area]"
4. SOURCE CITY RULE — CRITICAL:
   - NEVER plan activities or sightseeing in the source/from city
   - Source city = departure point only
   - Day 1 = travel day from source to destination + arrival activities
   - Example: from_city=Kolkata, destination=Digha
     Day 1: "Depart Kolkata early morning → arrive Digha → check in → beach walk"
     NOT: "Explore Kolkata markets → evening Howrah Bridge → night stay Kolkata"
   - The trip starts AFTER leaving the source city
4. India-specific, culturally accurate
5. {req.days} days realistic plan
6. Transport specifically from {req.from_city}
7. ALWAYS USE THE FULL BUDGET — never leave more than 10% unused
   IMPORTANT: budget_utilisation in cost_breakdown MUST be 90-100%
   If total comes to less than 90% of budget:
   → Upgrade accommodation to better option
   → Add more activities/experiences
   → Include a nicer restaurant for one meal
   → Add a day excursion if dates allow
   → Add private transport instead of shared
   NEVER show 40-50% unused — it means you planned wrong
   - If budget is high for the destination → upgrade hotels, add activities, private transport, fine dining
   - Show EXACTLY how every rupee is spent in cost_breakdown
   - Per person budget = total budget ÷ number of people → match hotel/activity quality accordingly
   - Example: ₹40,000 for 6 people for 1 day Digha = ₹6,666/person = PREMIUM budget → book best hotel, private car, water sports, fine dining
8. HOTEL SUGGESTIONS — always show 3-4 options across tiers:
   Option 1: Budget option (for reference)
   Option 2: Recommended (best value for given budget)  
   Option 3: Premium (if budget allows)
   Option 4: Luxury (if budget allows)
   Mark clearly which one is recommended for THIS budget
9. MINIMUM places: major destinations 15-18, medium 12-15, small 8-10, circuit 8-10 per city
10. Cover all place categories using AI knowledge — viewpoints, temples, nature, heritage, markets, adventure
11. Match hotels to tier AND trip type — solo→hostels, couple→boutique, family→resorts, adventure→near activity hubs
12. ALWAYS return exactly 4 hotels in accommodation — recommended(true) + budget + luxury + alternative — NEVER fewer
12. For day trips (1-2 days) with high budget → include premium experiences:
    - Private vehicle both ways (not shared transport)
    - Best restaurant in destination for meals
    - All entry fees and activities included
    - Any unique experience (sunset cruise, bonfire, horse ride etc)
13. Return ONLY valid JSON"""


async def call_claude(prompt: str) -> dict:
    """Primary AI — Claude claude-sonnet-4-5 via Anthropic API. Best India knowledge + reasoning."""
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not anthropic_key:
        return await call_openai(prompt)  # fallback

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": anthropic_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            },
            json={
                "model": "claude-sonnet-4-5",
                "max_tokens": 4000,
                "temperature": 0.3,
                "system": (
                    "You are Tripzio's expert Indian travel AI with deep knowledge of every "
                    "Indian destination, transport, hotels, food, culture and festivals. "
                    "Generate detailed, accurate, budget-appropriate itineraries. "
                    "Use real train names/numbers, real hotel names, real transport operators. "
                    "ALWAYS respond with valid JSON only — no markdown, no explanation, just JSON."
                ),
                "messages": [{"role": "user", "content": prompt}]
            }
        )

        if response.status_code != 200:
            err = response.json().get("error", {}).get("message", "Claude API error")
            logger.error(f"Claude API error: {err} — falling back to OpenAI")
            return await call_openai(prompt)  # fallback to OpenAI

        result = response.json()
        content = result["content"][0]["text"]
        # Strip any accidental markdown
        content = content.strip()
        if content.startswith("```"):
            content = content.split(chr(10), 1)[1].rsplit("```", 1)[0].strip()
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            # Try to extract JSON
            import re as _re
            match = _re.search(r'[{].*[}]', content, _re.DOTALL)
            if match:
                try:
                    return json.loads(match.group())
                except:
                    pass
            logger.error("Claude JSON parse failed — falling back to OpenAI")
            return await call_openai(prompt)


async def call_openai(prompt: str) -> dict:
    """Fallback AI — GPT-4o. Used when Claude API not available."""
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="No AI API key configured")

    async with httpx.AsyncClient(timeout=60.0) as client:
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
                        "content": "You are Tripzio's expert Indian travel AI. Always respond with valid JSON only."
                    },
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.3,
                "max_tokens": 4000,
                "response_format": {"type": "json_object"}
            }
        )
        if response.status_code != 200:
            err = response.json().get("error", {}).get("message", "OpenAI error")
            raise HTTPException(status_code=503, detail=f"AI error: {err}")
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=500, detail="Failed to parse AI response")


def post_process_itinerary(data: dict, budget: int = 0, from_city: str = "", plan_tier: str = "silver") -> dict:
    """
    Enforce critical rules AFTER AI response — deterministic, always works.
    1. Remove source city from Day 1
    2. Ensure 4 hotels with correct tiers
    3. Ensure budget 85-95% utilised
    4. Ensure transport has all modes
    """
    if not data or not isinstance(data, dict):
        return data

    from_city_lower = (from_city or "").lower().strip()

    # ── Rule 1: Strip source city activities from Day 1 ──────────
    day_plans = data.get("day_plans", [])
    if day_plans and from_city_lower:
        day1 = day_plans[0]
        for field in ["morning", "afternoon", "evening", "title", "overnight"]:
            val = day1.get(field, "")
            if not val:
                continue
            val_lower = val.lower()
            # If day 1 content mentions source city as activity location
            if from_city_lower in val_lower and "depart" not in val_lower and "leave" not in val_lower and "travel" not in val_lower:
                # Fix it to be a travel day
                dest = data.get("destination", "destination").split("→")[-1].strip().split(":")[0].strip()
                if field == "morning":
                    day1[field] = f"Early morning departure from {from_city.title()} — board train/bus to {dest}. Pack snacks for the journey."
                elif field == "afternoon":
                    day1[field] = f"Arrive {dest} — check into hotel, freshen up, have lunch at a local restaurant near hotel."
                elif field == "evening":
                    day1[field] = f"Evening stroll at {dest} — explore the main area, watch sunset, light dinner."
                elif field == "title":
                    day1[field] = f"{dest} Day 1 — Travel & Arrival"
        data["day_plans"][0] = day1

    # ── Rule 2: Ensure 4 hotels with correct tiers ───────────────
    TIER_ORDER = ["bronze", "silver", "gold", "diamond", "platinum"]
    TIER_PRICES = {
        "bronze":   (400,   1500),
        "silver":   (1500,  4000),
        "gold":     (4000,  12000),
        "diamond":  (12000, 30000),
        "platinum": (30000, 100000),
    }
    tier_idx = TIER_ORDER.index(plan_tier) if plan_tier in TIER_ORDER else 2
    budget_tier = TIER_ORDER[max(0, tier_idx - 1)]
    luxury_tier = TIER_ORDER[min(len(TIER_ORDER)-1, tier_idx + 1)]

    accom = data.get("accommodation", [])
    dest_name = data.get("destination", "the destination").split("→")[-1].strip().split(":")[0].strip()
    days = data.get("days", 1)

    # Normalize existing hotels
    tier_map = {"recommended": True, "budget": False, "luxury": False, "alternative": False}
    existing_tiers = {h.get("tier", "unknown") for h in accom}

    # Ensure recommended hotel exists
    if not any(h.get("recommended") == True or h.get("tier") == "recommended" for h in accom):
        if accom:
            accom[0]["recommended"] = True
            accom[0]["tier"] = "recommended"
        else:
            lo, hi = TIER_PRICES.get(plan_tier, (2000, 5000))
            accom.append({
                "name": f"Well-reviewed {plan_tier.title()} hotel near {dest_name} center",
                "type": "Hotel",
                "area": f"Main area, {dest_name}",
                "why": f"Best value for {plan_tier} tier",
                "price_range": f"₹{lo:,} - ₹{hi:,} per night",
                "rating": "4.0",
                "highlight": "Central location, good amenities",
                "recommended": True,
                "tier": "recommended"
            })

    # Ensure budget hotel exists
    if not any(h.get("tier") == "budget" for h in accom):
        lo, hi = TIER_PRICES.get(budget_tier, (500, 1500))
        accom.append({
            "name": f"Budget guesthouse near {dest_name} main area",
            "type": "Guesthouse",
            "area": f"Central {dest_name}",
            "why": "Cheapest clean option — good for budget travelers",
            "price_range": f"₹{lo:,} - ₹{hi:,} per night",
            "rating": "3.5",
            "highlight": "Clean, basic, well-located",
            "recommended": False,
            "tier": "budget"
        })

    # Ensure luxury hotel exists
    if not any(h.get("tier") == "luxury" for h in accom):
        lo, hi = TIER_PRICES.get(luxury_tier, (8000, 20000))
        accom.append({
            "name": f"Premium resort near {dest_name}",
            "type": "Resort",
            "area": f"Best area, {dest_name}",
            "why": "Upgrade option — best amenities, pool, premium experience",
            "price_range": f"₹{lo:,} - ₹{hi:,} per night",
            "rating": "4.5",
            "highlight": "Pool, premium amenities, best views",
            "recommended": False,
            "tier": "luxury"
        })

    # Ensure alternative hotel exists
    if not any(h.get("tier") == "alternative" for h in accom):
        lo, hi = TIER_PRICES.get(plan_tier, (2000, 5000))
        accom.append({
            "name": f"Alternative {plan_tier.title()} hotel in {dest_name}",
            "type": "Hotel",
            "area": f"Different area, {dest_name}",
            "why": "Alternative if first choice is full — different location",
            "price_range": f"₹{lo:,} - ₹{hi:,} per night",
            "rating": "3.8",
            "highlight": "Good alternative option",
            "recommended": False,
            "tier": "alternative"
        })

    data["accommodation"] = accom[:6]  # max 6

    # ── Rule 3: Ensure budget 85-95% utilised ────────────────────
    if budget > 0:
        cost_bd = data.get("cost_breakdown", {})

        def parse_amount(val):
            if not val:
                return 0
            import re
            nums = re.findall(r'[0-9,]+', str(val))
            return int(nums[0].replace(',', '')) if nums else 0

        transport   = parse_amount(cost_bd.get("transport"))
        accom_cost  = parse_amount(cost_bd.get("accommodation"))
        food        = parse_amount(cost_bd.get("food"))
        activities  = parse_amount(cost_bd.get("activities"))
        misc        = parse_amount(cost_bd.get("miscellaneous"))
        total       = transport + accom_cost + food + activities + misc

        utilisation = (total / budget * 100) if budget > 0 else 100

        if utilisation < 85:
            # Redistribute remaining budget
            remaining = budget - total
            target_total = int(budget * 0.92)  # aim for 92%
            gap = target_total - total

            # Increase accommodation first (most impactful)
            accom_increase = int(gap * 0.5)
            activity_increase = int(gap * 0.3)
            food_increase = int(gap * 0.2)

            new_accom  = accom_cost + accom_increase
            new_act    = activities + activity_increase
            new_food   = food + food_increase
            new_total  = transport + new_accom + new_food + new_act + misc
            new_util   = int(new_total / budget * 100)
            people     = data.get("people", 1) or 1

            cost_bd["accommodation"] = f"₹{new_accom:,}"
            cost_bd["food"]          = f"₹{new_food:,}"
            cost_bd["activities"]    = f"₹{new_act:,}"
            cost_bd["total"]         = f"₹{new_total:,}"
            cost_bd["per_person"]    = f"₹{new_total // people:,}"
            cost_bd["budget_utilisation"] = f"{new_util}%"
            cost_bd["savings_tip"]   = f"₹{budget - new_total:,} kept as buffer for on-trip expenses"
            data["cost_breakdown"] = cost_bd
            logger.info(f"Budget corrected: {int(utilisation)}% → {new_util}%")

    # ── Rule 4: Ensure transport has govt bus + private bus ───────
    transport_opts = data.get("transport_options", [])
    modes = [t.get("mode", "").lower() + t.get("type", "").lower() for t in transport_opts]
    combined = " ".join(modes)

    dest_state = dest_name.lower()
    # Pick correct state bus operator
    state_bus = "WBTC/SBSTC"
    if any(x in dest_state for x in ["goa"]): state_bus = "KTC/Kadamba"
    elif any(x in dest_state for x in ["maharashtra","mumbai","pune"]): state_bus = "MSRTC"
    elif any(x in dest_state for x in ["kerala"]): state_bus = "KSRTC Kerala"
    elif any(x in dest_state for x in ["karnataka","bangalore"]): state_bus = "KSRTC Karnataka"
    elif any(x in dest_state for x in ["rajasthan","jaipur"]): state_bus = "RSRTC"
    elif any(x in dest_state for x in ["himachal","shimla","manali"]): state_bus = "HRTC"
    elif any(x in dest_state for x in ["uttarakhand","dehradun"]): state_bus = "UPSRTC/UTC"
    elif any(x in dest_state for x in ["tamilnadu","chennai"]): state_bus = "TNSTC"
    elif any(x in dest_state for x in ["andhra"]): state_bus = "APSRTC"
    elif any(x in dest_state for x in ["telangana","hyderabad"]): state_bus = "TSRTC"

    if "government bus" not in combined and "govt bus" not in combined and "state bus" not in combined:
        transport_opts.append({
            "mode": "Budget Option",
            "type": "Government Bus",
            "operator": state_bus,
            "description": f"State government bus from {from_city} to {dest_name}",
            "estimated_cost": "₹80 - ₹200 per person",
            "duration": "Varies by route",
            "details": [f"Board {state_bus} from main bus stand", "Direct or with 1 change"],
            "booking_tip": "Available at state bus stand. Book at counter or redbus.in",
            "best_for": "Budget travelers, locals"
        })

    if "redbus" not in combined and "volvo" not in combined and "private ac bus" not in combined and "private bus" not in combined:
        transport_opts.append({
            "mode": "Comfort Bus",
            "type": "Private AC Bus",
            "operator": "Redbus / Greenline / Volvo AC",
            "description": f"Private AC bus from {from_city} to {dest_name}",
            "estimated_cost": "₹300 - ₹800 per person",
            "duration": "Varies by route",
            "details": ["Book on redbus.in or abhibus.com", "AC sleeper/semi-sleeper available on most routes"],
            "booking_tip": "Book 3-5 days ahead on Redbus app for best prices",
            "best_for": "Comfortable travel, couples, families"
        })

    if "ola" not in combined and "uber" not in combined and "private taxi" not in combined:
        transport_opts.append({
            "mode": "Private Taxi",
            "type": "Outstation Cab",
            "operator": "Ola Outstation / Uber Intercity",
            "description": f"Private cab from {from_city} to {dest_name} — door to door",
            "estimated_cost": "₹2,500 - ₹5,000 per car (not per person)",
            "duration": "By road — check Google Maps",
            "details": ["Book on Ola or Uber app", "Select Outstation/Intercity option", "Split cost among group"],
            "booking_tip": "Book 1 day ahead on Ola/Uber app. Good for groups of 4+",
            "best_for": "Families, groups, those with luggage"
        })

    data["transport_options"] = transport_opts
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

        prompt = build_itinerary_prompt(req, weather_data)
        ai_response = await call_claude(prompt)

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
                "client_id": str(req.client_id) if hasattr(req, 'client_id') and req.client_id else None,
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

        # Post-process — enforce rules deterministically
        ai_response = post_process_itinerary(
            ai_response,
            budget=req.budget or 0,
            from_city=req.from_city or "",
            plan_tier=req.plan_tier.value if req.plan_tier else "silver"
        )
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

        ai_response = await call_claude(prompt)
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
    """Get all trips generated for a specific client by this agent"""
    try:
        from database import get_supabase_client
        supabase = get_supabase_client()
        result = supabase.table("trips") \
            .select("id,title,destination,from_city,days,budget,trip_type,plan_tier,start_date,created_at,itinerary") \
            .eq("user_id", str(current_user["id"])) \
            .eq("client_id", client_id) \
            .order("created_at", desc=True) \
            .execute()
        trips = result.data or []
        return {"trips": trips, "total": len(trips), "client_id": client_id}
    except Exception as e:
        logger.error(f"Error fetching client trips: {e}")
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

        # Validate prompt
        is_valid, validation_msg = validate_custom_prompt(req.free_text)
        if not is_valid:
            raise HTTPException(status_code=400, detail={
                "code": "INVALID_PROMPT",
                "message": validation_msg,
                "suggestion": "Try: 'Goa 5 days from Mumbai, budget 25000, couple trip'"
            })

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
      "mode": "Most Recommended Option",
      "type": "Train/Bus/Taxi/Flight/Ferry/Metro/Self-drive",
      "operator": "Real operator name e.g. Darjeeling Mail, WBTC, Redbus Volvo, Ola Outstation, IndiGo",
      "description": "specific route with real names/numbers",
      "estimated_cost": "₹X,XXX per person OR ₹X,XXX total for private",
      "duration": "Total Xhrs (breakdown per leg)",
      "details": ["step1 with operator/train/bus name", "step2", "step3"],
      "booking_tip": "Where and how to book — IRCTC/Redbus/Ola app/direct",
      "best_for": "Who this suits — budget/comfort/speed/family/group"
    }},
    {{
      "mode": "Budget Option",
      "type": "Government Bus/Shared Taxi/Sleeper Train",
      "operator": "Real operator — WBTC/MSRTC/KSRTC/ASTC/HRTC/SNT or shared taxi stand name",
      "description": "cheapest way to reach",
      "estimated_cost": "₹X,XXX per person",
      "duration": "Total Xhrs",
      "details": ["step1", "step2"],
      "booking_tip": "how to book or board",
      "best_for": "Budget travelers, solo, backpackers"
    }},
    {{
      "mode": "Comfort Option",
      "type": "Private AC Bus/Volvo/Private Taxi/Self-drive",
      "operator": "Redbus/Greenline/Volvo AC or Ola Outstation/Uber/Zoomcar/Revv",
      "description": "comfortable door-to-door option",
      "estimated_cost": "₹X,XXX per person OR ₹X,XXX total",
      "duration": "Total Xhrs",
      "details": ["step1", "step2"],
      "booking_tip": "Book on Redbus app / Ola app / Zoomcar app",
      "best_for": "Families, couples, groups, those with luggage"
    }},
    {{
      "mode": "Fastest Option",
      "type": "Flight/Fastest Train/Helicopter (if applicable)",
      "operator": "IndiGo/Air India/Vistara or real train name",
      "description": "fastest way to reach",
      "estimated_cost": "₹X,XXX per person",
      "duration": "Total Xhrs",
      "details": ["step1", "step2"],
      "booking_tip": "Book on MakeMyTrip/Cleartrip/IRCTC",
      "best_for": "Those short on time, long distance trips"
    }}
  ],
  "local_transport": {{
    "options": [
      {{
        "name": "Auto rickshaw/Local bus/Metro/Tuk-tuk/Shared jeep/Ferry",
        "type": "Auto/Bus/Metro/Boat/Shared taxi",
        "route": "from → to (specific areas)",
        "cost": "₹XX per person or ₹XX per ride",
        "duration": "X mins/hours",
        "tip": "practical tip — where to board, how to negotiate, fixed fare",
        "best_for": "specific use case"
      }}
    ],
    "taxi_apps": ["Ola/Uber if available in this city", "local app if any"],
    "private_cab_estimate": "₹X,XXX for full day private cab in {{destination}}",
    "note": "important local transport note — unique to this destination"
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
      "name": "Best hotel for this budget and trip type",
      "type": "Hotel/Resort/Homestay/Beach Resort",
      "area": "specific area/locality",
      "why": "why best for this budget, group size, trip type",
      "price_range": "₹X,XXX - ₹X,XXX per night",
      "rating": "4.X",
      "highlight": "best feature — pool/beach/view/location",
      "recommended": true,
      "tier": "recommended"
    }},
    {{
      "name": "Budget alternative",
      "type": "Hotel/Guesthouse",
      "area": "area",
      "why": "cheaper option if wanting to save",
      "price_range": "₹X,XXX per night",
      "rating": "3.X",
      "highlight": "clean, basic, good location",
      "recommended": false,
      "tier": "budget"
    }},
    {{
      "name": "Premium upgrade option",
      "type": "Resort/Luxury Hotel",
      "area": "best area",
      "why": "best experience — premium amenities",
      "price_range": "₹X,XXX - ₹X,XXX per night",
      "rating": "4.X",
      "highlight": "pool/spa/beachfront/heritage property",
      "recommended": false,
      "tier": "luxury"
    }},
    {{
      "name": "Alternative same tier",
      "type": "Hotel/Resort/Boutique",
      "area": "different area",
      "why": "alternative if first choice is full",
      "price_range": "₹X,XXX per night",
      "rating": "4.X",
      "highlight": "different style or location",
      "recommended": false,
      "tier": "alternative"
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
    "total": "₹X,XXX — MUST be 90-100% of stated budget",
    "per_person": "₹X,XXX",
    "budget_utilisation": "XX% — MUST be 90-100%",
    "savings_tip": "How remaining budget can be used if any"
  }},
  "alternatives": [
    {{"name": "alt1", "reason": "why", "estimated_budget": "₹X,XXX", "highlight": "unique thing"}},
    {{"name": "alt2", "reason": "why", "estimated_budget": "₹X,XXX", "highlight": "unique thing"}}
  ],
  "parsed_from": "Brief summary of what you understood from the user's request"
}}

CRITICAL RULES — FOLLOW EXACTLY:

1. SOURCE CITY RULE:
   NEVER plan activities in the source/from city
   Day 1 = travel from source + arrive destination + check in + evening activity
   Example: from Kolkata to Digha → Day 1 starts with "Depart Kolkata at 6AM by train/bus"
   NEVER: "Explore Kolkata → travel to Digha" — source city has NO activities

2. BUDGET RULE — MOST IMPORTANT:
   total cost_breakdown MUST use 90-100% of stated budget
   budget_utilisation MUST be 90-100%
   Per person budget = total ÷ people — plan quality accordingly
   Example: ₹40,000 for 6 people = ₹6,666/person = PREMIUM — book best hotel with pool
   If under-utilised → upgrade hotel, add water sports, add private taxi, add fine dining
   NEVER leave 40-50% unused — that is wrong planning

3. HOTEL RULE:
   Always return exactly 4 hotels: recommended + budget + luxury + alternative
   recommended:true for best match, recommended:false for others
   tier field: "recommended" / "budget" / "luxury" / "alternative"
   Only use names you are 100% certain exist. Otherwise describe: "Beachfront resort near New Digha beach"

4. TRANSPORT RULE:
   Always suggest ALL relevant modes:
   - Government bus (WBTC/MSRTC/KSRTC/HRTC — cheapest)
   - Private AC bus (Redbus/Greenline/Volvo — comfort)
   - Train (real name + number if exists)
   - Private taxi (Ola Outstation/Uber Intercity — door to door)
   - Flight only if >500km or >8hrs by train

5. PLACES RULE:
   Minimum 10-12 places for any destination
   Cover: beaches/viewpoints, temples, nature, heritage, local markets, activities
   For beach destinations: include ALL nearby beaches, water sports spots, fishing harbour, local markets

6. For multi-destination/circuit: day_plans cover ALL cities in sequence
7. Day titles must mention city: "Digha Day 1 — Arrival & Beach"
8. If budget not mentioned — estimate reasonable amount
9. If departure city not mentioned — use most logical city
10. Return ONLY valid JSON"""

        ai_response = await call_claude(prompt)

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
                "client_id": str(req.client_id) if hasattr(req, 'client_id') and req.client_id else None,
                "title": ai_response.get("destination", "Custom Trip"),
                "from_city": ai_response.get("from_city", ""),
                "destination": ai_response.get("destination", ""),
                "start_date": req.start_date or datetime.now().strftime("%Y-%m-%d"),
                "end_date": req.start_date or datetime.now().strftime("%Y-%m-%d"),
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

        # Post-process — enforce rules deterministically
        budget_val = 0
        try:
            import re as _re
            budget_match = _re.search(r'[0-9][0-9,]*', req.free_text)
            if budget_match:
                budget_val = int(budget_match.group(1).replace(',',''))
        except:
            pass
        ai_response = post_process_itinerary(
            ai_response,
            budget=budget_val or ai_response.get("budget", 0),
            from_city=ai_response.get("from_city", ""),
            plan_tier=ai_response.get("plan_tier", "silver")
        )
        logger.info(f"✓ Custom plan generated: {ai_response.get('destination')}")
        return ai_response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Custom plan error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate custom plan: {str(e)}")
