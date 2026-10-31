import random
import string
from datetime import datetime, timezone, date
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.room import Room, RoomStatus
from app.models.reservation import Reservation, ReservationStatus, Stay, StayStatus
from app.models.restaurant import Order, DepartmentType
from app.models.billing import Bill, BillLineItem, BillStatus, ChargeType
from app.services.audit_service import log_audit_action

def generate_bill_number() -> str:
    suffix = ''.join(random.choices(string.digits, k=5))
    return f"BILL-{date.today().year}-{suffix}"

def check_in_guest(
    db: Session,
    reservation_id: int,
    checked_in_by_user_id: int,
    initial_condition_notes: str | None = None
) -> Stay:
    res = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reservation {reservation_id} not found."
        )

    if res.status == ReservationStatus.CHECKED_IN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Guest is already checked in for this reservation."
        )

    if res.status in [ReservationStatus.CHECKED_OUT, ReservationStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot check in reservation with status '{res.status}'."
        )

    room = db.query(Room).filter(Room.id == res.room_id).with_for_update().first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    # BR-02: Room cannot be occupied or under maintenance
    if room.status == RoomStatus.OCCUPIED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Room {room.room_number} is currently Occupied by another guest."
        )
    if room.status == RoomStatus.MAINTENANCE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Room {room.room_number} is under Maintenance and cannot be allocated."
        )

    # Transition Room & Reservation statuses
    room.status = RoomStatus.OCCUPIED
    res.status = ReservationStatus.CHECKED_IN

    # Create Stay record
    stay = Stay(
        reservation_id=res.id,
        room_id=room.id,
        guest_id=res.guest_id,
        actual_check_in=datetime.now(timezone.utc),
        status=StayStatus.ACTIVE,
        checked_in_by_user_id=checked_in_by_user_id,
        initial_room_condition_notes=initial_condition_notes
    )
    db.add(stay)
    db.flush()

    # Create an initial Open Bill
    bill = Bill(
        bill_number=generate_bill_number(),
        guest_id=res.guest_id,
        stay_id=stay.id,
        reservation_id=res.id,
        room_charges=Decimal("0.00"),
        restaurant_charges=Decimal("0.00"),
        bar_charges=Decimal("0.00"),
        other_charges=Decimal("0.00"),
        tax_amount=Decimal("0.00"),
        discount_amount=Decimal("0.00"),
        total_amount=Decimal("0.00"),
        paid_amount=Decimal("0.00"),
        outstanding_balance=Decimal("0.00"),
        status=BillStatus.OPEN
    )
    db.add(bill)
    db.flush()

    log_audit_action(
        db=db,
        user_id=checked_in_by_user_id,
        action="CHECK_IN",
        entity_type="Stay",
        entity_id=str(stay.id),
        details={"reservation_id": res.id, "room": room.room_number, "bill_id": bill.id}
    )

    db.commit()
    db.refresh(stay)
    return stay

def check_out_guest(
    db: Session,
    stay_id: int,
    checked_out_by_user_id: int,
    checkout_notes: str | None = None
) -> Bill:
    stay = db.query(Stay).filter(Stay.id == stay_id).first()
    if not stay:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stay record {stay_id} not found."
        )

    if stay.status != StayStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stay is already completed or inactive."
        )

    res = stay.reservation
    room = stay.room
    bill = stay.bill

    if not bill:
        bill = Bill(
            bill_number=generate_bill_number(),
            guest_id=stay.guest_id,
            stay_id=stay.id,
            reservation_id=res.id if res else None,
            status=BillStatus.OPEN
        )
        db.add(bill)
        db.flush()

    # Calculate room charge based on stay duration (minimum 1 night)
    now_utc = datetime.now(timezone.utc)
    checkin_time = stay.actual_check_in.date()
    checkout_time = now_utc.date()
    nights = max(1, (checkout_time - checkin_time).days)
    if res and res.check_out_date and res.check_in_date:
        planned_nights = max(1, (res.check_out_date - res.check_in_date).days)
        nights = max(nights, planned_nights)

    rate_snapshot = res.nightly_rate_snapshot if res else room.category.base_price
    room_total = Decimal(str(rate_snapshot)) * Decimal(nights)

    # Fetch attached restaurant and bar orders billed to room
    room_orders = db.query(Order).filter(
        (Order.stay_id == stay.id) | (Order.bill_id == bill.id),
        Order.status != "cancelled"
    ).all()

    restaurant_total = Decimal("0.00")
    bar_total = Decimal("0.00")

    # Clear previous calculated line items to prevent duplicate charge generation (BR-10)
    db.query(BillLineItem).filter(BillLineItem.bill_id == bill.id).delete()

    # Add Room Charge line item
    db.add(BillLineItem(
        bill_id=bill.id,
        charge_type=ChargeType.ROOM,
        description=f"Room {room.room_number} accommodation ({nights} night(s) @ ₹{rate_snapshot}/night)",
        source_reference_id=str(stay.id),
        amount=room_total
    ))

    # Add F&B line items
    for ord in room_orders:
        if ord.department == DepartmentType.BAR:
            bar_total += Decimal(str(ord.total_amount))
            charge_t = ChargeType.BAR
        else:
            restaurant_total += Decimal(str(ord.total_amount))
            charge_t = ChargeType.RESTAURANT

        db.add(BillLineItem(
            bill_id=bill.id,
            charge_type=charge_t,
            description=f"{ord.department.capitalize()} Order #{ord.order_number} ({ord.order_type})",
            source_reference_id=str(ord.id),
            amount=ord.total_amount
        ))

    # Calculate 10% standard Hospitality Tax
    subtotal = room_total + restaurant_total + bar_total
    tax_amount = (subtotal * Decimal("0.10")).quantize(Decimal("0.01"))
    total_amount = (subtotal + tax_amount).quantize(Decimal("0.01"))

    db.add(BillLineItem(
        bill_id=bill.id,
        charge_type=ChargeType.TAX,
        description="Hospitality Goods & Service Tax (GST 10%)",
        source_reference_id=None,
        amount=tax_amount
    ))

    # Calculate paid amounts
    paid_sum = sum((p.amount for p in bill.payments), Decimal("0.00"))
    outstanding = total_amount - paid_sum

    bill.room_charges = room_total
    bill.restaurant_charges = restaurant_total
    bill.bar_charges = bar_total
    bill.tax_amount = tax_amount
    bill.total_amount = total_amount
    bill.paid_amount = paid_sum
    bill.outstanding_balance = max(Decimal("0.00"), outstanding)
    bill.finalized_at = now_utc
    if bill.outstanding_balance == Decimal("0.00"):
        bill.status = BillStatus.PAID
    else:
        bill.status = BillStatus.FINALIZED

    # Complete stay and reservation
    stay.status = StayStatus.COMPLETED
    stay.actual_check_out = now_utc
    stay.checked_out_by_user_id = checked_out_by_user_id
    stay.checkout_notes = checkout_notes

    if res:
        res.status = ReservationStatus.CHECKED_OUT

    # Transition room into CLEANING (BR-02: not available immediately)
    room.status = RoomStatus.CLEANING

    log_audit_action(
        db=db,
        user_id=checked_out_by_user_id,
        action="CHECK_OUT",
        entity_type="Stay",
        entity_id=str(stay.id),
        details={
            "room": room.room_number,
            "bill_id": bill.id,
            "total_amount": str(total_amount),
            "outstanding": str(bill.outstanding_balance)
        }
    )

    db.commit()
    db.refresh(bill)
    return bill
