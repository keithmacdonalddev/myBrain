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
 * RoleConfig model - MongoDB schema storing limit configurations for each role tier.
 * Defines quota limits (free vs premium): maxNotes, maxTasks, maxProjects, storage quota.
 * We fetch role limits to determine what a user is allowed to create based on their role.
 */
import RoleConfig from '../models/RoleConfig.js';

/**
 * File model - Represents uploaded files in the database.
 * We query files to calculate current storage usage (sum of file sizes)
 * and count existing files to check against storage and count limits.
 */
import File from '../models/File.js';

/**
 * Folder model - Represents folder organization structure.
 * We count user's folders against the folder limit from RoleConfig.
 */
import Folder from '../models/Folder.js';

/**
 * FileShare model - Represents shareable links created from files.
 * We count share links to enforce the maximum shares per user limit.
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
 * Checks if a user is allowed to create a new resource of the given type.
 * This is the main entry point for freemium limit enforcement.
 *
 * BUSINESS LOGIC:
 * Every resource creation (note, task, project, etc.) goes through this check:
 * 1. Get the user's role-based limit (free: 100 notes, premium: unlimited)
 * 2. Apply any user-specific overrides (for trials, custom plans)
 * 3. Count current resources owned by user
 * 4. Compare current count against effective limit
 * 5. Return result with upgrade prompts for free users at limit
 *
 * LIMIT SYSTEM DESIGN:
 * - -1 = Unlimited (premium feature)
 * - 0 = Not allowed (feature disabled for role)
 * - >0 = Hard limit (free tier cap)
 *
 * FAIL-OPEN POLICY:
 * If we can't check limits (database error), we ALLOW the operation.
 * This ensures service availability even if limit checking fails.
 * Explanation: Better to let some users over-quota than block everyone.
 * Trade-off: We may overspend, but we never break the app.
 *
 * @param {Object} user - The user document (must have role, getCurrentUsage(), getEffectiveLimits())
 * @param {string} resourceType - Resource type: 'notes', 'tasks', 'projects', 'events', 'images', 'files', 'folders'
 *
 * @returns {Promise<Object>} Result with enforcement details:
 *   - allowed: {boolean} - Can user create this resource?
 *   - current: {number} - Current count of this resource
 *   - max: {number} - Maximum allowed (-1 = unlimited, 0 = blocked, >0 = limit)
 *   - message: {string} - Human-readable message for UI display
 *
 * @throws - Does not throw; errors are handled gracefully
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Before creating a note in the route:
 * const result = await limitService.canCreate(user, 'notes');
 *
 * if (!result.allowed) {
 *   // User hit limit - show upgrade prompt
 *   return res.status(403).json({
 *     error: result.message,
 *     current: result.current,
 *     max: result.max
 *   });
 * }
 *
 * // User can create - proceed with note creation
 * const note = await createNote(noteData);
 * ```
 *
 * TYPICAL RESPONSES:
 * ```javascript
 * // Free user with room to create
 * { allowed: true, current: 45, max: 100, message: '55 notes remaining' }
 *
 * // Free user at limit
 * { allowed: false, current: 100, max: 100, message: 'You have reached your limit of 100 notes. Upgrade to premium for unlimited notes.' }
 *
 * // Premium user (unlimited)
 * { allowed: true, current: 1250, max: -1, message: 'Unlimited' }
 *
 * // Unknown resource type (fail-open)
 * { allowed: true, current: 0, max: -1, message: 'Unknown resource type' }
 * ```
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
 * Comprehensive file upload validation checking multiple security and quota constraints.
 * This is the PRIMARY file upload guard - all file uploads must pass this check.
 *
 * BUSINESS LOGIC:
 * File uploads need multiple layers of validation:
 * 1. SECURITY FIRST - Block dangerous executable types (no .exe, .bat, .ps1, etc.)
 * 2. RESOURCE QUOTAS - Respect per-file size limits, total file count, storage limits
 * 3. FILE TYPE RESTRICTIONS - Some roles have allowed/forbidden file type lists
 *
 * WHY SO MANY CHECKS?
 * - Security: Malware prevention (the .exe check)
 * - Fairness: Prevent one user from using all storage
 * - Business: Enforce freemium tiers (10GB premium vs 1GB free)
 * - Performance: Large files slow down the system for everyone
 *
 * CHECK ORDER MATTERS:
 * We check forbidden extensions FIRST - this can't be bypassed by role or override.
 * This is our security boundary. Then we check role-specific limits.
 *
 * @param {Object} user - The user document (with role and getCurrentUsage method)
 * @param {number} fileSize - Size of the file in bytes (e.g., 5242880 for 5MB)
 * @param {string} mimeType - MIME type (e.g., 'application/pdf', 'image/jpeg')
 * @param {string} extension - File extension with dot (e.g., '.pdf', '.exe')
 *
 * @returns {Promise<Object>} Detailed validation result:
 *   - allowed: {boolean} - Is upload allowed?
 *   - reason: {string|undefined} - Why rejected ('FORBIDDEN_TYPE', 'FILE_TOO_LARGE', etc.)
 *   - message: {string} - Human-readable explanation
 *   - currentFiles: {number|undefined} - How many files user has
 *   - maxFiles: {number|undefined} - File count limit
 *   - currentBytes: {number|undefined} - Storage used in bytes
 *   - maxBytes: {number|undefined} - Storage quota in bytes
 *   - remainingFiles: {number|null|undefined} - Files left before limit (null if unlimited)
 *   - remainingStorage: {number|null|undefined} - Bytes left (null if unlimited)
 *
 * @throws - Does not throw; returns { allowed: true } on error (fail-open)
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // In file upload route:
 * const validation = await canUploadFile(
 *   user,
 *   req.file.size,          // 5242880 bytes
 *   req.file.mimetype,      // 'application/pdf'
 *   path.extname(req.file.originalname)  // '.pdf'
 * );
 *
 * if (!validation.allowed) {
 *   // Reject based on specific reason
 *   if (validation.reason === 'FORBIDDEN_TYPE') {
 *     return res.status(403).json({
 *       error: 'File type not allowed for security reasons',
 *       reason: validation.reason
 *     });
 *   }
 *
 *   if (validation.reason === 'STORAGE_EXCEEDED') {
 *     return res.status(413).json({
 *       error: validation.message,
 *       used: validation.currentBytes,
 *       limit: validation.maxBytes,
 *       trashed: trashInfo  // Help user empty trash
 *     });
 *   }
 *
 *   // Generic rejection
 *   return res.status(400).json({
 *     error: validation.message,
 *     reason: validation.reason
 *   });
 * }
 *
 * // Allowed - proceed with upload
 * const uploadedFile = await uploadToS3(req.file);
 * ```
 *
 * REJECTION REASONS:
 * - 'FORBIDDEN_TYPE': Executable file (.exe, .bat, .ps1) - SECURITY BOUNDARY
 * - 'FILE_TOO_LARGE': Exceeds per-file size limit
 * - 'FILE_COUNT_EXCEEDED': User has too many files
 * - 'STORAGE_EXCEEDED': Would exceed total storage quota
 * - 'TYPE_NOT_ALLOWED': File type restricted for this role
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
 * Checks if a file type is allowed based on role-specific allow/deny lists.
 * Used by canUploadFile to enforce file type restrictions for different user roles.
 *
 * BUSINESS LOGIC:
 * Different user roles may have different file restrictions:
 * - FREE USERS: Can only upload common safe types (images, documents)
 * - PREMIUM USERS: Can upload more types
 * - ADMINS: Can upload anything (except FORBIDDEN_EXTENSIONS globally)
 *
 * TWO-LAYER SYSTEM:
 * - Forbidden types are ALWAYS blocked (global security boundary)
 * - Allowed types are role-specific (business rules)
 *
 * PATTERN MATCHING SYSTEM:
 * We support multiple matching patterns for flexibility:
 * - Exact extension: '.pdf' exactly matches '.pdf'
 * - Exact MIME: 'image/png' exactly matches 'image/png'
 * - Wildcard MIME: 'image/*' matches any 'image/X' type
 * - Universal: '*' matches everything (fail-open default)
 *
 * WHY BOTH MIME AND EXTENSION?
 * - Some files lie about MIME type (client sends wrong header)
 * - Extension is harder to fake (filesystem-based)
 * - Together they provide defense-in-depth
 *
 * @param {string} mimeType - MIME type from HTTP header (e.g., 'image/png', 'application/pdf')
 * @param {string} extension - File extension including dot (e.g., '.png', '.pdf', '.exe')
 * @param {string[]} allowedTypes - List of allowed types/patterns from role config
 *   Examples: ['image/*', '.pdf'], ['*'] (all), [] (none)
 * @param {string[]} forbiddenTypes - List of forbidden types/patterns from role config
 *   Examples: ['.exe', '.bat', 'application/x-executable'], [] (none)
 *
 * @returns {boolean} true if file is allowed, false if rejected
 *
 * PRECEDENCE RULES:
 * 1. If type matches FORBIDDEN list → ALWAYS REJECT (security first)
 * 2. If type matches ALLOWED list → ACCEPT
 * 3. If ALLOWED list is empty or ['*'] → ACCEPT (everything except forbidden)
 * 4. Otherwise → REJECT (default deny)
 *
 * EXAMPLE SCENARIOS:
 * ```javascript
 * // Scenario 1: Allow only images
 * isFileTypeAllowed('image/png', '.png', ['image/*'], []);
 * // true - matches allowed wildcard
 *
 * isFileTypeAllowed('application/pdf', '.pdf', ['image/*'], []);
 * // false - doesn't match image/* and has restrictive allow list
 *
 * // Scenario 2: Block executables, allow everything else
 * isFileTypeAllowed('image/png', '.png', ['*'], ['.exe', '.bat']);
 * // true - matches universal wildcard, not in forbidden list
 *
 * isFileTypeAllowed('application/x-executable', '.exe', ['*'], ['.exe']);
 * // false - in forbidden list (forbidden takes precedence)
 *
 * // Scenario 3: Complex role restrictions
 * isFileTypeAllowed('video/mp4', '.mp4', ['image/*', 'application/pdf'], []);
 * // false - not in allowed list
 *
 * isFileTypeAllowed('application/pdf', '.pdf', ['image/*', 'application/pdf'], []);
 * // true - matches exact MIME in allowed list
 * ```
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
 * Converts bytes to human-readable storage format for display in UI.
 * Used throughout the limit service for user-friendly messages.
 *
 * BUSINESS LOGIC:
 * Users don't understand bytes. When we tell them "You've used 52428800 bytes",
 * they're confused. When we say "You've used 50 MB", they understand immediately.
 * This function makes limit messages user-friendly.
 *
 * FORMAT SELECTION LOGIC:
 * We automatically choose the best unit based on the size:
 * - 0 bytes → '0 Bytes'
 * - 1024 bytes → '1 KB'
 * - 1 MB → '1 MB'
 * - 1 GB → '1 GB'
 *
 * HOW IT WORKS:
 * 1. Find which unit fits best (Bytes → KB → MB → GB)
 * 2. Divide the value by the appropriate power of 1024
 * 3. Round to 2 decimal places for readability
 * 4. Append the unit label
 *
 * @param {number} bytes - Number of bytes (e.g., 52428800 for 50MB)
 *
 * @returns {string} Formatted storage size (e.g., '50 MB', '1.5 GB')
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // In error messages
 * const message = `You've used ${formatBytes(currentStorage)} of ${formatBytes(maxStorage)}`;
 * // Output: "You've used 50 MB of 100 MB"
 *
 * // In status displays
 * console.log(formatBytes(52428800));    // '50 MB'
 * console.log(formatBytes(1073741824));  // '1 GB'
 * console.log(formatBytes(1572864));     // '1.5 MB'
 *
 * // In limit checking
 * const remainingStorage = formatBytes(maxBytes - currentBytes);
 * console.log(`${remainingStorage} storage remaining`);
 * ```
 *
 * UNIT PROGRESSION:
 * - 0 → 1023 bytes: "Bytes"
 * - 1024 → 1048575 bytes: "KB" (1 KB - 1023 KB)
 * - 1048576 → 1073741823 bytes: "MB" (1 MB - 1023 MB)
 * - 1073741824+ bytes: "GB" (1 GB+)
 */
