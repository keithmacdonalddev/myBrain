/**
 * =============================================================================
 * FILTERS.JS - Saved Search Filters Routes
 * =============================================================================
 *
 * This file handles saved search filters in myBrain.
 * Filters are custom search configurations that users can save and reuse.
 * Instead of typing the same search every time, users save it for quick access.
 *
 * WHAT ARE SAVED FILTERS?
 * -----------------------
 * Saved filters are preconfigured search searches that you can:
 * - Save complex search criteria (multiple tags, date ranges, etc.)
 * - Name them for easy identification
 * - Reuse them with one click
 * - Edit or delete them
 *
 * FILTER EXAMPLES:
 * ----------------
 * "High Priority Tasks":
 *   - Entity Type: Tasks
 *   - Filters: priority = high, status = active
 *
 * "Work Notes This Month":
 *   - Entity Type: Notes
 *   - Filters: lifeArea = work, created >= first day of month
 *
 * "Completed Projects Last Quarter":
 *   - Entity Type: Projects
 *   - Filters: status = completed, completed between Q3 dates
 *
 * WHERE FILTERS APPLY:
 * --------------------
 * Filters can be created for:
 * - Notes: Filter by tags, life areas, status
 * - Tasks: Filter by priority, status, due date, project
 * - Projects: Filter by status, life areas, teams
 * - Events: Filter by date range, status, location
 * - Files: Filter by type, folder, size
 *
 * FILTER STRUCTURE:
 * -----------------
 * {
 *   name: "My Custom Filter",
 *   entityType: "notes",  // What type of items this filters
 *   criteria: {           // Search parameters
 *     tags: ["important", "urgent"],
 *     status: "active",
 *     lifeAreaId: "123..."
 *   }
 * }
 *
 * ENDPOINTS:
 * -----------
 * - GET /filters - Get all saved filters
 * - GET /filters?entityType=notes - Get filters for specific entity
 * - POST /filters - Create new filter
 * - PUT /filters/:id - Update filter
 * - DELETE /filters/:id - Delete filter
 * - POST /filters/:id/apply - Apply filter to search
 *
 * =============================================================================
 */

/**
 * Express is the web framework that handles HTTP requests and routing.
 * We use it to define API endpoints (URLs that the frontend can call).
 * Each router.get/post defines a different filter operation.
 */
import express from 'express';

/**
 * Mongoose provides database utilities, especially ObjectId validation.
 * We use mongoose.Types.ObjectId.isValid() to validate filter IDs
 * before querying the database (prevents invalid queries).
 */
import mongoose from 'mongoose';

/**
 * Auth middleware checks that the user is logged in.
 * Every filter request must include a valid JWT token in the Authorization header.
 * If not, the request is rejected with a 401 Unauthorized response.
 */
import { requireAuth } from '../middleware/auth.js';

/**
 * Error handler middleware logs errors for debugging and monitoring.
 * When we call attachError(req, error), it adds error context to request logs
 * so we can investigate failures (e.g., database errors, validation failures).
 */
import { attachError } from '../middleware/errorHandler.js';

/**
 * Request logger middleware tracks entity IDs and event names for analytics.
 * When we attach an entity ID, it lets us search logs for specific filters.
 * Example: attachEntityId(req, 'filterId', filter._id) for usage tracking.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

/**
 * SavedFilter is the MongoDB model that represents a saved search filter.
 * Each filter belongs to a user and stores:
 * - name: Display name (e.g., "High Priority Tasks")
 * - entityType: What it filters (notes, tasks, projects, etc.)
 * - filters: Search criteria object (tags, status, dates, etc.)
 * - sortBy: Sort order (-updatedAt means newest first)
 * - icon: UI icon name
 * - color: Optional color for visual identification
 */
import SavedFilter from '../models/SavedFilter.js';

// =============================================================================
// ROUTER SETUP
// =============================================================================
// Create an Express router to group all filter-related endpoints together
const router = express.Router();

// =============================================================================
// MIDDLEWARE: AUTHENTICATION
// =============================================================================
// Protect all filter routes - users must be logged in to manage their filters
router.use(requireAuth);

// =============================================================================
// ROUTE: GET /filters
// =============================================================================

