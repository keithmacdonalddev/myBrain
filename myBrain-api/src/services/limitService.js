/**
 * =============================================================================
 * LIMITSERVICE.JS - Usage Limits & Quota Management
 * =============================================================================
 *
 * This file handles checking and enforcing usage limits for users. It's the
 * core of myBrain's freemium business model, controlling what free vs premium
 * users can do.
 *
 * WHAT ARE USAGE LIMITS?
 * ----------------------
 * Usage limits restrict how much of each resource a user can create or use.
 * This applies to notes, tasks, projects, files, storage space, and more.
 *
 * WHY HAVE LIMITS?
 * ----------------
 * 1. BUSINESS MODEL: Free users get limited access, premium get more/unlimited
 * 2. RESOURCE MANAGEMENT: Prevent database/storage from growing uncontrollably
 * 3. FAIR USE: Ensure resources are available for all users
 * 4. ABUSE PREVENTION: Stop bots or spam accounts from creating unlimited content
 *
 * LIMIT TYPES:
 * ------------
 * 1. COUNT LIMITS: Maximum number of items (e.g., 100 notes, 500 tasks)
 * 2. STORAGE LIMITS: Maximum bytes stored (e.g., 100MB for free, 10GB for premium)
 * 3. SIZE LIMITS: Maximum size per file (e.g., 10MB per file)
 *
 * HOW LIMITS ARE DETERMINED:
 * --------------------------
 * 1. Role Configuration: Each role (free, premium, admin) has default limits
 * 2. User Overrides: Individual users can have custom limits
 * 3. Effective Limits: Max of (role default, user override)
 *
 * SPECIAL VALUES:
 * ---------------
 * - -1: Unlimited (no restriction)
 * - 0: Not allowed (blocked)
 * - >0: Specific limit
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * RoleConfig model - stores limit configurations for each role.
 * Defines what each tier (free, premium, admin) can do.
 */
import RoleConfig from '../models/RoleConfig.js';

/**
 * File model - used to check current file count and storage usage.
 */
import File from '../models/File.js';

/**
 * Folder model - used to check current folder count.
 */
import Folder from '../models/Folder.js';

/**
 * FileShare model - used to check current share link count.
 */
import FileShare from '../models/FileShare.js';

// =============================================================================
// CONFIGURATION MAPS
// =============================================================================

/**
 * RESOURCE_LIMIT_MAP
 * ------------------
 * Maps resource types to their corresponding limit key in RoleConfig.
 *
 * Example: 'notes' maps to 'maxNotes' in the limits object
 *
 * USAGE:
 * const limitKey = RESOURCE_LIMIT_MAP['notes'];  // 'maxNotes'
 * const limit = roleConfig.limits[limitKey];     // e.g., 100
 */
const RESOURCE_LIMIT_MAP = {
  notes: 'maxNotes',           // Maximum number of notes
  tasks: 'maxTasks',           // Maximum number of tasks
  projects: 'maxProjects',     // Maximum number of projects
  events: 'maxEvents',         // Maximum number of calendar events
  images: 'maxImages',         // Maximum number of images
  categories: 'maxCategories', // Maximum number of life areas
  files: 'maxFiles',           // Maximum number of files
  folders: 'maxFolders',       // Maximum number of folders
};

/**
 * RESOURCE_USAGE_MAP
 * ------------------
 * Maps resource types to their corresponding usage key in the usage object.
 *
 * The user.getCurrentUsage() method returns an object with these keys.
 *
 * USAGE:
 * const usageKey = RESOURCE_USAGE_MAP['notes'];  // 'notes'
 * const currentCount = usage[usageKey];          // e.g., 50
 */
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

/**
 * FORBIDDEN_EXTENSIONS
 * --------------------
 * File extensions that are NEVER allowed regardless of user role.
 * These are dangerous executable files that could be malware.
 *
 * SECURITY RISK:
 * If someone uploads an .exe and it gets downloaded/executed,
 * it could infect computers.
 *
 * THIS IS A SECURITY BOUNDARY - NEVER REMOVE THESE.
 */
const FORBIDDEN_EXTENSIONS = [
  '.exe',   // Windows executable
  '.bat',   // Windows batch script
  '.cmd',   // Windows command script
  '.sh',    // Unix shell script
  '.ps1',   // PowerShell script
  '.vbs',   // VBScript
  '.jar',   // Java archive (executable)
  '.msi',   // Windows installer
  '.dll',   // Dynamic link library
  '.scr',   // Windows screensaver (can execute code)
  '.com',   // DOS executable
  '.pif',   // Program Information File (can run programs)
  '.hta',   // HTML Application (full system access)
  '.cpl',   // Control Panel extension
  '.msc',   // Management Console snap-in
];

