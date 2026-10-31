from pydantic import BaseModel
from datetime import datetime
from app.schemas.auth import UserResponse
from app.schemas.room import RoomResponse

class MaintenanceCreate(BaseModel):
    room_id: int | None = None
    location_description: str
    title: str
    description: str
    priority: str = "medium" # low, medium, high, critical

class MaintenanceAssignRequest(BaseModel):
    assigned_to_user_id: int

class MaintenanceStatusUpdate(BaseModel):
    status: str
    resolution_notes: str | None = None

class MaintenanceResponse(BaseModel):
    id: int
    room_id: int | None
    location_description: str
    title: str
    description: str
    priority: str
    status: str
    reported_by_user_id: int
    assigned_to_user_id: int | None
    resolution_notes: str | None
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime
    room: RoomResponse | None = None
    reported_by: UserResponse | None = None
    assigned_to: UserResponse | None = None

    class Config:
        from_attributes = True
