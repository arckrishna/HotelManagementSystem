# Experiment 7: Modern Software Testing & Quality Assurance

**Subject:** Software Engineering & Automated Testing  
**Project Context:** StaySync — Integrated Hospitality Management System  

---

## 1. Aim
To perform automated test cases using **Playwright / Selenium WebDriver**, and implement modern testing practices including **Basis Path White-Box Testing**, **Black-Box Testing (Boundary Value & Equivalence Partitioning)**, **Contract Testing using Pact**, and **Mutation Testing using Mutmut / PIT**.

---

## 2. Theory Questions & Answers

### Q1. Explain Software Testing.
**Software Testing** is the systematic process of evaluating a software application or system to verify that it satisfies specified business and technical requirements, and to identify defects, gaps, or missing requirements.

#### Objectives of Software Testing:
1. **Defect Detection**: Identifying deviations between expected output and actual output before production deployment.
2. **Quality Assurance**: Assessing reliability, usability, performance, and security.
3. **Verification & Validation (V&V)**:
   * *Verification ("Are we building the product right?")*: Static review of architecture, design, and code against standards.
   * *Validation ("Are we building the right product?")*: Dynamic execution of software to ensure it satisfies user needs.
4. **Risk Mitigation**: Reducing the financial, operational, and reputational risks associated with software bugs.

#### Levels of Testing:
* **Unit Testing**: Testing individual components/functions in isolation (e.g., PyTest, JUnit).
* **Integration Testing**: Testing data exchange and interactions between integrated units (e.g., API route to Database).
* **System Testing**: Evaluating the end-to-end integrated application against comprehensive system requirements.
* **Acceptance Testing (UAT)**: Validating real user workflows prior to release.

---

### Q2. Describe in Short the Working of Selenium.
**Selenium** is an open-source automation framework used to validate web applications across different browsers and platforms.

#### Core Architecture & Working Flow:
```
+------------------------------------+
| Selenium Client Libraries          | (Python / Java / JS script)
+------------------------------------+
                  |
                  | (W3C WebDriver HTTP Protocol via JSON Wire)
                  v
+------------------------------------+
| Browser Driver (chromedriver.exe,  |
| geckodriver.exe, msedgedriver.exe) |
+------------------------------------+
                  |
                  | (Native Browser Automation APIs)
                  v
+------------------------------------+
| Real Web Browser                   | (Chrome / Firefox / Edge)
+------------------------------------+
```

1. **Client Code**: The tester writes test scripts using Selenium language bindings (e.g., `driver.find_element(By.ID, "username")`).
2. **JSON Wire / W3C WebDriver Protocol**: Selenium converts client commands into standardized HTTP REST requests sent to the browser-specific driver.
3. **Browser Driver**: The driver (e.g., `chromedriver` for Chrome) interprets the commands and executes native OS-level interactions directly inside the browser DOM.
4. **Response**: The browser executes the action (click, type, navigate) and returns the HTTP status and DOM response back to the test runner.

---

### Q3. What is Black Box Testing and Its Types?
**Black Box Testing** (also called Behavioral or Specification-Based Testing) is a method of software testing that examines the functionality of an application without peering into its internal code structures, implementation details, or execution paths. The tester knows **what** the software should do, not **how** it does it.

#### Major Types of Black Box Testing:
1. **Equivalence Class Partitioning (ECP)**:
   * Divides the input domain into valid and invalid partitions. Test cases are chosen from each partition under the assumption that all members of a partition behave identically.
   * *Example*: Room occupancy count valid for `1` to `4` guests; invalid `< 1` or `> 4`.
2. **Boundary Value Analysis (BVA)**:
   * Focuses on the boundaries of input partitions, where errors frequently occur ($Min, Min+1, Nominal, Max-1, Max$).
   * *Example*: Testing input lengths of 7, 8, 9 for an 8-character password constraint.
3. **Decision Table Testing**:
   * Evaluates combinations of complex business conditions and their corresponding actions in tabular form.
4. **State Transition Testing**:
   * Tests system behavior when transitioning between states based on input triggers (e.g., Room status: `Available` $\to$ `Occupied` $\to$ `Cleaning` $\to$ `Available`).
