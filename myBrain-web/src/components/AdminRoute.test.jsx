import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test/utils';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/authSlice';
import AdminRoute from './AdminRoute';

/**
 * Test file for AdminRoute component
 *
 * AdminRoute guards routes that require admin role:
 * - Shows loading spinner while auth state is being checked
 * - Redirects to /login if user is not authenticated
 * - Shows AccessDenied if user is authenticated but not admin
 * - Renders children if user is authenticated and has admin role
 */

// Helper to create store with specific auth state
function createStoreWithAuth(authState) {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        ...authState,
      },
    },
  });
}

// Custom render with MemoryRouter for testing redirects
function renderWithRouter(ui, { initialEntries = ['/admin'], store } = {}) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/app" element={<div>Dashboard Page</div>} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                {ui}
              </AdminRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>,
    { wrapper: ({ children }) => children }
  );
}

describe('AdminRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows loading spinner when auth is loading', () => {
      const store = createStoreWithAuth({ isLoading: true });

      renderWithRouter(<div>Admin Content</div>, { store });

      // Should show loading text
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      // Should not show admin content
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });

    it('displays loading spinner with correct styling', () => {
      const store = createStoreWithAuth({ isLoading: true });

      const { container } = renderWithRouter(<div>Admin Content</div>, { store });

      // Should have the spinner element with animation class
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('rounded-full');
    });
  });

  describe('unauthenticated state', () => {
    it('redirects to /login when not authenticated', () => {
      const store = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: false,
      });

      renderWithRouter(<div>Admin Content</div>, { store });

      // Should redirect to login page
      expect(screen.getByText('Login Page')).toBeInTheDocument();
      // Should not show admin content
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });

    it('redirects even when user object exists but isAuthenticated is false', () => {
      const store = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: false,
        user: { id: '123', email: 'test@example.com', role: 'admin' },
      });

      renderWithRouter(<div>Admin Content</div>, { store });

      // Should redirect to login because isAuthenticated is false
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  describe('authenticated non-admin state', () => {
    it('shows AccessDenied when user is authenticated but not admin', () => {
      const store = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '123', email: 'test@example.com', role: 'user' },
      });

      renderWithRouter(<div>Admin Content</div>, { store });

      // Should show access denied
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      // Should not show admin content
      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });

    it('displays administrator restriction message', () => {
      const store = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '123', email: 'test@example.com', role: 'user' },
      });

      renderWithRouter(<div>Admin Content</div>, { store });

      expect(screen.getByText(/restricted to administrators only/i)).toBeInTheDocument();
    });

    it('shows AccessDenied when user has no role', () => {
      const store = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '123', email: 'test@example.com' },
      });

      renderWithRouter(<div>Admin Content</div>, { store });

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('shows AccessDenied when user has empty role', () => {
      const store = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '123', email: 'test@example.com', role: '' },
      });

      renderWithRouter(<div>Admin Content</div>, { store });

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('shows AccessDenied when user role is "moderator" (not admin)', () => {
      const store = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '123', email: 'test@example.com', role: 'moderator' },
      });

      renderWithRouter(<div>Admin Content</div>, { store });

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
  });

  describe('authenticated admin state', () => {
    it('renders children when user is admin', () => {
      const store = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '123', email: 'admin@example.com', role: 'admin' },
      });

      renderWithRouter(<div>Admin Content</div>, { store });

      // Should show admin content
      expect(screen.getByText('Admin Content')).toBeInTheDocument();
      // Should not show access denied or login
      expect(screen.queryByText('Access Denied')).not.toBeInTheDocument();
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });

    it('renders complex children correctly', () => {
      const store = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '123', email: 'admin@example.com', role: 'admin' },
      });

      renderWithRouter(
        <div>
          <h1>Admin Dashboard</h1>
          <p>Manage users and settings</p>
          <button>Delete User</button>
        </div>,
        { store }
      );

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Manage users and settings')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Delete User' })).toBeInTheDocument();
    });

    it('renders multiple children', () => {
      const store = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '123', email: 'admin@example.com', role: 'admin' },
      });

      renderWithRouter(
        <>
          <div>First Admin Section</div>
          <div>Second Admin Section</div>
        </>,
        { store }
      );

      expect(screen.getByText('First Admin Section')).toBeInTheDocument();
      expect(screen.getByText('Second Admin Section')).toBeInTheDocument();
    });
  });

  describe('AccessDenied UI elements', () => {
    it('renders Go Back button in AccessDenied view', () => {
      const store = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '123', email: 'test@example.com', role: 'user' },
      });

      renderWithRouter(<div>Admin Content</div>, { store });

      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    });

    it('renders Home button in AccessDenied view', () => {
      const store = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '123', email: 'test@example.com', role: 'user' },
      });

      renderWithRouter(<div>Admin Content</div>, { store });

      expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument();
    });

    it('displays shield icon in AccessDenied view', () => {
      const store = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '123', email: 'test@example.com', role: 'user' },
      });

      const { container } = renderWithRouter(<div>Admin Content</div>, { store });

      // ShieldX icon from Lucide
      const icon = container.querySelector('svg.lucide-shield-x');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('state transitions', () => {
    it('transitions from loading to admin', () => {
      // Start with loading state
      const store = createStoreWithAuth({ isLoading: true });

      const { rerender } = render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/admin']}>
            <Routes>
              <Route path="/login" element={<div>Login Page</div>} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <div>Admin Content</div>
                  </AdminRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </Provider>,
        { wrapper: ({ children }) => children }
      );

      // Initially shows loading
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Update store to admin state
      const newStore = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '123', email: 'admin@example.com', role: 'admin' },
      });

      rerender(
        <Provider store={newStore}>
          <MemoryRouter initialEntries={['/admin']}>
            <Routes>
              <Route path="/login" element={<div>Login Page</div>} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <div>Admin Content</div>
                  </AdminRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </Provider>
      );

      // Now shows admin content
      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    it('transitions from loading to access denied', () => {
      // Start with loading state
      const store = createStoreWithAuth({ isLoading: true });

      const { rerender } = render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/admin']}>
            <Routes>
              <Route path="/login" element={<div>Login Page</div>} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <div>Admin Content</div>
                  </AdminRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </Provider>,
        { wrapper: ({ children }) => children }
      );

      // Initially shows loading
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Update store to non-admin authenticated state
      const newStore = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '123', email: 'user@example.com', role: 'user' },
      });

      rerender(
        <Provider store={newStore}>
          <MemoryRouter initialEntries={['/admin']}>
            <Routes>
              <Route path="/login" element={<div>Login Page</div>} />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <div>Admin Content</div>
                  </AdminRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </Provider>
      );

      // Now shows access denied
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles null user when authenticated is true', () => {
      // Edge case: isAuthenticated true but user is null
      // Should show AccessDenied because user?.role !== 'admin'
      const store = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: true,
        user: null,
      });

      renderWithRouter(<div>Admin Content</div>, { store });

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });

    it('is case-sensitive for admin role', () => {
      const store = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '123', email: 'test@example.com', role: 'Admin' }, // Capital A
      });

      renderWithRouter(<div>Admin Content</div>, { store });

      // Should deny because 'Admin' !== 'admin'
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
  });
});
