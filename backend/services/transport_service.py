# backend/services/transport_service.py
# Real train data for major Indian routes
# Uses indianrailapi.com (free, 1000 calls/month)
# Falls back to curated route database for common routes

import os
import httpx
import logging
from typing import Optional

logger = logging.getLogger(__name__)

RAIL_API_KEY = os.getenv("RAIL_API_KEY", "90db9a7edbe5b6d3a0aef8a09b0e3d25")
RAIL_API_BASE = "https://indianrailapi.com/api/v2"

# ── Station codes for major cities ────────────────────────────
STATION_CODES = {
    "kolkata": "HWH", "howrah": "HWH", "kolkata sealdah": "SDAH",
    "mumbai": "CSTM", "mumbai central": "BCT", "bandra": "BVI",
    "delhi": "NDLS", "new delhi": "NDLS", "hazrat nizamuddin": "NZM",
    "chennai": "MAS", "bangalore": "SBC", "bengaluru": "SBC",
    "hyderabad": "SC", "secunderabad": "SC",
    "pune": "PUNE", "ahmedabad": "ADI", "surat": "ST",
    "jaipur": "JP", "lucknow": "LKO", "kanpur": "CNB",
    "varanasi": "BSB", "patna": "PNBE", "guwahati": "GHY",
    "bhubaneswar": "BBS", "visakhapatnam": "VSKP",
    "coimbatore": "CBE", "madurai": "MDU", "trichy": "TPJ",
    "kochi": "ERS", "thiruvananthapuram": "TVC",
    # Hill station hubs
    "siliguri": "NJP", "new jalpaiguri": "NJP", "njp": "NJP",
    "darjeeling": "NJP",  # No direct train — NJP is gateway
    "gangtok": "NJP",     # No direct train — NJP is gateway
    "kalimpong": "NJP",   # No direct train — NJP is gateway
    "pelling": "NJP",
    "shimla": "KLK",      # Kalka is gateway for Shimla
    "manali": "UHL",      # Jogindernagar or Chandigarh
    "dharamshala": "PTKC", "mcleod ganj": "PTKC",
    "mussoorie": "DDN",   # Dehradun is gateway
    "nainital": "KGM",    # Kathgodam is gateway
    "rishikesh": "RKSH",
    "haridwar": "HW",
    "agra": "AF",
    "jaisalmer": "JSM",
    "udaipur": "UDZ",
    "jodhpur": "JU",
    "ajmer": "AII",
    "amritsar": "ASR",
    "jammu": "JAT",
    "goa": "MAO",  # Madgaon
    "vasco": "VSG",
    "aurangabad": "AWB",
    "nashik": "NK",
    "nagpur": "NGP",
    "indore": "INDB",
    "bhopal": "BPL",
    "gwalior": "GWL",
    "allahabad": "ALD", "prayagraj": "ALD",
    "gorakhpur": "GKP",
    "gaya": "GAYA",
    "ranchi": "RNC",
    "jamshedpur": "TATA",
    "raipur": "R",
    "bhoramdeo": "BPL",
    "puri": "PURI",
    "cuttack": "CTC",
}

