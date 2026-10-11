import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { LoginPage } from '../../features/auth/LoginPage';
import { DashboardPage } from '../../features/dashboard/DashboardPage';
import { WorkOrdersPage } from '../../features/work-orders/WorkOrdersPage';
import { CatalogsPage } from '../../features/masters/CatalogsPage';
import { ReportsPage } from '../../features/reports/ReportsPage';
import { InventoryPage } from '../../features/inventory/InventoryPage';
import { PurchasingPage } from '../../features/purchasing/PurchasingPage';
import { BillingPage } from '../../features/billing/BillingPage';
import { ReceivablesPage } from '../../features/receivables/ReceivablesPage';
import { ApprovalsPage } from '../../features/approvals/ApprovalsPage';
import { AnalyticsPage } from '../../features/analytics/AnalyticsPage';
import { ExternalPortalPage } from '../../features/external-portal/ExternalPortalPage';
import { useAuth } from '../../shared/auth/AuthContext';

function PrivateRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-8 text-slate-500">Verificando sesión...</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export function AppRouter() {
  const { user, loading } = useAuth();
  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? <div className="p-8 text-slate-500">Verificando sesión...</div> : user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="work-orders" element={<WorkOrdersPage />} />
        <Route path="catalogs" element={<CatalogsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="purchasing" element={<PurchasingPage />} />
        <Route path="billing" element={<BillingPage />} />
        <Route path="receivables" element={<ReceivablesPage />} />
        <Route path="approvals" element={<ApprovalsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="external-portal" element={<ExternalPortalPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  );
}
