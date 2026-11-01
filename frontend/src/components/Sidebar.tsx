import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BedDouble, CalendarCheck, Users, 
  UtensilsCrossed, Wine, Boxes, Wrench, Receipt, 
  BarChart3, UserCheck, ShieldAlert, Sparkles, LogIn, Hotel
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Logo } from './Logo';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    name: 'Executive Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'receptionist', 'accountant', 'restaurant_staff', 'bar_staff', 'maintenance_staff', 'inventory_manager'],
  },
  {
    name: 'Guest Concierge Portal',
    path: '/guest-portal',
    icon: Sparkles,
    roles: ['guest', 'admin'],
  },
  {
    name: 'Rooms & Grid Matrix',
    path: '/rooms',
    icon: BedDouble,
    roles: ['admin', 'receptionist', 'maintenance_staff'],
  },
  {
    name: 'Reservations',
    path: '/reservations',
    icon: CalendarCheck,
    roles: ['admin', 'receptionist', 'accountant'],
  },
  {
    name: 'Front Desk Check-In/Out',
    path: '/check-in-out',
    icon: LogIn,
    roles: ['admin', 'receptionist'],
  },
  {
    name: 'Guest Directory',
    path: '/guests',
    icon: Users,
    roles: ['admin', 'receptionist', 'accountant'],
  },
  {
    name: 'Restaurant POS & Kitchen',
    path: '/restaurant',
    icon: UtensilsCrossed,
    roles: ['admin', 'restaurant_staff', 'receptionist'],
  },
  {
    name: 'Bar & Lounge Tabs',
    path: '/bar',
    icon: Wine,
    roles: ['admin', 'bar_staff', 'receptionist'],
  },
  {
    name: 'Inventory & Supplies',
    path: '/inventory',
    icon: Boxes,
    roles: ['admin', 'inventory_manager', 'restaurant_staff', 'bar_staff', 'accountant'],
  },
  {
    name: 'Maintenance & Repairs',
    path: '/maintenance',
    icon: Wrench,
    roles: ['admin', 'maintenance_staff', 'receptionist'],
  },
  {
    name: 'Billing & Folios',
    path: '/billing',
    icon: Receipt,
    roles: ['admin', 'accountant', 'receptionist'],
  },
  {
    name: 'Analytics & Reports',
    path: '/reports',
    icon: BarChart3,
    roles: ['admin', 'accountant', 'inventory_manager'],
  },
  {
    name: 'Staff & Privileges',
    path: '/users',
    icon: UserCheck,
    roles: ['admin'],
  },
  {
    name: 'Security Audit Trail',
    path: '/audit',
    icon: ShieldAlert,
    roles: ['admin'],
  },
];

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  const allowedItems = NAV_ITEMS.filter((item) => {
    if (user.role === 'admin') return true;
    return item.roles.includes(user.role);
  });

  return (
    <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-900 shadow-2xl">
      {/* Brand area */}
      <div className="p-5 border-b border-slate-900 bg-slate-950/80">
        <Logo size="md" theme="dark" showSubtitle={true} />
      </div>

      {/* Property Badge */}
      <div className="px-5 py-3 border-b border-slate-900/60 bg-slate-900/40 flex items-center justify-between text-[11px]">
        <div className="flex items-center space-x-1.5 text-slate-400">
          <Hotel className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-slate-300 truncate max-w-[140px]">Grand Resort Suites</span>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          5-STAR
        </span>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          Hotel Operations
        </div>
        {allowedItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/15 to-transparent text-amber-300 border-l-2 border-amber-400 font-bold shadow-inner'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/70 font-medium'
                }`
              }
            >
              <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / System status */}
      <div className="p-4 border-t border-slate-900/80 bg-slate-950/60">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
            <span className="font-mono text-[11px] text-slate-300">System Online</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">v2.4.0</span>
        </div>
      </div>
    </aside>
  );
};
