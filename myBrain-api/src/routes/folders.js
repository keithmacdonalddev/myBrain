/**
 * =============================================================================
 * FOLDERS.JS - File Folder Organization Routes
 * =============================================================================
 *
 * This file handles folder creation, management, and organization in myBrain.
 * Folders allow users to organize their files hierarchically, like on a computer.
 *
 * WHAT ARE FOLDERS?
 * -----------------
 * Folders are containers for organizing files. You can:
 * - Create nested folders (folder inside folder inside folder)
 * - Move files between folders
 * - Share entire folders with other users
 * - Name and rename folders
 * - Delete empty folders
 *
 * FOLDER STRUCTURE EXAMPLE:
 * -------------------------
 * My Files/
 * ├── Work/
 * │   ├── Projects/
 * │   │   ├── project_2024.docx
 * │   │   └── budget.xlsx
 * │   └── Meetings/
 * │       └── meeting_notes.txt
 * ├── Personal/
 * │   ├── Receipts/
 * │   │   └── invoice.pdf
 * │   └── Photos/
 * └── Archive/
 *
 * FOLDER OPERATIONS:
 * ------------------
 * - CREATE: Make new folder (at root or in another folder)
 * - READ: View folder contents (files + subfolders)
 * - UPDATE: Rename folder or move it
 * - DELETE: Remove empty folder
 * - SHARE: Give other users access to entire folder
 *
 * DEPTH LIMITS:
 * ---------------
 * Maximum folder depth: 10 levels (prevents overly complex structures)
 * Reason: Performance and UI usability
 *
 * FOLDER PERMISSIONS:
 * --------------------
 * When you share a folder:
 * - Shared user can see all files in folder
 * - They get same permissions for all files
 * - If you move file into shared folder, it's automatically shared
 * - If you unshare folder, all contained files become unshared
 *
 * ENDPOINTS:
 * -----------
 * - GET /folders - Get root folders and files
 * - GET /folders/:id - Get folder contents (files + subfolders)
 * - POST /folders - Create new folder
 * - PUT /folders/:id - Update folder (rename, move, etc.)
 * - DELETE /folders/:id - Delete folder (must be empty)
 * - POST /folders/:id/share - Share folder with users
 * - GET /folders/:id/shares - See who folder is shared with
 * - POST /folders/:id/duplicate - Copy entire folder structure
 *
 * SEARCH IN FOLDERS:
 * ------------------
 * Can search for files within:
 * - Current folder only
 * - Current folder + all subfolders (recursive)
 * - Across all folders (full search)
 *
 * =============================================================================
 */

/**
 * Express is the web framework that handles HTTP requests and routing.
 * We use it to define API endpoints (URLs that the frontend can call).
 * Each router.get/post defines a different folder operation.
 */
import express from 'express';

/**
 * Mongoose provides database utilities, especially ObjectId validation.
 * We use mongoose.Types.ObjectId.isValid() to validate folder IDs
 * before querying the database (prevents invalid queries).
 */
import mongoose from 'mongoose';

/**
 * Auth middleware checks that the user is logged in.
 * Every folder request must include a valid JWT token in the Authorization header.
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
 * Feature gate middleware checks if a feature is enabled for this user.
 * Used to enable/disable file management features per user role.
 * Example: Only premium users can create folders if 'filesEnabled' flag is set.
 */
import { requireFeature } from '../middleware/featureGate.js';

/**
 * folderService contains the core business logic for folder operations.
 * Instead of building database queries in this route file, we call service functions:
 * - getFolders() for listing
 * - createFolder() for creation
 * - moveFolder() for moving between parents
 * - trashFolder()/restoreFolder() for soft delete
 * - deleteFolder() for permanent deletion
 * This separation keeps routes simple and logic testable.
 */
import * as folderService from '../services/folderService.js';

/**
 * limitService enforces usage limits on user actions.
 * Prevents users from creating unlimited folders.
 * Checks: Is user at folder limit? Can they create more?
 * Used to enforce free vs premium tier differences.
 */
import limitService from '../services/limitService.js';

/**
 * Request logger middleware tracks entity IDs and event names for analytics.
 * When we attach an entity ID, it lets us search logs for specific folders.
 * Example: attachEntityId(req, 'folderId', folder._id) for usage tracking.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

// =============================================================================
// ROUTER SETUP
// =============================================================================
// Create an Express router to group all folder-related endpoints together
const router = express.Router();

// =============================================================================
// MIDDLEWARE HELPER: ID VALIDATION
// =============================================================================

/**
 * validateId() creates middleware that validates MongoDB ObjectId format
 *
 * WHAT IT DOES:
 * Checks that a URL parameter (e.g., :id) is a valid MongoDB ObjectId format.
 * MongoDB ObjectIds are 24-character hex strings like "507f1f77bcf86cd799439011".
 * Prevents invalid queries and gives users clear error messages.
 *
 * WHY WE USE THIS:
 * Before querying the database with an ID, we must validate the format.
 * Invalid IDs cause confusing database errors. Better to reject upfront.
 *
 * USAGE:
 * router.get('/:id', validateId(), handler)  // Validates req.params.id
 * router.post('/:folderId/move', validateId('folderId'), handler)  // Validates req.params.folderId
 *
 * RESPONSE ON INVALID ID (400 Bad Request):
 * {
 *   "error": "Invalid id",
 *   "code": "INVALID_ID"
 * }
 *
 * @param {string} paramName - The parameter name to validate (default: "id")
 * @returns {Function} Express middleware function
 */
function validateId(paramName = 'id') {
  return (req, res, next) => {
    // Check if the parameter matches MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
      // Return error if format is invalid
      return res.status(400).json({
        error: `Invalid ${paramName}`,
        code: 'INVALID_ID',
      });
    }
    // Format is valid, proceed to next middleware/handler
    next();
  };
}

// =============================================================================
// FOLDER LISTING ROUTES
// =============================================================================

