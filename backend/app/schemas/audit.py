from pydantic import BaseModel, ConfigDict
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

    model_config = ConfigDict(from_attributes=True)
