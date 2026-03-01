import time
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from livekit import api
from app.settings import settings
from google.protobuf.json_format import ParseDict

router = APIRouter(prefix="/livekit", tags=["livekit"])


class TokenRequest(BaseModel):
    # Accept both snake_case (spec) and camelCase (common client usage).
    room_name: str | None = Field(default=None, alias="roomName")
    participant_identity: str | None = Field(default=None, alias="participantIdentity")
    participant_name: str | None = Field(default=None, alias="participantName")
    participant_metadata: str | None = Field(default=None, alias="participantMetadata")
    participant_attributes: dict[str, str] | None = Field(
        default=None, alias="participantAttributes"
    )
    room_config: dict[str, Any] | None = Field(default=None, alias="roomConfig")

    model_config = {
        # Allow clients to send either the field name or its alias.
        "populate_by_name": True,
        "extra": "ignore",
    }


@router.post("/token", status_code=201)
async def create_token(body: TokenRequest):
    """
    LiveKit standardized token endpoint.

    Request/response schema matches:
    https://docs.livekit.io/frontends/build/authentication/endpoint/
    """
    server_url = settings.LIVEKIT_URL
    api_key = settings.LIVEKIT_API_KEY
    api_secret = settings.LIVEKIT_API_SECRET

    if not server_url or not api_key or not api_secret:
        raise HTTPException(status_code=500, detail="LiveKit env vars missing")

    room_name = body.room_name or f"room-{int(time.time())}"
    identity = body.participant_identity or f"user-{int(time.time())}"
    name = body.participant_name or "User"

    token = (
        api.AccessToken(api_key, api_secret)
        .with_identity(identity)
        .with_name(name)
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
            )
        )
    )

    if body.participant_metadata:
        token = token.with_metadata(body.participant_metadata)
    if body.participant_attributes:
        token = token.with_attributes(body.participant_attributes)
    if body.room_config:
        # Client SDKs pack agent dispatch into room_config automatically (important for 1:1 agents).
        try:
            room_config_msg = ParseDict(
                body.room_config,
                api.RoomConfiguration(),
                ignore_unknown_fields=True,
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail="Invalid room_config") from e
        token = token.with_room_config(room_config_msg)

    return {"server_url": server_url, "participant_token": token.to_jwt()}