/**
 * GET /folders
 * List user's folders with optional filtering
 *
 * WHAT IT DOES:
 * Retrieves all folders belonging to the authenticated user.
 * Can filter by parent folder, include/exclude trashed folders, or filter by type.
 *
 * USE CASES:
 * - Display list of top-level folders for user
 * - Show contents of a specific folder
 * - Load trash/recycle bin view
 * - List folders of a specific type (e.g., only "project" folders)
 *
 * QUERY PARAMETERS:
 * - parentId: Optional. Show folders inside this folder.
 *   Pass "null" (string) for root folders. Omit for all top-level folders.
 *   Example: /folders?parentId=507f1f77bcf86cd799439011
 *   Example: /folders?parentId=null (folders at root level)
 * - includeTrashed: Optional. Set to "true" to include trashed folders.
 *   Default: "false" (only active folders)
 *   Example: /folders?includeTrashed=true
 * - folderType: Optional. Filter by folder type (user-defined categorization).
 *   Example: /folders?folderType=project
 *
 * EXAMPLE REQUESTS:
 * GET /folders                              // All top-level folders
 * GET /folders?parentId=null               // Explicitly request root folders
 * GET /folders?parentId=507f1f77bcf86c... // Contents of a specific folder
 * GET /folders?includeTrashed=true         // Include folders in trash
 * GET /folders?folderType=project          // Only project-type folders
 *
 * EXAMPLE RESPONSE:
 * {
 *   "folders": [
 *     {
 *       "_id": "507f1f77bcf86cd799439011",
 *       "name": "Work Projects",
 *       "parentId": null,
 *       "color": "#FF6B6B",
 *       "icon": "folder",
 *       "createdAt": "2025-02-15T10:30:00.000Z",
 *       "updatedAt": "2025-02-15T10:30:00.000Z",
 *       "fileCount": 5,
 *       "subfolderCount": 2
 *     },
 *     {
 *       "_id": "507f1f77bcf86cd799439012",
 *       "name": "Personal Documents",
 *       "parentId": null,
 *       "color": null,
 *       "icon": "folder",
 *       "createdAt": "2025-02-14T15:20:00.000Z",
 *       "updatedAt": "2025-02-14T15:20:00.000Z",
 *       "fileCount": 12,
 *       "subfolderCount": 0
 *     }
 *   ]
 * }
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract optional query parameters for filtering
    // These parameters let user scope which folders to display
    const { parentId, includeTrashed, folderType } = req.query;

    // Step 2: Call folder service to fetch folders with filters
    // Convert string "null" to actual null (JavaScript null vs string "null")
    // Convert string "true" to boolean true (query parameters are always strings)
    const folders = await folderService.getFolders(req.user._id, {
      parentId: parentId === 'null' ? null : parentId,      // null = root folders
      includeTrashed: includeTrashed === 'true',              // default: false
      folderType,                                             // optional type filter
    });

    // Step 3: Return folders as JSON
    // Service returns array of folder objects with metadata
    res.json({ folders });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'folders_fetch' });

    // Return generic error response
    res.status(500).json({
      error: 'Failed to get folders',
      code: 'GET_FOLDERS_ERROR',
    });
  }
});

/**
 * GET /folders/tree
 * Get complete hierarchical folder tree for user
 *
 * WHAT IT DOES:
 * Returns entire folder structure as a tree (nested hierarchy).
 * Shows all folders with their relationships - which folders are inside which.
 * This is different from GET /folders which lists flat folder list.
 *
 * USE CASES:
 * - Display folder navigation tree in sidebar (expandable/collapsible)
 * - Show complete folder hierarchy in folder picker dialog
 * - Export user's folder structure
 * - Visualize folder organization
 *
 * TREE STRUCTURE:
 * Returns nested objects where each folder contains:
 * - folder data (name, icon, color, etc.)
 * - "children" array with subfolders (nested, recursive)
 * Creates a complete hierarchy: Root → Folder → Subfolder → Sub-subfolder
 *
 * QUERY PARAMETERS:
 * - includeTrashed: Optional. Set to "true" to include trashed folders.
 *   Default: "false"
 *   Example: /folders/tree?includeTrashed=true
 * - maxDepth: Optional. Limit how many levels deep to fetch.
 *   Default: 10 (prevents overly deep recursion)
 *   Example: /folders/tree?maxDepth=5 (only 5 levels deep)
 *
 * EXAMPLE REQUEST:
 * GET /folders/tree                        // Full tree, 10 levels max
 * GET /folders/tree?maxDepth=5             // Limited depth for performance
 * GET /folders/tree?includeTrashed=true    // Include trashed folders
 *
 * EXAMPLE RESPONSE:
 * {
 *   "tree": {
 *     "folder": {
 *       "_id": "root",
 *       "name": "Root",
 *       "parentId": null,
 *       "children": [
 *         {
 *           "folder": {
 *             "_id": "507f1f77bcf86cd799439011",
 *             "name": "Work",
 *             "parentId": null,
 *             "icon": "briefcase"
 *           },
 *           "children": [
 *             {
 *               "folder": {
 *                 "_id": "507f1f77bcf86cd799439012",
 *                 "name": "Projects",
 *                 "parentId": "507f1f77bcf86cd799439011"
 *               },
 *               "children": []
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   }
 * }
 *
 * PERFORMANCE NOTE:
 * Fetching entire tree can be expensive with many folders.
 * Frontend should cache this for 30-60 seconds.
 * Consider using maxDepth parameter to limit recursion depth.
 *
 * @query {boolean} includeTrashed - Include trashed folders (default: false)
 * @query {number} maxDepth - Max nesting levels (default: 10)
 * @returns {Object} Hierarchical tree structure with nested children
 * @throws {401} - User not authenticated
 * @throws {500} - Server error building tree
 */
