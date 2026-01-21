/**
 * =============================================================================
 * ENSURETAGS.JS - Default Tags Setup Middleware
 * =============================================================================
 *
 * This file provides middleware that ensures every user has a default set of
 * tags when they first use the application.
 *
 * WHAT ARE TAGS?
 * --------------
 * Tags are labels you attach to notes, tasks, and other items to help
 * organize and filter them. Unlike categories (which represent life areas),
 * tags are flexible labels that can be applied to any item.
 *
 * Examples:
 * - #urgent - High priority items
 * - #meeting - Meeting-related items
 * - #idea - Creative ideas to explore
 * - #follow-up - Items needing follow-up
 *
 * WHY PROVIDE DEFAULT TAGS?
 * -------------------------
 * 1. NEW USER EXPERIENCE: Users can start tagging immediately
 * 2. GUIDANCE: Shows users how tags can be used
 * 3. CONSISTENCY: Common tags are available for everyone
 * 4. BEST PRACTICES: Default tags follow productivity patterns
 *
 * TAG ORGANIZATION:
 * -----------------
 * Default tags are organized by purpose with distinct colors:
 *
 * 1. PRIORITY & STATUS (Red/Orange): urgent, important, blocked, in-progress, review, done
 * 2. TIME-RELATED (Blue): today, this-week, someday, recurring, deadline
 * 3. WORK & PRODUCTIVITY (Teal/Cyan): meeting, follow-up, client, project, email
 * 4. CONTENT & IDEAS (Green): idea, research, reference, draft, template
 * 5. PERSONAL & GOALS (Purple/Pink): goal, reminder, habit, learning, personal
 * 6. ORGANIZATION (Gray): archive, later, maybe, waiting, delegated
 *
 * COLOR CODING:
 * -------------
 * Colors help users quickly identify tag types at a glance:
 * - Red/Orange: Urgent, needs attention
 * - Blue: Time-based organization
 * - Green: Content and ideas
 * - Purple/Pink: Personal growth
 * - Gray: Lower priority, archived
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Tag model represents a user's tag in the database.
 */
import Tag from '../models/Tag.js';

// =============================================================================
// DEFAULT TAGS CONFIGURATION
// =============================================================================

/**
 * DEFAULT_TAGS
 * ------------
 * The default tags created for new users.
 * Organized by purpose with distinct colors for easy identification.
 */
