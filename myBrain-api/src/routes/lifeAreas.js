/**
 * =============================================================================
 * LIFEAREAS.JS - Life Areas (Categories) Routes
 * =============================================================================
 *
 * This file handles Life Areas in myBrain - personal categories for
 * organizing all your content and activities across different areas of life.
 *
 * WHAT ARE LIFE AREAS?
 * --------------------
 * Life Areas are broad categories that represent different aspects of your life.
 * They help you organize and track everything across all domains.
 *
 * EXAMPLE LIFE AREAS:
 * -------------------
 * - WORK: Job, career, professional development
 * - HEALTH: Exercise, nutrition, medical appointments
 * - FAMILY: Relationships, events, family goals
 * - PERSONAL: Hobbies, learning, self-improvement
 * - FINANCE: Budgeting, investments, expenses
 * - RECREATION: Entertainment, travel, fun activities
 * - RELATIONSHIPS: Friends, social connections
 * - GROWTH: Learning, courses, skill development
 *
 * WHAT CAN HAVE A LIFE AREA?
 * --------------------------
 * Life Areas can be assigned to:
 * - TASKS: "Call mom" → FAMILY life area
 * - NOTES: "Project research" → WORK life area
 * - PROJECTS: "Renovate kitchen" → HOME life area
 * - EVENTS: "Doctor appointment" → HEALTH life area
 *
 * DEFAULT LIFE AREAS:
 * -------------------
 * Every new user gets these default areas (can be customized):
 * 1. WORK
 * 2. PERSONAL
 * 3. HEALTH
 * 4. FAMILY
 *
 * CUSTOM LIFE AREAS:
 * ------------------
 * Users can create custom areas:
 * - Maximum 20 life areas per user
 * - Can set custom names and descriptions
 * - Can set custom colors/icons
 * - Can archive areas they're not using
 *
 * COLOR & VISUALIZATION:
 * ----------------------
 * Each life area has:
 * - NAME: Display name (e.g., "Work")
 * - ICON: Visual icon (e.g., briefcase for work)
 * - COLOR: Hex color for visual distinction
 * - DESCRIPTION: Optional explanation
 *
 * ENDPOINTS:
 * -----------
 * - GET /life-areas - Get all life areas
 * - GET /life-areas/:id - Get single life area with stats
 * - POST /life-areas - Create new life area
 * - PUT /life-areas/:id - Update life area (name, color, icon)
 * - DELETE /life-areas/:id - Delete life area (must be empty)
 * - POST /life-areas/:id/archive - Archive a life area
 * - POST /life-areas/:id/unarchive - Unarchive a life area
 * - GET /life-areas/:id/stats - Get stats (# tasks, notes, projects)
 *
 * USAGE PATTERNS:
 * ----------------
 * - Filter content by life area (show only work tasks)
 * - View summary by life area (health wins this week)
 * - Archive old life areas (when you change jobs)
 * - Reorder life areas (drag-and-drop priority)
 *
 * =============================================================================
 */

/**
 * Express is the web framework that handles HTTP requests and routing.
 * We use it to define API endpoints (URLs that the frontend can call).
 * Each router.get/post/patch/delete defines a different life area operation.
 */
import express from 'express';

/**
 * Mongoose provides database utilities, especially ObjectId validation.
 * We use mongoose.Types.ObjectId.isValid() to validate life area IDs
 * before querying the database (prevents invalid queries).
 */
import mongoose from 'mongoose';

/**
 * Auth middleware checks that the user is logged in.
 * Every life area request must include a valid JWT token in the Authorization header.
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
 * Request logger middleware tracks entity IDs and event names for analytics.
 * When we attach an entity ID, it lets us search logs for specific life areas.
 * Example: attachEntityId(req, 'lifeAreaId', lifeArea._id) for usage tracking.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

/**
 * Limit middleware enforces quotas on user actions.
 * Prevents unlimited creation of life areas.
 * Free users: 20 life areas max | Premium users: 50 life areas max
 */
import { requireLimit } from '../middleware/limitEnforcement.js';

/**
 * lifeAreaService contains all business logic for life area operations.
 * Instead of building database queries in this route file, we call service methods:
 * - getLifeAreas() for listing
 * - createLifeArea() for creation
 * - updateLifeArea() for updates
 * - deleteLifeArea() for deletion
 * This separation keeps routes simple and logic reusable/testable.
 */
