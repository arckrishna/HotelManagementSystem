from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
from app.schemas.room import RoomResponse
from app.schemas.guest import GuestResponse

class MenuItemBase(BaseModel):
    department: str = "restaurant" # restaurant, bar
    name: str
    category: str
    description: str | None = None
    price: Decimal
    is_available: bool = True
    image_url: str | None = None
    preparation_time_minutes: int = 15

class MenuItemCreate(MenuItemBase):
    pass

class MenuItemUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    description: str | None = None
    price: Decimal | None = None
    is_available: bool | None = None
    image_url: str | None = None
    preparation_time_minutes: int | None = None

class MenuItemResponse(MenuItemBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class TableBase(BaseModel):
    table_number: str
    capacity: int = 4
    status: str = "available"

class TableCreate(TableBase):
    pass

class TableResponse(TableBase):
    id: int
    
    class Config:
        from_attributes = True

class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int = 1

class OrderItemResponse(BaseModel):
    id: int
    order_id: int
    menu_item_id: int
    item_name_snapshot: str
    unit_price_snapshot: Decimal
    quantity: int
    subtotal: Decimal
    
    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    department: str = "restaurant" # restaurant, bar
    order_type: str = "dine_in" # dine_in, room_service, takeaway
    table_id: int | None = None
    room_id: int | None = None
    guest_id: int | None = None
    stay_id: int | None = None
    is_billed_to_room: bool = False
    notes: str | None = None
    items: list[OrderItemCreate]

class OrderStatusUpdate(BaseModel):
    status: str # new, confirmed, preparing, ready, completed, cancelled

class OrderResponse(BaseModel):
    id: int
    order_number: str
    department: str
    order_type: str
    table_id: int | None
    room_id: int | None
    guest_id: int | None
    stay_id: int | None
    status: str
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    is_billed_to_room: bool
    bill_id: int | None
    inventory_deducted: bool
    notes: str | None
    created_at: datetime
    items: list[OrderItemResponse] = []
    table: TableResponse | None = None
    room: RoomResponse | None = None
    guest: GuestResponse | None = None

    class Config:
        from_attributes = True
