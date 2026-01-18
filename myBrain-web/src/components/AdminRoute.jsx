import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { AccessDenied } from './FeatureGate';

/**
 * Route wrapper that requires admin role
 * Shows AccessDenied if user is authenticated but not admin
 * Redirects to login if not authenticated
 */
function AdminRoute({ children }) {
  const { isAuthenticated, isLoading, user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    return (
      <AccessDenied message="This area is restricted to administrators only. If you believe you should have access, please contact your system administrator." />
    );
  }

  return children;
}

export default AdminRoute;
