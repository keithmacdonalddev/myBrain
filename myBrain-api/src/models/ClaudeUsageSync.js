/**
 * =============================================================================
 * CLAUDEUSAGESYNC.JS - Claude API Usage Sync History Model
 * =============================================================================
 *
 * This file defines the ClaudeUsageSync model - a complete record of each time
 * a user's Claude API usage data is synced from the Claude Code CLI tool.
 *
 * WHAT IS CLAUDE USAGE SYNC?
 * --------------------------
 * Claude Code (the CLI tool) has a "ccusage" command that shows detailed usage:
 * - Input tokens (tokens you send to Claude)
 * - Output tokens (tokens Claude returns to you)
 * - Cache tokens (tokens saved via prompt caching)
 * - Cost (USD charged for that usage)
 *
 * This model stores a COMPLETE SNAPSHOT of that data each time the user syncs.
 * It's like a backup/history of their usage stats over time.
 *
 * WHY SAVE SYNC HISTORY?
 * ----------------------
 * 1. GRAPHING: Track usage trends over time (tokens/cost per week)
 * 2. COMPARISON: "How much more did I use this month vs last month?"
 * 3. AUDIT: Historical record of what was synced and when
 * 4. ANALYSIS: Find patterns (peak usage times, favorite models, etc.)
 *
 * HOW IT WORKS:
 * 1. User runs: claude-code --sync-usage (in CLI)
 * 2. CLI fetches usage from Claude API
 * 3. User's myBrain dashboard calls: /api/claudeUsage/sync
 * 4. Backend creates ClaudeUsageSync document with:
 *    - Complete ccusage output (raw JSON)
 *    - Calculated summary (totals, date range)
 *    - Comparison with previous sync (how much changed)
 * 5. Dashboard can now show: "You used 50k tokens this week (↑ 20% from last week)"
 *
 * DATA STRUCTURE:
 * ---------------
 * ONE sync document contains:
 *
 * rawData:
 * - daily: Array of daily usage records from ccusage
 *   Each day has: date, inputTokens, outputTokens, totalCost, etc.
 * - totals: Aggregate totals from ccusage (context, reasoning, etc.)
 *
 * summary:
 * - Denormalized quick-access data (calculated from rawData)
 * - totalInputTokens, totalOutputTokens, totalCost, etc.
 * - Lets us show stats without parsing the rawData
 *
 * comparison:
 * - Delta from PREVIOUS sync (not previous day, but previous sync)
 * - "This week: +5000 tokens, +$2.50 vs last sync"
 *
 * EXAMPLE TIMELINE:
 * -----------------
 * Day 1: User syncs → ClaudeUsageSync created (Mon usage data)
 * Day 5: User syncs → New document created (Mon-Fri usage data)
 *        Comparison shows: +7000 tokens, +$1.50 from first sync
 * Day 12: User syncs → New document created (Mon-Fri of next week)
 *        Comparison shows: +3000 tokens, -$0.50 vs previous sync
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

// =============================================================================
// CLAUDE USAGE SYNC SCHEMA DEFINITION
// =============================================================================

/**
 * The Claude Usage Sync Schema
 * ---------------------------
 * Stores one complete sync event of a user's Claude usage data.
 * Each sync creates a new document (no updates).
 */
