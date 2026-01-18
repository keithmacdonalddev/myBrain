import mongoose from 'mongoose';

/**
 * Analytics Event Schema
 * Tracks user interactions and feature usage across the application
 */
const analyticsEventSchema = new mongoose.Schema({
  // User who triggered the event (null for anonymous/pre-login events)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    default: null
  },

  // Session identifier to group events
  sessionId: {
    type: String,
    index: true
  },

  // Event categorization
  category: {
    type: String,
    required: true,
    enum: [
      'page_view',      // Page/route views
      'feature',        // Feature usage (create, update, delete actions)
      'engagement',     // User engagement (time spent, scroll depth, etc.)
      'navigation',     // Navigation patterns
      'search',         // Search queries
      'error',          // Errors encountered
      'auth',           // Authentication events
      'settings'        // Settings changes
    ],
    index: true
  },

  // Specific action/event name
  action: {
    type: String,
    required: true,
    index: true
  },

  // The feature or component this event relates to
  feature: {
    type: String,
    enum: [
      'notes',
      'tasks',
      'calendar',
      'events',
      'projects',
      'life_areas',
      'weather',
      'search',
      'inbox',
      'dashboard',
      'profile',
      'settings',
      'admin',
      'auth',
      'tags',
      'locations',
      'other'
    ],
    default: 'other',
    index: true
  },

  // Additional context/metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Page/route where the event occurred
  page: {
    type: String
  },

  // Referrer page
  referrer: {
    type: String
  },

  // Device/browser info
  userAgent: {
    type: String
  },

  // Parsed device type
  deviceType: {
    type: String,
    enum: ['desktop', 'tablet', 'mobile', 'unknown'],
    default: 'unknown'
  },

  // Browser name
  browser: {
    type: String
  },

  // Operating system
  os: {
    type: String
  },

  // Screen dimensions
  screenSize: {
    width: Number,
    height: Number
  },

  // Event timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Duration in milliseconds (for timed events like page views)
  duration: {
    type: Number,
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
analyticsEventSchema.index({ category: 1, action: 1, timestamp: -1 });
analyticsEventSchema.index({ feature: 1, timestamp: -1 });
analyticsEventSchema.index({ userId: 1, timestamp: -1 });
analyticsEventSchema.index({ timestamp: -1 });

// TTL index - automatically delete events older than 1 year
analyticsEventSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 }
);

// Static method to track an event
analyticsEventSchema.statics.track = async function(eventData) {
  try {
    const event = new this(eventData);
    await event.save();
    return event;
  } catch (error) {
    console.error('Failed to track analytics event:', error);
    return null;
  }
};

// Static method to get feature usage stats
analyticsEventSchema.statics.getFeatureUsage = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        category: 'feature'
      }
    },
    {
      $group: {
        _id: '$feature',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        actions: { $push: '$action' }
      }
    },
    {
      $project: {
        feature: '$_id',
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        _id: 0
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method to get popular actions
analyticsEventSchema.statics.getPopularActions = async function(startDate, endDate, limit = 20) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        category: 'feature'
      }
    },
    {
      $group: {
        _id: { feature: '$feature', action: '$action' },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        feature: '$_id.feature',
        action: '$_id.action',
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        _id: 0
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
};

// Static method to get daily active users
analyticsEventSchema.statics.getDailyActiveUsers = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        userId: { $ne: null }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
        },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        date: '$_id.date',
        count: { $size: '$uniqueUsers' },
        _id: 0
      }
    },
    { $sort: { date: 1 } }
  ]);
};

// Static method to get page views
analyticsEventSchema.statics.getPageViews = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        category: 'page_view'
      }
    },
    {
      $group: {
        _id: '$page',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' },
        avgDuration: { $avg: '$duration' }
      }
    },
    {
      $project: {
        page: '$_id',
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        avgDuration: { $round: ['$avgDuration', 0] },
        _id: 0
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method to get device breakdown
analyticsEventSchema.statics.getDeviceBreakdown = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$deviceType',
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        deviceType: '$_id',
        count: 1,
        uniqueUsers: { $size: '$uniqueUsers' },
        _id: 0
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method to get hourly activity pattern
analyticsEventSchema.statics.getHourlyActivity = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { $hour: '$timestamp' },
        count: { $sum: 1 }
      }
    },
    {
      $project: {
        hour: '$_id',
        count: 1,
        _id: 0
      }
    },
    { $sort: { hour: 1 } }
  ]);
};

const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);

export default AnalyticsEvent;
