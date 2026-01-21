/**
 * =============================================================================
 * TASK.JS - Task/To-Do Data Model
 * =============================================================================
 *
 * This file defines the Task model - the data structure for to-do items and
 * tasks in myBrain. Tasks help users track things they need to do.
 *
 * WHAT IS A TASK?
 * ---------------
 * A task is an action item that a user needs to complete. Tasks can:
 * - Have a title, description, and location
 * - Have a due date and priority level
 * - Be organized into projects and life areas
 * - Have files and notes linked to them
 * - Have comments for additional context
 * - Progress through various statuses (todo → in_progress → done)
 *
 * TASK LIFECYCLE:
 * ---------------
 * 1. Created → status: 'todo' (not started)
 * 2. Started → status: 'in_progress' (being worked on)
 * 3. Completed → status: 'done' (finished)
 * 4. Cancelled → status: 'cancelled' (no longer needed)
 * 5. Archived → status: 'archived' (old but kept for reference)
 * 6. Trashed → status: 'trashed' (scheduled for deletion)
 *
 * PRIORITY LEVELS:
 * ----------------
 * - 'low': Not urgent, do when you have time
 * - 'medium': Normal priority (default)
 * - 'high': Important, do soon
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
// COMMENT SUB-SCHEMA
// =============================================================================

/**
 * Comment Schema (Sub-document)
 * ----------------------------
 * Tasks can have comments - additional notes or updates about the task.
 * This is a "sub-schema" that defines the structure of each comment.
 *
 * Comments allow users to:
 * - Add progress updates
 * - Note blockers or issues
 * - Collaborate on tasks (in future multi-user scenarios)
 */
const commentSchema = new mongoose.Schema({
  /**
   * userId: Who wrote this comment
   * Required so we know who said what
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  /**
   * text: The comment content
   * - Required: Can't have an empty comment
   * - Max 2000 characters (prevents very long comments)
   */
  text: {
    type: String,
    required: [true, 'Comment text is required'],
    trim: true,
    maxlength: [2000, 'Comment cannot exceed 2000 characters']
  }
}, {
  /**
   * timestamps adds createdAt and updatedAt to each comment
   * So we know when comments were written and edited
   */
  timestamps: true
});

// =============================================================================
// TASK SCHEMA DEFINITION
// =============================================================================

/**
 * The Task Schema
 * ---------------
 * Defines all the fields a Task document can have.
 */
const taskSchema = new mongoose.Schema({

  // ===========================================================================
  // OWNERSHIP
  // ===========================================================================

  /**
   * userId: Which user owns this task
   * - Required: Every task must belong to a user
   * - Indexed: For fast queries of a user's tasks
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ===========================================================================
  // ORGANIZATION
  // ===========================================================================

  /**
   * lifeAreaId: Which life area category this task belongs to
   * - Optional: Tasks don't have to be categorized
   * - Examples: "Work", "Personal", "Health"
   */
  lifeAreaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LifeArea',
    default: null,
    index: true
  },

  /**
   * projectId: Which project this task is part of
   * - Optional: Tasks can exist outside of projects
   * - Useful for grouping related tasks together
   */
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
    index: true
  },

  // ===========================================================================
  // CONTENT
  // ===========================================================================

  /**
   * title: What needs to be done
   * - Required: Every task must have a title
   * - This is the main description of the action item
   * - Example: "Buy groceries", "Call dentist", "Finish report"
   */
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },

  /**
   * body: Additional details about the task
   * - Optional: For tasks that need more explanation
   * - Can include steps, context, links, etc.
   */
  body: {
    type: String,
    default: ''
  },

  /**
   * location: Where the task needs to be done
   * - Optional: For tasks tied to a physical location
   * - Example: "Office", "Home", "Grocery Store"
   */
  location: {
    type: String,
    trim: true,
    maxlength: [500, 'Location cannot exceed 500 characters'],
    default: ''
  },

  // ===========================================================================
  // STATUS AND PROGRESS
  // ===========================================================================

  /**
   * status: Current state of the task
   * - 'todo': Not started yet (default)
   * - 'in_progress': Currently being worked on
   * - 'done': Completed successfully
   * - 'cancelled': Decided not to do it
   * - 'archived': Old completed task kept for reference
   * - 'trashed': In trash, will be deleted
   */
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'done', 'cancelled', 'archived', 'trashed'],
    default: 'todo',
    index: true
  },

  /**
   * archivedAt: When the task was archived
   * - Used for tracking when old tasks were put away
   */
  archivedAt: {
    type: Date,
    default: null
  },

  /**
   * trashedAt: When the task was moved to trash
   * - Used for automatic cleanup of old trashed items
   */
  trashedAt: {
    type: Date,
    default: null
  },

  // ===========================================================================
  // PRIORITY AND TIMING
  // ===========================================================================

  /**
   * priority: How important/urgent is this task
   * - 'low': Do when you have time
   * - 'medium': Normal priority (default)
   * - 'high': Do this soon, it's important
   */
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
    index: true
  },

  /**
   * dueDate: When should this task be completed
   * - Optional: Not all tasks have deadlines
   * - Used for "due today" and "overdue" features
   */
  dueDate: {
    type: Date,
    default: null,
    index: true
  },

  /**
   * completedAt: When was this task actually finished
   * - Automatically set when status changes to 'done'
   * - Useful for productivity tracking
   */
  completedAt: {
    type: Date,
    default: null
  },

  // ===========================================================================
  // TAGS
  // ===========================================================================

  /**
   * tags: Labels for categorizing and filtering tasks
   * - Array of strings like ["urgent", "phone-call", "waiting"]
   * - Helps organize and find tasks
   */
  tags: {
    type: [String],
    default: [],
    index: true
  },

  // ===========================================================================
  // LINKED ITEMS
  // ===========================================================================

  /**
   * linkedNoteIds: Notes related to this task
   * - Array of Note document IDs
   * - Example: Meeting notes related to a task
   */
  linkedNoteIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note'
  }],

  /**
   * linkedFileIds: Files attached to this task
   * - Array of File document IDs
   * - Example: Documents needed to complete the task
   */
  linkedFileIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  }],

  /**
   * sourceNoteId: If this task was created from a note
   * - Some workflows let users convert notes to tasks
   * - This tracks the original note
   */
  sourceNoteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
    default: null
  },

  // ===========================================================================
  // COMMENTS
  // ===========================================================================

  /**
   * comments: Progress notes and updates on the task
   * - Array of comment sub-documents
   * - Each comment has userId, text, and timestamps
   */
  comments: {
    type: [commentSchema],
    default: []
  }

}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When the task was created
   * - updatedAt: When the task was last modified
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Compound Indexes for Common Queries
 * -----------------------------------
 * Speed up the most common task queries.
 */

