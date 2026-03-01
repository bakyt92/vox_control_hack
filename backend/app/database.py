from __future__ import annotations

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.settings import settings

mongo_client: AsyncIOMotorClient | None = None
mongo_db: AsyncIOMotorDatabase | None = None


async def connect_to_mongo() -> None:
    """Initialize the global Mongo client and database handle."""
    global mongo_client, mongo_db
    mongo_client = AsyncIOMotorClient(settings.MONGODB_URI)
    mongo_db = mongo_client[settings.MONGODB_DB]

    # Validate connectivity early (fail fast on startup).
    await mongo_client.admin.command("ping")


async def close_mongo_connection() -> None:
    """Close the global Mongo client."""
    global mongo_client, mongo_db
    if mongo_client is not None:
        mongo_client.close()
    mongo_client = None
    mongo_db = None


def get_db() -> AsyncIOMotorDatabase:
    """FastAPI dependency to access the configured Mongo database."""
    if mongo_db is None:
        raise RuntimeError(
            "MongoDB is not initialized. Did you forget to call connect_to_mongo()?"
        )
    return mongo_db
