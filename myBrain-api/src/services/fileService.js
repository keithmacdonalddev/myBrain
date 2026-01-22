/**
 * =============================================================================
 * FILESERVICE.JS - Complete File Management Service
 * =============================================================================
 *
 * This service handles all file operations in myBrain. It's the core of the
 * Files feature, managing uploads, downloads, organization, versioning, and more.
 *
 * WHAT IS A FILE SERVICE?
 * -----------------------
 * A file service abstracts all the complexity of file management:
 * - Uploading files to cloud storage (S3)
 * - Storing metadata in the database
 * - Organizing files in folders
 * - Handling trash and permanent deletion
 * - Managing file versions
 * - Linking files to other entities (notes, tasks, projects)
 *
 * FILE LIFECYCLE:
 * ---------------
 * 1. UPLOAD: User uploads file → stored in S3 + metadata in MongoDB
 * 2. ACTIVE: File is accessible, can be moved, renamed, shared
 * 3. TRASHED: User deletes file → moved to trash (recoverable)
 * 4. DELETED: User empties trash → permanently removed from S3 + MongoDB
 *
 * FILE VERSIONING:
 * ----------------
 * Files can have multiple versions (like Google Docs version history):
 * - Each upload creates a new version
 * - Previous versions are kept but marked as not latest
 * - Users can see version history
 * - Versions form a linked list (each points to previous)
 *
 * STORAGE ARCHITECTURE:
 * --------------------
 * Files are stored in two places:
 *
 * 1. CLOUD STORAGE (S3):
 *    - Actual file binary data
 *    - Thumbnails for images
 *    - Organized by: userId/files/timestamp-uniqueid.ext
 *
 * 2. DATABASE (MongoDB):
 *    - File metadata (name, size, type, etc.)
 *    - References to storage locations
 *    - Organizational info (folder, tags)
 *    - Links to other entities
 *
 * SECURITY CONSIDERATIONS:
 * -----------------------
 * - Forbidden extensions: Block dangerous files (.exe, .bat, etc.)
 * - User isolation: Users can only access their own files
 * - Signed URLs: Temporary download URLs that expire
 * - Checksums: Verify file integrity
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS - Loading Dependencies
// =============================================================================
// This section imports the modules and dependencies needed for file management.
// Each import enables a specific capability of the file service.

/**
 * Node.js crypto module provides cryptographic functionality including checksums.
 * Checksums (SHA256 hashes) verify that files uploaded/downloaded weren't corrupted.
 * We use this to ensure data integrity when storing files in S3.
 */
import crypto from 'crypto';

/**
 * Node.js path module utilities for handling file paths and extracting extensions.
 * We use this to get the file extension (.pdf, .docx, etc.) from full file paths.
 * Extension detection is used for validation and organizing files.
 */
import path from 'path';

/**
 * File model represents file metadata documents in MongoDB.
 * Stores file name, size, type, storage location, folder, tags, and version history.
 * Provides methods for searching, updating, and deleting file metadata.
 */
import File from '../models/File.js';

/**
 * Folder model represents folder documents in MongoDB.
 * Allows users to organize files into a folder hierarchy.
 * Folders are like directories - they contain files and can be nested.
 */
import Folder from '../models/Folder.js';

/**
 * FileShare model tracks file sharing permissions and links.
 * When users share files with others, FileShare stores who can access what.
 * Enables permission checking and access tracking for shared files.
 */
import FileShare from '../models/FileShare.js';

/**
 * Storage factory is an abstraction layer for cloud storage providers.
 * Provides a unified interface whether using S3, local filesystem, or another storage backend.
 * Handles authentication, uploads, downloads, and deletion from the storage provider.
 */
import { getDefaultProvider } from './storage/storageFactory.js';

/**
 * Image processing service handles special image operations.
 * Creates thumbnails for image files and extracts metadata (dimensions, format).
 * Makes image management more efficient and provides visual previews.
 */
import * as imageProcessing from './imageProcessingService.js';

/**
 * Usage tracking service records what users do for analytics and recommendations.
 * We track: creates (uploads), views (downloads/accesses).
 * This data helps the intelligent dashboard show recently-used files.
 */
import { trackCreate, trackView } from './usageService.js';

// =============================================================================
// SECURITY CONFIGURATION
// =============================================================================

/**
 * FORBIDDEN_EXTENSIONS
 * --------------------
 * File extensions that are NEVER allowed for security reasons.
 * These files could potentially harm users or systems if downloaded/executed.
 *
 * CATEGORIES:
 * - Windows executables: .exe, .msi, .dll, .scr
 * - Scripts: .bat, .cmd, .sh, .ps1, .vbs, .js
 * - Java: .jar (can contain executable code)
 * - Other dangerous: .com, .pif, .hta, .cpl, .msc
 */
const FORBIDDEN_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.jar',
  '.msi', '.dll', '.scr', '.com', '.pif', '.hta', '.cpl', '.msc',
];

// =============================================================================
// FILE UPLOAD
// =============================================================================

/**
 * uploadFile(file, userId, options)
 * ---------------------------------
 * Upload a file to cloud storage and save metadata to database.
 * This is the main entry point for file uploads.
 *
 * @param {Object} file - Multer file object containing:
 *   - buffer: The actual file data (binary)
 *   - originalname: Original filename from user
 *   - mimetype: File type (e.g., "image/jpeg", "application/pdf")
 *
 * @param {string} userId - ID of the user uploading the file
 *
 * @param {Object} options - Upload options:
 *   @param {string} options.folderId - Folder to place file in (null for root)
 *   @param {string} options.title - Display title for the file
 *   @param {string} options.description - File description
 *   @param {string[]} options.tags - Tags for organization
 *   @param {string[]} options.linkedNoteIds - Notes to link this file to
 *   @param {string[]} options.linkedProjectIds - Projects to link to
 *   @param {string[]} options.linkedTaskIds - Tasks to link to
 *
 * @returns {Promise<File>} The created file record
 *
 * @throws {Error} If file extension is forbidden
 *
 * UPLOAD FLOW:
 * 1. Validate extension is not forbidden
 * 2. Generate unique storage key
 * 3. If image: process (optimize, generate thumbnail)
 * 4. Upload to S3
 * 5. Calculate checksums
 * 6. Create database record
 * 7. Update folder statistics
 *
 * EXAMPLE:
 * ```javascript
 * const file = await uploadFile(req.file, req.user._id, {
 *   folderId: 'folder123',
 *   title: 'Q4 Report',
 *   tags: ['reports', 'quarterly']
 * });
 * ```
 */
