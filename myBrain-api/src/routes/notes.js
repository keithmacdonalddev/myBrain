/**
 * =============================================================================
 * NOTES.JS - Notes CRUD Routes
 * =============================================================================
 *
 * This file handles all note management endpoints in myBrain.
 * Notes are the core content type - freeform text documents that users
 * can create, organize, search, and share.
 *
 * WHAT ARE NOTES?
 * ---------------
 * Notes are text-based documents for capturing ideas, thoughts, and information.
 * They're flexible and support:
 * - Rich text formatting (bold, italic, lists, etc.)
 * - Tags for organization
 * - Linking to projects
 * - Assigning to life areas
 * - Pinning important notes
 *
 * CORE OPERATIONS (CRUD):
 * -----------------------
 * CREATE: Make a new note
 * READ: View note details and content
 * UPDATE: Edit note title, content, metadata
 * DELETE: Remove note (or archive/trash)
 *
 * NOTE LIFECYCLE:
 * ---------------
 * INBOX → ACTIVE → ARCHIVED/TRASHED
 *
 * 1. INBOX: Newly created, unprocessed notes
 *    - Quick capture mode
 *    - Not organized yet
 *    - Waiting for categorization
 *
 * 2. ACTIVE: Organized, visible notes
 *    - Has tags or life area
 *    - Appears in notes list
 *    - Can be pinned
 *    - Can be linked to projects
 *
 * 3. ARCHIVED: Old notes you want to hide
 *    - Still searchable
 *    - Can be restored
 *    - Cleans up your main view
 *
 * 4. TRASHED: Deleted notes
 *    - In trash can
 *    - Permanently deleted after 30 days
 *    - Can be restored within 30 days
 *
 * SEARCH & FILTERING:
 * -------------------
 * Notes can be filtered by:
 * - TAGS: Find notes with specific tags
 * - STATUS: Show active/archived/trashed
 * - LIFE AREA: Filter by category
 * - PINNED: Show only pinned notes
 * - PROJECT: Show notes linked to project
 * - TEXT SEARCH: Find in title and content
 *
 * INBOX SYSTEM:
 * ---------------
 * Notes start as "unprocessed" in inbox:
 * - Capture quickly without organizing
 * - Review later and organize
 * - Mark as processed to clear inbox
 *
 * CONVERSIONS:
 * ---------------
 * Notes can be converted to:
 * - TASK: Turn idea into actionable task
 * - PROJECT: Create project from note
 * - EVENT: Schedule a calendar event
 *
 * ENDPOINTS:
 * -----------
 * - GET /notes - Get notes (filtered/searched)
 * - POST /notes - Create new note
 * - GET /notes/:id - Get single note
 * - PUT /notes/:id - Update note
 * - DELETE /notes/:id - Delete note (trash it)
 * - POST /notes/:id/archive - Archive note
 * - POST /notes/:id/restore - Restore from trash/archive
 * - POST /notes/:id/convert - Convert to task/project
 * - POST /notes/:id/pin - Pin note
 * - GET /notes/inbox - Get unprocessed notes
 *
 * STORAGE LIMITS:
 * ----------------
 * Free users: 1,000 notes
 * Premium users: 50,000 notes
 * Each note: Up to 1 MB of content
 *
 * =============================================================================
 */

/**
 * Express is the web framework that handles HTTP requests and routing.
 * We use it to define API endpoints (URLs that the frontend can call).
 * Each router.get/post/patch/delete defines a different note operation.
 */
import express from 'express';

/**
 * Mongoose is our MongoDB ODM (Object Document Mapper).
 * It lets us work with MongoDB documents as JavaScript objects
 * and provides validation, hooks, and query building.
 * We use it here to validate IDs (ObjectId.isValid) before database queries.
 */
import mongoose from 'mongoose';

/**
 * Auth middleware checks that the user is logged in.
 * Every note request must include a valid JWT token in the Authorization header.
 * If not, the request is rejected with a 401 Unauthorized response.
 */
import { requireAuth } from '../middleware/auth.js';

/**
 * Error handler middleware captures unexpected errors and logs them.
 * This helps us debug issues by recording what went wrong and the context.
 * We call attachError(req, error, {operation: '...'}) to log errors.
 */
import { attachError } from '../middleware/errorHandler.js';

/**
 * Request logger middleware tracks entity IDs and event names for analytics.
 * When we attach an entity ID, it lets us search logs for a specific note.
 * Example: attachEntityId(req, 'noteId', note._id) so admins can audit actions.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

/**
 * Limit middleware enforces storage quotas.
 * Free users: 1,000 notes max
 * Premium users: 50,000 notes max
 * When limit is reached, POST requests are rejected with 402 Payment Required.
 */
import { requireLimit } from '../middleware/limitEnforcement.js';

/**
 * Note service contains all the business logic for note operations.
 * Instead of writing database queries in this file, we call service methods.
 * This keeps routes clean and makes it easy to reuse logic in different places.
 *
 * Example: noteService.getNotes(userId, options) handles:
 * - Building the MongoDB query with filters
 * - Querying the database
 * - Returning results to the route
 */
import noteService from '../services/noteService.js';

// =============================================================================
// ROUTER SETUP
// =============================================================================
// Create an Express router to group all note-related endpoints together
const router = express.Router();

