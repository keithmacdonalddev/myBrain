/**
 * =============================================================================
 * LINK.JS - Cross-Reference Linking Data Model
 * =============================================================================
 *
 * This file defines the Link model - the data structure for connecting
 * different items (notes, tasks, events, projects) to each other in myBrain.
 *
 * WHAT IS A LINK?
 * ---------------
 * A link is a connection between two items. Think of it like a hyperlink
 * in a document - it lets you jump from one item to another related item.
 *
 * EXAMPLES OF LINKS:
 * - A note that references a related task
 * - A task that was converted from a note
 * - Two projects that are related to each other
 * - A task linked to an event
 *
 * LINK DIRECTION:
 * ---------------
 * Links have a direction - they go FROM one item TO another:
 * - SOURCE: The item where the link starts (the "from" item)
 * - TARGET: The item where the link points (the "to" item)
 *
 * EXAMPLE:
 * If Note A links to Task B:
 * - Source = Note A
 * - Target = Task B
 *
 * Note A shows "Links to: Task B"
 * Task B shows "Linked from: Note A" (this is called a "backlink")
 *
 * LINK TYPES:
 * -----------
 * Different types of links explain the relationship:
 *
 * 1. REFERENCE: A simple "see also" connection
 *    - "This note relates to this task"
 *    - Most common type of link
 *
 * 2. CONVERTED_FROM: The target was created from the source
 *    - "This task was converted from this note"
 *    - Tracks the history of how items were created
 *
 * 3. RELATED: Items are related but neither references the other directly
 *    - "These two projects are related"
 *    - More symmetric relationship
 *
 * BACKLINKS:
 * ----------
 * A "backlink" is a link viewed from the target's perspective.
 * If Note A links to Task B:
 * - From Note A's view: "Links to Task B"
 * - From Task B's view: "Backlinked from Note A"
 *
 * Backlinks help you discover connections you might not have known about.
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
// LINK SCHEMA DEFINITION
// =============================================================================

/**
 * The Link Schema
 * ---------------
 * Defines all the fields a Link document can have.
 */
const linkSchema = new mongoose.Schema({

  // ===========================================================================
  // OWNERSHIP
  // ===========================================================================

  /**
   * userId: Which user owns this link
   * - Required: Every link belongs to a user
   * - Index: For finding a user's links quickly
   *
   * Links are user-specific - you can only link your own items.
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ===========================================================================
  // SOURCE (WHERE THE LINK COMES FROM)
  // ===========================================================================

  /**
   * sourceType: What type of item is the source?
   * - Required: Must know what kind of item
   *
   * VALUES:
   * - 'note': Link starts from a note
   * - 'task': Link starts from a task
   * - 'event': Link starts from an event
   * - 'project': Link starts from a project
   */
  sourceType: {
    type: String,
    enum: ['note', 'task', 'event', 'project'],
    required: true
  },

  /**
   * sourceId: The ID of the source item
   * - Required: Must specify which item
   * - refPath: Tells Mongoose which collection to look in
   *            (based on sourceType)
   *
   * EXAMPLE:
   * If sourceType = 'note', sourceId references a Note document.
   * If sourceType = 'task', sourceId references a Task document.
   */
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'sourceType' // Dynamic reference based on sourceType
  },

  // ===========================================================================
  // TARGET (WHERE THE LINK POINTS TO)
  // ===========================================================================

  /**
   * targetType: What type of item is the target?
   * - Required: Must know what kind of item
   *
   * VALUES:
   * - 'note': Link points to a note
   * - 'task': Link points to a task
   * - 'event': Link points to an event
   * - 'project': Link points to a project
   */
  targetType: {
    type: String,
    enum: ['note', 'task', 'event', 'project'],
    required: true
  },

  /**
   * targetId: The ID of the target item
   * - Required: Must specify which item
   * - refPath: Tells Mongoose which collection to look in
   */
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'targetType' // Dynamic reference based on targetType
  },

  // ===========================================================================
  // LINK TYPE
  // ===========================================================================

  /**
   * linkType: What kind of relationship is this?
   * - Default: 'reference' (simple connection)
   *
   * VALUES:
   * - 'reference': A "see also" connection
   *   EXAMPLE: "Note about meeting mentions Task to prepare"
   *
   * - 'converted_from': Target was created from source
   *   EXAMPLE: "Task was created from this Note"
   *
   * - 'related': Items are related to each other
   *   EXAMPLE: "These two projects are related"
   */
  linkType: {
    type: String,
    enum: ['reference', 'converted_from', 'related'],
    default: 'reference'
  }

}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When the link was created
   * - updatedAt: When it was last modified
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Index for Finding Links FROM an Item
 * ------------------------------------
 * Quickly find all links starting from a specific item.
 * Used when viewing an item to show "Links to:" section.
 */
