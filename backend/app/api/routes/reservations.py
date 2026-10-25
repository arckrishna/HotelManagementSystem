from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.reservation import Reservation, ReservationStatus
from app.models.guest import Guest
from app.models.room import Room, RoomStatus
from app.models.user import User, UserRole
from app.schemas.reservation import ReservationCreate, ReservationResponse, ReservationUpdate
from app.api.deps import require_roles, get_current_user
from app.services.reservation_service import create_reservation
from app.services.audit_service import log_audit_action

router = APIRouter(prefix="/reservations", tags=["Reservations"])

@router.get("", response_model=list[ReservationResponse])
def list_reservations(
    status: str | None = None,
    guest_id: int | None = None,
    room_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.ACCOUNTANT]))
):
    query = db.query(Reservation)
    if status:
        query = query.filter(Reservation.status == status)
    if guest_id:
        query = query.filter(Reservation.guest_id == guest_id)
    if room_id:
        query = query.filter(Reservation.room_id == room_id)
    return query.order_by(Reservation.id.desc()).all()

@router.get("/my", response_model=list[ReservationResponse])
def list_my_reservations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.GUEST:
        raise HTTPException(status_code=400, detail="Only guests can view personal reservations here.")
    guest = db.query(Guest).filter(Guest.user_id == current_user.id).first()
    if not guest:
        return []
    return db.query(Reservation).filter(Reservation.guest_id == guest.id).order_by(Reservation.id.desc()).all()

@router.post("", response_model=ReservationResponse, status_code=status.HTTP_201_CREATED)
def make_reservation(
    req: ReservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Isolation: If user is a Guest, ensure guest_id is their own
    if current_user.role == UserRole.GUEST:
        guest = db.query(Guest).filter(Guest.user_id == current_user.id).first()
        if not guest or guest.id != req.guest_id:
            raise HTTPException(status_code=403, detail="Forbidden: You cannot create reservations for another guest.")

    res = create_reservation(
        db=db,
        guest_id=req.guest_id,
        room_id=req.room_id,
        check_in_date=req.check_in_date,
        check_out_date=req.check_out_date,
        num_guests=req.num_guests,
        special_requests=req.special_requests,
        acting_user_id=current_user.id
    )
    return res

@router.get("/{reservation_id}", response_model=ReservationResponse)
def get_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found.")

    if current_user.role == UserRole.GUEST:
        guest = db.query(Guest).filter(Guest.user_id == current_user.id).first()
        if not guest or res.guest_id != guest.id:
            raise HTTPException(status_code=403, detail="Forbidden: Cannot view another guest's reservation.")

    return res

@router.put("/{reservation_id}/cancel", response_model=ReservationResponse)
def cancel_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    res = db.query(Reservation).filter(Reservation.id == reservation_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found.")

    if current_user.role == UserRole.GUEST:
        guest = db.query(Guest).filter(Guest.user_id == current_user.id).first()
        if not guest or res.guest_id != guest.id:
            raise HTTPException(status_code=403, detail="Forbidden: Cannot cancel another guest's reservation.")

    if res.status in [ReservationStatus.CHECKED_IN, ReservationStatus.CHECKED_OUT]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel a reservation with status '{res.status}'.")

    res.status = ReservationStatus.CANCELLED

    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="RESERVATION_CANCEL",
        entity_type="Reservation",
        entity_id=str(res.id),
        details={"code": res.reservation_code}
    )

    db.commit()
    db.refresh(res)
    return res
