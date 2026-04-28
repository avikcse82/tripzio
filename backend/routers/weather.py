from fastapi import APIRouter, HTTPException
from core.config import settings
import httpx
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/weather", tags=["Weather"])

# Comprehensive Indian city coordinates
CITY_COORDS = {
    # Hill Stations — West Bengal / Sikkim
    "darjeeling": (27.0360, 88.2627),
    "kurseong": (26.8801, 88.2760),
    "kalimpong": (27.0660, 88.4677),
    "gangtok": (27.3389, 88.6065),
    "pelling": (27.2986, 88.1089),
    "lachung": (27.6877, 88.7453),
    "mirik": (26.8873, 88.1837),
    "siliguri": (26.7271, 88.3953),

    # Hill Stations — Himachal Pradesh
    "manali": (32.2396, 77.1887),
    "shimla": (31.1048, 77.1734),
    "dharamsala": (32.2190, 76.3234),
    "mcleod ganj": (32.2427, 76.3234),
    "kasauli": (30.8996, 76.9647),
    "dalhousie": (32.5387, 75.9734),
    "spiti": (32.2461, 78.0338),
    "kaza": (32.2272, 78.0716),
    "kullu": (31.9579, 77.1098),
    "chail": (30.9760, 77.2006),
    "narkanda": (31.2693, 77.4479),
    "palampur": (32.1125, 76.5370),
    "barot": (31.9800, 76.8800),

    # Hill Stations — Uttarakhand
    "rishikesh": (30.0869, 78.2676),
    "haridwar": (29.9457, 78.1642),
    "mussoorie": (30.4598, 78.0644),
    "nainital": (29.3919, 79.4542),
    "almora": (29.5971, 79.6591),
    "auli": (30.5236, 79.5623),
    "chakrata": (30.6984, 77.8723),
    "lansdowne": (29.8368, 78.6858),
    "chopta": (30.3833, 79.3167),
    "munsiyari": (30.0673, 80.2380),
    "ranikhet": (29.6390, 79.4311),
    "kausani": (29.8403, 79.5962),
    "jim corbett": (29.5300, 78.7747),

    # Hill Stations — South India
    "ooty": (11.4102, 76.6950),
    "coorg": (12.3375, 75.8069),
    "kodaikanal": (10.2381, 77.4892),
    "munnar": (10.0889, 77.0595),
    "wayanad": (11.6854, 76.1320),
    "coonoor": (11.3530, 76.7959),
    "yercaud": (11.7748, 78.2072),
    "valparai": (10.3274, 76.9551),
    "chikmagalur": (13.3161, 75.7720),
    "sakleshpur": (12.9378, 75.7855),
    "agumbe": (13.5027, 75.0956),
    "horsley hills": (13.6583, 78.3957),

    # Hill Stations — Northeast
    "shillong": (25.5788, 91.8933),
    "cherrapunji": (25.2832, 91.7236),
    "mawlynnong": (25.2029, 91.9121),
    "dawki": (25.1831, 92.0208),
    "dzukou valley": (25.5000, 94.0833),
    "tawang": (27.5860, 91.8679),
    "ziro": (27.5481, 93.8268),
    "majuli": (26.9500, 94.2167),

    # Beaches — Goa
    "goa": (15.2993, 74.1240),
    "north goa": (15.5435, 73.8096),
    "south goa": (15.1667, 74.0500),
    "panaji": (15.4989, 73.8278),
    "calangute": (15.5440, 73.7553),
    "vagator": (15.6035, 73.7385),

    # Beaches — Kerala
    "kerala": (10.8505, 76.2711),
    "kochi": (9.9312, 76.2673),
    "varkala": (8.7379, 76.7163),
    "kovalam": (8.4004, 76.9787),
    "alleppey": (9.4981, 76.3388),
    "alappuzha": (9.4981, 76.3388),
    "thekkady": (9.5990, 77.1700),
    "munnar": (10.0889, 77.0595),
    "kannur": (11.8745, 75.3704),
    "kozhikode": (11.2588, 75.7804),
    "thrissur": (10.5276, 76.2144),

    # Beaches — Tamil Nadu / Others
    "pondicherry": (11.9416, 79.8083),
    "mahabalipuram": (12.6269, 80.1927),
    "rameswaram": (9.2876, 79.3129),
    "kanyakumari": (8.0883, 77.5385),

    # Beaches — Andaman
    "andaman": (11.7401, 92.6586),
    "port blair": (11.6234, 92.7265),
    "havelock": (12.0176, 92.9858),
    "neil island": (11.8296, 93.0449),

    # Beaches — Lakshadweep / Karnataka
    "gokarna": (14.5479, 74.3188),
    "karwar": (14.8013, 74.1288),
    "udupi": (13.3409, 74.7421),
    "mangalore": (12.9141, 74.8560),

    # Heritage — Rajasthan
    "rajasthan": (27.0238, 74.2179),
    "jaipur": (26.9124, 75.7873),
    "jodhpur": (26.2389, 73.0243),
    "udaipur": (24.5854, 73.7125),
    "jaisalmer": (26.9157, 70.9083),
    "pushkar": (26.4899, 74.5511),
    "bikaner": (28.0229, 73.3119),
    "ajmer": (26.4499, 74.6399),
    "mount abu": (24.5926, 72.7156),
    "ranthambore": (26.0173, 76.5026),

    # Heritage — UP / MP
    "agra": (27.1767, 78.0081),
    "varanasi": (25.3176, 82.9739),
    "khajuraho": (24.8318, 79.9199),
    "orchha": (25.3517, 78.6430),
    "gwalior": (26.2183, 78.1828),
    "lucknow": (26.8467, 80.9462),
    "mathura": (27.4924, 77.6737),
    "vrindavan": (27.5794, 77.7022),

    # Adventure — Leh Ladakh
    "leh": (34.1526, 77.5771),
    "ladakh": (34.1526, 77.5771),
    "nubra valley": (34.6504, 77.5619),
    "pangong": (33.7539, 78.6622),
    "tso moriri": (32.9167, 78.3000),
    "zanskar": (33.5000, 76.5000),
    "kargil": (34.5539, 76.1349),

    # Metro Cities
    "delhi": (28.6139, 77.2090),
    "mumbai": (19.0760, 72.8777),
    "bangalore": (12.9716, 77.5946),
    "bengaluru": (12.9716, 77.5946),
    "chennai": (13.0827, 80.2707),
    "kolkata": (22.5726, 88.3639),
    "hyderabad": (17.3850, 78.4867),
    "pune": (18.5204, 73.8567),
    "ahmedabad": (23.0225, 72.5714),
    "surat": (21.1702, 72.8311),
    "jaipur": (26.9124, 75.7873),
    "chandigarh": (30.7333, 76.7794),
    "bhopal": (23.2599, 77.4126),
    "indore": (22.7196, 75.8577),
    "nagpur": (21.1458, 79.0882),
    "patna": (25.5941, 85.1376),
    "bhubaneswar": (20.2961, 85.8245),
    "guwahati": (26.1445, 91.7362),

    # Spiritual
    "tirupati": (13.6288, 79.4192),
    "madurai": (9.9252, 78.1198),
    "amritsar": (31.6340, 74.8723),
    "bodh gaya": (24.6961, 84.9911),
    "shirdi": (19.7673, 74.4772),
    "vrindavan": (27.5794, 77.7022),

    # Wildlife
    "kaziranga": (26.5775, 93.1711),
    "sundarbans": (21.9497, 88.8955),
    "bandhavgarh": (23.7180, 81.0408),
    "kanha": (22.3333, 80.6167),
    "periyar": (9.4584, 77.1990),

    # Unique / Offbeat
    "hampi": (15.3350, 76.4600),
    "badami": (15.9152, 75.6789),
    "pattadakal": (15.9480, 75.8130),
    "gandikota": (14.8127, 78.2649),
    "mawsynram": (25.2971, 91.5797),
    "dzukou valley": (25.5000, 94.0833),
    "majuli": (26.9500, 94.2167),
    "unakoti": (24.3231, 92.1700),
    "ziro": (27.5481, 93.8268),
    "tawang": (27.5860, 91.8679),
    "chopta": (30.3833, 79.3167),
    "dhanaulti": (30.4241, 78.2494),
    "lansdowne": (29.8368, 78.6858),
}


