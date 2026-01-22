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

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * UsageStats model - Tracks all user interactions in the application.
 * Stores counts of creates, views, edits, and completions per feature per user.
 * Updated every time a user interacts with a feature (create note, view task, etc).
 * Used by the dashboard to calculate feature usage percentages for smart prioritization.
 */
import UsageStats from '../models/UsageStats.js';

// =============================================================================
// INTERACTION TRACKING
// =============================================================================

/**
 * trackInteraction(userId, feature, action)
 * -----------------------------------------
 * Records a single user interaction in the usage tracking system.
 * This is a fire-and-forget operation - errors are logged but don't interrupt
 * the main application flow. Used throughout the app whenever a user interacts
 * with a feature.
 *
 * BUSINESS LOGIC:
 * The dashboard uses interaction history to intelligently prioritize features
 * for each user. By tracking all interactions, we build a usage profile that
 * shows which features the user cares about most.
 *
 * @param {string|ObjectId} userId - The user's unique ID
 * @param {string} feature - Feature name: 'tasks', 'notes', 'projects', 'events',
 *                          'messages', 'images', 'files'
 * @param {string} action - Type of interaction: 'creates', 'views', 'edits', 'completes'
 *
 * @returns {Promise<void>} - No return value (fire-and-forget)
 *
 * @throws {Error} - Errors are caught and logged, not thrown
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // When a user creates a note
 * await trackInteraction(userId, 'notes', 'creates');
 *
 * // When a user views a task
 * await trackInteraction(userId, 'tasks', 'views');
 *
 * // When a user edits a project
 * await trackInteraction(userId, 'projects', 'edits');
 *
 * // When a user completes a task
 * await trackInteraction(userId, 'tasks', 'completes');
 * ```
 */
export async function trackInteraction(userId, feature, action) {
  // =========================================================================
  // RECORD INTERACTION
  // =========================================================================
  // Attempt to record the interaction. We use a try-catch because tracking
  // failures should never break the user's workflow.

  try {
    // Call the model's static method to record this interaction
    await UsageStats.trackInteraction(userId, feature, action);
  } catch (error) {
    // =====================================================================
    // HANDLE TRACKING ERROR
    // =====================================================================
    // Log the error but don't throw - the user's action was successful,
    // we just failed to track it. This is acceptable.

    console.error(`[UsageService] Failed to track ${feature}.${action}:`, error.message);
  }
}

/**
 * =============================================================================
 * CONVENIENCE FUNCTIONS FOR COMMON ACTIONS
 * =============================================================================
 * These are shorthand wrappers around trackInteraction() for the most common
 * interaction types. They make code more readable when you know which action
 * type you're tracking.
 */

/**
 * trackCreate(userId, feature)
 * ----------------------------
 * Shorthand to track that a user created something.
 *
 * @param {string|ObjectId} userId - The user's ID
 * @param {string} feature - Feature name ('tasks', 'notes', etc.)
 *
 * @returns {Promise<void>}
 *
 * EXAMPLE USAGE:
 * ```javascript
 * import { trackCreate } from '../services/usageService.js';
 *
 * // In a route that creates a note:
 * await noteService.createNote(userId, noteData);
 * await trackCreate(userId, 'notes');  // Track the creation
 * ```
 */
export const trackCreate = (userId, feature) => trackInteraction(userId, feature, 'creates');

/**
 * trackView(userId, feature)
 * --------------------------
 * Shorthand to track that a user viewed something.
 *
 * @param {string|ObjectId} userId - The user's ID
 * @param {string} feature - Feature name ('tasks', 'notes', etc.)
 *
 * @returns {Promise<void>}
 *
 * EXAMPLE USAGE:
 * ```javascript
 * import { trackView } from '../services/usageService.js';
 *
 * // In a route that fetches notes:
 * const notes = await noteService.getNotes(userId);
 * await trackView(userId, 'notes');  // Track the view
 * ```
 */
export const trackView = (userId, feature) => trackInteraction(userId, feature, 'views');

/**
 * trackEdit(userId, feature)
 * --------------------------
 * Shorthand to track that a user edited something.
 *
 * @param {string|ObjectId} userId - The user's ID
 * @param {string} feature - Feature name ('tasks', 'notes', etc.)
 *
 * @returns {Promise<void>}
 *
 * EXAMPLE USAGE:
 * ```javascript
 * import { trackEdit } from '../services/usageService.js';
 *
 * // In a route that updates a project:
 * await projectService.updateProject(userId, projectId, updates);
 * await trackEdit(userId, 'projects');  // Track the edit
 * ```
 */
export const trackEdit = (userId, feature) => trackInteraction(userId, feature, 'edits');

