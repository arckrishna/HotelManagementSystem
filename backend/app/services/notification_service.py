from sqlalchemy.orm import Session
from app.models.notification import Notification, NotificationType

def create_notification(
    db: Session,
    title: str,
    message: str,
    notification_type: str = NotificationType.GENERAL,
    recipient_user_id: int | None = None,
    target_role: str | None = None,
    reference_id: str | None = None
) -> Notification:
    notif = Notification(
        recipient_user_id=recipient_user_id,
        target_role=target_role,
        title=title,
        message=message,
        notification_type=notification_type,
        reference_id=str(reference_id) if reference_id else None,
        is_read=False
    )
    db.add(notif)
    db.flush()
    return notif