def get_season(month: int) -> str:
    if month in [12, 1, 2]:
        return "winter"
    elif month in [3, 4, 5]:
        return "summer"
    elif month in [6, 7, 8, 9]:
        return "monsoon"
    else:
        return "post-monsoon"


def get_packing_list(condition: str, season: str, destination: str) -> list:
    base = ["Valid ID proof", "Cash (ATM limited in remote areas)", "Power bank", "First aid kit"]
    dest_lower = destination.lower()
    cond_lower = condition.lower()

    if season == "winter" or "snow" in cond_lower or any(x in dest_lower for x in ["leh", "ladakh", "spiti", "manali", "auli", "shimla"]):
        base += ["Heavy jacket", "Thermal innerwear", "Woolen socks", "Gloves", "Muffler", "Lip balm"]
    elif season == "summer":
        base += ["Sunscreen SPF 50+", "Sunglasses", "Light cotton clothes", "Water bottle", "Cap/Hat"]
    elif season == "monsoon":
        base += ["Raincoat / Poncho", "Waterproof bag cover", "Extra footwear", "Insect repellent", "Quick-dry clothes"]

    if any(x in dest_lower for x in ["leh", "ladakh", "spiti", "kaza"]):
        base += ["Altitude sickness medicine (Diamox)", "Oxygen can", "Warm sleeping bag", "UV protection sunglasses"]
    if any(x in dest_lower for x in ["goa", "andaman", "havelock", "beach", "kovalam", "varkala"]):
        base += ["Swimwear", "Beach towel", "Waterproof phone case", "Flip flops", "After-sun lotion"]
    if any(x in dest_lower for x in ["kerala", "coorg", "wayanad", "munnar", "meghalaya", "cherrapunji"]):
        base += ["Mosquito repellent", "Light raincoat", "Comfortable walking shoes", "Leech socks if trekking"]
    if any(x in dest_lower for x in ["darjeeling", "gangtok", "sikkim", "kurseong", "kalimpong"]):
        base += ["Warm layers", "Waterproof jacket", "Comfortable walking shoes", "Camera for sunrise"]
    if any(x in dest_lower for x in ["rajasthan", "jaisalmer", "jodhpur"]):
        base += ["Scarf/dupatta for dust", "Light full-sleeve clothes", "Comfortable sandals"]

    return list(dict.fromkeys(base))[:10]


