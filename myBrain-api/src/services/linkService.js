/**
 * =============================================================================
 * LINKSERVICE.JS - Bidirectional Link Management Service
 * =============================================================================
 *
 * This service handles all business logic for creating and managing links
 * between different entities (notes, tasks, etc.) in myBrain.
 *
 * WHAT ARE BIDIRECTIONAL LINKS?
 * -----------------------------
 * Bidirectional links connect two items together in BOTH directions.
 * This is inspired by tools like Roam Research and Obsidian.
 *
 * EXAMPLE:
 * - Note A links to Task B
 * - When viewing Note A, you see "Links to: Task B"
 * - When viewing Task B, you see "Linked from: Note A" (backlink)
 *
 * WHY USE BIDIRECTIONAL LINKS?
 * ----------------------------
 * 1. DISCOVERY: Find related content you forgot about
 * 2. CONTEXT: See where an item is referenced
 * 3. KNOWLEDGE GRAPH: Build a web of connected ideas
 * 4. NAVIGATION: Easily jump between related items
 *
 * LINK DIRECTIONS:
 * ----------------
 * - OUTGOING: Links FROM this item TO other items (forward links)
 * - BACKLINKS: Links TO this item FROM other items (reverse links)
 *
 * EXAMPLE SCENARIO:
 * If you're viewing a note about "Project Alpha":
 * - Outgoing links: Tasks you linked from this note
 * - Backlinks: Other notes that mention "Project Alpha"
 *
 * LINK TYPES SUPPORTED:
 * ---------------------
 * - reference: General reference link (default)
 * - converted_from: Task was converted from this note
 * - related: Items are related but not derived
 * - parent: Hierarchical parent relationship
 * - child: Hierarchical child relationship
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Link model stores the connection between two entities.
 * Each link has a source (where link originates) and target (where link points).
 */
import Link from '../models/Link.js';

/**
 * Note model - needed to populate note data when returning links.
 */
import Note from '../models/Note.js';

/**
 * Task model - needed to populate task data when returning links.
 */
import Task from '../models/Task.js';

// =============================================================================
// CREATE LINK
// =============================================================================

/**
 * createLink(userId, source, target, linkType)
 * --------------------------------------------
 * Creates a link between two entities. If the link already exists,
 * it updates the existing link (upsert behavior).
 *
 * @param {ObjectId} userId - The user who owns this link
 * @param {Object} source - The source entity (where link originates)
 *   - source.type: Entity type ('note', 'task', 'project', etc.)
 *   - source.id: Entity's unique ID
 * @param {Object} target - The target entity (where link points)
 *   - target.type: Entity type ('note', 'task', 'project', etc.)
 *   - target.id: Entity's unique ID
 * @param {string} linkType - Type of relationship (default: 'reference')
 *   - 'reference': General reference
 *   - 'converted_from': Task created from note
 *   - 'related': Related items
 *
 * @returns {Object} The created or updated Link document
 *
 * UPSERT BEHAVIOR:
 * ----------------
 * If a link between source and target already exists, this function
 * updates it instead of creating a duplicate. This prevents multiple
 * identical links from being created.
 *
 * EXAMPLE:
 * ```javascript
 * // Create a link from Note A to Task B
 * const link = await createLink(
 *   userId,
 *   { type: 'note', id: noteA._id },
 *   { type: 'task', id: taskB._id },
 *   'reference'
 * );
 * ```
 */
export async function createLink(userId, source, target, linkType = 'reference') {
  // findOneAndUpdate with upsert: true creates if not exists, updates if exists
  // This ensures we never have duplicate links between the same entities
  const link = await Link.findOneAndUpdate(
    // Query: Find existing link between source and target
    { sourceId: source.id, targetId: target.id },
    // Update: Set all link fields (creates new doc if not found)
    {
      userId,
      sourceType: source.type,
      sourceId: source.id,
      targetType: target.type,
      targetId: target.id,
      linkType
    },
    // Options: upsert creates new doc, new returns updated doc
    { upsert: true, new: true }
  );

  return link;
}

// =============================================================================
// REMOVE LINK
// =============================================================================

/**
 * removeLink(userId, source, target)
 * ----------------------------------
 * Removes a link between two entities.
 *
 * @param {ObjectId} userId - The user who owns this link
 * @param {Object} source - The source entity
 *   - source.type: Entity type
 *   - source.id: Entity ID
 * @param {Object} target - The target entity
 *   - target.type: Entity type
 *   - target.id: Entity ID
 *
 * @returns {boolean} True if a link was deleted, false if no link existed
 *
 * SECURITY NOTE:
 * This function requires userId in the query to ensure users can only
 * delete their own links. Even if someone guesses valid IDs, they can't
 * delete another user's links.
 *
 * EXAMPLE:
 * ```javascript
 * // Remove the link from Note A to Task B
 * const wasDeleted = await removeLink(
 *   userId,
 *   { type: 'note', id: noteA._id },
 *   { type: 'task', id: taskB._id }
 * );
 * // wasDeleted = true if link existed and was removed
 * ```
 */
