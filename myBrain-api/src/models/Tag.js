/**
 * =============================================================================
 * TAG.JS - Tag Management Data Model
 * =============================================================================
 *
 * This file defines the Tag model - a centralized system for managing tags
 * used across notes, tasks, projects, files, and images in myBrain.
 *
 * WHAT IS A TAG?
 * --------------
 * A tag is a label or keyword that helps categorize and find content.
 * Tags are user-defined and can be applied to multiple items.
 *
 * EXAMPLES OF TAGS:
 * - "work", "personal", "urgent", "important"
 * - "meeting-notes", "ideas", "research"
 * - "2024", "q4", "review"
 *
 * WHY CENTRALIZED TAG MANAGEMENT?
 * -------------------------------
 * Instead of storing tags as simple strings on each item, this model:
 *
 * 1. TRACKS USAGE: Knows how many items use each tag
 * 2. ENABLES AUTOCOMPLETE: Suggests existing tags as user types
 * 3. PREVENTS DUPLICATES: "Work" and "work" are the same tag
 * 4. ALLOWS MANAGEMENT: Rename, merge, or delete tags across all items
 * 5. PROVIDES ANALYTICS: See most popular tags
 *
 * HOW IT WORKS:
 * -------------
 * When a user adds tag "work" to a note:
 * 1. Tag "work" is added to the note's tags array (as a string)
 * 2. This Tag model tracks that "work" was used (increments usageCount)
 *
 * When a user removes tag "work" from a note:
 * 1. Tag is removed from the note's tags array
 * 2. This model decrements usageCount
 * 3. If usageCount reaches 0, the tag is deleted (no longer in use)
 *
 * TAG NORMALIZATION:
 * ------------------
 * All tags are stored in lowercase to prevent duplicates.
 * "Work", "WORK", and "work" all become "work".
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
// TAG SCHEMA DEFINITION
// =============================================================================

/**
 * The Tag Schema
 * --------------
 * Defines all the fields a Tag document can have.
 */
