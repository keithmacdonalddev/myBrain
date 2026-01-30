/**
 * =============================================================================
 * NOTESERVICE.JS - Note Management Business Logic
 * =============================================================================
 *
 * This service handles all business logic for notes in myBrain.
 * It provides CRUD operations, search, filtering, and special features
 * like the inbox system and note-to-task conversion.
 *
 * WHAT ARE NOTES?
 * ---------------
 * Notes are the primary content type in myBrain. They're freeform text
 * documents that can be organized with tags, linked to projects, and
 * connected to other items.
 *
 * KEY FEATURES:
 * -------------
 * 1. CRUD: Create, read, update, delete notes
 * 2. SEARCH: Full-text search with filters
 * 3. INBOX: Unprocessed notes waiting for organization
 * 4. LIFECYCLE: Active → Archived → Trashed
 * 5. TAGGING: Add tags for organization
 * 6. LINKING: Connect to projects and other entities
 * 7. CONVERSION: Transform notes into tasks
 *
 * NOTE LIFECYCLE:
 * ---------------
 * 1. ACTIVE: Normal state, visible in notes list
 * 2. ARCHIVED: Hidden from main view, still accessible
 * 3. TRASHED: In trash, will be permanently deleted
 *
 * INBOX SYSTEM:
 * -------------
 * Notes start as "unprocessed" (in the inbox). Once the user has
 * reviewed and organized a note, it's marked as "processed" and
 * leaves the inbox.
 *
 * WHY SEPARATE SERVICE FROM ROUTES?
 * ---------------------------------
 * - Routes handle HTTP (requests, responses, validation)
 * - Services handle business logic (database operations, rules)
 * - This separation makes testing easier and code more reusable
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS - Loading Dependencies
// =============================================================================
// This section imports the modules and dependencies we need to implement note operations.
// Each import represents functionality that makes the note service work.

/**
 * Note model represents a note document in MongoDB.
 * Contains the schema, validation logic, and helper methods for notes.
 * We use this to create, read, update, and delete notes from the database.
 */
import Note from '../models/Note.js';

/**
 * Task model represents a task document in MongoDB.
 * We import this for note-to-task conversion feature.
 * When converting notes to actionable tasks, we create Task documents.
 */
import Task from '../models/Task.js';

/**
 * Link model manages relationships between different entities (note→task, note→note, etc.).
 * When we convert a note to a task, we create a Link to preserve the relationship.
 * This lets users see "This task was converted from Note X".
 */
import Link from '../models/Link.js';

/**
 * Tag model tracks user-defined labels for organization.
 * When notes are created or updated with tags, we track the tag usage count.
 * This helps with tag suggestions and analytics.
 */
import Tag from '../models/Tag.js';

/**
 * Usage tracking service tracks what users are doing for analytics and smart suggestions.
 * We track: creates (new notes), views (opened notes), edits (modified notes).
 * This powers the intelligent dashboard feature.
 */
import { trackCreate, trackView, trackEdit } from './usageService.js';

// =============================================================================
// CREATE NOTE
// =============================================================================

/**
 * createNote(userId, data)
 * ------------------------
 * Creates a new note for a user.
 *
 * @param {ObjectId} userId - The user creating the note
 * @param {Object} data - Note data
 *   - data.title: Note title (optional, defaults to '')
 *   - data.body: Note content (optional, defaults to '')
 *   - data.tags: Array of tag names (optional)
 *   - data.pinned: Whether note is pinned (optional)
 *   - data.lifeAreaId: Associated life area (optional)
 *   - data.projectId: Associated project (optional)
 *
 * @returns {Object} The created Note document
 *
 * WHAT HAPPENS:
 * 1. Create the note in database
 * 2. Track tag usage (increment usage counts)
 * 3. If linked to a project, update the project's linkedNoteIds
 *
 * NEW NOTES START AS:
 * - status: 'active'
 * - processed: false (in inbox)
 *
 * EXAMPLE:
 * ```javascript
 * const note = await createNote(userId, {
 *   title: 'Meeting Notes',
 *   body: 'Discussed project timeline...',
 *   tags: ['meeting', 'project'],
 *   lifeAreaId: workAreaId
 * });
 * ```
 */
export async function createNote(userId, data) {
  // Extract tags, defaulting to empty array if not provided
  const tags = data.tags || [];

  // Create the note document
  const note = new Note({
    userId,
    title: data.title || '',
    body: data.body || '',
    tags,
    pinned: data.pinned || false,
    lifeAreaId: data.lifeAreaId || null,
    projectId: data.projectId || null,
  });

  // Save to database
  await note.save();

  // Track tag usage - increment usage count for each tag
  // This helps with tag suggestions and analytics
  if (tags.length > 0) {
    await Tag.trackUsage(userId, tags);
  }

  // If the note is linked to a project, update the project's list of linked notes
  // This maintains the bidirectional relationship
  if (data.projectId) {
    // Dynamic import to avoid circular dependency issues
    const Project = (await import('../models/Project.js')).default;
    const project = await Project.findById(data.projectId);
    if (project) {
      await project.linkNote(note._id);
    }
  }

  // Track usage for intelligent dashboard
  trackCreate(userId, 'notes');

  return note;
}