export async function uploadFile(file, userId, options = {}) {
  // =====================================================
  // EXTRACT OPTIONS
  // =====================================================

  const {
    folderId = null,
    title = '',
    description = '',
    tags = [],
    linkedNoteIds = [],
    linkedProjectIds = [],
    linkedTaskIds = [],
  } = options;

  // =====================================================
  // GET STORAGE PROVIDER AND FILE INFO
  // =====================================================

  const storage = getDefaultProvider();
  const extension = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  // Determine file category based on MIME type
  // This is a static method on the File model
  const fileCategory = File.getCategoryFromMimeType(mimeType);

  // =====================================================
  // SECURITY CHECK - BLOCK FORBIDDEN EXTENSIONS
  // =====================================================

  if (FORBIDDEN_EXTENSIONS.includes(extension)) {
    throw new Error(`File type ${extension} is not allowed for security reasons`);
  }

  // =====================================================
  // GENERATE STORAGE KEY
  // =====================================================
  // Storage key is the path/filename in cloud storage
  // Format: userId/files/timestamp-uniqueid.ext

  const storageKey = storage.generateKey(userId, file.originalname, 'files');

  // =====================================================
  // PROCESS IMAGES
  // =====================================================
  // Images get special treatment: optimization and thumbnails

  let thumbnailKey = null;
  let thumbnailUrl = null;
  let imageMetadata = {};

  if (fileCategory === 'image') {
    try {
      // Process image: optimize original + generate thumbnail
      const processed = await imageProcessing.processImage(file.buffer, {
        generateThumbnail: true,
        optimizeOriginal: true,
      });

      // Upload thumbnail to separate location
      thumbnailKey = storage.getThumbnailKey(storageKey);
      await storage.upload(processed.thumbnail, thumbnailKey, {
        contentType: 'image/jpeg',
        metadata: { type: 'thumbnail', originalKey: storageKey },
      });
      thumbnailUrl = storage.getPublicUrl(thumbnailKey);

      // Use optimized original if it was resized
      if (processed.metadata.wasResized) {
        file.buffer = processed.original;
      }

      // Extract image-specific metadata
      imageMetadata = {
        width: processed.metadata.width,
        height: processed.metadata.height,
        aspectRatio: processed.metadata.aspectRatio,
        dominantColor: processed.metadata.dominantColor,
        colors: processed.metadata.colors,
      };
    } catch (error) {
      // Log error but continue - we can still upload original
      console.error('Image processing failed:', error);
    }
  }

  // =====================================================
  // UPLOAD MAIN FILE TO STORAGE
  // =====================================================

  const uploadResult = await storage.upload(file.buffer, storageKey, {
    contentType: mimeType,
    metadata: {
      originalName: file.originalname,
      userId,
    },
  });

  // =====================================================
  // GET FOLDER PATH
  // =====================================================
  // Files track their folder's path for querying

  let filePath = '/';
  if (folderId) {
    const folder = await Folder.findById(folderId);
    if (folder) {
      filePath = folder.path;
    }
  }

  // =====================================================
  // CALCULATE CHECKSUMS
  // =====================================================
  // Checksums verify file integrity
  // MD5 = fast, widely used
  // SHA256 = more secure, recommended

  const md5 = crypto.createHash('md5').update(file.buffer).digest('hex');
  const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');

  // =====================================================
  // CREATE DATABASE RECORD
  // =====================================================

  const fileRecord = await File.create({
    userId,
    storageProvider: storage.providerName,
    storageKey,
    storageBucket: uploadResult.bucket,
    filename: path.basename(storageKey),
    originalName: file.originalname,
    mimeType,
    extension,
    fileCategory,
    size: uploadResult.size,
    folderId,
    path: filePath,
    title: title || '',
    description: description || '',
    tags,
    thumbnailKey,
    thumbnailUrl,
    linkedNoteIds,
    linkedProjectIds,
    linkedTaskIds,
    checksums: { md5, sha256 },
    scanStatus: 'skipped',  // Virus scanning not yet implemented
    ...imageMetadata,       // Spread image metadata if present
  });

  // =====================================================
  // UPDATE FOLDER STATISTICS
  // =====================================================
  // Keep folder's file count and size totals current

  if (folderId) {
    await Folder.updateFolderStats(folderId);
  }

  // Track usage for intelligent dashboard
  trackCreate(userId, 'files');

  return fileRecord;
}

// =============================================================================
// FILE RETRIEVAL
// =============================================================================

/**
 * getFiles(userId, options)
 * -------------------------
 * Get files for a user with filtering, sorting, and pagination.
 *
 * @param {string} userId - User ID
 *
 * @param {Object} options - Filter and pagination options:
 *   @param {string} options.folderId - Filter by folder (null for root)
 *   @param {string} options.fileCategory - Filter by category (image, document, etc.)
 *   @param {boolean} options.favorite - Filter favorites only
 *   @param {boolean} options.isTrashed - Include trashed files (default: false)
 *   @param {string[]} options.tags - Filter by tags (must have ALL)
 *   @param {string} options.q - Text search query
 *   @param {string} options.sort - Sort field (prefix with - for descending)
 *   @param {number} options.page - Page number (default: 1)
 *   @param {number} options.limit - Items per page (default: 50)
 *
 * @returns {Promise<Object>} Results:
 *   - files: Array of file documents
 *   - total: Total matching files
 *   - pagination: { page, limit, total, pages }
 *
 * EXAMPLE:
 * ```javascript
 * const { files, pagination } = await getFiles(userId, {
 *   fileCategory: 'document',
 *   tags: ['important'],
 *   sort: '-createdAt',
 *   page: 1,
 *   limit: 20
 * });
 * ```
 */
