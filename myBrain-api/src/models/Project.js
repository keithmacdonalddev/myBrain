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

const progressSchema = new mongoose.Schema({
  total: { type: Number, default: 0 },
  completed: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 }
}, { _id: false });

const projectSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  outcome: {
    type: String,
    trim: true,
    maxlength: [500, 'Outcome cannot exceed 500 characters'],
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'on_hold', 'someday'],
    default: 'active',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
    index: true
  },
  deadline: {
    type: Date,
    default: null,
    index: true
  },
  completedAt: {
    type: Date,
    default: null
  },
  lifeAreaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LifeArea',
    default: null,
    index: true
  },
  linkedNoteIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note'
  }],
  linkedTaskIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  linkedEventIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  linkedFileIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  }],
  projectFolderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  tags: {
    type: [String],
    default: [],
    index: true
  },
  progress: {
    type: progressSchema,
    default: () => ({ total: 0, completed: 0, percentage: 0 })
  },
  color: {
    type: String,
    default: null
  },
  pinned: {
    type: Boolean,
    default: false
  },
  comments: {
    type: [commentSchema],
    default: []
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
projectSchema.index({ userId: 1, status: 1, deadline: 1 });
projectSchema.index({ userId: 1, lifeAreaId: 1, status: 1 });
projectSchema.index({ userId: 1, pinned: -1, updatedAt: -1 });

// Text index for search
projectSchema.index({ title: 'text', description: 'text', outcome: 'text' });

// Method to convert to safe JSON
projectSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Calculate progress from linked tasks
projectSchema.methods.calculateProgress = async function() {
  const Task = mongoose.model('Task');

  if (this.linkedTaskIds.length === 0) {
    this.progress = { total: 0, completed: 0, percentage: 0 };
    return this.progress;
  }

  const tasks = await Task.find({
    _id: { $in: this.linkedTaskIds }
  });

  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'done').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  this.progress = { total, completed, percentage };
  return this.progress;
};

// Update progress and save
projectSchema.methods.updateProgress = async function() {
  await this.calculateProgress();
  return this.save();
};

// Search projects
projectSchema.statics.searchProjects = async function(userId, options = {}) {
  const {
    q = '',
    status = null,
    lifeAreaId = null,
    priority = null,
    tags = [],
    hasDeadline = null,
    pinned = null,
    sort = '-updatedAt',
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

  // Life area filter
  if (lifeAreaId) {
    query.lifeAreaId = lifeAreaId;
  }

  // Priority filter
  if (priority && priority !== 'all') {
    query.priority = priority;
  }

  // Tags filter
  if (tags.length > 0) {
    query.tags = { $all: tags };
  }

  // Deadline filter
  if (hasDeadline === true) {
    query.deadline = { $ne: null };
  } else if (hasDeadline === false) {
    query.deadline = null;
  }

  // Pinned filter
  if (pinned !== null) {
    query.pinned = pinned;
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

  // Always put pinned projects first for non-search queries
  if (!q || !q.trim()) {
    sortObj = { pinned: -1, ...sortObj };
  }

  // Execute query
  let queryBuilder = this.find(query);

  if (q && q.trim()) {
    queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } });
  }

  const projects = await queryBuilder
    .populate('lifeAreaId', 'name color icon')
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  // Get total count
  const total = await this.countDocuments(query);

  return { projects, total };
};

// Get projects with upcoming deadlines
projectSchema.statics.getUpcoming = async function(userId, days = 7) {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);

  return this.find({
    userId,
    status: 'active',
    deadline: { $gte: now, $lte: future }
  })
    .populate('lifeAreaId', 'name color icon')
    .sort({ deadline: 1 });
};

// Get overdue projects
projectSchema.statics.getOverdue = async function(userId) {
  const now = new Date();

  return this.find({
    userId,
    status: 'active',
    deadline: { $lt: now, $ne: null }
  })
    .populate('lifeAreaId', 'name color icon')
    .sort({ deadline: 1 });
};

// Link a note to this project
projectSchema.methods.linkNote = async function(noteId) {
  if (!this.linkedNoteIds.includes(noteId)) {
    this.linkedNoteIds.push(noteId);
    await this.save();

    // Update the note's projectId
    const Note = mongoose.model('Note');
    await Note.findByIdAndUpdate(noteId, { projectId: this._id });
  }
  return this;
};

// Unlink a note from this project
projectSchema.methods.unlinkNote = async function(noteId) {
  this.linkedNoteIds = this.linkedNoteIds.filter(
    id => id.toString() !== noteId.toString()
  );
  await this.save();

  // Remove the note's projectId
  const Note = mongoose.model('Note');
  await Note.findByIdAndUpdate(noteId, { projectId: null });
  return this;
};

// Link a task to this project
projectSchema.methods.linkTask = async function(taskId) {
  if (!this.linkedTaskIds.includes(taskId)) {
    this.linkedTaskIds.push(taskId);
    await this.calculateProgress();
    await this.save();

    // Update the task's projectId
    const Task = mongoose.model('Task');
    await Task.findByIdAndUpdate(taskId, { projectId: this._id });
  }
  return this;
};

// Unlink a task from this project
projectSchema.methods.unlinkTask = async function(taskId) {
  this.linkedTaskIds = this.linkedTaskIds.filter(
    id => id.toString() !== taskId.toString()
  );
  await this.calculateProgress();
  await this.save();

  // Remove the task's projectId
  const Task = mongoose.model('Task');
  await Task.findByIdAndUpdate(taskId, { projectId: null });
  return this;
};

// Link an event to this project
projectSchema.methods.linkEvent = async function(eventId) {
  if (!this.linkedEventIds.includes(eventId)) {
    this.linkedEventIds.push(eventId);
    await this.save();

    // Update the event's projectId
    const Event = mongoose.model('Event');
    await Event.findByIdAndUpdate(eventId, { projectId: this._id });
  }
  return this;
};

// Unlink an event from this project
projectSchema.methods.unlinkEvent = async function(eventId) {
  this.linkedEventIds = this.linkedEventIds.filter(
    id => id.toString() !== eventId.toString()
  );
  await this.save();

  // Remove the event's projectId
  const Event = mongoose.model('Event');
  await Event.findByIdAndUpdate(eventId, { projectId: null });
  return this;
};

// Link a file to this project
projectSchema.methods.linkFile = async function(fileId) {
  if (!this.linkedFileIds.includes(fileId)) {
    this.linkedFileIds.push(fileId);
    await this.save();

    // Update the file's linkedProjectIds
    const File = mongoose.model('File');
    await File.findByIdAndUpdate(fileId, {
      $addToSet: { linkedProjectIds: this._id }
    });
  }
  return this;
};

// Unlink a file from this project
projectSchema.methods.unlinkFile = async function(fileId) {
  this.linkedFileIds = this.linkedFileIds.filter(
    id => id.toString() !== fileId.toString()
  );
  await this.save();

  // Remove from the file's linkedProjectIds
  const File = mongoose.model('File');
  await File.findByIdAndUpdate(fileId, {
    $pull: { linkedProjectIds: this._id }
  });
  return this;
};

// Get all unique tags used in projects by a user
projectSchema.statics.getUserTags = async function(userId) {
  const result = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } }
  ]);

  return result.map(r => ({ tag: r._id, count: r.count }));
};

const Project = mongoose.model('Project', projectSchema);

export default Project;
