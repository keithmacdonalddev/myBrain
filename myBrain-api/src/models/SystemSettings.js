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