export async function getFiles(userId, options = {}) {
  const {
    folderId,
    fileCategory,
    favorite,
    isTrashed = false,
    tags,
    q,
    sort = '-createdAt',
    page = 1,
    limit = 50,
  } = options;

  // =====================================================
  // BUILD QUERY
  // =====================================================

  const query = { userId, isTrashed, isLatestVersion: true };

  // Filter by folder
  if (folderId !== undefined) {
    query.folderId = folderId || null;
  }

  // Filter by category
  if (fileCategory) {
    query.fileCategory = fileCategory;
  }

  // Filter favorites
  if (favorite !== undefined) {
    query.favorite = favorite === 'true' || favorite === true;
  }

  // Filter by tags (must have ALL specified tags)
  if (tags && tags.length > 0) {
    const tagArray = Array.isArray(tags) ? tags : tags.split(',');
    query.tags = { $all: tagArray };
  }

  // Text search (searches title, description, originalName)
  if (q && q.trim()) {
    query.$text = { $search: q };
  }

  // =====================================================
  // CALCULATE PAGINATION
  // =====================================================

  const skip = (page - 1) * limit;

  // =====================================================
  // PARSE SORT
  // =====================================================
  // '-createdAt' means sort by createdAt descending

  let sortObj = {};

  // If text search, sort by relevance score first
  if (q && q.trim()) {
    sortObj = { score: { $meta: 'textScore' } };
  }

  // Apply user's sort preference
  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1;  // Descending
  } else {
    sortObj[sort] = 1;                // Ascending
  }

  // =====================================================
  // EXECUTE QUERY
  // =====================================================

  let queryBuilder = File.find(query);

  // Include text score for relevance sorting
  if (q && q.trim()) {
    queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } });
  }

  // Execute query and count in parallel
  const [files, total] = await Promise.all([
    queryBuilder.sort(sortObj).skip(skip).limit(limit),
    File.countDocuments(query),
  ]);

  return {
    files,
    total,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * getFile(fileId, userId)
 * -----------------------
 * Get a single file by ID with ownership verification.
 * Returns the file document if found and owned by the user.
 *
 * BUSINESS LOGIC:
 * - Query is scoped to userId to prevent users from seeing each other's files
 * - We only track views when file actually exists (not null)
 * - Tracking helps the intelligent dashboard show recently accessed files
 *
 * @param {string} fileId - File ID to retrieve
 * @param {string} userId - User ID (verified owner of file)
 *
 * @returns {Promise<File|null>} File document with all metadata or null if not found/not owned
 *
 * EXAMPLE USAGE:
 * ```javascript
 * const file = await getFile('file123', userId);
 * if (file) {
 *   console.log(`Found file: ${file.originalName} (${file.size} bytes)`);
 * } else {
 *   console.log('File not found or not owned by this user');
 * }
 * ```
 */
export async function getFile(fileId, userId) {
  // =====================================================
  // QUERY FILE WITH OWNERSHIP CHECK
  // =====================================================
  // Find only if file exists AND belongs to this user (security)

  const file = await File.findOne({ _id: fileId, userId });

  // =====================================================
  // TRACK VIEW FOR ANALYTICS
  // =====================================================
  // Only track if file actually exists (prevents tracking failed lookups)

  if (file) {
    trackView(userId, 'files');
  }

  return file;
}

// =============================================================================
// FILE UPDATES
// =============================================================================

/**
 * updateFile(fileId, userId, updates)
 * -----------------------------------
 * Update file metadata properties.
 * Cannot update the actual file content (use createFileVersion for that).
 *
 * BUSINESS LOGIC:
 * - Uses a whitelist approach for security (prevent modifying storage keys, checksums, etc.)
 * - Only allows updating user-editable metadata
 * - Runs validators to ensure data consistency
 * - Returns updated document for confirmation
 *
 * @param {string} fileId - File ID to update
 * @param {string} userId - User ID (verified owner)
 * @param {Object} updates - Fields to update (only these are allowed):
 *   - {string} updates.title - New display title for file
 *   - {string} updates.description - New file description
 *   - {string[]} updates.tags - New array of tags for organization
 *   - {boolean} updates.favorite - Mark as favorite (true/false)
 *
 * @returns {Promise<File|null>} Updated file document or null if not found
 *
 * @throws {Error} If validators fail (e.g., invalid field types)
 *
 * EXAMPLE USAGE:
 * ```javascript
 * const updated = await updateFile('file123', userId, {
 *   title: 'Q4 Report (Updated)',
 *   tags: ['reports', 'important'],
 *   favorite: true
 * });
 * console.log(`Updated: ${updated.title}`);
 * ```
 */
export async function updateFile(fileId, userId, updates) {
  // =====================================================
  // WHITELIST ALLOWED UPDATE FIELDS
  // =====================================================
  // Only these fields can be user-modified (security measure)
  // This prevents accidental or malicious modification of storage keys, checksums, etc.

  const allowedUpdates = ['title', 'description', 'tags', 'favorite'];
  const filteredUpdates = {};

  // Filter input to only allowed fields
  // This ensures user can't update fields they shouldn't control
  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }

  // =====================================================
  // UPDATE IN DATABASE
  // =====================================================
  // findOneAndUpdate: Find document and update in one operation
  // new: true = return updated document instead of original
  // runValidators: true = run schema validators on new values

  return File.findOneAndUpdate(
    { _id: fileId, userId },  // Find this file owned by this user
    { $set: filteredUpdates },  // Set the filtered updates
    { new: true, runValidators: true }  // Return updated doc, validate
  );
}

// =============================================================================
// FILE ORGANIZATION
// =============================================================================

/**
 * moveFile(fileId, folderId, userId)
 * ----------------------------------
 * Move a file to a different folder in the hierarchy.
 * Updates the file's folder reference and path, then updates folder statistics.
 *
 * BUSINESS LOGIC:
 * - File must exist and belong to user (ownership check)
 * - Target folder must exist and belong to user (security)
 * - File path is updated to match new folder's path (needed for querying)
 * - Both old and new folder statistics are recalculated
 * - Setting folderId to null moves file to root level
 *
 * @param {string} fileId - File ID to move
 * @param {string|null} folderId - Target folder ID (null = move to root)
 * @param {string} userId - User ID (verified owner of file and folder)
 *
 * @returns {Promise<File|null>} Updated file document or null if file not found
 *
 * @throws {Error} If target folder not found or doesn't belong to user
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Move file to a different folder
 * const moved = await moveFile('file123', 'folder456', userId);
 * console.log(`File path changed to: ${moved.path}`);
 *
 * // Move file to root level
 * const rootFile = await moveFile('file123', null, userId);
 * console.log(`File moved to root: ${rootFile.folderId}`);
 * ```
 */
export async function moveFile(fileId, folderId, userId) {
  // =====================================================
  // FIND AND VERIFY FILE EXISTS
  // =====================================================
  // Check that file exists and belongs to this user

  const file = await File.findOne({ _id: fileId, userId });
  if (!file) return null;  // File not found or not owned by user

  // Save the original folder ID to update stats later
  const oldFolderId = file.folderId;

  // =====================================================
  // VERIFY TARGET FOLDER (SECURITY CHECK)
  // =====================================================
  // Ensure target folder exists and belongs to this user
  // Prevents users from moving files into other users' folders

  let newPath = '/';  // Default path for root level
  if (folderId) {
    // Verify target folder exists and is owned by user
    const folder = await Folder.findOne({ _id: folderId, userId });
    if (!folder) {
      // Folder doesn't exist or user doesn't own it
      const error = new Error('Target folder not found');
      error.statusCode = 404;
      throw error;
    }
    // Use the folder's path so file can be queried by folder hierarchy
    newPath = folder.path;
  }

  // =====================================================
  // UPDATE FILE LOCATION
  // =====================================================
  // Update both folderId and path so file appears in correct location

  file.folderId = folderId || null;  // Set to null if moving to root
  file.path = newPath;  // Update path for folder hierarchy queries
  await file.save();

  // =====================================================
  // RECALCULATE FOLDER STATISTICS
  // =====================================================
  // Both old and new folders need updated counts and sizes

  if (oldFolderId) {
    // Old folder lost one file - recalculate its stats
    await Folder.updateFolderStats(oldFolderId);
  }
  if (folderId) {
    // New folder gained one file - recalculate its stats
    await Folder.updateFolderStats(folderId);
  }

  return file;
}

/**
 * copyFile(fileId, folderId, userId)
 * ----------------------------------
 * Create a complete copy of a file including storage and metadata.
 * The copy is a fully independent file with new storage location.
 *
 * BUSINESS LOGIC:
 * - Source file must exist and belong to user
 * - File data is copied from S3 (actual binary copy, not link)
 * - Thumbnail is also copied if source has one
 * - New file gets fresh metadata (timestamps, counts reset)
 * - Title is appended with "(copy)" for clarity
 * - Shares and entity links are NOT copied (intentional isolation)
 * - Version chain is reset to 1 (new file, not extension of old)
 *
 * @param {string} fileId - Source file ID to copy
 * @param {string|null} folderId - Target folder ID (null = root)
 * @param {string} userId - User ID (verified owner)
 *
 * @returns {Promise<File|null>} New file copy with fresh metadata, or null if source not found
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Create a backup copy of an important document
 * const original = await getFile('file123', userId);
 * const backup = await copyFile('file123', null, userId);
 * console.log(`Created backup: ${backup.title}`);
 * // Output: "Created backup: Important Document (copy)"
 * ```
 */
