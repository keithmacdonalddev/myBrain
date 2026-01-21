/**
 * =============================================================================
 * SHARESERVICE.JS - File Sharing Business Logic
 * =============================================================================
 *
 * This file handles all file sharing operations in myBrain. It enables users
 * to share files with others via secure, customizable share links.
 *
 * WHAT IS FILE SHARING?
 * ---------------------
 * File sharing allows users to create special links that grant access to
 * their files without requiring the recipient to have an account. Think of
 * it like Dropbox or Google Drive share links.
 *
 * SHARE TYPES:
 * ------------
 * 1. PUBLIC: Anyone with the link can access (no restrictions)
 * 2. PASSWORD: Requires a password to access
 * 3. EXPIRING: Link expires after a set time
 * 4. USERS: Only specific registered users can access
 *
 * SECURITY FEATURES:
 * ------------------
 * 1. UNIQUE TOKENS: Each share has a cryptographically secure token
 * 2. PASSWORD PROTECTION: Optional bcrypt-hashed passwords
 * 3. EXPIRATION: Links can auto-expire after hours/days
 * 4. ACCESS LIMITS: Can limit total number of accesses
 * 5. ACCESS LOGGING: Every access is recorded with IP/user agent
 * 6. REVOCATION: Shares can be instantly revoked
 *
 * PERMISSIONS:
 * ------------
 * Each share can have specific permissions:
 * - canView: Can view/preview the file (always true)
 * - canDownload: Can download the file
 * - canComment: Can add comments (future feature)
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * bcrypt - Password hashing library for secure password storage.
 * Used to hash share passwords before storing them.
 */
import bcrypt from 'bcryptjs';

/**
 * FileShare model - represents a share link in the database.
 * Contains token, permissions, expiration, access log, etc.
 */
import FileShare from '../models/FileShare.js';

/**
 * File model - represents a file in the database.
 * Used to verify file ownership and get file details.
 */
import File from '../models/File.js';

/**
 * Storage factory - gets the configured storage provider (S3, local, etc.)
 * Used to generate signed download URLs.
 */
import { getDefaultProvider } from './storage/storageFactory.js';

// =============================================================================
// SHARE CREATION
// =============================================================================

/**
 * createShare(fileId, userId, options)
 * ------------------------------------
 * Creates a new share link for a file.
 *
 * @param {ObjectId} fileId - ID of the file to share
 * @param {ObjectId} userId - ID of the user creating the share
 * @param {Object} [options] - Share configuration options
 * @param {string} [options.shareType] - Type: 'public', 'password', 'expiring', 'users'
 * @param {number} [options.expiresIn] - Hours until expiration (null = never)
 * @param {string} [options.password] - Password for protected shares
 * @param {ObjectId[]} [options.allowedUsers] - User IDs who can access
 * @param {Object} [options.permissions] - Permission settings
 * @param {boolean} [options.permissions.canDownload] - Allow downloads (default: true)
 * @param {boolean} [options.permissions.canComment] - Allow comments (default: false)
 * @param {number} [options.maxAccessCount] - Maximum number of accesses allowed
 *
 * @returns {Promise<FileShare>} The created share document
 *
 * @throws {Error} If file not found or user doesn't own the file
 *
 * EXAMPLE:
 * // Create a public share
 * const share = await createShare(fileId, userId);
 *
 * // Create a password-protected share that expires in 24 hours
 * const share = await createShare(fileId, userId, {
 *   password: 'secret123',
 *   expiresIn: 24,
 *   permissions: { canDownload: true }
 * });
 *
 * // Create a share limited to 10 accesses
 * const share = await createShare(fileId, userId, {
 *   maxAccessCount: 10
 * });
 */