router.get('/tree', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract optional parameters
    const { includeTrashed, maxDepth } = req.query;

    // Step 2: Call folder service to build hierarchical tree
    // Convert string "true" to boolean true (query parameters are always strings)
    // Parse maxDepth as integer, default to 10 if not provided
    // This prevents runaway recursion in deeply nested folders
    const tree = await folderService.getFolderTree(req.user._id, {
      includeTrashed: includeTrashed === 'true',          // default: false
      maxDepth: maxDepth ? parseInt(maxDepth, 10) : 10,   // default: 10 levels
    });

    // Step 3: Return hierarchical tree structure
    // Service builds recursive nested structure from flat database records
    res.json({ tree });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'folders_tree' });

    // Return generic error response
    res.status(500).json({
      error: 'Failed to get folder tree',
      code: 'GET_TREE_ERROR',
    });
  }
});

/**
 * GET /folders/trash
 * Get all folders currently in trash/recycle bin
 *
 * WHAT IT DOES:
 * Retrieves all folders that have been moved to trash by the user.
 * Trashed folders can be restored or permanently deleted.
 *
 * USE CASES:
 * - Display trash/recycle bin view for folder recovery
 * - Show recently deleted folders
 * - Allow user to recover accidentally deleted folders
 * - Show folder deletion history
 *
 * TRASH BEHAVIOR:
 * When user deletes a folder, it's moved to trash (soft delete).
 * Trashed folders are hidden from normal folder list.
 * After 30 days, trashed folders are permanently deleted automatically.
 *
 * EXAMPLE REQUEST:
 * GET /folders/trash
 *
 * EXAMPLE RESPONSE:
 * {
 *   "folders": [
 *     {
 *       "_id": "507f1f77bcf86cd799439011",
 *       "name": "Old Project 2024",
 *       "parentId": null,
 *       "status": "trashed",
 *       "deletedAt": "2025-02-14T10:30:00.000Z",
 *       "createdAt": "2025-01-15T10:30:00.000Z",
 *       "fileCount": 3,
 *       "subfolderCount": 1
 *     }
 *   ]
 * }
 *
 * IMPORTANT:
 * This endpoint requires authentication.
 * Returns only current user's trashed folders (privacy).
 *
 * @returns {Object} Array of trashed folder objects
 * @throws {401} - User not authenticated
 * @throws {500} - Server error fetching trash
 */
router.get('/trash', requireAuth, async (req, res) => {
  try {
    // Step 1: Call folder service to fetch trashed folders for this user
    // Service filters for folders with status "trashed"
    const folders = await folderService.getTrashedFolders(req.user._id);

    // Step 2: Return trashed folders list
    res.json({ folders });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'folders_trash' });

    // Return generic error response
    res.status(500).json({
      error: 'Failed to get trashed folders',
      code: 'GET_TRASH_ERROR',
    });
  }
});

// =============================================================================
// SINGLE FOLDER ROUTES
// =============================================================================

/**
 * GET /folders/:id
 * Get a specific folder and its contents (files + subfolders)
 *
 * WHAT IT DOES:
 * Retrieves a single folder by ID along with:
 * - Folder metadata (name, icon, color, creation date)
 * - All files inside the folder (with pagination)
 * - All subfolders inside the folder (with pagination)
 *
 * USE CASES:
 * - Open a folder to see its contents
 * - Display folder details and file list
 * - Navigation when user clicks into a folder
 * - Build folder hierarchy viewer
 *
 * PATH PARAMETERS:
 * - id: The folder's unique MongoDB ID (required, validated)
 *   Example: /folders/507f1f77bcf86cd799439011
 *
 * QUERY PARAMETERS:
 * - sort: Optional. Sort order for contents.
 *   Default: "-createdAt" (newest first)
 *   Examples: "-createdAt", "-updatedAt", "name", "-size"
 * - limit: Optional. Max number of items per page.
 *   Default: 50
 *   Example: /folders/:id?limit=20
 * - skip: Optional. Number of items to skip (for pagination).
 *   Default: 0
 *   Example: /folders/:id?skip=50&limit=50 (page 2 with 50 items per page)
 *
 * EXAMPLE REQUEST:
 * GET /folders/507f1f77bcf86cd799439011
 * GET /folders/507f1f77bcf86cd799439011?sort=name&limit=20
 * GET /folders/507f1f77bcf86cd799439011?skip=50&limit=50&sort=-updatedAt
 *
 * EXAMPLE RESPONSE:
 * {
 *   "folder": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "name": "Work Projects",
 *     "parentId": null,
 *     "icon": "briefcase",
 *     "color": "#4ECDC4",
 *     "createdAt": "2025-02-15T10:30:00.000Z",
 *     "updatedAt": "2025-02-15T10:30:00.000Z"
 *   },
 *   "files": [
 *     {
 *       "_id": "507f1f77bcf86cd799439101",
 *       "name": "project_2024.pdf",
 *       "size": 2048576,
 *       "mimeType": "application/pdf",
 *       "createdAt": "2025-02-14T15:20:00.000Z"
 *     }
 *   ],
 *   "subfolders": [
 *     {
 *       "_id": "507f1f77bcf86cd799439012",
 *       "name": "Q4 Reports",
 *       "icon": "folder",
 *       "createdAt": "2025-01-10T10:30:00.000Z",
 *       "fileCount": 5
 *     }
 *   ],
 *   "pagination": {
 *     "total": 12,
 *     "limit": 50,
 *     "skip": 0,
 *     "hasMore": false
 *   }
 * }
 *
 * PAGINATION:
 * If folder has many files, use limit/skip for pagination.
 * Frontend loads 50 items at a time, user can load more.
 * This prevents loading thousands of items at once (performance).
 */