// =============================================================================
// MIDDLEWARE: AUTHENTICATION
// =============================================================================
// All note routes require the user to be logged in.
// requireAuth middleware checks that the Authorization header contains a valid JWT token.
// If missing or invalid, the request is rejected before reaching any route handler.
// This prevents unauthorized access to user notes.
router.use(requireAuth);

/**
 * GET /notes
 * Get notes with search and filtering
 *
 * WHAT IT DOES:
 * Returns the user's notes with support for powerful filtering and searching.
 * This is the primary endpoint for note views (list, archive, search all use this).
 *
 * USE CASES:
 * - Frontend notes list showing all active notes
 * - Archive view showing archived notes
 * - Filtering notes by tags or life area
 * - Searching for notes by text
 * - Dashboard showing recently updated notes
 *
 * QUERY PARAMETERS:
 * - q: Text search in title/content
 * - status: Filter by status (active, archived, trashed) - default: active
 * - tags: Filter by tags (comma-separated)
 * - pinned: true/false to show only pinned/unpinned
 * - lifeAreaId: ObjectId - filter by life area (work, personal, health, etc.)
 * - projectId: ObjectId - filter notes linked to a specific project
 * - sort: Field to sort by (default: -updatedAt, most recently updated first)
 * - limit: How many notes to return (max 100, default 50)
 * - skip: How many notes to skip (for pagination)
 *
 * EXAMPLE REQUEST:
 * GET /notes?status=active&tags=work,urgent&lifeAreaId=507f1f77bcf86cd799439011&limit=25&skip=0
 * (Get 25 active notes tagged "work" or "urgent" in work life area, starting from first)
 *
 * EXAMPLE RESPONSE:
 * {
 *   notes: [
 *     { id: "...", title: "Meeting notes", tags: ["work"], pinned: true },
 *     { id: "...", title: "Project ideas", tags: ["work", "urgent"] }
 *   ],
 *   total: 47,
 *   limit: 25,
 *   skip: 0
 * }
 */
router.get('/', async (req, res) => {
  try {
    // Step 1: Extract and provide defaults for all query parameters
    // Default behavior: show active notes, no filters, newest first, 50 notes per page
    const {
      q = '',                    // Text search
      status = 'active',         // Status filter (active, archived, trashed)
      tags = '',                 // Tag filter(s)
      pinned,                    // Pinned filter
      lifeAreaId,                // Life area filter
      projectId,                 // Project filter
      hasLinkedTasks,            // Filter notes that have linked tasks
      fields,                    // Comma-separated field names for selective projection
      sort = '-updatedAt',       // Sort field (- = descending)
      limit = 50,                // Results per page
      skip = 0                   // Pagination offset
    } = req.query;

    // Step 2: Validate and normalize query parameters
    // Convert string values to proper types and validate ObjectIds
    const mongoose = (await import('mongoose')).default;
    const options = {
      q,
      // Keep status as-is (string: 'active', 'archived', 'trashed')
      status,
      // Split tags string into array and remove empty values
      tags: tags ? tags.split(',').filter(Boolean) : [],
      // Convert string boolean to actual boolean for pinned filter
      pinned: pinned === 'true' ? true : pinned === 'false' ? false : null,
      // Validate life area ID is a valid MongoDB ObjectId before using
      lifeAreaId: lifeAreaId && mongoose.Types.ObjectId.isValid(lifeAreaId) ? lifeAreaId : null,
      // Validate project ID is a valid MongoDB ObjectId before using
      projectId: projectId && mongoose.Types.ObjectId.isValid(projectId) ? projectId : null,
      // Filter for notes with linked tasks
      hasLinkedTasks: hasLinkedTasks === 'true' ? true : null,
      // Selective field projection for performance
      fields: fields || null,
      // Keep sort field as-is (typically: '-updatedAt', 'createdAt', 'title')
      sort,
      // Cap limit at 100 to prevent loading huge datasets
      limit: Math.min(parseInt(limit) || 50, 100),
      // Parse skip as integer for pagination
      skip: parseInt(skip) || 0
    };

    // Step 3: Call note service to build MongoDB query and fetch results
    // Service handles all the database query logic and filtering complexity
    const { notes, total } = await noteService.getNotes(req.user._id, options);

    // Step 4: Transform notes to safe format (removes sensitive fields)
    // Then return response with pagination info
    res.json({
      notes: notes.map(n => n.toSafeJSON()),  // Convert to frontend-safe format
      total,                                    // Total matching notes (before pagination)
      limit: options.limit,                     // Confirm page size
      skip: options.skip                        // Confirm offset
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'notes_fetch' });
    res.status(500).json({
      error: 'Failed to fetch notes',
      code: 'NOTES_FETCH_ERROR'
    });
  }
});

