from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.inventory import InventoryItem, InventoryMovement, MovementType
from app.models.notification import NotificationType
from app.services.notification_service import create_notification
from app.services.audit_service import log_audit_action

MOVEMENT_TYPE_MAP = {
    "RESTOCK": MovementType.PURCHASE_RECEIPT,
    "restock": MovementType.PURCHASE_RECEIPT,
    "PURCHASE_RECEIPT": MovementType.PURCHASE_RECEIPT,
    "purchase_receipt": MovementType.PURCHASE_RECEIPT,
    "MANUAL_CORRECTION": MovementType.MANUAL_ADJUSTMENT,
    "manual_correction": MovementType.MANUAL_ADJUSTMENT,
    "MANUAL_ADJUSTMENT": MovementType.MANUAL_ADJUSTMENT,
    "manual_adjustment": MovementType.MANUAL_ADJUSTMENT,
    "SPOILAGE_WASTE": MovementType.WASTE_DAMAGE,
    "spoilage_waste": MovementType.WASTE_DAMAGE,
    "WASTE_DAMAGE": MovementType.WASTE_DAMAGE,
    "waste_damage": MovementType.WASTE_DAMAGE,
    "ORDER_CONSUMPTION": MovementType.ORDER_CONSUMPTION,
    "order_consumption": MovementType.ORDER_CONSUMPTION,
}

def adjust_stock(
    db: Session,
    item_id: int,
    quantity_delta: Decimal,
    movement_type: str,
    reason: str | None = None,
    acting_user_id: int = 1
) -> InventoryMovement:
    normalized_type = MOVEMENT_TYPE_MAP.get(
        movement_type, 
        movement_type.lower() if isinstance(movement_type, str) else movement_type
    )
    if normalized_type not in MovementType.ALL_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid movement type: {movement_type}. Valid types are: {MovementType.ALL_TYPES}"
        )
    movement_type = normalized_type

    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).with_for_update().first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found.")

    before_qty = item.current_quantity
    after_qty = before_qty + quantity_delta

    # BR-08: Never allow inventory to silently become negative
    if after_qty < Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Adjustment rejected: Cannot reduce stock below 0. Current: {before_qty} {item.unit}, reduction: {abs(quantity_delta)} {item.unit}."
        )

    item.current_quantity = after_qty

    movement = InventoryMovement(
        inventory_item_id=item.id,
        movement_type=movement_type,
        quantity_delta=quantity_delta,
        before_quantity=before_qty,
        after_quantity=after_qty,
        reason=reason,
        acting_user_id=acting_user_id
    )
    db.add(movement)

    # Low-stock alert check
    if after_qty <= item.min_threshold:
        create_notification(
            db=db,
            title=f"Low Stock Alert: {item.name}",
            message=f"Stock for '{item.name}' is now at {after_qty} {item.unit} (Minimum threshold: {item.min_threshold} {item.unit}).",
            notification_type=NotificationType.LOW_STOCK,
            target_role="inventory_manager",
            reference_id=str(item.id)
        )

    log_audit_action(
        db=db,
        user_id=acting_user_id,
        action="INVENTORY_ADJUST",
        entity_type="InventoryItem",
        entity_id=str(item.id),
        details={"type": movement_type, "delta": str(quantity_delta), "after": str(after_qty)}
    )

    db.commit()
    db.refresh(movement)
    return movement
