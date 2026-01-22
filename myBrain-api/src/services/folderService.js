/**
 * =============================================================================
 * FOLDERSERVICE.JS - Folder Hierarchy Management Service
 * =============================================================================
 *
 * This service manages the folder system for organizing files in myBrain.
 * It provides functions for creating, moving, deleting folders and managing
 * their hierarchical structure.
 *
 * WHAT IS A FOLDER HIERARCHY?
 * ---------------------------
 * Folders are organized in a tree structure, just like on your computer:
 *
 * /                         (root)
 * ├── Documents/
 * │   ├── Work/
 * │   │   └── Reports/
 * │   └── Personal/
 * └── Photos/
 *     └── 2024/
 *
 * Each folder can contain:
 * - Files (managed by fileService)
 * - Subfolders (managed by this service)
 *
 * PATH SYSTEM:
 * ------------
 * Each folder has a "path" that represents its location in the tree:
 * - /Documents
 * - /Documents/Work
 * - /Documents/Work/Reports
 *
 * Paths are useful for:
 * - Querying all items under a folder
 * - Displaying breadcrumbs
 * - Moving folders and updating all descendants
 *
 * FOLDER TYPES:
 * -------------
 * 1. USER FOLDERS: Regular folders created by users
 * 2. ENTITY FOLDERS: Auto-created folders linked to projects/tasks/notes
 *    - When you create a project, it can have its own folder
 *    - Files related to that project go in this folder
 *
 * TRASH SYSTEM:
 * -------------
 * Folders support soft delete (trash):
 * - Trashing a folder also trashes all subfolders and files
 * - Restoring a folder restores everything inside
 * - Permanent deletion removes folder, subfolders, and files
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Folder model - MongoDB schema for folder documents.
 */
import Folder from '../models/Folder.js';

/**
 * File model - for managing files within folders.
 */
import File from '../models/File.js';

// =============================================================================
// FOLDER CREATION
// =============================================================================

/**
 * createFolder(userId, data)
 * --------------------------
 * Create a new folder.
 *
 * @param {string} userId - User ID (owner of the folder)
 *
 * @param {Object} data - Folder data:
 *   @param {string} data.name - Folder name (required)
 *   @param {string} data.parentId - Parent folder ID (null for root)
 *   @param {string} data.color - Optional color for the folder icon
 *   @param {string} data.icon - Icon name (default: 'folder')
 *
 * @returns {Promise<Folder>} Created folder document
 *
 * @throws {Error} If folder name already exists in the same location
 *
 * EXAMPLE:
 * ```javascript
 * const folder = await createFolder(userId, {
 *   name: 'Reports',
 *   parentId: workFolderId,
 *   color: '#3b82f6',
 *   icon: 'folder-chart'
 * });
 * ```
 */
export async function createFolder(userId, data) {
  const { name, parentId = null, color = null, icon = 'folder' } = data;

  // =====================================================
  // CHECK FOR DUPLICATE NAMES
  // =====================================================
  // Folders in the same parent cannot have the same name
  // (Just like on your computer)

  const exists = await Folder.nameExistsInParent(userId, parentId, name);
  if (exists) {
    throw new Error('A folder with this name already exists in this location');
  }

  // =====================================================
  // CREATE FOLDER
  // =====================================================

  const folder = new Folder({
    userId,
    name,
    parentId,
    color,
    icon,
    folderType: 'user',  // Regular user-created folder
  });

  // =====================================================
  // GENERATE PATH
  // =====================================================
  // Path is auto-generated based on parent's path + this folder's name
  // E.g., parent path "/Documents" + name "Work" = "/Documents/Work"

  await folder.generatePath();
  await folder.save();

  // =====================================================
  // UPDATE PARENT STATISTICS
  // =====================================================
  // Parent folder needs to know it has a new subfolder

  if (parentId) {
    await updateParentStats(parentId);
  }

  return folder;
}

