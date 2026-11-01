import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Sparkles, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth, DEMO_CREDENTIALS } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { Logo } from '../../components/Logo';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-amber-500 selection:text-slate-950 relative overflow-hidden">
      {/* Decorative luxury ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-600/10 via-amber-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="flex justify-center mb-2">
          <Logo size="xl" showSubtitle={true} theme="dark" />
        </div>
        <p className="mt-3 text-xs text-slate-400 font-medium tracking-wide">
          Enterprise Hospitality Platform • Rooms, Dining, Bar, Folios & Maintenance
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 py-8 px-6 shadow-2xl rounded-3xl sm:px-10 ring-1 ring-white/5">
          {error && (
            <div className="mb-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Username or Email</label>
              <input
                type="text"
                required
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                placeholder="admin@staysync.com"
                className="mt-1.5 block w-full rounded-xl bg-slate-800/70 border border-slate-700/80 px-3.5 py-2.5 text-white text-sm placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 block w-full rounded-xl bg-slate-800/70 border border-slate-700/80 px-3.5 py-2.5 text-white text-sm placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              <LogIn className="w-4 h-4 text-slate-950" />
              <span>{loading ? 'Authenticating...' : 'Sign In to StaySync'}</span>
            </button>
          </form>

          {/* Instant Role Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-800/80">
            <div className="flex items-center space-x-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <p className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Instant Role Switcher
              </p>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Click any of the 8 role profiles below to test instantly with pre-seeded accounts:
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin')}
                className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 hover:border-amber-500/50 border border-slate-700/70 text-left text-slate-200 transition"
              >
                <div className="font-bold text-amber-400">Admin / Manager</div>
                <div className="text-[10px] text-slate-400">Superuser privileges</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('receptionist')}
                className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 hover:border-indigo-400/50 border border-slate-700/70 text-left text-slate-200 transition"
              >
                <div className="font-bold text-indigo-400">Receptionist</div>
                <div className="text-[10px] text-slate-400">Check-in / Check-out</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('restaurant_staff')}
                className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 hover:border-emerald-400/50 border border-slate-700/70 text-left text-slate-200 transition"
              >
                <div className="font-bold text-emerald-400">Restaurant Staff</div>
                <div className="text-[10px] text-slate-400">Kitchen Display System</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('bar_staff')}
                className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 hover:border-purple-400/50 border border-slate-700/70 text-left text-slate-200 transition"
              >
                <div className="font-bold text-purple-400">Bar Staff</div>
                <div className="text-[10px] text-slate-400">Beverages & Lounge</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('maintenance_staff')}
                className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 hover:border-orange-400/50 border border-slate-700/70 text-left text-slate-200 transition"
              >
                <div className="font-bold text-orange-400">Maintenance</div>
                <div className="text-[10px] text-slate-400">Work Orders & Repairs</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('inventory_manager')}
                className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 hover:border-amber-400/50 border border-slate-700/70 text-left text-slate-200 transition"
              >
                <div className="font-bold text-amber-400">Inventory Mgr</div>
                <div className="text-[10px] text-slate-400">Stock & Alerts</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('accountant')}
                className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 hover:border-teal-400/50 border border-slate-700/70 text-left text-slate-200 transition"
              >
                <div className="font-bold text-teal-400">Accountant</div>
                <div className="text-[10px] text-slate-400">Folios & Payments</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('guest')}
                className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 hover:border-rose-400/50 border border-slate-700/70 text-left text-slate-200 transition"
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
