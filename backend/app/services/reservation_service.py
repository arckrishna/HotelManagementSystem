import random
import string
from datetime import date
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.room import Room, RoomStatus
from app.models.reservation import Reservation, ReservationStatus
from app.models.guest import Guest
from app.services.audit_service import log_audit_action

def generate_reservation_code() -> str:
    suffix = ''.join(random.choices(string.digits, k=5))
    return f"RES-{date.today().year}-{suffix}"

def check_room_availability(
    db: Session,
    room_id: int,
    check_in_date: date,
    check_out_date: date,
    exclude_reservation_id: int | None = None
) -> bool:
    if check_out_date <= check_in_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Check-out date must be strictly after check-in date."
        )

    room = db.query(Room).filter(Room.id == room_id).first()
    if not room or not room.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with ID {room_id} does not exist or is inactive."
        )

    # BR-02: Rooms under maintenance cannot be booked or allocated
    if room.status == RoomStatus.MAINTENANCE:
        return False

    query = db.query(Reservation).filter(
        Reservation.room_id == room_id,
        Reservation.status.in_([ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN]),
        Reservation.check_in_date < check_out_date,
        Reservation.check_out_date > check_in_date
    )
    if exclude_reservation_id:
        query = query.filter(Reservation.id != exclude_reservation_id)

    overlapping = query.first()
    return overlapping is None

def create_reservation(
    db: Session,
    guest_id: int,
    room_id: int,
    check_in_date: date,
    check_out_date: date,
    num_guests: int = 1,
    special_requests: str | None = None,
    acting_user_id: int | None = None
) -> Reservation:
    guest = db.query(Guest).filter(Guest.id == guest_id).first()
    if not guest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Guest with ID {guest_id} does not exist."
        )

    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Room with ID {room_id} does not exist."
        )

    if room.status == RoomStatus.MAINTENANCE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Room {room.room_number} is currently under maintenance and cannot be reserved."
        )

    if num_guests > room.category.max_capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Guest count ({num_guests}) exceeds room category max capacity ({room.category.max_capacity})."
        )

    if not check_room_availability(db, room_id, check_in_date, check_out_date):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Room {room.room_number} is already booked or occupied for the requested dates."
        )

    nights = (check_out_date - check_in_date).days
    nightly_rate = Decimal(str(room.category.base_price))
    total_estimated = nightly_rate * Decimal(nights)

    res = Reservation(
        reservation_code=generate_reservation_code(),
        guest_id=guest_id,
        room_id=room_id,
        check_in_date=check_in_date,
        check_out_date=check_out_date,
        num_guests=num_guests,
        nightly_rate_snapshot=nightly_rate,
        total_estimated_amount=total_estimated,
        status=ReservationStatus.CONFIRMED,
        special_requests=special_requests
    )
    db.add(res)
    db.flush()

    log_audit_action(
        db=db,
        user_id=acting_user_id,
        action="RESERVATION_CREATE",
        entity_type="Reservation",
        entity_id=str(res.id),
        details={"code": res.reservation_code, "room": room.room_number, "nights": nights}
    )

    db.commit()
    db.refresh(res)
    return res