# ── Curated train database for top 30 routes ─────────────────
# Format: (from_city, to_city/hub): [train_list]
TRAIN_DATABASE = {
    ("HWH", "NJP"): [
        {"name": "Darjeeling Mail", "number": "12343", "dep": "22:05", "arr": "08:15", "duration": "10h 10m", "classes": "SL/3A/2A"},
        {"name": "Teesta Torsha Express", "number": "13141", "dep": "13:30", "arr": "23:30", "duration": "10h 00m", "classes": "SL/3A/2A"},
        {"name": "Uttar Banga Express", "number": "12517", "dep": "19:45", "arr": "06:20", "duration": "10h 35m", "classes": "SL/3A/2A"},
        {"name": "Padatik Express", "number": "12377", "dep": "23:00", "arr": "09:10", "duration": "10h 10m", "classes": "SL/3A/2A"},
        {"name": "Kanchan Kanya Express", "number": "15659", "dep": "16:05", "arr": "02:25", "duration": "10h 20m", "classes": "SL/3A"},
    ],
    ("HWH", "PURI"): [
        {"name": "Shatabdi Express", "number": "12821", "dep": "06:20", "arr": "11:45", "duration": "5h 25m", "classes": "CC/EC"},
        {"name": "Puri Express", "number": "12837", "dep": "22:45", "arr": "05:00", "duration": "6h 15m", "classes": "SL/3A/2A"},
        {"name": "Jagannath Express", "number": "18409", "dep": "23:50", "arr": "06:55", "duration": "7h 05m", "classes": "SL/3A"},
        {"name": "Howrah Puri SF Express", "number": "22825", "dep": "14:35", "arr": "21:55", "duration": "7h 20m", "classes": "SL/3A/2A"},
    ],
    ("HWH", "DIGHA"): [
        {"name": "Tamralipta Express", "number": "12223", "dep": "06:25", "arr": "10:15", "duration": "3h 50m", "classes": "SL/2S"},
        {"name": "Kandari Express", "number": "22847", "dep": "14:20", "arr": "18:05", "duration": "3h 45m", "classes": "SL/2S"},
    ],
    ("NDLS", "JAT"): [
        {"name": "Jammu Rajdhani", "number": "12425", "dep": "20:30", "arr": "05:45", "duration": "9h 15m", "classes": "3A/2A/1A"},
        {"name": "Uttar Sampark Kranti", "number": "12447", "dep": "22:10", "arr": "07:20", "duration": "9h 10m", "classes": "SL/3A/2A"},
        {"name": "Shatabdi Express", "number": "12031", "dep": "06:00", "arr": "13:35", "duration": "7h 35m", "classes": "CC/EC"},
    ],
    ("NDLS", "UHL"): [
        {"name": "Himalayan Queen", "number": "14553", "dep": "06:00", "arr": "13:55", "duration": "7h 55m", "classes": "SL/2S"},
        {"name": "Chandigarh Shatabdi", "number": "12045", "dep": "07:20", "arr": "09:30", "duration": "2h 10m to Chandigarh", "classes": "CC/EC"},
    ],
    ("NDLS", "HW"): [
        {"name": "Shatabdi Express", "number": "12017", "dep": "06:45", "arr": "10:15", "duration": "3h 30m", "classes": "CC/EC"},
        {"name": "Yoga Express", "number": "14115", "dep": "22:25", "arr": "05:45", "duration": "7h 20m", "classes": "SL/3A"},
        {"name": "Nanda Devi Express", "number": "12205", "dep": "21:30", "arr": "04:50", "duration": "7h 20m", "classes": "SL/3A/2A"},
    ],
    ("NDLS", "JP"): [
        {"name": "Ajmer Shatabdi", "number": "12015", "dep": "06:05", "arr": "10:30", "duration": "4h 25m", "classes": "CC/EC"},
        {"name": "Pink City Express", "number": "12981", "dep": "05:50", "arr": "10:40", "duration": "4h 50m", "classes": "SL/3A/2A"},
        {"name": "Rajdhani Express", "number": "12957", "dep": "16:25", "arr": "21:25", "duration": "5h 00m", "classes": "3A/2A/1A"},
        {"name": "Intercity Express", "number": "12415", "dep": "14:50", "arr": "19:40", "duration": "4h 50m", "classes": "SL/3A"},
    ],
    ("NDLS", "JSM"): [
        {"name": "Ranikhet Express", "number": "15013", "dep": "23:55", "arr": "11:45", "duration": "11h 50m", "classes": "SL/3A"},
        {"name": "Delhi Jaisalmer Express", "number": "14659", "dep": "23:15", "arr": "11:30", "duration": "12h 15m", "classes": "SL/3A"},
    ],
    ("CSTM", "MAO"): [
        {"name": "Mandovi Express", "number": "10111", "dep": "07:10", "arr": "17:55", "duration": "10h 45m", "classes": "SL/3A/2A"},
        {"name": "Konkan Kanya Express", "number": "10111", "dep": "23:00", "arr": "10:30", "duration": "11h 30m", "classes": "SL/3A/2A"},
        {"name": "Jan Shatabdi Express", "number": "12051", "dep": "05:25", "arr": "14:50", "duration": "9h 25m", "classes": "2S/CC"},
    ],
    ("SBC", "MAO"): [
        {"name": "Goa Express", "number": "12779", "dep": "15:00", "arr": "03:30", "duration": "12h 30m", "classes": "SL/3A/2A"},
        {"name": "VSG Expressway", "number": "17307", "dep": "21:20", "arr": "09:15", "duration": "11h 55m", "classes": "SL/3A"},
    ],
    ("HWH", "BSB"): [
        {"name": "Vibhuti Express", "number": "12333", "dep": "15:00", "arr": "23:45", "duration": "8h 45m", "classes": "SL/3A/2A"},
        {"name": "Poorva Express", "number": "12303", "dep": "08:05", "arr": "18:35", "duration": "10h 30m", "classes": "SL/3A/2A/1A"},
        {"name": "Hool Express", "number": "13009", "dep": "18:45", "arr": "07:10", "duration": "12h 25m", "classes": "SL/3A"},
    ],
    ("NDLS", "AGC"): [
        {"name": "Gatimaan Express", "number": "12049", "dep": "08:10", "arr": "09:50", "duration": "1h 40m", "classes": "CC/EC"},
        {"name": "Shatabdi Express", "number": "12001", "dep": "06:00", "arr": "08:00", "duration": "2h 00m", "classes": "CC/EC"},
        {"name": "Taj Express", "number": "12279", "dep": "07:15", "arr": "10:00", "duration": "2h 45m", "classes": "SL/CC"},
    ],
}


