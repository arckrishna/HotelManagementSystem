from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.room import Room, RoomCategory, RoomStatus
from app.models.user import User, UserRole
from app.schemas.room import RoomResponse, RoomCreate, RoomUpdate, RoomCategoryResponse, RoomCategoryCreate
from app.api.deps import require_roles, get_current_user
from app.services.reservation_service import check_room_availability
from app.services.audit_service import log_audit_action

router = APIRouter(prefix="/rooms", tags=["Rooms & Categories"])

@router.get("/categories", response_model=list[RoomCategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    return db.query(RoomCategory).order_by(RoomCategory.base_price).all()

@router.post("/categories", response_model=RoomCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    req: RoomCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    cat = RoomCategory(**req.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat

@router.get("", response_model=list[RoomResponse])
def list_rooms(
    status: str | None = None,
    category_id: int | None = None,
    floor: int | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Room)
    if status:
        query = query.filter(Room.status == status)
    if category_id:
        query = query.filter(Room.category_id == category_id)
    if floor:
        query = query.filter(Room.floor == floor)
    return query.order_by(Room.room_number).all()

@router.get("/available", response_model=list[RoomResponse])
def search_available_rooms(
    check_in_date: date = Query(...),
    check_out_date: date = Query(...),
    category_id: int | None = None,
    guests_count: int = 1,
    db: Session = Depends(get_db)
):
    if check_out_date <= check_in_date:
        raise HTTPException(status_code=400, detail="Check-out date must be after check-in date.")

    query = db.query(Room).filter(Room.is_active == True, Room.status != RoomStatus.MAINTENANCE)
    if category_id:
        query = query.filter(Room.category_id == category_id)

    all_active_rooms = query.all()
    available_rooms = []
    for r in all_active_rooms:
        if r.category.max_capacity >= guests_count:
            if check_room_availability(db, r.id, check_in_date, check_out_date):
                available_rooms.append(r)
    return available_rooms

@router.post("", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
def create_room(
    req: RoomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    existing = db.query(Room).filter(Room.room_number == req.room_number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Room {req.room_number} already exists.")

    room = Room(**req.model_dump())
    db.add(room)
    db.commit()
    db.refresh(room)
    return room

@router.put("/{room_id}", response_model=RoomResponse)
def update_room(
    room_id: int,
    req: RoomUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.MAINTENANCE_STAFF]))
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    old_status = room.status
    if req.category_id is not None and current_user.role == UserRole.ADMIN:
        room.category_id = req.category_id
    if req.floor is not None and current_user.role == UserRole.ADMIN:
        room.floor = req.floor
    if req.status is not None:
        if req.status not in RoomStatus.ALL_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid room status.")
        room.status = req.status
    if req.is_active is not None and current_user.role == UserRole.ADMIN:
        room.is_active = req.is_active
    if req.notes is not None:
        room.notes = req.notes

    if old_status != room.status:
        log_audit_action(
            db=db,
            user_id=current_user.id,
            action="ROOM_STATUS_CHANGE",
            entity_type="Room",
            entity_id=str(room.id),
            details={"room": room.room_number, "old": old_status, "new": room.status}
        )

    db.commit()
    db.refresh(room)
    return room

@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    if room.status == RoomStatus.OCCUPIED:
        raise HTTPException(status_code=400, detail="Cannot delete an occupied room.")

    from app.models.reservation import Stay, StayStatus
    active_stay = db.query(Stay).filter(Stay.room_id == room.id, Stay.status == StayStatus.ACTIVE).first()
    if active_stay:
        raise HTTPException(status_code=400, detail="Cannot delete room with an active stay.")

    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="ROOM_DELETE",
        entity_type="Room",
        entity_id=str(room.id),
        details={"room_number": room.room_number}
    )

    db.delete(room)
    db.commit()
    return None

