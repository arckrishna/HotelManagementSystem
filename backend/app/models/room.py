from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import String, Integer, Numeric, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class RoomStatus:
    AVAILABLE = "available"
    RESERVED = "reserved"
    OCCUPIED = "occupied"
    CLEANING = "cleaning"
    MAINTENANCE = "maintenance"
    
    ALL_STATUSES = [AVAILABLE, RESERVED, OCCUPIED, CLEANING, MAINTENANCE]

class RoomCategory(Base):
    __tablename__ = "room_categories"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    base_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    max_capacity: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    amenities: Mapped[str | None] = mapped_column(Text, nullable=True) # JSON or comma separated string
    
    rooms = relationship("Room", back_populates="category")

class Room(Base):
    __tablename__ = "rooms"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    room_number: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    category_id: Mapped[int] = mapped_column(Integer, ForeignKey("room_categories.id"), nullable=False)
    floor: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=RoomStatus.AVAILABLE, index=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc), 
        nullable=False
    )

    category = relationship("RoomCategory", back_populates="rooms")
    reservations = relationship("Reservation", back_populates="room")
    stays = relationship("Stay", back_populates="room")
    maintenance_requests = relationship("MaintenanceRequest", back_populates="room")
