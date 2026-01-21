/**
 * =============================================================================
 * ROLECONFIG.JS - User Role Configuration Model
 * =============================================================================
 *
 * This file defines the RoleConfig model - the data structure for managing
 * what features and limits each user role (free, premium, admin) has access to.
 *
 * WHAT IS ROLE CONFIG?
 * --------------------
 * Different users have different access levels in myBrain:
 * - FREE users: Basic features with limits
 * - PREMIUM users: More features with higher limits
 * - ADMIN users: All features, no limits
 *
 * This model stores the configuration for each role, including:
 * - LIMITS: How many notes, tasks, files, etc. they can create
 * - FEATURES: Which features are enabled (calendar, projects, etc.)
 *
 * HOW IT WORKS:
 * -------------
 * 1. There's one RoleConfig document per role (free, premium, admin)
 * 2. The _id IS the role name: 'free', 'premium', or 'admin'
 * 3. When a user signs up, their role determines their limits/features
 * 4. Admins can adjust these settings without code changes
 *
 * LIMITS (-1 = Unlimited):
 * ------------------------
 * - maxNotes: How many notes they can create
 * - maxTasks: How many tasks they can create
 * - maxProjects: How many projects they can create
 * - maxStorageBytes: Total storage space in bytes
 * - maxFileSize: Maximum size for a single file
 * - And more...
 *
 * The special value -1 means "unlimited" - no restrictions.
 *
 * FEATURES (true/false):
 * ----------------------
 * Features can be toggled on/off per role:
 * - calendarEnabled: Calendar and events feature
 * - projectsEnabled: Project management feature
 * - imagesEnabled: Image gallery feature
 * - filesEnabled: File storage feature
 * - socialEnabled: Connections and sharing
 * - And more...
 *
 * SYNC WITH DEFAULTS:
 * -------------------
 * When new features are added to the codebase, the syncWithDefaults()
 * method adds them to existing role configs without overwriting
 * settings that admins have customized.
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
// ROLE CONFIG SCHEMA DEFINITION
// =============================================================================

/**
 * Role Configuration Schema
 * -------------------------
 * Stores default limits and feature settings per role.
 * Note: -1 = unlimited for any limit value.
 */