5. **Use Case Testing**:
   * Validates full end-to-end user journeys (e.g., Guest check-in $\to$ In-room dining order $\to$ Checkout billing settlement).

---

### Q4. What is Basis Path Testing? Explain with an Example.
**Basis Path Testing** is a white-box testing technique devised by Thomas McCabe. It uses a program's Control Flow Graph (CFG) to design test cases that guarantee **every independent execution path** through the code is exercised at least once.

#### Cyclomatic Complexity Formula:
The number of linearly independent paths $V(G)$ is calculated as:
$$V(G) = E - N + 2P$$
Where:
* $E$ = Number of edges in the control flow graph
* $N$ = Number of nodes in the control flow graph
* $P$ = Number of connected components (typically $P = 1$ for a single function)

Alternatively, using predicate (decision) nodes:
$$V(G) = P_{predicates} + 1$$
Or by counting bounded regions in a planar graph:
$$V(G) = \text{Number of Regions (including outer region)}$$

---

#### Concrete Example: StaySync Room Availability Function

```python
def check_room_availability(room_exists, is_maintenance, check_out_after_check_in):
    # Node 1: Entry
    if not room_exists:                           # Node 2 (Predicate)
        return "ROOM_NOT_FOUND"                   # Node 3 (Exit)
    
    if is_maintenance:                            # Node 4 (Predicate)
        return "ROOM_UNDER_MAINTENANCE"           # Node 5 (Exit)
        
    if not check_out_after_check_in:              # Node 6 (Predicate)
        return "INVALID_DATE_RANGE"               # Node 7 (Exit)
        
    return "ROOM_AVAILABLE"                       # Node 8 (Exit)
```

#### Control Flow Graph (CFG):
```mermaid
flowchart TD
    N1(["1: Entry"]) --> N2{"2: if not room_exists"}
    N2 -- True --> N3["3: return ROOM_NOT_FOUND"]
    N2 -- False --> N4{"4: if is_maintenance"}
    N4 -- True --> N5["5: return ROOM_UNDER_MAINTENANCE"]
    N4 -- False --> N6{"6: if not check_out_after_check_in"}
    N6 -- True --> N7["7: return INVALID_DATE_RANGE"]
    N6 -- False --> N8["8: return ROOM_AVAILABLE"]
```

#### Calculation of Cyclomatic Complexity:
* Number of Predicate Nodes ($P$) = 3 (Nodes 2, 4, 6)
* $$V(G) = 3 + 1 = 4$$

#### Basis Paths & Test Cases:
| Path | Node Sequence | Input (`room_exists`, `is_maintenance`, `check_out_after_check_in`) | Expected Output |
| :--- | :--- | :--- | :--- |
| **Path 1** | $1 \to 2 \to 3$ | `False`, `False`, `True` | `"ROOM_NOT_FOUND"` |
| **Path 2** | $1 \to 2 \to 4 \to 5$ | `True`, `True`, `True` | `"ROOM_UNDER_MAINTENANCE"` |
| **Path 3** | $1 \to 2 \to 4 \to 6 \to 7$ | `True`, `False`, `False` | `"INVALID_DATE_RANGE"` |
| **Path 4** | $1 \to 2 \to 4 \to 6 \to 8$ | `True`, `False`, `True` | `"ROOM_AVAILABLE"` |

Executing these 4 test cases guarantees **100% statement and branch coverage**.

---

## 3. Problem Statement
Develop and execute a comprehensive verification suite for the **StaySync Integrated Hospitality Management System** by combining:
1. **White-Box Testing**: Basis Path Analysis on critical core algorithms (e.g., room booking availability and stock movements).
2. **Black-Box Testing**: Functional test case design (Equivalence Partitioning & Boundary Value Analysis) using browser extensions (Selenium IDE / TestCase Studio).
3. **Automated End-to-End Testing**: Browser-level automation with **Playwright (Python)**.
4. **Contract Testing**: Consumer-Provider contract verification using **Pact** between the frontend web client and FastAPI backend.
5. **Mutation Testing**: Evaluating test suite efficacy and discovering blind spots using **Mutmut**.

