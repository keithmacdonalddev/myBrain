/**
 * =============================================================================
 * IMAGE.JS - Image Storage Data Model
 * =============================================================================
 *
 * This file defines the Image model - the data structure for storing image
 * metadata in myBrain. The actual image files are stored externally (S3 or
 * Cloudinary), while this model tracks the metadata and relationships.
 *
 * WHAT IS AN IMAGE?
 * -----------------
 * An image is a picture file (photo, graphic, screenshot, etc.) that a user
 * uploads to myBrain. Images can be used in:
 * - The image library (browsing/organizing photos)
 * - User avatars/profile pictures
 * - Note attachments
 * - Project covers
 *
 * WHERE ARE IMAGES STORED?
 * ------------------------
 * Images are NOT stored directly in the database (that would be slow and
 * expensive). Instead:
 *
 * 1. The image FILE is uploaded to a storage service:
 *    - Amazon S3 (primary, recommended)
 *    - Cloudinary (legacy support)
 *    - Local filesystem (development only)
 *
 * 2. This model stores METADATA about the image:
 *    - Where it's stored (storage key, bucket)
 *    - File information (size, dimensions, format)
 *    - User-added data (title, description, tags)
 *    - Links to notes and projects
 *
 * STORAGE PROVIDERS:
 * ------------------
 * - 's3': Amazon S3 - scalable, cost-effective cloud storage
 * - 'cloudinary': Image CDN with transformations (legacy)
 * - 'local': Local filesystem (development/testing only)
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
// IMAGE SCHEMA DEFINITION
// =============================================================================

/**
 * The Image Schema
 * ----------------
 * Defines all the fields an Image document can have.
 */