const tagSchema = new mongoose.Schema({

  // ===========================================================================
  // OWNERSHIP
  // ===========================================================================

  /**
   * userId: Which user owns this tag
   * - Required: Every tag belongs to a user
   * - References: Points to a User document
   * - Index: For fast lookups by user
   *
   * Tags are user-specific - each user has their own set of tags.
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ===========================================================================
  // TAG INFO
  // ===========================================================================

  /**
   * name: The tag text
   * - Required: Every tag needs a name
   * - Trimmed: Removes extra whitespace
   * - Lowercase: Normalized for consistency
   * - Max 50 characters: Keep tags concise
   *
   * EXAMPLES: "work", "personal", "urgent", "meeting-notes"
   */
  name: {
    type: String,
    required: true,
    trim: true,
    lowercase: true, // Automatically convert to lowercase
    maxlength: 50
  },

  /**
   * usageCount: How many items currently use this tag
   * - Incremented when tag is added to an item
   * - Decremented when tag is removed from an item
   * - When it reaches 0, the tag is deleted
   *
   * Used for popularity sorting and cleanup.
   */
  usageCount: {
    type: Number,
    default: 1,
    min: 0 // Can't go negative
  },

  /**
   * lastUsed: When this tag was last applied to an item
   * - Updated whenever the tag is used
   * - Used for "recently used" sorting
   */
  lastUsed: {
    type: Date,
    default: Date.now
  },

  // ===========================================================================
  // APPEARANCE
  // ===========================================================================

  /**
   * color: Custom color for this tag
   * - Optional: Uses default color if not set
   * - Helps visually distinguish tags in the UI
   *
   * EXAMPLE: "#3b82f6" (blue), "#ef4444" (red)
   */
  color: {
    type: String,
    default: null
  },

  // ===========================================================================
  // STATUS
  // ===========================================================================

  /**
   * isActive: Whether this tag is active/visible
   * - Active tags appear in autocomplete and suggestions
   * - Inactive tags can be hidden from normal use
   * - Useful for deprecating tags without deleting
   */
  isActive: {
    type: Boolean,
    default: true
  }

}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When the tag was first created
   * - updatedAt: When the tag was last modified
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Unique Index for Tags per User
 * ------------------------------
 * Ensures each user can only have one tag with each name.
 * "work" can only exist once per user (no duplicates).
 */
tagSchema.index({ userId: 1, name: 1 }, { unique: true });

/**
 * Index for Sorting by Usage
 * --------------------------
 * For showing most popular tags first.
 */
tagSchema.index({ userId: 1, usageCount: -1 });

// =============================================================================
// STATIC METHODS (Called on the Model, not an instance)
// =============================================================================

/**
 * trackUsage(userId, tagNames)
 * ----------------------------
 * Track that tags have been used (added to an item).
 * Creates new tags if they don't exist, increments count if they do.
 *
 * @param {string} userId - User's ID
 * @param {Array} tagNames - Array of tag names being used
 * @returns {Array} - The tag documents that were tracked
 *
 * EXAMPLE:
 * When a note is created with tags ["work", "urgent"]:
 * await Tag.trackUsage(userId, ["work", "urgent"]);
 * - If "work" exists: usageCount increases by 1
 * - If "urgent" doesn't exist: creates new tag with usageCount: 1
 *
 * USES upsert (update or insert):
 * - $inc: Increment usageCount by 1
 * - $set: Update lastUsed to now
 * - $setOnInsert: Set initial values for new tags
 */
tagSchema.statics.trackUsage = async function(userId, tagNames) {
  // Handle empty input
  if (!tagNames || tagNames.length === 0) return [];

  // Normalize all tag names (trim whitespace, convert to lowercase, remove empty)
  const normalizedTags = tagNames.map(t => t.trim().toLowerCase()).filter(Boolean);
  if (normalizedTags.length === 0) return [];

  // Build bulk write operations for efficiency
  const operations = normalizedTags.map(name => ({
    updateOne: {
      filter: { userId, name },
      update: {
        $inc: { usageCount: 1 },              // Increment count
        $set: { lastUsed: new Date() },       // Update last used time
        $setOnInsert: { userId, name, color: null } // Only set on insert (new tag)
      },
      upsert: true // Create if doesn't exist
    }
  }));

  // Execute all operations in one database call
  await this.bulkWrite(operations);

  // Return the updated/created tags
  return this.find({ userId, name: { $in: normalizedTags } });
};

/**
 * decrementUsage(userId, tagNames)
 * --------------------------------
 * Track that tags have been removed from an item.
 * Decrements usage count and deletes tags that reach 0.
 *
 * @param {string} userId - User's ID
 * @param {Array} tagNames - Array of tag names being removed
 *
 * EXAMPLE:
 * When a tag "work" is removed from a note:
 * await Tag.decrementUsage(userId, ["work"]);
 * - Decreases "work" usageCount by 1
 * - If usageCount reaches 0, deletes the tag
 */
tagSchema.statics.decrementUsage = async function(userId, tagNames) {
  // Handle empty input
  if (!tagNames || tagNames.length === 0) return;

  // Normalize tag names
  const normalizedTags = tagNames.map(t => t.trim().toLowerCase()).filter(Boolean);
  if (normalizedTags.length === 0) return;

  // Decrement usage count for all tags
  await this.updateMany(
    { userId, name: { $in: normalizedTags } },
    { $inc: { usageCount: -1 } }
  );

  // Clean up tags with 0 or negative usage count (no longer in use)
  await this.deleteMany({ userId, usageCount: { $lte: 0 } });
};

/**
 * getPopularTags(userId, limit)
 * -----------------------------
 * Get the user's most popular (most used) tags.
 * Used for tag suggestions and tag clouds.
 *
 * @param {string} userId - User's ID
 * @param {number} limit - Maximum tags to return (default 50)
 * @returns {Array} - Tags sorted by usage count (most used first)
 */
tagSchema.statics.getPopularTags = async function(userId, limit = 50) {
  return this.find({ userId, isActive: true })
    .sort({ usageCount: -1, lastUsed: -1 }) // Most used, then most recent
    .limit(limit)
    .lean(); // Plain objects (faster for read-only)
};

/**
 * searchTags(userId, query, limit)
 * --------------------------------
 * Search tags by name (autocomplete).
 * Used when user starts typing in a tag input field.
 *
 * @param {string} userId - User's ID
 * @param {string} query - Search text (partial tag name)
 * @param {number} limit - Maximum results (default 10)
 * @returns {Array} - Matching tags sorted by popularity
 *
 * EXAMPLE:
 * User types "wor" → returns ["work", "workflow", "workshop"]
 */
tagSchema.statics.searchTags = async function(userId, query, limit = 10) {
  // Escape regex special characters in the query to prevent regex injection
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  return this.find({ userId, name: regex, isActive: true })
    .sort({ usageCount: -1 }) // Most popular matches first
    .limit(limit)
    .lean();
};

/**
 * getAllTags(userId, options)
 * ---------------------------
 * Get all tags for a user (for tag management UI).
 * Can include inactive tags and sort by various fields.
 *
 * @param {string} userId - User's ID
 * @param {Object} options:
 *   - sortBy: Field to sort by (default 'usageCount')
 *   - sortOrder: 1 for ascending, -1 for descending (default -1)
 *   - includeInactive: Include inactive tags (default true)
 * @returns {Array} - All tags matching criteria
 */
tagSchema.statics.getAllTags = async function(userId, options = {}) {
  const { sortBy = 'usageCount', sortOrder = -1, includeInactive = true } = options;

  // Build query
  const query = { userId };
  if (!includeInactive) {
    query.isActive = true;
  }

  // Build sort
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder;

  return this.find(query)
    .sort(sortOptions)
    .lean();
};

/**
 * renameTag(userId, oldName, newName)
 * -----------------------------------
 * Rename a tag.
 * NOTE: This only updates the Tag document. The calling code must also
 * update all items (notes, tasks, etc.) that use this tag.
 *
 * @param {string} userId - User's ID
 * @param {string} oldName - Current tag name
 * @param {string} newName - New tag name
 * @returns {Object|null} - Updated tag or null if not found
 * @throws {Error} - If new name already exists
 *
 * EXAMPLE:
 * Rename "work" to "professional":
 * await Tag.renameTag(userId, "work", "professional");
 */
tagSchema.statics.renameTag = async function(userId, oldName, newName) {
  // Normalize names
  const normalizedOld = oldName.trim().toLowerCase();
  const normalizedNew = newName.trim().toLowerCase();

  // No change needed
  if (normalizedOld === normalizedNew) return null;

  // Check if new name already exists
  const existingNew = await this.findOne({ userId, name: normalizedNew });
  if (existingNew) {
    throw new Error('A tag with this name already exists');
  }

  // Update the tag
  return this.findOneAndUpdate(
    { userId, name: normalizedOld },
    { $set: { name: normalizedNew } },
    { new: true } // Return updated document
  );
};

/**
 * mergeTags(userId, sourceNames, targetName)
 * ------------------------------------------
 * Merge multiple tags into one.
 * Combines usage counts and deletes the source tags.
 * NOTE: The calling code must also update all items to replace
 * source tags with the target tag.
 *
 * @param {string} userId - User's ID
 * @param {Array} sourceNames - Tags to merge from (will be deleted)
 * @param {string} targetName - Tag to merge into
 * @returns {Object|null} - { targetTag, mergedCount, addedUsage }
 *
 * EXAMPLE:
 * Merge "work", "job", "career" into "professional":
 * await Tag.mergeTags(userId, ["work", "job", "career"], "professional");
 * - Creates/updates "professional" with combined usage count
 * - Deletes "work", "job", "career" tags
 */
tagSchema.statics.mergeTags = async function(userId, sourceNames, targetName) {
  // Normalize target
  const normalizedTarget = targetName.trim().toLowerCase();

  // Normalize sources (exclude the target if it's in the list)
  const normalizedSources = sourceNames
    .map(n => n.trim().toLowerCase())
    .filter(n => n !== normalizedTarget);

  // Nothing to merge
  if (normalizedSources.length === 0) return null;

  // Get all source tags to calculate total usage
  const sourceTags = await this.find({ userId, name: { $in: normalizedSources } });
  const totalUsage = sourceTags.reduce((sum, t) => sum + t.usageCount, 0);

  // Update or create target tag with combined usage
  const targetTag = await this.findOneAndUpdate(
    { userId, name: normalizedTarget },
    {
      $inc: { usageCount: totalUsage },      // Add source usage counts
      $set: { lastUsed: new Date() }
    },
    { new: true, upsert: true }               // Create if doesn't exist
  );

  // Delete source tags
  await this.deleteMany({ userId, name: { $in: normalizedSources } });

  return {
    targetTag,
    mergedCount: normalizedSources.length,
    addedUsage: totalUsage
  };
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the Tag model from the schema.
 * This gives us methods to:
 * - Track usage: Tag.trackUsage(userId, tagNames)
 * - Decrement usage: Tag.decrementUsage(userId, tagNames)
 * - Get popular: Tag.getPopularTags(userId, limit)
 * - Search: Tag.searchTags(userId, query, limit)
 * - Get all: Tag.getAllTags(userId, options)
 * - Rename: Tag.renameTag(userId, oldName, newName)
 * - Merge: Tag.mergeTags(userId, sourceNames, targetName)
 */
const Tag = mongoose.model('Tag', tagSchema);

export default Tag;
