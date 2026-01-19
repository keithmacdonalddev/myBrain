import crypto from 'crypto';
import path from 'path';
import File from '../models/File.js';
import Folder from '../models/Folder.js';
import FileShare from '../models/FileShare.js';
import { getDefaultProvider } from './storage/storageFactory.js';
import * as imageProcessing from './imageProcessingService.js';

// Forbidden file extensions for security
const FORBIDDEN_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.jar',
  '.msi', '.dll', '.scr', '.com', '.pif', '.hta', '.cpl', '.msc',
];

/**
 * Upload a file to storage and save metadata
 * @param {Object} file - Multer file object
 * @param {string} userId - User ID
 * @param {Object} options - Upload options
 * @returns {Promise<File>}
 */
export async function uploadFile(file, userId, options = {}) {
  const {
    folderId = null,
    title = '',
    description = '',
    tags = [],
    linkedNoteIds = [],
    linkedProjectIds = [],
    linkedTaskIds = [],
  } = options;

  const storage = getDefaultProvider();
  const extension = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;
  const fileCategory = File.getCategoryFromMimeType(mimeType);

  // Security: check forbidden extensions
  if (FORBIDDEN_EXTENSIONS.includes(extension)) {
    throw new Error(`File type ${extension} is not allowed for security reasons`);
  }

  // Generate storage key
  const storageKey = storage.generateKey(userId, file.originalname, 'files');

  // Process images specially
  let thumbnailKey = null;
  let thumbnailUrl = null;
  let imageMetadata = {};

  if (fileCategory === 'image') {
    try {
      const processed = await imageProcessing.processImage(file.buffer, {
        generateThumbnail: true,
        optimizeOriginal: true,
      });

      // Upload thumbnail
      thumbnailKey = storage.getThumbnailKey(storageKey);
      await storage.upload(processed.thumbnail, thumbnailKey, {
        contentType: 'image/jpeg',
        metadata: { type: 'thumbnail', originalKey: storageKey },
      });
      thumbnailUrl = storage.getPublicUrl(thumbnailKey);

      // Use processed original if optimized
      if (processed.metadata.wasResized) {
        file.buffer = processed.original;
      }

      // Extract image metadata
      imageMetadata = {
        width: processed.metadata.width,
        height: processed.metadata.height,
        aspectRatio: processed.metadata.aspectRatio,
        dominantColor: processed.metadata.dominantColor,
        colors: processed.metadata.colors,
      };
    } catch (error) {
      console.error('Image processing failed:', error);
      // Continue with original file if processing fails
    }
  }

  // Upload main file
  const uploadResult = await storage.upload(file.buffer, storageKey, {
    contentType: mimeType,
    metadata: {
      originalName: file.originalname,
      userId,
    },
  });

  // Get folder path if in a folder
  let filePath = '/';
  if (folderId) {
    const folder = await Folder.findById(folderId);
    if (folder) {
      filePath = folder.path;
    }
  }

  // Calculate checksums
  const md5 = crypto.createHash('md5').update(file.buffer).digest('hex');
  const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');

  // Create file record
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
    scanStatus: 'skipped', // TODO: Implement virus scanning
    ...imageMetadata,
  });

  // Update folder stats
  if (folderId) {
    await Folder.updateFolderStats(folderId);
  }

  return fileRecord;
}

/**
 * Get files for a user with filtering
 * @param {string} userId - User ID
 * @param {Object} options - Filter options
 * @returns {Promise<{files: File[], total: number, pagination: Object}>}
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

  const query = { userId, isTrashed, isLatestVersion: true };

  // Apply filters
  if (folderId !== undefined) {
    query.folderId = folderId || null;
  }

  if (fileCategory) {
    query.fileCategory = fileCategory;
  }

  if (favorite !== undefined) {
    query.favorite = favorite === 'true' || favorite === true;
  }

  if (tags && tags.length > 0) {
    const tagArray = Array.isArray(tags) ? tags : tags.split(',');
    query.tags = { $all: tagArray };
  }

  // Text search
  if (q && q.trim()) {
    query.$text = { $search: q };
  }

  const skip = (page - 1) * limit;

  // Parse sort
  let sortObj = {};
  if (q && q.trim()) {
    sortObj = { score: { $meta: 'textScore' } };
  }
  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  let queryBuilder = File.find(query);
  if (q && q.trim()) {
    queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } });
  }

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
 * Get a single file by ID
 * @param {string} fileId - File ID
 * @param {string} userId - User ID
 * @returns {Promise<File|null>}
 */
