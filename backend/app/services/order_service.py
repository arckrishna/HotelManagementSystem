import random
import string
from datetime import date
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.restaurant import Order, OrderItem, MenuItem, OrderStatus, DepartmentType, RestaurantTable
from app.models.room import Room
from app.models.reservation import Stay, StayStatus
from app.models.inventory import InventoryItem, RecipeMapping, InventoryMovement, MovementType
from app.models.notification import NotificationType
from app.services.notification_service import create_notification
from app.services.audit_service import log_audit_action

def generate_order_number(department: str) -> str:
    prefix = "ORD-BAR" if department == DepartmentType.BAR else "ORD-REST"
    suffix = ''.join(random.choices(string.digits, k=5))
    return f"{prefix}-{date.today().year}-{suffix}"

def create_order(
    db: Session,
    department: str,
    order_type: str,
    items_data: list[dict],
    table_id: int | None = None,
    room_id: int | None = None,
    guest_id: int | None = None,
    stay_id: int | None = None,
    is_billed_to_room: bool = False,
    notes: str | None = None,
    acting_user_id: int | None = None
) -> Order:
    if not items_data:
        raise HTTPException(status_code=400, detail="Cannot place an empty order.")

    # Validate table if dine-in
    if table_id:
        table = db.query(RestaurantTable).filter(RestaurantTable.id == table_id).first()
        if not table:
            raise HTTPException(status_code=404, detail=f"Table with ID {table_id} not found.")

    # Validate room and stay if room billing is enabled
    bill_id = None
    if is_billed_to_room:
        if not room_id and not stay_id:
            raise HTTPException(
                status_code=400, 
                detail="Room ID or Stay ID must be specified when billing to room."
            )
        stay_query = db.query(Stay).filter(Stay.status == StayStatus.ACTIVE)
        if stay_id:
            stay_query = stay_query.filter(Stay.id == stay_id)
        elif room_id:
            stay_query = stay_query.filter(Stay.room_id == room_id)
        active_stay = stay_query.first()

        if not active_stay:
            raise HTTPException(
                status_code=400,
                detail="Cannot bill to room: No active stay found for this room/guest."
            )
        stay_id = active_stay.id
        guest_id = active_stay.guest_id
        room_id = active_stay.room_id
        if active_stay.bill:
            bill_id = active_stay.bill.id

    subtotal = Decimal("0.00")
    order_items_to_add = []

    for itm in items_data:
        menu_item_id = itm["menu_item_id"]
        qty = int(itm.get("quantity", 1))
        if qty <= 0:
            raise HTTPException(status_code=400, detail="Item quantity must be greater than 0.")

        menu_item = db.query(MenuItem).filter(MenuItem.id == menu_item_id).first()
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item {menu_item_id} not found.")

        # BR-05: Out-of-stock items cannot be ordered
        if not menu_item.is_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Item '{menu_item.name}' is currently out of stock and cannot be ordered."
            )

        unit_price = Decimal(str(menu_item.price))
        item_subtotal = unit_price * Decimal(qty)
        subtotal += item_subtotal

        order_items_to_add.append({
            "menu_item": menu_item,
            "quantity": qty,
            "unit_price": unit_price,
            "subtotal": item_subtotal
        })

    # Standard 5% GST on F&B
    tax = (subtotal * Decimal("0.05")).quantize(Decimal("0.01"))
    total = subtotal + tax

    order = Order(
        order_number=generate_order_number(department),
        department=department,
        order_type=order_type,
        table_id=table_id,
        room_id=room_id,
        guest_id=guest_id,
        stay_id=stay_id,
        status=OrderStatus.NEW,
        subtotal=subtotal,
        tax_amount=tax,
        total_amount=total,
        is_billed_to_room=is_billed_to_room,
        bill_id=bill_id,
        inventory_deducted=False,
        notes=notes
    )
    db.add(order)
    db.flush()

    for item_spec in order_items_to_add:
        order_item = OrderItem(
            order_id=order.id,
            menu_item_id=item_spec["menu_item"].id,
            item_name_snapshot=item_spec["menu_item"].name,
            unit_price_snapshot=item_spec["unit_price"],
            quantity=item_spec["quantity"],
            subtotal=item_spec["subtotal"]
        )
        db.add(order_item)

    # Dispatches in-app notification to staff
    target_role = "bar_staff" if department == DepartmentType.BAR else "restaurant_staff"
    create_notification(
        db=db,
        title=f"New {department.capitalize()} Order #{order.order_number}",
        message=f"New {order.order_type} order received with {len(order_items_to_add)} item(s) totalling ₹{order.total_amount}.",
        notification_type=NotificationType.ORDER_NEW,
        target_role=target_role,
        reference_id=str(order.id)
    )

    log_audit_action(
        db=db,
        user_id=acting_user_id,
        action="ORDER_CREATE",
        entity_type="Order",
        entity_id=str(order.id),
        details={"dept": department, "total": str(order.total_amount), "billed_to_room": is_billed_to_room}
    )

    db.commit()
    db.refresh(order)
    return order

