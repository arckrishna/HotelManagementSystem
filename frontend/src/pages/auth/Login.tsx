import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Sparkles, Building2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth, DEMO_CREDENTIALS } from '../../context/AuthContext';
import { UserRole } from '../../types';

export const Login: React.FC = () => {
  const { login, loginAsDemoRole } = useAuth();
  const navigate = useNavigate();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(usernameOrEmail, password);
      if (user.role === 'guest') {
        navigate('/guest-portal');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to authenticate. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (role: UserRole) => {
    setError(null);
    setLoading(true);
    try {
      const user = await loginAsDemoRole(role);
      if (user.role === 'guest') {
        navigate('/guest-portal');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(`Demo login failed: ${err.message || 'Server error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 mx-auto flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-4">
          <Building2 className="w-7 h-7" />
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight">StaySync</h2>
        <p className="mt-1 text-sm text-slate-400">
          Integrated Hotel, Restaurant & Bar Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300">Username or Email</label>
              <input
                type="text"
                required
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="admin@staysync.com"
                className="mt-1.5 block w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 block w-full rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2.5 text-white text-sm placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Authenticating...' : 'Sign In to StaySync'}</span>
            </button>
          </form>

          {/* Quick Demo Accounts for College Evaluator */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center space-x-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Instant Role Switcher for Evaluation
              </p>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Click any of the 8 roles below to automatically sign in with seeded credentials:
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin')}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-blue-600/20 hover:border-blue-500 border border-slate-700 text-left text-slate-200 transition"
              >
                <div className="font-bold text-blue-400">Admin / Manager</div>
                <div className="text-[10px] text-slate-400">Superuser privileges</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('receptionist')}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-indigo-600/20 hover:border-indigo-500 border border-slate-700 text-left text-slate-200 transition"
              >
                <div className="font-bold text-indigo-400">Receptionist</div>
                <div className="text-[10px] text-slate-400">Check-in / Check-out</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('restaurant_staff')}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-emerald-600/20 hover:border-emerald-500 border border-slate-700 text-left text-slate-200 transition"
              >
                <div className="font-bold text-emerald-400">Restaurant Staff</div>
                <div className="text-[10px] text-slate-400">Kitchen Display System</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('bar_staff')}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-purple-600/20 hover:border-purple-500 border border-slate-700 text-left text-slate-200 transition"
              >
                <div className="font-bold text-purple-400">Bar Staff</div>
                <div className="text-[10px] text-slate-400">Beverages & Lounge</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('maintenance_staff')}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-orange-600/20 hover:border-orange-500 border border-slate-700 text-left text-slate-200 transition"
              >
                <div className="font-bold text-orange-400">Maintenance</div>
                <div className="text-[10px] text-slate-400">Work Orders & Repairs</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('inventory_manager')}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-amber-600/20 hover:border-amber-500 border border-slate-700 text-left text-slate-200 transition"
              >
                <div className="font-bold text-amber-400">Inventory Mgr</div>
                <div className="text-[10px] text-slate-400">Stock & Alerts</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('accountant')}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-teal-600/20 hover:border-teal-500 border border-slate-700 text-left text-slate-200 transition"
              >
                <div className="font-bold text-teal-400">Accountant</div>
                <div className="text-[10px] text-slate-400">Folios & Payments</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('guest')}
                className="p-2.5 rounded-lg bg-slate-800 hover:bg-rose-600/20 hover:border-rose-500 border border-slate-700 text-left text-slate-200 transition"
              >
                <div className="font-bold text-rose-400">Guest Portal</div>
                <div className="text-[10px] text-slate-400">Priya Sharma (VIP)</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
