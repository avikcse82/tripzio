import sys
import os
import time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# SerpAPI cache — avoid burning free quota on repeated searches
# Cache expires after 24 hours
_SERP_CACHE = {}  # key: "city_type" -> (timestamp, data)
_CACHE_TTL = 86400  # 24 hours


def detect_children_in_trip(text: str) -> dict:
    """Detect if children are travelling and their approximate age group"""
    import re
    text_lower = text.lower()
    
    result = {"has_children": False, "age_groups": [], "count": 0}
    
    # Patterns for children detection
    child_patterns = [
        r'with\s+(?:my\s+)?(?:kid|kids|child|children|baby|babies|infant|toddler|son|daughter)',
        r'(?:kid|kids|child|children|baby|infant|toddler)s?\s+(?:aged?|age)\s+(\d+)',
        r'(\d+)\s+(?:kid|kids|child|children)',
        r'family\s+(?:with|of)\s+(?:kid|kids|child|children)',
        r'(?:bachha|bachhe|bacha|bache|bacchi)',  # Hindi
        r'travelling\s+with\s+(?:little\s+ones|toddler|infant)',
    ]
    
    age_patterns = [
        (r'(?:age[d]?\s+)?(\d+)\s*(?:year|yr|months?)\s*old', 'extract'),
        (r'(?:kid|child|son|daughter|baby)\s+(?:of\s+)?(\d+)', 'extract'),
        (r'(\d+)\s+(?:year|yr)\s*old\s+(?:kid|child)', 'extract'),
    ]
    
    for pattern in child_patterns:
        if re.search(pattern, text_lower):
            result["has_children"] = True
            break
    
    if result["has_children"]:
        # Try to find ages
        ages = []
        for pattern, _ in age_patterns:
            matches = re.findall(pattern, text_lower)
            for m in matches:
                try:
                    age = int(m)
                    if 0 <= age <= 17:
                        ages.append(age)
                except:
                    pass
        
        result["count"] = len(ages) if ages else 1
        
        # Categorize age groups
        age_groups = set()
        for age in ages:
            if age <= 2:
                age_groups.add("infant (0-2)")
            elif age <= 6:
                age_groups.add("toddler (3-6)")
            elif age <= 12:
                age_groups.add("child (7-12)")
            else:
                age_groups.add("teenager (13+)")
        
        if not age_groups and result["has_children"]:
            age_groups.add("child (age unspecified)")
        
        result["age_groups"] = list(age_groups)
    
    return result


def build_child_instructions(child_info: dict) -> str:
    """Build child-specific planning instructions for Claude"""
    if not child_info.get("has_children"):
        return ""
    
    age_groups = child_info.get("age_groups", ["child (age unspecified)"])
    has_infant = any("infant" in ag for ag in age_groups)
    has_toddler = any("toddler" in ag for ag in age_groups)
    has_young_child = any("child (7" in ag for ag in age_groups)
    
    instructions = ["\n\nCHILD-FRIENDLY TRAVEL INSTRUCTIONS:"]
    instructions.append(f"Travelling with: {', '.join(age_groups)}")
    instructions.append("MANDATORY child-safe planning rules:")
    instructions.append("1. ACCOMMODATION: Must have family rooms, safe environment, preferably with pool/play area")
    instructions.append("2. TRAVEL TIME: Max 4-5 hours travel per day — children fatigue quickly")
    instructions.append("3. ACTIVITIES: Include parks, zoos, theme parks, interactive museums — skip extreme adventure")
    instructions.append("4. FOOD: Family-friendly restaurants with kids menu — avoid street food for infants/toddlers")
    instructions.append("5. PACE: Build in rest time each afternoon — no back-to-back activities")
    instructions.append("6. MEDICAL: Mention nearest hospital/pediatric clinic for each destination")
    instructions.append("7. SAFETY: Note any safety concerns — busy roads, water bodies, crowd density")
    
    if has_infant or has_toddler:
        instructions.append("8. INFANT/TODDLER SPECIFIC: Avoid high altitude (>6000ft), long bus journeys, crowded religious sites")
        instructions.append("9. Add note: Carry ORS, baby food, diapers — availability may be limited at destination")
    
    if has_young_child:
        instructions.append("8. CHILD ACTIVITIES: Include hands-on learning experiences — fort exploration, craft workshops, nature trails")
    
    instructions.append("10. Add a 'child_friendly_tips' array in response with 5 practical tips for this specific destination")
    instructions.append("11. In packing_list add child-specific items: sunscreen, mosquito repellent, first aid kit")
    
    return "\n".join(instructions)


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
import asyncio
import httpx
import json
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/itinerary", tags=["Itinerary"])

