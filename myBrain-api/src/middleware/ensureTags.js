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
 * ensureTags(req, res, next) - Create Default Tags for New Users
 * ===============================================================
 * This middleware automatically creates a default set of tags (labels) for
 * new users the first time they access the app. Tags help users organize,
 * filter, and prioritize their content.
 *
 * WHAT ARE TAGS?
 * --------------
 * Tags are flexible labels that users attach to items (notes, tasks, events)
 * to organize and filter them. Unlike life areas (categories), tags are
 * free-form and can be applied to any item.
 *
 * TAGS vs LIFE AREAS:
 * - Life areas: Fixed categories (Work, Health, Finance)
 * - Tags: Flexible labels (#urgent, #meeting, #idea)
 *
 * EXAMPLES OF TAGS:
 * - #urgent: Needs immediate attention
 * - #meeting: Meeting notes/preparation
 * - #idea: Creative ideas to explore
 * - #follow-up: Requires follow-up action
 * - #goal: Goals and objectives
 * - #done: Completed items
 *
 * DEFAULT TAGS PROVIDED:
 * ----------------------
 * We provide 26 default tags organized by purpose:
 * 1. PRIORITY & STATUS (Red/Orange): urgent, important, blocked, in-progress, review, done
 * 2. TIME-RELATED (Blue): today, this-week, someday, recurring, deadline
 * 3. WORK & PRODUCTIVITY (Teal): meeting, follow-up, client, project, email
 * 4. CONTENT & IDEAS (Green): idea, research, reference, draft, template
 * 5. PERSONAL & GOALS (Purple): goal, reminder, habit, learning, personal
 * 6. ORGANIZATION (Gray): archive, later, maybe, waiting, delegated
 *
 * Each tag has:
 * - name: Tag label (#urgent, #meeting)
 * - color: For visual identification in UI
 * - usageCount: Tracks how many items use this tag
 * - isActive: Whether tag is currently usable
 * - lastUsed: When tag was last applied
 *
 * WHY PROVIDE DEFAULTS?
 * --------------------
 * 1. BETTER ONBOARDING
 *    - Users don't start with blank list
 *    - Shows what tags are possible
 *    - Reduces decision paralysis
 *
 * 2. GUIDANCE
 *    - Teaches tagging best practices
 *    - Covers common use cases
 *    - Color-coded by purpose
 *
 * 3. CONSISTENCY
 *    - All users have same starting tags
 *    - Easier to understand others' items
 *    - Common vocabulary
 *
 * MIDDLEWARE BEHAVIOR:
 * -------------------
 * - If user has NO tags → Create all 26 defaults
 * - If user has ANY tags → Do nothing (respect their tags)
 * - If creation fails → Log error but continue (user still works)
 *
 * @param {Request} req - Express request object
 *   - MUST have req.user (set by requireAuth middleware)
 *   - req.user._id: The user's ID for tagging
 *
 * @param {Response} res - Express response object
 *
 * @param {Function} next - Express next function
 *   - Always called (never blocks request)
 *
 * PREREQUISITE:
 * - Must run AFTER requireAuth middleware
 * - req.user must be set
 *
 * ERROR HANDLING:
 * - Database errors are caught and logged
 * - Request continues anyway
 * - Better to work without defaults than crash
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Apply to routes that use tags
 * router.get('/notes',
 *   requireAuth,         // User logged in
 *   ensureTags,          // User gets default tags
 *   getNotes             // Route handler
 * );
 *
 * // Or apply globally
 * app.use(requireAuth);
 * app.use(ensureTags);   // All logged-in users get defaults
 * ```
 *
 * TAG LIFECYCLE:
 * - NEW USERS: Get 26 default tags
 * - CUSTOM USERS: User creates their own tags (don't recreate defaults)
 * - USAGE TRACKING: usageCount increments when tag is applied
 * - ARCHIVAL: Tags can be marked inactive if no longer needed
 */
export async function ensureTags(req, res, next) {
  try {
    // =========================================================================
    // CHECK: IS USER AUTHENTICATED?
    // =========================================================================
    // This middleware requires req.user from requireAuth
    // Skip if somehow called without authentication

    if (!req.user) {
      return next();  // Skip middleware
    }

    // =========================================================================
    // CHECK: DOES USER HAVE ANY TAGS?
    // =========================================================================
    // Count how many tags this user has
    // countDocuments is efficient - returns just a count

    const count = await Tag.countDocuments({ userId: req.user._id });

    // =========================================================================
    // CREATE DEFAULTS ONLY IF USER HAS ZERO TAGS
    // =========================================================================
    // New users (count === 0) get defaults
    // Users with any tags keep what they have (respect user choices)

    if (count === 0) {
      // =========================================================================
      // PREPARE DEFAULT TAGS
      // =========================================================================
      // Transform DEFAULT_TAGS configuration into database documents
      // Each document gets:
      // - All properties from config (name, color, etc.)
      // - userId: Links tag to this user
      // - usageCount: Starts at 0
      // - isActive: Starts as true
      // - lastUsed: Initialize to current time

      const tags = DEFAULT_TAGS.map(tag => ({
        userId: req.user._id,           // This tag belongs to this user
        name: tag.name.toLowerCase(),   // Normalize to lowercase (#urgent not #Urgent)
        color: tag.color,               // Hex color for UI display
        usageCount: 0,                  // No uses yet (incremented when applied)
        isActive: true,                 // Tag is usable
        lastUsed: new Date()            // Initialize to now
      }));

      // =========================================================================
      // INSERT ALL TAGS AT ONCE
      // =========================================================================
      // Use insertMany for efficiency and atomicity
      // Either all tags are created or none (no partial success)

      await Tag.insertMany(tags);

      // Optional: Uncomment for debugging
      // console.log(`Created ${tags.length} default tags for user ${req.user._id}`);
    }

    // =========================================================================
    // CONTINUE TO NEXT MIDDLEWARE/ROUTE
    // =========================================================================
    // Always continue (never block)
    // Whether defaults were created or not

    next();

  } catch (error) {
    // =========================================================================
    // ERROR HANDLING
    // =========================================================================
    // If anything fails:
    // 1. Log it (for monitoring)
    // 2. Continue anyway (prevent app breakage)
    //
    // User can still use app without default tags
    // Worse to block than to gracefully degrade

    console.error('Error ensuring tags:', error);

    // Continue without defaults
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
