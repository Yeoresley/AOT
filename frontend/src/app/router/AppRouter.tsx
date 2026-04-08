import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { LoginPage } from '../../features/auth/LoginPage';
import { DashboardPage } from '../../features/dashboard/DashboardPage';
import { WorkOrdersPage } from '../../features/work-orders/WorkOrdersPage';
import { ClientsPage } from '../../features/masters/ClientsPage';
import { ReportsPage } from '../../features/reports/ReportsPage';

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
        <Route path="reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  );
}