linkSchema.index({ userId: 1, sourceType: 1, sourceId: 1 });

/**
 * Index for Finding Links TO an Item (Backlinks)
 * ----------------------------------------------
 * Quickly find all links pointing to a specific item.
 * Used when viewing an item to show "Linked from:" section.
 */
linkSchema.index({ userId: 1, targetType: 1, targetId: 1 });

/**
 * Unique Constraint: One Link Per Pair
 * ------------------------------------
 * Ensures you can't create duplicate links between the same two items.
 * If Note A already links to Task B, you can't create that link again.
 */
linkSchema.index({ sourceId: 1, targetId: 1 }, { unique: true });

// =============================================================================
// STATIC METHODS (Called on the Model, not an instance)
// =============================================================================

/**
 * getLinks(userId, entityType, entityId)
 * --------------------------------------
 * Get all links for an entity (both directions).
 * Returns both outgoing links (from this item) and incoming links (to this item).
 *
 * @param {string} userId - User's ID
 * @param {string} entityType - Type of item ('note', 'task', etc.)
 * @param {string} entityId - The item's ID
 * @returns {Object} - { outgoing: [...], incoming: [...] }
 *
 * EXAMPLE:
 * const { outgoing, incoming } = await Link.getLinks(userId, 'note', noteId);
 * // outgoing = links FROM this note TO other items
 * // incoming = links FROM other items TO this note (backlinks)
 *
 * USAGE:
 * - Show "Links to:" list using outgoing
 * - Show "Linked from:" list using incoming
 */
linkSchema.statics.getLinks = async function(userId, entityType, entityId) {
  // Run both queries in parallel for efficiency
  const [outgoing, incoming] = await Promise.all([
    // Links FROM this item (source = this item)
    this.find({ userId, sourceType: entityType, sourceId: entityId }),
    // Links TO this item (target = this item)
    this.find({ userId, targetType: entityType, targetId: entityId })
  ]);

  return { outgoing, incoming };
};

/**
 * getBacklinks(userId, entityType, entityId)
 * ------------------------------------------
 * Get only the backlinks (items linking TO this entity).
 * Backlinks are the "Linked from:" list.
 *
 * @param {string} userId - User's ID
 * @param {string} entityType - Type of item
 * @param {string} entityId - The item's ID
 * @returns {Array} - Array of Link documents
 *
 * EXAMPLE:
 * const backlinks = await Link.getBacklinks(userId, 'task', taskId);
 * // Shows all notes, projects, etc. that link to this task
 *
 * WHY BACKLINKS MATTER:
 * Backlinks help you discover connections:
 * - "Oh, this task is mentioned in 3 different notes!"
 * - "This project is referenced by 5 tasks!"
 */
linkSchema.statics.getBacklinks = async function(userId, entityType, entityId) {
  return this.find({
    userId,
    targetType: entityType,
    targetId: entityId
  });
};

// =============================================================================
// INSTANCE METHODS (Called on a Link document)
// =============================================================================

/**
 * toSafeJSON()
 * ------------
 * Convert to a safe JSON object for API responses.
 * Removes internal fields like __v (version key).
 *
 * @returns {Object} - Safe JSON representation
 */
linkSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the Link model from the schema.
 * This gives us methods to:
 * - Get all links: Link.getLinks(userId, entityType, entityId)
 * - Get backlinks: Link.getBacklinks(userId, entityType, entityId)
 * - Convert to JSON: link.toSafeJSON()
 *
 * COMMON OPERATIONS:
 * - Create link: new Link({ userId, sourceType, sourceId, targetType, targetId, linkType }).save()
 * - Delete link: Link.deleteOne({ sourceId, targetId })
 * - Check if linked: Link.findOne({ sourceId, targetId })
 */
const Link = mongoose.model('Link', linkSchema);

export default Link;
