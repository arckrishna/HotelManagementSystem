from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.guest import Guest
from app.models.user import User, UserRole
from app.schemas.guest import GuestCreate, GuestUpdate, GuestResponse
from app.api.deps import require_roles, get_current_user
from app.services.audit_service import log_audit_action

router = APIRouter(prefix="/guests", tags=["Guests"])

@router.get("", response_model=list[GuestResponse])
def list_guests(
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.ACCOUNTANT]))
):
    query = db.query(Guest)
    if search:
        s = f"%{search}%"
        query = query.filter(
            (Guest.first_name.ilike(s)) | 
            (Guest.last_name.ilike(s)) | 
            (Guest.email.ilike(s)) | 
            (Guest.phone.ilike(s))
        )
    return query.order_by(Guest.id.desc()).all()

@router.post("", response_model=GuestResponse, status_code=status.HTTP_201_CREATED)
def register_guest(
    req: GuestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Receptionist, Admin, or self-registration by Guest
    if current_user.role == UserRole.GUEST and req.user_id != current_user.id:
        req.user_id = current_user.id

    guest = Guest(**req.model_dump())
    db.add(guest)
    db.flush()

    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="GUEST_REGISTER",
        entity_type="Guest",
        entity_id=str(guest.id),
        details={"name": f"{guest.first_name} {guest.last_name}", "phone": guest.phone}
    )

    db.commit()
    db.refresh(guest)
    return guest

@router.get("/{guest_id}", response_model=GuestResponse)
def get_guest(
    guest_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    guest = db.query(Guest).filter(Guest.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found.")

    # Isolation check: Guest role can only view their own profile
    if current_user.role == UserRole.GUEST and guest.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: Cannot view another guest's profile.")

    return guest

@router.put("/{guest_id}", response_model=GuestResponse)
def update_guest(
    guest_id: int,
    req: GuestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    guest = db.query(Guest).filter(Guest.id == guest_id).first()
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found.")

    if current_user.role == UserRole.GUEST and guest.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden: Cannot update another guest's profile.")

    for field, val in req.model_dump(exclude_unset=True).items():
        setattr(guest, field, val)

    db.commit()
    db.refresh(guest)
    return guest