export async function getFile(fileId, userId) {
  return File.findOne({ _id: fileId, userId });
}

/**
 * Update file metadata
 * @param {string} fileId - File ID
 * @param {string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<File|null>}
 */
export async function updateFile(fileId, userId, updates) {
  const allowedUpdates = ['title', 'description', 'tags', 'favorite'];
  const filteredUpdates = {};

  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }

  return File.findOneAndUpdate(
    { _id: fileId, userId },
    { $set: filteredUpdates },
    { new: true, runValidators: true }
  );
}

/**
 * Move file to a folder
 * @param {string} fileId - File ID
 * @param {string} folderId - Target folder ID (null for root)
 * @param {string} userId - User ID
 * @returns {Promise<File|null>}
 */
export async function moveFile(fileId, folderId, userId) {
  const file = await File.findOne({ _id: fileId, userId });
  if (!file) return null;

  const oldFolderId = file.folderId;

  // Get new path
  let newPath = '/';
  if (folderId) {
    const folder = await Folder.findOne({ _id: folderId, userId });
    if (!folder) {
      throw new Error('Target folder not found');
    }
    newPath = folder.path;
  }

  file.folderId = folderId || null;
  file.path = newPath;
  await file.save();

  // Update folder stats
  if (oldFolderId) {
    await Folder.updateFolderStats(oldFolderId);
  }
  if (folderId) {
    await Folder.updateFolderStats(folderId);
  }

  return file;
}

/**
 * Copy a file
 * @param {string} fileId - Source file ID
 * @param {string} folderId - Target folder ID
 * @param {string} userId - User ID
 * @returns {Promise<File|null>}
 */
export async function copyFile(fileId, folderId, userId) {
  const sourceFile = await File.findOne({ _id: fileId, userId });
  if (!sourceFile) return null;

  const storage = getDefaultProvider();

  // Generate new storage key
  const newStorageKey = storage.generateKey(userId, sourceFile.originalName, 'files');

  // Copy file in storage
  await storage.copy(sourceFile.storageKey, newStorageKey);

  // Copy thumbnail if exists
  let newThumbnailKey = null;
  let newThumbnailUrl = null;
  if (sourceFile.thumbnailKey) {
    newThumbnailKey = storage.getThumbnailKey(newStorageKey);
    await storage.copy(sourceFile.thumbnailKey, newThumbnailKey);
    newThumbnailUrl = storage.getPublicUrl(newThumbnailKey);
  }

  // Get folder path
  let newPath = '/';
  if (folderId) {
    const folder = await Folder.findOne({ _id: folderId, userId });
    if (folder) {
      newPath = folder.path;
    }
  }

  // Create new file record (copy most fields)
  const fileData = sourceFile.toObject();
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

  // Update folder stats
  if (folderId) {
    await Folder.updateFolderStats(folderId);
  }

  return newFile;
}

/**
 * Move file to trash
 * @param {string} fileId - File ID
 * @param {string} userId - User ID
 * @returns {Promise<File|null>}
 */
export async function trashFile(fileId, userId) {
  const file = await File.findOneAndUpdate(
    { _id: fileId, userId },
    { $set: { isTrashed: true, trashedAt: new Date() } },
    { new: true }
  );

  if (file && file.folderId) {
    await Folder.updateFolderStats(file.folderId);
  }

  return file;
}

/**
 * Restore file from trash
 * @param {string} fileId - File ID
 * @param {string} userId - User ID
 * @returns {Promise<File|null>}
 */
export async function restoreFile(fileId, userId) {
  const file = await File.findOneAndUpdate(
    { _id: fileId, userId, isTrashed: true },
    { $set: { isTrashed: false }, $unset: { trashedAt: 1 } },
    { new: true }
  );

  if (file && file.folderId) {
    await Folder.updateFolderStats(file.folderId);
  }

  return file;
}

/**
 * Permanently delete a file
 * @param {string} fileId - File ID
 * @param {string} userId - User ID
 * @returns {Promise<{deleted: boolean}>}
 */
