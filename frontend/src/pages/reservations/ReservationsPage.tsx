import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { CalendarCheck, Plus, Search, XCircle, CheckCircle, BedDouble, AlertCircle } from 'lucide-react';
import { reservationsApi, guestsApi, roomsApi } from '../../api/client';
import { Reservation, GuestProfile, Room } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';

export const ReservationsPage: React.FC = () => {
  const { toast } = useToast();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [guests, setGuests] = useState<GuestProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // New Reservation Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState<number>(0);
  const [checkInDate, setCheckInDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number>(0);
  const [numGuests, setNumGuests] = useState<number>(1);
  const [specialRequests, setSpecialRequests] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [cancellingResId, setCancellingResId] = useState<number | null>(null);

  const loadReservations = async () => {
    setLoading(true);
    try {
      const [resRes, gRes] = await Promise.all([
        reservationsApi.getReservations(),
        guestsApi.getGuests(),
      ]);
      setReservations(resRes.data);
      setGuests(gRes.data);
      if (gRes.data.length > 0) {
        setSelectedGuestId(gRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load reservations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  // When dates change in modal, search available rooms from backend
  useEffect(() => {
    if (!isModalOpen || !checkInDate || !checkOutDate) return;
    if (new Date(checkOutDate) <= new Date(checkInDate)) return;

    const fetchAvailable = async () => {
      setCheckingAvailability(true);
      try {
        const res = await roomsApi.searchAvailable({
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          guests_count: numGuests,
        });
        setAvailableRooms(res.data);
        if (res.data.length > 0) {
          setSelectedRoomId(res.data[0].id);
        } else {
          setSelectedRoomId(0);
        }
      } catch (err) {
        console.error('Failed to check available rooms:', err);
      } finally {
        setCheckingAvailability(false);
      }
    };
    fetchAvailable();
  }, [isModalOpen, checkInDate, checkOutDate, numGuests]);

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    if (!selectedRoomId) {
      setBookingError('Please select an available room.');
      return;
    }

    try {
      await reservationsApi.createReservation({
        guest_id: selectedGuestId,
        room_id: selectedRoomId,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        num_guests: numGuests,
        special_requests: specialRequests || undefined,
      });
      setIsModalOpen(false);
      loadReservations();
    } catch (err: any) {
      setBookingError(err.response?.data?.detail || 'Failed to create reservation.');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingResId) return;
    const id = cancellingResId;
    setCancellingResId(null);
    try {
      await reservationsApi.cancelReservation(id);
      toast.success('Reservation successfully cancelled.');
      loadReservations();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to cancel reservation.');
    }
  };

  const filteredReservations = reservations.filter(
    (r) => statusFilter === 'all' || r.status === statusFilter
  );

  // Selected room rate snapshot calculation
  const chosenRoom = availableRooms.find((r) => r.id === selectedRoomId);
  const nights = Math.max(1, Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)));
  const estimatedTotal = chosenRoom ? parseFloat(String(chosenRoom.category?.base_price || 0)) * nights : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reservations & Bookings</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage advance bookings, date overlap validation, rates snapshots, and guest arrival schedules.
          </p>
        </div>
        <button
          onClick={() => {
            setBookingError(null);
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Reservation</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm text-xs font-bold">
        {['all', 'confirmed', 'checked_in', 'checked_out', 'cancelled'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg capitalize transition ${
              statusFilter === st
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Reservations Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : filteredReservations.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No reservations found for this category.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 uppercase text-[10px] font-extrabold text-slate-400 tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Booking Code</th>
                  <th className="px-5 py-3.5">Guest</th>
                  <th className="px-5 py-3.5">Room</th>
                  <th className="px-5 py-3.5">Dates & Stay</th>
                  <th className="px-5 py-3.5">Rate & Total</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReservations.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5 font-bold font-mono text-blue-600">
                      {r.reservation_code}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">
                      {r.guest ? `${r.guest.first_name} ${r.guest.last_name}` : `Guest #${r.guest_id}`}
                      {r.special_requests && (
                        <p className="text-[10px] text-slate-400 italic font-normal line-clamp-1">
                          "{r.special_requests}"
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-1.5">
                        <BedDouble className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-bold text-slate-800">Room {r.room?.room_number || r.room_id}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{r.room?.category?.name}</span>
                    </td>
                    <td className="px-5 py-3.5 space-y-0.5">
                      <div className="font-medium text-slate-700">
                        {r.check_in_date} → {r.check_out_date}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {r.num_guests} guest(s)
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-900">₹{parseFloat(String(r.total_estimated_amount))}</span>
                      <p className="text-[10px] text-slate-400">₹{parseFloat(String(r.nightly_rate_snapshot))}/night</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={
                        r.status === 'confirmed' ? 'available' :
                        r.status === 'checked_in' ? 'occupied' :
                        r.status === 'checked_out' ? 'neutral' : 'maintenance'
                      }>
                        {r.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {r.status === 'confirmed' && (
                        <button
                          onClick={() => setCancellingResId(r.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-[11px] transition"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Reservation Modal (Workflow A) */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Room Reservation (Workflow A)">
        <form onSubmit={handleCreateReservation} className="space-y-4 text-xs">
          {bookingError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{bookingError}</span>
            </div>
          )}

          {/* Guest Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Select Guest *</label>
            <select
              value={selectedGuestId}
              onChange={(e) => setSelectedGuestId(parseInt(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 font-semibold"
            >
              {guests.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.first_name} {g.last_name} ({g.phone}) {g.vip_status ? '★ VIP' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Picker */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Check-In Date *</label>
              <input
                type="date"
                required
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Check-Out Date *</label>
              <input
                type="date"
                required
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Guests Count</label>
              <input
                type="number"
                min="1"
                max="6"
                value={numGuests}
                onChange={(e) => setNumGuests(parseInt(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Stay Duration</label>
              <div className="py-2 px-3 rounded-xl bg-slate-100 font-bold text-slate-700">
                {nights} night(s)
              </div>
            </div>
          </div>

          {/* Available Rooms Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Available Room *</label>
              {checkingAvailability && (
                <span className="text-[10px] text-blue-600 animate-pulse font-medium">Checking live availability...</span>
              )}
            </div>
            {availableRooms.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                No rooms available for these dates and guest capacity. Please select another date span.
              </div>
            ) : (
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(parseInt(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 font-semibold"
              >
                {availableRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_number} — {r.category?.name} (₹{parseFloat(String(r.category?.base_price))}/night)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Special Requests / Preferences</label>
            <input
              type="text"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="e.g. Extra pillows, high floor room, sea view"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          {/* Rate Breakdown */}
          {chosenRoom && (
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs flex items-center justify-between">
              <div>
                <p className="font-bold text-blue-900">Estimated Total Rate</p>
                <p className="text-[11px] text-blue-700">
                  ₹{parseFloat(String(chosenRoom.category?.base_price))} × {nights} night(s)
                </p>
              </div>
              <span className="text-base font-black text-blue-900">₹{estimatedTotal.toLocaleString('en-IN')}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={availableRooms.length === 0}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-md shadow-blue-600/20 disabled:opacity-50"
          >
            Confirm Reservation & Snapshot Rate
          </button>
        </form>
      </Modal>
      {/* Cancel Confirmation Modal */}
      {cancellingResId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Cancel Reservation?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to cancel this booking? The room will immediately be released back to available inventory.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancellingResId(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
