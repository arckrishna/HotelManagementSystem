from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.inventory import InventoryItem, InventoryMovement, RecipeMapping
from app.models.user import User, UserRole
from app.schemas.inventory import (
    InventoryItemResponse, InventoryItemCreate, InventoryItemUpdate,
    StockAdjustmentRequest, InventoryMovementResponse,
    RecipeMappingResponse, RecipeMappingCreate
)
from app.api.deps import require_roles, get_current_user
from app.services.inventory_service import adjust_stock

router = APIRouter(prefix="/inventory", tags=["Centralized Inventory"])

@router.get("", response_model=list[InventoryItemResponse])
def list_inventory(
    category: str | None = None,
    low_stock_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.ADMIN, UserRole.INVENTORY_MANAGER, 
        UserRole.RESTAURANT_STAFF, UserRole.BAR_STAFF, UserRole.ACCOUNTANT
    ]))
):
    query = db.query(InventoryItem)
    if category:
        query = query.filter(InventoryItem.category == category)
    items = query.order_by(InventoryItem.name).all()

    result = []
    for itm in items:
        resp = InventoryItemResponse.model_validate(itm)
        resp.is_low_stock = itm.current_quantity <= itm.min_threshold
        if not low_stock_only or resp.is_low_stock:
            result.append(resp)
    return result

@router.post("", response_model=InventoryItemResponse, status_code=status.HTTP_201_CREATED)
def create_inventory_item(
    req: InventoryItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.INVENTORY_MANAGER]))
):
    # BR-08: Only authorized personnel can modify inventory records
    existing = db.query(InventoryItem).filter(InventoryItem.name == req.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Inventory item '{req.name}' already exists.")

    item = InventoryItem(**req.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    resp = InventoryItemResponse.model_validate(item)
    resp.is_low_stock = item.current_quantity <= item.min_threshold
    return resp

@router.put("/{item_id}", response_model=InventoryItemResponse)
def update_inventory_item(
    item_id: int,
    req: InventoryItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.INVENTORY_MANAGER]))
):
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found.")

    for field, val in req.model_dump(exclude_unset=True).items():
        setattr(item, field, val)

    db.commit()
    db.refresh(item)
    resp = InventoryItemResponse.model_validate(item)
    resp.is_low_stock = item.current_quantity <= item.min_threshold
    return resp

@router.post("/{item_id}/adjust", response_model=InventoryMovementResponse)
def adjust_inventory_stock(
    item_id: int,
    req: StockAdjustmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.INVENTORY_MANAGER]))
):
    return adjust_stock(
        db=db,
        item_id=item_id,
        quantity_delta=req.quantity_delta,
        movement_type=req.movement_type,
        reason=req.reason,
        acting_user_id=current_user.id
    )

@router.get("/movements", response_model=list[InventoryMovementResponse])
def list_inventory_movements(
    item_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.ACCOUNTANT]))
):
    query = db.query(InventoryMovement)
    if item_id:
        query = query.filter(InventoryMovement.inventory_item_id == item_id)
    return query.order_by(InventoryMovement.id.desc()).limit(100).all()

@router.get("/recipes", response_model=list[RecipeMappingResponse])
def list_recipes(
    menu_item_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.RESTAURANT_STAFF, UserRole.BAR_STAFF]))
):
    query = db.query(RecipeMapping)
    if menu_item_id:
        query = query.filter(RecipeMapping.menu_item_id == menu_item_id)
    return query.all()

@router.post("/recipes", response_model=RecipeMappingResponse, status_code=status.HTTP_201_CREATED)
def create_recipe(
    req: RecipeMappingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.INVENTORY_MANAGER]))
):
    recipe = RecipeMapping(**req.model_dump())
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return recipe
