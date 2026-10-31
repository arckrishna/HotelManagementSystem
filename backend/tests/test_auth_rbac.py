from fastapi import status

def test_login_success(client):
    res = client.post("/api/auth/login", json={
        "username_or_email": "admin@staysync.com",
        "password": "Admin@123"
    })
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "admin"
    assert data["username"] == "admin"

def test_login_invalid_password(client):
    res = client.post("/api/auth/login", json={
        "username_or_email": "admin@staysync.com",
        "password": "WrongPassword!"
    })
    assert res.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Incorrect" in res.json()["detail"]

def test_rbac_admin_endpoint_forbidden_for_receptionist(client, receptionist_headers):
    # Receptionist attempts to access user creation (Admin only)
    res = client.post("/api/users", json={
        "username": "hacker",
        "email": "hacker@staysync.com",
        "password": "Password@123",
        "full_name": "Hacker User",
        "role": "admin"
    }, headers=receptionist_headers)
    assert res.status_code == status.HTTP_403_FORBIDDEN

def test_br04_menu_price_change_forbidden_for_restaurant_staff(client, restaurant_headers):
    # BR-04: Restaurant staff cannot change menu price
    res = client.put("/api/restaurant/menu/1", json={
        "price": "999.00"
    }, headers=restaurant_headers)
    assert res.status_code == status.HTTP_403_FORBIDDEN
    assert "BR-04" in res.json()["detail"] or "prices" in res.json()["detail"].lower()

def test_br08_inventory_adjustment_forbidden_for_receptionist(client, receptionist_headers):
    # BR-08: Receptionist cannot adjust inventory
    res = client.post("/api/inventory/1/adjust", json={
        "movement_type": "purchase_receipt",
        "quantity_delta": "50.00"
    }, headers=receptionist_headers)
    assert res.status_code == status.HTTP_403_FORBIDDEN