// =============================================================================
// GET NOTES (WITH SEARCH AND FILTERS)
// =============================================================================

/**
 * getNotes(userId, options)
 * -------------------------
 * Gets notes for a user with optional search and filtering.
 *
 * WHAT THIS DOES:
 * Retrieves notes matching search criteria and filters. Handles complex
 * queries like full-text search, tag filtering, status filtering, and more.
 *
 * WHY DELEGATE TO MODEL?
 * The Note model's searchNotes() method contains the complex query logic.
 * This service function acts as a wrapper, providing a clean interface
 * while keeping search implementation in the model.
 *
 * SEARCH & FILTER OPTIONS:
 * - search: Full-text search across title and body
 * - tags: Filter notes by tags (note can have multiple tags)
 * - status: Filter by status (active, archived, trashed)
 * - lifeAreaId: Filter by associated life area
 * - projectId: Filter by associated project
 * - sort: Field and direction (e.g., '-updatedAt' for newest first)
 * - limit: Maximum number of results (pagination)
 * - skip: Offset for pagination
 *
 * RETURNED OBJECT STRUCTURE:
 * {
 *   notes: [{ _id, title, body, tags, status, ... }, ...],
 *   total: 42,
 *   page: 1,
 *   limit: 20
 * }
 *
 * @param {ObjectId} userId - The user whose notes to retrieve
 * @param {Object} [options={}] - Search and filter options
 *   - options.search: Text to search for (optional)
 *   - options.tags: Filter by tags array (optional)
 *   - options.status: 'active' | 'archived' | 'trashed' (optional)
 *   - options.lifeAreaId: Life area ID to filter by (optional)
 *   - options.projectId: Project ID to filter by (optional)
 *   - options.sort: Sort field with direction (optional, default: '-updatedAt')
 *   - options.limit: Max results (optional, default varies)
 *   - options.skip: Pagination offset (optional, default: 0)
 *
 * @returns {Promise<Object>} Search results with pagination metadata
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Simple search
 * const results = await getNotes(userId, {
 *   search: 'project alpha'
 * });
 *
 * // Complex filtered search
 * const results = await getNotes(userId, {
 *   search: 'project alpha',
 *   tags: ['meeting', 'action-item'],
 *   status: 'active',
 *   sort: '-updatedAt',
 *   limit: 20,
 *   skip: 0
 * });
 *
 * // Get archived notes
 * const archived = await getNotes(userId, {
 *   status: 'archived'
 * });
 *
 * // Pagination example
 * const page1 = await getNotes(userId, {
 *   limit: 20,
 *   skip: 0
 * });
 * const page2 = await getNotes(userId, {
 *   limit: 20,
 *   skip: 20
 * });
 * ```
 */
export async function getNotes(userId, options = {}) {
  // =====================================================
  // DELEGATE TO MODEL'S SEARCH METHOD
  // =====================================================
  // The Note model's searchNotes() method handles:
  // - Full-text search queries
  // - Tag filtering and matching
  // - Status filtering
  // - Sorting and pagination
  // - Complex MongoDB aggregation if needed
  // This keeps all search logic in one place for consistency
  return Note.searchNotes(userId, options);
}

// =============================================================================
// GET SINGLE NOTE
// =============================================================================

/**
 * getNoteById(userId, noteId)
 * ---------------------------
 * Retrieves a single note by its ID with ownership verification.
 *
 * WHAT THIS DOES:
 * Fetches a specific note document for viewing or editing. Verifies
 * that the note belongs to the requesting user.
 *
 * SECURITY IMPLEMENTATION:
 * Requires BOTH noteId AND userId to match. This is crucial because:
 * - If only checking noteId, attackers could guess IDs and read notes
 * - By requiring userId, we ensure "query by ID where ID matches AND user matches"
 * - Returns null if either ID doesn't match (no error message leakage)
 *
 * USAGE TRACKING:
 * When a note is accessed, we track it for the intelligent dashboard.
 * This helps power "What should I work on next?" recommendations.
 *
 * @param {ObjectId} userId - The user who owns the note (for authorization)
 * @param {ObjectId} noteId - The note's unique ID
 *
 * @returns {Promise<Object|null>} The Note document, or null if not found or user unauthorized
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Get a note for display
 * const note = await getNoteById(userId, noteId);
 * if (!note) {
 *   return res.status(404).json({ error: 'Note not found' });
 * }
 * res.json(note);
 *
 * // Calling with wrong user ID returns null (access denied)
 * const hack = await getNoteById(maliciousUserId, noteId);
 * // hack === null, can't access someone else's notes
 *
 * // Load note for editing
 * const noteToEdit = await getNoteById(userId, noteId);
 * if (noteToEdit) {
 *   noteToEdit.title = 'Updated';
 *   await noteToEdit.save();
 * }
 * ```
 */
