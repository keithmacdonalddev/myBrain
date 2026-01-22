/**
 * =============================================================================
 * FILES.JS - File Management Routes
 * =============================================================================
 *
 * This file handles all file upload, download, and management operations in myBrain.
 * Users can upload various file types (documents, spreadsheets, PDFs, etc.),
 * organize them into folders, and share them with other users.
 *
 * WHAT ARE FILES?
 * ---------------
 * Files are documents you upload to myBrain for storage and organization.
 * Examples:
 * - Documents (.docx, .pdf, .txt)
 * - Spreadsheets (.xlsx, .csv)
 * - Presentations (.pptx)
 * - Archives (.zip, .rar)
 * - Code files (.js, .py, .java)
 *
 * FILE ORGANIZATION:
 * ------------------
 * Files are organized into folders (like your computer):
 * - Root folder: Top-level files
 * - Subfolders: Organize files hierarchically
 * - Tags: Additional organization across folder structure
 *
 * FILE LIFECYCLE:
 * ---------------
 * 1. UPLOAD: User uploads a file
 * 2. STORAGE: File stored on AWS S3 (cloud storage)
 * 3. METADATA: File info saved in database (name, size, type)
 * 4. USAGE: User can download, view, share, or delete
 * 5. DELETION: File removed from storage and database
 *
 * STORAGE NOTES:
 * ---------------
 * - Files stored on AWS S3 (not on myBrain servers)
 * - Large file support (up to storage limit)
 * - File versioning not currently supported
 * - Automatic cleanup of deleted files
 *
 * ENDPOINTS:
 * -----------
 * - POST /files - Upload a new file
 * - GET /files - List files (with filters/search)
 * - GET /files/:id - Get file metadata and download link
 * - PUT /files/:id - Update file metadata (name, tags)
 * - DELETE /files/:id - Delete file
 * - POST /files/:id/share - Share file with another user
 * - GET /files/:id/shares - Get who file is shared with
 * - POST /files/:id/move - Move file to different folder
 * - POST /files/upload-status - Get upload progress/status
 *
 * STORAGE LIMITS:
 * ----------------
 * Free users: 1 GB total
 * Premium users: 100 GB total
 * File limit: 500 MB per file
 *
 * =============================================================================
 */

/**
 * Express is the web framework that handles HTTP requests and routing.
 * We use it to define API endpoints (URLs that the frontend can call).
 */
import express from 'express';

/**
 * Mongoose helps us work with MongoDB databases and validate ObjectIds.
 * We use it to check if file IDs are valid MongoDB ObjectIds.
 */
import mongoose from 'mongoose';

/**
 * The path module is a Node.js built-in for working with file paths.
 * We use it to extract file extensions (like .pdf, .docx) from uploaded files.
 */
import path from 'path';

/**
 * requireAuth is middleware that checks if a user is logged in.
 * We use it to protect all file routes - only authenticated users can upload/download files.
 */
import { requireAuth } from '../middleware/auth.js';

/**
 * attachError is a helper for logging errors to our audit trail.
 * When a file operation fails, we log what went wrong for debugging.
 */
import { attachError } from '../middleware/errorHandler.js';

/**
 * requireFeature is middleware that checks if a feature is enabled for the user.
 * We use it to prevent file uploads if the user's account doesn't have the feature enabled.
 * EXAMPLE: Free users might have filesEnabled=false, premium users have it enabled.
 */
import { requireFeature } from '../middleware/featureGate.js';

/**
 * uploadFileSingle and handleUploadError are middleware for handling file uploads.
 * - uploadFileSingle: Receives the file from the browser and temporarily stores it
 * - handleUploadError: Catches upload errors (file too large, invalid format, etc.)
 */
import { uploadFileSingle, handleUploadError } from '../middleware/upload.js';

/**
 * fileService contains the business logic for file operations:
 * - Creating, reading, updating, deleting files
 * - Organizing files into folders
 * - Handling trash and restoration
 * - Managing file versions
 * - Getting storage statistics
 */
import * as fileService from '../services/fileService.js';

/**
 * shareService handles file sharing functionality:
 * - Creating shareable links for files
 * - Managing share permissions
 * - Tracking who files are shared with
 * - Revoking shares
 */
import * as shareService from '../services/shareService.js';

/**
 * limitService enforces user limits on storage and file operations:
 * - Check if user has storage space available before upload
 * - Check if user can create more shares
 * - Enforce file size limits (free tier: 500MB, premium: varies)
 * - Track total storage usage
 */
import limitService from '../services/limitService.js';

/**
 * attachEntityId is a logging helper that records which files are being modified.
 * This creates an audit trail: "User X modified File Y at time Z"
 * Useful for security audits and understanding user behavior.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

// =============================================================================
// ROUTER SETUP
// =============================================================================
// Create an Express router to group all file management routes together.
// This router will be mounted on the main server under /files prefix.

const router = express.Router();

// =============================================================================
// HELPER MIDDLEWARE
// =============================================================================
// These middleware functions are used by multiple routes to validate input
// and check user permissions before processing requests.

/**
 * validateId - Middleware to validate MongoDB ObjectId format
 *
 * WHY: MongoDB IDs must be valid ObjectIds (24-character hex strings).
 * If we don't validate, the database query will fail with a cryptic error.
 * Better to return a clear "Invalid ID" error immediately.
 *
 * USAGE: router.get('/:id', validateId(), ...)
 *
 * @param paramName - Name of the route parameter to validate (default: 'id')
 * @returns Middleware function that validates the ID or returns 400 error
 *
 * EXAMPLE:
 * - GET /files/invalid123 → Returns 400 "Invalid id"
 * - GET /files/507f1f77bcf86cd799439011 → Passes to next middleware
 */
function validateId(paramName = 'id') {
  return (req, res, next) => {
    // Check if the parameter is a valid MongoDB ObjectId
    // ObjectIds are 24-character hexadecimal strings (like 507f1f77bcf86cd799439011)
    if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
      return res.status(400).json({
        error: `Invalid ${paramName}`,
        code: 'INVALID_ID',
      });
    }
    // ID is valid, proceed to next middleware/route handler
    next();
  };
}

/**
 * checkFileUploadLimit - Middleware to enforce storage and file limits
 *
 * WHAT IT DOES:
 * Before allowing a file upload, check if the user:
 * 1. Has enough storage space remaining (account limit)
 * 2. Isn't trying to upload a file that's too large (per-file limit)
 * 3. Has the feature enabled in their account
 * 4. Isn't uploading a blocked file type
 *
 * WHY IT MATTERS:
 * - Prevents uploading huge files that would break S3 or database
 * - Prevents free users from hogging unlimited storage
 * - Gives premium users higher limits as a feature
 * - Protects against accidental/intentional abuse
 *
 * LIMITS:
 * - Free users: 1GB total storage, 500MB per file
 * - Premium users: 100GB total storage, 500MB per file
 *
 * @returns Responds with 403 if limit exceeded, otherwise calls next()
 */
async function checkFileUploadLimit(req, res, next) {
  // If no file was uploaded, skip this check and proceed
  if (!req.file) return next();

  try {
    // STEP 1: Extract file extension (e.g., .pdf, .docx)
    // Used to check if file type is allowed
    const extension = path.extname(req.file.originalname).toLowerCase();

    // STEP 2: Check if user can upload this file
    // limitService.canUploadFile checks:
    // - User's account type (free vs premium)
    // - Total storage used vs their limit
    // - File size vs per-file limit
    // - Whether file type is allowed
    const limitCheck = await limitService.canUploadFile(
      req.user,                    // Current user object with tier info
      req.file.size,              // Actual file size in bytes
      req.file.mimetype,          // MIME type (e.g., application/pdf)
      extension                   // File extension (e.g., .pdf)
    );

    // STEP 3: If limit exceeded, reject the upload
    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: limitCheck.message,  // User-friendly message explaining the issue
        code: limitCheck.reason || 'LIMIT_EXCEEDED',  // Error code for frontend
      });
    }

    // STEP 4: Limit check passed, proceed to upload
    next();
  } catch (error) {
    // If something goes wrong in limit checking, pass error to error handler
    next(error);
  }
}