router.get('/:id', requireAuth, validateId(), async (req, res) => {
  try {
    // Step 1: Extract pagination and sorting parameters
    // Set sensible defaults: sort by creation date (newest first), 50 items per page
    const { sort = '-createdAt', limit = 50, skip = 0 } = req.query;

    // Step 2: Call folder service to get folder and its contents
    // Service ensures user owns this folder (via userId filter)
    // Returns folder data, files, subfolders, and pagination info
    const result = await folderService.getFolderWithContents(
      req.params.id,
      req.user._id,
      {
        sort,                              // sort order
        limit: parseInt(limit, 10),        // convert string to number
        skip: parseInt(skip, 10),          // convert string to number
      }
    );

    // Step 3: Check if folder was found and belongs to user
    // result.folder will be null if:
    // - Folder ID doesn't exist
    // - Folder belongs to different user
    if (!result.folder) {
      return res.status(404).json({
        error: 'Folder not found',
        code: 'FOLDER_NOT_FOUND',
      });
    }

    // Step 4: Return complete folder structure with contents
    // Includes folder metadata, files, subfolders, pagination
    res.json(result);
  } catch (error) {
    // Log error with context for debugging
    attachError(req, error, { operation: 'folder_fetch', folderId: req.params.id });

    // Return generic error response
    res.status(500).json({
      error: 'Failed to get folder',
      code: 'GET_FOLDER_ERROR',
    });
  }
});

/**
 * GET /folders/:id/breadcrumb
 * Get the breadcrumb navigation path from root to this folder
 *
 * WHAT IT DOES:
 * Returns the navigation path showing how to reach this folder from root.
 * Used to display breadcrumb navigation like: Home > Work > Projects > Q4
 * Helps user understand where they are in folder hierarchy.
 *
 * USE CASES:
 * - Display breadcrumb navigation at top of folder view
 * - Show folder location path in UI
 * - Understand folder nesting level
 * - Navigate back to parent folders
 *
 * PATH PARAMETERS:
 * - id: The folder's unique MongoDB ID (required, validated)
 *   Example: /folders/507f1f77bcf86cd799439011/breadcrumb
 *
 * BREADCRUMB STRUCTURE:
 * Array of folder objects from root to current folder.
 * First item is root (parentId: null).
 * Last item is the requested folder.
 * Each breadcrumb item includes folder name and ID (clickable).
 *
 * EXAMPLE REQUEST:
 * GET /folders/507f1f77bcf86cd799439011/breadcrumb
 *
 * EXAMPLE RESPONSE:
 * {
 *   "breadcrumb": [
 *     {
 *       "_id": null,
 *       "name": "Root",
 *       "icon": "home"
 *     },
 *     {
 *       "_id": "507f1f77bcf86cd799439001",
 *       "name": "Work",
 *       "icon": "briefcase"
 *     },
 *     {
 *       "_id": "507f1f77bcf86cd799439002",
 *       "name": "Projects",
 *       "icon": "folder"
 *     },
 *     {
 *       "_id": "507f1f77bcf86cd799439011",
 *       "name": "Q4 Reports",
 *       "icon": "folder"
 *     }
 *   ]
 * }
 *
 * BREADCRUMB DISPLAY IN UI:
 * Root > Work > Projects > Q4 Reports
 * Each segment is clickable and links to that folder.
 *
 * @param {string} id - Folder ID (MongoDB ObjectId)
 * @returns {Object} Array of folder objects from root to current
 * @throws {404} - Folder not found or doesn't belong to user
 * @throws {401} - User not authenticated
 * @throws {500} - Server error building breadcrumb
 */
router.get('/:id/breadcrumb', requireAuth, validateId(), async (req, res) => {
  try {
    // Step 1: Call folder service to build breadcrumb path
    // Service walks up from folder to root following parentId chain
    const breadcrumb = await folderService.getBreadcrumb(req.params.id);

    // Step 2: Return breadcrumb array
    // First item is root (home), last is current folder
    res.json({ breadcrumb });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'folder_breadcrumb', folderId: req.params.id });

    // Return generic error response
    res.status(500).json({
      error: 'Failed to get breadcrumb',
      code: 'GET_BREADCRUMB_ERROR',
    });
  }
});

/**
 * GET /folders/:id/stats
 * Get statistics about a folder
 *
 * WHAT IT DOES:
 * Returns aggregated statistics about a folder:
 * - Total file count (including in subfolders)
 * - Total subfolder count
 * - Total size (storage used)
 * - File type breakdown (how many PDFs, images, etc.)
 * - Shared/unshared counts
 * - Oldest/newest file dates
 *
 * USE CASES:
 * - Display folder info panel with stats
 * - Show storage usage by folder
 * - Find folders taking most space
 * - Track file type distribution
 * - Show folder details in UI
 *
 * PATH PARAMETERS:
 * - id: The folder's unique MongoDB ID (required, validated)
 *   Example: /folders/507f1f77bcf86cd799439011/stats
 *
 * EXAMPLE REQUEST:
 * GET /folders/507f1f77bcf86cd799439011/stats
 *
 * EXAMPLE RESPONSE:
 * {
 *   "folder": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "name": "Work Projects"
 *   },
 *   "fileCount": 15,
 *   "totalSize": 1073741824,
 *   "subfolderCount": 3,
 *   "fileTypes": {
 *     "pdf": 5,
 *     "docx": 4,
 *     "xlsx": 3,
 *     "jpg": 3
 *   },
 *   "sharedFiles": 3,
 *   "unsharedFiles": 12,
 *   "oldestFile": "2024-01-15T10:30:00.000Z",
 *   "newestFile": "2025-02-15T10:30:00.000Z",
 *   "totalSizeMB": 1024
 * }
 *
 * PERFORMANCE:
 * Stats involve aggregation queries which can be slow on large folders.
 * Frontend should cache for 1-5 minutes.
 * For real-time stats, consider showing cached values with "updated at" time.
 *
 * @param {string} id - Folder ID (MongoDB ObjectId)
 * @returns {Object} Statistics about folder including file counts and storage
 * @throws {404} - Folder not found or doesn't belong to user
 * @throws {401} - User not authenticated
 * @throws {500} - Server error calculating stats
 */
