/**
 * =============================================================================
 * FILE.JS - File Storage Data Model
 * =============================================================================
 *
 * This file defines the File model - the data structure for storing file
 * metadata in myBrain. Unlike the Image model (which is specialized for images),
 * this model handles ALL file types: documents, videos, audio, archives, etc.
 *
 * WHAT IS A FILE?
 * ---------------
 * A file is any uploaded document, media, or data that a user stores in myBrain.
 * This includes PDFs, Word documents, spreadsheets, videos, audio files,
 * zip archives, code files, and more.
 *
 * FILE vs IMAGE MODEL:
 * --------------------
 * - File model: General purpose, handles any file type
 * - Image model: Specialized for images with extra features (colors, dimensions)
 *
 * WHERE ARE FILES STORED?
 * -----------------------
 * Like images, actual files are NOT stored in the database. Instead:
 *
 * 1. The file DATA is stored in a cloud storage service:
 *    - Amazon S3 (primary)
 *    - Google Cloud Storage (GCS)
 *    - Azure Blob Storage
 *    - Local filesystem (development)
 *
 * 2. This model stores METADATA about the file:
 *    - Storage location (key, bucket, provider)
 *    - File info (name, type, size)
 *    - Organization (folder, tags)
 *    - Links to notes, projects, tasks
 *    - Security (scanning status, checksums)
 *
 * KEY FEATURES:
 * -------------
 * - Folder-based organization with nested hierarchy
 * - File versioning (keep previous versions)
 * - Sharing with public URLs and access control
 * - Security scanning for malware detection
 * - File integrity verification (checksums)
 * - Usage analytics (download counts, last accessed)
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
// FILE SCHEMA DEFINITION
// =============================================================================

/**
 * The File Schema
 * ---------------
 * Defines all the fields a File document can have.
 * This is a comprehensive model covering storage, organization, sharing,
 * versioning, and security.
 */
