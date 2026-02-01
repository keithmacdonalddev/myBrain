/**
 * =============================================================================
 * SYSTEMSETTINGS.JS - Global System Configuration Model
 * =============================================================================
 *
 * This file defines the SystemSettings model - the data structure for
 * system-wide settings that affect the entire myBrain application.
 *
 * WHAT ARE SYSTEM SETTINGS?
 * -------------------------
 * System settings are global configurations that apply to ALL users.
 * Unlike RoleConfig (which affects specific user roles), SystemSettings
 * controls features at the platform level.
 *
 * KILL SWITCHES:
 * --------------
 * The main feature of SystemSettings is "Kill Switches" - the ability
 * to instantly disable features across the entire platform.
 *
 * WHY KILL SWITCHES?
 * ------------------
 * 1. EMERGENCIES: If a feature has a critical bug, disable it instantly
 * 2. MAINTENANCE: Temporarily disable features during updates
 * 3. INCIDENTS: Disable features causing problems without deploying code
 * 4. GRADUAL ROLLOUT: Disable features globally, then enable per role
 *
 * EXAMPLE SCENARIO:
 * -----------------
 * The image upload feature has a bug causing server crashes:
 * 1. Admin immediately sets kill switch: imagesEnabled = false
 * 2. No users can access images feature (even if their role allows it)
 * 3. Developers fix the bug and deploy
 * 4. Admin re-enables: imagesEnabled = true
 * 5. Feature is back for everyone
 *
 * SINGLETON PATTERN:
 * ------------------
 * Like SidebarConfig, there's only ONE SystemSettings document.
 * It always has the ID "system".
 *
 * KILL SWITCH vs ROLE CONFIG:
 * ---------------------------
 * - ROLE CONFIG: "Can free users access images?" (role-level control)
 * - KILL SWITCH: "Is images working for ANYONE right now?" (global control)
 *
 * Kill switches override role settings. If a kill switch is OFF,
 * no one can use that feature regardless of their role.
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Mongoose is the library we use to interact with MongoDB.
 * It provides schemas (blueprints) and models (tools to work with data).
 */
import mongoose from 'mongoose';
import { isValidIP, ipArrayValidator } from '../utils/ipValidation.js';

// =============================================================================
// SUB-SCHEMAS
// =============================================================================

/**
 * Kill Switch Schema
 * ------------------
 * Defines the structure of a single kill switch.
 * Tracks whether a feature is enabled and who disabled it.
 */
const killSwitchSchema = new mongoose.Schema({
  /**
   * enabled: Is this feature currently enabled?
   * - true = feature is working normally
   * - false = feature is disabled for ALL users
   */
  enabled: {
    type: Boolean,
    default: true
  },

  /**
   * disabledAt: When was this feature disabled?
   * - Only set when enabled becomes false
   * - Useful for tracking how long a feature has been down
   */
  disabledAt: Date,

  /**
   * disabledBy: Which admin disabled this feature?
   * - References a User document
   * - For accountability and auditing
   */
  disabledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  /**
   * reason: Why was this feature disabled?
   * - EXAMPLE: "Critical bug in image upload"
   * - EXAMPLE: "Maintenance window"
   * - EXAMPLE: "High server load"
   */
  reason: String
}, { _id: false }); // Don't create separate _id for sub-documents

// =============================================================================
// SYSTEM SETTINGS SCHEMA DEFINITION
// =============================================================================

/**
 * The System Settings Schema
 * --------------------------
 * Main schema for the system settings document.
 */
