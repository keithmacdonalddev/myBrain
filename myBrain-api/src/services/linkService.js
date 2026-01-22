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
 * Link model stores the connection between two entities in myBrain.
 * Each link has a source (where link originates) and target (where link points to).
 * Links enable bidirectional relationships: when you link Note A to Task B,
 * Task B automatically shows that Note A links to it (backlinks).
 */
import Link from '../models/Link.js';

/**
 * Note model - used to populate note data when returning links.
 * When we fetch links related to a note, we also get the note's details
 * (title, content, etc.) so the API client can display rich link previews.
 */
import Note from '../models/Note.js';

/**
 * Task model - used to populate task data when returning links.
 * Similarly, when returning links to tasks, we include task details
 * (title, due date, status) for rich previews in the UI.
 */
import Task from '../models/Task.js';

// =============================================================================
// CREATE LINK
// =============================================================================

/**
 * createLink(userId, source, target, linkType)
 * --------------------------------------------
 * Creates a bidirectional link between two entities, or updates if it exists (upsert).
 * Links enable users to build knowledge graphs and discover connections.
 *
 * BUSINESS LOGIC:
 * When a user wants to connect a note to a task (or any two items),
 * we create a Link document that represents this relationship.
 *
 * UPSERT BEHAVIOR (Important!):
 * If a link already exists between these two entities, we UPDATE it instead of
 * creating a duplicate. This means:
 * - Calling createLink twice with same source/target creates 1 link, not 2
 * - If you change linkType from 'reference' to 'related', it updates
 * - Prevents database bloat from duplicate links
 *
 * WHY UPSERT?
 * Users might link the same two items multiple times. We only keep one link
 * and update the linkType if they specify a different relationship.
 *
 * LINK TYPES (Semantic Relationship):
 * - 'reference': General reference (most common)
 * - 'converted_from': Task was converted from this note
 * - 'related': Items are related but not derived
 * - 'parent': Hierarchical parent relationship
 * - 'child': Hierarchical child relationship
 *
 * @param {ObjectId} userId - The user who owns this link (for multi-tenancy)
 * @param {Object} source - The source entity (where link originates FROM)
 *   - source.type: {string} Entity type ('note', 'task', 'project', 'event', etc.)
 *   - source.id: {ObjectId} Entity's unique ID
 * @param {Object} target - The target entity (where link points TO)
 *   - target.type: {string} Entity type ('note', 'task', 'project', 'event', etc.)
 *   - target.id: {ObjectId} Entity's unique ID
 * @param {string} linkType - Semantic relationship type (default: 'reference')
 *   Options: 'reference', 'converted_from', 'related', 'parent', 'child'
 *
 * @returns {Promise<Object>} The created or updated Link document
 *
 * @throws - Does not throw; errors are handled by caller
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Create a link from Note A to Task B (general reference)
 * const link = await createLink(
 *   userId,
 *   { type: 'note', id: noteA._id },
 *   { type: 'task', id: taskB._id },
 *   'reference'  // Note mentions this task
 * );
 *
 * // Later, user links the same note to same task but as "converted_from"
 * // (note: this link was created FROM the note, not the task)
 * const updatedLink = await createLink(
 *   userId,
 *   { type: 'note', id: noteA._id },
 *   { type: 'task', id: taskB._id },
 *   'converted_from'  // This updates the existing link
 * );
 *
 * // Link is now updated (not duplicated)
 * console.log(updatedLink.linkType); // 'converted_from'
 * ```
 */
