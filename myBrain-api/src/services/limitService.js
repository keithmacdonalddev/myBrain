import RoleConfig from '../models/RoleConfig.js';
import File from '../models/File.js';
import Folder from '../models/Folder.js';
import FileShare from '../models/FileShare.js';

/**
 * Limit Service
 * Handles checking and enforcing usage limits for users
 */

// Map resource types to their corresponding limit keys
const RESOURCE_LIMIT_MAP = {
  notes: 'maxNotes',
  tasks: 'maxTasks',
  projects: 'maxProjects',
  events: 'maxEvents',
  images: 'maxImages',
  categories: 'maxCategories',
  files: 'maxFiles',
  folders: 'maxFolders',
};

// Map resource types to their corresponding usage keys
const RESOURCE_USAGE_MAP = {
  notes: 'notes',
  tasks: 'tasks',
  projects: 'projects',
  events: 'events',
  images: 'images',
  categories: 'categories',
  files: 'files',
  folders: 'folders',
};

// Forbidden file extensions for security
const FORBIDDEN_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.jar',
  '.msi', '.dll', '.scr', '.com', '.pif', '.hta', '.cpl', '.msc',
];

/**
 * Check if a user can create a new resource of the given type
 * @param {Object} user - The user document (with role)
 * @param {string} resourceType - Type of resource (notes, tasks, projects, events, images, categories)
 * @returns {Object} - { allowed: boolean, current: number, max: number, message: string }
 */
async function canCreate(user, resourceType) {
  const limitKey = RESOURCE_LIMIT_MAP[resourceType];
  const usageKey = RESOURCE_USAGE_MAP[resourceType];

  if (!limitKey || !usageKey) {
    return {
      allowed: true,
      current: 0,
      max: -1,
      message: 'Unknown resource type'
    };
  }

  try {
    // Get role configuration
    const roleConfig = await RoleConfig.getConfig(user.role);

    // Get effective limits for this user
    const effectiveLimits = user.getEffectiveLimits(roleConfig);
    const maxLimit = effectiveLimits[limitKey];

    // -1 means unlimited
    if (maxLimit === -1) {
      return {
        allowed: true,
        current: 0,
        max: -1,
        message: 'Unlimited'
      };
    }

    // Get current usage
    const usage = await user.getCurrentUsage();
    const currentCount = usage[usageKey] || 0;

    const allowed = currentCount < maxLimit;

    return {
      allowed,
      current: currentCount,
      max: maxLimit,
      message: allowed
        ? `${maxLimit - currentCount} ${resourceType} remaining`
        : `You have reached your limit of ${maxLimit} ${resourceType}. Upgrade to premium for unlimited ${resourceType}.`
    };
  } catch (error) {
    console.error(`[LimitService] Error checking ${resourceType} limit:`, error);
    // On error, allow the operation to prevent blocking users
    return {
      allowed: true,
      current: 0,
      max: -1,
      message: 'Unable to verify limits'
    };
  }
}

/**
 * Check if a user can upload an image with the given file size
 * @param {Object} user - The user document
 * @param {number} fileSize - Size of the file in bytes
 * @returns {Object} - { allowed: boolean, currentBytes: number, maxBytes: number, currentCount: number, maxCount: number, message: string }
 */
