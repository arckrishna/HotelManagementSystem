from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.restaurant import MenuItem, Order, DepartmentType
from app.models.user import User, UserRole
from app.schemas.restaurant import (
    MenuItemResponse, MenuItemCreate, MenuItemUpdate,
    OrderResponse, OrderCreate, OrderStatusUpdate
)
from app.api.deps import require_roles, get_current_user
from app.services.order_service import create_order, update_order_status
from app.services.audit_service import log_audit_action

router = APIRouter(prefix="/bar", tags=["Bar Management"])

@router.get("/menu", response_model=list[MenuItemResponse])
def get_bar_menu(
    category: str | None = None,
    available_only: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(MenuItem).filter(MenuItem.department == DepartmentType.BAR)
    if category:
        query = query.filter(MenuItem.category == category)
    if available_only:
        query = query.filter(MenuItem.is_available == True)
    return query.order_by(MenuItem.category, MenuItem.name).all()

@router.post("/menu", response_model=MenuItemResponse, status_code=status.HTTP_201_CREATED)
def create_bar_item(
    req: MenuItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    req_dict = req.model_dump()
    req_dict["department"] = DepartmentType.BAR
    item = MenuItem(**req_dict)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/menu/{item_id}", response_model=MenuItemResponse)
def update_bar_item(
    item_id: int,
    req: MenuItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(MenuItem).filter(MenuItem.id == item_id, MenuItem.department == DepartmentType.BAR).first()
    if not item:
        raise HTTPException(status_code=404, detail="Beverage item not found.")

    # BR-04: Only Admin can modify menu prices
    if req.price is not None and req.price != item.price:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Only Hotel Admin/Manager can modify beverage prices (BR-04)."
            )
        log_audit_action(
            db=db,
            user_id=current_user.id,
            action="BAR_PRICE_CHANGE",
            entity_type="MenuItem",
            entity_id=str(item.id),
            details={"item": item.name, "old_price": str(item.price), "new_price": str(req.price)}
        )

    for field, val in req.model_dump(exclude_unset=True).items():
        setattr(item, field, val)

    db.commit()
    db.refresh(item)
    return item

@router.patch("/menu/{item_id}/availability", response_model=MenuItemResponse)
def toggle_bar_item_availability(
    item_id: int,
    is_available: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.BAR_STAFF]))
):
    item = db.query(MenuItem).filter(MenuItem.id == item_id, MenuItem.department == DepartmentType.BAR).first()
    if not item:
        raise HTTPException(status_code=404, detail="Beverage item not found.")
    item.is_available = is_available
    db.commit()
    db.refresh(item)
    return item

@router.get("/orders", response_model=list[OrderResponse])
def list_bar_orders(
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.BAR_STAFF]))
):
    query = db.query(Order).filter(Order.department == DepartmentType.BAR)
    if status:
        query = query.filter(Order.status == status)
    return query.order_by(Order.id.desc()).all()

@router.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def place_bar_order(
    req: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items_dicts = [itm.model_dump() for itm in req.items]
    return create_order(
        db=db,
        department=DepartmentType.BAR,
        order_type=req.order_type,
        items_data=items_dicts,
        table_id=req.table_id,
        room_id=req.room_id,
        guest_id=req.guest_id,
        stay_id=req.stay_id,
        is_billed_to_room=req.is_billed_to_room,
        notes=req.notes,
        acting_user_id=current_user.id
    )

@router.put("/orders/{order_id}/status", response_model=OrderResponse)
def change_bar_order_status(
    order_id: int,
    req: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.BAR_STAFF]))
):
    return update_order_status(
        db=db,
        order_id=order_id,
        new_status=req.status,
        acting_user_id=current_user.id
    )