export async function getNoteById(userId, noteId) {
  // =====================================================
  // QUERY BY ID AND USER ID (AUTHORIZATION)
  // =====================================================
  // Both conditions must match for the note to be returned
  // If either doesn't match, findOne returns null
  const note = await Note.findOne({ _id: noteId, userId });

  // =====================================================
  // TRACK VIEW FOR INTELLIGENT DASHBOARD
  // =====================================================
  // Record that user viewed this note
  // Powers "recently viewed", "what to work on next", etc.
  if (note) {
    trackView(userId, 'notes');
  }

  return note;
}

// =============================================================================
// UPDATE NOTE
// =============================================================================

/**
 * updateNote(userId, noteId, updates)
 * -----------------------------------
 * Updates a note with new data.
 *
 * @param {ObjectId} userId - The user who owns the note
 * @param {ObjectId} noteId - The note to update
 * @param {Object} updates - Fields to update
 *   - Can include: title, body, tags, pinned, lifeAreaId, projectId
 *   - Cannot include: _id, userId, createdAt (protected fields)
 *
 * @returns {Object|null} The updated Note document, or null if not found
 *
 * PROTECTED FIELDS:
 * Certain fields are removed from updates to prevent:
 * - Changing ownership (userId)
 * - Changing immutable fields (_id, createdAt)
 *
 * TAG TRACKING:
 * When tags change, we:
 * 1. Find which tags were added
 * 2. Find which tags were removed
 * 3. Increment counts for added tags
 * 4. Decrement counts for removed tags
 *
 * EXAMPLE:
 * ```javascript
 * const note = await updateNote(userId, noteId, {
 *   title: 'Updated Title',
 *   tags: ['new-tag', 'existing-tag']
 * });
 * ```
 */
export async function updateNote(userId, noteId, updates) {
  // Remove protected fields that shouldn't be directly updated
  delete updates._id;         // Can't change document ID
  delete updates.userId;      // Can't change ownership
  delete updates.createdAt;   // Can't change creation time

  // If tags are being updated, we need to track the changes
  let oldTags = [];
  if (updates.tags) {
    // Get the note's current tags before updating
    const existingNote = await Note.findOne({ _id: noteId, userId });
    if (existingNote) {
      oldTags = existingNote.tags || [];
    }
  }

  // Update the note in database
  const note = await Note.findOneAndUpdate(
    { _id: noteId, userId },      // Query: find by ID and verify ownership
    { $set: updates },             // Update: set the new values
    { new: true, runValidators: true }  // Options: return updated doc, validate
  );

  // Track tag usage changes
  if (updates.tags && note) {
    const newTags = updates.tags || [];

    // Find tags that were added (in new but not in old)
    const addedTags = newTags.filter(t => !oldTags.includes(t));

    // Find tags that were removed (in old but not in new)
    const removedTags = oldTags.filter(t => !newTags.includes(t));

    // Increment usage for newly added tags
    if (addedTags.length > 0) {
      await Tag.trackUsage(userId, addedTags);
    }

    // Decrement usage for removed tags
    if (removedTags.length > 0) {
      await Tag.decrementUsage(userId, removedTags);
    }
  }

  // Track edit for intelligent dashboard
  if (note) {
    trackEdit(userId, 'notes');
  }

  return note;
}

// =============================================================================
// DELETE NOTE
// =============================================================================

/**
 * deleteNote(userId, noteId)
 * --------------------------
 * Permanently deletes a note from the database.
 *
 * WHAT THIS DOES:
 * Removes a note document and all its data from MongoDB.
 * This is a permanent, irreversible deletion.
 *
 * DELETION vs TRASH:
 * - trashNote(): Soft delete (status: 'trashed'), can be recovered
 * - deleteNote(): Hard delete, permanent removal
 *
 * IMPORTANT WARNINGS:
 * - This cannot be undone
 * - The note's data is lost forever
 * - Linked items (tasks, other notes) are NOT deleted
 * - Links to this note become orphaned (should be cleaned separately)
 * - Tag usage counts are NOT decremented (should be handled separately)
 *
 * WHEN TO USE PERMANENT DELETE:
 * - Removing permanently trashed notes (old trash cleanup)
 * - Handling user data deletion requests (GDPR, etc.)
 * - Cleaning up from trash after retention period
 *
 * WHEN NOT TO USE:
 * - User accidentally deleting a note (use trash instead)
 * - User wants to "archive" a note (use archiveNote instead)
 * - User wants to hide but keep a note (use trashNote instead)
 *
 * CLEANUP CONSIDERATIONS:
 * Before calling this, consider:
 * 1. Should linked task/notes be updated? (See linkService)
 * 2. Should tag usage counts be decremented? (See Tag.decrementUsage)
 * 3. Should Links pointing to this note be deleted? (See Link model)
 * 4. Is user aware this is permanent?
 *
 * @param {ObjectId} userId - The user who owns the note (for authorization)
 * @param {ObjectId} noteId - The note to delete
 *
 * @returns {Promise<Object|null>} The deleted Note document (before deletion), or null if not found
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Permanently delete a note (with confirmation)
 * if (confirm('This will permanently delete the note. Continue?')) {
 *   const deleted = await deleteNote(userId, noteId);
 *   if (deleted) {
 *     console.log('Note permanently deleted');
 *   } else {
 *     console.log('Note not found');
 *   }
 * }
 *
 * // Clean up a trashed note after 30 days
 * const oldTrashed = await Note.findOne({
 *   userId,
 *   status: 'trashed',
 *   trashedAt: { $lt: thirtyDaysAgo }
 * });
 * if (oldTrashed) {
 *   await deleteNote(userId, oldTrashed._id);
 * }
 * ```
 */
