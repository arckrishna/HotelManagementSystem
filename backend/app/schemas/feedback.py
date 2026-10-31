from pydantic import BaseModel
from datetime import datetime
from app.schemas.guest import GuestResponse
from app.schemas.room import RoomResponse

class ServiceRequestCreate(BaseModel):
    room_id: int | None = None
    stay_id: int | None = None
    request_type: str
    details: str | None = None

class ServiceRequestStatusUpdate(BaseModel):
    status: str # pending, in_progress, completed, cancelled

class ServiceRequestResponse(BaseModel):
    id: int
    guest_id: int
    room_id: int | None
    stay_id: int | None
    request_type: str
    details: str | None
    status: str
    created_at: datetime
    resolved_at: datetime | None
    guest: GuestResponse | None = None
    room: RoomResponse | None = None

    class Config:
        from_attributes = True

class GuestFeedbackCreate(BaseModel):
    stay_id: int | None = None
    rating: int = 5
    comments: str | None = None

class GuestFeedbackResponse(BaseModel):
    id: int
    guest_id: int
    stay_id: int | None
    rating: int
    comments: str | None
    created_at: datetime
    guest: GuestResponse | None = None

    class Config:
        from_attributes = True
