from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.auth import UserCreate, UserUpdate, UserResponse
from app.core.security import get_password_hash
from app.api.deps import require_roles, get_current_user
from app.services.audit_service import log_audit_action

router = APIRouter(prefix="/users", tags=["Staff & User Management"])

@router.get("", response_model=list[UserResponse])
def list_users(
    role: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.order_by(User.id).all()

@router.get("/technicians", response_model=list[UserResponse])
def list_technicians(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Anyone authorized to view tasks can view technician dropdown
    return db.query(User).filter(
        User.role == UserRole.MAINTENANCE_STAFF, 
        User.is_active == True
    ).all()

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_staff_user(
    req: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    # BR-09: Only authorized Admin users can create staff accounts
    existing_user = db.query(User).filter((User.username == req.username) | (User.email == req.email)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is already registered."
        )

    if req.role not in UserRole.ALL_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role: {req.role}")

    user = User(
        username=req.username,
        email=req.email,
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        phone=req.phone,
        role=req.role,
        is_active=True
    )
    db.add(user)
    db.flush()

    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="USER_CREATE",
        entity_type="User",
        entity_id=str(user.id),
        details={"username": user.username, "role": user.role}
    )

    db.commit()
    db.refresh(user)
    return user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    req: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    # BR-09: Only Admin can update or deactivate staff
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if req.full_name is not None:
        user.full_name = req.full_name
    if req.phone is not None:
        user.phone = req.phone
    if req.role is not None:
        if req.role not in UserRole.ALL_ROLES:
            raise HTTPException(status_code=400, detail="Invalid role specified.")
        user.role = req.role
    if req.is_active is not None:
        user.is_active = req.is_active
    if req.password:
        user.hashed_password = get_password_hash(req.password)

    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="USER_UPDATE",
        entity_type="User",
        entity_id=str(user.id),
        details={"is_active": user.is_active, "role": user.role}
    )

    db.commit()
    db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account.")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="USER_DELETE",
        entity_type="User",
        entity_id=str(user.id),
        details={"username": user.username}
    )
    user.is_active = False # Safe deactivation
    db.commit()
    return None