import lifeAreaService from '../services/lifeAreaService.js';

// Create an Express router to group all life area-related endpoints together
const router = express.Router();

// =============================================================================
// MIDDLEWARE: AUTHENTICATION
// =============================================================================
// All life area routes require the user to be logged in.
// requireAuth middleware checks that the Authorization header contains a valid JWT token.
// This prevents unauthorized access to user's life areas.
router.use(requireAuth);

/**
 * GET /life-areas
 * Get all life areas for the user
 *
 * WHAT IT DOES:
 * Retrieves all life area categories belonging to the authenticated user.
 * Optionally includes archived life areas (hidden by default).
 * Returns life areas sorted by user's preferred order.
 *
 * USE CASES:
 * - Display life area list in sidebar
 * - Show dropdown menu of available life areas when filtering
 * - Load life area selector when creating tasks/notes/projects
 * - Display all life areas for management/editing
 *
 * QUERY PARAMETERS:
 * - includeArchived: Optional, "true" to include archived life areas
 *   Default: "false" (only show active life areas)
 *   Example: /life-areas?includeArchived=true
 *
 * EXAMPLE REQUEST:
 * GET /life-areas
 * GET /life-areas?includeArchived=true
 *
 * EXAMPLE RESPONSE:
 * {
 *   lifeAreas: [
 *     {
 *       id: "507f1f77bcf86cd799439011",
 *       name: "Work",
 *       description: "Job and career",
 *       icon: "briefcase",
 *       color: "#FF6B6B",
 *       order: 1,
 *       archived: false,
 *       createdAt: "2025-02-01T10:00:00Z"
 *     },
 *     {
 *       id: "507f1f77bcf86cd799439012",
 *       name: "Health",
 *       description: "Exercise, diet, medical",
 *       icon: "heart",
 *       color: "#51CF66",
 *       order: 2,
 *       archived: false,
 *       createdAt: "2025-02-01T10:00:00Z"
 *     }
 *   ]
 * }
 */
router.get('/', async (req, res) => {
  try {
    const { includeArchived = 'false' } = req.query;
    const lifeAreas = await lifeAreaService.getLifeAreas(
      req.user._id,
      includeArchived === 'true'
    );

    res.json({
      lifeAreas: lifeAreas.map(la => la.toSafeJSON())
    });
  } catch (error) {
    attachError(req, error, { operation: 'life_areas_fetch' });
    res.status(500).json({
      error: 'Failed to fetch categories',
      code: 'LIFE_AREAS_FETCH_ERROR'
    });
  }
});

/**
 * GET /life-areas/:id
 * Get a single life area by ID with optional stats
 *
 * WHAT IT DOES:
 * Fetches complete details for a single life area.
 * Optionally includes counts of tasks, notes, and projects in that life area.
 * Useful for displaying detailed life area info and statistics.
 *
 * USE CASES:
 * - Show life area details in sidebar/settings
 * - Display stats: "You have 5 work tasks"
 * - Edit life area (name, color, icon)
 * - View progress in a specific life area
 *
 * PATH PARAMETERS:
 * - id: Life area ID (MongoDB ObjectId)
 *
 * QUERY PARAMETERS:
 * - includeCounts: Optional, "true" to calculate item counts
 *   Includes: tasksCount, notesCount, projectsCount
 *   Default: "false" (faster response without counts)
 *
 * EXAMPLE REQUEST:
 * GET /life-areas/507f1f77bcf86cd799439011
 * GET /life-areas/507f1f77bcf86cd799439011?includeCounts=true
 *
 * EXAMPLE RESPONSE:
 * {
 *   lifeArea: {
 *     id: "507f1f77bcf86cd799439011",
 *     name: "Work",
 *     description: "Job and career related tasks",
 *     icon: "briefcase",
 *     color: "#FF6B6B",
 *     order: 1,
 *     archived: false,
 *     tasksCount: 5,        (only if includeCounts=true)
 *     notesCount: 12,       (only if includeCounts=true)
 *     projectsCount: 2,     (only if includeCounts=true)
 *     createdAt: "2025-02-01T10:00:00Z",
 *     updatedAt: "2025-02-15T10:00:00Z"
 *   }
 * }
 */