export async function createShare(fileId, userId, options = {}) {
  // Extract options with defaults
  const {
    shareType = 'public',           // Default to public share
    expiresIn = null,               // Hours until expiration (null = never)
    password = null,                // Optional password protection
    allowedUsers = [],              // Users who can access (for 'users' type)
    permissions = {},               // Permission settings
    maxAccessCount = null,          // Max number of accesses (null = unlimited)
  } = options;

  // =====================================================
  // VERIFY FILE OWNERSHIP
  // =====================================================
  // Only the file owner can create share links
  const file = await File.findOne({ _id: fileId, userId });
  if (!file) {
    throw new Error('File not found');
  }

  // =====================================================
  // GENERATE SHARE TOKEN
  // =====================================================
  // Create a unique, secure token for this share
  const shareToken = FileShare.generateToken();

  // =====================================================
  // CALCULATE EXPIRATION
  // =====================================================
  // Convert hours to a Date object
  let expiresAt = null;
  if (expiresIn) {
    expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000);
  }

  // =====================================================
  // HASH PASSWORD IF PROVIDED
  // =====================================================
  // Never store passwords in plain text
  let hashedPassword = null;
  if (password) {
    hashedPassword = await bcrypt.hash(password, 10);
  }

  // =====================================================
  // DETERMINE SHARE TYPE
  // =====================================================
  // Auto-detect type based on options provided
  // Priority: password > expiring > users > public
  const effectiveShareType = password
    ? 'password'
    : (expiresIn ? 'expiring' : (allowedUsers.length > 0 ? 'users' : shareType));

  // =====================================================
  // CREATE SHARE DOCUMENT
  // =====================================================
  const share = await FileShare.create({
    fileId,
    userId,
    shareToken,
    shareType: effectiveShareType,
    expiresAt,
    password: hashedPassword,
    allowedUsers,
    permissions: {
      canView: true,                              // Always allowed
      canDownload: permissions.canDownload !== false,  // Default true
      canComment: permissions.canComment || false,     // Default false
    },
    maxAccessCount,
  });

  // =====================================================
  // UPDATE FILE WITH SHARE INFO
  // =====================================================
  // Store share token on the file for quick lookups
  file.shareSettings = file.shareSettings || {};
  file.shareSettings.shareToken = shareToken;
  if (expiresAt) {
    file.shareSettings.shareTokenExpiry = expiresAt;
  }
  file.isPublic = shareType === 'public';
  await file.save();

  return share;
}

// =============================================================================
// SHARE RETRIEVAL
// =============================================================================

/**
 * getShareByToken(token)
 * ----------------------
 * Retrieves a share and its associated file by the share token.
 *
 * @param {string} token - The share token from the URL
 *
 * @returns {Promise<{share: FileShare, file: File}|null>} Share and file, or null
 *
 * NOTE: This doesn't verify access - it just retrieves the share.
 * Use verifyShareAccess() to check if access should be granted.
 */
export async function getShareByToken(token) {
  // Find share by token (model method handles validation)
  const share = await FileShare.findByToken(token);
  if (!share) return null;

  return {
    share,
    file: share.fileId,  // Populated by findByToken
  };
}

// =============================================================================
// ACCESS VERIFICATION
// =============================================================================

/**
 * verifyShareAccess(token, accessInfo)
 * ------------------------------------
 * Verifies if access should be granted for a share link.
 * Checks all security constraints: expiration, password, allowed users.
 *
 * @param {string} token - The share token
 * @param {Object} [accessInfo] - Information for verification
 * @param {string} [accessInfo.password] - Password if share is protected
 * @param {ObjectId} [accessInfo.userId] - User ID if authenticated
 *
 * @returns {Promise<Object>} Verification result:
 *   - valid: boolean - Is access granted?
 *   - needsPassword: boolean - Does share require a password?
 *   - share: FileShare - The share document (if valid)
 *   - file: File - The file document (if valid)
 *   - error: string - Error message (if invalid)
 *
 * EXAMPLE:
 * // Check access for public share
 * const result = await verifyShareAccess(token);
 *
 * // Check access with password
 * const result = await verifyShareAccess(token, { password: 'secret123' });
 *
 * // Check access for authenticated user
 * const result = await verifyShareAccess(token, { userId: currentUserId });
 *
 * POSSIBLE RESPONSES:
 * { valid: true, share, file }
 * { valid: false, error: 'Share not found' }
 * { valid: false, error: 'Share has expired or reached access limit' }
 * { valid: false, needsPassword: true }
 * { valid: false, error: 'Invalid password' }
 * { valid: false, error: 'You do not have access to this share' }
 */
