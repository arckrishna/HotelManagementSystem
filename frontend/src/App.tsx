import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './context/ToastContext';
import { AppLayout } from './layouts/AppLayout';

// Pages
import { Login } from './pages/auth/Login';
import { Dashboard } from './pages/dashboard/Dashboard';
import { RoomsPage } from './pages/rooms/RoomsPage';
import { ReservationsPage } from './pages/reservations/ReservationsPage';
import { CheckInOutPage } from './pages/stays/CheckInOutPage';
import { GuestsPage } from './pages/guests/GuestsPage';
import { RestaurantPage } from './pages/restaurant/RestaurantPage';
import { BarPage } from './pages/bar/BarPage';
import { MaintenancePage } from './pages/maintenance/MaintenancePage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { BillingPage } from './pages/billing/BillingPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { StaffPage } from './pages/staff/StaffPage';
import { GuestPortalPage } from './pages/portal/GuestPortalPage';
import { AuditPage } from './pages/audit/AuditPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs uppercase tracking-widest font-semibold text-slate-400">Authenticating StaySync...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Auth Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected Application Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="rooms" element={<RoomsPage />} />
                <Route path="reservations" element={<ReservationsPage />} />
                <Route path="check-in-out" element={<CheckInOutPage />} />
                <Route path="guests" element={<GuestsPage />} />
                <Route path="restaurant" element={<RestaurantPage />} />
                <Route path="bar" element={<BarPage />} />
                <Route path="maintenance" element={<MaintenancePage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="users" element={<StaffPage />} />
                <Route path="audit" element={<AuditPage />} />
                <Route path="guest-portal" element={<GuestPortalPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