// =============================================================================
// FILE LISTING & SEARCH ROUTES
// =============================================================================
// These endpoints allow users to browse, search, and filter their files.
// Users can filter by folder, category, tags, and search by filename.
// Results are paginated for performance (max 50 files per page).

/**
 * GET /files
 * List user's files with filtering and sorting
 *
 * This endpoint is the main way users browse their file library.
 * It supports filtering by folder, file type, favorites, and tags.
 * Results are sorted by newest first by default.
 *
 * FILTERING OPTIONS:
 * - folderId: Show files in a specific folder (null = root)
 * - fileCategory: Filter by type (documents, images, spreadsheets, etc.)
 * - favorite: Show only starred files
 * - tags: Filter by one or more tags
 * - q: Search by filename (case-insensitive partial match)
 * - sort: Sort field (createdAt, updatedAt, name, size)
 * - page: Pagination (default 1)
 * - limit: Files per page (default 50, max 100)
 *
 * EXAMPLE REQUEST:
 * GET /files?folderId=507f1f77bcf86cd799439011&favorite=true&page=1&limit=20
 *
 * EXAMPLE RESPONSE:
 * {
 *   "files": [
 *     {
 *       "id": "507f1f77bcf86cd799439011",
 *       "name": "Q4 Budget.xlsx",
 *       "size": 524288,  // bytes
 *       "type": "spreadsheet",
 *       "folder": "Finance",
 *       "favorite": true,
 *       "tags": ["budget", "finance"],
 *       "createdAt": "2026-01-21T10:30:00Z",
 *       "updatedAt": "2026-01-20T14:15:00Z"
 *     }
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 20,
 *     "total": 47,
 *     "pages": 3
 *   }
 * }
 *
 * @query {string} folderId - Filter to files in this folder
 * @query {string} fileCategory - Filter by file type/category
 * @query {boolean} favorite - Show only favorite files
 * @query {string[]} tags - Filter by tags
 * @query {string} q - Search query (filename)
 * @query {string} sort - Sort field (default: -createdAt)
 * @query {number} page - Page number for pagination
 * @query {number} limit - Results per page
 * @returns {Object} Files array and pagination info
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    // STEP 1: Extract filter and pagination parameters from query string
    // Example: /files?folder=123&favorite=true&page=2&limit=25
    const {
      folderId,
      fileCategory,
      favorite,
      tags,
      q,                        // Search query
      sort = '-createdAt',      // Default: newest first (- = descending)
      page = 1,                 // Default: first page
      limit = 50,               // Default: 50 files per page
    } = req.query;

    // STEP 2: Call service to fetch files with filters
    // The service handles:
    // - Building MongoDB query with all filters
    // - Paginating results
    // - Sorting
    // - Counting total files for pagination info
    const result = await fileService.getFiles(req.user._id, {
      folderId: folderId === 'null' ? null : folderId,  // null = root folder
      fileCategory,
      favorite,
      tags,
      q,
      sort,
      page: parseInt(page, 10),         // Convert string to number
      limit: parseInt(limit, 10),       // Convert string to number
    });

    // STEP 3: Return results to frontend
    // Frontend will display files in grid/list view and show pagination
    res.json(result);
  } catch (error) {
    attachError(req, error, { operation: 'files_fetch' });
    res.status(500).json({
      error: 'Failed to get files',
      code: 'GET_FILES_ERROR',
    });
  }
});

/**
 * GET /files/search
 * Search files by text query
 *
 * This endpoint provides a dedicated search experience with text-based filtering.
 * Uses full-text search to find files by name, description, or tags.
 *
 * EXAMPLE REQUEST:
 * GET /files/search?q=budget&fileCategory=spreadsheet&favorite=true
 *
 * EXAMPLE RESPONSE:
 * {
 *   "files": [
 *     {
 *       "id": "507f1f77bcf86cd799439011",
 *       "name": "Q4 Budget.xlsx",
 *       "size": 524288,
 *       "type": "spreadsheet",
 *       "favorite": true,
 *       "createdAt": "2026-01-21T10:30:00Z"
 *     }
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 50,
 *     "total": 5,
 *     "pages": 1
 *   }
 * }
 *
 * @query {string} q - Search text (filename, description)
 * @query {string} fileCategory - Optional: filter by type
 * @query {string[]} tags - Optional: filter by tags
 * @query {boolean} favorite - Optional: show only favorites
 * @query {string} sort - Sort field (default: -createdAt)
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Results per page (default: 50)
 * @returns {Object} Search results with pagination info
 * @throws {401} - User not authenticated
 * @throws {500} - Server error searching files
 */