export async function verifyShareAccess(token, accessInfo = {}) {
  const { password, userId } = accessInfo;

  // Find the share
  const share = await FileShare.findOne({ shareToken: token });
  if (!share) {
    return { valid: false, error: 'Share not found' };
  }

  // =====================================================
  // CHECK VALIDITY (expiration, access limit, active)
  // =====================================================
  if (!share.isValid()) {
    return { valid: false, error: 'Share has expired or reached access limit' };
  }

  // =====================================================
  // CHECK PASSWORD IF REQUIRED
  // =====================================================
  if (share.password) {
    // If password required but not provided, tell client to prompt
    if (!password) {
      return { valid: false, needsPassword: true };
    }
    // Verify password
    const passwordValid = await bcrypt.compare(password, share.password);
    if (!passwordValid) {
      return { valid: false, error: 'Invalid password' };
    }
  }

  // =====================================================
  // CHECK ALLOWED USERS IF RESTRICTED
  // =====================================================
  if (share.allowedUsers && share.allowedUsers.length > 0) {
    // User must be logged in and in the allowed list
    if (!userId || !share.allowedUsers.some(id => id.toString() === userId.toString())) {
      return { valid: false, error: 'You do not have access to this share' };
    }
  }

  // =====================================================
  // GET THE FILE
  // =====================================================
  const file = await File.findById(share.fileId);
  if (!file) {
    return { valid: false, error: 'File not found' };
  }

  // Access verified!
  return {
    valid: true,
    share,
    file,
  };
}

// =============================================================================
// SHARE ACCESS (DOWNLOAD)
// =============================================================================

/**
 * accessShare(token, accessInfo)
 * ------------------------------
 * Accesses a share and returns a download URL. Records the access.
 *
 * @param {string} token - The share token
 * @param {Object} [accessInfo] - Access information
 * @param {string} [accessInfo.password] - Password if required
 * @param {ObjectId} [accessInfo.userId] - Accessing user's ID
 * @param {string} [accessInfo.ipAddress] - Client IP address
 * @param {string} [accessInfo.userAgent] - Client user agent
 *
 * @returns {Promise<Object>} Download info:
 *   - url: string - Signed download URL
 *   - filename: string - Original filename
 *   - contentType: string - MIME type
 *   - size: number - File size in bytes
 *
 * @throws {Error} If access is not allowed or download is not permitted
 *
 * EXAMPLE:
 * const download = await accessShare(token, {
 *   password: 'secret123',
 *   ipAddress: '192.168.1.1',
 *   userAgent: 'Mozilla/5.0...'
 * });
 * // Returns: { url: 'https://s3...', filename: 'report.pdf', ... }
 *
 * WHAT HAPPENS:
 * 1. Verifies share access (all security checks)
 * 2. Checks download permission
 * 3. Records access in share's access log
 * 4. Generates signed download URL (valid for 1 hour)
 * 5. Updates file's download count and last accessed time
 * 6. Returns download information
 */