/**
 * createEntityFolder(userId, entityId, entityType, name)
 * ------------------------------------------------------
 * Create a folder linked to an entity (project, task, or note).
 * Entity folders are auto-created when needed and linked to their entity.
 *
 * @param {string} userId - User ID
 * @param {string} entityId - ID of the linked entity
 * @param {string} entityType - Type of entity: 'project', 'task', or 'note'
 * @param {string} name - Folder name (usually the entity name)
 *
 * @returns {Promise<Folder>} Created or existing folder
 *
 * BEHAVIOR:
 * - If folder already exists for entity → return existing
 * - Otherwise → create new folder at root level
 * - Folder gets a special icon based on entity type
 *
 * EXAMPLE:
 * ```javascript
 * // When creating a project, auto-create its folder
 * const projectFolder = await createEntityFolder(
 *   userId,
 *   project._id,
 *   'project',
 *   project.name
 * );
 * ```
 */
export async function createEntityFolder(userId, entityId, entityType, name) {
  // Check if folder already exists for this entity
  const existing = await Folder.findOne({
    userId,
    linkedEntityId: entityId,
    linkedEntityType: entityType,
  });

  // Return existing folder if found (idempotent operation)
  if (existing) {
    return existing;
  }

  // =====================================================
  // CREATE NEW ENTITY FOLDER
  // =====================================================

  const folder = new Folder({
    userId,
    name,
    parentId: null,  // Entity folders are at root level
    folderType: entityType,
    linkedEntityId: entityId,
    linkedEntityType: entityType,
    // Choose icon based on entity type
    icon: entityType === 'project' ? 'folder-kanban'
        : entityType === 'task' ? 'folder-check'
        : 'folder-file',
  });

  await folder.generatePath();
  await folder.save();

  return folder;
}

// =============================================================================
// FOLDER RETRIEVAL
// =============================================================================

/**
 * getFolders(userId, options)
 * ---------------------------
 * Get folders for a user with optional filtering.
 *
 * @param {string} userId - User ID
 *
 * @param {Object} options - Filter options:
 *   @param {string} options.parentId - Filter by parent (null for root folders)
 *   @param {boolean} options.includeTrashed - Include trashed folders (default: false)
 *   @param {string} options.folderType - Filter by type ('user', 'project', etc.)
 *
 * @returns {Promise<Folder[]>} Array of folder documents, sorted by name
 *
 * EXAMPLE:
 * ```javascript
 * // Get root folders
 * const rootFolders = await getFolders(userId, { parentId: null });
 *
 * // Get subfolders of a specific folder
 * const subfolders = await getFolders(userId, { parentId: folderId });
 * ```
 */
export async function getFolders(userId, options = {}) {
  const { parentId, includeTrashed = false, folderType } = options;

  // Build query
  const query = { userId };

  // By default, exclude trashed folders
  if (!includeTrashed) {
    query.isTrashed = false;
  }

  // Filter by parent folder
  if (parentId !== undefined) {
    query.parentId = parentId || null;  // null means root level
  }

  // Filter by folder type
  if (folderType) {
    query.folderType = folderType;
  }

  // Return sorted by name (alphabetical)
  return Folder.find(query).sort({ name: 1 });
}

/**
 * getFolderTree(userId, options)
 * ------------------------------
 * Get the entire folder tree structure for a user.
 * Returns nested array suitable for rendering a tree view.
 *
 * @param {string} userId - User ID
 * @param {Object} options - Tree options passed to model method
 *
 * @returns {Promise<Object[]>} Nested folder tree structure
 *
 * OUTPUT STRUCTURE:
 * ```javascript
 * [
 *   {
 *     _id: 'folder1',
 *     name: 'Documents',
 *     children: [
 *       { _id: 'folder2', name: 'Work', children: [...] },
 *       { _id: 'folder3', name: 'Personal', children: [] }
 *     ]
 *   },
 *   {
 *     _id: 'folder4',
 *     name: 'Photos',
 *     children: []
 *   }
 * ]
 * ```
 */
export async function getFolderTree(userId, options = {}) {
  return Folder.getFolderTree(userId, options);
}

/**
 * getFolderWithContents(folderId, userId, options)
 * ------------------------------------------------
 * Get a folder along with its contents (files and subfolders).
 *
 * @param {string} folderId - Folder ID
 * @param {string} userId - User ID
 * @param {Object} options - Content options (pagination, sorting)
 *
 * @returns {Promise<Object>} Folder with contents:
 *   - folder: The folder document
 *   - files: Array of files in the folder
 *   - subfolders: Array of child folders
 */
export async function getFolderWithContents(folderId, userId, options = {}) {
  return Folder.getFolderContents(folderId, userId, options);
}

