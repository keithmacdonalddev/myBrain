/**
 * =============================================================================
 * USER.JS - User Data Model
 * =============================================================================
 *
 * This file defines the User model - the data structure for user accounts in
 * myBrain. Every person who creates an account has a User document stored in
 * the database with all their information.
 *
 * WHAT IS A MODEL?
 * ----------------
 * A model is like a blueprint that defines:
 * - What data can be stored (fields)
 * - What type each field is (string, number, date, etc.)
 * - Validation rules (required fields, max length, valid values)
 * - Methods to work with the data
 *
 * WHAT DATA DOES A USER HAVE?
 * ---------------------------
 * - Authentication: email, password hash
 * - Profile: name, bio, avatar, timezone
 * - Role & Permissions: role (free/premium/admin), feature flags
 * - Social: connections, messaging settings, presence (online/offline)
 * - Moderation: warning count, suspension status
 * - Settings: weather locations, UI preferences
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

/**
 * Validator is a library with helper functions to validate data.
 * We use it to check if emails are valid, URLs are valid, etc.
 */
import validator from 'validator';

// =============================================================================
// USER SCHEMA DEFINITION
// =============================================================================

/**
 * The User Schema
 * ---------------
 * This defines ALL the fields a User document can have.
 * Think of it as a form with many sections.
 */