export async function removeLink(userId, source, target) {
  // Delete the link matching all criteria
  const result = await Link.deleteOne({
    userId,
    sourceType: source.type,
    sourceId: source.id,
    targetType: target.type,
    targetId: target.id
  });

  // Return true if something was deleted
  return result.deletedCount > 0;
}

// =============================================================================
// GET BACKLINKS
// =============================================================================

/**
 * getBacklinks(userId, entityType, entityId)
 * ------------------------------------------
 * Gets all entities that link TO a specific entity.
 * These are "backlinks" - references from other items pointing here.
 *
 * @param {ObjectId} userId - The user who owns the entity
 * @param {string} entityType - Type of entity ('note', 'task', etc.)
 * @param {ObjectId} entityId - The entity's unique ID
 *
 * @returns {Array} Array of link objects with populated source entities
 *
 * WHAT ARE BACKLINKS?
 * -------------------
 * Backlinks are the reverse of regular links. If Note A links to Note B,
 * then Note B has a backlink from Note A.
 *
 * BACKLINKS ARE POWERFUL BECAUSE:
 * - You can see everywhere an item is referenced
 * - You discover connections you didn't know existed
 * - You understand context (why was this item created?)
 *
 * RETURNED DATA STRUCTURE:
 * ```javascript
 * [
 *   {
 *     _id: 'link123',
 *     sourceType: 'note',
 *     sourceId: 'note456',
 *     linkType: 'reference',
 *     source: {              // Populated source entity
 *       _id: 'note456',
 *       title: 'Project Ideas',
 *       body: '...'
 *     }
 *   },
 *   // ... more backlinks
 * ]
 * ```
 *
 * EXAMPLE:
 * ```javascript
 * // Get all backlinks for a task
 * const backlinks = await getBacklinks(userId, 'task', taskId);
 * // Returns notes/tasks that link TO this task
 * ```
 */
export async function getBacklinks(userId, entityType, entityId) {
  // Find all links where this entity is the TARGET
  // (something else is pointing AT this entity)
  const backlinks = await Link.find({
    userId,
    targetType: entityType,
    targetId: entityId
  });

  // Populate the source entities for each backlink
  // We need to fetch the actual note/task data to display in the UI
  const populated = await Promise.all(
    backlinks.map(async (link) => {
      // Convert link to plain object for adding extra fields
      const linkObj = link.toSafeJSON();

      // Fetch the source entity based on its type
      if (link.sourceType === 'note') {
        const note = await Note.findById(link.sourceId);
        if (note) {
          linkObj.source = note.toSafeJSON();
        }
      } else if (link.sourceType === 'task') {
        const task = await Task.findById(link.sourceId);
        if (task) {
          linkObj.source = task.toSafeJSON();
        }
      }

      return linkObj;
    })
  );

  // Filter out any links where the source entity no longer exists
  // (entity may have been deleted but link wasn't cleaned up)
  return populated.filter(l => l.source);
}

// =============================================================================
// GET OUTGOING LINKS
// =============================================================================

/**
 * getOutgoingLinks(userId, entityType, entityId)
 * ----------------------------------------------
 * Gets all entities that this entity links TO.
 * These are "forward links" - references this item makes to other items.
 *
 * @param {ObjectId} userId - The user who owns the entity
 * @param {string} entityType - Type of entity ('note', 'task', etc.)
 * @param {ObjectId} entityId - The entity's unique ID
 *
 * @returns {Array} Array of link objects with populated target entities
 *
 * WHAT ARE OUTGOING LINKS?
 * ------------------------
 * Outgoing links are the forward references from an item.
 * If Note A links to Task B and Note C, those are outgoing links from Note A.
 *
 * RETURNED DATA STRUCTURE:
 * ```javascript
 * [
 *   {
 *     _id: 'link123',
 *     targetType: 'task',
 *     targetId: 'task789',
 *     linkType: 'reference',
 *     target: {              // Populated target entity
 *       _id: 'task789',
 *       title: 'Review design',
 *       status: 'pending'
 *     }
 *   },
 *   // ... more outgoing links
 * ]
 * ```
 *
 * EXAMPLE:
 * ```javascript
 * // Get all links FROM a note
 * const outgoing = await getOutgoingLinks(userId, 'note', noteId);
 * // Returns tasks/notes that this note links TO
 * ```
 */
