import React, { useState, useEffect } from 'react';
import { 
  Sparkles, BedDouble, UtensilsCrossed, Receipt, Star, 
  Send, Clock, CheckCircle2, AlertCircle, ShoppingBag, 
  KeyRound, ShieldCheck, Coffee, Wifi, Waves
} from 'lucide-react';
import { 
  reservationsApi, billingApi, feedbackApi, 
  restaurantApi, barApi, staysApi 
} from '../../api/client';
import { Reservation, Bill, MenuItem, Stay } from '../../types';
import { Badge } from '../../components/Badge';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const GuestPortalPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [activeStay, setActiveStay] = useState<Stay | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [serviceRequests, setServiceRequests] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingStay, setActivatingStay] = useState(false);
  const [activeTab, setActiveTab] = useState<'stay' | 'roomservice' | 'requests' | 'folio'>('stay');

  // Service Request State
  const [requestType, setRequestType] = useState('Housekeeping');
  const [requestDetails, setRequestDetails] = useState('');
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  // Review State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComments, setReviewComments] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Quick Room Service order
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [orderSubmitting, setOrderSubmitting] = useState(false);

  const loadGuestData = async () => {
    setLoading(true);
    try {
      const [stayRes, resRes, billRes, reqRes, restMenuRes] = await Promise.all([
        staysApi.getMyStay().catch(() => ({ data: null })),
        reservationsApi.getMyReservations().catch(() => ({ data: [] })),
        billingApi.getMyBills().catch(() => ({ data: [] })),
        feedbackApi.getServiceRequests().catch(() => ({ data: [] })),
        restaurantApi.getMenu({ available_only: true }).catch(() => ({ data: [] })),
      ]);
      setActiveStay(stayRes.data);
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

  const handleActivateDemoStay = async () => {
    setActivatingStay(true);
    try {
      await staysApi.activateDemoStay();
      toast.success('Luxury Suite 203 checked-in successfully! Your room folio is now active.');
      await loadGuestData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to check into demo room.');
    } finally {
      setActivatingStay(false);
    }
  };

  const handleCreateServiceRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestDetails.trim()) {
      toast.warning('Please enter details for your request.');
      return;
    }

    setRequestSubmitting(true);
    try {
      await feedbackApi.createServiceRequest({
        request_type: requestType,
        details: requestDetails,
        room_id: activeStay?.room_id || reservations[0]?.room_id || 7
      });
      toast.success(`${requestType} dispatched to front desk & housekeeping!`);
      setRequestDetails('');
      loadGuestData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to submit service request.');
    } finally {
      setRequestSubmitting(false);
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
        comments: reviewComments || 'Exceptional hospitality and pristine amenities.',
        stay_id: activeStay?.id || 1
      });
      setReviewSubmitted(true);
      toast.success('Thank you for rating your stay with us!');
      setReviewComments('');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to submit review.');
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
    toast.info(`Added ${item.name} to tray`);
  };

  const handlePlaceRoomOrder = async () => {
    if (cart.length === 0) return;
    setOrderSubmitting(true);

    try {
      const orderRoomId = activeStay?.room_id || reservations[0]?.room_id || 7;
      const orderStayId = activeStay?.id;

      await restaurantApi.createOrder({
        order_type: 'room_service',
        is_billed_to_room: true,
        room_id: orderRoomId,
        stay_id: orderStayId,
        items: cart.map((c) => ({
          menu_item_id: c.item.id,
          quantity: c.quantity
        })),
        notes: `In-Room Dining via Guest Portal • ${activeStay?.room?.room_number ? 'Suite ' + activeStay.room.room_number : 'Room 203'}`
      });

      const totalVal = cart.reduce((sum, c) => sum + Number(c.item.price) * c.quantity, 0).toFixed(2);
      setCart([]);
      toast.success(`Room service order dispatched! ₹${totalVal} added to your room bill.`);
      await loadGuestData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to dispatch room service order.');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const activeRes = reservations[0];
  const activeBill = bills[0];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-amber-500/20">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(circle_at_top_right,rgba(217,179,91,0.15),transparent_70%)] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/20 mb-3">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
              StaySync VIP Guest Concierge
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.full_name || 'Guest'}!
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              StaySync Grand Resort • In-room dining, luxury amenities, fast concierge, and live account settlement.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {activeStay ? (
              <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-left">
                <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider block">Active Suite</span>
                <span className="text-lg font-bold font-mono text-white">
                  {activeStay.room?.room_number ? `Suite ${activeStay.room.room_number}` : 'Suite 203'}
                </span>
                <span className="text-[10px] text-emerald-400 font-medium block">● Checked-In</span>
              </div>
            ) : (
              <button
                onClick={handleActivateDemoStay}
                disabled={activatingStay}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4 text-slate-950" />
                {activatingStay ? 'Activating...' : 'Activate Demo Suite 203'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 space-x-2 sm:space-x-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('stay')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center whitespace-nowrap ${
            activeTab === 'stay'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BedDouble className="w-4 h-4 mr-2" />
          Suite & Stay
        </button>

        <button
          onClick={() => setActiveTab('roomservice')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center whitespace-nowrap ${
            activeTab === 'roomservice'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4 mr-2" />
          Room Service
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center whitespace-nowrap ${
            activeTab === 'requests'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Concierge & Amenities
        </button>

        <button
          onClick={() => setActiveTab('folio')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center whitespace-nowrap ${
            activeTab === 'folio'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4 mr-2" />
          Live Room Folio
        </button>
      </div>

      {/* Tab: Stay Details */}
      {activeTab === 'stay' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Current Reservation Information</h2>
            {activeRes ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <p className="text-slate-500 font-semibold uppercase">Booking Reference</p>
                    <p className="text-sm font-mono font-bold text-slate-900 mt-1">{activeRes.reservation_code}</p>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <p className="text-slate-500 font-semibold uppercase">Assigned Room</p>
                    <p className="text-sm font-bold text-indigo-600 mt-1">
                      {activeStay?.room?.room_number ? `Suite ${activeStay.room.room_number}` : 'Room 203'}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <p className="text-slate-500 font-semibold uppercase">Stay Status</p>
                    <div className="mt-1">
                      <Badge variant="success">{activeStay ? 'Checked-In' : activeRes.status}</Badge>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <p className="text-slate-500 font-semibold uppercase">Check-In Date</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{activeRes.check_in_date}</p>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <p className="text-slate-500 font-semibold uppercase">Check-Out Date</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{activeRes.check_out_date}</p>
                  </div>
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <p className="text-slate-500 font-semibold uppercase">Room Category</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">
                      {activeStay?.room?.category?.name || activeRes.room?.category?.name || 'Deluxe King Suite'}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-100 text-xs text-indigo-950 space-y-2">
                  <p className="font-bold flex items-center gap-1.5 text-indigo-900">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Complimentary 5-Star Hotel Amenities Included:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Wifi className="w-3.5 h-3.5 text-indigo-600" />
                      <span>WiFi: <strong>StaySync_VIP</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Coffee className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Buffet Breakfast (7–11 AM)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Waves className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Rooftop Pool & Spa</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No active reservations currently registered.</p>
            )}
          </div>

          {/* Quick Review Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center">
              <Star className="w-5 h-5 mr-1.5 text-amber-500 fill-amber-500" />
              Rate Your Experience
            </h2>

            {reviewSubmitted ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center border border-emerald-200">
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors"
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
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Room Service Menu</h2>
                <p className="text-xs text-slate-500">Prepared fresh by Executive Chef & dispatched directly to your room</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 font-semibold text-slate-600">
                {menuItems.length} dishes available
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {menuItems.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition-all">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-slate-900 text-sm">{item.name}</h3>
                      <span className="font-mono font-bold text-indigo-600 text-sm whitespace-nowrap">₹{Number(item.price).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                  </div>
                  <button
                    onClick={() => addToCart(item)}
                    className="mt-3 w-full py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                  >
                    + Add to Order
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Cart Sidebar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 h-fit">
            <h3 className="font-bold text-slate-900 text-base flex items-center">
              <ShoppingBag className="w-5 h-5 mr-2 text-indigo-600" />
              Room Service Tray
            </h3>

            {cart.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">Your tray is currently empty.</p>
            ) : (
              <div className="space-y-3">
                <div className="divide-y divide-slate-100 text-xs">
                  {cart.map((c) => (
                    <div key={c.item.id} className="py-2 flex justify-between items-center">
                      <span className="font-medium text-slate-800">{c.item.name} × {c.quantity}</span>
                      <span className="font-mono font-bold text-slate-900">₹{(Number(c.item.price) * c.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-3 flex justify-between font-bold text-sm">
                  <span>Order Total:</span>
                  <span className="font-mono text-indigo-600">
                    ₹{cart.reduce((sum, c) => sum + Number(c.item.price) * c.quantity, 0).toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={handlePlaceRoomOrder}
                  disabled={orderSubmitting}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {orderSubmitting ? 'Placing Order...' : 'Order to Room (Bill to Folio)'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Concierge & Amenities */}
      {activeTab === 'requests' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Request Housekeeping or Amenities</h2>
              <p className="text-xs text-slate-500">Fast digital service directly to your suite</p>
            </div>

            <form onSubmit={handleCreateServiceRequest} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Request Category</label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={requestSubmitting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                {requestSubmitting ? 'Dispatching...' : 'Send Request to Front Desk'}
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900">My Service Requests</h2>
            {serviceRequests.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No service requests filed yet.</p>
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
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
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
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <p className="text-slate-500 font-sans">Room Charges</p>
                  <p className="text-base font-bold text-slate-900 mt-1">₹{Number(activeBill.room_charges).toFixed(2)}</p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <p className="text-slate-500 font-sans">Restaurant & Bar</p>
                  <p className="text-base font-bold text-slate-900 mt-1">
                    ₹{(Number(activeBill.restaurant_charges) + Number(activeBill.bar_charges)).toFixed(2)}
                  </p>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <p className="text-slate-500 font-sans">GST Tax (10%)</p>
                  <p className="text-base font-bold text-slate-900 mt-1">₹{Number(activeBill.tax_amount).toFixed(2)}</p>
                </div>
                <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200">
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
