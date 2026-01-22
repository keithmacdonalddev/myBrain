/**
 * =============================================================================
 * IMAGES.JS - Image Upload & Gallery Routes
 * =============================================================================
 *
 * This file handles image uploads, storage, and gallery management in myBrain.
 * Users can upload photos, screenshots, and other images to create a personal
 * image library.
 *
 * WHAT ARE IMAGES IN MYBRAIN?
 * ---------------------------
 * Images are visual files that users upload for storage and organization.
 * Examples:
 * - Screenshots and screenshots
 * - Photos and artwork
 * - Diagrams and mockups
 * - Inspiration images
 * - Personal photos
 *
 * SUPPORTED IMAGE FORMATS:
 * ------------------------
 * - JPEG (.jpg, .jpeg)
 * - PNG (.png) - supports transparency
 * - GIF (.gif)
 * - WebP (.webp) - modern format
 * - SVG (.svg) - vector graphics
 *
 * IMAGE PROCESSING:
 * ------------------
 * When you upload an image:
 * 1. FILE STORED: Uploaded to AWS S3 cloud storage
 * 2. THUMBNAIL CREATED: Small version generated for galleries
 * 3. METADATA SAVED: Size, dimensions, format recorded
 * 4. OPTIMIZATION: Large images automatically compressed
 *
 * IMAGE ORGANIZATION:
 * --------------------
 * - Gallery view: See all images as thumbnails
 * - Collections: Organize images into custom groups
 * - Tags: Add searchable tags to images
 * - Favorites: Mark important images
 * - Search: Find images by name, tag, or date
 *
 * STORAGE & LIMITS:
 * ------------------
 * Free users: 500 MB image storage
 * Premium users: 10 GB image storage
 * Max file size: 20 MB per image
 * Auto-compression: Images over 10 MB auto-compressed
 *
 * ENDPOINTS:
 * -----------
 * - POST /images - Upload new image
 * - GET /images - List user's images with filters
 * - GET /images/:id - Get image details and download link
 * - PUT /images/:id - Update metadata (name, tags, favorite)
 * - DELETE /images/:id - Delete image
 * - POST /images/:id/favorite - Mark as favorite
 * - POST /images/:id/unfavorite - Unmark as favorite
 * - GET /images/folder/:id - Get images in specific folder
 * - POST /images/batch-delete - Delete multiple images
 *
 * =============================================================================
 */

/**
 * Express is the web framework that handles HTTP requests and routing.
 * We use it to define API endpoints (URLs that the frontend can call).
 */
import express from 'express';

/**
 * Mongoose helps us work with MongoDB and validate ObjectIds.
 * We use it to check if image IDs are valid MongoDB ObjectIds.
 */
import mongoose from 'mongoose';

/**
 * requireAuth is middleware that checks if a user is logged in.
 * We use it to protect all image routes - only authenticated users can upload/view images.
 */
import { requireAuth } from '../middleware/auth.js';

/**
 * attachError is a helper for logging errors to our audit trail.
 * When an image operation fails, we log what went wrong for debugging.
 */
import { attachError } from '../middleware/errorHandler.js';

/**
 * attachEntityId is a logging helper that records which images are being modified.
 * This creates an audit trail: "User X modified Image Y at time Z"
 * Useful for security audits and understanding user behavior.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

/**
 * requireStorageLimit is middleware that enforces image storage quotas.
 * Checks if user has storage space remaining before allowing upload.
 * Different tiers have different limits (free: 500MB, premium: 10GB).
 */
import { requireStorageLimit } from '../middleware/limitEnforcement.js';

/**
 * requireFeature is middleware that checks if a feature is enabled for the user.
 * We use it to prevent image uploads if the user's account doesn't have the image feature.
 * This allows enabling/disabling features per user tier.
 */
import { requireFeature } from '../middleware/featureGate.js';

/**
 * uploadSingle and handleUploadError are middleware for handling image uploads.
 * - uploadSingle: Receives the image from the browser and temporarily stores it
 * - handleUploadError: Catches upload errors (file too large, invalid format, etc.)
 */
import { uploadSingle, handleUploadError } from '../middleware/upload.js';

