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
import FeatureErrorBoundary from '../components/ui/FeatureErrorBoundary';

// Auth Pages (not lazy loaded - needed immediately)
import LoginPage from '../features/auth/LoginPage';
import SignupPage from '../features/auth/SignupPage';
import ForgotPasswordPage from '../features/auth/ForgotPasswordPage';
import ResetPasswordPage from '../features/auth/ResetPasswordPage';

// Lazy load feature routes
const DashboardRouter = lazy(() => import('../features/dashboard/DashboardRouter'));
const NotesRoutes = lazy(() => import('../features/notes/routes'));
const TasksRoutes = lazy(() => import('../features/tasks/routes'));
const InboxPage = lazy(() => import('../features/inbox/InboxPage'));
const TodayPage = lazy(() => import('../features/today/TodayPage'));
const FitnessRoutes = lazy(() => import('../features/fitness/routes'));
const KnowledgeBaseRoutes = lazy(() => import('../features/kb/routes'));
// MessagesRoutes - available but not currently used in routing
// const MessagesRoutes = lazy(() => import('../features/messages/routes'));
const ImagesRoutes = lazy(() => import('../features/images/routes'));
const FilesRoutes = lazy(() => import('../features/files/routes'));
const CalendarRoutes = lazy(() => import('../features/calendar/routes'));
const ProjectsRoutes = lazy(() => import('../features/projects/routes'));
const ConnectionsPage = lazy(() => import('../features/social/pages/ConnectionsPage'));
const UserProfilePage = lazy(() => import('../features/social/pages/UserProfilePage'));
const SharedWithMePage = lazy(() => import('../features/social/pages/SharedWithMePage'));
const MySharesPage = lazy(() => import('../features/social/pages/MySharesPage'));
const MessagesPage = lazy(() => import('../features/messages/pages/MessagesPage'));
const NotificationsPage = lazy(() => import('../features/notifications/pages/NotificationsPage'));

