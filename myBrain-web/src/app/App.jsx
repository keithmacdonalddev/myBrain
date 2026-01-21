import { useEffect, Suspense, lazy } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import store from '../store';
import { checkAuth } from '../store/authSlice';
import { initializeTheme } from '../store/themeSlice';
import { TooltipsProvider } from '../contexts/TooltipsContext';
import { WebSocketProvider } from '../hooks/useWebSocket.jsx';
import ProtectedRoute from '../components/ProtectedRoute';
import AdminRoute from '../components/AdminRoute';
import AppShell from '../components/layout/AppShell';
import ToastContainer from '../components/ui/ToastContainer';
import FeatureGate, { ComingSoon, FeatureNotEnabled } from '../components/FeatureGate';

// Auth Pages (not lazy loaded - needed immediately)
import LoginPage from '../features/auth/LoginPage';
import SignupPage from '../features/auth/SignupPage';

// Lazy load feature routes
const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'));
const NotesRoutes = lazy(() => import('../features/notes/routes'));
const TasksRoutes = lazy(() => import('../features/tasks/routes'));
const InboxPage = lazy(() => import('../features/inbox/InboxPage'));
const TodayPage = lazy(() => import('../features/today/TodayPage'));
const FitnessRoutes = lazy(() => import('../features/fitness/routes'));
const KnowledgeBaseRoutes = lazy(() => import('../features/kb/routes'));
const MessagesRoutes = lazy(() => import('../features/messages/routes'));
const ImagesRoutes = lazy(() => import('../features/images/routes'));
const FilesRoutes = lazy(() => import('../features/files/routes'));
const CalendarRoutes = lazy(() => import('../features/calendar/routes'));
const ProjectsRoutes = lazy(() => import('../features/projects/routes'));
const ConnectionsPage = lazy(() => import('../features/social/pages/ConnectionsPage'));
const UserProfilePage = lazy(() => import('../features/social/pages/UserProfilePage'));
const SharedWithMePage = lazy(() => import('../features/social/pages/SharedWithMePage'));
const MessagesPage = lazy(() => import('../features/messages/pages/MessagesPage'));
const NotificationsPage = lazy(() => import('../features/notifications/pages/NotificationsPage'));

// Profile & Settings
const ProfilePage = lazy(() => import('../features/profile/ProfilePage'));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage'));

// Admin routes
const AdminInboxPage = lazy(() => import('../features/admin/AdminInboxPage'));
const AdminLogsPage = lazy(() => import('../features/admin/AdminLogsPage'));
const AdminUsersPage = lazy(() => import('../features/admin/AdminUsersPage'));
const AdminRolesPage = lazy(() => import('../features/admin/AdminRolesPage'));
const AdminSidebarPage = lazy(() => import('../features/admin/AdminSidebarPage'));
const AdminAnalyticsPage = lazy(() => import('../features/admin/AdminAnalyticsPage'));
const AdminDatabasePage = lazy(() => import('../features/admin/AdminDatabasePage'));
const AdminSystemPage = lazy(() => import('../features/admin/AdminSystemPage'));
const AdminReportsPage = lazy(() => import('../features/admin/AdminReportsPage'));
const AdminSocialDashboardPage = lazy(() => import('../features/admin/AdminSocialDashboardPage'));

