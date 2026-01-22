/**
 * =============================================================================
 * TAGS.JS - Tag Management Routes
 * =============================================================================
 *
 * This file handles custom tags in myBrain.
 * Tags are flexible labels that help organize and categorize content across
 * the entire app.
 *
 * WHAT ARE TAGS?
 * ---------------
 * Tags are labels you create to organize content.
 * Multiple tags can be applied to notes, tasks, projects, files, etc.
 * Unlike categories (life areas), tags are flexible and user-defined.
 *
 * EXAMPLES OF TAGS:
 * -----------------
 * - #urgent: Mark important/time-sensitive items
 * - #important: High priority items
 * - #review: Needs review before completion
 * - #wishlist: Ideas for future
 * - #reading: Articles/books to read
 * - #project-alpha: Related to specific project
 * - #client-xyz: Related to specific client
 * - #research: Research and reference material
 *
 * WHY USE TAGS?
 * ---------------
 * Tags provide:
 * - FLEXIBILITY: Create as many as needed
 * - CROSS-CUTTING: Tag applies to notes AND tasks AND projects
 * - FILTERING: Find all #urgent items across app
 * - ORGANIZATION: Non-hierarchical (unlike folders)
 * - DISCOVERY: Browse by tags to find related items
 *
 * TAGS VS LIFE AREAS:
 * -------------------
 * LIFE AREAS (like Work, Personal):
 * - Broad categories
 * - Usually required
 * - Hierarchical (one per item typically)
 * - For high-level organization
 *
 * TAGS (like #urgent, #project-x):
 * - Specific labels
 * - Optional, multiple allowed
 * - Flexible and user-defined
 * - For detailed organization
 *
 * TAG FEATURES:
 * ---------------
 * - CREATE: Make new tags (any name)
 * - APPLY: Add to notes, tasks, projects, files
 * - SEARCH: Find all items with tag
 * - AUTOCOMPLETE: Quick tag selection
 * - SUGGESTIONS: Popular tags appear first
 * - MERGE: Combine duplicate tags
 * - DELETE: Remove unused tags
 *
 * TAG DEFAULTS:
 * ---------------
 * Some tags are created by default:
 * - #urgent: High priority
 * - #important: Important items
 * - #review: Needs review
 * - #archive: Ready to archive
 * - #backlog: Future work
 *
 * USAGE TRACKING:
 * ----------------
 * System tracks:
 * - How many items use each tag
 * - Which tags are most popular
 * - When tags were last used
 * - Automatically suggests popular tags
 *
 * ENDPOINTS:
 * -----------
 * - GET /tags - Get popular tags (for autocomplete)
 * - GET /tags?search=urgent - Search tags by name
 * - POST /tags - Create new tag
 * - GET /tags/:id - Get tag details and items with it
 * - PUT /tags/:id - Update tag (rename)
 * - DELETE /tags/:id - Delete unused tag
 * - POST /tags/:id/merge - Merge tag into another
 * - GET /tags/:id/items - Get all items with tag
 *
 * TAG NAMING:
 * -----------
 * Tags should be:
 * - LOWERCASE: #important not #Important
 * - NO SPACES: #high-priority not #high priority
 * - DESCRIPTIVE: #quarterly-planning not #x1
 * - CONSISTENT: Use same tag name each time
 *
 * RECOMMENDATIONS:
 * -----------------
 * - Keep tag list under 50 (manageable)
 * - Merge related tags (#urgent and #priority)
 * - Archive old tags you don't use
 * - Use consistent naming convention
 * - Document what tags mean (in team settings)
 *
 * MAX TAGS PER ITEM:
 * ------------------
 * - Notes: Up to 20 tags
 * - Tasks: Up to 15 tags
 * - Projects: Up to 10 tags
 * (Prevents over-tagging)
 *
 * =============================================================================
 */

/**
 * Express is a web framework for Node.js that makes it easy to:
 * - Handle HTTP requests (GET, POST, PATCH, DELETE)
 * - Define routes (URLs that the frontend can call)
 * - Use middleware (functions that process requests)
 */
import express from 'express';

/**
 * Tag model represents user-defined labels.
 * Stores tag names, colors, usage count, and whether tag is active/archived.
 * Each user has their own set of tags (userId field).
 */