export async function deleteNote(userId, noteId) {
  // =====================================================
  // PERMANENT DELETE
  // =====================================================
  // findOneAndDelete removes the document and returns it
  // Query by ID and user ID for authorization
  const result = await Note.findOneAndDelete({ _id: noteId, userId });

  return result;
}

// =============================================================================
// PIN/UNPIN NOTE
// =============================================================================

/**
 * pinNote(userId, noteId, pinned)
 * -------------------------------
 * Pins or unpins a note.
 *
 * @param {ObjectId} userId - The user who owns the note
 * @param {ObjectId} noteId - The note to pin/unpin
 * @param {boolean} pinned - True to pin, false to unpin (default: true)
 *
 * @returns {Object|null} The updated Note document
 *
 * WHAT IS PINNING?
 * ----------------
 * Pinned notes appear at the top of note lists. Use this for:
 * - Important reference notes
 * - Frequently accessed notes
 * - Notes you're actively working on
 *
 * EXAMPLE:
 * ```javascript
 * // Pin a note
 * await pinNote(userId, noteId, true);
 *
 * // Unpin a note
 * await pinNote(userId, noteId, false);
 * ```
 */
export async function pinNote(userId, noteId, pinned = true) {
  const note = await Note.findOneAndUpdate(
    { _id: noteId, userId },
    { $set: { pinned } },
    { new: true }
  );
  return note;
}

// =============================================================================
// ARCHIVE NOTE
// =============================================================================

/**
 * archiveNote(userId, noteId)
 * ---------------------------
 * Archives a note (hides from main view but keeps accessible).
 *
 * @param {ObjectId} userId - The user who owns the note
 * @param {ObjectId} noteId - The note to archive
 *
 * @returns {Object|null} The updated Note document
 *
 * WHAT IS ARCHIVING?
 * ------------------
 * Archived notes are hidden from the main notes list but can still be:
 * - Searched for and found
 * - Accessed via direct link
 * - Restored to active status
 *
 * USE ARCHIVE FOR:
 * - Completed project notes
 * - Old reference material
 * - Notes you don't need daily but want to keep
 *
 * ARCHIVE VS TRASH:
 * - Archive: Out of sight, fully preserved
 * - Trash: Pending deletion, may be purged
 *
 * ONLY ARCHIVES ACTIVE NOTES:
 * The query includes status: 'active' to prevent archiving
 * notes that are already archived or trashed.
 */
export async function archiveNote(userId, noteId) {
  const note = await Note.findOneAndUpdate(
    { _id: noteId, userId, status: 'active' },  // Only archive active notes
    { $set: { status: 'archived' } },
    { new: true }
  );
  return note;
}

// =============================================================================
// UNARCHIVE NOTE
// =============================================================================

/**
 * unarchiveNote(userId, noteId)
 * -----------------------------
 * Restores an archived note to active status.
 *
 * @param {ObjectId} userId - The user who owns the note
 * @param {ObjectId} noteId - The note to unarchive
 *
 * @returns {Object|null} The updated Note document
 *
 * ONLY UNARCHIVES ARCHIVED NOTES:
 * The query includes status: 'archived' to ensure we only
 * unarchive notes that are actually archived.
 *
 * EXAMPLE:
 * ```javascript
 * // Restore an archived note
 * const note = await unarchiveNote(userId, noteId);
 * // note.status is now 'active'
 * ```
 */
export async function unarchiveNote(userId, noteId) {
  const note = await Note.findOneAndUpdate(
    { _id: noteId, userId, status: 'archived' },
    { $set: { status: 'active' } },
    { new: true }
  );
  return note;
}

// =============================================================================
// TRASH NOTE (SOFT DELETE)
// =============================================================================

/**
 * trashNote(userId, noteId)
 * -------------------------
 * Moves a note to the trash (soft delete).
 *
 * @param {ObjectId} userId - The user who owns the note
 * @param {ObjectId} noteId - The note to trash
 *
 * @returns {Object|null} The updated Note document
 *
 * WHAT IS SOFT DELETE?
 * --------------------
 * Instead of permanently deleting, we:
 * 1. Set status to 'trashed'
 * 2. Record when it was trashed (trashedAt)
 *
 * WHY SOFT DELETE?
 * - Users can recover accidentally deleted notes
 * - Trash can be emptied later (in bulk)
 * - Prevents accidental data loss
 *
 * TRASHEDAT TIMESTAMP:
 * Records when the note was trashed. This is used for:
 * - Showing "Trashed 3 days ago"
 * - Auto-purge logic (delete notes trashed > 30 days)
 *
 * CAN TRASH FROM:
 * - Active notes
 * - Archived notes
 * - But NOT already trashed notes ($ne: 'trashed')
 */