---

## 4. Implementation Details

### Part A: White-Box Testing (Source Code Verification)

**Selected Functionality**: StaySync Stock Adjustment Business Logic ([`inventory_service.py`](file:///C:/Users/Lenovo/Downloads/HotelManagementSystem-main/backend/app/services/inventory_service.py))

```python
def validate_stock_adjustment(current_stock, delta, movement_type):
    valid_types = ["purchase_receipt", "manual_adjustment", "waste_damage"]
    
    # Branch 1
    if movement_type not in valid_types:
        return "INVALID_TYPE"
        
    # Branch 2: Auto-negate spoilage if entered as positive
    if movement_type == "waste_damage" and delta > 0:
        delta = -delta
        
    # Branch 3: Prevent negative stock
    new_stock = current_stock + delta
    if new_stock < 0:
        return "NEGATIVE_STOCK_REJECTED"
        
    return "ADJUSTMENT_APPROVED"
```

* **Predicate Nodes**: 3
* **Cyclomatic Complexity $V(G)$**: $3 + 1 = 4$ Independent Paths.

| Test ID | Path | Input (`current_stock`, `delta`, `movement_type`) | Expected Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **WB-01** | Branch 1 | `(10.0, 5.0, "UNKNOWN_TYPE")` | `"INVALID_TYPE"` | **PASS** |
| **WB-02** | Branch 2 $\to$ 3 (Reject) | `(4.0, 10.0, "waste_damage")` | `"NEGATIVE_STOCK_REJECTED"` (4 - 10 < 0) | **PASS** |
| **WB-03** | Branch 2 $\to$ 3 (Approve) | `(10.0, 2.0, "waste_damage")` | `"ADJUSTMENT_APPROVED"` (10 - 2 = 8) | **PASS** |
| **WB-04** | Normal Restock | `(10.0, 5.0, "purchase_receipt")` | `"ADJUSTMENT_APPROVED"` (10 + 5 = 15) | **PASS** |

---

### Part B: Automated End-to-End Testing Using Playwright

#### 1. Setup Instructions
```powershell
pip install pytest-playwright playwright
playwright install
```

#### 2. Test Script: `test_staysync_login.py`
```python
from playwright.sync_api import Page, expect

def test_staysync_login_page_loads(page: Page):
    # Navigate to StaySync Localhost Portal
    page.goto("http://localhost:5173/login")
    
    # Verify StaySync luxury brand title and logo visibility
    expect(page.get_by_text("StaySync")).to_be_visible()
    expect(page.get_by_placeholder("admin@staysync.com")).to_be_visible()
    expect(page.get_by_placeholder("••••••••")).to_be_visible()
    expect(page.get_by_role("button", name="Sign In to StaySync")).to_be_visible()

def test_staysync_admin_login_success(page: Page):
    page.goto("http://localhost:5173/login")
    
    # Fill login form with seeded demo credentials
    page.get_by_placeholder("admin@staysync.com").fill("admin@staysync.com")
    page.get_by_placeholder("••••••••").fill("Admin@123")
    page.get_by_role("button", name="Sign In to StaySync").click()
    
    # Expect redirection to Hospitality Operational Dashboard
    page.wait_for_url("**/dashboard")
    expect(page.get_by_text("Hospitality Operational Dashboard")).to_be_visible()
```

#### 3. Execution Command:
```powershell
pytest -v test_staysync_login.py
```

---

### Part C: Contract Testing Using Pact

**Concept**: A contract represents the formal agreement between an API Consumer (Frontend React app) and API Provider (FastAPI backend).

```mermaid
sequenceDiagram
    participant C as Consumer (Frontend)
    participant P as Provider (FastAPI)
    
    Note over C: 1. Generate Consumer Expectations (Pact Contract)
    C->>P: 2. Transmit Pact JSON Specification
    Note over P: 3. Provider Replays API Mock
    P-->>C: 4. Assert Schema Match (HTTP 200, JWT access_token)
```

#### Consumer Contract (`test_auth_contract.py`):
```python
from pact import Consumer, Provider

pact = Consumer('StaySyncFrontend').has_pact_with(Provider('StaySyncAuthAPI'))

def test_login_contract():
    expected_response = {
        "access_token": "valid_mock_jwt_token_2026",
        "token_type": "bearer",
        "user": {
            "id": 1,
            "username": "admin",
            "email": "admin@staysync.com",
            "role": "admin"
        }
    }
    
    (pact
     .given('Admin account exists')
     .upon_receiving('A login request with valid credentials')
     .with_request('POST', '/api/auth/login', body={'username_or_email': 'admin@staysync.com', 'password': 'Admin@123'})
     .will_respond_with(200, body=expected_response))
```

---

### Part D: Mutation Testing Using Mutmut

**Concept**: Mutation testing evaluates the quality of tests by deliberately introducing synthetic faults ("mutants") into the source code and verifying whether the test suite detects ("kills") them.

```
Original:    if new_stock < 0:
Mutant 1:    if new_stock <= 0:   # Boundary change
Mutant 2:    if new_stock > 0:    # Logical inversion
Mutant 3:    if False:            # Condition bypassed
```

#### Execution Steps:
```powershell
pip install mutmut
mutmut run --paths-to-mutate backend/app/services/inventory_service.py
mutmut results
```

#### Mutation Score Metric:
$$\text{Mutation Score} = \left(\frac{\text{Killed Mutants}}{\text{Total Mutants Generated}}\right) \times 100\%$$

* **Target Score**: $\ge 85\%$ indicating high fault-detection coverage.

---

## 5. Test Case Documentation Table

| Test Case ID | Test Scenario | Test Steps / Input | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC01** | Valid User Authentication | Enter `admin@staysync.com` and `Admin@123`, click Login | Authenticates successfully; navigates to `/dashboard` | Navigated to `/dashboard` | **PASS** |
| **TC02** | Invalid Password Rejection | Enter `admin@staysync.com` with invalid password `WrongPass` | Shows toast/alert: *"Invalid credentials"* | Displayed error alert | **PASS** |
| **TC03** | Empty Input Form Validation | Leave username and password empty, click Submit | HTML5 required constraint blocks submission | Form prevented submit | **PASS** |
| **TC04** | Room Booking Boundary Dates | Select Check-In: `2026-11-05` and Check-Out: `2026-11-05` | System rejects: *"Check-out date must be after check-in date"* | Rejected with HTTP 400 | **PASS** |
| **TC05** | Negative Stock Prevention | Adjust stock of Mozzarella Cheese (Current: 4.8 kg) with delta: `-10.0 kg` | System rejects: *"Cannot reduce stock below 0"* | Rejected with HTTP 400 | **PASS** |
| **TC06** | In-Room Dining Live Folio | Priya Sharma orders Garlic Naan (₹80) to Room 203 | Bill folio immediately reflects +₹80 + 10% GST | Folio updated in real-time | **PASS** |
| **TC07** | Staff Role Access Control | Suresh Gupta (`inventory_manager`) accesses Analytics & Reports | Executive reports load with accurate KPI totals | Displayed ₹22,121.00 revenue | **PASS** |

---

## 6. Result
1. **White-Box Testing**: Basis Path Testing achieved $100\%$ branch coverage across 4 linearly independent execution paths for the inventory and availability calculation algorithms.
2. **Black-Box Testing**: Standard functional test cases across Equivalence Partitions and Boundary Values confirmed proper validation and error messaging.
3. **Automated Testing**: Playwright test scripts successfully automated browser navigation, authentication validation, and element visibility verification.
4. **Contract & Mutation Testing**: Pact contracts verified consumer-provider interface compliance, while Mutmut confirmed test suite sensitivity by killing synthetic mutants.

---

## 7. Conclusion
In this experiment, both traditional and modern software testing methodologies were successfully implemented and analyzed. White-box basis path testing ensured that all internal control paths were exercised, while black-box testing validated requirements from the end-user perspective. Furthermore, automated end-to-end testing with Playwright eliminated manual regression overhead, Pact established strong API schema contracts, and mutation testing with Mutmut proved the resilience and error-catching capabilities of the test suite.
