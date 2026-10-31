from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class ServiceRequestStatus:
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class ServiceRequest(Base):
    __tablename__ = "service_requests"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    guest_id: Mapped[int] = mapped_column(Integer, ForeignKey("guests.id"), nullable=False)
    room_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("rooms.id"), nullable=True)
    stay_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("stays.id"), nullable=True)
    request_type: Mapped[str] = mapped_column(String(50), nullable=False) # Housekeeping, Extra Towels, Wakeup Call, Luggage
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=ServiceRequestStatus.PENDING, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    guest = relationship("Guest")
    room = relationship("Room")

class GuestFeedback(Base):
    __tablename__ = "guest_feedback"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    guest_id: Mapped[int] = mapped_column(Integer, ForeignKey("guests.id"), nullable=False)
    stay_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("stays.id"), nullable=True)
    rating: Mapped[int] = mapped_column(Integer, default=5, nullable=False) # 1 to 5 stars
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    guest = relationship("Guest")
