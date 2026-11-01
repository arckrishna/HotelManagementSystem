from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.reservation import Stay, StayStatus
from app.models.user import User, UserRole
from app.schemas.reservation import StayResponse, StayCheckInRequest, StayCheckOutRequest
from app.schemas.billing import BillResponse
from app.api.deps import require_roles, get_current_user
from app.services.checkin_checkout_service import check_in_guest, check_out_guest

router = APIRouter(prefix="/stays", tags=["Stays & Check-In/Check-Out"])

@router.get("/my", response_model=StayResponse | None)
def get_my_active_stay(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.models.guest import Guest
    guest = db.query(Guest).filter(Guest.user_id == current_user.id).first()
    if not guest:
        # Fallback to guest_id 1 (Priya Sharma) for demo
        guest = db.query(Guest).filter(Guest.id == 1).first()
    if not guest:
        return None
    stay = db.query(Stay).filter(Stay.guest_id == guest.id, Stay.status == StayStatus.ACTIVE).first()
    return stay

@router.post("/demo-checkin", response_model=StayResponse)
def demo_quick_checkin(
    guest_id: int = 1,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Activates or restores Priya Sharma's demo active stay in Room 203 if checked out."""
    from app.models.reservation import Reservation, ReservationStatus
    from app.models.room import Room, RoomStatus
    from app.models.billing import Bill, BillStatus
    from decimal import Decimal

    stay = db.query(Stay).filter(Stay.guest_id == guest_id).first()
    room = db.query(Room).filter(Room.room_number == "203").first()
    res = db.query(Reservation).filter(Reservation.guest_id == guest_id).first()

    if room:
        room.status = RoomStatus.OCCUPIED
    if res:
        res.status = ReservationStatus.CHECKED_IN

    if stay:
        stay.status = StayStatus.ACTIVE
        stay.actual_check_out = None
    else:
        stay = Stay(
            reservation_id=res.id if res else 1,
            room_id=room.id if room else 7,
            guest_id=guest_id,
            status=StayStatus.ACTIVE,
            checked_in_by_user_id=1,
            initial_room_condition_notes="Demo active stay activated."
        )
        db.add(stay)
        db.flush()

    # Ensure bill exists and is open
    bill = db.query(Bill).filter(Bill.guest_id == guest_id, Bill.status == BillStatus.OPEN).first()
    if not bill:
        bill = db.query(Bill).filter(Bill.guest_id == guest_id).first()
        if bill:
            bill.status = BillStatus.OPEN
            bill.outstanding_balance = Decimal("9828.00")
        else:
            bill = Bill(
                bill_number="BILL-DEMO-001",
                guest_id=guest_id,
                stay_id=stay.id,
                room_charges=Decimal("12000.00"),
                restaurant_charges=Decimal("830.00"),
                bar_charges=Decimal("650.00"),
                tax_amount=Decimal("1348.00"),
                total_amount=Decimal("14828.00"),
                paid_amount=Decimal("5000.00"),
                outstanding_balance=Decimal("9828.00"),
                status=BillStatus.OPEN
            )
            db.add(bill)

    db.commit()
    db.refresh(stay)
    return stay

@router.get("/active", response_model=list[StayResponse])
def list_active_stays(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.ACCOUNTANT, 
        UserRole.RESTAURANT_STAFF, UserRole.BAR_STAFF
    ]))
):
    return db.query(Stay).filter(Stay.status == StayStatus.ACTIVE).order_by(Stay.actual_check_in.desc()).all()

@router.get("/{stay_id}", response_model=StayResponse)
def get_stay(
    stay_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stay = db.query(Stay).filter(Stay.id == stay_id).first()
    if not stay:
        raise HTTPException(status_code=404, detail="Stay record not found.")
    return stay

@router.post("/check-in", response_model=StayResponse, status_code=status.HTTP_201_CREATED)
def perform_check_in(
    req: StayCheckInRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.RECEPTIONIST]))
):
    return check_in_guest(
        db=db,
        reservation_id=req.reservation_id,
        checked_in_by_user_id=current_user.id,
        initial_condition_notes=req.initial_room_condition_notes
    )

@router.post("/{stay_id}/check-out", response_model=BillResponse)
def perform_check_out(
    stay_id: int,
    req: StayCheckOutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.RECEPTIONIST]))
):
    return check_out_guest(
        db=db,
        stay_id=stay_id,
        checked_out_by_user_id=current_user.id,
        checkout_notes=req.checkout_notes
    )
