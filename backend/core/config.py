from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Tripzio"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Security
    # No default on purpose — a hardcoded fallback here would let anyone who
    # reads this file (or a repo history leak) forge valid JWTs for any user.
    # Missing SECRET_KEY should fail loudly at startup, not silently run with
    # a known value.
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days — stay logged in

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""

    # OpenAI
    OPENAI_API_KEY: str = ""
    # Open weather map
    OPENWEATHERMAP_API_KEY: str = ""
    # Google Places
    GOOGLE_PLACES_API_KEY: str = ""
    # SerpAPI
    SERPAPI_KEY: str = ""
    # Anthropic
    ANTHROPIC_API_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
