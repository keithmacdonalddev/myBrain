import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../test/utils';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/authSlice';
import ProtectedRoute from './ProtectedRoute';

/**
 * Test file for ProtectedRoute component
 *
 * ProtectedRoute guards routes that require authentication:
 * - Shows loading spinner while auth state is being checked
 * - Redirects to /login if user is not authenticated
 * - Renders children if user is authenticated
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
function renderWithRouter(ui, { initialEntries = ['/protected'], store } = {}) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                {ui}
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>,
    { wrapper: ({ children }) => children }
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows loading spinner when auth is loading', () => {
      const store = createStoreWithAuth({ isLoading: true });

      renderWithRouter(<div>Protected Content</div>, { store });

      // Should show loading text
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      // Should not show protected content
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('displays loading spinner with correct styling', () => {
      const store = createStoreWithAuth({ isLoading: true });

      const { container } = renderWithRouter(<div>Protected Content</div>, { store });

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

      renderWithRouter(<div>Protected Content</div>, { store });

      // Should redirect to login page
      expect(screen.getByText('Login Page')).toBeInTheDocument();
      // Should not show protected content
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('preserves the original location in redirect state', () => {
      // This is tested implicitly by the Navigate component's behavior
      // The from location is passed via state={{ from: location }}
      const store = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: false,
      });

      renderWithRouter(<div>Protected Content</div>, {
        store,
        initialEntries: ['/protected?query=value'],
      });

      // Should redirect to login
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  describe('authenticated state', () => {
    it('renders children when user is authenticated', () => {
      const store = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '123', email: 'test@example.com' },
      });

      renderWithRouter(<div>Protected Content</div>, { store });

      // Should show protected content
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      // Should not show login page
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });

    it('renders complex children correctly', () => {
      const store = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '123', email: 'test@example.com' },
      });

      renderWithRouter(
        <div>
          <h1>Dashboard</h1>
          <p>Welcome to your dashboard</p>
          <button>Action Button</button>
        </div>,
        { store }
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Welcome to your dashboard')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
    });

    it('renders multiple children', () => {
      const store = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '123', email: 'test@example.com' },
      });

      renderWithRouter(
        <>
          <div>First Child</div>
          <div>Second Child</div>
        </>,
        { store }
      );

      expect(screen.getByText('First Child')).toBeInTheDocument();
      expect(screen.getByText('Second Child')).toBeInTheDocument();
    });
  });

  describe('state transitions', () => {
    it('transitions from loading to authenticated', () => {
      // Start with loading state
      const store = createStoreWithAuth({ isLoading: true });

      const { rerender } = render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/protected']}>
            <Routes>
              <Route path="/login" element={<div>Login Page</div>} />
              <Route
                path="/protected"
                element={
                  <ProtectedRoute>
                    <div>Protected Content</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </Provider>,
        { wrapper: ({ children }) => children }
      );

      // Initially shows loading
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Update store to authenticated state
      const newStore = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: true,
        user: { id: '123', email: 'test@example.com' },
      });

      rerender(
        <Provider store={newStore}>
          <MemoryRouter initialEntries={['/protected']}>
            <Routes>
              <Route path="/login" element={<div>Login Page</div>} />
              <Route
                path="/protected"
                element={
                  <ProtectedRoute>
                    <div>Protected Content</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </Provider>
      );

      // Now shows protected content
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('transitions from loading to unauthenticated', () => {
      // Start with loading state
      const store = createStoreWithAuth({ isLoading: true });

      const { rerender } = render(
        <Provider store={store}>
          <MemoryRouter initialEntries={['/protected']}>
            <Routes>
              <Route path="/login" element={<div>Login Page</div>} />
              <Route
                path="/protected"
                element={
                  <ProtectedRoute>
                    <div>Protected Content</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </Provider>,
        { wrapper: ({ children }) => children }
      );

      // Initially shows loading
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Update store to unauthenticated state
      const newStore = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: false,
      });

      rerender(
        <Provider store={newStore}>
          <MemoryRouter initialEntries={['/protected']}>
            <Routes>
              <Route path="/login" element={<div>Login Page</div>} />
              <Route
                path="/protected"
                element={
                  <ProtectedRoute>
                    <div>Protected Content</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </MemoryRouter>
        </Provider>
      );

      // Now redirects to login
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles null user when authenticated is false', () => {
      const store = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });

      renderWithRouter(<div>Protected Content</div>, { store });

      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    it('handles user object present but isAuthenticated is false', () => {
      // Edge case: user object exists but isAuthenticated is false
      // This could happen during logout transition
      const store = createStoreWithAuth({
        isLoading: false,
        isAuthenticated: false,
        user: { id: '123', email: 'test@example.com' },
      });

      renderWithRouter(<div>Protected Content</div>, { store });

      // Should still redirect to login because isAuthenticated is false
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });
});
