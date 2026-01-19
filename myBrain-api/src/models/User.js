import mongoose from 'mongoose';
import validator from 'validator';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: validator.isEmail,
      message: 'Please provide a valid email address'
    }
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    select: false // Don't include password in queries by default
  },
  role: {
    type: String,
    enum: ['free', 'premium', 'admin'],
    default: 'free'
  },
  status: {
    type: String,
    enum: ['active', 'disabled', 'suspended'],
    default: 'active'
  },
  // Moderation status tracking
  moderationStatus: {
    warningCount: {
      type: Number,
      default: 0
    },
    lastWarningAt: Date,
    isSuspended: {
      type: Boolean,
      default: false
    },
    suspendedUntil: Date,
    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    suspendReason: String
  },
  // Activity tracking
  lastActivityAt: Date,
  lastLoginAt: Date,
  lastLoginIp: String,
  flags: {
    type: Map,
    of: Boolean,
    default: new Map()
  },
  // Profile fields
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [100, 'Display name cannot exceed 100 characters']
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters']
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    location: {
      type: String,
      trim: true,
      maxlength: [500, 'Location cannot exceed 500 characters']
    },
    website: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          if (!v) return true; // Allow empty
          return validator.isURL(v);
        },
        message: 'Please provide a valid URL'
      }
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    avatarUrl: {
      type: String,
      trim: true
    },
    avatarStorageKey: {
      type: String,
      default: null
    },
    avatarThumbnailKey: {
      type: String,
      default: null
    },
    defaultAvatarId: {
      type: String,
      default: 'avatar-1' // Default avatar for new users
    }
  },
  // Email change pending verification
  pendingEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  pendingEmailToken: {
    type: String,
    select: false
  },
  pendingEmailExpires: {
    type: Date,
    select: false
  },
  // Password reset
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  // Last password change
  passwordChangedAt: {
    type: Date
  },
  // Weather locations for dashboard widget
  weatherLocations: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    location: {
      type: String,
      required: true,
      trim: true
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  // User-specific limit overrides (overrides role defaults)
  // -1 = unlimited, null/undefined = use role default
  limitOverrides: {
    type: Map,
    of: Number,
    default: new Map()
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Index for faster email lookups
userSchema.index({ email: 1 });

// Virtual for full name
userSchema.virtual('profile.fullName').get(function() {
  if (this.profile?.firstName && this.profile?.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.profile?.firstName || this.profile?.lastName || '';
});

// Method to check if user has a specific feature flag
userSchema.methods.hasFlag = function(flagName) {
  return this.flags.get(flagName) === true;
};

// Method to check if user has premium or admin access
userSchema.methods.isPremium = function() {
  return this.role === 'premium' || this.role === 'admin';
};

// Method to check if user is admin
userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

// Method to check if user is currently suspended
userSchema.methods.isSuspendedNow = function() {
  if (!this.moderationStatus?.isSuspended) return false;

  // Check if suspension has expired
  if (this.moderationStatus.suspendedUntil) {
    return new Date() < new Date(this.moderationStatus.suspendedUntil);
  }

  // Permanent suspension (no end date)
  return true;
};

// Method to auto-unsuspend if suspension has expired
userSchema.methods.checkAndClearSuspension = async function() {
  if (!this.moderationStatus?.isSuspended) return false;

  if (this.moderationStatus.suspendedUntil && new Date() >= new Date(this.moderationStatus.suspendedUntil)) {
    this.moderationStatus.isSuspended = false;
    this.status = 'active';
    await this.save();
    return true; // Suspension was cleared
  }

  return false; // Still suspended
};

// Premium features - auto-enabled for premium and admin users
const PREMIUM_FEATURES = [
  'calendarEnabled',
  'imagesEnabled',
  'projectsEnabled',
  'lifeAreasEnabled',
  'weatherEnabled',
  'analyticsEnabled',
  'savedLocationsEnabled'
];

// Beta features - require explicit flag even for premium users
const BETA_FEATURES = [
  'fitnessEnabled',
  'kbEnabled',
  'messagesEnabled'
];

// Method to check if user has access to a feature (considering role + flags)
// If roleConfig is provided, use role-based features instead of hardcoded premium features
userSchema.methods.hasFeatureAccess = function(featureName, roleConfig = null) {
  // Check if user has an explicit flag override
  const userFlag = this.flags ? this.flags.get(featureName) : undefined;

  // User explicit false always wins
  if (userFlag === false) {
    return false;
  }

  // User explicit true always wins
  if (userFlag === true) {
    return true;
  }

  // If roleConfig is provided, use it for role-based features
  if (roleConfig && roleConfig.features) {
    const roleFeatures = roleConfig.features instanceof Map
      ? roleConfig.features
      : new Map(Object.entries(roleConfig.features));
    return roleFeatures.get(featureName) === true;
  }

  // Fallback to legacy behavior for backwards compatibility
  // Premium/admin users get all premium features automatically
  if (this.isPremium() && PREMIUM_FEATURES.includes(featureName)) {
    return true;
  }

  return false;
};

/**
 * Get effective feature flags for this user (role features merged with user overrides)
 * @param {Object} roleConfig - The role configuration object
 * @returns {Object} - Effective feature flags for this user
 */
userSchema.methods.getEffectiveFlags = function(roleConfig) {
  // Start with role features
  const roleFeatures = roleConfig?.features instanceof Map
    ? Object.fromEntries(roleConfig.features)
    : (roleConfig?.features || {});

  // User flags override role features
  const userFlags = this.flags ? Object.fromEntries(this.flags) : {};

  // Merge: role features as base, user flags as overrides
  const effectiveFlags = { ...roleFeatures };

  // Apply user-specific overrides
  Object.entries(userFlags).forEach(([key, value]) => {
    // User flags take precedence over role features
    effectiveFlags[key] = value;
  });

  return effectiveFlags;
};

// Static method to get feature lists
userSchema.statics.getFeatureLists = function() {
  return { PREMIUM_FEATURES, BETA_FEATURES };
};

/**
 * Get effective limits for this user (role defaults merged with overrides)
 * @param {Object} roleConfig - The role configuration object
 * @returns {Object} - Effective limits for this user
 */
userSchema.methods.getEffectiveLimits = function(roleConfig) {
  const roleLimits = roleConfig?.limits || {};
  const overrides = this.limitOverrides ? Object.fromEntries(this.limitOverrides) : {};

  // Start with role defaults
  const effectiveLimits = {
    maxNotes: roleLimits.maxNotes ?? -1,
    maxTasks: roleLimits.maxTasks ?? -1,
    maxProjects: roleLimits.maxProjects ?? -1,
    maxEvents: roleLimits.maxEvents ?? -1,
    maxImages: roleLimits.maxImages ?? -1,
    maxStorageBytes: roleLimits.maxStorageBytes ?? -1,
    maxCategories: roleLimits.maxCategories ?? -1
  };

  // Apply user-specific overrides (only if they exist and are not null/undefined)
  Object.keys(effectiveLimits).forEach(key => {
    if (overrides[key] !== undefined && overrides[key] !== null) {
      effectiveLimits[key] = overrides[key];
    }
  });

  return effectiveLimits;
};

/**
 * Get current usage counts for this user
 * @returns {Object} - Current usage counts
 */
userSchema.methods.getCurrentUsage = async function() {
  const mongoose = (await import('mongoose')).default;
  const userId = this._id;

  // Import models dynamically to avoid circular dependencies
  const Note = mongoose.model('Note');
  const Task = mongoose.model('Task');
  const Project = mongoose.model('Project');
  const Event = mongoose.model('Event');
  const Image = mongoose.model('Image');
  const LifeArea = mongoose.model('LifeArea');

  // Count all items (including archived/trashed for notes)
  const [notes, tasks, projects, events, images, categories, storageResult] = await Promise.all([
    Note.countDocuments({ userId }),
    Task.countDocuments({ userId }),
    Project.countDocuments({ userId }),
    Event.countDocuments({ userId }),
    Image.countDocuments({ userId }),
    LifeArea.countDocuments({ userId }),
    // Calculate total storage used by images
    Image.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, totalBytes: { $sum: '$size' } } }
    ])
  ]);

  const storageBytes = storageResult[0]?.totalBytes || 0;

  return {
    notes,
    tasks,
    projects,
    events,
    images,
    categories,
    storageBytes
  };
};

