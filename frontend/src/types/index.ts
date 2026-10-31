export type UserRole = 
  | 'admin'
  | 'receptionist'
  | 'guest'
  | 'restaurant_staff'
  | 'bar_staff'
  | 'maintenance_staff'
  | 'inventory_manager'
  | 'accountant';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface GuestProfile {
  id: number;
  user_id?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  id_proof_type?: string;
  id_proof_number?: string;
  address?: string;
  vip_status: boolean;
  notes?: string;
  created_at: string;
}

export interface RoomCategory {
  id: number;
  name: string;
  description?: string;
  base_price: string | number;
  max_capacity: number;
  amenities?: string;
}

export type RoomStatus = 'available' | 'reserved' | 'occupied' | 'cleaning' | 'maintenance';

export interface Room {
  id: number;
  room_number: string;
  category_id: number;
  floor: number;
  status: RoomStatus;
  is_active: boolean;
  notes?: string;
  created_at: string;
  category?: RoomCategory;
}

export type ReservationStatus = 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';

export interface Reservation {
  id: number;
  reservation_code: string;
  guest_id: number;
  room_id: number;
  check_in_date: string;
  check_out_date: string;
  num_guests: number;
  nightly_rate_snapshot: string | number;
  total_estimated_amount: string | number;
  status: ReservationStatus;
  special_requests?: string;
  created_at: string;
  guest?: GuestProfile;
  room?: Room;
}

export interface Stay {
  id: number;
  reservation_id: number;
  room_id: number;
  guest_id: number;
  actual_check_in: string;
  actual_check_out?: string;
  status: 'active' | 'completed';
  checked_in_by_user_id: number;
  checked_out_by_user_id?: number;
  initial_room_condition_notes?: string;
  checkout_notes?: string;
  created_at: string;
  reservation?: Reservation;
  guest?: GuestProfile;
  room?: Room;
}

export interface MenuItem {
  id: number;
  department: 'restaurant' | 'bar';
  name: string;
  category: string;
  description?: string;
  price: string | number;
  is_available: boolean;
  image_url?: string;
  preparation_time_minutes: number;
  created_at: string;
}

export interface RestaurantTable {
  id: number;
  table_number: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
}

export type OrderStatus = 'new' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number;
  item_name_snapshot: string;
  unit_price_snapshot: string | number;
  quantity: number;
  subtotal: string | number;
}

export interface Order {
  id: number;
  order_number: string;
  department: 'restaurant' | 'bar';
  order_type: 'dine_in' | 'room_service' | 'takeaway';
  table_id?: number;
  room_id?: number;
  guest_id?: number;
  stay_id?: number;
  status: OrderStatus;
  subtotal: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  is_billed_to_room: boolean;
  bill_id?: number;
  inventory_deducted: boolean;
  notes?: string;
  created_at: string;
  items: OrderItem[];
  table?: RestaurantTable;
  room?: Room;
  guest?: GuestProfile;
}

export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  unit: string;
  current_quantity: string | number;
  min_threshold: string | number;
  unit_cost: string | number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_low_stock: boolean;
}

export interface InventoryMovement {
  id: number;
  inventory_item_id: number;
  movement_type: string;
  quantity_delta: string | number;
  before_quantity: string | number;
  after_quantity: string | number;
  reference_order_id?: number;
  reason?: string;
  acting_user_id: number;
  created_at: string;
  inventory_item?: InventoryItem;
}

export interface MaintenanceRequest {
  id: number;
  room_id?: number;
  location_description: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
  reported_by_user_id: number;
  assigned_to_user_id?: number;
  resolution_notes?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  room?: Room;
  reported_by?: User;
  assigned_to?: User;
}

export interface BillLineItem {
  id: number;
  bill_id: number;
  charge_type: 'room' | 'restaurant' | 'bar' | 'service' | 'tax' | 'discount';
  description: string;
  source_reference_id?: string;
  amount: string | number;
  created_at: string;
}

export interface Payment {
  id: number;
  payment_number: string;
  bill_id: number;
  amount: string | number;
  payment_method: 'cash' | 'card' | 'upi';
  reference_number?: string;
  notes?: string;
  recorded_by_user_id: number;
  created_at: string;
}

export interface Bill {
  id: number;
  bill_number: string;
  guest_id: number;
  stay_id?: number;
  reservation_id?: number;
  room_charges: string | number;
  restaurant_charges: string | number;
  bar_charges: string | number;
  other_charges: string | number;
  tax_amount: string | number;
  discount_amount: string | number;
  total_amount: string | number;
  paid_amount: string | number;
  outstanding_balance: string | number;
  status: 'open' | 'finalized' | 'paid' | 'cancelled';
  created_at: string;
  finalized_at?: string;
  guest?: GuestProfile;
  line_items: BillLineItem[];
  payments: Payment[];
}

export interface NotificationItem {
  id: number;
  recipient_user_id?: number;
  target_role?: string;
  title: string;
  message: string;
  notification_type: string;
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: string;
  created_at: string;
  user?: User;
}

export interface ServiceRequest {
  id: number;
  guest_id: number;
  room_id?: number;
  stay_id?: number;
  request_type: string;
  details?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  resolved_at?: string;
  guest?: GuestProfile;
  room?: Room;
}

export interface GuestFeedback {
  id: number;
  guest_id: number;
  stay_id?: number;
  rating: number;
  comments?: string;
  created_at: string;
  guest?: GuestProfile;
}

export interface DashboardStats {
  total_rooms: number;
  available_rooms: number;
  occupied_rooms: number;
  reserved_rooms: number;
  cleaning_rooms: number;
  maintenance_rooms: number;
  occupancy_rate: number;
  active_reservations: number;
  pending_checkins_today: number;
  pending_checkouts_today: number;
  open_maintenance_requests: number;
  critical_maintenance_requests: number;
  active_restaurant_orders: number;
  active_bar_orders: number;
  low_stock_items_count: number;
  total_billed_revenue: string | number;
  total_collected_payments: string | number;
  total_outstanding_balance: string | number;
}
