from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.billing import Payment
from app.models.user import User, UserRole
from app.schemas.billing import PaymentResponse, PaymentCreate
from app.api.deps import require_roles
from app.services.payment_service import record_payment

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.get("", response_model=list[PaymentResponse])
def list_payments(
    bill_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST]))
):
    query = db.query(Payment)
    if bill_id:
        query = query.filter(Payment.bill_id == bill_id)
    return query.order_by(Payment.id.desc()).all()

@router.post("", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def make_payment(
    bill_id: int,
    req: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.ACCOUNTANT, UserRole.RECEPTIONIST]))
):
    return record_payment(
        db=db,
        bill_id=bill_id,
        amount=req.amount,
        payment_method=req.payment_method,
        reference_number=req.reference_number,
        notes=req.notes,
        recorded_by_user_id=current_user.id
    )
