# backend/services/railway_service.py
# Live train data via RapidAPI IRCTC27
# Uses search.php — trains between stations

import os
import httpx
import logging
import time
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "")
RAPIDAPI_HOST = "irctc27.p.rapidapi.com"
BASE_URL = f"https://{RAPIDAPI_HOST}"

# Cache — 24 hours
_TRAIN_CACHE = {}
_CACHE_TTL = 86400

# Monthly API call protection
_CALL_LOG = []
_MONTHLY_LIMIT = 450
_QUOTA_EXCEEDED = False
print("🔥🔥🔥 RAILWAY_SERVICE LOADED — VERSION WITH STATION CODE FIX 🔥🔥🔥")  # Set to True when 429 received — skip irctc27 for rest of month

def _can_make_api_call() -> bool:
    """Check if we can make an API call this month"""
    now = __import__("time").time()
    month_ago = now - (30 * 24 * 3600)
    # Clean old entries
    global _CALL_LOG
    _CALL_LOG = [t for t in _CALL_LOG if t > month_ago]
    if len(_CALL_LOG) >= _MONTHLY_LIMIT:
        logger.warning(f"Railway API monthly limit reached: {len(_CALL_LOG)} calls used")
        print(f"RAILWAY API LIMIT REACHED: {len(_CALL_LOG)}/{_MONTHLY_LIMIT} calls used this month")
        return False
    return True

def _log_api_call():
    _CALL_LOG.append(__import__("time").time())
    remaining = _MONTHLY_LIMIT - len(_CALL_LOG)
    print(f"RAILWAY API CALLS: {len(_CALL_LOG)}/{_MONTHLY_LIMIT} ({remaining} remaining)")

# Multiple source stations for major cities
MULTI_STATION_CITIES = {
    "kolkata": ["HWH", "SDAH"],   # Howrah + Sealdah
    "mumbai":  ["CSTM", "LTT", "BCT"],  # CST + Lokmanya Tilak + Mumbai Central
    "delhi":   ["NDLS", "NZM", "DLI"],  # New Delhi + Nizamuddin + Old Delhi
    "chennai": ["MAS", "MS"],     # Chennai Central + Chennai Egmore
}