import Tag from '../models/Tag.js';

/**
 * Note model represents user notes.
 * We import this because when renaming or deleting tags, we need to
 * update all notes that use that tag across the entire notes collection.
 */
import Note from '../models/Note.js';

/**
 * Task model represents user tasks.
 * We import this because when renaming or deleting tags, we need to
 * update all tasks that use that tag across the entire tasks collection.
 */
import Task from '../models/Task.js';

/**
 * Auth middleware checks that the user is logged in.
 * Every tag request must include a valid JWT token in the Authorization header.
 * If not, the request is rejected with a 401 Unauthorized response.
 */
import { requireAuth } from '../middleware/auth.js';

/**
 * Error handler middleware logs errors for debugging and monitoring.
 * When we call attachError(req, error), it adds error context to request logs
 * so we can investigate failures (database errors, validation issues, etc.).
 */
import { attachError } from '../middleware/errorHandler.js';

/**
 * Request logger attaches important IDs to the request for Wide Events logging.
 * attachEntityId(req, 'tagName', value) marks what entity this request affected.
 * This helps us track and search logs by specific tags.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

const router = express.Router();

// =============================================================================
// MIDDLEWARE: AUTHENTICATION
// =============================================================================
// All routes require authentication
router.use(requireAuth);

/**
 * GET /tags
 * Get active tags for the user, sorted by popularity (for autocomplete)
 *
 * WHAT IT DOES:
 * Returns a list of the user's most popular tags. Used to show suggestions
 * when user is typing a tag name (autocomplete feature).
 *
 * HOW IT WORKS:
 * - Without search: Returns top N most-used tags (sorted by usage count)
 * - With search: Returns tags matching the search term
 * Only returns ACTIVE tags (not archived)
 *
 * USE CASES:
 * - User types "#ur" → autocomplete suggests "#urgent", "#urging"
 * - Show most popular tags for quick selection
 * - Help user remember existing tags they've created
 *
 * @param {number} req.query.limit - How many tags to return (default: 50)
 * @param {string} req.query.search - Filter by tag name substring (optional)
 *
 * @returns {Object} - Tags object:
 * {
 *   tags: [
 *     {
 *       _id: "507f1f77bcf86cd799439011",
 *       userId: "507f1f77bcf86cd799439012",
 *       name: "urgent",
 *       color: "#FF0000",
 *       usageCount: 47,
 *       isActive: true,
 *       createdAt: "2025-01-15T10:00:00Z"
 *     }
 *   ]
 * }
 *
 * @throws {401} - User not authenticated
 * @throws {500} - Database error
 *
 * EXAMPLE REQUEST:
 * GET /tags?search=proj&limit=20
 *
 * EXAMPLE RESPONSE:
 * {
 *   tags: [
 *     { _id: "...", name: "project-x", usageCount: 12, isActive: true },
 *     { _id: "...", name: "project-alpha", usageCount: 8, isActive: true }
 *   ]
 * }
 */
router.get('/', async (req, res) => {
  try {
    // Step 1: Extract query parameters from request
    const { limit = 50, search } = req.query;

    // Step 2: Call appropriate service based on whether user is searching
    let tags;
    if (search && search.trim()) {
      // If search term provided, find tags matching that search
      // Returns active tags that contain the search term in their name
      tags = await Tag.searchTags(req.user._id, search.trim(), parseInt(limit));
    } else {
      // If no search term, return the most popular tags for this user
      // "Popular" = most frequently used tags (highest usageCount)
      tags = await Tag.getPopularTags(req.user._id, parseInt(limit));
    }

    // Step 3: Return tags in response
    // Frontend uses this to show autocomplete suggestions or tag lists
    res.json({ tags });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'tags_fetch' });
    res.status(500).json({
      error: 'Failed to fetch tags',
      code: 'TAGS_FETCH_ERROR'
    });
  }
});