# ── Season intelligence — pure Python, zero API cost ─────────────────────
# IMD-based seasonal zones. Structured knowledge, not AI.
_SEASON_DATA = {
    'himalayan': {
        'keywords': ['ladakh','leh','spiti','zanskar','nubra','pangong','kargil','srinagar','gulmarg','pahalgam','sonamarg','himachal','uttarakhand','manali','shimla','dharamshala','kasol','kufri'],
        'months': {
            1:{'rating':'avoid','icon':'❄️','reason':'Frozen, -20°C, most roads closed','upside':'Chadar Trek on frozen Zanskar river'},
            2:{'rating':'avoid','icon':'❄️','reason':'Extreme cold, most routes closed','upside':'Chadar Trek season, very few crowds'},
            3:{'rating':'okay','icon':'🌨️','reason':'Thawing begins, some roads opening','upside':'Cheaper stays, Holi at lower altitudes'},
            4:{'rating':'good','icon':'🌸','reason':'Roads opening, pleasant days','upside':'Apricot blossom in Hundar, less crowded'},
            5:{'rating':'excellent','icon':'☀️','reason':'Perfect weather, all passes open','upside':'Best for Khardung La, Chang La, clear skies'},
            6:{'rating':'excellent','icon':'☀️','reason':'Peak season, all routes accessible','upside':'Nubra Valley, Pangong fully accessible'},
            7:{'rating':'good','icon':'⛅','reason':'Some rain at lower altitudes','upside':'Hemis Festival in July, lush valleys'},
            8:{'rating':'good','icon':'⛅','reason':'Occasional rain, roads mostly clear','upside':'Green landscapes, moderate temperatures'},
            9:{'rating':'excellent','icon':'☀️','reason':'Crystal skies, best photography','upside':'Post-monsoon clarity, fewer tourists than June'},
            10:{'rating':'good','icon':'🍂','reason':'Getting cold, some passes closing','upside':'Golden landscapes, Zanskar still accessible'},
            11:{'rating':'avoid','icon':'❄️','reason':'Most passes closing, cold setting in','upside':'Isolated experience for serious adventurers'},
            12:{'rating':'avoid','icon':'❄️','reason':'Severe winter, most of Ladakh closed','upside':'Frozen Pangong — very challenging access'},
        }
    },
    'southwest_monsoon': {
        'keywords': ['goa','mumbai','kerala','kochi','munnar','alleppey','alappuzha','varkala','kovalam','kozhikode','wayanad','coorg','kodagu','mangalore','gokarna','konkan'],
        'months': {
            1:{'rating':'excellent','icon':'☀️','reason':'Perfect sunny weather, cool breeze','upside':'Peak season, all beaches open, festivals'},
            2:{'rating':'excellent','icon':'☀️','reason':'Best weather of the year','upside':'Carnival in Goa, clear skies, comfortable'},
            3:{'rating':'good','icon':'☀️','reason':'Getting warm but still pleasant','upside':'Holi, good before summer rush, fewer crowds'},
            4:{'rating':'okay','icon':'🌤️','reason':'Hot and humid, pre-monsoon building','upside':'Cheap stays, fewer tourists, waterfalls starting'},
            5:{'rating':'okay','icon':'🌦️','reason':'Pre-monsoon showers beginning','upside':'Lush greenery starting, 30-40% cheaper hotels'},
            6:{'rating':'avoid','icon':'🌧️','reason':'Peak monsoon — heavy daily rain, rough seas','upside':'Waterfalls at peak beauty, 40-50% cheaper'},
            7:{'rating':'avoid','icon':'🌧️','reason':'Peak monsoon — beach shacks closed','upside':'Dudhsagar at peak, Athirapally falls stunning'},
            8:{'rating':'avoid','icon':'🌧️','reason':'Monsoon continues, most beaches closed','upside':'Onam preparations in Kerala, cultural richness'},
            9:{'rating':'okay','icon':'🌦️','reason':'Monsoon retreating, occasional rain','upside':'Onam festival in Kerala, waterfalls still flowing'},
            10:{'rating':'good','icon':'⛅','reason':'Post-monsoon, fresh and lush','upside':'Beaches reopening, great value, green landscapes'},
            11:{'rating':'excellent','icon':'☀️','reason':'Ideal weather, season beginning','upside':'Diwali, beaches perfect, comfortable temperature'},
            12:{'rating':'excellent','icon':'☀️','reason':'Peak season — Christmas, New Year','upside':'Vibrant Goa nightlife, Christmas on the beach'},
        }
    },
    'rajasthan': {
        'keywords': ['rajasthan','jaipur','jodhpur','jaisalmer','udaipur','pushkar','ajmer','bikaner','mount abu','chittorgarh','ranthambore','bundi'],
        'months': {
            1:{'rating':'excellent','icon':'☀️','reason':'Cool, clear, perfect sightseeing','upside':'Jaipur Literature Festival, ideal fort exploration'},
            2:{'rating':'excellent','icon':'☀️','reason':'Best month — pleasant all day','upside':'Desert Festival in Jaisalmer, clear skies'},
            3:{'rating':'good','icon':'☀️','reason':'Warming up, comfortable mornings','upside':'Holi famous in Rajasthan, good before summer'},
            4:{'rating':'okay','icon':'🌤️','reason':'Getting hot 35-40°C, plan early mornings','upside':'Very cheap stays, fewer tourists at forts'},
            5:{'rating':'avoid','icon':'🔥','reason':'Extreme heat 42-48°C, harsh conditions','upside':'Empty monuments, ultra-cheap — for heat-lovers'},
            6:{'rating':'avoid','icon':'🔥','reason':'Peak heat + pre-monsoon, oppressive','upside':'Almost empty tourist sites, ultra-cheap'},
            7:{'rating':'okay','icon':'🌦️','reason':'Monsoon arrives, cooler but muddy roads','upside':'Green Rajasthan — rare and beautiful, cheaper'},
            8:{'rating':'okay','icon':'🌦️','reason':'Monsoon continues, some flooding risk','upside':'Pushkar Lake full, unique photography'},
            9:{'rating':'good','icon':'⛅','reason':'Cooling down, rain reducing','upside':'Navratri, post-monsoon green desert'},
            10:{'rating':'excellent','icon':'☀️','reason':'Perfect weather returning','upside':'Dussehra, Pushkar Camel Fair, Navratri'},
            11:{'rating':'excellent','icon':'☀️','reason':'Peak season, ideal conditions','upside':'Diwali in Jaipur, Pushkar Fair, all forts open'},
            12:{'rating':'excellent','icon':'☀️','reason':'Cool evenings, perfect days','upside':'Christmas, New Year, festive atmosphere'},
        }
    },
    'north_plains': {
        'keywords': ['delhi','agra','varanasi','mathura','vrindavan','lucknow','allahabad','prayagraj','ayodhya','corbett','nainital','mussoorie','dehradun','haridwar','rishikesh','amritsar','chandigarh'],
        'months': {
            1:{'rating':'good','icon':'🌫️','reason':'Cold 5-15°C, dense fog possible','upside':'Makar Sankranti, Republic Day, fog photography'},
            2:{'rating':'good','icon':'🌸','reason':'Pleasant, spring approaching','upside':'Taj Mahal in winter light, comfortable walks'},
            3:{'rating':'excellent','icon':'🌸','reason':'Perfect spring weather','upside':'Holi best in Mathura/Vrindavan, pleasant days'},
            4:{'rating':'good','icon':'☀️','reason':'Warm but manageable, 28-34°C','upside':'Baisakhi in Amritsar, good before summer rush'},
            5:{'rating':'avoid','icon':'🔥','reason':'Very hot 40-45°C, harsh for sightseeing','upside':'Empty monuments, ultra-cheap hotels'},
            6:{'rating':'avoid','icon':'🔥','reason':'Peak heat, hot winds (loo), oppressive','upside':'Avoid unless absolutely necessary'},
            7:{'rating':'okay','icon':'🌧️','reason':'Monsoon brings relief but humidity','upside':'Green Agra, Taj in mist — beautiful photos'},
            8:{'rating':'okay','icon':'🌧️','reason':'Heavy rain, flooding risk in some areas','upside':'Janmashtami in Mathura/Vrindavan'},
            9:{'rating':'good','icon':'⛅','reason':'Cooling down, rain reducing','upside':'Navratri, Durga Puja in Varanasi'},
            10:{'rating':'excellent','icon':'☀️','reason':'Ideal weather returns','upside':'Dussehra, Diwali, perfect for Taj Mahal visit'},
            11:{'rating':'excellent','icon':'☀️','reason':'Best months — cool and clear','upside':'Diwali, Chhath Puja in Varanasi, peak season'},
            12:{'rating':'good','icon':'🌫️','reason':'Cold, some fog, festive atmosphere','upside':'Christmas, New Year, winter fairs'},
        }
    },
    'northeast': {
        'keywords': ['darjeeling','sikkim','gangtok','pelling','lachung','yumthang','shillong','cherrapunji','mawlynnong','kaziranga','tawang','ziro','kohima','northeast','meghalaya','assam','arunachal','manipur','nagaland','mizoram','tripura'],
        'months': {
            1:{'rating':'good','icon':'❄️','reason':'Cold, clear views of Kanchenjunga','upside':'Snow on hills, tea garden walks, peaceful'},
            2:{'rating':'good','icon':'🌸','reason':'Rhododendron blooming begins','upside':'Cherry blossom in Shillong area'},
            3:{'rating':'excellent','icon':'🌸','reason':'Rhododendron peak, beautiful weather','upside':'Best for Sikkim, Darjeeling first tea flush'},
            4:{'rating':'excellent','icon':'☀️','reason':'Perfect weather, flowers everywhere','upside':'First flush tea, orchids blooming, clear skies'},
            5:{'rating':'good','icon':'⛅','reason':'Pre-monsoon, still mostly pleasant','upside':'Good views before monsoon, less crowded'},
            6:{'rating':'avoid','icon':'🌧️','reason':'Heavy monsoon — landslides possible','upside':'Cherrapunji waterfalls spectacular'},
            7:{'rating':'avoid','icon':'🌧️','reason':'Peak monsoon, road closures common','upside':'Waterfalls at absolute peak, raw nature'},
            8:{'rating':'avoid','icon':'🌧️','reason':'Very heavy rain, travel disruptions','upside':'Least crowded, nature at its most dramatic'},
            9:{'rating':'okay','icon':'🌦️','reason':'Monsoon reducing, some rain','upside':'Greenest landscapes, Ganesh Chaturthi'},
            10:{'rating':'excellent','icon':'☀️','reason':'Crystal clear skies, best views','upside':'Best Kanchenjunga views, Diwali, Durga Puja'},
            11:{'rating':'excellent','icon':'☀️','reason':'Ideal weather, clear mountain views','upside':'Orange harvest in Sikkim, peaceful season'},
            12:{'rating':'good','icon':'❄️','reason':'Cold but beautiful, snow on higher peaks','upside':'Snow-covered Sandakphu, Christmas in hills'},
        }
    },
    'south_plains': {
        'keywords': ['karnataka','tamilnadu','tamil nadu','chennai','hyderabad','bengaluru','bangalore','mysuru','mysore','hampi','ooty','kodaikanal','pondicherry','mahabalipuram','madurai','tirupati','rameswaram','kanyakumari'],
        'months': {
            1:{'rating':'excellent','icon':'☀️','reason':'Cool and dry, ideal conditions','upside':'Pongal festival, best weather for temples'},
            2:{'rating':'excellent','icon':'☀️','reason':'Perfect weather continues','upside':'Hampi Utsav, clear days, comfortable evenings'},
            3:{'rating':'good','icon':'☀️','reason':'Getting warmer but still manageable','upside':'Holi, Ugadi (Telugu/Kannada New Year)'},
            4:{'rating':'okay','icon':'🌤️','reason':'Hot and humid, 35-40°C','upside':'Temple festivals, fewer crowds, cheaper stays'},
            5:{'rating':'okay','icon':'🌦️','reason':'Pre-monsoon thunderstorms, muggy','upside':'Waterfalls beginning, nature coming alive'},
            6:{'rating':'good','icon':'🌧️','reason':'Southwest monsoon — brief heavy showers','upside':'Green landscapes, cooler than summer'},
            7:{'rating':'good','icon':'🌧️','reason':'Moderate rain, not as heavy as west coast','upside':'Lush, cheaper hotels, Bonalu festival Hyderabad'},
            8:{'rating':'good','icon':'🌧️','reason':'Intermittent showers, mostly manageable','upside':'Independence Day, green hills'},
            9:{'rating':'good','icon':'⛅','reason':'Rain reducing, pleasant temperatures','upside':'Navratri, Mysuru Dasara prep'},
            10:{'rating':'excellent','icon':'☀️','reason':'Mysuru Dasara — best festival month','upside':'Mysuru Dasara world-famous, Dussehra everywhere'},
            11:{'rating':'okay','icon':'🌧️','reason':'Northeast monsoon — Tamil Nadu/Chennai wet','upside':'Diwali, cooler weather, green after rains'},
            12:{'rating':'good','icon':'☀️','reason':'Northeast monsoon ending, pleasant','upside':'Christmas, New Year, comfortable temperatures'},
        }
    },
}

