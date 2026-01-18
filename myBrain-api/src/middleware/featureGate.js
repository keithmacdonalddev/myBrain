import SystemSettings from '../models/SystemSettings.js';

/**
 * Middleware factory to require a specific feature to be enabled
 * Checks both global kill switch and user-level feature flag
 *
 * @param {string} featureName - The name of the feature to check
 * @returns {Function} Express middleware function
 */
export const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      // Check global kill switch first
      const isKilled = await SystemSettings.isFeatureKilled(featureName);

      if (isKilled) {
        return res.status(503).json({
          error: 'This feature is temporarily unavailable',
          code: 'FEATURE_DISABLED',
          feature: featureName
        });
      }

      // If user is available, check user-level feature access
      if (req.user) {
        // Admin users bypass feature gates
        if (req.user.role === 'admin') {
          return next();
        }

        // Check if user has access to this feature
        if (!req.user.hasFeatureAccess(featureName)) {
          return res.status(403).json({
            error: 'You do not have access to this feature',
            code: 'FEATURE_NOT_AVAILABLE',
            feature: featureName
          });
        }
      }

      next();
    } catch (error) {
      console.error('Feature gate middleware error:', error);
      // On error, allow the request to proceed to avoid blocking legitimate traffic
      next();
    }
  };
};

/**
 * Check if a feature is globally killed (for use in route handlers)
 *
 * @param {string} featureName - The name of the feature to check
 * @returns {Promise<boolean>} True if feature is killed (disabled), false otherwise
 */
export const isFeatureKilled = async (featureName) => {
  return SystemSettings.isFeatureKilled(featureName);
};

/**
 * Middleware to attach feature kill switch status to the request
 * Useful for routes that need to know status without blocking
 */
export const attachFeatureStatus = (...featureNames) => {
  return async (req, res, next) => {
    try {
      const settings = await SystemSettings.getSettings();
      req.featureStatus = {};

      for (const featureName of featureNames) {
        const killSwitch = settings.featureKillSwitches.get(featureName);
        req.featureStatus[featureName] = {
          globallyEnabled: !killSwitch || killSwitch.enabled,
          userHasAccess: req.user ? req.user.hasFeatureAccess(featureName) : false
        };
      }

      next();
    } catch (error) {
      console.error('Feature status middleware error:', error);
      req.featureStatus = {};
      next();
    }
  };
};

export default {
  requireFeature,
  isFeatureKilled,
  attachFeatureStatus
};