/**
 * imageService contains the business logic for image operations:
 * - Uploading and storing images
 * - Generating thumbnails and optimizing images
 * - Retrieving images with filtering and searching
 * - Managing image metadata (tags, titles, descriptions)
 * - Deleting images from S3 and database
 */
import * as imageService from '../services/imageService.js';

/**
 * limitService enforces user limits on image storage:
 * - Check if user has storage space available before upload
 * - Enforce image count limits per tier
 * - Track total image storage used
 * - Calculate remaining storage for user
 */
import limitService from '../services/limitService.js';

// =============================================================================
// ROUTER SETUP
// =============================================================================
// Create an Express router to group all image management routes together.
// This router will be mounted on the main server under /images prefix.

const router = express.Router();

// =============================================================================
// IMAGE LISTING & SEARCH ROUTES
// =============================================================================
// These endpoints allow users to browse, search, and filter their image gallery.
// Images can be filtered by folder, tags, favorites, and searched by name.
// Results are paginated for performance (typically 20 images per page).

/**
 * GET /images
 * List user's images with filtering and sorting
 *
 * This endpoint is the main way users browse their image gallery.
 * It supports filtering by collection/folder, tags, and favorite status.
 * Results are paginated and sorted by newest first by default.
 *
 * FILTERING OPTIONS:
 * - folder: Filter images in a specific collection/folder
 * - favorite: Show only starred images
 * - tags: Filter by one or more tags
 * - sort: Sort order (createdAt, updatedAt, name, -createdAt)
 * - page: Pagination page number (default 1)
 * - limit: Images per page (default 20, max 50)
 *
 * EXAMPLE REQUEST:
 * GET /images?folder=screenshots&favorite=true&page=1&limit=15
 *
 * EXAMPLE RESPONSE:
 * {
 *   "images": [
 *     {
 *       "id": "507f1f77bcf86cd799439011",
 *       "url": "https://s3.amazonaws.com/mybrain/images/...",
 *       "thumbnailUrl": "https://s3.amazonaws.com/mybrain/thumbs/...",
 *       "title": "My Screenshot",
 *       "dimensions": { "width": 1920, "height": 1080 },
 *       "size": 262144,  // bytes
 *       "favorite": true,
 *       "tags": ["documentation", "ui"],
 *       "createdAt": "2026-01-21T10:30:00Z"
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
 * @query {string} folder - Filter to images in this collection
 * @query {boolean} favorite - Show only favorites
 * @query {string[]} tags - Filter by tags
 * @query {string} sort - Sort field (default: -createdAt)
 * @query {number} page - Page number
 * @query {number} limit - Images per page
 * @returns {Object} Images array and pagination info
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    // STEP 1: Extract filter and pagination parameters from query string
    // Example: /images?folder=screenshots&favorite=true&page=2&limit=15
    const { folder, page = 1, limit = 20, sort = '-createdAt', favorite, tags } = req.query;

    // STEP 2: Call service to fetch images with filters
    // The service handles:
    // - Building MongoDB query with all filters
    // - Paginating results
    // - Sorting
    // - Counting total images for pagination info
    const result = await imageService.getImages(req.user._id, {
      folder,                              // Collection/folder filter
      page: parseInt(page, 10),            // Convert to number
      limit: parseInt(limit, 10),          // Convert to number
      sort,                                // Sort order
      favorite,                            // Favorite filter
      tags,                                // Tag filters
    });

    // STEP 3: Return results to frontend
    // Frontend displays images as grid and shows pagination
    res.json(result);
  } catch (error) {
    attachError(req, error, { operation: 'images_fetch' });
    res.status(500).json({
      error: 'Failed to get images',
      code: 'GET_IMAGES_ERROR',
    });
  }
});

/**
 * GET /images/search
 * Search images by text query
 *
 * This endpoint provides full-text search across image titles and descriptions.
 * Users can find images by keywords with optional filtering.
 *
 * EXAMPLE REQUEST:
 * GET /images/search?q=screenshot&folder=docs&limit=30
 *
 * EXAMPLE RESPONSE:
 * {
 *   "images": [
 *     {
 *       "id": "507f1f77bcf86cd799439011",
 *       "url": "https://s3.amazonaws.com/mybrain/images/...",
 *       "title": "UI Screenshot",
 *       "tags": ["ui", "design"],
 *       "size": 262144
 *     }
 *   ],
 *   "total": 3,
 *   "limit": 30,
 *   "skip": 0
 * }
 *
 * @query {string} q - Search text (title, description, required)
 * @query {string} folder - Optional folder/collection filter
 * @query {string} tags - Optional comma-separated tags
 * @query {boolean} favorite - Optional favorite filter (true/false)
 * @query {string} sort - Sort order (default: -createdAt)
 * @query {number} limit - Results per page (default: 50)
 * @query {number} skip - Pagination offset (default: 0)
 * @returns {Object} Search results with images array and pagination
 * @throws {401} - User not authenticated
 * @throws {500} - Server error searching images
 */