/**
 * getFolder(folderId, userId)
 * ---------------------------
 * Get a single folder by ID.
 *
 * @param {string} folderId - Folder ID
 * @param {string} userId - User ID
 *
 * @returns {Promise<Folder|null>} Folder document or null
 */
export async function getFolder(folderId, userId) {
  return Folder.findOne({ _id: folderId, userId });
}

/**
 * getBreadcrumb(folderId)
 * -----------------------
 * Get the breadcrumb path for a folder.
 * Useful for navigation: Home > Documents > Work > Reports
 *
 * @param {string} folderId - Folder ID
 *
 * @returns {Promise<Array<{_id: string, name: string}>>} Breadcrumb array
 *
 * EXAMPLE OUTPUT:
 * ```javascript
 * [
 *   { _id: 'root', name: 'Home' },
 *   { _id: 'abc', name: 'Documents' },
 *   { _id: 'def', name: 'Work' },
 *   { _id: 'ghi', name: 'Reports' }  // Current folder
 * ]
 * ```
 */
export async function getBreadcrumb(folderId) {
  return Folder.getBreadcrumb(folderId);
}

// =============================================================================
// FOLDER UPDATES
// =============================================================================

/**
 * updateFolder(folderId, userId, updates)
 * ---------------------------------------
 * Update folder properties like name, color, and icon.
 * Handles cascade updates when renaming (paths, descendants, files).
 *
 * BUSINESS LOGIC:
 * - Only allowed fields can be updated (whitelist approach)
 * - Renaming requires special handling to cascade path changes
 * - Checks for duplicate names in same parent location
 * - Updates all descendant folder paths when parent is renamed
 * - Updates all files in folder with new path
 * - Prevents naming conflicts (same name in same folder not allowed)
 *
 * @param {string} folderId - Folder ID to update
 * @param {string} userId - User ID (verified owner)
 * @param {Object} updates - Fields to update (only these are allowed):
 *   - {string} updates.name - New folder name (must be unique within parent)
 *   - {string} updates.color - New color for folder icon (hex or name)
 *   - {string} updates.icon - New icon name (e.g., 'folder', 'folder-chart')
 *
 * @returns {Promise<Folder|null>} Updated folder document or null if not found
 *
 * @throws {Error} If new name already exists in same parent location
 *
 * CASCADE BEHAVIOR ON RENAME:
 * When renaming /Documents → /Files:
 * - /Documents/Work becomes /Files/Work
 * - /Documents/Work/Reports becomes /Files/Work/Reports
 * - All files in all subfolders get updated paths
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Rename folder
 * const updated = await updateFolder('folder123', userId, {
 *   name: 'Archive',
 *   color: '#9ca3af'
 * });
 *
 * // Change icon
 * const updated2 = await updateFolder('folder123', userId, {
 *   icon: 'folder-star'
 * });
 * ```
 */
export async function updateFolder(folderId, userId, updates) {
  // =====================================================
  // WHITELIST ALLOWED UPDATE FIELDS
  // =====================================================
  // Only these fields can be user-modified

  const allowedUpdates = ['name', 'color', 'icon'];
  const filteredUpdates = {};

  // Filter to only allowed fields
  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }

  // =====================================================
  // SPECIAL HANDLING FOR RENAME
  // =====================================================
  // If name is changing, need to update folder path and cascade to descendants

  if (filteredUpdates.name) {
    // Find the folder being updated
    const folder = await Folder.findOne({ _id: folderId, userId });
    if (!folder) return null;

    // =====================================================
    // CHECK FOR NAME CONFLICT
    // =====================================================
    // Can't have two folders with same name in same parent
    // Exclude current folder from check so we can "update" to same name

    const exists = await Folder.nameExistsInParent(
      userId,
      folder.parentId,
      filteredUpdates.name,
      folderId  // Exclude this folder from check
    );
    if (exists) {
      // Another folder with this name already exists in this location
      const error = new Error('A folder with this name already exists in this location');
      error.statusCode = 409;  // Conflict
      throw error;
    }

    // =====================================================
    // UPDATE FOLDER PATH
    // =====================================================
    // Path is generated from parent path + name
    // E.g., parent "/Documents" + name "Work" = "/Documents/Work"

    const oldPath = folder.path;  // Save for cascade updates

    // Update name and regenerate path
    folder.name = filteredUpdates.name;
    await folder.generatePath();  // Recalculate path based on new name
    filteredUpdates.path = folder.path;  // Include in updates

    // =====================================================
    // UPDATE DESCENDANT PATHS
    // =====================================================
    // All subfolders need their paths updated
    // E.g., /Documents/Work → /Archive/Work means /Documents/Work/Reports → /Archive/Work/Reports

    await Folder.updateDescendantPaths(folderId, oldPath, folder.path);

    // =====================================================
    // UPDATE FILE PATHS
    // =====================================================
    // Files store folder path for hierarchy queries
    // Update files directly in this folder

    await File.updateMany(
      { folderId, userId },
      { $set: { path: folder.path } }
    );
  }

  // =====================================================
  // APPLY ALL UPDATES
  // =====================================================

  return Folder.findOneAndUpdate(
    { _id: folderId, userId },
    { $set: filteredUpdates },
    { new: true, runValidators: true }  // Return updated doc, validate
  );
}