const imageSchema = new mongoose.Schema(
  {
    // =========================================================================
    // OWNERSHIP
    // =========================================================================

    /**
     * userId: Which user owns this image
     * - Required: Every image must belong to a user
     * - References: Points to a User document
     * - Index: Creates a database index for faster lookups by user
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // =========================================================================
    // STORAGE PROVIDER INFO
    // =========================================================================

    /**
     * storageProvider: Which service stores the actual image file
     *
     * VALUES:
     * - 's3': Amazon S3 (default, recommended for production)
     * - 'cloudinary': Cloudinary CDN (legacy, still supported)
     * - 'local': Local filesystem (development only)
     *
     * The application checks this field to know how to generate URLs
     * and handle file operations.
     */
    storageProvider: {
      type: String,
      enum: ['cloudinary', 's3', 'local'],
      default: 's3',
    },

    /**
     * storageKey: The path/key to the file in the storage service
     * - For S3: The object key (e.g., "images/user123/photo.jpg")
     * - For local: The file path on disk
     *
     * This is used to retrieve or delete the actual file.
     */
    storageKey: {
      type: String,
      default: null,
      index: true,
    },

    /**
     * storageBucket: The S3 bucket name (S3 only)
     * - Only relevant for S3 storage
     * - Used when generating URLs or performing operations
     */
    storageBucket: {
      type: String,
      default: null,
    },

    /**
     * thumbnailKey: Path to a thumbnail version (optional)
     * - Smaller, optimized version for previews
     * - Faster to load in galleries and lists
     */
    thumbnailKey: {
      type: String,
      default: null,
    },

    // =========================================================================
    // LEGACY CLOUDINARY FIELDS
    // =========================================================================

    /**
     * These fields exist for backward compatibility with images uploaded
     * when Cloudinary was the primary storage provider. New images use
     * the S3 fields above.
     */

    /**
     * cloudinaryId: The public ID in Cloudinary
     * - Used to reference the image in Cloudinary's API
     * - sparse: true creates an index that only includes documents with this field
     */
    cloudinaryId: {
      type: String,
      default: null,
      sparse: true, // Sparse index: only indexes documents that have this field
    },

    /**
     * url: HTTP URL to the image (Cloudinary)
     * - Direct link to the image file
     * - May not use HTTPS
     */
    url: {
      type: String,
      default: null,
    },

    /**
     * secureUrl: HTTPS URL to the image (Cloudinary)
     * - Secure link to the image file
     * - Preferred over url for security
     */
    secureUrl: {
      type: String,
      default: null,
    },

    // =========================================================================
    // FILE INFORMATION
    // =========================================================================

    /**
     * filename: The generated/stored filename
     * - May be different from originalName (often includes unique ID)
     * - Required: Every image must have a filename
     *
     * EXAMPLE: "abc123_profile_photo.jpg"
     */
    filename: {
      type: String,
      required: true,
    },

    /**
     * originalName: The original filename from the user's computer
     * - Preserved for display and download purposes
     * - Required: Helps users identify their images
     *
     * EXAMPLE: "vacation_photo_2024.jpg"
     */
    originalName: {
      type: String,
      required: true,
    },

    /**
     * format: The image file format
     * - Required: Needed for proper handling and display
     *
     * COMMON VALUES: "jpg", "jpeg", "png", "gif", "webp", "svg"
     */
    format: {
      type: String,
      required: true,
    },

    /**
     * mimeType: The MIME type of the file
     * - Used for proper HTTP Content-Type headers
     *
     * COMMON VALUES: "image/jpeg", "image/png", "image/gif", "image/webp"
     */
    mimeType: {
      type: String,
      default: '',
    },

    /**
     * size: File size in bytes
     * - Required: Used for storage tracking and limits
     *
     * EXAMPLES:
     * - 1024 = 1 KB
     * - 1048576 = 1 MB
     * - 5242880 = 5 MB
     */
    size: {
      type: Number,
      required: true,
    },

    // =========================================================================
    // IMAGE DIMENSIONS
    // =========================================================================

    /**
     * width: Image width in pixels
     * - Optional: May not be available for all images
     *
     * EXAMPLE: 1920 (for a 1920x1080 image)
     */
    width: {
      type: Number,
    },

    /**
     * height: Image height in pixels
     * - Optional: May not be available for all images
     *
     * EXAMPLE: 1080 (for a 1920x1080 image)
     */
    height: {
      type: Number,
    },

    /**
     * aspectRatio: Width divided by height
     * - Useful for layout calculations
     * - Helps maintain proportions when resizing
     *
     * EXAMPLES:
     * - 1.0 = Square (1:1)
     * - 1.78 = Widescreen (16:9)
     * - 0.75 = Portrait (3:4)
     */
    aspectRatio: {
      type: Number,
      default: null,
    },

    // =========================================================================
    // ORGANIZATION
    // =========================================================================

    /**
     * folder: Which category/folder this image belongs to
     * - Helps organize images by purpose
     *
     * VALUES:
     * - 'library': General image library (default)
     * - 'avatars': User profile pictures
     * - 'notes': Images attached to notes
     * - 'projects': Images attached to projects
     */
    folder: {
      type: String,
      enum: ['library', 'avatars', 'notes', 'projects'],
      default: 'library',
    },

    // =========================================================================
    // USER-EDITABLE METADATA
    // =========================================================================

    /**
     * title: User-given title for the image
     * - Optional: Users can name their images
     * - Max 200 characters
     * - Trimmed: Removes extra whitespace
     *
     * EXAMPLE: "Beach Sunset Photo"
     */
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
      default: '',
    },

    /**
     * description: Longer description of the image
     * - Optional: Users can add details about the image
     * - Max 1000 characters
     *
     * EXAMPLE: "Sunset photo taken at Malibu Beach, August 2024"
     */
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },

    /**
     * alt: Alternative text for accessibility
     * - Describes the image for screen readers
     * - Also used when the image can't be displayed
     * - Max 500 characters
     *
     * EXAMPLE: "A golden sunset over calm ocean waves with silhouetted palm trees"
     */
    alt: {
      type: String,
      trim: true,
      maxlength: [500, 'Alt text cannot exceed 500 characters'],
      default: '',
    },

    /**
     * tags: Labels for categorizing and finding images
     * - Array of strings like ["vacation", "beach", "sunset"]
     * - Users can search/filter by tags
     * - Indexed for fast tag-based queries
     */
    tags: {
      type: [String],
      default: [],
      index: true,
    },

    /**
     * favorite: Whether the user has marked this as a favorite
     * - Favorites can be filtered to show only liked images
     * - Indexed for fast favorite-based queries
     */
    favorite: {
      type: Boolean,
      default: false,
      index: true,
    },

    // =========================================================================
    // VISUAL METADATA (Extracted from image)
    // =========================================================================

    /**
     * dominantColor: The main color in the image
     * - Extracted automatically during upload (if enabled)
     * - Stored as hex code (e.g., "#3b82f6")
     * - Can be used for placeholders while image loads
     */
    dominantColor: {
      type: String,
      default: null,
    },

    /**
     * colors: Array of prominent colors in the image
     * - Extracted automatically during upload (if enabled)
     * - Stored as hex codes
     * - Can be used for color-based search/filtering
     */
    colors: {
      type: [String],
      default: [],
    },

    // =========================================================================
    // RELATIONSHIPS (Links to other content)
    // =========================================================================

    /**
     * linkedNoteIds: Notes this image is attached to
     * - Array of Note document IDs
     * - Images can be embedded in or linked to notes
     */
    linkedNoteIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
    }],

    /**
     * linkedProjectIds: Projects this image is associated with
     * - Array of Project document IDs
     * - Images can be used as project covers or attachments
     */
    linkedProjectIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    }],

    // =========================================================================
    // SOURCE TRACKING
    // =========================================================================

    /**
     * sourceUrl: Original URL if the image was imported from the web
     * - Used for attribution and reference
     * - Null if uploaded directly from user's device
     *
     * EXAMPLE: "https://example.com/original-image.jpg"
     */
    sourceUrl: {
      type: String,
      default: null,
    },
  },
  {
    /**
     * timestamps: true automatically adds:
     * - createdAt: When the image was uploaded
     * - updatedAt: When the image metadata was last modified
     */
    timestamps: true,
  }
);

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Compound Indexes for Common Queries
 * -----------------------------------
 * These indexes speed up the most common ways images are queried.
 */

