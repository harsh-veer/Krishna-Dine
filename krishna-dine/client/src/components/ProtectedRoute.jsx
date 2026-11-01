import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { homeFor, useAuth } from '../context/AuthContext';
import { FullPageSpinner } from './ui';

/** Client-side guard for UX only. Every API call is authorised again on the server. */
export default function ProtectedRoute({ roles }) {
  const { user, loading, mustChangePassword } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageSpinner label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (mustChangePassword) return <Navigate to="/change-password" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return <Outlet />;
}