const claudeUsageSyncSchema = new mongoose.Schema(
  {
    // =========================================================================
    // OWNERSHIP & TIMING
    // =========================================================================

    /**
     * userId: Which user's usage data this sync belongs to
     * - Required: Every sync is for a specific user
     * - References: Points to a User document
     * - Index: For finding all syncs for a user
     *
     * Each user has multiple syncs (one per time they run ccusage)
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    /**
     * syncedAt: When this sync occurred
     * - Required: Must know when data was captured
     * - Default: Current time (Date.now)
     * - Index: For sorting syncs chronologically
     *
     * Used for: Timeline queries ("all syncs in January"),
     * sorting by date, calculating "days since last sync"
     */
    syncedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },

    // =========================================================================
    // RAW DATA (Complete ccusage output from Claude Code CLI)
    // =========================================================================

    /**
     * rawData: The original ccusage JSON output from Claude Code CLI
     * - Preserves ALL data exactly as received
     * - Used for: Historical archival, detailed analysis
     * - Contains two sub-fields:
     *
     * rawData.daily:
     * - Array of objects, one per day of usage
     * - EXAMPLE daily record:
     *   {
     *     date: "2025-01-15",
     *     inputTokens: 5000,
     *     outputTokens: 3000,
     *     cacheCreationTokens: 500,
     *     cacheReadTokens: 200,
     *     totalCost: 0.75,
     *     model: "claude-opus-4-5",
     *     contextUsage: { input: 100, output: 50 },
     *     ...
     *   }
     * - Supports BOTH naming conventions:
     *   - camelCase (new format): inputTokens, outputTokens, etc.
     *   - snake_case (old format): input_tokens, output_tokens, etc.
     *
     * WHY PRESERVE RAW DATA?
     * - If Claude API adds new fields, we have historical data
     * - Auditing: "What exactly was synced on Jan 5?"
     * - Future features: New analytics based on data we already have
     */
    rawData: {
      /**
       * daily: Array of daily usage records
       * - Required: Must have at least one day of data
       * - Type: Mixed (flexible format to handle API changes)
       *
       * EXAMPLE:
       * [
       *   { date: "2025-01-15", inputTokens: 5000, ... },
       *   { date: "2025-01-16", inputTokens: 6000, ... },
       *   { date: "2025-01-17", inputTokens: 4500, ... }
       * ]
       */
      daily: {
        type: [mongoose.Schema.Types.Mixed],
        required: true
      },

      /**
       * totals: Aggregate totals from ccusage output
       * - Optional: Some versions of ccusage may not provide this
       * - Contains: Contextual usage, reasoning tokens, etc.
       *
       * EXAMPLE:
       * {
       *   "context_usage": { "input": 1000, "output": 500 },
       *   "reasoning_usage": { "input": 300, "output": 150 },
       *   "total_input_tokens": 15000,
       *   ...
       * }
       *
       * WHY KEEP BOTH?
       * - daily: Shows per-day breakdown (for graphing trends)
       * - totals: Shows aggregate breakdown (for detailed analysis)
       */
      totals: {
        type: mongoose.Schema.Types.Mixed,
        required: false
      }
    },

    // =========================================================================
    // SUMMARY (Denormalized for quick access)
    // =========================================================================

    /**
     * summary: Pre-calculated totals for fast queries
     * - Extracted from rawData to avoid parsing JSON every time
     * - Used for: Dashboard cards, graphs, comparisons
     * - Recalculated fresh each sync (ensures accuracy)
     *
     * WHY DENORMALIZE?
     * MongoDB query: { "summary.totalCost": { $gt: 100 } }
     * vs parsing { "rawData.daily[*].totalCost" } each time
     * Denormalized is 100x faster for frequent queries
     */
    summary: {
      /**
       * daysIncluded: How many days of usage this sync covers
       * - Calculated from: length of daily array
       * - Used for: Determining sync interval
       *
       * EXAMPLE:
       * First sync: 7 days (Mon-Sun)
       * Second sync: 8 days (Mon-next Monday)
       * Comparison: "You worked 1 more day this period"
       */
      daysIncluded: {
        type: Number,
        required: true
      },

      /**
       * dateRange: The time period covered by this sync
       * - start: Date of first day in the daily array
       * - end: Date of last day in the daily array
       *
       * EXAMPLE:
       * {
       *   start: 2025-01-15T00:00:00Z,
       *   end: 2025-01-21T00:00:00Z
       * }
       *
       * Used for: Showing "Usage for Jan 15-21"
       */
      dateRange: {
        start: {
          type: Date,
          required: true
        },
        end: {
          type: Date,
          required: true
        }
      },

      /**
       * totalInputTokens: Total input tokens across all days
       * - Calculation: Sum of all daily records' inputTokens
       * - What are input tokens? Text you send to Claude
       *
       * EXAMPLE: 150,000 input tokens
       * "You sent 150k tokens to Claude this period"
       */
      totalInputTokens: {
        type: Number,
        default: 0
      },

      /**
       * totalOutputTokens: Total output tokens across all days
       * - Calculation: Sum of all daily records' outputTokens
       * - What are output tokens? Text Claude returns to you
       *
       * EXAMPLE: 85,000 output tokens
       * "Claude returned 85k tokens to you this period"
       */
      totalOutputTokens: {
        type: Number,
        default: 0
      },

      /**
       * totalCacheCreationTokens: Tokens from WRITING cache
       * - Calculation: Sum of all daily cache creation tokens
       * - These tokens are MORE EXPENSIVE but enable cheaper reads
       *
       * BUSINESS RULE:
       * Cache creation: 1.25x normal cost (write-once, read-100x)
       * Cache read: 0.1x normal cost (very cheap)
       * Net effect: Cache can SAVE money long-term
       */
      totalCacheCreationTokens: {
        type: Number,
        default: 0
      },

      /**
       * totalCacheReadTokens: Tokens from READING cache
       * - Calculation: Sum of all daily cache read tokens
       * - These are very cheap (10% of normal cost)
       *
       * OPTIMIZATION METRIC:
       * High cacheReadTokens = good use of caching
       * Low cacheReadTokens = opportunity to use caching more
       */
      totalCacheReadTokens: {
        type: Number,
        default: 0
      },

      /**
       * totalTokens: Sum of ALL token types
       * - Calculation: input + output + cacheCreation + cacheRead
       * - Holistic view of API usage
       *
       * EXAMPLE: 240,000 total tokens
       * "You used 240k tokens total this period"
       */
      totalTokens: {
        type: Number,
        default: 0
      },

      /**
       * totalCost: Total USD charged for this period
       * - Calculation: Sum of all daily totalCost
       * - Currency: US Dollars
       * - Precision: 4 decimal places (e.g., $1.2345)
       *
       * EXAMPLE: 45.67
       * "You spent $45.67 on Claude this period"
       *
       * PRICING MODEL:
       * Input: ~$3/million tokens
       * Output: ~$15/million tokens
       * Cache creation: 1.25x input cost
       * Cache read: 0.1x input cost
       */
      totalCost: {
        type: Number,
        default: 0
      },

      /**
       * modelsUsed: List of Claude models used this period
       * - Collected from daily records
       * - Possible values: ['claude-opus-4-5', 'claude-sonnet', etc.]
       *
       * EXAMPLE: ['claude-opus-4-5', 'claude-haiku-4-5']
       * "You used 2 different models this period"
       *
       * WHY TRACK?
       * Different models have different costs
       * Opus: More expensive, most capable
       * Sonnet: Mid-range
       * Haiku: Cheapest, fast for simple tasks
       */
      modelsUsed: {
        type: [String],
        default: []
      }
    },

    // =========================================================================
    // COMPARISON (Delta from previous sync)
    // =========================================================================

    /**
     * comparison: Changes from the PREVIOUS sync
     * - Calculated when recordSync() is called
     * - Lets dashboard show: "You used +5000 more tokens this week"
     * - Comparison is SYNC-to-SYNC, not day-to-day
     *
     * WHY NOT DAY-TO-DAY?
     * - Users sync whenever (daily, weekly, randomly)
     * - Comparing sync N to sync N-1 = accurate comparison
     * - Comparing day-to-day = noise (week 1 might be short week)
     *
     * EXAMPLE:
     * Sync 1 (Jan 5): 100k tokens, $15
     * Sync 2 (Jan 12): 120k tokens, $18
     * comparison.deltaFromPrevious shows:
     * - +20k tokens
     * - +$3 cost
     */
    comparison: {
      /**
       * isPreviousSyncAvailable: Was there a previous sync to compare to?
       * - true: This is sync #2 or later, comparison is valid
       * - false: This is the first sync, no previous sync to compare
       *
       * DASHBOARD BEHAVIOR:
       * If true: Show "↑ 20% tokens vs last sync"
       * If false: Show "No previous data to compare"
       */
      isPreviousSyncAvailable: {
        type: Boolean,
        default: false
      },

      /**
       * deltaFromPrevious: The actual changes since previous sync
       * - All values can be positive (increase) or negative (decrease)
       */
      deltaFromPrevious: {
        /**
         * tokensDelta: Change in total tokens
         * EXAMPLE: +5000 (used 5000 more tokens this sync)
         * EXAMPLE: -2000 (used 2000 fewer tokens this sync)
         */
        tokensDelta: {
          type: Number,
          default: 0
        },

        /**
         * costDelta: Change in USD cost
         * EXAMPLE: +1.50 (spent $1.50 more)
         * EXAMPLE: -0.50 (spent $0.50 less)
         *
         * DASHBOARD: Show as "↑$1.50" or "↓$0.50"
         */
        costDelta: {
          type: Number,
          default: 0
        },

        /**
         * daysDelta: Change in days included
         * EXAMPLE: +1 (this sync covers 1 more day)
         * EXAMPLE: 0 (same time period)
         * EXAMPLE: -2 (shorter period this time)
         *
         * NORMALIZATION:
         * To compare fairly, might divide token increase by day increase:
         * "tokens per day changed by: tokensDelta / daysDelta"
         */
        daysDelta: {
          type: Number,
          default: 0
        },

        /**
         * inputTokensDelta: Change in input tokens specifically
         * Shows if you're SENDING more vs RECEIVING more
         */
        inputTokensDelta: {
          type: Number,
          default: 0
        },

        /**
         * outputTokensDelta: Change in output tokens specifically
         * Shows if Claude is returning more/less content
         */
        outputTokensDelta: {
          type: Number,
          default: 0
        }
      }
    }
  },
  {
    /**
     * timestamps: true automatically adds:
     * - createdAt: When the sync record was created
     * - updatedAt: When the record was last modified (rarely happens)
     */
    timestamps: true
  }
);

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Compound Index: userId + syncedAt
 * ---------------------------------
 * For finding all syncs for a user, ordered by date (newest first).
 * Used by: Dashboard, history view, comparison calculations
 *
 * Query example:
 * Find all syncs for userId, sorted newest first (by syncedAt -1)
 * This is the MOST COMMON query pattern
 *
 * PERFORMANCE IMPACT:
 * - Without index: Scan all syncs, sort in memory
 * - With index: Jump to user's syncs, already sorted
 * - Query time: 100ms → 1ms (100x faster)
 */
