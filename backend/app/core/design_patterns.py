"""
StaySync Design Patterns Implementation Module
Demonstrates GoF Software Design Patterns within the StaySync Hospitality Architecture:
1. Singleton Pattern -> Database Connection & Session Manager
2. Factory Method Pattern -> Payment Processor Factory (Cash, Card, UPI)
3. Composite Pattern -> Hierarchical Billing Folio Components
4. Bridge Pattern -> Decoupled Notification & Messaging System
"""
from abc import ABC, abstractmethod
from decimal import Decimal
from typing import List, Dict, Any, Optional
import threading
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings


# ==============================================================================
# 1. SINGLETON PATTERN: Centralized Database Connection Manager
# ==============================================================================
class DatabaseManager:
    """
    Singleton Pattern ensures that only one instance of the DatabaseManager
    is created throughout the application lifecycle, managing a single shared
    connection pool and engine instance.
    """
    _instance: Optional["DatabaseManager"] = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(DatabaseManager, cls).__new__(cls)
                    cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        is_sqlite = settings.DATABASE_URL.startswith("sqlite")
        connect_args = {"check_same_thread": False} if is_sqlite else {}
        engine_kwargs = {"future": True}
        if not is_sqlite:
            engine_kwargs.update({"pool_pre_ping": True, "pool_size": 10, "max_overflow": 20})

        self.engine = create_engine(
            settings.DATABASE_URL,
            connect_args=connect_args,
            **engine_kwargs
        )
        self.session_factory = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine,
            future=True
        )
        self.initialized = True

    def get_session(self) -> Session:
        return self.session_factory()


# ==============================================================================
# 2. FACTORY METHOD PATTERN: Extensible Payment Processing
# ==============================================================================
class PaymentProcessor(ABC):
    """Abstract Product interface for all payment processors."""
    @abstractmethod
    def process_transaction(self, bill_id: int, amount: Decimal, meta: Dict[str, Any]) -> Dict[str, Any]:
        pass

class CashPaymentProcessor(PaymentProcessor):
    """Concrete Product for Cash transactions."""
    def process_transaction(self, bill_id: int, amount: Decimal, meta: Dict[str, Any]) -> Dict[str, Any]:
        tendered = meta.get("cash_tendered", amount)
        change_returned = max(Decimal("0.00"), tendered - amount)
        return {
            "status": "APPROVED",
            "method": "cash",
            "bill_id": bill_id,
            "amount": amount,
            "cash_tendered": tendered,
            "change_due": change_returned,
            "verification": "CASH_DRAWER_VERIFIED"
        }

class CardPaymentProcessor(PaymentProcessor):
    """Concrete Product for Credit/Debit Card transactions."""
    def process_transaction(self, bill_id: int, amount: Decimal, meta: Dict[str, Any]) -> Dict[str, Any]:
        last4 = meta.get("card_last_4", "0000")
        auth_code = meta.get("auth_code", "AUTH-99214")
        return {
            "status": "APPROVED",
            "method": "card",
            "bill_id": bill_id,
            "amount": amount,
            "masked_card": f"****-****-****-{last4}",
            "authorization_code": auth_code
        }

class UPIPaymentProcessor(PaymentProcessor):
    """Concrete Product for UPI QR / Virtual Payment Address transactions."""
    def process_transaction(self, bill_id: int, amount: Decimal, meta: Dict[str, Any]) -> Dict[str, Any]:
        vpa = meta.get("vpa", "guest@okaxis")
        utr_ref = meta.get("utr_number", "UTR-8392104")
        return {
            "status": "APPROVED",
            "method": "upi",
            "bill_id": bill_id,
            "amount": amount,
            "upi_id": vpa,
            "bank_utr": utr_ref
        }

class PaymentProcessorFactory:
    """
    Factory Method Pattern creator that encapsulates instantiation logic.
    New payment channels (e.g., Crypto, Wire) can be added without modifying existing client callers.
    """
    _registry = {
        "cash": CashPaymentProcessor,
        "card": CardPaymentProcessor,
        "upi": UPIPaymentProcessor
    }

    @classmethod
    def get_processor(cls, payment_method: str) -> PaymentProcessor:
        normalized_method = payment_method.strip().lower()
        processor_cls = cls._registry.get(normalized_method)
        if not processor_cls:
            raise ValueError(f"Unsupported payment method: '{payment_method}'. Valid: {list(cls._registry.keys())}")
        return processor_cls()


# ==============================================================================
# 3. COMPOSITE PATTERN: Hierarchical Hotel Billing Folio Items
# ==============================================================================
class BillComponent(ABC):
    """
    The Component base class declares common operations for both simple (leaf)
    and complex (composite) bill folio items.
    """
    @abstractmethod
    def get_title(self) -> str:
        pass

    @abstractmethod
    def get_total_price(self) -> Decimal:
        pass

    @abstractmethod
    def render_breakdown(self, indent: int = 0) -> str:
        pass