// =============================================================================
// FOLDER MOVING
// =============================================================================

/**
 * moveFolder(folderId, newParentId, userId)
 * -----------------------------------------
 * Move a folder to a new location in the hierarchy.
 * Updates folder and all descendants' paths, and folder statistics.
 *
 * BUSINESS LOGIC:
 * - Folder must exist and belong to user
 * - Cannot move folder into its own descendants (would create loop)
 * - Target parent must exist and belong to user
 * - Name must be unique within target parent location
 * - All descendant folder paths are recalculated
 * - All file paths within the folder are updated
 * - Both old and new parent statistics are recalculated
 *
 * VALIDATION PREVENTS CYCLES:
 * Moving /Documents into /Documents/Work would create:
 * /Documents/Work/Documents (the original /Documents, now a child of itself)
 * This is impossible in a tree structure, so we prevent it.
 *
 * @param {string} folderId - Folder ID to move
 * @param {string|null} newParentId - New parent folder ID (null = move to root)
 * @param {string} userId - User ID (verified owner)
 *
 * @returns {Promise<Folder|null>} Moved folder or null if not found
 *
 * @throws {Error} If trying to move folder into itself or its descendants
 * @throws {Error} If target parent not found or doesn't belong to user
 * @throws {Error} If folder name already exists in target location
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Move folder to a different location
 * const moved = await moveFolder('folder123', 'parent456', userId);
 * console.log(`Folder moved to: ${moved.path}`);
 *
 * // Move folder to root
 * const root = await moveFolder('folder123', null, userId);
 * console.log(`Folder moved to root: ${root.parentId}`);
 * ```
 */
export async function moveFolder(folderId, newParentId, userId) {
  // =====================================================
  // FIND FOLDER
  // =====================================================
  // Must exist and belong to this user

  const folder = await Folder.findOne({ _id: folderId, userId });
  if (!folder) return null;

  // =====================================================
  // VALIDATE MOVE OPERATION
  // =====================================================

  if (newParentId) {
    // =====================================================
    // CHECK FOR CIRCULAR HIERARCHY
    // =====================================================
    // Cannot move folder into itself or any of its descendants
    // This would create an impossible loop in the tree

    const canMove = await Folder.canMoveTo(folderId, newParentId);
    if (!canMove) {
      const error = new Error('Cannot move folder into its own descendant');
      error.statusCode = 409;  // Conflict - hierarchy would be broken
      throw error;
    }

    // =====================================================
    // VERIFY TARGET PARENT EXISTS
    // =====================================================
    // Ensure new parent folder exists and belongs to user

    const targetFolder = await Folder.findOne({ _id: newParentId, userId });
    if (!targetFolder) {
      const error = new Error('Target folder not found');
      error.statusCode = 404;
      throw error;
    }
  }

  // =====================================================
  // CHECK FOR NAME CONFLICT IN NEW LOCATION
  // =====================================================
  // Same name not allowed in same parent

  const exists = await Folder.nameExistsInParent(
    userId,
    newParentId,
    folder.name,
    folderId  // Exclude this folder from check
  );
  if (exists) {
    const error = new Error('A folder with this name already exists in the target location');
    error.statusCode = 409;
    throw error;
  }

  // =====================================================
  // PERFORM MOVE
  // =====================================================
  // Update parent reference and regenerate path

  const oldPath = folder.path;  // Save for cascade updates
  const oldParentId = folder.parentId;  // Save for stats update

  folder.parentId = newParentId || null;  // Set new parent (null = root)
  await folder.generatePath();  // Recalculate path based on new parent
  await folder.save();

  // =====================================================
  // UPDATE ALL DESCENDANT PATHS
  // =====================================================
  // All subfolders need their paths updated to reflect new location
  // E.g., /Documents/Work → /Archive/Work means /Documents/Work/Reports → /Archive/Work/Reports

  await Folder.updateDescendantPaths(folderId, oldPath, folder.path);

  // =====================================================
  // UPDATE FILE PATHS
  // =====================================================
  // Files in this folder and subfolders need updated paths

  await updateFilePaths(folder.path, oldPath);

  // =====================================================
  // UPDATE FOLDER STATISTICS
  // =====================================================
  // Both old and new parents need recalculated stats

  if (oldParentId) {
    // Old parent lost one subfolder - recalculate its stats
    await updateParentStats(oldParentId);
  }
  if (newParentId) {
    // New parent gained one subfolder - recalculate its stats
    await updateParentStats(newParentId);
  }

  return folder;
}

