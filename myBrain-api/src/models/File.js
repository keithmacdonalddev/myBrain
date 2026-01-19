import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Storage location
    storageProvider: {
      type: String,
      enum: ['s3', 'gcs', 'azure', 'local'],
      required: true,
    },
    storageKey: {
      type: String,
      required: true,
    },
    storageBucket: {
      type: String,
      required: true,
    },

    // File identity
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },

    // File type
    mimeType: {
      type: String,
      required: true,
      index: true,
    },
    extension: {
      type: String,
      index: true,
    },
    fileCategory: {
      type: String,
      enum: ['document', 'image', 'video', 'audio', 'archive', 'code', 'spreadsheet', 'presentation', 'other'],
      index: true,
    },

    // Size and dimensions
    size: {
      type: Number,
      required: true,
    },
    width: Number,
    height: Number,
    duration: Number, // For audio/video in seconds

    // Folder system
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
      index: true,
    },
    path: {
      type: String,
      default: '/',
      index: true,
    },

    // User metadata
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
      default: '',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },

    // Status flags
    favorite: {
      type: Boolean,
      default: false,
      index: true,
    },
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

    // Versioning
    version: {
      type: Number,
      default: 1,
    },
    previousVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      default: null,
    },
    isLatestVersion: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Entity links
    linkedNoteIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
    }],
    linkedProjectIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    }],
    linkedTaskIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    }],

    // Sharing
    shareSettings: {
      publicUrl: String,
      publicUrlExpiry: Date,
      shareToken: String,
      shareTokenExpiry: Date,
      allowedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }],
      password: String, // Hashed
    },

    // Access tracking
    downloadCount: {
      type: Number,
      default: 0,
    },
    lastAccessedAt: Date,

    // Previews
    thumbnailKey: String, // Storage key for thumbnail
    thumbnailUrl: String,
    previewUrl: String,

    // Image-specific metadata
    dominantColor: String,
    colors: [String],
    aspectRatio: Number,

    // Security scanning
    scanStatus: {
      type: String,
      enum: ['pending', 'clean', 'suspicious', 'infected', 'skipped'],
      default: 'pending',
    },
    scanResult: {
      scannedAt: Date,
      scannerVersion: String,
      threats: [String],
    },

    // Integrity
    checksums: {
      md5: String,
      sha256: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
fileSchema.index({ userId: 1, folderId: 1, isTrashed: 1, createdAt: -1 });
fileSchema.index({ userId: 1, fileCategory: 1, isTrashed: 1, createdAt: -1 });
fileSchema.index({ userId: 1, favorite: -1, isTrashed: 1, createdAt: -1 });
fileSchema.index({ userId: 1, tags: 1, isTrashed: 1 });
fileSchema.index({ userId: 1, isLatestVersion: 1 });
fileSchema.index({ 'shareSettings.shareToken': 1 });
fileSchema.index({ previousVersionId: 1 });

// Text index for search
fileSchema.index({ title: 'text', description: 'text', originalName: 'text' });

// Virtual for display name (title or original name)
fileSchema.virtual('displayName').get(function () {
  return this.title || this.originalName;
});

// Method to convert to safe JSON
fileSchema.methods.toSafeJSON = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  // Remove sensitive share settings
  if (obj.shareSettings) {
    delete obj.shareSettings.password;
  }
  return obj;
};

// Static method to get file category from mime type
fileSchema.statics.getCategoryFromMimeType = function (mimeType) {
  if (!mimeType) return 'other';

  const type = mimeType.toLowerCase();

  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';

  // Documents
  if (type.includes('pdf') ||
      type.includes('word') ||
      type.includes('document') ||
      type.includes('text/plain') ||
      type.includes('rtf')) {
    return 'document';
  }

  // Spreadsheets
  if (type.includes('spreadsheet') ||
      type.includes('excel') ||
      type.includes('csv')) {
    return 'spreadsheet';
  }

  // Presentations
  if (type.includes('presentation') ||
      type.includes('powerpoint')) {
    return 'presentation';
  }

  // Archives
  if (type.includes('zip') ||
      type.includes('rar') ||
      type.includes('tar') ||
      type.includes('gzip') ||
      type.includes('7z') ||
      type.includes('compressed')) {
    return 'archive';
  }

  // Code
  if (type.includes('javascript') ||
      type.includes('json') ||
      type.includes('html') ||
      type.includes('css') ||
      type.includes('xml') ||
      type.includes('typescript') ||
      type.includes('python') ||
      type.includes('java') ||
      type.includes('x-sh')) {
    return 'code';
  }

  return 'other';
};

// Static method to search files
fileSchema.statics.searchFiles = async function (userId, options = {}) {
  const {
    q = '',
    folderId = null,
    fileCategory = null,
    tags = [],
    favorite = null,
    isTrashed = false,
    sort = '-createdAt',
    limit = 50,
    skip = 0,
    isLatestVersion = true,
  } = options;

  // Build query
  const query = { userId, isTrashed };

  // Only show latest versions by default
  if (isLatestVersion !== null) {
    query.isLatestVersion = isLatestVersion;
  }

  // Folder filter
  if (folderId !== undefined) {
    query.folderId = folderId;
  }

  // Category filter
  if (fileCategory) {
    query.fileCategory = fileCategory;
  }

  // Tags filter
  if (tags.length > 0) {
    query.tags = { $all: tags };
  }

  // Favorite filter
  if (favorite !== null) {
    query.favorite = favorite;
  }

  // Text search
  if (q && q.trim()) {
    query.$text = { $search: q };
  }

  // Build sort
  let sortObj = {};
  if (q && q.trim()) {
    sortObj = { score: { $meta: 'textScore' } };
  }

  // Parse sort string
  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  // Execute query
  let queryBuilder = this.find(query);

  if (q && q.trim()) {
    queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } });
  }

  const files = await queryBuilder
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  // Get total count
  const total = await this.countDocuments(query);

  return { files, total };
};

// Get all unique tags for a user's files
fileSchema.statics.getUserTags = async function (userId) {
  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isTrashed: false,
        isLatestVersion: true,
      },
    },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);

  return result.map(r => ({ tag: r._id, count: r.count }));
};

// Get storage usage for a user
fileSchema.statics.getStorageUsage = async function (userId) {
  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isLatestVersion: true,
      },
    },
    {
      $group: {
        _id: null,
        totalSize: { $sum: '$size' },
        fileCount: { $sum: 1 },
        trashedSize: {
          $sum: { $cond: ['$isTrashed', '$size', 0] },
        },
        trashedCount: {
          $sum: { $cond: ['$isTrashed', 1, 0] },
        },
      },
    },
  ]);

  if (result.length === 0) {
    return {
      totalSize: 0,
      fileCount: 0,
      trashedSize: 0,
      trashedCount: 0,
    };
  }

  return result[0];
};

// Get category breakdown
fileSchema.statics.getCategoryBreakdown = async function (userId) {
  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isTrashed: false,
        isLatestVersion: true,
      },
    },
    {
      $group: {
        _id: '$fileCategory',
        count: { $sum: 1 },
        size: { $sum: '$size' },
      },
    },
    { $sort: { size: -1 } },
  ]);

  return result.map(r => ({
    category: r._id,
    count: r.count,
    size: r.size,
  }));
};

const File = mongoose.model('File', fileSchema);

export default File;
