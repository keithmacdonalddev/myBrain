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
 * requireFeature(featureName) - Middleware Factory for Feature Gates
 * ===================================================================
 * This middleware factory creates a middleware that protects routes based on
 * feature availability. It checks both global kill switches and user-level
 * feature access permissions.
 *
 * WHAT IS FEATURE GATING?
 * ----------------------
 * Feature gating controls which users can access which features. It's useful for:
 * 1. EMERGENCY DISABLE: Kill a feature globally if bugs are discovered
 * 2. GRADUAL ROLLOUT: Enable features for some users before full release
 * 3. TIER-BASED ACCESS: Premium users get more features than free users
 * 4. A/B TESTING: Enable features for test groups
 *
 * TWO LEVELS OF CONTROL:
 * ----------------------
 * LEVEL 1: GLOBAL KILL SWITCH (SystemSettings)
 *   - Controls if feature works for EVERYONE
 *   - Use when: Critical bug found, maintenance, incident
 *   - Example: Images feature crashed → kill it globally until fixed
 *   - Bypasses: NO ONE bypasses kill switches
 *   - Response: 503 Service Unavailable
 *
 * LEVEL 2: ROLE-BASED ACCESS (User.hasFeatureAccess)
 *   - Controls if THIS USER can access the feature
 *   - Use when: Feature is premium-only or in beta
 *   - Example: Projects feature for premium users only
 *   - Bypasses: Admin users bypass this (but not kill switches)
 *   - Response: 403 Forbidden
 *
 * CHECK ORDER:
 * 1. Is feature globally killed? → Return 503 (highest priority)
 * 2. Is user logged in? → Skip user checks if no user
 * 3. Is user admin? → Skip feature check (admins get all features)
 * 4. Does user's role have feature? → Check RoleConfig
 *
 * @param {string} featureName - Name of feature to check
 *   Common features:
 *   - 'imagesEnabled': Image upload/gallery
 *   - 'projectsEnabled': Project management
 *   - 'calendarEnabled': Calendar and events
 *   - 'socialEnabled': Connections and messaging
 *   - 'fitnessEnabled': Fitness tracking
 *   - 'kbEnabled': Knowledge base
 *
 * @returns {Function} Express middleware function
 *
 * ATTACHES TO REQUEST:
 * - Nothing - middleware only blocks or allows
 *
 * ERROR RESPONSES:
 * - 503 FEATURE_DISABLED: Feature globally disabled (kill switch active)
 * - 403 FEATURE_NOT_AVAILABLE: User's role doesn't have this feature
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Create middleware for images feature
 * const requireImages = requireFeature('imagesEnabled');
 *
 * // Use in route
 * router.post('/images/upload',
 *   requireAuth,      // User must be logged in
 *   requireImages,    // User must have image feature
 *   uploadImage
 * );
 *
 * // What happens:
 * // 1. Client sends request without auth → requireAuth returns 401
 * // 2. Client logged in, but images killed → requireImages returns 503
 * // 3. Client is free user, images is premium → requireImages returns 403
 * // 4. All checks pass → uploadImage handler runs
 * ```
 *
 * ADMIN BYPASS BEHAVIOR:
 * ----------------------
 * Admin users bypass user-level feature gates (but not kill switches):
 * - Feature killed globally? → 503 (admin blocked too)
 * - Feature unavailable for user's role? → OK (admin bypasses)
 *
 * This is intentional - admins need to test all features,
 * but can't access killed features (which are down for everyone).
 */
export const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      // =========================================================================
      // CHECK 1: GLOBAL KILL SWITCH
      // =========================================================================
      // This is the highest priority check.
      // If a feature is "killed", NO ONE can access it - not even admins.
      // This is for emergency disables when a feature has critical bugs.

      const isKilled = await SystemSettings.isFeatureKilled(featureName);

      if (isKilled) {
        // Feature is globally disabled
        // Use 503 Service Unavailable (temporary issue, try again later)
        return res.status(503).json({
          error: 'This feature is temporarily unavailable',
          code: 'FEATURE_DISABLED',
          feature: featureName
        });
      }

      // =========================================================================
      // CHECK 2: USER-LEVEL FEATURE ACCESS
      // =========================================================================
      // Only check user permissions if:
      // 1. We have a user (some routes might be public)
      // 2. User is not an admin (admins bypass feature checks)

      if (req.user) {
        // Admin users bypass feature gates
        // They can access all features (except globally killed ones)
        if (req.user.role === 'admin') {
          return next();
        }

        // Check if user's role has access to this feature
        // User.hasFeatureAccess() checks the RoleConfig to see if
        // the user's role includes this feature
        // Example: Free role might not have 'projectsEnabled'
        if (!req.user.hasFeatureAccess(featureName)) {
          // User's role doesn't include this feature
          // Use 403 Forbidden (authenticated but not authorized)
          return res.status(403).json({
            error: 'You do not have access to this feature',
            code: 'FEATURE_NOT_AVAILABLE',
            feature: featureName
          });
        }
      }

      // =========================================================================
      // ALL CHECKS PASSED
      // =========================================================================
      // Feature is available globally and user has permission
      // Continue to next middleware/route handler

      next();

    } catch (error) {
      // =========================================================================
      // ERROR HANDLING
      // =========================================================================
      // If feature gate check itself fails (database error, etc.),
      // log it but DON'T block the request.
      // Better to let users through than to block due to a config error.
      // The alternative (blocking everyone on database error) would be worse.

      console.error('Feature gate middleware error:', error);
      next();  // Allow request to continue despite error
    }
  };
};

// =============================================================================
// HELPER: IS FEATURE KILLED
// =============================================================================

/**
 * isFeatureKilled(featureName) - Check if Feature is Globally Disabled
 * =====================================================================
 * This is a convenience function for checking feature kill switch status
 * in route handlers, as opposed to the middleware version that blocks requests.
 *
 * WHEN TO USE THIS:
 * ----------------
 * Unlike the requireFeature middleware (which blocks requests),
 * this function lets you check the kill switch status but decide
 * what to do about it. Useful for:
 * - Graceful degradation (use cached data if live data is down)
 * - Feature-dependent response format
 * - Logging/monitoring
 * - Conditional business logic
 *
 * @param {string} featureName - Name of feature to check
 *
 * @returns {Promise<boolean>} True if killed (disabled), false if working
 *
 * EXAMPLE USAGE:
 * ```javascript
 * router.get('/dashboard', requireAuth, async (req, res) => {
 *   const dashboard = { widgets: [] };
 *
 *   // Maybe we want to check but not block
 *   if (await isFeatureKilled('imagesEnabled')) {
 *     // Images feature is down, skip image widget
 *     console.log('Images feature is down');
 *   } else {
 *     // Images feature is working, include widget
 *     dashboard.widgets.push(await getImageWidget(req.user._id));
 *   }
 *
 *   res.json(dashboard);
 * });
 * ```
 */
export const isFeatureKilled = async (featureName) => {
  // Just delegate to SystemSettings model
  return SystemSettings.isFeatureKilled(featureName);
};

// =============================================================================
// ATTACH FEATURE STATUS MIDDLEWARE
// =============================================================================

/**
 * attachFeatureStatus(...featureNames) - Attach Feature Status to Request
 * ========================================================================
 * This middleware checks feature availability without blocking requests.
 * It's useful for UI endpoints that need to show/hide features based on
 * whether they're available and whether the user has access.
 *
 * WHEN TO USE THIS (vs requireFeature):
 * ------------------------------------
 * requireFeature: Block the request if feature isn't available
 *   → Use for: /images/upload (user can't upload if feature disabled)
 *
 * attachFeatureStatus: Check status but don't block
 *   → Use for: /dashboard (show/hide widgets based on feature status)
 *
 * WHAT IT DOES:
 * 1. Checks each feature's global kill switch status
 * 2. Checks if logged-in user has permission for each feature
 * 3. Attaches status object to request (doesn't block)
 * 4. Route handler uses status to show/hide UI
 *
 * @param {...string} featureNames - Variable number of feature names to check
 *   Examples:
 *   - attachFeatureStatus('imagesEnabled')
 *   - attachFeatureStatus('imagesEnabled', 'projectsEnabled')
 *   - attachFeatureStatus('imagesEnabled', 'projectsEnabled', 'calendarEnabled')
 *
 * @returns {Function} Express middleware function
 *
 * ATTACHES TO REQUEST:
 * req.featureStatus = {
 *   'featureName': {
 *     globallyEnabled: boolean,  // Is feature enabled for everyone?
 *     userHasAccess: boolean     // Does this user have access?
 *   },
 *   'anotherFeature': { ... }
 * }
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Get dashboard with feature availability info
 * router.get('/dashboard',
 *   requireAuth,
 *   // Check status of 3 features without blocking
 *   attachFeatureStatus('imagesEnabled', 'projectsEnabled', 'calendarEnabled'),
 *   getDashboard
 * );
 *
 * const getDashboard = (req, res) => {
 *   const response = {
 *     dashboard: {
 *       widgets: []
 *     },
 *     // Include feature status so frontend knows what to show
 *     features: req.featureStatus
 *   };
 *
 *   // Add images widget only if user can access it
 *   if (req.featureStatus.imagesEnabled?.userHasAccess) {
 *     response.dashboard.widgets.push('imagesWidget');
 *   }
 *
 *   // Add projects widget only if not globally disabled
 *   if (req.featureStatus.projectsEnabled?.globallyEnabled) {
 *     response.dashboard.widgets.push('projectsWidget');
 *   }
 *
 *   res.json(response);
 * };
 * ```
 */
