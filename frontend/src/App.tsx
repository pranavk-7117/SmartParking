import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LiveDataProvider } from './context/LiveDataContext';
import { ToastProvider } from './context/ToastContext';
import { DashboardLayout } from './components/layout/DashboardLayout';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { SiteDetails } from './pages/SiteDetails';
import { SlotManagement } from './pages/SlotManagement';
import { SlotDetail } from './pages/SlotDetail';
import { RateConfiguration } from './pages/RateConfiguration';
import { SessionHistory } from './pages/SessionHistory';
import { SessionDetail } from './pages/SessionDetail';
import { ReceiptPage } from './pages/ReceiptPage';
import { Reports } from './pages/Reports';
import { OperatorManagement } from './pages/OperatorManagement';
import { OperatorProfile } from './pages/OperatorProfile';
import { Settings } from './pages/Settings';
import { KioskDisplay } from './pages/KioskDisplay';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <LiveDataProvider>
            <Routes>
              {/* Public Standalone Fullscreen Kiosk Route per §3.13 */}
              <Route path="/display" element={<KioskDisplay />} />

              {/* Login Route per §3.1 */}
              <Route path="/login" element={<Login />} />

              {/* Authenticated Dashboard Shell */}
              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                
                {/* Site Details (Reached via Header Site Switcher per §3.10) */}
                <Route path="sites/:siteId" element={<SiteDetails />} />

                {/* Slot Management & Dedicated Slot Detail per §3.3 & §3.4 */}
                <Route path="slots" element={<SlotManagement />} />
                <Route path="slots/:slotId" element={<SlotDetail />} />

                {/* Rates */}
                <Route path="rates" element={<RateConfiguration />} />

                {/* Sessions, Session Detail, and Dedicated Receipt per §3.6, §3.7 */}
                <Route path="sessions" element={<SessionHistory />} />
                <Route path="sessions/:id" element={<SessionDetail />} />
                <Route path="sessions/:id/receipt" element={<ReceiptPage />} />

                {/* Reports (with Transactions tab) per §3.8 */}
                <Route path="reports" element={<Reports />} />

                {/* Operator Management & Operator Profile per §3.9 */}
                <Route path="operators" element={<OperatorManagement />} />
                <Route path="operators/:operatorId" element={<OperatorProfile />} />
                {/* Backward compatibility redirect for old /users route */}
                <Route path="users" element={<Navigate to="/operators" replace />} />

                {/* Settings (with Add New Site sub-section) per §3.11 */}
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </LiveDataProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