// For browsing images by folder, newest first
// Used by: Image library, avatar picker
imageSchema.index({ userId: 1, folder: 1, createdAt: -1 });

// For showing favorite images
// Used by: Favorites view
imageSchema.index({ userId: 1, favorite: -1, createdAt: -1 });

// For filtering images by tags
// Used by: Tag filter functionality
imageSchema.index({ userId: 1, tags: 1 });

// For looking up images by storage location
// Used by: File retrieval and deletion
imageSchema.index({ storageProvider: 1, storageKey: 1 });

/**
 * Text Index for Full-Text Search
 * --------------------------------
 * This special index enables searching within image metadata.
 * Users can search by title, description, alt text, or original filename.
 */
imageSchema.index({ title: 'text', description: 'text', alt: 'text', originalName: 'text' });

// =============================================================================
// VIRTUAL PROPERTIES
// =============================================================================

/**
 * displayName (Virtual)
 * ---------------------
 * Returns the best available name for display purposes.
 * Prefers the user-given title, falls back to original filename.
 *
 * VIRTUAL PROPERTIES:
 * Virtual properties are computed on-the-fly and not stored in the database.
 * They're useful for derived values that shouldn't be duplicated.
 *
 * EXAMPLE:
 * - Image has title "Beach Photo" → returns "Beach Photo"
 * - Image has no title, originalName "IMG_1234.jpg" → returns "IMG_1234.jpg"
 */
imageSchema.virtual('displayName').get(function() {
  return this.title || this.originalName;
});

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * toSafeJSON()
 * ------------
 * Convert image to a clean JSON object for API responses.
 * Includes virtual properties and removes internal MongoDB fields.
 *
 * @returns {Object} - Clean image object with virtuals
 */
imageSchema.methods.toSafeJSON = function() {
  const obj = this.toObject({ virtuals: true }); // Include virtual properties
  delete obj.__v; // Remove MongoDB version field
  return obj;
};

/**
 * isS3()
 * ------
 * Check if this image is stored in Amazon S3.
 *
 * @returns {boolean} - True if stored in S3
 *
 * USAGE:
 * if (image.isS3()) {
 *   // Generate S3 signed URL
 * }
 */
imageSchema.methods.isS3 = function() {
  return this.storageProvider === 's3' && this.storageKey;
};

/**
 * isCloudinary()
 * --------------
 * Check if this image is stored in Cloudinary (legacy).
 * Handles both explicit cloudinary provider and old records
 * that don't have storageProvider set.
 *
 * @returns {boolean} - True if stored in Cloudinary
 *
 * USAGE:
 * if (image.isCloudinary()) {
 *   // Use Cloudinary API for transformations
 * }
 */
imageSchema.methods.isCloudinary = function() {
  // Either explicitly set to cloudinary, or legacy record with cloudinaryId but no storageKey
  return this.storageProvider === 'cloudinary' || (!this.storageKey && this.cloudinaryId);
};

/**
 * getStorageId()
 * --------------
 * Get the identifier used to reference this image in storage.
 * Returns the appropriate ID based on the storage provider.
 *
 * @returns {string} - The storage key (S3) or cloudinaryId (Cloudinary)
 *
 * USAGE:
 * const storageId = image.getStorageId();
 * // Use storageId to delete or retrieve the file
 */