const systemSettingsSchema = new mongoose.Schema({

  // ===========================================================================
  // IDENTIFIER
  // ===========================================================================

  /**
   * _id: Fixed ID for the singleton pattern
   * - Always 'system' - there's only one settings document
   */
  _id: {
    type: String,
    default: 'system'
  },

  // ===========================================================================
  // RATE LIMIT CONFIGURATION
  // ===========================================================================

  /**
   * rateLimitConfig: Global rate limiting settings for authentication
   * - Controls how many login attempts are allowed and the time window
   * - Trusted IPs can bypass rate limiting (for admin access)
   */
  rateLimitConfig: {
    /**
     * enabled: Whether rate limiting is active
     * - true = rate limiting is enforced
     * - false = no rate limiting (not recommended for production)
     */
    enabled: {
      type: Boolean,
      default: true
    },

    /**
     * windowMs: Time window in milliseconds
     * - Default: 15 minutes (900,000 ms)
     * - After this time, the counter resets
     */
    windowMs: {
      type: Number,
      default: 15 * 60 * 1000 // 15 minutes
    },

    /**
     * maxAttempts: Maximum attempts allowed per window
     * - Default: 10 attempts
     * - After this many attempts, user is blocked
     */
    maxAttempts: {
      type: Number,
      default: 10
    },

    /**
     * trustedIPs: IP addresses that bypass rate limiting
     * - Useful for admin access or known safe IPs
     * - Array of IP address strings
     * - Validated: Each IP must be valid IPv4 or IPv6
     * - Limited: Maximum 100 IPs allowed
     */
    trustedIPs: {
      type: [String],
      default: [],
      validate: ipArrayValidator
    },

    /**
     * alertThreshold: Number of rate limit events to trigger an alert
     * - When this many rate limit events occur within alertWindowMs, create an alert
     * - Default: 5 events
     */
    alertThreshold: {
      type: Number,
      default: 5
    },

    /**
     * alertWindowMs: Time window for alert threshold
     * - Default: 1 hour (3,600,000 ms)
     */
    alertWindowMs: {
      type: Number,
      default: 60 * 60 * 1000 // 1 hour
    },

    /**
     * updatedAt: When rate limit config was last changed
     */
    updatedAt: Date,

    /**
     * updatedBy: Which admin made the last change
     */
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // ===========================================================================
  // KILL SWITCHES
  // ===========================================================================

  /**
   * featureKillSwitches: Map of feature kill switches
   * - Keys are feature names (e.g., 'imagesEnabled', 'calendarEnabled')
   * - Values are killSwitch objects (enabled, disabledAt, disabledBy, reason)
   *
   * EXAMPLE:
   * {
   *   'imagesEnabled': { enabled: false, disabledAt: Date, disabledBy: adminId, reason: 'Bug fix' },
   *   'calendarEnabled': { enabled: true }
   * }
   */
  featureKillSwitches: {
    type: Map,
    of: killSwitchSchema,
    default: new Map()
  },

  // ===========================================================================
  // FEEDBACK ROUTING CONFIGURATION
  // ===========================================================================

  /**
   * feedbackRouting: Configuration for automatic feedback routing and task creation
   * - Controls how user feedback is processed and routed to projects
   * - Enables/disables feedback system globally
   * - Specifies admin user and project for task creation
   * - Configures task creation behavior and default priority
   */
  feedbackRouting: {
    /**
     * enabled: Whether feedback routing is active
     * - true = feedback submissions create tasks automatically
     * - false = feedback is stored but no tasks created
     */
    enabled: {
      type: Boolean,
      default: false
    },

    /**
     * adminUserId: Admin user to receive feedback notifications and own created tasks
     * - References User document
     * - Tasks created from feedback will be owned by this user
     * - Should be an admin with project access
     */
    adminUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    /**
     * projectId: Project where feedback tasks will be created
     * - References Project document
     * - All feedback-sourced tasks go to this project
     * - Project must be owned by or accessible to the admin user
     */
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null
    },

    /**
     * createTasks: Whether to automatically create tasks for feedback
     * - true = create tasks in the configured project
     * - false = store feedback only, no task creation
     * - Useful for beta testing feedback without creating too many tasks
     */
    createTasks: {
      type: Boolean,
      default: true
    },

    /**
     * defaultPriority: Default priority level for feedback-sourced tasks
     * - 'critical' = emergency, blocking work
     * - 'high' = important, should be prioritized
     * - 'medium' = normal priority
     * - 'low' = nice to have
     * - Can be overridden by feedback type (bugs get higher priority)
     */
    defaultPriority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium'
    }
  },

  // ===========================================================================
  // TRACKING
  // ===========================================================================

  /**
   * updatedAt: When settings were last changed
   */
  updatedAt: {
    type: Date,
    default: Date.now
  },

  /**
   * updatedBy: Which admin made the last change
   */
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: false,        // We manage updatedAt ourselves
  collection: 'system_settings' // Custom collection name
});