router.get('/search', requireAuth, async (req, res) => {
  try {
    // STEP 1: Extract search and filter parameters
    const {
      q,                          // Search query text
      fileCategory,               // Optional category filter
      tags,                       // Optional tag filters
      favorite,                   // Optional favorite filter (string "true"/"false")
      sort = '-createdAt',        // Sort order
      limit = 50,                 // Results per page
      page = 1,                   // Page number
    } = req.query;

    // STEP 2: Call same service as /files endpoint but with search parameters
    // The service will do full-text search on filenames and descriptions
    const result = await fileService.getFiles(req.user._id, {
      q,                          // Full-text search query
      fileCategory,
      tags,
      // Convert string 'true'/'false' to boolean, or null if not specified
      favorite: favorite === 'true' ? true : favorite === 'false' ? false : null,
      sort,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    // STEP 3: Return search results
    res.json(result);
  } catch (error) {
    attachError(req, error, { operation: 'files_search' });
    res.status(500).json({
      error: 'Failed to search files',
      code: 'SEARCH_FILES_ERROR',
    });
  }
});

/**
 * GET /files/recent
 * Get recently accessed files
 *
 * Returns the user's most recently accessed files.
 * Used to show "Recent Files" section in the file library UI.
 * Shows files sorted by last access time (most recent first).
 *
 * EXAMPLE REQUEST:
 * GET /files/recent?limit=10
 *
 * EXAMPLE RESPONSE:
 * {
 *   "files": [
 *     {
 *       "id": "507f1f77bcf86cd799439011",
 *       "name": "Q4 Budget.xlsx",
 *       "size": 524288,
 *       "lastAccessedAt": "2026-01-21T14:30:00Z",
 *       "createdAt": "2026-01-15T10:30:00Z"
 *     }
 *   ]
 * }
 *
 * @query {number} limit - Max number of recent files (default: 10, max: 50)
 * @returns {Object} Array of recently accessed file objects
 * @throws {401} - User not authenticated
 * @throws {500} - Server error fetching recent files
 */
router.get('/recent', requireAuth, async (req, res) => {
  try {
    // STEP 1: Get limit parameter (how many recent files to return)
    const { limit = 10 } = req.query;

    // STEP 2: Fetch recently accessed files
    // Service sorts by most recent accessTime and returns top N
    const files = await fileService.getRecentFiles(req.user._id, parseInt(limit, 10));

    // STEP 3: Return recent files to frontend
    res.json({ files });
  } catch (error) {
    attachError(req, error, { operation: 'files_recent' });
    res.status(500).json({
      error: 'Failed to get recent files',
      code: 'GET_RECENT_ERROR',
    });
  }
});

/**
 * GET /files/trash
 * Get files in the user's trash bin
 *
 * When files are deleted, they go to trash first (soft delete).
 * Users can restore files or permanently delete them from trash.
 * Trash is automatically emptied after 30 days.
 *
 * EXAMPLE REQUEST:
 * GET /files/trash?page=1&limit=50
 *
 * EXAMPLE RESPONSE:
 * {
 *   "files": [
 *     {
 *       "id": "507f1f77bcf86cd799439011",
 *       "name": "Old Budget.xlsx",
 *       "size": 262144,
 *       "deletedAt": "2026-01-18T10:30:00Z"
 *     }
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "limit": 50,
 *     "total": 2,
 *     "pages": 1
 *   }
 * }
 *
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Files per page (default: 50)
 * @returns {Object} Trashed files with pagination
 * @throws {401} - User not authenticated
 * @throws {500} - Server error fetching trash
 */
router.get('/trash', requireAuth, async (req, res) => {
  try {
    // STEP 1: Get pagination parameters
    const { page = 1, limit = 50 } = req.query;

    // STEP 2: Fetch trashed files
    // Service queries files with deletedAt timestamp set (marked as deleted, not actually deleted)
    const result = await fileService.getTrashedFiles(req.user._id, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    // STEP 3: Return trashed files
    res.json(result);
  } catch (error) {
    attachError(req, error, { operation: 'files_trash' });
    res.status(500).json({
      error: 'Failed to get trashed files',
      code: 'GET_TRASH_ERROR',
    });
  }
});

/**
 * GET /files/stats
 * Get user's storage statistics and breakdown
 *
 * Returns storage usage information:
 * - Total storage used (in bytes)
 * - Storage remaining
 * - File count by category
 * - Storage per file type (docs vs images vs others)
 *
 * Used to display storage meter and stats in file library UI.
 *
 * EXAMPLE REQUEST:
 * GET /files/stats
 *
 * EXAMPLE RESPONSE:
 * {
 *   "totalBytes": 524288000,
 *   "totalFormatted": "500 MB",
 *   "limitBytes": 1073741824,
 *   "limitFormatted": "1 GB",
 *   "remainingBytes": 549453824,
 *   "percentage": 48,
 *   "fileCount": 47,
 *   "categories": {
 *     "spreadsheet": { "count": 15, "bytes": 314572800 },
 *     "document": { "count": 20, "bytes": 157286400 }
 *   }
 * }
 *
 * @returns {Object} Storage stats including usage, limits, and breakdown by type
 * @throws {401} - User not authenticated
 * @throws {500} - Server error fetching stats
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    // STEP 1: Fetch storage statistics for the user
    // Service calculates:
    // - Total bytes used (sum of all file sizes)
    // - Number of files by category
    // - Storage used per file type
    // - Percentage of limit used
    const stats = await fileService.getStorageStats(req.user._id);

    // STEP 2: Return stats to frontend for display
    res.json(stats);
  } catch (error) {
    attachError(req, error, { operation: 'files_stats' });
    res.status(500).json({
      error: 'Failed to get storage stats',
      code: 'GET_STATS_ERROR',
    });
  }
});

/**
 * GET /files/tags
 * Get all unique tags used on the user's files
 *
 * Returns a list of every tag the user has applied to their files.
 * Used for tag filter dropdown in file library.
 * Includes count of how many files use each tag.
 *
 * EXAMPLE REQUEST:
 * GET /files/tags
 *
 * EXAMPLE RESPONSE:
 * {
 *   "tags": [
 *     { "name": "finance", "count": 12 },
 *     { "name": "personal", "count": 5 },
 *     { "name": "archive", "count": 3 }
 *   ]
 * }
 *
 * @returns {Object} Array of tag objects with name and usage count
 * @throws {401} - User not authenticated
 * @throws {500} - Server error fetching tags
 */
router.get('/tags', requireAuth, async (req, res) => {
  try {
    // STEP 1: Fetch all unique tags for this user's files
    // Service does MongoDB aggregation to get distinct tags and their counts
    const tags = await fileService.getUserFileTags(req.user._id);

    // STEP 2: Return tags list to frontend
    // Frontend uses this to populate tag filter dropdown
    res.json({ tags });
  } catch (error) {
    attachError(req, error, { operation: 'files_tags' });
    res.status(500).json({
      error: 'Failed to get file tags',
      code: 'GET_TAGS_ERROR',
    });
  }
});

/**
 * GET /files/limits
 * Get user's storage limits and current usage
 *
 * Returns information about the user's storage quota:
 * - Total storage limit (free: 1GB, premium: 100GB)
 * - Current storage used
 * - Storage remaining
 * - Percentage of limit used
 * - Whether storage is approaching limit
 *
 * Used to display storage meter and alert when approaching limit.
 *
 * EXAMPLE REQUEST:
 * GET /files/limits
 *
 * EXAMPLE RESPONSE:
 * {
 *   "limit": 1073741824,
 *   "used": 644245094,
 *   "available": 429496730,
 *   "percentageUsed": 60,
 *   "planType": "free",
 *   "warningThreshold": 900000000,
 *   "reachedLimit": false,
 *   "limitFormatted": "1 GB",
 *   "usedFormatted": "615 MB",
 *   "availableFormatted": "410 MB"
 * }
 *
 * @returns {Object} Storage quota info with limits and current usage
 * @throws {401} - User not authenticated
 * @throws {500} - Server error fetching limits
 */
router.get('/limits', requireAuth, async (req, res) => {
  try {
    // STEP 1: Get storage limit status from service
    // Service looks up user's plan type and calculates remaining space
    const limitStatus = await limitService.getFileLimitStatus(req.user);

    // STEP 2: Return limit status to frontend
    // Frontend displays storage meter and upgrade prompt if needed
    res.json(limitStatus);
  } catch (error) {
    attachError(req, error, { operation: 'files_limits' });
    res.status(500).json({
      error: 'Failed to get file limits',
      code: 'GET_LIMITS_ERROR',
    });
  }
});

// =============================================================================
// FILE UPLOAD ROUTES
// =============================================================================
// These endpoints handle file uploads to cloud storage (AWS S3).
// Files are temporarily stored in multer, then uploaded to S3, then deleted locally.
// Metadata is saved to MongoDB database for searching and organizing.

/**
 * POST /files
 * Upload a new file
 *
 * This is the main file upload endpoint. It:
 * 1. Receives the file from the browser
 * 2. Checks storage limits
 * 3. Uploads to AWS S3
 * 4. Saves metadata to database
 * 5. Returns file object with S3 URL
 *
 * MIDDLEWARE CHAIN (processed in order):
 * 1. requireAuth - Verify user is logged in
 * 2. requireFeature - Check if user has file upload enabled
 * 3. uploadFileSingle - Receive file from browser, store temporarily
 * 4. handleUploadError - Catch file receive errors
 * 5. checkFileUploadLimit - Verify user has storage space
 * 6. Route handler - Upload to S3, save metadata
 *
 * EXAMPLE REQUEST (multipart/form-data):
 * POST /files
 * - file: [binary file data]
 * - title: "My Document"
 * - description: "Q4 budget spreadsheet"
 * - folderId: "507f1f77bcf86cd799439011"
 * - tags: ["budget", "finance"]  (JSON array)
 *
 * EXAMPLE RESPONSE:
 * {
 *   "file": {
 *     "id": "507f1f77bcf86cd799439011",
 *     "name": "My Document.xlsx",
 *     "title": "My Document",
 *     "size": 262144,
 *     "url": "https://s3.amazonaws.com/mybrain/files/...",
 *     "folder": "507f1f77bcf86cd799439012",
 *     "tags": ["budget", "finance"],
 *     "createdAt": "2026-01-21T10:30:00Z"
 *   }
 * }
 *
 * @body {File} file - Binary file data
 * @body {string} title - Display name for file (optional)
 * @body {string} description - File description (optional)
 * @body {string} folderId - Destination folder ID (optional, null = root)
 * @body {string} tags - JSON array of tags (optional)
 * @returns {Object} Created file object with S3 URL
 */
router.post(
  '/',
  requireAuth,                      // Middleware 1: Check if user is authenticated
  requireFeature('filesEnabled'),   // Middleware 2: Check if user has file upload feature
  uploadFileSingle,                 // Middleware 3: Receive file from browser
  handleUploadError,                // Middleware 4: Catch upload errors
  checkFileUploadLimit,             // Middleware 5: Check storage limits
  async (req, res) => {             // Route handler: Process upload
    try {
      // STEP 1: Verify file was uploaded
      // If no file in req.file, something went wrong in upload middleware
      if (!req.file) {
        return res.status(400).json({
          error: 'No file provided',
          code: 'NO_FILE',
        });
      }

      // STEP 2: Extract metadata from request body
      // title and description are optional user-provided strings
      // folderId specifies which folder to organize the file into
      // tags are optional and help with organization/search
      const { folderId, title, description, tags } = req.body;

      // Parse tags from JSON string to array
      // Frontend sends tags as JSON array string because form data doesn't support arrays
      const parsedTags = tags ? JSON.parse(tags) : [];

      // STEP 3: Upload file to S3 and save metadata to database
      // uploadFile service handles:
      // - Moving file from temp storage to S3
      // - Creating File document in MongoDB
      // - Setting up S3 permissions
      // - Generating download URLs
      const file = await fileService.uploadFile(req.file, req.user._id, {
        folderId: folderId || null,       // null = root folder
        title: title || '',               // Default empty string if not provided
        description: description || '',   // Default empty string if not provided
        tags: parsedTags,                 // Array of tag strings
      });

      // STEP 4: Log the file creation for audit trail
      // This creates an entry in the Wide Events log
      attachEntityId(req, 'fileId', file._id);  // Which file was created
      req.eventName = 'file.create.success';    // What action was performed

      // STEP 5: Return success response
      // Status 201 = Created (standard for POST that creates a resource)
      res.status(201).json({ file });
    } catch (error) {
      // Error occurred during upload
      // Log the error for debugging/audit
      attachError(req, error, { operation: 'file_upload' });
      res.status(500).json({
        error: error.message || 'Failed to upload file',
        code: 'UPLOAD_ERROR',
      });
    }
  }
);

/**
 * POST /files/:id/version
 * Upload a new version of an existing file
 *
 * WHAT IT DOES:
 * Creates a new version of a file while keeping the old version.
 * Useful for tracking changes: "version 1 from Jan 21, version 2 from Jan 22"
 * Users can compare versions or restore older versions.
 *
 * WHY IT MATTERS:
 * - Prevents accidental overwrite (can restore previous version)
 * - Tracks file evolution over time
 * - Provides safety net for editing
 *
 * VERSIONING MODEL:
 * - Original file remains main version
 * - New versions stored with version numbers
 * - All versions count toward storage quota
 * - Can view/download any previous version
 * - Can restore old version as current version
 *
 * @param id - File ID to create version for
 * @body {File} file - New file version
 * @returns {Object} Updated file object with new version
 */
router.post(
  '/:id/version',
  requireAuth,                      // Verify user is logged in
  requireFeature('filesEnabled'),   // Check file feature is enabled
  validateId(),                     // Validate file ID format
  uploadFileSingle,                 // Receive new version file
  handleUploadError,                // Catch upload errors
  checkFileUploadLimit,             // Check storage space
  async (req, res) => {             // Process new version
    try {
      // STEP 1: Verify new version file was uploaded
      if (!req.file) {
        return res.status(400).json({
          error: 'No file provided',
          code: 'NO_FILE',
        });
      }

      // STEP 2: Create new version in database and S3
      // Service handles:
      // - Moving old file to version history
      // - Uploading new file to S3
      // - Updating version timestamp
      // - Preserving old versions for restore
      const file = await fileService.createFileVersion(req.params.id, req.file, req.user._id);

      // STEP 3: Log version creation
      attachEntityId(req, 'fileId', file._id);
      req.eventName = 'file.version.success';

      // STEP 4: Return updated file
      res.status(201).json({ file });
    } catch (error) {
      attachError(req, error, { operation: 'file_version', fileId: req.params.id });
      // Return 404 if original file doesn't exist, 500 otherwise
      res.status(error.message === 'Original file not found' ? 404 : 500).json({
        error: error.message || 'Failed to create file version',
        code: 'VERSION_ERROR',
      });
    }
  }
);

// =============================================================================
// SINGLE FILE ROUTES
// =============================================================================
// These endpoints operate on individual files: retrieving, updating, downloading.
// All endpoints include ownership checks to prevent users from accessing other users' files.

/**
 * GET /files/:id
 * Get a single file's metadata
 *
 * Retrieves complete information about a specific file:
 * - File metadata (name, size, type, created/updated dates)
 * - Folder location
 * - Tags and description
 * - Version history
 * - Share status
 *
 * SECURITY: Only returns file if current user owns it (ownership check in service).
 *
 * EXAMPLE REQUEST:
 * GET /files/507f1f77bcf86cd799439011
 *
 * EXAMPLE RESPONSE:
 * {
 *   "file": {
 *     "id": "507f1f77bcf86cd799439011",
 *     "name": "Budget.xlsx",
 *     "size": 262144,
 *     "type": "spreadsheet",
 *     "description": "Q4 budget",
 *     "folder": "507f1f77bcf86cd799439012",
 *     "tags": ["finance"],
 *     "favorite": true,
 *     "createdAt": "2026-01-15T10:30:00Z",
 *     "updatedAt": "2026-01-20T14:15:00Z",
 *     "versionCount": 3,
 *     "sharedWith": ["user2@example.com"]
 *   }
 * }
 *
 * @param id - File ID (MongoDB ObjectId)
 * @returns {Object} File metadata object
 * @throws 404 if file not found or user doesn't own it
 */
router.get('/:id', requireAuth, validateId(), async (req, res) => {
  try {
    // STEP 1: Fetch file from database
    // Service includes ownership check - won't return if user doesn't own file
    const file = await fileService.getFile(req.params.id, req.user._id);

    // STEP 2: If file not found or not owned by user, return 404
    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }

    // STEP 3: Return file metadata
    res.json({ file });
  } catch (error) {
    attachError(req, error, { operation: 'file_fetch', fileId: req.params.id });
    res.status(500).json({
      error: 'Failed to get file',
      code: 'GET_FILE_ERROR',
    });
  }
});

/**
 * PATCH /files/:id
 * Update file metadata (name, description, tags)
 *
 * IMPORTANT: This updates METADATA only, not the file content itself.
 * To update file content, use POST /files/:id/version instead.
 *
 * UPDATABLE FIELDS:
 * - title: Display name for the file
 * - description: User-written description
 * - tags: Array of tags for organization
 * - favorite: Boolean flag for starring
 *
 * EXAMPLE REQUEST:
 * PATCH /files/507f1f77bcf86cd799439011
 * {
 *   "title": "Q4 Budget Final",
 *   "description": "Approved budget spreadsheet",
 *   "tags": ["finance", "final"],
 *   "favorite": true
 * }
 *
 * @param id - File ID
 * @body {string} title - New file title
 * @body {string} description - New description
 * @body {string[]} tags - New tags array
 * @body {boolean} favorite - New favorite status
 * @returns {Object} Updated file object
 */
router.patch('/:id', requireAuth, validateId(), async (req, res) => {
  try {
    // STEP 1: Extract metadata to update from request body
    // Only these fields can be updated - not file content
    const { title, description, tags, favorite } = req.body;

    // STEP 2: Update file metadata in database
    // Service performs ownership check - won't update if user doesn't own file
    const file = await fileService.updateFile(req.params.id, req.user._id, {
      title,
      description,
      tags,
      favorite,
    });

    // STEP 3: If file not found, return 404
    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }

    // STEP 4: Log the update for audit trail
    attachEntityId(req, 'fileId', file._id);
    req.eventName = 'file.update.success';

    // STEP 5: Return updated file
    res.json({ file });
  } catch (error) {
    attachError(req, error, { operation: 'file_update', fileId: req.params.id });
    res.status(500).json({
      error: 'Failed to update file',
      code: 'UPDATE_FILE_ERROR',
    });
  }
});

/**
 * GET /files/:id/download
 * Get a signed download URL for a file
 *
 * WHAT IT DOES:
 * Generates a time-limited S3 download URL for the file.
 * The URL is valid for 24 hours and includes security token.
 * Frontend then redirects browser to this URL to download the file.
 *
 * WHY NOT DIRECT S3 DOWNLOAD:
 * - S3 URLs are exposed in browser (user sees the bucket name/structure)
 * - We want to log downloads for audit trail
 * - We can enforce access controls (ownership, sharing)
 * - We can track download statistics
 *
 * SECURITY:
 * - Returns 404 if user doesn't own the file
 * - URL is time-limited (expires after 24 hours)
 * - URL includes security token signed by AWS
 *
 * EXAMPLE RESPONSE:
 * {
 *   "downloadUrl": "https://mybrain.s3.amazonaws.com/files/...?signature=...",
 *   "filename": "Budget.xlsx",
 *   "expires": "2026-01-22T10:30:00Z"
 * }
 *
 * @param id - File ID
 * @returns {Object} Download URL info
 */
router.get('/:id/download', requireAuth, validateId(), async (req, res) => {
  try {
    // STEP 1: Get signed download URL from S3
    // Service:
    // - Checks if user owns the file
    // - Generates time-limited S3 URL (valid 24 hours)
    // - Includes AWS signature for security
    const downloadInfo = await fileService.getDownloadUrl(req.params.id, req.user._id);

    // STEP 2: If file not found or not owned, return 404
    if (!downloadInfo) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }

    // STEP 3: Return download URL to frontend
    // Frontend will redirect browser to this URL
    res.json(downloadInfo);
  } catch (error) {
    attachError(req, error, { operation: 'file_download', fileId: req.params.id });
    res.status(500).json({
      error: 'Failed to get download URL',
      code: 'DOWNLOAD_ERROR',
    });
  }
});

