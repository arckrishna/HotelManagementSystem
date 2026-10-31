from pydantic import BaseModel
from datetime import datetime
from app.schemas.auth import UserResponse

class AuditLogResponse(BaseModel):
    id: int
    user_id: int | None
    action: str
    entity_type: str
    entity_id: str
    details: str | None
    created_at: datetime
    user: UserResponse | None = None

    class Config:
        from_attributes = True
