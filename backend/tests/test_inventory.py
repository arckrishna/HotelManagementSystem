from fastapi import status

def test_inventory_stock_receipt(client, inventory_headers):
    # Restock Basmati Rice (item 1) by +50 kg
    res = client.post("/api/inventory/1/adjust", json={
        "movement_type": "purchase_receipt",
        "quantity_delta": "50.00",
        "reason": "Supplier shipment received invoice #PO-9021"
    }, headers=inventory_headers)
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert float(data["quantity_delta"]) == 50.00
    assert float(data["after_quantity"]) == float(data["before_quantity"]) + 50.00

def test_prevent_negative_inventory(client, inventory_headers):
    # Try to reduce stock by 999999 kg
    res = client.post("/api/inventory/1/adjust", json={
        "movement_type": "manual_adjustment",
        "quantity_delta": "-999999.00",
        "reason": "Invalid reduction"
    }, headers=inventory_headers)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "below 0" in res.json()["detail"].lower()

def test_low_stock_alert_flag(client, inventory_headers):
    # Mozzarella cheese (id=5) has current stock 5.0 and threshold 10.0 -> is_low_stock is True
    res = client.get("/api/inventory?low_stock_only=true", headers=inventory_headers)
    assert res.status_code == status.HTTP_200_OK
    items = res.json()
    assert any(i["name"] == "Mozzarella Cheese" for i in items)
    assert all(i["is_low_stock"] is True for i in items)