router.get('/:id/stats', requireAuth, validateId(), async (req, res) => {
  try {
    // Step 1: Call folder service to calculate folder statistics
    // Service aggregates file counts, sizes, types, sharing status
    // Performs calculation across folder and all subfolders
    const stats = await folderService.getFolderStats(req.params.id, req.user._id);

    // Step 2: Check if folder exists and belongs to user
    // stats will be null if folder doesn't exist or doesn't belong to user
    if (!stats) {
      return res.status(404).json({
        error: 'Folder not found',
        code: 'FOLDER_NOT_FOUND',
      });
    }

    // Step 3: Return statistics object
    res.json(stats);
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'folder_stats', folderId: req.params.id });

    // Return generic error response
    res.status(500).json({
      error: 'Failed to get folder stats',
      code: 'GET_STATS_ERROR',
    });
  }
});

// =============================================================================
// FOLDER CREATION & MODIFICATION
// =============================================================================

/**
 * POST /folders
 * Create a new folder
 *
 * WHAT IT DOES:
 * Creates a new folder for the authenticated user.
 * Can create at root level or inside another folder (as subfolder).
 * Applies usage limits (free users can create fewer folders than premium).
 *
 * USE CASES:
 * - Create new folder at root level
 * - Create subfolder inside existing folder
 * - Organize files hierarchically
 * - Prepare folder structure before uploading files
 * - Create project folders, category folders, etc.
 *
 * REQUIREMENTS:
 * - User must have filesEnabled feature flag (feature gate check)
 * - User must not exceed folder creation limit
 * - Folder name is required (non-empty string)
 *
 * REQUEST BODY:
 * {
 *   "name": "My Project Folder",       // Required. Display name for folder
 *   "parentId": null,                  // Optional. Folder ID if creating subfolder
 *   "color": "#FF6B6B",                // Optional. Color for visual organization
 *   "icon": "folder"                   // Optional. Icon name
 * }
 *
 * EXAMPLE REQUESTS:
 * POST /folders
 * {
 *   "name": "Work Projects"
 * }
 *
 * POST /folders (subfolder)
 * {
 *   "name": "Q4 Reports",
 *   "parentId": "507f1f77bcf86cd799439011",
 *   "color": "#4ECDC4",
 *   "icon": "files"
 * }
 *
 * EXAMPLE RESPONSE (201 Created):
 * {
 *   "folder": {
 *     "_id": "507f1f77bcf86cd799439013",
 *     "name": "Work Projects",
 *     "parentId": null,
 *     "color": "#FF6B6B",
 *     "icon": "folder",
 *     "createdAt": "2025-02-15T10:30:00.000Z",
 *     "updatedAt": "2025-02-15T10:30:00.000Z"
 *   }
 * }
 *
 * FOLDER LIMITS:
 * Free tier: 50 folders
 * Premium tier: 1000 folders
 * (Limits enforced by limitService.canCreateFolder)
 *
 * DUPLICATE NAME HANDLING:
 * Cannot create two folders with same name at same level (parentId).
 * Error: 409 Conflict if trying to create duplicate.
 * (User can have "Project" at root and "Project" inside "Work" - different levels OK)
 *
 * ERROR RESPONSES:
 * - 400: Name is empty/missing
 * - 403: User exceeded folder limit
 * - 409: Folder with this name already exists at this level
 * - 500: Server error
 */
router.post('/', requireAuth, requireFeature('filesEnabled'), async (req, res) => {
  try {
    // Step 1: Check if user can create more folders
    // Enforces usage limits (free vs premium tiers)
    // limitService.canCreateFolder() returns { allowed: boolean, message: string }
    const limitCheck = await limitService.canCreateFolder(req.user);
    if (!limitCheck.allowed) {
      // User has hit their folder creation limit
      return res.status(403).json({
        error: limitCheck.message,
        code: 'FOLDER_LIMIT_EXCEEDED',
      });
    }

    // Step 2: Extract folder creation parameters from request body
    const { name, parentId, color, icon } = req.body;

    // Step 3: Validate that folder name was provided and is not empty
    // A folder must have a name (cannot be null or just whitespace)
    if (!name || !name.trim()) {
      return res.status(400).json({
        error: 'Folder name is required',
        code: 'NAME_REQUIRED',
      });
    }

    // Step 4: Call folder service to create the folder
    // Service validates parentId, checks for duplicates, creates folder
    // name.trim() removes leading/trailing whitespace
    // parentId: null means create at root level (no parent)
    const folder = await folderService.createFolder(req.user._id, {
      name: name.trim(),
      parentId: parentId || null,        // null = root level, string = subfolder
      color,
      icon,
    });

    // Step 5: Attach entity ID for analytics
    // Track which users create folders, folder creation rate, etc.
    attachEntityId(req, 'folderId', folder._id);
    req.eventName = 'folder.create.success';

    // Step 6: Return created folder with 201 status
    res.status(201).json({ folder });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'folder_create' });

    // Handle duplicate folder name error specifically
    // This occurs when folder with same name already exists at same level
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: error.message,
        code: 'FOLDER_EXISTS',
      });
    }

    // Return generic error response
    res.status(500).json({
      error: error.message || 'Failed to create folder',
      code: 'CREATE_FOLDER_ERROR',
    });
  }
});

