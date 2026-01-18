import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'done', 'cancelled'],
    default: 'todo',
    index: true
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
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
taskSchema.index({ userId: 1, status: 1, dueDate: 1 });
taskSchema.index({ userId: 1, dueDate: 1, status: 1 });

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

  // Use UTC dates for consistent comparison regardless of server timezone
  // Start of today in UTC (00:00:00.000)
  const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // End of today in UTC (23:59:59.999)
  const endOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  // Get overdue tasks (due before today UTC, not completed)
  const overdue = await this.find({
    userId,
    dueDate: { $lt: startOfTodayUTC },
    status: { $nin: ['done', 'cancelled'] }
  }).sort({ dueDate: 1, priority: -1 });

  // Get tasks due today (not completed)
  const dueToday = await this.find({
    userId,
    dueDate: { $gte: startOfTodayUTC, $lte: endOfTodayUTC },
    status: { $nin: ['done', 'cancelled'] }
  }).sort({ priority: -1, createdAt: 1 });

  return { overdue, dueToday };
};

const Task = mongoose.model('Task', taskSchema);

export default Task;
