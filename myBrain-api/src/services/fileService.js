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
// IMPORTS
// =============================================================================

/**
 * Node.js crypto module for generating checksums.
 * Checksums verify file integrity - detect if file was corrupted.
 */
import crypto from 'crypto';

/**
 * Node.js path module for handling file paths and extensions.
 */
import path from 'path';

/**
 * File model - MongoDB schema for file metadata.
 */
import File from '../models/File.js';

/**
 * Folder model - for organizing files into folders.
 */
import Folder from '../models/Folder.js';

/**
 * FileShare model - for tracking shared files.
 */
import FileShare from '../models/FileShare.js';

/**
 * Storage factory - gets the configured storage provider (S3, local, etc.).
 */
import { getDefaultProvider } from './storage/storageFactory.js';

/**
 * Image processing service for thumbnails and optimization.
 */
import * as imageProcessing from './imageProcessingService.js';

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
 * Get a single file by ID.
 *
 * @param {string} fileId - File ID
 * @param {string} userId - User ID (for ownership verification)
 *
 * @returns {Promise<File|null>} File document or null if not found
 */
export async function getFile(fileId, userId) {
  return File.findOne({ _id: fileId, userId });
}

// =============================================================================
// FILE UPDATES
// =============================================================================

/**
 * updateFile(fileId, userId, updates)
 * -----------------------------------
 * Update file metadata (not the file content itself).
 *
 * @param {string} fileId - File ID
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update:
 *   - title: Display title
 *   - description: File description
 *   - tags: Array of tags
 *   - favorite: Boolean favorite status
 *
 * @returns {Promise<File|null>} Updated file or null if not found
 *
 * NOTE: Only allowed fields can be updated (security measure).
 */
export async function updateFile(fileId, userId, updates) {
  // Whitelist of allowed update fields
  const allowedUpdates = ['title', 'description', 'tags', 'favorite'];
  const filteredUpdates = {};

  // Filter to only allowed fields
  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }

  return File.findOneAndUpdate(
    { _id: fileId, userId },
    { $set: filteredUpdates },
    { new: true, runValidators: true }  // Return updated doc, run validators
  );
}

// =============================================================================
// FILE ORGANIZATION
// =============================================================================

/**
 * moveFile(fileId, folderId, userId)
 * ----------------------------------
 * Move a file to a different folder.
 *
 * @param {string} fileId - File ID
 * @param {string} folderId - Target folder ID (null for root)
 * @param {string} userId - User ID
 *
 * @returns {Promise<File|null>} Updated file or null
 *
 * @throws {Error} If target folder not found
 */
export async function moveFile(fileId, folderId, userId) {
  // Find the file
  const file = await File.findOne({ _id: fileId, userId });
  if (!file) return null;

  const oldFolderId = file.folderId;

  // =====================================================
  // VERIFY TARGET FOLDER
  // =====================================================

  let newPath = '/';
  if (folderId) {
    const folder = await Folder.findOne({ _id: folderId, userId });
    if (!folder) {
      throw new Error('Target folder not found');
    }
    newPath = folder.path;
  }

  // =====================================================
  // UPDATE FILE
  // =====================================================

  file.folderId = folderId || null;
  file.path = newPath;
  await file.save();

  // =====================================================
  // UPDATE FOLDER STATISTICS
  // =====================================================
  // Both old and new folders need their stats updated

  if (oldFolderId) {
    await Folder.updateFolderStats(oldFolderId);
  }
  if (folderId) {
    await Folder.updateFolderStats(folderId);
  }

  return file;
}

/**
 * copyFile(fileId, folderId, userId)
 * ----------------------------------
 * Create a copy of a file in a folder.
 *
 * @param {string} fileId - Source file ID
 * @param {string} folderId - Target folder ID
 * @param {string} userId - User ID
 *
 * @returns {Promise<File|null>} New file copy or null
 *
 * COPY BEHAVIOR:
 * - Creates new file in storage (actual copy of bytes)
 * - Creates new database record
 * - Adds "(copy)" to title
 * - Resets download count and access time
 * - Does NOT copy shares or entity links
 */