// =============================================================================
// STATIC METHODS (Called on the Model, not an instance)
// =============================================================================

/**
 * getSettings()
 * -------------
 * Get the system settings (singleton pattern).
 * Creates default settings if none exist.
 *
 * @returns {Object} - The system settings document
 *
 * EXAMPLE:
 * const settings = await SystemSettings.getSettings();
 * // settings.featureKillSwitches is a Map of kill switches
 */
systemSettingsSchema.statics.getSettings = async function() {
  // Try to find existing settings
  let settings = await this.findById('system');

  // If no settings exist, create default
  if (!settings) {
    settings = await this.create({ _id: 'system' });
  }

  return settings;
};

/**
 * isFeatureKilled(featureName)
 * ----------------------------
 * Check if a feature is globally killed (disabled).
 * Returns true if the feature is KILLED (disabled), false otherwise.
 *
 * @param {string} featureName - The feature to check
 * @returns {boolean} - true if KILLED (disabled), false if working
 *
 * EXAMPLE:
 * const isKilled = await SystemSettings.isFeatureKilled('imagesEnabled');
 * if (isKilled) {
 *   // Show "Feature temporarily unavailable" message
 * }
 *
 * USE IN MIDDLEWARE:
 * This should be checked BEFORE role-based feature checks.
 * If globally killed, no user should access regardless of role.
 */
systemSettingsSchema.statics.isFeatureKilled = async function(featureName) {
  const settings = await this.getSettings();
  const killSwitch = settings.featureKillSwitches.get(featureName);

  // If no kill switch exists, feature is NOT killed (default: enabled)
  if (!killSwitch) return false;

  // Return true if DISABLED (enabled === false)
  return !killSwitch.enabled;
};

/**
 * getRateLimitConfig()
 * --------------------
 * Get the current rate limit configuration.
 *
 * @returns {Object} - Rate limit configuration
 *
 * EXAMPLE:
 * const config = await SystemSettings.getRateLimitConfig();
 * // { enabled: true, windowMs: 900000, maxAttempts: 10, trustedIPs: ['192.168.1.1'] }
 */
systemSettingsSchema.statics.getRateLimitConfig = async function() {
  const settings = await this.getSettings();
  return {
    enabled: settings.rateLimitConfig?.enabled ?? true,
    windowMs: settings.rateLimitConfig?.windowMs ?? 15 * 60 * 1000,
    maxAttempts: settings.rateLimitConfig?.maxAttempts ?? 10,
    trustedIPs: settings.rateLimitConfig?.trustedIPs ?? [],
    alertThreshold: settings.rateLimitConfig?.alertThreshold ?? 5,
    alertWindowMs: settings.rateLimitConfig?.alertWindowMs ?? 60 * 60 * 1000,
    updatedAt: settings.rateLimitConfig?.updatedAt,
    updatedBy: settings.rateLimitConfig?.updatedBy
  };
};

/**
 * updateRateLimitConfig(config, adminId)
 * --------------------------------------
 * Update rate limit configuration.
 *
 * @param {Object} config - Configuration to update
 * @param {string} adminId - Admin user ID making the change
 * @returns {Object} - Updated configuration
 */
systemSettingsSchema.statics.updateRateLimitConfig = async function(config, adminId) {
  const settings = await this.getSettings();

  // Merge with existing config, only updating provided fields
  const currentConfig = settings.rateLimitConfig || {};

  if (config.enabled !== undefined) currentConfig.enabled = config.enabled;
  if (config.windowMs !== undefined) currentConfig.windowMs = config.windowMs;
  if (config.maxAttempts !== undefined) currentConfig.maxAttempts = config.maxAttempts;
  if (config.trustedIPs !== undefined) currentConfig.trustedIPs = config.trustedIPs;
  if (config.alertThreshold !== undefined) currentConfig.alertThreshold = config.alertThreshold;
  if (config.alertWindowMs !== undefined) currentConfig.alertWindowMs = config.alertWindowMs;

  currentConfig.updatedAt = new Date();
  currentConfig.updatedBy = adminId;

  settings.rateLimitConfig = currentConfig;
  settings.updatedAt = new Date();
  settings.updatedBy = adminId;

  await settings.save();
  return this.getRateLimitConfig();
};