imageSchema.methods.getStorageId = function() {
  if (this.isS3()) {
    return this.storageKey;
  }
  return this.cloudinaryId;
};

// =============================================================================
// STATIC METHODS (Called on the Model, not an instance)
// =============================================================================

/**
 * searchImages(userId, options)
 * -----------------------------
 * Advanced search function to find images matching various criteria.
 * Supports text search, filtering, sorting, and pagination.
 *
 * @param {string} userId - ID of the user whose images to search
 * @param {Object} options - Search options:
 *   - q: Search query text (searches title, description, alt, originalName)
 *   - folder: Filter by folder ('library', 'avatars', 'notes', 'projects')
 *   - tags: Array of tags to filter by (images must have ALL tags)
 *   - favorite: Filter by favorite status (true/false/null for any)
 *   - sort: Sort field (default '-createdAt' = newest first)
 *   - limit: Max results to return (default 50)
 *   - skip: Number of results to skip (for pagination)
 *
 * @returns {Object} - { images: Array, total: Number }
 *
 * EXAMPLE USAGE:
 * ```
 * const { images, total } = await Image.searchImages(userId, {
 *   q: 'vacation',
 *   folder: 'library',
 *   tags: ['beach'],
 *   favorite: true,
 *   limit: 20
 * });
 * ```
 */
imageSchema.statics.searchImages = async function(userId, options = {}) {
  // Extract options with defaults
  const {
    q = '',              // Search query text
    folder = null,       // Filter by folder
    tags = [],           // Filter by tags
    favorite = null,     // Filter by favorite status
    sort = '-createdAt', // Sort field (- prefix = descending)
    limit = 50,          // Max results
    skip = 0             // Results to skip (pagination)
  } = options;

  // -----------------------------------------
  // BUILD THE QUERY
  // -----------------------------------------

  // Start with the user's images
  const query = { userId };

  // Folder filter
  if (folder) {
    query.folder = folder;
  }

  // Tags filter - image must have ALL specified tags
  if (tags.length > 0) {
    query.tags = { $all: tags }; // $all = array contains all values
  }

  // Favorite filter
  if (favorite !== null) {
    query.favorite = favorite;
  }

  // Text search (searches title, description, alt, originalName)
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

  // Parse sort string: '-createdAt' → { createdAt: -1 }
  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1; // Descending
  } else {
    sortObj[sort] = 1; // Ascending
  }

  // -----------------------------------------
  // EXECUTE THE QUERY
  // -----------------------------------------

  let queryBuilder = this.find(query);

  // Include text match score if searching
  if (q && q.trim()) {
    queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } });
  }

  // Execute with sort and pagination
  const images = await queryBuilder
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  // Get total count for pagination info
  const total = await this.countDocuments(query);

  return { images, total };
};

/**
 * getUserTags(userId)
 * -------------------
 * Get all unique tags used in a user's library images, with usage counts.
 * Useful for showing a tag cloud or autocomplete suggestions.
 *
 * @param {string} userId - User's ID
 * @returns {Array} - Array of { tag, count } objects sorted by usage
 *
 * EXAMPLE:
 * Returns: [
 *   { tag: 'vacation', count: 25 },
 *   { tag: 'family', count: 18 },
 *   { tag: 'work', count: 7 }
 * ]
 */
imageSchema.statics.getUserTags = async function(userId) {
  // Use MongoDB aggregation pipeline
  const result = await this.aggregate([
    // Match only this user's library images
    { $match: { userId: new mongoose.Types.ObjectId(userId), folder: 'library' } },
    // Unwind tags array (creates one document per tag)
    { $unwind: '$tags' },
    // Group by tag and count occurrences
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    // Sort by count (most used first), then alphabetically
    { $sort: { count: -1, _id: 1 } }
  ]);

  // Transform to friendlier format
  return result.map(r => ({ tag: r._id, count: r.count }));
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the Image model from the schema.
 * This gives us methods to:
 * - Create images: Image.create({ userId, filename, size, format, ... })
 * - Find images: Image.find({ userId }), Image.findById(id)
 * - Update images: Image.findByIdAndUpdate(id, updates)
 * - Delete images: Image.findByIdAndDelete(id)
 * - Search images: Image.searchImages(userId, options)
 * - Get tags: Image.getUserTags(userId)
 *
 * IMPORTANT:
 * When deleting an Image document, remember to also delete the actual
 * file from the storage provider (S3, Cloudinary, or local).
 */
const Image = mongoose.model('Image', imageSchema);

export default Image;
