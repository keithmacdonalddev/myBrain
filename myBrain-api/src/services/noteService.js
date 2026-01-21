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
// IMPORTS
// =============================================================================

/**
 * Note model - The MongoDB schema for notes.
 */
import Note from '../models/Note.js';

/**
 * Task model - Needed for note-to-task conversion.
 */
import Task from '../models/Task.js';

/**
 * Link model - For creating links when converting notes to tasks.
 */
import Link from '../models/Link.js';

/**
 * Tag model - For tracking tag usage statistics.
 */
import Tag from '../models/Tag.js';

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
 * @param {ObjectId} userId - The user whose notes to retrieve
 * @param {Object} options - Search and filter options
 *   - options.search: Text to search for
 *   - options.tags: Filter by tags
 *   - options.status: Filter by status
 *   - options.lifeAreaId: Filter by life area
 *   - options.projectId: Filter by project
 *   - options.sort: Sort field and direction
 *   - options.limit: Maximum results
 *   - options.skip: Pagination offset
 *
 * @returns {Object} Search results with pagination info
 *
 * DELEGATES TO:
 * Note.searchNotes() - The model has the search logic for consistency
 *
 * EXAMPLE:
 * ```javascript
 * const results = await getNotes(userId, {
 *   search: 'project alpha',
 *   tags: ['meeting'],
 *   status: 'active',
 *   sort: '-updatedAt',
 *   limit: 20
 * });
 * ```
 */
export async function getNotes(userId, options = {}) {
  // Delegate to the Note model's search method
  // This keeps search logic in one place
  return Note.searchNotes(userId, options);
}

// =============================================================================
// GET SINGLE NOTE
// =============================================================================

/**
 * getNoteById(userId, noteId)
 * ---------------------------
 * Gets a single note by its ID.
 *
 * @param {ObjectId} userId - The user who owns the note
 * @param {ObjectId} noteId - The note's unique ID
 *
 * @returns {Object|null} The Note document, or null if not found
 *
 * SECURITY:
 * Requires both noteId AND userId to match. This ensures users
 * can only access their own notes, even if they guess a valid ID.
 *
 * EXAMPLE:
 * ```javascript
 * const note = await getNoteById(userId, noteId);
 * if (!note) {
 *   throw new Error('Note not found');
 * }
 * ```
 */
export async function getNoteById(userId, noteId) {
  // Find note by ID AND user ID (security check)
  const note = await Note.findOne({ _id: noteId, userId });
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
 * @param {ObjectId} userId - The user who owns the note
 * @param {ObjectId} noteId - The note to delete
 *
 * @returns {Object|null} The deleted Note document, or null if not found
 *
 * WARNING:
 * This is a PERMANENT delete. For soft delete, use trashNote() instead.
 *
 * CONSIDER BEFORE CALLING:
 * - Should links to this note be cleaned up? (See linkService)
 * - Should we decrement tag usage counts?
 * - Is the user sure they want permanent deletion?
 *
 * EXAMPLE:
 * ```javascript
 * const deleted = await deleteNote(userId, noteId);
 * if (deleted) {
 *   console.log('Note permanently deleted');
 * }
 * ```
 */
export async function deleteNote(userId, noteId) {
  // Find and delete the note (returns the deleted document)
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
 * Converts a note into a task.
 *
 * @param {ObjectId} userId - The user who owns the note
 * @param {ObjectId} noteId - The note to convert
 * @param {boolean} keepNote - Keep original note? (default: true)
 *
 * @returns {Object|null} { task, note } - The created task and (optional) note
 *
 * HOW IT WORKS:
 * 1. Create a new task with the note's content
 * 2. If keepNote=true: Mark note as processed, create link
 * 3. If keepNote=false: Delete the original note
 *
 * LINKING BEHAVIOR:
 * When keepNote=true, a bidirectional link is created between
 * the task and note, with linkType 'converted_from'.
 *
 * WHY KEEP THE NOTE?
 * - Note may have more context than task needs
 * - Creates a traceable history
 * - User can reference the original
 *
 * WHY DELETE THE NOTE?
 * - Cleaner organization
 * - No duplicate content
 * - User prefers single source
 *
 * EXAMPLE:
 * ```javascript
 * // Convert and keep note
 * const { task, note } = await convertToTask(userId, noteId, true);
 * // task.sourceNoteId = noteId
 *
 * // Convert and delete note
 * const { task, note } = await convertToTask(userId, noteId, false);
 * // note = null
 * ```
 */
export async function convertToTask(userId, noteId, keepNote = true) {
  // Find the note to convert
  const note = await Note.findOne({ _id: noteId, userId });
  if (!note) return null;

  // Create the task from note content
  const task = new Task({
    userId,
    title: note.title || 'Untitled Task',  // Use note title or default
    body: note.body,                        // Copy note body
    tags: note.tags,                        // Copy tags
    sourceNoteId: keepNote ? noteId : null, // Reference to source note
    linkedNoteIds: keepNote ? [noteId] : [] // Link to note if keeping
  });

  await task.save();

  if (keepNote) {
    // Mark the note as processed since it's been converted
    note.processed = true;
    await note.save();

    // Create a bidirectional link from task to note
    // This lets users see "This task was converted from Note X"
    await Link.create({
      userId,
      sourceType: 'task',
      sourceId: task._id,
      targetType: 'note',
      targetId: noteId,
      linkType: 'converted_from'
    });

    return { task, note };
  } else {
    // Delete the original note
    await Note.deleteOne({ _id: noteId, userId });
    return { task, note: null };
  }
}

// =============================================================================
// GET NOTE BACKLINKS
// =============================================================================

/**
 * getNoteBacklinks(userId, noteId)
 * --------------------------------
 * Gets all entities that link to a specific note.
 *
 * @param {ObjectId} userId - The user who owns the note
 * @param {ObjectId} noteId - The note to find backlinks for
 *
 * @returns {Array} Array of link objects with populated sources
 *
 * BACKLINKS SHOW:
 * - Other notes that reference this note
 * - Tasks that were converted from this note
 * - Any other entity linking to this note
 *
 * RETURNED FORMAT:
 * ```javascript
 * [
 *   {
 *     _id: 'link123',
 *     sourceType: 'note',
 *     linkType: 'reference',
 *     source: { title: 'Meeting Notes', ... }
 *   },
 *   {
 *     _id: 'link456',
 *     sourceType: 'task',
 *     linkType: 'converted_from',
 *     source: { title: 'Review document', ... }
 *   }
 * ]
 * ```
 */
export async function getNoteBacklinks(userId, noteId) {
  // Find all links where this note is the target
  const backlinks = await Link.find({
    userId,
    targetType: 'note',
    targetId: noteId
  });

  // Populate the source entities
  const populated = await Promise.all(
    backlinks.map(async (link) => {
      const linkObj = link.toSafeJSON();

      // Fetch source based on type
      if (link.sourceType === 'note') {
        const linkedNote = await Note.findById(link.sourceId);
        if (linkedNote) {
          linkObj.source = linkedNote.toSafeJSON();
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

  // Filter out links where source entity no longer exists
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
