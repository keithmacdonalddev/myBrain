/**
 * =============================================================================
 * LOGINPAGE.TEST.JSX - Unit Tests for LoginPage Component
 * =============================================================================
 *
 * Tests the LoginPage component which handles user authentication.
 * Covers:
 * - Basic rendering (form fields, buttons, links)
 * - Form input handling
 * - Submit dispatches login action
 * - Error message display
 * - Loading state during submission
 * - Navigation link to signup page
 * - Redirect when already authenticated
 * - Cleanup of errors on unmount
 *
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import LoginPage from './LoginPage';

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the authSlice actions
vi.mock('../../store/authSlice', async () => {
  const actual = await vi.importActual('../../store/authSlice');
  return {
    ...actual,
    login: vi.fn((credentials) => ({
      type: 'auth/login/pending',
      payload: credentials,
    })),
    clearError: vi.fn(() => ({
      type: 'auth/clearError',
    })),
  };
});

import { login, clearError } from '../../store/authSlice';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Default preloaded state for most tests (not loading, not authenticated)
  const defaultAuthState = {
    preloadedState: {
      auth: {
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: null,
      },
    },
  };

  // ===========================================================================
  // BASIC RENDERING
  // ===========================================================================

  describe('Basic Rendering', () => {
    it('renders the login page with branding', () => {
      render(<LoginPage />, defaultAuthState);

      expect(screen.getByRole('heading', { name: 'myBrain' })).toBeInTheDocument();
      expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    });

    it('renders email input field', () => {
      render(<LoginPage />, defaultAuthState);

      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('placeholder', 'you@example.com');
    });

    it('renders password input field', () => {
      render(<LoginPage />, defaultAuthState);

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('placeholder', 'Your password');
    });

    it('renders sign in button', () => {
      render(<LoginPage />, defaultAuthState);

      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('renders link to signup page', () => {
      render(<LoginPage />, defaultAuthState);

      expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
      const signupLink = screen.getByRole('link', { name: 'Create one' });
      expect(signupLink).toBeInTheDocument();
      expect(signupLink).toHaveAttribute('href', '/signup');
    });
  });

  // ===========================================================================
  // FORM INPUT HANDLING
  // ===========================================================================

  describe('Form Input Handling', () => {
    it('updates email field when typing', async () => {
      const user = userEvent.setup();
      render(<LoginPage />, defaultAuthState);

      const emailInput = screen.getByLabelText('Email');
      await user.type(emailInput, 'test@example.com');

      expect(emailInput).toHaveValue('test@example.com');
    });

    it('updates password field when typing', async () => {
      const user = userEvent.setup();
      render(<LoginPage />, defaultAuthState);

      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, 'mypassword123');

      expect(passwordInput).toHaveValue('mypassword123');
    });
  });

  // ===========================================================================
  // FORM SUBMISSION
  // ===========================================================================

  describe('Form Submission', () => {
    it('dispatches login action with credentials when form is submitted', async () => {
      const user = userEvent.setup();
      render(<LoginPage />, defaultAuthState);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Sign In' });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      expect(login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('prevents default form submission', async () => {
      const user = userEvent.setup();
      render(<LoginPage />, defaultAuthState);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Sign In' });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // Form should not navigate or reload (default behavior prevented)
      await user.click(submitButton);

      // If default wasn't prevented, the page would reload and test would fail
      expect(login).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // LOADING STATE
  // ===========================================================================

  describe('Loading State', () => {
    it('shows "Signing in..." text when loading', () => {
      render(<LoginPage />, {
        preloadedState: {
          auth: {
            isLoading: true,
            isAuthenticated: false,
            user: null,
            error: null,
          },
        },
      });

      expect(screen.getByRole('button', { name: 'Signing in...' })).toBeInTheDocument();
    });

    it('disables submit button when loading', () => {
      render(<LoginPage />, {
        preloadedState: {
          auth: {
            isLoading: true,
            isAuthenticated: false,
            user: null,
            error: null,
          },
        },
      });

      const submitButton = screen.getByRole('button', { name: 'Signing in...' });
      expect(submitButton).toBeDisabled();
    });

    it('disables input fields when loading', () => {
      render(<LoginPage />, {
        preloadedState: {
          auth: {
            isLoading: true,
            isAuthenticated: false,
            user: null,
            error: null,
          },
        },
      });

      expect(screen.getByLabelText('Email')).toBeDisabled();
      expect(screen.getByLabelText('Password')).toBeDisabled();
    });
  });

  // ===========================================================================
  // ERROR DISPLAY
  // ===========================================================================

  describe('Error Display', () => {
    it('displays error message when login fails', () => {
      render(<LoginPage />, {
        preloadedState: {
          auth: {
            isLoading: false,
            isAuthenticated: false,
            user: null,
            error: 'Invalid email or password',
          },
        },
      });

      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });

    it('does not display error container when no error', () => {
      const { container } = render(<LoginPage />, {
        preloadedState: {
          auth: {
            isLoading: false,
            isAuthenticated: false,
            user: null,
            error: null,
          },
        },
      });

      // The error container has a specific class pattern
      expect(container.querySelector('.bg-red-500\\/10')).not.toBeInTheDocument();
    });

    it('clears error on component unmount', () => {
      const { unmount } = render(<LoginPage />, defaultAuthState);

      unmount();

      expect(clearError).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // NAVIGATION / REDIRECT
  // ===========================================================================

  describe('Navigation and Redirect', () => {
    it('redirects to /app when already authenticated', async () => {
      render(<LoginPage />, {
        preloadedState: {
          auth: {
            isLoading: false,
            isAuthenticated: true,
            user: { id: '1', email: 'test@example.com' },
            error: null,
          },
        },
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/app');
      });
    });

    it('does not redirect when not authenticated', () => {
      render(<LoginPage />, {
        preloadedState: {
          auth: {
            isLoading: false,
            isAuthenticated: false,
            user: null,
            error: null,
          },
        },
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // ACCESSIBILITY
  // ===========================================================================

  describe('Accessibility', () => {
    it('has proper form structure', () => {
      const { container } = render(<LoginPage />, defaultAuthState);

      // Form should be present (note: form only has 'form' role if it has accessible name)
      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
    });

    it('has labels associated with inputs', () => {
      render(<LoginPage />, defaultAuthState);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');

      expect(emailInput).toHaveAttribute('id', 'email');
      expect(passwordInput).toHaveAttribute('id', 'password');
    });

    it('submit button has proper type attribute', () => {
      render(<LoginPage />, defaultAuthState);

      const submitButton = screen.getByRole('button', { name: 'Sign In' });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });
  });
});
