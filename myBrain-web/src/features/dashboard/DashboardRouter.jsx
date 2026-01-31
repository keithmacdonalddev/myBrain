/**
 * =============================================================================
 * DASHBOARDROUTER.JSX - Feature Flag Router for Dashboard Versions
 * =============================================================================
 *
 * Routes to either the V1 or V2 dashboard based on the dashboardV2Enabled
 * feature flag. This allows gradual rollout of the new dashboard design.
 *
 * - V1 (DashboardPage): Current production dashboard
 * - V2 (DashboardPageV2): New dashboard design (when available)
 *
 * The flag defaults to false, so V1 remains the default experience.
 */

import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import DashboardPage from './DashboardPage';
import DashboardPageV2 from './DashboardPageV2';

/**
 * DashboardRouter - Routes to V1 or V2 dashboard based on feature flag
 *
 * @returns {JSX.Element} The appropriate dashboard component
 */
function DashboardRouter() {
  const dashboardV2Enabled = useFeatureFlag('dashboardV2Enabled');

  if (dashboardV2Enabled) {
    return <DashboardPageV2 />;
  }

  return <DashboardPage />;
}

export default DashboardRouter;
