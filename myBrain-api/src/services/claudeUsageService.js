/**
 * =============================================================================
 * CLAUDEUSAGESERVICE.JS - Claude Code Usage Tracking Service
 * =============================================================================
 *
 * This service provides a clean interface for storing and retrieving Claude
 * Code usage statistics (tokens and costs) from the ccusage CLI tool.
 *
 * USAGE:
 * ------
 * import * as claudeUsageService from '../services/claudeUsageService.js';
 *
 * // Process ccusage output:
 * const result = await claudeUsageService.processUsageData(userId, ccusageJson);
 *
 * // Get recent usage:
 * const stats = await claudeUsageService.getRecentUsage(userId, 30);
 *
 * // Get custom date range:
 * const rangeStats = await claudeUsageService.getUsageStats(userId, startDate, endDate);
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * ClaudeUsage model - Stores daily Claude API usage and cost data.
 * Each document represents one day's usage: input tokens, output tokens,
 * cache tokens, costs, and models used. Used for historical tracking.
 */
import ClaudeUsage from '../models/ClaudeUsage.js';

/**
 * ClaudeUsageSync model - Tracks when usage data was last synced.
 * Stores the last sync timestamp and sync status to prevent duplicate imports
 * and help with incremental syncing from the ccusage tool.
 */
import ClaudeUsageSync from '../models/ClaudeUsageSync.js';

// =============================================================================
// DATA PROCESSING
// =============================================================================

/**
 * processUsageData(userId, ccusageOutput)
 * ---------------------------------------
 * Processes ccusage JSON output and stores it in the database.
 * This is the main entry point for the /claude-usage skill.
 *
 * @param {string|ObjectId} userId - The user's ID
 * @param {Object} ccusageOutput - JSON output from `npx ccusage daily --json`
 * @returns {Promise<Object>} Summary of processed data
 * @throws {Error} If ccusageOutput is invalid
 *
 * EXPECTED INPUT FORMAT:
 * {
 *   daily: [
 *     {
 *       date: "2026-01-21",
 *       inputTokens: 85536,
 *       outputTokens: 1978,
 *       cacheCreationTokens: 2802991,
 *       cacheReadTokens: 67599139,
 *       totalTokens: 70489644,
 *       totalCost: 44.60,
 *       modelsUsed: ["claude-opus-4-5-20251101"],
 *       modelBreakdowns: [...]
 *     }
 *   ],
 *   totals: { ... }
 * }
 *
 * RETURN FORMAT:
 * {
 *   daysProcessed: 7,
 *   totalCost: 44.60,
 *   dateRange: {
 *     start: Date("2026-01-15"),
 *     end: Date("2026-01-21")
 *   }
 * }
 */
export async function processUsageData(userId, ccusageOutput) {
  // Validate structure
  if (!ccusageOutput?.daily || !Array.isArray(ccusageOutput.daily)) {
    const error = new Error('Invalid ccusage output format. Expected "daily" array.');
    error.statusCode = 400;
    throw error;
  }

  if (ccusageOutput.daily.length === 0) {
    const error = new Error('No usage data found in ccusage output.');
    error.statusCode = 400;
    throw error;
  }

  // Process each day
  const results = [];
  for (const dayData of ccusageOutput.daily) {
    try {
      const result = await ClaudeUsage.recordUsage(userId, dayData);
      results.push(result);
    } catch (err) {
      // Log but continue processing other days
      console.error(`[ClaudeUsageService] Failed to process day ${dayData.date}:`, err.message);
    }
  }

  if (results.length === 0) {
    const error = new Error('Failed to process any usage data.');
    error.statusCode = 500;
    throw error;
  }

  // Calculate summary
  const totalCost = results.reduce((sum, r) => sum + (r.totalCost || 0), 0);
  const dates = results.map(r => r.date).sort((a, b) => a - b);

  return {
    daysProcessed: results.length,
    totalCost: Math.round(totalCost * 100) / 100, // Round to 2 decimals
    dateRange: {
      start: dates[0],
      end: dates[dates.length - 1]
    }
  };
}

