from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
from app.schemas.auth import UserResponse

class InventoryItemBase(BaseModel):
    name: str
    category: str
    unit: str
    current_quantity: Decimal = Decimal("0.00")
    min_threshold: Decimal = Decimal("10.00")
    unit_cost: Decimal = Decimal("0.00")
    is_active: bool = True

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    unit: str | None = None
    min_threshold: Decimal | None = None
    unit_cost: Decimal | None = None
    is_active: bool | None = None

class InventoryItemResponse(InventoryItemBase):
    id: int
    created_at: datetime
    updated_at: datetime
    is_low_stock: bool = False

    class Config:
        from_attributes = True

class StockAdjustmentRequest(BaseModel):
    movement_type: str # purchase_receipt, manual_adjustment, waste_damage
    quantity_delta: Decimal
    reason: str | None = None

class RecipeMappingCreate(BaseModel):
    menu_item_id: int
    inventory_item_id: int
    quantity_required: Decimal

class RecipeMappingResponse(BaseModel):
    id: int
    menu_item_id: int
    inventory_item_id: int
    quantity_required: Decimal
    inventory_item: InventoryItemResponse | None = None

    class Config:
        from_attributes = True

class InventoryMovementResponse(BaseModel):
    id: int
    inventory_item_id: int
    movement_type: str
    quantity_delta: Decimal
    before_quantity: Decimal
    after_quantity: Decimal
    reference_order_id: int | None
    reason: str | None
    acting_user_id: int
    created_at: datetime
    acting_user: UserResponse | None = None
    inventory_item: InventoryItemResponse | None = None

    class Config:
        from_attributes = True