/**
 * GET /files/:id/versions
 * Get version history for a file
 *
 * Returns all previous versions of a file with metadata for each version.
 * Users can see when each version was created and download/restore them.
 *
 * VERSION INFORMATION:
 * - Version number (1, 2, 3, etc.)
 * - Upload timestamp
 * - File size
 * - Download URL for that version
 * - Whether this is the current version
 *
 * EXAMPLE RESPONSE:
 * {
 *   "versions": [
 *     {
 *       "versionNumber": 2,
 *       "isCurrent": true,
 *       "createdAt": "2026-01-20T14:15:00Z",
 *       "size": 524288,
 *       "downloadUrl": "https://..."
 *     },
 *     {
 *       "versionNumber": 1,
 *       "isCurrent": false,
 *       "createdAt": "2026-01-15T10:30:00Z",
 *       "size": 262144,
 *       "downloadUrl": "https://..."
 *     }
 *   ]
 * }
 *
 * @param id - File ID
 * @returns {Object} Array of version objects
 */
router.get('/:id/versions', requireAuth, validateId(), async (req, res) => {
  try {
    // STEP 1: Fetch version history for the file
    // Service queries all versions stored for this file
    // Includes download URLs for each version
    // Marks which version is current
    const versions = await fileService.getFileVersions(req.params.id, req.user._id);

    // STEP 2: Return version history
    // Frontend displays as dropdown: "Restore to version 1" etc.
    res.json({ versions });
  } catch (error) {
    attachError(req, error, { operation: 'file_versions', fileId: req.params.id });
    res.status(500).json({
      error: 'Failed to get file versions',
      code: 'GET_VERSIONS_ERROR',
    });
  }
});

