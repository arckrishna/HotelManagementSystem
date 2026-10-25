from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.restaurant import MenuItem, RestaurantTable, Order, DepartmentType, OrderStatus
from app.models.user import User, UserRole
from app.schemas.restaurant import (
    MenuItemResponse, MenuItemCreate, MenuItemUpdate,
    TableResponse, TableCreate,
    OrderResponse, OrderCreate, OrderStatusUpdate
)
from app.api.deps import require_roles, get_current_user
from app.services.order_service import create_order, update_order_status
from app.services.audit_service import log_audit_action

router = APIRouter(prefix="/restaurant", tags=["Restaurant Management"])

# --- MENU MANAGEMENT ---

@router.get("/menu", response_model=list[MenuItemResponse])
def get_restaurant_menu(
    category: str | None = None,
    available_only: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(MenuItem).filter(MenuItem.department == DepartmentType.RESTAURANT)
    if category:
        query = query.filter(MenuItem.category == category)
    if available_only:
        query = query.filter(MenuItem.is_available == True)
    return query.order_by(MenuItem.category, MenuItem.name).all()

@router.post("/menu", response_model=MenuItemResponse, status_code=status.HTTP_201_CREATED)
def create_menu_item(
    req: MenuItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    req_dict = req.model_dump()
    req_dict["department"] = DepartmentType.RESTAURANT
    item = MenuItem(**req_dict)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.put("/menu/{item_id}", response_model=MenuItemResponse)
def update_menu_item(
    item_id: int,
    req: MenuItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(MenuItem).filter(MenuItem.id == item_id, MenuItem.department == DepartmentType.RESTAURANT).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found.")

    # BR-04: Only authorized staff (Admin) can modify menu prices
    if req.price is not None and req.price != item.price:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Only Hotel Admin/Manager can modify menu prices (BR-04)."
            )
        log_audit_action(
            db=db,
            user_id=current_user.id,
            action="MENU_PRICE_CHANGE",
            entity_type="MenuItem",
            entity_id=str(item.id),
            details={"item": item.name, "old_price": str(item.price), "new_price": str(req.price)}
        )

    # Restaurant staff or Admin can toggle availability
    for field, val in req.model_dump(exclude_unset=True).items():
        setattr(item, field, val)

    db.commit()
    db.refresh(item)
    return item

@router.patch("/menu/{item_id}/availability", response_model=MenuItemResponse)
def toggle_item_availability(
    item_id: int,
    is_available: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.RESTAURANT_STAFF]))
):
    item = db.query(MenuItem).filter(MenuItem.id == item_id, MenuItem.department == DepartmentType.RESTAURANT).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found.")
    item.is_available = is_available
    db.commit()
    db.refresh(item)
    return item

# --- TABLE MANAGEMENT ---

@router.get("/tables", response_model=list[TableResponse])
def list_tables(db: Session = Depends(get_db)):
    return db.query(RestaurantTable).order_by(RestaurantTable.table_number).all()

@router.post("/tables", response_model=TableResponse, status_code=status.HTTP_201_CREATED)
def add_table(
    req: TableCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.RESTAURANT_STAFF]))
):
    existing = db.query(RestaurantTable).filter(RestaurantTable.table_number == req.table_number).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Table {req.table_number} already exists.")
    table = RestaurantTable(**req.model_dump())
    db.add(table)
    db.commit()
    db.refresh(table)
    return table

@router.patch("/tables/{table_id}/status", response_model=TableResponse)
def update_table_status(
    table_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.RESTAURANT_STAFF]))
):
    table = db.query(RestaurantTable).filter(RestaurantTable.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found.")
    table.status = status
    db.commit()
    db.refresh(table)
    return table

# --- ORDER MANAGEMENT ---

@router.get("/orders", response_model=list[OrderResponse])
def list_restaurant_orders(
    status: str | None = None,
    order_type: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Order).filter(Order.department == DepartmentType.RESTAURANT)
    if status:
        query = query.filter(Order.status == status)
    if order_type:
        query = query.filter(Order.order_type == order_type)
    return query.order_by(Order.id.desc()).all()

@router.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def place_restaurant_order(
    req: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items_dicts = [itm.model_dump() for itm in req.items]
    return create_order(
        db=db,
        department=DepartmentType.RESTAURANT,
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
def change_order_status(
    order_id: int,
    req: OrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.RESTAURANT_STAFF]))
):
    return update_order_status(
        db=db,
        order_id=order_id,
        new_status=req.status,
        acting_user_id=current_user.id
    )