async function canUploadImage(user, fileSize) {
  try {
    // Get role configuration
    const roleConfig = await RoleConfig.getConfig(user.role);

    // Get effective limits for this user
    const effectiveLimits = user.getEffectiveLimits(roleConfig);
    const maxImages = effectiveLimits.maxImages;
    const maxStorageBytes = effectiveLimits.maxStorageBytes;

    // Get current usage
    const usage = await user.getCurrentUsage();
    const currentImages = usage.images || 0;
    const currentStorageBytes = usage.storageBytes || 0;

    // Check image count limit
    if (maxImages !== -1 && currentImages >= maxImages) {
      return {
        allowed: false,
        currentBytes: currentStorageBytes,
        maxBytes: maxStorageBytes,
        currentCount: currentImages,
        maxCount: maxImages,
        reason: 'IMAGE_COUNT_EXCEEDED',
        message: `You have reached your limit of ${maxImages} images. Upgrade to premium for unlimited images.`
      };
    }

    // Check storage limit
    if (maxStorageBytes !== -1 && (currentStorageBytes + fileSize) > maxStorageBytes) {
      const maxMB = Math.round(maxStorageBytes / (1024 * 1024));
      const usedMB = Math.round(currentStorageBytes / (1024 * 1024));
      const fileMB = Math.round(fileSize / (1024 * 1024) * 10) / 10;

      return {
        allowed: false,
        currentBytes: currentStorageBytes,
        maxBytes: maxStorageBytes,
        currentCount: currentImages,
        maxCount: maxImages,
        reason: 'STORAGE_EXCEEDED',
        message: `This file (${fileMB}MB) would exceed your storage limit. You've used ${usedMB}MB of ${maxMB}MB. Upgrade to premium for unlimited storage.`
      };
    }

    const remainingImages = maxImages === -1 ? 'Unlimited' : maxImages - currentImages;
    const remainingStorage = maxStorageBytes === -1
      ? 'Unlimited'
      : `${Math.round((maxStorageBytes - currentStorageBytes) / (1024 * 1024))}MB`;

    return {
      allowed: true,
      currentBytes: currentStorageBytes,
      maxBytes: maxStorageBytes,
      currentCount: currentImages,
      maxCount: maxImages,
      message: `${remainingImages} images and ${remainingStorage} storage remaining`
    };
  } catch (error) {
    console.error('[LimitService] Error checking image upload limit:', error);
    // On error, allow the operation to prevent blocking users
    return {
      allowed: true,
      currentBytes: 0,
      maxBytes: -1,
      currentCount: 0,
      maxCount: -1,
      message: 'Unable to verify limits'
    };
  }
}

/**
 * Get full limit status for a user
 * @param {Object} user - The user document
 * @returns {Object} - Full limit status including all limits and usage
 */
async function getUserLimitStatus(user) {
  try {
    // Get role configuration
    const roleConfig = await RoleConfig.getConfig(user.role);

    // Get effective limits for this user
    const effectiveLimits = user.getEffectiveLimits(roleConfig);

    // Get current usage
    const usage = await user.getCurrentUsage();

    // Build status for each resource type
    const status = {};
    for (const [resourceType, limitKey] of Object.entries(RESOURCE_LIMIT_MAP)) {
      const usageKey = RESOURCE_USAGE_MAP[resourceType];
      const max = effectiveLimits[limitKey];
      const current = usage[usageKey] || 0;

      status[resourceType] = {
        current,
        max,
        unlimited: max === -1,
        remaining: max === -1 ? null : Math.max(0, max - current),
        percentage: max === -1 ? 0 : Math.round((current / max) * 100)
      };
    }

    // Add storage status
    const maxStorage = effectiveLimits.maxStorageBytes;
    const currentStorage = usage.storageBytes || 0;

    status.storage = {
      currentBytes: currentStorage,
      maxBytes: maxStorage,
      unlimited: maxStorage === -1,
      remaining: maxStorage === -1 ? null : Math.max(0, maxStorage - currentStorage),
      percentage: maxStorage === -1 ? 0 : Math.round((currentStorage / maxStorage) * 100),
      // Human-readable versions
      currentFormatted: formatBytes(currentStorage),
      maxFormatted: maxStorage === -1 ? 'Unlimited' : formatBytes(maxStorage),
      remainingFormatted: maxStorage === -1 ? 'Unlimited' : formatBytes(Math.max(0, maxStorage - currentStorage))
    };

    return {
      role: user.role,
      roleDefaults: roleConfig.limits,
      userOverrides: user.limitOverrides ? Object.fromEntries(user.limitOverrides) : {},
      effectiveLimits,
      usage,
      status
    };
  } catch (error) {
    console.error('[LimitService] Error getting user limit status:', error);
    throw error;
  }
}

