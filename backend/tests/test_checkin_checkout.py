from datetime import date, timedelta
from fastapi import status

def test_full_checkin_checkout_lifecycle(client, receptionist_headers):
    today = date.today()

    # Step 1: Create a fresh reservation on Room 201 (id=5)
    res_booking = client.post("/api/reservations", json={
        "guest_id": 2,
        "room_id": 5, # Room 201
        "check_in_date": str(today),
        "check_out_date": str(today + timedelta(days=2)),
        "num_guests": 2,
        "special_requests": "Ground floor if possible"
    }, headers=receptionist_headers)
    assert res_booking.status_code == status.HTTP_201_CREATED
    reservation_id = res_booking.json()["id"]

    # Step 2: Check in
    res_in = client.post("/api/stays/check-in", json={
        "reservation_id": reservation_id,
        "initial_room_condition_notes": "Room condition verified spotless."
    }, headers=receptionist_headers)
    assert res_in.status_code == status.HTTP_201_CREATED
    stay_data = res_in.json()
    assert stay_data["status"] == "active"
    stay_id = stay_data["id"]

    # Step 3: Verify room 201 is now OCCUPIED
    res_room = client.get("/api/rooms", headers=receptionist_headers)
    r201 = next((r for r in res_room.json() if r["room_number"] == "201"), None)
    assert r201 is not None
    assert r201["status"] == "occupied"

    # Step 4: Duplicate check-in is rejected
    res_dup = client.post("/api/stays/check-in", json={
        "reservation_id": reservation_id
    }, headers=receptionist_headers)
    assert res_dup.status_code == status.HTTP_400_BAD_REQUEST

    # Step 5: Check out
    res_out = client.post(f"/api/stays/{stay_id}/check-out", json={
        "checkout_notes": "Checked out, keycard deposited."
    }, headers=receptionist_headers)
    assert res_out.status_code == status.HTTP_200_OK
    bill_data = res_out.json()
    assert bill_data["status"] in ["finalized", "paid"]
    assert float(bill_data["room_charges"]) > 0
    assert float(bill_data["total_amount"]) > 0

    # Step 6: BR-02 - Room 201 transitions to CLEANING, not available immediately
    res_room_after = client.get("/api/rooms", headers=receptionist_headers)
    r201_after = next((r for r in res_room_after.json() if r["room_number"] == "201"), None)
    assert r201_after is not None
    assert r201_after["status"] == "cleaning"

    # Step 7: Clean room to restore to available
    client.put(f"/api/rooms/{r201_after['id']}", json={"status": "available"}, headers=receptionist_headers)
