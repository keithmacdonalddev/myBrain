/**
 * =============================================================================
 * FOLDER.JS - Folder Organization Data Model
 * =============================================================================
 *
 * This file defines the Folder model - the data structure for organizing files
 * into a hierarchical folder system in myBrain.
 *
 * WHAT IS A FOLDER?
 * -----------------
 * A folder is a container that holds files and other folders, just like folders
 * on your computer. Folders allow users to organize their files into a nested
 * hierarchy (folders within folders).
 *
 * FOLDER HIERARCHY EXAMPLE:
 * -------------------------
 * Root (no folder)
 * ├── Documents
 * │   ├── Work
 * │   │   ├── Reports
 * │   │   └── Presentations
 * │   └── Personal
 * │       └── Taxes
 * ├── Photos
 * │   ├── 2024
 * │   └── 2023
 * └── Projects
 *     └── Website Redesign
 *
 * KEY CONCEPTS:
 * -------------
 * - parentId: Which folder contains this folder (null = root level)
 * - path: Full path like "/Documents/Work/Reports"
 * - depth: How many levels deep (0 = root, 1 = one level down, etc.)
 *
 * FOLDER TYPES:
 * -------------
 * - 'user': Normal folder created by user
 * - 'project': Auto-generated folder for a project's files
 * - 'task': Auto-generated folder for a task's attachments
 * - 'note': Auto-generated folder for a note's attachments
 * - 'system': System-created folders (like Trash)
 *
 * PATH MANAGEMENT:
 * ----------------
 * Paths are stored for fast queries but must be updated when folders move.
 * The updateDescendantPaths method handles cascading updates when a folder
 * is renamed or moved.
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Mongoose is the library we use to interact with MongoDB.
 * It provides schemas (blueprints) and models (tools to work with data).
 */
import mongoose from 'mongoose';

// =============================================================================
// FOLDER SCHEMA DEFINITION
// =============================================================================

/**
 * The Folder Schema
 * -----------------
 * Defines all the fields a Folder document can have.
 */