router.get('/search', requireAuth, async (req, res) => {
  try {
    // STEP 1: Extract search and filter parameters
    const { q, folder, tags, favorite, sort = '-createdAt', limit = 50, skip = 0 } = req.query;

    // STEP 2: Parse tags parameter into array
    // Tags can come as comma-separated string or array
    const tagArray = tags ? (Array.isArray(tags) ? tags : tags.split(',')) : [];

    // STEP 3: Call service to search images with filters
    // Service performs full-text search on titles/descriptions
    const result = await imageService.searchImages(req.user._id, {
      q,                                    // Search query
      folder,                               // Collection filter
      tags: tagArray,                       // Tag array
      // Convert string 'true'/'false' to boolean
      favorite: favorite === 'true' ? true : favorite === 'false' ? false : null,
      sort,                                 // Sort order
      limit: parseInt(limit, 10),           // Results per page
      skip: parseInt(skip, 10),             // Pagination offset
    });

    // STEP 4: Return search results
    res.json(result);
  } catch (error) {
    attachError(req, error, { operation: 'images_search' });
    res.status(500).json({
      error: 'Failed to search images',
      code: 'SEARCH_IMAGES_ERROR',
    });
  }
});

/**
 * GET /images/tags
 * Get all unique tags used on user's images
 *
 * Returns a list of every tag the user has applied to images.
 * Used for tag filter dropdown in gallery.
 * Includes count of how many images use each tag.
 *
 * EXAMPLE REQUEST:
 * GET /images/tags
 *
 * EXAMPLE RESPONSE:
 * {
 *   "tags": [
 *     { "name": "documentation", "count": 12 },
 *     { "name": "inspiration", "count": 8 },
 *     { "name": "archive", "count": 3 }
 *   ]
 * }
 *
 * @returns {Object} Array of tag objects with name and count
 * @throws {401} - User not authenticated
 * @throws {500} - Server error fetching tags
 */
router.get('/tags', requireAuth, async (req, res) => {
  try {
    // STEP 1: Fetch all unique tags for this user's images
    // Service does MongoDB aggregation to get distinct tags and their counts
    const tags = await imageService.getUserImageTags(req.user._id);

    // STEP 2: Return tags list to frontend
    // Frontend uses this to populate tag filter dropdown
    res.json({ tags });
  } catch (error) {
    attachError(req, error, { operation: 'images_tags' });
    res.status(500).json({
      error: 'Failed to get image tags',
      code: 'GET_TAGS_ERROR',
    });
  }
});

/**
 * GET /images/limits
 * Get user's image storage quota and current usage
 *
 * Returns detailed information about image storage:
 * - Number of images (count limit)
 * - Storage used (bytes)
 * - Limits for current tier
 * - Percentage of quota used
 * - Remaining space/images
 *
 * STORAGE TIERS:
 * - Free: 500 MB, max 100 images
 * - Premium: 10 GB, max 5000 images
 *
 * USE CASES:
 * - Display storage meter in UI
 * - Show warning when approaching limit
 * - Prompt upgrade when near capacity
 * - Display remaining storage
 *
 * EXAMPLE REQUEST:
 * GET /images/limits
 *
 * EXAMPLE RESPONSE:
 * {
 *   "images": {
 *     "current": 47,
 *     "max": 100,
 *     "percentage": 47,
 *     "remaining": 53
 *   },
 *   "storage": {
 *     "currentBytes": 262144000,
 *     "maxBytes": 524288000,
 *     "currentFormatted": "250 MB",
 *     "maxFormatted": "500 MB",
 *     "percentage": 50,
 *     "remainingBytes": 262144000
 *   }
 * }
 *
 * @returns {Object} Storage quota info with images count and storage bytes
 * @throws {401} - User not authenticated
 * @throws {500} - Server error fetching limits
 */
