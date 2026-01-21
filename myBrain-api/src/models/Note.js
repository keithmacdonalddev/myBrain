/**
 * =============================================================================
 * NOTE.JS - Note Data Model
 * =============================================================================
 *
 * This file defines the Note model - the data structure for notes in myBrain.
 * Notes are the primary content type where users write and store information.
 *
 * WHAT IS A NOTE?
 * ---------------
 * A note is a piece of text content that a user creates. Notes can:
 * - Have a title and body content
 * - Be organized with tags and life areas
 * - Be linked to projects
 * - Be pinned to stay at the top
 * - Be archived or trashed
 * - Have files attached to them
 *
 * NOTE LIFECYCLE:
 * ---------------
 * 1. Created → status: 'active'
 * 2. Archived → status: 'archived' (hidden but recoverable)
 * 3. Trashed → status: 'trashed' (scheduled for deletion)
 * 4. Deleted → Permanently removed
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
// NOTE SCHEMA DEFINITION
// =============================================================================

/**
 * The Note Schema
 * ---------------
 * Defines all the fields a Note document can have.
 */
const noteSchema = new mongoose.Schema({

  // ===========================================================================
  // OWNERSHIP
  // ===========================================================================

  /**
   * userId: Which user owns this note
   * - Required: Every note must belong to a user
   * - References: Points to a User document in the users collection
   * - Index: Creates a database index for faster lookups by user
   *
   * This is how we know which notes to show when a user logs in.
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB's unique ID type
    ref: 'User',                          // References the User model
    required: true,
    index: true                           // Speed up queries by userId
  },

  // ===========================================================================
  // ORGANIZATION
  // ===========================================================================

  /**
   * lifeAreaId: Which life area category this note belongs to
   * - Optional: Notes don't have to be in a life area
   * - References: Points to a LifeArea document
   *
   * Life areas are broad categories like "Work", "Personal", "Health"
   */
  lifeAreaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LifeArea',
    default: null,
    index: true
  },

  /**
   * projectId: Which project this note is part of
   * - Optional: Notes don't have to be in a project
   * - References: Points to a Project document
   *
   * Projects are specific initiatives like "Website Redesign" or "Move to NYC"
   */
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
    index: true
  },

  // ===========================================================================
  // CONTENT
  // ===========================================================================

  /**
   * title: The note's title/heading
   * - Optional: Notes can exist without a title
   * - Max 200 characters
   * - Trimmed: Removes extra spaces from start/end
   */
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
    default: ''
  },

  /**
   * body: The main content of the note
   * - Can be any length (no maximum)
   * - This is where the user writes their actual notes
   */
  body: {
    type: String,
    default: ''
  },

  /**
   * tags: Labels for categorizing and finding notes
   * - Array of strings like ["work", "important", "todo"]
   * - Users can search/filter by tags
   * - Indexed for fast tag-based queries
   */
  tags: {
    type: [String],
    default: [],
    index: true
  },

  // ===========================================================================
  // STATUS FLAGS
  // ===========================================================================

  /**
   * pinned: Whether this note should appear at the top of lists
   * - Pinned notes are shown first, regardless of date
   * - Useful for important notes the user accesses frequently
   */
  pinned: {
    type: Boolean,
    default: false
  },

  /**
   * status: Current state of the note
   * - 'active': Normal note, visible in the main list
   * - 'archived': Hidden from main list, but still accessible
   * - 'trashed': In the trash, scheduled for eventual deletion
   */
  status: {
    type: String,
    enum: ['active', 'archived', 'trashed'], // Only these values allowed
    default: 'active',
    index: true
  },

  /**
   * trashedAt: When the note was moved to trash
   * - Used to automatically delete old trashed notes
   * - Null if note is not trashed
   */
  trashedAt: {
    type: Date,
    default: null
  },

  /**
   * lastOpenedAt: When the user last viewed this note
   * - Used for "recently accessed" features
   * - Updated each time user opens the note
   */
  lastOpenedAt: {
    type: Date,
    default: null
  },

  /**
   * processed: Whether the note has been processed/reviewed
   * - Used for "inbox" workflow where new notes are unprocessed
   * - User marks notes as processed after reviewing them
   */
  processed: {
    type: Boolean,
    default: false,
    index: true
  },

  // ===========================================================================
  // LINKED FILES
  // ===========================================================================

  /**
   * linkedFileIds: Files attached to this note
   * - Array of File document IDs
   * - Allows users to attach PDFs, images, documents to notes
   */
  linkedFileIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  }]

}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When the note was created
   * - updatedAt: When the note was last modified
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Compound Indexes for Common Queries
 * -----------------------------------
 * These indexes speed up the most common ways notes are queried.
 * Think of them as pre-sorted lists that make finding data faster.
 *
 * Without indexes, every query would scan ALL notes.
 * With indexes, queries jump directly to matching notes.
 */