/**
 * recordSyncEvent(userId, ccusageOutput)
 * --------------------------------------
 * Records a complete sync event while also processing daily data.
 * This is the new entry point that replaces direct calls to processUsageData.
 *
 * Creates two types of records:
 * 1. ClaudeUsageSync - Complete sync event with comparison
 * 2. ClaudeUsage - Daily records (via processUsageData)
 *
 * @param {string|ObjectId} userId - The user's ID
 * @param {Object} ccusageOutput - JSON output from `npx ccusage daily --json`
 * @returns {Promise<Object>} { sync, dailyProcessing }
 * @throws {Error} If ccusageOutput is invalid
 *
 * RETURN FORMAT:
 * {
 *   sync: ClaudeUsageSync document,
 *   dailyProcessing: { daysProcessed, totalCost, dateRange }
 * }
 */
export async function recordSyncEvent(userId, ccusageOutput) {
  // 1. Store complete sync event (NEW)
  const sync = await ClaudeUsageSync.recordSync(userId, ccusageOutput);

  // 2. Process daily data as before (EXISTING)
  const dailyProcessing = await processUsageData(userId, ccusageOutput);

  return { sync, dailyProcessing };
}

// =============================================================================
// SYNC QUERIES
// =============================================================================

/**
 * getLatestSyncInfo(userId)
 * -------------------------
 * Gets the most recent sync event with comparison to previous sync.
 *
 * @param {string|ObjectId} userId - The user's ID
 * @returns {Promise<Object|null>} Latest sync or null if no syncs
 */
export async function getLatestSyncInfo(userId) {
  const sync = await ClaudeUsageSync.getLatestSync(userId);
  return sync;
}

/**
 * getSyncHistory(userId, limit)
 * -----------------------------
 * Gets the last N sync events for a user.
 *
 * @param {string|ObjectId} userId - The user's ID
 * @param {number} limit - Number of syncs to retrieve (default 10)
 * @returns {Promise<Array>} Array of sync documents
 */
export async function getSyncHistory(userId, limit = 10) {
  const syncs = await ClaudeUsageSync.getLastNSyncs(userId, limit);
  return syncs;
}

/**
 * compareSyncEvents(userId, syncId1, syncId2)
 * -------------------------------------------
 * Compares two specific sync events.
 *
 * @param {string|ObjectId} userId - The user's ID (for verification)
 * @param {string} syncId1 - First sync ID
 * @param {string} syncId2 - Second sync ID
 * @returns {Promise<Object>} Comparison result
 */
export async function compareSyncEvents(userId, syncId1, syncId2) {
  const comparison = await ClaudeUsageSync.compareSyncs(syncId1, syncId2);

  // Verify ownership
  if (comparison.sync1.userId?.toString() !== userId.toString()) {
    const error = new Error('Access denied');
    error.statusCode = 403;
    throw error;
  }

  return comparison;
}

// =============================================================================
// DATA RETRIEVAL
// =============================================================================

/**
 * getUsageStats(userId, startDate, endDate)
 * ------------------------------------------
 * Retrieves and aggregates usage stats for a specific date range.
 *
 * @param {string|ObjectId} userId - The user's ID
 * @param {Date} startDate - Start of range (inclusive)
 * @param {Date} endDate - End of range (inclusive)
 * @returns {Promise<Object>} Aggregated usage statistics
 *
 * RETURN FORMAT:
 * {
 *   records: [...],         // Array of ClaudeUsage documents
 *   totals: {
 *     inputTokens: 250000,
 *     outputTokens: 5000,
 *     cacheCreationTokens: 1000000,
 *     cacheReadTokens: 50000000,
 *     totalTokens: 51255000,
 *     totalCost: 120.50
 *   },
 *   modelDistribution: {
 *     "claude-opus-4-5": { cost: 80.00, tokens: 30000000 },
 *     "claude-sonnet-4-5": { cost: 40.50, tokens: 21255000 }
 *   },
 *   averageDailyCost: 17.21,
 *   daysTracked: 7
 * }
 */