/**
 * GET /notes/inbox
 * Get unprocessed notes (inbox view)
 *
 * WHAT IT DOES:
 * Returns all unprocessed notes that haven't been organized yet.
 * This is the "inbox" feature - capture notes quickly, organize later.
 *
 * INBOX WORKFLOW:
 * 1. User creates quick note without tags/life area → appears in inbox
 * 2. User reviews inbox notes later
 * 3. User processes notes (adds tags, assigns to life area, archives, deletes)
 * 4. Processed notes disappear from inbox
 *
 * USE CASES:
 * - Quick capture without organizing
 * - Review and categorize notes later
 * - Keep inbox empty (GTD methodology)
 * - Clear inbox when processing time
 *
 * QUERY PARAMETERS:
 * - sort: Field to sort by (default: -createdAt, newest first)
 * - limit: How many notes to return (max 100, default 50)
 * - skip: How many notes to skip (for pagination)
 *
 * EXAMPLE REQUEST:
 * GET /notes/inbox?limit=25
 * (Get 25 newest unprocessed notes from inbox)
 *
 * EXAMPLE RESPONSE:
 * {
 *   notes: [
 *     { id: "...", title: "Remember to call Mom", processed: false },
 *     { id: "...", title: "Budget idea", processed: false }
 *   ],
 *   total: 12,
 *   limit: 25,
 *   skip: 0
 * }
 */
router.get('/inbox', async (req, res) => {
  try {
    // Step 1: Extract pagination parameters
    // No filtering parameters - only get unprocessed notes
    const {
      sort = '-createdAt',       // Sort by creation date (newest first)
      limit = 50,                // Results per page
      skip = 0                   // Pagination offset
    } = req.query;

    // Step 2: Validate and normalize parameters
    const options = {
      sort,                                                   // Sort field
      limit: Math.min(parseInt(limit) || 50, 100),           // Cap at 100
      skip: parseInt(skip) || 0                               // Parse skip as integer
    };

    // Step 3: Call service to fetch unprocessed notes
    // Service filters for notes where processed === false
    const { notes, total } = await noteService.getInboxNotes(req.user._id, options);

    // Step 4: Return notes with pagination info
    res.json({
      notes: notes.map(n => n.toSafeJSON()),  // Safe format
      total,                                    // Total unprocessed notes
      limit: options.limit,                     // Confirm page size
      skip: options.skip                        // Confirm offset
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'inbox_fetch' });
    res.status(500).json({
      error: 'Failed to fetch inbox',
      code: 'INBOX_FETCH_ERROR'
    });
  }
});

/**
 * GET /notes/inbox/count
 * Get count of unprocessed notes in inbox
 *
 * WHAT IT DOES:
 * Returns a single number: how many unprocessed notes are in the inbox.
 * Lightweight endpoint for UI badge showing inbox count.
 *
 * USE CASES:
 * - Show inbox count badge in navigation bar
 * - Alert user when inbox has items
 * - Show progress on clearing inbox
 *
 * EXAMPLE REQUEST:
 * GET /notes/inbox/count
 *
 * EXAMPLE RESPONSE:
 * { count: 7 }
 */
router.get('/inbox/count', async (req, res) => {
  try {
    // Step 1: Call service to count unprocessed notes
    // Service does: db.Note.countDocuments({ userId: req.user._id, processed: false })
    const count = await noteService.getInboxCount(req.user._id);

    // Step 2: Return the count
    res.json({ count });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'inbox_count' });
    res.status(500).json({
      error: 'Failed to fetch inbox count',
      code: 'INBOX_COUNT_ERROR'
    });
  }
});

/**
 * GET /notes/tags
 * Get all unique tags used in user's notes
 *
 * WHAT IT DOES:
 * Returns a list of all unique tags across all of the user's notes.
 * This is used to populate tag filters and autocomplete in the UI.
 *
 * USE CASES:
 * - Tag filter dropdown showing what tags exist
 * - Autocomplete when typing tags in note creation
 * - Suggest existing tags to user
 * - Show tag cloud/frequency
 *
 * EXAMPLE REQUEST:
 * GET /notes/tags
 *
 * EXAMPLE RESPONSE:
 * {
 *   tags: [
 *     "work",
 *     "personal",
 *     "urgent",
 *     "project-x",
 *     "health"
 *   ]
 * }
 */
router.get('/tags', async (req, res) => {
  try {
    // Step 1: Call service to get unique tags from all user's notes
    // Service uses MongoDB aggregation to get distinct tag values
    const tags = await noteService.getUserTags(req.user._id);

    // Step 2: Return the list of tags
    res.json({ tags });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'tags_fetch' });
    res.status(500).json({
      error: 'Failed to fetch tags',
      code: 'TAGS_FETCH_ERROR'
    });
  }
});

/**
 * GET /notes/recent
 * Get recently updated/viewed notes for dashboard
 *
 * WHAT IT DOES:
 * Returns the most recently accessed notes for the dashboard widget.
 * Shows notes user has been working on recently.
 *
 * USE CASES:
 * - Dashboard widget: "Recently Updated"
 * - Quick access to notes in progress
 * - "Continue working on..." feature
 *
 * QUERY PARAMETERS:
 * - limit: How many recent notes to return (max 20, default 5)
 *
 * EXAMPLE REQUEST:
 * GET /notes/recent?limit=5
 * (Get 5 most recently updated notes)
 *
 * EXAMPLE RESPONSE:
 * {
 *   notes: [
 *     { id: "...", title: "Meeting notes", updatedAt: "2025-02-15T14:30:00Z" },
 *     { id: "...", title: "Project plan", updatedAt: "2025-02-15T10:15:00Z" },
 *     ...
 *   ]
 * }
 */