// Profile & Settings
const ProfilePage = lazy(() => import('../features/profile/ProfilePage'));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage'));
const ActivityPage = lazy(() => import('../features/activity/ActivityPage'));

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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected routes with AppShell */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          {/* Dashboard - routes to V1 or V2 based on feature flag */}
          <Route
            index
            element={
              <FeatureErrorBoundary name="dashboard">
                <Suspense fallback={<PageLoader />}>
                  <DashboardRouter />
                </Suspense>
              </FeatureErrorBoundary>
            }
          />

          {/* Feature routes */}
          <Route
            path="today"
            element={
              <FeatureErrorBoundary name="today">
                <Suspense fallback={<PageLoader />}>
                  <TodayPage />
                </Suspense>
              </FeatureErrorBoundary>
            }
          />
          <Route
            path="inbox"
            element={
              <FeatureErrorBoundary name="inbox">
                <Suspense fallback={<PageLoader />}>
                  <InboxPage />
                </Suspense>
              </FeatureErrorBoundary>
            }
          />
          {/* Optional Features - controlled by feature flags */}
          <Route
            path="calendar/*"
            element={
              <FeatureErrorBoundary name="calendar">
                <FeatureGate flag="calendarEnabled" fallback={<FeatureNotEnabled featureName="Calendar" />}>
                  <Suspense fallback={<PageLoader />}>
                    <CalendarRoutes />
                  </Suspense>
                </FeatureGate>
              </FeatureErrorBoundary>
            }
          />
          <Route
            path="tasks/*"
            element={
              <FeatureErrorBoundary name="tasks">
                <Suspense fallback={<PageLoader />}>
                  <TasksRoutes />
                </Suspense>
              </FeatureErrorBoundary>
            }
          />
          <Route
            path="notes/*"
            element={
              <FeatureErrorBoundary name="notes">
                <Suspense fallback={<PageLoader />}>
                  <NotesRoutes />
                </Suspense>
              </FeatureErrorBoundary>
            }
          />
          <Route
            path="images/*"
            element={
              <FeatureErrorBoundary name="images">
                <FeatureGate flag="imagesEnabled" fallback={<FeatureNotEnabled featureName="Images" />}>
                  <Suspense fallback={<PageLoader />}>
                    <ImagesRoutes />
                  </Suspense>
                </FeatureGate>
              </FeatureErrorBoundary>
            }
          />
          <Route
            path="files/*"
            element={
              <FeatureErrorBoundary name="files">
                <FeatureGate flag="filesEnabled" fallback={<FeatureNotEnabled featureName="Files" />}>
                  <Suspense fallback={<PageLoader />}>
                    <FilesRoutes />
                  </Suspense>
                </FeatureGate>
              </FeatureErrorBoundary>
            }
          />
          <Route
            path="projects/*"
            element={
              <FeatureErrorBoundary name="projects">
                <FeatureGate flag="projectsEnabled" fallback={<FeatureNotEnabled featureName="Projects" />}>
                  <Suspense fallback={<PageLoader />}>
                    <ProjectsRoutes />
                  </Suspense>
                </FeatureGate>
              </FeatureErrorBoundary>
            }
          />
          {/* Coming Soon / Beta Features - controlled by feature flags */}
          <Route
            path="fitness/*"
            element={
              <FeatureErrorBoundary name="fitness">
                <FeatureGate flag="fitnessEnabled" fallback={<ComingSoon featureName="Fitness tracking" />}>
                  <Suspense fallback={<PageLoader />}>
                    <FitnessRoutes />
                  </Suspense>
                </FeatureGate>
              </FeatureErrorBoundary>
            }
          />
          <Route
            path="kb/*"
            element={
              <FeatureErrorBoundary name="knowledge-base">
                <FeatureGate flag="kbEnabled" fallback={<ComingSoon featureName="Knowledge Base" />}>
                  <Suspense fallback={<PageLoader />}>
                    <KnowledgeBaseRoutes />
                  </Suspense>
                </FeatureGate>
              </FeatureErrorBoundary>
            }
          />
          <Route
            path="messages/*"
            element={
              <FeatureErrorBoundary name="messages">
                <FeatureGate flag="socialEnabled" fallback={<FeatureNotEnabled featureName="Messages" />}>
                  <Suspense fallback={<PageLoader />}>
                    <MessagesPage />
                  </Suspense>
                </FeatureGate>
              </FeatureErrorBoundary>
            }
          />

          {/* Notifications */}
          <Route
            path="notifications"
            element={
              <FeatureErrorBoundary name="notifications">
                <FeatureGate flag="socialEnabled" fallback={<FeatureNotEnabled featureName="Notifications" />}>
                  <Suspense fallback={<PageLoader />}>
                    <NotificationsPage />
                  </Suspense>
                </FeatureGate>
              </FeatureErrorBoundary>
            }
          />

          {/* Social - Connections */}
          <Route
            path="social/connections"
            element={
              <FeatureErrorBoundary name="connections">
                <FeatureGate flag="socialEnabled" fallback={<FeatureNotEnabled featureName="Social" />}>
                  <Suspense fallback={<PageLoader />}>
                    <ConnectionsPage />
                  </Suspense>
                </FeatureGate>
              </FeatureErrorBoundary>
            }
          />
          <Route
            path="social/profile/:userId"
            element={
              <FeatureErrorBoundary name="user-profile">
                <FeatureGate flag="socialEnabled" fallback={<FeatureNotEnabled featureName="Social" />}>
                  <Suspense fallback={<PageLoader />}>
                    <UserProfilePage />
                  </Suspense>
                </FeatureGate>
              </FeatureErrorBoundary>
            }
          />
          <Route
            path="social/shared"
            element={
              <FeatureErrorBoundary name="shared-with-me">
                <FeatureGate flag="socialEnabled" fallback={<FeatureNotEnabled featureName="Social" />}>
                  <Suspense fallback={<PageLoader />}>
                    <SharedWithMePage />
                  </Suspense>
                </FeatureGate>
              </FeatureErrorBoundary>
            }
          />
          <Route
            path="social/my-shares"
            element={
              <FeatureErrorBoundary name="my-shares">
                <FeatureGate flag="socialEnabled" fallback={<FeatureNotEnabled featureName="Social" />}>
                  <Suspense fallback={<PageLoader />}>
                    <MySharesPage />
                  </Suspense>
                </FeatureGate>
              </FeatureErrorBoundary>
            }
          />

          {/* Profile */}
          <Route
            path="profile"
            element={
              <FeatureErrorBoundary name="profile">
                <Suspense fallback={<PageLoader />}>
                  <ProfilePage />
                </Suspense>
              </FeatureErrorBoundary>
            }
          />

          {/* Settings */}
          <Route
            path="settings"
            element={
              <FeatureErrorBoundary name="settings">
                <Suspense fallback={<PageLoader />}>
                  <SettingsPage />
                </Suspense>
              </FeatureErrorBoundary>
            }
          />

          {/* Activity & Security (settings sub-page with dedicated route) */}
          <Route
            path="settings/activity"
            element={
              <FeatureErrorBoundary name="activity">
                <Suspense fallback={<PageLoader />}>
                  <ActivityPage />
                </Suspense>
              </FeatureErrorBoundary>
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
              <FeatureErrorBoundary name="admin-inbox">
                <Suspense fallback={<PageLoader />}>
                  <AdminInboxPage />
                </Suspense>
              </FeatureErrorBoundary>
            }
          />
          <Route
            path="logs"
            element={
              <FeatureErrorBoundary name="admin-logs">
                <Suspense fallback={<PageLoader />}>
                  <AdminLogsPage />
                </Suspense>
              </FeatureErrorBoundary>
            }
          />
          <Route
            path="reports"
            element={
              <FeatureErrorBoundary name="admin-reports">
                <Suspense fallback={<PageLoader />}>
                  <AdminReportsPage />
                </Suspense>
              </FeatureErrorBoundary>
            }
          />
          <Route
            path="social"
            element={
              <FeatureErrorBoundary name="admin-social">
                <Suspense fallback={<PageLoader />}>
                  <AdminSocialDashboardPage />
                </Suspense>
              </FeatureErrorBoundary>
            }
          />
          <Route
            path="users"
            element={
              <FeatureErrorBoundary name="admin-users">
                <Suspense fallback={<PageLoader />}>
                  <AdminUsersPage />
                </Suspense>
              </FeatureErrorBoundary>
            }
          />
          <Route
            path="roles"
            element={
              <FeatureErrorBoundary name="admin-roles">
                <Suspense fallback={<PageLoader />}>
                  <AdminRolesPage />
                </Suspense>
              </FeatureErrorBoundary>
            }
          />
          <Route
            path="sidebar"
            element={
              <FeatureErrorBoundary name="admin-sidebar">
                <Suspense fallback={<PageLoader />}>
                  <AdminSidebarPage />
                </Suspense>
              </FeatureErrorBoundary>
            }
          />
          <Route
            path="analytics"
            element={
              <FeatureErrorBoundary name="admin-analytics">
                <Suspense fallback={<PageLoader />}>
                  <AdminAnalyticsPage />
                </Suspense>
              </FeatureErrorBoundary>
            }
          />
          <Route
            path="database"
            element={
              <FeatureErrorBoundary name="admin-database">
                <Suspense fallback={<PageLoader />}>
                  <AdminDatabasePage />
                </Suspense>
              </FeatureErrorBoundary>
            }
          />
          <Route
            path="system"
            element={
              <FeatureErrorBoundary name="admin-system">
                <Suspense fallback={<PageLoader />}>
                  <AdminSystemPage />
                </Suspense>
              </FeatureErrorBoundary>
            }
          />
          <Route
            path="settings"
            element={
              <FeatureErrorBoundary name="admin-settings">
                <Suspense fallback={<PageLoader />}>
                  <AdminSystemPage />
                </Suspense>
              </FeatureErrorBoundary>
            }
          />
        </Route>

        {/* Redirect root to app (will redirect to login if not authenticated) */}
        <Route path="/" element={<Navigate to="/app" replace />} />

        {/* Legacy path redirects - redirect bare paths to /app/* equivalents */}
        <Route path="/notes" element={<Navigate to="/app/notes" replace />} />
        <Route path="/notes/:noteId" element={<Navigate to="/app/notes/:noteId" replace />} />
        <Route path="/tasks" element={<Navigate to="/app/tasks" replace />} />
        <Route path="/tasks/:taskId" element={<Navigate to="/app/tasks/:taskId" replace />} />
        <Route path="/projects" element={<Navigate to="/app/projects" replace />} />
        <Route path="/projects/:projectId" element={<Navigate to="/app/projects/:projectId" replace />} />
        <Route path="/messages" element={<Navigate to="/app/messages" replace />} />
        <Route path="/messages/:conversationId" element={<Navigate to="/app/messages/:conversationId" replace />} />

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