export async function getOutgoingLinks(userId, entityType, entityId) {
  // Find all links where this entity is the SOURCE
  // (this entity is pointing AT something else)
  const links = await Link.find({
    userId,
    sourceType: entityType,
    sourceId: entityId
  });

  // Populate the target entities for each link
  const populated = await Promise.all(
    links.map(async (link) => {
      // Convert link to plain object for adding extra fields
      const linkObj = link.toSafeJSON();

      // Fetch the target entity based on its type
      if (link.targetType === 'note') {
        const note = await Note.findById(link.targetId);
        if (note) {
          linkObj.target = note.toSafeJSON();
        }
      } else if (link.targetType === 'task') {
        const task = await Task.findById(link.targetId);
        if (task) {
          linkObj.target = task.toSafeJSON();
        }
      }

      return linkObj;
    })
  );

  // Filter out links where target entity no longer exists
  return populated.filter(l => l.target);
}

// =============================================================================
// GET ALL LINKS
// =============================================================================

/**
 * getAllLinks(userId, entityType, entityId)
 * -----------------------------------------
 * Gets ALL links for an entity - both backlinks and outgoing links.
 * This gives a complete picture of how an entity is connected.
 *
 * @param {ObjectId} userId - The user who owns the entity
 * @param {string} entityType - Type of entity ('note', 'task', etc.)
 * @param {ObjectId} entityId - The entity's unique ID
 *
 * @returns {Object} Object containing both link directions:
 *   - backlinks: Array of entities linking TO this entity
 *   - outgoing: Array of entities this entity links TO
 *
 * WHY GET BOTH DIRECTIONS?
 * ------------------------
 * When viewing an item's details, users want to see:
 * 1. What does this item reference? (outgoing)
 * 2. Where is this item referenced? (backlinks)
 *
 * This function fetches both in parallel for efficiency.
 *
 * RETURNED DATA STRUCTURE:
 * ```javascript
 * {
 *   backlinks: [
 *     { source: { title: 'Meeting Notes', ... }, linkType: 'reference' },
 *     // ... more backlinks
 *   ],
 *   outgoing: [
 *     { target: { title: 'Review Task', ... }, linkType: 'reference' },
 *     // ... more outgoing links
 *   ]
 * }
 * ```
 *
 * EXAMPLE:
 * ```javascript
 * // Get complete link picture for a note
 * const { backlinks, outgoing } = await getAllLinks(userId, 'note', noteId);
 * console.log(`This note links to ${outgoing.length} items`);
 * console.log(`${backlinks.length} items link to this note`);
 * ```
 */
export async function getAllLinks(userId, entityType, entityId) {
  // Fetch both directions in parallel for better performance
  const [backlinks, outgoing] = await Promise.all([
    getBacklinks(userId, entityType, entityId),
    getOutgoingLinks(userId, entityType, entityId)
  ]);

  return { backlinks, outgoing };
}

// =============================================================================
// DELETE ENTITY LINKS
// =============================================================================

/**
 * deleteEntityLinks(userId, entityType, entityId)
 * -----------------------------------------------
 * Deletes ALL links associated with an entity (both directions).
 * Called when an entity is being deleted to clean up orphaned links.
 *
 * @param {ObjectId} userId - The user who owns the entity
 * @param {string} entityType - Type of entity ('note', 'task', etc.)
 * @param {ObjectId} entityId - The entity's unique ID
 *
 * @returns {number} Number of links that were deleted
 *
 * WHEN TO USE:
 * ------------
 * Call this function when permanently deleting a note, task, or other
 * linkable entity. This ensures no "orphan" links remain pointing to
 * or from the deleted entity.
 *
 * WHAT GETS DELETED:
 * - Links where this entity is the SOURCE (outgoing links)
 * - Links where this entity is the TARGET (backlinks)
 *
 * WHY CLEAN UP LINKS?
 * -------------------
 * If we don't clean up links when deleting entities:
 * - Backlink queries would return non-existent entities
 * - The database would accumulate garbage data
 * - Link counts would be inaccurate
 *
 * EXAMPLE:
 * ```javascript
 * // Before deleting a note, clean up its links
 * const deletedCount = await deleteEntityLinks(userId, 'note', noteId);
 * console.log(`Cleaned up ${deletedCount} links`);
 *
 * // Now safe to delete the note itself
 * await Note.findByIdAndDelete(noteId);
 * ```
 */
export async function deleteEntityLinks(userId, entityType, entityId) {
  // Delete all links where this entity is either source OR target
  // $or allows us to match either condition in one query
  const result = await Link.deleteMany({
    userId,
    $or: [
      // This entity is the source (pointing to others)
      { sourceType: entityType, sourceId: entityId },
      // This entity is the target (others pointing to it)
      { targetType: entityType, targetId: entityId }
    ]
  });

  return result.deletedCount;
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all link service functions as named exports and as default object.
 *
 * USAGE:
 *
 * // Named imports (preferred for tree-shaking)
 * import { createLink, getBacklinks } from './services/linkService.js';
 *
 * // Default import (all functions)
 * import linkService from './services/linkService.js';
 * linkService.createLink(...);
 */
export default {
  createLink,
  removeLink,
  getBacklinks,
  getOutgoingLinks,
  getAllLinks,
  deleteEntityLinks
};
