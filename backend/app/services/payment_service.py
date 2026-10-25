import random
import string
from datetime import date
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.billing import Bill, Payment, BillStatus, PaymentMethod
from app.services.audit_service import log_audit_action

def generate_payment_number() -> str:
    suffix = ''.join(random.choices(string.digits, k=5))
    return f"PAY-{date.today().year}-{suffix}"

def record_payment(
    db: Session,
    bill_id: int,
    amount: Decimal,
    payment_method: str,
    reference_number: str | None = None,
    notes: str | None = None,
    recorded_by_user_id: int = 1
) -> Payment:
    if amount <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount must be greater than zero."
        )

    if payment_method not in PaymentMethod.ALL_METHODS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid payment method: {payment_method}. Allowed: {PaymentMethod.ALL_METHODS}"
        )

    bill = db.query(Bill).filter(Bill.id == bill_id).with_for_update().first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found.")

    if bill.status == BillStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Cannot record payments on a cancelled bill.")

    if bill.status == BillStatus.PAID and bill.outstanding_balance == Decimal("0.00"):
        raise HTTPException(status_code=400, detail="This bill has already been fully paid.")

    # Prevent overpayment by large margins
    if amount > bill.outstanding_balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payment amount (₹{amount}) exceeds outstanding balance (₹{bill.outstanding_balance})."
        )

    payment = Payment(
        payment_number=generate_payment_number(),
        bill_id=bill.id,
        amount=amount,
        payment_method=payment_method,
        reference_number=reference_number,
        notes=notes,
        recorded_by_user_id=recorded_by_user_id
    )
    db.add(payment)

    new_paid = bill.paid_amount + amount
    new_outstanding = max(Decimal("0.00"), bill.total_amount - new_paid)

    bill.paid_amount = new_paid
    bill.outstanding_balance = new_outstanding
    if new_outstanding == Decimal("0.00"):
        bill.status = BillStatus.PAID

    log_audit_action(
        db=db,
        user_id=recorded_by_user_id,
        action="PAYMENT_RECORD",
        entity_type="Payment",
        entity_id=str(payment.payment_number),
        details={"bill_id": bill.id, "amount": str(amount), "method": payment_method, "remaining": str(new_outstanding)}
    )

    db.commit()
    db.refresh(payment)
    return payment