// For listing a user's notes by status, newest first
// Used by: Main notes list, archive view, trash view
noteSchema.index({ userId: 1, status: 1, createdAt: -1 });

// For listing notes with pinned ones first, then by update time
// Used by: Default note list sorting
noteSchema.index({ userId: 1, pinned: -1, updatedAt: -1 });

// For filtering notes by specific tags
// Used by: Tag filter functionality
noteSchema.index({ userId: 1, tags: 1 });

// For finding unprocessed notes (inbox feature)
// Used by: Inbox view showing new notes to process
noteSchema.index({ userId: 1, processed: 1, status: 1, createdAt: -1 });

// For filtering by life area
// Used by: Life area filtering
noteSchema.index({ userId: 1, lifeAreaId: 1, status: 1 });

// For filtering by project
// Used by: Project view showing linked notes
noteSchema.index({ userId: 1, projectId: 1, status: 1 });

/**
 * Text Index for Full-Text Search
 * --------------------------------
 * This special index enables searching within note content.
 * MongoDB can search through title and body text efficiently.
 *
 * Example: User searches for "meeting notes" → finds notes containing those words
 */
noteSchema.index({ title: 'text', body: 'text' });

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * toSafeJSON()
 * ------------
 * Convert note to a clean JSON object for API responses.
 * Removes internal MongoDB fields like __v (version key).
 *
 * @returns {Object} - Clean note object
 */
noteSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.__v; // Remove MongoDB version field
  return obj;
};

// =============================================================================
// STATIC METHODS
// =============================================================================

/**
 * searchNotes(userId, options)
 * ----------------------------
 * Advanced search function to find notes matching various criteria.
 * Supports text search, filtering, sorting, and pagination.
 *
 * @param {string} userId - ID of the user whose notes to search
 * @param {Object} options - Search options:
 *   - q: Search query text
 *   - status: Filter by status ('active', 'archived', 'trashed', 'all')
 *   - tags: Array of tags to filter by (notes must have ALL tags)
 *   - pinned: Filter by pinned status (true/false/null for any)
 *   - lifeAreaId: Filter by life area
 *   - projectId: Filter by project
 *   - sort: Sort field (default '-updatedAt' = newest first)
 *   - limit: Max results to return (default 50)
 *   - skip: Number of results to skip (for pagination)
 *
 * @returns {Object} - { notes: Array, total: Number }
 *
 * EXAMPLE USAGE:
 * ```
 * const { notes, total } = await Note.searchNotes(userId, {
 *   q: 'meeting',
 *   status: 'active',
 *   tags: ['work'],
 *   limit: 20
 * });
 * ```
 */
