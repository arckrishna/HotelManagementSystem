from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import String, Integer, Numeric, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class BillStatus:
    OPEN = "open"
    FINALIZED = "finalized"
    PAID = "paid"
    CANCELLED = "cancelled"
    
    ALL_STATUSES = [OPEN, FINALIZED, PAID, CANCELLED]

class PaymentMethod:
    CASH = "cash"
    CARD = "card"
    UPI = "upi"
    
    ALL_METHODS = [CASH, CARD, UPI]

class ChargeType:
    ROOM = "room"
    RESTAURANT = "restaurant"
    BAR = "bar"
    SERVICE = "service"
    TAX = "tax"
    DISCOUNT = "discount"

class Bill(Base):
    __tablename__ = "bills"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bill_number: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    guest_id: Mapped[int] = mapped_column(Integer, ForeignKey("guests.id"), nullable=False)
    stay_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("stays.id"), nullable=True, unique=True)
    reservation_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("reservations.id"), nullable=True, unique=True)
    room_charges: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    restaurant_charges: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    bar_charges: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    other_charges: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    outstanding_balance: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("0.00"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=BillStatus.OPEN, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    finalized_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    guest = relationship("Guest", back_populates="bills")
    stay = relationship("Stay", back_populates="bill")
    reservation = relationship("Reservation", back_populates="bill")
    line_items = relationship("BillLineItem", back_populates="bill", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="bill", cascade="all, delete-orphan")
    attached_orders = relationship("Order", back_populates="bill")

class BillLineItem(Base):
    __tablename__ = "bill_line_items"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bill_id: Mapped[int] = mapped_column(Integer, ForeignKey("bills.id", ondelete="CASCADE"), nullable=False)
    charge_type: Mapped[str] = mapped_column(String(30), nullable=False) # room, restaurant, bar, service, tax, discount
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    source_reference_id: Mapped[str | None] = mapped_column(String(50), nullable=True) # e.g. order_id or stay_id
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    bill = relationship("Bill", back_populates="line_items")

class Payment(Base):
    __tablename__ = "payments"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    payment_number: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    bill_id: Mapped[int] = mapped_column(Integer, ForeignKey("bills.id", ondelete="CASCADE"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(20), nullable=False) # cash, card, upi
    reference_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    recorded_by_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    bill = relationship("Bill", back_populates="payments")
    recorded_by = relationship("User")
