from pydantic import BaseModel
from datetime import datetime

class NotificationResponse(BaseModel):
    id: int
    recipient_user_id: int | None
    target_role: str | None
    title: str
    message: str
    notification_type: str
    reference_id: str | None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