router.get('/:id', async (req, res) => {
  try {
    // Step 1: Extract life area ID from URL and query parameters
    const { id } = req.params;
    const { includeCounts = 'false' } = req.query;

    // Step 2: Validate that the ID is a valid MongoDB ObjectId format
    // Prevents malformed requests before querying database
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid category ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Call service to fetch life area with optional counts
    // includeCounts determines if we calculate items in this area
    const lifeArea = await lifeAreaService.getLifeAreaById(
      req.user._id,
      id,
      includeCounts === 'true'  // Convert string to boolean
    );

    // Step 4: Check if life area exists
    // Returns 404 if not found (either doesn't exist or user doesn't own it)
    if (!lifeArea) {
      return res.status(404).json({
        error: 'Category not found',
        code: 'LIFE_AREA_NOT_FOUND'
      });
    }

    // Step 5: Return life area details
    // Use toSafeJSON() to exclude sensitive fields if available
    res.json({
      lifeArea: lifeArea.toSafeJSON ? lifeArea.toSafeJSON() : lifeArea
    });
  } catch (error) {
    // Log error with context for debugging
    attachError(req, error, { operation: 'life_area_fetch', lifeAreaId: req.params.id });
    res.status(500).json({
      error: 'Failed to fetch category',
      code: 'LIFE_AREA_FETCH_ERROR'
    });
  }
});

/**
 * POST /life-areas
 * Create a new life area category
 *
 * WHAT IT DOES:
 * Creates a new life area that the user can assign to tasks, notes, and projects.
 * Users can customize the name, description, color, and icon.
 *
 * STORAGE LIMITS:
 * Free users: 20 life areas max (402 if exceeded)
 * Premium users: 50 life areas max
 *
 * REQUEST BODY:
 * {
 *   "name": "Side Projects" (required),
 *   "description": "Personal projects and learning",
 *   "icon": "rocket",
 *   "color": "#FF6B6B"
 * }
 *
 * EXAMPLE RESPONSE (201 Created):
 * {
 *   "message": "Category created successfully",
 *   "lifeArea": {
 *     "id": "507f1f77bcf86cd799439013",
 *     "name": "Side Projects",
 *     "description": "Personal projects and learning",
 *     "icon": "rocket",
 *     "color": "#FF6B6B",
 *     "order": 5,
 *     "archived": false,
 *     "createdAt": "2025-02-15T10:30:00Z"
 *   }
 * }
 */
router.post('/', requireLimit('categories'), async (req, res) => {
  try {
    // Step 1: Extract life area details from request body
    // Only name is required; others are optional
    const { name, description, color, icon } = req.body;

    // Step 2: Validate required fields
    // Name cannot be empty or just whitespace
    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Category name is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Step 3: Call service to create life area
    // Service handles:
    // - Assigning next sequential order number
    // - Setting default icon/color if not provided
    // - Creating the document in database
    // - Checking user hasn't exceeded limit (handled by middleware)
    const lifeArea = await lifeAreaService.createLifeArea(req.user._id, {
      name,
      description,
      color,
      icon
    });

    // Step 4: Log the successful creation for audit trail
    attachEntityId(req, 'lifeAreaId', lifeArea._id);
    req.eventName = 'lifeArea.create.success';

    // Step 5: Return 201 Created with the new life area
    res.status(201).json({
      message: 'Category created successfully',
      lifeArea: lifeArea.toSafeJSON()
    });
  } catch (error) {
    // Log error with operation context
    attachError(req, error, { operation: 'life_area_create' });

    // Handle MongoDB schema validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    // Other unexpected errors
    res.status(500).json({
      error: 'Failed to create category',
      code: 'LIFE_AREA_CREATE_ERROR'
    });
  }
});

