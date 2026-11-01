"""
Experiment 7: White-Box Basis Path Testing
Tests every linearly independent path of validate_stock_adjustment algorithm.
Cyclomatic Complexity V(G) = 4
"""
import pytest
from decimal import Decimal

def validate_stock_adjustment(current_stock: Decimal, delta: Decimal, movement_type: str) -> str:
    valid_types = ["purchase_receipt", "manual_adjustment", "waste_damage"]
    
    # Path 1: Invalid type
    if movement_type not in valid_types:
        return "INVALID_TYPE"
        
    # Path 2 & 3: Auto-negate positive delta for waste_damage
    if movement_type == "waste_damage" and delta > Decimal("0.00"):
        delta = -delta
        
    # Path 4: Prevent negative stock
    new_stock = current_stock + delta
    if new_stock < Decimal("0.00"):
        return "NEGATIVE_STOCK_REJECTED"
        
    return "ADJUSTMENT_APPROVED"

# --- Basis Path Unit Tests ---

def test_path_1_invalid_movement_type():
    """Path 1: movement_type not in valid_types -> returns INVALID_TYPE"""
    result = validate_stock_adjustment(Decimal("10.0"), Decimal("5.0"), "UNKNOWN_RESTOCK")
    assert result == "INVALID_TYPE"

def test_path_2_waste_damage_negative_stock_rejection():
    """Path 2: waste_damage with delta > 0, negated to -10, current (4) - 10 < 0 -> returns NEGATIVE_STOCK_REJECTED"""
    result = validate_stock_adjustment(Decimal("4.0"), Decimal("10.0"), "waste_damage")
    assert result == "NEGATIVE_STOCK_REJECTED"

def test_path_3_waste_damage_approved():
    """Path 3: waste_damage with delta > 0, negated to -2, current (10) - 2 = 8 >= 0 -> returns ADJUSTMENT_APPROVED"""
    result = validate_stock_adjustment(Decimal("10.0"), Decimal("2.0"), "waste_damage")
    assert result == "ADJUSTMENT_APPROVED"

def test_path_4_purchase_receipt_approved():
    """Path 4: standard purchase_receipt, stock increases -> returns ADJUSTMENT_APPROVED"""
    result = validate_stock_adjustment(Decimal("10.0"), Decimal("5.0"), "purchase_receipt")
    assert result == "ADJUSTMENT_APPROVED"
