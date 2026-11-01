import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { 
  Wrench, Plus, Filter, AlertTriangle, CheckCircle2, 
  Clock, UserCheck, ShieldAlert, BedDouble, Search, ChevronRight 
} from 'lucide-react';
import { maintenanceApi, roomsApi, usersApi } from '../../api/client';
import { MaintenanceRequest, Room, User } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';

export const MaintenancePage: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [search, setSearch] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<MaintenanceRequest | null>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationDesc, setLocationDesc] = useState('');
  const [roomId, setRoomId] = useState<number | undefined>(undefined);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [assigneeId, setAssigneeId] = useState<number | undefined>(undefined);
  const [newStatus, setNewStatus] = useState<string>('in_progress');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [maintRes, roomRes, techRes] = await Promise.all([
        maintenanceApi.getRequests(),
        roomsApi.getRooms(),
        usersApi.getTechnicians().catch(() => ({ data: [] }))
      ]);
      setRequests(maintRes.data);
      setRooms(roomRes.data);
      setTechnicians(techRes.data);
      if (techRes.data.length > 0) {
        setAssigneeId(techRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load maintenance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await maintenanceApi.createRequest({
        title,
        description,
        location_description: locationDesc || (roomId ? `Room ${rooms.find(r => r.id === roomId)?.room_number}` : 'Main Facility'),
        room_id: roomId || undefined,
        priority
      });
      setIsCreateOpen(false);
      setTitle('');
      setDescription('');
      setLocationDesc('');
      setRoomId(undefined);
      setPriority('medium');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to submit maintenance request.');
    }
  };

  const handleAssignTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !assigneeId) return;
    try {
      await maintenanceApi.assignTechnician(selectedReq.id, assigneeId);
      setIsAssignOpen(false);
      setSelectedReq(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to assign technician.');
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;
    try {
      await maintenanceApi.updateStatus(selectedReq.id, {
        status: newStatus,
        resolution_notes: resolutionNotes || undefined
      });
      setIsStatusOpen(false);
      setSelectedReq(null);
      setResolutionNotes('');
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update request status.');
    }
  };

  const filtered = requests.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
    if (assignedToMe && r.assigned_to_user_id !== user?.id) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.location_description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'critical':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"><ShieldAlert className="w-3 h-3 mr-1" /> CRITICAL</span>;
      case 'high':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">High</span>;
      case 'medium':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">Medium</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">Low</span>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'open':
        return <Badge variant="warning">Pending</Badge>;
      case 'assigned':
        return <Badge variant="info">Assigned</Badge>;
      case 'in_progress':
        return <Badge variant="purple">In Progress</Badge>;
      case 'resolved':
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      default:
        return <Badge variant="neutral">{s}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <Wrench className="w-7 h-7 mr-2.5 text-blue-600" />
            Maintenance & Housekeeping
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track equipment repairs, room service tickets, and assign housekeeping tasks
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Report New Issue
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Tickets</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{requests.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/30 shadow-sm">
          <p className="text-xs text-amber-700 font-medium uppercase tracking-wider">Pending / Open</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{requests.filter(r => r.status === 'open').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/30 shadow-sm">
          <p className="text-xs text-rose-700 font-medium uppercase tracking-wider">Critical Priority</p>
          <p className="text-2xl font-bold text-rose-700 mt-1">{requests.filter(r => r.priority === 'critical' && r.status !== 'resolved').length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
          <p className="text-xs text-emerald-700 font-medium uppercase tracking-wider">Resolved</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{requests.filter(r => r.status === 'resolved').length}</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search issue or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="open">Pending / Open</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Completed / Resolved</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs font-medium px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {user?.role === 'maintenance_staff' && (
            <button
              onClick={() => setAssignedToMe(!assignedToMe)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                assignedToMe
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Assigned to Me
            </button>
          )}
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading maintenance records...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No active maintenance issues found</p>
            <p className="text-xs text-slate-400 mt-1">All rooms and facilities are in optimal operating condition.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((req) => (
              <div key={req.id} className="p-4 sm:p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-400">#{req.id}</span>
                    {getPriorityBadge(req.priority)}
                    {getStatusBadge(req.status)}
                    <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded">
                      {req.location_description}
                    </span>
                    {req.room && (
                      <span className="text-xs text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        Room {req.room.room_number}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-base">{req.title}</h3>
                  <p className="text-sm text-slate-600">{req.description}</p>

                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                    <span>Reported: {new Date(req.created_at).toLocaleDateString()}</span>
                    {req.assigned_to && (
                      <span className="text-indigo-600 font-medium flex items-center">
                        <UserCheck className="w-3.5 h-3.5 mr-1" />
                        Technician: {req.assigned_to.full_name}
                      </span>
                    )}
                    {req.resolution_notes && (
                      <span className="text-emerald-600">Note: {req.resolution_notes}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  {(user?.role === 'admin' || user?.role === 'receptionist') && req.status !== 'resolved' && (
                    <button
                      onClick={() => {
                        setSelectedReq(req);
                        setIsAssignOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                    >
                      Assign Staff
                    </button>
                  )}

                  {req.status !== 'resolved' && (
                    <button
                      onClick={() => {
                        setSelectedReq(req);
                        setNewStatus(req.status === 'open' ? 'in_progress' : 'resolved');
                        setIsStatusOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    >
                      Update Status
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Report New Issue */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Report Maintenance / Housekeeping Issue">
        <form onSubmit={handleCreateRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Issue Title</label>
            <input
              type="text"
              required
              placeholder="e.g. AC leaking, Bathroom plumbing, Deep clean requested"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Room (Optional)</label>
              <select
                value={roomId || ''}
                onChange={(e) => setRoomId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">General Facility (No Room)</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>Room {r.room_number} (Floor {r.floor})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Priority Level</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low - Routine</option>
                <option value="medium">Medium - Standard Repair</option>
                <option value="high">High - Disruptive Issue</option>
                <option value="critical">Critical - Lock Room Out of Service</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Specific Location Description</label>
            <input
              type="text"
              placeholder="e.g. Master bathroom faucet, Lobby elevators, Floor 3 hallway"
              value={locationDesc}
              onChange={(e) => setLocationDesc(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Detailed Description</label>
            <textarea
              required
              rows={3}
              placeholder="Provide context on the nature of the issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm"
            >
              Submit Ticket
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Assign Staff */}
      <Modal isOpen={isAssignOpen} onClose={() => setIsAssignOpen(false)} title="Assign Technician">
        <form onSubmit={handleAssignTechnician} className="space-y-4">
          <p className="text-sm text-slate-600">
            Assign <strong className="text-slate-900">{selectedReq?.title}</strong> to a qualified maintenance technician or housekeeper:
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Technician</label>
            <select
              value={assigneeId || ''}
              onChange={(e) => setAssigneeId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {technicians.map(t => (
                <option key={t.id} value={t.id}>{t.full_name} ({t.username})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAssignOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm"
            >
              Confirm Assignment
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Update Status */}
      <Modal isOpen={isStatusOpen} onClose={() => setIsStatusOpen(false)} title="Update Ticket Status">
        <form onSubmit={handleUpdateStatus} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">New Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="in_progress">In Progress</option>
              <option value="resolved">Completed / Resolved</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Resolution Notes</label>
            <textarea
              rows={3}
              placeholder="e.g. Thermostat replaced, tested cold airflow, filters vacuumed."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsStatusOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm"
            >
              Save Resolution
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
