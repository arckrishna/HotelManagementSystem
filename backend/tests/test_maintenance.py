from fastapi import status

def test_critical_maintenance_locks_room(client, receptionist_headers):
    # Report critical electrical issue in Room 102 (id=2)
    res = client.post("/api/maintenance", json={
        "room_id": 2,
        "location_description": "Room 102 - Main Breaker",
        "title": "Electrical Short Circuit & Sparking",
        "description": "Main circuit breaker tripped with visible sparks in the wall conduit.",
        "priority": "critical"
    }, headers=receptionist_headers)
    assert res.status_code == status.HTTP_201_CREATED
    maint_id = res.json()["id"]

    # Verify Room 102 is now locked in MAINTENANCE status (BR-02, BR-11, NFR-S03)
    res_room = client.get("/api/rooms", headers=receptionist_headers)
    r102 = next((r for r in res_room.json() if r["room_number"] == "102"), None)
    assert r102 is not None
    assert r102["status"] == "maintenance"

def test_critical_maintenance_sorted_to_top(client, maintenance_headers):
    # BR-03: Critical and High items must appear first
    res = client.get("/api/maintenance", headers=maintenance_headers)
    assert res.status_code == status.HTTP_200_OK
    items = res.json()
    assert len(items) >= 2
    assert items[0]["priority"] == "critical"
