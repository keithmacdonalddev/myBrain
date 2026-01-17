import { useEffect, Suspense, lazy } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import store from '../store';
import { checkAuth } from '../store/authSlice';
import { initializeTheme } from '../store/themeSlice';
import ProtectedRoute from '../components/ProtectedRoute';
import AppShell from '../components/layout/AppShell';
import ToastContainer from '../components/ui/ToastContainer';

// Auth Pages (not lazy loaded - needed immediately)
import LoginPage from '../features/auth/LoginPage';
import SignupPage from '../features/auth/SignupPage';

// Lazy load feature routes
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'));
const NotesRoutes = lazy(() => import('../features/notes/routes'));
const FitnessRoutes = lazy(() => import('../features/fitness/routes'));
const KnowledgeBaseRoutes = lazy(() => import('../features/kb/routes'));
const MessagesRoutes = lazy(() => import('../features/messages/routes'));

// Profile & Settings
const ProfilePage = lazy(() => import('../features/profile/ProfilePage'));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage'));

// Admin routes
const AdminLogsPage = lazy(() => import('../features/admin/AdminLogsPage'));
const AdminUsersPage = lazy(() => import('../features/admin/AdminUsersPage'));
const AdminAreasPage = lazy(() => import('../features/admin/AdminAreasPage'));

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted text-sm">Loading...</p>
      </div>
    </div>
  );
}

// App initializer component
function AppInitializer({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(checkAuth());
    dispatch(initializeTheme());
  }, [dispatch]);

  return children;
}

// Main App component
function AppContent() {
  return (
    <AppInitializer>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected routes with AppShell */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route
            index
            element={
              <Suspense fallback={<PageLoader />}>
                <DashboardPage />
              </Suspense>
            }
          />

          {/* Feature routes */}
          <Route
            path="notes/*"
            element={
              <Suspense fallback={<PageLoader />}>
                <NotesRoutes />
              </Suspense>
            }
          />
          <Route
            path="fitness/*"
            element={
              <Suspense fallback={<PageLoader />}>
                <FitnessRoutes />
              </Suspense>
            }
          />
          <Route
            path="kb/*"
            element={
              <Suspense fallback={<PageLoader />}>
                <KnowledgeBaseRoutes />
              </Suspense>
            }
          />
          <Route
            path="messages/*"
            element={
              <Suspense fallback={<PageLoader />}>
                <MessagesRoutes />
              </Suspense>
            }
          />

          {/* Profile */}
          <Route
            path="profile"
            element={
              <Suspense fallback={<PageLoader />}>
                <ProfilePage />
              </Suspense>
            }
          />

          {/* Settings */}
          <Route
            path="settings"
            element={
              <Suspense fallback={<PageLoader />}>
                <SettingsPage />
              </Suspense>
            }
          />
        </Route>

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <div className="p-6">
                <h1 className="text-2xl font-bold text-text mb-4">Admin Panel</h1>
                <p className="text-muted mb-4">Welcome to the admin panel.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl">
                  <a href="/admin/logs" className="p-4 bg-panel border border-border rounded-lg hover:border-primary/50 transition-colors">
                    <h3 className="font-medium text-text">Request Logs</h3>
                    <p className="text-sm text-muted">View and search API request logs</p>
                  </a>
                  <a href="/admin/users" className="p-4 bg-panel border border-border rounded-lg hover:border-primary/50 transition-colors">
                    <h3 className="font-medium text-text">Users</h3>
                    <p className="text-sm text-muted">Manage users and feature flags</p>
                  </a>
                  <a href="/admin/areas" className="p-4 bg-panel border border-border rounded-lg hover:border-primary/50 transition-colors">
                    <h3 className="font-medium text-text">Areas</h3>
                    <p className="text-sm text-muted">Manage sidebar areas and features</p>
                  </a>
                </div>
              </div>
            }
          />
          <Route
            path="logs"
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminLogsPage />
              </Suspense>
            }
          />
          <Route
            path="users"
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminUsersPage />
              </Suspense>
            }
          />
          <Route
            path="areas"
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminAreasPage />
              </Suspense>
            }
          />
        </Route>

        {/* Redirect root to app (will redirect to login if not authenticated) */}
        <Route path="/" element={<Navigate to="/app" replace />} />

        {/* 404 - redirect to app */}
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
      <ToastContainer />
    </AppInitializer>
  );
}

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
