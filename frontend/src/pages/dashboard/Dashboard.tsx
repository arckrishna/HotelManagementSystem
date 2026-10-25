import React, { useEffect, useState } from 'react';
import { 
  BedDouble, CalendarCheck, UtensilsCrossed, Wine, 
  Wrench, AlertTriangle, IndianRupee, TrendingUp, 
  Boxes, CheckCircle, Clock, ArrowUpRight 
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend 
} from 'recharts';
import { StatCard } from '../../components/StatCard';
import { Badge } from '../../components/Badge';
import { reportsApi, maintenanceApi, inventoryApi, restaurantApi, barApi } from '../../api/client';
import { DashboardStats, RecentActivity, MaintenanceRequest, InventoryItem, Order } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Role specific states
  const [criticalMaintenance, setCriticalMaintenance] = useState<MaintenanceRequest[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [kitchenOrders, setKitchenOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (user?.role === 'guest') {
      navigate('/guest-portal');
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const [statsRes, actRes] = await Promise.all([
          reportsApi.getDashboardKpis(),
          reportsApi.getRecentActivities(),
        ]);
        setStats(statsRes.data);
        setActivities(actRes.data);

        // Additional alert feeds
        if (statsRes.data.critical_maintenance_requests > 0 || user?.role === 'maintenance_staff') {
          const mRes = await maintenanceApi.getRequests({ priority: 'critical' });
          setCriticalMaintenance(mRes.data);
        }

        if (statsRes.data.low_stock_items_count > 0 || user?.role === 'inventory_manager') {
          const invRes = await inventoryApi.getItems({ low_stock_only: true });
          setLowStockItems(invRes.data);
        }

        if (user?.role === 'restaurant_staff' || user?.role === 'admin') {
          const oRes = await restaurantApi.getOrders({ status: 'new' });
          setKitchenOrders(oRes.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Room status data for charts
  const roomStatusData = stats ? [
    { name: 'Available', value: stats.available_rooms, color: '#10b981' },
    { name: 'Occupied', value: stats.occupied_rooms, color: '#f43f5e' },
    { name: 'Reserved', value: stats.reserved_rooms, color: '#3b82f6' },
    { name: 'Cleaning', value: stats.cleaning_rooms, color: '#f59e0b' },
    { name: 'Maintenance', value: stats.maintenance_rooms, color: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  const financialData = stats ? [
    { name: 'Billed Revenue', amount: parseFloat(String(stats.total_billed_revenue)) },
    { name: 'Collected Cash/Card', amount: parseFloat(String(stats.total_collected_payments)) },
    { name: 'Outstanding Balance', amount: parseFloat(String(stats.total_outstanding_balance)) },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Hospitality Operational Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status across Hotel Rooms, Front Desk, Restaurant, Bar, Inventory, and Maintenance.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="available">System Online</Badge>
          <span className="text-xs font-semibold text-slate-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Critical System Alerts (BR-11, FR-50) */}
      {stats && stats.critical_maintenance_requests > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-sm flex items-start space-x-3.5">
          <div className="p-2 rounded-xl bg-rose-100 text-rose-700 flex-shrink-0 animate-bounce">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-rose-900">
                CRITICAL MAINTENANCE ALERT: {stats.critical_maintenance_requests} Issue(s) Requiring Immediate Attention
              </h4>
              <button 
                onClick={() => navigate('/maintenance')}
                className="text-xs font-bold text-rose-700 hover:text-rose-900 underline"
              >
                View Maintenance Desk →
              </button>
            </div>
            <p className="text-xs text-rose-700 mt-0.5">
              Impacted rooms have been automatically locked in Maintenance status to prevent reservation or guest allocation.
            </p>
          </div>
        </div>
      )}

      {/* Low Stock Alerts (BR-05, FR-49) */}
      {stats && stats.low_stock_items_count > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm flex items-start space-x-3.5">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-700 flex-shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-amber-900">
                LOW INVENTORY ALERT: {stats.low_stock_items_count} item(s) below threshold
              </h4>
              <button 
                onClick={() => navigate('/inventory')}
                className="text-xs font-bold text-amber-800 hover:text-amber-950 underline"
              >
                View Stock Catalog →
              </button>
            </div>
            <p className="text-xs text-amber-700 mt-0.5">
              Some menu ingredients and bar supplies are depleted. Restock to prevent menu item ordering rejections.
            </p>
          </div>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Room Occupancy"
          value={`${stats?.occupancy_rate || 0}%`}
          subtitle={`${stats?.occupied_rooms || 0} occupied of ${stats?.total_rooms || 0} rooms`}
          icon={BedDouble}
          color="brand"
        />
        <StatCard
          title="Active Reservations"
          value={stats?.active_reservations || 0}
          subtitle={`${stats?.pending_checkins_today || 0} check-ins, ${stats?.pending_checkouts_today || 0} check-outs today`}
          icon={CalendarCheck}
          color="emerald"
        />
        <StatCard
          title="F&B Active Orders"
          value={(stats?.active_restaurant_orders || 0) + (stats?.active_bar_orders || 0)}
          subtitle={`${stats?.active_restaurant_orders || 0} Kitchen, ${stats?.active_bar_orders || 0} Bar`}
          icon={UtensilsCrossed}
          color="amber"
        />
        <StatCard
          title="Total Billed Revenue"
          value={`₹${parseFloat(String(stats?.total_billed_revenue || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle={`₹${parseFloat(String(stats?.total_collected_payments || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} collected`}
          icon={IndianRupee}
          color="purple"
        />
      </div>

      {/* Charts & Graphs Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room Status Distribution (Donut Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Room Status Breakdown</h3>
          <p className="text-xs text-slate-500 mb-4">Live inventory of {stats?.total_rooms} hotel rooms</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roomStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {roomStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Flow (Bar Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Financial Reconciliation (SRS §13 & §15)</h3>
          <p className="text-xs text-slate-500 mb-4">Accurate separation of Billed Revenue, Cash/Card Collected, and Outstanding Folios</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip formatter={(value: any) => [`₹${parseFloat(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Amount']} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Operational Highlights & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Operational Shortcuts */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Quick Operational Actions</h3>
          <p className="text-xs text-slate-500 mb-3">Core hospitality workflows</p>
          
          <button
            onClick={() => navigate('/check-in-out')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200/80 hover:border-blue-200 text-left transition group"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 group-hover:text-blue-700">Check-In / Out Desk</p>
                <p className="text-[11px] text-slate-500">Perform guest arrivals & final folio settlement</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700" />
          </button>

          <button
            onClick={() => navigate('/restaurant')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/80 hover:border-emerald-200 text-left transition group"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">Kitchen Display & Orders</p>
                <p className="text-[11px] text-slate-500">Manage food tickets & room service delivery</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700" />
          </button>

          <button
            onClick={() => navigate('/maintenance')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-amber-50/60 border border-slate-200/80 hover:border-amber-200 text-left transition group"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 group-hover:text-amber-700">Maintenance Work Orders</p>
                <p className="text-[11px] text-slate-500">{stats?.open_maintenance_requests || 0} pending repair tasks</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700" />
          </button>

          <button
            onClick={() => navigate('/billing')}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-purple-50/60 border border-slate-200/80 hover:border-purple-200 text-left transition group"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                <IndianRupee className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 group-hover:text-purple-700">Folios & Payments</p>
                <p className="text-[11px] text-slate-500">Record payments (Cash, Card, UPI)</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-purple-700" />
          </button>
        </div>

        {/* Recent Audit Activities (SRS §21) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Operational Activities</h3>
              <p className="text-xs text-slate-500">Live database audit entries from staff actions</p>
            </div>
            <button
              onClick={() => navigate('/audit')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800"
            >
              Full Audit Trail →
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            {activities.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No recent activities logged.</p>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="py-2.5 flex items-start justify-between text-xs">
                  <div className="flex items-start space-x-2.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800">{act.title}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">{act.description}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap pl-2">
                    {act.timestamp}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