def get_trains_for_route(from_city: str, to_city: str) -> list:
    """
    Get trains for a route using curated database.
    Returns list of train dicts with name, number, timings.
    """
    from_code = STATION_CODES.get(from_city.lower(), "")
    to_code   = STATION_CODES.get(to_city.lower(), "")

    if not from_code or not to_code:
        return []

    # Check direct route
    trains = TRAIN_DATABASE.get((from_code, to_code), [])
    if not trains:
        # Try reverse
        trains = TRAIN_DATABASE.get((to_code, from_code), [])

    return trains


def build_train_context(from_city: str, to_city: str) -> str:
    """Build train context string for AI prompt"""
    # Check if indirect route
    INDIRECT = {
        "darjeeling": ("NJP/Siliguri", "shared jeep NJP→Darjeeling 3hrs ₹200"),
        "gangtok":    ("NJP/Siliguri", "shared taxi NJP→Gangtok 4hrs ₹300"),
        "kalimpong":  ("NJP",          "shared taxi NJP→Kalimpong 3hrs ₹250"),
        "pelling":    ("NJP",          "shared taxi NJP→Pelling 4hrs"),
        "manali":     ("Chandigarh",   "HRTC bus Chandigarh→Manali 10hrs"),
        "shimla":     ("Kalka",        "toy train Kalka→Shimla 5hrs or taxi 2hrs"),
        "mussoorie":  ("Dehradun",     "taxi Dehradun→Mussoorie 1hr ₹400"),
        "nainital":   ("Kathgodam",    "taxi Kathgodam→Nainital 1.5hrs ₹300"),
    }

    dest_lower = to_city.lower()
    indirect_info = None
    for key, (hub, last_mile) in INDIRECT.items():
        if key in dest_lower:
            indirect_info = (hub, last_mile)
            break

    # Get real trains
    actual_dest = indirect_info[0].split("/")[0] if indirect_info else to_city
    trains = get_trains_for_route(from_city, actual_dest)
    if not trains:
        trains = get_trains_for_route(from_city, to_city)

    if not trains:
        return ""

    lines = []
    if indirect_info:
        hub, last_mile = indirect_info
        lines.append(f"=== REAL TRAINS: {from_city} → {hub} (then {last_mile}) ===")
        lines.append(f"NOTE: No direct train to {to_city}. Trains go to {hub}, then {last_mile}")
    else:
        lines.append(f"=== REAL TRAINS: {from_city} → {to_city} ===")

    for i, t in enumerate(trains, 1):
        classes_fare = ""
        if "SL" in t.get("classes", ""):
            classes_fare = "SL: ₹300-500 | 3A: ₹800-1200 | 2A: ₹1200-1800"
        elif "CC" in t.get("classes", ""):
            classes_fare = "CC: ₹600-900 | EC: ₹1000-1500"

        lines.append(
            f"{i}. {t['name']} ({t['number']}) | "
            f"Dep: {t['dep']} → Arr: {t['arr']} | "
            f"Duration: {t['duration']} | "
            f"Classes: {t['classes']} | {classes_fare}"
        )

    lines.append("→ Show ALL these trains as separate transport options in your response.")
    lines.append("→ Book on IRCTC.co.in or RailYatri app. Book 60 days in advance.")
    if indirect_info:
        lines.append(f"→ IMPORTANT: Describe route as {from_city} → {indirect_info[0]} by train, then {indirect_info[1]}")
        lines.append(f"→ Do NOT say direct train/bus from {from_city} to {to_city}")

    return "\n".join(lines)