function formatBytes(bytes) {
  // =====================================================
  // SPECIAL CASE: ZERO BYTES
  // =====================================================
  // Zero doesn't work with logarithm calculation, so handle it specially
  if (bytes === 0) return '0 Bytes';

  // =====================================================
  // UNIT CONFIGURATION
  // =====================================================
  // k = 1024 (bytes per kilobyte in binary units)
  // NOTE: Could use 1000 for decimal units, but industry standard is 1024
  const k = 1024;

  // Possible units from smallest to largest
  // We'll select the appropriate index based on size
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  // =====================================================
  // CALCULATE APPROPRIATE UNIT
  // =====================================================
  // Using logarithm: find which unit to use
  // log(bytes) / log(1024) gives us the exponent
  // Examples:
  // - bytes=1024: log(1024)/log(1024) = 1 → use sizes[1] = 'KB'
  // - bytes=1048576: log(1048576)/log(1024) = 2 → use sizes[2] = 'MB'
  // - bytes=1073741824: log(1073741824)/log(1024) = 3 → use sizes[3] = 'GB'
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // =====================================================
  // FORMAT THE OUTPUT
  // =====================================================
  // 1. Divide bytes by appropriate power of 1024
  // 2. Round to 2 decimal places for readability
  // 3. Append the unit label
  //
  // Example: 52428800 bytes
  // i = floor(log(52428800)/log(1024)) = floor(2.???) = 2 (MB)
  // 52428800 / (1024^2) = 50
  // Result: "50 MB"
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
