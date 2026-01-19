import mongoose from 'mongoose';

const folderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [255, 'Folder name cannot exceed 255 characters'],
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
      index: true,
    },
    path: {
      type: String,
      required: true,
      index: true,
    },
    depth: {
      type: Number,
      default: 0,
    },
    color: {
      type: String,
      default: null,
    },
    icon: {
      type: String,
      default: 'folder',
    },

    // Auto-generated folder type
    folderType: {
      type: String,
      enum: ['user', 'project', 'task', 'note', 'system'],
      default: 'user',
    },
    linkedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    linkedEntityType: {
      type: String,
      enum: ['project', 'task', 'note', null],
      default: null,
    },

    // Status
    isPublic: {
      type: Boolean,
      default: false,
    },
    isTrashed: {
      type: Boolean,
      default: false,
      index: true,
    },
    trashedAt: Date,

    // Cached stats
    stats: {
      fileCount: {
        type: Number,
        default: 0,
      },
      totalSize: {
        type: Number,
        default: 0,
      },
      subfolderCount: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
folderSchema.index({ userId: 1, parentId: 1, isTrashed: 1 });
folderSchema.index({ userId: 1, path: 1 });
folderSchema.index({ userId: 1, folderType: 1 });
folderSchema.index({ linkedEntityId: 1, linkedEntityType: 1 });

// Method to convert to safe JSON
folderSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Generate path for a folder
folderSchema.methods.generatePath = async function () {
  if (!this.parentId) {
    this.path = `/${this.name}`;
    this.depth = 0;
    return this.path;
  }

  const parent = await this.constructor.findById(this.parentId);
  if (!parent) {
    throw new Error('Parent folder not found');
  }

  this.path = `${parent.path}/${this.name}`;
  this.depth = parent.depth + 1;
  return this.path;
};

// Update paths for all descendants when folder moves
folderSchema.statics.updateDescendantPaths = async function (folderId, oldPath, newPath) {
  const descendants = await this.find({
    path: new RegExp(`^${oldPath}/`),
  });

  const bulkOps = descendants.map(folder => ({
    updateOne: {
      filter: { _id: folder._id },
      update: {
        $set: {
          path: folder.path.replace(oldPath, newPath),
          depth: folder.path.replace(oldPath, newPath).split('/').length - 1,
        },
      },
    },
  }));

  if (bulkOps.length > 0) {
    await this.bulkWrite(bulkOps);
  }

  return descendants.length;
};

// Get folder tree for a user
folderSchema.statics.getFolderTree = async function (userId, options = {}) {
  const { includeTrashed = false, maxDepth = 10 } = options;

  const query = {
    userId: new mongoose.Types.ObjectId(userId),
  };

  if (!includeTrashed) {
    query.isTrashed = false;
  }

  const folders = await this.find(query)
    .sort({ path: 1 })
    .lean();

  // Build tree structure
  const folderMap = new Map();
  const roots = [];

  // First pass: create map
  folders.forEach(folder => {
    folder.children = [];
    folderMap.set(folder._id.toString(), folder);
  });

  // Second pass: build tree
  folders.forEach(folder => {
    if (folder.parentId) {
      const parent = folderMap.get(folder.parentId.toString());
      if (parent && folder.depth <= maxDepth) {
        parent.children.push(folder);
      }
    } else {
      roots.push(folder);
    }
  });

  return roots;
};

// Get breadcrumb path for a folder
folderSchema.statics.getBreadcrumb = async function (folderId) {
  const folder = await this.findById(folderId).lean();
  if (!folder) {
    return [];
  }

  const breadcrumb = [{ _id: folder._id, name: folder.name }];
  let currentId = folder.parentId;

  while (currentId) {
    const parent = await this.findById(currentId).lean();
    if (!parent) break;
    breadcrumb.unshift({ _id: parent._id, name: parent.name });
    currentId = parent.parentId;
  }

  return breadcrumb;
};

// Update folder stats
folderSchema.statics.updateFolderStats = async function (folderId) {
  const File = mongoose.model('File');

  // Count files in this folder
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

  await this.findByIdAndUpdate(folderId, { stats });

  return stats;
};

// Get folder with contents
folderSchema.statics.getFolderContents = async function (folderId, userId, options = {}) {
  const { sort = '-createdAt', limit = 50, skip = 0 } = options;
  const File = mongoose.model('File');

  // Get folder
  const folder = folderId
    ? await this.findOne({ _id: folderId, userId }).lean()
    : null;

  // Get subfolders
  const subfolders = await this.find({
    userId,
    parentId: folderId || null,
    isTrashed: false,
  })
    .sort({ name: 1 })
    .lean();

  // Get files
  const query = {
    userId,
    folderId: folderId || null,
    isTrashed: false,
    isLatestVersion: true,
  };

  // Build sort
  const sortObj = {};
  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

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

// Check if folder name exists in parent
folderSchema.statics.nameExistsInParent = async function (userId, parentId, name, excludeId = null) {
  const query = {
    userId,
    parentId: parentId || null,
    name: { $regex: new RegExp(`^${name}$`, 'i') },
    isTrashed: false,
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  const exists = await this.findOne(query);
  return !!exists;
};

// Validate move operation (prevent circular reference)
folderSchema.statics.canMoveTo = async function (folderId, targetParentId) {
  if (!targetParentId) return true; // Moving to root is always valid
  if (folderId.toString() === targetParentId.toString()) return false; // Can't move to itself

  // Check if target is a descendant of the folder
  const folder = await this.findById(folderId);
  if (!folder) return false;

  let currentId = targetParentId;
  while (currentId) {
    if (currentId.toString() === folderId.toString()) {
      return false; // Target is a descendant
    }
    const parent = await this.findById(currentId);
    if (!parent) break;
    currentId = parent.parentId;
  }

  return true;
};

const Folder = mongoose.model('Folder', folderSchema);

export default Folder;
