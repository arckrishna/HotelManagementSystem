from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime

class RoomCategoryBase(BaseModel):
    name: str
    description: str | None = None
    base_price: Decimal
    max_capacity: int = 2
    amenities: str | None = None

class RoomCategoryCreate(RoomCategoryBase):
    pass

class RoomCategoryResponse(RoomCategoryBase):
    id: int
    
    class Config:
        from_attributes = True

class RoomBase(BaseModel):
    room_number: str
    category_id: int
    floor: int = 1
    status: str = "available"
    notes: str | None = None

class RoomCreate(RoomBase):
    pass

class RoomUpdate(BaseModel):
    category_id: int | None = None
    floor: int | None = None
    status: str | None = None
    is_active: bool | None = None
    notes: str | None = None

class RoomResponse(RoomBase):
    id: int
    is_active: bool
    created_at: datetime
    category: RoomCategoryResponse | None = None
    
    class Config:
        from_attributes = True