router.get('/recent', async (req, res) => {
  try {
    // Step 1: Extract and validate limit parameter
    // Default: 5 recent notes, max 20 to prevent loading too much data
    const limit = Math.min(parseInt(req.query.limit) || 5, 20);

    // Step 2: Call service to fetch recently updated notes
    // Service queries for notes sorted by updatedAt, most recent first
    const notes = await noteService.getRecentNotes(req.user._id, limit);

    // Step 3: Return notes in safe format
    res.json({ notes: notes.map(n => n.toSafeJSON()) });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'recent_notes_fetch' });
    res.status(500).json({
      error: 'Failed to fetch recent notes',
      code: 'RECENT_NOTES_ERROR'
    });
  }
});

/**
 * GET /notes/pinned
 * Get all pinned notes
 *
 * WHAT IT DOES:
 * Returns all notes that the user has pinned to the top.
 * Pinned notes appear first in list views and have a pin icon.
 *
 * USE CASES:
 * - Important notes that need quick access
 * - Active projects/documents
 * - Frequently referenced content
 * - Show pinned notes at top of sidebar
 *
 * EXAMPLE REQUEST:
 * GET /notes/pinned
 *
 * EXAMPLE RESPONSE:
 * {
 *   notes: [
 *     { id: "...", title: "Project Charter", pinned: true },
 *     { id: "...", title: "Decision Log", pinned: true }
 *   ]
 * }
 */
router.get('/pinned', async (req, res) => {
  try {
    // Step 1: Call service to fetch pinned notes
    // Service queries for notes where pinned === true
    const notes = await noteService.getPinnedNotes(req.user._id);

    // Step 2: Return pinned notes in safe format
    res.json({ notes: notes.map(n => n.toSafeJSON()) });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'pinned_notes_fetch' });
    res.status(500).json({
      error: 'Failed to fetch pinned notes',
      code: 'PINNED_NOTES_ERROR'
    });
  }
});

/**
 * GET /notes/last-opened
 * Get the most recently opened note
 *
 * WHAT IT DOES:
 * Returns the note that the user last viewed.
 * Used for "Continue Working" button to resume where they left off.
 *
 * USE CASES:
 * - "Continue" button on dashboard
 * - Resume note in sidebar
 * - Quick access to note being worked on
 *
 * EXAMPLE REQUEST:
 * GET /notes/last-opened
 *
 * EXAMPLE RESPONSE:
 * {
 *   note: { id: "...", title: "Q1 Planning", openedAt: "2025-02-15T14:20:00Z" }
 * }
 * OR
 * { note: null }  (if no notes have been opened)
 */
router.get('/last-opened', async (req, res) => {
  try {
    // Step 1: Call service to fetch last opened note
    // Service tracks which note was viewed most recently
    const note = await noteService.getLastOpenedNote(req.user._id);

    // Step 2: Return the note (or null if none have been opened)
    res.json({ note: note ? note.toSafeJSON() : null });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'last_opened_fetch' });
    res.status(500).json({
      error: 'Failed to fetch last opened note',
      code: 'LAST_OPENED_ERROR'
    });
  }
});

/**
 * POST /notes
 * Create a new note
 *
 * WHAT IT DOES:
 * Creates a new note with title, optional description, tags, and links.
 * Includes validation and enforces storage limits (1,000 notes for free users).
 *
 * STORAGE LIMITS:
 * Free users: 1,000 notes max (402 if exceeded)
 * Premium users: 50,000 notes max
 * Each note: Up to 1 MB of content
 *
 * REQUEST BODY:
 * {
 *   title: "Meeting notes" (required),
 *   body: "Full text content...",
 *   tags: ["work", "project-x"],
 *   pinned: false,
 *   lifeAreaId: "507f1f77bcf86cd799439011",
 *   projectId: "507f1f77bcf86cd799439012"
 * }
 *
 * EXAMPLE REQUEST:
 * POST /notes
 * { "title": "Q1 Planning", "body": "Goals for Q1...", "tags": ["work", "planning"] }
 *
 * EXAMPLE RESPONSE (201 Created):
 * {
 *   message: "Note created successfully",
 *   note: { id: "...", title: "Q1 Planning", tags: ["work", "planning"], processed: false, ... }
 * }
 */
router.post('/', requireLimit('notes'), async (req, res) => {
  try {
    // Step 1: Extract request body fields
    // All fields are optional except title
    const { title, body, tags, pinned, lifeAreaId, projectId } = req.body;

    // Step 2: Call note service to create the note
    // Service handles:
    // - Validating and storing the note
    // - Recording creation timestamp
    // - Setting status to "active"
    // - Creating initial tags
    const note = await noteService.createNote(req.user._id, {
      title,
      body,
      tags,
      pinned,
      lifeAreaId,
      projectId
    });

    // Step 3: Log the successful creation for audit trail
    // Store note ID so admins can search logs for this note
    attachEntityId(req, 'noteId', note._id);
    // Mark this event as successful in analytics
    req.eventName = 'note.create.success';

    // Step 4: Return 201 Created with the new note
    res.status(201).json({
      message: 'Note created successfully',
      note: note.toSafeJSON()  // Safe format removes internal fields
    });
  } catch (error) {
    // Log the error for debugging
    attachError(req, error, { operation: 'note_create' });

    // Handle MongoDB validation errors (invalid schema)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    // Other unexpected errors
    res.status(500).json({
      error: 'Failed to create note',
      code: 'NOTE_CREATE_ERROR'
    });
  }
});