/**
 * trackComplete(userId, feature)
 * ----------------------------
 * Shorthand to track that a user completed something.
 *
 * @param {string|ObjectId} userId - The user's ID
 * @param {string} feature - Feature name (usually 'tasks' or 'projects')
 *
 * @returns {Promise<void>}
 *
 * EXAMPLE USAGE:
 * ```javascript
 * import { trackComplete } from '../services/usageService.js';
 *
 * // In a route that completes a task:
 * await taskService.completeTask(userId, taskId);
 * await trackComplete(userId, 'tasks');  // Track the completion
 * ```
 */
export const trackComplete = (userId, feature) => trackInteraction(userId, feature, 'completes');

// =============================================================================
// USAGE PROFILE
// =============================================================================

/**
 * getUsageProfile(userId, days)
 * -----------------------------
 * Gets the feature usage percentages for the intelligent dashboard.
 * This analyzes the user's interaction history to determine which features
 * they use most frequently.
 *
 * BUSINESS LOGIC:
 * The dashboard prioritizes features based on actual usage patterns. If a user
 * creates tasks most frequently (35% of all interactions), the tasks feature
 * gets priority placement. This data-driven approach ensures the dashboard
 * shows what matters most to each user.
 *
 * @param {string|ObjectId} userId - The user's unique ID
 * @param {number} [days=30] - Number of days of history to analyze.
 *                            Defaults to 30 days for rolling trends.
 *
 * @returns {Promise<Object>} Usage profile object with structure:
 *   - tasks: number - Percentage of interactions that were task-related (0-100)
 *   - notes: number - Percentage of interactions that were note-related (0-100)
 *   - projects: number - Percentage of interactions that were project-related (0-100)
 *   - events: number - Percentage of interactions that were event-related (0-100)
 *   - messages: number - Percentage of interactions that were message-related (0-100)
 *   - images: number - Percentage of interactions that were image-related (0-100)
 *   - files: number - Percentage of interactions that were file-related (0-100)
 *   - totalInteractions: number - Total count of all interactions in period
 *   - lastActivityDays: Object - Days since last activity per feature
 *     - tasks: number|null - Days since last task interaction (0 = today)
 *     - notes: number|null - Days since last note interaction
 *     - projects: number|null - Days since last project interaction
 *     - events: number|null - Days since last event interaction
 *     - messages: number|null - Days since last message interaction
 *     - images: number|null - Days since last image interaction
 *     - files: number|null - Days since last file interaction
 *
 * GRACEFUL DEGRADATION:
 * If the query fails, returns a zero-usage profile. This prevents dashboard
 * errors from breaking the app - features just won't be prioritized until
 * data is available again.
 *
 * EXAMPLE USAGE:
 * ```javascript
 * import { getUsageProfile } from '../services/usageService.js';
 *
 * // Get 30-day usage profile (default)
 * const profile = await getUsageProfile(userId);
 * // {
 * //   tasks: 35,
 * //   notes: 22,
 * //   projects: 16,
 * //   events: 8,
 * //   messages: 12,
 * //   images: 5,
 * //   files: 2,
 * //   totalInteractions: 1270,
 * //   lastActivityDays: { tasks: 0, notes: 1, projects: 5, ... }
 * // }
 *
 * // Get 7-day usage profile (this week only)
 * const weekProfile = await getUsageProfile(userId, 7);
 *
 * // Use in dashboard to prioritize features
 * const dashboard = await dashboardService.generateDashboard(userId, profile);
 * ```
 */