const fileSchema = new mongoose.Schema(
  {
    // =========================================================================
    // OWNERSHIP
    // =========================================================================

    /**
     * userId: Which user owns this file
     * - Required: Every file must belong to a user
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
    // STORAGE LOCATION
    // =========================================================================

    /**
     * storageProvider: Which cloud service stores the actual file
     *
     * VALUES:
     * - 's3': Amazon S3 (most common)
     * - 'gcs': Google Cloud Storage
     * - 'azure': Microsoft Azure Blob Storage
     * - 'local': Local filesystem (development only)
     */
    storageProvider: {
      type: String,
      enum: ['s3', 'gcs', 'azure', 'local'],
      required: true,
    },

    /**
     * storageKey: The path/key to the file in the storage service
     * - Required: We need to know where the file is stored
     *
     * EXAMPLE: "files/user123/documents/report.pdf"
     */
    storageKey: {
      type: String,
      required: true,
    },

    /**
     * storageBucket: The bucket/container name in cloud storage
     * - Required: Identifies which bucket the file is in
     *
     * EXAMPLE: "mybrain-files-prod"
     */
    storageBucket: {
      type: String,
      required: true,
    },

    // =========================================================================
    // FILE IDENTITY
    // =========================================================================

    /**
     * filename: The generated/stored filename
     * - Required: Every file needs a filename
     * - Often includes a unique ID to prevent collisions
     *
     * EXAMPLE: "abc123_report.pdf"
     */
    filename: {
      type: String,
      required: true,
    },

    /**
     * originalName: The original filename from the user's computer
     * - Required: Preserved for display and download
     *
     * EXAMPLE: "Q4 Sales Report.pdf"
     */
    originalName: {
      type: String,
      required: true,
    },

    // =========================================================================
    // FILE TYPE INFORMATION
    // =========================================================================

    /**
     * mimeType: The MIME type of the file
     * - Required: Used for content handling and display
     * - Index: For filtering by file type
     *
     * EXAMPLES: "application/pdf", "video/mp4", "audio/mpeg"
     */
    mimeType: {
      type: String,
      required: true,
      index: true,
    },

    /**
     * extension: File extension without the dot
     * - Extracted from filename
     * - Index: For filtering by extension
     *
     * EXAMPLES: "pdf", "docx", "mp4", "zip"
     */
    extension: {
      type: String,
      index: true,
    },

    /**
     * fileCategory: High-level category based on MIME type
     * - Automatically determined from mimeType
     * - Index: For filtering by category
     *
     * VALUES:
     * - 'document': PDFs, Word docs, text files
     * - 'image': Photos, graphics (may also be in Image model)
     * - 'video': Movies, clips
     * - 'audio': Music, recordings, podcasts
     * - 'archive': Zip files, compressed archives
     * - 'code': Source code files
     * - 'spreadsheet': Excel, CSV files
     * - 'presentation': PowerPoint, Keynote
     * - 'other': Everything else
     */
    fileCategory: {
      type: String,
      enum: ['document', 'image', 'video', 'audio', 'archive', 'code', 'spreadsheet', 'presentation', 'other'],
      index: true,
    },

    // =========================================================================
    // SIZE AND DIMENSIONS
    // =========================================================================

    /**
     * size: File size in bytes
     * - Required: Used for storage quota tracking
     *
     * EXAMPLES:
     * - 1024 = 1 KB
     * - 1048576 = 1 MB
     * - 1073741824 = 1 GB
     */
    size: {
      type: Number,
      required: true,
    },

    /**
     * width: Width in pixels (for images/videos)
     * - Only applicable for visual media
     */
    width: Number,

    /**
     * height: Height in pixels (for images/videos)
     * - Only applicable for visual media
     */
    height: Number,

    /**
     * duration: Length in seconds (for audio/video)
     * - Only applicable for media files
     *
     * EXAMPLE: 180 = 3 minutes
     */
    duration: Number,

    // =========================================================================
    // FOLDER SYSTEM
    // =========================================================================

    /**
     * folderId: Which folder this file is in
     * - null means the file is in the root (no folder)
     * - References: Points to a Folder document
     * - Index: For listing files in a folder
     */
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
      index: true,
    },

    /**
     * path: Full path including folder hierarchy
     * - Stored for quick path-based queries
     * - Updated when file or parent folders move
     *
     * EXAMPLE: "/Documents/Work/Reports"
     */
    path: {
      type: String,
      default: '/',
      index: true,
    },

    // =========================================================================
    // USER METADATA
    // =========================================================================

    /**
     * title: User-given title for the file
     * - Optional: Defaults to empty, uses originalName for display
     * - Max 200 characters
     */
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
      default: '',
    },

    /**
     * description: User's description of the file
     * - Optional: Additional context about the file
     * - Max 2000 characters
     */
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },

    /**
     * tags: Labels for categorizing and finding files
     * - Array of strings like ["work", "reports", "q4"]
     * - Indexed for fast tag-based queries
     */
    tags: {
      type: [String],
      default: [],
      index: true,
    },

    // =========================================================================
    // STATUS FLAGS
    // =========================================================================

    /**
     * favorite: Whether user has marked this as a favorite
     * - Favorites appear in a special view
     * - Index: For fast favorite filtering
     */
    favorite: {
      type: Boolean,
      default: false,
      index: true,
    },

    /**
     * isPublic: Whether this file is publicly accessible
     * - Public files can be viewed by anyone with the link
     * - Default false for privacy
     */
    isPublic: {
      type: Boolean,
      default: false,
    },

    /**
     * isTrashed: Whether file is in the trash
     * - Trashed files are hidden from normal views
     * - Can be restored or permanently deleted
     * - Index: For excluding trashed files from queries
     */
    isTrashed: {
      type: Boolean,
      default: false,
      index: true,
    },

    /**
     * trashedAt: When the file was moved to trash
     * - Used for automatic cleanup of old trashed files
     */
    trashedAt: Date,

    // =========================================================================
    // VERSIONING
    // =========================================================================

    /**
     * version: Current version number of this file
     * - Starts at 1, increments with each new version
     */
    version: {
      type: Number,
      default: 1,
    },

    /**
     * previousVersionId: Link to the previous version of this file
     * - Creates a chain of file versions
     * - null for the first version
     */
    previousVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      default: null,
    },

    /**
     * isLatestVersion: Whether this is the current/latest version
     * - Only the latest version is shown by default
     * - Older versions are kept but hidden
     * - Index: For filtering to show only latest versions
     */
    isLatestVersion: {
      type: Boolean,
      default: true,
      index: true,
    },

    // =========================================================================
    // ENTITY LINKS (Relationships)
    // =========================================================================

    /**
     * linkedNoteIds: Notes this file is attached to
     * - Array of Note document IDs
     * - Files can be embedded in or linked from notes
     */
    linkedNoteIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
    }],

    /**
     * linkedProjectIds: Projects this file belongs to
     * - Array of Project document IDs
     * - Files can be project deliverables or resources
     */
    linkedProjectIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    }],

    /**
     * linkedTaskIds: Tasks this file is related to
     * - Array of Task document IDs
     * - Files can be task deliverables or attachments
     */
    linkedTaskIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    }],

    // =========================================================================
    // SHARING
    // =========================================================================

    /**
     * shareSettings: Configuration for file sharing
     * - Controls who can access the file and how
     */
    shareSettings: {
      /**
       * publicUrl: Generated URL for public access
       */
      publicUrl: String,

      /**
       * publicUrlExpiry: When the public URL expires
       * - After this date, the URL stops working
       */
      publicUrlExpiry: Date,

      /**
       * shareToken: Secret token for share link access
       * - Anyone with this token can access the file
       */
      shareToken: String,

      /**
       * shareTokenExpiry: When the share token expires
       */
      shareTokenExpiry: Date,

      /**
       * allowedUsers: Specific users who can access this file
       * - Array of User document IDs
       */
      allowedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }],

      /**
       * password: Hashed password for password-protected shares
       * - Never stored in plain text
       */
      password: String,
    },

    // =========================================================================
    // ACCESS TRACKING
    // =========================================================================

    /**
     * downloadCount: How many times the file has been downloaded
     * - Useful for analytics and popular file detection
     */
    downloadCount: {
      type: Number,
      default: 0,
    },

    /**
     * lastAccessedAt: When the file was last viewed or downloaded
     * - Used for "recently accessed" features
     */
    lastAccessedAt: Date,

    // =========================================================================
    // PREVIEWS
    // =========================================================================

    /**
     * thumbnailKey: Storage key for a thumbnail preview image
     * - Generated for previewable files (images, videos, documents)
     */
    thumbnailKey: String,

    /**
     * thumbnailUrl: Direct URL to thumbnail (if stored separately)
     */
    thumbnailUrl: String,

    /**
     * previewUrl: URL to a preview/viewer for this file
     * - For documents, might link to an online viewer
     */
    previewUrl: String,

    // =========================================================================
    // IMAGE-SPECIFIC METADATA
    // =========================================================================

    /**
     * These fields are only used when the file is an image.
     * For full image handling, see the Image model.
     */

    /**
     * dominantColor: Main color extracted from image
     * - Used for placeholder backgrounds
     */
    dominantColor: String,

    /**
     * colors: Array of prominent colors in image
     */
    colors: [String],

    /**
     * aspectRatio: Width divided by height
     */
    aspectRatio: Number,

    // =========================================================================
    // SECURITY SCANNING
    // =========================================================================

    /**
     * scanStatus: Current malware/virus scan status
     *
     * VALUES:
     * - 'pending': Not yet scanned
     * - 'clean': Scanned, no threats found
     * - 'suspicious': Potential threat detected
     * - 'infected': Confirmed malware
     * - 'skipped': Scan was skipped (trusted source or file type)
     */
    scanStatus: {
      type: String,
      enum: ['pending', 'clean', 'suspicious', 'infected', 'skipped'],
      default: 'pending',
    },

    /**
     * scanResult: Detailed scan results
     */
    scanResult: {
      /**
       * scannedAt: When the scan was performed
       */
      scannedAt: Date,

      /**
       * scannerVersion: Version of the scanning software
       */
      scannerVersion: String,

      /**
       * threats: List of detected threat names
       */
      threats: [String],
    },

    // =========================================================================
    // FILE INTEGRITY
    // =========================================================================

    /**
     * checksums: Hash values for verifying file integrity
     * - Used to detect corruption or tampering
     */
    checksums: {
      /**
       * md5: MD5 hash of the file (fast but less secure)
       */
      md5: String,

      /**
       * sha256: SHA-256 hash of the file (secure)
       */
      sha256: String,
    },
  },
  {
    /**
     * timestamps: true automatically adds:
     * - createdAt: When the file was uploaded
     * - updatedAt: When the file metadata was last modified
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
 * These indexes speed up the most common file queries.
 */

// For listing files in a folder
// Used by: File browser, folder view
fileSchema.index({ userId: 1, folderId: 1, isTrashed: 1, createdAt: -1 });

// For filtering by category
// Used by: Category-based file views
fileSchema.index({ userId: 1, fileCategory: 1, isTrashed: 1, createdAt: -1 });

// For showing favorite files
// Used by: Favorites view
fileSchema.index({ userId: 1, favorite: -1, isTrashed: 1, createdAt: -1 });

// For filtering by tags
// Used by: Tag-based filtering
fileSchema.index({ userId: 1, tags: 1, isTrashed: 1 });

// For version management
// Used by: Showing only latest versions
fileSchema.index({ userId: 1, isLatestVersion: 1 });

// For share link lookups
// Used by: Public share access
fileSchema.index({ 'shareSettings.shareToken': 1 });

// For version chain navigation
// Used by: Finding newer versions
fileSchema.index({ previousVersionId: 1 });

/**
 * Text Index for Full-Text Search
 * --------------------------------
 * Enables searching within file metadata.
 */
fileSchema.index({ title: 'text', description: 'text', originalName: 'text' });

// =============================================================================
// VIRTUAL PROPERTIES
// =============================================================================

/**
 * displayName (Virtual)
 * ---------------------
 * Returns the best available name for display.
 * Prefers user-given title, falls back to original filename.
 */
fileSchema.virtual('displayName').get(function () {
  return this.title || this.originalName;
});

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * toSafeJSON()
 * ------------
 * Convert file to a clean JSON object for API responses.
 * Includes virtuals and removes sensitive data.
 *
 * @returns {Object} - Clean file object
 */
fileSchema.methods.toSafeJSON = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;

  // Remove sensitive share settings
  if (obj.shareSettings) {
    delete obj.shareSettings.password; // Never expose password hash
  }

  return obj;
};

