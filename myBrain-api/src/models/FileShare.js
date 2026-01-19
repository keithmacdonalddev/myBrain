import mongoose from 'mongoose';
import crypto from 'crypto';

const fileShareSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    shareToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    shareType: {
      type: String,
      enum: ['public', 'password', 'users', 'expiring'],
      default: 'public',
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    password: {
      type: String, // Hashed with bcrypt
      default: null,
    },
    allowedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    permissions: {
      canView: {
        type: Boolean,
        default: true,
      },
      canDownload: {
        type: Boolean,
        default: true,
      },
      canComment: {
        type: Boolean,
        default: false,
      },
    },
    accessCount: {
      type: Number,
      default: 0,
    },
    maxAccessCount: {
      type: Number,
      default: null, // null = unlimited
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastAccessedAt: Date,
    lastAccessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Access log (recent accesses)
    accessLog: [{
      accessedAt: Date,
      accessedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      ipAddress: String,
      userAgent: String,
    }],
  },
  {
    timestamps: true,
  }
);

// Compound indexes
fileShareSchema.index({ fileId: 1, isActive: 1 });
fileShareSchema.index({ userId: 1, isActive: 1 });
fileShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Generate a unique share token
fileShareSchema.statics.generateToken = function () {
  return crypto.randomUUID();
};

// Check if share is still valid
fileShareSchema.methods.isValid = function () {
  if (!this.isActive) return false;

  // Check expiration
  if (this.expiresAt && new Date() > this.expiresAt) {
    return false;
  }

  // Check access count
  if (this.maxAccessCount !== null && this.accessCount >= this.maxAccessCount) {
    return false;
  }

  return true;
};

// Record an access
fileShareSchema.methods.recordAccess = async function (accessInfo = {}) {
  const { userId, ipAddress, userAgent } = accessInfo;

  this.accessCount += 1;
  this.lastAccessedAt = new Date();
  if (userId) {
    this.lastAccessedBy = userId;
  }

  // Keep only last 100 access log entries
  if (this.accessLog.length >= 100) {
    this.accessLog = this.accessLog.slice(-99);
  }

  this.accessLog.push({
    accessedAt: new Date(),
    accessedBy: userId || null,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
  });

  await this.save();
};

// Convert to safe JSON
fileShareSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  delete obj.password; // Never expose password hash
  delete obj.accessLog; // Don't expose full access log by default
  return obj;
};

// Get public share info (for share links)
fileShareSchema.methods.toPublicJSON = function () {
  return {
    shareToken: this.shareToken,
    shareType: this.shareType,
    permissions: this.permissions,
    expiresAt: this.expiresAt,
    hasPassword: !!this.password,
  };
};

// Find active share by token
fileShareSchema.statics.findByToken = async function (token) {
  const share = await this.findOne({
    shareToken: token,
    isActive: true,
  }).populate('fileId');

  if (!share) return null;

  // Check validity
  if (!share.isValid()) {
    // Deactivate expired/exhausted shares
    share.isActive = false;
    await share.save();
    return null;
  }

  return share;
};

// Get all active shares for a file
fileShareSchema.statics.getFileShares = async function (fileId) {
  const shares = await this.find({
    fileId,
    isActive: true,
  }).sort({ createdAt: -1 });

  // Filter out invalid shares
  const validShares = [];
  for (const share of shares) {
    if (share.isValid()) {
      validShares.push(share);
    } else {
      // Deactivate invalid shares
      share.isActive = false;
      await share.save();
    }
  }

  return validShares;
};

// Get user's share count (for limits)
fileShareSchema.statics.getUserShareCount = async function (userId) {
  return this.countDocuments({
    userId,
    isActive: true,
  });
};

// Deactivate all shares for a file
fileShareSchema.statics.deactivateFileShares = async function (fileId) {
  const result = await this.updateMany(
    { fileId, isActive: true },
    { $set: { isActive: false } }
  );
  return result.modifiedCount;
};

const FileShare = mongoose.model('FileShare', fileShareSchema);

export default FileShare;