export async function getUsageProfile(userId, days = 30) {
  // =========================================================================
  // FETCH USAGE PROFILE FROM DATABASE
  // =========================================================================
  // Call the model to calculate usage percentages based on interaction history

  try {
    return await UsageStats.getUsageProfile(userId, days);
  } catch (error) {
    // =====================================================================
    // HANDLE QUERY ERROR GRACEFULLY
    // =====================================================================
    // If we can't fetch the profile, log the error but return a default.
    // A missing profile is not critical - the dashboard will just not have
    // personalized prioritization, but it will still work.

    console.error('[UsageService] Failed to get usage profile:', error.message);

    // Return default zero-usage profile
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
 * Records that a user opened the app (started a new session).
 * Fired once per app open/login to track engagement metrics.
 *
 * BUSINESS LOGIC:
 * Session tracking gives us engagement data: how often users open the app,
 * when they're most active, etc. This complements feature-level interaction
 * tracking to give a complete picture of user engagement.
 *
 * @param {string|ObjectId} userId - The user's unique ID
 *
 * @returns {Promise<void>} - No return value (fire-and-forget)
 *
 * @throws {Error} - Errors are caught and logged, not thrown
 *
 * EXAMPLE USAGE:
 * ```javascript
 * import { trackSession } from '../services/usageService.js';
 *
 * // In auth middleware or after login:
 * await trackSession(userId);
 *
 * // Or in the login/signup route:
 * const user = await authService.login(email, password);
 * await trackSession(user._id);  // Record this session
 * res.json({ success: true });
 * ```
 *
 * NOTE:
 * This is called at login/app open, not for every page view. It tracks
 * discrete app sessions, not individual page loads.
 */
export async function trackSession(userId) {
  // =========================================================================
  // RECORD SESSION START
  // =========================================================================
  // Attempt to record that this user just opened the app. Like trackInteraction,
  // we don't throw errors - session tracking failures shouldn't break login.

  try {
    // Call the model to record this session
    await UsageStats.trackSession(userId);
  } catch (error) {
    // =====================================================================
    // HANDLE SESSION TRACKING ERROR
    // =====================================================================
    // Log but don't throw - the user successfully logged in, we just couldn't
    // record the session. This is acceptable.

    console.error('[UsageService] Failed to track session:', error.message);
  }
}

// =============================================================================
// BATCH TRACKING (for future optimization)
// =============================================================================

/**
 * =============================================================================
 * BATCH TRACKING (RESERVED FOR FUTURE OPTIMIZATION)
 * =============================================================================
 * Infrastructure for batched writes to the database. Currently not used, but
 * prepared for high-traffic scenarios where individual database writes could
 * become a bottleneck.
 *
 * HOW BATCHING WOULD WORK:
 * Instead of writing each interaction immediately, buffer multiple interactions
 * and flush them together. This reduces database load significantly:
 * - 1000 interactions: 1000 database writes → 1 batch write
 * - Reduces load by ~99% with batches of 100+
 * - Small cost: interactions delayed by max 5 seconds
 *
 * WHEN TO IMPLEMENT:
 * - If database shows high write load from tracking
 * - When interaction tracking exceeds 10,000+ events/second
 * - After profiling shows tracking is a bottleneck
 */

/**
 * interactionBuffer
 * -----------------
 * Map that would hold buffered interactions in memory, keyed by userId.
 * Each entry is an array of pending interactions waiting to be flushed.
 * Currently unused - for future batch optimization.
 *
 * EXAMPLE STRUCTURE (when implemented):
 * {
 *   userId1: [
 *     { feature: 'tasks', action: 'creates' },
 *     { feature: 'notes', action: 'views' },
 *   ],
 *   userId2: [
 *     { feature: 'projects', action: 'edits' },
 *   ]
 * }
 */
const interactionBuffer = new Map();

/**
 * BUFFER_FLUSH_INTERVAL
 * ---------------------
 * How often to automatically flush buffered interactions to the database.
 * Set to 5 seconds as a reasonable balance between:
 * - Database load reduction (batch size)
 * - Data freshness (user doesn't wait too long)
 */
const BUFFER_FLUSH_INTERVAL = 5000; // 5 seconds

/**
 * flushBuffer()
 * -------------
 * Flushes all buffered interactions to the database in a single batch write.
 * Reserved for future optimization - not currently used.
 *
 * @returns {Promise<void>}
 *
 * BUSINESS LOGIC:
 * When implemented, this would:
 * 1. Stop accepting new interactions temporarily
 * 2. Collect all buffered interactions
 * 3. Write them all to the database in one operation
 * 4. Clear the buffer and resume
 *
 * OPTIMIZATION IMPACT:
 * With 1000 interactions/second, batch flushing would reduce database
 * writes from 1000/sec to 200/sec (assuming 5-second batches with
 * varying traffic).
 *
 * EXAMPLE USAGE (FUTURE):
 * ```javascript
 * import { flushBuffer } from '../services/usageService.js';
 *
 * // When gracefully shutting down the server:
 * process.on('SIGTERM', async () => {
 *   console.log('Flushing remaining interactions...');
 *   await flushBuffer();
 *   process.exit(0);
 * });
 * ```
 */
export async function flushBuffer() {
  // =========================================================================
  // CHECK IF BUFFER HAS DATA
  // =========================================================================
  // If buffer is empty, nothing to do
  if (interactionBuffer.size === 0) return;

  // =========================================================================
  // BATCH WRITE TO DATABASE
  // =========================================================================
  // Future: implement batch write operation
  // For now, just clear the buffer

  interactionBuffer.clear();
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all usage service functions.
 *
 * USAGE:
 * ```javascript
 * import usageService from './services/usageService.js';
 *
 * // Track interactions
 * await usageService.trackCreate(userId, 'tasks');
 * await usageService.trackView(userId, 'notes');
 * await usageService.trackComplete(userId, 'tasks');
 *
 * // Get usage data for dashboard
 * const profile = await usageService.getUsageProfile(userId);
 * // profile.tasks = 35  (35% of interactions are task-related)
 *
 * // Track app opens
 * await usageService.trackSession(userId);
 * ```
 *
 * OR with named imports:
 * ```javascript
 * import {
 *   trackCreate,
 *   trackView,
 *   getUsageProfile,
 *   trackSession
 * } from './services/usageService.js';
 *
 * // Same functions, cleaner imports
 * await trackCreate(userId, 'projects');
 * const profile = await getUsageProfile(userId, 30);
 * ```
 */
export default {
  trackInteraction,
  trackCreate,
  trackView,
  trackEdit,
  trackComplete,
  getUsageProfile,
  trackSession
};