/**
 * PATCH /life-areas/:id
 * Update a life area (name, description, color, icon)
 *
 * WHAT IT DOES:
 * Updates properties of an existing life area.
 * Allows customizing appearance and metadata of the category.
 *
 * UPDATEABLE FIELDS:
 * - name: Display name (required, non-empty)
 * - description: Optional description text
 * - color: Hex color code for UI display
 * - icon: Icon identifier (e.g., "briefcase", "heart")
 *
 * @param {string} req.params.id - Life area ID (MongoDB ObjectId)
 * @param {string} req.body.name - New name (optional)
 * @param {string} req.body.description - New description (optional)
 * @param {string} req.body.color - New color code (optional)
 * @param {string} req.body.icon - New icon (optional)
 *
 * @returns {Object} - Updated life area:
 * {
 *   message: "Category updated successfully",
 *   lifeArea: {
 *     id: "507f1f77bcf86cd799439011",
 *     name: "Work Updated",
 *     description: "Job and career",
 *     icon: "briefcase",
 *     color: "#FF6B6B",
 *     order: 1,
 *     archived: false,
 *     createdAt: "2025-02-01T10:00:00Z"
 *   }
 * }
 *
 * @throws {400} - Invalid ID or validation error
 * @throws {404} - Life area not found
 * @throws {401} - User not authenticated
 * @throws {500} - Database error
 *
 * EXAMPLE REQUEST:
 * PATCH /life-areas/507f1f77bcf86cd799439011
 * Body: { name: "Work", color: "#FF6B6B" }
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Category updated successfully",
 *   lifeArea: {
 *     id: "...",
 *     name: "Work",
 *     color: "#FF6B6B"
 *   }
 * }
 *
 * WIDE EVENTS LOGGING:
 * - attachEntityId(req, 'lifeAreaId', lifeArea._id): Track updated area
 * - req.eventName = 'lifeArea.update.success': Event type
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid category ID',
        code: 'INVALID_ID'
      });
    }

    const updates = req.body;
    const lifeArea = await lifeAreaService.updateLifeArea(req.user._id, id, updates);

    if (!lifeArea) {
      return res.status(404).json({
        error: 'Category not found',
        code: 'LIFE_AREA_NOT_FOUND'
      });
    }

    attachEntityId(req, 'lifeAreaId', lifeArea._id);
    req.eventName = 'lifeArea.update.success';

    res.json({
      message: 'Category updated successfully',
      lifeArea: lifeArea.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'life_area_update', lifeAreaId: req.params.id });

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      error: 'Failed to update category',
      code: 'LIFE_AREA_UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /life-areas/:id
 * Delete a life area (reassigns items to default)
 *
 * WHAT IT DOES:
 * Permanently deletes a life area. All items (tasks, notes, projects)
 * that were in this area are automatically reassigned to the default area.
 *
 * SAFETY MEASURES:
 * - Cannot delete the default life area
 * - Items are not lost; they're moved to default area
 * - Area metadata is removed, but content is preserved
 *
 * USE CASES:
 * - Remove duplicate or renamed categories
 * - Clean up unused areas
 * - Reorganize after changing structure
 *
 * @param {string} req.params.id - Life area ID to delete (MongoDB ObjectId)
 *
 * @returns {Object} - Deletion result:
 * {
 *   message: "Category deleted successfully",
 *   deletedArea: {
 *     id: "507f1f77bcf86cd799439011",
 *     name: "Archived Work",
 *     icon: "briefcase"
 *   },
 *   reassignedTo: {
 *     id: "507f1f77bcf86cd799439099",
 *     name: "Personal",
 *     icon: "star"
 *   }
 * }
 *
 * @throws {400} - Invalid ID or cannot delete default
 * @throws {404} - Life area not found
 * @throws {401} - User not authenticated
 * @throws {500} - Database error
 *
 * EXAMPLE REQUEST:
 * DELETE /life-areas/507f1f77bcf86cd799439011
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Category deleted successfully",
 *   deletedArea: { id: "...", name: "Archived Work" },
 *   reassignedTo: { id: "...", name: "Personal" }
 * }
 *
 * WIDE EVENTS LOGGING:
 * - attachEntityId(req, 'lifeAreaId', result.deleted._id): Track deleted area
 * - req.eventName = 'lifeArea.delete.success': Event type
 *
 * WARNING:
 * - Cannot delete the default/primary life area
 * - All items in this area will be moved to default
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid category ID',
        code: 'INVALID_ID'
      });
    }

    const result = await lifeAreaService.deleteLifeArea(req.user._id, id);

    if (!result) {
      return res.status(404).json({
        error: 'Category not found',
        code: 'LIFE_AREA_NOT_FOUND'
      });
    }

    attachEntityId(req, 'lifeAreaId', result.deleted._id);
    req.eventName = 'lifeArea.delete.success';

    res.json({
      message: 'Category deleted successfully',
      deletedArea: result.deleted.toSafeJSON(),
      reassignedTo: result.reassignedTo.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'life_area_delete', lifeAreaId: req.params.id });

    if (error.message === 'Cannot delete the default category') {
      return res.status(400).json({
        error: error.message,
        code: 'CANNOT_DELETE_DEFAULT'
      });
    }

    res.status(500).json({
      error: 'Failed to delete category',
      code: 'LIFE_AREA_DELETE_ERROR'
    });
  }
});

/**
 * POST /life-areas/:id/set-default
 * Set a life area as the default
 *
 * WHAT IT DOES:
 * Sets a life area as the default/primary category.
 * When users create new items without specifying a life area, they're assigned to the default.
 *
 * WHY HAVE A DEFAULT?
 * - Every item must belong to a life area
 * - Provides a fallback if user doesn't choose
 * - Used when life areas are required but not specified
 *
 * @param {string} req.params.id - Life area ID to set as default (MongoDB ObjectId)
 *
 * @returns {Object} - Updated default area:
 * {
 *   message: "Default category set successfully",
 *   lifeArea: {
 *     id: "507f1f77bcf86cd799439011",
 *     name: "Personal",
 *     icon: "star",
 *     color: "#FF6B6B",
 *     isDefault: true,
 *     createdAt: "2025-02-01T10:00:00Z"
 *   }
 * }
 *
 * @throws {400} - Invalid ID
 * @throws {404} - Life area not found
 * @throws {401} - User not authenticated
 * @throws {500} - Database error
 *
 * EXAMPLE REQUEST:
 * POST /life-areas/507f1f77bcf86cd799439011/set-default
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Default category set successfully",
 *   lifeArea: { id: "...", name: "Personal", isDefault: true }
 * }
 *
 * WIDE EVENTS LOGGING:
 * - attachEntityId(req, 'lifeAreaId', lifeArea._id): Track default area
 * - req.eventName = 'lifeArea.setDefault.success': Event type
 */
