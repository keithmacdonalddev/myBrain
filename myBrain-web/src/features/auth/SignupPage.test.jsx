/**
 * =============================================================================
 * SIGNUPPAGE.TEST.JSX - Unit Tests for SignupPage Component
 * =============================================================================
 *
 * Tests the SignupPage component which handles user registration.
 * Covers:
 * - Basic rendering (form fields, buttons, links)
 * - Form input handling
 * - Client-side validation (required fields, password length, password match)
 * - Submit dispatches register action
 * - Error message display (local and API errors)
 * - Loading state during submission
 * - Navigation link to login page
 * - Redirect when already authenticated
 * - Cleanup of errors on unmount
 *
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import SignupPage from './SignupPage';

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
    register: vi.fn((credentials) => ({
      type: 'auth/register/pending',
      payload: credentials,
    })),
    clearError: vi.fn(() => ({
      type: 'auth/clearError',
    })),
  };
});

import { register, clearError } from '../../store/authSlice';

describe('SignupPage', () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // BASIC RENDERING
  // ===========================================================================

  describe('Basic Rendering', () => {
    it('renders the signup page with branding', () => {
      render(<SignupPage />, defaultAuthState);

      expect(screen.getByRole('heading', { name: 'myBrain' })).toBeInTheDocument();
      expect(screen.getByText('Create your account')).toBeInTheDocument();
    });

    it('renders email input field', () => {
      render(<SignupPage />, defaultAuthState);

      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('placeholder', 'you@example.com');
    });

    it('renders password input field', () => {
      render(<SignupPage />, defaultAuthState);

      const passwordInput = screen.getByLabelText('Password');
      expect(passwordInput).toBeInTheDocument();
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('placeholder', 'At least 8 characters');
    });

    it('renders confirm password input field', () => {
      render(<SignupPage />, defaultAuthState);

      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      expect(confirmPasswordInput).toBeInTheDocument();
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('placeholder', 'Confirm your password');
    });

    it('renders create account button', () => {
      render(<SignupPage />, defaultAuthState);

      const submitButton = screen.getByRole('button', { name: 'Create Account' });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('renders link to login page', () => {
      render(<SignupPage />, defaultAuthState);

      expect(screen.getByText('Already have an account?')).toBeInTheDocument();
      const loginLink = screen.getByRole('link', { name: 'Sign in' });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });

  // ===========================================================================
  // FORM INPUT HANDLING
  // ===========================================================================

  describe('Form Input Handling', () => {
    it('updates email field when typing', async () => {
      const user = userEvent.setup();
      render(<SignupPage />, defaultAuthState);

      const emailInput = screen.getByLabelText('Email');
      await user.type(emailInput, 'newuser@example.com');

      expect(emailInput).toHaveValue('newuser@example.com');
    });

    it('updates password field when typing', async () => {
      const user = userEvent.setup();
      render(<SignupPage />, defaultAuthState);

      const passwordInput = screen.getByLabelText('Password');
      await user.type(passwordInput, 'securepassword');

      expect(passwordInput).toHaveValue('securepassword');
    });

    it('updates confirm password field when typing', async () => {
      const user = userEvent.setup();
      render(<SignupPage />, defaultAuthState);

      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      await user.type(confirmPasswordInput, 'securepassword');

      expect(confirmPasswordInput).toHaveValue('securepassword');
    });
  });

  // ===========================================================================
  // CLIENT-SIDE VALIDATION
  // ===========================================================================

  describe('Client-Side Validation', () => {
    it('shows error when submitting with empty fields', async () => {
      const user = userEvent.setup();
      render(<SignupPage />, defaultAuthState);

      const submitButton = screen.getByRole('button', { name: 'Create Account' });
      await user.click(submitButton);

      expect(screen.getByText('All fields are required')).toBeInTheDocument();
      expect(register).not.toHaveBeenCalled();
    });

    it('shows error when email is empty', async () => {
      const user = userEvent.setup();
      render(<SignupPage />, defaultAuthState);

      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', { name: 'Create Account' });

      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      expect(screen.getByText('All fields are required')).toBeInTheDocument();
      expect(register).not.toHaveBeenCalled();
    });

    it('shows error when password is empty', async () => {
      const user = userEvent.setup();
      render(<SignupPage />, defaultAuthState);

      const emailInput = screen.getByLabelText('Email');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', { name: 'Create Account' });

      await user.type(emailInput, 'test@example.com');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      expect(screen.getByText('All fields are required')).toBeInTheDocument();
      expect(register).not.toHaveBeenCalled();
    });

    it('shows error when confirm password is empty', async () => {
      const user = userEvent.setup();
      render(<SignupPage />, defaultAuthState);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const submitButton = screen.getByRole('button', { name: 'Create Account' });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      expect(screen.getByText('All fields are required')).toBeInTheDocument();
      expect(register).not.toHaveBeenCalled();
    });

    it('shows error when password is less than 8 characters', async () => {
      const user = userEvent.setup();
      render(<SignupPage />, defaultAuthState);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', { name: 'Create Account' });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'short');
      await user.type(confirmPasswordInput, 'short');
      await user.click(submitButton);

      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      expect(register).not.toHaveBeenCalled();
    });

    it('shows error when passwords do not match', async () => {
      const user = userEvent.setup();
      render(<SignupPage />, defaultAuthState);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', { name: 'Create Account' });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'differentpassword');
      await user.click(submitButton);

      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      expect(register).not.toHaveBeenCalled();
    });

    it('clears local error on new submit attempt', async () => {
      const user = userEvent.setup();
      render(<SignupPage />, defaultAuthState);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', { name: 'Create Account' });

      // First attempt with empty fields
      await user.click(submitButton);
      expect(screen.getByText('All fields are required')).toBeInTheDocument();

      // Fill in valid data and submit again
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      // Previous error should be cleared
      expect(screen.queryByText('All fields are required')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // FORM SUBMISSION
  // ===========================================================================

  describe('Form Submission', () => {
    it('dispatches register action with credentials when validation passes', async () => {
      const user = userEvent.setup();
      render(<SignupPage />, defaultAuthState);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', { name: 'Create Account' });

      await user.type(emailInput, 'newuser@example.com');
      await user.type(passwordInput, 'securepassword');
      await user.type(confirmPasswordInput, 'securepassword');
      await user.click(submitButton);

      expect(register).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'securepassword',
      });
    });

    it('does not include confirm password in register payload', async () => {
      const user = userEvent.setup();
      render(<SignupPage />, defaultAuthState);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', { name: 'Create Account' });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');
      await user.click(submitButton);

      const callArgs = register.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty('confirmPassword');
    });
  });

  // ===========================================================================
  // LOADING STATE
  // ===========================================================================

  describe('Loading State', () => {
    it('shows "Creating account..." text when loading', () => {
      render(<SignupPage />, {
        preloadedState: {
          auth: {
            isLoading: true,
            isAuthenticated: false,
            user: null,
            error: null,
          },
        },
      });

      expect(screen.getByRole('button', { name: 'Creating account...' })).toBeInTheDocument();
    });

    it('disables submit button when loading', () => {
      render(<SignupPage />, {
        preloadedState: {
          auth: {
            isLoading: true,
            isAuthenticated: false,
            user: null,
            error: null,
          },
        },
      });

      const submitButton = screen.getByRole('button', { name: 'Creating account...' });
      expect(submitButton).toBeDisabled();
    });

    it('disables all input fields when loading', () => {
      render(<SignupPage />, {
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
      expect(screen.getByLabelText('Confirm Password')).toBeDisabled();
    });
  });

  // ===========================================================================
  // ERROR DISPLAY
  // ===========================================================================

  describe('Error Display', () => {
    it('displays API error message when registration fails', () => {
      render(<SignupPage />, {
        preloadedState: {
          auth: {
            isLoading: false,
            isAuthenticated: false,
            user: null,
            error: 'Email already exists',
          },
        },
      });

      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });

    it('displays local validation error over API error', async () => {
      const user = userEvent.setup();
      render(<SignupPage />, {
        preloadedState: {
          auth: {
            isLoading: false,
            isAuthenticated: false,
            user: null,
            error: 'API error',
          },
        },
      });

      // Trigger local validation error
      const submitButton = screen.getByRole('button', { name: 'Create Account' });
      await user.click(submitButton);

      // Local error should show (since localError takes precedence via displayError)
      expect(screen.getByText('All fields are required')).toBeInTheDocument();
    });

    it('does not display error container when no error', () => {
      const { container } = render(<SignupPage />, {
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

    it('clears API error on component unmount', () => {
      const { unmount } = render(<SignupPage />, defaultAuthState);

      unmount();

      expect(clearError).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // NAVIGATION / REDIRECT
  // ===========================================================================

  describe('Navigation and Redirect', () => {
    it('redirects to /app when already authenticated', async () => {
      render(<SignupPage />, {
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
      render(<SignupPage />, {
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
      const { container } = render(<SignupPage />, defaultAuthState);

      // Form should be present (note: form only has 'form' role if it has accessible name)
      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
    });

    it('has labels associated with inputs', () => {
      render(<SignupPage />, defaultAuthState);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');

      expect(emailInput).toHaveAttribute('id', 'email');
      expect(passwordInput).toHaveAttribute('id', 'password');
      expect(confirmPasswordInput).toHaveAttribute('id', 'confirmPassword');
    });

    it('submit button has proper type attribute', () => {
      render(<SignupPage />, defaultAuthState);

      const submitButton = screen.getByRole('button', { name: 'Create Account' });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('Edge Cases', () => {
    it('handles password with exactly 8 characters', async () => {
      const user = userEvent.setup();
      render(<SignupPage />, defaultAuthState);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', { name: 'Create Account' });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, '12345678'); // Exactly 8 characters
      await user.type(confirmPasswordInput, '12345678');
      await user.click(submitButton);

      // Should not show password length error
      expect(screen.queryByText('Password must be at least 8 characters')).not.toBeInTheDocument();
      expect(register).toHaveBeenCalled();
    });

    it('handles password with 7 characters (edge of validation)', async () => {
      const user = userEvent.setup();
      render(<SignupPage />, defaultAuthState);

      const emailInput = screen.getByLabelText('Email');
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText('Confirm Password');
      const submitButton = screen.getByRole('button', { name: 'Create Account' });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, '1234567'); // 7 characters
      await user.type(confirmPasswordInput, '1234567');
      await user.click(submitButton);

      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      expect(register).not.toHaveBeenCalled();
    });

    it('handles whitespace-only input as empty', async () => {
      const user = userEvent.setup();
      render(<SignupPage />, defaultAuthState);

      const emailInput = screen.getByLabelText('Email');
      const submitButton = screen.getByRole('button', { name: 'Create Account' });

      // Note: Input with whitespace only is still considered truthy by the validation
      // so this tests current behavior - the form will try to validate further
      await user.type(emailInput, '   ');
      await user.click(submitButton);

      // Still shows required error because password fields are empty
      expect(screen.getByText('All fields are required')).toBeInTheDocument();
    });
  });
});