export async function copyFile(fileId, folderId, userId) {
  const sourceFile = await File.findOne({ _id: fileId, userId });
  if (!sourceFile) return null;

  const storage = getDefaultProvider();

  // =====================================================
  // COPY FILE IN STORAGE
  // =====================================================

  const newStorageKey = storage.generateKey(userId, sourceFile.originalName, 'files');
  await storage.copy(sourceFile.storageKey, newStorageKey);

  // =====================================================
  // COPY THUMBNAIL IF EXISTS
  // =====================================================

  let newThumbnailKey = null;
  let newThumbnailUrl = null;
  if (sourceFile.thumbnailKey) {
    newThumbnailKey = storage.getThumbnailKey(newStorageKey);
    await storage.copy(sourceFile.thumbnailKey, newThumbnailKey);
    newThumbnailUrl = storage.getPublicUrl(newThumbnailKey);
  }

  // =====================================================
  // GET TARGET FOLDER PATH
  // =====================================================

  let newPath = '/';
  if (folderId) {
    const folder = await Folder.findOne({ _id: folderId, userId });
    if (folder) {
      newPath = folder.path;
    }
  }

  // =====================================================
  // CREATE NEW DATABASE RECORD
  // =====================================================

  // Copy most fields from source
  const fileData = sourceFile.toObject();

  // Remove fields that shouldn't be copied
  delete fileData._id;
  delete fileData.createdAt;
  delete fileData.updatedAt;
  delete fileData.downloadCount;
  delete fileData.lastAccessedAt;
  delete fileData.shareSettings;
  delete fileData.linkedNoteIds;
  delete fileData.linkedProjectIds;
  delete fileData.linkedTaskIds;

  const newFile = await File.create({
    ...fileData,
    storageKey: newStorageKey,
    filename: path.basename(newStorageKey),
    folderId: folderId || null,
    path: newPath,
    thumbnailKey: newThumbnailKey,
    thumbnailUrl: newThumbnailUrl,
    title: sourceFile.title ? `${sourceFile.title} (copy)` : '',
    version: 1,
    previousVersionId: null,
    isLatestVersion: true,
  });

  // Update target folder stats
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
 * File can be restored later or permanently deleted.
 *
 * @param {string} fileId - File ID
 * @param {string} userId - User ID
 *
 * @returns {Promise<File|null>} Trashed file or null
 */
export async function trashFile(fileId, userId) {
  const file = await File.findOneAndUpdate(
    { _id: fileId, userId },
    { $set: { isTrashed: true, trashedAt: new Date() } },
    { new: true }
  );

  // Update folder stats (file no longer counts)
  if (file && file.folderId) {
    await Folder.updateFolderStats(file.folderId);
  }

  return file;
}

/**
 * restoreFile(fileId, userId)
 * ---------------------------
 * Restore a file from trash.
 *
 * @param {string} fileId - File ID
 * @param {string} userId - User ID
 *
 * @returns {Promise<File|null>} Restored file or null
 */
export async function restoreFile(fileId, userId) {
  const file = await File.findOneAndUpdate(
    { _id: fileId, userId, isTrashed: true },
    { $set: { isTrashed: false }, $unset: { trashedAt: 1 } },
    { new: true }
  );

  // Update folder stats (file counts again)
  if (file && file.folderId) {
    await Folder.updateFolderStats(file.folderId);
  }

  return file;
}

/**
 * deleteFile(fileId, userId)
 * --------------------------
 * Permanently delete a file.
 * Removes from both storage and database.
 *
 * @param {string} fileId - File ID
 * @param {string} userId - User ID
 *
 * @returns {Promise<{deleted: boolean}>}
 *
 * WARNING: This is irreversible! File cannot be recovered.
 */
export async function deleteFile(fileId, userId) {
  const file = await File.findOne({ _id: fileId, userId });
  if (!file) return { deleted: false };

  const storage = getDefaultProvider();

  // =====================================================
  // DELETE FROM STORAGE
  // =====================================================

  try {
    await storage.delete(file.storageKey);
    if (file.thumbnailKey) {
      await storage.delete(file.thumbnailKey);
    }
  } catch (error) {
    console.error('Error deleting file from storage:', error);
    // Continue anyway - delete from DB even if storage delete fails
  }

  // =====================================================
  // DEACTIVATE SHARES
  // =====================================================
  // Any shares of this file should be invalidated

  await FileShare.deactivateFileShares(fileId);

  // =====================================================
  // DELETE FROM DATABASE
  // =====================================================

  const folderId = file.folderId;
  await File.deleteOne({ _id: fileId });

  // Update folder stats
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
 * Move multiple files to trash at once.
 *
 * @param {string[]} fileIds - Array of file IDs
 * @param {string} userId - User ID
 *
 * @returns {Promise<{trashed: number}>} Count of trashed files
 */
export async function bulkTrashFiles(fileIds, userId) {
  const result = await File.updateMany(
    { _id: { $in: fileIds }, userId },
    { $set: { isTrashed: true, trashedAt: new Date() } }
  );
  return { trashed: result.modifiedCount };
}

/**
 * bulkMoveFiles(fileIds, folderId, userId)
 * ----------------------------------------
 * Move multiple files to a folder at once.
 *
 * @param {string[]} fileIds - Array of file IDs
 * @param {string} folderId - Target folder ID
 * @param {string} userId - User ID
 *
 * @returns {Promise<{moved: number}>} Count of moved files
 *
 * @throws {Error} If target folder not found
 */
export async function bulkMoveFiles(fileIds, folderId, userId) {
  // =====================================================
  // VERIFY TARGET FOLDER
  // =====================================================

  if (folderId) {
    const folder = await Folder.findOne({ _id: folderId, userId });
    if (!folder) {
      throw new Error('Target folder not found');
    }
  }

  // =====================================================
  // GET AFFECTED FOLDERS FOR STATS UPDATE
  // =====================================================

  const files = await File.find({ _id: { $in: fileIds }, userId });
  const affectedFolders = new Set(files.map(f => f.folderId?.toString()).filter(Boolean));

  // Get target folder path
  let newPath = '/';
  if (folderId) {
    const folder = await Folder.findById(folderId);
    newPath = folder.path;
  }

  // =====================================================
  // MOVE FILES
  // =====================================================

  const result = await File.updateMany(
    { _id: { $in: fileIds }, userId },
    { $set: { folderId: folderId || null, path: newPath } }
  );

  // =====================================================
  // UPDATE FOLDER STATISTICS
  // =====================================================

  if (folderId) {
    affectedFolders.add(folderId);
  }
  for (const id of affectedFolders) {
    await Folder.updateFolderStats(id);
  }

  return { moved: result.modifiedCount };
}

/**
 * bulkDeleteFiles(fileIds, userId)
 * --------------------------------
 * Permanently delete multiple files at once.
 *
 * @param {string[]} fileIds - Array of file IDs
 * @param {string} userId - User ID
 *
 * @returns {Promise<{deleted: number}>} Count of deleted files
 *
 * WARNING: This is irreversible!
 */
export async function bulkDeleteFiles(fileIds, userId) {
  const files = await File.find({ _id: { $in: fileIds }, userId });
  if (files.length === 0) return { deleted: 0 };

  const storage = getDefaultProvider();

  // =====================================================
  // COLLECT ALL STORAGE KEYS
  // =====================================================

  const keys = [];
  for (const file of files) {
    keys.push(file.storageKey);
    if (file.thumbnailKey) {
      keys.push(file.thumbnailKey);
    }
  }

  // =====================================================
  // DELETE FROM STORAGE (BATCH)
  // =====================================================

  await storage.deleteMany(keys);

  // =====================================================
  // DEACTIVATE SHARES
  // =====================================================

  await FileShare.updateMany(
    { fileId: { $in: fileIds } },
    { $set: { isActive: false } }
  );

  // =====================================================
  // GET AFFECTED FOLDERS
  // =====================================================

  const affectedFolders = new Set(files.map(f => f.folderId?.toString()).filter(Boolean));

  // =====================================================
  // DELETE FROM DATABASE
  // =====================================================

  await File.deleteMany({ _id: { $in: fileIds }, userId });

  // =====================================================
  // UPDATE FOLDER STATISTICS
  // =====================================================

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
 * Toggle the favorite status of a file.
 *
 * @param {string} fileId - File ID
 * @param {string} userId - User ID
 *
 * @returns {Promise<File|null>} Updated file or null
 */
export async function toggleFavorite(fileId, userId) {
  const file = await File.findOne({ _id: fileId, userId });
  if (!file) return null;

  // Toggle the boolean
  file.favorite = !file.favorite;
  await file.save();

  return file;
}

// =============================================================================
// DOWNLOADS
// =============================================================================

/**
 * getDownloadUrl(fileId, userId)
 * ------------------------------
 * Get a signed URL for downloading a file.
 * Signed URLs are temporary and expire after the specified time.
 *
 * @param {string} fileId - File ID
 * @param {string} userId - User ID
 *
 * @returns {Promise<Object|null>} Download info:
 *   - url: Signed download URL
 *   - filename: Original filename
 *   - contentType: MIME type
 *   - size: File size in bytes
 *
 * SIGNED URLs:
 * - Temporary URLs that grant access to private files
 * - Expire after set time (1 hour in this case)
 * - Prevent unauthorized access to storage
 */
export async function getDownloadUrl(fileId, userId) {
  const file = await File.findOne({ _id: fileId, userId });
  if (!file) return null;

  const storage = getDefaultProvider();

  // Generate signed URL valid for 1 hour (3600 seconds)
  const url = await storage.getSignedUrl(file.storageKey, 3600, 'getObject');

  // Track download
  file.downloadCount += 1;
  file.lastAccessedAt = new Date();
  await file.save();

  return {
    url,
    filename: file.originalName,
    contentType: file.mimeType,
    size: file.size,
  };
}

// =============================================================================
// FILE VERSIONING
// =============================================================================

/**
 * createFileVersion(fileId, newFile, userId)
 * ------------------------------------------
 * Create a new version of an existing file.
 * Used when updating a file's content while keeping history.
 *
 * @param {string} fileId - Original file ID
 * @param {Object} newFile - New file data (Multer file object)
 * @param {string} userId - User ID
 *
 * @returns {Promise<File>} The new version
 *
 * @throws {Error} If original file not found
 *
 * VERSION CHAIN:
 * Each version points to its predecessor via previousVersionId.
 * Only the latest version has isLatestVersion = true.
 *
 * v1 ← v2 ← v3 (latest)
 */
export async function createFileVersion(fileId, newFile, userId) {
  // Find the current latest version
  const originalFile = await File.findOne({ _id: fileId, userId, isLatestVersion: true });
  if (!originalFile) {
    throw new Error('Original file not found');
  }

  // Mark original as not latest
  originalFile.isLatestVersion = false;
  await originalFile.save();

  // Upload new version (inherits metadata from original)
  const newVersion = await uploadFile(newFile, userId, {
    folderId: originalFile.folderId,
    title: originalFile.title,
    description: originalFile.description,
    tags: originalFile.tags,
    linkedNoteIds: originalFile.linkedNoteIds,
    linkedProjectIds: originalFile.linkedProjectIds,
    linkedTaskIds: originalFile.linkedTaskIds,
  });

  // Link to previous version
  newVersion.previousVersionId = originalFile._id;
  newVersion.version = originalFile.version + 1;
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
 * Link a file to another entity (note, project, or task).
 * Linked files appear in the entity's attachments.
 *
 * @param {string} fileId - File ID
 * @param {string} entityId - Entity ID
 * @param {string} entityType - 'note', 'project', or 'task'
 * @param {string} userId - User ID
 *
 * @returns {Promise<File|null>} Updated file
 *
 * @throws {Error} If invalid entity type
 */
export async function linkFileToEntity(fileId, entityId, entityType, userId) {
  // Map entity type to the appropriate field
  const fieldMap = {
    note: 'linkedNoteIds',
    project: 'linkedProjectIds',
    task: 'linkedTaskIds',
  };

  const field = fieldMap[entityType];
  if (!field) {
    throw new Error('Invalid entity type');
  }

  // $addToSet adds to array only if not already present
  return File.findOneAndUpdate(
    { _id: fileId, userId },
    { $addToSet: { [field]: entityId } },
    { new: true }
  );
}

/**
 * unlinkFileFromEntity(fileId, entityId, entityType, userId)
 * ----------------------------------------------------------
 * Remove link between a file and an entity.
 *
 * @param {string} fileId - File ID
 * @param {string} entityId - Entity ID
 * @param {string} entityType - 'note', 'project', or 'task'
 * @param {string} userId - User ID
 *
 * @returns {Promise<File|null>} Updated file
 */
export async function unlinkFileFromEntity(fileId, entityId, entityType, userId) {
  const fieldMap = {
    note: 'linkedNoteIds',
    project: 'linkedProjectIds',
    task: 'linkedTaskIds',
  };

  const field = fieldMap[entityType];
  if (!field) {
    throw new Error('Invalid entity type');
  }

  // $pull removes from array
  return File.findOneAndUpdate(
    { _id: fileId, userId },
    { $pull: { [field]: entityId } },
    { new: true }
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
