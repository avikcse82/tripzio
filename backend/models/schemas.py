from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from enum import Enum


class UserRole(str, Enum):
    USER = "user"
    AGENT = "agent"


class PlanTier(str, Enum):
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    DIAMOND = "diamond"
    PLATINUM = "platinum"


class TransportMode(str, Enum):
    CHEAPEST = "cheapest"
    BALANCED = "balanced"
    FASTEST = "fastest"
    ALL = "all"


# ── Auth schemas ──────────────────────────────
class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.USER
    business_name: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str


class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    business_name: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        from_attributes = True


# ── Itinerary Request schemas ─────────────────
class ItineraryRequest(BaseModel):
    from_city: str
    days: int
    budget: int
    trip_type: Optional[str] = None
    destination: Optional[str] = None
    destination_mode: str = "suggest"
    plan_tier: PlanTier = PlanTier.SILVER
    transport_mode: TransportMode = TransportMode.BALANCED
    start_date: Optional[str] = None
    is_flexible: bool = False


class AgentItineraryRequest(BaseModel):
    client_name: str
    client_phone: Optional[str] = None
    from_city: str
    days: int
    budget: int
    trip_type: Optional[str] = None
    destination: Optional[str] = None
    destination_mode: str = "suggest"
    plan_tier: PlanTier = PlanTier.SILVER
    transport_mode: TransportMode = TransportMode.BALANCED
    start_date: Optional[str] = None
    special_requirements: Optional[str] = None


# ── Itinerary Response schemas ────────────────
class WeatherInfo(BaseModel):
    temperature: str
    condition: str
    humidity: Optional[str] = None
    wind: Optional[str] = None
    pack: List[str] = []
    season: str
    advisory: Optional[str] = None


class TransportOption(BaseModel):
    mode: str
    description: str
    estimated_cost: str
    duration: str
    details: List[str] = []


class DayPlan(BaseModel):
    day: int
    title: str
    morning: str
    afternoon: str
    evening: str
    meals: str
    stay: str
    tips: Optional[str] = None
    estimated_cost: str


class PlaceToVisit(BaseModel):
    name: str
    type: str
    description: str
    entry_fee: Optional[str] = None
    best_time: Optional[str] = None
    duration: Optional[str] = None


class ThingToDo(BaseModel):
    category: str
    activities: List[str]


class CostBreakdown(BaseModel):
    transport: str
    accommodation: str
    food: str
    activities: str
    miscellaneous: str
    total: str


class AlternativeDestination(BaseModel):
    name: str
    reason: str
    estimated_budget: str
    highlight: str


class ItineraryResponse(BaseModel):
    destination: str
    from_city: str
    days: int
    budget: int
    plan_tier: str
    trip_type: Optional[str]
    start_date: Optional[str]
    summary: str
    highlights: List[str]
    weather: Optional[WeatherInfo]
    transport_options: List[TransportOption]
    day_plans: List[DayPlan]
    places_to_visit: List[PlaceToVisit]
    things_to_do: List[ThingToDo]
    packing_list: List[str]
    local_tips: List[str]
    permit_info: Optional[List[str]]
    cost_breakdown: CostBreakdown
    alternatives: List[AlternativeDestination]
    generated_at: str