/**
 * Format bytes into human-readable string
 * @param {number} bytes - Number of bytes
 * @returns {string} - Formatted string (e.g., "50 MB")
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if a user can upload a file with the given file size and type
 * @param {Object} user - The user document
 * @param {number} fileSize - Size of the file in bytes
 * @param {string} mimeType - MIME type of the file
 * @param {string} extension - File extension (including dot)
 * @returns {Object} - { allowed: boolean, reason?: string, message: string, ... }
 */
async function canUploadFile(user, fileSize, mimeType, extension) {
  try {
    // Check forbidden extensions
    if (extension && FORBIDDEN_EXTENSIONS.includes(extension.toLowerCase())) {
      return {
        allowed: false,
        reason: 'FORBIDDEN_TYPE',
        message: `File type ${extension} is not allowed for security reasons.`
      };
    }

    // Get role configuration
    const roleConfig = await RoleConfig.getConfig(user.role);

    // Get effective limits for this user
    const effectiveLimits = user.getEffectiveLimits(roleConfig);
    const maxFiles = effectiveLimits.maxFiles || -1;
    const maxFileSize = effectiveLimits.maxFileSize || -1;
    const maxStorageBytes = effectiveLimits.maxStorageBytes;

    // Check per-file size limit
    if (maxFileSize !== -1 && fileSize > maxFileSize) {
      const maxMB = Math.round(maxFileSize / (1024 * 1024));
      const fileMB = Math.round(fileSize / (1024 * 1024) * 10) / 10;
      return {
        allowed: false,
        reason: 'FILE_TOO_LARGE',
        message: `This file (${fileMB}MB) exceeds the maximum allowed file size of ${maxMB}MB.`
      };
    }

    // Get current file usage
    const fileUsage = await File.getStorageUsage(user._id);
    const currentFiles = fileUsage.fileCount - fileUsage.trashedCount;
    const currentStorageBytes = fileUsage.totalSize - fileUsage.trashedSize;

    // Check file count limit
    if (maxFiles !== -1 && currentFiles >= maxFiles) {
      return {
        allowed: false,
        currentFiles,
        maxFiles,
        currentBytes: currentStorageBytes,
        maxBytes: maxStorageBytes,
        reason: 'FILE_COUNT_EXCEEDED',
        message: `You have reached your limit of ${maxFiles} files. Upgrade to premium for unlimited files.`
      };
    }

    // Check storage limit
    if (maxStorageBytes !== -1 && (currentStorageBytes + fileSize) > maxStorageBytes) {
      const maxMB = Math.round(maxStorageBytes / (1024 * 1024));
      const usedMB = Math.round(currentStorageBytes / (1024 * 1024));
      const fileMB = Math.round(fileSize / (1024 * 1024) * 10) / 10;

      return {
        allowed: false,
        currentFiles,
        maxFiles,
        currentBytes: currentStorageBytes,
        maxBytes: maxStorageBytes,
        reason: 'STORAGE_EXCEEDED',
        message: `This file (${fileMB}MB) would exceed your storage limit. You've used ${usedMB}MB of ${maxMB}MB. Upgrade to premium for unlimited storage.`
      };
    }

    // Check allowed/forbidden file types from role config
    const allowedTypes = effectiveLimits.allowedFileTypes || ['*'];
    const forbiddenTypes = effectiveLimits.forbiddenFileTypes || [];

    if (!isFileTypeAllowed(mimeType, extension, allowedTypes, forbiddenTypes)) {
      return {
        allowed: false,
        reason: 'TYPE_NOT_ALLOWED',
        message: `File type ${mimeType || extension} is not allowed for your account.`
      };
    }

    const remainingFiles = maxFiles === -1 ? null : maxFiles - currentFiles;
    const remainingStorage = maxStorageBytes === -1 ? null : maxStorageBytes - currentStorageBytes;

    return {
      allowed: true,
      currentFiles,
      maxFiles,
      currentBytes: currentStorageBytes,
      maxBytes: maxStorageBytes,
      remainingFiles,
      remainingStorage,
      message: 'Upload allowed'
    };
  } catch (error) {
    console.error('[LimitService] Error checking file upload limit:', error);
    return {
      allowed: true,
      message: 'Unable to verify limits'
    };
  }
}

