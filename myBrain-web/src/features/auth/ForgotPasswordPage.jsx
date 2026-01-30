/**
 * =============================================================================
 * FORGOTPASSWORDPAGE.JSX - Password Reset Request Page
 * =============================================================================
 *
 * This page allows users to request a password reset email.
 * It's the first step in the "forgot password" flow.
 *
 * FLOW:
 * 1. User enters their email address
 * 2. We send a request to the backend
 * 3. Backend sends a reset email (if account exists)
 * 4. We show a success message (regardless of whether email exists)
 *
 * SECURITY:
 * - Always shows success message to prevent email enumeration
 * - Includes link back to login page
 *
 * =============================================================================
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import api from '../../lib/api';

function ForgotPasswordPage() {
  // Form state
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  /**
   * Handle form submission.
   * Sends email to backend, shows success regardless of result.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setIsSubmitted(true);
    } catch (err) {
      // Show error if backend returns one (e.g., rate limit, server error)
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ===========================================================================
  // SUCCESS STATE - Show after email is sent
  // ===========================================================================
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-panel border border-border rounded-lg p-8 shadow-theme-elevated text-center">
            {/* Success Icon */}
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>

            {/* Success Message */}
            <h1 className="text-2xl font-bold text-text mb-2">Check your email</h1>
            <p className="text-muted mb-6">
              If an account exists for <span className="text-text font-medium">{email}</span>,
              we've sent a password reset link.
            </p>
            <p className="text-sm text-muted mb-6">
              The link will expire in 1 hour. Check your spam folder if you don't see it.
            </p>

            {/* Back to Login */}
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-primary hover:text-primary-hover transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // FORM STATE - Request password reset
  // ===========================================================================
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text">Forgot password?</h1>
          <p className="text-muted mt-2">No worries, we'll send you reset instructions.</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-panel border border-border rounded-lg p-6 shadow-theme-elevated"
        >
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* Email Input */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-text mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              disabled={isLoading}
              className="w-full px-3 py-2 bg-bg border border-border rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-primary/50
                       focus:border-primary text-text placeholder:text-muted
                       disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full py-2 px-4 bg-primary text-white rounded-lg
                     hover:bg-primary-hover transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send reset link'
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

export default ForgotPasswordPage;
