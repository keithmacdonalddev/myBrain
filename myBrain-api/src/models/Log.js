import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  // Unique request identifier
  requestId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Timestamp for TTL
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Request info
  route: {
    type: String,
    required: true
  },
  method: {
    type: String,
    required: true,
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', 'CLIENT']
  },
  statusCode: {
    type: Number,
    required: true,
    index: true
  },
  durationMs: {
    type: Number,
    required: true
  },

  // User context
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    default: null
  },
  userRole: {
    type: String,
    default: null
  },
  userEmail: {
    type: String,
    default: null
  },

  // Feature flags snapshot
  featureFlags: {
    type: Object,
    default: {}
  },

  // Entity IDs involved in this request
  entityIds: {
    noteId: { type: String, default: null },
    workflowId: { type: String, default: null },
    runId: { type: String, default: null },
    areaId: { type: String, default: null },
    targetUserId: { type: String, default: null } // For admin operations on other users
  },

  // Error details (if any)
  error: {
    category: { type: String, default: null }, // 'validation', 'auth', 'notFound', 'server', etc.
    code: { type: String, default: null },
    name: { type: String, default: null }, // Error type name (e.g., 'ValidationError', 'CastError')
    messageSafe: { type: String, default: null }, // Safe message for client
    stack: { type: String, default: null }, // Only in dev or for server errors
    context: { type: Object, default: null } // Additional debugging context
  },

  // Client info
  clientInfo: {
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    origin: { type: String, default: null }
  },

  // Event categorization
  eventName: {
    type: String,
    required: true,
    index: true
  },

  // Sampling info
  sampled: {
    type: Boolean,
    default: true
  },
  sampleReason: {
    type: String,
    enum: ['error', 'slow', 'debug_user', 'random', 'always', 'admin', 'client_error'],
    default: 'random'
  },

  // Additional metadata
  metadata: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
logSchema.index({ eventName: 1, timestamp: -1 });
logSchema.index({ userId: 1, timestamp: -1 });
logSchema.index({ statusCode: 1, timestamp: -1 });
logSchema.index({ 'error.code': 1, timestamp: -1 });

// TTL index - auto-delete logs after configured days
const LOG_RETENTION_DAYS = parseInt(process.env.LOG_RETENTION_DAYS) || 90;
logSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: LOG_RETENTION_DAYS * 24 * 60 * 60 }
);

// Static method to search logs
logSchema.statics.searchLogs = async function(options = {}) {
  const {
    requestId,
    userId,
    eventName,
    statusCode,
    minStatusCode,
    maxStatusCode,
    from,
    to,
    hasError,
    limit = 50,
    skip = 0,
    sort = '-timestamp'
  } = options;

  // Build query
  const query = {};

  if (requestId) {
    query.requestId = requestId;
  }

  if (userId) {
    query.userId = userId;
  }

  if (eventName) {
    query.eventName = { $regex: eventName, $options: 'i' };
  }

  if (statusCode) {
    query.statusCode = parseInt(statusCode);
  } else {
    if (minStatusCode) {
      query.statusCode = { ...query.statusCode, $gte: parseInt(minStatusCode) };
    }
    if (maxStatusCode) {
      query.statusCode = { ...query.statusCode, $lte: parseInt(maxStatusCode) };
    }
  }

  if (from || to) {
    query.timestamp = {};
    if (from) query.timestamp.$gte = new Date(from);
    if (to) query.timestamp.$lte = new Date(to);
  }

  if (hasError === 'true' || hasError === true) {
    query['error.code'] = { $ne: null };
  }

  // Build sort
  let sortObj = {};
  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  // Execute query
  const logs = await this.find(query)
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments(query);

  return { logs, total };
};

// Method to convert to safe JSON
logSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Log = mongoose.model('Log', logSchema);

export default Log;