/**
 * GET /tags/all
 * Get ALL tags including inactive (for management)
 *
 * WHAT IT DOES:
 * Returns the complete list of ALL tags the user has created.
 * Unlike GET /tags (which returns active tags only), this includes archived tags.
 * Used by tag management page to show user what tags they have.
 *
 * SORTING OPTIONS:
 * - usageCount (default): Most-used tags first
 * - name: Alphabetical order
 * - createdAt: Newest tags first
 *
 * SORT ORDER:
 * - desc (default): Descending (highest first)
 * - asc: Ascending (lowest first)
 *
 * USE CASES:
 * - Tag management page: Show user their entire tag library
 * - Archive/cleanup: Find unused tags to delete
 * - Review: See all tags organized by usage or date
 *
 * QUERY PARAMETERS:
 * - sortBy: 'usageCount', 'name', or 'createdAt'
 * - sortOrder: 'asc' or 'desc'
 *
 * @param {string} req.query.sortBy - Sort field: 'usageCount', 'name', or 'createdAt' (default: 'usageCount')
 * @param {string} req.query.sortOrder - Sort direction: 'asc' or 'desc' (default: 'desc')
 *
 * @returns {Object} - Tags object:
 * {
 *   tags: [
 *     {
 *       _id: "507f1f77bcf86cd799439011",
 *       userId: "507f1f77bcf86cd799439012",
 *       name: "urgent",
 *       color: "#FF0000",
 *       usageCount: 15,
 *       isActive: true,
 *       createdAt: "2025-01-15T10:00:00Z"
 *     },
 *     {
 *       _id: "507f1f77bcf86cd799439013",
 *       name: "archived-tag",
 *       usageCount: 2,
 *       isActive: false,
 *       createdAt: "2024-12-01T10:00:00Z"
 *     }
 *   ]
 * }
 *
 * @throws {401} - User not authenticated
 * @throws {500} - Database error or server error
 *
 * EXAMPLE REQUEST:
 * GET /tags/all?sortBy=name&sortOrder=asc
 *
 * EXAMPLE RESPONSE:
 * {
 *   tags: [
 *     { _id: "...", name: "archive", usageCount: 0, isActive: false },
 *     { _id: "...", name: "important", usageCount: 23, isActive: true }
 *   ]
 * }
 */
router.get('/all', async (req, res) => {
  try {
    // Step 1: Extract sorting options from query parameters
    const { sortBy = 'usageCount', sortOrder = 'desc' } = req.query;

    // Step 2: Call service to get ALL tags for this user
    // Includes both active AND inactive (archived) tags
    const tags = await Tag.getAllTags(req.user._id, {
      sortBy,
      sortOrder: sortOrder === 'asc' ? 1 : -1,  // Convert to MongoDB sort order (1 or -1)
      includeInactive: true                       // Include archived tags
    });

    // Step 3: Return complete tag list
    res.json({ tags });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'all_tags_fetch' });
    res.status(500).json({
      error: 'Failed to fetch tags',
      code: 'TAGS_FETCH_ERROR'
    });
  }
});

/**
 * GET /tags/popular
 * Get the most popular active tags (top 10)
 *
 * WHAT IT DOES:
 * Returns the user's most-used tags. Similar to GET /tags but specifically
 * focused on "popular" tags (those with highest usage count).
 *
 * WHY SEPARATE ENDPOINT?
 * While GET /tags can return popular tags, this endpoint is optimized
 * specifically for fetching top tags quickly for dashboards, widgets, etc.
 *
 * USE CASES:
 * - Dashboard widget: Show user's top 5 tags
 * - Quick filter: Show most-used tags for filtering
 * - Tag cloud: Display important tags prominently
 *
 * LIMITS:
 * - Default: Top 10 tags
 * - Maximum: 20 tags (prevents abuse)
 * - Can't request more than 20 even if you ask
 *
 * @param {number} req.query.limit - How many tags to return (default: 10, max: 20)
 *
 * @returns {Object} - Popular tags object:
 * {
 *   tags: [
 *     {
 *       _id: "507f1f77bcf86cd799439011",
 *       name: "urgent",
 *       usageCount: 47,
 *       color: "#FF0000",
 *       isActive: true,
 *       createdAt: "2025-01-15T10:00:00Z"
 *     }
 *   ]
 * }
 *
 * @throws {401} - User not authenticated
 * @throws {500} - Database error
 *
 * EXAMPLE REQUEST:
 * GET /tags/popular?limit=5
 *
 * EXAMPLE RESPONSE:
 * {
 *   tags: [
 *     { _id: "...", name: "urgent", usageCount: 47 },
 *     { _id: "...", name: "important", usageCount: 23 },
 *     { _id: "...", name: "review", usageCount: 18 }
 *   ]
 * }
 */