router.post('/:id/set-default', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid category ID',
        code: 'INVALID_ID'
      });
    }

    const lifeArea = await lifeAreaService.setDefault(req.user._id, id);

    if (!lifeArea) {
      return res.status(404).json({
        error: 'Category not found',
        code: 'LIFE_AREA_NOT_FOUND'
      });
    }

    attachEntityId(req, 'lifeAreaId', lifeArea._id);
    req.eventName = 'lifeArea.setDefault.success';

    res.json({
      message: 'Default category set successfully',
      lifeArea: lifeArea.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'life_area_set_default', lifeAreaId: req.params.id });
    res.status(500).json({
      error: 'Failed to set default category',
      code: 'SET_DEFAULT_ERROR'
    });
  }
});

/**
 * POST /life-areas/reorder
 * Reorder life areas (update sort order)
 *
 * WHAT IT DOES:
 * Updates the display order of life areas in the sidebar and UI.
 * Allows users to organize areas by importance or preference.
 *
 * HOW IT WORKS:
 * Accepts an array of life area IDs in the desired order.
 * Each area is assigned a new order value (1, 2, 3, etc.).
 *
 * USE CASES:
 * - Move "Work" to the top
 * - Organize by frequency of use
 * - Create custom sidebar layout
 * - Drag-and-drop reordering in UI
 *
 * @param {array} req.body.orderedIds - Array of life area IDs in desired order (required, non-empty)
 *   Example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 *
 * @returns {Object} - Reordered life areas:
 * {
 *   message: "Categories reordered successfully",
 *   lifeAreas: [
 *     {
 *       id: "507f1f77bcf86cd799439011",
 *       name: "Work",
 *       order: 1
 *     },
 *     {
 *       id: "507f1f77bcf86cd799439012",
 *       name: "Health",
 *       order: 2
 *     }
 *   ]
 * }
 *
 * @throws {400} - Invalid orderedIds (not array or invalid format)
 * @throws {401} - User not authenticated
 * @throws {500} - Database error
 *
 * EXAMPLE REQUEST:
 * POST /life-areas/reorder
 * Body: {
 *   orderedIds: [
 *     "507f1f77bcf86cd799439011",
 *     "507f1f77bcf86cd799439012",
 *     "507f1f77bcf86cd799439013"
 *   ]
 * }
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Categories reordered successfully",
 *   lifeAreas: [
 *     { id: "...", name: "Work", order: 1 },
 *     { id: "...", name: "Health", order: 2 },
 *     { id: "...", name: "Personal", order: 3 }
 *   ]
 * }
 *
 * WIDE EVENTS LOGGING:
 * - req.eventName = 'lifeArea.reorder.success': Event type
 */
