/**
 * =============================================================================
 * RESETPASSWORDPAGE.JSX - Password Reset Completion Page
 * =============================================================================
 *
 * This page allows users to create a new password after clicking
 * the reset link from their email.
 *
 * FLOW:
 * 1. User clicks link from email (/reset-password?token=xxx)
 * 2. User enters new password and confirmation
 * 3. We validate passwords match and meet requirements
 * 4. We send request to backend with token and new password
 * 5. On success, redirect to login
 *
 * SECURITY:
 * - Token is one-time use
 * - Token expires after 1 hour
 * - Password requirements enforced client and server side
 *
 * =============================================================================
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, Loader2, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import api from '../../lib/api';

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get token from URL query params
  const token = searchParams.get('token');

  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  // Redirect to forgot-password if no token
  useEffect(() => {
    if (!token) {
      navigate('/forgot-password', { replace: true });
    }
  }, [token, navigate]);

  /**
   * Validate password meets requirements.
   * Returns error message or empty string if valid.
   */
  const validatePassword = () => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match';
    }
    return '';
  };

  /**
   * Handle form submission.
   * Validates passwords and sends reset request.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    const validationError = validatePassword();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        password
      });
      setIsSuccess(true);
    } catch (err) {
      // Handle specific error cases
      const errorMessage = err.response?.data?.error || 'Something went wrong. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ===========================================================================
  // INVALID TOKEN STATE - No token provided
  // ===========================================================================
  if (!token) {
    return null; // Will redirect via useEffect
  }

  // ===========================================================================
  // SUCCESS STATE - Password reset successfully
  // ===========================================================================
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-panel border border-border rounded-lg p-8 shadow-theme-elevated text-center">
            {/* Success Icon */}
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>

            {/* Success Message */}
            <h1 className="text-2xl font-bold text-text mb-2">Password reset!</h1>
            <p className="text-muted mb-6">
              Your password has been successfully reset. You can now log in with your new password.
            </p>

            {/* Login Button */}
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              Continue to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // FORM STATE - Enter new password
  // ===========================================================================
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text">Set new password</h1>
          <p className="text-muted mt-2">Your new password must be at least 8 characters.</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-panel border border-border rounded-lg p-6 shadow-theme-elevated"
        >
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span className="text-red-500 text-sm">{error}</span>
            </div>
          )}

          {/* Password Input */}
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-text mb-1">
              New password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                autoFocus
                disabled={isLoading}
                className="w-full px-3 py-2 pr-10 bg-bg border border-border rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-primary/50
                         focus:border-primary text-text placeholder:text-muted
                         disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-text mb-1">
              Confirm new password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                disabled={isLoading}
                className="w-full px-3 py-2 pr-10 bg-bg border border-border rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-primary/50
                         focus:border-primary text-text placeholder:text-muted
                         disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !password || !confirmPassword}
            className="w-full py-2 px-4 bg-primary text-white rounded-lg
                     hover:bg-primary-hover transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset password'
            )}
          </button>

          {/* Back to Login Link */}
          <div className="mt-4 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-muted hover:text-text transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