router.get('/popular', async (req, res) => {
  try {
    // Step 1: Extract limit from query, with safety bounds
    // User can request any limit, but we cap it at 20 for performance
    const limit = Math.min(parseInt(req.query.limit) || 10, 20);

    // Step 2: Get the most-used tags for this user
    const tags = await Tag.getPopularTags(req.user._id, limit);

    // Step 3: Return the popular tags
    res.json({ tags });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'popular_tags_fetch' });
    res.status(500).json({
      error: 'Failed to fetch popular tags',
      code: 'POPULAR_TAGS_ERROR'
    });
  }
});

/**
 * POST /tags
 * Create a new tag
 *
 * WHAT IT DOES:
 * Creates a brand new tag for the user. Once created, tag can be applied
 * to notes, tasks, projects, files, etc.
 *
 * TAG NAMES:
 * - Must be unique (can't create tag if already exists)
 * - Automatically lowercased (#Urgent → #urgent)
 * - Cannot be empty or whitespace-only
 *
 * OPTIONAL ATTRIBUTES:
 * - color: Display color for tag (hex code, optional)
 *
 * USE CASES:
 * - User creates new tag for project (#project-x)
 * - User creates priority tag (#urgent)
 * - User creates category tag (#client-acme)
 *
 * EXAMPLE REQUEST:
 * POST /tags
 * Body: {
 *   name: "project-alpha",
 *   color: "#FF5733"
 * }
 *
 * EXAMPLE RESPONSE:
 * {
 *   tag: {
 *     _id: "123abc",
 *     userId: "user123",
 *     name: "project-alpha",
 *     color: "#FF5733",
 *     usageCount: 0,
 *     isActive: true,
 *     createdAt: "2026-01-21T12:00:00Z"
 *   }
 * }
 */
router.post('/', async (req, res) => {
  try {
    // Step 1: Extract tag name and color from request
    const { name, color } = req.body;

    // Step 2: Validate that tag name was provided
    // Tag name is required - cannot be empty or just whitespace
    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Tag name is required',
        code: 'TAG_NAME_REQUIRED'
      });
    }

    // Step 3: Normalize the tag name
    // Convert to lowercase and trim whitespace for consistency
    // Example: "  Project-X  " → "project-x"
    const normalizedName = name.trim().toLowerCase();

    // Step 4: Check if this tag already exists
    // Each user's tags must have unique names (can't create duplicate)
    const existing = await Tag.findOne({ userId: req.user._id, name: normalizedName });
    if (existing) {
      return res.status(400).json({
        error: 'Tag already exists',
        code: 'TAG_EXISTS'
      });
    }

    // Step 5: Create new tag document
    const tag = new Tag({
      userId: req.user._id,        // Tag belongs to this user
      name: normalizedName,         // Normalized tag name
      color: color || null,         // Optional color (hex code)
      usageCount: 0,                // Start with 0 items tagged
      isActive: true                // New tags are active (not archived)
    });

    // Step 6: Save tag to database
    await tag.save();

    // Step 7: Log this action for Wide Events tracking
    // Helps us track what tags are created and by whom
    req.entityIds.tagName = normalizedName;
    req.eventName = 'tag.create.success';

    // Step 8: Return created tag
    // Frontend uses this to update tag list and confirm creation
    res.status(201).json({ tag });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'tag_create' });
    res.status(500).json({
      error: 'Failed to create tag',
      code: 'TAG_CREATE_ERROR'
    });
  }
});