router.get('/limits', requireAuth, async (req, res) => {
  try {
    // STEP 1: Get user's limit status from service
    // Service looks up user's plan type and calculates usage/limits
    const limitStatus = await limitService.getUserLimitStatus(req.user);
    const { images, storage } = limitStatus.status;

    // STEP 2: Format response with both image count and storage size limits
    res.json({
      // Image count limits and usage
      images: {
        current: images.current,                    // Images currently owned
        max: images.max,                            // Max images allowed
        percentage: images.percentage,              // % of limit used
        remaining: images.max === -1 ? -1 : Math.max(0, images.max - images.current),  // Remaining slots
      },
      // Storage size limits and usage
      storage: {
        currentBytes: storage.currentBytes,         // Bytes used
        maxBytes: storage.maxBytes,                 // Bytes allowed
        currentFormatted: storage.currentFormatted, // "250 MB" format
        maxFormatted: storage.maxFormatted,         // "500 MB" format
        percentage: storage.percentage,             // % of limit used
        remainingBytes: storage.maxBytes === -1 ? -1 : Math.max(0, storage.maxBytes - storage.currentBytes),  // Bytes remaining
      },
    });
  } catch (error) {
    attachError(req, error, { operation: 'images_limits' });
    res.status(500).json({
      error: 'Failed to get image limits',
      code: 'GET_LIMITS_ERROR',
    });
  }
});

// =============================================================================
// IMAGE UPLOAD ROUTES
// =============================================================================
// These endpoints handle image uploads to cloud storage (AWS S3).
// Images are automatically optimized, thumbnails are generated, metadata saved.

/**
 * POST /images
 * Upload a new image
 *
 * This is the main image upload endpoint. It:
 * 1. Receives the image from the browser
 * 2. Checks storage quota
 * 3. Uploads to AWS S3
 * 4. Generates thumbnail
 * 5. Optimizes large images
 * 6. Saves metadata to database
 * 7. Returns image object with S3 URLs
 *
 * MIDDLEWARE CHAIN (processed in order):
 * 1. requireAuth - Verify user is logged in
 * 2. requireFeature - Check if user has image feature
 * 3. uploadSingle - Receive image from browser, store temporarily
 * 4. handleUploadError - Catch file receive errors
 * 5. requireStorageLimit - Verify user has storage space
 * 6. Route handler - Upload to S3, create thumbnail, save metadata
 *
 * SUPPORTED FORMATS:
 * - JPEG (.jpg, .jpeg) - compressed color photos
 * - PNG (.png) - lossless, supports transparency
 * - GIF (.gif) - animated or simple graphics
 * - WebP (.webp) - modern efficient format
 * - SVG (.svg) - vector graphics
 *
 * AUTO-OPTIMIZATION:
 * - Images over 10 MB automatically compressed
 * - JPEG: 80% quality (good balance)
 * - PNG: lossless (no quality loss)
 * - Thumbnail: 200x200px generated for gallery
 *
 * EXAMPLE REQUEST (multipart/form-data):
 * POST /images
 * - file: [binary image data]
 * - title: "Screenshot 2026-01-21"
 * - description: "UI mockup for dashboard"
 * - alt: "Dashboard design mockup"
 * - folder: "screenshots"
 * - tags: ["ui", "design"]  (JSON array)
 *
 * EXAMPLE RESPONSE:
 * {
 *   "image": {
 *     "id": "507f1f77bcf86cd799439011",
 *     "url": "https://s3.amazonaws.com/mybrain/images/507f1f77bcf86cd799439011.jpg",
 *     "thumbnailUrl": "https://s3.amazonaws.com/mybrain/thumbs/507f1f77bcf86cd799439011.jpg",
 *     "title": "Screenshot 2026-01-21",
 *     "dimensions": { "width": 1920, "height": 1080 },
 *     "size": 262144,  // bytes
 *     "folder": "screenshots",
 *     "tags": ["ui", "design"],
 *     "createdAt": "2026-01-21T10:30:00Z"
 *   }
 * }
 *
 * @body {File} file - Binary image data
 * @body {string} title - Display name for image (optional)
 * @body {string} description - Image description (optional)
 * @body {string} alt - Alt text for accessibility (optional)
 * @body {string} folder - Collection name (optional, default: "library")
 * @body {string} tags - JSON array of tags (optional)
 * @returns {Object} Created image object with S3 URLs
 */