// =============================================================================
// FILE ACTIONS
// =============================================================================
// These endpoints perform operations on files: marking favorite, moving,
// copying, trashing, restoring, and permanently deleting.

/**
 * POST /files/:id/favorite
 * Toggle file favorite status (star/unstar)
 *
 * WHAT IT DOES:
 * When called, toggles the favorite flag:
 * - If favorite=false → Sets to true (star the file)
 * - If favorite=true → Sets to false (unstar the file)
 *
 * WHY IT MATTERS:
 * - Users can star important files for quick access
 * - Starred files show in favorites view
 * - Helps users organize without creating folders
 *
 * EXAMPLE REQUEST:
 * POST /files/507f1f77bcf86cd799439011/favorite
 *
 * EXAMPLE RESPONSE:
 * {
 *   "file": { ... file object ... },
 *   "favorite": true  // New favorite status
 * }
 *
 * @param id - File ID
 * @returns {Object} Updated file with new favorite status
 */
router.post('/:id/favorite', requireAuth, validateId(), async (req, res) => {
  try {
    // STEP 1: Toggle favorite status for the file
    // Service flips the boolean: true→false or false→true
    const file = await fileService.toggleFavorite(req.params.id, req.user._id);

    // STEP 2: If file not found, return 404
    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }

    // STEP 3: Log the action
    attachEntityId(req, 'fileId', file._id);
    req.eventName = 'file.favorite.success';

    // STEP 4: Return updated file with new favorite status
    res.json({ file, favorite: file.favorite });
  } catch (error) {
    attachError(req, error, { operation: 'file_toggle_favorite', fileId: req.params.id });
    res.status(500).json({
      error: 'Failed to toggle favorite',
      code: 'TOGGLE_FAVORITE_ERROR',
    });
  }
});

/**
 * POST /files/:id/move
 * Move file to a different folder
 *
 * WHAT IT DOES:
 * Changes which folder a file belongs to.
 * Can move to subfolder, to root, or between folders.
 *
 * FOLDER STRUCTURE:
 * - Users organize files into folders (like on computer)
 * - Can create subfolders (nested folders)
 * - Moving file updates its folderId reference
 *
 * EXAMPLE REQUEST:
 * POST /files/507f1f77bcf86cd799439011/move
 * { "folderId": "507f1f77bcf86cd799439012" }
 *
 * @param id - File ID to move
 * @body {string} folderId - Destination folder ID (null = root)
 * @returns {Object} Updated file with new folder location
 */
router.post('/:id/move', requireAuth, validateId(), async (req, res) => {
  try {
    // STEP 1: Extract destination folder from request
    const { folderId } = req.body;

    // STEP 2: Move file to destination folder
    // Service handles:
    // - Validating folder exists
    // - Checking folder ownership (user can't move to another user's folder)
    // - Updating file's folderId
    // - Preventing circular relationships (file → folder → file)
    const file = await fileService.moveFile(req.params.id, folderId || null, req.user._id);

    // STEP 3: If file not found, return 404
    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }

    // STEP 4: Log the move action
    attachEntityId(req, 'fileId', file._id);
    req.eventName = 'file.move.success';

    // STEP 5: Return file at new location
    res.json({ file });
  } catch (error) {
    attachError(req, error, { operation: 'file_move', fileId: req.params.id });
    // Return 404 if folder doesn't exist, 500 otherwise
    res.status(error.message === 'Target folder not found' ? 404 : 500).json({
      error: error.message || 'Failed to move file',
      code: 'MOVE_FILE_ERROR',
    });
  }
});

/**
 * POST /files/:id/copy
 * Create a duplicate copy of a file
 *
 * WHAT IT DOES:
 * Creates a new file that's an exact duplicate of the original.
 * The copy gets a new ID and appears as a separate file.
 * Copy counts toward storage quota.
 *
 * USE CASES:
 * - Duplicate a template file to use as starting point
 * - Make a backup copy before editing
 * - Share file without affecting original
 *
 * NAMING:
 * Copy gets automatic name: "Original Name (copy)" or "Original Name (copy 2)"
 *
 * @param id - File ID to copy
 * @body {string} folderId - Optional destination folder for copy
 * @returns {Object} New copied file object
 */
router.post('/:id/copy', requireAuth, requireFeature('filesEnabled'), validateId(), async (req, res) => {
  try {
    // STEP 1: Extract destination folder
    const { folderId } = req.body;

    // STEP 2: Check if user can create more files (file count limit)
    // Copy counts as creating a new file
    const limitCheck = await limitService.canCreate(req.user, 'files');
    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: limitCheck.message,
        code: 'FILE_LIMIT_EXCEEDED',
      });
    }

    // STEP 3: Create duplicate of the file
    // Service:
    // - Copies all metadata (tags, description, etc.)
    // - Copies S3 file to new location
    // - Creates new File document in database
    // - Generates new ID for the copy
    const file = await fileService.copyFile(req.params.id, folderId || null, req.user._id);

    // STEP 4: If original file not found, return 404
    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }

    // STEP 5: Log file creation
    attachEntityId(req, 'fileId', file._id);
    req.eventName = 'file.copy.success';

    // STEP 6: Return new copied file
    // Status 201 = Created (same as upload, since we created a new file)
    res.status(201).json({ file });
  } catch (error) {
    attachError(req, error, { operation: 'file_copy', fileId: req.params.id });
    res.status(500).json({
      error: error.message || 'Failed to copy file',
      code: 'COPY_FILE_ERROR',
    });
  }
});