// Error pages
import NotFound from '../components/NotFound';

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
            path="today"
            element={
              <Suspense fallback={<PageLoader />}>
                <TodayPage />
              </Suspense>
            }
          />
          <Route
            path="inbox"
            element={
              <Suspense fallback={<PageLoader />}>
                <InboxPage />
              </Suspense>
            }
          />
          {/* Optional Features - controlled by feature flags */}
          <Route
            path="calendar/*"
            element={
              <FeatureGate flag="calendarEnabled" fallback={<FeatureNotEnabled featureName="Calendar" />}>
                <Suspense fallback={<PageLoader />}>
                  <CalendarRoutes />
                </Suspense>
              </FeatureGate>
            }
          />
          <Route
            path="tasks/*"
            element={
              <Suspense fallback={<PageLoader />}>
                <TasksRoutes />
              </Suspense>
            }
          />
          <Route
            path="notes/*"
            element={
              <Suspense fallback={<PageLoader />}>
                <NotesRoutes />
              </Suspense>
            }
          />
          <Route
            path="images/*"
            element={
              <FeatureGate flag="imagesEnabled" fallback={<FeatureNotEnabled featureName="Images" />}>
                <Suspense fallback={<PageLoader />}>
                  <ImagesRoutes />
                </Suspense>
              </FeatureGate>
            }
          />
          <Route
            path="files/*"
            element={
              <FeatureGate flag="filesEnabled" fallback={<FeatureNotEnabled featureName="Files" />}>
                <Suspense fallback={<PageLoader />}>
                  <FilesRoutes />
                </Suspense>
              </FeatureGate>
            }
          />
          <Route
            path="projects/*"
            element={
              <FeatureGate flag="projectsEnabled" fallback={<FeatureNotEnabled featureName="Projects" />}>
                <Suspense fallback={<PageLoader />}>
                  <ProjectsRoutes />
                </Suspense>
              </FeatureGate>
            }
          />
          {/* Coming Soon / Beta Features - controlled by feature flags */}
          <Route
            path="fitness/*"
            element={
              <FeatureGate flag="fitnessEnabled" fallback={<ComingSoon featureName="Fitness tracking" />}>
                <Suspense fallback={<PageLoader />}>
                  <FitnessRoutes />
                </Suspense>
              </FeatureGate>
            }
          />
          <Route
            path="kb/*"
            element={
              <FeatureGate flag="kbEnabled" fallback={<ComingSoon featureName="Knowledge Base" />}>
                <Suspense fallback={<PageLoader />}>
                  <KnowledgeBaseRoutes />
                </Suspense>
              </FeatureGate>
            }
          />
          <Route
            path="messages/*"
            element={
              <FeatureGate flag="socialEnabled" fallback={<FeatureNotEnabled featureName="Messages" />}>
                <Suspense fallback={<PageLoader />}>
                  <MessagesPage />
                </Suspense>
              </FeatureGate>
            }
          />

          {/* Notifications */}
          <Route
            path="notifications"
            element={
              <FeatureGate flag="socialEnabled" fallback={<FeatureNotEnabled featureName="Notifications" />}>
                <Suspense fallback={<PageLoader />}>
                  <NotificationsPage />
                </Suspense>
              </FeatureGate>
            }
          />

          {/* Social - Connections */}
          <Route
            path="social/connections"
            element={
              <FeatureGate flag="socialEnabled" fallback={<FeatureNotEnabled featureName="Social" />}>
                <Suspense fallback={<PageLoader />}>
                  <ConnectionsPage />
                </Suspense>
              </FeatureGate>
            }
          />
          <Route
            path="social/profile/:userId"
            element={
              <FeatureGate flag="socialEnabled" fallback={<FeatureNotEnabled featureName="Social" />}>
                <Suspense fallback={<PageLoader />}>
                  <UserProfilePage />
                </Suspense>
              </FeatureGate>
            }
          />
          <Route
            path="social/shared"
            element={
              <FeatureGate flag="socialEnabled" fallback={<FeatureNotEnabled featureName="Social" />}>
                <Suspense fallback={<PageLoader />}>
                  <SharedWithMePage />
                </Suspense>
              </FeatureGate>
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

        {/* Admin routes - requires admin role */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AppShell />
            </AdminRoute>
          }
        >
          <Route
            index
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminInboxPage />
              </Suspense>
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
            path="reports"
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminReportsPage />
              </Suspense>
            }
          />
          <Route
            path="social"
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminSocialDashboardPage />
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
            path="roles"
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminRolesPage />
              </Suspense>
            }
          />
          <Route
            path="sidebar"
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminSidebarPage />
              </Suspense>
            }
          />
          <Route
            path="analytics"
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminAnalyticsPage />
              </Suspense>
            }
          />
          <Route
            path="database"
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminDatabasePage />
              </Suspense>
            }
          />
          <Route
            path="system"
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminSystemPage />
              </Suspense>
            }
          />
          <Route
            path="settings"
            element={
              <Suspense fallback={<PageLoader />}>
                <AdminSystemPage />
              </Suspense>
            }
          />
        </Route>

        {/* Redirect root to app (will redirect to login if not authenticated) */}
        <Route path="/" element={<Navigate to="/app" replace />} />

        {/* 404 - show not found page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ToastContainer />
    </AppInitializer>
  );
}

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <TooltipsProvider>
          <BrowserRouter>
            <WebSocketProvider>
              <AppContent />
            </WebSocketProvider>
          </BrowserRouter>
        </TooltipsProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
