from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.feedback import ServiceRequest, GuestFeedback, ServiceRequestStatus
from app.models.guest import Guest
from app.models.user import User, UserRole
from app.schemas.feedback import (
    ServiceRequestCreate, ServiceRequestResponse, ServiceRequestStatusUpdate,
    GuestFeedbackCreate, GuestFeedbackResponse
)
from app.api.deps import require_roles, get_current_user

router = APIRouter(prefix="/feedback", tags=["Service Requests & Guest Feedback"])

@router.get("/service-requests", response_model=list[ServiceRequestResponse])
def list_service_requests(
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ServiceRequest)
    if current_user.role == UserRole.GUEST:
        guest = db.query(Guest).filter(Guest.user_id == current_user.id).first()
        if not guest:
            return []
        query = query.filter(ServiceRequest.guest_id == guest.id)
    elif status:
        query = query.filter(ServiceRequest.status == status)

    return query.order_by(ServiceRequest.id.desc()).all()

@router.post("/service-requests", response_model=ServiceRequestResponse, status_code=status.HTTP_201_CREATED)
def create_service_request(
    req: ServiceRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    guest = db.query(Guest).filter(Guest.user_id == current_user.id).first()
    if not guest:
        # Fallback to guest_id = 1 for demo or staff filing
        guest_id = 1
    else:
        guest_id = guest.id

    sr = ServiceRequest(
        guest_id=guest_id,
        room_id=req.room_id,
        stay_id=req.stay_id,
        request_type=req.request_type,
        details=req.details,
        status=ServiceRequestStatus.PENDING
    )
    db.add(sr)
    db.commit()
    db.refresh(sr)
    return sr

@router.patch("/service-requests/{request_id}/status", response_model=ServiceRequestResponse)
def update_service_request_status(
    request_id: int,
    req: ServiceRequestStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.MAINTENANCE_STAFF]))
):
    sr = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
    if not sr:
        raise HTTPException(status_code=404, detail="Service request not found.")
    sr.status = req.status
    if req.status == ServiceRequestStatus.COMPLETED:
        sr.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(sr)
    return sr

@router.get("/guest-reviews", response_model=list[GuestFeedbackResponse])
def list_guest_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.ACCOUNTANT]))
):
    return db.query(GuestFeedback).order_by(GuestFeedback.id.desc()).all()

@router.post("/guest-reviews", response_model=GuestFeedbackResponse, status_code=status.HTTP_201_CREATED)
def submit_guest_review(
    req: GuestFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    guest = db.query(Guest).filter(Guest.user_id == current_user.id).first()
    guest_id = guest.id if guest else 1

    feedback = GuestFeedback(
        guest_id=guest_id,
        stay_id=req.stay_id,
        rating=req.rating,
        comments=req.comments
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback
