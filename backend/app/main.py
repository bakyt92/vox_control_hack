from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import close_mongo_connection, connect_to_mongo, get_db
from app.routers.agents import router as agents_router
from app.routers.livekit_token import router as livekit_router
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    logger.info("MongoDB connected successfully")

    yield

    # Shutdown
    await close_mongo_connection()
    logger.info("MongoDB disconnected successfully")

from fastapi.middleware.cors import CORSMiddleware
app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(agents_router)
app.include_router(livekit_router)


@app.get("/health")
async def read_root(db: AsyncIOMotorDatabase = Depends(get_db)):
    # lightweight DB check
    await db.command("ping")
    return {"message": "OK"}