const folderSchema = new mongoose.Schema(
  {
    // =========================================================================
    // OWNERSHIP
    // =========================================================================

    /**
     * userId: Which user owns this folder
     * - Required: Every folder must belong to a user
     * - References: Points to a User document
     * - Index: For fast lookups by user
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // =========================================================================
    // BASIC INFO
    // =========================================================================

    /**
     * name: The folder's display name
     * - Required: Every folder needs a name
     * - Max 255 characters
     * - Trimmed: Removes extra whitespace
     *
     * EXAMPLES: "Documents", "Work Projects", "2024 Photos"
     */
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [255, 'Folder name cannot exceed 255 characters'],
    },

    // =========================================================================
    // HIERARCHY
    // =========================================================================

    /**
     * parentId: The parent folder (which folder contains this one)
     * - null: This folder is at the root level (top-level folder)
     * - References: Points to another Folder document
     * - Index: For listing subfolders of a folder
     *
     * EXAMPLE:
     * If "Reports" folder is inside "Work" folder:
     * - "Reports" parentId = "Work" folder's ID
     * - "Work" parentId = null (it's at root)
     */
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
      index: true,
    },

    /**
     * path: Full path from root to this folder
     * - Required: Used for path-based queries and display
     * - Index: For fast path lookups
     * - Updated when folder or ancestors are renamed/moved
     *
     * EXAMPLES:
     * - "/Documents"
     * - "/Documents/Work"
     * - "/Documents/Work/Reports"
     */
    path: {
      type: String,
      required: true,
      index: true,
    },

    /**
     * depth: How many levels deep this folder is
     * - 0: Root level folder (no parent)
     * - 1: Inside a root folder
     * - 2: Inside a folder that's inside a root folder
     * - etc.
     *
     * Used to enforce maximum nesting depth and for UI indentation.
     */
    depth: {
      type: Number,
      default: 0,
    },

    // =========================================================================
    // APPEARANCE
    // =========================================================================

    /**
     * color: Custom color for this folder
     * - Optional: Uses default if not set
     * - Helps visually distinguish folders
     *
     * EXAMPLE: "#3b82f6" (blue)
     */
    color: {
      type: String,
      default: null,
    },

    /**
     * icon: Icon to display for this folder
     * - Default: "folder" (standard folder icon)
     * - Can be customized per folder
     *
     * EXAMPLES: "folder", "briefcase", "archive", "star"
     */
    icon: {
      type: String,
      default: 'folder',
    },

    // =========================================================================
    // FOLDER TYPE
    // =========================================================================

    /**
     * folderType: What kind of folder this is
     *
     * VALUES:
     * - 'user': Normal folder created by the user (default)
     * - 'project': Auto-generated for a project's files
     * - 'task': Auto-generated for a task's attachments
     * - 'note': Auto-generated for a note's attachments
     * - 'system': System-created folder (like Trash)
     */
    folderType: {
      type: String,
      enum: ['user', 'project', 'task', 'note', 'system'],
      default: 'user',
    },

    /**
     * linkedEntityId: ID of the linked entity (for auto-generated folders)
     * - Only set when folderType is 'project', 'task', or 'note'
     * - Points to the Project, Task, or Note that owns this folder
     */
    linkedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    /**
     * linkedEntityType: Type of the linked entity
     * - Only set when linkedEntityId is set
     * - Tells us what type of entity to look up
     */
    linkedEntityType: {
      type: String,
      enum: ['project', 'task', 'note', null],
      default: null,
    },

    // =========================================================================
    // STATUS
    // =========================================================================

    /**
     * isPublic: Whether this folder is publicly accessible
     * - Public folders can be viewed by anyone with the link
     * - Files inside inherit this setting
     */
    isPublic: {
      type: Boolean,
      default: false,
    },

    /**
     * isTrashed: Whether this folder is in the trash
     * - Trashed folders are hidden from normal views
     * - Files inside are also effectively trashed
     * - Index: For excluding trashed from queries
     */
    isTrashed: {
      type: Boolean,
      default: false,
      index: true,
    },

    /**
     * trashedAt: When the folder was moved to trash
     * - Used for automatic cleanup of old trashed items
     */
    trashedAt: Date,

    // =========================================================================
    // CACHED STATISTICS
    // =========================================================================

    /**
     * stats: Cached statistics about this folder's contents
     * - Cached for performance (avoids counting on every request)
     * - Updated when files/folders are added, removed, or moved
     */
    stats: {
      /**
       * fileCount: Number of files directly in this folder
       * - Does NOT include files in subfolders
       */
      fileCount: {
        type: Number,
        default: 0,
      },

      /**
       * totalSize: Total bytes of files directly in this folder
       * - Does NOT include subfolder contents
       */
      totalSize: {
        type: Number,
        default: 0,
      },

      /**
       * subfolderCount: Number of immediate subfolders
       * - Does NOT include nested subfolders
       */
      subfolderCount: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    /**
     * timestamps: true automatically adds:
     * - createdAt: When the folder was created
     * - updatedAt: When the folder was last modified
     */
    timestamps: true,
  }
);

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Compound Indexes for Common Queries
 * -----------------------------------
 * These indexes speed up the most common folder queries.
 */

// For listing subfolders of a specific folder
// Used by: Folder navigation, folder tree
folderSchema.index({ userId: 1, parentId: 1, isTrashed: 1 });

// For path-based lookups
// Used by: Finding folder by path
folderSchema.index({ userId: 1, path: 1 });

// For finding folders by type
// Used by: Finding project/task folders
folderSchema.index({ userId: 1, folderType: 1 });

// For finding linked entity folders
// Used by: Finding a project's folder
folderSchema.index({ linkedEntityId: 1, linkedEntityType: 1 });

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * toSafeJSON()
 * ------------
 * Convert folder to a clean JSON object for API responses.
 *
 * @returns {Object} - Clean folder object
 */
folderSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

/**
 * generatePath()
 * --------------
 * Generate and set this folder's path based on its parent.
 * Called when creating a new folder or moving an existing one.
 *
 * @returns {string} - The generated path
 *
 * EXAMPLE:
 * If this folder is named "Reports" and parent is "/Documents/Work":
 * - Sets path to "/Documents/Work/Reports"
 * - Sets depth to 2
 */
folderSchema.methods.generatePath = async function () {
  // Root level folder (no parent)
  if (!this.parentId) {
    this.path = `/${this.name}`;
    this.depth = 0;
    return this.path;
  }

  // Find parent folder
  const parent = await this.constructor.findById(this.parentId);
  if (!parent) {
    throw new Error('Parent folder not found');
  }

  // Build path from parent
  this.path = `${parent.path}/${this.name}`;
  this.depth = parent.depth + 1;
  return this.path;
};

// =============================================================================
// STATIC METHODS
// =============================================================================