export const attachFeatureStatus = (...featureNames) => {
  return async (req, res, next) => {
    try {
      // =========================================================================
      // GET ALL SYSTEM SETTINGS
      // =========================================================================
      // This includes all kill switches in one query (more efficient than
      // checking each feature separately)

      const settings = await SystemSettings.getSettings();

      // =========================================================================
      // INITIALIZE FEATURE STATUS OBJECT
      // =========================================================================
      // Will be populated with status for each requested feature

      req.featureStatus = {};

      // =========================================================================
      // CHECK EACH REQUESTED FEATURE
      // =========================================================================
      // For each feature name passed as an argument

      for (const featureName of featureNames) {
        // Get the kill switch for this feature (if one exists)
        // Returns null if no kill switch is configured
        const killSwitch = settings.featureKillSwitches.get(featureName);

        // Determine feature status
        // A feature is globally enabled if:
        // - No kill switch exists (not disabled), OR
        // - Kill switch exists but .enabled is true (explicitly enabled)
        req.featureStatus[featureName] = {
          // Is this feature enabled globally for everyone?
          globallyEnabled: !killSwitch || killSwitch.enabled,

          // Does this specific user have access?
          // Only true if user is logged in AND their role includes the feature
          userHasAccess: req.user ? req.user.hasFeatureAccess(featureName) : false
        };
      }

      next();

    } catch (error) {
      // =========================================================================
      // ERROR HANDLING
      // =========================================================================
      // If getting settings fails (database error, etc.),
      // don't block the request. Just continue without feature status.

      console.error('Feature status middleware error:', error);
      req.featureStatus = {};  // Empty status, route handler checks for this
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
