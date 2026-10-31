from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.billing import Bill
from app.models.guest import Guest
from app.models.user import User, UserRole
from app.schemas.billing import BillResponse
from app.api.deps import require_roles, get_current_user

router = APIRouter(prefix="/bills", tags=["Billing & Folios"])

@router.get("", response_model=list[BillResponse])
def list_bills(
    status: str | None = None,
    guest_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST]))
):
    query = db.query(Bill)
    if status:
        query = query.filter(Bill.status == status)
    if guest_id:
        query = query.filter(Bill.guest_id == guest_id)
    return query.order_by(Bill.id.desc()).all()

@router.get("/my", response_model=list[BillResponse])
def list_my_bills(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.GUEST:
        raise HTTPException(status_code=400, detail="Only guests can view personal bills here.")
    guest = db.query(Guest).filter(Guest.user_id == current_user.id).first()
    if not guest:
        return []
    return db.query(Bill).filter(Bill.guest_id == guest.id).order_by(Bill.id.desc()).all()

@router.get("/{bill_id}", response_model=BillResponse)
def get_bill(
    bill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found.")

    if current_user.role == UserRole.GUEST:
        guest = db.query(Guest).filter(Guest.user_id == current_user.id).first()
        if not guest or bill.guest_id != guest.id:
            raise HTTPException(status_code=403, detail="Forbidden: Cannot view another guest's bill.")

    return bill