// =============================================================================
// GENERIC RESOURCE LIMIT CHECKING
// =============================================================================

/**
 * canCreate(user, resourceType)
 * -----------------------------
 * Checks if a user can create a new resource of the given type.
 *
 * @param {Object} user - The user document (with role and methods)
 * @param {string} resourceType - Type: 'notes', 'tasks', 'projects', 'events', etc.
 *
 * @returns {Promise<Object>} Result object with:
 *   - allowed: boolean - Can the user create this resource?
 *   - current: number - Current count of this resource
 *   - max: number - Maximum allowed (-1 for unlimited)
 *   - message: string - Human-readable status message
 *
 * EXAMPLE:
 * const result = await canCreate(user, 'notes');
 * // Result: { allowed: true, current: 45, max: 100, message: '55 notes remaining' }
 *
 * // Or if at limit:
 * // Result: { allowed: false, current: 100, max: 100, message: 'You have reached your limit of 100 notes...' }
 *
 * SPECIAL CASES:
 * - Unknown resource type: Returns { allowed: true } (fail-open for flexibility)
 * - Error checking limits: Returns { allowed: true } (fail-open to not block users)
 * - Unlimited (-1): Returns { allowed: true, max: -1 }
 */
async function canCreate(user, resourceType) {
  // Get the limit key and usage key for this resource type
  const limitKey = RESOURCE_LIMIT_MAP[resourceType];
  const usageKey = RESOURCE_USAGE_MAP[resourceType];

  // If unknown resource type, allow by default (fail-open)
  if (!limitKey || !usageKey) {
    return {
      allowed: true,
      current: 0,
      max: -1,
      message: 'Unknown resource type'
    };
  }

  try {
    // =====================================================
    // GET ROLE CONFIGURATION
    // =====================================================
    // This contains the default limits for the user's role
    const roleConfig = await RoleConfig.getConfig(user.role);

    // =====================================================
    // GET EFFECTIVE LIMITS
    // =====================================================
    // This combines role defaults with any user-specific overrides
    // User overrides take precedence over role defaults
    const effectiveLimits = user.getEffectiveLimits(roleConfig);
    const maxLimit = effectiveLimits[limitKey];

    // =====================================================
    // CHECK FOR UNLIMITED
    // =====================================================
    // -1 means unlimited - no need to check current usage
    if (maxLimit === -1) {
      return {
        allowed: true,
        current: 0,
        max: -1,
        message: 'Unlimited'
      };
    }

    // =====================================================
    // GET CURRENT USAGE
    // =====================================================
    // Count how many of this resource the user currently has
    const usage = await user.getCurrentUsage();
    const currentCount = usage[usageKey] || 0;

    // =====================================================
    // CHECK AGAINST LIMIT
    // =====================================================
    // Allow if current count is less than the maximum
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
    // =====================================================
    // ERROR HANDLING - FAIL OPEN
    // =====================================================
    // If we can't check limits, allow the operation
    // Better to let some requests through than block everyone
    console.error(`[LimitService] Error checking ${resourceType} limit:`, error);
    return {
      allowed: true,
      current: 0,
      max: -1,
      message: 'Unable to verify limits'
    };
  }
}

// =============================================================================
// IMAGE-SPECIFIC LIMIT CHECKING
// =============================================================================

/**
 * canUploadImage(user, fileSize)
 * ------------------------------
 * Checks if a user can upload an image with the given file size.
 * Images have both COUNT limits and STORAGE limits.
 *
 * @param {Object} user - The user document
 * @param {number} fileSize - Size of the file in bytes
 *
 * @returns {Promise<Object>} Result object with:
 *   - allowed: boolean
 *   - currentBytes: number - Current storage used
 *   - maxBytes: number - Maximum storage allowed
 *   - currentCount: number - Current image count
 *   - maxCount: number - Maximum images allowed
 *   - reason: string - 'IMAGE_COUNT_EXCEEDED' or 'STORAGE_EXCEEDED' (if rejected)
 *   - message: string - Human-readable message
 *
 * TWO CHECKS PERFORMED:
 * 1. Image count: Would this exceed the max number of images?
 * 2. Storage: Would this upload exceed total storage quota?
 *
 * EXAMPLE:
 * const result = await canUploadImage(user, 1024 * 1024); // 1MB file
 * if (!result.allowed) {
 *   if (result.reason === 'STORAGE_EXCEEDED') {
 *     console.log('Not enough storage space');
 *   }
 * }
 */
