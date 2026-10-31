import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance' | 'critical' | 'high' | 'medium' | 'low' | 'blue' | 'purple' | 'amber' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '' }) => {
  const styles: Record<string, string> = {
    available: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    occupied: 'bg-rose-50 text-rose-700 border-rose-200',
    reserved: 'bg-blue-50 text-blue-700 border-blue-200',
    cleaning: 'bg-amber-50 text-amber-700 border-amber-200',
    maintenance: 'bg-red-50 text-red-700 border-red-200',
    critical: 'bg-red-100 text-red-800 border-red-300 font-bold animate-pulse',
    high: 'bg-orange-50 text-orange-700 border-orange-200 font-semibold',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    low: 'bg-slate-100 text-slate-700 border-slate-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider ${styles[variant] || styles.neutral} ${className}`}>
      {children}
    </span>
  );
};
