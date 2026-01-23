/**
 * =============================================================================
 * CLAUDESUBSCRIPTIONUSAGE.JS - Claude Subscription Limits Model
 * =============================================================================
 *
 * This file defines the ClaudeSubscriptionUsage model - stores snapshots of
 * a user's Claude subscription limit usage (different from token costs).
 *
 * WHAT IS SUBSCRIPTION USAGE?
 * ---------------------------
 * Claude Code's /usage command shows percentage-based limits:
 * - Current session: 22% used, resets 9am daily
 * - Current week (all models): 5% used, resets weekly
 * - Current week (Sonnet only): 2% used, resets weekly
 *
 * This is DIFFERENT from token data (which tracks actual tokens and costs).
 * Subscription limits show how much of your Claude plan you've used.
 *
 * WHY TRACK THIS?
 * ---------------
 * 1. ALERTS: Know when you're approaching limits
 * 2. PATTERNS: See usage trends (when do you hit limits?)
 * 3. PLANNING: Decide when to use which models
 * 4. HISTORY: Track how your usage changes over time
 *
 * DATA SOURCE:
 * The /usage command in Claude Code shows this interactively.
 * User copies/pastes the output, skill parses it, stores here.
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

import mongoose from 'mongoose';

// =============================================================================
// CLAUDE SUBSCRIPTION USAGE SCHEMA
// =============================================================================

const claudeSubscriptionUsageSchema = new mongoose.Schema(
  {
    // =========================================================================
    // OWNERSHIP & TIMING
    // =========================================================================

    /**
     * userId: Which user this subscription data belongs to
     * - Required: Every snapshot is for a specific user
     * - References: Points to a User document
     * - Index: For finding all snapshots for a user
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    /**
     * capturedAt: When this snapshot was taken
     * - Required: Must know when data was captured
     * - Default: Current time
     * - Index: For sorting snapshots chronologically
     */
    capturedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },

    // =========================================================================
    // SESSION USAGE
    // =========================================================================

    /**
     * session: Current session usage (resets daily)
     * - usedPercent: 0-100, how much of session limit is used
     * - resetTime: When it resets (e.g., "9am")
     * - resetTimezone: Timezone for reset (e.g., "America/Halifax")
     *
     * EXAMPLE from /usage output:
     * "Current session - Resets 9am (America/Halifax) - 22% used"
     */
    session: {
      usedPercent: {
        type: Number,
        min: 0,
        max: 100,
        required: true
      },
      resetTime: {
        type: String,
        required: true
      },
      resetTimezone: {
        type: String,
        required: true
      }
    },

    // =========================================================================
    // WEEKLY USAGE (ALL MODELS)
    // =========================================================================

    /**
     * weeklyAllModels: Weekly usage across all Claude models
     * - usedPercent: 0-100, how much of weekly limit is used
     * - resetDate: When it resets (full date/time)
     *
     * EXAMPLE from /usage output:
     * "Current week (all models) - Resets Jan 28, 10pm - 5% used"
     */
    weeklyAllModels: {
      usedPercent: {
        type: Number,
        min: 0,
        max: 100,
        required: true
      },
      resetDate: {
        type: Date,
        required: true
      }
    },

    // =========================================================================
    // WEEKLY USAGE (SONNET ONLY)
    // =========================================================================

    /**
     * weeklySonnet: Weekly usage for Sonnet model specifically
     * - usedPercent: 0-100, how much of Sonnet limit is used
     * - resetDate: When it resets (full date/time)
     *
     * EXAMPLE from /usage output:
     * "Current week (Sonnet only) - Resets Jan 28, 10pm - 2% used"
     */
    weeklySonnet: {
      usedPercent: {
        type: Number,
        min: 0,
        max: 100,
        required: true
      },
      resetDate: {
        type: Date,
        required: true
      }
    },

    // =========================================================================
    // RAW DATA
    // =========================================================================

    /**
     * rawOutput: Original text from /usage command
     * - Preserved for reference and debugging
     * - Optional but recommended
     */
    rawOutput: {
      type: String,
      required: false
    }
  },
  {
    timestamps: true
  }
);

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Compound Index: userId + capturedAt
 * For finding all snapshots for a user, sorted by date (newest first)
 */
claudeSubscriptionUsageSchema.index({ userId: 1, capturedAt: -1 });

// =============================================================================
// STATIC METHODS
// =============================================================================

/**
 * recordSnapshot(userId, data, rawOutput)
 * ---------------------------------------
 * Create a new subscription usage snapshot.
 *
 * @param {string} userId - The user's ID
 * @param {Object} data - Parsed subscription data
 * @param {Object} data.session - { usedPercent, resetTime, resetTimezone }
 * @param {Object} data.weeklyAllModels - { usedPercent, resetDate }
 * @param {Object} data.weeklySonnet - { usedPercent, resetDate }
 * @param {string} rawOutput - Original /usage output text
 * @returns {Promise<Object>} - The created document
 */
claudeSubscriptionUsageSchema.statics.recordSnapshot = async function (userId, data, rawOutput) {
  const snapshot = new this({
    userId,
    capturedAt: new Date(),
    session: {
      usedPercent: data.session.usedPercent,
      resetTime: data.session.resetTime,
      resetTimezone: data.session.resetTimezone
    },
    weeklyAllModels: {
      usedPercent: data.weeklyAllModels.usedPercent,
      resetDate: new Date(data.weeklyAllModels.resetDate)
    },
    weeklySonnet: {
      usedPercent: data.weeklySonnet.usedPercent,
      resetDate: new Date(data.weeklySonnet.resetDate)
    },
    rawOutput
  });

  await snapshot.save();
  return snapshot;
};

/**
 * getLatest(userId)
 * -----------------
 * Get the most recent subscription snapshot for a user.
 *
 * @param {string} userId - The user's ID
 * @returns {Promise<Object|null>} - The latest snapshot or null
 */
claudeSubscriptionUsageSchema.statics.getLatest = async function (userId) {
  return await this.findOne({ userId })
    .sort({ capturedAt: -1 })
    .exec();
};

/**
 * getHistory(userId, limit)
 * -------------------------
 * Get recent subscription snapshots for a user.
 * Useful for tracking usage trends over time.
 *
 * @param {string} userId - The user's ID
 * @param {number} limit - How many snapshots to return (default 20)
 * @returns {Promise<Array>} - Array of snapshots, newest first
 */
claudeSubscriptionUsageSchema.statics.getHistory = async function (userId, limit = 20) {
  return await this.find({ userId })
    .sort({ capturedAt: -1 })
    .limit(limit)
    .exec();
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

const ClaudeSubscriptionUsage = mongoose.model('ClaudeSubscriptionUsage', claudeSubscriptionUsageSchema);

export default ClaudeSubscriptionUsage;
