from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.maintenance import MaintenanceRequest, MaintenancePriority, MaintenanceStatus
from app.models.room import Room, RoomStatus
from app.models.user import User, UserRole
from app.schemas.maintenance import (
    MaintenanceCreate, MaintenanceResponse, 
    MaintenanceAssignRequest, MaintenanceStatusUpdate
)
from app.api.deps import require_roles, get_current_user
from app.services.notification_service import create_notification
from app.services.audit_service import log_audit_action

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])

@router.get("", response_model=list[MaintenanceResponse])
def list_maintenance(
    status: str | None = None,
    priority: str | None = None,
    room_id: int | None = None,
    assigned_to_me: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(MaintenanceRequest)
    if status:
        query = query.filter(MaintenanceRequest.status == status)
    if priority:
        query = query.filter(MaintenanceRequest.priority == priority)
    if room_id:
        query = query.filter(MaintenanceRequest.room_id == room_id)
    if assigned_to_me:
        query = query.filter(MaintenanceRequest.assigned_to_user_id == current_user.id)

    # BR-03: Critical and High priorities are sorted to the top
    priority_order = case(
        (MaintenanceRequest.priority == MaintenancePriority.CRITICAL, 1),
        (MaintenanceRequest.priority == MaintenancePriority.HIGH, 2),
        (MaintenanceRequest.priority == MaintenancePriority.MEDIUM, 3),
        (MaintenanceRequest.priority == MaintenancePriority.LOW, 4),
        else_=5
    )
    return query.order_by(priority_order, MaintenanceRequest.id.desc()).all()

@router.post("", response_model=MaintenanceResponse, status_code=status.HTTP_201_CREATED)
def report_maintenance(
    req: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if req.priority not in MaintenancePriority.ALL_PRIORITIES:
        raise HTTPException(status_code=400, detail="Invalid priority level.")

    room = None
    if req.room_id:
        room = db.query(Room).filter(Room.id == req.room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="Room not found.")

        # BR-02 & NFR-S03: If Critical/High, immediately lock room into MAINTENANCE status
        if req.priority in [MaintenancePriority.CRITICAL, MaintenancePriority.HIGH]:
            room.status = RoomStatus.MAINTENANCE

    maint = MaintenanceRequest(
        room_id=req.room_id,
        location_description=req.location_description,
        title=req.title,
        description=req.description,
        priority=req.priority,
        status=MaintenanceStatus.OPEN,
        reported_by_user_id=current_user.id
    )
    db.add(maint)
    db.flush()

    # BR-11: Critical maintenance issues must be visibly notified to authorized staff
    if req.priority == MaintenancePriority.CRITICAL:
        create_notification(
            db=db,
            title=f"CRITICAL MAINTENANCE: {req.title}",
            message=f"Critical issue reported at {req.location_description}: {req.description}",
            notification_type="critical_alert",
            target_role="maintenance_staff",
            reference_id=str(maint.id)
        )
        create_notification(
            db=db,
            title=f"CRITICAL MAINTENANCE ALERT",
            message=f"Location: {req.location_description} - {req.title}",
            notification_type="critical_alert",
            target_role="admin",
            reference_id=str(maint.id)
        )

    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="MAINTENANCE_REPORT",
        entity_type="MaintenanceRequest",
        entity_id=str(maint.id),
        details={"title": req.title, "priority": req.priority, "room": room.room_number if room else None}
    )

    db.commit()
    db.refresh(maint)
    return maint

@router.put("/{request_id}/assign", response_model=MaintenanceResponse)
def assign_technician(
    request_id: int,
    req: MaintenanceAssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.MAINTENANCE_STAFF]))
):
    maint = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == request_id).first()
    if not maint:
        raise HTTPException(status_code=404, detail="Maintenance request not found.")

    tech = db.query(User).filter(
        User.id == req.assigned_to_user_id, 
        User.role.in_([UserRole.MAINTENANCE_STAFF, UserRole.ADMIN])
    ).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Assigned user is not a valid technician.")

    maint.assigned_to_user_id = tech.id
    if maint.status == MaintenanceStatus.OPEN:
        maint.status = MaintenanceStatus.ASSIGNED

    # FR-48: Notify maintenance staff when a task is assigned
    create_notification(
        db=db,
        title="Maintenance Task Assigned",
        message=f"You have been assigned to: {maint.title} at {maint.location_description} (Priority: {maint.priority.upper()}).",
        notification_type="maintenance_assigned",
        recipient_user_id=tech.id,
        reference_id=str(maint.id)
    )

    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="MAINTENANCE_ASSIGN",
        entity_type="MaintenanceRequest",
        entity_id=str(maint.id),
        details={"assigned_to": tech.full_name}
    )

    db.commit()
    db.refresh(maint)
    return maint

@router.put("/{request_id}/status", response_model=MaintenanceResponse)
def update_maintenance_status(
    request_id: int,
    req: MaintenanceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.MAINTENANCE_STAFF]))
):
    maint = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == request_id).first()
    if not maint:
        raise HTTPException(status_code=404, detail="Maintenance request not found.")

    # NFR-S05: Only authorized personnel can resolve critical maintenance
    if maint.priority == MaintenancePriority.CRITICAL and req.status in [MaintenanceStatus.RESOLVED, MaintenanceStatus.CLOSED]:
        if current_user.role not in [UserRole.ADMIN, UserRole.MAINTENANCE_STAFF]:
            raise HTTPException(status_code=403, detail="Forbidden: Unauthorized to resolve critical maintenance issue.")

    maint.status = req.status
    if req.resolution_notes:
        maint.resolution_notes = req.resolution_notes

    # If resolved, record timestamp and unblock room to cleaning
    if req.status in [MaintenanceStatus.RESOLVED, MaintenanceStatus.CLOSED]:
        maint.resolved_at = datetime.now(timezone.utc)
        if maint.room_id:
            room = db.query(Room).filter(Room.id == maint.room_id).first()
            if room and room.status == RoomStatus.MAINTENANCE:
                # Place in cleaning for inspection before releasing
                room.status = RoomStatus.CLEANING

    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="MAINTENANCE_STATUS_UPDATE",
        entity_type="MaintenanceRequest",
        entity_id=str(maint.id),
        details={"status": req.status, "notes": req.resolution_notes}
    )

    db.commit()
    db.refresh(maint)
    return maint