/**
 * Check if a file type is allowed
 * @param {string} mimeType - MIME type
 * @param {string} extension - File extension
 * @param {string[]} allowedTypes - Allowed types (supports wildcards like 'image/*')
 * @param {string[]} forbiddenTypes - Forbidden types
 * @returns {boolean}
 */
function isFileTypeAllowed(mimeType, extension, allowedTypes, forbiddenTypes) {
  // Check forbidden types first
  if (forbiddenTypes.length > 0) {
    for (const forbidden of forbiddenTypes) {
      if (extension && forbidden.toLowerCase() === extension.toLowerCase()) {
        return false;
      }
      if (mimeType && forbidden === mimeType) {
        return false;
      }
      // Check wildcard patterns
      if (mimeType && forbidden.endsWith('/*')) {
        const prefix = forbidden.slice(0, -1);
        if (mimeType.startsWith(prefix)) {
          return false;
        }
      }
    }
  }

  // If allowed types is empty or contains '*', all types are allowed
  if (allowedTypes.length === 0 || allowedTypes.includes('*')) {
    return true;
  }

  // Check if type matches any allowed pattern
  for (const allowed of allowedTypes) {
    if (extension && allowed.toLowerCase() === extension.toLowerCase()) {
      return true;
    }
    if (mimeType && allowed === mimeType) {
      return true;
    }
    // Check wildcard patterns
    if (mimeType && allowed.endsWith('/*')) {
      const prefix = allowed.slice(0, -1);
      if (mimeType.startsWith(prefix)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a user can create a folder
 * @param {Object} user - The user document
 * @returns {Object} - { allowed: boolean, current: number, max: number, message: string }
 */
async function canCreateFolder(user) {
  try {
    const roleConfig = await RoleConfig.getConfig(user.role);
    const effectiveLimits = user.getEffectiveLimits(roleConfig);
    const maxFolders = effectiveLimits.maxFolders || -1;

    if (maxFolders === -1) {
      return {
        allowed: true,
        current: 0,
        max: -1,
        message: 'Unlimited folders'
      };
    }

    const currentFolders = await Folder.countDocuments({
      userId: user._id,
      isTrashed: false
    });

    const allowed = currentFolders < maxFolders;

    return {
      allowed,
      current: currentFolders,
      max: maxFolders,
      message: allowed
        ? `${maxFolders - currentFolders} folders remaining`
        : `You have reached your limit of ${maxFolders} folders. Upgrade to premium for unlimited folders.`
    };
  } catch (error) {
    console.error('[LimitService] Error checking folder limit:', error);
    return {
      allowed: true,
      current: 0,
      max: -1,
      message: 'Unable to verify limits'
    };
  }
}

/**
 * Check if a user can create a share link
 * @param {Object} user - The user document
 * @returns {Object} - { allowed: boolean, current: number, max: number, message: string }
 */
async function canCreateShare(user) {
  try {
    const roleConfig = await RoleConfig.getConfig(user.role);
    const effectiveLimits = user.getEffectiveLimits(roleConfig);
    const maxShares = effectiveLimits.maxPublicShares || -1;

    if (maxShares === -1) {
      return {
        allowed: true,
        current: 0,
        max: -1,
        message: 'Unlimited shares'
      };
    }

    const currentShares = await FileShare.getUserShareCount(user._id);

    const allowed = currentShares < maxShares;

    return {
      allowed,
      current: currentShares,
      max: maxShares,
      message: allowed
        ? `${maxShares - currentShares} share links remaining`
        : `You have reached your limit of ${maxShares} share links. Upgrade to premium for more.`
    };
  } catch (error) {
    console.error('[LimitService] Error checking share limit:', error);
    return {
      allowed: true,
      current: 0,
      max: -1,
      message: 'Unable to verify limits'
    };
  }
}

/**
 * Get file-specific limit status for a user
 * @param {Object} user - The user document
 * @returns {Object} - Full file limit status
 */
async function getFileLimitStatus(user) {
  try {
    const roleConfig = await RoleConfig.getConfig(user.role);
    const effectiveLimits = user.getEffectiveLimits(roleConfig);

    // Get file usage
    const fileUsage = await File.getStorageUsage(user._id);
    const currentFiles = fileUsage.fileCount - fileUsage.trashedCount;
    const currentStorage = fileUsage.totalSize - fileUsage.trashedSize;

    // Get folder count
    const folderCount = await Folder.countDocuments({
      userId: user._id,
      isTrashed: false
    });

    // Get share count
    const shareCount = await FileShare.getUserShareCount(user._id);

    const maxFiles = effectiveLimits.maxFiles || -1;
    const maxFileSize = effectiveLimits.maxFileSize || -1;
    const maxFolders = effectiveLimits.maxFolders || -1;
    const maxStorage = effectiveLimits.maxStorageBytes || -1;
    const maxShares = effectiveLimits.maxPublicShares || -1;
    const maxVersions = effectiveLimits.maxVersionsPerFile || -1;

    return {
      files: {
        current: currentFiles,
        max: maxFiles,
        unlimited: maxFiles === -1,
        remaining: maxFiles === -1 ? null : Math.max(0, maxFiles - currentFiles),
        percentage: maxFiles === -1 ? 0 : Math.round((currentFiles / maxFiles) * 100)
      },
      storage: {
        currentBytes: currentStorage,
        maxBytes: maxStorage,
        unlimited: maxStorage === -1,
        remaining: maxStorage === -1 ? null : Math.max(0, maxStorage - currentStorage),
        percentage: maxStorage === -1 ? 0 : Math.round((currentStorage / maxStorage) * 100),
        currentFormatted: formatBytes(currentStorage),
        maxFormatted: maxStorage === -1 ? 'Unlimited' : formatBytes(maxStorage),
        remainingFormatted: maxStorage === -1 ? 'Unlimited' : formatBytes(Math.max(0, maxStorage - currentStorage))
      },
      maxFileSize: {
        bytes: maxFileSize,
        unlimited: maxFileSize === -1,
        formatted: maxFileSize === -1 ? 'Unlimited' : formatBytes(maxFileSize)
      },
      folders: {
        current: folderCount,
        max: maxFolders,
        unlimited: maxFolders === -1,
        remaining: maxFolders === -1 ? null : Math.max(0, maxFolders - folderCount),
        percentage: maxFolders === -1 ? 0 : Math.round((folderCount / maxFolders) * 100)
      },
      shares: {
        current: shareCount,
        max: maxShares,
        unlimited: maxShares === -1,
        remaining: maxShares === -1 ? null : Math.max(0, maxShares - shareCount),
        percentage: maxShares === -1 ? 0 : Math.round((shareCount / maxShares) * 100)
      },
      versioning: {
        maxVersionsPerFile: maxVersions,
        unlimited: maxVersions === -1
      },
      trashed: {
        files: fileUsage.trashedCount,
        size: fileUsage.trashedSize,
        sizeFormatted: formatBytes(fileUsage.trashedSize)
      }
    };
  } catch (error) {
    console.error('[LimitService] Error getting file limit status:', error);
    throw error;
  }
}

export default {
  canCreate,
  canUploadImage,
  canUploadFile,
  canCreateFolder,
  canCreateShare,
  getUserLimitStatus,
  getFileLimitStatus,
  isFileTypeAllowed,
  formatBytes,
  RESOURCE_LIMIT_MAP,
  RESOURCE_USAGE_MAP,
  FORBIDDEN_EXTENSIONS
};
