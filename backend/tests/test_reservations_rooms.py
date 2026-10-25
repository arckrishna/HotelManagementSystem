from datetime import date, timedelta
from fastapi import status

def test_prevent_overlapping_reservations(client, receptionist_headers):
    # Reservation 1 exists for Room 203 from (today-1) to (today+2)
    today = date.today()
    res = client.post("/api/reservations", json={
        "guest_id": 2,
        "room_id": 7, # Room 203
        "check_in_date": str(today),
        "check_out_date": str(today + timedelta(days=3)),
        "num_guests": 2
    }, headers=receptionist_headers)
    assert res.status_code == status.HTTP_409_CONFLICT
    assert "already booked" in res.json()["detail"].lower()

def test_prevent_reservation_in_maintenance_room(client, receptionist_headers):
    # BR-02: Room 302 (id=11) is currently in MAINTENANCE status
    today = date.today()
    res = client.post("/api/reservations", json={
        "guest_id": 2,
        "room_id": 11, # Room 302
        "check_in_date": str(today + timedelta(days=10)),
        "check_out_date": str(today + timedelta(days=12)),
        "num_guests": 2
    }, headers=receptionist_headers)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "maintenance" in res.json()["detail"].lower()

def test_prevent_invalid_dates(client, receptionist_headers):
    # check_out <= check_in
    today = date.today()
    res = client.post("/api/reservations", json={
        "guest_id": 2,
        "room_id": 1, # Room 101
        "check_in_date": str(today + timedelta(days=5)),
        "check_out_date": str(today + timedelta(days=4)), # before checkin
        "num_guests": 1
    }, headers=receptionist_headers)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "after check-in" in res.json()["detail"].lower()

def test_create_valid_reservation(client, receptionist_headers, db):
    import random
    from app.models.reservation import Reservation
    today = date.today()
    offset = random.randint(100, 500)
    res = client.post("/api/reservations", json={
        "guest_id": 3,
        "room_id": 1, # Room 101
        "check_in_date": str(today + timedelta(days=offset)),
        "check_out_date": str(today + timedelta(days=offset + 3)),
        "num_guests": 1,
        "special_requests": "Quiet room"
    }, headers=receptionist_headers)
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert data["status"] == "confirmed"
    assert "RES-" in data["reservation_code"]
    assert float(data["total_estimated_amount"]) == 7500.00 # 3 nights * 2500

    # Cleanup created test reservation
    db.query(Reservation).filter(Reservation.id == data["id"]).delete()
    db.commit()