// For listing tasks by status and due date
// Used by: Task list with due date sorting
taskSchema.index({ userId: 1, status: 1, dueDate: 1 });

// For showing tasks by due date, then status
// Used by: Calendar and timeline views
taskSchema.index({ userId: 1, dueDate: 1, status: 1 });

// For filtering by life area
// Used by: Life area task views
taskSchema.index({ userId: 1, lifeAreaId: 1, status: 1 });

// For filtering by project
// Used by: Project task lists
taskSchema.index({ userId: 1, projectId: 1, status: 1 });

/**
 * Text Index for Full-Text Search
 * --------------------------------
 * Enables searching within task title and body.
 */
taskSchema.index({ title: 'text', body: 'text' });

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * toSafeJSON()
 * ------------
 * Convert task to clean JSON for API responses.
 *
 * @returns {Object} - Clean task object
 */
taskSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// =============================================================================
// STATIC METHODS
// =============================================================================

/**
 * searchTasks(userId, options)
 * ----------------------------
 * Advanced search function to find tasks matching various criteria.
 *
 * @param {string} userId - ID of the user whose tasks to search
 * @param {Object} options - Search options:
 *   - q: Search query text
 *   - status: Filter by status (string or array of strings)
 *   - priority: Filter by priority level
 *   - tags: Array of tags to filter by
 *   - hasDueDate: Filter tasks that have/don't have due dates
 *   - dueBefore: Filter tasks due before this date
 *   - dueAfter: Filter tasks due after this date
 *   - lifeAreaId: Filter by life area
 *   - projectId: Filter by project
 *   - sort: Sort field (default '-createdAt')
 *   - limit: Max results (default 50)
 *   - skip: Results to skip (pagination)
 *
 * @returns {Object} - { tasks: Array, total: Number }
 */