router.post('/', requireAuth, requireFeature('imagesEnabled'), uploadSingle, handleUploadError, requireStorageLimit, async (req, res) => {
  try {
    // STEP 1: Verify image was uploaded
    // If no file in req.file, something went wrong in upload middleware
    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided',
        code: 'NO_FILE',
      });
    }

    // STEP 2: Extract metadata from request body
    // alt = accessibility text
    // tags = for organization/search
    // folder = collection name
    const { alt, tags, folder, title, description } = req.body;

    // Parse tags from JSON string to array
    // Frontend sends tags as JSON array string because form data doesn't support arrays
    const parsedTags = tags ? JSON.parse(tags) : [];

    // STEP 3: Upload image to S3 and save metadata to database
    // uploadImage service handles:
    // - Moving image from temp storage to S3
    // - Creating thumbnail for gallery view
    // - Optimizing large images (auto-compress)
    // - Creating Image document in MongoDB
    // - Setting up S3 permissions
    // - Generating download URLs
    const image = await imageService.uploadImage(req.file, req.user._id, {
      folder: folder || 'library',        // Default to "library" collection
      alt: alt || '',                     // Alt text for accessibility
      tags: parsedTags,                   // Array of tag strings
      title: title || '',                 // Display title
      description: description || '',     // Description
    });

    // STEP 4: Log the image upload for audit trail
    // This creates an entry in the Wide Events log
    attachEntityId(req, 'imageId', image._id);  // Which image was uploaded
    req.eventName = 'image.upload.success';     // What action was performed

    // STEP 5: Return success response
    // Status 201 = Created (standard for POST that creates a resource)
    res.status(201).json({ image });
  } catch (error) {
    // Error occurred during upload
    attachError(req, error, { operation: 'image_upload' });
    res.status(500).json({
      error: 'Failed to upload image',
      code: 'UPLOAD_ERROR',
    });
  }
});

// =============================================================================
// IMAGE BULK OPERATIONS
// =============================================================================
// These endpoints perform operations on multiple images at once.
// Useful for batch actions: delete many images selected by user.
// Each operation validates ownership - can't modify other users' images.

/**
 * POST /images/bulk-delete
 * Permanently delete multiple images at once
 *
 * WHAT IT DOES:
 * Takes an array of image IDs and permanently deletes all.
 * Equivalent to user selecting 10 images and clicking "Delete".
 *
 * WHY IT'S USEFUL:
 * - Instead of deleting images one by one, delete all at once
 * - Batch operations are faster than multiple API calls
 * - Better UX: select multiple, delete together
 *
 * DELETION:
 * - Immediately removed from S3 (freeing storage)
 * - Deleted from database
 * - Permanent - cannot be recovered
 *
 * VALIDATION:
 * - Verifies all image IDs are valid ObjectIds
 * - Checks user owns all images (prevents deleting other users' images)
 *
 * EXAMPLE REQUEST:
 * POST /images/bulk-delete
 * {
 *   "ids": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
 * }
 *
 * EXAMPLE RESPONSE:
 * { "message": "Deleted 3 images", "deleted": 3 }
 *
 * @body {string[]} ids - Array of image IDs to delete (required, min 1)
 * @returns {Object} Result with count of deleted images
 * @throws {400} - Invalid IDs array or invalid image ID format
 * @throws {401} - User not authenticated
 * @throws {500} - Server error deleting images
 */