/**
 * addTrustedIP(ip, adminId)
 * -------------------------
 * Add an IP address to the trusted IPs list.
 * Uses atomic $addToSet operation to prevent race conditions.
 *
 * @param {string} ip - IP address to add (must be valid IP)
 * @param {string} adminId - Admin user ID making the change
 * @returns {Object} - Updated configuration
 */
systemSettingsSchema.statics.addTrustedIP = async function(ip, adminId) {
  // Validate IP before adding
  if (!isValidIP(ip)) {
    const error = new Error('Invalid IP address format');
    error.code = 'INVALID_IP_FORMAT';
    throw error;
  }

  // Use atomic $addToSet to prevent duplicates and race conditions
  const result = await this.findOneAndUpdate(
    { _id: 'system' },
    {
      $addToSet: { 'rateLimitConfig.trustedIPs': ip.trim() },
      $set: {
        'rateLimitConfig.updatedAt': new Date(),
        'rateLimitConfig.updatedBy': adminId,
        updatedAt: new Date(),
        updatedBy: adminId
      }
    },
    {
      new: true,
      upsert: true,
      runValidators: true
    }
  );

  return result?.rateLimitConfig || await this.getRateLimitConfig();
};

/**
 * removeTrustedIP(ip, adminId)
 * ---------------------------
 * Remove an IP address from the trusted IPs list.
 * Uses atomic $pull operation to prevent race conditions.
 *
 * @param {string} ip - IP address to remove
 * @param {string} adminId - Admin user ID making the change
 * @returns {Object} - Updated configuration
 */
systemSettingsSchema.statics.removeTrustedIP = async function(ip, adminId) {
  // Use atomic $pull to prevent race conditions
  const result = await this.findOneAndUpdate(
    { _id: 'system' },
    {
      $pull: { 'rateLimitConfig.trustedIPs': ip },
      $set: {
        'rateLimitConfig.updatedAt': new Date(),
        'rateLimitConfig.updatedBy': adminId,
        updatedAt: new Date(),
        updatedBy: adminId
      }
    },
    { new: true }
  );

  return result?.rateLimitConfig || await this.getRateLimitConfig();
};

/**
 * setFeatureKillSwitch(featureName, enabled, adminId, reason)
 * -----------------------------------------------------------
 * Set a feature kill switch (enable or disable a feature globally).
 *
 * @param {string} featureName - Feature to toggle
 * @param {boolean} enabled - true = enable, false = disable (kill)
 * @param {string} adminId - Admin user ID making the change
 * @param {string} reason - Why the feature is being toggled
 * @returns {Object} - Updated settings document
 *
 * EXAMPLE - Disable a feature:
 * await SystemSettings.setFeatureKillSwitch(
 *   'imagesEnabled',
 *   false,
 *   adminId,
 *   'Critical bug in upload process'
 * );
 *
 * EXAMPLE - Re-enable a feature:
 * await SystemSettings.setFeatureKillSwitch(
 *   'imagesEnabled',
 *   true,
 *   adminId,
 *   'Bug fixed and deployed'
 * );
 */
systemSettingsSchema.statics.setFeatureKillSwitch = async function(featureName, enabled, adminId, reason = '') {
  const settings = await this.getSettings();

  // Build the kill switch object
  const killSwitch = {
    enabled,
    reason
  };

  if (!enabled) {
    // Disabling the feature - record when and who
    killSwitch.disabledAt = new Date();
    killSwitch.disabledBy = adminId;
  } else {
    // Re-enabling the feature - clear the disabled info
    killSwitch.disabledAt = null;
    killSwitch.disabledBy = null;
  }

  // Update the Map
  settings.featureKillSwitches.set(featureName, killSwitch);
  settings.updatedAt = new Date();
  settings.updatedBy = adminId;

  await settings.save();
  return settings;
};

