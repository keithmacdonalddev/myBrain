import Folder from '../models/Folder.js';
import File from '../models/File.js';

/**
 * Create a new folder
 * @param {string} userId - User ID
 * @param {Object} data - Folder data
 * @returns {Promise<Folder>}
 */
export async function createFolder(userId, data) {
  const { name, parentId = null, color = null, icon = 'folder' } = data;

  // Check for duplicate name in same parent
  const exists = await Folder.nameExistsInParent(userId, parentId, name);
  if (exists) {
    throw new Error('A folder with this name already exists in this location');
  }

  // Create folder
  const folder = new Folder({
    userId,
    name,
    parentId,
    color,
    icon,
    folderType: 'user',
  });

  // Generate path
  await folder.generatePath();
  await folder.save();

  // Update parent stats
  if (parentId) {
    await updateParentStats(parentId);
  }

  return folder;
}

/**
 * Create a folder for a linked entity (project, task, note)
 * @param {string} userId - User ID
 * @param {string} entityId - Entity ID
 * @param {string} entityType - Entity type ('project', 'task', 'note')
 * @param {string} name - Folder name
 * @returns {Promise<Folder>}
 */
export async function createEntityFolder(userId, entityId, entityType, name) {
  // Check if folder already exists for this entity
  const existing = await Folder.findOne({
    userId,
    linkedEntityId: entityId,
    linkedEntityType: entityType,
  });

  if (existing) {
    return existing;
  }

  const folder = new Folder({
    userId,
    name,
    parentId: null, // Entity folders are at root level
    folderType: entityType,
    linkedEntityId: entityId,
    linkedEntityType: entityType,
    icon: entityType === 'project' ? 'folder-kanban' : entityType === 'task' ? 'folder-check' : 'folder-file',
  });

  await folder.generatePath();
  await folder.save();

  return folder;
}

/**
 * Get folders for a user
 * @param {string} userId - User ID
 * @param {Object} options - Filter options
 * @returns {Promise<Folder[]>}
 */
export async function getFolders(userId, options = {}) {
  const { parentId, includeTrashed = false, folderType } = options;

  const query = { userId };

  if (!includeTrashed) {
    query.isTrashed = false;
  }

  if (parentId !== undefined) {
    query.parentId = parentId || null;
  }

  if (folderType) {
    query.folderType = folderType;
  }

  return Folder.find(query).sort({ name: 1 });
}

/**
 * Get folder tree for a user
 * @param {string} userId - User ID
 * @param {Object} options - Tree options
 * @returns {Promise<Object[]>}
 */
export async function getFolderTree(userId, options = {}) {
  return Folder.getFolderTree(userId, options);
}

/**
 * Get a single folder with its contents
 * @param {string} folderId - Folder ID
 * @param {string} userId - User ID
 * @param {Object} options - Content options
 * @returns {Promise<Object>}
 */
export async function getFolderWithContents(folderId, userId, options = {}) {
  return Folder.getFolderContents(folderId, userId, options);
}

/**
 * Get folder by ID
 * @param {string} folderId - Folder ID
 * @param {string} userId - User ID
 * @returns {Promise<Folder|null>}
 */
export async function getFolder(folderId, userId) {
  return Folder.findOne({ _id: folderId, userId });
}

/**
 * Get breadcrumb path for a folder
 * @param {string} folderId - Folder ID
 * @returns {Promise<Array<{_id: string, name: string}>>}
 */
export async function getBreadcrumb(folderId) {
  return Folder.getBreadcrumb(folderId);
}

/**
 * Update a folder
 * @param {string} folderId - Folder ID
 * @param {string} userId - User ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<Folder|null>}
 */
export async function updateFolder(folderId, userId, updates) {
  const allowedUpdates = ['name', 'color', 'icon'];
  const filteredUpdates = {};

  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }

  // If renaming, check for duplicates
  if (filteredUpdates.name) {
    const folder = await Folder.findOne({ _id: folderId, userId });
    if (!folder) return null;

    const exists = await Folder.nameExistsInParent(
      userId,
      folder.parentId,
      filteredUpdates.name,
      folderId
    );
    if (exists) {
      throw new Error('A folder with this name already exists in this location');
    }

    // Update path if name changed
    const oldPath = folder.path;
    folder.name = filteredUpdates.name;
    await folder.generatePath();
    filteredUpdates.path = folder.path;

    // Update descendant paths
    await Folder.updateDescendantPaths(folderId, oldPath, folder.path);

    // Update files in this folder
    await File.updateMany(
      { folderId, userId },
      { $set: { path: folder.path } }
    );
  }

  return Folder.findOneAndUpdate(
    { _id: folderId, userId },
    { $set: filteredUpdates },
    { new: true, runValidators: true }
  );
}

/**
 * Move a folder to a new parent
 * @param {string} folderId - Folder ID to move
 * @param {string} newParentId - New parent folder ID (null for root)
 * @param {string} userId - User ID
 * @returns {Promise<Folder|null>}
 */
