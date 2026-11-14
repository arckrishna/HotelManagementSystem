"""
Unit Tests for StaySync Software Architecture & GoF Design Patterns
Verifies:
1. Singleton Pattern -> Ensures identical object identity and single DB connection instance
2. Factory Method Pattern -> Dynamically instantiates correct payment processors
3. Composite Pattern -> Validates recursive total calculation for hierarchical billing components
4. Bridge Pattern -> Verifies decoupled notification abstraction and message sender implementation
"""
import pytest
from decimal import Decimal
from app.core.design_patterns import (
    DatabaseManager,
    PaymentProcessorFactory,
    CashPaymentProcessor,
    CardPaymentProcessor,
    UPIPaymentProcessor,
    LineItem,
    CompositeBillPackage,
    EmailSender,
    SMSSender,
    WhatsAppSender,
    BookingConfirmationNotification,
    PaymentReceiptNotification
)

# ------------------------------------------------------------------------------
# 1. SINGLETON PATTERN TESTS
# ------------------------------------------------------------------------------
def test_singleton_database_manager_identity():
    """Verify that multiple instantiations of DatabaseManager return the exact same instance."""
    db1 = DatabaseManager()
    db2 = DatabaseManager()
    
    assert db1 is db2, "Singleton violation: db1 and db2 are distinct memory instances!"
    assert id(db1) == id(db2)
    assert db1.engine is db2.engine, "Database engine instance must be shared!"

# ------------------------------------------------------------------------------
# 2. FACTORY METHOD PATTERN TESTS
# ------------------------------------------------------------------------------
def test_factory_method_creates_correct_processors():
    """Verify that PaymentProcessorFactory instantiates the appropriate product subclass."""
    cash_proc = PaymentProcessorFactory.get_processor("cash")
    card_proc = PaymentProcessorFactory.get_processor("card")
    upi_proc = PaymentProcessorFactory.get_processor("upi")
    
    assert isinstance(cash_proc, CashPaymentProcessor)
    assert isinstance(card_proc, CardPaymentProcessor)
    assert isinstance(upi_proc, UPIPaymentProcessor)

def test_factory_method_payment_execution():
    """Verify runtime behavior of factory-created processors."""
    cash_proc = PaymentProcessorFactory.get_processor("cash")
    res = cash_proc.process_transaction(
        bill_id=101,
        amount=Decimal("1500.00"),
        meta={"cash_tendered": Decimal("2000.00")}
    )
    assert res["status"] == "APPROVED"
    assert res["change_due"] == Decimal("500.00")
    assert res["verification"] == "CASH_DRAWER_VERIFIED"

def test_factory_method_invalid_type():
    """Verify that unsupported payment types raise a descriptive ValueError."""
    with pytest.raises(ValueError) as excinfo:
        PaymentProcessorFactory.get_processor("bitcoin")
    assert "Unsupported payment method" in str(excinfo.value)

# ------------------------------------------------------------------------------
# 3. COMPOSITE PATTERN TESTS
# ------------------------------------------------------------------------------
def test_composite_billing_hierarchy():
    """Verify recursive calculation of leaf items and composite packages with taxes."""
    # Leaf items
    room_charge = LineItem("Deluxe Ocean Suite Night", unit_price=Decimal("4500.00"), quantity=2)
    breakfast = LineItem("Gourmet Breakfast Buffet", unit_price=Decimal("450.00"), quantity=2)
    
    assert room_charge.get_total_price() == Decimal("9000.00")
    assert breakfast.get_total_price() == Decimal("900.00")
    
    # Composite Package 1: Dining & Room
    stay_package = CompositeBillPackage("Weekend Luxury Stay", tax_rate_percent=Decimal("18.00"))
    stay_package.add(room_charge)
    stay_package.add(breakfast)
    
    # Subtotal = 9000 + 900 = 9900.00
    # Tax = 18% of 9900 = 1782.00
    # Total = 11682.00
    assert stay_package.get_subtotal() == Decimal("9900.00")
    assert stay_package.get_total_price() == Decimal("11682.00")
    
    # Nested Composite: Master Hotel Folio
    airport_pickup = LineItem("Mercedes Chauffeur Airport Transfer", unit_price=Decimal("2500.00"), quantity=1)
    
    master_folio = CompositeBillPackage("Master Guest Invoice", tax_rate_percent=Decimal("0.00"))
    master_folio.add(stay_package)
    master_folio.add(airport_pickup)
    
    # Master Total = 11682.00 + 2500.00 = 14182.00
    assert master_folio.get_total_price() == Decimal("14182.00")
    
    breakdown_text = master_folio.render_breakdown()
    assert "Weekend Luxury Stay" in breakdown_text
    assert "Deluxe Ocean Suite Night" in breakdown_text

# ------------------------------------------------------------------------------
# 4. BRIDGE PATTERN TESTS
# ------------------------------------------------------------------------------
def test_bridge_notification_decoupling():
    """Verify that high-level notification abstractions work interchangeably across any sender gateway."""
    email_channel = EmailSender()
    sms_channel = SMSSender()
    whatsapp_channel = WhatsAppSender()
    
    # Test Email Bridge
    notif1 = BookingConfirmationNotification(
        sender=email_channel,
        reservation_code="RES-2026-991",
        guest_name="Aarav Verma",
        room_num="302"
    )
    res1 = notif1.notify("aarav@example.com")
    assert res1["delivered"] is True
    assert res1["channel"] == "EmailSender"
    assert "RES-2026-991" in res1["message"]
    
    # Test WhatsApp Bridge with same abstraction logic
    notif2 = BookingConfirmationNotification(
        sender=whatsapp_channel,
        reservation_code="RES-2026-991",
        guest_name="Aarav Verma",
        room_num="302"
    )
    res2 = notif2.notify("+919876543210")
    assert res2["delivered"] is True
    assert res2["channel"] == "WhatsAppSender"
    
    # Test Receipt Notification with SMS Bridge
    receipt_notif = PaymentReceiptNotification(
        sender=sms_channel,
        receipt_number="REC-8842",
        amount=Decimal("11682.00")
    )
    res3 = receipt_notif.notify("+919876543210")
    assert res3["delivered"] is True
    assert "₹11682.00" in res3["message"]
