import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: [true, 'Comment text is required'],
    trim: true,
    maxlength: [2000, 'Comment cannot exceed 2000 characters']
  }
}, {
  timestamps: true
});

const taskSchema = new mongoose.Schema({
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
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  body: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    trim: true,
    maxlength: [500, 'Location cannot exceed 500 characters'],
    default: ''
  },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'done', 'cancelled', 'archived', 'trashed'],
    default: 'todo',
    index: true
  },
  archivedAt: {
    type: Date,
    default: null
  },
  trashedAt: {
    type: Date,
    default: null
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
    index: true
  },
  dueDate: {
    type: Date,
    default: null,
    index: true
  },
  completedAt: {
    type: Date,
    default: null
  },
  tags: {
    type: [String],
    default: [],
    index: true
  },
  linkedNoteIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note'
  }],
  sourceNoteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
    default: null
  },
  comments: {
    type: [commentSchema],
    default: []
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
taskSchema.index({ userId: 1, status: 1, dueDate: 1 });
taskSchema.index({ userId: 1, dueDate: 1, status: 1 });
taskSchema.index({ userId: 1, lifeAreaId: 1, status: 1 });
taskSchema.index({ userId: 1, projectId: 1, status: 1 });

// Text index for search
taskSchema.index({ title: 'text', body: 'text' });

// Method to convert to safe JSON
taskSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Static method to search tasks
taskSchema.statics.searchTasks = async function(userId, options = {}) {
  const {
    q = '',
    status = null,
    priority = null,
    tags = [],
    hasDueDate = null,
    dueBefore = null,
    dueAfter = null,
    lifeAreaId = null,
    projectId = null,
    sort = '-createdAt',
    limit = 50,
    skip = 0
  } = options;

  // Build query
  const query = { userId };

  // Status filter
  if (status && status !== 'all') {
    if (Array.isArray(status)) {
      query.status = { $in: status };
    } else {
      query.status = status;
    }
  }

  // Priority filter
  if (priority && priority !== 'all') {
    query.priority = priority;
  }

  // Tags filter
  if (tags.length > 0) {
    query.tags = { $all: tags };
  }

  // Life area filter
  if (lifeAreaId) {
    query.lifeAreaId = lifeAreaId;
  }

  // Project filter
  if (projectId) {
    query.projectId = projectId;
  }

  // Due date filters
  if (hasDueDate === true) {
    query.dueDate = { $ne: null };
  } else if (hasDueDate === false) {
    query.dueDate = null;
  }

  if (dueBefore) {
    query.dueDate = { ...query.dueDate, $lte: new Date(dueBefore) };
  }

  if (dueAfter) {
    query.dueDate = { ...query.dueDate, $gte: new Date(dueAfter) };
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

  const tasks = await queryBuilder
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  // Get total count
  const total = await this.countDocuments(query);

  return { tasks, total };
};

// Get today's tasks (due today or overdue)
taskSchema.statics.getTodayTasks = async function(userId) {
  const now = new Date();

  // Get today's date components in LOCAL timezone
  // This ensures "today" matches the user's perspective
  const localYear = now.getFullYear();
  const localMonth = now.getMonth();
  const localDate = now.getDate();

  // Create UTC timestamps for comparison (since dates are stored as UTC midnight)
  // Using local date components ensures we compare against the correct day
  const startOfToday = new Date(Date.UTC(localYear, localMonth, localDate));
  const endOfToday = new Date(Date.UTC(localYear, localMonth, localDate, 23, 59, 59, 999));

  // Get overdue tasks (due before today, not completed)
  const overdue = await this.find({
    userId,
    dueDate: { $lt: startOfToday },
    status: { $nin: ['done', 'cancelled', 'archived', 'trashed'] }
  }).sort({ dueDate: 1, priority: -1 });

  // Get tasks due today (not completed)
  const dueToday = await this.find({
    userId,
    dueDate: { $gte: startOfToday, $lte: endOfToday },
    status: { $nin: ['done', 'cancelled', 'archived', 'trashed'] }
  }).sort({ priority: -1, createdAt: 1 });

  return { overdue, dueToday };
};

const Task = mongoose.model('Task', taskSchema);

export default Task;
