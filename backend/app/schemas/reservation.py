from pydantic import BaseModel
from decimal import Decimal
from datetime import date, datetime
from app.schemas.guest import GuestResponse
from app.schemas.room import RoomResponse

class ReservationCreate(BaseModel):
    guest_id: int
    room_id: int
    check_in_date: date
    check_out_date: date
    num_guests: int = 1
    special_requests: str | None = None

class ReservationUpdate(BaseModel):
    check_in_date: date | None = None
    check_out_date: date | None = None
    num_guests: int | None = None
    room_id: int | None = None
    status: str | None = None
    special_requests: str | None = None

class ReservationResponse(BaseModel):
    id: int
    reservation_code: str
    guest_id: int
    room_id: int
    check_in_date: date
    check_out_date: date
    num_guests: int
    nightly_rate_snapshot: Decimal
    total_estimated_amount: Decimal
    status: str
    special_requests: str | None
    created_at: datetime
    guest: GuestResponse | None = None
    room: RoomResponse | None = None
    
    class Config:
        from_attributes = True

class StayCheckInRequest(BaseModel):
    reservation_id: int
    initial_room_condition_notes: str | None = None

class StayCheckOutRequest(BaseModel):
    checkout_notes: str | None = None

class StayResponse(BaseModel):
    id: int
    reservation_id: int
    room_id: int
    guest_id: int
    actual_check_in: datetime
    actual_check_out: datetime | None
    status: str
    checked_in_by_user_id: int
    checked_out_by_user_id: int | None
    initial_room_condition_notes: str | None
    checkout_notes: str | None
    created_at: datetime
    reservation: ReservationResponse | None = None
    guest: GuestResponse | None = None
    room: RoomResponse | None = None

    class Config:
        from_attributes = True
