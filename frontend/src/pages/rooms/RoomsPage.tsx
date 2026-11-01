import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { BedDouble, Plus, Filter, CheckCircle2, AlertOctagon, Sparkles, Layers, Info } from 'lucide-react';
import { roomsApi } from '../../api/client';
import { Room, RoomCategory, RoomStatus } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';

export const RoomsPage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [floorFilter, setFloorFilter] = useState<string>('all');

  // Modals
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // New room form state
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newCategoryId, setNewCategoryId] = useState<number>(1);
  const [newFloor, setNewFloor] = useState<number>(1);

  // Status update state
  const [targetStatus, setTargetStatus] = useState<RoomStatus>('available');
  const [statusNotes, setStatusNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [roomsRes, catRes] = await Promise.all([
        roomsApi.getRooms(),
        roomsApi.getCategories()
      ]);
      setRooms(roomsRes.data);
      setCategories(catRes.data);
      if (catRes.data.length > 0) {
        setNewCategoryId(catRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await roomsApi.createRoom({
        room_number: newRoomNumber,
        category_id: newCategoryId,
        floor: newFloor,
        status: 'available',
      });
      setIsAddModalOpen(false);
      setNewRoomNumber('');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to add room.');
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    try {
      await roomsApi.updateRoom(selectedRoom.id, {
        status: targetStatus,
        notes: statusNotes || undefined,
      });
      setIsStatusModalOpen(false);
      setSelectedRoom(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update status.');
    }
  };

  const filteredRooms = rooms.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesFloor = floorFilter === 'all' || r.floor === parseInt(floorFilter);
    return matchesStatus && matchesFloor;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Hotel Rooms & Availability</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status grid, housekeeping turnover, and room safety management.
          </p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Room</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>Status:</span>
          </div>
          {['all', 'available', 'occupied', 'reserved', 'cleaning', 'maintenance'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition capitalize ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="font-semibold text-slate-600">Floor:</span>
          <select
            value={floorFilter}
            onChange={(e) => setFloorFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none"
          >
            <option value="all">All Floors</option>
            <option value="1">Floor 1</option>
            <option value="2">Floor 2</option>
            <option value="3">Floor 3</option>
            <option value="4">Floor 4</option>
          </select>
        </div>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-500">
          <BedDouble className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold">No rooms match the selected filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredRooms.map((room) => {
            const isClickable = ['admin', 'receptionist', 'maintenance_staff'].includes(user?.role || '');
            return (
              <div
                key={room.id}
                onClick={() => {
                  if (isClickable) {
                    setSelectedRoom(room);
                    setTargetStatus(room.status);
                    setIsStatusModalOpen(true);
                  }
                }}
                className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition cursor-pointer relative group ${
                  room.status === 'occupied' ? 'border-rose-200/80 bg-rose-50/10' :
                  room.status === 'available' ? 'border-emerald-200/80' :
                  room.status === 'maintenance' ? 'border-red-300 bg-red-50/20' :
                  room.status === 'cleaning' ? 'border-amber-200 bg-amber-50/20' : 'border-blue-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition">
                      Room {room.room_number}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">F{room.floor}</span>
                  </div>
                  <Badge variant={room.status as any}>{room.status}</Badge>
                </div>

                <p className="text-xs font-bold text-slate-700">{room.category?.name || 'Standard'}</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">{room.category?.amenities}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-slate-900">₹{parseFloat(String(room.category?.base_price || 0))}</span>
                    <span className="text-[10px] text-slate-400"> / night</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">
                    Max: {room.category?.max_capacity} guests
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Room Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Hotel Room">
        <form onSubmit={handleCreateRoom} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Room Number</label>
            <input
              type="text"
              required
              value={newRoomNumber}
              onChange={(e) => setNewRoomNumber(e.target.value)}
              placeholder="e.g. 501"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Room Category</label>
            <select
              value={newCategoryId}
              onChange={(e) => setNewCategoryId(parseInt(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — ₹{parseFloat(String(c.base_price))}/night (Capacity: {c.max_capacity})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Floor Number</label>
            <input
              type="number"
              min="1"
              max="20"
              required
              value={newFloor}
              onChange={(e) => setNewFloor(parseInt(e.target.value))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-md shadow-blue-600/20"
          >
            Create Room
          </button>
        </form>
      </Modal>

      {/* Quick Status Change Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => {
          setIsStatusModalOpen(false);
          setSelectedRoom(null);
        }}
        title={`Manage Room ${selectedRoom?.room_number}`}
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Current Status</label>
            <div className="mb-2">
              <Badge variant={selectedRoom?.status as any}>{selectedRoom?.status}</Badge>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Change Operational Status</label>
            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as RoomStatus)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 font-semibold"
            >
              <option value="available">Available (Ready for allocation)</option>
              <option value="cleaning">Cleaning (Housekeeping turnaround)</option>
              <option value="maintenance">Maintenance (Safety lock - Not bookable)</option>
              <option value="occupied">Occupied</option>
              <option value="reserved">Reserved</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Housekeeping / Operational Notes</label>
            <textarea
              rows={2}
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder="e.g. Linens replaced, bathroom sanitized."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-md shadow-blue-600/20"
            >
              Update Room Status
            </button>
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