# ── Station codes ─────────────────────────────────────────────
STATION_CODES = {
    # Major cities
    "kolkata": "HWH", "howrah": "HWH", "sealdah": "SDAH",
    "mumbai": "CSTM", "mumbai central": "BCT", "lokmanya tilak": "LTT",
    "delhi": "NDLS", "new delhi": "NDLS", "hazrat nizamuddin": "NZM", "old delhi": "DLI",
    "chennai": "MAS", "bangalore": "SBC", "bengaluru": "SBC",
    "hyderabad": "SC", "secunderabad": "SC",
    "pune": "PUNE", "ahmedabad": "ADI", "surat": "ST",
    "jaipur": "JP", "lucknow": "LKO", "kanpur": "CNB",
    "varanasi": "BSB", "patna": "PNBE", "guwahati": "GHY",
    "bhubaneswar": "BBS", "visakhapatnam": "VSKP", "vizag": "VSKP",
    "kochi": "ERS", "thiruvananthapuram": "TVC", "trivandrum": "TVC",
    "coimbatore": "CBE", "madurai": "MDU", "trichy": "TPJ",
    "nagpur": "NGP", "indore": "INDB", "bhopal": "BPL",
    "raipur": "R", "ranchi": "RNC", "amritsar": "ASR",
    "chandigarh": "CDG", "jammu": "JAT",
    "agra": "AGC", "mathura": "MTJ",
    "allahabad": "ALD", "prayagraj": "ALD",
    "gorakhpur": "GKP", "gaya": "GAYA",
    "aurangabad": "AWB", "nashik": "NK",
    "mangalore": "MAQ", "hubli": "UBL",
    "jodhpur": "JU", "udaipur": "UDZ",
    "jaisalmer": "JSM", "ajmer": "AII",
    "goa": "MAO", "madgaon": "MAO", "vasco": "VSG",
    "puri": "PURI", "cuttack": "CTC",
    "digha": "DGHA",

    # Hill station GATEWAYS (nearest railhead)
    "darjeeling": "NJP",
    "gangtok": "NJP",
    "kalimpong": "NJP",
    "pelling": "NJP",
    "lachung": "NJP",
    "yuksom": "NJP",
    "new jalpaiguri": "NJP", "njp": "NJP", "siliguri": "NJP",

    "shimla": "KLK",
    "manali": "UHL",       # Jogindernagar nearest, then taxi
    "dharamshala": "PTKC",
    "mcleod ganj": "PTKC",
    "kasol": "PTKC",       # Pathankot then bus
    "bir billing": "PTKC",
    "spiti": "KLK",        # Kalka→Shimla then bus to Spiti
    "kaza": "KLK",
    "lahaul": "KLK",

    "mussoorie": "DDN",
    "dehradun": "DDN",
    "rishikesh": "RKSH",
    "haridwar": "HW",
    "nainital": "KGM",     # Kathgodam
    "kathgodam": "KGM",
    "corbett": "RMR",      # Ramnagar
    "chopta": "RKSH",
    "kedarnath": "HW",
    "badrinath": "HW",
    "hemkund": "HW",
    "valley of flowers": "HW",

    "ooty": "CBE",         # Coimbatore then toy train
    "kodaikanal": "MDU",   # Madurai then bus
    "munnar": "ERS",       # Kochi then bus
    "wayanad": "CLT",      # Kozhikode
    "varkala": "TVC",
    "kovalam": "TVC",
    "alleppey": "ALLP", "alappuzha": "ALLP",
    "thekkady": "ERS",
    "coorg": "MYS",        # Mysore then bus

    "tawang": "GHY",       # Guwahati then taxi 12hrs
    "kaziranga": "FKG",    # Furkating
    "majuli": "JHM",       # Jorhat
    "shillong": "GHY",
    "cherrapunji": "GHY",
    "dawki": "GHY",
    "ziro": "NHLN",        # Naharlagun (Itanagar)
    "dzukou": "DKWI",      # Dimapur

    "leh": "JAT",          # No train to Leh — Jammu is nearest
    "ladakh": "JAT",
    "pangong": "JAT",
    "nubra": "JAT",

    "andaman": None,       # Flight only
    "lakshadweep": None,   # Ship/flight only
    "kashmir": "JAT",
    "srinagar": "JAT",
    "gulmarg": "JAT",
    "pahalgam": "JAT",
    "sonamarg": "JAT",

    "pushkar": "AII",      # Ajmer
    "ranthambore": "SWM",  # Sawai Madhopur
    "jaisalmer": "JSM",

    "hampi": "HPT",        # Hospet
    "mysore": "MYS",
    "coorg": "MYS",
    "dandeli": "DWR",      # Dharwad
    "gokarna": "MAO",      # Madgaon then bus

    "lonavala": "LNL",
    "mahabaleshwar": "PUNE",
    "alibaug": "PUNE",
    "tarkarli": "KUDL",    # Kudal
}

