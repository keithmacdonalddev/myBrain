/**
 * =============================================================================
 * USAGESTATS.JS - User Interaction Tracking Model
 * =============================================================================
 *
 * This file defines the UsageStats model - a document that tracks daily user
 * interactions with different features of myBrain. This data powers the
 * intelligent dashboard's Feature Usage factor.
 *
 * WHAT IS TRACKED?
 * ----------------
 * - Creates: When a user creates a new item
 * - Views: When a user opens/reads an item
 * - Edits: When a user modifies an item
 * - Completes: When a user marks a task as done
 *
 * WHY DAILY AGGREGATION?
 * ----------------------
 * Instead of storing every single interaction, we aggregate by day.
 * This provides:
 * - Efficient storage (one document per user per day)
 * - Fast querying for 30-day rolling windows
 * - Privacy (no individual action timestamps)
 *
 * HOW IT'S USED:
 * --------------
 * The dashboard calculates feature usage percentages from 30-day data:
 * - If tasks account for 40% of interactions, tasks get a usage score of 40
 * - Recent interactions (last 7 days) count 2x
 * - Features unused for 14+ days decay by 50%
 *
 * =============================================================================
 */

import mongoose from 'mongoose';

// =============================================================================
// INTERACTION COUNTERS SUB-SCHEMA
// =============================================================================

/**
 * InteractionCounters
 * -------------------
 * Defines the shape of interaction counts for each feature.
 * All counters default to 0.
 */
const interactionCountersSchema = {
  creates: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
  edits: { type: Number, default: 0 },
  completes: { type: Number, default: 0 }
};

// =============================================================================
// USAGE STATS SCHEMA
// =============================================================================

const usageStatsSchema = new mongoose.Schema({
  /**
   * userId: The user these stats belong to
   * Required and indexed for efficient queries
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  /**
   * date: The date these stats are for (stored as midnight UTC)
   * One document per user per day
   */
  date: {
    type: Date,
    required: true,
    index: true
  },

  /**
   * interactions: Counts of user interactions by feature type
   * Each feature has its own set of counters
   */
  interactions: {
    tasks: interactionCountersSchema,
    notes: interactionCountersSchema,
    projects: interactionCountersSchema,
    events: interactionCountersSchema,
    messages: {
      creates: { type: Number, default: 0 },
      views: { type: Number, default: 0 }
    },
    images: {
      creates: { type: Number, default: 0 },
      views: { type: Number, default: 0 }
    },
    files: {
      creates: { type: Number, default: 0 },
      views: { type: Number, default: 0 }
    }
  },

  /**
   * sessionCount: Number of sessions (app opens) this day
   * Helps distinguish active from passive users
   */
  sessionCount: {
    type: Number,
    default: 0
  },

  /**
   * totalInteractions: Pre-calculated total for this day
   * Updated automatically when interactions change
   */
  totalInteractions: {
    type: Number,
    default: 0
  }

}, {
  timestamps: true
});

// =============================================================================
// COMPOUND INDEX FOR EFFICIENT QUERIES
// =============================================================================

/**
 * Compound index on userId + date
 * This makes queries like "get all stats for user X in the last 30 days"
 * very fast.
 */
usageStatsSchema.index({ userId: 1, date: -1 });

// =============================================================================
// STATIC METHODS
// =============================================================================

/**
 * getOrCreateForDate(userId, date)
 * --------------------------------
 * Gets or creates a UsageStats document for a specific user and date.
 * This is the main entry point for recording interactions.
 *
 * @param {ObjectId} userId - The user's ID
 * @param {Date} date - The date (will be normalized to midnight UTC)
 * @returns {Document} The UsageStats document
 */
usageStatsSchema.statics.getOrCreateForDate = async function(userId, date = new Date()) {
  // Normalize to midnight UTC
  const normalizedDate = new Date(date);
  normalizedDate.setUTCHours(0, 0, 0, 0);

  let stats = await this.findOne({
    userId,
    date: normalizedDate
  });

  if (!stats) {
    stats = await this.create({
      userId,
      date: normalizedDate
    });
  }

  return stats;
};

/**
 * trackInteraction(userId, feature, action)
 * -----------------------------------------
 * Records a single interaction. This is the main API for tracking.
 *
 * @param {ObjectId} userId - The user's ID
 * @param {string} feature - The feature (tasks, notes, projects, etc.)
 * @param {string} action - The action (creates, views, edits, completes)
 * @returns {Document} Updated UsageStats document
 *
 * EXAMPLE:
 * await UsageStats.trackInteraction(userId, 'tasks', 'creates');
 * await UsageStats.trackInteraction(userId, 'notes', 'views');
 */
