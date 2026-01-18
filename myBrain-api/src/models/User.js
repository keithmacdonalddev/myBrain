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
  }]
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
userSchema.methods.hasFeatureAccess = function(featureName) {
  // Check if flag is explicitly set to false (admin override)
  if (this.flags && this.flags.get(featureName) === false) {
    return false;
  }
  // Premium/admin users get all premium features automatically (unless explicitly disabled)
  if (this.isPremium() && PREMIUM_FEATURES.includes(featureName)) {
    return true;
  }
  // Beta features and free user features require explicit flag
  return this.flags.get(featureName) === true;
};

// Static method to get feature lists
userSchema.statics.getFeatureLists = function() {
  return { PREMIUM_FEATURES, BETA_FEATURES };
};

// Method to convert user to safe JSON (no password)
userSchema.methods.toSafeJSON = function() {
  const obj = this.toObject({ virtuals: true });
  delete obj.passwordHash;
  delete obj.__v;
  delete obj.pendingEmailToken;
  delete obj.pendingEmailExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;

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

  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;