router.post('/bulk-delete', requireAuth, async (req, res) => {
  try {
    // STEP 1: Extract image IDs array
    const { ids } = req.body;

    // STEP 2: Validate IDs array is provided and not empty
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        error: 'Image IDs array is required',
        code: 'INVALID_IDS',
      });
    }

    // STEP 3: Validate each ID is a valid MongoDB ObjectId
    // Prevents sending malformed IDs to database
    for (const id of ids) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: `Invalid image ID: ${id}`,
          code: 'INVALID_ID',
        });
      }
    }

    // STEP 4: Delete all images
    // Service handles:
    // - Checking user owns all images
    // - Removing all from S3 (frees storage)
    // - Deleting all from database
    // - Returning count of successfully deleted
    const result = await imageService.deleteImages(ids, req.user._id);

    // STEP 5: Log bulk deletion
    req.eventName = 'image.bulk_delete.success';

    // STEP 6: Return result with count of deleted images
    res.json({
      message: `Deleted ${result.deleted} images`,
      deleted: result.deleted,
    });
  } catch (error) {
    attachError(req, error, { operation: 'images_bulk_delete' });
    res.status(500).json({
      error: 'Failed to delete images',
      code: 'BULK_DELETE_ERROR',
    });
  }
});

// =============================================================================
// SINGLE IMAGE ROUTES
// =============================================================================
// These endpoints operate on individual images: retrieving, updating, deleting.
// All endpoints include ownership checks to prevent accessing other users' images.

/**
 * GET /images/:id
 * Get a single image's metadata
 *
 * Retrieves complete information about a specific image:
 * - Image URLs (full size and thumbnail)
 * - Dimensions and file size
 * - Metadata (title, description, alt text)
 * - Tags and favorite status
 * - Upload date
 *
 * SECURITY: Only returns image if current user owns it (ownership check in service).
 *
 * EXAMPLE REQUEST:
 * GET /images/507f1f77bcf86cd799439011
 *
 * EXAMPLE RESPONSE:
 * {
 *   "image": {
 *     "id": "507f1f77bcf86cd799439011",
 *     "url": "https://s3.amazonaws.com/mybrain/images/507f1f77bcf86cd799439011.jpg",
 *     "thumbnailUrl": "https://s3.amazonaws.com/mybrain/thumbs/507f1f77bcf86cd799439011.jpg",
 *     "title": "My Screenshot",
 *     "description": "Dashboard design",
 *     "alt": "Dashboard UI mockup",
 *     "dimensions": { "width": 1920, "height": 1080 },
 *     "size": 262144,  // bytes
 *     "folder": "screenshots",
 *     "tags": ["ui", "design"],
 *     "favorite": true,
 *     "sourceUrl": null,
 *     "createdAt": "2026-01-21T10:30:00Z"
 *   }
 * }
 *
 * @param id - Image ID (MongoDB ObjectId)
 * @returns {Object} Image metadata object
 * @throws 404 if image not found or user doesn't own it
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    // STEP 1: Validate image ID format
    // Returns 400 if ID is not valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: 'Invalid image ID',
        code: 'INVALID_ID',
      });
    }

    // STEP 2: Fetch image from database
    // Service includes ownership check - won't return if user doesn't own image
    const image = await imageService.getImage(req.params.id, req.user._id);

    // STEP 3: If image not found or not owned by user, return 404
    if (!image) {
      return res.status(404).json({
        error: 'Image not found',
        code: 'IMAGE_NOT_FOUND',
      });
    }

    // STEP 4: Return image metadata
    res.json({ image });
  } catch (error) {
    attachError(req, error, { operation: 'image_fetch', imageId: req.params.id });
    res.status(500).json({
      error: 'Failed to get image',
      code: 'GET_IMAGE_ERROR',
    });
  }
});

/**
 * PATCH /images/:id
 * Update image metadata (name, description, tags, etc.)
 *
 * IMPORTANT: This updates METADATA only, not the image content itself.
 * To update the image file, upload a new image.
 *
 * UPDATABLE FIELDS:
 * - title: Display name for the image
 * - description: User-written description
 * - alt: Alt text for accessibility
 * - tags: Array of tags for organization
 * - favorite: Boolean flag for starring
 * - sourceUrl: Original URL if image was clipped from web
 *
 * EXAMPLE REQUEST:
 * PATCH /images/507f1f77bcf86cd799439011
 * {
 *   "title": "Dashboard UI Final",
 *   "description": "Final mockup approved by team",
 *   "tags": ["ui", "final", "approved"],
 *   "favorite": true
 * }
 *
 * @param id - Image ID
 * @body {string} title - New title
 * @body {string} description - New description
 * @body {string} alt - New alt text
 * @body {string[]} tags - New tags array
 * @body {boolean} favorite - New favorite status
 * @body {string} sourceUrl - Original URL
 * @returns {Object} Updated image object
 */
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    // STEP 1: Validate image ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: 'Invalid image ID',
        code: 'INVALID_ID',
      });
    }

    // STEP 2: Extract metadata to update from request body
    // Only these fields can be updated - not image content
    const { title, description, alt, tags, favorite, sourceUrl } = req.body;

    // STEP 3: Update image metadata in database
    // Service performs ownership check - won't update if user doesn't own image
    const image = await imageService.updateImage(req.params.id, req.user._id, {
      title,
      description,
      alt,
      tags,
      favorite,
      sourceUrl,
    });

    // STEP 4: If image not found, return 404
    if (!image) {
      return res.status(404).json({
        error: 'Image not found',
        code: 'IMAGE_NOT_FOUND',
      });
    }

    // STEP 5: Log the update for audit trail
    attachEntityId(req, 'imageId', image._id);
    req.eventName = 'image.update.success';

    // STEP 6: Return updated image
    res.json({ image });
  } catch (error) {
    attachError(req, error, { operation: 'image_update', imageId: req.params.id });
    res.status(500).json({
      error: 'Failed to update image',
      code: 'UPDATE_IMAGE_ERROR',
    });
  }
});