/**
 * POST /files/:id/trash
 * Move file to trash (soft delete)
 *
 * WHAT IT DOES:
 * Marks file as deleted but doesn't permanently remove it.
 * File moves to trash/trash-bin and can be restored.
 * File is hidden from normal file list but visible in trash.
 *
 * SOFT DELETE MODEL:
 * - File not deleted immediately (safety)
 * - User can restore file for 30 days
 * - After 30 days, file is automatically permanently deleted
 * - Storage space is freed when file is permanently deleted
 *
 * WHY SOFT DELETE:
 * - Prevents accidental permanent loss
 * - Gives users time to change mind
 * - Creates audit trail (when was file deleted?)
 * - Better UX than immediate deletion
 *
 * @param id - File ID to trash
 * @returns {Object} Trashed file object with deletedAt timestamp
 */
router.post('/:id/trash', requireAuth, validateId(), async (req, res) => {
  try {
    // STEP 1: Move file to trash
    // Service marks file with deletedAt timestamp
    // File becomes invisible in normal listing but shows in trash
    const file = await fileService.trashFile(req.params.id, req.user._id);

    // STEP 2: If file not found, return 404
    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }

    // STEP 3: Log the trash action
    attachEntityId(req, 'fileId', file._id);
    req.eventName = 'file.trash.success';

    // STEP 4: Return trashed file
    res.json({ message: 'File moved to trash', file });
  } catch (error) {
    attachError(req, error, { operation: 'file_trash', fileId: req.params.id });
    res.status(500).json({
      error: 'Failed to trash file',
      code: 'TRASH_FILE_ERROR',
    });
  }
});

/**
 * POST /files/:id/restore
 * Restore file from trash
 *
 * WHAT IT DOES:
 * Recovers a trashed file and makes it visible again in file library.
 * Can restore for up to 30 days after deletion.
 * After 30 days, file is automatically purged.
 *
 * @param id - File ID to restore
 * @returns {Object} Restored file object with deletedAt=null
 */
router.post('/:id/restore', requireAuth, validateId(), async (req, res) => {
  try {
    // STEP 1: Restore file from trash
    // Service clears the deletedAt timestamp
    // File becomes visible again in normal file listing
    const file = await fileService.restoreFile(req.params.id, req.user._id);

    // STEP 2: If file not in trash, return 404
    if (!file) {
      return res.status(404).json({
        error: 'File not found in trash',
        code: 'FILE_NOT_FOUND',
      });
    }

    // STEP 3: Log the restore action
    attachEntityId(req, 'fileId', file._id);
    req.eventName = 'file.restore.success';

    // STEP 4: Return restored file
    res.json({ message: 'File restored', file });
  } catch (error) {
    attachError(req, error, { operation: 'file_restore', fileId: req.params.id });
    res.status(500).json({
      error: 'Failed to restore file',
      code: 'RESTORE_FILE_ERROR',
    });
  }
});

/**
 * DELETE /files/:id
 * Permanently delete a file
 *
 * WARNING: This is PERMANENT and CANNOT BE UNDONE.
 * File is immediately removed from S3 and database.
 * No recovery possible after this.
 *
 * NORMAL FLOW: Use POST /trash first, then DELETE to permanently remove.
 * BYPASS: Can DELETE directly without trashing first.
 *
 * WHEN TO USE:
 * - Deleting trashed file permanently
 * - Cleaning up after 30 days
 * - User explicitly confirmed permanent deletion
 *
 * STORAGE: Storage space immediately freed from user's quota.
 *
 * @param id - File ID to permanently delete
 * @returns {Object} Success message
 */
router.delete('/:id', requireAuth, validateId(), async (req, res) => {
  try {
    // STEP 1: Log the deletion BEFORE we delete
    // After deletion, file no longer exists, so we log the ID now
    attachEntityId(req, 'fileId', req.params.id);

    // STEP 2: Permanently delete file from S3 and database
    // Service:
    // - Removes file from AWS S3 (freeing storage)
    // - Deletes File document from MongoDB
    // - Removes all versions
    // - Removes share records
    // - Returns deleted count (0 or 1)
    const result = await fileService.deleteFile(req.params.id, req.user._id);

    // STEP 3: If file not found, return 404
    if (!result.deleted) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }

    // STEP 4: Log the permanent deletion
    req.eventName = 'file.delete.success';

    // STEP 5: Return success message
    res.json({ message: 'File deleted permanently' });
  } catch (error) {
    attachError(req, error, { operation: 'file_delete', fileId: req.params.id });
    res.status(500).json({
      error: 'Failed to delete file',
      code: 'DELETE_FILE_ERROR',
    });
  }
});

// =============================================================================
// BULK OPERATIONS
// =============================================================================
// These endpoints perform operations on multiple files at once.
// Useful for batch actions: move/delete many files selected by user.
// Each operation validates ownership - can't modify other users' files.

/**
 * POST /files/bulk-move
 * Move multiple files to a folder at once
 *
 * WHAT IT DOES:
 * Takes an array of file IDs and moves all of them to the same destination folder.
 * Equivalent to user selecting 10 files and clicking "Move to Finance".
 *
 * WHY IT'S USEFUL:
 * - Instead of moving files one by one, move all at once
 * - Batch operations are faster than multiple API calls
 * - Better UX: select multiple, move together
 *
 * VALIDATION:
 * - Verifies all file IDs are valid ObjectIds
 * - Checks user owns all files (prevents moving other users' files)
 * - Validates destination folder exists and is owned by user
 *
 * EXAMPLE REQUEST:
 * POST /files/bulk-move
 * {
 *   "ids": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
 *   "folderId": "507f1f77bcf86cd799439020"
 * }
 *
 * EXAMPLE RESPONSE:
 * { "message": "Moved 3 files", "moved": 3 }
 *
 * @body {string[]} ids - Array of file IDs to move (required, min 1)
 * @body {string} folderId - Destination folder ID (null = root)
 * @returns {Object} Result with number of files moved
 */
router.post('/bulk-move', requireAuth, async (req, res) => {
  try {
    // STEP 1: Extract request parameters
    const { ids, folderId } = req.body;

    // STEP 2: Validate IDs array is provided and not empty
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'File IDs array is required',
        code: 'INVALID_IDS',
      });
    }

    // STEP 3: Validate each ID is a valid MongoDB ObjectId
    // Prevents sending malformed IDs to database
    for (const id of ids) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: `Invalid file ID: ${id}`,
          code: 'INVALID_ID',
        });
      }
    }

    // STEP 4: Move all files to destination folder
    // Service handles:
    // - Checking user owns all files
    // - Verifying destination folder exists
    // - Updating all files in one operation (more efficient)
    // - Returning count of successfully moved files
    const result = await fileService.bulkMoveFiles(ids, folderId || null, req.user._id);

    // STEP 5: Log the bulk operation
    req.eventName = 'file.bulkMove.success';

    // STEP 6: Return result with count of moved files
    res.json({ message: `Moved ${result.moved} files`, moved: result.moved });
  } catch (error) {
    attachError(req, error, { operation: 'files_bulk_move' });
    res.status(500).json({
      error: error.message || 'Failed to move files',
      code: 'BULK_MOVE_ERROR',
    });
  }
});

/**
 * POST /files/bulk-trash
 * Move multiple files to trash at once
 *
 * WHAT IT DOES:
 * Takes an array of file IDs and moves all to trash.
 * Equivalent to selecting multiple files and clicking "Delete".
 *
 * SAFETY: Uses soft delete (trash), not permanent deletion.
 * Files can be restored from trash for 30 days.
 *
 * @body {string[]} ids - Array of file IDs to trash (required, min 1)
 * @returns {Object} Result with count of trashed files
 */
router.post('/bulk-trash', requireAuth, async (req, res) => {
  try {
    // STEP 1: Extract file IDs array
    const { ids } = req.body;

    // STEP 2: Validate array is provided and not empty
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'File IDs array is required',
        code: 'INVALID_IDS',
      });
    }

    // STEP 3: Validate each ID format
    for (const id of ids) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: `Invalid file ID: ${id}`,
          code: 'INVALID_ID',
        });
      }
    }

    // STEP 4: Move all files to trash
    // Service marks all with deletedAt timestamp
    const result = await fileService.bulkTrashFiles(ids, req.user._id);

    // STEP 5: Log bulk trash operation
    req.eventName = 'file.bulkTrash.success';

    // STEP 6: Return result
    res.json({ message: `Trashed ${result.trashed} files`, trashed: result.trashed });
  } catch (error) {
    attachError(req, error, { operation: 'files_bulk_trash' });
    res.status(500).json({
      error: 'Failed to trash files',
      code: 'BULK_TRASH_ERROR',
    });
  }
});

