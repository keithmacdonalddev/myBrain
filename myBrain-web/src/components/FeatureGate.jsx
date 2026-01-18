import { useFeatureFlag } from '../hooks/useFeatureFlag';

/**
 * Component that conditionally renders children based on feature flags
 *
 * @param {string} flag - The feature flag to check
 * @param {React.ReactNode} children - Content to show when flag is enabled
 * @param {React.ReactNode} fallback - Content to show when flag is disabled (optional)
 *
 * @example
 * <FeatureGate flag="fitness.enabled" fallback={<ComingSoon />}>
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
  const { useIsAdmin } = require('../hooks/useFeatureFlag');
  const isAdmin = useIsAdmin();

  if (isAdmin) {
    return children;
  }

  return fallback;
}

/**
 * Component for showing "Coming Soon" placeholder (for beta/dev features)
 */
export function ComingSoon({ featureName = 'This feature' }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center p-8 max-w-md">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🚀</span>
        </div>
        <h2 className="text-xl font-semibold text-text mb-2">Coming Soon</h2>
        <p className="text-muted">
          {featureName} is currently under development. Check back soon!
        </p>
      </div>
    </div>
  );
}

/**
 * Component for showing "Feature Not Enabled" placeholder (for premium/optional features)
 */
export function FeatureNotEnabled({ featureName = 'This feature' }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center p-8 max-w-md">
        <div className="w-16 h-16 bg-muted/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔒</span>
        </div>
        <h2 className="text-xl font-semibold text-text mb-2">Feature Not Enabled</h2>
        <p className="text-muted">
          {featureName} is not enabled for your account. Contact your administrator to request access.
        </p>
      </div>
    </div>
  );
}

export default FeatureGate;