# Indirect routes with last mile info
INDIRECT = {
    "darjeeling":  ("NJP",  "New Jalpaiguri", "Shared jeep NJP→Darjeeling 3hrs ₹200"),
    "gangtok":     ("NJP",  "New Jalpaiguri", "Shared taxi NJP→Gangtok 4hrs ₹300"),
    "kalimpong":   ("NJP",  "New Jalpaiguri", "Shared taxi NJP→Kalimpong 3hrs ₹250"),
    "pelling":     ("NJP",  "New Jalpaiguri", "Shared taxi NJP→Pelling 4hrs"),
    "lachung":     ("NJP",  "New Jalpaiguri", "Taxi NJP→Lachung 5hrs"),
    "manali":      ("UHL",  "Jogindernagar",   "HRTC bus/taxi to Manali 3hrs"),
    "shimla":      ("KLK",  "Kalka",           "Toy train Kalka→Shimla 5hrs or taxi 2hrs"),
    "dharamshala": ("PTKC", "Pathankot",       "Taxi Pathankot→Dharamshala 3hrs ₹500"),
    "mcleod ganj": ("PTKC", "Pathankot",       "Taxi Pathankot→McLeod Ganj 3.5hrs"),
    "kasol":       ("PTKC", "Pathankot",       "Bus Pathankot→Bhuntar then bus to Kasol 6hrs"),
    "mussoorie":   ("DDN",  "Dehradun",        "Taxi Dehradun→Mussoorie 1hr ₹400"),
    "nainital":    ("KGM",  "Kathgodam",       "Taxi Kathgodam→Nainital 1.5hrs ₹300"),
    "chopta":      ("RKSH", "Rishikesh",       "Taxi Rishikesh→Chopta 5hrs"),
    "kedarnath":   ("HW",   "Haridwar",        "Taxi Haridwar→Gaurikund 8hrs + trek 16km"),
    "spiti":       ("KLK",  "Kalka",           "Train Kalka→Shimla (toy train 5hrs) then HRTC bus Shimla→Kaza 12hrs"),
    "kaza":        ("KLK",  "Kalka",           "Train Kalka→Shimla then HRTC bus Shimla→Kaza 12hrs"),
    "ooty":        ("CBE",  "Coimbatore",      "Toy train/bus Coimbatore→Ooty 3hrs"),
    "kodaikanal":  ("MDU",  "Madurai",         "Bus Madurai→Kodaikanal 3hrs"),
    "munnar":      ("ERS",  "Ernakulam/Kochi", "Bus Kochi→Munnar 4hrs ₹200"),
    "wayanad":     ("CLT",  "Kozhikode",       "Bus Kozhikode→Wayanad 2.5hrs"),
    "tawang":      ("GHY",  "Guwahati",        "Taxi/sumo Guwahati→Tawang 12hrs"),
    "shillong":    ("GHY",  "Guwahati",        "Bus/taxi Guwahati→Shillong 3hrs ₹200"),
    "cherrapunji": ("GHY",  "Guwahati",        "Bus Guwahati→Shillong 3hrs + taxi to Cherrapunji 1.5hrs"),
    "leh":         ("JAT",  "Jammu",           "Flight Jammu/Delhi→Leh (recommended) OR road via Manali 2 days"),
    "ladakh":      ("JAT",  "Jammu",           "Flight to Leh (recommended) OR road via Manali 2 days"),
    "kashmir":     ("JAT",  "Jammu",           "Taxi Jammu→Srinagar 4hrs via NH44"),
    "srinagar":    ("JAT",  "Jammu",           "Taxi Jammu→Srinagar 4hrs via NH44"),
    "gulmarg":     ("JAT",  "Jammu",           "Taxi Jammu→Srinagar 4hrs + taxi to Gulmarg 1hr"),
    "hampi":       ("HPT",  "Hospet",          "Taxi/auto Hospet→Hampi 15mins ₹50"),
    "coorg":       ("MYS",  "Mysore",          "Bus/taxi Mysore→Coorg 3hrs"),
    "gokarna":     ("MAO",  "Madgaon",         "Bus/taxi Madgaon→Gokarna 2hrs"),
    "pushkar":     ("AII",  "Ajmer",           "Taxi/bus Ajmer→Pushkar 20mins ₹50"),
    "mahabaleshwar": ("PUNE", "Pune",          "Bus/taxi Pune→Mahabaleshwar 3hrs"),
}


def get_nearest_station(city: str):
    """Get nearest railway station code and indirect info for any city"""
    city_lower = city.lower().strip()
    code = STATION_CODES.get(city_lower)
    indirect_info = INDIRECT.get(city_lower)
    return code, indirect_info


def get_journey_date():
    """Get tomorrow's date in DD-MM-YYYY format"""
    tomorrow = datetime.now() + timedelta(days=1)
    return tomorrow.strftime("%d-%m-%Y")


async def get_trains_between_stations(from_city: str, to_city: str) -> list:
    """Fetch trains between two cities using RapidAPI IRCTC27"""
    if not RAPIDAPI_KEY:
        logger.warning("RAPIDAPI_KEY not set")
        return []

    # Check monthly limit before any API call
    if not _can_make_api_call():
        return []

    from_code, _ = get_nearest_station(from_city)
    to_code, indirect_info = get_nearest_station(to_city)

    # If destination has no direct train, use hub station
    if indirect_info:
        to_code = indirect_info[0]

    if not from_code or not to_code:
        logger.warning(f"No station code: {from_city}→{to_city}")
        return []

    if from_code == to_code:
        return []

    if from_code is None or to_code is None:
        return []

    # Get all source stations for this city (e.g. Kolkata = HWH + SDAH)
    from_city_lower = from_city.lower().strip()
    from_codes = MULTI_STATION_CITIES.get(from_city_lower, [from_code])

    # Check cache for any source station
    all_trains = []
    for fc in from_codes:
        cache_key = f"{fc}_{to_code}"
        if cache_key in _TRAIN_CACHE:
            ts, data = _TRAIN_CACHE[cache_key]
            if time.time() - ts < _CACHE_TTL:
                all_trains.extend(data)
                continue

        # Make API call for this station pair
        if not _can_make_api_call():
            break
        trains = await _fetch_trains(fc, to_code)
        # Always attach the EXACT station codes queried for THIS leg — guarantees
        # check_availability_url can be built downstream regardless of whether
        # IRCTC27 or erail.in provided the raw data (IRCTC27's response format
        # doesn't include these fields natively). Uses 'fc' (per-iteration source
        # station, e.g. SDAH not just HWH for multi-station cities like Kolkata).
        for _t in trains:
            _t.setdefault("fromStnCode", fc)
            _t.setdefault("toStnCode", to_code)
        print(f"🔥 STATION CODES STAMPED: {len(trains)} trains, fromStnCode={fc}, toStnCode={to_code}")
        all_trains.extend(trains)

    # Deduplicate by train number
    seen = set()
    unique_trains = []
    for t in all_trains:
        num = t.get("train_number", t.get("trainNumber", t.get("number", "")))
        if num not in seen:
            seen.add(num)
            unique_trains.append(t)

    return unique_trains


