from datetime import datetime, timezone
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class NotificationType:
    MAINTENANCE_ASSIGNED = "maintenance_assigned"
    CRITICAL_ALERT = "critical_alert"
    LOW_STOCK = "low_stock"
    ORDER_NEW = "order_new"
    RESERVATION_STATUS = "reservation_status"
    GENERAL = "general"

class Notification(Base):
    __tablename__ = "notifications"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    recipient_user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    target_role: Mapped[str | None] = mapped_column(String(30), nullable=True, index=True) # e.g. "maintenance_staff", "restaurant_staff"
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[str] = mapped_column(String(30), default=NotificationType.GENERAL, nullable=False)
    reference_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    recipient = relationship("User")