// =============================================================================
// STATIC METHODS
// =============================================================================

/**
 * getCategoryFromMimeType(mimeType)
 * ---------------------------------
 * Determine the file category based on MIME type.
 * Used when uploading files to auto-categorize them.
 *
 * @param {string} mimeType - The MIME type to categorize
 * @returns {string} - The file category
 *
 * EXAMPLES:
 * - "application/pdf" → "document"
 * - "video/mp4" → "video"
 * - "application/zip" → "archive"
 */
fileSchema.statics.getCategoryFromMimeType = function (mimeType) {
  if (!mimeType) return 'other';

  const type = mimeType.toLowerCase();

  // Media types (easy to detect)
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';

  // Documents
  if (type.includes('pdf') ||
      type.includes('word') ||
      type.includes('document') ||
      type.includes('text/plain') ||
      type.includes('rtf')) {
    return 'document';
  }

  // Spreadsheets
  if (type.includes('spreadsheet') ||
      type.includes('excel') ||
      type.includes('csv')) {
    return 'spreadsheet';
  }

  // Presentations
  if (type.includes('presentation') ||
      type.includes('powerpoint')) {
    return 'presentation';
  }

  // Archives
  if (type.includes('zip') ||
      type.includes('rar') ||
      type.includes('tar') ||
      type.includes('gzip') ||
      type.includes('7z') ||
      type.includes('compressed')) {
    return 'archive';
  }

  // Code files
  if (type.includes('javascript') ||
      type.includes('json') ||
      type.includes('html') ||
      type.includes('css') ||
      type.includes('xml') ||
      type.includes('typescript') ||
      type.includes('python') ||
      type.includes('java') ||
      type.includes('x-sh')) {
    return 'code';
  }

  return 'other';
};

