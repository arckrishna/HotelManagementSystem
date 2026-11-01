import csv
import io
from datetime import date, datetime, timezone
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.room import Room, RoomStatus
from app.models.reservation import Reservation, ReservationStatus, Stay, StayStatus
from app.models.maintenance import MaintenanceRequest, MaintenancePriority, MaintenanceStatus
from app.models.restaurant import Order, DepartmentType, OrderStatus
from app.models.inventory import InventoryItem
from app.models.billing import Bill, Payment, BillStatus
from app.models.audit import AuditLog
from app.models.user import User, UserRole
from app.schemas.dashboard import DashboardStats, RecentActivity
from app.api.deps import require_roles

router = APIRouter(prefix="/reports", tags=["Reports & Dashboards"])

STAFF_ROLES = [
    UserRole.ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.RECEPTIONIST,
    UserRole.INVENTORY_MANAGER,
    UserRole.MAINTENANCE_STAFF,
    UserRole.RESTAURANT_STAFF,
    UserRole.BAR_STAFF,
]

@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard_kpis(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(STAFF_ROLES))
):
    today = date.today()

    # Room statistics
    rooms = db.query(Room).all()
    total_rooms = len(rooms)
    available = sum(1 for r in rooms if r.status == RoomStatus.AVAILABLE)
    occupied = sum(1 for r in rooms if r.status == RoomStatus.OCCUPIED)
    reserved = sum(1 for r in rooms if r.status == RoomStatus.RESERVED)
    cleaning = sum(1 for r in rooms if r.status == RoomStatus.CLEANING)
    maintenance = sum(1 for r in rooms if r.status == RoomStatus.MAINTENANCE)
    occupancy_rate = round((occupied / total_rooms * 100), 1) if total_rooms > 0 else 0.0

    # Reservations
    active_res = db.query(Reservation).filter(Reservation.status.in_([ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN])).count()
    checkins_today = db.query(Reservation).filter(
        Reservation.check_in_date == today,
        Reservation.status == ReservationStatus.CONFIRMED
    ).count()
    checkouts_today = db.query(Reservation).filter(
        Reservation.check_out_date == today,
        Reservation.status == ReservationStatus.CHECKED_IN
    ).count()

    # Maintenance
    open_maint = db.query(MaintenanceRequest).filter(
        MaintenanceRequest.status.in_([MaintenanceStatus.OPEN, MaintenanceStatus.ASSIGNED, MaintenanceStatus.IN_PROGRESS])
    ).count()
    crit_maint = db.query(MaintenanceRequest).filter(
        MaintenanceRequest.status.in_([MaintenanceStatus.OPEN, MaintenanceStatus.ASSIGNED, MaintenanceStatus.IN_PROGRESS]),
        MaintenanceRequest.priority == MaintenancePriority.CRITICAL
    ).count()

    # Orders
    active_rest_orders = db.query(Order).filter(
        Order.department == DepartmentType.RESTAURANT,
        Order.status.in_([OrderStatus.NEW, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY])
    ).count()
    active_bar_orders = db.query(Order).filter(
        Order.department == DepartmentType.BAR,
        Order.status.in_([OrderStatus.NEW, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY])
    ).count()

    # Inventory
    inv_items = db.query(InventoryItem).filter(InventoryItem.is_active == True).all()
    low_stock_count = sum(1 for i in inv_items if i.current_quantity <= i.min_threshold)

    # Financials (Real database records - not hardcoded!)
    billed_revenue = db.query(func.coalesce(func.sum(Bill.total_amount), Decimal("0.00"))).filter(
        Bill.status != BillStatus.CANCELLED
    ).scalar() or Decimal("0.00")

    collected_payments = db.query(func.coalesce(func.sum(Payment.amount), Decimal("0.00"))).scalar() or Decimal("0.00")

    outstanding = db.query(func.coalesce(func.sum(Bill.outstanding_balance), Decimal("0.00"))).filter(
        Bill.status.in_([BillStatus.OPEN, BillStatus.FINALIZED])
    ).scalar() or Decimal("0.00")

    # F&B Revenue Breakdown
    rest_orders = db.query(Order).filter(Order.status != OrderStatus.CANCELLED).all()
    rest_rev = sum((o.total_amount for o in rest_orders if o.department == DepartmentType.RESTAURANT), Decimal("0.00"))
    bar_rev = sum((o.total_amount for o in rest_orders if o.department == DepartmentType.BAR), Decimal("0.00"))
    room_rev = max(Decimal("0.00"), billed_revenue - (rest_rev + bar_rev))

    return DashboardStats(
        total_rooms=total_rooms,
        available_rooms=available,
        occupied_rooms=occupied,
        reserved_rooms=reserved,
        cleaning_rooms=cleaning,
        maintenance_rooms=maintenance,
        occupancy_rate=occupancy_rate,
        active_reservations=active_res,
        pending_checkins_today=checkins_today,
        pending_checkouts_today=checkouts_today,
        open_maintenance_requests=open_maint,
        critical_maintenance_requests=crit_maint,
        active_restaurant_orders=active_rest_orders,
        active_bar_orders=active_bar_orders,
        low_stock_items_count=low_stock_count,
        total_billed_revenue=billed_revenue,
        total_collected_payments=collected_payments,
        total_outstanding_balance=outstanding,
        total_revenue=billed_revenue,
        total_room_revenue=room_rev,
        total_restaurant_revenue=rest_rev,
        total_bar_revenue=bar_rev
    )