router.post('/reorder', async (req, res) => {
  try {
    const { orderedIds } = req.body;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({
        error: 'orderedIds must be a non-empty array',
        code: 'VALIDATION_ERROR'
      });
    }

    // =====================================================
    // VALIDATION: Verify all IDs are valid ObjectIds
    // =====================================================
    // Check that every ID in the array is a valid MongoDB ObjectId format
    const invalidIds = orderedIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        error: 'Invalid ID(s) in orderedIds',
        code: 'INVALID_ID'
      });
    }

    // =====================================================
    // REORDER: Update the sort order of life areas
    // =====================================================
    // Service updates each area with its new position
    await lifeAreaService.reorderLifeAreas(req.user._id, orderedIds);

    // =====================================================
    // FETCH: Get updated life areas to confirm changes
    // =====================================================
    // Return the reordered list so frontend can update immediately
    const lifeAreas = await lifeAreaService.getLifeAreas(req.user._id);

    // =====================================================
    // LOGGING: Track the reordering action
    // =====================================================
    req.eventName = 'lifeArea.reorder.success';

    // =====================================================
    // RESPONSE: Return success with new order
    // =====================================================
    res.json({
      message: 'Categories reordered successfully',
      lifeAreas: lifeAreas.map(la => la.toSafeJSON())
    });
  } catch (error) {
    attachError(req, error, { operation: 'life_areas_reorder' });
    res.status(500).json({
      error: 'Failed to reorder categories',
      code: 'REORDER_ERROR'
    });
  }
});

/**
 * POST /life-areas/:id/archive
 * Archive or unarchive a life area
 *
 * WHAT IT DOES:
 * Hides or shows a life area in the main UI.
 * Archived areas can be restored without losing data.
 *
 * ARCHIVING VS DELETION:
 * - ARCHIVE: Hidden from UI (archived: true), items still in area, can be restored
 * - DELETE: Area is completely removed, items reassigned to default
 *
 * USE CASES:
 * - Temporarily hide a life area
 * - Archive seasonal areas (e.g., "Annual project")
 * - Clean up sidebar while keeping historical data
 * - Re-activate when needed
 *
 * @param {string} req.params.id - Life area ID (MongoDB ObjectId)
 * @param {boolean} req.body.isArchived - Archive (true) or unarchive (false) (default: true)
 *
 * @returns {Object} - Archived/unarchived area:
 * {
 *   message: "Category archived",
 *   lifeArea: {
 *     id: "507f1f77bcf86cd799439011",
 *     name: "Old Project",
 *     archived: true,
 *     createdAt: "2025-02-01T10:00:00Z"
 *   }
 * }
 *
 * @throws {400} - Invalid ID or cannot archive default
 * @throws {404} - Life area not found
 * @throws {401} - User not authenticated
 * @throws {500} - Database error
 *
 * EXAMPLE REQUEST (archive):
 * POST /life-areas/507f1f77bcf86cd799439011/archive
 * Body: { isArchived: true }
 *
 * EXAMPLE REQUEST (unarchive):
 * POST /life-areas/507f1f77bcf86cd799439011/archive
 * Body: { isArchived: false }
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Category archived",
 *   lifeArea: { id: "...", name: "Old Project", archived: true }
 * }
 *
 * WIDE EVENTS LOGGING:
 * - attachEntityId(req, 'lifeAreaId', lifeArea._id): Track archived area
 * - req.eventName = 'lifeArea.archive.success' or 'lifeArea.unarchive.success': Event type
 *
 * WARNING:
 * - Cannot archive the default category
 * - Items in archived areas remain there
 */
router.post('/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    const { isArchived = true } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid category ID',
        code: 'INVALID_ID'
      });
    }

    const lifeArea = await lifeAreaService.archiveLifeArea(req.user._id, id, isArchived);

    if (!lifeArea) {
      return res.status(404).json({
        error: 'Category not found',
        code: 'LIFE_AREA_NOT_FOUND'
      });
    }

    attachEntityId(req, 'lifeAreaId', lifeArea._id);
    req.eventName = isArchived ? 'lifeArea.archive.success' : 'lifeArea.unarchive.success';

    res.json({
      message: isArchived ? 'Category archived' : 'Category unarchived',
      lifeArea: lifeArea.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'life_area_archive', lifeAreaId: req.params.id });

    if (error.message === 'Cannot archive the default category') {
      return res.status(400).json({
        error: error.message,
        code: 'CANNOT_ARCHIVE_DEFAULT'
      });
    }

    res.status(500).json({
      error: 'Failed to archive category',
      code: 'ARCHIVE_ERROR'
    });
  }
});