/**
 * updateDescendantPaths(folderId, oldPath, newPath)
 * -------------------------------------------------
 * Update paths of all folders inside this one when it's renamed or moved.
 * This cascades the path change to all descendants.
 *
 * @param {string} folderId - ID of the moved/renamed folder
 * @param {string} oldPath - The previous path
 * @param {string} newPath - The new path
 * @returns {number} - Number of descendants updated
 *
 * EXAMPLE:
 * Moving "/Documents/Old" to "/Archive/Old":
 * - "/Documents/Old/Reports" becomes "/Archive/Old/Reports"
 * - "/Documents/Old/Reports/2024" becomes "/Archive/Old/Reports/2024"
 */
folderSchema.statics.updateDescendantPaths = async function (folderId, oldPath, newPath) {
  // Find all folders whose path starts with the old path
  const descendants = await this.find({
    path: new RegExp(`^${oldPath}/`), // Regex: starts with oldPath/
  });

  // Build bulk update operations
  const bulkOps = descendants.map(folder => ({
    updateOne: {
      filter: { _id: folder._id },
      update: {
        $set: {
          // Replace old path prefix with new path prefix
          path: folder.path.replace(oldPath, newPath),
          // Recalculate depth based on new path
          depth: folder.path.replace(oldPath, newPath).split('/').length - 1,
        },
      },
    },
  }));

  // Execute all updates at once
  if (bulkOps.length > 0) {
    await this.bulkWrite(bulkOps);
  }

  return descendants.length;
};

/**
 * getFolderTree(userId, options)
 * ------------------------------
 * Get the complete folder tree for a user.
 * Returns a hierarchical structure with children nested inside parents.
 *
 * @param {string} userId - User's ID
 * @param {Object} options:
 *   - includeTrashed: Include trashed folders (default false)
 *   - maxDepth: Maximum nesting depth to return (default 10)
 * @returns {Array} - Array of root folders, each with children array
 *
 * EXAMPLE RESULT:
 * [
 *   { name: "Documents", children: [
 *     { name: "Work", children: [...] },
 *     { name: "Personal", children: [...] }
 *   ]},
 *   { name: "Photos", children: [...] }
 * ]
 */
folderSchema.statics.getFolderTree = async function (userId, options = {}) {
  const { includeTrashed = false, maxDepth = 10 } = options;

  // Build query
  const query = {
    userId: new mongoose.Types.ObjectId(userId),
  };

  if (!includeTrashed) {
    query.isTrashed = false;
  }

  // Get all folders sorted by path (ensures parents come before children)
  const folders = await this.find(query)
    .sort({ path: 1 })
    .lean(); // .lean() returns plain objects, faster for read-only

  // Build tree structure
  const folderMap = new Map();
  const roots = [];

  // First pass: create map of all folders and add children array
  folders.forEach(folder => {
    folder.children = [];
    folderMap.set(folder._id.toString(), folder);
  });

  // Second pass: build parent-child relationships
  folders.forEach(folder => {
    if (folder.parentId) {
      // Has a parent - add to parent's children
      const parent = folderMap.get(folder.parentId.toString());
      if (parent && folder.depth <= maxDepth) {
        parent.children.push(folder);
      }
    } else {
      // No parent - this is a root folder
      roots.push(folder);
    }
  });

  return roots;
};

/**
 * getBreadcrumb(folderId)
 * -----------------------
 * Get the breadcrumb path for a folder (all ancestors up to root).
 * Used for navigation UI showing current location.
 *
 * @param {string} folderId - ID of the folder
 * @returns {Array} - Array of { _id, name } from root to current folder
 *
 * EXAMPLE:
 * For folder "/Documents/Work/Reports":
 * Returns: [
 *   { _id: "...", name: "Documents" },
 *   { _id: "...", name: "Work" },
 *   { _id: "...", name: "Reports" }
 * ]
 */
folderSchema.statics.getBreadcrumb = async function (folderId) {
  // Get the target folder
  const folder = await this.findById(folderId).lean();
  if (!folder) {
    return [];
  }

  // Build breadcrumb by walking up the parent chain
  const breadcrumb = [{ _id: folder._id, name: folder.name }];
  let currentId = folder.parentId;

  // Walk up to root
  while (currentId) {
    const parent = await this.findById(currentId).lean();
    if (!parent) break;
    breadcrumb.unshift({ _id: parent._id, name: parent.name }); // Add to front
    currentId = parent.parentId;
  }

  return breadcrumb;
};

/**
 * updateFolderStats(folderId)
 * ---------------------------
 * Recalculate and update the cached statistics for a folder.
 * Called when files or subfolders are added/removed/moved.
 *
 * @param {string} folderId - ID of the folder to update
 * @returns {Object} - The updated stats
 */
