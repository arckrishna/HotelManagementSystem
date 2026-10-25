import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, BedDouble, CalendarCheck, Users, 
  UtensilsCrossed, Wine, Boxes, Wrench, Receipt, 
  BarChart3, UserCheck, ShieldAlert, Sparkles, LogIn
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'receptionist', 'accountant', 'restaurant_staff', 'bar_staff', 'maintenance_staff', 'inventory_manager'],
  },
  {
    name: 'Guest Portal',
    path: '/guest-portal',
    icon: Sparkles,
    roles: ['guest', 'admin'],
  },
  {
    name: 'Rooms & Grid',
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
    name: 'Check-In / Out',
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
    name: 'Restaurant Orders',
    path: '/restaurant',
    icon: UtensilsCrossed,
    roles: ['admin', 'restaurant_staff', 'receptionist'],
  },
  {
    name: 'Bar & Lounge',
    path: '/bar',
    icon: Wine,
    roles: ['admin', 'bar_staff', 'receptionist'],
  },
  {
    name: 'Inventory & Stock',
    path: '/inventory',
    icon: Boxes,
    roles: ['admin', 'inventory_manager', 'restaurant_staff', 'bar_staff', 'accountant'],
  },
  {
    name: 'Maintenance',
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
    name: 'Staff & Roles',
    path: '/users',
    icon: UserCheck,
    roles: ['admin'],
  },
  {
    name: 'Audit Trail',
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
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 min-h-screen">
      {/* Brand area */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-md">
            S
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-tight">StaySync</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Hospitality ERP</p>
          </div>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Operations
        </div>
        {allowedItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / System status */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>PostgreSQL Active</span>
        </div>
      </div>
    </aside>
  );
};