async function canUploadImage(user, fileSize) {
  try {
    // Get role configuration and effective limits
    const roleConfig = await RoleConfig.getConfig(user.role);
    const effectiveLimits = user.getEffectiveLimits(roleConfig);
    const maxImages = effectiveLimits.maxImages;
    const maxStorageBytes = effectiveLimits.maxStorageBytes;

    // Get current usage
    const usage = await user.getCurrentUsage();
    const currentImages = usage.images || 0;
    const currentStorageBytes = usage.storageBytes || 0;

    // =====================================================
    // CHECK IMAGE COUNT LIMIT
    // =====================================================
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

    // =====================================================
    // CHECK STORAGE LIMIT
    // =====================================================
    // Check if adding this file would exceed storage quota
    if (maxStorageBytes !== -1 && (currentStorageBytes + fileSize) > maxStorageBytes) {
      // Format sizes for user-friendly message
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

    // =====================================================
    // UPLOAD ALLOWED
    // =====================================================
    // Format remaining capacity for the message
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
    // Fail open - allow upload if we can't check limits
    console.error('[LimitService] Error checking image upload limit:', error);
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

// =============================================================================
// FILE-SPECIFIC LIMIT CHECKING
// =============================================================================

/**
 * canUploadFile(user, fileSize, mimeType, extension)
 * --------------------------------------------------
 * Checks if a user can upload a file with the given characteristics.
 * More comprehensive than canUploadImage - checks multiple constraints.
 *
 * @param {Object} user - The user document
 * @param {number} fileSize - Size of the file in bytes
 * @param {string} mimeType - MIME type (e.g., 'application/pdf')
 * @param {string} extension - File extension including dot (e.g., '.pdf')
 *
 * @returns {Promise<Object>} Result object
 *
 * CHECKS PERFORMED (in order):
 * 1. FORBIDDEN EXTENSION: Is this a dangerous file type?
 * 2. PER-FILE SIZE: Is the individual file too large?
 * 3. FILE COUNT: Has user reached max file count?
 * 4. TOTAL STORAGE: Would this exceed total storage quota?
 * 5. FILE TYPE: Is this file type allowed for the user's role?
 *
 * EXAMPLE:
 * const result = await canUploadFile(user, 5000000, 'application/pdf', '.pdf');
 * if (!result.allowed) {
 *   switch (result.reason) {
 *     case 'FORBIDDEN_TYPE': console.log('Dangerous file type'); break;
 *     case 'FILE_TOO_LARGE': console.log('File too big'); break;
 *     case 'FILE_COUNT_EXCEEDED': console.log('Too many files'); break;
 *     case 'STORAGE_EXCEEDED': console.log('Out of space'); break;
 *     case 'TYPE_NOT_ALLOWED': console.log('File type not allowed'); break;
 *   }
 * }
 */
async function canUploadFile(user, fileSize, mimeType, extension) {
  try {
    // =====================================================
    // CHECK FORBIDDEN EXTENSIONS (Security Check)
    // =====================================================
    // This happens FIRST and cannot be overridden by any role
    if (extension && FORBIDDEN_EXTENSIONS.includes(extension.toLowerCase())) {
      return {
        allowed: false,
        reason: 'FORBIDDEN_TYPE',
        message: `File type ${extension} is not allowed for security reasons.`
      };
    }

    // Get role configuration and effective limits
    const roleConfig = await RoleConfig.getConfig(user.role);
    const effectiveLimits = user.getEffectiveLimits(roleConfig);
    const maxFiles = effectiveLimits.maxFiles || -1;
    const maxFileSize = effectiveLimits.maxFileSize || -1;
    const maxStorageBytes = effectiveLimits.maxStorageBytes;

    // =====================================================
    // CHECK PER-FILE SIZE LIMIT
    // =====================================================
    // Some roles may have limits on individual file sizes
    if (maxFileSize !== -1 && fileSize > maxFileSize) {
      const maxMB = Math.round(maxFileSize / (1024 * 1024));
      const fileMB = Math.round(fileSize / (1024 * 1024) * 10) / 10;
      return {
        allowed: false,
        reason: 'FILE_TOO_LARGE',
        message: `This file (${fileMB}MB) exceeds the maximum allowed file size of ${maxMB}MB.`
      };
    }

    // =====================================================
    // GET CURRENT FILE USAGE
    // =====================================================
    // Get file count and storage (excluding trashed files)
    const fileUsage = await File.getStorageUsage(user._id);
    const currentFiles = fileUsage.fileCount - fileUsage.trashedCount;
    const currentStorageBytes = fileUsage.totalSize - fileUsage.trashedSize;

    // =====================================================
    // CHECK FILE COUNT LIMIT
    // =====================================================
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

    // =====================================================
    // CHECK STORAGE LIMIT
    // =====================================================
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

    // =====================================================
    // CHECK FILE TYPE RESTRICTIONS
    // =====================================================
    // Some roles may have allowed/forbidden file type lists
    const allowedTypes = effectiveLimits.allowedFileTypes || ['*'];
    const forbiddenTypes = effectiveLimits.forbiddenFileTypes || [];

    if (!isFileTypeAllowed(mimeType, extension, allowedTypes, forbiddenTypes)) {
      return {
        allowed: false,
        reason: 'TYPE_NOT_ALLOWED',
        message: `File type ${mimeType || extension} is not allowed for your account.`
      };
    }

    // =====================================================
    // UPLOAD ALLOWED
    // =====================================================
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
    // Fail open
    console.error('[LimitService] Error checking file upload limit:', error);
    return {
      allowed: true,
      message: 'Unable to verify limits'
    };
  }
}

/**
 * isFileTypeAllowed(mimeType, extension, allowedTypes, forbiddenTypes)
 * -------------------------------------------------------------------
 * Checks if a file type is allowed based on allow/deny lists.
 *
 * @param {string} mimeType - MIME type (e.g., 'image/png')
 * @param {string} extension - File extension (e.g., '.png')
 * @param {string[]} allowedTypes - List of allowed types/patterns
 * @param {string[]} forbiddenTypes - List of forbidden types/patterns
 *
 * @returns {boolean} Whether the file type is allowed
 *
 * PATTERN MATCHING:
 * - Exact extension: '.pdf' matches '.pdf'
 * - Exact MIME: 'image/png' matches 'image/png'
 * - Wildcard MIME: 'image/*' matches 'image/png', 'image/jpeg', etc.
 * - Universal: '*' allows all types
 *
 * PRECEDENCE:
 * 1. Forbidden list is checked first (deny takes priority)
 * 2. Then allowed list is checked
 * 3. If allowed list is ['*'] or empty, all (non-forbidden) types allowed
 *
 * EXAMPLES:
 * // Allow only images
 * isFileTypeAllowed('image/png', '.png', ['image/*'], []);  // true
 * isFileTypeAllowed('application/pdf', '.pdf', ['image/*'], []);  // false
 *
 * // Block executables, allow everything else
 * isFileTypeAllowed('image/png', '.png', ['*'], ['.exe']);  // true
 * isFileTypeAllowed('application/exe', '.exe', ['*'], ['.exe']);  // false
 */
function isFileTypeAllowed(mimeType, extension, allowedTypes, forbiddenTypes) {
  // =====================================================
  // CHECK FORBIDDEN TYPES FIRST
  // =====================================================
  // Forbidden list takes precedence over allowed list
  if (forbiddenTypes.length > 0) {
    for (const forbidden of forbiddenTypes) {
      // Check extension match
      if (extension && forbidden.toLowerCase() === extension.toLowerCase()) {
        return false;
      }
      // Check exact MIME match
      if (mimeType && forbidden === mimeType) {
        return false;
      }
      // Check wildcard MIME patterns (e.g., 'image/*')
      if (mimeType && forbidden.endsWith('/*')) {
        const prefix = forbidden.slice(0, -1);  // 'image/*' -> 'image/'
        if (mimeType.startsWith(prefix)) {
          return false;
        }
      }
    }
  }

  // =====================================================
  // CHECK ALLOWED TYPES
  // =====================================================
  // If allowed types is empty or contains '*', all types allowed
  if (allowedTypes.length === 0 || allowedTypes.includes('*')) {
    return true;
  }

  // Check if type matches any allowed pattern
  for (const allowed of allowedTypes) {
    // Check extension match
    if (extension && allowed.toLowerCase() === extension.toLowerCase()) {
      return true;
    }
    // Check exact MIME match
    if (mimeType && allowed === mimeType) {
      return true;
    }
    // Check wildcard MIME patterns
    if (mimeType && allowed.endsWith('/*')) {
      const prefix = allowed.slice(0, -1);
      if (mimeType.startsWith(prefix)) {
        return true;
      }
    }
  }

  // Not in allowed list
  return false;
}

// =============================================================================
// FOLDER LIMIT CHECKING
// =============================================================================

/**
 * canCreateFolder(user)
 * ---------------------
 * Checks if a user can create a new folder.
 *
 * @param {Object} user - The user document
 *
 * @returns {Promise<Object>} Result with allowed, current, max, message
 *
 * EXAMPLE:
 * const result = await canCreateFolder(user);
 * if (!result.allowed) {
 *   // User has reached folder limit
 * }
 */
async function canCreateFolder(user) {
  try {
    const roleConfig = await RoleConfig.getConfig(user.role);
    const effectiveLimits = user.getEffectiveLimits(roleConfig);
    const maxFolders = effectiveLimits.maxFolders || -1;

    // Unlimited folders
    if (maxFolders === -1) {
      return {
        allowed: true,
        current: 0,
        max: -1,
        message: 'Unlimited folders'
      };
    }

    // Count current folders (excluding trashed)
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

// =============================================================================
// SHARE LIMIT CHECKING
// =============================================================================

/**
 * canCreateShare(user)
 * --------------------
 * Checks if a user can create a new share link.
 *
 * @param {Object} user - The user document
 *
 * @returns {Promise<Object>} Result with allowed, current, max, message
 *
 * WHY LIMIT SHARES?
 * Share links could be used to serve content (bandwidth costs),
 * so some plans may limit how many active share links a user can have.
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

    // Count active share links
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

// =============================================================================
// COMPREHENSIVE STATUS REPORTS
// =============================================================================

/**
 * getUserLimitStatus(user)
 * ------------------------
 * Gets a comprehensive report of all limits and usage for a user.
 * Used for dashboard displays and account settings pages.
 *
 * @param {Object} user - The user document
 *
 * @returns {Promise<Object>} Full status report including:
 *   - role: User's role
 *   - roleDefaults: Default limits for this role
 *   - userOverrides: Any custom limits for this user
 *   - effectiveLimits: Actual limits being applied
 *   - usage: Current usage counts
 *   - status: Per-resource status with percentages
 *
 * EXAMPLE RESPONSE:
 * {
 *   role: 'free',
 *   roleDefaults: { maxNotes: 100, maxTasks: 500, ... },
 *   userOverrides: {},
 *   effectiveLimits: { maxNotes: 100, maxTasks: 500, ... },
 *   usage: { notes: 45, tasks: 123, ... },
 *   status: {
 *     notes: { current: 45, max: 100, unlimited: false, remaining: 55, percentage: 45 },
 *     tasks: { current: 123, max: 500, unlimited: false, remaining: 377, percentage: 25 },
 *     ...
 *     storage: { currentBytes: 52428800, maxBytes: 104857600, currentFormatted: '50 MB', ... }
 *   }
 * }
 */
async function getUserLimitStatus(user) {
  try {
    // Get configuration and limits
    const roleConfig = await RoleConfig.getConfig(user.role);
    const effectiveLimits = user.getEffectiveLimits(roleConfig);
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

    // Add storage status with human-readable formatting
    const maxStorage = effectiveLimits.maxStorageBytes;
    const currentStorage = usage.storageBytes || 0;

    status.storage = {
      currentBytes: currentStorage,
      maxBytes: maxStorage,
      unlimited: maxStorage === -1,
      remaining: maxStorage === -1 ? null : Math.max(0, maxStorage - currentStorage),
      percentage: maxStorage === -1 ? 0 : Math.round((currentStorage / maxStorage) * 100),
      // Human-readable versions for display
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
 * getFileLimitStatus(user)
 * ------------------------
 * Gets detailed file-specific limit status.
 * More detailed than getUserLimitStatus for file-related features.
 *
 * @param {Object} user - The user document
 *
 * @returns {Promise<Object>} Detailed file status including:
 *   - files: File count status
 *   - storage: Storage status
 *   - maxFileSize: Per-file size limit
 *   - folders: Folder count status
 *   - shares: Share link status
 *   - versioning: Version limit info
 *   - trashed: Info about trashed files
 */
async function getFileLimitStatus(user) {
  try {
    const roleConfig = await RoleConfig.getConfig(user.role);
    const effectiveLimits = user.getEffectiveLimits(roleConfig);

    // Get file usage (separate from general usage for more detail)
    const fileUsage = await File.getStorageUsage(user._id);
    const currentFiles = fileUsage.fileCount - fileUsage.trashedCount;
    const currentStorage = fileUsage.totalSize - fileUsage.trashedSize;

    // Get folder and share counts
    const folderCount = await Folder.countDocuments({
      userId: user._id,
      isTrashed: false
    });

    const shareCount = await FileShare.getUserShareCount(user._id);

    // Extract limit values
    const maxFiles = effectiveLimits.maxFiles || -1;
    const maxFileSize = effectiveLimits.maxFileSize || -1;
    const maxFolders = effectiveLimits.maxFolders || -1;
    const maxStorage = effectiveLimits.maxStorageBytes || -1;
    const maxShares = effectiveLimits.maxPublicShares || -1;
    const maxVersions = effectiveLimits.maxVersionsPerFile || -1;

    return {
      // File count limits
      files: {
        current: currentFiles,
        max: maxFiles,
        unlimited: maxFiles === -1,
        remaining: maxFiles === -1 ? null : Math.max(0, maxFiles - currentFiles),
        percentage: maxFiles === -1 ? 0 : Math.round((currentFiles / maxFiles) * 100)
      },

      // Storage limits
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

      // Per-file size limit
      maxFileSize: {
        bytes: maxFileSize,
        unlimited: maxFileSize === -1,
        formatted: maxFileSize === -1 ? 'Unlimited' : formatBytes(maxFileSize)
      },

      // Folder limits
      folders: {
        current: folderCount,
        max: maxFolders,
        unlimited: maxFolders === -1,
        remaining: maxFolders === -1 ? null : Math.max(0, maxFolders - folderCount),
        percentage: maxFolders === -1 ? 0 : Math.round((folderCount / maxFolders) * 100)
      },

      // Share link limits
      shares: {
        current: shareCount,
        max: maxShares,
        unlimited: maxShares === -1,
        remaining: maxShares === -1 ? null : Math.max(0, maxShares - shareCount),
        percentage: maxShares === -1 ? 0 : Math.round((shareCount / maxShares) * 100)
      },

      // Version history limits
      versioning: {
        maxVersionsPerFile: maxVersions,
        unlimited: maxVersions === -1
      },

      // Trashed files info (useful for "empty trash to free space" prompts)
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

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * formatBytes(bytes)
 * ------------------
 * Converts bytes to human-readable format.
 *
 * @param {number} bytes - Number of bytes
 *
 * @returns {string} Formatted string like '50 MB' or '1.5 GB'
 *
 * EXAMPLES:
 * formatBytes(0)          // '0 Bytes'
 * formatBytes(1024)       // '1 KB'
 * formatBytes(1048576)    // '1 MB'
 * formatBytes(1073741824) // '1 GB'
 * formatBytes(52428800)   // '50 MB'
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;  // Bytes per kilobyte
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  // Calculate which unit to use (0=Bytes, 1=KB, 2=MB, 3=GB)
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Calculate value and format to 2 decimal places
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all limit service functions.
 *
 * USAGE IN ROUTES:
 * import limitService from './services/limitService.js';
 *
 * // Before creating a note
 * const canCreate = await limitService.canCreate(user, 'notes');
 * if (!canCreate.allowed) {
 *   return res.status(403).json({ error: canCreate.message });
 * }
 *
 * // Before file upload
 * const canUpload = await limitService.canUploadFile(user, fileSize, mimeType, extension);
 * if (!canUpload.allowed) {
 *   return res.status(403).json({ error: canUpload.message, reason: canUpload.reason });
 * }
 *
 * // For account settings page
 * const status = await limitService.getUserLimitStatus(user);
 * // Show usage bars and upgrade prompts based on status
 */
export default {
  // Generic resource checking
  canCreate,

  // Specific resource checking
  canUploadImage,
  canUploadFile,
  canCreateFolder,
  canCreateShare,

  // Status reports
  getUserLimitStatus,
  getFileLimitStatus,

  // Utility functions
  isFileTypeAllowed,
  formatBytes,

  // Export constants for reference
  RESOURCE_LIMIT_MAP,
  RESOURCE_USAGE_MAP,
  FORBIDDEN_EXTENSIONS
};
