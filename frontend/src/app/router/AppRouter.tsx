import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { LoginPage } from '../../features/auth/LoginPage';
import { DashboardPage } from '../../features/dashboard/DashboardPage';
import { WorkOrdersPage } from '../../features/work-orders/WorkOrdersPage';
import { ClientsPage } from '../../features/masters/ClientsPage';
import { ReportsPage } from '../../features/reports/ReportsPage';
import { InventoryPage } from '../../features/inventory/InventoryPage';
import { PurchasingPage } from '../../features/purchasing/PurchasingPage';
import { BillingPage } from '../../features/billing/BillingPage';
import { ReceivablesPage } from '../../features/receivables/ReceivablesPage';
import { ApprovalsPage } from '../../features/approvals/ApprovalsPage';
import { AnalyticsPage } from '../../features/analytics/AnalyticsPage';
import { ExternalPortalPage } from '../../features/external-portal/ExternalPortalPage';

const isAuthenticated = true;

function PrivateRoute({ children }: { children: JSX.Element }) {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
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
        <Route path="masters/clients" element={<ClientsPage />} />
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