/**
 * POST /files/bulk-delete
 * Permanently delete multiple files at once
 *
 * ⚠️ WARNING: THIS IS PERMANENT AND CANNOT BE UNDONE
 *
 * WHAT IT DOES:
 * Takes an array of file IDs and permanently deletes all.
 * Files are immediately removed from S3 and database.
 * No recovery possible.
 *
 * NORMAL USE CASE:
 * Deleting files that are already in trash for 30+ days.
 *
 * @body {string[]} ids - Array of file IDs to delete (required, min 1)
 * @returns {Object} Result with count of deleted files
 */
router.post('/bulk-delete', requireAuth, async (req, res) => {
  try {
    // STEP 1: Extract file IDs array
    const { ids } = req.body;

    // STEP 2: Validate array is provided and not empty
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'File IDs array is required',
        code: 'INVALID_IDS',
      });
    }

    // STEP 3: Validate each ID format
    for (const id of ids) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: `Invalid file ID: ${id}`,
          code: 'INVALID_ID',
        });
      }
    }

    // STEP 4: Permanently delete all files
    // Service:
    // - Removes all from S3 (frees storage)
    // - Deletes all File documents from MongoDB
    // - Removes versions, shares, links
    // - Returns count of deleted
    const result = await fileService.bulkDeleteFiles(ids, req.user._id);

    // STEP 5: Log permanent deletion
    req.eventName = 'file.bulkDelete.success';

    // STEP 6: Return result
    res.json({ message: `Deleted ${result.deleted} files`, deleted: result.deleted });
  } catch (error) {
    attachError(req, error, { operation: 'files_bulk_delete' });
    res.status(500).json({
      error: 'Failed to delete files',
      code: 'BULK_DELETE_ERROR',
    });
  }
});

/**
 * POST /files/empty-trash
 * Permanently delete ALL trashed files
 *
 * ⚠️ WARNING: DELETES ALL FILES IN TRASH PERMANENTLY
 *
 * WHAT IT DOES:
 * Finds all files marked as deleted (in trash) and permanently removes them.
 * Typically run automatically every 30 days.
 * Can also be called manually by user to clean trash now.
 *
 * USE CASES:
 * - Auto-cleanup: Runs every 30 days to remove 30-day-old trashed files
 * - Manual cleanup: User clicks "Empty Trash" button to clean now
 *
 * STORAGE: Immediately frees storage space for all deleted files.
 *
 * @returns {Object} Result with count of deleted files
 */
router.post('/empty-trash', requireAuth, async (req, res) => {
  try {
    // STEP 1: Find and permanently delete all trashed files
    // Service queries for all files with deletedAt timestamp set
    // Then permanently deletes them all
    const result = await fileService.emptyTrash(req.user._id);

    // STEP 2: Log trash emptying
    req.eventName = 'file.emptyTrash.success';

    // STEP 3: Return count of deleted
    res.json({ message: `Deleted ${result.deleted} files from trash`, deleted: result.deleted });
  } catch (error) {
    attachError(req, error, { operation: 'files_empty_trash' });
    res.status(500).json({
      error: 'Failed to empty trash',
      code: 'EMPTY_TRASH_ERROR',
    });
  }
});

// =============================================================================
// SHARING ROUTES
// =============================================================================
// These endpoints handle file sharing with other users or public links.
// Users can share files with specific people or create public share links.
// Shares can be password-protected or time-limited.

/**
 * GET /files/:id/share
 * Get all share links for a file
 *
 * WHAT IT RETURNS:
 * List of all shares (public links) created for this file.
 * Shows:
 * - Share token (unique identifier)
 * - Share type (public, private, limited)
 * - Password protection (yes/no, password itself never returned)
 * - Expiration date (if set)
 * - Access count (how many times downloaded)
 * - Maximum access count (if limit set)
 *
 * EXAMPLE RESPONSE:
 * {
 *   "shares": [
 *     {
 *       "id": "507f1f77bcf86cd799439011",
 *       "token": "share_abc123def456",
 *       "type": "public",
 *       "hasPassword": true,
 *       "expiresAt": "2026-02-21T10:30:00Z",
 *       "accessCount": 15,
 *       "maxAccessCount": 50,
 *       "createdAt": "2026-01-21T10:30:00Z"
 *     }
 *   ]
 * }
 *
 * @param id - File ID
 * @returns {Object} Array of share objects
 */
router.get('/:id/share', requireAuth, validateId(), async (req, res) => {
  try {
    // STEP 1: Fetch all shares for this file
    // Service gets all share links created by user for this file
    const shares = await shareService.getFileShares(req.params.id, req.user._id);

    // STEP 2: Return shares list
    res.json({ shares });
  } catch (error) {
    attachError(req, error, { operation: 'file_get_shares', fileId: req.params.id });
    res.status(error.message === 'File not found' ? 404 : 500).json({
      error: error.message || 'Failed to get shares',
      code: 'GET_SHARES_ERROR',
    });
  }
});

/**
 * POST /files/:id/share
 * Create a new share link for a file
 *
 * WHAT IT DOES:
 * Generates a unique shareable link for the file that others can access.
 * Can customize: password protection, expiration, access limits.
 *
 * SHARE TYPES:
 * - PUBLIC: Anyone with link can access (no restrictions)
 * - PASSWORD: Need password to access
 * - LIMITED: Can only be accessed X times before expiring
 * - TIME_LIMITED: Expires after X hours/days
 *
 * PERMISSIONS:
 * - DOWNLOAD: Recipient can download the file
 * - VIEW: Recipient can view but not download
 * - PREVIEW: Can view preview only (no download)
 *
 * EXAMPLE REQUEST:
 * POST /files/507f1f77bcf86cd799439011/share
 * {
 *   "shareType": "public",
 *   "password": "mySecretPassword",
 *   "expiresIn": 7,  // 7 days from now
 *   "permissions": ["download"],
 *   "maxAccessCount": 50  // Can be downloaded max 50 times
 * }
 *
 * EXAMPLE RESPONSE:
 * {
 *   "share": {
 *     "id": "507f1f77bcf86cd799439011",
 *     "token": "share_abc123def456",
 *     "url": "https://mybrain.com/share/share_abc123def456",
 *     ...
 *   },
 *   "shareToken": "share_abc123def456"  // Full token to create URL
 * }
 *
 * @param id - File ID to share
 * @body {string} shareType - Type of share (public, password, limited, time-limited)
 * @body {string} password - Optional password for access
 * @body {number} expiresIn - Optional: expire in X days
 * @body {string[]} permissions - Permissions (download, view, preview)
 * @body {number} maxAccessCount - Optional: max downloads allowed
 * @returns {Object} Created share with token and URL
 */
router.post('/:id/share', requireAuth, requireFeature('filesEnabled'), validateId(), async (req, res) => {
  try {
    // STEP 1: Check if user can create more shares
    // Premium users might have limit on number of active shares
    const limitCheck = await limitService.canCreateShare(req.user);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: limitCheck.message,
        code: 'SHARE_LIMIT_EXCEEDED',
      });
    }

    // STEP 2: Extract share configuration from request
    // These customize how the share link works
    const { shareType, expiresIn, password, permissions, maxAccessCount } = req.body;

    // STEP 3: Create share link in database
    // Service:
    // - Generates unique token for the share
    // - Hashes password if provided (never stores plain passwords)
    // - Sets up permissions
    // - Creates database record for tracking
    const share = await shareService.createShare(req.params.id, req.user._id, {
      shareType,
      expiresIn,
      password,
      permissions,
      maxAccessCount,
    });

    // STEP 4: Log share creation
    attachEntityId(req, 'fileId', req.params.id);
    req.eventName = 'file.share.success';

    // STEP 5: Return new share with token
    // toPublicJSON() returns share info safe to show user (no secrets)
    // shareToken is the full unique identifier for the share URL
    res.status(201).json({ share: share.toPublicJSON(), shareToken: share.shareToken });
  } catch (error) {
    attachError(req, error, { operation: 'file_create_share', fileId: req.params.id });
    res.status(error.message === 'File not found' ? 404 : 500).json({
      error: error.message || 'Failed to create share',
      code: 'CREATE_SHARE_ERROR',
    });
  }
});