/**
 * GET /notes/:id
 * Get note details by ID
 *
 * WHAT IT DOES:
 * Fetches a single note's complete details including full content, tags, links, etc.
 * Automatically tracks that the note was opened for "last opened" feature.
 * Includes ownership check - users can only see their own notes.
 *
 * PATH PARAMETERS:
 * - id: Note ID (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * GET /notes/507f1f77bcf86cd799439011
 *
 * EXAMPLE RESPONSE:
 * {
 *   note: {
 *     id: "507f1f77bcf86cd799439011",
 *     title: "Q1 Planning",
 *     body: "Full meeting notes and planning details...",
 *     tags: ["work", "planning"],
 *     pinned: false,
 *     status: "active",
 *     createdAt: "2025-02-01T10:00:00Z",
 *     updatedAt: "2025-02-15T14:30:00Z",
 *     openedAt: "2025-02-15T14:30:00Z"
 *   }
 * }
 */
router.get('/:id', async (req, res) => {
  try {
    // Step 1: Extract note ID from URL
    const { id } = req.params;

    // Step 2: Validate that the ID is a valid MongoDB ObjectId
    // Prevents malformed requests before querying database
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Call service to fetch note
    // Service checks ownership - ensures user can only see their own notes
    const note = await noteService.getNoteById(req.user._id, id);

    // Step 4: Check if note exists
    // Returns 404 if not found (either doesn't exist or user doesn't own it)
    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        code: 'NOTE_NOT_FOUND'
      });
    }

    // Step 5: Track that note was opened
    // Updates openedAt timestamp for "continue" and "last opened" features
    await noteService.markNoteAsOpened(req.user._id, id);

    // Step 6: Return note details
    res.json({ note: note.toSafeJSON() });  // Safe format removes internal fields
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'note_fetch', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to fetch note',
      code: 'NOTE_FETCH_ERROR'
    });
  }
});

/**
 * PATCH /notes/:id
 * Update note fields
 *
 * WHAT IT DOES:
 * Updates one or more fields on a note (title, content, tags, etc.).
 * Can update multiple fields in a single request.
 * Includes ownership check - users can only update their own notes.
 *
 * PATH PARAMETERS:
 * - id: Note ID (MongoDB ObjectId)
 *
 * REQUEST BODY (all optional):
 * {
 *   title: "Updated title",
 *   body: "Updated content text",
 *   tags: ["work", "revised"],
 *   pinned: true,
 *   lifeAreaId: "507f1f77bcf86cd799439011"
 * }
 *
 * EXAMPLE REQUEST:
 * PATCH /notes/507f1f77bcf86cd799439011
 * { "title": "Q1 Planning (Updated)", "pinned": true }
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Note updated successfully",
 *   note: { id: "...", title: "Q1 Planning (Updated)", pinned: true, ... }
 * }
 */
router.patch('/:id', async (req, res) => {
  try {
    // Step 1: Extract note ID from URL
    const { id } = req.params;

    // Step 2: Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Extract updates from request body
    // PATCH means partial update - only changed fields are sent
    const updates = req.body;

    // Step 4: Call service to update the note
    // Service handles:
    // - Checking ownership (user can only update their own notes)
    // - Validating new values
    // - Updating timestamps (updatedAt)
    // - Saving to MongoDB
    const note = await noteService.updateNote(req.user._id, id, updates);

    // Step 5: Check if note exists (or if user owns it)
    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        code: 'NOTE_NOT_FOUND'
      });
    }

    // Step 6: Log the successful update for audit trail
    attachEntityId(req, 'noteId', note._id);
    req.eventName = 'note.update.success';

    // Step 7: Return updated note
    res.json({
      message: 'Note updated successfully',
      note: note.toSafeJSON()
    });
  } catch (error) {
    // Log the error for debugging
    attachError(req, error, { operation: 'note_update', noteId: req.params.id });

    // Handle MongoDB validation errors (invalid field values)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    // Other unexpected errors
    res.status(500).json({
      error: 'Failed to update note',
      code: 'NOTE_UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /notes/:id
 * Permanently delete a note
 *
 * WHAT IT DOES:
 * Permanently removes a note from the database.
 * This is permanent - the note cannot be recovered after deletion.
 * Includes ownership check - users can only delete their own notes.
 *
 * PATH PARAMETERS:
 * - id: Note ID (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * DELETE /notes/507f1f77bcf86cd799439011
 *
 * EXAMPLE RESPONSE:
 * { message: "Note deleted successfully" }
 *
 * WARNING:
 * This is permanent deletion. There is no recovery.
 * Consider moving to trash (POST /:id/trash) first if you want recovery ability.
 */
router.delete('/:id', async (req, res) => {
  try {
    // Step 1: Extract note ID from URL
    const { id } = req.params;

    // Step 2: Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Log note ID before deletion for audit trail
    // Important: Attach before deletion because we won't have the note object after
    attachEntityId(req, 'noteId', id);

    // Step 4: Call service to delete the note
    // Service checks ownership - user can only delete their own notes
    const note = await noteService.deleteNote(req.user._id, id);

    // Step 5: Check if note was deleted
    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        code: 'NOTE_NOT_FOUND'
      });
    }

    // Step 6: Log the successful deletion
    req.eventName = 'note.delete.success';

    // Step 7: Return success message (no note data since it's deleted)
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'note_delete', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to delete note',
      code: 'NOTE_DELETE_ERROR'
    });
  }
});

