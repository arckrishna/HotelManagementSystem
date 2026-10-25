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