MONTH_NAMES_PY = ['January','February','March','April','May','June','July','August','September','October','November','December']

def get_season_warning(destination: str, start_date: Optional[str]) -> Optional[dict]:
    """
    Pure Python seasonal intelligence. Zero API cost.
    Returns season_warning dict or None if destination not recognised.
    Fail-open: never raises, always returns None on any error.
    """
    try:
        if not destination or not start_date:
            return None
        dest_lower = destination.lower().split('→')[0].strip()
        zone = None
        for z, zdata in _SEASON_DATA.items():
            if any(k in dest_lower for k in zdata['keywords']):
                zone = z
                break
        if not zone:
            return None
        month = datetime.strptime(start_date, '%Y-%m-%d').month
        entry = _SEASON_DATA[zone]['months'].get(month)
        if not entry:
            return None
        # Build alternatives (2 best months)
        alternatives = []
        for i in range(1, 13):
            if i == month:
                continue
            m = _SEASON_DATA[zone]['months'].get(i, {})
            if m.get('rating') in ('excellent', 'good'):
                alternatives.append({
                    'month': i,
                    'monthName': MONTH_NAMES_PY[i - 1],
                    'icon': m['icon'],
                    'reason': m['reason'],
                })
                if len(alternatives) == 2:
                    break
        # Build all_months for calendar strip
        all_months = []
        for i in range(1, 13):
            m = _SEASON_DATA[zone]['months'].get(i, {})
            all_months.append({'rating': m.get('rating','okay'), 'icon': m.get('icon','⛅')})
        return {
            'zone': zone,
            'month': month,
            'rating': entry['rating'],
            'icon': entry['icon'],
            'reason': entry['reason'],
            'upside': entry['upside'],
            'destination': destination,
            'alternatives': alternatives,
            'all_months': all_months,
        }
    except Exception as e:
        logger.warning(f"get_season_warning failed for '{destination}': {e}")
        return None