/**
 * POST /notes/:id/pin
 * Pin a note (move to top/favorites)
 *
 * WHAT IT DOES:
 * Pins a note to the top of the list so it appears first and has a pin icon.
 * Useful for important or frequently accessed notes.
 *
 * USE CASES:
 * - Pin important project documents
 * - Favorite frequently referenced notes
 * - Keep urgent items visible
 *
 * PATH PARAMETERS:
 * - id: Note ID (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * POST /notes/507f1f77bcf86cd799439011/pin
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Note pinned successfully",
 *   note: { id: "...", title: "Q1 Planning", pinned: true, ... }
 * }
 */
router.post('/:id/pin', async (req, res) => {
  try {
    // Step 1: Extract note ID from URL
    const { id } = req.params;

    // Step 2: Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Call service to pin the note
    // Service sets pinned flag to true
    const note = await noteService.pinNote(req.user._id, id, true);

    // Step 4: Check if pin was successful
    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        code: 'NOTE_NOT_FOUND'
      });
    }

    // Step 5: Log the successful pin for audit trail
    attachEntityId(req, 'noteId', note._id);
    req.eventName = 'note.pin.success';

    // Step 6: Return updated note
    res.json({
      message: 'Note pinned successfully',
      note: note.toSafeJSON()
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'note_pin', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to pin note',
      code: 'PIN_ERROR'
    });
  }
});

/**
 * POST /notes/:id/unpin
 * Remove pin from a note
 *
 * WHAT IT DOES:
 * Unpins a note so it returns to normal position in the list.
 * Removes the pin icon and favorite status.
 *
 * PATH PARAMETERS:
 * - id: Note ID (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * POST /notes/507f1f77bcf86cd799439011/unpin
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Note unpinned successfully",
 *   note: { id: "...", title: "Q1 Planning", pinned: false, ... }
 * }
 */
router.post('/:id/unpin', async (req, res) => {
  try {
    // Step 1: Extract note ID from URL
    const { id } = req.params;

    // Step 2: Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Call service to unpin the note
    // Service sets pinned flag to false
    const note = await noteService.pinNote(req.user._id, id, false);

    // Step 4: Check if unpin was successful
    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        code: 'NOTE_NOT_FOUND'
      });
    }

    // Step 5: Log the successful unpin for audit trail
    attachEntityId(req, 'noteId', note._id);
    req.eventName = 'note.unpin.success';

    // Step 6: Return updated note
    res.json({
      message: 'Note unpinned successfully',
      note: note.toSafeJSON()
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'note_unpin', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to unpin note',
      code: 'UNPIN_ERROR'
    });
  }
});

/**
 * POST /notes/:id/archive
 * Archive a note (hide from active view)
 *
 * WHAT IT DOES:
 * Moves a note to archive status so it no longer appears in normal lists.
 * Archived notes are still searchable and can be restored.
 * Useful for cleaning up your active notes while keeping reference material.
 *
 * USE CASES:
 * - Hide completed projects
 * - Archive reference materials
 * - Clean up notes list
 * - Keep archive for searching later
 *
 * PATH PARAMETERS:
 * - id: Note ID (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * POST /notes/507f1f77bcf86cd799439011/archive
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Note archived successfully",
 *   note: { id: "...", title: "Q1 Planning", status: "archived", ... }
 * }
 */
router.post('/:id/archive', async (req, res) => {
  try {
    // Step 1: Extract note ID from URL
    const { id } = req.params;

    // Step 2: Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Call service to archive the note
    // Service sets status to "archived"
    const note = await noteService.archiveNote(req.user._id, id);

    // Step 4: Check if archive was successful
    if (!note) {
      return res.status(404).json({
        error: 'Note not found or already archived',
        code: 'NOTE_NOT_FOUND'
      });
    }

    // Step 5: Log the successful archive for audit trail
    attachEntityId(req, 'noteId', note._id);
    req.eventName = 'note.archive.success';

    // Step 6: Return updated note
    res.json({
      message: 'Note archived successfully',
      note: note.toSafeJSON()
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'note_archive', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to archive note',
      code: 'ARCHIVE_ERROR'
    });
  }
});

/**
 * POST /notes/:id/unarchive
 * Restore an archived note to active view
 *
 * WHAT IT DOES:
 * Brings an archived note back into the active notes list.
 * Archived notes are still queryable but hidden by default.
 * This endpoint unhides them.
 *
 * PATH PARAMETERS:
 * - id: Note ID (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * POST /notes/507f1f77bcf86cd799439011/unarchive
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Note unarchived successfully",
 *   note: { id: "...", title: "Q1 Planning", status: "active", ... }
 * }
 */