/**
 * searchFiles(userId, options)
 * ----------------------------
 * Advanced search function to find files matching various criteria.
 *
 * @param {string} userId - ID of the user whose files to search
 * @param {Object} options - Search options:
 *   - q: Search query text
 *   - folderId: Filter by folder (null for root)
 *   - fileCategory: Filter by category
 *   - tags: Array of tags to filter by
 *   - favorite: Filter by favorite status
 *   - isTrashed: Include trashed files (default false)
 *   - sort: Sort field (default '-createdAt')
 *   - limit: Max results (default 50)
 *   - skip: Skip count for pagination
 *   - isLatestVersion: Only show latest versions (default true)
 *
 * @returns {Object} - { files: Array, total: Number }
 */
fileSchema.statics.searchFiles = async function (userId, options = {}) {
  const {
    q = '',
    folderId = null,
    fileCategory = null,
    tags = [],
    favorite = null,
    isTrashed = false,
    sort = '-createdAt',
    limit = 50,
    skip = 0,
    isLatestVersion = true,
  } = options;

  // Build query
  const query = { userId, isTrashed };

  // Only show latest versions by default
  if (isLatestVersion !== null) {
    query.isLatestVersion = isLatestVersion;
  }

  // Folder filter
  if (folderId !== undefined) {
    query.folderId = folderId;
  }

  // Category filter
  if (fileCategory) {
    query.fileCategory = fileCategory;
  }

  // Tags filter
  if (tags.length > 0) {
    query.tags = { $all: tags };
  }

  // Favorite filter
  if (favorite !== null) {
    query.favorite = favorite;
  }

  // Text search
  if (q && q.trim()) {
    query.$text = { $search: q };
  }

  // Build sort
  let sortObj = {};
  if (q && q.trim()) {
    sortObj = { score: { $meta: 'textScore' } };
  }

  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  // Execute query
  let queryBuilder = this.find(query);

  if (q && q.trim()) {
    queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } });
  }

  const files = await queryBuilder
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments(query);

  return { files, total };
};