/**
 * POST /images/:id/favorite
 * Toggle image favorite status (star/unstar)
 *
 * WHAT IT DOES:
 * When called, toggles the favorite flag:
 * - If favorite=false → Sets to true (star the image)
 * - If favorite=true → Sets to false (unstar the image)
 *
 * WHY IT MATTERS:
 * - Users can star important images for quick access
 * - Starred images show in favorites view
 * - Helps users organize without creating folders
 *
 * EXAMPLE REQUEST:
 * POST /images/507f1f77bcf86cd799439011/favorite
 *
 * EXAMPLE RESPONSE:
 * {
 *   "image": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "title": "My Screenshot",
 *     "favorite": true
 *   },
 *   "favorite": true
 * }
 *
 * @param {string} id - Image ID (MongoDB ObjectId)
 * @returns {Object} Updated image with new favorite status
 * @throws {404} - Image not found or doesn't belong to user
 * @throws {401} - User not authenticated
 * @throws {500} - Server error toggling favorite
 */
router.post('/:id/favorite', requireAuth, async (req, res) => {
  try {
    // STEP 1: Validate image ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: 'Invalid image ID',
        code: 'INVALID_ID',
      });
    }

    // STEP 2: Toggle favorite status for the image
    // Service flips the boolean: true→false or false→true
    const image = await imageService.toggleFavorite(req.params.id, req.user._id);

    // STEP 3: If image not found, return 404
    if (!image) {
      return res.status(404).json({
        error: 'Image not found',
        code: 'IMAGE_NOT_FOUND',
      });
    }

    // STEP 4: Log the action
    attachEntityId(req, 'imageId', image._id);
    req.eventName = 'image.favorite.success';

    // STEP 5: Return updated image with new favorite status
    res.json({ image, favorite: image.favorite });
  } catch (error) {
    attachError(req, error, { operation: 'image_toggle_favorite', imageId: req.params.id });
    res.status(500).json({
      error: 'Failed to toggle favorite',
      code: 'TOGGLE_FAVORITE_ERROR',
    });
  }
});