export async function moveFolder(folderId, newParentId, userId) {
  const folder = await Folder.findOne({ _id: folderId, userId });
  if (!folder) return null;

  // Validate move operation
  if (newParentId) {
    const canMove = await Folder.canMoveTo(folderId, newParentId);
    if (!canMove) {
      throw new Error('Cannot move folder into its own descendant');
    }

    const targetFolder = await Folder.findOne({ _id: newParentId, userId });
    if (!targetFolder) {
      throw new Error('Target folder not found');
    }
  }

  // Check for name conflict in new location
  const exists = await Folder.nameExistsInParent(userId, newParentId, folder.name, folderId);
  if (exists) {
    throw new Error('A folder with this name already exists in the target location');
  }

  const oldPath = folder.path;
  const oldParentId = folder.parentId;

  folder.parentId = newParentId || null;
  await folder.generatePath();
  await folder.save();

  // Update descendant paths
  await Folder.updateDescendantPaths(folderId, oldPath, folder.path);

  // Update files in this folder and subfolders
  await updateFilePaths(folder.path, oldPath);

  // Update parent stats
  if (oldParentId) {
    await updateParentStats(oldParentId);
  }
  if (newParentId) {
    await updateParentStats(newParentId);
  }

  return folder;
}

/**
 * Move folder to trash
 * @param {string} folderId - Folder ID
 * @param {string} userId - User ID
 * @returns {Promise<Folder|null>}
 */
export async function trashFolder(folderId, userId) {
  const folder = await Folder.findOneAndUpdate(
    { _id: folderId, userId },
    { $set: { isTrashed: true, trashedAt: new Date() } },
    { new: true }
  );

  if (!folder) return null;

  // Trash all subfolders
  await Folder.updateMany(
    { userId, path: new RegExp(`^${folder.path}/`) },
    { $set: { isTrashed: true, trashedAt: new Date() } }
  );

  // Trash all files in folder and subfolders
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
 * Restore folder from trash
 * @param {string} folderId - Folder ID
 * @param {string} userId - User ID
 * @returns {Promise<Folder|null>}
 */
export async function restoreFolder(folderId, userId) {
  const folder = await Folder.findOneAndUpdate(
    { _id: folderId, userId, isTrashed: true },
    { $set: { isTrashed: false }, $unset: { trashedAt: 1 } },
    { new: true }
  );

  if (!folder) return null;

  // Restore all subfolders
  await Folder.updateMany(
    { userId, path: new RegExp(`^${folder.path}/`) },
    { $set: { isTrashed: false }, $unset: { trashedAt: 1 } }
  );

  // Restore all files in folder and subfolders
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
 * Permanently delete a folder and all contents
 * @param {string} folderId - Folder ID
 * @param {string} userId - User ID
 * @returns {Promise<{deleted: boolean, filesDeleted: number, subfoldersDeleted: number}>}
 */
export async function deleteFolder(folderId, userId) {
  const folder = await Folder.findOne({ _id: folderId, userId });
  if (!folder) return { deleted: false, filesDeleted: 0, subfoldersDeleted: 0 };

  // Import fileService dynamically to avoid circular dependency
  const fileService = await import('./fileService.js');

  // Get all files in folder and subfolders
  const files = await File.find({
    userId,
    $or: [
      { folderId },
      { path: new RegExp(`^${folder.path}/`) },
    ],
  });

  // Delete all files
  if (files.length > 0) {
    await fileService.bulkDeleteFiles(files.map(f => f._id), userId);
  }

  // Delete all subfolders
  const subfolderResult = await Folder.deleteMany({
    userId,
    path: new RegExp(`^${folder.path}/`),
  });

  // Delete the folder
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

/**
 * Get folder statistics
 * @param {string} folderId - Folder ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>}
 */
export async function getFolderStats(folderId, userId) {
  const folder = await Folder.findOne({ _id: folderId, userId });
  if (!folder) return null;

  // Count files recursively
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

  // Count subfolders
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

/**
 * Get trashed folders
 * @param {string} userId - User ID
 * @returns {Promise<Folder[]>}
 */
export async function getTrashedFolders(userId) {
  // Only get top-level trashed folders (not subfolders of trashed folders)
  return Folder.find({
    userId,
    isTrashed: true,
    $or: [
      { parentId: null },
      {
        parentId: {
          $nin: await Folder.find({ userId, isTrashed: true }).distinct('_id'),
        },
      },
    ],
  }).sort({ trashedAt: -1 });
}

/**
 * Get folder for an entity
 * @param {string} entityId - Entity ID
 * @param {string} entityType - Entity type
 * @returns {Promise<Folder|null>}
 */
export async function getEntityFolder(entityId, entityType) {
  return Folder.findOne({
    linkedEntityId: entityId,
    linkedEntityType: entityType,
  });
}

// Helper functions

/**
 * Update parent folder stats
 * @param {string} parentId - Parent folder ID
 */
async function updateParentStats(parentId) {
  if (!parentId) return;
  await Folder.updateFolderStats(parentId);
}

/**
 * Update file paths after folder move
 * @param {string} newBasePath - New base path
 * @param {string} oldBasePath - Old base path
 */
async function updateFilePaths(newBasePath, oldBasePath) {
  // Update files directly in the moved folder
  await File.updateMany(
    { path: oldBasePath },
    { $set: { path: newBasePath } }
  );

  // Update files in subfolders
  const files = await File.find({
    path: new RegExp(`^${oldBasePath}/`),
  });

  for (const file of files) {
    file.path = file.path.replace(oldBasePath, newBasePath);
    await file.save();
  }
}

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