export async function copyFile(fileId, folderId, userId) {
  // =====================================================
  // VERIFY SOURCE FILE EXISTS
  // =====================================================
  // Must exist and belong to this user

  const sourceFile = await File.findOne({ _id: fileId, userId });
  if (!sourceFile) return null;

  const storage = getDefaultProvider();

  // =====================================================
  // COPY FILE IN STORAGE
  // =====================================================
  // Generate new storage key with same name (ensures same extension)
  // Then copy the actual bytes from source to new location in S3

  const newStorageKey = storage.generateKey(userId, sourceFile.originalName, 'files');
  await storage.copy(sourceFile.storageKey, newStorageKey);

  // =====================================================
  // COPY THUMBNAIL IF IT EXISTS
  // =====================================================
  // Images may have thumbnails - copy those too if present

  let newThumbnailKey = null;
  let newThumbnailUrl = null;
  if (sourceFile.thumbnailKey) {
    // Generate matching thumbnail key based on new file location
    newThumbnailKey = storage.getThumbnailKey(newStorageKey);
    // Copy thumbnail binary from old location to new
    await storage.copy(sourceFile.thumbnailKey, newThumbnailKey);
    // Get public URL for the new thumbnail
    newThumbnailUrl = storage.getPublicUrl(newThumbnailKey);
  }

  // =====================================================
  // GET TARGET FOLDER PATH
  // =====================================================
  // Need folder's path for file organization by hierarchy

  let newPath = '/';  // Default to root
  if (folderId) {
    // Verify folder exists (but don't error if it doesn't - use root instead)
    const folder = await Folder.findOne({ _id: folderId, userId });
    if (folder) {
      newPath = folder.path;  // Use this folder's path
    }
  }

  // =====================================================
  // CREATE NEW DATABASE RECORD
  // =====================================================
  // Copy all metadata from source, but reset certain fields

  const fileData = sourceFile.toObject();  // Convert Mongoose doc to plain object

  // Remove system fields that should NOT be copied to new file
  delete fileData._id;                    // New document needs new ID
  delete fileData.createdAt;              // New file = new creation time
  delete fileData.updatedAt;              // Fresh update time
  delete fileData.downloadCount;          // Reset to 0 (new file)
  delete fileData.lastAccessedAt;         // Fresh slate
  delete fileData.shareSettings;          // Don't copy permissions
  delete fileData.linkedNoteIds;          // Don't copy entity links (independent copy)
  delete fileData.linkedProjectIds;
  delete fileData.linkedTaskIds;

  // Create the new file record
  const newFile = await File.create({
    ...fileData,  // All the metadata fields
    storageKey: newStorageKey,  // New storage location
    filename: path.basename(newStorageKey),  // Extract filename from key
    folderId: folderId || null,  // Target folder (null for root)
    path: newPath,  // Folder path for hierarchy
    thumbnailKey: newThumbnailKey,  // Copy's thumbnail location
    thumbnailUrl: newThumbnailUrl,  // Copy's thumbnail URL
    title: sourceFile.title ? `${sourceFile.title} (copy)` : '',  // Mark as copy
    version: 1,  // Reset version to 1 (new file, not version chain)
    previousVersionId: null,  // No version history
    isLatestVersion: true,  // This is the latest version
  });

  // =====================================================
  // UPDATE FOLDER STATISTICS
  // =====================================================
  // Target folder now contains one more file

  if (folderId) {
    await Folder.updateFolderStats(folderId);
  }

  return newFile;
}

// =============================================================================
// TRASH MANAGEMENT
// =============================================================================

/**
 * trashFile(fileId, userId)
 * -------------------------
 * Move a file to trash (soft delete).
 * File can be restored or permanently deleted later.
 *
 * BUSINESS LOGIC:
 * - Sets isTrashed flag to true (marks as deleted but doesn't remove)
 * - Records trashedAt timestamp for automatic cleanup
 * - Updates folder statistics (file no longer counts toward folder size)
 * - File still exists in database and storage (can be restored)
 * - Returns updated file document for confirmation
 *
 * @param {string} fileId - File ID to move to trash
 * @param {string} userId - User ID (verified owner)
 *
 * @returns {Promise<File|null>} Updated trashed file or null if not found
 *
 * EXAMPLE USAGE:
 * ```javascript
 * const trashed = await trashFile('file123', userId);
 * if (trashed) {
 *   console.log(`File moved to trash at ${trashed.trashedAt}`);
 * }
 * ```
 */
export async function trashFile(fileId, userId) {
  // =====================================================
  // MARK FILE AS TRASHED
  // =====================================================
  // Set isTrashed flag and record timestamp

  const file = await File.findOneAndUpdate(
    { _id: fileId, userId },
    { $set: { isTrashed: true, trashedAt: new Date() } },  // Soft delete
    { new: true }  // Return updated document
  );

  // =====================================================
  // UPDATE FOLDER STATISTICS
  // =====================================================
  // File is now in trash, so folder counts change

  if (file && file.folderId) {
    await Folder.updateFolderStats(file.folderId);
  }

  return file;
}

/**
 * restoreFile(fileId, userId)
 * ---------------------------
 * Restore a file from trash back to active state.
 * Undoes the soft delete, making file visible again.
 *
 * BUSINESS LOGIC:
 * - Removes isTrashed flag (sets to false)
 * - Removes trashedAt timestamp
 * - Updates folder statistics (file counts again)
 * - File becomes visible again in file list
 * - Returns updated file document for confirmation
 * - Returns null if file not found or not in trash
 *
 * @param {string} fileId - File ID to restore
 * @param {string} userId - User ID (verified owner)
 *
 * @returns {Promise<File|null>} Restored file or null if not found/not trashed
 *
 * EXAMPLE USAGE:
 * ```javascript
 * const restored = await restoreFile('file123', userId);
 * if (restored) {
 *   console.log(`File restored from trash`);
 * } else {
 *   console.log('File not found in trash');
 * }
 * ```
 */
export async function restoreFile(fileId, userId) {
  // =====================================================
  // RESTORE FILE FROM TRASH
  // =====================================================
  // Set isTrashed to false and remove trashedAt timestamp
  // Only find files that are actually trashed (isTrashed: true)

  const file = await File.findOneAndUpdate(
    { _id: fileId, userId, isTrashed: true },  // Must be in trash
    {
      $set: { isTrashed: false },  // Mark as not trashed
      $unset: { trashedAt: 1 }  // Remove trash timestamp
    },
    { new: true }  // Return updated document
  );

  // =====================================================
  // UPDATE FOLDER STATISTICS
  // =====================================================
  // File is no longer in trash, so folder counts change

  if (file && file.folderId) {
    await Folder.updateFolderStats(file.folderId);
  }

  return file;
}

