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
    enum: ['user', 'admin'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'disabled'],
    default: 'active'
  },
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
      maxlength: [100, 'Location cannot exceed 100 characters']
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

// Method to convert user to safe JSON (no password)
userSchema.methods.toSafeJSON = function() {
  const obj = this.toObject({ virtuals: true });
  delete obj.passwordHash;
  delete obj.__v;
  delete obj.pendingEmailToken;
  delete obj.pendingEmailExpires;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;

  // Convert flags Map to plain object
  if (obj.flags) {
    obj.flags = Object.fromEntries(obj.flags);
  }

  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;