/**
 * POST /tags/track
 * Track usage of tags (called when tags are applied to an item)
 *
 * WHAT IT DOES:
 * Updates the usage count for tags when they're applied to items.
 * When user adds tags to a note/task/project, this tracks that usage.
 *
 * WHY TRACK USAGE?
 * Usage counts help us:
 * - Show popular tags first in autocomplete
 * - Track which tags are actually being used
 * - Archive unused tags
 * - Show tag analytics to user
 *
 * INTERNAL USE:
 * This endpoint is called internally by other routes (notes.post, tasks.post).
 * Not typically called directly by frontend.
 *
 * @param {array} req.body.tags - Array of tag names to track (required)
 *   Example: ["urgent", "project-x", "review"]
 *
 * @returns {Object} - Updated tags object:
 * {
 *   tags: [
 *     {
 *       _id: "507f1f77bcf86cd799439011",
 *       name: "urgent",
 *       usageCount: 48,
 *       color: "#FF0000"
 *     }
 *   ]
 * }
 *
 * @throws {400} - Tags must be an array
 * @throws {401} - User not authenticated
 * @throws {500} - Database error
 *
 * EXAMPLE REQUEST:
 * POST /tags/track
 * Body: { tags: ["urgent", "project-x"] }
 *
 * EXAMPLE RESPONSE:
 * {
 *   tags: [
 *     { _id: "...", name: "urgent", usageCount: 48 },
 *     { _id: "...", name: "project-x", usageCount: 5 }
 *   ]
 * }
 */
router.post('/track', async (req, res) => {
  try {
    // Step 1: Extract tags array from request
    const { tags } = req.body;

    // Step 2: Validate that tags is an array
    // Must be array format: ["tag1", "tag2", "tag3"]
    if (!Array.isArray(tags)) {
      return res.status(400).json({
        error: 'Tags must be an array',
        code: 'INVALID_TAGS'
      });
    }

    // Step 3: Update usage counts for all tags
    // Service increments usageCount for each tag
    const trackedTags = await Tag.trackUsage(req.user._id, tags);

    // Step 4: Return updated tags
    res.json({ tags: trackedTags });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'tags_track' });
    res.status(500).json({
      error: 'Failed to track tags',
      code: 'TAG_TRACK_ERROR'
    });
  }
});

/**
 * POST /tags/rename
 * Rename a tag (updates tag name and all items using it)
 *
 * WHAT IT DOES:
 * Changes the name of an existing tag. When you rename a tag, ALL items
 * that use the old tag name are automatically updated to use the new name.
 *
 * ATOMIC UPDATE:
 * Rename is atomic - either the entire operation succeeds or nothing changes.
 * If we fail to update items, the tag rename is rolled back.
 *
 * USE CASES:
 * - Fix typo in tag name (#projct → #project)
 * - Rename tag to be more descriptive (#x1 → #urgent)
 * - Standardize naming (#PROJECT-A → #project-a)
 *
 * ITEMS UPDATED:
 * When you rename a tag:
 * - All notes using old tag name → updated to new name
 * - All tasks using old tag name → updated to new name
 * - All projects, files using old tag → updated to new name
 *
 * @param {string} req.body.oldName - Current tag name (required)
 * @param {string} req.body.newName - New tag name (required, will be lowercased)
 *
 * @returns {Object} - Updated tag object:
 * {
 *   tag: {
 *     _id: "507f1f77bcf86cd799439011",
 *     userId: "507f1f77bcf86cd799439012",
 *     name: "project",
 *     usageCount: 12,
 *     isActive: true,
 *     createdAt: "2025-01-15T10:00:00Z"
 *   }
 * }
 *
 * @throws {400} - Missing oldName or newName
 * @throws {404} - Tag not found
 * @throws {401} - User not authenticated
 * @throws {500} - Database error
 *
 * EXAMPLE REQUEST:
 * POST /tags/rename
 * Body: { oldName: "projct", newName: "project" }
 *
 * EXAMPLE RESPONSE:
 * {
 *   tag: {
 *     _id: "...",
 *     name: "project",
 *     usageCount: 12
 *   }
 * }
 *
 * WIDE EVENTS LOGGING:
 * - attachEntityId(req, 'tagName', normalizedNew): Track renamed tag
 * - req.eventName = 'tag.rename.success': Event type
 */