/**
 * GET /life-areas/:id/items
 * Get all items in a life area (notes, tasks, events, projects)
 *
 * WHAT IT DOES:
 * Retrieves all content (notes, tasks, projects, events) that belong to a specific life area.
 * Useful for viewing an area's complete contents or filtering by type.
 *
 * ITEM TYPES SUPPORTED:
 * - note: User notes
 * - task: To-do tasks
 * - event: Calendar events
 * - project: Projects with tasks
 *
 * USE CASES:
 * - View all "Work" items
 * - Show tasks and events due in "Health" category
 * - Generate reports by life area
 * - Filter dashboard by area
 *
 * @param {string} req.params.id - Life area ID (MongoDB ObjectId)
 * @param {string} req.query.types - Comma-separated item types to include
 *   Options: 'note,task,event,project' (default: all)
 * @param {number} req.query.limit - Max items per type (default: 50, max: 100)
 * @param {number} req.query.skip - Items to skip for pagination (default: 0)
 *
 * @returns {Object} - Items organized by type:
 * {
 *   notes: [
 *     {
 *       _id: "507f1f77bcf86cd799439011",
 *       title: "Project Notes",
 *       body: "Discussion points...",
 *       createdAt: "2025-01-20T10:00:00Z"
 *     }
 *   ],
 *   tasks: [
 *     {
 *       _id: "507f1f77bcf86cd799439012",
 *       title: "Complete report",
 *       dueDate: "2025-01-25T00:00:00Z",
 *       completed: false
 *     }
 *   ],
 *   events: [...],
 *   projects: [...]
 * }
 *
 * @throws {400} - Invalid life area ID
 * @throws {404} - Life area not found (implicit in empty results)
 * @throws {401} - User not authenticated
 * @throws {500} - Database error
 *
 * EXAMPLE REQUEST (all types):
 * GET /life-areas/507f1f77bcf86cd799439011/items
 *
 * EXAMPLE REQUEST (specific types):
 * GET /life-areas/507f1f77bcf86cd799439011/items?types=task,event&limit=20
 *
 * EXAMPLE RESPONSE:
 * {
 *   tasks: [
 *     { _id: "...", title: "Complete report", dueDate: "2025-01-25" }
 *   ],
 *   events: [
 *     { _id: "...", title: "Team Meeting", startTime: "2025-01-22T14:00:00Z" }
 *   ]
 * }
 */
router.get('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const { types, limit = '50', skip = '0' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid category ID',
        code: 'INVALID_ID'
      });
    }

    // =====================================================
    // PARSE OPTIONS: Determine what item types to fetch
    // =====================================================
    // If types provided, use them; otherwise fetch all types
    const options = {
      types: types ? types.split(',') : ['note', 'task', 'event', 'project'],
      limit: Math.min(parseInt(limit) || 50, 100),  // Cap at 100
      skip: parseInt(skip) || 0
    };

    // =====================================================
    // FETCH ITEMS: Query all items in this area
    // =====================================================
    const items = await lifeAreaService.getLifeAreaItems(req.user._id, id, options);

    // =====================================================
    // TRANSFORM: Convert to safe JSON format
    // =====================================================
    // Each item type uses its own toSafeJSON() method or equivalent
    const result = {};
    if (items.notes) {
      result.notes = items.notes.map(n => n.toSafeJSON());
    }
    if (items.tasks) {
      result.tasks = items.tasks.map(t => t.toSafeJSON());
    }
    if (items.events) {
      result.events = items.events.map(e => e.toObject());
    }
    if (items.projects) {
      result.projects = items.projects.map(p => p.toSafeJSON());
    }

    // =====================================================
    // RESPONSE: Return organized items
    // =====================================================
    res.json(result);
  } catch (error) {
    attachError(req, error, { operation: 'life_area_items_fetch', lifeAreaId: req.params.id });
    res.status(500).json({
      error: 'Failed to fetch items',
      code: 'ITEMS_FETCH_ERROR'
    });
  }
});

export default router;