async def _fetch_trains(from_code: str, to_code: str) -> list:
    """Internal: fetch trains for one station pair"""
    # Skip irctc27 if quota exceeded this month
    global _QUOTA_EXCEEDED
    if _QUOTA_EXCEEDED:
        return await _fetch_trains_erail(from_code, to_code)

    cache_key = f"{from_code}_{to_code}"
    if cache_key in _TRAIN_CACHE:
        ts, data = _TRAIN_CACHE[cache_key]
        if time.time() - ts < _CACHE_TTL:
            return data

    try:
        _log_api_call()
        journey_date = get_journey_date()
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.post(
                f"{BASE_URL}/search.php",
                data={
                    "source": from_code,
                    "destination": to_code,
                    "date": journey_date,
                },
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "x-rapidapi-host": RAPIDAPI_HOST,
                    "x-rapidapi-key": RAPIDAPI_KEY,
                }
            )

            print(f"RAILWAY API: {from_code}→{to_code} status={response.status_code}")
            data = response.json()
            print(f"RAILWAY RAW KEYS: {list(data.keys()) if isinstance(data, dict) else type(data)}")
            print(f"RAILWAY RAW SAMPLE: {str(data)[:300]}")

            if response.status_code == 429:
                _QUOTA_EXCEEDED = True
                print(f"RAILWAY QUOTA EXCEEDED — switching to erail.in permanently this month")
                return await _fetch_trains_erail(from_code, to_code)
            if response.status_code != 200:
                logger.error(f"RapidAPI error: {data}")
                return await _fetch_trains_erail(from_code, to_code)

            # Correct path: data["trains"]["data"]["trainList"]
            try:
                trains = data["trains"]["data"]["trainList"]
                if not isinstance(trains, list):
                    trains = []
            except (KeyError, TypeError):
                # Fallback paths
                trains = (
                    data.get("data", {}).get("trainList", []) or
                    data.get("trainList", []) or
                    data.get("trains", []) if isinstance(data.get("trains"), list) else [] or
                    []
                )

            logger.info(f"Live trains: {len(trains)} for {from_code}→{to_code}")
            print(f"RAILWAY TRAINS FOUND: {len(trains)}")
            if trains:
                print(f"RAILWAY TRAIN KEYS: {list(trains[0].keys()) if isinstance(trains[0], dict) else trains[0]}")
            _TRAIN_CACHE[cache_key] = (time.time(), trains)
            return trains

    except Exception as e:
        logger.error(f"Railway API error: {e}")
        print(f"RAILWAY ERROR: {e} — trying erail.in fallback")
        return await _fetch_trains_erail(from_code, to_code)