export async function createLink(userId, source, target, linkType = 'reference') {
  // =====================================================
  // UPSERT: CREATE OR UPDATE LINK
  // =====================================================
  // findOneAndUpdate with { upsert: true } does both:
  // - If link exists: UPDATE it with new values
  // - If link doesn't exist: CREATE it with the query as defaults
  //
  // The { new: true } option returns the updated/created document
  // (without it, we'd get the old document)
  const link = await Link.findOneAndUpdate(
    // QUERY: Find existing link (or use as defaults if creating)
    // We search by both sourceId and targetId to ensure we find the exact link
    { sourceId: source.id, targetId: target.id },
    // UPDATE: Set/overwrite all link fields
    {
      userId,
      sourceType: source.type,
      sourceId: source.id,
      targetType: target.type,
      targetId: target.id,
      linkType
    },
    // OPTIONS:
    {
      upsert: true,  // Create if doesn't exist
      new: true      // Return the updated document
    }
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
 * Called when user wants to disconnect two items.
 *
 * BUSINESS LOGIC:
 * When a user wants to remove a connection between two items,
 * we find the link and delete it. The user must own the link (multi-tenancy safety).
 *
 * SECURITY:
 * This function requires userId in the query to ensure users can only
 * delete their own links. Even if someone guesses valid entity IDs,
 * they can't delete another user's links. This is a multi-tenancy boundary.
 *
 * IDEMPOTENT:
 * It's safe to call this multiple times - if the link doesn't exist,
 * we just return false. No error is thrown.
 *
 * @param {ObjectId} userId - The user who owns this link (for multi-tenancy)
 * @param {Object} source - The source entity
 *   - source.type: {string} Entity type ('note', 'task', etc.)
 *   - source.id: {ObjectId} Entity ID
 * @param {Object} target - The target entity
 *   - target.type: {string} Entity type ('note', 'task', etc.)
 *   - target.id: {ObjectId} Entity ID
 *
 * @returns {Promise<boolean>} true if link existed and was deleted, false if didn't exist
 *
 * @throws - Does not throw; returns false if error
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Remove the link from Note A to Task B
 * const wasDeleted = await removeLink(
 *   userId,
 *   { type: 'note', id: noteA._id },
 *   { type: 'task', id: taskB._id }
 * );
 *
 * if (wasDeleted) {
 *   console.log('Link removed successfully');
 * } else {
 *   console.log('Link did not exist');
 * }
 * ```
 */
export async function removeLink(userId, source, target) {
  // =====================================================
  // DELETE LINK WITH MULTI-TENANCY CHECK
  // =====================================================
  // We check all fields to ensure:
  // 1. User owns this link (userId must match)
  // 2. It's the exact link being removed (source/target match)
  // This prevents users from deleting other users' links
  const result = await Link.deleteOne({
    userId,                  // Must be this user's link
    sourceType: source.type,
    sourceId: source.id,
    targetType: target.type,
    targetId: target.id
  });

  // =====================================================
  // RETURN WHETHER DELETE WAS SUCCESSFUL
  // =====================================================
  // deletedCount > 0 means we found and deleted a link
  // deletedCount === 0 means no link matched (link didn't exist)
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
 * Deletes ALL links associated with an entity (both incoming and outgoing).
 * Called when an entity is being deleted to clean up orphaned links.
 *
 * BUSINESS LOGIC:
 * When a user deletes a note, task, or any linkable entity, we need to clean up
 * all links connected to it. Otherwise, we'd have "orphan" links pointing to
 * non-existent entities, which would cause errors and database bloat.
 *
 * WHAT GETS DELETED:
 * 1. OUTGOING LINKS: Links FROM this entity TO other entities
 *    (e.g., if deleting Note A, delete the "Note A → Task B" link)
 * 2. BACKLINKS: Links FROM other entities TO this entity
 *    (e.g., if deleting Note A, delete the "Note C → Note A" link)
 *
 * WHY CLEAN UP?
 * If we don't delete links when deleting entities:
 * - Backlink queries would try to fetch deleted entities → errors
 * - Database accumulates garbage data (broken references)
 * - Link counts become inaccurate (counts deleted items)
 * - API responses include broken links
 *
 * GARBAGE COLLECTION PATTERN:
 * This is a cleanup function. In an ideal system with referential integrity,
 * the database would automatically clean up links (via cascading delete).
 * Since we don't have that, we manually clean up before deletion.
 *
 * @param {ObjectId} userId - The user who owns the entity (for multi-tenancy)
 * @param {string} entityType - Type of entity being deleted ('note', 'task', 'project', etc.)
 * @param {ObjectId} entityId - The entity's unique ID
 *
 * @returns {Promise<number>} Number of links that were deleted
 *
 * @throws - Does not throw; returns count even if zero
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // In the route that deletes a note:
 * const noteId = req.params.id;
 *
 * // Step 1: Clean up all links (required before deletion)
 * const linksDeleted = await deleteEntityLinks(userId, 'note', noteId);
 * console.log(`Cleaned up ${linksDeleted} links`);
 *
 * // Step 2: Now safe to delete the note itself
 * const note = await Note.findByIdAndDelete(noteId);
 *
 * // Return success with cleanup info
 * res.json({
 *   message: 'Note deleted',
 *   linksRemoved: linksDeleted
 * });
 * ```
 *
 * TYPICAL CLEANUP SCENARIOS:
 * - User deletes a note that was referenced by 3 other notes: 3 links deleted
 * - User deletes a task that was converted from a note: 1 link deleted
 * - User deletes an item with no links: 0 links deleted (safe operation)
 */
export async function deleteEntityLinks(userId, entityType, entityId) {
  // =====================================================
  // DELETE ALL LINKS (BOTH DIRECTIONS)
  // =====================================================
  // We use MongoDB's $or operator to match either condition:
  // 1. This entity is the SOURCE (outgoing links FROM this entity)
  // 2. This entity is the TARGET (incoming links TO this entity)
  //
  // This deletes everything in one query, which is fast and atomic
  const result = await Link.deleteMany({
    userId,  // Only delete this user's links
    $or: [
      // OUTGOING: This entity is the source (pointing to others)
      // Example: Note A → Task B (if deleting Note A, delete this)
      { sourceType: entityType, sourceId: entityId },
      // INCOMING: This entity is the target (others pointing to it)
      // Example: Note C → Note A (if deleting Note A, delete this)
      { targetType: entityType, targetId: entityId }
    ]
  });

  // =====================================================
  // RETURN COUNT OF DELETED LINKS
  // =====================================================
  // Caller can use this to log cleanup or display to user
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
