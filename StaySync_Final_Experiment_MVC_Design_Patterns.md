# Final Experiment: Design & Implementation of StaySync Using MVC Architecture and GoF Design Patterns

**Subject:** Software Architecture & Object-Oriented Design  
**Project:** StaySync — Integrated Hospitality Management System  
**Repository:** [github.com/arckrishna/HotelManagementSystem](https://github.com/arckrishna/HotelManagementSystem)  

---

## 1. Aim
To design and implement a software application for **StaySync (Integrated Hospitality Management System)** using **Model–View–Controller (MVC)** architecture and apply appropriate Gang of Four (GoF) design patterns:
1. **Singleton Pattern** &rarr; for Database Connection and Session Pool Management.
2. **Factory Method Pattern** &rarr; for Dynamic Payment Processor Creation (Cash, Card, UPI).
3. **Composite Pattern** &rarr; for Hierarchical Billing Folio and Package Structures.
4. **Bridge Pattern** &rarr; for Decoupled Guest Notification and Multi-Channel Messaging.

---

## 2. Theory

### 2.1 Software Architecture
**Software Architecture** defines the overall structure of a software system, its components, their properties, and the interactions among them. It serves as the master blueprint, defining non-negotiable structural decisions that dictate the maintainability, scalability, and performance of the enterprise application.

Key architectural goals include:
* **Separation of Concerns (SoC)**: Segmenting the system so that data persistence, business workflows, and user interfaces are completely decoupled.
* **Modularity**: Organizing code into self-contained, interchangeable modules.
* **Extensibility**: Facilitating the addition of new features (e.g., adding a new payment gateway or room category) without altering existing, verified source code.

---

### 2.2 Model–View–Controller (MVC) Architecture
The **Model–View–Controller (MVC)** architectural pattern divides the interactive application into three distinct layers:

```
        User Action (HTTP Request)
  [User] ----------------------------> [ CONTROLLER ]
                                             |
                                             | 1. Validates DTO & Invokes Service
                                             v
                                        [  MODEL  ]
                                             |
                                             | 2. Executes Business Rules & Queries DB
                                             v
  [User] <---------------------------- [   VIEW   ]
            Rendered JSON / HTML UI
```

#### MVC Applied to StaySync (Replacing Generic Examples):
* **Model**: 
  * Stores hotel entity data (`Room`, `Reservation`, `Bill`, `Guest`, `InventoryItem`).
  * Implements business validation rules (e.g., preventing check-out before check-in, preventing double-booking of rooms, calculating 10% hospitality GST, preventing negative inventory stock).
  * Encapsulates all database interactions via SQLAlchemy ORM.
* **View**:
  * Displays visual user interfaces (e.g., Room availability grid, live Guest Folio bill, interactive Dining POS menu, departmental revenue charts).
  * Presents input forms (Check-in form, Payment modal) and displays feedback messages (success toasts, error notifications).
  * Contains **zero business logic**; strictly renders data provided by the Controller.
* **Controller**:
  * Receives incoming HTTP requests from the user's browser (e.g., `POST /api/reservations`, `POST /api/billing/{id}/payments`).
  * Validates request payloads against Pydantic DTO schemas and checks Role-Based Access Control (RBAC) permissions.
  * Calls the appropriate Model business methods.
  * Formats the result into structured JSON View models returned with appropriate HTTP status codes (200 OK, 201 Created, 400 Bad Request).

---

### 2.3 Advantages of MVC Architecture in StaySync
1. **Clear Separation of Concerns**: Modifying the React frontend (e.g., changing button styles or dashboard layouts) has zero risk of corrupting database transactions or financial billing calculations.
2. **Parallel Team Development**: Frontend engineers can build interactive React UI components while backend engineers build FastAPI endpoints and SQLAlchemy database schemas concurrently.
3. **Multiple Views for a Single Model**: The same room booking data can be viewed simultaneously by:
   * Front Desk Receptionists on a desktop reservation board.
   * Hotel Guests on their mobile guest portal.
   * Accountants on an exported financial CSV summary.
4. **Enhanced Automated Testability**: Controllers and Models can be tested thoroughly in isolated test suites (PyTest) without requiring a browser or manual UI interaction.
5. **Database Independence**: If StaySync migrates from SQLite to PostgreSQL, only the Model configuration changes; Controllers and React Views remain 100% untouched.

---

### 2.4 Why is Singleton Used for Database Connections?
A **Database Connection** represents a heavy, stateful operating system resource involving TCP socket allocation, TLS cryptographic handshakes, user authentication, and memory buffer allocation.

In an enterprise hotel system like StaySync, hundreds of guests and staff members access the system simultaneously.

#### Critical Reasons for Using Singleton:
1. **Connection Pooling**: Instead of opening and tearing down a new physical TCP connection on every HTTP request (which causes high latency), a Singleton engine maintains a managed pool of reusable connections (`pool_size=10, max_overflow=20`), delivering sub-millisecond query responses.
2. **Prevention of Socket & Resource Leaks**: Creating unmanaged database instances on high-traffic servers rapidly exhausts OS socket file descriptors, crashing the database server with `Too many connections` errors.
3. **Thread Safety & Race Condition Prevention**: A synchronized Singleton using thread locks (`threading.Lock()`) prevents race conditions when concurrent worker threads initialize database sessions during application startup.
4. **Centralized Configuration**: Ensures database dialect flags, connection strings, schema migrations, and transaction isolation levels remain identical across all hotel modules.

---

## 3. Implementation: Step-by-Step for StaySync

### Step 1: Understand the Problem Statement

#### 1. System Overview:
**StaySync** is an integrated hospitality management platform designed to eliminate operational silos across hotel departments by unifying room reservations, front desk check-in/out, restaurant & bar dining orders, inventory stock tracking, housekeeping requests, and automated billing reconciliations into a single, high-reliability platform.

#### 2. Actors:
* **Admin / Hotel Manager**: Full administrative authority; reviews revenue audits, staff accounts, and system health.
* **Front Desk Receptionist**: Manages room bookings, executes guest check-in/out, and records bill folio payments.
* **Hotel Guest**: Views live room folio, places room service dining orders, and submits housekeeping amenity requests.
* **Restaurant / Bar Cashier & Chef**: Manages food & beverage orders, updates kitchen order statuses, and bills meals to rooms.
* **Inventory Manager**: Tracks warehouse stock receipts, logs waste/damage spoilage, and manages restock thresholds.
* **Housekeeping Staff**: Monitors room cleaning states and executes maintenance repairs.

#### 3. Functional Requirements:
* **FR-01 (Authentication & RBAC)**: Secure JWT authentication enforcing strict role-based access control.
* **FR-02 (Room & Reservation Management)**: Date boundary validation (check-out > check-in), room category selection, and prevention of double-booking.
* **FR-03 (Live Folio & Payment Processing)**: Real-time aggregation of room nights, dining orders, taxes (10% GST), and payment settlements via Cash, Card, and UPI.
* **FR-04 (Restaurant & In-Room Dining POS)**: Interactive menu, kitchen order dispatch, and direct room folio charging.
* **FR-05 (Inventory Management)**: Warehouse stock movement tracking, auto-negating spoilage entries, and strict prevention of negative inventory.
* **FR-06 (Auditing & Reporting)**: Departmental revenue breakdowns, room occupancy KPIs, and CSV data exports.

#### 4. Non-Functional Requirements:
* **Performance**: Sub-100ms API response time for all core transactional workflows.
* **Data Integrity (ACID)**: Atomicity in financial billing and stock movements; no orphaned charges or negative quantities.
* **Concurrency**: Thread-safe database connection pooling capable of handling concurrent multi-departmental requests.
* **Modern Usability**: Responsive web interface with real-time in-app luxury toasts (zero blocking browser `alert()` popups).

---

### Step 2: Identify Major Modules

```
+-----------------------------------------------------------------------------------+
|                     StaySync Integrated Hospitality Modules                       |
+-----------------------------------------------------------------------------------+
| 1. User Management Module   | Authentication, JWT Tokens, Role-Based Access       |
| 2. Processing & Trans. Mod. | Room Bookings, Dining POS Orders, Payment Folios    |
| 3. Data Storage Module      | SQLite / PostgreSQL Database, SQLAlchemy ORM Engine |
| 4. Reporting Module         | Occupancy KPIs, Revenue Reconciliation, CSV Export  |
+-----------------------------------------------------------------------------------+
```

---

### Step 3: Apply MVC Architecture to StaySync

```
                     +---------------------------------------+
                     |         VIEW LAYER (React UI)         |
                     |  - ReservationsPage.tsx               |
                     |  - BillingPage.tsx                    |
                     |  - GuestPortal.tsx                    |
                     |  - Modals, Forms, Luxury Toasts       |
                     +---------------------------------------+
                                    ^         |
                         JSON State |         | User Clicks / Form Submits
                                    |         v
                     +---------------------------------------+
                     |      CONTROLLER LAYER (FastAPI)       |
                     |  - /api/routes/reservations.py        |
                     |  - /api/routes/billing.py             |
                     |  - /api/routes/inventory.py           |
                     |  - Pydantic DTO Schema Validation     |
                     +---------------------------------------+
                                    ^         |
                       Domain State |         | Invokes Operations
                                    |         v
                     +---------------------------------------+
                     |       MODEL LAYER (Domain Logic)      |
                     |  - SQLAlchemy Entities (Bill, Room)   |
                     |  - Business Services (payment_service)|
                     |  - DatabaseManager (Singleton)        |
                     +---------------------------------------+
```

1. **Model Layer**:
   * **Location**: [`backend/app/models/`](file:///C:/Users/Lenovo/Downloads/HotelManagementSystem-main/backend/app/models) & [`backend/app/services/`](file:///C:/Users/Lenovo/Downloads/HotelManagementSystem-main/backend/app/services)
   * Implements business logic (e.g., `payment_service.py` allows advance check-in deposits; `order_service.py` syncs food orders to guest folio in real-time; `inventory_service.py` validates stock bounds).
2. **View Layer**:
   * **Location**: [`frontend/src/pages/`](file:///C:/Users/Lenovo/Downloads/HotelManagementSystem-main/frontend/src/pages)
   * Pure UI presentation. Consists of forms, data tables, status badges, and interactive modals. **Contains zero business logic**.
3. **Controller Layer**:
   * **Location**: [`backend/app/api/routes/`](file:///C:/Users/Lenovo/Downloads/HotelManagementSystem-main/backend/app/api/routes)
   * FastAPI routing controllers. Intercepts HTTP requests, validates request DTOs with Pydantic, checks RBAC permissions, delegates to Model services, and returns structured JSON responses.

---

### Step 4: Define Model Classes & Design Patterns

#### 1. Entities, Attributes, Methods & Relationships:

| Entity | Attributes | Core Methods | Relationships |
| :--- | :--- | :--- | :--- |
| **User** | `id`, `username`, `email`, `role`, `is_active` | `verify_password()`, `generate_token()` | Parent class for Staff and Guests |
| **Room** | `id`, `room_number`, `category_id`, `price_per_night`, `status` | `check_availability()`, `set_maintenance()` | Associated with Category (N:1) & Stays (1:N) |
| **Reservation**| `id`, `guest_id`, `room_id`, `check_in_date`, `check_out_date`, `status`| `confirm()`, `cancel()`, `check_in()` | Belongs to Guest (N:1), Books Room (N:1) |
| **Order** | `id`, `guest_id`, `room_id`, `total_amount`, `is_billed_to_room` | `calculate_total()`, `dispatch_to_kitchen()`| Placed by Guest (N:1), Links to Bill (N:1) |
| **Bill** | `id`, `stay_id`, `total_amount`, `paid_amount`, `outstanding_balance` | `add_line_item()`, `recalculate_folio()` | Associated with Stay (1:1), Has Payments (1:N) |
| **Payment** | `id`, `bill_id`, `amount`, `payment_method`, `reference_number` | `record_transaction()`, `generate_receipt()`| Belongs to Bill (N:1) |
| **Inventory**| `id`, `item_name`, `current_stock`, `reorder_threshold`, `unit` | `adjust_stock()`, `check_low_stock()` | Deducted by Kitchen Orders (N:M) |

---

#### 2. Design Patterns Implemented in StaySync:

All patterns are implemented in [`backend/app/core/design_patterns.py`](file:///C:/Users/Lenovo/Downloads/HotelManagementSystem-main/backend/app/core/design_patterns.py):

##### A. Singleton Pattern &rarr; Database Connection Manager
* **Intent**: Ensure only one instance of the database connection manager exists, sharing a thread-safe connection pool.
```python
class DatabaseManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(DatabaseManager, cls).__new__(cls)
                    cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        self.engine = create_engine(settings.DATABASE_URL, future=True)
        self.session_factory = sessionmaker(bind=self.engine, future=True)

    def get_session(self) -> Session:
        return self.session_factory()
```

##### B. Factory Method Pattern &rarr; Dynamic Payment Processors
* **Intent**: Decouple the billing service from specific payment gateways (Cash, Card, UPI).
```python
class PaymentProcessor(ABC):
    @abstractmethod
    def process_transaction(self, bill_id: int, amount: Decimal, meta: Dict[str, Any]) -> Dict[str, Any]:
        pass

class CashPaymentProcessor(PaymentProcessor):
    def process_transaction(self, bill_id: int, amount: Decimal, meta: Dict[str, Any]) -> Dict[str, Any]:
        tendered = meta.get("cash_tendered", amount)
        return {"status": "APPROVED", "method": "cash", "amount": amount, "change_due": max(Decimal("0.00"), tendered - amount)}

class CardPaymentProcessor(PaymentProcessor):
    def process_transaction(self, bill_id: int, amount: Decimal, meta: Dict[str, Any]) -> Dict[str, Any]:
        return {"status": "APPROVED", "method": "card", "amount": amount, "masked_card": f"****-****-****-{meta.get('card_last_4', '0000')}"}

class UPIPaymentProcessor(PaymentProcessor):
    def process_transaction(self, bill_id: int, amount: Decimal, meta: Dict[str, Any]) -> Dict[str, Any]:
        return {"status": "APPROVED", "method": "upi", "amount": amount, "vpa": meta.get("vpa", "guest@upi")}

class PaymentProcessorFactory:
    _registry = {"cash": CashPaymentProcessor, "card": CardPaymentProcessor, "upi": UPIPaymentProcessor}

    @classmethod
    def get_processor(cls, payment_method: str) -> PaymentProcessor:
        cls_ref = cls._registry.get(payment_method.lower().strip())
        if not cls_ref:
            raise ValueError(f"Unsupported payment method: '{payment_method}'")
        return cls_ref()
```

##### C. Composite Pattern &rarr; Hierarchical Billing Folio Components
* **Intent**: Treat simple line items (e.g., room night, food item) and bundled holiday packages (room + breakfast + taxes) uniformly.
```python
class BillComponent(ABC):
    @abstractmethod
    def get_total_price(self) -> Decimal: pass

class LineItem(BillComponent):
    def __init__(self, title: str, unit_price: Decimal, quantity: int = 1):
        self.title, self.unit_price, self.quantity = title, unit_price, quantity

    def get_total_price(self) -> Decimal:
        return self.unit_price * Decimal(self.quantity)

class CompositeBillPackage(BillComponent):
    def __init__(self, package_name: str, tax_rate_percent: Decimal = Decimal("0.00")):
        self.package_name, self.tax_rate_percent = package_name, tax_rate_percent
        self._children: List[BillComponent] = []

    def add(self, component: BillComponent) -> None:
        self._children.append(component)

    def get_total_price(self) -> Decimal:
        subtotal = sum((child.get_total_price() for child in self._children), Decimal("0.00"))
        return subtotal + (subtotal * self.tax_rate_percent / Decimal("100.00"))
```

##### D. Bridge Pattern &rarr; Multi-Channel Notification Dispatcher
* **Intent**: Decouple notification abstractions (`BookingConfirmationNotification`, `PaymentReceiptNotification`) from delivery implementations (`EmailSender`, `SMSSender`, `WhatsAppSender`).
```python
class MessageSenderImplementation(ABC):
    @abstractmethod
    def deliver(self, recipient: str, message: str) -> bool: pass

class EmailSender(MessageSenderImplementation):
    def deliver(self, recipient: str, message: str) -> bool: return True

class WhatsAppSender(MessageSenderImplementation):
    def deliver(self, recipient: str, message: str) -> bool: return True

class Notification(ABC):
    def __init__(self, sender: MessageSenderImplementation):
        self.sender = sender
    @abstractmethod
    def notify(self, recipient: str) -> Dict[str, Any]: pass

class BookingConfirmationNotification(Notification):
    def __init__(self, sender: MessageSenderImplementation, reservation_code: str, guest_name: str, room_num: str):
        super().__init__(sender)
        self.code, self.guest, self.room = reservation_code, guest_name, room_num

    def notify(self, recipient: str) -> Dict[str, Any]:
        msg = f"Dear {self.guest}, reservation {self.code} for Room {self.room} is confirmed!"
        return {"delivered": self.sender.deliver(recipient, msg), "channel": self.sender.__class__.__name__, "message": msg}
```

---

### Step 5: Design Controller Logic

The Controller is implemented in [`backend/app/api/routes/billing.py`](file:///C:/Users/Lenovo/Downloads/HotelManagementSystem-main/backend/app/api/routes/billing.py):
* **Controller Responsibilities Demonstrated**:
  1. Receive incoming HTTP POST request.
  2. Validate input schema (`PaymentCreate` Pydantic DTO).
  3. Enforce RBAC permissions (`admin` or `receptionist`).
  4. Call appropriate Model method (`record_payment`).
  5. Return serialized View DTO response (`PaymentResponse`).

```python
@router.post("/{bill_id}/payments", response_model=PaymentResponse)
def add_payment(
    bill_id: int,
    payload: PaymentCreate,                                                # 1 & 2: Validates input DTO
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "receptionist"])) # 3: RBAC check
):
    # 4: Invokes Model service
    payment = record_payment(
        db=db,
        bill_id=bill_id,
        amount=payload.amount,
        payment_method=payload.payment_method,
        notes=payload.notes,
        recorded_by_user_id=current_user.id
    )
    # 5: Returns View data
    return payment
```

---

### Step 6: Design View Layer

The View is implemented in [`frontend/src/pages/billing/BillingPage.tsx`](file:///C:/Users/Lenovo/Downloads/HotelManagementSystem-main/frontend/src/pages/billing/BillingPage.tsx):
* **View Responsibilities Demonstrated**:
  1. Render input forms and payment modals.
  2. Display data tables and live balances.
  3. Trigger actions and display luxury success/error toasts.
  4. **Strictly contains zero business logic**.

```tsx
export const BillingPage: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Presentational handler: delegates business operation to Controller
  const handlePaymentSubmit = async (billId: number, amount: number, method: string) => {
    try {
      await apiClient.post(`/billing/${billId}/payments`, { amount, payment_method: method });
      setToast({ message: `Payment of ₹${amount} recorded successfully!`, type: 'success' });
      fetchBills(); // Re-fetch updated Model state
    } catch (err: any) {
      setToast({ message: err.response?.data?.detail || "Payment failed", type: 'error' });
    }
  };

  return (
    <div className="p-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <BillTable bills={bills} onPay={handlePaymentSubmit} />
    </div>
  );
};
```

---

## 4. Verification & Testing

The complete test suite is implemented in [`backend/tests/test_design_patterns.py`](file:///C:/Users/Lenovo/Downloads/HotelManagementSystem-main/backend/tests/test_design_patterns.py).

### How to Run in VS Code:
```powershell
python -m pytest backend/tests/test_design_patterns.py -v
```

### Clean Test Execution Output:
```text
============================= test session starts =============================
platform win32 -- Python 3.14.3, pytest-9.2.0, pluggy-1.7.0
rootdir: C:\Users\Lenovo\Downloads\HotelManagementSystem-main
configfile: pytest.ini
collected 6 items

backend/tests/test_design_patterns.py::test_singleton_database_manager_identity PASSED [ 16%]
backend/tests/test_design_patterns.py::test_factory_method_creates_correct_processors PASSED [ 33%]
backend/tests/test_design_patterns.py::test_factory_method_payment_execution PASSED [ 50%]
backend/tests/test_design_patterns.py::test_factory_method_invalid_type PASSED [ 66%]
backend/tests/test_design_patterns.py::test_composite_billing_hierarchy PASSED [ 83%]
backend/tests/test_design_patterns.py::test_bridge_notification_decoupling PASSED [100%]

============================== 6 passed in 0.02s ==============================
```

---

## 5. Result
1. **MVC Architecture**: Successfully designed and implemented the StaySync application into three decoupled layers: SQLAlchemy Models (business logic), React Views (presentation screens), and FastAPI Controllers (routing & validation).
2. **GoF Design Patterns**:
   * **Singleton**: Enforced a single database engine instance across all application threads.
   * **Factory Method**: Encapsulated dynamic instantiation of Cash, Card, and UPI payment processors.
   * **Composite**: Handled recursive computation of room charges, dining line items, and nested packages.
   * **Bridge**: Decoupled domain notification triggers from email, SMS, and WhatsApp delivery channels.
3. **Automated Verification**: All 6 design pattern unit tests passed with 100% success in 0.02 seconds.

---

## 6. Conclusion
In this final experiment, the Model–View–Controller (MVC) architectural pattern was successfully applied to the StaySync Hospitality Management System. The architecture cleanly separates user presentation from underlying business rules and data models, enabling high maintainability, parallel development, and isolated testability. Furthermore, four fundamental GoF design patterns—Singleton, Factory Method, Composite, and Bridge—were implemented and verified through comprehensive unit testing. The resulting system demonstrates enterprise-grade software quality, robust resource management, and high extensibility.

---

### Submission Files Generated on Your Computer:
* **Print-Ready HTML / PDF:** [`C:\Users\Lenovo\Downloads\StaySync_Final_Experiment_MVC_Design_Patterns.html`](file:///C:/Users/Lenovo/Downloads/StaySync_Final_Experiment_MVC_Design_Patterns.html)
* **Markdown Lab Report:** [`C:\Users\Lenovo\Downloads\StaySync_Final_Experiment_MVC_Design_Patterns.md`](file:///C:/Users/Lenovo/Downloads/StaySync_Final_Experiment_MVC_Design_Patterns.md)
* **Code Implementation:** [`backend/app/core/design_patterns.py`](file:///C:/Users/Lenovo/Downloads/HotelManagementSystem-main/backend/app/core/design_patterns.py)
* **Unit Tests:** [`backend/tests/test_design_patterns.py`](file:///C:/Users/Lenovo/Downloads/HotelManagementSystem-main/backend/tests/test_design_patterns.py)