def build_train_context(from_city: str, to_city: str, trains: list) -> str:
    """Build train context for AI prompt injection"""
    if not trains:
        return ""

    _, indirect_info = get_nearest_station(to_city)
    lines = []

    if indirect_info:
        _, hub_name, last_mile = indirect_info
        lines.append(f"=== LIVE TRAINS: {from_city.title()} → {hub_name} (then {last_mile}) ===")
        lines.append(f"⚠️ No direct train to {to_city.title()}. Trains go to {hub_name}, then: {last_mile}")
    else:
        lines.append(f"=== LIVE TRAINS: {from_city.title()} → {to_city.title()} ===")

    for i, t in enumerate(trains[:6], 1):
        # Field names from irctc27 API trainList items
        name = (t.get("trainName") or t.get("train_name") or
                t.get("name") or t.get("trainNumber") or "")
        number = (t.get("trainNumber") or t.get("train_number") or
                  t.get("number") or "")
        dep = (t.get("departureTime") or t.get("departure_time") or
               t.get("dep_time") or t.get("fromTime") or "")
        arr = (t.get("arrivalTime") or t.get("arrival_time") or
               t.get("arr_time") or t.get("toTime") or "")
        dur = (t.get("duration") or t.get("travelTime") or
               t.get("travel_time") or "")
        # Classes from allowedQuotas or avlClasses
        avail = t.get("avlClasses") or t.get("allowedQuotas") or t.get("classes") or ["SL","3A","2A"]
        if isinstance(avail, list):
            avail = "/".join(str(x) for x in avail)
        if not name and number:
            name = f"Train {number}"

        lines.append(f"{i}. {name} ({number}) | Dep: {dep} → Arr: {arr} | {dur} | Classes: {avail}")

    lines.append(f"CRITICAL: Add ALL {len(trains[:8])} trains above as SEPARATE transport_options entries")
    lines.append("Each train must be its own transport_option with:")
    lines.append("  mode: 'Train — [TRAIN NAME] ([NUMBER])'")
    lines.append("  type: 'Train'")
    lines.append("  operator: '[TRAIN NAME] ([NUMBER])'")
    lines.append("  description: '[FROM] → [TO HUB] by [TRAIN NAME]'")
    lines.append("  estimated_cost: 'SL: ₹200-600 | 3A: ₹600-1500 | 2A: ₹1000-2500'")
    lines.append("  duration: '[DURATION]'")
    lines.append("  details: ['Train dep [DEP] arr [ARR]', 'Then last mile']")
    lines.append("  booking_tip: 'Book on IRCTC.co.in 60 days ahead'")
    lines.append("DO NOT merge trains — each is a separate option")
    if indirect_info:
        _, hub_name, last_mile = indirect_info
        lines.append(f"NEVER say direct train to {to_city.title()} — always via {hub_name} then {last_mile}")

    return "\n".join(lines)


async def _fetch_trains_erail(from_code: str, to_code: str) -> list:
    """Fallback: fetch trains from erail.in (free, no key needed)"""
    cache_key = f"erail_{from_code}_{to_code}"
    if cache_key in _TRAIN_CACHE:
        ts, data = _TRAIN_CACHE[cache_key]
        if time.time() - ts < _CACHE_TTL:
            print(f"ERAIL CACHE HIT: {from_code}→{to_code}")
            return data

    try:
        url = f"https://erail.in/rail/getTrains.aspx"
        params = {
            "TrainNo": "",
            "Station_From": from_code,
            "Station_To": to_code,
            "DataSource": "0",
            "Language": "0",
            "Cache": "2"
        }
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(url, params=params, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })
            print(f"ERAIL: {from_code}→{to_code} status={response.status_code}")

            if response.status_code != 200:
                return []

            text = response.text.strip()
            if not text or "INVALID" in text.upper() or len(text) < 10:
                return []

            trains = []
            # erail format: records separated by ~^
            # Each record: trainNum~trainName~originCity~originCode~destCity~destCode~boardCity~boardCode~alightCity~alightCode~dep~arr~duration~runningDays~...
            # First record is metadata (no train number) — skip it
            records = text.split("~^")
            for rec in records:
                rec = rec.strip()
                if not rec:
                    continue
                parts = rec.split("~")
                if len(parts) < 12:
                    continue
                train_num = parts[0].strip()
                # Skip metadata record (no numeric train number)
                if not train_num or not train_num[0].isdigit():
                    continue
                trains.append({
                    "trainNumber":   train_num,
                    "trainName":     parts[1].strip(),
                    "fromStnCode":   parts[7].strip(),   # boarding station code
                    "departureTime": parts[10].strip(),  # departure time
                    "toStnCode":     parts[9].strip(),   # alighting station code
                    "arrivalTime":   parts[11].strip(),  # arrival time
                    "duration":      parts[12].strip(),  # duration
                    "runningDays":   parts[13].strip() if len(parts) > 13 else "",
                    "avlClasses":    ["SL", "3A", "2A", "1A"],
                })

            print(f"ERAIL TRAINS: {len(trains)} for {from_code}→{to_code}")
            if trains:
                _TRAIN_CACHE[cache_key] = (time.time(), trains)
            return trains

    except Exception as e:
        print(f"ERAIL ERROR: {e}")
        logger.error(f"erail.in fallback error: {e}")
        return []