export async function accessShare(token, accessInfo = {}) {
  // Verify access first
  const result = await verifyShareAccess(token, accessInfo);
  if (!result.valid) {
    throw new Error(result.error || 'Invalid share');
  }

  const { share, file } = result;

  // =====================================================
  // CHECK DOWNLOAD PERMISSION
  // =====================================================
  if (!share.permissions.canDownload) {
    throw new Error('Download not permitted for this share');
  }

  // =====================================================
  // RECORD ACCESS
  // =====================================================
  // Log this access for analytics and security
  await share.recordAccess({
    userId: accessInfo.userId,
    ipAddress: accessInfo.ipAddress,
    userAgent: accessInfo.userAgent,
  });

  // =====================================================
  // GENERATE SIGNED URL
  // =====================================================
  // Get a temporary URL that expires in 1 hour
  const storage = getDefaultProvider();
  const url = await storage.getSignedUrl(file.storageKey, 3600, 'getObject');

  // =====================================================
  // UPDATE FILE STATISTICS
  // =====================================================
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
// SHARE MANAGEMENT
// =============================================================================

/**
 * getFileShares(fileId, userId)
 * -----------------------------
 * Gets all share links for a specific file.
 *
 * @param {ObjectId} fileId - ID of the file
 * @param {ObjectId} userId - ID of the user (for ownership verification)
 *
 * @returns {Promise<FileShare[]>} Array of share documents
 *
 * @throws {Error} If file not found or user doesn't own it
 */
export async function getFileShares(fileId, userId) {
  // Verify ownership
  const file = await File.findOne({ _id: fileId, userId });
  if (!file) {
    throw new Error('File not found');
  }

  // Get all shares for this file
  return FileShare.getFileShares(fileId);
}

/**
 * getUserShares(userId, options)
 * ------------------------------
 * Gets all share links created by a user (across all files).
 *
 * @param {ObjectId} userId - ID of the user
 * @param {Object} [options] - Query options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.limit=50] - Items per page
 * @param {boolean} [options.isActive=true] - Filter by active status (null = all)
 *
 * @returns {Promise<{shares: FileShare[], total: number}>} Paginated results
 *
 * EXAMPLE:
 * // Get first page of active shares
 * const { shares, total } = await getUserShares(userId);
 *
 * // Get all shares (including revoked)
 * const { shares, total } = await getUserShares(userId, { isActive: null });
 */
export async function getUserShares(userId, options = {}) {
  const { page = 1, limit = 50, isActive = true } = options;
  const skip = (page - 1) * limit;

  // Build query
  const query = { userId };
  if (isActive !== null) {
    query.isActive = isActive;
  }

  // Execute query with pagination
  const [shares, total] = await Promise.all([
    FileShare.find(query)
      .populate('fileId', 'originalName mimeType size thumbnailUrl')  // Include file info
      .sort({ createdAt: -1 })  // Newest first
      .skip(skip)
      .limit(limit),
    FileShare.countDocuments(query),
  ]);

  return { shares, total };
}

/**
 * updateShare(shareId, userId, updates)
 * -------------------------------------
 * Updates share settings.
 *
 * @param {ObjectId} shareId - ID of the share to update
 * @param {ObjectId} userId - ID of the user (for ownership verification)
 * @param {Object} updates - Fields to update
 * @param {Object} [updates.permissions] - New permissions
 * @param {Date} [updates.expiresAt] - New expiration date
 * @param {number} [updates.maxAccessCount] - New access limit
 * @param {boolean} [updates.isActive] - Active status
 * @param {string} [updates.password] - New password (or null to remove)
 *
 * @returns {Promise<FileShare|null>} Updated share or null if not found
 *
 * ALLOWED UPDATES:
 * - permissions
 * - expiresAt
 * - maxAccessCount
 * - isActive
 * - password (gets hashed)
 *
 * EXAMPLE:
 * // Extend expiration
 * await updateShare(shareId, userId, {
 *   expiresAt: new Date('2024-12-31')
 * });
 *
 * // Remove password protection
 * await updateShare(shareId, userId, { password: null });
 *
 * // Disable downloads
 * await updateShare(shareId, userId, {
 *   permissions: { canDownload: false }
 * });
 */
export async function updateShare(shareId, userId, updates) {
  // Find the share (ownership check)
  const share = await FileShare.findOne({ _id: shareId, userId });
  if (!share) return null;

  // Only allow specific updates
  const allowedUpdates = ['permissions', 'expiresAt', 'maxAccessCount', 'isActive'];

  // Apply allowed updates
  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      share[key] = updates[key];
    }
  }

  // =====================================================
  // HANDLE PASSWORD UPDATE SPECIALLY
  // =====================================================
  if (updates.password !== undefined) {
    if (updates.password) {
      // Set new password (hash it)
      share.password = await bcrypt.hash(updates.password, 10);
      share.shareType = 'password';
    } else {
      // Remove password protection
      share.password = null;
      // Revert to appropriate type
      share.shareType = share.expiresAt ? 'expiring' : 'public';
    }
  }

  await share.save();
  return share;
}

/**
 * revokeShare(shareId, userId)
 * ----------------------------
 * Revokes (deactivates) a share link.
 *
 * @param {ObjectId} shareId - ID of the share to revoke
 * @param {ObjectId} userId - ID of the user (for ownership verification)
 *
 * @returns {Promise<boolean>} True if revoked, false if not found
 *
 * NOTE: Revoked shares remain in the database for record-keeping
 * but can no longer be used for access.
 */
export async function revokeShare(shareId, userId) {
  const result = await FileShare.updateOne(
    { _id: shareId, userId },
    { $set: { isActive: false } }
  );
  return result.modifiedCount > 0;
}

/**
 * revokeFileShares(fileId, userId)
 * --------------------------------
 * Revokes ALL share links for a file.
 *
 * @param {ObjectId} fileId - ID of the file
 * @param {ObjectId} userId - ID of the user (for ownership verification)
 *
 * @returns {Promise<number>} Number of shares revoked
 *
 * @throws {Error} If file not found
 *
 * USE CASE: When you want to stop all sharing for a file at once.
 */
