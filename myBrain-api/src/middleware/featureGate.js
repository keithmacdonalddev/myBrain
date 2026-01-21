/**
 * =============================================================================
 * FEATUREGATE.JS - Feature Flag Middleware
 * =============================================================================
 *
 * This file provides middleware for controlling access to features based on:
 * 1. Global kill switches (emergency feature disable)
 * 2. User-level feature flags (role-based access)
 *
 * WHAT IS FEATURE GATING?
 * -----------------------
 * Feature gating controls WHO can access WHAT features. It's like a bouncer
 * at a club door - checking if you're on the list before letting you in.
 *
 * TWO LEVELS OF CONTROL:
 * ----------------------
 *
 * 1. GLOBAL KILL SWITCHES (SystemSettings)
 *    - Emergency off-switch for entire features
 *    - Affects ALL users including admins (usually)
 *    - Use for: Critical bugs, maintenance, incidents
 *    - Example: Images feature crashes the server → kill it globally
 *
 * 2. USER FEATURE FLAGS (User.hasFeatureAccess)
 *    - Per-user or per-role feature access
 *    - Different tiers can access different features
 *    - Use for: Premium features, gradual rollout
 *    - Example: Only premium users can access projects
 *
 * CHECK ORDER:
 * ------------
 * 1. Check global kill switch first (highest priority)
 * 2. If not killed, check user's feature access
 * 3. Admin users bypass user-level checks (but not kill switches)
 *
 * RESPONSE CODES:
 * ---------------
 * - 503: Feature globally disabled (temporary, try again later)
 * - 403: User doesn't have access to feature (upgrade needed)
 *
 * EXAMPLE USAGE:
 * --------------
 * // Protect a route that requires the images feature
 * router.get('/images', requireAuth, requireFeature('imagesEnabled'), getImages);
 *
 * // If images feature is killed globally → 503 error
 * // If user's role doesn't have images → 403 error
 * // If both pass → route handler runs
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * SystemSettings model for checking global kill switches.
 * Kill switches can instantly disable features across the entire platform.
 */
import SystemSettings from '../models/SystemSettings.js';

// =============================================================================
// REQUIRE FEATURE MIDDLEWARE
// =============================================================================

/**
 * requireFeature(featureName)
 * ---------------------------
 * Middleware factory that creates a middleware to check feature access.
 *
 * @param {string} featureName - The feature to check (e.g., 'imagesEnabled')
 * @returns {Function} Express middleware function
 *
 * CHECKS PERFORMED:
 * 1. Global kill switch - Is the feature turned off for everyone?
 * 2. User feature access - Does this user's role have the feature?
 *
 * EXAMPLE:
 * // Create middleware for images feature
 * const requireImages = requireFeature('imagesEnabled');
 *
 * // Use in route
 * router.post('/images/upload', requireAuth, requireImages, uploadImage);
 *
 * FEATURE NAMES:
 * - 'imagesEnabled'
 * - 'projectsEnabled'
 * - 'calendarEnabled'
 * - 'socialEnabled'
 * - 'fitnessEnabled'
 * - 'kbEnabled'
 * - etc.
 */
export const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      // ==================================================
      // CHECK 1: Global Kill Switch
      // ==================================================
      // This is the highest priority check.
      // If a feature is "killed", NO ONE can access it.

      const isKilled = await SystemSettings.isFeatureKilled(featureName);

      if (isKilled) {
        // Feature is globally disabled
        // Use 503 (Service Unavailable) to indicate temporary issue
        return res.status(503).json({
          error: 'This feature is temporarily unavailable',
          code: 'FEATURE_DISABLED',
          feature: featureName
        });
      }

      // ==================================================
      // CHECK 2: User-Level Feature Access
      // ==================================================
      // Only check if we have a user (some routes might be public)

      if (req.user) {
        // Admin users bypass user-level feature gates
        // They can access all features (except globally killed ones)
        if (req.user.role === 'admin') {
          return next();
        }

        // Check if user's role has access to this feature
        // This calls User.hasFeatureAccess() which checks RoleConfig
        if (!req.user.hasFeatureAccess(featureName)) {
          // User's role doesn't include this feature
          // Use 403 (Forbidden) - authenticated but not authorized
          return res.status(403).json({
            error: 'You do not have access to this feature',
            code: 'FEATURE_NOT_AVAILABLE',
            feature: featureName
          });
        }
      }

      // All checks passed - allow the request to continue
      next();
    } catch (error) {
      // Log the error but DON'T block the request
      // Better to let users through than to block due to a config error
      console.error('Feature gate middleware error:', error);
      next();
    }
  };
};