// Method to convert user to safe JSON (no password)
// If roleConfig is provided, uses role-based features instead of hardcoded premium features
userSchema.methods.toSafeJSON = function(roleConfig = null) {
  const obj = this.toObject({ virtuals: true });
  delete obj.passwordHash;
  delete obj.__v;
  delete obj.pendingEmailToken;
  delete obj.pendingEmailExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;

  // If roleConfig is provided, use getEffectiveFlags for role-based features
  if (roleConfig) {
    obj.flags = this.getEffectiveFlags(roleConfig);
  } else {
    // Fallback to legacy behavior for backwards compatibility
    // Convert flags Map to plain object and merge premium feature access
    const flagsObj = obj.flags ? Object.fromEntries(obj.flags) : {};

    // For premium/admin users, add all premium features as enabled
    // BUT respect explicit false values (admin override)
    if (this.isPremium()) {
      PREMIUM_FEATURES.forEach(feature => {
        // Only auto-enable if not explicitly set to false
        if (flagsObj[feature] !== false) {
          flagsObj[feature] = true;
        }
      });
    }

    obj.flags = flagsObj;
  }

  // Convert limitOverrides Map to plain object
  obj.limitOverrides = obj.limitOverrides ? Object.fromEntries(obj.limitOverrides) : {};

  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;