async def extract_trip_info(free_text: str, api_key: str) -> dict:
    """Use Claude Haiku to extract from_city, via_city, destinations.
    Zero hardcoding — works for any language, any city worldwide.
    Falls back to empty dict on failure.
    """
    prompt = f"""Extract travel information from this text. Return ONLY a JSON object, nothing else.

Text: "{free_text}"

Return exactly this JSON:
{{"from_city": "departure city lowercase or empty", "via_city": "transit city lowercase or empty", "destinations": ["destination1", "destination2"]}}

Rules:
- from_city: departure city (after from/se/starting)
- via_city: transit city (after via)  
- destinations: ONLY actual places to visit — cities, towns, tourist spots
- Exclude: trip type, budget, day counts, dates, common words
- Include short names: goa, leh, puri, ooty
- Handle Hindi/Hinglish naturally"""

    try:
        async with httpx.AsyncClient(timeout=10) as _ec:
            _er = await _ec.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 150,
                    "temperature": 0.0,
                    "messages": [{"role": "user", "content": prompt}]
                }
            )
        if _er.status_code != 200:
            logger.warning(f"Haiku extraction HTTP {_er.status_code}: {_er.text[:300]}")
            return {}
        _et = _er.json()["content"][0]["text"].strip()
        _es = _et.find("{"); _ee = _et.rfind("}") + 1
        if _es >= 0 and _ee > _es:
            return json.loads(_et[_es:_ee])
        logger.warning(f"Haiku extraction returned no valid JSON: {_et[:200]}")
        return {}
    except Exception as _ex:
        logger.warning(f"Trip info extraction failed: {type(_ex).__name__}: {_ex}")
        return {}


