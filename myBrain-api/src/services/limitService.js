import RoleConfig from '../models/RoleConfig.js';

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
  categories: 'maxCategories'
};

// Map resource types to their corresponding usage keys
const RESOURCE_USAGE_MAP = {
  notes: 'notes',
  tasks: 'tasks',
  projects: 'projects',
  events: 'events',
  images: 'images',
  categories: 'categories'
};

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

export default {
  canCreate,
  canUploadImage,
  getUserLimitStatus,
  formatBytes,
  RESOURCE_LIMIT_MAP,
  RESOURCE_USAGE_MAP
};