const userSchema = new mongoose.Schema({

  // ===========================================================================
  // SECTION 1: AUTHENTICATION FIELDS
  // ===========================================================================
  // These fields are used for logging in and security

  /**
   * email: The user's email address
   * - Required: Must have an email to create account
   * - Unique: No two users can have the same email
   * - Lowercase: Automatically converts to lowercase (John@Email.com → john@email.com)
   * - Trim: Removes spaces from beginning/end
   * - Validated: Uses validator library to ensure it's a real email format
   */
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

  /**
   * passwordHash: The encrypted version of the user's password
   * - We NEVER store actual passwords - they're hashed (encrypted one-way)
   * - select: false means this field won't be included in normal queries
   *   (for security - password hashes shouldn't leave the database)
   */
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    select: false // Don't include password in queries by default
  },

  /**
   * role: What type of user this is
   * - 'free': Basic free tier account
   * - 'premium': Paid subscription with more features
   * - 'admin': Administrator with full access
   */
  role: {
    type: String,
    enum: ['free', 'premium', 'admin'], // Only these values are allowed
    default: 'free' // New users start as free
  },

  /**
   * status: Current account status
   * - 'active': Normal functioning account
   * - 'disabled': Account turned off (by user or admin)
   * - 'suspended': Temporarily banned for policy violation
   */
  status: {
    type: String,
    enum: ['active', 'disabled', 'suspended'],
    default: 'active'
  },

  // ===========================================================================
  // SECTION 2: MODERATION STATUS
  // ===========================================================================
  // Tracks warnings and suspensions for users who violate policies

  moderationStatus: {
    /**
     * warningCount: How many warnings the user has received
     * Admins can warn users for bad behavior without suspending them
     */
    warningCount: {
      type: Number,
      default: 0
    },

    /**
     * lastWarningAt: When the most recent warning was issued
     */
    lastWarningAt: Date,

    /**
     * isSuspended: Whether the user is currently suspended
     */
    isSuspended: {
      type: Boolean,
      default: false
    },

    /**
     * suspendedUntil: When the suspension ends (null = permanent)
     */
    suspendedUntil: Date,

    /**
     * suspendedBy: Which admin suspended this user
     * References another User document (the admin)
     */
    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    /**
     * suspendReason: Why the user was suspended
     */
    suspendReason: String,

    /**
     * isBanned: Whether the user is permanently banned
     * Unlike suspension, bans do not expire
     */
    isBanned: {
      type: Boolean,
      default: false
    },

    /**
     * bannedAt: When the user was banned
     */
    bannedAt: Date,

    /**
     * bannedBy: Which admin banned this user
     */
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },

    /**
     * banReason: Why the user was banned
     */
    banReason: String
  },

  // ===========================================================================
  // SECTION 3: ACTIVITY TRACKING
  // ===========================================================================
  // When was this user last active?

  /**
   * lastActivityAt: Last time user did anything in the app
   */
  lastActivityAt: Date,

  /**
   * lastLoginAt: Last time user logged in
   */
  lastLoginAt: Date,

  /**
   * lastLoginIp: IP address from their last login (for security)
   */
  lastLoginIp: String,

  // ===========================================================================
  // SECTION 3.5: PASSWORD RESET TOKENS
  // ===========================================================================
  // Used for the "forgot password" feature

  /**
   * passwordResetToken: Hashed token for password reset
   * - We store the HASHED version, not the plain token
   * - The plain token is sent to the user's email
   * - When they use the link, we hash their token and compare
   * - select: false means this won't be included in normal queries
   */
  passwordResetToken: {
    type: String,
    select: false
  },

  /**
   * passwordResetExpires: When the reset token expires
   * - Tokens are only valid for 1 hour
   * - After expiration, user must request a new reset
   * - select: false for security
   */
  passwordResetExpires: {
    type: Date,
    select: false
  },

  /**
   * flags: Feature flags that enable/disable features for this specific user
   * - Map of feature name → boolean (true = enabled, false = disabled)
   * - Example: { "betaFeature": true, "experimentX": false }
   */
  flags: {
    type: Map,
    of: Boolean,
    default: new Map()
  },

  // ===========================================================================
  // SECTION 4: PROFILE INFORMATION
  // ===========================================================================
  // Personal information the user can edit in their profile

  profile: {
    /**
     * firstName: User's first name
     */
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },

    /**
     * lastName: User's last name
     */
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },

    /**
     * displayName: The name shown publicly (can be different from real name)
     */
    displayName: {
      type: String,
      trim: true,
      maxlength: [100, 'Display name cannot exceed 100 characters']
    },

    /**
     * phone: Phone number (optional)
     */
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters']
    },

    /**
     * bio: Short description about the user
     */
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },

    /**
     * location: Where the user is located (city, country, etc.)
     */
    location: {
      type: String,
      trim: true,
      maxlength: [500, 'Location cannot exceed 500 characters']
    },

    /**
     * website: Personal website URL
     * Validated to ensure it's a proper URL format
     */
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

    /**
     * timezone: User's timezone for displaying dates/times correctly
     * Default is UTC (Coordinated Universal Time)
     */
    timezone: {
      type: String,
      default: 'UTC'
    },

    /**
     * avatarUrl: URL to the user's profile picture
     */
    avatarUrl: {
      type: String,
      trim: true
    },

    /**
     * avatarStorageKey: Where the avatar is stored in our file storage
     * Used for custom uploaded avatars
     */
    avatarStorageKey: {
      type: String,
      default: null
    },

    /**
     * avatarThumbnailKey: Smaller version of the avatar for faster loading
     */
    avatarThumbnailKey: {
      type: String,
      default: null
    },

    /**
     * defaultAvatarId: Which default avatar to show if no custom avatar
     * Options like 'avatar-1', 'avatar-2', etc.
     */
    defaultAvatarId: {
      type: String,
      default: 'avatar-1'
    }
  },

  // ===========================================================================
  // SECTION 5: EMAIL CHANGE VERIFICATION
  // ===========================================================================
  // When users want to change their email, we verify the new email first

  /**
   * pendingEmail: The new email address waiting for verification
   */
  pendingEmail: {
    type: String,
    lowercase: true,
    trim: true
  },

  /**
   * pendingEmailToken: Secret token sent to new email to verify ownership
   * select: false means this won't be returned in queries (security)
   */
  pendingEmailToken: {
    type: String,
    select: false
  },

  /**
   * pendingEmailExpires: When the verification token expires
   */
  pendingEmailExpires: {
    type: Date,
    select: false
  },

  // ===========================================================================
  // SECTION 6: PASSWORD RESET
  // ===========================================================================
  // For "forgot password" functionality

  /**
   * passwordResetToken: Secret token sent to email for password reset
   */
  passwordResetToken: {
    type: String,
    select: false
  },

  /**
   * passwordResetExpires: When the reset token expires
   */
  passwordResetExpires: {
    type: Date,
    select: false
  },

  /**
   * passwordChangedAt: When the password was last changed
   * Used to invalidate old sessions after password change
   */
  passwordChangedAt: {
    type: Date
  },

  // ===========================================================================
  // SECTION 7: WEATHER LOCATIONS
  // ===========================================================================
  // Saved locations for the weather widget on the dashboard

  /**
   * weatherLocations: Array of saved locations for weather display
   * Each location has:
   * - name: Display name (e.g., "Home", "Office")
   * - location: Actual location for weather lookup (e.g., "New York, NY")
   * - isDefault: Whether this is the default location to show
   */
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

  // ===========================================================================
  // SECTION 8: USAGE LIMIT OVERRIDES
  // ===========================================================================
  // Custom limits that override the default limits for this user's role

  /**
   * limitOverrides: Custom limits for this specific user
   * - Map of limit name → number
   * - -1 means unlimited
   * - null/undefined means use the default for their role
   * - Example: { "maxNotes": 1000 } would give this user 1000 notes even if
   *   their role normally only allows 100
   */
  limitOverrides: {
    type: Map,
    of: Number,
    default: new Map()
  },

  // ===========================================================================
  // SECTION 9: USER PREFERENCES
  // ===========================================================================
  // Settings for UI behavior

  preferences: {
    /**
     * tooltipsEnabled: Whether to show helpful tooltips on hover
     */
    tooltipsEnabled: {
      type: Boolean,
      default: true
    },

    /**
     * sidebarCollapsed: Whether the sidebar is collapsed (narrow mode)
     * Synced across devices - user's preference for sidebar state
     */
    sidebarCollapsed: {
      type: Boolean,
      default: false
    },

    /**
     * dashboardTheme: Visual theme for the dashboard
     * - 'apple': Clean, minimalist theme with Apple-inspired design
     * - 'mission-control': Compact, information-dense theme
     * - 'material': Material Design inspired theme
     */
    dashboardTheme: {
      type: String,
      enum: ['apple', 'mission-control', 'material'],
      default: 'apple'
    },

    /**
     * themeMode: Light/dark mode preference
     * - 'light': Always use light mode
     * - 'dark': Always use dark mode
     * - 'system': Follow system preference (auto-switch based on OS)
     */
    themeMode: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },

    /**
     * dashboard: Dashboard layout and widget preferences
     * Controls which widgets are pinned, hidden, and per-widget settings
     */
    dashboard: {
      /**
       * pinnedWidgets: Widgets the user has pinned to fixed positions
       * These widgets override dynamic placement and always appear
       */
      pinnedWidgets: [{
        widgetId: {
          type: String,
          required: true
        },
        position: {
          type: String,
          enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'always-show'],
          default: 'always-show'
        },
        size: {
          type: String,
          enum: ['narrow', 'default', 'wide'],
          default: 'default'
        }
      }],

      /**
       * hiddenWidgets: Widget IDs the user has explicitly hidden
       * These won't appear regardless of their priority score
       */
      hiddenWidgets: [{
        type: String
      }],

      /**
       * widgetSettings: Per-widget configuration
       * Key is widgetId, value is widget-specific settings object
       */
      widgetSettings: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: new Map()
      },

      /**
       * lastVisit: Timestamp of last dashboard visit
       * Used to detect "catching up" mode
       */
      lastVisit: {
        type: Date,
        default: null
      }
    }
  },

  // ===========================================================================
  // SECTION 10: SOCIAL SETTINGS
  // ===========================================================================
  // Privacy and communication preferences for the social features

  socialSettings: {
    /**
     * profileVisibility: Who can see this user's profile
     * - 'public': Anyone can see
     * - 'connections': Only friends/connections can see
     * - 'private': Only the user themselves can see
     */
    profileVisibility: {
      type: String,
      enum: ['public', 'connections', 'private'],
      default: 'public'
    },

    /**
     * visibleFields: Which profile fields are visible to others
     * Each field can be individually shown or hidden
     */
    visibleFields: {
      bio: { type: Boolean, default: true },
      location: { type: Boolean, default: true },
      website: { type: Boolean, default: true },
      joinedDate: { type: Boolean, default: true },
      stats: { type: Boolean, default: true }
    },

    /**
     * allowConnectionRequests: Who can send friend/connection requests
     * - 'everyone': Anyone can send a request
     * - 'none': Nobody can send requests
     */
    allowConnectionRequests: {
      type: String,
      enum: ['everyone', 'none'],
      default: 'everyone'
    },

    /**
     * allowMessages: Who can send direct messages
     * - 'connections': Only friends can message
     * - 'everyone': Anyone can message
     * - 'none': Nobody can message
     */
    allowMessages: {
      type: String,
      enum: ['connections', 'everyone', 'none'],
      default: 'connections'
    },

    /**
     * showActivity: Whether to show this user's activity to friends
     */
    showActivity: {
      type: Boolean,
      default: true
    },

    /**
     * showOnlineStatus: Who can see if this user is online
     * - 'everyone': Anyone can see online status
     * - 'connections': Only friends can see
     * - 'none': Always appear offline
     */
    showOnlineStatus: {
      type: String,
      enum: ['everyone', 'connections', 'none'],
      default: 'connections'
    }
  },

  // ===========================================================================
  // SECTION 11: REAL-TIME PRESENCE
  // ===========================================================================
  // Tracks whether the user is currently online

  presence: {
    /**
     * isOnline: Is the user currently connected?
     */
    isOnline: {
      type: Boolean,
      default: false
    },

    /**
     * lastSeenAt: When was the user last online?
     */
    lastSeenAt: {
      type: Date,
      default: null
    },

    /**
     * currentStatus: What is the user's current status?
     * - 'available': Ready to chat
     * - 'busy': Working, don't disturb
     * - 'away': Stepped away
     * - 'dnd': Do Not Disturb
     * - 'offline': Not connected
     */
    currentStatus: {
      type: String,
      enum: ['available', 'busy', 'away', 'dnd', 'offline'],
      default: 'offline'
    },

    /**
     * statusMessage: Custom status message (e.g., "In a meeting until 3pm")
     */
    statusMessage: {
      type: String,
      trim: true,
      maxlength: [100, 'Status message cannot exceed 100 characters'],
      default: null
    }
  },

  // ===========================================================================
  // SECTION 12: SOCIAL STATISTICS
  // ===========================================================================
  // Pre-calculated counts for faster display (denormalized data)

  socialStats: {
    /**
     * connectionCount: How many friends/connections this user has
     */
    connectionCount: {
      type: Number,
      default: 0
    },

    /**
     * projectCount: How many projects this user has
     */
    projectCount: {
      type: Number,
      default: 0
    },

    /**
     * sharedItemCount: How many items this user has shared with others
     */
    sharedItemCount: {
      type: Number,
      default: 0
    }
  }

}, {
  /**
   * timestamps: true tells Mongoose to automatically add:
   * - createdAt: When the user was created
   * - updatedAt: When the user was last modified
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

// Note: Email index is automatically created by `unique: true` on the email field

// =============================================================================
// VIRTUAL PROPERTIES
// =============================================================================

/**
 * Virtual: profile.fullName
 * ------------------------
 * A virtual property is calculated on-the-fly, not stored in the database.
 * This combines firstName and lastName into a full name.
 *
 * Example: { firstName: "John", lastName: "Doe" } → fullName = "John Doe"
 */
userSchema.virtual('profile.fullName').get(function() {
  if (this.profile?.firstName && this.profile?.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.profile?.firstName || this.profile?.lastName || '';
});

// =============================================================================
// INSTANCE METHODS
// =============================================================================
// Methods that can be called on individual user documents

/**
 * hasFlag(flagName)
 * -----------------
 * Check if the user has a specific feature flag enabled.
 *
 * @param {string} flagName - Name of the feature flag
 * @returns {boolean} - True if flag is enabled
 *
 * Example: user.hasFlag('betaFeature') → true/false
 */
userSchema.methods.hasFlag = function(flagName) {
  return this.flags.get(flagName) === true;
};

/**
 * isPremium()
 * -----------
 * Check if user has premium access (premium or admin role).
 *
 * @returns {boolean} - True if user is premium or admin
 */
userSchema.methods.isPremium = function() {
  return this.role === 'premium' || this.role === 'admin';
};

/**
 * isAdmin()
 * ---------
 * Check if user is an administrator.
 *
 * @returns {boolean} - True if user is admin
 */
userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

/**
 * isSuspendedNow()
 * ----------------
 * Check if user is currently suspended.
 * Takes into account temporary suspensions that may have expired.
 *
 * @returns {boolean} - True if user is currently suspended
 */
userSchema.methods.isSuspendedNow = function() {
  // Not marked as suspended
  if (!this.moderationStatus?.isSuspended) return false;

  // Check if temporary suspension has expired
  if (this.moderationStatus.suspendedUntil) {
    return new Date() < new Date(this.moderationStatus.suspendedUntil);
  }

  // Permanent suspension (no end date)
  return true;
};

/**
 * isBannedNow()
 * -------------
 * Check if user is currently banned (permanent).
 *
 * @returns {boolean} - True if user is banned
 */
userSchema.methods.isBannedNow = function() {
  return this.moderationStatus?.isBanned === true;
};

/**
 * checkAndClearSuspension()
 * -------------------------
 * Automatically clear suspension if it has expired.
 * Call this when a user tries to log in or access their account.
 *
 * @returns {boolean} - True if suspension was cleared, false if still suspended
 */
userSchema.methods.checkAndClearSuspension = async function() {
  // Not suspended
  if (!this.moderationStatus?.isSuspended) return false;

  // Check if temporary suspension has expired
  if (this.moderationStatus.suspendedUntil && new Date() >= new Date(this.moderationStatus.suspendedUntil)) {
    // Clear the suspension
    this.moderationStatus.isSuspended = false;
    this.status = 'active';
    await this.save();
    return true; // Suspension was cleared
  }

  return false; // Still suspended
};

// =============================================================================
// FEATURE ACCESS CONFIGURATION
// =============================================================================

/**
 * PREMIUM_FEATURES: Features automatically enabled for premium/admin users
 * Free users don't have these unless explicitly granted via flags
 */
const PREMIUM_FEATURES = [
  'calendarEnabled',      // Calendar/events feature
  'imagesEnabled',        // Image gallery feature
  'projectsEnabled',      // Projects feature
  'lifeAreasEnabled',     // Life areas/categories feature
  'weatherEnabled',       // Weather widget feature
  'analyticsEnabled',     // Personal analytics feature
  'savedLocationsEnabled' // Save multiple weather locations
];

/**
 * BETA_FEATURES: Experimental features that require explicit flags
 * Even premium users don't automatically get these
 */
const BETA_FEATURES = [
  'fitnessEnabled',       // Fitness tracking (beta)
  'kbEnabled',            // Knowledge base (beta)
  'messagesEnabled'       // Direct messaging (beta)
];

/**
 * hasFeatureAccess(featureName, roleConfig)
 * -----------------------------------------
 * Check if user can access a specific feature.
 * Considers: user flags, role-based features, premium status
 *
 * @param {string} featureName - Name of the feature
 * @param {Object} roleConfig - Optional role configuration from database
 * @returns {boolean} - True if user can access the feature
 *
 * PRIORITY ORDER:
 * 1. User explicit false → DENIED
 * 2. User explicit true → ALLOWED
 * 3. Role config allows → ALLOWED
 * 4. Premium user + premium feature → ALLOWED
 * 5. Otherwise → DENIED
 */
userSchema.methods.hasFeatureAccess = function(featureName, roleConfig = null) {
  // Check user's explicit flag setting
  const userFlag = this.flags ? this.flags.get(featureName) : undefined;

  // User explicit false always wins (admin override)
  if (userFlag === false) {
    return false;
  }

  // User explicit true always wins (special access)
  if (userFlag === true) {
    return true;
  }

  // Use role configuration if provided
  if (roleConfig && roleConfig.features) {
    const roleFeatures = roleConfig.features instanceof Map
      ? roleConfig.features
      : new Map(Object.entries(roleConfig.features));
    return roleFeatures.get(featureName) === true;
  }

  // Fallback: Premium/admin users get all premium features
  if (this.isPremium() && PREMIUM_FEATURES.includes(featureName)) {
    return true;
  }

  // Default: no access
  return false;
};

/**
 * getEffectiveFlags(roleConfig)
 * -----------------------------
 * Get the combined feature flags for this user.
 * Merges role-based features with user-specific overrides.
 *
 * @param {Object} roleConfig - Role configuration from database
 * @returns {Object} - All effective feature flags as plain object
 */
userSchema.methods.getEffectiveFlags = function(roleConfig) {
  // Start with role features (handle both Map and plain object)
  const roleFeatures = roleConfig?.features
    ? (roleConfig.features instanceof Map ? Object.fromEntries(roleConfig.features) : roleConfig.features)
    : {};

  // Get user's personal flag overrides (handle both Map and plain object)
  const userFlags = this.flags
    ? (this.flags instanceof Map ? Object.fromEntries(this.flags) : this.flags)
    : {};

  // Merge: role features as base, user flags as overrides
  const effectiveFlags = { ...roleFeatures };

  // Apply user-specific overrides (user flags take precedence)
  Object.entries(userFlags).forEach(([key, value]) => {
    effectiveFlags[key] = value;
  });

  return effectiveFlags;
};

/**
 * getFeatureLists() - Static Method
 * ---------------------------------
 * Returns the lists of premium and beta features.
 * Useful for admin interfaces.
 */
userSchema.statics.getFeatureLists = function() {
  return { PREMIUM_FEATURES, BETA_FEATURES };
};

/**
 * getEffectiveLimits(roleConfig)
 * ------------------------------
 * Get the usage limits that apply to this user.
 * Merges role defaults with user-specific overrides.
 *
 * @param {Object} roleConfig - Role configuration from database
 * @returns {Object} - All effective limits
 *
 * LIMIT VALUES:
 * - -1 = Unlimited
 * - Positive number = Maximum allowed
 */
userSchema.methods.getEffectiveLimits = function(roleConfig) {
  // Get role's default limits
  const roleLimits = roleConfig?.limits || {};

  // Get user's personal limit overrides
  const overrides = this.limitOverrides ? Object.fromEntries(this.limitOverrides) : {};

  // Start with role defaults (-1 means unlimited)
  const effectiveLimits = {
    maxNotes: roleLimits.maxNotes ?? -1,
    maxTasks: roleLimits.maxTasks ?? -1,
    maxProjects: roleLimits.maxProjects ?? -1,
    maxEvents: roleLimits.maxEvents ?? -1,
    maxImages: roleLimits.maxImages ?? -1,
    maxStorageBytes: roleLimits.maxStorageBytes ?? -1,
    maxCategories: roleLimits.maxCategories ?? -1
  };

  // Apply user-specific overrides
  Object.keys(effectiveLimits).forEach(key => {
    if (overrides[key] !== undefined && overrides[key] !== null) {
      effectiveLimits[key] = overrides[key];
    }
  });

  return effectiveLimits;
};

/**
 * getCurrentUsage()
 * -----------------
 * Get the current usage counts for this user.
 * Counts all their notes, tasks, projects, etc.
 *
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

  // Count all items in parallel for speed
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

/**
 * toPublicProfile(viewerUser, isConnected)
 * ----------------------------------------
 * Generate a public version of this user's profile.
 * Respects privacy settings - only shows what the viewer is allowed to see.
 *
 * @param {Object} viewerUser - The user viewing this profile (or null)
 * @param {boolean} isConnected - Whether viewer is connected to this user
 * @returns {Object} - Public profile object
 */
userSchema.methods.toPublicProfile = function(viewerUser = null, isConnected = false) {
  const settings = this.socialSettings || {};
  const visibility = settings.profileVisibility || 'public';
  const visibleFields = settings.visibleFields || {};

  // Determine if viewer can see this profile based on privacy settings
  const canView =
    visibility === 'public' ||
    (visibility === 'connections' && isConnected) ||
    (viewerUser && viewerUser._id.toString() === this._id.toString());

  // If viewer can't see profile, return minimal info
  if (!canView) {
    return {
      _id: this._id,
      profile: {
        displayName: this.profile?.displayName || 'Private User',
        avatarUrl: this.profile?.avatarUrl,
        defaultAvatarId: this.profile?.defaultAvatarId
      },
      isPrivate: true
    };
  }

  // Build public profile with allowed fields
  const publicProfile = {
    _id: this._id,
    profile: {
      displayName: this.profile?.displayName,
      firstName: this.profile?.firstName,
      lastName: this.profile?.lastName,
      avatarUrl: this.profile?.avatarUrl,
      defaultAvatarId: this.profile?.defaultAvatarId
    }
  };

  // Add optional fields based on visibility settings
  if (visibleFields.bio !== false && this.profile?.bio) {
    publicProfile.profile.bio = this.profile.bio;
  }
  if (visibleFields.location !== false && this.profile?.location) {
    publicProfile.profile.location = this.profile.location;
  }
  if (visibleFields.website !== false && this.profile?.website) {
    publicProfile.profile.website = this.profile.website;
  }
  if (visibleFields.joinedDate !== false) {
    publicProfile.joinedAt = this.createdAt;
  }
  if (visibleFields.stats !== false) {
    publicProfile.stats = this.socialStats || { connectionCount: 0, projectCount: 0, sharedItemCount: 0 };
  }

  // Add presence info if allowed
  const showOnline = settings.showOnlineStatus || 'connections';
  if (showOnline === 'everyone' || (showOnline === 'connections' && isConnected)) {
    publicProfile.presence = {
      isOnline: this.presence?.isOnline || false,
      currentStatus: this.presence?.currentStatus || 'offline',
      lastSeenAt: this.presence?.lastSeenAt
    };
    if (this.presence?.statusMessage) {
      publicProfile.presence.statusMessage = this.presence.statusMessage;
    }
  }

  publicProfile.isConnected = isConnected;

  return publicProfile;
};

/**
 * updateSocialStats(updates)
 * --------------------------
 * Update the social statistics for this user.
 * Called when adding/removing connections, projects, shares.
 *
 * @param {Object} updates - Stats to update
 *
 * USAGE:
 * - Set value: user.updateSocialStats({ connectionCount: 5 })
 * - Increment: user.updateSocialStats({ connectionCount: { $inc: 1 } })
 */
userSchema.methods.updateSocialStats = async function(updates) {
  const validStats = ['connectionCount', 'projectCount', 'sharedItemCount'];
  const updateObj = {};

  for (const [key, value] of Object.entries(updates)) {
    if (validStats.includes(key)) {
      if (typeof value === 'object' && '$inc' in value) {
        // Increment current value
        updateObj[`socialStats.${key}`] = this.socialStats?.[key] || 0;
        updateObj[`socialStats.${key}`] += value.$inc;
        // Don't let it go negative
        if (updateObj[`socialStats.${key}`] < 0) updateObj[`socialStats.${key}`] = 0;
      } else {
        // Set exact value
        updateObj[`socialStats.${key}`] = value;
      }
    }
  }

  if (Object.keys(updateObj).length > 0) {
    await this.constructor.findByIdAndUpdate(this._id, { $set: updateObj });
  }
};

/**
 * setPresence(status, statusMessage)
 * ----------------------------------
 * Update the user's online presence status.
 *
 * @param {string} status - New status (available, busy, away, dnd, offline)
 * @param {string} statusMessage - Optional custom message
 * @returns {Object} - Updated user document
 */
userSchema.methods.setPresence = async function(status, statusMessage = null) {
  const validStatuses = ['available', 'busy', 'away', 'dnd', 'offline'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status');
  }

  const updates = {
    'presence.currentStatus': status,
    'presence.isOnline': status !== 'offline',
  };

  // Record last seen time when going offline
  if (status === 'offline') {
    updates['presence.lastSeenAt'] = new Date();
  }

  // Update status message if provided
  if (statusMessage !== undefined) {
    updates['presence.statusMessage'] = statusMessage;
  }

  return this.constructor.findByIdAndUpdate(
    this._id,
    { $set: updates },
    { new: true }
  );
};

/**
 * canMessageUser(targetUser, isConnected)
 * ---------------------------------------
 * Check if this user can send a message to another user.
 *
 * @param {Object} targetUser - User to message
 * @param {boolean} isConnected - Whether they are connected
 * @returns {boolean} - True if messaging is allowed
 */
userSchema.methods.canMessageUser = async function(targetUser, isConnected = false) {
  const targetSettings = targetUser.socialSettings || {};
  const allowMessages = targetSettings.allowMessages || 'connections';

  if (allowMessages === 'none') return false;
  if (allowMessages === 'everyone') return true;
  if (allowMessages === 'connections' && isConnected) return true;

  return false;
};

/**
 * canRequestConnection(targetUser)
 * --------------------------------
 * Check if this user can send a connection request to another user.
 *
 * @param {Object} targetUser - User to connect with
 * @returns {boolean} - True if request is allowed
 */
userSchema.methods.canRequestConnection = function(targetUser) {
  const targetSettings = targetUser.socialSettings || {};
  return targetSettings.allowConnectionRequests !== 'none';
};

// =============================================================================
// PASSWORD RESET METHODS
// =============================================================================

/**
 * generatePasswordResetToken()
 * ----------------------------
 * Generate a secure token for password reset.
 *
 * HOW IT WORKS:
 * 1. Generate 32 random bytes (cryptographically secure)
 * 2. Convert to hex string (the "plain" token sent to user)
 * 3. Hash the token with SHA-256 (stored in database)
 * 4. Set expiration to 1 hour from now
 * 5. Return the PLAIN token (to send in email)
 *
 * SECURITY:
 * - We store the HASHED token, not the plain token
 * - If database is compromised, attackers can't use the tokens
 * - The plain token is only sent once via email
 *
 * @returns {string} - The plain (unhashed) reset token
 *
 * EXAMPLE USAGE:
 * ```javascript
 * const user = await User.findOne({ email });
 * const resetToken = user.generatePasswordResetToken();
 * await user.save();
 * // Send resetToken in email URL
 * ```
 */
userSchema.methods.generatePasswordResetToken = function() {
  // Import crypto for secure random generation and hashing
  const crypto = require('crypto');

  // Generate 32 random bytes and convert to hex string
  // This creates a 64-character token (256 bits of entropy)
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Hash the token before storing in database
  // SHA-256 is a one-way hash - can't reverse it to get the original
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Token expires in 1 hour (60 minutes * 60 seconds * 1000 milliseconds)
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000;

  // Return the PLAIN token (this goes in the email)
  // The user will present this token to prove they got the email
  return resetToken;
};

/**
 * verifyPasswordResetToken(candidateToken)
 * ----------------------------------------
 * Verify that a password reset token is valid.
 *
 * CHECKS:
 * 1. Token matches (after hashing the candidate)
 * 2. Token hasn't expired
 *
 * @param {string} candidateToken - The plain token from user's email link
 * @returns {boolean} - True if token is valid and not expired
 *
 * EXAMPLE USAGE:
 * ```javascript
 * const user = await User.findOne({ email });
 * if (user.verifyPasswordResetToken(tokenFromUrl)) {
 *   // Token is valid, allow password reset
 * }
 * ```
 */
userSchema.methods.verifyPasswordResetToken = function(candidateToken) {
  const crypto = require('crypto');

  // Hash the candidate token to compare with stored hash
  const hashedToken = crypto
    .createHash('sha256')
    .update(candidateToken)
    .digest('hex');

  // Check both that token matches AND hasn't expired
  return (
    this.passwordResetToken === hashedToken &&
    this.passwordResetExpires > Date.now()
  );
};

/**
 * clearPasswordResetToken()
 * -------------------------
 * Clear the password reset token after successful reset.
 *
 * IMPORTANT: Always call this after a successful password reset!
 * This ensures:
 * - Token can't be reused (single-use)
 * - Token can't be used after password changed
 *
 * EXAMPLE USAGE:
 * ```javascript
 * user.password = newPassword;
 * user.clearPasswordResetToken();
 * await user.save();
 * ```
 */
userSchema.methods.clearPasswordResetToken = function() {
  this.passwordResetToken = undefined;
  this.passwordResetExpires = undefined;
};

/**
 * toSafeJSON(roleConfig)
 * ----------------------
 * Convert user to a safe JSON object for API responses.
 * Removes sensitive fields like password hash and tokens.
 *
 * @param {Object} roleConfig - Optional role configuration
 * @returns {Object} - Safe user object
 */
userSchema.methods.toSafeJSON = function(roleConfig = null) {
  const obj = this.toObject({ virtuals: true });

  // Remove sensitive fields
  delete obj.passwordHash;
  delete obj.__v;
  delete obj.pendingEmailToken;
  delete obj.pendingEmailExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;

  // Compute effective flags
  if (roleConfig) {
    obj.flags = this.getEffectiveFlags(roleConfig);
  } else {
    // Fallback for backwards compatibility
    // Handle both Map and plain object (toObject() may convert Map to object)
    const flagsObj = obj.flags
      ? (obj.flags instanceof Map ? Object.fromEntries(obj.flags) : obj.flags)
      : {};

    // Premium/admin users get all premium features
    if (this.isPremium()) {
      PREMIUM_FEATURES.forEach(feature => {
        // Only auto-enable if not explicitly disabled
        if (flagsObj[feature] !== false) {
          flagsObj[feature] = true;
        }
      });
    }

    obj.flags = flagsObj;
  }

  // Convert limitOverrides Map to plain object (handle both Map and object)
  obj.limitOverrides = obj.limitOverrides
    ? (obj.limitOverrides instanceof Map ? Object.fromEntries(obj.limitOverrides) : obj.limitOverrides)
    : {};

  return obj;
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the User model from the schema.
 * This gives us the ability to:
 * - Create new users: User.create({ email, passwordHash })
 * - Find users: User.findById(id), User.findOne({ email })
 * - Update users: User.findByIdAndUpdate(id, updates)
 * - Delete users: User.findByIdAndDelete(id)
 */
const User = mongoose.model('User', userSchema);

export default User;
