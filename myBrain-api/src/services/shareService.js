import bcrypt from 'bcryptjs';
import FileShare from '../models/FileShare.js';
import File from '../models/File.js';
import { getDefaultProvider } from './storage/storageFactory.js';

/**
 * Create a share link for a file
 * @param {string} fileId - File ID
 * @param {string} userId - User ID
 * @param {Object} options - Share options
 * @returns {Promise<FileShare>}
 */
export async function createShare(fileId, userId, options = {}) {
  const {
    shareType = 'public',
    expiresIn = null, // Hours until expiration
    password = null,
    allowedUsers = [],
    permissions = {},
    maxAccessCount = null,
  } = options;

  // Verify file ownership
  const file = await File.findOne({ _id: fileId, userId });
  if (!file) {
    throw new Error('File not found');
  }

  // Generate share token
  const shareToken = FileShare.generateToken();

  // Calculate expiration
  let expiresAt = null;
  if (expiresIn) {
    expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000);
  }

  // Hash password if provided
  let hashedPassword = null;
  if (password) {
    hashedPassword = await bcrypt.hash(password, 10);
  }

  // Create share
  const share = await FileShare.create({
    fileId,
    userId,
    shareToken,
    shareType: password ? 'password' : (expiresIn ? 'expiring' : (allowedUsers.length > 0 ? 'users' : shareType)),
    expiresAt,
    password: hashedPassword,
    allowedUsers,
    permissions: {
      canView: true,
      canDownload: permissions.canDownload !== false,
      canComment: permissions.canComment || false,
    },
    maxAccessCount,
  });

  // Update file share settings
  file.shareSettings = file.shareSettings || {};
  file.shareSettings.shareToken = shareToken;
  if (expiresAt) {
    file.shareSettings.shareTokenExpiry = expiresAt;
  }
  file.isPublic = shareType === 'public';
  await file.save();

  return share;
}

/**
 * Get share by token
 * @param {string} token - Share token
 * @returns {Promise<{share: FileShare, file: File}|null>}
 */
export async function getShareByToken(token) {
  const share = await FileShare.findByToken(token);
  if (!share) return null;

  return {
    share,
    file: share.fileId,
  };
}

/**
 * Verify share access
 * @param {string} token - Share token
 * @param {Object} accessInfo - Access information
 * @returns {Promise<{valid: boolean, needsPassword?: boolean, share?: FileShare, file?: File, error?: string}>}
 */
export async function verifyShareAccess(token, accessInfo = {}) {
  const { password, userId } = accessInfo;

  const share = await FileShare.findOne({ shareToken: token });
  if (!share) {
    return { valid: false, error: 'Share not found' };
  }

  // Check if share is still valid
  if (!share.isValid()) {
    return { valid: false, error: 'Share has expired or reached access limit' };
  }

  // Check password if required
  if (share.password) {
    if (!password) {
      return { valid: false, needsPassword: true };
    }
    const passwordValid = await bcrypt.compare(password, share.password);
    if (!passwordValid) {
      return { valid: false, error: 'Invalid password' };
    }
  }

  // Check allowed users if restricted
  if (share.allowedUsers && share.allowedUsers.length > 0) {
    if (!userId || !share.allowedUsers.some(id => id.toString() === userId.toString())) {
      return { valid: false, error: 'You do not have access to this share' };
    }
  }

  // Get the file
  const file = await File.findById(share.fileId);
  if (!file) {
    return { valid: false, error: 'File not found' };
  }

  return {
    valid: true,
    share,
    file,
  };
}

/**
 * Record share access and get download URL
 * @param {string} token - Share token
 * @param {Object} accessInfo - Access information
 * @returns {Promise<{url: string, filename: string, contentType: string, size: number}>}
 */
