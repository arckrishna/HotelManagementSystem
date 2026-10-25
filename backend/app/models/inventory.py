from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import String, Integer, Numeric, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class MovementType:
    PURCHASE_RECEIPT = "purchase_receipt"
    ORDER_CONSUMPTION = "order_consumption"
    MANUAL_ADJUSTMENT = "manual_adjustment"
    WASTE_DAMAGE = "waste_damage"
    
    ALL_TYPES = [PURCHASE_RECEIPT, ORDER_CONSUMPTION, MANUAL_ADJUSTMENT, WASTE_DAMAGE]

class InventoryItem(Base):
    __tablename__ = "inventory_items"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(50), index=True, nullable=False) # Food Ingredient, Beverage, Cleaning, Linens, Guest Supplies
    unit: Mapped[str] = mapped_column(String(20), nullable=False) # kg, L, bottles, pieces, packs
    current_quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    min_threshold: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("10.00"), nullable=False)
    unit_cost: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc), 
        nullable=False
    )

    recipe_mappings = relationship("RecipeMapping", back_populates="inventory_item")
    movements = relationship("InventoryMovement", back_populates="inventory_item")

class RecipeMapping(Base):
    __tablename__ = "recipe_mappings"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    menu_item_id: Mapped[int] = mapped_column(Integer, ForeignKey("menu_items.id", ondelete="CASCADE"), nullable=False)
    inventory_item_id: Mapped[int] = mapped_column(Integer, ForeignKey("inventory_items.id", ondelete="RESTRICT"), nullable=False)
    quantity_required: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    menu_item = relationship("MenuItem", back_populates="recipe_mappings")
    inventory_item = relationship("InventoryItem", back_populates="recipe_mappings")

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    inventory_item_id: Mapped[int] = mapped_column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    movement_type: Mapped[str] = mapped_column(String(30), nullable=False)
    quantity_delta: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False) # Positive for receipt, negative for consumption
    before_quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    after_quantity: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    reference_order_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("orders.id"), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    acting_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    inventory_item = relationship("InventoryItem", back_populates="movements")
    acting_user = relationship("User")
    reference_order = relationship("Order")
