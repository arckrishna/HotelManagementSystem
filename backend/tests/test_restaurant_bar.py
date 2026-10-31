from fastapi import status

def test_prevent_ordering_unavailable_item(client, restaurant_headers):
    # Toggle item 1 availability to false
    client.patch("/api/restaurant/menu/1/availability?is_available=false", headers=restaurant_headers)

    res = client.post("/api/restaurant/orders", json={
        "department": "restaurant",
        "order_type": "takeaway",
        "items": [{"menu_item_id": 1, "quantity": 1}]
    }, headers=restaurant_headers)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "out of stock" in res.json()["detail"].lower()

    # Re-enable item 1
    client.patch("/api/restaurant/menu/1/availability?is_available=true", headers=restaurant_headers)

def test_server_calculates_order_total_correctly(client, restaurant_headers):
    # Order 2 items of Paneer Butter Masala (price: 380 each)
    res = client.post("/api/restaurant/orders", json={
        "department": "restaurant",
        "order_type": "takeaway",
        "items": [{"menu_item_id": 1, "quantity": 2}]
    }, headers=restaurant_headers)
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert float(data["subtotal"]) == 760.00
    assert float(data["tax_amount"]) == 38.00 # 5% tax
    assert float(data["total_amount"]) == 798.00
    assert data["status"] == "new"

def test_bar_order_lifecycle(client, bar_headers):
    # Place a cocktail order
    res = client.post("/api/bar/orders", json={
        "department": "bar",
        "order_type": "dine_in",
        "items": [{"menu_item_id": 16, "quantity": 1}] # Classic Gin & Tonic
    }, headers=bar_headers)
    assert res.status_code == status.HTTP_201_CREATED
    order_id = res.json()["id"]

    # Transition order status to preparing
    res_prep = client.put(f"/api/bar/orders/{order_id}/status", json={"status": "preparing"}, headers=bar_headers)
    assert res_prep.status_code == status.HTTP_200_OK
    assert res_prep.json()["status"] == "preparing"
    assert res_prep.json()["inventory_deducted"] is True

    # Transition to ready and completed
    res_comp = client.put(f"/api/bar/orders/{order_id}/status", json={"status": "completed"}, headers=bar_headers)
    assert res_comp.status_code == status.HTTP_200_OK
    assert res_comp.json()["status"] == "completed"