claudeUsageSyncSchema.index({ userId: 1, syncedAt: -1 });

// =============================================================================
// STATIC METHODS (Called on the Model)
// =============================================================================

/**
 * recordSync(userId, ccusageOutput)
 * --------------------------------
 * Create a new sync record from raw ccusage output.
 * This is called every time a user syncs their usage data.
 *
 * @param {string} userId - The user syncing their usage
 * @param {Object} ccusageOutput - Raw output from Claude Code's ccusage command
 * @returns {Promise<Object>} - The created ClaudeUsageSync document
 *
 * WHAT THIS DOES:
 * 1. Parse ccusageOutput.daily array (handles multiple formats)
 * 2. Sum up tokens and cost across all days
 * 3. Calculate dateRange (first day to last day)
 * 4. Extract list of models used
 * 5. Get the previous sync for this user
 * 6. Calculate comparison deltas (what changed since last sync)
 * 7. Save the complete document
 * 8. Return the document
 *
 * EXAMPLE USAGE:
 * ```
 * const ccusageOutput = {
 *   daily: [
 *     { date: '2025-01-15', inputTokens: 5000, outputTokens: 3000, totalCost: 0.15 },
 *     { date: '2025-01-16', inputTokens: 6000, outputTokens: 4000, totalCost: 0.20 }
 *   ],
 *   totals: { ... }
 * };
 * const sync = await ClaudeUsageSync.recordSync(userId, ccusageOutput);
 * // sync.summary.totalTokens = 18000
 * // sync.summary.totalCost = 0.35
 * // sync.comparison shows delta from previous sync
 * ```
 *
 * FORMAT FLEXIBILITY:
 * Handles BOTH naming conventions from Claude Code CLI:
 * - New: inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens
 * - Old: input_tokens, output_tokens, cache_creation_input_tokens, etc.
 *
 * MODEL EXTRACTION:
 * Supports both modelsUsed array and single model field
 * - Some daily records have: modelsUsed: ['claude-opus-4-5']
 * - Some have: model: 'claude-opus-4-5'
 * - We extract all unique models across all days
 */