// =============================================================================
// TRASH MANAGEMENT
// =============================================================================

/**
 * trashFolder(folderId, userId)
 * -----------------------------
 * Move a folder to trash (soft delete).
 * This also trashes all subfolders and files within.
 *
 * @param {string} folderId - Folder ID
 * @param {string} userId - User ID
 *
 * @returns {Promise<Folder|null>} Trashed folder or null
 *
 * CASCADE BEHAVIOR:
 * - All subfolders are trashed
 * - All files in folder and subfolders are trashed
 * - Everything can be restored together
 */
export async function trashFolder(folderId, userId) {
  const folder = await Folder.findOneAndUpdate(
    { _id: folderId, userId },
    { $set: { isTrashed: true, trashedAt: new Date() } },
    { new: true }
  );

  if (!folder) return null;

  // =====================================================
  // TRASH ALL SUBFOLDERS
  // =====================================================
  // Find all folders whose path starts with this folder's path

  await Folder.updateMany(
    { userId, path: new RegExp(`^${folder.path}/`) },
    { $set: { isTrashed: true, trashedAt: new Date() } }
  );

  // =====================================================
  // TRASH ALL FILES
  // =====================================================
  // Find all files whose path starts with this folder's path

  await File.updateMany(
    { userId, path: new RegExp(`^${folder.path}`) },
    { $set: { isTrashed: true, trashedAt: new Date() } }
  );

  // Update parent stats
  if (folder.parentId) {
    await updateParentStats(folder.parentId);
  }

  return folder;
}

/**
 * restoreFolder(folderId, userId)
 * -------------------------------
 * Restore a folder from trash.
 * This also restores all subfolders and files within.
 *
 * @param {string} folderId - Folder ID
 * @param {string} userId - User ID
 *
 * @returns {Promise<Folder|null>} Restored folder or null
 */
export async function restoreFolder(folderId, userId) {
  const folder = await Folder.findOneAndUpdate(
    { _id: folderId, userId, isTrashed: true },
    { $set: { isTrashed: false }, $unset: { trashedAt: 1 } },
    { new: true }
  );

  if (!folder) return null;

  // =====================================================
  // RESTORE ALL SUBFOLDERS
  // =====================================================

  await Folder.updateMany(
    { userId, path: new RegExp(`^${folder.path}/`) },
    { $set: { isTrashed: false }, $unset: { trashedAt: 1 } }
  );

  // =====================================================
  // RESTORE ALL FILES
  // =====================================================

  await File.updateMany(
    { userId, path: new RegExp(`^${folder.path}`) },
    { $set: { isTrashed: false }, $unset: { trashedAt: 1 } }
  );

  // Update parent stats
  if (folder.parentId) {
    await updateParentStats(folder.parentId);
  }

  return folder;
}

/**
 * deleteFolder(folderId, userId)
 * ------------------------------
 * Permanently delete a folder and all its contents.
 *
 * @param {string} folderId - Folder ID
 * @param {string} userId - User ID
 *
 * @returns {Promise<Object>} Deletion stats:
 *   - deleted: boolean - Was folder deleted?
 *   - filesDeleted: number - Count of deleted files
 *   - subfoldersDeleted: number - Count of deleted subfolders
 *
 * WARNING: This is irreversible! All files and subfolders are permanently deleted.
 */
