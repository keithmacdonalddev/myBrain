/**
 * =============================================================================
 * CLAUDEUSAGE.JS - Claude Code Usage Tracking Model
 * =============================================================================
 *
 * This file defines the ClaudeUsage model - a document that tracks daily
 * Claude Code token usage and costs from the ccusage CLI tool.
 *
 * WHAT IS TRACKED?
 * ----------------
 * - Input tokens (prompt)
 * - Output tokens (responses)
 * - Cache creation tokens (new prompt caching)
 * - Cache read tokens (cache hits)
 * - Total cost in USD
 * - Model breakdown (costs per model used)
 *
 * WHY DAILY AGGREGATION?
 * ----------------------
 * ccusage provides daily rollup data, so we store one document per user
 * per day. This provides:
 * - Efficient storage (aligned with ccusage output)
 * - Fast querying for trends and summaries
 * - Easy cost tracking and budget monitoring
 *
 * HOW IT'S USED:
 * --------------
 * The /claude-usage skill runs `npx ccusage daily --json` and sends the
 * output to POST /analytics/claude-usage. The service processes it and
 * creates/updates daily records. The frontend displays:
 * - Total costs over time
 * - Token distribution
 * - Model usage breakdown
 * - Cost trends and averages
 *
 * =============================================================================
 */

import mongoose from 'mongoose';

// =============================================================================
// CLAUDE PRICING (per million tokens)
// =============================================================================

/**
 * Claude model pricing as of Jan 2026
 * Used to calculate costs when not provided in the input data
 */
const CLAUDE_PRICING = {
  // Opus 4.5 (default for Claude Code Max)
  'claude-opus-4-5-20251101': {
    input: 15.00,      // $15 per million input tokens
    output: 75.00,     // $75 per million output tokens
    cacheCreation: 3.75, // $3.75 per million (25% of input)
    cacheRead: 0.30    // $0.30 per million (2% of input)
  },
  // Sonnet 4
  'claude-sonnet-4-20250514': {
    input: 3.00,
    output: 15.00,
    cacheCreation: 0.75,
    cacheRead: 0.06
  },
  // Fallback pricing (Opus rates)
  default: {
    input: 15.00,
    output: 75.00,
    cacheCreation: 3.75,
    cacheRead: 0.30
  }
};

/**
 * calculateCostFromTokens(tokenData, modelName)
 * ---------------------------------------------
 * Calculates USD cost from token counts using Claude pricing.
 *
 * @param {Object} tokenData - Token counts
 * @param {string} modelName - Model identifier (optional)
 * @returns {number} Cost in USD
 */
function calculateCostFromTokens(tokenData, modelName = null) {
  const pricing = CLAUDE_PRICING[modelName] || CLAUDE_PRICING.default;

  const inputCost = ((tokenData.inputTokens || 0) / 1_000_000) * pricing.input;
  const outputCost = ((tokenData.outputTokens || 0) / 1_000_000) * pricing.output;
  const cacheCreationCost = ((tokenData.cacheCreationTokens || 0) / 1_000_000) * pricing.cacheCreation;
  const cacheReadCost = ((tokenData.cacheReadTokens || 0) / 1_000_000) * pricing.cacheRead;

  return Math.round((inputCost + outputCost + cacheCreationCost + cacheReadCost) * 100) / 100;
}

// =============================================================================
 // MODEL BREAKDOWN SUB-SCHEMA
// =============================================================================

/**
 * ModelBreakdown
 * --------------
 * Tracks usage and cost for each Claude model used in a day.
 */
const modelBreakdownSchema = new mongoose.Schema({
  modelName: {
    type: String,
    required: true
  },
  inputTokens: {
    type: Number,
    default: 0
  },
  outputTokens: {
    type: Number,
    default: 0
  },
  cacheCreationTokens: {
    type: Number,
    default: 0
  },
  cacheReadTokens: {
    type: Number,
    default: 0
  },
  cost: {
    type: Number,
    default: 0
  }
}, { _id: false });

// =============================================================================
// CLAUDE USAGE SCHEMA
// =============================================================================

const claudeUsageSchema = new mongoose.Schema({
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
   * Token metrics from ccusage output
   */
  inputTokens: {
    type: Number,
    default: 0
  },

  outputTokens: {
    type: Number,
    default: 0
  },

  cacheCreationTokens: {
    type: Number,
    default: 0
  },

  cacheReadTokens: {
    type: Number,
    default: 0
  },

  totalTokens: {
    type: Number,
    default: 0
  },

  /**
   * totalCost: Cost in USD for this day
   */
  totalCost: {
    type: Number,
    default: 0
  },

  /**
   * modelsUsed: Array of model names used this day
   */
  modelsUsed: {
    type: [String],
    default: []
  },

  /**
   * modelBreakdowns: Per-model usage and cost details
   */
  modelBreakdowns: {
    type: [modelBreakdownSchema],
    default: []
  }

}, {
  timestamps: true
});

