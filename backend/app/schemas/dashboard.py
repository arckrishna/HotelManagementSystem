from pydantic import BaseModel
from decimal import Decimal
from typing import Any

class DashboardStats(BaseModel):
    # Rooms
    total_rooms: int
    available_rooms: int
    occupied_rooms: int
    reserved_rooms: int
    cleaning_rooms: int
    maintenance_rooms: int
    occupancy_rate: float
    
    # Operations
    active_reservations: int
    pending_checkins_today: int
    pending_checkouts_today: int
    open_maintenance_requests: int
    critical_maintenance_requests: int
    
    # F&B
    active_restaurant_orders: int
    active_bar_orders: int
    
    # Inventory
    low_stock_items_count: int
    
    # Financials
    total_billed_revenue: Decimal
    total_collected_payments: Decimal
    total_outstanding_balance: Decimal

class RecentActivity(BaseModel):
    id: int
    type: str
    title: str
    description: str
    timestamp: str
    badge_color: str | None = None