router.post('/:id/unarchive', async (req, res) => {
  try {
    // Step 1: Extract note ID from URL
    const { id } = req.params;

    // Step 2: Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Call service to unarchive the note
    // Service sets status back to "active"
    const note = await noteService.unarchiveNote(req.user._id, id);

    // Step 4: Check if unarchive was successful
    if (!note) {
      return res.status(404).json({
        error: 'Note not found or not archived',
        code: 'NOTE_NOT_FOUND'
      });
    }

    // Step 5: Log the successful unarchive for audit trail
    attachEntityId(req, 'noteId', note._id);
    req.eventName = 'note.unarchive.success';

    // Step 6: Return updated note
    res.json({
      message: 'Note unarchived successfully',
      note: note.toSafeJSON()
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'note_unarchive', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to unarchive note',
      code: 'UNARCHIVE_ERROR'
    });
  }
});

/**
 * POST /notes/:id/trash
 * Move a note to trash (soft delete - recoverable)
 *
 * WHAT IT DOES:
 * Moves a note to trash instead of permanently deleting it.
 * Trashed notes are hidden from normal views but can be recovered within 30 days.
 * After 30 days, automatically deleted permanently.
 *
 * USE CASES:
 * - Delete note by mistake - recover from trash
 * - Move unwanted notes to trash first (safer than delete)
 * - Review trash to clean up space
 *
 * PATH PARAMETERS:
 * - id: Note ID (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * POST /notes/507f1f77bcf86cd799439011/trash
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Note moved to trash",
 *   note: { id: "...", title: "Q1 Planning", status: "trashed", trashedAt: "2025-02-15T10:00:00Z", ... }
 * }
 *
 * RECOVERY:
 * Notes in trash can be restored with POST /:id/restore within 30 days.
 * After 30 days, they are automatically permanently deleted.
 */
router.post('/:id/trash', async (req, res) => {
  try {
    // Step 1: Extract note ID from URL
    const { id } = req.params;

    // Step 2: Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Call service to move note to trash
    // Service marks note as trashed instead of deleting it
    // Trashed notes are hidden from normal queries
    const note = await noteService.trashNote(req.user._id, id);

    // Step 4: Check if trash was successful
    if (!note) {
      return res.status(404).json({
        error: 'Note not found or already trashed',
        code: 'NOTE_NOT_FOUND'
      });
    }

    // Step 5: Log the successful trash for audit trail
    attachEntityId(req, 'noteId', note._id);
    req.eventName = 'note.trash.success';

    // Step 6: Return updated note
    res.json({
      message: 'Note moved to trash',
      note: note.toSafeJSON()
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'note_trash', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to trash note',
      code: 'TRASH_ERROR'
    });
  }
});

/**
 * POST /notes/:id/restore
 * Restore a note from trash back to active
 *
 * WHAT IT DOES:
 * Recovers a note from trash and returns it to active or archived status.
 * Only works if note was trashed less than 30 days ago.
 *
 * PATH PARAMETERS:
 * - id: Note ID (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * POST /notes/507f1f77bcf86cd799439011/restore
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Note restored successfully",
 *   note: { id: "...", title: "Q1 Planning", status: "active", trashedAt: null, ... }
 * }
 *
 * NOTES:
 * - Only works if note is in trash
 * - Automatically expire trash after 30 days
 * - Restore timestamp is cleared when note is restored
 */
router.post('/:id/restore', async (req, res) => {
  try {
    // Step 1: Extract note ID from URL
    const { id } = req.params;

    // Step 2: Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Call service to restore note from trash
    // Service clears the "trashed" flag so note appears in normal lists
    const note = await noteService.restoreNote(req.user._id, id);

    // Step 4: Check if restore was successful
    // Returns null if note not found or not in trash
    if (!note) {
      return res.status(404).json({
        error: 'Note not found or not in trash',
        code: 'NOTE_NOT_FOUND'
      });
    }

    // Step 5: Log the successful restore for audit trail
    attachEntityId(req, 'noteId', note._id);
    req.eventName = 'note.restore.success';

    // Step 6: Return updated note
    res.json({
      message: 'Note restored successfully',
      note: note.toSafeJSON()
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'note_restore', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to restore note',
      code: 'RESTORE_ERROR'
    });
  }
});

/**
 * POST /notes/:id/process
 * Mark a note as processed (remove from inbox)
 *
 * WHAT IT DOES:
 * Marks a note as processed, removing it from the inbox.
 * Once processed, note appears in regular lists (needs tags/life area).
 *
 * INBOX WORKFLOW:
 * 1. Create new note (unprocessed) → appears in inbox
 * 2. User adds tags or life area
 * 3. User calls process → removed from inbox
 *
 * USE CASES:
 * - Mark inbox items as reviewed
 * - Clear inbox when done processing
 * - Indicate note is organized and categorized
 *
 * PATH PARAMETERS:
 * - id: Note ID (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * POST /notes/507f1f77bcf86cd799439011/process
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Note processed successfully",
 *   note: { id: "...", title: "Quick idea", processed: true, ... }
 * }
 */
router.post('/:id/process', async (req, res) => {
  try {
    // Step 1: Extract note ID from URL
    const { id } = req.params;

    // Step 2: Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Call service to mark note as processed
    // Service sets processed flag to true
    const note = await noteService.processNote(req.user._id, id);

    // Step 4: Check if process was successful
    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        code: 'NOTE_NOT_FOUND'
      });
    }

    // Step 5: Log the successful process for audit trail
    attachEntityId(req, 'noteId', note._id);
    req.eventName = 'note.process.success';

    // Step 6: Return updated note
    res.json({
      message: 'Note processed successfully',
      note: note.toSafeJSON()
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'note_process', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to process note',
      code: 'PROCESS_ERROR'
    });
  }
});