export async function deleteFolder(folderId, userId) {
  const folder = await Folder.findOne({ _id: folderId, userId });
  if (!folder) return { deleted: false, filesDeleted: 0, subfoldersDeleted: 0 };

  // =====================================================
  // IMPORT FILE SERVICE (DYNAMIC)
  // =====================================================
  // Dynamic import to avoid circular dependency
  // fileService imports folderService, so we can't import it at top level

  const fileService = await import('./fileService.js');

  // =====================================================
  // DELETE ALL FILES
  // =====================================================
  // Find all files in this folder and all subfolders

  const files = await File.find({
    userId,
    $or: [
      { folderId },                                    // Direct children
      { path: new RegExp(`^${folder.path}/`) },       // Files in subfolders
    ],
  });

  if (files.length > 0) {
    // Bulk delete all files (handles storage cleanup)
    await fileService.bulkDeleteFiles(files.map(f => f._id), userId);
  }

  // =====================================================
  // DELETE ALL SUBFOLDERS
  // =====================================================

  const subfolderResult = await Folder.deleteMany({
    userId,
    path: new RegExp(`^${folder.path}/`),
  });

  // =====================================================
  // DELETE THE FOLDER ITSELF
  // =====================================================

  const parentId = folder.parentId;
  await Folder.deleteOne({ _id: folderId });

  // Update parent stats
  if (parentId) {
    await updateParentStats(parentId);
  }

  return {
    deleted: true,
    filesDeleted: files.length,
    subfoldersDeleted: subfolderResult.deletedCount,
  };
}

// =============================================================================
// FOLDER STATISTICS
// =============================================================================

/**
 * getFolderStats(folderId, userId)
 * --------------------------------
 * Get statistics for a folder (file count, total size, subfolder count).
 *
 * @param {string} folderId - Folder ID
 * @param {string} userId - User ID
 *
 * @returns {Promise<Object|null>} Folder stats:
 *   - folder: The folder document
 *   - totalFiles: Number of files (recursive)
 *   - totalSize: Total bytes of all files
 *   - subfolderCount: Number of subfolders (recursive)
 */
export async function getFolderStats(folderId, userId) {
  const folder = await Folder.findOne({ _id: folderId, userId });
  if (!folder) return null;

  // =====================================================
  // COUNT FILES RECURSIVELY
  // =====================================================
  // Use aggregation to count files and sum their sizes

  const fileStats = await File.aggregate([
    {
      $match: {
        userId: folder.userId,
        $or: [
          { folderId: folder._id },
          { path: new RegExp(`^${folder.path}/`) },
        ],
        isTrashed: false,
        isLatestVersion: true,
      },
    },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$size' },
      },
    },
  ]);

  // =====================================================
  // COUNT SUBFOLDERS
  // =====================================================

  const subfolderCount = await Folder.countDocuments({
    userId,
    path: new RegExp(`^${folder.path}/`),
    isTrashed: false,
  });

  return {
    folder: folder.toSafeJSON(),
    totalFiles: fileStats[0]?.totalFiles || 0,
    totalSize: fileStats[0]?.totalSize || 0,
    subfolderCount,
  };
}

// =============================================================================
// TRASHED FOLDERS
// =============================================================================

/**
 * getTrashedFolders(userId)
 * -------------------------
 * Get top-level trashed folders.
 * Only returns parent trashed folders, not their children.
 *
 * @param {string} userId - User ID
 *
 * @returns {Promise<Folder[]>} Trashed folders
 *
 * NOTE: If you trash /Documents and /Documents/Work, only /Documents
 * is returned since /Work is inside it.
 */
export async function getTrashedFolders(userId) {
  // Get IDs of all trashed folders
  const trashedIds = await Folder.find({ userId, isTrashed: true }).distinct('_id');

  // Return only top-level trashed folders
  // (folders whose parent is either null or not in the trashed list)
  return Folder.find({
    userId,
    isTrashed: true,
    $or: [
      { parentId: null },                    // Root level folders
      { parentId: { $nin: trashedIds } },    // Folders whose parent isn't trashed
    ],
  }).sort({ trashedAt: -1 });
}

// =============================================================================
// ENTITY FOLDER LOOKUP
// =============================================================================

