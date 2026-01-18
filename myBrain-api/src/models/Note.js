import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  lifeAreaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LifeArea',
    default: null,
    index: true
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
    index: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
    default: ''
  },
  body: {
    type: String,
    default: ''
  },
  tags: {
    type: [String],
    default: [],
    index: true
  },
  pinned: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'trashed'],
    default: 'active',
    index: true
  },
  trashedAt: {
    type: Date,
    default: null
  },
  lastOpenedAt: {
    type: Date,
    default: null
  },
  processed: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
noteSchema.index({ userId: 1, status: 1, createdAt: -1 });
noteSchema.index({ userId: 1, pinned: -1, updatedAt: -1 });
noteSchema.index({ userId: 1, tags: 1 });
noteSchema.index({ userId: 1, processed: 1, status: 1, createdAt: -1 });
noteSchema.index({ userId: 1, lifeAreaId: 1, status: 1 });
noteSchema.index({ userId: 1, projectId: 1, status: 1 });

// Text index for search
noteSchema.index({ title: 'text', body: 'text' });

// Method to convert to safe JSON
noteSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Static method to search notes
noteSchema.statics.searchNotes = async function(userId, options = {}) {
  const {
    q = '',           // Search query
    status = 'active', // Filter by status
    tags = [],        // Filter by tags
    pinned = null,    // Filter by pinned status
    lifeAreaId = null, // Filter by life area
    projectId = null,  // Filter by project
    sort = '-updatedAt', // Sort field
    limit = 50,
    skip = 0
  } = options;

  // Build query
  const query = { userId };

  // Status filter
  if (status && status !== 'all') {
    query.status = status;
  }

  // Tags filter
  if (tags.length > 0) {
    query.tags = { $all: tags };
  }

  // Pinned filter
  if (pinned !== null) {
    query.pinned = pinned;
  }

  // Life area filter
  if (lifeAreaId) {
    query.lifeAreaId = lifeAreaId;
  }

  // Project filter
  if (projectId) {
    query.projectId = projectId;
  }

  // Text search
  if (q && q.trim()) {
    query.$text = { $search: q };
  }

  // Build sort
  let sortObj = {};
  if (q && q.trim()) {
    // If searching, sort by text score first
    sortObj = { score: { $meta: 'textScore' } };
  }

  // Parse sort string (e.g., '-updatedAt' -> { updatedAt: -1 })
  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  // Always put pinned notes first for non-search queries
  if (!q || !q.trim()) {
    sortObj = { pinned: -1, ...sortObj };
  }

  // Execute query
  let queryBuilder = this.find(query);

  if (q && q.trim()) {
    queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } });
  }

  const notes = await queryBuilder
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  // Get total count
  const total = await this.countDocuments(query);

  return { notes, total };
};

const Note = mongoose.model('Note', noteSchema);

export default Note;