@router.get("/recent-activities", response_model=list[RecentActivity])
def get_recent_activities(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(STAFF_ROLES))
):
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(15).all()
    result = []
    for l in logs:
        badge = "blue"
        if "CHECK" in l.action:
            badge = "emerald"
        elif "CRITICAL" in l.action or "CANCEL" in l.action:
            badge = "red"
        elif "PAYMENT" in l.action:
            badge = "purple"
        elif "ORDER" in l.action:
            badge = "amber"

        result.append(RecentActivity(
            id=l.id,
            type=l.action,
            title=l.action.replace("_", " ").title(),
            description=f"{l.entity_type} #{l.entity_id} - {l.details or ''}",
            timestamp=l.created_at.strftime("%b %d, %H:%M"),
            badge_color=badge
        ))
    return result

@router.get("/sales")
def get_sales_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(STAFF_ROLES))
):
    orders = db.query(Order).filter(Order.status != OrderStatus.CANCELLED).all()
    restaurant_sales = sum((o.total_amount for o in orders if o.department == DepartmentType.RESTAURANT), Decimal("0.00"))
    bar_sales = sum((o.total_amount for o in orders if o.department == DepartmentType.BAR), Decimal("0.00"))

    # Group by order type
    by_type = {}
    for o in orders:
        by_type[o.order_type] = by_type.get(o.order_type, Decimal("0.00")) + o.total_amount

    return {
        "restaurant_total": restaurant_sales,
        "bar_total": bar_sales,
        "total_sales": restaurant_sales + bar_sales,
        "orders_count": len(orders),
        "sales_by_order_type": by_type
    }

@router.get("/occupancy")
def get_occupancy_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(STAFF_ROLES))
):
    rooms = db.query(Room).all()
    by_category = {}
    for r in rooms:
        cat_name = r.category.name if r.category else "Standard"
        if cat_name not in by_category:
            by_category[cat_name] = {"total": 0, "occupied": 0, "available": 0, "maintenance": 0}
        by_category[cat_name]["total"] += 1
        if r.status == RoomStatus.OCCUPIED:
            by_category[cat_name]["occupied"] += 1
        elif r.status == RoomStatus.AVAILABLE:
            by_category[cat_name]["available"] += 1
        elif r.status == RoomStatus.MAINTENANCE:
            by_category[cat_name]["maintenance"] += 1

    return {
        "total_rooms": len(rooms),
        "breakdown": by_category
    }

@router.get("/export")
def export_report_csv(
    report_type: str = "rooms",
    db: Session = Depends(get_db)
):
    output = io.StringIO()
    writer = csv.writer(output)

    if report_type == "rooms":
        writer.writerow(["Room Number", "Category", "Floor", "Price/Night", "Status", "Active"])
        for r in db.query(Room).all():
            writer.writerow([r.room_number, r.category.name if r.category else "Standard", r.floor, r.category.base_price if r.category else "0.00", r.status, r.is_active])
    elif report_type == "inventory":
        writer.writerow(["Item Name", "Category", "Unit", "Current Stock", "Min Threshold", "Unit Cost", "Low Stock Alert"])
        for i in db.query(InventoryItem).all():
            writer.writerow([i.name, i.category, i.unit, i.current_quantity, i.min_threshold, i.unit_cost, i.current_quantity <= i.min_threshold])
    elif report_type == "bills":
        writer.writerow(["Bill Number", "Guest ID", "Room Charges", "Restaurant Charges", "Bar Charges", "Tax", "Total", "Paid", "Balance", "Status"])
        for b in db.query(Bill).all():
            writer.writerow([b.bill_number, b.guest_id, b.room_charges, b.restaurant_charges, b.bar_charges, b.tax_amount, b.total_amount, b.paid_amount, b.outstanding_balance, b.status])
    else:
        raise HTTPException(status_code=400, detail="Invalid report type for export.")

    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=staysync_{report_type}_report.csv"}
    )
