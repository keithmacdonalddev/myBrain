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
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Index for faster email lookups
userSchema.index({ email: 1 });

// Method to check if user has a specific feature flag
userSchema.methods.hasFlag = function(flagName) {
  return this.flags.get(flagName) === true;
};

// Method to convert user to safe JSON (no password)
userSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;

  // Convert flags Map to plain object
  if (obj.flags) {
    obj.flags = Object.fromEntries(obj.flags);
  }

  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;