noteSchema.statics.searchNotes = async function(userId, options = {}) {
  // Extract options with defaults
  const {
    q = '',              // Search query text
    status = 'active',   // Filter by status
    tags = [],           // Filter by tags
    pinned = null,       // Filter by pinned status
    lifeAreaId = null,   // Filter by life area
    projectId = null,    // Filter by project
    sort = '-updatedAt', // Sort field (- prefix = descending)
    limit = 50,          // Max results
    skip = 0             // Results to skip (pagination)
  } = options;

  // -----------------------------------------
  // BUILD THE QUERY
  // -----------------------------------------

  // Start with the user's notes
  const query = { userId };

  // Filter by status (unless 'all' is specified)
  if (status && status !== 'all') {
    query.status = status;
  }

  // Filter by tags - note must have ALL specified tags
  if (tags.length > 0) {
    query.tags = { $all: tags }; // $all = array contains all values
  }

  // Filter by pinned status if specified
  if (pinned !== null) {
    query.pinned = pinned;
  }

  // Filter by life area if specified
  if (lifeAreaId) {
    query.lifeAreaId = lifeAreaId;
  }

  // Filter by project if specified
  if (projectId) {
    query.projectId = projectId;
  }

  // Add text search if query provided
  if (q && q.trim()) {
    query.$text = { $search: q }; // MongoDB text search
  }

  // -----------------------------------------
  // BUILD THE SORT ORDER
  // -----------------------------------------

  let sortObj = {};

  // If text searching, sort by relevance score first
  if (q && q.trim()) {
    sortObj = { score: { $meta: 'textScore' } };
  }

  // Parse sort string: '-updatedAt' → { updatedAt: -1 }
  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1; // Descending
  } else {
    sortObj[sort] = 1; // Ascending
  }

  // For non-search queries, always show pinned notes first
  if (!q || !q.trim()) {
    sortObj = { pinned: -1, ...sortObj };
  }

  // -----------------------------------------
  // EXECUTE THE QUERY
  // -----------------------------------------

  let queryBuilder = this.find(query);

  // Include text match score if searching
  if (q && q.trim()) {
    queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } });
  }

  // Execute with sort, pagination
  const notes = await queryBuilder
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  // Get total count for pagination info
  const total = await this.countDocuments(query);

  return { notes, total };
};

// =============================================================================
// FILE LINKING METHODS
// =============================================================================

/**
 * linkFile(fileId)
 * ----------------
 * Attach a file to this note.
 * Creates a bidirectional link (note → file and file → note).
 *
 * @param {string} fileId - ID of the file to link
 * @returns {Object} - Updated note
 */
noteSchema.methods.linkFile = async function(fileId) {
  // Only add if not already linked
  if (!this.linkedFileIds.includes(fileId)) {
    // Add file to note's linked files
    this.linkedFileIds.push(fileId);
    await this.save();

    // Also update the file to link back to this note
    const File = mongoose.model('File');
    await File.findByIdAndUpdate(fileId, {
      $addToSet: { linkedNoteIds: this._id } // $addToSet prevents duplicates
    });
  }
  return this;
};

/**
 * unlinkFile(fileId)
 * ------------------
 * Remove a file attachment from this note.
 * Removes the bidirectional link.
 *
 * @param {string} fileId - ID of the file to unlink
 * @returns {Object} - Updated note
 */
noteSchema.methods.unlinkFile = async function(fileId) {
  // Remove from note's linked files
  this.linkedFileIds = this.linkedFileIds.filter(
    id => id.toString() !== fileId.toString()
  );
  await this.save();

  // Also remove from the file's linked notes
  const File = mongoose.model('File');
  await File.findByIdAndUpdate(fileId, {
    $pull: { linkedNoteIds: this._id } // $pull removes from array
  });

  return this;
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the Note model from the schema.
 * This gives us methods to:
 * - Create notes: Note.create({ userId, title, body })
 * - Find notes: Note.find({ userId }), Note.findById(id)
 * - Update notes: Note.findByIdAndUpdate(id, updates)
 * - Delete notes: Note.findByIdAndDelete(id)
 * - Search notes: Note.searchNotes(userId, options)
 */
const Note = mongoose.model('Note', noteSchema);

export default Note;