export async function trashNote(userId, noteId) {
  const note = await Note.findOneAndUpdate(
    { _id: noteId, userId, status: { $ne: 'trashed' } },  // Not already trashed
    {
      $set: {
        status: 'trashed',
        trashedAt: new Date()  // Record when trashed
      }
    },
    { new: true }
  );
  return note;
}

// =============================================================================
// RESTORE NOTE FROM TRASH
// =============================================================================

/**
 * restoreNote(userId, noteId)
 * ---------------------------
 * Restores a trashed note back to active status.
 *
 * @param {ObjectId} userId - The user who owns the note
 * @param {ObjectId} noteId - The note to restore
 *
 * @returns {Object|null} The updated Note document
 *
 * RESTORES TO ACTIVE:
 * Regardless of previous state, restored notes become 'active'.
 * If they were archived before trashing, they need to be
 * re-archived manually.
 *
 * CLEARS TRASHEDAT:
 * Sets trashedAt to null since the note is no longer trashed.
 */
export async function restoreNote(userId, noteId) {
  const note = await Note.findOneAndUpdate(
    { _id: noteId, userId, status: 'trashed' },
    {
      $set: {
        status: 'active',
        trashedAt: null  // Clear the trashed timestamp
      }
    },
    { new: true }
  );
  return note;
}

// =============================================================================
// MARK NOTE AS OPENED
// =============================================================================

/**
 * markNoteAsOpened(userId, noteId)
 * --------------------------------
 * Updates the lastOpenedAt timestamp for a note.
 *
 * @param {ObjectId} userId - The user who owns the note
 * @param {ObjectId} noteId - The note being opened
 *
 * @returns {Object|null} The updated Note document
 *
 * WHY TRACK LAST OPENED?
 * ----------------------
 * - "Continue where you left off" feature
 * - Recent notes sorting
 * - Usage analytics
 *
 * WHEN TO CALL:
 * Call this when a user opens a note to view or edit it.
 * Don't call on list views, only on full note display.
 */
export async function markNoteAsOpened(userId, noteId) {
  const note = await Note.findOneAndUpdate(
    { _id: noteId, userId },
    { $set: { lastOpenedAt: new Date() } },
    { new: true }
  );
  return note;
}

// =============================================================================
// GET USER'S UNIQUE TAGS
// =============================================================================

/**
 * getUserTags(userId)
 * -------------------
 * Gets all unique tags used in a user's notes with usage counts.
 *
 * @param {ObjectId} userId - The user whose tags to retrieve
 *
 * @returns {Array} Array of { tag, count } objects sorted by count
 *
 * HOW IT WORKS:
 * Uses MongoDB aggregation pipeline:
 * 1. Match only active notes for this user
 * 2. Unwind tags array (creates one doc per tag)
 * 3. Group by tag name, count occurrences
 * 4. Sort by count (most used first)
 * 5. Format the output
 *
 * RETURNED FORMAT:
 * ```javascript
 * [
 *   { tag: 'work', count: 45 },
 *   { tag: 'meeting', count: 23 },
 *   { tag: 'project', count: 15 },
 *   // ...
 * ]
 * ```
 *
 * USE CASES:
 * - Tag autocomplete suggestions
 * - Tag cloud display
 * - Finding commonly used tags
 */
export async function getUserTags(userId) {
  const result = await Note.aggregate([
    // Stage 1: Match only active notes for this user
    { $match: { userId: userId, status: 'active' } },

    // Stage 2: Unwind the tags array
    // A note with tags ['a', 'b'] becomes two documents
    { $unwind: '$tags' },

    // Stage 3: Group by tag and count occurrences
    { $group: { _id: '$tags', count: { $sum: 1 } } },

    // Stage 4: Sort by count (descending - most used first)
    { $sort: { count: -1 } },

    // Stage 5: Format output (rename _id to tag)
    { $project: { tag: '$_id', count: 1, _id: 0 } }
  ]);
  return result;
}

// =============================================================================
// GET RECENT NOTES
// =============================================================================

/**
 * getRecentNotes(userId, limit)
 * -----------------------------
 * Gets the most recently updated notes (for dashboard).
 *
 * @param {ObjectId} userId - The user whose notes to retrieve
 * @param {number} limit - Maximum number of notes (default: 5)
 *
 * @returns {Array} Array of Note documents
 *
 * USED FOR:
 * - Dashboard "Recent Notes" section
 * - Quick access to recent work
 *
 * SORTED BY:
 * updatedAt descending (newest first)
 */
export async function getRecentNotes(userId, limit = 5) {
  const notes = await Note.find({ userId, status: 'active' })
    .sort({ updatedAt: -1 })
    .limit(limit);
  return notes;
}

// =============================================================================
// GET PINNED NOTES
// =============================================================================

/**
 * getPinnedNotes(userId)
 * ----------------------
 * Gets all pinned notes for a user.
 *
 * @param {ObjectId} userId - The user whose pinned notes to retrieve
 *
 * @returns {Array} Array of pinned Note documents
 *
 * SORTED BY:
 * updatedAt descending (most recently updated pinned notes first)
 */
export async function getPinnedNotes(userId) {
  const notes = await Note.find({ userId, status: 'active', pinned: true })
    .sort({ updatedAt: -1 });
  return notes;
}

