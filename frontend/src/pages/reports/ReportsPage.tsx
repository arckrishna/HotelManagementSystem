import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Download, Calendar, TrendingUp, BedDouble, 
  UtensilsCrossed, Wine, Boxes, Wrench, IndianRupee, FileSpreadsheet, RefreshCw, Loader2 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { reportsApi } from '../../api/client';
import { DashboardStats } from '../../types';
import { useToast } from '../../context/ToastContext';

export const ReportsPage: React.FC = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesData, setSalesData] = useState<any>(null);
  const [occupancyData, setOccupancyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);

  // Date filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [kpiRes, salesRes, occRes] = await Promise.all([
        reportsApi.getDashboardKpis(),
        reportsApi.getSalesReport().catch(() => ({ data: null })),
        reportsApi.getOccupancyReport().catch(() => ({ data: null }))
      ]);
      setStats(kpiRes.data);
      setSalesData(salesRes.data);
      setOccupancyData(occRes.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleExport = async (reportType: string) => {
    try {
      setDownloadingType(reportType);
      toast.info(`Preparing ${reportType} export...`);
      await reportsApi.downloadReport(reportType);
      toast.success(`Successfully exported ${reportType} report to CSV!`);
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error('Failed to export CSV report. Please try again.');
    } finally {
      setDownloadingType(null);
    }
  };

  const revenueByDept = [
    { name: 'Room Bookings', amount: Number(stats?.total_room_revenue || 12000), color: '#3B82F6' },
    { name: 'Restaurant', amount: Number(stats?.total_restaurant_revenue || 830), color: '#F59E0B' },
    { name: 'Bar & Lounge', amount: Number(stats?.total_bar_revenue || 650), color: '#8B5CF6' },
  ];

  const occupancyBreakdown = occupancyData?.breakdown
    ? Object.keys(occupancyData.breakdown).map((cat) => ({
        name: cat,
        occupied: occupancyData.breakdown[cat].occupied,
        available: occupancyData.breakdown[cat].available,
        maintenance: occupancyData.breakdown[cat].maintenance,
      }))
    : [
        { name: 'Standard Single', occupied: 0, available: 2, maintenance: 0 },
        { name: 'Superior Double', occupied: 0, available: 3, maintenance: 0 },
        { name: 'Deluxe Room', occupied: 1, available: 2, maintenance: 1 },
        { name: 'Executive Suite', occupied: 0, available: 4, maintenance: 0 },
        { name: 'Presidential Suite', occupied: 0, available: 1, maintenance: 0 },
      ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center">
            <BarChart3 className="w-7 h-7 mr-2.5 text-blue-600" />
            Analytics & Executive Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Departmental audits, revenue reconciliation, room occupancy trends, and CSV data exports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadReports}
            className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Filter & Export Quick Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600 uppercase">Period:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Exports:</span>
          <button
            onClick={() => handleExport('rooms')}
            disabled={downloadingType === 'rooms'}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors flex items-center disabled:opacity-50"
          >
            {downloadingType === 'rooms' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-blue-600" />}
            Rooms CSV
          </button>
          <button
            onClick={() => handleExport('bills')}
            disabled={downloadingType === 'bills'}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors flex items-center disabled:opacity-50"
          >
            {downloadingType === 'bills' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />}
            Revenue & Bills CSV
          </button>
          <button
            onClick={() => handleExport('inventory')}
            disabled={downloadingType === 'inventory'}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors flex items-center disabled:opacity-50"
          >
            {downloadingType === 'inventory' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-amber-600" />}
            Inventory Stock CSV
          </button>
        </div>
      </div>

      {/* Top Level Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs uppercase font-bold tracking-wider">Gross Total Sales</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono">
            ₹{Number(stats?.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-emerald-600 font-medium mt-1">Across Room, Kitchen & Bar</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs uppercase font-bold tracking-wider">Hotel Occupancy</span>
            <BedDouble className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono">
            {stats?.occupancy_rate || 0}%
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {stats?.occupied_rooms || 0} occupied / {stats?.total_rooms || 16} keys
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs uppercase font-bold tracking-wider">F&B Total Volume</span>
            <UtensilsCrossed className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono">
            ₹{(Number(stats?.total_restaurant_revenue || 0) + Number(stats?.total_bar_revenue || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-amber-600 mt-1">Integrated POS billing</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs uppercase font-bold tracking-wider">Maintenance Uptime</span>
            <Wrench className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 font-mono">
            {Math.round(((16 - Number(stats?.maintenance_rooms || 1)) / 16) * 100)}%
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {stats?.maintenance_rooms || 1} room under maintenance
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Revenue Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">Revenue Breakdown by Department</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByDept}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip 
                  formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '8px', border: 'none' }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {revenueByDept.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Room Category Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">Room Availability & Occupancy by Suite</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={occupancyBreakdown}>
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', color: '#fff', borderRadius: '8px', border: 'none' }} />
                <Legend />
                <Bar dataKey="available" name="Available" stackId="a" fill="#10B981" />
                <Bar dataKey="occupied" name="Occupied" stackId="a" fill="#3B82F6" />
                <Bar dataKey="maintenance" name="Maintenance" stackId="a" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
