import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Storage provider info
    storageProvider: {
      type: String,
      enum: ['cloudinary', 's3', 'local'],
      default: 's3',
    },
    storageKey: {
      type: String,
      default: null,
      index: true,
    },
    storageBucket: {
      type: String,
      default: null,
    },
    thumbnailKey: {
      type: String,
      default: null,
    },
    // Legacy Cloudinary fields (for backward compatibility)
    cloudinaryId: {
      type: String,
      default: null,
      sparse: true,
    },
    url: {
      type: String,
      default: null,
    },
    secureUrl: {
      type: String,
      default: null,
    },
    // Common fields
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      default: '',
    },
    size: {
      type: Number,
      required: true,
    },
    width: {
      type: Number,
    },
    height: {
      type: Number,
    },
    aspectRatio: {
      type: Number,
      default: null,
    },
    folder: {
      type: String,
      enum: ['library', 'avatars', 'notes', 'projects'],
      default: 'library',
    },
    // User-editable metadata
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
      default: '',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    alt: {
      type: String,
      trim: true,
      maxlength: [500, 'Alt text cannot exceed 500 characters'],
      default: '',
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    favorite: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Visual metadata (extracted from image)
    dominantColor: {
      type: String,
      default: null,
    },
    colors: {
      type: [String],
      default: [],
    },
    // Links to other entities
    linkedNoteIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
    }],
    linkedProjectIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    }],
    // Source tracking
    sourceUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
imageSchema.index({ userId: 1, folder: 1, createdAt: -1 });
imageSchema.index({ userId: 1, favorite: -1, createdAt: -1 });
imageSchema.index({ userId: 1, tags: 1 });
imageSchema.index({ storageProvider: 1, storageKey: 1 });

// Text index for search
imageSchema.index({ title: 'text', description: 'text', alt: 'text', originalName: 'text' });

// Virtual for display name (title or original name)
imageSchema.virtual('displayName').get(function() {
  return this.title || this.originalName;
});

// Method to convert to safe JSON
imageSchema.methods.toSafeJSON = function() {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  return obj;
};

// Static method to search images
imageSchema.statics.searchImages = async function(userId, options = {}) {
  const {
    q = '',
    folder = null,
    tags = [],
    favorite = null,
    sort = '-createdAt',
    limit = 50,
    skip = 0
  } = options;

  // Build query
  const query = { userId };

  // Folder filter
  if (folder) {
    query.folder = folder;
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

  const images = await queryBuilder
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  // Get total count
  const total = await this.countDocuments(query);

  return { images, total };
};

// Get all unique tags for a user's images
imageSchema.statics.getUserTags = async function(userId) {
  const result = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), folder: 'library' } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } }
  ]);

  return result.map(r => ({ tag: r._id, count: r.count }));
};

/**
 * Check if image is stored in S3
 */
imageSchema.methods.isS3 = function() {
  return this.storageProvider === 's3' && this.storageKey;
};

/**
 * Check if image is stored in Cloudinary (legacy)
 */
imageSchema.methods.isCloudinary = function() {
  return this.storageProvider === 'cloudinary' || (!this.storageKey && this.cloudinaryId);
};

/**
 * Get the storage identifier (S3 key or Cloudinary ID)
 */
imageSchema.methods.getStorageId = function() {
  if (this.isS3()) {
    return this.storageKey;
  }
  return this.cloudinaryId;
};

const Image = mongoose.model('Image', imageSchema);

export default Image;