/**
 * PATCH /folders/:id
 * Update a folder's properties
 *
 * WHAT IT DOES:
 * Updates one or more properties of an existing folder.
 * User can change folder name, color, or icon.
 * All updates are optional - send only what you want to change.
 *
 * USE CASES:
 * - Rename folder
 * - Change folder color for organization
 * - Update folder icon
 * - Batch update multiple properties
 *
 * PATH PARAMETERS:
 * - id: The folder's unique MongoDB ID (required, validated)
 *   Example: /folders/507f1f77bcf86cd799439011
 *
 * REQUEST BODY (all fields optional):
 * {
 *   "name": "New Folder Name",         // Optional. New folder name
 *   "color": "#FF6B6B",                // Optional. New color
 *   "icon": "briefcase"                // Optional. New icon
 * }
 *
 * EXAMPLE REQUESTS:
 * PATCH /folders/507f1f77bcf86cd799439011
 * { "name": "Q4 2024 Reports" }
 *
 * PATCH /folders/507f1f77bcf86cd799439011
 * { "name": "Archived Projects", "color": "#999999", "icon": "archive" }
 *
 * EXAMPLE RESPONSE (200 OK):
 * {
 *   "folder": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "name": "Q4 2024 Reports",
 *     "parentId": null,
 *     "color": "#FF6B6B",
 *     "icon": "folder",
 *     "createdAt": "2025-02-15T10:30:00.000Z",
 *     "updatedAt": "2025-02-15T11:45:00.000Z"
 *   }
 * }
 *
 * DUPLICATE NAME HANDLING:
 * Cannot rename folder to duplicate name at same level.
 * Error: 409 Conflict if trying to create duplicate.
 * (Folders at different parent levels can have same name)
 *
 * VALIDATION:
 * - name: If provided, cannot be empty string (trimmed)
 * - color: If provided, should be valid color format
 * - icon: If provided, should be valid icon name
 *
 * ERROR RESPONSES:
 * - 400: Name is empty string
 * - 404: Folder not found or doesn't belong to user
 * - 409: New name already exists at this folder level
 * - 500: Server error
 */
router.patch('/:id', requireAuth, validateId(), async (req, res) => {
  try {
    // Step 1: Extract update fields from request body
    // All fields are optional - send only what needs updating
    const { name, color, icon } = req.body;

    // Step 2: Validate that name is not empty if provided
    // User can update color/icon without updating name
    // But if they do send name, it must be non-empty
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({
        error: 'Folder name cannot be empty',
        code: 'NAME_REQUIRED',
      });
    }

    // Step 3: Call folder service to update the folder
    // Service validates parentId, checks for duplicate names, updates folder
    // name?.trim() removes whitespace if name was provided (using optional chaining)
    // undefined fields won't be updated (sparse update)
    const folder = await folderService.updateFolder(req.params.id, req.user._id, {
      name: name?.trim(),  // undefined if not provided, trimmed string if provided
      color,               // undefined if not provided, color string if provided
      icon,                // undefined if not provided, icon name if provided
    });

    // Step 4: Check if folder exists and belongs to user
    if (!folder) {
      return res.status(404).json({
        error: 'Folder not found',
        code: 'FOLDER_NOT_FOUND',
      });
    }

    // Step 5: Attach entity ID for analytics
    attachEntityId(req, 'folderId', folder._id);
    req.eventName = 'folder.update.success';

    // Step 6: Return updated folder
    res.json({ folder });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'folder_update', folderId: req.params.id });

    // Handle duplicate folder name error specifically
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: error.message,
        code: 'FOLDER_EXISTS',
      });
    }

    // Return generic error response
    res.status(500).json({
      error: error.message || 'Failed to update folder',
      code: 'UPDATE_FOLDER_ERROR',
    });
  }
});

// =============================================================================
// FOLDER ACTIONS
// =============================================================================

/**
 * POST /folders/:id/move
 * Move a folder to a different parent folder (reorganize hierarchy)
 *
 * WHAT IT DOES:
 * Moves a folder from its current location to a new parent folder.
 * Like moving a file/folder on a computer via drag-and-drop.
 * Can move to root level (no parent) or into another folder.
 *
 * USE CASES:
 * - Reorganize folder hierarchy (drag folder between parents)
 * - Move folder out of parent (make it top-level)
 * - Flatten hierarchy (move nested folder to root)
 * - Restructure folder organization
 *
 * PATH PARAMETERS:
 * - id: The folder to move (required, validated)
 *   Example: /folders/507f1f77bcf86cd799439011/move
 *
 * REQUEST BODY:
 * {
 *   "parentId": "507f1f77bcf86cd799439001"  // ID of new parent, or omit for root
 * }
 *
 * SPECIAL CASES:
 * - To move to root level: Don't send parentId OR send parentId: null
 * - To move into another folder: Send that folder's ID as parentId
 *
 * EXAMPLE REQUESTS:
 * POST /folders/507f1f77bcf86cd799439011/move
 * { "parentId": "507f1f77bcf86cd799439001" }  // Move into folder
 *
 * POST /folders/507f1f77bcf86cd799439011/move
 * { "parentId": null }  // Move to root level
 *
 * POST /folders/507f1f77bcf86cd799439011/move
 * {}  // Move to root level (parentId omitted)
 *
 * EXAMPLE RESPONSE (200 OK):
 * {
 *   "folder": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "name": "Q4 Reports",
 *     "parentId": "507f1f77bcf86cd799439001",  // Changed from previous parent
 *     "icon": "folder",
 *     "updatedAt": "2025-02-15T11:50:00.000Z"
 *   }
 * }
 *
 * VALIDATION & RESTRICTIONS:
 * - Cannot move folder into itself (would create circular reference)
 * - Cannot move folder into its own subfolder (would orphan parent)
 * - Cannot move to non-existent parent folder
 * - Cannot create duplicate folder name at destination level
 *
 * ERROR RESPONSES:
 * - 400: Invalid parentId format OR invalid move (circular reference)
 * - 404: Folder not found or doesn't belong to user
 * - 409: Folder with this name already exists at destination
 * - 500: Server error
 *
 * PERFORMANCE:
 * Moving updates all subfolders' parentId chains.
 * Can be slow for deeply nested folders.
 * System limits nesting to 10 levels to prevent excessive depth.
 */