/**
 * DELETE /files/:id/share
 * Revoke ALL share links for a file
 *
 * WARNING: This disables ALL shares for the file.
 * All previously shared links stop working immediately.
 * Cannot be undone - must create new shares if needed.
 *
 * USE CASES:
 * - Sharing was accidentally enabled
 * - File contains sensitive data that shouldn't be shared
 * - User wants to revoke sharing entirely
 *
 * @param id - File ID to stop sharing
 * @returns {Object} Result with count of revoked shares
 */
router.delete('/:id/share', requireAuth, validateId(), async (req, res) => {
  try {
    // STEP 1: Revoke all share links for this file
    // Service:
    // - Marks all shares as revoked
    // - Disables all previously generated share URLs
    // - Prevents access from any shared links
    // - Returns count of revoked shares
    const count = await shareService.revokeFileShares(req.params.id, req.user._id);

    // STEP 2: Log share revocation
    attachEntityId(req, 'fileId', req.params.id);
    req.eventName = 'file.unshare.success';

    // STEP 3: Return result
    res.json({ message: `Revoked ${count} share links`, revoked: count });
  } catch (error) {
    attachError(req, error, { operation: 'file_revoke_shares', fileId: req.params.id });
    res.status(error.message === 'File not found' ? 404 : 500).json({
      error: error.message || 'Failed to revoke shares',
      code: 'REVOKE_SHARES_ERROR',
    });
  }
});

// =============================================================================
// ENTITY LINKING ROUTES
// =============================================================================
// These endpoints connect files to other entities (notes, projects, tasks).
// Allows attaching supporting documents to tasks, linking references to notes, etc.
// Creates cross-entity relationships for richer context.

/**
 * POST /files/:id/link
 * Link a file to an entity (note, project, or task)
 *
 * WHAT IT DOES:
 * Associates a file with another entity in the system.
 * Creates a relationship: "This file is attached to this task/note/project"
 *
 * USE CASES:
 * - Link budget spreadsheet to finance project
 * - Link reference document to research task
 * - Attach screenshots to bug report note
 * - Link contract file to project deliverables
 *
 * ENTITIES:
 * - note: Attach file to a note (reference material)
 * - task: Attach file to a task (deliverable, resource)
 * - project: Attach file to a project (project document)
 *
 * EXAMPLE REQUEST:
 * POST /files/507f1f77bcf86cd799439011/link
 * {
 *   "entityType": "task",
 *   "entityId": "507f1f77bcf86cd799439012"
 * }
 *
 * @param id - File ID to link
 * @body {string} entityType - Target entity type (note, project, task)
 * @body {string} entityId - Target entity ID
 * @returns {Object} Updated file with link information
 */
router.post('/:id/link', requireAuth, validateId(), async (req, res) => {
  try {
    // STEP 1: Extract entity information from request
    const { entityId, entityType } = req.body;

    // STEP 2: Validate both entityId and entityType are provided
    if (!entityId || !entityType) {
      return res.status(400).json({
        error: 'entityId and entityType are required',
        code: 'INVALID_PARAMS',
      });
    }

    // STEP 3: Validate entityType is one of the allowed types
    // Only notes, projects, and tasks can have files attached
    if (!['note', 'project', 'task'].includes(entityType)) {
      return res.status(400).json({
        error: 'entityType must be note, project, or task',
        code: 'INVALID_ENTITY_TYPE',
      });
    }

    // STEP 4: Create link between file and entity
    // Service:
    // - Verifies file exists and user owns it
    // - Verifies entity exists and user owns it
    // - Creates link record in database
    // - Prevents duplicate links (idempotent)
    const file = await fileService.linkFileToEntity(
      req.params.id,
      entityId,
      entityType,
      req.user._id
    );

    // STEP 5: If file not found, return 404
    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }

    // STEP 6: Log the link creation
    attachEntityId(req, 'fileId', file._id);
    req.eventName = 'file.link.success';

    // STEP 7: Return updated file with link info
    res.json({ file });
  } catch (error) {
    attachError(req, error, { operation: 'file_link', fileId: req.params.id });
    res.status(500).json({
      error: error.message || 'Failed to link file',
      code: 'LINK_FILE_ERROR',
    });
  }
});

/**
 * DELETE /files/:id/link
 * Unlink a file from an entity
 *
 * WHAT IT DOES:
 * Removes the association between a file and an entity.
 * File still exists but is no longer connected to that entity.
 *
 * @param id - File ID to unlink
 * @body {string} entityType - Entity type (note, project, task)
 * @body {string} entityId - Entity ID
 * @returns {Object} Updated file with link removed
 */
router.delete('/:id/link', requireAuth, validateId(), async (req, res) => {
  try {
    // STEP 1: Extract entity information
    const { entityId, entityType } = req.body;

    // STEP 2: Validate both parameters provided
    if (!entityId || !entityType) {
      return res.status(400).json({
        error: 'entityId and entityType are required',
        code: 'INVALID_PARAMS',
      });
    }

    // STEP 3: Remove link between file and entity
    // Service:
    // - Deletes the link record from database
    // - File remains, entity remains, just the connection is removed
    // - Idempotent: unlinking a non-linked file succeeds silently
    const file = await fileService.unlinkFileFromEntity(
      req.params.id,
      entityId,
      entityType,
      req.user._id
    );

    // STEP 4: If file not found, return 404
    if (!file) {
      return res.status(404).json({
        error: 'File not found',
        code: 'FILE_NOT_FOUND',
      });
    }

    // STEP 5: Log the unlink
    attachEntityId(req, 'fileId', file._id);
    req.eventName = 'file.unlink.success';

    // STEP 6: Return updated file
    res.json({ file });
  } catch (error) {
    attachError(req, error, { operation: 'file_unlink', fileId: req.params.id });
    res.status(500).json({
      error: error.message || 'Failed to unlink file',
      code: 'UNLINK_FILE_ERROR',
    });
  }
});

/**
 * GET /files/entity/:entityType/:entityId
 * Get all files linked to an entity
 *
 * WHAT IT DOES:
 * Returns all files attached to a specific note, project, or task.
 * Useful for displaying "Attached Files" section in entity details.
 *
 * EXAMPLE REQUEST:
 * GET /files/entity/task/507f1f77bcf86cd799439012
 *
 * EXAMPLE RESPONSE:
 * {
 *   "files": [
 *     {
 *       "id": "507f1f77bcf86cd799439011",
 *       "name": "Report.pdf",
 *       "size": 524288,
 *       "type": "document",
 *       "createdAt": "2026-01-15T10:30:00Z"
 *     }
 *   ]
 * }
 *
 * @param entityType - Entity type (note, project, task)
 * @param entityId - Entity ID
 * @returns {Object} Array of file objects linked to entity
 */
router.get('/entity/:entityType/:entityId', requireAuth, async (req, res) => {
  try {
    // STEP 1: Extract entity parameters
    const { entityType, entityId } = req.params;

    // STEP 2: Validate entityType is one of the allowed types
    if (!['note', 'project', 'task'].includes(entityType)) {
      return res.status(400).json({
        error: 'entityType must be note, project, or task',
        code: 'INVALID_ENTITY_TYPE',
      });
    }

    // STEP 3: Validate entityId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(entityId)) {
      return res.status(400).json({
        error: 'Invalid entityId',
        code: 'INVALID_ID',
      });
    }

    // STEP 4: Fetch all files linked to this entity
    // Service queries all file-entity links for this entity
    // Returns file objects for files user owns
    const files = await fileService.getFilesForEntity(entityId, entityType, req.user._id);

    // STEP 5: Return files
    res.json({ files });
  } catch (error) {
    attachError(req, error, { operation: 'files_for_entity' });
    res.status(500).json({
      error: error.message || 'Failed to get files',
      code: 'GET_ENTITY_FILES_ERROR',
    });
  }
});

// =============================================================================
// EXPORT ROUTER
// =============================================================================
// This router is imported in server.js and mounted on the /files prefix.
// All routes are prepended with /files when mounted.

export default router;