/**
 * GET /filters
 * Get all saved filters for the user
 *
 * WHAT IT DOES:
 * Retrieves all saved search filters belonging to the authenticated user.
 * Can optionally filter results by entity type (notes, tasks, etc.).
 * Returns filters sorted by creation date (newest first).
 *
 * USE CASES:
 * - Display list of saved filters in a dropdown menu
 * - Show all filters a user has created
 * - Load filters for a specific entity type (e.g., only task filters)
 * - Populate filter picker/switcher UI
 *
 * QUERY PARAMETERS:
 * - entityType: Optional filter by type (e.g., "note", "task")
 *   If provided, only returns filters for that entity type
 *   Example: /filters?entityType=task
 *
 * EXAMPLE REQUEST:
 * GET /filters
 * GET /filters?entityType=note
 *
 * EXAMPLE RESPONSE:
 * {
 *   filters: [
 *     {
 *       id: "507f1f77bcf86cd799439011",
 *       name: "High Priority Tasks",
 *       entityType: "task",
 *       filters: { priority: "high", status: "active" },
 *       sortBy: "-updatedAt",
 *       icon: "filter",
 *       color: null,
 *       createdAt: "2025-02-15T10:30:00.000Z"
 *     },
 *     {
 *       id: "507f1f77bcf86cd799439012",
 *       name: "Work Notes This Month",
 *       entityType: "note",
 *       filters: { tags: ["work"], status: "active" },
 *       sortBy: "-createdAt",
 *       icon: "bookmark",
 *       color: "#FF6B6B",
 *       createdAt: "2025-02-14T15:20:00.000Z"
 *     }
 *   ]
 * }
 */