export async function deleteFile(fileId, userId) {
  const file = await File.findOne({ _id: fileId, userId });
  if (!file) return { deleted: false };

  const storage = getDefaultProvider();

  // Delete from storage
  try {
    await storage.delete(file.storageKey);
    if (file.thumbnailKey) {
      await storage.delete(file.thumbnailKey);
    }
  } catch (error) {
    console.error('Error deleting file from storage:', error);
  }

  // Deactivate any shares
  await FileShare.deactivateFileShares(fileId);

  // Delete file record
  const folderId = file.folderId;
  await File.deleteOne({ _id: fileId });

  // Update folder stats
  if (folderId) {
    await Folder.updateFolderStats(folderId);
  }

  return { deleted: true };
}

/**
 * Bulk trash files
 * @param {string[]} fileIds - File IDs
 * @param {string} userId - User ID
 * @returns {Promise<{trashed: number}>}
 */
export async function bulkTrashFiles(fileIds, userId) {
  const result = await File.updateMany(
    { _id: { $in: fileIds }, userId },
    { $set: { isTrashed: true, trashedAt: new Date() } }
  );
  return { trashed: result.modifiedCount };
}

/**
 * Bulk move files
 * @param {string[]} fileIds - File IDs
 * @param {string} folderId - Target folder ID
 * @param {string} userId - User ID
 * @returns {Promise<{moved: number}>}
 */
export async function bulkMoveFiles(fileIds, folderId, userId) {
  // Verify folder ownership
  if (folderId) {
    const folder = await Folder.findOne({ _id: folderId, userId });
    if (!folder) {
      throw new Error('Target folder not found');
    }
  }

  // Get affected folders before move
  const files = await File.find({ _id: { $in: fileIds }, userId });
  const affectedFolders = new Set(files.map(f => f.folderId?.toString()).filter(Boolean));

  // Get new path
  let newPath = '/';
  if (folderId) {
    const folder = await Folder.findById(folderId);
    newPath = folder.path;
  }

  const result = await File.updateMany(
    { _id: { $in: fileIds }, userId },
    { $set: { folderId: folderId || null, path: newPath } }
  );

  // Update folder stats
  if (folderId) {
    affectedFolders.add(folderId);
  }
  for (const id of affectedFolders) {
    await Folder.updateFolderStats(id);
  }

  return { moved: result.modifiedCount };
}

/**
 * Bulk delete files permanently
 * @param {string[]} fileIds - File IDs
 * @param {string} userId - User ID
 * @returns {Promise<{deleted: number}>}
 */
export async function bulkDeleteFiles(fileIds, userId) {
  const files = await File.find({ _id: { $in: fileIds }, userId });
  if (files.length === 0) return { deleted: 0 };

  const storage = getDefaultProvider();

  // Collect storage keys
  const keys = [];
  for (const file of files) {
    keys.push(file.storageKey);
    if (file.thumbnailKey) {
      keys.push(file.thumbnailKey);
    }
  }

  // Delete from storage
  await storage.deleteMany(keys);

  // Deactivate shares
  await FileShare.updateMany(
    { fileId: { $in: fileIds } },
    { $set: { isActive: false } }
  );

  // Get affected folders
  const affectedFolders = new Set(files.map(f => f.folderId?.toString()).filter(Boolean));

  // Delete from database
  await File.deleteMany({ _id: { $in: fileIds }, userId });

  // Update folder stats
  for (const folderId of affectedFolders) {
    await Folder.updateFolderStats(folderId);
  }

  return { deleted: files.length };
}

/**
 * Toggle favorite status
 * @param {string} fileId - File ID
 * @param {string} userId - User ID
 * @returns {Promise<File|null>}
 */
export async function toggleFavorite(fileId, userId) {
  const file = await File.findOne({ _id: fileId, userId });
  if (!file) return null;

  file.favorite = !file.favorite;
  await file.save();

  return file;
}

/**
 * Get download URL for a file
 * @param {string} fileId - File ID
 * @param {string} userId - User ID
 * @returns {Promise<{url: string, filename: string}|null>}
 */
