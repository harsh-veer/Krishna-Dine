import { lazy, Suspense } from 'react';
import { useAuth } from './context/AuthContext';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { FullPageSpinner } from './components/ui';
import MenuPage from './pages/customer/MenuPage';
import WaiterOrdersPage from './pages/waiter/WaiterOrdersPage';
import WaiterOrderPage from './pages/waiter/WaiterOrderPage';
import WaiterEditor from './pages/waiter/WaiterEditor';
import TablePickerPage from './pages/customer/TablePickerPage';
import OrderStatusPage from './pages/customer/OrderStatusPage';
import LandingPage from './pages/customer/LandingPage';

// Staff screens are code-split so the customer menu stays small and fast on mobile data.
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const ChangePasswordPage = lazy(() => import('./pages/auth/ChangePasswordPage'));
const KitchenPage = lazy(() => import('./pages/kitchen/KitchenPage'));
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const OrdersPage = lazy(() => import('./pages/admin/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/admin/OrderDetailPage'));
const OrderEditorPage = lazy(() => import('./pages/admin/OrderEditorPage'));
const InvoicePage = lazy(() => import('./pages/admin/InvoicePage'));
const AdminMenuPage = lazy(() => import('./pages/admin/MenuPage'));
const TablesPage = lazy(() => import('./pages/admin/TablesPage'));
const QrPrintPage = lazy(() => import('./pages/admin/QrPrintPage'));
const StaffPage = lazy(() => import('./pages/admin/StaffPage'));
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'));

function OwnerOnly({ children }) {
  const { user } = useAuth();
  return user?.isOwner ? children : <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<FullPageSpinner />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/menu" element={<TablePickerPage />} />
            <Route path="/menu/:token" element={<MenuPage />} />
            <Route path="/order/:orderId" element={<OrderStatusPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />

            <Route element={<ProtectedRoute roles={['admin', 'kitchen']} />}>
              <Route path="/kitchen" element={<KitchenPage />} />
            </Route>

            <Route element={<ProtectedRoute roles={['waiter']} />}>
              <Route path="/waiter" element={<WaiterOrdersPage />} />
              <Route path="/waiter/orders/new" element={<WaiterEditor mode="new" />} />
              <Route path="/waiter/orders/:id" element={<WaiterOrderPage />} />
              <Route path="/waiter/orders/:id/edit" element={<WaiterEditor mode="edit" />} />
            </Route>

            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="/admin/orders/:id/invoice" element={<InvoicePage />} />
              <Route path="/admin/tables/print" element={<QrPrintPage />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="orders/new" element={<OrderEditorPage mode="new" />} />
                <Route path="orders/:id" element={<OrderDetailPage />} />
                <Route path="orders/:id/edit" element={<OrderEditorPage mode="edit" />} />
                <Route path="menu" element={<AdminMenuPage />} />
                <Route path="tables" element={<TablesPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="staff" element={<OwnerOnly><StaffPage /></OwnerOnly>} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <Toaster position="top-center" toastOptions={{ duration: 3500, style: { borderRadius: '14px', fontWeight: 600, fontSize: '14px' }, success: { iconTheme: { primary: '#1F6B4A', secondary: '#fff' } } }} />
      </AuthProvider>
    </BrowserRouter>
  );
}