export async function getUsageStats(userId, startDate, endDate) {
  const records = await ClaudeUsage.getUsageRange(userId, startDate, endDate);

  // Initialize aggregates
  const totals = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    totalTokens: 0,
    totalCost: 0
  };

  const modelDistribution = {};

  // Aggregate data
  for (const record of records) {
    totals.inputTokens += record.inputTokens || 0;
    totals.outputTokens += record.outputTokens || 0;
    totals.cacheCreationTokens += record.cacheCreationTokens || 0;
    totals.cacheReadTokens += record.cacheReadTokens || 0;
    totals.totalTokens += record.totalTokens || 0;
    totals.totalCost += record.totalCost || 0;

    // Aggregate by model
    for (const breakdown of record.modelBreakdowns || []) {
      if (!modelDistribution[breakdown.modelName]) {
        modelDistribution[breakdown.modelName] = {
          cost: 0,
          tokens: 0,
          inputTokens: 0,
          outputTokens: 0
        };
      }

      const model = modelDistribution[breakdown.modelName];
      model.cost += breakdown.cost || 0;
      model.inputTokens += breakdown.inputTokens || 0;
      model.outputTokens += breakdown.outputTokens || 0;
      model.tokens += (breakdown.inputTokens || 0) + (breakdown.outputTokens || 0);
    }
  }

  // Round costs to 2 decimals
  totals.totalCost = Math.round(totals.totalCost * 100) / 100;
  Object.values(modelDistribution).forEach(model => {
    model.cost = Math.round(model.cost * 100) / 100;
  });

  return {
    records,
    totals,
    modelDistribution,
    averageDailyCost: records.length > 0
      ? Math.round((totals.totalCost / records.length) * 100) / 100
      : 0,
    daysTracked: records.length
  };
}

/**
 * getRecentUsage(userId, days)
 * -----------------------------
 * Retrieves aggregated usage stats for the last N calendar days.
 * This is a convenience wrapper around getUsageStats that handles date calculations.
 *
 * BUSINESS LOGIC:
 * When users ask "what's my usage for the last 7 days?", we need to:
 * 1. Figure out what "7 days" means (calendar days, not rolling window)
 * 2. Set proper boundaries (midnight to midnight)
 * 3. Query and aggregate the data
 *
 * CALENDAR DAY CALCULATION:
 * We use calendar days, not a rolling 24-hour window. This means:
 * - If it's 10am today and you ask for "1 day", you get midnight today to 11:59pm today
 * - If it's 10am today and you ask for "7 days", you get midnight 7 days ago to 11:59pm today
 * - The calculation uses (days - 1) because today counts as day 1
 *
 * WHY CALENDAR DAYS?
 * Users think in calendar terms (Monday-Sunday). "This week" means Sunday-Saturday,
 * not "168 hours ago". Calendar days align with how people think about time.
 *
 * @param {string|ObjectId} userId - The user's ID
 * @param {number} days - Number of calendar days to look back (default 30, min 1, max typically 365)
 *
 * @returns {Promise<Object>} Aggregated usage statistics with totals, model distribution, averages
 *
 * @throws - Does not throw; error handling is in getUsageStats
 *
 * @example
 * // Get today's usage only (1 calendar day)
 * const today = await getRecentUsage(userId, 1);
 * console.log(today.totals.totalCost);  // Today's cost
 *
 * // Get last 7 days (most common report)
 * const week = await getRecentUsage(userId, 7);
 * console.log(week.totals.totalTokens);    // Total tokens used
 * console.log(week.averageDailyCost);      // Average per day
 *
 * // Get last 30 days (monthly report)
 * const month = await getRecentUsage(userId, 30);
 * console.log(month.modelDistribution);    // Which models used most
 * ```
 */
