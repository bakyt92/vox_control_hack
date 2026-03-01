from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = "local"

    # Database
    MONGODB_URI: str = Field(
        ..., description="MongoDB connection URI, e.g. mongodb://localhost:27017"
    )
    MONGODB_DB: str = Field("payflows", description="MongoDB database name")

    # LiveKit (token endpoint)
    LIVEKIT_URL: str = Field(..., description="LiveKit server WebSocket URL (wss://...)")
    LIVEKIT_API_KEY: str = Field(..., description="LiveKit API key")
    LIVEKIT_API_SECRET: str = Field(..., description="LiveKit API secret")

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
    }


settings = Settings()