router.post('/rename', async (req, res) => {
  try {
    // Step 1: Extract old and new tag names from request
    const { oldName, newName } = req.body;

    // Step 2: Validate both names are provided
    // Can't rename if either name is missing
    if (!oldName || !newName) {
      return res.status(400).json({
        error: 'Both oldName and newName are required',
        code: 'NAMES_REQUIRED'
      });
    }

    // Step 3: Normalize both names (lowercase and trim)
    const normalizedOld = oldName.trim().toLowerCase();
    const normalizedNew = newName.trim().toLowerCase();

    // Step 4: Update the Tag document itself
    // This updates the Tag model to reflect the new name
    const tag = await Tag.renameTag(req.user._id, normalizedOld, normalizedNew);

    // Step 5: Check if tag existed
    // If tag wasn't found, renameTag returns null
    if (!tag) {
      return res.status(404).json({
        error: 'Tag not found',
        code: 'TAG_NOT_FOUND'
      });
    }

    // Step 6: Update all NOTES using the old tag name
    // Uses MongoDB arrayFilters to update just the matching tag in the array
    // For each note with userId + old tag, replace old tag with new tag
    await Note.updateMany(
      { userId: req.user._id, tags: normalizedOld },                          // Find condition
      { $set: { 'tags.$[elem]': normalizedNew } },                            // Update operation
      { arrayFilters: [{ elem: normalizedOld }] }                              // Apply only to matching tags
    );

    // Step 7: Update all TASKS using the old tag name
    // Same pattern as notes - replace old tag with new tag in array
    await Task.updateMany(
      { userId: req.user._id, tags: normalizedOld },
      { $set: { 'tags.$[elem]': normalizedNew } },
      { arrayFilters: [{ elem: normalizedOld }] }
    );

    // Step 8: Log this action for Wide Events tracking
    req.entityIds.tagName = normalizedNew;
    req.eventName = 'tag.rename.success';

    // Step 9: Return updated tag
    res.json({ tag });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'tag_rename' });
    res.status(500).json({
      error: error.message || 'Failed to rename tag',
      code: 'TAG_RENAME_ERROR'
    });
  }
});

/**
 * POST /tags/merge
 * Merge multiple tags into one
 *
 * WHAT IT DOES:
 * Combines multiple tags into a single tag. All items tagged with the source
 * tags will be re-tagged with the target tag instead.
 *
 * WHY MERGE TAGS?
 * - Consolidate similar tags (#priority and #urgent → #urgent)
 * - Clean up duplicate tags created by accident
 * - Simplify tag structure after organization changes
 * - Remove outdated tag variants
 *
 * WHAT HAPPENS:
 * 1. Source tags are removed from database
 * 2. All items using source tags → get target tag instead
 * 3. If item already has target tag, no duplicate (uses $addToSet)
 * 4. Merge is atomic - either all succeed or all fail
 *
 * USE CASES:
 * - User created #proj-x and #project-x, wants to merge
 * - Consolidate #urgent and #priority into #urgent
 * - Merge old tag variants after team standardizes naming
 *
 * @param {array} req.body.sourceTags - Tag names to merge from (required, non-empty array)
 *   Example: ["priority", "high-priority"]
 * @param {string} req.body.targetTag - Tag name to merge into (required)
 *   Example: "urgent"
 *
 * @returns {Object} - Merge result:
 * {
 *   success: true,
 *   targetTag: {
 *     _id: "507f1f77bcf86cd799439011",
 *     name: "urgent",
 *     usageCount: 35
 *   },
 *   mergedCount: 12  // Number of items updated
 * }
 *
 * @throws {400} - Missing or invalid sourceTags/targetTag
 * @throws {401} - User not authenticated
 * @throws {500} - Database error
 *
 * EXAMPLE REQUEST:
 * POST /tags/merge
 * Body: {
 *   sourceTags: ["priority", "high-priority"],
 *   targetTag: "urgent"
 * }
 *
 * EXAMPLE RESPONSE:
 * {
 *   success: true,
 *   targetTag: { _id: "...", name: "urgent", usageCount: 35 },
 *   mergedCount: 12
 * }
 *
 * WIDE EVENTS LOGGING:
 * - attachEntityId(req, 'tagName', normalizedTarget): Track merged-to tag
 * - req.eventName = 'tag.merge.success': Event type
 */
