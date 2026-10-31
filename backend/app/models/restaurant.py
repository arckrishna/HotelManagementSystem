from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import String, Integer, Numeric, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class DepartmentType:
    RESTAURANT = "restaurant"
    BAR = "bar"

class OrderType:
    DINE_IN = "dine_in"
    ROOM_SERVICE = "room_service"
    TAKEAWAY = "takeaway"

class OrderStatus:
    NEW = "new"
    CONFIRMED = "confirmed"
    PREPARING = "preparing"
    READY = "ready"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    
    ALL_STATUSES = [NEW, CONFIRMED, PREPARING, READY, COMPLETED, CANCELLED]

class RestaurantTable(Base):
    __tablename__ = "restaurant_tables"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    table_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="available", nullable=False) # available, occupied, reserved

    orders = relationship("Order", back_populates="table")

class MenuItem(Base):
    __tablename__ = "menu_items"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    department: Mapped[str] = mapped_column(String(20), default=DepartmentType.RESTAURANT, index=True, nullable=False) # restaurant, bar
    name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(50), index=True, nullable=False) # Starters, Mains, Desserts, Cocktails, Beers, etc.
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    preparation_time_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc), 
        nullable=False
    )

    recipe_mappings = relationship("RecipeMapping", back_populates="menu_item")

class Order(Base):
    __tablename__ = "orders"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_number: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    department: Mapped[str] = mapped_column(String(20), default=DepartmentType.RESTAURANT, index=True, nullable=False) # restaurant, bar
    order_type: Mapped[str] = mapped_column(String(20), default=OrderType.DINE_IN, nullable=False) # dine_in, room_service, takeaway
    table_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("restaurant_tables.id"), nullable=True)
    room_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("rooms.id"), nullable=True)
    guest_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("guests.id"), nullable=True)
    stay_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("stays.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default=OrderStatus.NEW, index=True, nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    is_billed_to_room: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    bill_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("bills.id", ondelete="SET NULL"), nullable=True)
    inventory_deducted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc), 
        nullable=False
    )

    table = relationship("RestaurantTable", back_populates="orders")
    room = relationship("Room")
    guest = relationship("Guest")
    stay = relationship("Stay", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    bill = relationship("Bill", back_populates="attached_orders")

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    menu_item_id: Mapped[int] = mapped_column(Integer, ForeignKey("menu_items.id"), nullable=False)
    item_name_snapshot: Mapped[str] = mapped_column(String(100), nullable=False)
    unit_price_snapshot: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem")