router.post('/:id/move', requireAuth, validateId(), async (req, res) => {
  try {
    // Step 1: Extract new parent ID from request body
    const { parentId } = req.body;

    // Step 2: Validate parentId format if it was provided
    // parentId can be:
    // - null (move to root)
    // - undefined (move to root, omitted from body)
    // - valid MongoDB ObjectId (move into that folder)
    // - invalid string (error, catch and return 400)
    if (parentId && !mongoose.Types.ObjectId.isValid(parentId)) {
      return res.status(400).json({
        error: 'Invalid parent folder ID',
        code: 'INVALID_PARENT_ID',
      });
    }

    // Step 3: Call folder service to move the folder
    // Service validates:
    // - Folder exists and belongs to user
    // - New parent exists and belongs to user
    // - Move doesn't create circular reference (folder→itself or folder→subfolder)
    // - No duplicate name at destination
    const folder = await folderService.moveFolder(
      req.params.id,
      parentId || null,  // null = root level, string = specific parent
      req.user._id
    );

    // Step 4: Check if move succeeded
    if (!folder) {
      return res.status(404).json({
        error: 'Folder not found',
        code: 'FOLDER_NOT_FOUND',
      });
    }

    // Step 5: Attach entity ID for analytics
    attachEntityId(req, 'folderId', folder._id);
    req.eventName = 'folder.move.success';

    // Step 6: Return updated folder with new parentId
    res.json({ folder });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'folder_move', folderId: req.params.id });

    // Handle circular reference or invalid move errors
    if (error.message.includes('Cannot move')) {
      return res.status(400).json({
        error: error.message,
        code: 'INVALID_MOVE',
      });
    }

    // Handle duplicate name at destination
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: error.message,
        code: 'FOLDER_EXISTS',
      });
    }

    // Return generic error response
    res.status(500).json({
      error: error.message || 'Failed to move folder',
      code: 'MOVE_FOLDER_ERROR',
    });
  }
});

/**
 * POST /folders/:id/trash
 * Move a folder to trash (soft delete)
 *
 * WHAT IT DOES:
 * Moves a folder to trash without permanently deleting it.
 * Trashed folder and all its contents become hidden.
 * Can be restored within 30 days before permanent deletion.
 *
 * USE CASES:
 * - Safely delete folder with undo capability
 * - Hide folder temporarily without losing files
 * - Recover accidentally deleted folder
 * - Clean up/archive old folders (move to trash then restore later)
 *
 * PATH PARAMETERS:
 * - id: The folder to move to trash (required, validated)
 *   Example: /folders/507f1f77bcf86cd799439011/trash
 *
 * REQUEST BODY:
 * {} (no body required)
 *
 * EXAMPLE REQUEST:
 * POST /folders/507f1f77bcf86cd799439011/trash
 *
 * EXAMPLE RESPONSE (200 OK):
 * {
 *   "message": "Folder moved to trash",
 *   "folder": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "name": "Old Projects",
 *     "status": "trashed",
 *     "deletedAt": "2025-02-15T11:55:00.000Z",
 *     "updatedAt": "2025-02-15T11:55:00.000Z"
 *   }
 * }
 *
 * TRASH BEHAVIOR:
 * - Folder becomes invisible in normal folder views
 * - Contents (files + subfolders) also hidden
 * - Appears in trash/recycle bin view (GET /folders/trash)
 * - Auto-permanently deleted after 30 days
 * - User can restore at any time within 30 days
 *
 * RECOVERY WINDOW:
 * - Trashed folders recoverable for 30 days
 * - After 30 days, permanently deleted
 * - System removes them via background job (cron/scheduler)
 *
 * ERROR RESPONSES:
 * - 404: Folder not found or doesn't belong to user
 * - 500: Server error
 *
 * DIFFERS FROM DELETE:
 * - DELETE: Permanent, immediate, cannot recover
 * - TRASH: Recoverable, 30-day grace period, hidden from view
 */
router.post('/:id/trash', requireAuth, validateId(), async (req, res) => {
  try {
    // Step 1: Call folder service to move folder to trash
    // Service marks folder status as "trashed" and sets deletedAt timestamp
    // Folder becomes hidden from normal views
    const folder = await folderService.trashFolder(req.params.id, req.user._id);

    // Step 2: Check if folder exists and belongs to user
    if (!folder) {
      return res.status(404).json({
        error: 'Folder not found',
        code: 'FOLDER_NOT_FOUND',
      });
    }

    // Step 3: Attach entity ID for analytics
    // Track which folders are trashed, how often, etc.
    attachEntityId(req, 'folderId', folder._id);
    req.eventName = 'folder.trash.success';

    // Step 4: Return folder with new trashed status
    res.json({ message: 'Folder moved to trash', folder });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'folder_trash', folderId: req.params.id });

    // Return generic error response
    res.status(500).json({
      error: 'Failed to trash folder',
      code: 'TRASH_FOLDER_ERROR',
    });
  }
});

/**
 * POST /folders/:id/restore
 * Restore a folder from trash
 *
 * WHAT IT DOES:
 * Recovers a trashed folder back to active status.
 * Restores folder and all its contents (makes them visible again).
 * Reverse operation of moving to trash.
 *
 * USE CASES:
 * - Recover accidentally deleted folder
 * - Bring folder back into use
 * - Undo folder deletion within recovery window
 * - Retrieve archived folder before 30-day expiration
 *
 * PATH PARAMETERS:
 * - id: The folder to restore (required, validated)
 *   Example: /folders/507f1f77bcf86cd799439011/restore
 *
 * REQUEST BODY:
 * {} (no body required)
 *
 * EXAMPLE REQUEST:
 * POST /folders/507f1f77bcf86cd799439011/restore
 *
 * EXAMPLE RESPONSE (200 OK):
 * {
 *   "message": "Folder restored",
 *   "folder": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "name": "Old Projects",
 *     "status": "active",
 *     "deletedAt": null,
 *     "updatedAt": "2025-02-15T12:00:00.000Z"
 *   }
 * }
 *
 * RESTORATION CONDITIONS:
 * - Folder must be in trash (status: "trashed")
 * - Must be within 30-day recovery window
 * - Parent folder must still exist (if subfolder)
 *   Note: If parent was deleted, folder can still be restored to root
 * - No duplicate name conflicts at restored level
 *
 * RECOVERY WINDOW:
 * - Can restore trashed folder any time within 30 days
 * - After 30 days, folder auto-deleted permanently
 * - No way to recover after expiration (use backups if needed)
 *
 * ERROR RESPONSES:
 * - 404: Folder not found in trash (doesn't exist or not trashed)
 * - 500: Server error
 *
 * DIFFERS FROM DELETE:
 * - RESTORE: Brings folder back from trash, recoverable within 30 days
 * - UNTRASH: Same as restore (alternative naming)
 * - DELETE: Permanent deletion after trash recovery period expires
 */