// =============================================================================
// GET LAST OPENED NOTE
// =============================================================================

/**
 * getLastOpenedNote(userId)
 * -------------------------
 * Gets the most recently opened note (for "Continue" feature).
 *
 * @param {ObjectId} userId - The user whose last note to find
 *
 * @returns {Object|null} The most recently opened Note, or null
 *
 * "CONTINUE WHERE YOU LEFT OFF":
 * This enables a feature where users can quickly return to
 * whatever they were last working on.
 *
 * REQUIRES LASTOPENEDAT:
 * Only returns notes that have actually been opened
 * (lastOpenedAt is not null).
 */
export async function getLastOpenedNote(userId) {
  const note = await Note.findOne({
    userId,
    status: 'active',
    lastOpenedAt: { $ne: null }  // Must have been opened
  })
    .sort({ lastOpenedAt: -1 });  // Most recently opened
  return note;
}

// =============================================================================
// INBOX FUNCTIONS
// =============================================================================

/**
 * getInboxNotes(userId, options)
 * ------------------------------
 * Gets unprocessed notes (inbox) for a user.
 *
 * @param {ObjectId} userId - The user whose inbox to retrieve
 * @param {Object} options - Pagination and sort options
 *   - options.sort: Sort field (default: '-createdAt')
 *   - options.limit: Max results (default: 50)
 *   - options.skip: Pagination offset (default: 0)
 *
 * @returns {Object} { notes: Array, total: number }
 *
 * WHAT IS THE INBOX?
 * ------------------
 * The inbox contains notes that haven't been "processed" yet.
 * Processing means organizing the note (adding tags, moving to
 * a project, converting to task, etc.).
 *
 * INBOX WORKFLOW:
 * 1. Quick capture creates unprocessed note
 * 2. User later reviews inbox
 * 3. User organizes each note
 * 4. Processed notes leave inbox
 */
export async function getInboxNotes(userId, options = {}) {
  const {
    sort = '-createdAt',    // Default: newest first
    limit = 50,             // Default: 50 notes
    skip = 0                // Default: no offset
  } = options;

  // Build the query
  const query = {
    userId,
    processed: false,   // Only unprocessed notes
    status: 'active'    // Only active notes
  };

  // Parse sort string into sort object
  // '-createdAt' becomes { createdAt: -1 }
  // 'title' becomes { title: 1 }
  let sortObj = {};
  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1;  // Descending
  } else {
    sortObj[sort] = 1;  // Ascending
  }

  // Execute query with pagination
  const notes = await Note.find(query)
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  // Get total count for pagination
  const total = await Note.countDocuments(query);

  return { notes, total };
}

/**
 * getInboxCount(userId)
 * ---------------------
 * Gets the count of unprocessed notes (inbox count).
 *
 * @param {ObjectId} userId - The user whose inbox count to get
 *
 * @returns {number} Number of notes in inbox
 *
 * USED FOR:
 * - Displaying badge count on inbox icon
 * - Showing "X items need review"
 */
export async function getInboxCount(userId) {
  return Note.countDocuments({
    userId,
    processed: false,
    status: 'active'
  });
}

// =============================================================================
// PROCESS/UNPROCESS NOTE
// =============================================================================

/**
 * processNote(userId, noteId)
 * ---------------------------
 * Marks a note as processed (removes from inbox).
 *
 * @param {ObjectId} userId - The user who owns the note
 * @param {ObjectId} noteId - The note to process
 *
 * @returns {Object|null} The updated Note document
 *
 * CALL WHEN:
 * - User adds tags to an inbox note
 * - User moves note to a project
 * - User manually clicks "Done" on inbox item
 */
export async function processNote(userId, noteId) {
  const note = await Note.findOneAndUpdate(
    { _id: noteId, userId },
    { $set: { processed: true } },
    { new: true }
  );
  return note;
}

/**
 * unprocessNote(userId, noteId)
 * -----------------------------
 * Marks a note as unprocessed (returns to inbox).
 *
 * @param {ObjectId} userId - The user who owns the note
 * @param {ObjectId} noteId - The note to unprocess
 *
 * @returns {Object|null} The updated Note document
 *
 * CALL WHEN:
 * - User wants to review the note again
 * - User removes all organization from a note
 */
export async function unprocessNote(userId, noteId) {
  const note = await Note.findOneAndUpdate(
    { _id: noteId, userId },
    { $set: { processed: false } },
    { new: true }
  );
  return note;
}

// =============================================================================
// CONVERT NOTE TO TASK
// =============================================================================