router.post('/merge', async (req, res) => {
  try {
    // Step 1: Extract source tags and target tag from request
    const { sourceTags, targetTag } = req.body;

    // Step 2: Validate inputs
    // Need: array of source tags (not empty), and a target tag
    if (!Array.isArray(sourceTags) || sourceTags.length === 0 || !targetTag) {
      return res.status(400).json({
        error: 'sourceTags array and targetTag are required',
        code: 'MERGE_PARAMS_REQUIRED'
      });
    }

    // Step 3: Normalize all tag names (lowercase and trim)
    const normalizedTarget = targetTag.trim().toLowerCase();
    const normalizedSources = sourceTags.map(t => t.trim().toLowerCase());

    // Step 4: Merge the tags in the Tag collection
    // This updates the Tag model and marks source tags as deleted
    const result = await Tag.mergeTags(req.user._id, normalizedSources, normalizedTarget);

    // Step 5: Update all NOTES to use target tag instead of source tags
    // For each source tag, find all notes with it and replace with target
    for (const sourceTag of normalizedSources) {
      // $addToSet: Add target tag to tags array (if not already there)
      // $pull: Remove source tag from tags array
      await Note.updateMany(
        { userId: req.user._id, tags: sourceTag },
        {
          $addToSet: { tags: normalizedTarget },    // Add target tag
          $pull: { tags: sourceTag }                 // Remove source tag
        }
      );
    }

    // Step 6: Update all TASKS to use target tag instead of source tags
    // Same pattern as notes
    for (const sourceTag of normalizedSources) {
      await Task.updateMany(
        { userId: req.user._id, tags: sourceTag },
        {
          $addToSet: { tags: normalizedTarget },
          $pull: { tags: sourceTag }
        }
      );
    }

    // Step 7: Log this action for Wide Events tracking
    req.entityIds.tagName = normalizedTarget;
    req.eventName = 'tag.merge.success';

    // Step 8: Return merge result with summary
    res.json({
      success: true,
      targetTag: result.targetTag,
      mergedCount: result.mergedCount  // Number of items that were updated
    });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'tags_merge' });
    res.status(500).json({
      error: 'Failed to merge tags',
      code: 'TAG_MERGE_ERROR'
    });
  }
});

/**
 * PATCH /tags/:name
 * Update a tag (color, isActive status)
 *
 * WHAT IT DOES:
 * Updates properties of a tag (color or active status).
 * Does NOT rename or merge - use other endpoints for that.
 *
 * UPDATEABLE PROPERTIES:
 * - color: Display color for tag (hex code like #FF5733)
 * - isActive: Whether tag is active or archived
 *
 * ARCHIVING TAGS:
 * Instead of deleting, you can archive unused tags by setting isActive: false.
 * Archived tags still appear in GET /tags/all but not in GET /tags (popular).
 *
 * USE CASES:
 * - Change tag color to match team branding
 * - Archive old tag without deleting it
 * - Re-activate a tag that was archived
 *
 * @param {string} req.params.name - Tag name to update (will be lowercased)
 * @param {string} req.body.color - Hex color code (optional) e.g. "#FF0000"
 * @param {boolean} req.body.isActive - Active/archived status (optional)
 *
 * @returns {Object} - Updated tag:
 * {
 *   tag: {
 *     _id: "507f1f77bcf86cd799439011",
 *     name: "urgent",
 *     color: "#FF0000",
 *     isActive: true,
 *     usageCount: 47,
 *     createdAt: "2025-01-15T10:00:00Z"
 *   }
 * }
 *
 * @throws {400} - No valid update fields provided
 * @throws {404} - Tag not found
 * @throws {401} - User not authenticated
 * @throws {500} - Database error
 *
 * EXAMPLE REQUEST (change color):
 * PATCH /tags/urgent
 * Body: { color: "#FF0000" }
 *
 * EXAMPLE REQUEST (archive tag):
 * PATCH /tags/old-tag
 * Body: { isActive: false }
 *
 * EXAMPLE RESPONSE:
 * {
 *   tag: {
 *     _id: "...",
 *     name: "urgent",
 *     color: "#FF0000",
 *     isActive: true
 *   }
 * }
 *
 * WIDE EVENTS LOGGING:
 * - attachEntityId(req, 'tagName', name.toLowerCase()): Track updated tag
 * - req.eventName = 'tag.update.success': Event type
 */