// =============================================================================
// COMPOUND INDEX FOR EFFICIENT QUERIES
// =============================================================================

/**
 * Compound index on userId + date
 * This makes queries like "get all usage for user X in the last 30 days"
 * very fast.
 */
claudeUsageSchema.index({ userId: 1, date: -1 });

// =============================================================================
// STATIC METHODS
// =============================================================================

/**
 * recordUsage(userId, dayData)
 * ----------------------------
 * Creates or updates a ClaudeUsage record from ccusage daily data.
 * This is the main entry point for storing usage data.
 *
 * @param {ObjectId} userId - The user's ID
 * @param {Object} dayData - Single day object from ccusage JSON
 * @returns {Document} The ClaudeUsage document
 *
 * EXAMPLE dayData (from ccusage):
 * {
 *   date: "2026-01-21",
 *   inputTokens: 85536,
 *   outputTokens: 1978,
 *   cacheCreationTokens: 2802991,
 *   cacheReadTokens: 67599139,
 *   totalTokens: 70489644,
 *   totalCost: 44.60,
 *   modelsUsed: ["claude-opus-4-5-20251101"],
 *   modelBreakdowns: [...]
 * }
 */
claudeUsageSchema.statics.recordUsage = async function(userId, dayData) {
  // Parse and normalize date to midnight UTC
  const date = new Date(dayData.date);
  date.setUTCHours(0, 0, 0, 0);

  // Calculate cost from tokens if not provided
  // This handles data from custom scripts that don't include cost
  let totalCost = dayData.totalCost || 0;
  if (totalCost === 0) {
    // Determine model - use first model if available, otherwise default
    const modelName = dayData.modelsUsed?.[0] || null;
    totalCost = calculateCostFromTokens({
      inputTokens: dayData.inputTokens || 0,
      outputTokens: dayData.outputTokens || 0,
      cacheCreationTokens: dayData.cacheCreationTokens || 0,
      cacheReadTokens: dayData.cacheReadTokens || 0
    }, modelName);
  }

  // Prepare document data
  const usageData = {
    userId,
    date,
    inputTokens: dayData.inputTokens || 0,
    outputTokens: dayData.outputTokens || 0,
    cacheCreationTokens: dayData.cacheCreationTokens || 0,
    cacheReadTokens: dayData.cacheReadTokens || 0,
    totalTokens: dayData.totalTokens || 0,
    totalCost,
    modelsUsed: dayData.modelsUsed || [],
    modelBreakdowns: dayData.modelBreakdowns || []
  };

  // Upsert (create or replace) the daily record
  const result = await this.findOneAndUpdate(
    { userId, date },
    usageData,
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );

  return result;
};

/**
 * getUsageRange(userId, startDate, endDate)
 * ------------------------------------------
 * Retrieves all usage records for a user within a date range.
 *
 * @param {ObjectId} userId - The user's ID
 * @param {Date} startDate - Start of range (inclusive)
 * @param {Date} endDate - End of range (inclusive)
 * @returns {Array} Array of ClaudeUsage documents, sorted newest first
 */
claudeUsageSchema.statics.getUsageRange = async function(userId, startDate, endDate) {
  // Normalize dates
  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  const records = await this.find({
    userId,
    date: { $gte: start, $lte: end }
  }).sort({ date: -1 });

  return records;
};

/**
 * getTotalCosts(userId, days)
 * ---------------------------
 * Calculates total costs for the last N days.
 *
 * @param {ObjectId} userId - The user's ID
 * @param {number} days - Number of days to look back
 * @returns {Object} Total costs and token counts
 */
claudeUsageSchema.statics.getTotalCosts = async function(userId, days = 30) {
  const endDate = new Date();
  endDate.setUTCHours(23, 59, 59, 999);

  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() - days);
  startDate.setUTCHours(0, 0, 0, 0);

  const records = await this.getUsageRange(userId, startDate, endDate);

  const totals = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    daysTracked: records.length
  };

  for (const record of records) {
    totals.inputTokens += record.inputTokens;
    totals.outputTokens += record.outputTokens;
    totals.cacheCreationTokens += record.cacheCreationTokens;
    totals.cacheReadTokens += record.cacheReadTokens;
    totals.totalTokens += record.totalTokens;
    totals.totalCost += record.totalCost;
  }

  return totals;
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

const ClaudeUsage = mongoose.model('ClaudeUsage', claudeUsageSchema);

export default ClaudeUsage;
