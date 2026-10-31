from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class UserRole:
    ADMIN = "admin"
    RECEPTIONIST = "receptionist"
    GUEST = "guest"
    RESTAURANT_STAFF = "restaurant_staff"
    BAR_STAFF = "bar_staff"
    MAINTENANCE_STAFF = "maintenance_staff"
    INVENTORY_MANAGER = "inventory_manager"
    ACCOUNTANT = "accountant"
    
    ALL_ROLES = [
        ADMIN, RECEPTIONIST, GUEST, RESTAURANT_STAFF, 
        BAR_STAFF, MAINTENANCE_STAFF, INVENTORY_MANAGER, ACCOUNTANT
    ]

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    role: Mapped[str] = mapped_column(String(30), default=UserRole.GUEST, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc), 
        nullable=False
    )

    guest_profile = relationship("Guest", back_populates="user", uselist=False)