/**
 * getEntityFolder(entityId, entityType)
 * -------------------------------------
 * Get the folder linked to an entity.
 *
 * @param {string} entityId - Entity ID (project, task, or note)
 * @param {string} entityType - Entity type
 *
 * @returns {Promise<Folder|null>} Linked folder or null
 */
export async function getEntityFolder(entityId, entityType) {
  return Folder.findOne({
    linkedEntityId: entityId,
    linkedEntityType: entityType,
  });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * updateParentStats(parentId)
 * ---------------------------
 * Recalculate statistics for a parent folder.
 * Called after adding or removing items from a folder.
 *
 * BUSINESS LOGIC:
 * - Triggers Folder.updateFolderStats which recalculates:
 *   - File count (direct children and all descendants)
 *   - Total size of all files
 *   - Subfolder count
 * - Does nothing if parentId is null/undefined
 *
 * @param {string|null} parentId - Parent folder ID (null = no parent to update)
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // After moving a file out of a folder
 * await updateParentStats('folder123');
 * // Folder's file count and size are now recalculated
 * ```
 */
async function updateParentStats(parentId) {
  // =====================================================
  // SKIP IF NO PARENT
  // =====================================================
  // Root level folders (no parent) don't need stats update

  if (!parentId) return;

  // =====================================================
  // TRIGGER FOLDER STATS UPDATE
  // =====================================================
  // The model method handles all the aggregation logic

  await Folder.updateFolderStats(parentId);
}

/**
 * updateFilePaths(newBasePath, oldBasePath)
 * -----------------------------------------
 * Update file paths when a folder is moved or renamed.
 * Cascades path changes to all files in the folder and subfolders.
 *
 * BUSINESS LOGIC:
 * - Files store folder path for hierarchy queries
 * - When folder path changes, all files need updated paths
 * - Two operations:
 *   1. Direct files in the moved folder
 *   2. Files in all subfolders (require path string replacement)
 * - Uses regex to match files in subfolders
 *
 * EXAMPLE:
 * Moving /Documents to /Archive/Documents:
 * - File at path /Documents → changes to /Archive/Documents
 * - File at path /Documents/Work → changes to /Archive/Documents/Work
 * - File at path /Documents/Work/Reports → changes to /Archive/Documents/Work/Reports
 *
 * @param {string} newBasePath - New folder path (after move/rename)
 * @param {string} oldBasePath - Old folder path (before move/rename)
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Folder /Documents moved to /Archive, so rename:
 * await updateFilePaths('/Archive/Documents', '/Documents');
 * ```
 */
async function updateFilePaths(newBasePath, oldBasePath) {
  // =====================================================
  // UPDATE FILES IN MOVED FOLDER
  // =====================================================
  // Files directly in the moved folder have path = folder path
  // These get simple direct update

  await File.updateMany(
    { path: oldBasePath },  // Exact match - files in this folder
    { $set: { path: newBasePath } }  // Update to new path
  );

  // =====================================================
  // UPDATE FILES IN SUBFOLDERS
  // =====================================================
  // Files in nested folders (path starts with old path + "/")
  // These need individual updates since we're replacing path prefix

  const files = await File.find({
    path: new RegExp(`^${oldBasePath}/`),  // Regex: starts with old path + /
  });

  // Replace old path prefix with new path prefix for each file
  for (const file of files) {
    // E.g., /Documents/Work/file.txt → /Archive/Documents/Work/file.txt
    file.path = file.path.replace(oldBasePath, newBasePath);
    await file.save();
  }
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all folder service functions.
 *
 * USAGE:
 * import folderService from './folderService.js';
 * // OR
 * import { createFolder, getFolderTree } from './folderService.js';
 *
 * FUNCTION CATEGORIES:
 * - Creation: createFolder, createEntityFolder
 * - Retrieval: getFolders, getFolderTree, getFolderWithContents, getFolder, getBreadcrumb
 * - Updates: updateFolder
 * - Moving: moveFolder
 * - Trash: trashFolder, restoreFolder, deleteFolder
 * - Stats: getFolderStats
 * - Lookup: getTrashedFolders, getEntityFolder
 */
export default {
  createFolder,
  createEntityFolder,
  getFolders,
  getFolderTree,
  getFolderWithContents,
  getFolder,
  getBreadcrumb,
  updateFolder,
  moveFolder,
  trashFolder,
  restoreFolder,
  deleteFolder,
  getFolderStats,
  getTrashedFolders,
  getEntityFolder,
};