/**
 * GET /images/:id/download
 * Get a signed download URL for an image
 *
 * WHAT IT DOES:
 * Generates a time-limited S3 download URL for the image.
 * The URL is valid for 24 hours and includes security token.
 * Frontend then redirects browser to this URL to download the image.
 *
 * WHY NOT DIRECT S3 DOWNLOAD:
 * - S3 URLs are exposed in browser (user sees the bucket name/structure)
 * - We want to log downloads for audit trail
 * - We can enforce access controls (ownership)
 * - We can track download statistics
 *
 * SECURITY:
 * - Returns 404 if user doesn't own the image
 * - URL is time-limited (expires after 24 hours)
 * - URL includes security token signed by AWS
 *
 * EXAMPLE REQUEST:
 * GET /images/507f1f77bcf86cd799439011/download
 *
 * EXAMPLE RESPONSE:
 * {
 *   "downloadUrl": "https://mybrain.s3.amazonaws.com/images/...?signature=...",
 *   "filename": "Dashboard Screenshot.jpg",
 *   "expires": "2026-01-22T10:30:00Z"
 * }
 *
 * @param {string} id - Image ID (MongoDB ObjectId)
 * @returns {Object} Download URL info with filename and expiration
 * @throws {404} - Image not found or doesn't belong to user
 * @throws {401} - User not authenticated
 * @throws {500} - Server error generating download URL
 */
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    // STEP 1: Validate image ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: 'Invalid image ID',
        code: 'INVALID_ID',
      });
    }

    // STEP 2: Get signed download URL from S3
    // Service:
    // - Checks if user owns the image
    // - Generates time-limited S3 URL (valid 24 hours)
    // - Includes AWS signature for security
    const result = await imageService.getDownloadUrl(req.params.id, req.user._id);

    // STEP 3: If image not found or not owned, return 404
    if (!result) {
      return res.status(404).json({
        error: 'Image not found',
        code: 'IMAGE_NOT_FOUND',
      });
    }

    // STEP 4: Return download URL to frontend
    // Frontend will redirect browser to this URL
    res.json(result);
  } catch (error) {
    attachError(req, error, { operation: 'image_download', imageId: req.params.id });
    res.status(500).json({
      error: 'Failed to get download URL',
      code: 'DOWNLOAD_ERROR',
    });
  }
});

/**
 * DELETE /images/:id
 * Permanently delete an image
 *
 * WARNING: This is PERMANENT and CANNOT BE UNDONE.
 * Image is immediately removed from S3 and database.
 * No recovery possible after this.
 *
 * DELETION PROCESS:
 * 1. Remove image file from S3 (frees storage)
 * 2. Remove thumbnail from S3
 * 3. Delete Image document from MongoDB
 * 4. Log deletion for audit trail
 *
 * STORAGE:
 * Storage space immediately freed from user's quota.
 *
 * EXAMPLE REQUEST:
 * DELETE /images/507f1f77bcf86cd799439011
 *
 * EXAMPLE RESPONSE:
 * { "message": "Image deleted successfully" }
 *
 * @param {string} id - Image ID (MongoDB ObjectId)
 * @returns {Object} Success message
 * @throws {404} - Image not found or doesn't belong to user
 * @throws {401} - User not authenticated
 * @throws {500} - Server error deleting image
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // STEP 1: Validate image ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: 'Invalid image ID',
        code: 'INVALID_ID',
      });
    }

    // STEP 2: Permanently delete image
    // Service:
    // - Removes image from S3 (freeing storage)
    // - Removes thumbnail from S3
    // - Deletes Image document from MongoDB
    // - Returns deleted image or null if not found
    const image = await imageService.deleteImage(req.params.id, req.user._id);

    // STEP 3: If image not found, return 404
    if (!image) {
      return res.status(404).json({
        error: 'Image not found',
        code: 'IMAGE_NOT_FOUND',
      });
    }

    // STEP 4: Log the permanent deletion
    attachEntityId(req, 'imageId', image._id);
    req.eventName = 'image.delete.success';

    // STEP 5: Return success message
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    attachError(req, error, { operation: 'image_delete', imageId: req.params.id });
    res.status(500).json({
      error: 'Failed to delete image',
      code: 'DELETE_IMAGE_ERROR',
    });
  }
});

// =============================================================================
// EXPORT ROUTER
// =============================================================================
// This router is imported in server.js and mounted on the /images prefix.
// All routes are prepended with /images when mounted.

export default router;