router.get('/', async (req, res) => {
  try {
    // Step 1: Extract optional entityType query parameter for filtering
    // If user provides entityType=note, we'll only return note filters
    const { entityType } = req.query;

    // Step 2: Build database query - always filter by current user
    // This ensures users only see their own filters (privacy/security)
    const query = { userId: req.user._id };

    // Step 3: Add entity type filter if user specified one
    // Allows frontend to request "show me only task filters" or "show me only note filters"
    if (entityType) {
      query.entityType = entityType;
    }

    // Step 4: Query database with built filter
    // Sort by createdAt descending (most recently created first)
    // This shows newer filters at the top of the list
    const filters = await SavedFilter.find(query).sort({ createdAt: -1 });

    // Step 5: Return filters using toSafeJSON() to exclude sensitive fields
    // toSafeJSON() removes internal fields, returns only user-facing data
    res.json({
      filters: filters.map(f => f.toSafeJSON())
    });
  } catch (error) {
    // Log error for debugging
    // Include operation context so we know what failed
    attachError(req, error, { operation: 'filters_fetch' });

    // Return generic error response
    // Don't expose internal error details to user
    res.status(500).json({
      error: 'Failed to fetch filters',
      code: 'FILTERS_FETCH_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: POST /filters
// =============================================================================

/**
 * POST /filters
 * Create a new saved search filter
 *
 * WHAT IT DOES:
 * Saves a new search filter for the authenticated user.
 * Users can create filters to save complex search criteria and reuse them.
 * Instead of typing "priority=high AND status=active" every time,
 * users save this as a filter and click it to apply instantly.
 *
 * USE CASES:
 * - Save a complex search for quick access (e.g., "My High Priority Work")
 * - Create filtering shortcuts for common searches
 * - Store custom sort orders with filter sets
 * - Pin frequently-used searches in the UI
 *
 * REQUEST BODY:
 * {
 *   "name": "High Priority Tasks",           // Display name (required)
 *   "entityType": "task",                    // Type to filter: "note" or "task" (required)
 *   "filters": {                             // Search criteria object (optional)
 *     "priority": "high",
 *     "status": "active",
 *     "tags": ["urgent"]
 *   },
 *   "sortBy": "-updatedAt",                  // Sort order, default: "-updatedAt"
 *   "icon": "filter",                        // UI icon name, default: "filter"
 *   "color": "#FF6B6B"                       // Optional color for visual grouping
 * }
 *
 * EXAMPLE REQUEST:
 * POST /filters
 * {
 *   "name": "My Work This Month",
 *   "entityType": "note",
 *   "filters": {
 *     "tags": ["work"],
 *     "lifeAreaId": "507f1f77bcf86cd799439001",
 *     "createdAfter": "2025-02-01"
 *   },
 *   "sortBy": "-createdAt",
 *   "color": "#4ECDC4"
 * }
 *
 * EXAMPLE RESPONSE (201 Created):
 * {
 *   "message": "Filter saved successfully",
 *   "filter": {
 *     "id": "507f1f77bcf86cd799439013",
 *     "name": "My Work This Month",
 *     "entityType": "note",
 *     "filters": { "tags": ["work"], "lifeAreaId": "..." },
 *     "sortBy": "-createdAt",
 *     "icon": "filter",
 *     "color": "#4ECDC4",
 *     "createdAt": "2025-02-15T10:30:00.000Z"
 *   }
 * }
 *
 * VALIDATION RULES:
 * - name: Required, must be non-empty string (trimmed)
 * - entityType: Required, must be "note" or "task"
 * - filters: Optional, will default to empty object {}
 * - sortBy: Optional, defaults to "-updatedAt" (newest first)
 * - icon: Optional, defaults to "filter"
 * - color: Optional, can be null or valid color string
 *
 * RESPONSE CODES:
 * - 201: Filter created successfully
 * - 400: Validation error (missing name, invalid entityType, etc.)
 * - 500: Server error (database failure)
 */
router.post('/', async (req, res) => {
  try {
    // Step 1: Extract filter data from request body
    // These are the user-provided filter parameters
    const { name, entityType, filters, sortBy, icon, color } = req.body;

    // Step 2: Validate filter name
    // Name is required and cannot be just whitespace
    // Users need to name their filters for easy identification
    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Filter name is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Step 3: Validate entity type
    // Only notes and tasks support filters (for now)
    // This prevents creation of unsupported filter types
    if (!entityType || !['note', 'task'].includes(entityType)) {
      return res.status(400).json({
        error: 'Valid entity type is required (note or task)',
        code: 'VALIDATION_ERROR'
      });
    }

    // Step 4: Create new SavedFilter document
    // Assign default values for optional fields:
    // - filters defaults to {} (no search criteria)
    // - sortBy defaults to '-updatedAt' (newest first)
    // - icon defaults to 'filter' (generic filter icon)
    // - color defaults to null (no color coding)
    const filter = new SavedFilter({
      userId: req.user._id,              // Associate with current user
      name,
      entityType,
      filters: filters || {},
      sortBy: sortBy || '-updatedAt',
      icon: icon || 'filter',
      color: color || null
    });

    // Step 5: Save filter to database
    // MongoDB validates schema, creates timestamps, assigns _id
    await filter.save();

    // Step 6: Attach entity ID to request for analytics
    // This lets us track who creates filters, what types are popular, etc.
    attachEntityId(req, 'filterId', filter._id);
    req.eventName = 'filter.create.success';

    // Step 7: Return created filter with 201 status code
    // Use toSafeJSON() to exclude internal fields
    res.status(201).json({
      message: 'Filter saved successfully',
      filter: filter.toSafeJSON()
    });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'filter_create' });

    // Handle mongoose validation errors specifically
    // These occur when required fields fail validation
    if (error.name === 'ValidationError') {
      // Extract human-readable error messages from validation errors
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    // Return generic error for unexpected failures
    res.status(500).json({
      error: 'Failed to create filter',
      code: 'FILTER_CREATE_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: GET /filters/:id
// =============================================================================

/**
 * GET /filters/:id
 * Get a specific saved filter by its ID
 *
 * WHAT IT DOES:
 * Retrieves a single saved filter by ID.
 * Used when user clicks on a saved filter to view or apply its details.
 * Ensures user can only access their own filters (ownership check).
 *
 * USE CASES:
 * - Load filter details when user clicks to edit
 * - Display filter preview/summary
 * - Get filter criteria to apply to search
 * - Show filter details in a modal or sidebar
 *
 * PATH PARAMETERS:
 * - id: The filter's unique MongoDB ID (required)
 *   Example: /filters/507f1f77bcf86cd799439011
 *
 * EXAMPLE REQUEST:
 * GET /filters/507f1f77bcf86cd799439011
 *
 * EXAMPLE RESPONSE (200 OK):
 * {
 *   "filter": {
 *     "id": "507f1f77bcf86cd799439011",
 *     "name": "High Priority Tasks",
 *     "entityType": "task",
 *     "filters": { "priority": "high", "status": "active" },
 *     "sortBy": "-updatedAt",
 *     "icon": "filter",
 *     "color": null,
 *     "createdAt": "2025-02-15T10:30:00.000Z"
 *   }
 * }
 *
 * ERROR RESPONSES:
 * - 400: Invalid ID format (not a valid MongoDB ObjectId)
 * - 404: Filter not found or doesn't belong to user
 * - 500: Server error
 *
 * SECURITY:
 * The query includes userId filter so users can only access their own filters.
 * If a different user tries to access another user's filter ID, we return 404.
 */
router.get('/:id', async (req, res) => {
  try {
    // Step 1: Extract filter ID from URL path parameter
    const { id } = req.params;

    // Step 2: Validate that ID is a proper MongoDB ObjectId format
    // ObjectIds are 24-character hex strings (e.g., "507f1f77bcf86cd799439011")
    // If format is wrong, database query will fail, so check first
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid filter ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Query database for filter with this ID AND belonging to current user
    // The userId filter ensures users can only access their own filters
    // (prevents user A from loading user B's filter by guessing/knowing the ID)
    const filter = await SavedFilter.findOne({ _id: id, userId: req.user._id });

    // Step 4: Check if filter exists and belongs to user
    // If not found, return 404 (could mean ID doesn't exist OR doesn't belong to user)
    // From user's perspective, these cases are the same (can't access it)
    if (!filter) {
      return res.status(404).json({
        error: 'Filter not found',
        code: 'FILTER_NOT_FOUND'
      });
    }

    // Step 5: Return filter using toSafeJSON()
    // Excludes internal fields, returns only user-facing data
    res.json({ filter: filter.toSafeJSON() });
  } catch (error) {
    // Log error with context for debugging
    attachError(req, error, { operation: 'filter_fetch', filterId: req.params.id });

    // Return generic error response
    res.status(500).json({
      error: 'Failed to fetch filter',
      code: 'FILTER_FETCH_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: PATCH /filters/:id
// =============================================================================

/**
 * PATCH /filters/:id
 * Update an existing saved filter
 *
 * WHAT IT DOES:
 * Updates one or more fields of an existing saved filter.
 * User can change filter name, search criteria, sort order, icon, or color.
 * Automatically runs validation and rejects invalid updates.
 *
 * USE CASES:
 * - Edit filter name (e.g., "High Priority" → "High Priority (Urgent)")
 * - Change search criteria (adjust what the filter searches for)
 * - Modify sort order
 * - Change filter color/icon for visual organization
 * - Update any combination of fields at once
 *
 * PATH PARAMETERS:
 * - id: The filter's unique MongoDB ID (required)
 *   Example: /filters/507f1f77bcf86cd799439011
 *
 * REQUEST BODY (all fields optional):
 * {
 *   "name": "Updated Filter Name",
 *   "filters": { "priority": "high", "status": "active" },
 *   "sortBy": "-createdAt",
 *   "icon": "star",
 *   "color": "#FF6B6B"
 * }
 *
 * EXAMPLE REQUEST:
 * PATCH /filters/507f1f77bcf86cd799439011
 * {
 *   "name": "High Priority (Urgent)",
 *   "filters": { "priority": "high", "status": "active", "daysOverdue": { "$gt": 0 } },
 *   "color": "#FF0000"
 * }
 *
 * EXAMPLE RESPONSE (200 OK):
 * {
 *   "message": "Filter updated successfully",
 *   "filter": {
 *     "id": "507f1f77bcf86cd799439011",
 *     "name": "High Priority (Urgent)",
 *     "entityType": "task",
 *     "filters": { "priority": "high", "status": "active", "daysOverdue": { "$gt": 0 } },
 *     "sortBy": "-updatedAt",
 *     "icon": "filter",
 *     "color": "#FF0000",
 *     "createdAt": "2025-02-15T10:30:00.000Z",
 *     "updatedAt": "2025-02-15T11:45:00.000Z"
 *   }
 * }
 *
 * PROTECTED FIELDS (cannot be updated):
 * - _id: Filter ID is immutable
 * - userId: Cannot change filter ownership
 * - createdAt: Creation date cannot be changed
 *
 * VALIDATION:
 * All updates are validated against the SavedFilter schema.
 * If validation fails, returns 400 with error details.
 *
 * ERROR RESPONSES:
 * - 400: Invalid ID format or validation failure
 * - 404: Filter not found or doesn't belong to user
 * - 500: Server error
 */
router.patch('/:id', async (req, res) => {
  try {
    // Step 1: Extract filter ID from URL
    const { id } = req.params;

    // Step 2: Validate ID format before querying database
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid filter ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Get update fields from request body
    const updates = req.body;

    // Step 4: Remove protected fields to prevent users from modifying them
    // Users cannot change filter ID, ownership, or creation date via PATCH
    // Even if frontend accidentally sends these, we strip them out
    delete updates._id;
    delete updates.userId;
    delete updates.createdAt;

    // Step 5: Query database to find and update filter
    // findOneAndUpdate is atomic (update happens in one operation)
    // { new: true } returns the updated document (not the old one)
    // { runValidators: true } runs schema validation on updates
    // The query includes userId for ownership check (privacy/security)
    const filter = await SavedFilter.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { $set: updates },                          // MongoDB $set operator applies updates
      { new: true, runValidators: true }          // Return updated doc, validate
    );

    // Step 6: Check if filter exists and belongs to user
    if (!filter) {
      return res.status(404).json({
        error: 'Filter not found',
        code: 'FILTER_NOT_FOUND'
      });
    }

    // Step 7: Attach entity ID for analytics
    attachEntityId(req, 'filterId', filter._id);
    req.eventName = 'filter.update.success';

    // Step 8: Return updated filter
    res.json({
      message: 'Filter updated successfully',
      filter: filter.toSafeJSON()
    });
  } catch (error) {
    // Log error with context
    attachError(req, error, { operation: 'filter_update', filterId: req.params.id });

    // Handle mongoose validation errors specifically
    if (error.name === 'ValidationError') {
      // Extract error messages for user feedback
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    // Return generic error for unexpected failures
    res.status(500).json({
      error: 'Failed to update filter',
      code: 'FILTER_UPDATE_ERROR'
    });
  }
});

// =============================================================================
// ROUTE: DELETE /filters/:id
// =============================================================================

/**
 * DELETE /filters/:id
 * Permanently delete a saved filter
 *
 * WHAT IT DOES:
 * Permanently deletes a saved filter from the database.
 * Once deleted, the filter cannot be recovered (no trash/restore).
 * Only the filter owner can delete their own filters.
 *
 * USE CASES:
 * - Remove filters user no longer needs
 * - Clean up/declutter filter list
 * - Remove outdated or incorrect filters
 * - Manage storage (filters take minimal space but support cleanup)
 *
 * PATH PARAMETERS:
 * - id: The filter's unique MongoDB ID (required)
 *   Example: /filters/507f1f77bcf86cd799439011
 *
 * EXAMPLE REQUEST:
 * DELETE /filters/507f1f77bcf86cd799439011
 *
 * EXAMPLE RESPONSE (200 OK):
 * {
 *   "message": "Filter deleted successfully"
 * }
 *
 * PERMANENT DELETION:
 * Unlike notes/tasks/projects, filters cannot be recovered after deletion.
 * This is acceptable because:
 * - Filters are easy to recreate (no data loss, just configuration)
 * - Users rarely need to recover deleted filters
 * - No soft-delete overhead for something so lightweight
 *
 * ERROR RESPONSES:
 * - 400: Invalid ID format
 * - 404: Filter not found or doesn't belong to user
 * - 500: Server error
 *
 * SECURITY:
 * The query includes userId so users can only delete their own filters.
 * Prevents deletion of other users' filters by ID.
 */
router.delete('/:id', async (req, res) => {
  try {
    // Step 1: Extract filter ID from URL
    const { id } = req.params;

    // Step 2: Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid filter ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Query database to find and delete filter in one operation
    // findOneAndDelete removes the document and returns what was deleted
    // The userId filter ensures we only delete user's own filters
    const filter = await SavedFilter.findOneAndDelete({ _id: id, userId: req.user._id });

    // Step 4: Check if filter existed and belonged to user
    if (!filter) {
      return res.status(404).json({
        error: 'Filter not found',
        code: 'FILTER_NOT_FOUND'
      });
    }

    // Step 5: Attach entity ID for analytics
    // Track which filters users delete (helps understand feature usage)
    attachEntityId(req, 'filterId', filter._id);
    req.eventName = 'filter.delete.success';

    // Step 6: Return success message
    res.json({ message: 'Filter deleted successfully' });
  } catch (error) {
    // Log error with context
    attachError(req, error, { operation: 'filter_delete', filterId: req.params.id });

    // Return generic error response
    res.status(500).json({
      error: 'Failed to delete filter',
      code: 'FILTER_DELETE_ERROR'
    });
  }
});

export default router;
