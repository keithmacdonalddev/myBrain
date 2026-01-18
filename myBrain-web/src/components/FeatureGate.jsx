import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Rocket, ShieldX, Home } from 'lucide-react';
import { useFeatureFlag, useIsAdmin } from '../hooks/useFeatureFlag';

/**
 * Component that conditionally renders children based on feature flags
 *
 * @param {string} flag - The feature flag to check
 * @param {React.ReactNode} children - Content to show when flag is enabled
 * @param {React.ReactNode} fallback - Content to show when flag is disabled (optional)
 *
 * @example
 * <FeatureGate flag="fitnessEnabled" fallback={<ComingSoon />}>
 *   <FitnessFeature />
 * </FeatureGate>
 */
function FeatureGate({ flag, children, fallback = null }) {
  const hasFlag = useFeatureFlag(flag);

  if (hasFlag) {
    return children;
  }

  return fallback;
}

/**
 * Component that renders children only for admin users
 */
export function AdminGate({ children, fallback = null }) {
  const isAdmin = useIsAdmin();

  if (isAdmin) {
    return children;
  }

  return fallback || <AccessDenied />;
}

/**
 * Component for showing "Coming Soon" placeholder (for beta/dev features)
 */
export function ComingSoon({ featureName = 'This feature' }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center p-8 max-w-md">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Rocket className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-text mb-2">Coming Soon</h2>
        <p className="text-muted mb-6">
          {featureName} is currently under development. Check back soon!
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-muted border border-border rounded-lg hover:bg-bg hover:text-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Component for showing "Feature Not Enabled" placeholder (for premium/optional features)
 */
export function FeatureNotEnabled({ featureName = 'This feature' }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center p-8 max-w-md">
        <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-semibold text-text mb-2">Feature Not Available</h2>
        <p className="text-muted mb-6">
          {featureName} is not enabled for your account. This feature may require a different subscription plan or admin approval.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-muted border border-border rounded-lg hover:bg-bg hover:text-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Component for showing "Access Denied" for admin-only areas
 */
export function AccessDenied({ message = "You don't have permission to access this page." }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center p-8 max-w-md">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-text mb-2">Access Denied</h2>
        <p className="text-muted mb-6">
          {message}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-muted border border-border rounded-lg hover:bg-bg hover:text-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/app')}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default FeatureGate;
