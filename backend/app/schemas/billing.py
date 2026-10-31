from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
from app.schemas.guest import GuestResponse
from app.schemas.auth import UserResponse

class BillLineItemResponse(BaseModel):
    id: int
    bill_id: int
    charge_type: str
    description: str
    source_reference_id: str | None
    amount: Decimal
    created_at: datetime

    class Config:
        from_attributes = True

class PaymentCreate(BaseModel):
    amount: Decimal
    payment_method: str # cash, card, upi
    reference_number: str | None = None
    notes: str | None = None

class PaymentResponse(BaseModel):
    id: int
    payment_number: str
    bill_id: int
    amount: Decimal
    payment_method: str
    reference_number: str | None
    notes: str | None
    recorded_by_user_id: int
    created_at: datetime
    recorded_by: UserResponse | None = None

    class Config:
        from_attributes = True

class BillResponse(BaseModel):
    id: int
    bill_number: str
    guest_id: int
    stay_id: int | None
    reservation_id: int | None
    room_charges: Decimal
    restaurant_charges: Decimal
    bar_charges: Decimal
    other_charges: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    outstanding_balance: Decimal
    status: str
    created_at: datetime
    finalized_at: datetime | None
    guest: GuestResponse | None = None
    line_items: list[BillLineItemResponse] = []
    payments: list[PaymentResponse] = []

    class Config:
        from_attributes = True