/**
 * POST /notes/:id/unprocess
 * Move a note back to inbox
 *
 * WHAT IT DOES:
 * Marks a processed note as unprocessed, moving it back to inbox.
 * Useful if user wants to review the note again or change organization.
 *
 * PATH PARAMETERS:
 * - id: Note ID (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * POST /notes/507f1f77bcf86cd799439011/unprocess
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Note moved back to inbox",
 *   note: { id: "...", title: "Quick idea", processed: false, ... }
 * }
 */
router.post('/:id/unprocess', async (req, res) => {
  try {
    // Step 1: Extract note ID from URL
    const { id } = req.params;

    // Step 2: Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Call service to unprocess the note
    // Service sets processed flag to false
    const note = await noteService.unprocessNote(req.user._id, id);

    // Step 4: Check if unprocess was successful
    if (!note) {
      return res.status(404).json({
        error: 'Note not found',
        code: 'NOTE_NOT_FOUND'
      });
    }

    // Step 5: Log the successful unprocess for audit trail
    attachEntityId(req, 'noteId', note._id);
    req.eventName = 'note.unprocess.success';

    // Step 6: Return updated note
    res.json({
      message: 'Note moved back to inbox',
      note: note.toSafeJSON()
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'note_unprocess', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to unprocess note',
      code: 'UNPROCESS_ERROR'
    });
  }
});

/**
 * POST /notes/:id/convert-to-task
 * Convert a note to a task (turn idea into action)
 *
 * WHAT IT DOES:
 * Converts a note into a task, making it actionable.
 * Can optionally keep the original note or delete it.
 *
 * CONVERSIONS:
 * - Note (idea/thought) → Task (action item)
 * - Useful for turning captured ideas into work
 * - Task inherits title and description from note
 *
 * USE CASES:
 * - Convert quick capture into actionable task
 * - Create task from meeting notes
 * - Turn ideas into to-dos
 *
 * PATH PARAMETERS:
 * - id: Note ID (MongoDB ObjectId)
 *
 * REQUEST BODY:
 * { "keepNote": true }  (default: true - keep original note)
 * or
 * { "keepNote": false } (delete original note after conversion)
 *
 * EXAMPLE REQUEST:
 * POST /notes/507f1f77bcf86cd799439011/convert-to-task
 * { "keepNote": true }
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Note converted to task",
 *   task: { id: "...", title: "Follow up with client", status: "todo", ... },
 *   note: { id: "...", title: "Follow up with client", tags: [...], ... }
 * }
 */
router.post('/:id/convert-to-task', async (req, res) => {
  try {
    // Step 1: Extract note ID and keepNote preference
    const { id } = req.params;
    const { keepNote = true } = req.body;  // Default: keep the original note

    // Step 2: Validate note ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Call service to convert note to task
    // Service handles:
    // - Creating new task with note's title and content
    // - Optionally deleting the original note
    // - Linking task to same life area/project as note
    const result = await noteService.convertToTask(req.user._id, id, keepNote);

    // Step 4: Check if conversion was successful
    if (!result) {
      return res.status(404).json({
        error: 'Note not found',
        code: 'NOTE_NOT_FOUND'
      });
    }

    // Step 5: Log the successful conversion for audit trail
    attachEntityId(req, 'noteId', id);
    req.eventName = 'note.convert.success';

    // Step 6: Return both task (newly created) and note (original, if kept)
    res.json({
      message: 'Note converted to task',
      task: result.task.toSafeJSON(),           // New task created
      note: result.note ? result.note.toSafeJSON() : null  // Original note (if keepNote=true)
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'note_convert_to_task', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to convert note to task',
      code: 'CONVERT_ERROR'
    });
  }
});

/**
 * GET /notes/:id/backlinks
 * Get items that link to this note
 *
 * WHAT IT DOES:
 * Returns all tasks, projects, and other notes that link to this note.
 * Useful for understanding note relationships and dependencies.
 *
 * USE CASES:
 * - See which tasks mention this note
 * - See which projects reference this note
 * - Find all references to a note
 * - Understand note connectivity
 *
 * PATH PARAMETERS:
 * - id: Note ID (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * GET /notes/507f1f77bcf86cd799439011/backlinks
 *
 * EXAMPLE RESPONSE:
 * {
 *   backlinks: [
 *     { type: "task", id: "...", title: "Follow up on Q1 ideas" },
 *     { type: "project", id: "...", title: "Q1 Planning Project" },
 *     { type: "note", id: "...", title: "Related research" }
 *   ]
 * }
 */
router.get('/:id/backlinks', async (req, res) => {
  try {
    // Step 1: Extract note ID from URL
    const { id } = req.params;

    // Step 2: Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid note ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Call service to find all backlinks
    // Service queries for:
    // - Tasks that link to this note
    // - Projects that link to this note
    // - Other notes that link to this note
    const backlinks = await noteService.getNoteBacklinks(req.user._id, id);

    // Step 4: Return backlinks
    res.json({ backlinks });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'note_backlinks', noteId: req.params.id });
    res.status(500).json({
      error: 'Failed to fetch backlinks',
      code: 'BACKLINKS_ERROR'
    });
  }
});

export default router;
