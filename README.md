# StaySync — Integrated Hospitality Management System

**StaySync** is an enterprise-grade Integrated Hospitality ERP platform engineered to streamline all daily hotel operations into a unified platform. It bridges front-desk operations, room reservations, restaurant and bar POS, centralized inventory, maintenance ticketing, billing/folios, and employee management.

---

## 🌟 System Architecture & Modules

### 1. User Roles & RBAC Authentication
* **8 Role Profiles**: System Administrator / GM, Front Desk Receptionist, Restaurant Staff, Bar & Lounge Staff, Maintenance Technician, Inventory Manager, Accountant, and Hotel Guest.
* Secure Argon2 password hashing and JWT Bearer token authentication.
* Quick 1-click evaluator login buttons for immediate demonstration across all 8 roles.

### 2. Executive Dashboard
* Real-time metrics: Total rooms, available rooms, occupied rooms, reserved rooms, rooms in cleaning/maintenance.
* Today's scheduled arrivals and departures.
* Interactive graphical analytics: Room category distribution, occupancy rate, and revenue split by department.
* Live critical maintenance and low-stock alert counters.

### 3. Guest Management
* Complete guest directory with contact info, government ID proof, and address details.
* VIP tagging and personalized guest preferences.
* Full reservation and billing history per guest profile.

### 4. Room Management & Visual Grid
* Categorized suites: Standard Single, Superior Double, Deluxe Room, Executive Suite, and Presidential Penthouse.
* Visual interactive room grid grouped by floors (Floors 1–4).
* Dynamic status machine: `Available` $\rightarrow$ `Reserved` $\rightarrow$ `Occupied` $\rightarrow$ `Cleaning` $\rightarrow$ `Under Maintenance`.
* Concurrency-controlled check-ins (`with_for_update`) to prevent duplicate allocations.

### 5. Reservation & Stay Management
* Live date-range room availability checker preventing overlapping bookings.
* Automated nightly rate and total charges estimation.
* Complete front-desk check-in and checkout workflow.
* Automatic transition of checked-out rooms to `Cleaning` status before returning to `Available`.

### 6. Restaurant & Bar Management (POS)
* Digital menu catalog with real-time stock availability toggling.
* Multi-mode ordering: In-Restaurant Table Dining, Room Service Delivery, and Takeaway.
* Order lifecycle progression: `New` $\rightarrow$ `Confirmed` $\rightarrow$ `Preparing` $\rightarrow$ `Ready` $\rightarrow$ `Served`.
* Room billing: Room service orders automatically post to the guest's active room folio.

### 7. Centralized Inventory & Recipe Consumption
* Automatic ingredient deduction upon food/beverage order preparation.
* Minimum threshold tracking with automated in-app alerts to inventory managers.
* Complete stock movement audit log (Restock, Consumption, Spoilage, Manual Adjustments).

### 8. Maintenance & Housekeeping Management
* Ticket creation for room repairs, housekeeping requests, and facility equipment.
* Priority classification (`Low`, `Medium`, `High`, `Critical`).
* Critical maintenance locks affected rooms out of the reservation pool.
* Technician assignment and resolution history tracking.

### 9. Consolidated Billing, Folios & Payments
* Unified guest folio combining room tariff, restaurant tabs, bar tabs, and 10% hospitality GST.
* Payment settlement supporting Cash, Credit/Debit Card, and UPI.
* Detailed itemized Tax Invoices with one-click print/PDF generation.

### 10. Staff & Role Administration
* Employee directory with departmental role assignment and credential management.
* Safe account deactivation and password reset.

### 11. Analytics & Reports
* Departmental revenue breakdown (Rooms, Restaurant, Bar).
* Room availability and occupancy breakdown by suite.
* Instant CSV export for Rooms, Billing & Revenue, and Inventory.

### 12. Guest Self-Service Portal
* Digital concierge for checked-in guests.
* In-room dining mobile ordering with room folio charging.
* Housekeeping, extra amenities, and luggage assistance requests.
* Star rating and guest stay reviews.

---

## 🚀 Getting Started

### Prerequisites
* **Python**: 3.11+
* **Node.js**: 18+ (Node 24 recommended)
* **PostgreSQL**: 14+

---

### Backend Setup

1. Open a terminal and navigate to `backend`:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Linux / macOS:
   source venv/bin/activate
   ```

3. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure database settings:
   Ensure your PostgreSQL service is running and update `app/core/config.py` or export `DATABASE_URL`:
   ```bash
   # Windows PowerShell
   $env:DATABASE_URL="postgresql+psycopg://postgres:password@localhost:5432/staysync_db"
   ```

5. Seed demo data (Populates all 8 roles, 16 rooms, menus, inventory, active stays, and sample bills):
   ```bash
   python app/seed.py
   ```

6. Launch the FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   * Interactive API Swagger Docs: `http://localhost:8000/api/docs`

---

### Frontend Setup

1. Open a new terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Launch the development server:
   ```bash
   npm run dev
   ```
   * Access the UI at: `http://localhost:5173`

---

## 🔑 Default Demonstration Credentials

For quick evaluation, you can use the **1-click Quick Login buttons** on the login page or log in with the following credentials:

| Role | Email / Username | Password |
| :--- | :--- | :--- |
| **System Administrator / GM** | `admin@staysync.com` | `Admin@123` |
| **Front Desk Receptionist** | `receptionist@staysync.com` | `Staff@123` |
| **Restaurant Staff** | `restaurant@staysync.com` | `Staff@123` |
| **Bar & Lounge Staff** | `bar@staysync.com` | `Staff@123` |
| **Maintenance Technician** | `maintenance@staysync.com` | `Staff@123` |
| **Inventory Manager** | `inventory@staysync.com` | `Staff@123` |
| **Finance / Accountant** | `accountant@staysync.com` | `Staff@123` |
| **Hotel Guest** | `guest1@staysync.com` | `Guest@123` |
