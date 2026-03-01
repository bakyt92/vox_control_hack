from __future__ import annotations

from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_db

router = APIRouter(prefix="/agents", tags=["agents"])


# -------------------------
# Deep ObjectId converter
# -------------------------
def convert_objectids(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, list):
        return [convert_objectids(v) for v in value]
    if isinstance(value, dict):
        return {k: convert_objectids(v) for k, v in value.items()}
    return value


def serialize_mongo(doc: dict[str, Any]) -> dict[str, Any]:
    doc = dict(doc)

    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))

    return convert_objectids(doc)


# -------------------------
# POST /agents
# -------------------------
@router.post("")
async def create_agent(
    payload: dict[str, Any],
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    payload = dict(payload)
    payload.pop("_id", None)
    payload.pop("id", None)

    result = await db["agents"].insert_one(payload)

    doc = await db["agents"].find_one({"_id": result.inserted_id})
    if not doc:
        raise HTTPException(status_code=500, detail="Insert failed")

    return JSONResponse(content=serialize_mongo(doc))


# -------------------------
# GET /agents
# -------------------------
@router.get("")
async def list_agents(db: AsyncIOMotorDatabase = Depends(get_db)):
    cursor = db["agents"].find({})
    docs = await cursor.to_list(length=1000)

    return JSONResponse(content=[serialize_mongo(doc) for doc in docs])


# -------------------------
# GET /agents/{agent_id}
# -------------------------
@router.get("/{agent_id}")
async def get_agent(
    agent_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        oid = ObjectId(agent_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid agent id")

    doc = await db["agents"].find_one({"_id": oid})

    if not doc:
        raise HTTPException(status_code=404, detail="Agent not found")

    return JSONResponse(content=serialize_mongo(doc))


@router.delete("/flush")
async def flush_agents(
    password: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    HARDCODED_PASSWORD = "sgvQMyED02lCYQ63"

    if password != HARDCODED_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid password")

    result = await db["agents"].delete_many({})

    return JSONResponse(
        content={
            "status": "success",
            "deleted_count": result.deleted_count,
        }
    )


# -------------------------
# PUT /agents/{agent_id}
# -------------------------
@router.put("/{agent_id}")
async def replace_agent(
    agent_id: str,
    payload: dict[str, Any],
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        oid = ObjectId(agent_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid agent id")

    # Prevent ID spoofing
    payload = dict(payload)
    payload.pop("_id", None)
    payload.pop("id", None)

    result = await db["agents"].replace_one(
        {"_id": oid},
        payload,
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Fetch updated document
    doc = await db["agents"].find_one({"_id": oid})

    return JSONResponse(content=serialize_mongo(doc))