// =============================================================================
// HELPER: IS FEATURE KILLED
// =============================================================================

/**
 * isFeatureKilled(featureName)
 * ----------------------------
 * Check if a feature is globally killed.
 * Convenience function for use in route handlers (not as middleware).
 *
 * @param {string} featureName - The feature to check
 * @returns {Promise<boolean>} True if killed (disabled), false if working
 *
 * EXAMPLE:
 * const handler = async (req, res) => {
 *   // Maybe we want to check but not block
 *   if (await isFeatureKilled('imagesEnabled')) {
 *     // Feature is down, return cached data instead
 *     return res.json({ data: cachedData, note: 'Real-time data unavailable' });
 *   }
 *   // Feature is working, proceed normally
 *   const data = await fetchLiveData();
 *   res.json({ data });
 * };
 */
export const isFeatureKilled = async (featureName) => {
  return SystemSettings.isFeatureKilled(featureName);
};

// =============================================================================
// ATTACH FEATURE STATUS MIDDLEWARE
// =============================================================================

/**
 * attachFeatureStatus(...featureNames)
 * ------------------------------------
 * Middleware that attaches feature status to the request object.
 * Useful when you need to know status without blocking the request.
 *
 * @param {...string} featureNames - Features to check status of
 * @returns {Function} Express middleware function
 *
 * AFTER THIS MIDDLEWARE:
 * req.featureStatus = {
 *   'imagesEnabled': { globallyEnabled: true, userHasAccess: true },
 *   'projectsEnabled': { globallyEnabled: true, userHasAccess: false }
 * }
 *
 * EXAMPLE:
 * // Check multiple features without blocking
 * router.get('/dashboard',
 *   requireAuth,
 *   attachFeatureStatus('imagesEnabled', 'projectsEnabled', 'calendarEnabled'),
 *   getDashboard
 * );
 *
 * const getDashboard = (req, res) => {
 *   // Can show/hide UI based on feature status
 *   res.json({
 *     features: req.featureStatus,
 *     // Show images widget only if user has access
 *     showImagesWidget: req.featureStatus.imagesEnabled?.userHasAccess
 *   });
 * };
 */
export const attachFeatureStatus = (...featureNames) => {
  return async (req, res, next) => {
    try {
      // Get all system settings (contains kill switches)
      const settings = await SystemSettings.getSettings();

      // Initialize feature status object
      req.featureStatus = {};

      // Check each requested feature
      for (const featureName of featureNames) {
        // Get kill switch status (if exists)
        const killSwitch = settings.featureKillSwitches.get(featureName);

        // Determine status
        req.featureStatus[featureName] = {
          // Globally enabled if no kill switch OR kill switch says enabled
          globallyEnabled: !killSwitch || killSwitch.enabled,
          // User has access if logged in and their role includes it
          userHasAccess: req.user ? req.user.hasFeatureAccess(featureName) : false
        };
      }

      next();
    } catch (error) {
      console.error('Feature status middleware error:', error);
      // On error, set empty status and continue
      req.featureStatus = {};
      next();
    }
  };
};

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all feature gate utilities.
 *
 * USAGE:
 *
 * import { requireFeature, attachFeatureStatus } from './middleware/featureGate.js';
 *
 * // Require a feature (block if not available)
 * router.get('/images', requireAuth, requireFeature('imagesEnabled'), handler);
 *
 * // Attach status (don't block, just provide info)
 * router.get('/dashboard', attachFeatureStatus('imagesEnabled'), handler);
 */
export default {
  requireFeature,
  isFeatureKilled,
  attachFeatureStatus
};
