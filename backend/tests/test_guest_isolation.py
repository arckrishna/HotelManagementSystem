from fastapi import status

def test_guest_cannot_view_another_guest_profile(client, guest1_headers):
    # Guest 1 (Priya Sharma, guest_id=1) attempts to view Guest 2 (Rahul Verma, guest_id=2)
    res = client.get("/api/guests/2", headers=guest1_headers)
    assert res.status_code == status.HTTP_403_FORBIDDEN

def test_guest_cannot_view_another_guest_reservation(client, guest2_headers):
    # Guest 2 attempts to view Reservation 1 (owned by Guest 1)
    res = client.get("/api/reservations/1", headers=guest2_headers)
    assert res.status_code == status.HTTP_403_FORBIDDEN

def test_guest_cannot_view_another_guest_bill(client, guest2_headers):
    # Guest 2 attempts to view Bill 1 (owned by Guest 1)
    res = client.get("/api/bills/1", headers=guest2_headers)
    assert res.status_code == status.HTTP_403_FORBIDDEN

def test_guest_can_view_own_reservations_and_bills(client, guest1_headers):
    res_res = client.get("/api/reservations/my", headers=guest1_headers)
    assert res_res.status_code == status.HTTP_200_OK
    assert len(res_res.json()) >= 1

    res_bills = client.get("/api/bills/my", headers=guest1_headers)
    assert res_bills.status_code == status.HTTP_200_OK
    assert len(res_bills.json()) >= 1