/**
 * convertToTask(userId, noteId, keepNote)
 * ---------------------------------------
 * Converts a note into a task (actionable item).
 *
 * WHAT THIS DOES:
 * Transforms a note (information) into a task (action item) by:
 * 1. Creating a new Task document with the note's content
 * 2. Optionally keeping the note for reference or deleting it
 * 3. Creating a link between the task and note (if keeping)
 *
 * BUSINESS LOGIC:
 * Notes and Tasks are different:
 * - Note: "Research vacation destinations" (information)
 * - Task: "Book flights" (action with deadline)
 *
 * This function bridges the gap when a note becomes actionable.
 *
 * THE KEEPNOTE DECISION:
 * When keepNote=true:
 * - Preserves the note as context/reference material
 * - Creates a "converted_from" link for traceability
 * - Marks note as processed (organized)
 * - Useful when note has detail the task doesn't need
 *
 * When keepNote=false:
 * - Deletes the original note
 * - Consolidates into a single document (the task)
 * - Cleaner organization, no duplication
 * - Best when note and task are essentially the same
 *
 * DATA MIGRATION:
 * From note to task:
 * - title → title
 * - body → body
 * - tags → tags
 * - lifeAreaId → NOT copied (user sets separately)
 * - projectId → NOT copied (user sets separately)
 *
 * LINKING:
 * A Link document with linkType 'converted_from' creates:
 * - Visibility: "This task came from Note X"
 * - Traceability: Can find original context
 * - Navigation: Can click to see the original note
 *
 * @param {ObjectId} userId - The user who owns the note
 * @param {ObjectId} noteId - The note to convert into a task
 * @param {boolean} [keepNote=true] - Keep the original note? Default: true
 *
 * @returns {Promise<Object|null>} { task, note } object or null
 *   - task: The created Task document (never null if note found)
 *   - note: The Note document if keepNote=true, else null
 *
 * @throws {Error} If database operations fail
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Convert and keep the note for reference
 * const result = await convertToTask(userId, noteId, true);
 * if (result) {
 *   const { task, note } = result;
 *   console.log(`Task created from note: ${task.title}`);
 *   console.log(`Original note preserved for reference`);
 * }
 *
 * // Convert and delete the note (consolidate)
 * const result = await convertToTask(userId, noteId, false);
 * if (result) {
 *   const { task } = result;
 *   console.log(`Task created, note removed`);
 * }
 *
 * // Handle note not found
 * const result = await convertToTask(userId, unknownNoteId, true);
 * if (!result) {
 *   console.log('Note not found or access denied');
 * }
 * ```
 */
export async function convertToTask(userId, noteId, keepNote = true) {
  // =====================================================
  // VALIDATE THE NOTE EXISTS
  // =====================================================
  // Find the note to convert
  const note = await Note.findOne({ _id: noteId, userId });

  // If note not found or user doesn't own it, return null
  if (!note) return null;

  // =====================================================
  // CREATE THE TASK FROM NOTE CONTENT
  // =====================================================
  // Migrate relevant content from note to task
  const task = new Task({
    userId,
    title: note.title || 'Untitled Task',  // Task title from note
    body: note.body,                        // Detailed content
    tags: note.tags,                        // Tags for organization
    sourceNoteId: keepNote ? noteId : null, // Track origin if keeping
    linkedNoteIds: keepNote ? [noteId] : [] // Link to note if keeping
  });

  // Save the task to the database
  await task.save();

  // =====================================================
  // HANDLE THE ORIGINAL NOTE
  // =====================================================

  if (keepNote) {
    // =====================================================
    // OPTION 1: KEEP THE NOTE
    // =====================================================
    // Mark the note as processed (organized)
    note.processed = true;
    await note.save();

    // Create a bidirectional link from task to note
    // This enables "This task was converted from Note X" navigation
    // linkType 'converted_from' indicates the relationship
    await Link.create({
      userId,
      sourceType: 'task',      // Who created the link
      sourceId: task._id,      // The task ID
      targetType: 'note',      // What it links to
      targetId: noteId,        // The note ID
      linkType: 'converted_from' // Type of relationship
    });

    return { task, note };
  } else {
    // =====================================================
    // OPTION 2: DELETE THE NOTE
    // =====================================================
    // Remove the original note completely
    // The task now contains all the information
    await Note.deleteOne({ _id: noteId, userId });
    return { task, note: null };
  }
}

// =============================================================================
// GET NOTE BACKLINKS
// =============================================================================