export async function getDownloadUrl(fileId, userId) {
  const file = await File.findOne({ _id: fileId, userId });
  if (!file) return null;

  const storage = getDefaultProvider();
  const url = await storage.getSignedUrl(file.storageKey, 3600, 'getObject');

  // Update access tracking
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

/**
 * Create a new version of a file
 * @param {string} fileId - Original file ID
 * @param {Object} newFile - New file data
 * @param {string} userId - User ID
 * @returns {Promise<File>}
 */
export async function createFileVersion(fileId, newFile, userId) {
  const originalFile = await File.findOne({ _id: fileId, userId, isLatestVersion: true });
  if (!originalFile) {
    throw new Error('Original file not found');
  }

  // Mark original as not latest
  originalFile.isLatestVersion = false;
  await originalFile.save();

  // Upload new version
  const newVersion = await uploadFile(newFile, userId, {
    folderId: originalFile.folderId,
    title: originalFile.title,
    description: originalFile.description,
    tags: originalFile.tags,
    linkedNoteIds: originalFile.linkedNoteIds,
    linkedProjectIds: originalFile.linkedProjectIds,
    linkedTaskIds: originalFile.linkedTaskIds,
  });

  // Link version chain
  newVersion.previousVersionId = originalFile._id;
  newVersion.version = originalFile.version + 1;
  await newVersion.save();

  return newVersion;
}

/**
 * Get version history for a file
 * @param {string} fileId - File ID
 * @param {string} userId - User ID
 * @returns {Promise<File[]>}
 */
export async function getFileVersions(fileId, userId) {
  const file = await File.findOne({ _id: fileId, userId });
  if (!file) return [];

  const versions = [file];

  // Walk back through version chain
  let currentId = file.previousVersionId;
  while (currentId) {
    const prevFile = await File.findById(currentId);
    if (!prevFile) break;
    versions.push(prevFile);
    currentId = prevFile.previousVersionId;
  }

  return versions;
}

/**
 * Get all unique tags for a user's files
 * @param {string} userId - User ID
 * @returns {Promise<Array<{tag: string, count: number}>>}
 */
export async function getUserFileTags(userId) {
  return File.getUserTags(userId);
}

/**
 * Get storage usage statistics
 * @param {string} userId - User ID
 * @returns {Promise<Object>}
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

/**
 * Get recently accessed files
 * @param {string} userId - User ID
 * @param {number} limit - Number of files
 * @returns {Promise<File[]>}
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
 * Get trashed files
 * @param {string} userId - User ID
 * @param {Object} options - Pagination options
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
 * Empty trash (permanently delete all trashed files)
 * @param {string} userId - User ID
 * @returns {Promise<{deleted: number}>}
 */
export async function emptyTrash(userId) {
  const trashedFiles = await File.find({ userId, isTrashed: true });
  if (trashedFiles.length === 0) return { deleted: 0 };

  const fileIds = trashedFiles.map(f => f._id);
  return bulkDeleteFiles(fileIds, userId);
}

/**
 * Link file to an entity (note, project, task)
 * @param {string} fileId - File ID
 * @param {string} entityId - Entity ID
 * @param {string} entityType - Entity type ('note', 'project', 'task')
 * @param {string} userId - User ID
 * @returns {Promise<File|null>}
 */
export async function linkFileToEntity(fileId, entityId, entityType, userId) {
  const fieldMap = {
    note: 'linkedNoteIds',
    project: 'linkedProjectIds',
    task: 'linkedTaskIds',
  };

  const field = fieldMap[entityType];
  if (!field) {
    throw new Error('Invalid entity type');
  }

  return File.findOneAndUpdate(
    { _id: fileId, userId },
    { $addToSet: { [field]: entityId } },
    { new: true }
  );
}

/**
 * Unlink file from an entity
 * @param {string} fileId - File ID
 * @param {string} entityId - Entity ID
 * @param {string} entityType - Entity type
 * @param {string} userId - User ID
 * @returns {Promise<File|null>}
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

  return File.findOneAndUpdate(
    { _id: fileId, userId },
    { $pull: { [field]: entityId } },
    { new: true }
  );
}

/**
 * Get files linked to an entity
 * @param {string} entityId - Entity ID
 * @param {string} entityType - Entity type
 * @param {string} userId - User ID
 * @returns {Promise<File[]>}
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
