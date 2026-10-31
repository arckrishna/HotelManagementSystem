import sys
import os
from decimal import Decimal
from datetime import datetime, date, timedelta, timezone

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.guest import Guest
from app.models.room import Room, RoomCategory, RoomStatus
from app.models.reservation import Reservation, ReservationStatus, Stay, StayStatus
from app.models.restaurant import RestaurantTable, MenuItem, Order, OrderItem, DepartmentType, OrderType, OrderStatus
from app.models.inventory import InventoryItem, RecipeMapping, InventoryMovement, MovementType
from app.models.maintenance import MaintenanceRequest, MaintenancePriority, MaintenanceStatus
from app.models.billing import Bill, BillLineItem, Payment, BillStatus, PaymentMethod, ChargeType
from app.models.notification import Notification, NotificationType
from app.models.audit import AuditLog
from app.models.feedback import ServiceRequest, GuestFeedback, ServiceRequestStatus

def seed_database():
    print("[INFO] Connecting to PostgreSQL to seed demonstration data...")
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        existing_admin = db.query(User).filter(User.email == "admin@staysync.com").first()
        if existing_admin:
            print("Database already contains demo seed data. Skipping seed.")
            return

        print("Creating demo users for all 8 roles...")
        users_data = [
            ("admin", "admin@staysync.com", "Admin@123", "Rajesh Sharma", "+91 98200 11223", UserRole.ADMIN),
            ("receptionist", "receptionist@staysync.com", "Staff@123", "Sneha Patel", "+91 98200 22334", UserRole.RECEPTIONIST),
            ("restaurant", "restaurant@staysync.com", "Staff@123", "Chef Vikram Rao", "+91 98200 33445", UserRole.RESTAURANT_STAFF),
            ("bar", "bar@staysync.com", "Staff@123", "Arjun Nair", "+91 98200 44556", UserRole.BAR_STAFF),
            ("maintenance", "maintenance@staysync.com", "Staff@123", "Manoj Kumar", "+91 98200 55667", UserRole.MAINTENANCE_STAFF),
            ("inventory", "inventory@staysync.com", "Staff@123", "Suresh Gupta", "+91 98200 66778", UserRole.INVENTORY_MANAGER),
            ("accountant", "accountant@staysync.com", "Staff@123", "Kavita Reddy", "+91 98200 77889", UserRole.ACCOUNTANT),
            # Guest accounts
            ("guest1", "guest1@staysync.com", "Guest@123", "Priya Sharma", "+91 99100 12345", UserRole.GUEST),
            ("guest2", "guest2@staysync.com", "Guest@123", "Rahul Verma", "+91 99200 23456", UserRole.GUEST),
            ("guest3", "guest3@staysync.com", "Guest@123", "Anita Desai", "+91 99300 34567", UserRole.GUEST),
        ]

        created_users = {}
        for username, email, pwd, name, phone, role in users_data:
            user = User(
                username=username,
                email=email,
                hashed_password=get_password_hash(pwd),
                full_name=name,
                phone=phone,
                role=role,
                is_active=True
            )
            db.add(user)
            db.flush()
            created_users[username] = user

        print("Creating guest profiles...")
        g1 = Guest(
            user_id=created_users["guest1"].id,
            first_name="Priya",
            last_name="Sharma",
            email="guest1@staysync.com",
            phone="+91 99100 12345",
            id_proof_type="Passport",
            id_proof_number="Z87654321",
            address="B-402, Sea Green Apts, Worli, Mumbai",
            vip_status=True,
            notes="Prefers high-floor room with sea view. Allergic to peanuts."
        )
        g2 = Guest(
            user_id=created_users["guest2"].id,
            first_name="Rahul",
            last_name="Verma",
            email="guest2@staysync.com",
            phone="+91 99200 23456",
            id_proof_type="National ID",
            id_proof_number="IND-5432-8765",
            address="74, Hiranandani Estate, Thane",
            vip_status=False
        )
        g3 = Guest(
            user_id=created_users["guest3"].id,
            first_name="Anita",
            last_name="Desai",
            email="guest3@staysync.com",
            phone="+91 99300 34567",
            id_proof_type="Driving License",
            id_proof_number="MH02-2022-9988",
            address="Flat 12, Park Street, Pune",
            vip_status=False
        )
        db.add_all([g1, g2, g3])
        db.flush()

        print("Creating room categories...")
        cat_std = RoomCategory(
            name="Standard Single",
            description="Comfortable single bed, workspace desk, ensuite shower, high-speed WiFi.",
            base_price=Decimal("2500.00"),
            max_capacity=1,
            amenities="High-speed WiFi, AC, TV, Workspace Desk, Electric Kettle"
        )
        cat_sup = RoomCategory(
            name="Superior Double",
            description="Spacious queen bed room with city views and premium bathroom.",
            base_price=Decimal("4000.00"),
            max_capacity=2,
            amenities="WiFi, AC, Smart TV, Mini-fridge, Balcony, Coffee Maker"
        )
        cat_dlx = RoomCategory(
            name="Deluxe Room",
            description="Elegant king-sized bed room with luxury furnishings, bathtub, and complimentary minibar.",
            base_price=Decimal("6000.00"),
            max_capacity=3,
            amenities="King Bed, Luxury Bathtub, Complimentary Minibar, Espresso Machine, City Skyline View"
        )
        cat_exe = RoomCategory(
            name="Executive Suite",
            description="Separate living lounge, workstation, panoramic views, and exclusive lounge access.",
            base_price=Decimal("9500.00"),
            max_capacity=4,
            amenities="Separate Lounge, 55' OLED TV, King Bed, Jacuzzi, Executive Lounge Access"
        )
        cat_pres = RoomCategory(
            name="Presidential Suite",
            description="Top-tier luxury penthouse suite with private dining, master bedroom, and butler service.",
            base_price=Decimal("20000.00"),
            max_capacity=5,
            amenities="Penthouse Floor, Private Dining Area, Dedicated Butler, Spa Bath, Terrace Lounge"
        )
        db.add_all([cat_std, cat_sup, cat_dlx, cat_exe, cat_pres])
        db.flush()

        print("Creating 16 hotel rooms across floors 1-4...")
        rooms_specs = [
            ("101", cat_std.id, 1, RoomStatus.AVAILABLE),
            ("102", cat_std.id, 1, RoomStatus.AVAILABLE),
            ("103", cat_sup.id, 1, RoomStatus.AVAILABLE),
            ("104", cat_sup.id, 1, RoomStatus.CLEANING),
            ("201", cat_sup.id, 2, RoomStatus.AVAILABLE),
            ("202", cat_sup.id, 2, RoomStatus.AVAILABLE),
            ("203", cat_dlx.id, 2, RoomStatus.OCCUPIED), # Priya's stay
            ("204", cat_dlx.id, 2, RoomStatus.RESERVED), # Rahul's upcoming
            ("205", cat_dlx.id, 2, RoomStatus.AVAILABLE),
            ("301", cat_dlx.id, 3, RoomStatus.AVAILABLE),
            ("302", cat_dlx.id, 3, RoomStatus.MAINTENANCE), # Critical AC issue!
            ("303", cat_exe.id, 3, RoomStatus.AVAILABLE),
            ("304", cat_exe.id, 3, RoomStatus.AVAILABLE),
            ("401", cat_exe.id, 4, RoomStatus.AVAILABLE),
            ("402", cat_exe.id, 4, RoomStatus.AVAILABLE),
            ("405", cat_pres.id, 4, RoomStatus.AVAILABLE),
        ]
        created_rooms = {}
        for r_num, cat_id, fl, st in rooms_specs:
            room = Room(room_number=r_num, category_id=cat_id, floor=fl, status=st, is_active=True)
            db.add(room)
            db.flush()
            created_rooms[r_num] = room

        print("Creating restaurant tables...")
        tables_data = [
            ("T-01", 2, "available"),
            ("T-02", 2, "available"),
            ("T-03", 4, "available"),
            ("T-04", 4, "occupied"),
            ("T-05", 4, "available"),
            ("T-06", 6, "available"),
            ("T-07", 6, "available"),
            ("T-08", 8, "available"),
            ("T-09", 2, "available"),
            ("T-10", 4, "available"),
        ]
        created_tables = {}
        for t_num, cap, st in tables_data:
            tbl = RestaurantTable(table_number=t_num, capacity=cap, status=st)
            db.add(tbl)
            db.flush()
            created_tables[t_num] = tbl

        print("Creating restaurant & bar menus...")
        menu_items_data = [
            # Restaurant
            (DepartmentType.RESTAURANT, "Paneer Butter Masala", "Mains", "Cottage cheese simmered in rich buttery tomato gravy.", Decimal("380.00"), True, 15),
            (DepartmentType.RESTAURANT, "Butter Chicken", "Mains", "Tender chicken cooked in creamy makhani gravy.", Decimal("450.00"), True, 20),
            (DepartmentType.RESTAURANT, "Hyderabadi Chicken Biryani", "Mains", "Fragrant basmati rice layered with spiced marinated chicken and saffron.", Decimal("420.00"), True, 25),
            (DepartmentType.RESTAURANT, "Garlic Butter Naan", "Breads", "Traditional tandoor-baked flatbread with garlic butter.", Decimal("80.00"), True, 10),
            (DepartmentType.RESTAURANT, "Tandoori Chicken Tikka", "Starters", "Marinated charred chicken morsels with mint chutney.", Decimal("360.00"), True, 15),
            (DepartmentType.RESTAURANT, "Crispy Corn & Pepper Salt", "Starters", "Golden tossed corn kernels with bell peppers and scallions.", Decimal("280.00"), True, 12),
            (DepartmentType.RESTAURANT, "Caesar Salad with Grilled Chicken", "Salads", "Crispy romaine, parmesan shavings, herb croutons, creamy dressing.", Decimal("320.00"), True, 10),
            (DepartmentType.RESTAURANT, "Wood-Fired Margherita Pizza", "Mains", "Fresh mozzarella, San Marzano tomato sauce, fresh basil leaves.", Decimal("480.00"), True, 20),
            (DepartmentType.RESTAURANT, "Penne Alfredo Pasta", "Mains", "Creamy parmesan and white wine emulsion with sautéed mushrooms.", Decimal("420.00"), True, 15),
            (DepartmentType.RESTAURANT, "Gulab Jamun with Saffron Rabdi", "Desserts", "Warm milk solids dumplings soaked in cardamom syrup.", Decimal("220.00"), True, 5),
            (DepartmentType.RESTAURANT, "Chocolate Lava Cake", "Desserts", "Molten center chocolate cake served with vanilla gelato.", Decimal("260.00"), True, 12),
            (DepartmentType.RESTAURANT, "Fresh Lemon Soda", "Beverages", "Refreshing chilled soda with mint and freshly squeezed lime.", Decimal("120.00"), True, 5),
            # Bar
            (DepartmentType.BAR, "Signature Smoked Old Fashioned", "Cocktails", "Bourbon, angostura bitters, demerara syrup, hickory smoke.", Decimal("650.00"), True, 5),
            (DepartmentType.BAR, "Tropical Mojito", "Cocktails", "White rum, fresh garden mint, Persian lime juice, soda splash.", Decimal("550.00"), True, 5),
            (DepartmentType.BAR, "Espresso Martini", "Cocktails", "Vodka, fresh espresso shot, coffee liqueur, vanilla bean.", Decimal("600.00"), True, 5),
            (DepartmentType.BAR, "Classic Gin & Tonic", "Cocktails", "Artisanal dry gin, elderflower tonic, fresh cucumber ribbon.", Decimal("520.00"), True, 3),
            (DepartmentType.BAR, "Imported Draught Craft Beer", "Beers", "Chilled pint of Belgian wheat craft beer.", Decimal("380.00"), True, 2),
            (DepartmentType.BAR, "Corona Extra", "Beers", "330ml bottle served with lime wedge.", Decimal("400.00"), True, 2),
            (DepartmentType.BAR, "Cabernet Sauvignon (Glass)", "Wines", "Full-bodied red wine with notes of blackcurrant and cedar.", Decimal("700.00"), True, 3),
            (DepartmentType.BAR, "Virgin Mojito (Non-Alcoholic)", "Mocktails", "Refreshing mint, lime, and crushed ice refresher.", Decimal("260.00"), True, 5),
        ]
        created_menu_items = {}
        for dept, name, cat, desc, price, avail, prep in menu_items_data:
            mi = MenuItem(
                department=dept,
                name=name,
                category=cat,
                description=desc,
                price=price,
                is_available=avail,
                preparation_time_minutes=prep
            )
            db.add(mi)
            db.flush()
            created_menu_items[name] = mi

        print("Creating centralized inventory items...")
        inventory_data = [
            ("Basmati Biryani Rice", "Food Ingredient", "kg", Decimal("150.00"), Decimal("30.00"), Decimal("95.00")),
            ("Refined Wheat Flour (Maida)", "Food Ingredient", "kg", Decimal("80.00"), Decimal("20.00"), Decimal("42.00")),
            ("Fresh Chicken Breast", "Food Ingredient", "kg", Decimal("45.00"), Decimal("15.00"), Decimal("220.00")),
            ("Paneer (Cottage Cheese)", "Food Ingredient", "kg", Decimal("25.00"), Decimal("10.00"), Decimal("320.00")),
            ("Mozzarella Cheese", "Food Ingredient", "kg", Decimal("5.00"), Decimal("10.00"), Decimal("450.00")), # LOW STOCK ALERT!
            ("San Marzano Tomatoes", "Food Ingredient", "kg", Decimal("8.00"), Decimal("15.00"), Decimal("60.00")), # LOW STOCK ALERT!
            ("Extra Virgin Olive Oil", "Food Ingredient", "L", Decimal("30.00"), Decimal("10.00"), Decimal("850.00")),
            ("Arabica Coffee Beans", "Food Ingredient", "kg", Decimal("18.00"), Decimal("5.00"), Decimal("750.00")),
            ("Bourbon Whiskey", "Beverage", "bottles", Decimal("12.00"), Decimal("6.00"), Decimal("2400.00")),
            ("Premium Dry Gin", "Beverage", "bottles", Decimal("14.00"), Decimal("5.00"), Decimal("1900.00")),
            ("White Rum", "Beverage", "bottles", Decimal("3.00"), Decimal("5.00"), Decimal("1200.00")), # LOW STOCK ALERT!
            ("Belgian Wheat Craft Beer Keg", "Beverage", "L", Decimal("50.00"), Decimal("20.00"), Decimal("300.00")),
            ("Cabernet Sauvignon Red Wine", "Beverage", "bottles", Decimal("20.00"), Decimal("8.00"), Decimal("1800.00")),
            ("Premium Tonic Water", "Beverage", "bottles", Decimal("60.00"), Decimal("20.00"), Decimal("70.00")),
            ("Egyptian Cotton Bed Linens", "Linens", "sets", Decimal("40.00"), Decimal("15.00"), Decimal("1200.00")),
            ("Eco Bath Amenities Kit", "Guest Supplies", "kits", Decimal("120.00"), Decimal("30.00"), Decimal("150.00")),
        ]
        created_inv = {}
        for name, cat, unit, cur_qty, min_th, cost in inventory_data:
            inv = InventoryItem(
                name=name,
                category=cat,
                unit=unit,
                current_quantity=cur_qty,
                min_threshold=min_th,
                unit_cost=cost,
                is_active=True
            )
            db.add(inv)
            db.flush()
            created_inv[name] = inv

        print("Creating recipe mappings between menus and ingredients...")
        recipes = [
            ("Hyderabadi Chicken Biryani", "Basmati Biryani Rice", Decimal("0.25")),
            ("Hyderabadi Chicken Biryani", "Fresh Chicken Breast", Decimal("0.25")),
            ("Butter Chicken", "Fresh Chicken Breast", Decimal("0.30")),
            ("Paneer Butter Masala", "Paneer (Cottage Cheese)", Decimal("0.25")),
            ("Garlic Butter Naan", "Refined Wheat Flour (Maida)", Decimal("0.15")),
            ("Wood-Fired Margherita Pizza", "Mozzarella Cheese", Decimal("0.20")),
            ("Wood-Fired Margherita Pizza", "Refined Wheat Flour (Maida)", Decimal("0.20")),
            ("Classic Gin & Tonic", "Premium Dry Gin", Decimal("0.06")), # 60ml
            ("Classic Gin & Tonic", "Premium Tonic Water", Decimal("1.00")),
            ("Signature Smoked Old Fashioned", "Bourbon Whiskey", Decimal("0.06")),
            ("Tropical Mojito", "White Rum", Decimal("0.06")),
        ]
        for menu_name, inv_name, qty in recipes:
            if menu_name in created_menu_items and inv_name in created_inv:
                rm = RecipeMapping(
                    menu_item_id=created_menu_items[menu_name].id,
                    inventory_item_id=created_inv[inv_name].id,
                    quantity_required=qty
                )
                db.add(rm)

        print("Creating active reservation & stay for Priya Sharma in Room 203...")
        checkin_date = date.today() - timedelta(days=1)
        checkout_date = date.today() + timedelta(days=2)
        nightly_rate = created_rooms["203"].category.base_price
        total_est = nightly_rate * Decimal("3")

        res1 = Reservation(
            reservation_code="RES-2026-1001",
            guest_id=g1.id,
            room_id=created_rooms["203"].id,
            check_in_date=checkin_date,
            check_out_date=checkout_date,
            num_guests=2,
            nightly_rate_snapshot=nightly_rate,
            total_estimated_amount=total_est,
            status=ReservationStatus.CHECKED_IN,
            special_requests="High floor room, extra bath towels."
        )
        db.add(res1)
        db.flush()

        stay1 = Stay(
            reservation_id=res1.id,
            room_id=created_rooms["203"].id,
            guest_id=g1.id,
            actual_check_in=datetime.now(timezone.utc) - timedelta(days=1),
            status=StayStatus.ACTIVE,
            checked_in_by_user_id=created_users["receptionist"].id,
            initial_room_condition_notes="Room inspected: excellent condition."
        )
        db.add(stay1)
        db.flush()

        # Bill for Priya's active stay
        bill1 = Bill(
            bill_number="BILL-2026-0001",
            guest_id=g1.id,
            stay_id=stay1.id,
            reservation_id=res1.id,
            room_charges=Decimal("12000.00"), # 2 nights elapsed
            restaurant_charges=Decimal("830.00"),
            bar_charges=Decimal("650.00"),
            other_charges=Decimal("0.00"),
            tax_amount=Decimal("1348.00"), # 10%
            discount_amount=Decimal("0.00"),
            total_amount=Decimal("14828.00"),
            paid_amount=Decimal("5000.00"),
            outstanding_balance=Decimal("9828.00"),
            status=BillStatus.OPEN
        )
        db.add(bill1)
        db.flush()

        # Bill line items
        db.add(BillLineItem(
            bill_id=bill1.id,
            charge_type=ChargeType.ROOM,
            description="Room 203 Deluxe accommodation (2 nights @ ₹6000.00/night)",
            source_reference_id=str(stay1.id),
            amount=Decimal("12000.00")
        ))
        db.add(BillLineItem(
            bill_id=bill1.id,
            charge_type=ChargeType.RESTAURANT,
            description="Restaurant Room Service #ORD-REST-2026-101",
            source_reference_id="ORD-REST-2026-101",
            amount=Decimal("830.00")
        ))
        db.add(BillLineItem(
            bill_id=bill1.id,
            charge_type=ChargeType.BAR,
            description="Bar Service #ORD-BAR-2026-201",
            source_reference_id="ORD-BAR-2026-201",
            amount=Decimal("650.00")
        ))
        db.add(BillLineItem(
            bill_id=bill1.id,
            charge_type=ChargeType.TAX,
            description="Hospitality Goods & Service Tax (10%)",
            source_reference_id=None,
            amount=Decimal("1348.00")
        ))

        # Partial Payment already made by Priya
        p1 = Payment(
            payment_number="PAY-2026-0001",
            bill_id=bill1.id,
            amount=Decimal("5000.00"),
            payment_method=PaymentMethod.CARD,
            reference_number="TXN-VISA-9948",
            notes="Advance deposit paid at check-in",
            recorded_by_user_id=created_users["receptionist"].id
        )
        db.add(p1)

        print("Creating confirmed upcoming reservation for Rahul Verma in Room 204...")
        res2 = Reservation(
            reservation_code="RES-2026-1002",
            guest_id=g2.id,
            room_id=created_rooms["204"].id,
            check_in_date=date.today(),
            check_out_date=date.today() + timedelta(days=2),
            num_guests=2,
            nightly_rate_snapshot=created_rooms["204"].category.base_price,
            total_estimated_amount=created_rooms["204"].category.base_price * Decimal(2),
            status=ReservationStatus.CONFIRMED,
            special_requests="Late check-in requested."
        )
        db.add(res2)

        print("Creating sample restaurant and bar orders...")
        # Restaurant room service order for Priya in Room 203
        ord1 = Order(
            order_number="ORD-REST-2026-101",
            department=DepartmentType.RESTAURANT,
            order_type=OrderType.ROOM_SERVICE,
            room_id=created_rooms["203"].id,
            guest_id=g1.id,
            stay_id=stay1.id,
            bill_id=bill1.id,
            status=OrderStatus.COMPLETED,
            subtotal=Decimal("790.00"),
            tax_amount=Decimal("40.00"),
            total_amount=Decimal("830.00"),
            is_billed_to_room=True,
            inventory_deducted=True,
            notes="Deliver to Room 203 promptly."
        )
        db.add(ord1)
        db.flush()

        db.add(OrderItem(
            order_id=ord1.id,
            menu_item_id=created_menu_items["Hyderabadi Chicken Biryani"].id,
            item_name_snapshot="Hyderabadi Chicken Biryani",
            unit_price_snapshot=Decimal("420.00"),
            quantity=1,
            subtotal=Decimal("420.00")
        ))
        db.add(OrderItem(
            order_id=ord1.id,
            menu_item_id=created_menu_items["Tandoori Chicken Tikka"].id,
            item_name_snapshot="Tandoori Chicken Tikka",
            unit_price_snapshot=Decimal("360.00"),
            quantity=1,
            subtotal=Decimal("360.00")
        ))

        # Bar cocktail order
        ord2 = Order(
            order_number="ORD-BAR-2026-201",
            department=DepartmentType.BAR,
            order_type=OrderType.ROOM_SERVICE,
            room_id=created_rooms["203"].id,
            guest_id=g1.id,
            stay_id=stay1.id,
            bill_id=bill1.id,
            status=OrderStatus.COMPLETED,
            subtotal=Decimal("650.00"),
            tax_amount=Decimal("0.00"),
            total_amount=Decimal("650.00"),
            is_billed_to_room=True,
            inventory_deducted=True
        )
        db.add(ord2)
        db.flush()

        db.add(OrderItem(
            order_id=ord2.id,
            menu_item_id=created_menu_items["Signature Smoked Old Fashioned"].id,
            item_name_snapshot="Signature Smoked Old Fashioned",
            unit_price_snapshot=Decimal("650.00"),
            quantity=1,
            subtotal=Decimal("650.00")
        ))

        # Active restaurant dine-in order for Table T-04
        ord3 = Order(
            order_number="ORD-REST-2026-102",
            department=DepartmentType.RESTAURANT,
            order_type=OrderType.DINE_IN,
            table_id=created_tables["T-04"].id,
            status=OrderStatus.PREPARING,
            subtotal=Decimal("860.00"),
            tax_amount=Decimal("43.00"),
            total_amount=Decimal("903.00"),
            is_billed_to_room=False,
            inventory_deducted=True
        )
        db.add(ord3)
        db.flush()

        db.add(OrderItem(
            order_id=ord3.id,
            menu_item_id=created_menu_items["Wood-Fired Margherita Pizza"].id,
            item_name_snapshot="Wood-Fired Margherita Pizza",
            unit_price_snapshot=Decimal("480.00"),
            quantity=1,
            subtotal=Decimal("480.00")
        ))
        db.add(OrderItem(
            order_id=ord3.id,
            menu_item_id=created_menu_items["Paneer Butter Masala"].id,
            item_name_snapshot="Paneer Butter Masala",
            unit_price_snapshot=Decimal("380.00"),
            quantity=1,
            subtotal=Decimal("380.00")
        ))

        print("Creating maintenance requests...")
        # Critical Maintenance on Room 302 (AC leakage)
        m1 = MaintenanceRequest(
            room_id=created_rooms["302"].id,
            location_description="Room 302 - Master Bedroom",
            title="AC Unit Heavy Water Leakage",
            description="Split AC compressor drain pipe clogged, causing water overflow on carpet. Room blocked from allocation.",
            priority=MaintenancePriority.CRITICAL,
            status=MaintenanceStatus.ASSIGNED,
            reported_by_user_id=created_users["receptionist"].id,
            assigned_to_user_id=created_users["maintenance"].id
        )
        # High Priority Maintenance in Hotel Lobby
        m2 = MaintenanceRequest(
            room_id=None,
            location_description="Main Lobby - East Elevator",
            title="Elevator Door Sensor Glitch",
            description="East passenger lift door safety optical sensor intermittently reversing without obstruction.",
            priority=MaintenancePriority.HIGH,
            status=MaintenanceStatus.IN_PROGRESS,
            reported_by_user_id=created_users["receptionist"].id,
            assigned_to_user_id=created_users["maintenance"].id
        )
        # Completed historical request
        m3 = MaintenanceRequest(
            room_id=created_rooms["104"].id,
            location_description="Room 104 - Bathroom",
            title="Shower Mixer Cartridge Replacement",
            description="Hot water pressure was low. Replaced ceramic cartridge valve.",
            priority=MaintenancePriority.LOW,
            status=MaintenanceStatus.RESOLVED,
            reported_by_user_id=created_users["receptionist"].id,
            assigned_to_user_id=created_users["maintenance"].id,
            resolution_notes="Replaced cartridge and verified temperature pressure. Cleaned up bathroom.",
            resolved_at=datetime.now(timezone.utc) - timedelta(days=2)
        )
        db.add_all([m1, m2, m3])

        print("Creating initial notifications...")
        db.add(Notification(
            title="CRITICAL MAINTENANCE: AC Water Leakage",
            message="Room 302 has been automatically placed into Maintenance status due to critical AC water leakage.",
            notification_type=NotificationType.CRITICAL_ALERT,
            target_role="maintenance_staff",
            reference_id=str(created_rooms["302"].id)
        ))
        db.add(Notification(
            title="Low Stock Alert: Mozzarella Cheese",
            message="Inventory item 'Mozzarella Cheese' has fallen to 5.0 kg (Threshold: 10.0 kg).",
            notification_type=NotificationType.LOW_STOCK,
            target_role="inventory_manager",
            reference_id=str(created_inv["Mozzarella Cheese"].id)
        ))
        db.add(Notification(
            title="Low Stock Alert: White Rum",
            message="Inventory item 'White Rum' has fallen to 3.0 bottles (Threshold: 5.0 bottles).",
            notification_type=NotificationType.LOW_STOCK,
            target_role="inventory_manager",
            reference_id=str(created_inv["White Rum"].id)
        ))
        db.add(Notification(
            title="New Restaurant Order #ORD-REST-2026-102",
            message="New Dine-in order for Table T-04 (₹903.00).",
            notification_type=NotificationType.ORDER_NEW,
            target_role="restaurant_staff"
        ))

        print("Creating initial audit log entries...")
        db.add(AuditLog(
            user_id=created_users["admin"].id,
            action="SYSTEM_INIT",
            entity_type="System",
            entity_id="1",
            details="StaySync Hospitality system initialized with demo data."
        ))
        db.add(AuditLog(
            user_id=created_users["receptionist"].id,
            action="CHECK_IN",
            entity_type="Stay",
            entity_id=str(stay1.id),
            details="Guest Priya Sharma checked in to Room 203."
        ))

        db.commit()
        print("[SUCCESS] Database successfully seeded with all required demonstration records!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