claudeUsageSyncSchema.statics.recordSync = async function (userId, ccusageOutput) {
  // Extract summary data from ccusage output
  const dailyRecords = ccusageOutput.daily || [];
  const totals = ccusageOutput.totals || {};

  if (dailyRecords.length === 0) {
    throw new Error('No daily records provided in ccusage output');
  }

  // Calculate summary from daily records
  const dates = dailyRecords.map(d => new Date(d.date)).sort((a, b) => a - b);
  const modelsSet = new Set();

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheCreationTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCost = 0;

  dailyRecords.forEach(record => {
    // Support both ccusage formats:
    // - camelCase: inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens, totalCost
    // - underscore: input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens, cost_usd
    totalInputTokens += record.inputTokens || record.input_tokens || 0;
    totalOutputTokens += record.outputTokens || record.output_tokens || 0;
    totalCacheCreationTokens += record.cacheCreationTokens || record.cache_creation_input_tokens || 0;
    totalCacheReadTokens += record.cacheReadTokens || record.cache_read_input_tokens || 0;
    totalCost += record.totalCost || record.cost_usd || 0;

    // Extract models from modelsUsed array or individual model field
    if (record.modelsUsed && Array.isArray(record.modelsUsed)) {
      record.modelsUsed.forEach(m => modelsSet.add(m));
    } else if (record.model) {
      modelsSet.add(record.model);
    }
  });

  const summary = {
    daysIncluded: dailyRecords.length,
    dateRange: {
      start: dates[0],
      end: dates[dates.length - 1]
    },
    totalInputTokens,
    totalOutputTokens,
    totalCacheCreationTokens,
    totalCacheReadTokens,
    totalTokens: totalInputTokens + totalOutputTokens + totalCacheCreationTokens + totalCacheReadTokens,
    totalCost,
    modelsUsed: Array.from(modelsSet)
  };

  // Get previous sync for comparison
  const previousSync = await this.findOne({ userId })
    .sort({ syncedAt: -1 })
    .select('summary');

  // Calculate comparison
  const comparison = {
    isPreviousSyncAvailable: !!previousSync,
    deltaFromPrevious: {
      tokensDelta: 0,
      costDelta: 0,
      daysDelta: 0,
      inputTokensDelta: 0,
      outputTokensDelta: 0
    }
  };

  if (previousSync) {
    comparison.deltaFromPrevious = {
      tokensDelta: summary.totalTokens - previousSync.summary.totalTokens,
      costDelta: summary.totalCost - previousSync.summary.totalCost,
      daysDelta: summary.daysIncluded - previousSync.summary.daysIncluded,
      inputTokensDelta: summary.totalInputTokens - previousSync.summary.totalInputTokens,
      outputTokensDelta: summary.totalOutputTokens - previousSync.summary.totalOutputTokens
    };
  }

  // Create and save sync record
  const sync = new this({
    userId,
    syncedAt: new Date(),
    rawData: {
      daily: dailyRecords,
      totals: totals
    },
    summary,
    comparison
  });

  await sync.save();
  return sync;
};