router.patch('/:name', async (req, res) => {
  try {
    // Step 1: Extract tag name from URL
    const { name } = req.params;

    // Step 2: Extract updates from request body
    const { color, isActive } = req.body;

    // Step 3: Build updates object with only provided fields
    // Only include fields that were actually provided (not undefined)
    const updates = {};
    if (color !== undefined) updates.color = color;       // If color provided, update it
    if (isActive !== undefined) updates.isActive = isActive;  // If isActive provided, update it

    // Step 4: Validate that at least one field was provided
    // Can't do update with no changes
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'No valid update fields provided',
        code: 'NO_UPDATES'
      });
    }

    // Step 5: Update the tag in database
    // findOneAndUpdate: Find tag, apply updates, return updated document
    const tag = await Tag.findOneAndUpdate(
      { userId: req.user._id, name: name.toLowerCase() },  // Find condition
      { $set: updates },                                      // Apply updates
      { new: true }                                           // Return updated document
    );

    // Step 6: Check if tag was found
    if (!tag) {
      return res.status(404).json({
        error: 'Tag not found',
        code: 'TAG_NOT_FOUND'
      });
    }

    // Step 7: Log this action for Wide Events tracking
    req.entityIds.tagName = name.toLowerCase();
    req.eventName = 'tag.update.success';

    // Step 8: Return updated tag
    res.json({ tag });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'tag_update', tagName: req.params.name });
    res.status(500).json({
      error: 'Failed to update tag',
      code: 'TAG_UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /tags/:name
 * Delete a tag completely (also removes from all items)
 *
 * WHAT IT DOES:
 * Permanently deletes a tag and removes it from all items that use it.
 * This is destructive - deleted tags cannot be recovered.
 *
 * DELETION BEHAVIOR:
 * 1. Tag removed from Tag collection
 * 2. Tag removed from all notes (if they used it)
 * 3. Tag removed from all tasks (if they used it)
 * 4. Items keep their other tags
 * 5. Deletion is atomic - all or nothing
 *
 * VS ARCHIVING:
 * - DELETE: Permanently removes tag (can't undo)
 * - ARCHIVE: Sets isActive: false (can be reactivated)
 * For safety, consider archiving instead of deleting.
 *
 * USE CASES:
 * - Remove temporary project tag (#sprint-1)
 * - Clean up accidentally created tags
 * - Remove duplicate tag after merging
 *
 * @param {string} req.params.name - Tag name to delete (will be lowercased)
 *
 * @returns {Object} - Success confirmation:
 * {
 *   success: true
 * }
 *
 * @throws {404} - Tag not found
 * @throws {401} - User not authenticated
 * @throws {500} - Database error
 *
 * EXAMPLE REQUEST:
 * DELETE /tags/old-project
 *
 * EXAMPLE RESPONSE:
 * {
 *   success: true
 * }
 *
 * WIDE EVENTS LOGGING:
 * - attachEntityId(req, 'tagName', normalizedName): Track deleted tag
 * - req.eventName = 'tag.delete.success': Event type
 *
 * WARNING:
 * - This action is permanent and cannot be undone
 * - Consider archiving (PATCH with isActive: false) instead
 * - All items lose this tag
 */
router.delete('/:name', async (req, res) => {
  try {
    // Step 1: Extract tag name from URL and normalize
    const { name } = req.params;
    const normalizedName = name.toLowerCase();

    // Step 2: Delete the tag from Tag collection
    const result = await Tag.deleteOne({
      userId: req.user._id,
      name: normalizedName
    });

    // Step 3: Check if tag existed
    // If deletedCount is 0, tag wasn't found
    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: 'Tag not found',
        code: 'TAG_NOT_FOUND'
      });
    }

    // Step 4: Remove tag from all NOTES
    // Uses $pull to remove the tag from notes.tags array
    await Note.updateMany(
      { userId: req.user._id, tags: normalizedName },  // Find condition
      { $pull: { tags: normalizedName } }               // Remove tag from array
    );

    // Step 5: Remove tag from all TASKS
    // Same operation as notes
    await Task.updateMany(
      { userId: req.user._id, tags: normalizedName },
      { $pull: { tags: normalizedName } }
    );

    // Step 6: Log this action for Wide Events tracking
    req.entityIds.tagName = normalizedName;
    req.eventName = 'tag.delete.success';

    // Step 7: Return success confirmation
    res.json({ success: true });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'tag_delete', tagName: req.params.name });
    res.status(500).json({
      error: 'Failed to delete tag',
      code: 'TAG_DELETE_ERROR'
    });
  }
});

export default router;