folderSchema.statics.updateFolderStats = async function (folderId) {
  const File = mongoose.model('File');

  // Count files and their total size
  const fileStats = await File.aggregate([
    {
      $match: {
        folderId: new mongoose.Types.ObjectId(folderId),
        isTrashed: false,
        isLatestVersion: true,
      },
    },
    {
      $group: {
        _id: null,
        fileCount: { $sum: 1 },
        totalSize: { $sum: '$size' },
      },
    },
  ]);

  // Count subfolders
  const subfolderCount = await this.countDocuments({
    parentId: folderId,
    isTrashed: false,
  });

  const stats = {
    fileCount: fileStats[0]?.fileCount || 0,
    totalSize: fileStats[0]?.totalSize || 0,
    subfolderCount,
  };

  // Update the folder
  await this.findByIdAndUpdate(folderId, { stats });

  return stats;
};

/**
 * getFolderContents(folderId, userId, options)
 * --------------------------------------------
 * Get the contents of a folder (subfolders and files).
 *
 * @param {string} folderId - ID of folder (null for root)
 * @param {string} userId - User's ID
 * @param {Object} options:
 *   - sort: Sort field for files (default '-createdAt')
 *   - limit: Max files to return (default 50)
 *   - skip: Files to skip for pagination
 * @returns {Object} - { folder, subfolders, files, totalFiles }
 */
folderSchema.statics.getFolderContents = async function (folderId, userId, options = {}) {
  const { sort = '-createdAt', limit = 50, skip = 0 } = options;
  const File = mongoose.model('File');

  // Get the folder (if not root)
  const folder = folderId
    ? await this.findOne({ _id: folderId, userId }).lean()
    : null;

  // Get subfolders
  const subfolders = await this.find({
    userId,
    parentId: folderId || null,
    isTrashed: false,
  })
    .sort({ name: 1 }) // Alphabetical
    .lean();

  // Build file query
  const query = {
    userId,
    folderId: folderId || null,
    isTrashed: false,
    isLatestVersion: true,
  };

  // Parse sort
  const sortObj = {};
  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  // Get files
  const files = await File.find(query)
    .sort(sortObj)
    .skip(skip)
    .limit(limit)
    .lean();

  const totalFiles = await File.countDocuments(query);

  return {
    folder,
    subfolders,
    files,
    totalFiles,
  };
};

/**
 * nameExistsInParent(userId, parentId, name, excludeId)
 * -----------------------------------------------------
 * Check if a folder name already exists in a parent folder.
 * Used to prevent duplicate folder names at the same level.
 *
 * @param {string} userId - User's ID
 * @param {string} parentId - Parent folder ID (null for root)
 * @param {string} name - Folder name to check
 * @param {string} excludeId - Folder ID to exclude (for rename operations)
 * @returns {boolean} - True if name exists, false otherwise
 */
folderSchema.statics.nameExistsInParent = async function (userId, parentId, name, excludeId = null) {
  const query = {
    userId,
    parentId: parentId || null,
    name: { $regex: new RegExp(`^${name}$`, 'i') }, // Case-insensitive match
    isTrashed: false,
  };

  // Exclude a specific folder (for rename checks)
  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const exists = await this.findOne(query);
  return !!exists;
};

/**
 * canMoveTo(folderId, targetParentId)
 * -----------------------------------
 * Check if a folder can be moved to a target location.
 * Prevents moving a folder into itself or its descendants (circular reference).
 *
 * @param {string} folderId - ID of folder to move
 * @param {string} targetParentId - ID of destination folder
 * @returns {boolean} - True if move is valid, false otherwise
 *
 * INVALID MOVES:
 * - Moving a folder into itself
 * - Moving a folder into one of its subfolders (any level)
 */
folderSchema.statics.canMoveTo = async function (folderId, targetParentId) {
  // Moving to root is always valid
  if (!targetParentId) return true;

  // Can't move to itself
  if (folderId.toString() === targetParentId.toString()) return false;

  // Check if target is a descendant of the folder being moved
  const folder = await this.findById(folderId);
  if (!folder) return false;

  // Walk up from target to root, checking for the folder being moved
  let currentId = targetParentId;
  while (currentId) {
    if (currentId.toString() === folderId.toString()) {
      return false; // Target is a descendant - circular reference!
    }
    const parent = await this.findById(currentId);
    if (!parent) break;
    currentId = parent.parentId;
  }

  return true;
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the Folder model from the schema.
 */
const Folder = mongoose.model('Folder', folderSchema);

export default Folder;