class LineItem(BillComponent):
    """
    Leaf class representing individual individual items (e.g. room night, food item).
    A Leaf has no children.
    """
    def __init__(self, title: str, unit_price: Decimal, quantity: int = 1):
        self.title = title
        self.unit_price = unit_price
        self.quantity = quantity

    def get_title(self) -> str:
        return self.title

    def get_total_price(self) -> Decimal:
        return self.unit_price * Decimal(self.quantity)

    def render_breakdown(self, indent: int = 0) -> str:
        prefix = "  " * indent
        total = self.get_total_price()
        return f"{prefix}• {self.title} (x{self.quantity} @ ₹{self.unit_price}) = ₹{total:.2f}\n"

class CompositeBillPackage(BillComponent):
    """
    Composite class representing bundled services or master folio containing sub-items.
    Can contain both LineItems and nested CompositeBillPackages.
    """
    def __init__(self, package_name: str, tax_rate_percent: Decimal = Decimal("0.00")):
        self.package_name = package_name
        self.tax_rate_percent = tax_rate_percent
        self._children: List[BillComponent] = []

    def add(self, component: BillComponent) -> None:
        self._children.append(component)

    def remove(self, component: BillComponent) -> None:
        self._children.remove(component)

    def get_title(self) -> str:
        return self.package_name

    def get_subtotal(self) -> Decimal:
        return sum((child.get_total_price() for child in self._children), Decimal("0.00"))

    def get_total_price(self) -> Decimal:
        subtotal = self.get_subtotal()
        tax = (subtotal * self.tax_rate_percent) / Decimal("100.00")
        return subtotal + tax

    def render_breakdown(self, indent: int = 0) -> str:
        prefix = "  " * indent
        output = f"{prefix}[Package: {self.package_name}]\n"
        for child in self._children:
            output += child.render_breakdown(indent + 1)
        subtotal = self.get_subtotal()
        total = self.get_total_price()
        output += f"{prefix}  Subtotal: ₹{subtotal:.2f} | Tax ({self.tax_rate_percent}%): ₹{total - subtotal:.2f} | Final: ₹{total:.2f}\n"
        return output


# ==============================================================================
# 4. BRIDGE PATTERN: Decoupling Notification Abstraction from Sender Gateway
# ==============================================================================
class MessageSenderImplementation(ABC):
    """Implementor interface defining low-level delivery protocols."""
    @abstractmethod
    def deliver(self, recipient: str, message_payload: str) -> bool:
        pass

class EmailSender(MessageSenderImplementation):
    """Concrete Implementor for SMTP / Resend Email."""
    def deliver(self, recipient: str, message_payload: str) -> bool:
        # Simulated delivery protocol
        return True

class SMSSender(MessageSenderImplementation):
    """Concrete Implementor for Twilio / SMS Gateway."""
    def deliver(self, recipient: str, message_payload: str) -> bool:
        return True

class WhatsAppSender(MessageSenderImplementation):
    """Concrete Implementor for WhatsApp Business Cloud API."""
    def deliver(self, recipient: str, message_payload: str) -> bool:
        return True

class Notification(ABC):
    """
    The Abstraction defines high-level domain operations.
    Maintains a reference to an object of the MessageSenderImplementation hierarchy (the Bridge).
    """
    def __init__(self, sender: MessageSenderImplementation):
        self.sender = sender

    @abstractmethod
    def notify(self, recipient: str) -> Dict[str, Any]:
        pass

class BookingConfirmationNotification(Notification):
    """Refined Abstraction for Room Reservations."""
    def __init__(self, sender: MessageSenderImplementation, reservation_code: str, guest_name: str, room_num: str):
        super().__init__(sender)
        self.reservation_code = reservation_code
        self.guest_name = guest_name
        self.room_num = room_num

    def notify(self, recipient: str) -> Dict[str, Any]:
        message = (
            f"Dear {self.guest_name}, your reservation {self.reservation_code} "
            f"for Room {self.room_num} at StaySync Grand Resort is confirmed."
        )
        success = self.sender.deliver(recipient, message)
        return {
            "delivered": success,
            "recipient": recipient,
            "channel": self.sender.__class__.__name__,
            "message": message
        }

class PaymentReceiptNotification(Notification):
    """Refined Abstraction for Settlement Receipts."""
    def __init__(self, sender: MessageSenderImplementation, receipt_number: str, amount: Decimal):
        super().__init__(sender)
        self.receipt_number = receipt_number
        self.amount = amount

    def notify(self, recipient: str) -> Dict[str, Any]:
        message = f"Payment Receipt #{self.receipt_number}: ₹{self.amount:.2f} received. Thank you for staying with us!"
        success = self.sender.deliver(recipient, message)
        return {
            "delivered": success,
            "recipient": recipient,
            "channel": self.sender.__class__.__name__,
            "message": message
        }