router.post('/:id/restore', requireAuth, validateId(), async (req, res) => {
  try {
    // Step 1: Call folder service to restore trashed folder
    // Service checks that folder is in trash, removes trashed status
    // Sets status back to "active" and clears deletedAt timestamp
    const folder = await folderService.restoreFolder(req.params.id, req.user._id);

    // Step 2: Check if folder exists and is in trash
    // restoreFolder returns null if:
    // - Folder doesn't exist
    // - Folder doesn't belong to user
    // - Folder is not in trash (cannot restore non-trashed folders)
    if (!folder) {
      return res.status(404).json({
        error: 'Folder not found in trash',
        code: 'FOLDER_NOT_FOUND',
      });
    }

    // Step 3: Attach entity ID for analytics
    // Track restore frequency, user behavior with trash, etc.
    attachEntityId(req, 'folderId', folder._id);
    req.eventName = 'folder.restore.success';

    // Step 4: Return restored folder with active status
    res.json({ message: 'Folder restored', folder });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'folder_restore', folderId: req.params.id });

    // Return generic error response
    res.status(500).json({
      error: 'Failed to restore folder',
      code: 'RESTORE_FOLDER_ERROR',
    });
  }
});

/**
 * DELETE /folders/:id
 * Permanently delete a folder and all its contents
 *
 * WHAT IT DOES:
 * Permanently deletes a folder from the database.
 * Irreversible - cannot be recovered after deletion.
 * Deletes all files and subfolders inside (cascade delete).
 * Returns count of deleted items.
 *
 * USE CASES:
 * - Permanently remove folder after trash recovery period (30 days)
 * - Admin cleanup of folders
 * - Empty trash (batch delete multiple trashed folders)
 * - Free up space by removing entire folder structure
 *
 * PATH PARAMETERS:
 * - id: The folder to permanently delete (required, validated)
 *   Example: /folders/507f1f77bcf86cd799439011
 *
 * REQUEST BODY:
 * {} (no body required)
 *
 * EXAMPLE REQUEST:
 * DELETE /folders/507f1f77bcf86cd799439011
 *
 * EXAMPLE RESPONSE (200 OK):
 * {
 *   "message": "Folder deleted permanently",
 *   "filesDeleted": 42,
 *   "subfoldersDeleted": 7
 * }
 *
 * PERMANENT DELETION:
 * - Cannot be recovered (no trash/recycle bin)
 * - All nested folders and files permanently deleted
 * - Database records removed completely
 * - Storage space reclaimed
 * - CANNOT BE UNDONE
 *
 * CASCADE BEHAVIOR:
 * Deletes entire folder tree:
 * - Parent folder deleted
 * - All subfolders at any depth deleted
 * - All files at any depth deleted
 * - All nested sharing permissions deleted
 * - Single operation (atomic) - all or nothing
 *
 * DELETION PATHS:
 * 1. Active folder → Use POST /folders/:id/trash first (safer)
 *    Then either restore or delete later
 * 2. Trashed folder → Can delete permanently after review
 *    Auto-deleted after 30 days if not restored
 *
 * WARNINGS:
 * - This is PERMANENT deletion (no recovery)
 * - Deletes entire subfolder structure
 * - Deletes all files inside (including across subfolders)
 * - Consider using trash/restore workflow instead
 * - System auto-deletes trashed folders after 30 days
 *
 * ERROR RESPONSES:
 * - 404: Folder not found or doesn't belong to user
 * - 500: Server error
 *
 * DIFFERS FROM TRASH:
 * - TRASH: Soft delete, recoverable for 30 days, hidden
 * - DELETE: Hard delete, permanent, irreversible
 * - RESTORE: Brings trashed back to active
 *
 * PERFORMANCE:
 * Deleting large folder structures can be slow.
 * System cascades delete to all subfolders and files.
 * May block request for several seconds (large folders).
 */
router.delete('/:id', requireAuth, validateId(), async (req, res) => {
  try {
    // Step 1: Attach entity ID before deletion for audit logging
    // Important to log the ID before deletion (afterward we won't have the document)
    // Tracks which folders were deleted, when, by whom
    attachEntityId(req, 'folderId', req.params.id);

    // Step 2: Call folder service to permanently delete folder
    // Service performs cascade delete:
    // - Deletes folder document
    // - Deletes all subfolders recursively
    // - Deletes all files in folder and subfolders
    // - Returns count of deleted items for response
    const result = await folderService.deleteFolder(req.params.id, req.user._id);

    // Step 3: Check if deletion succeeded
    // result.deleted will be false if:
    // - Folder doesn't exist
    // - Folder doesn't belong to user
    if (!result.deleted) {
      return res.status(404).json({
        error: 'Folder not found',
        code: 'FOLDER_NOT_FOUND',
      });
    }

    // Step 4: Set event name for audit log
    req.eventName = 'folder.delete.success';

    // Step 5: Return confirmation with deletion counts
    // Shows user how many items were deleted (transparency)
    res.json({
      message: 'Folder deleted permanently',
      filesDeleted: result.filesDeleted,        // How many files were deleted
      subfoldersDeleted: result.subfoldersDeleted,  // How many subfolders were deleted
    });
  } catch (error) {
    // Log error for debugging
    attachError(req, error, { operation: 'folder_delete', folderId: req.params.id });

    // Return generic error response
    res.status(500).json({
      error: 'Failed to delete folder',
      code: 'DELETE_FOLDER_ERROR',
    });
  }
});

export default router;