/**
 * getLatestSync(userId)
 * ---------------------
 * Get the most recent sync for a user.
 * Used to show current usage on the dashboard.
 *
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} - The latest sync record or null
 *
 * EXAMPLE USAGE:
 * ```
 * const latestSync = await ClaudeUsageSync.getLatestSync(userId);
 * console.log(`You've used ${latestSync.summary.totalTokens} tokens`);
 * console.log(`Last synced: ${latestSync.syncedAt}`);
 * ```
 *
 * DASHBOARD USE:
 * Card shows: "You've used 150k tokens" (from latest sync)
 */
claudeUsageSyncSchema.statics.getLatestSync = async function (userId) {
  return await this.findOne({ userId })
    .sort({ syncedAt: -1 })  // Most recent first
    .exec();
};

/**
 * getLastNSyncs(userId, n)
 * -----------------------
 * Get the last N sync records for a user.
 * Used for graphing usage trends (show last 10 syncs).
 *
 * @param {string} userId - The user's ID
 * @param {number} n - How many syncs to return (default 10)
 * @returns {Promise<Array>} - Array of sync records, newest first
 *
 * EXAMPLE USAGE:
 * ```
 * const lastTenSyncs = await ClaudeUsageSync.getLastNSyncs(userId, 10);
 * // Extract dates and costs for graphing
 * const labels = lastTenSyncs.map(s => s.syncedAt.toLocaleDateString());
 * const costs = lastTenSyncs.map(s => s.summary.totalCost);
 * // Show on line graph: Cost trend over time
 * ```
 *
 * GRAPHING:
 * Perfect for: Line graphs, trend analysis
 * Shows: How usage/cost has changed over multiple sync periods
 * Example: "Your cost has been stable ($20/week) vs ($18/week) 4 weeks ago"
 */
claudeUsageSyncSchema.statics.getLastNSyncs = async function (userId, n = 10) {
  return await this.find({ userId })
    .sort({ syncedAt: -1 })  // Newest first
    .limit(n)
    .exec();
};

