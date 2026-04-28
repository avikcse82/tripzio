from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, users, itinerary, weather, hotels, agents
from core.config import settings
import os

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Tripzio — India's AI Travel Intelligence Platform",
    docs_url="/docs" if os.getenv("DEBUG", "False") == "True" else None,
    redoc_url=None
)

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://192.168.0.100:5173",
    "https://tripzio.io",
    "https://www.tripzio.io",
    "https://tripzio.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(itinerary.router)
app.include_router(weather.router)
app.include_router(hotels.router)
app.include_router(agents.router)  # ← NEW

@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running ✓",
        "website": "https://tripzio.io"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "openai": "configured" if settings.OPENAI_API_KEY else "missing",
        "weather": "configured" if settings.OPENWEATHERMAP_API_KEY else "missing",
        "supabase": "configured" if settings.SUPABASE_URL else "missing",
        "google_places": "configured" if settings.GOOGLE_PLACES_API_KEY else "missing",
    }
