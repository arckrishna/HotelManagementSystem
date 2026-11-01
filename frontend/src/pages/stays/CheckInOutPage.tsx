import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { 
  LogIn, LogOut, CheckCircle2, BedDouble, 
  Receipt, CreditCard, AlertCircle, FileText, Printer 
} from 'lucide-react';
import { staysApi, reservationsApi, paymentsApi, billingApi } from '../../api/client';
import { Stay, Reservation, Bill } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';

export const CheckInOutPage: React.FC = () => {
  const { toast } = useToast();
  const [activeStays, setActiveStays] = useState<Stay[]>([]);
  const [confirmedReservations, setConfirmedReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  // Check-In Modal
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [selectedResId, setSelectedResId] = useState<number>(0);
  const [initialNotes, setInitialNotes] = useState('');
  const [checkInError, setCheckInError] = useState<string | null>(null);

  // Check-Out Modal
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [selectedStay, setSelectedStay] = useState<Stay | null>(null);
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [checkoutBill, setCheckoutBill] = useState<Bill | null>(null);
  const [finalBillModal, setFinalBillModal] = useState<Bill | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Payment Recording in Checkout
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('card');
  const [paymentRef, setPaymentRef] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [staysRes, resRes] = await Promise.all([
        staysApi.getActiveStays(),
        reservationsApi.getReservations({ status: 'confirmed' }),
      ]);
      setActiveStays(staysRes.data);
      setConfirmedReservations(resRes.data);
      if (resRes.data.length > 0) {
        setSelectedResId(resRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load check-in/out data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePerformCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckInError(null);
    if (!selectedResId) return;

    try {
      await staysApi.checkIn({
        reservation_id: selectedResId,
        initial_room_condition_notes: initialNotes || undefined,
      });
      setIsCheckInOpen(false);
      setInitialNotes('');
      loadData();
    } catch (err: any) {
      setCheckInError(err.response?.data?.detail || 'Failed to check in guest.');
    }
  };

  const handleOpenCheckOut = async (stay: Stay) => {
    setSelectedStay(stay);
    setIsCheckOutOpen(true);
    try {
      if (stay.bill?.id) {
        const res = await billingApi.getBill(stay.bill.id);
        setCheckoutBill(res.data);
        setPaymentAmount(String(res.data.outstanding_balance));
      }
    } catch (err) {
      console.error('Failed to load bill preview:', err);
    }
  };

  const handlePerformCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStay) return;
    setIsCheckingOut(true);

    try {
      // Step 1: If user entered payment, record it
      if (checkoutBill && parseFloat(paymentAmount) > 0) {
        await paymentsApi.createPayment(checkoutBill.id, {
          amount: paymentAmount,
          payment_method: paymentMethod,
          reference_number: paymentRef || undefined,
          notes: 'Settlement at front desk checkout'
        });
      }

      // Step 2: Finalize Checkout
      const res = await staysApi.checkOut(selectedStay.id, {
        checkout_notes: checkoutNotes || undefined
      });

      setIsCheckOutOpen(false);
      setFinalBillModal(res.data);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Checkout failed.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Front Desk: Check-In & Check-Out</h1>
          <p className="text-xs text-slate-500 mt-1">
            Perform guest registration arrival, monitor active stays, and finalize aggregated checkout billing.
          </p>
        </div>
        <button
          onClick={() => {
            setCheckInError(null);
            setIsCheckInOpen(true);
          }}
          disabled={confirmedReservations.length === 0}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition disabled:opacity-50"
        >
          <LogIn className="w-4 h-4" />
          <span>Check In Arriving Guest ({confirmedReservations.length} pending)</span>
        </button>
      </div>

      {/* Active Stays Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BedDouble className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-xs text-slate-900">Current Occupied Rooms ({activeStays.length} active stays)</span>
          </div>
          <span className="text-[11px] text-slate-400">BR-02: Occupied rooms cannot be reallocated</span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : activeStays.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No guests currently checked in.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 uppercase text-[10px] font-extrabold text-slate-400 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Room</th>
                  <th className="px-5 py-3.5">Guest Information</th>
                  <th className="px-5 py-3.5">Check-In Time</th>
                  <th className="px-5 py-3.5">Folio Number</th>
                  <th className="px-5 py-3.5">Current Balance</th>
                  <th className="px-5 py-3.5 text-right">Checkout Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeStays.map((stay) => (
                  <tr key={stay.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-slate-900 text-sm">Room {stay.room?.room_number}</span>
                        <Badge variant="occupied">Occupied</Badge>
                      </div>
                      <span className="text-[10px] text-slate-400">{stay.room?.category?.name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-900">
                        {stay.guest ? `${stay.guest.first_name} ${stay.guest.last_name}` : 'Guest'}
                      </span>
                      <p className="text-[10px] text-slate-400">{stay.guest?.phone}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">
                      <div>{new Date(stay.actual_check_in).toLocaleDateString()}</div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(stay.actual_check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-blue-600 font-bold">
                      {stay.bill?.bill_number || 'OPEN-FOLIO'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-extrabold text-slate-900">
                        ₹{parseFloat(String(stay.bill?.outstanding_balance || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleOpenCheckOut(stay)}
                        className="flex items-center space-x-1.5 ml-auto px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Check Out</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Check-In Modal */}
      <Modal isOpen={isCheckInOpen} onClose={() => setIsCheckInOpen(false)} title="Guest Arrival & Check-In">
        <form onSubmit={handlePerformCheckIn} className="space-y-4 text-xs">
          {checkInError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{checkInError}</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Confirmed Reservation *</label>
            <select
              value={selectedResId}
              onChange={(e) => setSelectedResId(parseInt(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 font-semibold"
            >
              {confirmedReservations.map((res) => (
                <option key={res.id} value={res.id}>
                  {res.reservation_code} — {res.guest?.first_name} {res.guest?.last_name} (Room {res.room?.room_number})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Initial Room Condition / Inspection Notes</label>
            <textarea
              rows={2}
              value={initialNotes}
              onChange={(e) => setInitialNotes(e.target.value)}
              placeholder="e.g. Keycard #204 handed to guest. Room inspected and verified clean."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
            <p className="font-bold">Check-in Effect:</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-blue-800">
              <li>Reservation status transitions to <b>Checked In</b></li>
              <li>Room status updates to <b>Occupied</b></li>
              <li>Creates active stay record with current UTC arrival timestamp</li>
              <li>Initializes central guest billing folio</li>
            </ul>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-md shadow-blue-600/20"
          >
            Confirm Check-In & Handover Key
          </button>
        </form>
      </Modal>

      {/* Check-Out & Final Billing Settlement Modal (Workflow B & G) */}
      <Modal 
        isOpen={isCheckOutOpen} 
        onClose={() => {
          setIsCheckOutOpen(false);
          setSelectedStay(null);
        }} 
        title={`Check-Out & Settlement — Room ${selectedStay?.room?.room_number}`}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handlePerformCheckOut} className="space-y-4 text-xs">
          {/* Guest Stay Summary */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">
                Guest: {selectedStay?.guest?.first_name} {selectedStay?.guest?.last_name}
              </span>
              <span className="font-mono text-blue-600 font-bold">{selectedStay?.bill?.bill_number}</span>
            </div>
            <p className="text-slate-500">
              Check-in: {selectedStay?.actual_check_in ? new Date(selectedStay.actual_check_in).toLocaleString() : ''}
            </p>
          </div>

          {/* Aggregated Bill Preview (BR-10) */}
          {checkoutBill && (
            <div className="space-y-2 p-3.5 rounded-xl border border-slate-200">
              <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                Aggregated Charges Summary (BR-10)
              </p>
              <div className="space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Room Accommodation Charges:</span>
                  <span className="font-semibold text-slate-800">₹{parseFloat(String(checkoutBill.room_charges))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Restaurant Room Service Charges:</span>
                  <span className="font-semibold text-slate-800">₹{parseFloat(String(checkoutBill.restaurant_charges))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bar & Beverage Service Charges:</span>
                  <span className="font-semibold text-slate-800">₹{parseFloat(String(checkoutBill.bar_charges))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hospitality Tax (GST 10%):</span>
                  <span className="font-semibold text-slate-800">₹{parseFloat(String(checkoutBill.tax_amount))}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-200">
                  <span>Total Bill Amount:</span>
                  <span>₹{parseFloat(String(checkoutBill.total_amount))}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Already Paid (Deposits/Advance):</span>
                  <span>- ₹{parseFloat(String(checkoutBill.paid_amount))}</span>
                </div>
                <div className="flex justify-between text-base font-black text-rose-700 pt-1 border-t border-slate-200">
                  <span>Outstanding Balance Due:</span>
                  <span>₹{parseFloat(String(checkoutBill.outstanding_balance))}</span>
                </div>
              </div>
            </div>
          )}

          {/* Settle Outstanding Balance */}
          {checkoutBill && parseFloat(String(checkoutBill.outstanding_balance)) > 0 && (
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3">
              <p className="font-bold text-emerald-950 uppercase text-[10px] tracking-wider">
                Record Final Payment Settlement
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none font-semibold"
                  >
                    <option value="card">Credit / Debit Card</option>
                    <option value="upi">UPI / QR Transfer</option>
                    <option value="cash">Cash Settlement</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Transaction Ref / Cheque No.</label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. UPI-TXN-9842"
                  className="w-full rounded-xl border border-slate-300 px-3 py-1.5 outline-none font-mono"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Checkout Inspection Notes</label>
            <input
              type="text"
              value={checkoutNotes}
              onChange={(e) => setCheckoutNotes(e.target.value)}
              placeholder="e.g. Minibar verified, keycard returned, guest satisfied."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <p className="font-bold">Workflow B Rule:</p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Upon check-out, Room {selectedStay?.room?.room_number} will automatically transition to <b>Cleaning</b> status. It will not be bookable or available until housekeeping marks it sanitized.
            </p>
          </div>

          <button
            type="submit"
            disabled={isCheckingOut}
            className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition shadow-md shadow-slate-900/20 disabled:opacity-50"
          >
            {isCheckingOut ? 'Finalizing Checkout...' : 'Confirm Checkout & Finalize Folio'}
          </button>
        </form>
      </Modal>

      {/* Printable Receipt / Finalized Invoice Modal */}
      <Modal
        isOpen={!!finalBillModal}
        onClose={() => setFinalBillModal(null)}
        title="StaySync Official Checkout Receipt"
        maxWidth="max-w-lg"
      >
        {finalBillModal && (
          <div className="space-y-4 text-xs font-sans p-2">
            <div className="text-center border-b pb-3">
              <h2 className="font-black text-lg text-slate-900">StaySync Grand Luxury Hotel</h2>
              <p className="text-[10px] text-slate-500">Marine Drive, Nariman Point, Mumbai 400021</p>
              <p className="text-[10px] font-mono font-bold text-blue-600 mt-1">
                Receipt #{finalBillModal.bill_number}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div>
                <span className="text-slate-400">Guest:</span> {finalBillModal.guest?.first_name} {finalBillModal.guest?.last_name}
              </div>
              <div className="text-right">
                <span className="text-slate-400">Date:</span> {new Date().toLocaleDateString()}
              </div>
            </div>

            {/* Line Items */}
            <div className="border rounded-xl p-3 space-y-1.5 bg-slate-50/50">
              <p className="font-bold text-[10px] uppercase text-slate-400 tracking-wider">Itemized Folio Charges</p>
              {finalBillModal.line_items?.map((li) => (
                <div key={li.id} className="flex justify-between text-[11px]">
                  <span className="text-slate-700">{li.description}</span>
                  <span className="font-bold text-slate-900">₹{parseFloat(String(li.amount))}</span>
                </div>
              ))}
              <div className="flex justify-between font-black text-sm pt-2 border-t text-slate-900">
                <span>Total Amount:</span>
                <span>₹{parseFloat(String(finalBillModal.total_amount))}</span>
              </div>
              <div className="flex justify-between text-xs text-emerald-700 font-bold">
                <span>Paid in Full:</span>
                <span>₹{parseFloat(String(finalBillModal.paid_amount))}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-900">
                <span>Balance:</span>
                <span>₹{parseFloat(String(finalBillModal.outstanding_balance))}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print Guest Receipt</span>
              </button>
              <button
                onClick={() => setFinalBillModal(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