/**
 * compareSyncs(syncId1, syncId2)
 * -------------------------------
 * Compare two specific sync records to see what changed.
 * Useful for: "How much more did I use on Jan 15 vs Jan 8?"
 *
 * @param {string} syncId1 - ID of the first (older) sync
 * @param {string} syncId2 - ID of the second (newer) sync
 * @returns {Promise<Object>} - Comparison object with both syncs and differences
 *
 * RETURNED OBJECT:
 * {
 *   sync1: { id, syncedAt, summary },
 *   sync2: { id, syncedAt, summary },
 *   differences: {
 *     costDelta: 2.50,
 *     tokensDelta: 10000,
 *     inputTokensDelta: 6000,
 *     outputTokensDelta: 4000,
 *     daysDelta: 7,
 *     timeBetweenSyncs: milliseconds
 *   }
 * }
 *
 * EXAMPLE USAGE:
 * ```
 * const comparison = await ClaudeUsageSync.compareSyncs(syncId1, syncId2);
 * console.log(`Cost increased by: $${comparison.differences.costDelta}`);
 * console.log(`You used ${comparison.differences.daysDelta} more days`);
 * // Calculate daily rate change
 * const costPerDay1 = comparison.sync1.summary.totalCost / daysDelta1;
 * const costPerDay2 = comparison.sync2.summary.totalCost / daysDelta2;
 * // Shows if you're using Claude more efficiently
 * ```
 *
 * SAFETY CHECKS:
 * - Verifies both syncs exist (throws if not found)
 * - Ensures both syncs belong to the same user (prevents cross-user comparisons)
 * - Calculates time between syncs (not provided by recordSync)
 */
claudeUsageSyncSchema.statics.compareSyncs = async function (syncId1, syncId2) {
  const [sync1, sync2] = await Promise.all([
    this.findById(syncId1),
    this.findById(syncId2)
  ]);

  if (!sync1 || !sync2) {
    throw new Error('One or both syncs not found');
  }
  // Validate both syncs exist
  if (!sync1 || !sync2) {
    throw new Error('One or both syncs not found');
  }

  // Validate both syncs belong to same user
  if (sync1.userId.toString() !== sync2.userId.toString()) {
    throw new Error('Cannot compare syncs from different users');
  }

  // Calculate differences (sync2 - sync1)
  // All deltas show: "newer sync value - older sync value"
  // Positive = increase, Negative = decrease
  const differences = {
    costDelta: sync2.summary.totalCost - sync1.summary.totalCost,
    tokensDelta: sync2.summary.totalTokens - sync1.summary.totalTokens,
    inputTokensDelta: sync2.summary.totalInputTokens - sync1.summary.totalInputTokens,
    outputTokensDelta: sync2.summary.totalOutputTokens - sync1.summary.totalOutputTokens,
    daysDelta: sync2.summary.daysIncluded - sync1.summary.daysIncluded,
    timeBetweenSyncs: sync2.syncedAt.getTime() - sync1.syncedAt.getTime()
  };

  return {
    sync1: {
      id: sync1._id,
      syncedAt: sync1.syncedAt,
      summary: sync1.summary
    },
    sync2: {
      id: sync2._id,
      syncedAt: sync2.syncedAt,
      summary: sync2.summary
    },
    differences
  };
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the ClaudeUsageSync model from the schema.
 * This gives us methods to:
 *
 * STATIC METHODS (on Model):
 * - recordSync(userId, ccusageOutput) - Create new sync from ccusage output
 * - getLatestSync(userId) - Get most recent sync (for dashboard)
 * - getLastNSyncs(userId, n) - Get last N syncs (for graphing)
 * - compareSyncs(syncId1, syncId2) - Compare two syncs (trend analysis)
 * - find(), findById(), etc. - Standard Mongoose CRUD operations
 *
 * INSTANCE METHODS (on a sync document):
 * - save() - Save changes to the sync record
 * - etc. - Standard Mongoose document methods
 *
 * TYPICAL WORKFLOW:
 * 1. Frontend: User clicks "Sync Claude Usage" on dashboard
 * 2. Frontend: Calls /api/claudeUsage/sync with ccusage output
 * 3. Backend: ClaudeUsageSync.recordSync(userId, ccusageOutput)
 * 4. Backend: Creates new document with summary & comparison
 * 5. Frontend: Dashboard refreshes and shows new usage data
 * 6. Frontend: Graph updates to show trend from comparison
 *
 * DATA RETENTION:
 * All syncs are kept permanently (no TTL) for historical analysis
 * Syncs are immutable - once created, they're never updated
 * This creates an audit trail of usage history
 */
const ClaudeUsageSync = mongoose.model('ClaudeUsageSync', claudeUsageSyncSchema);

export default ClaudeUsageSync;