/**
 * getFeedbackRouting()
 * --------------------
 * Get the feedback routing configuration.
 * Returns the current routing settings or a safe default if not configured.
 *
 * @returns {Object} - Feedback routing configuration
 *
 * EXAMPLE:
 * const config = await SystemSettings.getFeedbackRouting();
 * // { enabled: false, adminUserId: null, projectId: null, createTasks: true, defaultPriority: 'medium' }
 *
 * USES:
 * - When processing feedback submission to determine routing
 * - When admin configures feedback system
 * - When checking if feedback feature is enabled
 */
systemSettingsSchema.statics.getFeedbackRouting = async function() {
  const settings = await this.getSettings();
  return settings.feedbackRouting || {
    enabled: false,
    adminUserId: null,
    projectId: null,
    createTasks: true,
    defaultPriority: 'medium'
  };
};

/**
 * updateFeedbackRouting(config)
 * ----------------------------
 * Update feedback routing configuration.
 * Enables admin to configure how feedback is routed and tasks are created.
 *
 * @param {Object} config - Configuration to update
 * @param {boolean} config.enabled - Enable/disable feedback routing
 * @param {string} config.adminUserId - Admin user ID for notifications
 * @param {string} config.projectId - Project for task creation
 * @param {boolean} config.createTasks - Enable/disable automatic task creation
 * @param {string} config.defaultPriority - Default priority for tasks
 * @returns {Object} - Updated feedback routing configuration
 *
 * EXAMPLE:
 * const updated = await SystemSettings.updateFeedbackRouting({
 *   enabled: true,
 *   adminUserId: admin._id,
 *   projectId: project._id,
 *   createTasks: true,
 *   defaultPriority: 'high'
 * });
 *
 * USES:
 * - Admin Settings page to configure feedback system
 * - Enables/disables feedback feature globally
 */
systemSettingsSchema.statics.updateFeedbackRouting = async function(config) {
  return this.findOneAndUpdate(
    { _id: 'system' },
    {
      $set: {
        feedbackRouting: config,
        updatedAt: new Date()
      }
    },
    { new: true, upsert: true }
  );
};

// =============================================================================
// INSTANCE METHODS (Called on a settings document)
// =============================================================================

/**
 * getKillSwitchesObject()
 * -----------------------
 * Get all kill switches as a plain JavaScript object.
 * Converts the Map to an object for easier use.
 *
 * @returns {Object} - Kill switches as { featureName: switchData }
 *
 * EXAMPLE:
 * const switches = settings.getKillSwitchesObject();
 * // {
 * //   'imagesEnabled': { enabled: false, disabledAt: Date, reason: '...' },
 * //   'calendarEnabled': { enabled: true }
 * // }
 */
systemSettingsSchema.methods.getKillSwitchesObject = function() {
  const result = {};

  // Convert Map entries to plain object
  for (const [key, value] of this.featureKillSwitches) {
    result[key] = {
      enabled: value.enabled,
      disabledAt: value.disabledAt,
      disabledBy: value.disabledBy,
      reason: value.reason
    };
  }

  return result;
};

/**
 * toSafeJSON()
 * ------------
 * Convert to a safe JSON object for API responses.
 * Converts the Map to a plain object.
 *
 * @returns {Object} - Safe JSON representation
 */
systemSettingsSchema.methods.toSafeJSON = function() {
  return {
    featureKillSwitches: this.getKillSwitchesObject(),
    updatedAt: this.updatedAt,
    updatedBy: this.updatedBy
  };
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the SystemSettings model from the schema.
 * This gives us methods to:
 * - Get settings: SystemSettings.getSettings()
 * - Check kill switch: SystemSettings.isFeatureKilled(featureName)
 * - Set kill switch: SystemSettings.setFeatureKillSwitch(name, enabled, adminId, reason)
 * - Get as object: settings.getKillSwitchesObject()
 * - Convert to JSON: settings.toSafeJSON()
 *
 * TYPICAL USAGE FLOW:
 * 1. Check if feature is killed globally: SystemSettings.isFeatureKilled('feature')
 * 2. If not killed, check if user's role has the feature: RoleConfig check
 * 3. If both pass, user can access the feature
 */
const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);

export default SystemSettings;
