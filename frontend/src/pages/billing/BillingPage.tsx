import React, { useState, useEffect } from 'react';
import { 
  Receipt, CreditCard, Search, Printer, CheckCircle2, 
  AlertCircle, IndianRupee, FileText, ChevronRight, Eye 
} from 'lucide-react';
import { billingApi, paymentsApi } from '../../api/client';
import { Bill, Payment } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';

export const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bills' | 'payments'>('bills');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  // Payment form state
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'card' | 'cash' | 'upi'>('card');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [billsRes, paysRes] = await Promise.all([
        billingApi.getBills(),
        paymentsApi.getPayments().catch(() => ({ data: [] }))
      ]);
      setBills(billsRes.data);
      setPayments(paysRes.data);
    } catch (err) {
      console.error('Failed to load billing records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMakePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;
    try {
      await paymentsApi.createPayment(selectedBill.id, {
        amount: Number(payAmount),
        payment_method: payMethod,
        reference_number: payRef || `SIM-PAY-${Date.now().toString().slice(-6)}`,
        notes: payNotes || undefined
      });
      setIsPayOpen(false);
      setSelectedBill(null);
      setPayAmount('');
      setPayRef('');
      setPayNotes('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to record payment.');
    }
  };

  const filteredBills = bills.filter(b => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const guestName = b.guest ? `${b.guest.first_name} ${b.guest.last_name}`.toLowerCase() : '';
      return b.bill_number.toLowerCase().includes(q) || guestName.includes(q);
    }
    return true;
  });

  const totalOutstanding = bills.reduce((sum, b) => sum + Number(b.outstanding_balance), 0);
  const totalRevenueCollected = bills.reduce((sum, b) => sum + Number(b.paid_amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <Receipt className="w-7 h-7 mr-2.5 text-blue-600" />
            Billing & Invoices
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Consolidated guest folios, POS charges, simulated payment settlement, and tax invoices
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Bills Issued</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{bills.length}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <p className="text-xs text-emerald-700 font-medium uppercase tracking-wider">Total Revenue Collected</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">₹{totalRevenueCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-sm">
          <p className="text-xs text-rose-700 font-medium uppercase tracking-wider">Outstanding Dues</p>
          <p className="text-2xl font-bold text-rose-700 mt-1">₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Payments Processed</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{payments.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 space-x-8">
        <button
          onClick={() => setActiveTab('bills')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center ${
            activeTab === 'bills'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Receipt className="w-4 h-4 mr-2" />
          Guest Folios & Invoices ({filteredBills.length})
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center ${
            activeTab === 'payments'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Payment Transactions Ledger ({payments.length})
        </button>
      </div>

      {activeTab === 'bills' && (
        <>
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search bill # or guest name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-medium px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Folio Statuses</option>
                <option value="open">Open (Active Stay)</option>
                <option value="finalized">Finalized</option>
                <option value="paid">Fully Paid</option>
              </select>
            </div>
          </div>

          {/* Bills Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400">Loading billing records...</div>
            ) : filteredBills.length === 0 ? (
              <div className="p-12 text-center text-slate-400">No bills found matching your criteria.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Guest</th>
                      <th className="py-3 px-4">Room Tariff</th>
                      <th className="py-3 px-4">F&B Orders</th>
                      <th className="py-3 px-4">Tax (10%)</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Balance Due</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBills.map((bill) => {
                      const balance = Number(bill.outstanding_balance);
                      const fnb = Number(bill.restaurant_charges) + Number(bill.bar_charges);
                      return (
                        <tr key={bill.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{bill.bill_number}</td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-900">
                              {bill.guest ? `${bill.guest.first_name} ${bill.guest.last_name}` : `Guest #${bill.guest_id}`}
                            </p>
                            {bill.stay?.room && (
                              <p className="text-xs text-blue-600 font-medium">Room {bill.stay.room.room_number}</p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-700">₹{Number(bill.room_charges).toFixed(2)}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-700">₹{fnb.toFixed(2)}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-500">₹{Number(bill.tax_amount).toFixed(2)}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">₹{Number(bill.total_amount).toFixed(2)}</td>
                          <td className="py-3.5 px-4 font-mono">
                            <span className={`font-bold ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              ₹{balance.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {bill.status === 'paid' ? (
                              <Badge variant="success">Paid</Badge>
                            ) : bill.status === 'open' ? (
                              <Badge variant="warning">Open</Badge>
                            ) : (
                              <Badge variant="info">Finalized</Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1.5">
                            <button
                              onClick={() => {
                                setSelectedBill(bill);
                                setIsInvoiceOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors inline-flex items-center"
                              title="View and Print Invoice"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Invoice
                            </button>

                            {balance > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedBill(bill);
                                  setPayAmount(balance.toString());
                                  setIsPayOpen(true);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors inline-flex items-center"
                              >
                                Pay
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'payments' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {payments.length === 0 ? (
            <div className="p-12 text-center text-slate-400">No payment transactions recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Transaction #</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Invoice Ref</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Reference Code</th>
                    <th className="py-3 px-4">Amount Paid</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.payment_number}</td>
                      <td className="py-3 px-4 text-slate-500 text-xs">{new Date(p.created_at).toLocaleString()}</td>
                      <td className="py-3 px-4 font-mono text-xs text-blue-600">Bill #{p.bill_id}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-slate-100 text-slate-700">
                          {p.payment_method}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{p.reference_number || 'N/A'}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600 text-sm">
                        ₹{Number(p.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">{p.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Process Payment */}
      <Modal isOpen={isPayOpen} onClose={() => setIsPayOpen(false)} title={`Process Payment for ${selectedBill?.bill_number}`}>
        <form onSubmit={handleMakePayment} className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex justify-between">
            <span>Outstanding Dues:</span>
            <strong className="font-mono text-sm">₹{Number(selectedBill?.outstanding_balance || 0).toFixed(2)}</strong>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Payment Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              required
              max={Number(selectedBill?.outstanding_balance || 0)}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="card">Credit / Debit Card</option>
                <option value="upi">UPI / QR Code</option>
                <option value="cash">Cash at Front Desk</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Transaction Ref #</label>
              <input
                type="text"
                placeholder="e.g. TXN-HDFC-9982"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Notes / Receipt remarks</label>
            <input
              type="text"
              placeholder="e.g. Front desk settlement"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsPayOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm"
            >
              Confirm Settlement
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Printable Tax Invoice */}
      <Modal isOpen={isInvoiceOpen} onClose={() => setIsInvoiceOpen(false)} title="Guest Tax Invoice">
        {selectedBill && (
          <div className="space-y-6 text-slate-900 printable-area">
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-black bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
                  StaySync Hotel & Luxury Suites
                </h2>
                <p className="text-xs text-slate-500">104 Marine Drive, Nariman Point, Mumbai - 400021</p>
                <p className="text-xs text-slate-500">GSTIN: 27AABCS1429B1Z8 | info@staysync.com</p>
              </div>

              <div className="text-right">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400">TAX INVOICE</span>
                <p className="font-mono font-bold text-slate-900 text-base">{selectedBill.bill_number}</p>
                <p className="text-xs text-slate-500">Date: {new Date(selectedBill.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Bill To */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg">
              <div>
                <p className="font-bold text-slate-700 uppercase">Billed To:</p>
                <p className="font-bold text-sm text-slate-900">
                  {selectedBill.guest ? `${selectedBill.guest.first_name} ${selectedBill.guest.last_name}` : 'Hotel Guest'}
                </p>
                <p className="text-slate-500">{selectedBill.guest?.phone}</p>
                <p className="text-slate-500">{selectedBill.guest?.email}</p>
              </div>

              <div className="text-right">
                <p className="font-bold text-slate-700 uppercase">Stay Details:</p>
                <p className="font-semibold text-slate-900">
                  Room: {selectedBill.stay?.room?.room_number || 'Deluxe'}
                </p>
                <p className="text-slate-500">
                  Folio Status: <strong className="uppercase">{selectedBill.status}</strong>
                </p>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="p-2.5">Charge Description</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {selectedBill.line_items && selectedBill.line_items.length > 0 ? (
                    selectedBill.line_items.map((item) => (
                      <tr key={item.id}>
                        <td className="p-2.5 font-sans font-medium text-slate-800">{item.description}</td>
                        <td className="p-2.5 font-sans text-slate-500 uppercase">{item.charge_type}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">₹{Number(item.amount).toFixed(2)}</td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr>
                        <td className="p-2.5 font-sans font-medium">Room Accommodation Charges</td>
                        <td className="p-2.5 font-sans text-slate-500">ROOM</td>
                        <td className="p-2.5 text-right font-bold">₹{Number(selectedBill.room_charges).toFixed(2)}</td>
                      </tr>
                      {Number(selectedBill.restaurant_charges) > 0 && (
                        <tr>
                          <td className="p-2.5 font-sans font-medium">Restaurant Dining Services</td>
                          <td className="p-2.5 font-sans text-slate-500">RESTAURANT</td>
                          <td className="p-2.5 text-right font-bold">₹{Number(selectedBill.restaurant_charges).toFixed(2)}</td>
                        </tr>
                      )}
                      {Number(selectedBill.bar_charges) > 0 && (
                        <tr>
                          <td className="p-2.5 font-sans font-medium">Bar & Lounge Services</td>
                          <td className="p-2.5 font-sans text-slate-500">BAR</td>
                          <td className="p-2.5 text-right font-bold">₹{Number(selectedBill.bar_charges).toFixed(2)}</td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-1.5 text-xs text-right font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Room + F&B):</span>
                <span>₹{(Number(selectedBill.room_charges) + Number(selectedBill.restaurant_charges) + Number(selectedBill.bar_charges)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Hospitality GST (10%):</span>
                <span>₹{Number(selectedBill.tax_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-1.5">
                <span>Final Payable Amount:</span>
                <span>₹{Number(selectedBill.total_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Total Amount Settled:</span>
                <span>₹{Number(selectedBill.paid_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-rose-600 border-t border-slate-100 pt-1">
                <span>Outstanding Balance:</span>
                <span>₹{Number(selectedBill.outstanding_balance).toFixed(2)}</span>
              </div>
            </div>

            {/* Print Button */}
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm inline-flex items-center"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print / Save PDF
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