/**
 * deleteFile(fileId, userId)
 * --------------------------
 * Permanently and irreversibly delete a file from both storage and database.
 * This is a hard delete (not soft delete/trash).
 *
 * BUSINESS LOGIC:
 * - File must exist and belong to user
 * - Deletes actual bytes from cloud storage (S3)
 * - Deletes thumbnail from storage if it exists
 * - Invalidates all active shares (prevents orphaned shares)
 * - Deletes database record
 * - Updates folder statistics after removal
 * - Continues even if storage deletion fails (DB cleanup still happens)
 *
 * @param {string} fileId - File ID to permanently delete
 * @param {string} userId - User ID (verified owner)
 *
 * @returns {Promise<{deleted: boolean}>} Object with deleted boolean:
 *   - {deleted: true} if file was found and deleted
 *   - {deleted: false} if file not found or doesn't belong to user
 *
 * WARNING: This operation is IRREVERSIBLE. File cannot be recovered.
 *
 * EXAMPLE USAGE:
 * ```javascript
 * const result = await deleteFile('file123', userId);
 * if (result.deleted) {
 *   console.log('File permanently deleted');
 * } else {
 *   console.log('File not found');
 * }
 * ```
 */
export async function deleteFile(fileId, userId) {
  // =====================================================
  // FIND FILE
  // =====================================================
  // Verify file exists and belongs to this user

  const file = await File.findOne({ _id: fileId, userId });
  if (!file) return { deleted: false };  // File not found

  const storage = getDefaultProvider();

  // =====================================================
  // DELETE FROM CLOUD STORAGE
  // =====================================================
  // Remove actual file bytes from S3
  // We use try/catch to ensure DB cleanup happens even if S3 fails

  try {
    // Delete the main file
    await storage.delete(file.storageKey);

    // Delete thumbnail if present (images have both original + thumbnail)
    if (file.thumbnailKey) {
      await storage.delete(file.thumbnailKey);
    }
  } catch (error) {
    // Log the error but continue
    // DB cleanup is still important even if storage deletion fails
    console.error('Error deleting file from storage:', error);
    // Continue anyway - we'll delete from DB
  }

  // =====================================================
  // INVALIDATE ALL SHARES
  // =====================================================
  // If this file was shared with other users, deactivate those shares
  // This prevents orphaned shares pointing to deleted files

  await FileShare.deactivateFileShares(fileId);

  // =====================================================
  // DELETE FROM DATABASE
  // =====================================================
  // Remove the file record from MongoDB

  const folderId = file.folderId;  // Save folder ID for stats update
  await File.deleteOne({ _id: fileId });

  // =====================================================
  // UPDATE FOLDER STATISTICS
  // =====================================================
  // Folder now has one fewer file and less total size

  if (folderId) {
    await Folder.updateFolderStats(folderId);
  }

  return { deleted: true };
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * bulkTrashFiles(fileIds, userId)
 * -------------------------------
 * Move multiple files to trash in a single operation.
 * More efficient than calling trashFile() multiple times.
 *
 * BUSINESS LOGIC:
 * - Marks all specified files as trashed in one query
 * - Records timestamp for each file
 * - Only operates on files owned by user (security)
 * - Returns count of actually modified files
 * - Does not update folder statistics (see note)
 *
 * NOTE: This function does NOT update folder stats for performance.
 * If folder stats need to be accurate, either:
 * 1. Call getFolderStats() to recalculate
 * 2. Use trashFile() one at a time if stats accuracy is critical
 *
 * @param {string[]} fileIds - Array of file IDs to move to trash
 * @param {string} userId - User ID (verified owner)
 *
 * @returns {Promise<{trashed: number}>} Count of files successfully trashed
 *
 * EXAMPLE USAGE:
 * ```javascript
 * const result = await bulkTrashFiles(['file1', 'file2', 'file3'], userId);
 * console.log(`Trashed ${result.trashed} files`);
 * ```
 */
export async function bulkTrashFiles(fileIds, userId) {
  // =====================================================
  // BULK UPDATE TO TRASH
  // =====================================================
  // Mark all specified files as trashed in one operation
  // Much faster than calling trashFile() for each file

  const result = await File.updateMany(
    { _id: { $in: fileIds }, userId },  // Files owned by user
    { $set: { isTrashed: true, trashedAt: new Date() } }  // Mark as trashed
  );

  // =====================================================
  // RETURN COUNT
  // =====================================================
  // modifiedCount = number of documents actually updated

  return { trashed: result.modifiedCount };
}

/**
 * bulkMoveFiles(fileIds, folderId, userId)
 * ----------------------------------------
 * Move multiple files to a target folder in a single operation.
 * More efficient than calling moveFile() multiple times.
 *
 * BUSINESS LOGIC:
 * - Verifies target folder exists and belongs to user (security)
 * - Collects all folders currently containing files (for stats update)
 * - Updates all files in one MongoDB query (efficient)
 * - Updates statistics for both old and new folders
 * - Returns count of actually modified documents
 *
 * @param {string[]} fileIds - Array of file IDs to move
 * @param {string|null} folderId - Target folder ID (null = move to root)
 * @param {string} userId - User ID (verified owner)
 *
 * @returns {Promise<{moved: number}>} Count of files successfully moved
 *
 * @throws {Error} If target folder not found or doesn't belong to user
 *
 * EXAMPLE USAGE:
 * ```javascript
 * const result = await bulkMoveFiles(
 *   ['file1', 'file2', 'file3'],
 *   'folder456',
 *   userId
 * );
 * console.log(`Moved ${result.moved} files to new folder`);
 * ```
 */
export async function bulkMoveFiles(fileIds, folderId, userId) {
  // =====================================================
  // VERIFY TARGET FOLDER EXISTS
  // =====================================================
  // Security: Ensure target folder belongs to this user
  // Prevents moving files into other users' folders

  if (folderId) {
    const folder = await Folder.findOne({ _id: folderId, userId });
    if (!folder) {
      // Target folder doesn't exist or user doesn't own it
      const error = new Error('Target folder not found');
      error.statusCode = 404;
      throw error;
    }
  }

  // =====================================================
  // COLLECT AFFECTED FOLDERS
  // =====================================================
  // Need to know which folders currently contain these files
  // So we can update their statistics after the move

  const files = await File.find({ _id: { $in: fileIds }, userId });
  const affectedFolders = new Set(
    files.map(f => f.folderId?.toString()).filter(Boolean)  // Get folder IDs, exclude empty
  );

  // =====================================================
  // GET TARGET FOLDER PATH
  // =====================================================
  // Files store their hierarchy path for querying by folder

  let newPath = '/';  // Default path for root level
  if (folderId) {
    const folder = await Folder.findById(folderId);
    newPath = folder.path;  // Use folder's path
  }

  // =====================================================
  // BULK UPDATE ALL FILES
  // =====================================================
  // Use MongoDB updateMany for efficient batch operation
  // Only updates files owned by this user (security)

  const result = await File.updateMany(
    { _id: { $in: fileIds }, userId },  // Find these files, owned by user
    { $set: { folderId: folderId || null, path: newPath } }  // Update location
  );

  // =====================================================
  // UPDATE FOLDER STATISTICS
  // =====================================================
  // All affected folders need their file counts and sizes recalculated
  // This includes old folders (lost files) and new folder (gained files)

  // Add target folder to set of affected folders
  if (folderId) {
    affectedFolders.add(folderId);
  }

  // Update stats for all affected folders
  for (const id of affectedFolders) {
    await Folder.updateFolderStats(id);
  }

  return { moved: result.modifiedCount };
}

/**
 * bulkDeleteFiles(fileIds, userId)
 * --------------------------------
 * Permanently delete multiple files from both storage and database.
 * More efficient than calling deleteFile() multiple times.
 *
 * BUSINESS LOGIC:
 * - Finds all files to delete (owned by user)
 * - Collects all storage keys (originals + thumbnails)
 * - Deletes all files from storage in batch
 * - Invalidates any shares of these files
 * - Deletes all database records
 * - Updates statistics for affected folders
 * - Returns count of deleted files
 *
 * @param {string[]} fileIds - Array of file IDs to permanently delete
 * @param {string} userId - User ID (verified owner)
 *
 * @returns {Promise<{deleted: number}>} Count of files permanently deleted
 *
 * WARNING: This operation is IRREVERSIBLE. Files cannot be recovered.
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Permanent delete multiple files
 * const result = await bulkDeleteFiles(
 *   ['file1', 'file2', 'file3'],
 *   userId
 * );
 * console.log(`Permanently deleted ${result.deleted} files`);
 * ```
 */
export async function bulkDeleteFiles(fileIds, userId) {
  // =====================================================
  // FIND FILES TO DELETE
  // =====================================================
  // Only find files owned by this user

  const files = await File.find({ _id: { $in: fileIds }, userId });
  if (files.length === 0) return { deleted: 0 };  // No files found

  const storage = getDefaultProvider();

  // =====================================================
  // COLLECT ALL STORAGE KEYS
  // =====================================================
  // Need keys for both originals and thumbnails

  const keys = [];
  for (const file of files) {
    keys.push(file.storageKey);  // Original file
    if (file.thumbnailKey) {
      keys.push(file.thumbnailKey);  // Thumbnail if exists
    }
  }

  // =====================================================
  // DELETE FROM STORAGE IN BATCH
  // =====================================================
  // All files and thumbnails deleted at once

  await storage.deleteMany(keys);

  // =====================================================
  // INVALIDATE ALL SHARES
  // =====================================================
  // If these files were shared, deactivate the shares

  await FileShare.updateMany(
    { fileId: { $in: fileIds } },
    { $set: { isActive: false } }
  );

  // =====================================================
  // COLLECT AFFECTED FOLDERS
  // =====================================================
  // These folders need their stats recalculated

  const affectedFolders = new Set(
    files.map(f => f.folderId?.toString()).filter(Boolean)
  );

  // =====================================================
  // DELETE FROM DATABASE
  // =====================================================
  // Remove all file records

  await File.deleteMany({ _id: { $in: fileIds }, userId });

  // =====================================================
  // UPDATE FOLDER STATISTICS
  // =====================================================
  // Folders lost files, so their counts and sizes change

  for (const folderId of affectedFolders) {
    await Folder.updateFolderStats(folderId);
  }

  return { deleted: files.length };
}

// =============================================================================
// FAVORITES
// =============================================================================

/**
 * toggleFavorite(fileId, userId)
 * ------------------------------
 * Toggle the favorite (starred) status of a file.
 * If file is favorited, it becomes not favorited and vice versa.
 *
 * BUSINESS LOGIC:
 * - File must exist and belong to user
 * - Simply flips the boolean favorite flag
 * - Useful for quick marking of important files
 * - Favorited files can be filtered in getFiles()
 *
 * @param {string} fileId - File ID to toggle
 * @param {string} userId - User ID (verified owner)
 *
 * @returns {Promise<File|null>} Updated file with toggled favorite status, or null if not found
 *
 * EXAMPLE USAGE:
 * ```javascript
 * const file = await toggleFavorite('file123', userId);
 * if (file) {
 *   console.log(`File favorite is now: ${file.favorite}`);
 * }
 * ```
 */
export async function toggleFavorite(fileId, userId) {
  // =====================================================
  // FIND FILE
  // =====================================================
  // Must exist and belong to this user

  const file = await File.findOne({ _id: fileId, userId });
  if (!file) return null;  // File not found

  // =====================================================
  // TOGGLE FAVORITE FLAG
  // =====================================================
  // Simple boolean flip: true becomes false, false becomes true

  file.favorite = !file.favorite;

  // =====================================================
  // SAVE TO DATABASE
  // =====================================================
  // Persist the change

  await file.save();

  return file;
}

// =============================================================================
// DOWNLOADS
// =============================================================================

/**
 * getDownloadUrl(fileId, userId)
 * ------------------------------
 * Generate a temporary signed URL for downloading a file.
 * Also tracks download for analytics.
 *
 * BUSINESS LOGIC:
 * - File must exist and belong to user
 * - Generates signed URL valid for 1 hour
 * - Signed URLs provide temporary access without permanent links
 * - Download count is incremented for usage tracking
 * - Last accessed time is updated for the intelligent dashboard
 * - Returns metadata needed for the download response
 *
 * WHY SIGNED URLs?
 * Files are stored privately in S3. Direct URLs would be public or require
 * auth headers. Signed URLs embed temporary credentials in the URL itself,
 * allowing direct downloads that expire after set time for security.
 *
 * @param {string} fileId - File ID to download
 * @param {string} userId - User ID (verified owner)
 *
 * @returns {Promise<Object|null>} Download information or null if file not found:
 *   - {string} url - Signed download URL (expires in 1 hour)
 *   - {string} filename - Original filename for Content-Disposition header
 *   - {string} contentType - MIME type (e.g., "application/pdf")
 *   - {number} size - File size in bytes
 *
 * EXAMPLE USAGE:
 * ```javascript
 * const download = await getDownloadUrl('file123', userId);
 * if (download) {
 *   res.header('Content-Disposition', `attachment; filename="${download.filename}"`);
 *   res.redirect(download.url);
 * }
 * ```
 */
export async function getDownloadUrl(fileId, userId) {
  // =====================================================
  // FIND FILE
  // =====================================================
  // Must exist and belong to this user

  const file = await File.findOne({ _id: fileId, userId });
  if (!file) return null;

  const storage = getDefaultProvider();

  // =====================================================
  // GENERATE SIGNED URL
  // =====================================================
  // Temporary URL valid for 1 hour (3600 seconds)
  // After 1 hour, URL expires and cannot be used

  const url = await storage.getSignedUrl(file.storageKey, 3600, 'getObject');

  // =====================================================
  // TRACK DOWNLOAD FOR ANALYTICS
  // =====================================================
  // Increment download count for usage metrics
  // Update access timestamp for intelligent dashboard

  file.downloadCount += 1;  // Track number of downloads
  file.lastAccessedAt = new Date();  // Record when last accessed
  await file.save();  // Persist changes

  // =====================================================
  // RETURN DOWNLOAD INFORMATION
  // =====================================================
  // Include all data needed for HTTP response

  return {
    url,  // The temporary signed URL
    filename: file.originalName,  // For Content-Disposition header
    contentType: file.mimeType,  // For Content-Type header
    size: file.size,  // For Content-Length header
  };
}

// =============================================================================
// FILE VERSIONING
// =============================================================================

/**
 * createFileVersion(fileId, newFile, userId)
 * ------------------------------------------
 * Create a new version of an existing file while keeping version history.
 * Useful for tracking changes over time (like Google Docs version history).
 *
 * BUSINESS LOGIC:
 * - Finds the current latest version of file (marked with isLatestVersion = true)
 * - Marks old version as not latest (makes room for new one)
 * - Uploads the new file using uploadFile() to get storage + processing
 * - Inherits metadata from original (title, description, tags, links)
 * - Creates version chain via previousVersionId (v1 → v2 → v3)
 * - Increments version number for ordering and display
 * - All versions stored in same folder as original
 *
 * VERSION CHAIN STRUCTURE:
 * ```
 * v1 (version=1, isLatestVersion=false, previousVersionId=null)
 *   ← v2 (version=2, isLatestVersion=false, previousVersionId=v1._id)
 *   ← v3 (version=3, isLatestVersion=true, previousVersionId=v2._id) ← LATEST
 * ```
 *
 * @param {string} fileId - Original file ID (any version ID, will find latest)
 * @param {Object} newFile - New file data (Multer file object):
 *   - {Buffer} buffer - File binary data
 *   - {string} originalname - Original filename
 *   - {string} mimetype - MIME type
 * @param {string} userId - User ID (verified owner)
 *
 * @returns {Promise<File>} The newly created version (now latest)
 *
 * @throws {Error} If original file not found or doesn't belong to user
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // User uploads a new version of their document
 * const newVersion = await createFileVersion('file123', req.file, userId);
 * console.log(`Created version ${newVersion.version}`);
 *
 * // Can now retrieve all versions:
 * const allVersions = await getFileVersions('file123', userId);
 * ```
 */
export async function createFileVersion(fileId, newFile, userId) {
  // =====================================================
  // FIND CURRENT LATEST VERSION
  // =====================================================
  // Must find the latest version marked with isLatestVersion = true
  // This ensures we link to the immediate predecessor

  const originalFile = await File.findOne({ _id: fileId, userId, isLatestVersion: true });
  if (!originalFile) {
    // Either file doesn't exist, doesn't belong to user, or not latest version
    const error = new Error('Original file not found');
    error.statusCode = 404;
    throw error;
  }

  // =====================================================
  // MARK ORIGINAL AS NO LONGER LATEST
  // =====================================================
  // This makes room for new version to be the latest

  originalFile.isLatestVersion = false;
  await originalFile.save();

  // =====================================================
  // UPLOAD NEW VERSION
  // =====================================================
  // Use uploadFile() to handle all storage processing (S3 upload, etc.)
  // Inherit metadata from original file so version chain stays coherent

  const newVersion = await uploadFile(newFile, userId, {
    folderId: originalFile.folderId,  // Same folder as original
    title: originalFile.title,  // Same title (identifies file)
    description: originalFile.description,  // Preserve description
    tags: originalFile.tags,  // Same tags for organization
    linkedNoteIds: originalFile.linkedNoteIds,  // Same links to entities
    linkedProjectIds: originalFile.linkedProjectIds,
    linkedTaskIds: originalFile.linkedTaskIds,
  });

  // =====================================================
  // CREATE VERSION CHAIN LINKS
  // =====================================================
  // Link new version to previous one and update version counter

  newVersion.previousVersionId = originalFile._id;  // Points to v2 ← v3
  newVersion.version = originalFile.version + 1;  // Increment version number
  await newVersion.save();

  return newVersion;
}

/**
 * getFileVersions(fileId, userId)
 * -------------------------------
 * Get the version history of a file.
 *
 * @param {string} fileId - File ID (any version)
 * @param {string} userId - User ID
 *
 * @returns {Promise<File[]>} Array of versions (newest first)
 */
export async function getFileVersions(fileId, userId) {
  const file = await File.findOne({ _id: fileId, userId });
  if (!file) return [];

  const versions = [file];

  // Walk backwards through version chain
  let currentId = file.previousVersionId;
  while (currentId) {
    const prevFile = await File.findById(currentId);
    if (!prevFile) break;
    versions.push(prevFile);
    currentId = prevFile.previousVersionId;
  }

  return versions;
}

// =============================================================================
// TAGS AND STATISTICS
// =============================================================================

/**
 * getUserFileTags(userId)
 * -----------------------
 * Get all unique tags used across a user's files.
 *
 * @param {string} userId - User ID
 *
 * @returns {Promise<Array<{tag: string, count: number}>>}
 */
export async function getUserFileTags(userId) {
  return File.getUserTags(userId);
}

/**
 * getStorageStats(userId)
 * -----------------------
 * Get storage usage statistics for a user.
 *
 * @param {string} userId - User ID
 *
 * @returns {Promise<Object>} Storage stats:
 *   - totalBytes: Total storage used
 *   - fileCount: Number of files
 *   - categories: Breakdown by file category
 */
export async function getStorageStats(userId) {
  const [usage, categoryBreakdown] = await Promise.all([
    File.getStorageUsage(userId),
    File.getCategoryBreakdown(userId),
  ]);

  return {
    ...usage,
    categories: categoryBreakdown,
  };
}

// =============================================================================
// RECENT AND TRASHED FILES
// =============================================================================

/**
 * getRecentFiles(userId, limit)
 * -----------------------------
 * Get recently accessed files.
 *
 * @param {string} userId - User ID
 * @param {number} limit - Maximum files to return (default: 10)
 *
 * @returns {Promise<File[]>} Recently accessed files
 */
export async function getRecentFiles(userId, limit = 10) {
  return File.find({
    userId,
    isTrashed: false,
    isLatestVersion: true,
    lastAccessedAt: { $exists: true },
  })
    .sort({ lastAccessedAt: -1 })
    .limit(limit);
}

/**
 * getTrashedFiles(userId, options)
 * --------------------------------
 * Get files in the trash.
 *
 * @param {string} userId - User ID
 * @param {Object} options - Pagination options
 *
 * @returns {Promise<{files: File[], total: number}>}
 */
export async function getTrashedFiles(userId, options = {}) {
  const { page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;

  const [files, total] = await Promise.all([
    File.find({ userId, isTrashed: true })
      .sort({ trashedAt: -1 })
      .skip(skip)
      .limit(limit),
    File.countDocuments({ userId, isTrashed: true }),
  ]);

  return { files, total };
}

/**
 * emptyTrash(userId)
 * ------------------
 * Permanently delete all trashed files.
 *
 * @param {string} userId - User ID
 *
 * @returns {Promise<{deleted: number}>} Count of deleted files
 *
 * WARNING: This is irreversible!
 */
export async function emptyTrash(userId) {
  const trashedFiles = await File.find({ userId, isTrashed: true });
  if (trashedFiles.length === 0) return { deleted: 0 };

  const fileIds = trashedFiles.map(f => f._id);
  return bulkDeleteFiles(fileIds, userId);
}

// =============================================================================
// ENTITY LINKING
// =============================================================================

/**
 * linkFileToEntity(fileId, entityId, entityType, userId)
 * ------------------------------------------------------
 * Create a link between a file and another entity (note, project, or task).
 * Allows files to be attached to and referenced by other entities.
 *
 * BUSINESS LOGIC:
 * - Maps entity type to appropriate file field (e.g., 'note' → 'linkedNoteIds')
 * - Uses MongoDB $addToSet to add link only if not already present (prevents duplicates)
 * - File records which entities it belongs to
 * - Enables efficient querying: find files linked to a specific task, etc.
 *
 * @param {string} fileId - File ID to link
 * @param {string} entityId - ID of the entity being linked to
 * @param {string} entityType - Type of entity: 'note', 'project', or 'task'
 * @param {string} userId - User ID (verified owner)
 *
 * @returns {Promise<File|null>} Updated file with new link added, or null if file not found
 *
 * @throws {Error} If entity type is not 'note', 'project', or 'task'
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Link a file to a note's attachments
 * const file = await linkFileToEntity('file123', 'note456', 'note', userId);
 * console.log(`File now linked to ${file.linkedNoteIds.length} notes`);
 *
 * // Link same file to a project
 * await linkFileToEntity('file123', 'project789', 'project', userId);
 * ```
 */
export async function linkFileToEntity(fileId, entityId, entityType, userId) {
  // =====================================================
  // MAP ENTITY TYPE TO FILE FIELD
  // =====================================================
  // Different entity types use different array fields in the file document

  const fieldMap = {
    note: 'linkedNoteIds',  // File.linkedNoteIds holds note references
    project: 'linkedProjectIds',  // File.linkedProjectIds holds project references
    task: 'linkedTaskIds',  // File.linkedTaskIds holds task references
  };

  const field = fieldMap[entityType];
  if (!field) {
    // Invalid entity type provided
    const error = new Error('Invalid entity type. Must be: note, project, or task');
    error.statusCode = 400;
    throw error;
  }

  // =====================================================
  // ADD LINK TO FILE
  // =====================================================
  // $addToSet: Only add if not already present (prevents duplicate links)

  return File.findOneAndUpdate(
    { _id: fileId, userId },  // Find file owned by user
    { $addToSet: { [field]: entityId } },  // Add entity ID to appropriate array
    { new: true }  // Return updated document
  );
}

/**
 * unlinkFileFromEntity(fileId, entityId, entityType, userId)
 * ----------------------------------------------------------
 * Remove a link between a file and an entity.
 * Useful when detaching files from notes, projects, or tasks.
 *
 * BUSINESS LOGIC:
 * - Maps entity type to appropriate file field (inverse of linkFileToEntity)
 * - Uses MongoDB $pull operator to remove entity ID from array
 * - Silently succeeds if link doesn't exist (idempotent)
 * - Returns updated file document
 *
 * @param {string} fileId - File ID to unlink
 * @param {string} entityId - ID of entity to remove link from
 * @param {string} entityType - Type of entity: 'note', 'project', or 'task'
 * @param {string} userId - User ID (verified owner)
 *
 * @returns {Promise<File|null>} Updated file with link removed, or null if file not found
 *
 * @throws {Error} If entity type is not 'note', 'project', or 'task'
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Remove file from note's attachments
 * const file = await unlinkFileFromEntity('file123', 'note456', 'note', userId);
 * console.log(`File now linked to ${file.linkedNoteIds.length} notes`);
 * ```
 */
export async function unlinkFileFromEntity(fileId, entityId, entityType, userId) {
  // =====================================================
  // MAP ENTITY TYPE TO FILE FIELD
  // =====================================================

  const fieldMap = {
    note: 'linkedNoteIds',
    project: 'linkedProjectIds',
    task: 'linkedTaskIds',
  };

  const field = fieldMap[entityType];
  if (!field) {
    // Invalid entity type provided
    const error = new Error('Invalid entity type. Must be: note, project, or task');
    error.statusCode = 400;
    throw error;
  }

  // =====================================================
  // REMOVE LINK FROM FILE
  // =====================================================
  // $pull: Remove this entity ID from the array (idempotent - safe if not present)

  return File.findOneAndUpdate(
    { _id: fileId, userId },  // Find file owned by user
    { $pull: { [field]: entityId } },  // Remove entity ID from appropriate array
    { new: true }  // Return updated document
  );
}

/**
 * getFilesForEntity(entityId, entityType, userId)
 * -----------------------------------------------
 * Get all files linked to an entity.
 *
 * @param {string} entityId - Entity ID
 * @param {string} entityType - 'note', 'project', or 'task'
 * @param {string} userId - User ID
 *
 * @returns {Promise<File[]>} Linked files
 */
export async function getFilesForEntity(entityId, entityType, userId) {
  const fieldMap = {
    note: 'linkedNoteIds',
    project: 'linkedProjectIds',
    task: 'linkedTaskIds',
  };

  const field = fieldMap[entityType];
  if (!field) {
    throw new Error('Invalid entity type');
  }

  return File.find({
    userId,
    [field]: entityId,
    isTrashed: false,
    isLatestVersion: true,
  });
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all file service functions.
 *
 * USAGE:
 * import fileService from './fileService.js';
 * // OR
 * import { uploadFile, getFiles } from './fileService.js';
 *
 * FUNCTION CATEGORIES:
 * - Upload: uploadFile
 * - Retrieval: getFiles, getFile, getRecentFiles, getTrashedFiles
 * - Updates: updateFile, toggleFavorite
 * - Organization: moveFile, copyFile
 * - Trash: trashFile, restoreFile, deleteFile, emptyTrash
 * - Bulk: bulkTrashFiles, bulkMoveFiles, bulkDeleteFiles
 * - Downloads: getDownloadUrl
 * - Versioning: createFileVersion, getFileVersions
 * - Stats: getUserFileTags, getStorageStats
 * - Linking: linkFileToEntity, unlinkFileFromEntity, getFilesForEntity
 */
export default {
  uploadFile,
  getFiles,
  getFile,
  updateFile,
  moveFile,
  copyFile,
  trashFile,
  restoreFile,
  deleteFile,
  bulkTrashFiles,
  bulkMoveFiles,
  bulkDeleteFiles,
  toggleFavorite,
  getDownloadUrl,
  createFileVersion,
  getFileVersions,
  getUserFileTags,
  getStorageStats,
  getRecentFiles,
  getTrashedFiles,
  emptyTrash,
  linkFileToEntity,
  unlinkFileFromEntity,
  getFilesForEntity,
};
