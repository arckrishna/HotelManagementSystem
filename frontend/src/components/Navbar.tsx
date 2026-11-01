import React, { useState } from 'react';
import { Bell, LogOut, Sparkles, ChevronDown, CheckCircle } from 'lucide-react';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { UserRole } from '../types';
import { Logo } from './Logo';

export const Navbar: React.FC = () => {
  const { user, logout, loginAsDemoRole } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  const handleSwitchRole = async (role: UserRole) => {
    setShowRoleSwitcher(false);
    try {
      await loginAsDemoRole(role);
      window.location.reload();
    } catch (err) {
      console.error("Failed to switch demo role:", err);
    }
  };

  const roleLabels: Record<UserRole, string> = {
    admin: 'Hotel Admin / Manager',
    receptionist: 'Front Desk Receptionist',
    restaurant_staff: 'Restaurant Kitchen Staff',
    bar_staff: 'Bar & Lounge Staff',
    maintenance_staff: 'Maintenance Technician',
    inventory_manager: 'Inventory Manager',
    accountant: 'Finance / Accountant',
    guest: 'Guest (Priya Sharma)',
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-2.5 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left: Branding & Property Tag */}
        <div className="flex items-center space-x-4">
          <Logo size="sm" theme="light" showSubtitle={false} />

          <div className="hidden lg:flex items-center text-xs text-slate-500 pl-4 border-l border-slate-200 gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span className="font-semibold text-slate-800 tracking-wide">StaySync Grand Resort</span>
            <span className="text-slate-400 font-normal">• Mumbai Waterfront</span>
          </div>
        </div>

        {/* Right: Quick Role Switcher (for Evaluators!), Notifications, Profile */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Quick Demo Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold hover:bg-indigo-100 transition-colors"
              title="Switch demo user role for evaluation"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Role: {user ? roleLabels[user.role] : 'Guest'}</span>
              <span className="sm:hidden">{user?.role}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showRoleSwitcher && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Switch Demo Account</p>
                </div>
                {(Object.keys(DEMO_CREDENTIALS) as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleSwitchRole(r)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${
                      user?.role === r ? 'font-bold text-blue-700 bg-blue-50/50' : 'text-slate-700'
                    }`}
                  >
                    <span>{DEMO_CREDENTIALS[r].title}</span>
                    {user?.role === r && <CheckCircle className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white animate-ping" />
              )}
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markAsRead(n.id)}
                        className={`p-3.5 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${
                          !n.is_read ? 'bg-blue-50/40 font-medium' : 'text-slate-600'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <p className="font-semibold text-slate-900">{n.title}</p>
                          <span className="text-[10px] text-slate-400 ml-2">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 truncate max-w-[120px]">{user?.full_name}</p>
              <p className="text-[10px] font-semibold text-slate-500 uppercase">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