export async function revokeFileShares(fileId, userId) {
  // Verify ownership
  const file = await File.findOne({ _id: fileId, userId });
  if (!file) {
    throw new Error('File not found');
  }

  // Revoke all active shares
  const result = await FileShare.updateMany(
    { fileId, userId, isActive: true },
    { $set: { isActive: false } }
  );

  // Clear share settings on file
  file.shareSettings = {};
  file.isPublic = false;
  await file.save();

  return result.modifiedCount;
}

// =============================================================================
// ACCESS LOGGING
// =============================================================================

/**
 * getShareAccessLog(shareId, userId)
 * ----------------------------------
 * Gets the access log for a share (who accessed it and when).
 *
 * @param {ObjectId} shareId - ID of the share
 * @param {ObjectId} userId - ID of the user (for ownership verification)
 *
 * @returns {Promise<Object[]|null>} Array of access log entries or null
 *
 * EACH LOG ENTRY CONTAINS:
 * - accessedAt: Date
 * - userId: ObjectId (if authenticated)
 * - ipAddress: String
 * - userAgent: String
 *
 * NOTE: Returns last 100 entries, newest first.
 */
export async function getShareAccessLog(shareId, userId) {
  const share = await FileShare.findOne({ _id: shareId, userId });
  if (!share) return null;

  // Return last 100 entries in reverse chronological order
  return share.accessLog.slice(-100).reverse();
}

// =============================================================================
// PUBLIC FILE INFO
// =============================================================================

/**
 * getPublicFileInfo(token)
 * ------------------------
 * Gets publicly-visible information about a shared file.
 * Used for share page previews before download.
 *
 * @param {string} token - The share token
 *
 * @returns {Promise<Object|null>} Public file info or null if invalid
 *
 * RETURNS:
 * - filename: Original filename
 * - size: File size in bytes
 * - mimeType: MIME type
 * - fileCategory: Category (document, image, etc.)
 * - thumbnailUrl: Preview thumbnail (if available)
 * - uploadedAt: When file was uploaded
 * - permissions: What actions are allowed
 * - needsPassword: Whether password is required
 * - expiresAt: When share expires
 *
 * NOTE: This doesn't require password verification - it just shows
 * basic info for the share landing page.
 */
export async function getPublicFileInfo(token) {
  // Find share (must be active)
  const share = await FileShare.findOne({ shareToken: token, isActive: true });
  if (!share || !share.isValid()) return null;

  // Get file info
  const file = await File.findById(share.fileId);
  if (!file) return null;

  // Return public info (nothing sensitive)
  return {
    filename: file.originalName,
    size: file.size,
    mimeType: file.mimeType,
    fileCategory: file.fileCategory,
    thumbnailUrl: file.thumbnailUrl,
    uploadedAt: file.createdAt,
    permissions: share.permissions,
    needsPassword: !!share.password,
    expiresAt: share.expiresAt,
  };
}

// =============================================================================
// SHARE COUNT
// =============================================================================

/**
 * getUserShareCount(userId)
 * -------------------------
 * Gets the count of active shares for a user.
 * Used for limit checking before creating new shares.
 *
 * @param {ObjectId} userId - ID of the user
 *
 * @returns {Promise<number>} Number of active shares
 */
export async function getUserShareCount(userId) {
  return FileShare.getUserShareCount(userId);
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all share service functions.
 *
 * USAGE:
 * import shareService from './services/shareService.js';
 *
 * // Create a share
 * const share = await shareService.createShare(fileId, userId, {
 *   password: 'secret',
 *   expiresIn: 24
 * });
 *
 * // Verify and access
 * const result = await shareService.verifyShareAccess(token, { password });
 * if (result.valid) {
 *   const download = await shareService.accessShare(token, { password });
 * }
 *
 * // Manage shares
 * const shares = await shareService.getUserShares(userId);
 * await shareService.revokeShare(shareId, userId);
 */
export default {
  createShare,
  getShareByToken,
  verifyShareAccess,
  accessShare,
  getFileShares,
  getUserShares,
  updateShare,
  revokeShare,
  revokeFileShares,
  getShareAccessLog,
  getPublicFileInfo,
  getUserShareCount,
};