def find_coords(destination: str):
    dest_lower = destination.lower().strip()
    # Exact match first
    if dest_lower in CITY_COORDS:
        return CITY_COORDS[dest_lower]
    # Partial match
    for city, coords in CITY_COORDS.items():
        if city in dest_lower or dest_lower in city:
            return coords
    # Word by word match
    words = dest_lower.split()
    for word in words:
        if len(word) > 3:
            for city, coords in CITY_COORDS.items():
                if word in city or city in word:
                    return coords
    return None


@router.get("/current/{destination}")
async def get_weather(destination: str, date: str = None):
    try:
        dest_lower = destination.lower().strip()
        coords = find_coords(dest_lower)

        if not coords:
            logger.warning(f"Coordinates not found for: {destination}, using India center")
            coords = (20.5937, 78.9629)

        lat, lon = coords

        if not settings.OPENWEATHERMAP_API_KEY:
            return _mock_weather(destination, date)

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={
                    "lat": lat, "lon": lon,
                    "appid": settings.OPENWEATHERMAP_API_KEY,
                    "units": "metric"
                }
            )

            if resp.status_code != 200:
                logger.warning(f"Weather API error: {resp.status_code}")
                return _mock_weather(destination, date)

            data = resp.json()
            temp = data["main"]["temp"]
            feels = data["main"]["feels_like"]
            humidity = data["main"]["humidity"]
            condition = data["weather"][0]["description"].title()
            wind = data["wind"]["speed"]

            from datetime import datetime
            month = datetime.now().month
            if date:
                try:
                    month = datetime.strptime(date, "%Y-%m-%d").month
                except:
                    pass
            season = get_season(month)

            advisory = None
            if temp > 40:
                advisory = "Extreme heat — carry water, avoid midday sun"
            elif temp < 0:
                advisory = "Below freezing — heavy winter gear essential"
            elif "rain" in condition.lower() or "storm" in condition.lower():
                advisory = "Rain expected — carry waterproof gear"
            elif "snow" in condition.lower():
                advisory = "Snowfall possible — warm layers essential"

            return {
                "destination": destination,
                "temperature": f"{round(temp)}°C (feels like {round(feels)}°C)",
                "condition": condition,
                "humidity": f"{humidity}%",
                "wind": f"{round(wind * 3.6)} km/h",
                "season": season.title(),
                "advisory": advisory,
                "pack": get_packing_list(condition, season, destination),
                "coords_found": coords != (20.5937, 78.9629)
            }

    except Exception as e:
        logger.error(f"Weather error: {e}")
        return _mock_weather(destination, date)