/**
 * getNoteBacklinks(userId, noteId, options)
 * -----------------------------------------
 * Gets all entities that link to (reference) a specific note with pagination.
 *
 * WHAT THIS DOES:
 * Finds all items (notes, tasks, etc.) that have created links TO this note.
 * Shows "incoming" references - who cites or references this note.
 *
 * BACKLINKS ENABLE:
 * - "See what uses this note" - navigation feature
 * - Understanding note usage and impact
 * - Finding related content (notes that link to this one)
 * - Knowing what task was created from this note
 *
 * COMMON LINK TYPES:
 * - 'reference': A note or task references this note
 * - 'converted_from': A task was created by converting this note
 * - 'related': Notes marked as related to this one
 *
 * PAGINATION:
 * Uses limit/skip options to control the number of results returned.
 * This prevents performance issues when notes have many backlinks.
 *
 * MISSING SOURCES:
 * If a source entity (note or task) was deleted:
 * - The Link document still exists (orphaned link)
 * - We fetch it and find no corresponding entity
 * - Filter it out (don't return links to non-existent items)
 * This keeps backlinks clean and current
 *
 * DATA FLOW:
 * 1. Find all Link documents where targetId=noteId and targetType='note'
 * 2. For each link, fetch the source entity (note or task)
 * 3. Add the source data to the link object
 * 4. Filter out links where source was deleted
 * 5. Return the populated links
 *
 * @param {ObjectId} userId - The user who owns the note (for authorization)
 * @param {ObjectId} noteId - The note to find backlinks for
 * @param {Object} [options={}] - Pagination options
 * @param {number} [options.limit=50] - Maximum number of backlinks to return
 * @param {number} [options.skip=0] - Number of backlinks to skip (for pagination)
 *
 * @returns {Promise<Array>} Array of backlink objects
 *   Each object includes:
 *   - _id: Link ID
 *   - sourceType: 'note' | 'task' | other
 *   - sourceId: ID of the linking entity
 *   - linkType: Type of link (reference, converted_from, etc.)
 *   - source: The populated source entity (title, status, etc.)
 *
 * RETURNED FORMAT:
 * ```javascript
 * [
 *   {
 *     _id: 'link123',
 *     sourceType: 'note',
 *     sourceId: 'note456',
 *     linkType: 'reference',
 *     source: {
 *       _id: 'note456',
 *       title: 'Meeting Notes',
 *       body: '...',
 *       // other note properties
 *     }
 *   },
 *   {
 *     _id: 'link456',
 *     sourceType: 'task',
 *     sourceId: 'task789',
 *     linkType: 'converted_from',
 *     source: {
 *       _id: 'task789',
 *       title: 'Review document',
 *       status: 'in_progress',
 *       // other task properties
 *     }
 *   }
 * ]
 * ```
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Get all items that link to this note (default limit 50)
 * const backlinks = await getNoteBacklinks(userId, noteId);
 *
 * // Get first 10 backlinks
 * const backlinks = await getNoteBacklinks(userId, noteId, { limit: 10 });
 *
 * // Get next page of 10 backlinks
 * const nextPage = await getNoteBacklinks(userId, noteId, { limit: 10, skip: 10 });
 *
 * // Check if note was converted to task
 * const converted = backlinks.find(b => b.linkType === 'converted_from');
 * if (converted) {
 *   console.log(`This note was converted to task: ${converted.source.title}`);
 * }
 *
 * // Find all notes that reference this note
 * const referencingNotes = backlinks.filter(b => b.sourceType === 'note');
 * console.log(`${referencingNotes.length} other notes reference this one`);
 *
 * // Display backlinks in note detail view
 * const note = await getNoteById(userId, noteId);
 * const links = await getNoteBacklinks(userId, noteId);
 * // Show: "This note is referenced by: [list of sources]"
 * ```
 */
export async function getNoteBacklinks(userId, noteId, options = {}) {
  // =====================================================
  // EXTRACT PAGINATION OPTIONS
  // =====================================================
  const { limit = 50, skip = 0 } = options;

  // =====================================================
  // FIND ALL LINKS TO THIS NOTE WITH PAGINATION
  // =====================================================
  // Query for links where:
  // - This is the target (targetId = noteId, targetType = 'note')
  // - Results in "links TO this note"
  // Apply limit and skip for pagination to prevent unbounded queries
  const backlinks = await Link.find({
    userId,
    targetType: 'note',
    targetId: noteId
  })
    .limit(limit)
    .skip(skip);

  // =====================================================
  // POPULATE SOURCE ENTITIES
  // =====================================================
  // For each link, fetch the source entity and attach it
  // Process in parallel for efficiency
  const populated = await Promise.all(
    backlinks.map(async (link) => {
      // Convert Link document to safe JSON
      const linkObj = link.toSafeJSON();

      // =====================================================
      // FETCH SOURCE BASED ON TYPE
      // =====================================================
      if (link.sourceType === 'note') {
        // Source is another note - only select necessary fields
        const linkedNote = await Note.findById(link.sourceId)
          .select('title status updatedAt');
        if (linkedNote) {
          // Attach the note data to the link
          linkObj.source = linkedNote.toSafeJSON();
        }
      } else if (link.sourceType === 'task') {
        // Source is a task - only select necessary fields
        const task = await Task.findById(link.sourceId)
          .select('title status dueDate');
        if (task) {
          // Attach the task data to the link
          linkObj.source = task.toSafeJSON();
        }
      }

      return linkObj;
    })
  );

  // =====================================================
  // FILTER OUT ORPHANED LINKS
  // =====================================================
  // Remove links where the source entity no longer exists
  // This keeps backlinks list current and clean
  return populated.filter(l => l.source);
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all note service functions.
 *
 * USAGE:
 * import noteService from './services/noteService.js';
 * const note = await noteService.createNote(userId, data);
 *
 * OR:
 * import { createNote, getNotes } from './services/noteService.js';
 */
export default {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
  pinNote,
  archiveNote,
  unarchiveNote,
  trashNote,
  restoreNote,
  markNoteAsOpened,
  getUserTags,
  getRecentNotes,
  getPinnedNotes,
  getLastOpenedNote,
  getInboxNotes,
  getInboxCount,
  processNote,
  unprocessNote,
  convertToTask,
  getNoteBacklinks
};
