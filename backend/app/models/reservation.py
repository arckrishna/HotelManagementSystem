from datetime import datetime, date, timezone
from decimal import Decimal
from sqlalchemy import String, Integer, Numeric, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class ReservationStatus:
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    CANCELLED = "cancelled"
    
    ALL_STATUSES = [PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED]

class StayStatus:
    ACTIVE = "active"
    COMPLETED = "completed"

class Reservation(Base):
    __tablename__ = "reservations"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    reservation_code: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    guest_id: Mapped[int] = mapped_column(Integer, ForeignKey("guests.id"), nullable=False)
    room_id: Mapped[int] = mapped_column(Integer, ForeignKey("rooms.id"), nullable=False)
    check_in_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    check_out_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    num_guests: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    nightly_rate_snapshot: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    total_estimated_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=ReservationStatus.CONFIRMED, index=True, nullable=False)
    special_requests: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc), 
        nullable=False
    )

    guest = relationship("Guest", back_populates="reservations")
    room = relationship("Room", back_populates="reservations")
    stay = relationship("Stay", back_populates="reservation", uselist=False)
    bill = relationship("Bill", back_populates="reservation", uselist=False)

class Stay(Base):
    __tablename__ = "stays"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    reservation_id: Mapped[int] = mapped_column(Integer, ForeignKey("reservations.id"), nullable=False, unique=True)
    room_id: Mapped[int] = mapped_column(Integer, ForeignKey("rooms.id"), nullable=False)
    guest_id: Mapped[int] = mapped_column(Integer, ForeignKey("guests.id"), nullable=False)
    actual_check_in: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    actual_check_out: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=StayStatus.ACTIVE, nullable=False)
    checked_in_by_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    checked_out_by_user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    initial_room_condition_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    checkout_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    reservation = relationship("Reservation", back_populates="stay")
    room = relationship("Room", back_populates="stays")
    guest = relationship("Guest", back_populates="stays")
    orders = relationship("Order", back_populates="stay")
    bill = relationship("Bill", back_populates="stay", uselist=False)