const roleConfigSchema = new mongoose.Schema({

  // ===========================================================================
  // ROLE IDENTIFIER
  // ===========================================================================

  /**
   * _id: The role this config belongs to
   * - Uses role name as the ID (no separate _id field)
   *
   * VALUES:
   * - 'free': Free tier users
   * - 'premium': Paid/premium tier users
   * - 'admin': Administrator users
   */
  _id: {
    type: String,
    enum: ['free', 'premium', 'admin'],
    required: true
  },

  // ===========================================================================
  // USAGE LIMITS
  // ===========================================================================

  /**
   * limits: Resource limits for this role
   * All values default to -1 (unlimited)
   */
  limits: {
    /**
     * maxNotes: Maximum number of notes user can create
     * - -1 = unlimited
     * - EXAMPLE: 100 for free, -1 for premium
     */
    maxNotes: {
      type: Number,
      default: -1
    },

    /**
     * maxTasks: Maximum number of tasks user can create
     */
    maxTasks: {
      type: Number,
      default: -1
    },

    /**
     * maxProjects: Maximum number of projects user can create
     */
    maxProjects: {
      type: Number,
      default: -1
    },

    /**
     * maxEvents: Maximum number of calendar events
     */
    maxEvents: {
      type: Number,
      default: -1
    },

    /**
     * maxImages: Maximum number of images user can upload
     */
    maxImages: {
      type: Number,
      default: -1
    },

    /**
     * maxStorageBytes: Total storage space in bytes
     * - -1 = unlimited
     * - EXAMPLE: 100 * 1024 * 1024 = 100MB for free users
     */
    maxStorageBytes: {
      type: Number,
      default: -1
    },

    /**
     * maxCategories: Maximum number of life area categories
     */
    maxCategories: {
      type: Number,
      default: -1
    },

    // =========================
    // FILE STORAGE LIMITS
    // =========================

    /**
     * maxFiles: Total number of files user can upload
     * - -1 = unlimited
     */
    maxFiles: {
      type: Number,
      default: -1
    },

    /**
     * maxFileSize: Maximum size for a single file in bytes
     * - -1 = unlimited
     * - EXAMPLE: 25 * 1024 * 1024 = 25MB per file for free users
     */
    maxFileSize: {
      type: Number,
      default: -1
    },

    /**
     * maxFolders: Maximum number of folders user can create
     */
    maxFolders: {
      type: Number,
      default: -1
    },

    /**
     * maxVersionsPerFile: How many versions to keep per file
     * - File versioning keeps old copies when files are updated
     */
    maxVersionsPerFile: {
      type: Number,
      default: -1
    },

    /**
     * maxPublicShares: Maximum active public share links
     * - Limits how many items can be publicly shared at once
     */
    maxPublicShares: {
      type: Number,
      default: -1
    },

    /**
     * allowedFileTypes: Which file types can be uploaded
     * - ['*'] = all file types allowed
     * - EXAMPLE: ['image/*', 'application/pdf'] = only images and PDFs
     */
    allowedFileTypes: {
      type: [String],
      default: ['*']
    },

    /**
     * forbiddenFileTypes: File types that are never allowed
     * - EXAMPLE: ['.exe', '.bat'] = no executable files
     */
    forbiddenFileTypes: {
      type: [String],
      default: []
    }
  },

  // ===========================================================================
  // FEATURE FLAGS
  // ===========================================================================

  /**
   * features: Which features are enabled for this role
   * - Stored as a Map (key-value pairs)
   * - Keys are feature names (e.g., 'calendarEnabled')
   * - Values are booleans (true = enabled, false = disabled)
   */
  features: {
    type: Map,
    of: Boolean,
    default: new Map()
  },

  // ===========================================================================
  // TRACKING
  // ===========================================================================

  /**
   * updatedAt: When this config was last changed
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
  _id: false,        // We manage _id ourselves (it's the role name)
  timestamps: false  // We manage updatedAt ourselves
});

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Pre-save Middleware
 * -------------------
 * Automatically update the timestamp when config is saved.
 */
roleConfigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// =============================================================================
// STATIC METHODS (Called on the Model, not an instance)
// =============================================================================

/**
 * getConfig(role)
 * ---------------
 * Get configuration for a specific role.
 * Creates default config if it doesn't exist.
 *
 * @param {string} role - 'free', 'premium', or 'admin'
 * @returns {Object} - The role configuration document
 *
 * EXAMPLE:
 * const freeConfig = await RoleConfig.getConfig('free');
 * // freeConfig.limits.maxNotes = 100
 * // freeConfig.features.get('calendarEnabled') = false
 */
roleConfigSchema.statics.getConfig = async function(role) {
  // Try to find existing config
  let config = await this.findById(role);

  // If no config exists, create one with defaults
  if (!config) {
    config = await this.create(getDefaultConfig(role));
  }

  return config;
};

/**
 * getAllConfigs()
 * ---------------
 * Get configurations for all roles.
 * Used for the admin panel to show/edit all role settings.
 *
 * @returns {Array} - Array of all role configurations
 */
roleConfigSchema.statics.getAllConfigs = async function() {
  const roles = ['free', 'premium', 'admin'];
  const configs = [];

  for (const role of roles) {
    configs.push(await this.getConfig(role));
  }

  return configs;
};

/**
 * updateConfig(role, updates, adminId)
 * ------------------------------------
 * Update configuration for a role.
 *
 * @param {string} role - Role to update
 * @param {Object} updates - Updates to apply
 *   - limits: Object of limit updates
 *   - features: Object of feature updates
 * @param {string} adminId - Admin user ID making the change
 * @returns {Object} - Updated configuration
 *
 * EXAMPLE:
 * await RoleConfig.updateConfig('free', {
 *   limits: { maxNotes: 200 },
 *   features: { calendarEnabled: true }
 * }, adminId);
 */
roleConfigSchema.statics.updateConfig = async function(role, updates, adminId) {
  const config = await this.getConfig(role);

  // Update limits if provided
  if (updates.limits) {
    Object.assign(config.limits, updates.limits);
    config.markModified('limits'); // Tell Mongoose the object changed
  }

  // Update features if provided
  if (updates.features) {
    Object.entries(updates.features).forEach(([key, value]) => {
      if (value === null) {
        // null = remove the feature
        config.features.delete(key);
      } else {
        // Set the feature value
        config.features.set(key, value);
      }
    });
    // Mongoose doesn't always detect Map changes, so mark as modified
    config.markModified('features');
  }

  config.updatedBy = adminId;
  await config.save();

  return config;
};

/**
 * syncWithDefaults(role, adminId)
 * -------------------------------
 * Sync role config with defaults - adds any missing features
 * without overwriting existing ones.
 *
 * @param {string} role - Role to sync
 * @param {string} adminId - Admin user ID
 * @returns {Object} - Updated configuration
 *
 * USE CASE:
 * When new features are added to the codebase, this method
 * adds them to existing configs without losing customizations.
 */
roleConfigSchema.statics.syncWithDefaults = async function(role, adminId) {
  const config = await this.getConfig(role);
  const defaults = getDefaultConfig(role);
  const defaultFeatures = defaults.features;

  let updated = false;

  // Add any missing features from defaults
  for (const [key, value] of defaultFeatures) {
    if (!config.features.has(key)) {
      config.features.set(key, value);
      updated = true;
    }
  }

  // Add any missing limits from defaults
  const defaultLimits = defaults.limits || {};
  for (const [key, value] of Object.entries(defaultLimits)) {
    if (config.limits[key] === undefined) {
      config.limits[key] = value;
      updated = true;
    }
  }

  if (updated) {
    config.updatedBy = adminId;
    await config.save();
  }

  return config;
};

/**
 * resetToDefaults(role, adminId)
 * ------------------------------
 * Reset role config to defaults (overwrites all settings).
 *
 * @param {string} role - Role to reset
 * @param {string} adminId - Admin user ID
 * @returns {Object} - Fresh default configuration
 *
 * WARNING: This overwrites ALL customizations!
 */
roleConfigSchema.statics.resetToDefaults = async function(role, adminId) {
  const defaults = getDefaultConfig(role);

  // Delete existing and create fresh
  await this.findByIdAndDelete(role);
  const config = await this.create({
    ...defaults,
    updatedBy: adminId
  });

  return config;
};

/**
 * syncAllWithDefaults(adminId)
 * ----------------------------
 * Sync all role configs with defaults.
 * Useful when deploying new features.
 *
 * @param {string} adminId - Admin user ID
 * @returns {Array} - All updated configurations
 */
roleConfigSchema.statics.syncAllWithDefaults = async function(adminId) {
  const roles = ['free', 'premium', 'admin'];
  const results = [];

  for (const role of roles) {
    const config = await this.syncWithDefaults(role, adminId);
    results.push(config);
  }

  return results;
};

/**
 * getAllFeatures()
 * ----------------
 * Get list of all available features that can be configured.
 * Used in admin panel to show all available toggles.
 *
 * @returns {Array} - Array of feature definitions
 */
roleConfigSchema.statics.getAllFeatures = function() {
  return ALL_FEATURES;
};

// =============================================================================
// INSTANCE METHODS (Called on a config document)
// =============================================================================

/**
 * toSafeJSON()
 * ------------
 * Convert to a safe JSON object for API responses.
 * Converts the Map to a regular object.
 *
 * @returns {Object} - Safe JSON representation
 */
roleConfigSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  // Convert Map to plain object
  obj.features = obj.features ? Object.fromEntries(obj.features) : {};
  return obj;
};

// =============================================================================
// FEATURE DEFINITIONS
// =============================================================================

/**
 * ALL_FEATURES
 * ------------
 * Master list of all available features that can be configured per role.
 * Each feature has:
 * - key: The feature flag name (used in code)
 * - label: Human-readable name
 * - description: What the feature does
 * - category: Group for organization (optional, beta, enhanced)
 */
const ALL_FEATURES = [
  // ==========================================
  // OPTIONAL FEATURES - Standard features that can be enabled/disabled
  // ==========================================
  { key: 'calendarEnabled', label: 'Calendar', description: 'Event scheduling and calendar views', category: 'optional' },
  { key: 'projectsEnabled', label: 'Projects', description: 'Project management with linked items', category: 'optional' },
  { key: 'imagesEnabled', label: 'Images', description: 'Image gallery and media management', category: 'optional' },
  { key: 'filesEnabled', label: 'Files', description: 'File storage and file manager', category: 'optional' },
  { key: 'weatherEnabled', label: 'Weather', description: 'Weather widget on dashboard', category: 'optional' },
  { key: 'lifeAreasEnabled', label: 'Categories', description: 'Organize items into meaningful areas', category: 'optional' },
  { key: 'analyticsEnabled', label: 'Analytics', description: 'Usage analytics and insights', category: 'optional' },
  { key: 'savedLocationsEnabled', label: 'Saved Locations', description: 'Save and manage locations for weather', category: 'optional' },
  { key: 'socialEnabled', label: 'Social', description: 'Connections, sharing, and collaboration features', category: 'optional' },

  // ==========================================
  // BETA FEATURES - Experimental features still in development
  // ==========================================
  { key: 'fitnessEnabled', label: 'Fitness Tracking', description: 'Access to fitness and workout tracking', category: 'beta' },
  { key: 'kbEnabled', label: 'Knowledge Base', description: 'Wiki and knowledge base feature', category: 'beta' },
  { key: 'messagesEnabled', label: 'Messages', description: 'Messaging and notifications', category: 'beta' },

  // ==========================================
  // ENHANCED FEATURES - Advanced capabilities for power users
  // ==========================================
  { key: 'notesAdvancedSearch', label: 'Advanced Search', description: 'Enable advanced search operators', category: 'enhanced' },
  { key: 'notesExport', label: 'Export Notes', description: 'Allow exporting notes to various formats', category: 'enhanced' }
];

// =============================================================================
// DEFAULT CONFIGURATIONS
// =============================================================================

/**
 * getDefaultConfig(role)
 * ----------------------
 * Get the default configuration for a role.
 * Used when creating new role configs or resetting to defaults.
 *
 * @param {string} role - 'free', 'premium', or 'admin'
 * @returns {Object} - Default configuration for that role
 */
function getDefaultConfig(role) {
  // ===========================================
  // FREE USER DEFAULTS - Limited features
  // ===========================================
  const freeFeatures = new Map([
    ['calendarEnabled', false],
    ['projectsEnabled', false],
    ['imagesEnabled', false],
    ['filesEnabled', false],
    ['weatherEnabled', false],
    ['lifeAreasEnabled', false],
    ['analyticsEnabled', false],
    ['savedLocationsEnabled', false],
    ['socialEnabled', false],
    ['fitnessEnabled', false],
    ['kbEnabled', false],
    ['messagesEnabled', false],
    ['notesAdvancedSearch', false],
    ['notesExport', false]
  ]);

  // ===========================================
  // PREMIUM USER DEFAULTS - Most features enabled
  // ===========================================
  const premiumFeatures = new Map([
    ['calendarEnabled', true],
    ['projectsEnabled', true],
    ['imagesEnabled', true],
    ['filesEnabled', true],
    ['weatherEnabled', true],
    ['lifeAreasEnabled', true],
    ['analyticsEnabled', true],
    ['savedLocationsEnabled', true],
    ['socialEnabled', true],
    ['fitnessEnabled', false],    // Beta - disabled by default
    ['kbEnabled', false],          // Beta - disabled by default
    ['messagesEnabled', false],    // Beta - disabled by default
    ['notesAdvancedSearch', true],
    ['notesExport', true]
  ]);

  // ===========================================
  // ADMIN USER DEFAULTS - Everything enabled
  // ===========================================
  const adminFeatures = new Map([
    ['calendarEnabled', true],
    ['projectsEnabled', true],
    ['imagesEnabled', true],
    ['filesEnabled', true],
    ['weatherEnabled', true],
    ['lifeAreasEnabled', true],
    ['analyticsEnabled', true],
    ['savedLocationsEnabled', true],
    ['socialEnabled', true],
    ['fitnessEnabled', true],
    ['kbEnabled', true],
    ['messagesEnabled', true],
    ['notesAdvancedSearch', true],
    ['notesExport', true]
  ]);

  // ===========================================
  // COMPLETE DEFAULT CONFIGS
  // ===========================================
  const defaults = {
    free: {
      _id: 'free',
      limits: {
        maxNotes: 100,
        maxTasks: 50,
        maxProjects: 5,
        maxEvents: 50,
        maxImages: 20,
        maxStorageBytes: 100 * 1024 * 1024,  // 100MB total
        maxCategories: 3,
        // File limits
        maxFiles: 100,
        maxFileSize: 25 * 1024 * 1024,       // 25MB per file
        maxFolders: 10,
        maxVersionsPerFile: 3,
        maxPublicShares: 5,
        allowedFileTypes: ['*'],
        forbiddenFileTypes: []
      },
      features: freeFeatures
    },
    premium: {
      _id: 'premium',
      limits: {
        maxNotes: -1,                         // Unlimited
        maxTasks: -1,
        maxProjects: -1,
        maxEvents: -1,
        maxImages: -1,
        maxStorageBytes: 10 * 1024 * 1024 * 1024, // 10GB total
        maxCategories: -1,
        // File limits
        maxFiles: -1,                         // Unlimited
        maxFileSize: 100 * 1024 * 1024,       // 100MB per file
        maxFolders: -1,
        maxVersionsPerFile: 10,
        maxPublicShares: 50,
        allowedFileTypes: ['*'],
        forbiddenFileTypes: []
      },
      features: premiumFeatures
    },
    admin: {
      _id: 'admin',
      limits: {
        maxNotes: -1,                         // Unlimited
        maxTasks: -1,
        maxProjects: -1,
        maxEvents: -1,
        maxImages: -1,
        maxStorageBytes: -1,                  // Unlimited
        maxCategories: -1,
        // File limits
        maxFiles: -1,
        maxFileSize: -1,                      // Unlimited
        maxFolders: -1,
        maxVersionsPerFile: -1,
        maxPublicShares: -1,
        allowedFileTypes: ['*'],
        forbiddenFileTypes: []
      },
      features: adminFeatures
    }
  };

  return defaults[role] || defaults.free;
}

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Export the getDefaultConfig function for seeding the database
 */
export { getDefaultConfig };

/**
 * Create the RoleConfig model from the schema.
 * This gives us methods to:
 * - Get config: RoleConfig.getConfig(role)
 * - Get all configs: RoleConfig.getAllConfigs()
 * - Update config: RoleConfig.updateConfig(role, updates, adminId)
 * - Sync with defaults: RoleConfig.syncWithDefaults(role, adminId)
 * - Reset to defaults: RoleConfig.resetToDefaults(role, adminId)
 * - Get all features: RoleConfig.getAllFeatures()
 */
const RoleConfig = mongoose.model('RoleConfig', roleConfigSchema);

export default RoleConfig;
