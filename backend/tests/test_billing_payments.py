from fastapi import status

def test_record_payment_updates_balance(client, accountant_headers):
    # Check Bill 1 outstanding balance
    res_bill = client.get("/api/bills/1", headers=accountant_headers)
    assert res_bill.status_code == status.HTTP_200_OK
    initial_outstanding = float(res_bill.json()["outstanding_balance"])
    assert initial_outstanding > 0

    # Pay ₹1000 via UPI
    res_pay = client.post("/api/payments?bill_id=1", json={
        "amount": "1000.00",
        "payment_method": "upi",
        "reference_number": "UPI-REF-884920",
        "notes": "Partial settlement via Google Pay"
    }, headers=accountant_headers)
    assert res_pay.status_code == status.HTTP_201_CREATED
    assert "PAY-" in res_pay.json()["payment_number"]

    # Verify updated bill balance
    res_bill_after = client.get("/api/bills/1", headers=accountant_headers)
    after_outstanding = float(res_bill_after.json()["outstanding_balance"])
    assert round(after_outstanding, 2) == round(initial_outstanding - 1000.00, 2)

def test_prevent_overpayment(client, accountant_headers):
    # Attempt to pay ₹999,999.00 on bill 1
    res = client.post("/api/payments?bill_id=1", json={
        "amount": "999999.00",
        "payment_method": "cash"
    }, headers=accountant_headers)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "exceeds outstanding" in res.json()["detail"].lower()