taskSchema.statics.searchTasks = async function(userId, options = {}) {
  // Extract options with defaults
  const {
    q = '',              // Search query
    status = null,       // Status filter
    priority = null,     // Priority filter
    tags = [],           // Tags filter
    hasDueDate = null,   // Has due date filter
    dueBefore = null,    // Due before date
    dueAfter = null,     // Due after date
    lifeAreaId = null,   // Life area filter
    projectId = null,    // Project filter
    sort = '-createdAt', // Sort field
    limit = 50,          // Max results
    skip = 0             // Skip for pagination
  } = options;

  // -----------------------------------------
  // BUILD THE QUERY
  // -----------------------------------------

  const query = { userId };

  // Status filter - can be single value or array
  if (status && status !== 'all') {
    if (Array.isArray(status)) {
      query.status = { $in: status }; // Match any of the statuses
    } else {
      query.status = status;
    }
  }

  // Priority filter
  if (priority && priority !== 'all') {
    query.priority = priority;
  }

  // Tags filter - must have ALL specified tags
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
    query.dueDate = { $ne: null }; // Has a due date
  } else if (hasDueDate === false) {
    query.dueDate = null; // No due date
  }

  // Due before specific date
  if (dueBefore) {
    query.dueDate = { ...query.dueDate, $lte: new Date(dueBefore) };
  }

  // Due after specific date
  if (dueAfter) {
    query.dueDate = { ...query.dueDate, $gte: new Date(dueAfter) };
  }

  // Text search
  if (q && q.trim()) {
    query.$text = { $search: q };
  }

  // -----------------------------------------
  // BUILD SORT ORDER
  // -----------------------------------------

  let sortObj = {};

  // Text search: sort by relevance first
  if (q && q.trim()) {
    sortObj = { score: { $meta: 'textScore' } };
  }

  // Parse sort string
  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  // -----------------------------------------
  // EXECUTE QUERY
  // -----------------------------------------

  let queryBuilder = this.find(query);

  if (q && q.trim()) {
    queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } });
  }

  const tasks = await queryBuilder
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  const total = await this.countDocuments(query);

  return { tasks, total };
};

/**
 * getTodayTasks(userId)
 * ---------------------
 * Get tasks that are due today or overdue.
 * Used for the "Today" view in the app.
 *
 * @param {string} userId - User ID
 * @returns {Object} - { overdue: Array, dueToday: Array }
 *
 * WHAT THIS RETURNS:
 * - overdue: Tasks with due dates before today (that aren't done)
 * - dueToday: Tasks due today (that aren't done)
 */
taskSchema.statics.getTodayTasks = async function(userId) {
  const now = new Date();

  // Get today's date boundaries in local timezone
  // This ensures "today" matches the user's perspective
  const localYear = now.getFullYear();
  const localMonth = now.getMonth();
  const localDate = now.getDate();

  // Create UTC timestamps for comparison
  // Dates in MongoDB are stored as UTC midnight
  const startOfToday = new Date(Date.UTC(localYear, localMonth, localDate));
  const endOfToday = new Date(Date.UTC(localYear, localMonth, localDate, 23, 59, 59, 999));

  // Statuses that mean "not completed"
  const incompleteStatuses = ['done', 'cancelled', 'archived', 'trashed'];

  // Find OVERDUE tasks (due before today, not completed)
  const overdue = await this.find({
    userId,
    dueDate: { $lt: startOfToday },                    // Due before today
    status: { $nin: incompleteStatuses }               // Not done/cancelled/archived/trashed
  }).sort({ dueDate: 1, priority: -1 });               // Oldest first, then by priority

  // Find tasks DUE TODAY (not completed)
  const dueToday = await this.find({
    userId,
    dueDate: { $gte: startOfToday, $lte: endOfToday }, // Due today
    status: { $nin: incompleteStatuses }               // Not done/cancelled/archived/trashed
  }).sort({ priority: -1, createdAt: 1 });             // High priority first, then oldest

  return { overdue, dueToday };
};

// =============================================================================
// FILE LINKING METHODS
// =============================================================================

/**
 * linkFile(fileId)
 * ----------------
 * Attach a file to this task.
 * Creates bidirectional link (task → file and file → task).
 *
 * @param {string} fileId - ID of the file to link
 * @returns {Object} - Updated task
 */
taskSchema.methods.linkFile = async function(fileId) {
  if (!this.linkedFileIds.includes(fileId)) {
    this.linkedFileIds.push(fileId);
    await this.save();

    // Update file to link back to this task
    const File = mongoose.model('File');
    await File.findByIdAndUpdate(fileId, {
      $addToSet: { linkedTaskIds: this._id }
    });
  }
  return this;
};

/**
 * unlinkFile(fileId)
 * ------------------
 * Remove a file attachment from this task.
 *
 * @param {string} fileId - ID of the file to unlink
 * @returns {Object} - Updated task
 */
taskSchema.methods.unlinkFile = async function(fileId) {
  this.linkedFileIds = this.linkedFileIds.filter(
    id => id.toString() !== fileId.toString()
  );
  await this.save();

  // Remove from file's linked tasks
  const File = mongoose.model('File');
  await File.findByIdAndUpdate(fileId, {
    $pull: { linkedTaskIds: this._id }
  });

  return this;
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the Task model from the schema.
 * This gives us methods to:
 * - Create tasks: Task.create({ userId, title })
 * - Find tasks: Task.find({ userId }), Task.findById(id)
 * - Update tasks: Task.findByIdAndUpdate(id, updates)
 * - Delete tasks: Task.findByIdAndDelete(id)
 * - Search tasks: Task.searchTasks(userId, options)
 * - Get today's tasks: Task.getTodayTasks(userId)
 */
const Task = mongoose.model('Task', taskSchema);

export default Task;