const DEFAULT_TAGS = [
  // =========================================================================
  // PRIORITY & STATUS (Red/Orange spectrum)
  // =========================================================================
  // These tags help prioritize and track item status

  { name: 'urgent', color: '#ef4444' },        // Bright red - needs immediate attention
  { name: 'important', color: '#f97316' },     // Orange - high priority
  { name: 'blocked', color: '#dc2626' },       // Dark red - can't proceed
  { name: 'in-progress', color: '#eab308' },   // Yellow - currently working on
  { name: 'review', color: '#f59e0b' },        // Amber - needs review
  { name: 'done', color: '#22c55e' },          // Green - completed (for reference)

  // =========================================================================
  // TIME-RELATED (Blue spectrum)
  // =========================================================================
  // These tags help organize by when things need to happen

  { name: 'today', color: '#3b82f6' },         // Blue - do today
  { name: 'this-week', color: '#6366f1' },     // Indigo - do this week
  { name: 'someday', color: '#8b5cf6' },       // Violet - no specific deadline
  { name: 'recurring', color: '#a855f7' },     // Purple - repeating items
  { name: 'deadline', color: '#ec4899' },      // Pink - has a deadline

  // =========================================================================
  // WORK & PRODUCTIVITY (Teal/Cyan spectrum)
  // =========================================================================
  // These tags relate to work and professional contexts

  { name: 'meeting', color: '#14b8a6' },       // Teal - meeting notes/prep
  { name: 'follow-up', color: '#06b6d4' },     // Cyan - needs follow-up
  { name: 'client', color: '#0891b2' },        // Dark cyan - client-related
  { name: 'project', color: '#0d9488' },       // Teal - project-related
  { name: 'email', color: '#2dd4bf' },         // Light teal - email-related

  // =========================================================================
  // CONTENT & IDEAS (Green spectrum)
  // =========================================================================
  // These tags help categorize content types

  { name: 'idea', color: '#84cc16' },          // Lime - new ideas
  { name: 'research', color: '#22c55e' },      // Green - research material
  { name: 'reference', color: '#10b981' },     // Emerald - reference info
  { name: 'draft', color: '#34d399' },         // Light emerald - work in progress
  { name: 'template', color: '#4ade80' },      // Light green - reusable templates

  // =========================================================================
  // PERSONAL & GOALS (Purple/Pink spectrum)
  // =========================================================================
  // These tags relate to personal growth and goals

  { name: 'goal', color: '#d946ef' },          // Fuchsia - goals and objectives
  { name: 'reminder', color: '#c026d3' },      // Magenta - things to remember
  { name: 'habit', color: '#a21caf' },         // Dark magenta - habit tracking
  { name: 'learning', color: '#9333ea' },      // Purple - learning materials
  { name: 'personal', color: '#7c3aed' },      // Violet - personal items

  // =========================================================================
  // ORGANIZATION (Gray/Neutral spectrum)
  // =========================================================================
  // These tags help with general organization

  { name: 'archive', color: '#6b7280' },       // Gray - archived items
  { name: 'later', color: '#9ca3af' },         // Light gray - do later
  { name: 'maybe', color: '#a3a3a3' },         // Neutral - might do
  { name: 'waiting', color: '#78716c' },       // Warm gray - waiting on something
  { name: 'delegated', color: '#71717a' },     // Cool gray - delegated to others
];

// =============================================================================
// ENSURE TAGS MIDDLEWARE
// =============================================================================

/**
 * ensureTags(req, res, next)
 * --------------------------
 * Middleware that ensures the user has at least the default tags.
 *
 * @param {Request} req - Express request object (must have req.user)
 * @param {Response} res - Express response object
 * @param {Function} next - Express next function
 *
 * PREREQUISITES:
 * - Must run AFTER requireAuth middleware (needs req.user)
 *
 * BEHAVIOR:
 * - If user has no tags → create all defaults
 * - If user has any tags → do nothing
 * - On error → log and continue (don't block the request)
 *
 * EXAMPLE USAGE:
 * router.get('/tags', requireAuth, ensureTags, getTags);
 */
export async function ensureTags(req, res, next) {
  try {
    // Skip if no user (shouldn't happen if used after requireAuth)
    if (!req.user) {
      return next();
    }

    // Check if user has ANY tags
    const count = await Tag.countDocuments({ userId: req.user._id });

    // Only create defaults if user has ZERO tags
    if (count === 0) {
      // Create default tags for this user
      const tags = DEFAULT_TAGS.map(tag => ({
        userId: req.user._id,
        name: tag.name.toLowerCase(),  // Ensure lowercase for consistency
        color: tag.color,
        usageCount: 0,                 // No uses yet
        isActive: true,                // Tag is active
        lastUsed: new Date()           // Initialize to now
      }));

      // Insert all tags at once (more efficient than individual saves)
      await Tag.insertMany(tags);

      // Optional: Log for debugging
      // console.log(`Created ${tags.length} default tags for user ${req.user._id}`);
    }

    // Continue to the next middleware/route
    next();
  } catch (error) {
    // Log the error for debugging
    console.error('Error ensuring tags:', error);

    // DON'T block the request if this fails
    // The user can still use the app, just without defaults
    next();
  }
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export the middleware.
 *
 * USAGE:
 * import ensureTags from './middleware/ensureTags.js';
 *
 * // Apply to routes that need tags
 * router.get('/notes', requireAuth, ensureTags, getNotes);
 *
 * // Or apply globally
 * router.use(requireAuth, ensureTags);
 */
export default ensureTags;