def _mock_weather(destination: str, date: str = None) -> dict:
    from datetime import datetime
    month = datetime.now().month
    if date:
        try:
            month = datetime.strptime(date, "%Y-%m-%d").month
        except:
            pass
    season = get_season(month)
    dest_lower = destination.lower()

    # Hill stations
    if any(x in dest_lower for x in ["darjeeling", "kurseong", "kalimpong", "gangtok", "sikkim",
                                       "shimla", "manali", "mussoorie", "nainital", "ooty",
                                       "kodaikanal", "munnar", "coorg", "chikmagalur"]):
        if season == "winter":
            temp, condition = "4°C to 14°C", "Cool and misty"
        elif season == "summer":
            temp, condition = "12°C to 22°C", "Pleasant and clear"
        elif season == "monsoon":
            temp, condition = "14°C to 20°C", "Heavy rainfall"
        else:
            temp, condition = "10°C to 20°C", "Crisp and clear"

    # High altitude
    elif any(x in dest_lower for x in ["leh", "ladakh", "spiti", "kaza", "nubra", "pangong"]):
        if season == "winter":
            temp, condition = "-20°C to -2°C", "Extreme cold, roads may be closed"
        elif season == "summer":
            temp, condition = "5°C to 25°C", "Best time, clear skies"
        else:
            temp, condition = "0°C to 15°C", "Cold nights, mild days"

    # Beaches
    elif any(x in dest_lower for x in ["goa", "andaman", "havelock", "kovalam", "varkala"]):
        if season == "monsoon":
            temp, condition = "24°C to 30°C", "Heavy rainfall, rough seas"
        elif season == "winter":
            temp, condition = "22°C to 32°C", "Perfect beach weather"
        else:
            temp, condition = "28°C to 35°C", "Hot and sunny"

    # Desert / Heritage
    elif any(x in dest_lower for x in ["rajasthan", "jaisalmer", "jodhpur", "jaipur"]):
        if season == "summer":
            temp, condition = "35°C to 46°C", "Very hot and dry"
        elif season == "winter":
            temp, condition = "8°C to 25°C", "Perfect, clear and pleasant"
        else:
            temp, condition = "22°C to 32°C", "Warm, occasional rain"

    # Kerala
    elif any(x in dest_lower for x in ["kerala", "kochi", "alleppey", "thekkady"]):
        if season == "monsoon":
            temp, condition = "22°C to 29°C", "Heavy southwest monsoon"
        elif season == "winter":
            temp, condition = "20°C to 32°C", "Pleasant, best time"
        else:
            temp, condition = "26°C to 35°C", "Hot and humid"

    # Default
    else:
        temps = {
            "winter": "12°C to 26°C", "summer": "28°C to 38°C",
            "monsoon": "22°C to 30°C", "post-monsoon": "20°C to 30°C"
        }
        conds = {
            "winter": "Cool and clear", "summer": "Hot and sunny",
            "monsoon": "Rainy and overcast", "post-monsoon": "Pleasant"
        }
        temp = temps.get(season, "22°C to 30°C")
        condition = conds.get(season, "Partly cloudy")

    return {
        "destination": destination,
        "temperature": temp,
        "condition": condition,
        "humidity": "60-75%",
        "wind": "10-20 km/h",
        "season": season.title(),
        "advisory": None,
        "pack": get_packing_list(condition, season, destination),
        "coords_found": False
    }