usageStatsSchema.statics.trackInteraction = async function(userId, feature, action) {
  const validFeatures = ['tasks', 'notes', 'projects', 'events', 'messages', 'images', 'files'];
  const validActions = ['creates', 'views', 'edits', 'completes'];

  if (!validFeatures.includes(feature)) {
    throw new Error(`Invalid feature: ${feature}`);
  }
  if (!validActions.includes(action)) {
    throw new Error(`Invalid action: ${action}`);
  }

  // Some features don't have all action types
  const limitedFeatures = ['messages', 'images', 'files'];
  if (limitedFeatures.includes(feature) && !['creates', 'views'].includes(action)) {
    // Silently ignore invalid action for limited features
    return null;
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const updatePath = `interactions.${feature}.${action}`;

  const result = await this.findOneAndUpdate(
    { userId, date: today },
    {
      $inc: {
        [updatePath]: 1,
        totalInteractions: 1
      }
    },
    {
      upsert: true,
      new: true
    }
  );

  return result;
};

/**
 * getUsageProfile(userId, days)
 * -----------------------------
 * Calculates feature usage percentages for the intelligent dashboard.
 * Implements the weighting described in dashboard-intelligence.md:
 * - Recent interactions (last 7 days) count 2x
 * - Features unused for 14+ days decay by 50%
 *
 * @param {ObjectId} userId - The user's ID
 * @param {number} days - Number of days to look back (default 30)
 * @returns {Object} Usage profile with feature percentages
 *
 * RETURN FORMAT:
 * {
 *   tasks: 35,      // 35% of weighted interactions
 *   notes: 22,      // 22% of weighted interactions
 *   projects: 16,
 *   events: 8,
 *   messages: 12,
 *   images: 5,
 *   files: 2,
 *   totalInteractions: 1270,
 *   lastActivityDays: { tasks: 0, notes: 1, ... }
 * }
 */
usageStatsSchema.statics.getUsageProfile = async function(userId, days = 30) {
  const endDate = new Date();
  endDate.setUTCHours(23, 59, 59, 999);

  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() - days);
  startDate.setUTCHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  sevenDaysAgo.setUTCHours(0, 0, 0, 0);

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 14);
  fourteenDaysAgo.setUTCHours(0, 0, 0, 0);

  // Get all stats for the period
  const stats = await this.find({
    userId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: -1 });

  const features = ['tasks', 'notes', 'projects', 'events', 'messages', 'images', 'files'];

  // Initialize counters
  const weightedTotals = {};
  const lastActivity = {};
  features.forEach(feature => {
    weightedTotals[feature] = 0;
    lastActivity[feature] = null;
  });

  // Calculate weighted totals
  for (const stat of stats) {
    const isRecent = stat.date >= sevenDaysAgo;
    const weight = isRecent ? 2 : 1;

    for (const feature of features) {
      const interactions = stat.interactions?.[feature];
      if (interactions) {
        const featureTotal = (interactions.creates || 0) +
                            (interactions.views || 0) +
                            (interactions.edits || 0) +
                            (interactions.completes || 0);

        if (featureTotal > 0) {
          weightedTotals[feature] += featureTotal * weight;

          // Track last activity date
          if (!lastActivity[feature]) {
            lastActivity[feature] = stat.date;
          }
        }
      }
    }
  }

  // Apply decay for features unused 14+ days
  const today = new Date();
  for (const feature of features) {
    if (lastActivity[feature]) {
      const daysSinceActivity = Math.floor(
        (today - lastActivity[feature]) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceActivity >= 14) {
        weightedTotals[feature] *= 0.5;
      }
    }
  }

  // Calculate percentages
  const totalWeighted = Object.values(weightedTotals).reduce((a, b) => a + b, 0);

  const profile = {};
  const lastActivityDays = {};

  for (const feature of features) {
    profile[feature] = totalWeighted > 0
      ? Math.round((weightedTotals[feature] / totalWeighted) * 100)
      : 0;

    if (lastActivity[feature]) {
      lastActivityDays[feature] = Math.floor(
        (today - lastActivity[feature]) / (1000 * 60 * 60 * 24)
      );
    } else {
      lastActivityDays[feature] = null;
    }
  }

  return {
    ...profile,
    totalInteractions: stats.reduce((sum, s) => sum + (s.totalInteractions || 0), 0),
    lastActivityDays
  };
};

/**
 * trackSession(userId)
 * --------------------
 * Records a new session (app open) for today.
 *
 * @param {ObjectId} userId - The user's ID
 */
usageStatsSchema.statics.trackSession = async function(userId) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await this.findOneAndUpdate(
    { userId, date: today },
    { $inc: { sessionCount: 1 } },
    { upsert: true }
  );
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

const UsageStats = mongoose.model('UsageStats', usageStatsSchema);

export default UsageStats;