async def fetch_city_serp(dname: str, skey: str) -> tuple:
    """Fetch hotels/restaurants/attractions for one city — TripAdvisor first, Google fallback"""
    # Check cache
    _ch = _serp_cache_get(f"{dname}_h")
    if _ch and len(_ch) > 0:
        _eng = _serp_cache_get(f"{dname}_eng") or "tripadvisor"
        logger.warning(f"SerpAPI cache: {dname} h={len(_ch)}")
        return dname, _ch, _serp_cache_get(f"{dname}_r") or [], _serp_cache_get(f"{dname}_a") or [], _eng

    _h, _r, _a, _eng = [], [], [], "tripadvisor"
    try:
        async with httpx.AsyncClient(timeout=15) as cl:
            _rh, _rr, _ra = await asyncio.gather(
                cl.get("https://serpapi.com/search.json", params={"engine":"tripadvisor","q":f"hotels {dname} India","ssrc":"h","api_key":skey}),
                cl.get("https://serpapi.com/search.json", params={"engine":"tripadvisor","q":f"restaurants {dname} India","ssrc":"r","api_key":skey}),
                cl.get("https://serpapi.com/search.json", params={"engine":"tripadvisor","q":f"things to do {dname} India","ssrc":"A","api_key":skey})
            )
        _rh_j = _rh.json()
        # Handle TripAdvisor quota/error responses
        if _rh.status_code != 200 or "error" in _rh_j or "quota" in str(_rh_j).lower():
            logger.warning(f"TripAdvisor quota/error for {dname}: {_rh.status_code}")
            _h = []  # Force Google fallback
        else:
            _h = _rh_j.get("places", _rh_j.get("results", []))
        _r = _rr.json().get("places", _rr.json().get("results", []))
        _a = _ra.json().get("places", _ra.json().get("results", []))

        if not _h:
            _eng = "google"
            async with httpx.AsyncClient(timeout=15) as cl2:
                _rh2, _rr2, _ra2 = await asyncio.gather(
                    cl2.get("https://serpapi.com/search.json", params={"engine":"google","q":f"hotels in {dname} India","tbm":"lcl","api_key":skey}),
                    cl2.get("https://serpapi.com/search.json", params={"engine":"google","q":f"restaurants in {dname} India","tbm":"lcl","api_key":skey}),
                    cl2.get("https://serpapi.com/search.json", params={"engine":"google","q":f"tourist places in {dname} India","tbm":"lcl","api_key":skey})
                )
            _h = _rh2.json().get("local_results", _rh2.json().get("results", []))
            _r = _rr2.json().get("local_results", _rr2.json().get("results", []))
            _a = _ra2.json().get("local_results", _ra2.json().get("results", []))

        _serp_cache_set(f"{dname}_h", _h)
        _serp_cache_set(f"{dname}_r", _r)
        _serp_cache_set(f"{dname}_a", _a)
        _serp_cache_set(f"{dname}_eng", _eng)
        logger.warning(f"SerpAPI [{_eng}] {dname}: h={len(_h)} r={len(_r)} a={len(_a)}")
    except Exception as _se:
        logger.warning(f"SerpAPI tripadvisor {dname} failed: {_se} — trying Google")
        try:
            async with httpx.AsyncClient(timeout=15) as cl3:
                _rh3, _rr3, _ra3 = await asyncio.gather(
                    cl3.get("https://serpapi.com/search.json", params={"engine":"google","q":f"hotels in {dname} India","tbm":"lcl","api_key":skey}),
                    cl3.get("https://serpapi.com/search.json", params={"engine":"google","q":f"restaurants in {dname} India","tbm":"lcl","api_key":skey}),
                    cl3.get("https://serpapi.com/search.json", params={"engine":"google","q":f"tourist places in {dname} India","tbm":"lcl","api_key":skey})
                )
            _h = _rh3.json().get("local_results", _rh3.json().get("results", []))
            _r = _rr3.json().get("local_results", _rr3.json().get("results", []))
            _a = _ra3.json().get("local_results", _ra3.json().get("results", []))
            _eng = "google"
            _serp_cache_set(f"{dname}_h", _h)
            _serp_cache_set(f"{dname}_r", _r)
            _serp_cache_set(f"{dname}_a", _a)
            _serp_cache_set(f"{dname}_eng", _eng)
            logger.warning(f"SerpAPI [google fallback] {dname}: h={len(_h)}")
        except Exception as _se2:
            logger.warning(f"SerpAPI google fallback also failed: {_se2}")

    return dname, _h, _r, _a, _eng
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
      "name": "Alternative destination name",
      "reason": "why similar to {destination} for {req.days} days",
      "estimated_budget": "₹{req.budget:,}",
      "highlight": "unique experience"
    }},
    {{
      "name": "Alternative destination name 2",
      "reason": "why good for {req.days} days from {req.from_city}",
      "estimated_budget": "₹{req.budget:,}",
      "highlight": "unique experience"
    }},
    {{
      "name": "Alternative destination name 3",
      "reason": "budget-friendly version for same duration",
      "estimated_budget": "₹{req.budget:,}",
      "highlight": "unique experience"
    }}
  ]
}}
ALTERNATIVES RULE: estimated_budget MUST be within 20% of Rs {req.budget}. Never show budgets like 9,00,000 for a {req.budget} budget trip.

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
    """Call Claude Sonnet with streaming — fast, no timeout"""
    import os
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="Our travel planner is currently under maintenance. Please try again shortly.")

    content_chunks = []
    # Dynamic tokens based on prompt size — longer trips need more tokens
    _prompt_days = 7  # default
    try:
        import re as _re
        _day_match = _re.search(r'(\d+)\s*days?', prompt.lower())
        if _day_match: _prompt_days = int(_day_match.group(1))
    except Exception:
        pass
    _max_tokens = min(16000, max(8000, _prompt_days * 1200))

    async with httpx.AsyncClient(timeout=float(os.getenv("AI_TIMEOUT", "300"))) as client:
        async with client.stream(
            "POST",
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "anthropic-beta": "prompt-caching-2024-07-31",
                "Content-Type": "application/json"
            },
            json={
                "model": "claude-sonnet-4-5",
                "max_tokens": _max_tokens,
                "stream": True,
                "system": [
                    {
                        "type": "text",
                        "text": "You are Tripzio's expert Indian travel AI. Generate accurate, budget-appropriate travel itineraries for Indian destinations. Deep knowledge of Indian railways, hill stations, permits, acclimatization, multi-leg routes. Always use real train names and numbers. Keep descriptions concise — 1 sentence max per field. Respond with valid JSON only — no markdown, no explanation.",
                        "cache_control": {"type": "ephemeral"}
                    }
                ],
                "temperature": 0.4,
                "messages": [{"role": "user", "content": prompt}]
            }
        ) as response:
            if response.status_code != 200:
                error_text = await response.aread()
                try:
                    error_detail = json.loads(error_text).get("error", {}).get("message", "Anthropic API error")
                except Exception:
                    error_detail = error_text.decode("utf-8", errors="ignore")[:300] if error_text else "Anthropic API error"
                logger.error(f"Claude Sonnet API failed [{response.status_code}]: {error_detail}")
                raise HTTPException(status_code=503, detail="Our AI travel planner is temporarily unavailable. Please try again in a moment.")

            async for line in response.aiter_lines():
                if not line or not line.startswith("data: "):
                    continue
                data = line[6:]
                if data == "[DONE]":
                    break
                try:
                    event = json.loads(data)
                    if event.get("type") == "content_block_delta":
                        delta = event.get("delta", {})
                        if delta.get("type") == "text_delta":
                            content_chunks.append(delta.get("text", ""))
                except Exception:
                    continue

    content = "".join(content_chunks).strip()
    if "```" in content:
        content = content.split(chr(10), 1)[-1].rsplit("```", 1)[0].strip()
    s = content.find("{")
    e = content.rfind("}") + 1
    if s >= 0 and e > s:
        content = content[s:e]
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        # JSON truncated — retry with more tokens automatically
        logger.warning(f"JSON truncated at {len(content)} chars — retrying with 16000 tokens")
        try:
            retry_chunks = []
            async with httpx.AsyncClient(timeout=float(os.getenv("AI_TIMEOUT", "300"))) as _rc:
                async with _rc.stream(
                    "POST",
                    "https://api.anthropic.com/v1/messages",
                    headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "anthropic-beta": "prompt-caching-2024-07-31", "Content-Type": "application/json"},
                    json={
                        "model": "claude-sonnet-4-5",
                        "max_tokens": 16000,
                        "stream": True,
                        "system": [{"type": "text", "text": "You are Tripzio's expert Indian travel AI. Respond with valid JSON only.", "cache_control": {"type": "ephemeral"}}],
                        "messages": [{"role": "user", "content": prompt}]
                    }
                ) as _rr:
                    async for _line in _rr.aiter_lines():
                        if not _line or not _line.startswith("data: "): continue
                        _d = _line[6:]
                        if _d == "[DONE]": break
                        try:
                            _ev = json.loads(_d)
                            if _ev.get("type") == "content_block_delta":
                                _dt = _ev.get("delta", {})
                                if _dt.get("type") == "text_delta":
                                    retry_chunks.append(_dt.get("text", ""))
                        except Exception:
                            continue
            retry_content = "".join(retry_chunks).strip()
            if "```" in retry_content:
                retry_content = retry_content.split(chr(10), 1)[-1].rsplit("```", 1)[0].strip()
            rs = retry_content.find("{")
            re_ = retry_content.rfind("}") + 1
            if rs >= 0 and re_ > rs:
                retry_content = retry_content[rs:re_]
            return json.loads(retry_content)
        except Exception as _re:
            logger.error(f"Retry also failed: {_re}")
            raise HTTPException(status_code=500, detail="We're having trouble generating your plan right now. Please try again.")


