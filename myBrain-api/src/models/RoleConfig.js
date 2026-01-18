import mongoose from 'mongoose';

/**
 * Role Configuration Schema
 * Stores default limits and feature settings per role (free, premium, admin)
 * -1 = unlimited for any limit value
 */
const roleConfigSchema = new mongoose.Schema({
  _id: {
    type: String,
    enum: ['free', 'premium', 'admin'],
    required: true
  },
  limits: {
    maxNotes: {
      type: Number,
      default: -1 // -1 = unlimited
    },
    maxTasks: {
      type: Number,
      default: -1
    },
    maxProjects: {
      type: Number,
      default: -1
    },
    maxEvents: {
      type: Number,
      default: -1
    },
    maxImages: {
      type: Number,
      default: -1
    },
    maxStorageBytes: {
      type: Number,
      default: -1 // in bytes, -1 = unlimited
    },
    maxCategories: {
      type: Number,
      default: -1
    }
  },
  features: {
    type: Map,
    of: Boolean,
    default: new Map()
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  _id: false, // We manage _id ourselves
  timestamps: false
});

// Update timestamp on save
roleConfigSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

/**
 * Get configuration for a specific role
 * Creates default config if it doesn't exist
 */
roleConfigSchema.statics.getConfig = async function(role) {
  let config = await this.findById(role);

  if (!config) {
    // Create default config based on role
    config = await this.create(getDefaultConfig(role));
  }

  return config;
};

/**
 * Get all role configurations
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
 * Update configuration for a role
 */
roleConfigSchema.statics.updateConfig = async function(role, updates, adminId) {
  const config = await this.getConfig(role);

  // Update limits
  if (updates.limits) {
    Object.assign(config.limits, updates.limits);
  }

  // Update features
  if (updates.features) {
    Object.entries(updates.features).forEach(([key, value]) => {
      if (value === null) {
        config.features.delete(key);
      } else {
        config.features.set(key, value);
      }
    });
  }

  config.updatedBy = adminId;
  await config.save();

  return config;
};

/**
 * Convert to safe JSON for API response
 */
roleConfigSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  obj.features = obj.features ? Object.fromEntries(obj.features) : {};
  return obj;
};

/**
 * List of all available features that can be configured per role
 */
const ALL_FEATURES = [
  // Optional Features
  { key: 'calendarEnabled', label: 'Calendar', description: 'Event scheduling and calendar views', category: 'optional' },
  { key: 'projectsEnabled', label: 'Projects', description: 'Project management with linked items', category: 'optional' },
  { key: 'imagesEnabled', label: 'Images', description: 'Image gallery and media management', category: 'optional' },
  { key: 'weatherEnabled', label: 'Weather', description: 'Weather widget on dashboard', category: 'optional' },
  { key: 'lifeAreasEnabled', label: 'Categories', description: 'Organize items into meaningful areas', category: 'optional' },
  { key: 'analyticsEnabled', label: 'Analytics', description: 'Usage analytics and insights', category: 'optional' },
  { key: 'savedLocationsEnabled', label: 'Saved Locations', description: 'Save and manage locations for weather', category: 'optional' },
  // Beta Features
  { key: 'fitnessEnabled', label: 'Fitness Tracking', description: 'Access to fitness and workout tracking', category: 'beta' },
  { key: 'kbEnabled', label: 'Knowledge Base', description: 'Wiki and knowledge base feature', category: 'beta' },
  { key: 'messagesEnabled', label: 'Messages', description: 'Messaging and notifications', category: 'beta' },
  // Enhanced Features
  { key: 'notesAdvancedSearch', label: 'Advanced Search', description: 'Enable advanced search operators', category: 'enhanced' },
  { key: 'notesExport', label: 'Export Notes', description: 'Allow exporting notes to various formats', category: 'enhanced' }
];

/**
 * Get all available features
 */
roleConfigSchema.statics.getAllFeatures = function() {
  return ALL_FEATURES;
};

/**
 * Get default configuration for a role
 */
function getDefaultConfig(role) {
  // Default features for free users - limited set
  const freeFeatures = new Map([
    ['calendarEnabled', false],
    ['projectsEnabled', false],
    ['imagesEnabled', false],
    ['weatherEnabled', false],
    ['lifeAreasEnabled', false],
    ['analyticsEnabled', false],
    ['savedLocationsEnabled', false],
    ['fitnessEnabled', false],
    ['kbEnabled', false],
    ['messagesEnabled', false],
    ['notesAdvancedSearch', false],
    ['notesExport', false]
  ]);

  // Default features for premium users - all optional features enabled
  const premiumFeatures = new Map([
    ['calendarEnabled', true],
    ['projectsEnabled', true],
    ['imagesEnabled', true],
    ['weatherEnabled', true],
    ['lifeAreasEnabled', true],
    ['analyticsEnabled', true],
    ['savedLocationsEnabled', true],
    ['fitnessEnabled', false], // Beta - disabled by default
    ['kbEnabled', false], // Beta - disabled by default
    ['messagesEnabled', false], // Beta - disabled by default
    ['notesAdvancedSearch', true],
    ['notesExport', true]
  ]);

  // Default features for admin users - everything enabled
  const adminFeatures = new Map([
    ['calendarEnabled', true],
    ['projectsEnabled', true],
    ['imagesEnabled', true],
    ['weatherEnabled', true],
    ['lifeAreasEnabled', true],
    ['analyticsEnabled', true],
    ['savedLocationsEnabled', true],
    ['fitnessEnabled', true],
    ['kbEnabled', true],
    ['messagesEnabled', true],
    ['notesAdvancedSearch', true],
    ['notesExport', true]
  ]);

  const defaults = {
    free: {
      _id: 'free',
      limits: {
        maxNotes: 100,
        maxTasks: 50,
        maxProjects: 5,
        maxEvents: 50,
        maxImages: 20,
        maxStorageBytes: 50 * 1024 * 1024, // 50MB
        maxCategories: 3
      },
      features: freeFeatures
    },
    premium: {
      _id: 'premium',
      limits: {
        maxNotes: -1, // unlimited
        maxTasks: -1,
        maxProjects: -1,
        maxEvents: -1,
        maxImages: -1,
        maxStorageBytes: -1,
        maxCategories: -1
      },
      features: premiumFeatures
    },
    admin: {
      _id: 'admin',
      limits: {
        maxNotes: -1,
        maxTasks: -1,
        maxProjects: -1,
        maxEvents: -1,
        maxImages: -1,
        maxStorageBytes: -1,
        maxCategories: -1
      },
      features: adminFeatures
    }
  };

  return defaults[role] || defaults.free;
}

// Export default config function for seeding
export { getDefaultConfig };

const RoleConfig = mongoose.model('RoleConfig', roleConfigSchema);

export default RoleConfig;
