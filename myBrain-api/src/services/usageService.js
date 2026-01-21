/**
 * =============================================================================
 * USAGESERVICE.JS - User Interaction Tracking Service
 * =============================================================================
 *
 * This service provides a clean interface for tracking user interactions
 * across the application. It's used by other services to record creates,
 * views, edits, and completions for the intelligent dashboard.
 *
 * USAGE:
 * ------
 * import { trackInteraction, getUsageProfile } from '../services/usageService.js';
 *
 * // In a route or service:
 * await trackInteraction(userId, 'tasks', 'creates');
 * await trackInteraction(userId, 'notes', 'views');
 *
 * // Get usage profile for dashboard:
 * const profile = await getUsageProfile(userId);
 *
 * =============================================================================
 */

import UsageStats from '../models/UsageStats.js';

// =============================================================================
// INTERACTION TRACKING
// =============================================================================

/**
 * trackInteraction(userId, feature, action)
 * -----------------------------------------
 * Records a single user interaction. Fire-and-forget - errors are logged
 * but don't interrupt the main flow.
 *
 * @param {string|ObjectId} userId - The user's ID
 * @param {string} feature - One of: tasks, notes, projects, events, messages, images, files
 * @param {string} action - One of: creates, views, edits, completes
 */
export async function trackInteraction(userId, feature, action) {
  try {
    await UsageStats.trackInteraction(userId, feature, action);
  } catch (error) {
    // Log but don't throw - tracking failures shouldn't break the app
    console.error(`[UsageService] Failed to track ${feature}.${action}:`, error.message);
  }
}

/**
 * Convenience methods for common actions
 */
export const trackCreate = (userId, feature) => trackInteraction(userId, feature, 'creates');
export const trackView = (userId, feature) => trackInteraction(userId, feature, 'views');
export const trackEdit = (userId, feature) => trackInteraction(userId, feature, 'edits');
export const trackComplete = (userId, feature) => trackInteraction(userId, feature, 'completes');

// =============================================================================
// USAGE PROFILE
// =============================================================================

/**
 * getUsageProfile(userId, days)
 * -----------------------------
 * Gets the feature usage percentages for the intelligent dashboard.
 *
 * @param {string|ObjectId} userId - The user's ID
 * @param {number} days - Number of days to analyze (default 30)
 * @returns {Object} Usage profile with feature percentages
 *
 * RETURN FORMAT:
 * {
 *   tasks: 35,
 *   notes: 22,
 *   projects: 16,
 *   events: 8,
 *   messages: 12,
 *   images: 5,
 *   files: 2,
 *   totalInteractions: 1270,
 *   lastActivityDays: { tasks: 0, notes: 1, ... }
 * }
 */
export async function getUsageProfile(userId, days = 30) {
  try {
    return await UsageStats.getUsageProfile(userId, days);
  } catch (error) {
    console.error('[UsageService] Failed to get usage profile:', error.message);
    // Return default profile on error
    return {
      tasks: 0,
      notes: 0,
      projects: 0,
      events: 0,
      messages: 0,
      images: 0,
      files: 0,
      totalInteractions: 0,
      lastActivityDays: {
        tasks: null,
        notes: null,
        projects: null,
        events: null,
        messages: null,
        images: null,
        files: null
      }
    };
  }
}

// =============================================================================
// SESSION TRACKING
// =============================================================================

/**
 * trackSession(userId)
 * --------------------
 * Records a new session (app open).
 *
 * @param {string|ObjectId} userId - The user's ID
 */
export async function trackSession(userId) {
  try {
    await UsageStats.trackSession(userId);
  } catch (error) {
    console.error('[UsageService] Failed to track session:', error.message);
  }
}

// =============================================================================
// BATCH TRACKING (for future optimization)
// =============================================================================

/**
 * Buffer for batched writes (not implemented yet)
 * In high-traffic scenarios, we could batch writes to reduce DB load.
 */
const interactionBuffer = new Map();
const BUFFER_FLUSH_INTERVAL = 5000; // 5 seconds

/**
 * flushBuffer()
 * -------------
 * Flushes buffered interactions to the database.
 * Reserved for future optimization.
 */
export async function flushBuffer() {
  if (interactionBuffer.size === 0) return;

  // Future: implement batch writes
  interactionBuffer.clear();
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  trackInteraction,
  trackCreate,
  trackView,
  trackEdit,
  trackComplete,
  getUsageProfile,
  trackSession
};