def post_process_itinerary(data: dict, budget: int = 0, from_city: str = "", plan_tier: str = "silver", cached_trains: list = None, train_dest_city: str = None) -> dict:
    """Enforce rules deterministically after AI response — runs every time."""
    if not data or not isinstance(data, dict):
        return data

    import re as _re
    # Use the REAL city trains were fetched for (if provided) — fixes mislabeled
    # train descriptions in multi-city circuits (e.g. "Sikkim" trains that were
    # actually fetched for "Darjeeling"). Falls back to old behavior if not passed.
    dest = (train_dest_city or data.get("destination", "destination").split("→")[-1].strip().split(":")[0]).strip()
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
            from_stn = (t.get("fromStnCode", "") or "").strip()
            to_stn   = (t.get("toStnCode", "") or "").strip()
            check_url = f"https://erail.in/trains-between-stations/{from_stn}/{to_stn}" if from_stn and to_stn else None
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
                "check_availability_url": check_url,
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


class CityCheckRequest(BaseModel):
    city: str


@router.post("/check-city")
async def check_city(req: CityCheckRequest, current_user: dict = Depends(get_current_user_from_token)):
    """Lightweight Haiku-powered check: is this a real Indian city/town?
    Used for instant departure-city validation while typing — replaces
    a static hardcoded city list with accurate AI judgement.
    Cheap: Haiku, ~15 tokens response, designed to be debounced client-side."""
    city = (req.city or "").strip()
    if len(city) < 3:
        return {"valid": True, "suggestion": None}  # too short to judge — don't block typing

    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return {"valid": True, "suggestion": None}  # fail open — never block user on our error

    prompt = f"""Is "{city}" a real city, town, or place in India (including small towns)?
Respond with ONLY a JSON object, nothing else:
{{"valid": true or false, "suggestion": "corrected spelling if you're confident it's a typo, else null"}}

Be lenient — if it could plausibly be a real Indian place name, say valid: true.
Only say valid: false if it's clearly not a place (e.g. a random word, a different country's city)."""

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={"x-api-key": api_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"},
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 60,
                    "temperature": 0.0,
                    "messages": [{"role": "user", "content": prompt}]
                }
            )
        if r.status_code != 200:
            return {"valid": True, "suggestion": None}  # fail open
        text = r.json()["content"][0]["text"].strip()
        s = text.find("{"); e = text.rfind("}") + 1
        if s >= 0 and e > s:
            result = json.loads(text[s:e])
            return {"valid": bool(result.get("valid", True)), "suggestion": result.get("suggestion")}
        return {"valid": True, "suggestion": None}
    except Exception as ex:
        logger.warning(f"check-city failed for '{city}': {ex}")
        return {"valid": True, "suggestion": None}  # fail open — never block user on our error


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
        _live_trains = []
        try:
            from services.railway_service import get_trains_between_stations, build_train_context as _btc
            dest_for_trains = req.destination or destination
            if dest_for_trains and req.from_city:
                _live_trains = await get_trains_between_stations(req.from_city, dest_for_trains)
                if _live_trains:
                    train_context = _btc(req.from_city, dest_for_trains, _live_trains)
                    logger.info(f"Live trains: {len(_live_trains)} for {req.from_city}→{dest_for_trains}")
        except Exception as _te:
            logger.warning(f"Live train fetch failed: {_te}")

        prompt = build_itinerary_prompt(req, weather_data)
        # Detect children and add safety instructions
        _child_info = detect_children_in_trip(str(req.trip_type or "") + " " + str(req.destination or ""))
        _child_instructions = build_child_instructions(_child_info)
        if _child_instructions:
            prompt = prompt + _child_instructions
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

        # Season warning — pure Python, zero API cost, fail-open
        _dest_for_season = ai_response.get("destination") or req.destination or ""
        _sw = get_season_warning(_dest_for_season, req.start_date)
        if _sw:
            ai_response["season_warning"] = _sw

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

        _cached_trains_main = locals().get('_live_trains', None)
        ai_response = post_process_itinerary(
            ai_response,
            budget=req.budget or 0,
            from_city=req.from_city or "",
            plan_tier=req.plan_tier.value if req.plan_tier else "silver",
            cached_trains=_cached_trains_main
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
        _all_city_hotels = {}  # Always defined
        _skey = os.getenv("SERPAPI_KEY", "")
        if _skey:
            try:
                # Dynamic extraction — no hardcoded city list
                # Use Claude Haiku to extract destinations — no hardcoding, any language
                _api_key = os.getenv("ANTHROPIC_API_KEY", "")
                _extracted = await extract_trip_info(req.free_text, _api_key)

                _from_city = _extracted.get("from_city", "").lower().strip()
                _via_city = _extracted.get("via_city", "").lower().strip()
                _dest_list = [d.lower().strip() for d in _extracted.get("destinations", []) if d.strip()]

                # Fallback: if Claude extraction failed, use regex
                if not _dest_list:
                    logger.warning("Claude extraction failed — using regex fallback")
                    _words = req.free_text.lower().replace(',', ' ').replace('—', ' ').replace('→', ' ').split()
                    _all_words = []
                    _skip_next = False
                    _prev_word = ""
                    for _w in _words:
                        if _w in ('from',):
                            _skip_next = True; _prev_word = _w; continue
                        if _w == 'se':
                            if _prev_word and _prev_word.isalpha():
                                _from_city = _prev_word.strip('.,')
                            _prev_word = _w; continue
                        if _skip_next:
                            _fc = _w.strip('.,')
                            if _fc.isalpha(): _from_city = _fc
                            _skip_next = False; _prev_word = _w; continue
                        _clean = _w.strip('.,!?-')
                        if len(_clean) >= 3 and _clean.isalpha():
                            _all_words.append(_clean)
                        _prev_word = _w
                    _stop = {'din','day','days','trip','tour','plan','budget','solo','group','from',
                             'start','date','travel','hotel','flight','train','night','nights',
                             'couple','family','child','kids','people','total','there','and','the',
                             'for','with','via','north','south','east','west','january','february',
                             'march','april','may','june','july','august','september','october',
                             'november','december','silver','gold','bronze','diamond','platinum',
                             'one','two','three','four','five','six','seven','eight','nine','ten',
                             'this','that','have','will','also','our','your','some'}
                    # Only exclude metro hubs that are RARELY destinations themselves
                    # (removed pune — it's a popular weekend destination too)
                    _big = {'kolkata','mumbai','delhi','bangalore','bengaluru','chennai',
                            'hyderabad','ahmedabad','surat','lucknow','nagpur',
                            'indore','bhopal','patna','ranchi','guwahati','kanpur','chandigarh'}
                    if _from_city: _big.add(_from_city)
                    _dest_list = [w for w in _all_words if w not in _stop and w not in _big and len(w) >= 3]

                # Deduplicate preserving order
                _seen = set()
                _dedup = []
                for _x in _dest_list:
                    if _x not in _seen:
                        _seen.add(_x)
                        _dedup.append(_x)
                _dest_list = _dedup
                logger.warning(f"Trip extracted — from={_from_city} via={_via_city} dests={_dest_list[:5]}")

                if _dest_list:
                    # Fetch for each destination separately (circuit support)
                    _all_ctx = []
                    logger.warning(f"SERP STARTING: cities={_dest_list} skey={bool(_skey)}")
                    # Parallel SerpAPI — all cities fetched simultaneously
                    _serp_results = await asyncio.gather(
                        *[fetch_city_serp(d.title(), _skey) for d in _dest_list]
                    )
                    for _dname, _h, _r, _a, _eng in _serp_results:
                        _all_city_hotels[_dname] = _h
                        _ctx = [f"=== Places for {_dname} ==="]
                        if _h: _ctx += ["HOTELS:"] + [f"{i}. {x.get('title',x.get('name',''))} ⭐{x.get('rating','')}" for i,x in enumerate(_h[:5],1)]
                        if _r: _ctx += ["RESTAURANTS:"] + [f"{i}. {x.get('title',x.get('name',''))}" for i,x in enumerate(_r[:5],1)]
                        if _a: _ctx += ["ATTRACTIONS:"] + [f"{i}. {x.get('title',x.get('name',''))}" for i,x in enumerate(_a[:5],1)]
                        _all_ctx.append("\n".join(_ctx))
                    # SerpAPI context NOT sent to Claude — post-processor attaches hotels directly
                    # This keeps prompt lean and Claude fast
                    # Fetch live trains — including via city leg
                    try:
                        from services.railway_service import get_trains_between_stations, build_train_context as _btc2
                        _ltrains = []
                        _train_contexts = []

                        # Leg 1: from_city → via_city (top 5 trains only)
                        if _from_city and _via_city:
                            _leg1 = await get_trains_between_stations(_from_city, _via_city)
                            if _leg1:
                                _ltrains.extend(_leg1[:5])
                                _t1 = _btc2(_from_city, _via_city, _leg1[:5])
                                if _t1: _train_contexts.append(_t1)

                        # Leg 2: via_city → first destination (top 3 trains only)
                        _leg_from = _via_city if _via_city else _from_city
                        if _leg_from and _dest_list:
                            _leg2 = await get_trains_between_stations(_leg_from, _dest_list[0])
                            if _leg2:
                                _ltrains.extend(_leg2[:3])
                                _t2 = _btc2(_leg_from, _dest_list[0], _leg2[:3])
                                if _t2: _train_contexts.append(_t2)

                        # Fallback: direct if no via
                        if not _ltrains and _from_city and _dest_list:
                            _ltrains = await get_trains_between_stations(_from_city, _dest_list[0])
                            if _ltrains:
                                _t3 = _btc2(_from_city, _dest_list[0], _ltrains[:5])
                                if _t3: _train_contexts.append(_t3)

                        if _train_contexts:
                            pass  # Train context NOT sent to Claude — post-processor injects trains directly
                    except Exception as _lte:
                        logger.warning(f"Live train custom skip: {_lte}")
                    # Hotels stored in _all_city_hotels per city
            except Exception as _cse:
                logger.warning(f"SerpAPI custom skipped: {type(_cse).__name__}: {_cse}")
                # Don't crash — continue without SerpAPI data
        # Detect children in trip
        _child_info = detect_children_in_trip(req.free_text or "")
        _child_instructions = build_child_instructions(_child_info)
        if _child_instructions:
            prompt = prompt + _child_instructions

        # Inject confirmed from_city — always, regardless of via city —
        # so Sonnet doesn't have to re-guess it from raw text (fixes
        # "Not specified" from_city bug for simple non-via trips)
        if '_from_city' in locals() and _from_city:
            prompt = prompt + f"\n\nCONFIRMED DEPARTURE CITY: {_from_city.title()}\nUse this EXACT city as 'from_city' in your JSON response — do not leave it blank or guess differently."

        # Inject via city instruction if detected
        if '_via_city' in locals() and _via_city:
            via_instruction = f"""\n\nVIA CITY ROUTING INSTRUCTION:
User specified travel via {_via_city.title()}.
Route MUST be: {req.free_text.split('from')[-1].split('via')[0].strip().title() if 'from' in req.free_text.lower() else 'source'} → {_via_city.title()} → destinations.
Show train from source to {_via_city.title()} as first transport option.
Then show {_via_city.title()} to first destination as second transport option.
Do NOT show direct source→destination if via city is specified."""
            prompt = prompt + via_instruction

        ai_response = await call_openai(prompt)

        # Safety override: if Sonnet still didn't fill from_city correctly,
        # use our independently-confirmed extraction (guaranteed accurate)
        if '_from_city' in locals() and _from_city:
            _current_fc = (ai_response.get("from_city", "") or "").strip().lower()
            if not _current_fc or _current_fc in ("not specified", "n/a", "none", "unknown"):
                ai_response["from_city"] = _from_city.title()

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

        _cached_trains_for_post = locals().get('_ltrains', None)
        _train_dest_for_post = _dest_list[0] if '_dest_list' in locals() and _dest_list else None
        ai_response = post_process_itinerary(
            ai_response,
            budget=ai_response.get("budget", 0),
            from_city=ai_response.get("from_city", ""),
            plan_tier=ai_response.get("plan_tier", "silver"),
            cached_trains=_cached_trains_for_post,
            train_dest_city=_train_dest_for_post
        )

        # Store per-city hotels in response — each city gets its own list
        try:
            if _all_city_hotels:
                def fmt_hotel(h, city):
                    _ce = _serp_cache_get(f"{city.title()}_eng") or "tripadvisor"
                    if _ce == "tripadvisor":
                        name = h.get("title", h.get("name", ""))
                        photo = h.get("thumbnail", "")
                        link = h.get("link", "")
                        price = h.get("price", "")
                        area = h.get("location", city.title())
                        why = h.get("highlighted_review", {}).get("text", "") if isinstance(h.get("highlighted_review"), dict) else ""
                        htype = h.get("place_type", "Hotel")
                    else:  # google
                        name = h.get("title", h.get("name", ""))
                        photos = h.get("photos", [])
                        photo = photos[0].get("thumbnail", "") if photos else h.get("thumbnail", "")
                        link = h.get("link", "")
                        price = h.get("price", h.get("price_range", ""))
                        area = h.get("address", h.get("location", city.title()))
                        why = h.get("snippet", h.get("description", ""))
                        htype = h.get("type", "Hotel")
                    return {
                        "name": name,
                        "type": htype,
                        "area": area,
                        "city": city.title(),
                        "rating": str(h.get("rating", "")),
                        "reviews": h.get("reviews", h.get("reviews_original", 0)),
                        "price_range": price,
                        "photo_url": photo,
                        "tripadvisor_url": link,
                        "maps_url": f"https://www.google.com/maps/search/{name.replace(' ', '+')}+{city.title()}",
                        "why": why,
                        "highlight": htype,
                        "recommended": False,
                        "tier": "recommended",
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
        except Exception as _pe:
            logger.warning(f"Hotel formatting error: {_pe}")

        logger.info(f"✓ Custom plan generated: {ai_response.get('destination')}")
        return ai_response

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Custom plan error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to generate custom plan: {str(e)}")