/**
 * getUserTags(userId)
 * -------------------
 * Get all unique tags used in a user's files.
 *
 * @param {string} userId - User's ID
 * @returns {Array} - Array of { tag, count } objects
 */
fileSchema.statics.getUserTags = async function (userId) {
  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isTrashed: false,
        isLatestVersion: true,
      },
    },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);

  return result.map(r => ({ tag: r._id, count: r.count }));
};

/**
 * getStorageUsage(userId)
 * -----------------------
 * Get storage usage statistics for a user.
 *
 * @param {string} userId - User's ID
 * @returns {Object} - { totalSize, fileCount, trashedSize, trashedCount }
 */
fileSchema.statics.getStorageUsage = async function (userId) {
  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isLatestVersion: true,
      },
    },
    {
      $group: {
        _id: null,
        totalSize: { $sum: '$size' },           // Total bytes used
        fileCount: { $sum: 1 },                  // Total files
        trashedSize: {
          $sum: { $cond: ['$isTrashed', '$size', 0] },  // Bytes in trash
        },
        trashedCount: {
          $sum: { $cond: ['$isTrashed', 1, 0] },        // Files in trash
        },
      },
    },
  ]);

  if (result.length === 0) {
    return {
      totalSize: 0,
      fileCount: 0,
      trashedSize: 0,
      trashedCount: 0,
    };
  }

  return result[0];
};

/**
 * getCategoryBreakdown(userId)
 * ----------------------------
 * Get file counts and sizes grouped by category.
 *
 * @param {string} userId - User's ID
 * @returns {Array} - Array of { category, count, size }
 */
fileSchema.statics.getCategoryBreakdown = async function (userId) {
  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isTrashed: false,
        isLatestVersion: true,
      },
    },
    {
      $group: {
        _id: '$fileCategory',
        count: { $sum: 1 },
        size: { $sum: '$size' },
      },
    },
    { $sort: { size: -1 } },
  ]);

  return result.map(r => ({
    category: r._id,
    count: r.count,
    size: r.size,
  }));
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the File model from the schema.
 */
const File = mongoose.model('File', fileSchema);

export default File;
