import React, { useState, useEffect } from 'react';
import { 
  Sparkles, BedDouble, UtensilsCrossed, Receipt, Star, 
  Send, Clock, CheckCircle2, AlertCircle, ShoppingBag 
} from 'lucide-react';
import { 
  reservationsApi, billingApi, feedbackApi, 
  restaurantApi, barApi 
} from '../../api/client';
import { Reservation, Bill, MenuItem } from '../../types';
import { Badge } from '../../components/Badge';
import { useAuth } from '../../context/AuthContext';

export const GuestPortalPage: React.FC = () => {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stay' | 'roomservice' | 'requests' | 'folio'>('stay');

  // Service Request State
  const [requestType, setRequestType] = useState('Housekeeping');
  const [requestDetails, setRequestDetails] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Review State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComments, setReviewComments] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Quick Room Service order
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [orderSubmitted, setOrderSubmitted] = useState(false);

  const loadGuestData = async () => {
    setLoading(true);
    try {
      const [resRes, billRes, reqRes, restMenuRes] = await Promise.all([
        reservationsApi.getMyReservations().catch(() => ({ data: [] })),
        billingApi.getMyBills().catch(() => ({ data: [] })),
        feedbackApi.getServiceRequests().catch(() => ({ data: [] })),
        restaurantApi.getMenu({ available_only: true }).catch(() => ({ data: [] })),
      ]);
      setReservations(resRes.data);
      setBills(billRes.data);
      setServiceRequests(reqRes.data);
      setMenuItems(restMenuRes.data);
    } catch (err) {
      console.error('Failed to load guest data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuestData();
  }, []);

  const handleCreateServiceRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await feedbackApi.createServiceRequest({
        request_type: requestType,
        details: requestDetails,
        room_id: reservations[0]?.room_id || 5
      });
      setRequestSuccess(true);
      setRequestDetails('');
      setTimeout(() => setRequestSuccess(false), 4000);
      loadGuestData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit service request.');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await feedbackApi.submitGuestReview({
        rating: reviewRating,
        cleanliness_rating: 5,
        staff_rating: 5,
        food_rating: 5,
        comments: reviewComments,
        stay_id: 1
      });
      setReviewSubmitted(true);
      setReviewComments('');
      setTimeout(() => setReviewSubmitted(false), 4000);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit review.');
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) => (c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handlePlaceRoomOrder = async () => {
    if (cart.length === 0) return;
    try {
      await restaurantApi.createOrder({
        order_type: 'room_service',
        is_billed_to_room: true,
        room_id: reservations[0]?.room_id || 7, // Room 203
        stay_id: 1,
        items: cart.map((c) => ({
          menu_item_id: c.item.id,
          quantity: c.quantity
        })),
        notes: 'Ordered via Guest Portal self-service'
      });
      setCart([]);
      setOrderSubmitted(true);
      setTimeout(() => setOrderSubmitted(false), 4000);
      loadGuestData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to dispatch room service order.');
    }
  };

  const activeRes = reservations[0];
  const activeBill = bills[0];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md mb-3">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
            StaySync Guest Concierge
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            Welcome back, {user?.full_name || 'Guest'}!
          </h1>
          <p className="text-blue-100 text-sm mt-1 max-w-xl">
            Enjoy your luxury stay. Access digital room services, in-room dining, housekeeping amenities, and live billing from your private portal.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-6">
        <button
          onClick={() => setActiveTab('stay')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center ${
            activeTab === 'stay'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BedDouble className="w-4 h-4 mr-2" />
          My Stay Details
        </button>

        <button
          onClick={() => setActiveTab('roomservice')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center ${
            activeTab === 'roomservice'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4 mr-2" />
          In-Room Dining
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center ${
            activeTab === 'requests'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Concierge & Amenities
        </button>

        <button
          onClick={() => setActiveTab('folio')}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center ${
            activeTab === 'folio'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Receipt className="w-4 h-4 mr-2" />
          Live Room Folio
        </button>
      </div>

      {/* Tab: Stay Details */}
      {activeTab === 'stay' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Current Reservation Information</h2>
            {activeRes ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-slate-500 font-semibold uppercase">Booking Reference</p>
                    <p className="text-sm font-mono font-bold text-slate-900 mt-1">{activeRes.reservation_code}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-slate-500 font-semibold uppercase">Room Number</p>
                    <p className="text-sm font-bold text-blue-600 mt-1">{activeRes.room?.room_number || 'Room 203'}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-slate-500 font-semibold uppercase">Status</p>
                    <div className="mt-1"><Badge variant="success">{activeRes.status}</Badge></div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-slate-500 font-semibold uppercase">Check-In</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{activeRes.check_in_date}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-slate-500 font-semibold uppercase">Check-Out</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{activeRes.check_out_date}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-slate-500 font-semibold uppercase">Room Category</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{activeRes.room?.category?.name || 'Deluxe Room'}</p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1">
                  <p className="font-bold">Complimentary Hotel Amenities Included with your Suite:</p>
                  <p className="text-blue-700">High-speed WiFi (Network: <strong>StaySync_Luxury</strong>), Breakfast Buffet (7:00 AM - 10:30 AM), Rooftop Infinity Pool Access.</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No active reservations currently registered.</p>
            )}
          </div>

          {/* Quick Review Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center">
              <Star className="w-5 h-5 mr-1.5 text-amber-500 fill-amber-500" />
              Rate Your Stay Experience
            </h2>

            {reviewSubmitted ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                Thank you for your valuable feedback!
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Overall Rating</label>
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                  >
                    <option value={5}>⭐⭐⭐⭐⭐ 5 Stars - Exceptional</option>
                    <option value={4}>⭐⭐⭐⭐ 4 Stars - Very Good</option>
                    <option value={3}>⭐⭐⭐ 3 Stars - Average</option>
                    <option value={2}>⭐⭐ 2 Stars - Needs Improvement</option>
                    <option value={1}>⭐ 1 Star - Poor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Your Comments</label>
                  <textarea
                    rows={3}
                    placeholder="Tell us what you loved or how we can improve..."
                    value={reviewComments}
                    onChange={(e) => setReviewComments(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm"
                >
                  Submit Review
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Tab: In-Room Dining */}
      {activeTab === 'roomservice' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Room Service Menu</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {menuItems.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-900 text-sm">{item.name}</h3>
                      <span className="font-mono font-bold text-blue-600 text-sm">₹{Number(item.price).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                  </div>
                  <button
                    onClick={() => addToCart(item)}
                    className="mt-3 w-full py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 font-semibold text-xs rounded-lg transition-colors"
                  >
                    + Add to Order
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Cart Sidebar */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 h-fit">
            <h3 className="font-bold text-slate-900 text-base flex items-center">
              <ShoppingBag className="w-5 h-5 mr-2 text-blue-600" />
              Room Service Tray
            </h3>

            {orderSubmitted && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                Order sent to kitchen! Charges billed to room.
              </div>
            )}

            {cart.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Your tray is currently empty.</p>
            ) : (
              <div className="space-y-3">
                <div className="divide-y divide-slate-100 text-xs">
                  {cart.map((c) => (
                    <div key={c.item.id} className="py-2 flex justify-between items-center">
                      <span>{c.item.name} x {c.quantity}</span>
                      <span className="font-mono font-bold">₹{(Number(c.item.price) * c.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm">
                  <span>Total:</span>
                  <span className="font-mono text-blue-600">
                    ₹{cart.reduce((sum, c) => sum + Number(c.item.price) * c.quantity, 0).toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={handlePlaceRoomOrder}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  Order to Room (Bill to Folio)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Concierge & Amenities */}
      {activeTab === 'requests' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">Request Housekeeping or Amenities</h2>
            {requestSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-lg flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" />
                Your request has been dispatched to hotel staff!
              </div>
            )}
            <form onSubmit={handleCreateServiceRequest} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Request Category</label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="Housekeeping">Housekeeping / Room Cleaning</option>
                  <option value="Towels & Linens">Extra Fresh Towels & Bed Linen</option>
                  <option value="Toiletries">Eco Toiletries & Bath Kit</option>
                  <option value="Luggage Assistance">Luggage & Bellboy Assistance</option>
                  <option value="Wakeup Call">Automated Wakeup Call</option>
                  <option value="Technical Issue">Room AC / TV / WiFi Assistance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Details / Notes</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Please provide 2 extra bath towels and dental kit."
                  value={requestDetails}
                  onChange={(e) => setRequestDetails(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                Send Request to Front Desk
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">My Previous Requests</h2>
            {serviceRequests.length === 0 ? (
              <p className="text-xs text-slate-400">No service requests filed yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {serviceRequests.map((req) => (
                  <div key={req.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-900">{req.request_type}</p>
                      <p className="text-slate-500 text-[11px]">{req.details}</p>
                    </div>
                    <Badge variant={req.status === 'completed' ? 'success' : 'warning'}>
                      {req.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Folio */}
      {activeTab === 'folio' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Live Itemized Bill Folio</h2>
              <p className="text-xs text-slate-500">All accommodation and in-hotel dining charges accrued during your stay</p>
            </div>
            {activeBill && (
              <span className="font-mono text-xs font-bold px-3 py-1 bg-slate-100 rounded-lg">
                Invoice #{activeBill.bill_number}
              </span>
            )}
          </div>

          {activeBill ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-slate-500 font-sans">Room Charges</p>
                  <p className="text-base font-bold text-slate-900 mt-1">₹{Number(activeBill.room_charges).toFixed(2)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-slate-500 font-sans">Restaurant & Bar</p>
                  <p className="text-base font-bold text-slate-900 mt-1">
                    ₹{(Number(activeBill.restaurant_charges) + Number(activeBill.bar_charges)).toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-slate-500 font-sans">GST Tax (10%)</p>
                  <p className="text-base font-bold text-slate-900 mt-1">₹{Number(activeBill.tax_amount).toFixed(2)}</p>
                </div>
                <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
                  <p className="text-rose-700 font-sans font-bold">Outstanding Dues</p>
                  <p className="text-base font-black text-rose-700 mt-1">₹{Number(activeBill.outstanding_balance).toFixed(2)}</p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-500 flex justify-between items-center">
                <span>Total Folio Amount: <strong className="text-slate-900 font-mono">₹{Number(activeBill.total_amount).toFixed(2)}</strong></span>
                <span>Already Settled: <strong className="text-emerald-600 font-mono">₹{Number(activeBill.paid_amount).toFixed(2)}</strong></span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">No active bill found for your profile.</p>
          )}
        </div>
      )}
    </div>
  );
};