export async function accessShare(token, accessInfo = {}) {
  const result = await verifyShareAccess(token, accessInfo);
  if (!result.valid) {
    throw new Error(result.error || 'Invalid share');
  }

  const { share, file } = result;

  // Check download permission
  if (!share.permissions.canDownload) {
    throw new Error('Download not permitted for this share');
  }

  // Record access
  await share.recordAccess({
    userId: accessInfo.userId,
    ipAddress: accessInfo.ipAddress,
    userAgent: accessInfo.userAgent,
  });

  // Generate download URL
  const storage = getDefaultProvider();
  const url = await storage.getSignedUrl(file.storageKey, 3600, 'getObject');

  // Update file access tracking
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
 * Get all shares for a file
 * @param {string} fileId - File ID
 * @param {string} userId - User ID
 * @returns {Promise<FileShare[]>}
 */
export async function getFileShares(fileId, userId) {
  // Verify ownership
  const file = await File.findOne({ _id: fileId, userId });
  if (!file) {
    throw new Error('File not found');
  }

  return FileShare.getFileShares(fileId);
}

/**
 * Get all shares created by a user
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<{shares: FileShare[], total: number}>}
 */
export async function getUserShares(userId, options = {}) {
  const { page = 1, limit = 50, isActive = true } = options;
  const skip = (page - 1) * limit;

  const query = { userId };
  if (isActive !== null) {
    query.isActive = isActive;
  }

  const [shares, total] = await Promise.all([
    FileShare.find(query)
      .populate('fileId', 'originalName mimeType size thumbnailUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    FileShare.countDocuments(query),
  ]);

  return { shares, total };
}

/**
 * Update share settings
 * @param {string} shareId - Share ID
 * @param {string} userId - User ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<FileShare|null>}
 */
export async function updateShare(shareId, userId, updates) {
  const share = await FileShare.findOne({ _id: shareId, userId });
  if (!share) return null;

  const allowedUpdates = ['permissions', 'expiresAt', 'maxAccessCount', 'isActive'];

  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      share[key] = updates[key];
    }
  }

  // Handle password update
  if (updates.password !== undefined) {
    if (updates.password) {
      share.password = await bcrypt.hash(updates.password, 10);
      share.shareType = 'password';
    } else {
      share.password = null;
      share.shareType = share.expiresAt ? 'expiring' : 'public';
    }
  }

  await share.save();
  return share;
}

/**
 * Revoke a share
 * @param {string} shareId - Share ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
export async function revokeShare(shareId, userId) {
  const result = await FileShare.updateOne(
    { _id: shareId, userId },
    { $set: { isActive: false } }
  );
  return result.modifiedCount > 0;
}

/**
 * Revoke all shares for a file
 * @param {string} fileId - File ID
 * @param {string} userId - User ID
 * @returns {Promise<number>}
 */
export async function revokeFileShares(fileId, userId) {
  // Verify ownership
  const file = await File.findOne({ _id: fileId, userId });
  if (!file) {
    throw new Error('File not found');
  }

  const result = await FileShare.updateMany(
    { fileId, userId, isActive: true },
    { $set: { isActive: false } }
  );

  // Update file
  file.shareSettings = {};
  file.isPublic = false;
  await file.save();

  return result.modifiedCount;
}

/**
 * Get share access log
 * @param {string} shareId - Share ID
 * @param {string} userId - User ID
 * @returns {Promise<Object[]>}
 */
export async function getShareAccessLog(shareId, userId) {
  const share = await FileShare.findOne({ _id: shareId, userId });
  if (!share) return null;

  return share.accessLog.slice(-100).reverse();
}

/**
 * Get public file info (for share pages)
 * @param {string} token - Share token
 * @returns {Promise<Object|null>}
 */
export async function getPublicFileInfo(token) {
  const share = await FileShare.findOne({ shareToken: token, isActive: true });
  if (!share || !share.isValid()) return null;

  const file = await File.findById(share.fileId);
  if (!file) return null;

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

/**
 * Get user share count (for limit checking)
 * @param {string} userId - User ID
 * @returns {Promise<number>}
 */
export async function getUserShareCount(userId) {
  return FileShare.getUserShareCount(userId);
}

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