export async function getRecentUsage(userId, days = 30) {
  // =====================================================
  // CALCULATE TIME BOUNDARIES
  // =====================================================
  const now = new Date();

  // =====================================================
  // CALCULATE END DATE (END OF TODAY)
  // =====================================================
  // Users want data through the end of today, not just current time
  // 23:59:59.999 ensures we capture any records from this last millisecond of today
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  // =====================================================
  // CALCULATE START DATE (BEGINNING OF N DAYS AGO)
  // =====================================================
  // If user asks for "7 days":
  // - Day 1 = today
  // - Day 2 = yesterday
  // - Day 7 = 6 days ago
  // So we subtract (days - 1) from today, not days
  //
  // Example: today is Jan 21, asking for 7 days:
  // - Start: Jan 15 at 00:00:00 (6 days ago)
  // - End: Jan 21 at 23:59:59 (today)
  // - That's 7 calendar days of data
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - (days - 1));  // Subtract (days - 1)
  startDate.setHours(0, 0, 0, 0);                       // Midnight

  // =====================================================
  // DELEGATE TO GETUSAGESTATS FOR ACTUAL WORK
  // =====================================================
  // This function just handles the date calculations
  // The actual aggregation is in getUsageStats
  return getUsageStats(userId, startDate, endDate);
}

/**
 * getLatestSync(userId)
 * ---------------------
 * Gets metadata about the most recent sync and total record count for a user.
 * Used to display sync status in the UI (when was the last update?).
 *
 * BUSINESS LOGIC:
 * Users want to know:
 * 1. When was usage data last synced to myBrain?
 * 2. How many days of data have we collected?
 *
 * This helps them verify their data is up-to-date and understand their history.
 *
 * IMPORTANT TIME DISTINCTION:
 * The ClaudeUsage model has TWO date fields:
 * - date: The DATE OF THE USAGE (which day's data is this?)
 * - createdAt: When the record was SYNCED TO THE DATABASE (now)
 *
 * We return createdAt because users care about "when was my data updated?"
 * not "what date does this data represent?". We query for the most recent
 * createdAt to get the latest sync.
 *
 * @param {string|ObjectId} userId - The user's ID
 *
 * @returns {Promise<Object|null>} Sync metadata or null if error
 *   - date: {Date|null} - When the latest data was synced (createdAt)
 *   - count: {number} - Total records for this user
 *
 * @throws - Does not throw; returns null if error occurs
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Check if user has synced data
 * const syncInfo = await getLatestSync(userId);
 *
 * if (!syncInfo || !syncInfo.date) {
 *   console.log('No usage data synced yet');
 *   return;
 * }
 *
 * // Display sync status in UI
 * console.log(`Last updated: ${syncInfo.date.toLocaleString()}`);
 * console.log(`Total days tracked: ${syncInfo.count}`);
 * ```
 */
export async function getLatestSync(userId) {
  try {
    // =====================================================
    // FETCH MOST RECENT RECORD (BY SYNC TIME)
    // =====================================================
    // We sort by createdAt (when synced) not date (what day it is)
    // This tells us "when did we last get an update?"
    // We use .lean() to get a plain JavaScript object (faster, no Mongoose overhead)
    const latest = await ClaudeUsage.findOne({ userId })
      .sort({ createdAt: -1 })    // Most recent first
      .limit(1)                    // Only need one
      .select('createdAt')         // Only fetch the timestamp
      .lean();                     // Return plain object, not Mongoose document

    // =====================================================
    // COUNT TOTAL RECORDS FOR THIS USER
    // =====================================================
    // This tells us how many days of data we've collected
    // A higher count = more historical data available
    const count = await ClaudeUsage.countDocuments({ userId });

    // =====================================================
    // RETURN SYNC METADATA
    // =====================================================
    return {
      date: latest?.createdAt || null,  // null if no records exist yet
      count                             // Number of days tracked
    };
  } catch (error) {
    // =====================================================
    // ERROR HANDLING - FAIL GRACEFULLY
    // =====================================================
    // If we can't fetch sync info, just log and return null
    // Don't throw - this is informational data, not critical
    console.error('[ClaudeUsageService] Failed to get latest sync:', error.message);
    return null;
  }
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  // Sync tracking (NEW)
  recordSyncEvent,
  getLatestSyncInfo,
  getSyncHistory,
  compareSyncEvents,
  // Daily tracking (EXISTING)
  processUsageData,
  getUsageStats,
  getRecentUsage,
  getLatestSync
};