def update_order_status(
    db: Session,
    order_id: int,
    new_status: str,
    acting_user_id: int | None = None
) -> Order:
    if new_status not in OrderStatus.ALL_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid order status: {new_status}")

    order = db.query(Order).filter(Order.id == order_id).with_for_update().first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found.")

    old_status = order.status
    order.status = new_status

    # BR-05 & Master Prompt §12: Deduct inventory upon confirmation or preparation exactly once
    if new_status in [OrderStatus.CONFIRMED, OrderStatus.PREPARING] and not order.inventory_deducted:
        deduct_order_inventory(db, order, acting_user_id)
        order.inventory_deducted = True

    log_audit_action(
        db=db,
        user_id=acting_user_id,
        action="ORDER_STATUS_UPDATE",
        entity_type="Order",
        entity_id=str(order.id),
        details={"from": old_status, "to": new_status, "inventory_deducted": order.inventory_deducted}
    )

    db.commit()
    db.refresh(order)
    return order

def deduct_order_inventory(db: Session, order: Order, acting_user_id: int | None):
    """
    Checks and deducts ingredients / inventory items associated with ordered menu items via RecipeMapping.
    Enforces no negative inventory and generates low-stock alerts.
    """
    for item in order.items:
        recipe_maps = db.query(RecipeMapping).filter(RecipeMapping.menu_item_id == item.menu_item_id).all()
        for rm in recipe_maps:
            inv_item = db.query(InventoryItem).filter(InventoryItem.id == rm.inventory_item_id).with_for_update().first()
            if inv_item:
                qty_to_deduct = rm.quantity_required * Decimal(item.quantity)
                before_qty = inv_item.current_quantity
                after_qty = before_qty - qty_to_deduct

                # BR-08: Prevent negative inventory
                if after_qty < Decimal("0.00"):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Insufficient inventory for ingredient '{inv_item.name}'. Available: {before_qty} {inv_item.unit}, required: {qty_to_deduct} {inv_item.unit}."
                    )

                inv_item.current_quantity = after_qty

                # Record stock movement
                movement = InventoryMovement(
                    inventory_item_id=inv_item.id,
                    movement_type=MovementType.ORDER_CONSUMPTION,
                    quantity_delta=-qty_to_deduct,
                    before_quantity=before_qty,
                    after_quantity=after_qty,
                    reference_order_id=order.id,
                    reason=f"Consumed by Order #{order.order_number}",
                    acting_user_id=acting_user_id or 1
                )
                db.add(movement)

                # Low stock alert check
                if after_qty <= inv_item.min_threshold:
                    create_notification(
                        db=db,
                        title=f"Low Stock Alert: {inv_item.name}",
                        message=f"Inventory item '{inv_item.name}' has fallen to {after_qty} {inv_item.unit} (Threshold: {inv_item.min_threshold} {inv_item.unit}).",
                        notification_type=NotificationType.LOW_STOCK,
                        target_role="inventory_manager",
                        reference_id=str(inv_item.id)
                    )
