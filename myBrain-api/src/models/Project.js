/**
 * =============================================================================
 * PROJECT.JS - Project Data Model
 * =============================================================================
 *
 * This file defines the Project model - the data structure for projects in myBrain.
 * Projects are containers that group related notes, tasks, events, and files
 * together for a specific goal or initiative.
 *
 * WHAT IS A PROJECT?
 * ------------------
 * A project is a collection of work toward a specific outcome. Unlike notes
 * (single pieces of content) or tasks (individual to-dos), projects are
 * larger efforts that may contain many notes, tasks, and events.
 *
 * EXAMPLES OF PROJECTS:
 * - "Website Redesign" - contains design notes, development tasks, meeting events
 * - "Move to New Apartment" - contains research notes, moving tasks, viewing events
 * - "Learn Spanish" - contains study notes, practice tasks, lesson events
 *
 * PROJECT LIFECYCLE:
 * ------------------
 * 1. Created → status: 'active' (currently working on)
 * 2. Paused → status: 'on_hold' (temporarily stopped)
 * 3. Deferred → status: 'someday' (maybe later)
 * 4. Done → status: 'completed' (achieved the outcome)
 *
 * KEY FEATURES:
 * - Links to notes, tasks, events, and files
 * - Automatic progress tracking from linked tasks
 * - Deadline tracking with overdue detection
 * - Comments for team collaboration
 * - Tags for categorization
 * - Life area organization
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
// SUB-SCHEMAS (Embedded Documents)
// =============================================================================

/**
 * Comment Schema
 * --------------
 * Represents a comment on a project. Comments allow users to add notes,
 * updates, or collaborate with others on the project.
 *
 * WHY EMBEDDED?
 * Comments are embedded directly in the project document rather than being
 * a separate collection. This makes it fast to load a project with all its
 * comments in a single database query.
 */
const commentSchema = new mongoose.Schema({
  /**
   * userId: Who wrote this comment
   * - Required: Every comment must have an author
   * - References: Points to a User document
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  /**
   * text: The actual comment content
   * - Required: Comments must have text (can't be empty)
   * - Max 2000 characters: Keeps comments focused
   * - Trimmed: Removes extra whitespace from start/end
   */
  text: {
    type: String,
    required: [true, 'Comment text is required'],
    trim: true,
    maxlength: [2000, 'Comment cannot exceed 2000 characters']
  }
}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When the comment was written
   * - updatedAt: When the comment was last edited
   */
  timestamps: true
});

/**
 * Progress Schema
 * ---------------
 * Tracks the completion progress of a project based on its linked tasks.
 * This is calculated automatically whenever tasks are added or completed.
 *
 * EXAMPLE:
 * A project with 10 linked tasks, 4 of which are done, would have:
 * { total: 10, completed: 4, percentage: 40 }
 *
 * _id: false means this sub-document won't get its own MongoDB ID
 * (it's just data within the project, not a standalone document)
 */
const progressSchema = new mongoose.Schema({
  /**
   * total: Total number of tasks linked to this project
   */
  total: { type: Number, default: 0 },

  /**
   * completed: Number of tasks that are marked as done
   */
  completed: { type: Number, default: 0 },

  /**
   * percentage: Completion percentage (0-100)
   * Calculated as: (completed / total) * 100
   */
  percentage: { type: Number, default: 0 }
}, { _id: false });

// =============================================================================
// MAIN PROJECT SCHEMA
// =============================================================================

/**
 * The Project Schema
 * ------------------
 * Defines all the fields a Project document can have.
 */
const projectSchema = new mongoose.Schema({

  // ===========================================================================
  // OWNERSHIP
  // ===========================================================================

  /**
   * userId: Which user owns this project
   * - Required: Every project must belong to a user
   * - References: Points to a User document in the users collection
   * - Index: Creates a database index for faster lookups by user
   *
   * This is how we know which projects to show when a user logs in.
   */
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ===========================================================================
  // BASIC INFO
  // ===========================================================================

  /**
   * title: The project's name
   * - Required: Every project needs a name
   * - Max 200 characters
   * - Trimmed: Removes extra whitespace
   *
   * EXAMPLES: "Website Redesign", "Q4 Marketing Campaign", "Home Renovation"
   */
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },

  /**
   * description: Detailed explanation of the project
   * - Optional: Projects can exist without a description
   * - No length limit: Can be as detailed as needed
   */
  description: {
    type: String,
    trim: true,
    default: ''
  },

  /**
   * outcome: The desired end result of this project
   * - Optional but recommended
   * - Max 500 characters: Should be concise
   *
   * The outcome helps clarify what "done" looks like.
   * EXAMPLES:
   * - "New website launched and receiving traffic"
   * - "Successfully moved into new apartment"
   * - "Able to hold basic conversations in Spanish"
   */
  outcome: {
    type: String,
    trim: true,
    maxlength: [500, 'Outcome cannot exceed 500 characters'],
    default: ''
  },

  // ===========================================================================
  // STATUS & PRIORITY
  // ===========================================================================

  /**
   * status: Current state of the project
   *
   * VALUES:
   * - 'active': Currently working on this project
   * - 'completed': Project is finished, outcome achieved
   * - 'on_hold': Temporarily paused (will resume later)
   * - 'someday': Deferred to an undefined future time
   */
  status: {
    type: String,
    enum: ['active', 'completed', 'on_hold', 'someday'],
    default: 'active',
    index: true
  },

  /**
   * priority: How important/urgent is this project
   *
   * VALUES:
   * - 'low': Nice to have, do when time permits
   * - 'medium': Important but not urgent
   * - 'high': Critical, needs attention now
   */
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
    index: true
  },

  // ===========================================================================
  // TIMELINE
  // ===========================================================================

  /**
   * deadline: When this project should be completed by
   * - Optional: Not all projects have deadlines
   * - Used to track overdue projects
   * - Displayed in project lists and dashboards
   */
  deadline: {
    type: Date,
    default: null,
    index: true
  },

  /**
   * completedAt: When the project was actually finished
   * - Set automatically when status changes to 'completed'
   * - Useful for tracking project duration and history
   */
  completedAt: {
    type: Date,
    default: null
  },

  // ===========================================================================
  // ORGANIZATION
  // ===========================================================================

  /**
   * lifeAreaId: Which life area category this project belongs to
   * - Optional: Projects don't have to be in a life area
   * - References: Points to a LifeArea document
   *
   * Life areas are broad categories like "Work", "Personal", "Health"
   * Helps organize projects by area of life they affect.
   */
  lifeAreaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LifeArea',
    default: null,
    index: true
  },

  // ===========================================================================
  // LINKED ITEMS
  // ===========================================================================

  /**
   * linkedNoteIds: Notes related to this project
   * - Array of Note document IDs
   * - Notes can contain research, ideas, meeting notes, etc.
   *
   * EXAMPLE: A "Website Redesign" project might link to:
   * - Design requirements notes
   * - Competitor analysis notes
   * - Meeting notes from client discussions
   */
  linkedNoteIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note'
  }],

  /**
   * linkedTaskIds: Tasks that are part of this project
   * - Array of Task document IDs
   * - Used to calculate project progress
   *
   * EXAMPLE: A "Website Redesign" project might link to tasks like:
   * - "Create wireframes"
   * - "Design homepage mockup"
   * - "Implement responsive layout"
   */
  linkedTaskIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],

  /**
   * linkedEventIds: Events related to this project
   * - Array of Event document IDs
   * - Can include meetings, deadlines, milestones
   *
   * EXAMPLE: A "Website Redesign" project might link to:
   * - Design review meeting
   * - Launch date event
   * - Client presentation
   */
  linkedEventIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],

  /**
   * linkedFileIds: Files attached to this project
   * - Array of File document IDs
   * - Can include documents, images, PDFs, etc.
   *
   * EXAMPLE: A "Website Redesign" project might have:
   * - Brand guidelines PDF
   * - Logo files
   * - Design mockup images
   */
  linkedFileIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  }],

  /**
   * projectFolderId: Dedicated folder for this project's files
   * - Optional: Not all projects have a folder
   * - References: Points to a Folder document
   *
   * Some projects have a dedicated folder where all related
   * files are automatically organized.
   */
  projectFolderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },

  // ===========================================================================
  // CATEGORIZATION
  // ===========================================================================

  /**
   * tags: Labels for categorizing and finding projects
   * - Array of strings like ["client-work", "q4-2024", "high-priority"]
   * - Users can search/filter by tags
   * - Indexed for fast tag-based queries
   */
  tags: {
    type: [String],
    default: [],
    index: true
  },

  // ===========================================================================
  // PROGRESS TRACKING
  // ===========================================================================

  /**
   * progress: Automatic progress tracking based on linked tasks
   * - Uses the progressSchema defined above
   * - Updated automatically when tasks are linked/completed
   *
   * This gives users a visual indicator of how far along the project is.
   */
  progress: {
    type: progressSchema,
    default: () => ({ total: 0, completed: 0, percentage: 0 })
  },

  // ===========================================================================
  // APPEARANCE
  // ===========================================================================

  /**
   * color: Custom color for this project
   * - Optional: Uses default color if not set
   * - Helps visually distinguish projects in lists and calendars
   *
   * EXAMPLE: "#3b82f6" (blue), "#ef4444" (red), "#10b981" (green)
   */
  color: {
    type: String,
    default: null
  },

  /**
   * pinned: Whether this project should appear at the top of lists
   * - Pinned projects are shown first, regardless of other sorting
   * - Useful for projects that need frequent attention
   */
  pinned: {
    type: Boolean,
    default: false
  },

  // ===========================================================================
  // COLLABORATION
  // ===========================================================================

  /**
   * comments: Discussion thread for this project
   * - Array of comment sub-documents
   * - Allows users to add notes, updates, or collaborate
   *
   * Comments are stored directly in the project document for fast access.
   */
  comments: {
    type: [commentSchema],
    default: []
  }

}, {
  /**
   * timestamps: true automatically adds:
   * - createdAt: When the project was created
   * - updatedAt: When the project was last modified
   */
  timestamps: true
});

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Compound Indexes for Common Queries
 * -----------------------------------
 * These indexes speed up the most common ways projects are queried.
 * Think of them as pre-sorted lists that make finding data faster.
 *
 * Without indexes, every query would scan ALL projects.
 * With indexes, queries jump directly to matching projects.
 */

// For listing a user's projects by status and deadline
// Used by: Projects list filtered by status, deadline view
projectSchema.index({ userId: 1, status: 1, deadline: 1 });

// For filtering projects by life area
// Used by: Life area view showing related projects
projectSchema.index({ userId: 1, lifeAreaId: 1, status: 1 });

// For listing projects with pinned ones first, then by update time
// Used by: Default project list sorting
projectSchema.index({ userId: 1, pinned: -1, updatedAt: -1 });

/**
 * Text Index for Full-Text Search
 * --------------------------------
 * This special index enables searching within project content.
 * MongoDB can search through title, description, and outcome text efficiently.
 *
 * Example: User searches for "marketing" → finds projects with that word
 */
projectSchema.index({ title: 'text', description: 'text', outcome: 'text' });

// =============================================================================
// INSTANCE METHODS
// =============================================================================

/**
 * toSafeJSON()
 * ------------
 * Convert project to a clean JSON object for API responses.
 * Removes internal MongoDB fields like __v (version key).
 *
 * @returns {Object} - Clean project object
 */
projectSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.__v; // Remove MongoDB version field
  return obj;
};

/**
 * calculateProgress()
 * -------------------
 * Calculate the project's progress based on linked tasks.
 * Counts how many linked tasks are done vs total.
 *
 * @returns {Object} - Progress object { total, completed, percentage }
 *
 * EXAMPLE:
 * Project has 10 linked tasks, 7 are done
 * Returns: { total: 10, completed: 7, percentage: 70 }
 */
projectSchema.methods.calculateProgress = async function() {
  // Get the Task model (needed to query tasks)
  const Task = mongoose.model('Task');

  // If no tasks are linked, progress is 0
  if (this.linkedTaskIds.length === 0) {
    this.progress = { total: 0, completed: 0, percentage: 0 };
    return this.progress;
  }

  // Find all linked tasks
  const tasks = await Task.find({
    _id: { $in: this.linkedTaskIds }  // $in = ID is in this array
  });

  // Count totals
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'done').length;

  // Calculate percentage (avoid division by zero)
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Update and return
  this.progress = { total, completed, percentage };
  return this.progress;
};

/**
 * updateProgress()
 * ----------------
 * Calculate progress and save the project.
 * Convenience method that combines calculateProgress() + save().
 *
 * @returns {Object} - The saved project document
 */
projectSchema.methods.updateProgress = async function() {
  await this.calculateProgress();
  return this.save();
};

// =============================================================================
// STATIC METHODS (Called on the Model, not an instance)
// =============================================================================

/**
 * searchProjects(userId, options)
 * -------------------------------
 * Advanced search function to find projects matching various criteria.
 * Supports text search, filtering, sorting, and pagination.
 *
 * @param {string} userId - ID of the user whose projects to search
 * @param {Object} options - Search options:
 *   - q: Search query text
 *   - status: Filter by status (can be string or array)
 *   - lifeAreaId: Filter by life area
 *   - priority: Filter by priority level
 *   - tags: Array of tags to filter by
 *   - hasDeadline: true/false to filter by deadline existence
 *   - pinned: Filter by pinned status
 *   - sort: Sort field (default '-updatedAt' = newest first)
 *   - limit: Max results to return (default 50)
 *   - skip: Number of results to skip (for pagination)
 *
 * @returns {Object} - { projects: Array, total: Number }
 *
 * EXAMPLE USAGE:
 * ```
 * const { projects, total } = await Project.searchProjects(userId, {
 *   q: 'website',
 *   status: 'active',
 *   priority: 'high',
 *   limit: 20
 * });
 * ```
 */
projectSchema.statics.searchProjects = async function(userId, options = {}) {
  // Extract options with defaults
  const {
    q = '',              // Search query text
    status = null,       // Filter by status
    lifeAreaId = null,   // Filter by life area
    priority = null,     // Filter by priority
    tags = [],           // Filter by tags
    hasDeadline = null,  // Filter by deadline existence
    pinned = null,       // Filter by pinned status
    sort = '-updatedAt', // Sort field (- prefix = descending)
    limit = 50,          // Max results
    skip = 0             // Results to skip (pagination)
  } = options;

  // -----------------------------------------
  // BUILD THE QUERY
  // -----------------------------------------

  // Start with the user's projects
  const query = { userId };

  // Status filter (can be single value or array)
  if (status && status !== 'all') {
    if (Array.isArray(status)) {
      query.status = { $in: status }; // $in = match any in array
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

  // Tags filter - project must have ALL specified tags
  if (tags.length > 0) {
    query.tags = { $all: tags }; // $all = array contains all values
  }

  // Deadline filter
  if (hasDeadline === true) {
    query.deadline = { $ne: null }; // $ne = not equal (has deadline)
  } else if (hasDeadline === false) {
    query.deadline = null; // No deadline
  }

  // Pinned filter
  if (pinned !== null) {
    query.pinned = pinned;
  }

  // Text search
  if (q && q.trim()) {
    query.$text = { $search: q }; // MongoDB text search
  }

  // -----------------------------------------
  // BUILD THE SORT ORDER
  // -----------------------------------------

  let sortObj = {};

  // If text searching, sort by relevance score first
  if (q && q.trim()) {
    sortObj = { score: { $meta: 'textScore' } };
  }

  // Parse sort string: '-updatedAt' → { updatedAt: -1 }
  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1; // Descending
  } else {
    sortObj[sort] = 1; // Ascending
  }

  // For non-search queries, always show pinned projects first
  if (!q || !q.trim()) {
    sortObj = { pinned: -1, ...sortObj };
  }

  // -----------------------------------------
  // EXECUTE THE QUERY
  // -----------------------------------------

  let queryBuilder = this.find(query);

  // Include text match score if searching
  if (q && q.trim()) {
    queryBuilder = queryBuilder.select({ score: { $meta: 'textScore' } });
  }

  // Execute with population, sort, pagination
  const projects = await queryBuilder
    .populate('lifeAreaId', 'name color icon') // Include life area details
    .sort(sortObj)
    .skip(skip)
    .limit(limit);

  // Get total count for pagination info
  const total = await this.countDocuments(query);

  return { projects, total };
};

/**
 * getUpcoming(userId, days)
 * -------------------------
 * Find projects with deadlines in the next N days.
 * Useful for showing upcoming due dates on dashboards.
 *
 * @param {string} userId - User's ID
 * @param {number} days - Number of days to look ahead (default 7)
 * @returns {Array} - Projects with upcoming deadlines, sorted by deadline
 *
 * EXAMPLE:
 * Get projects due in the next 7 days:
 * const upcoming = await Project.getUpcoming(userId, 7);
 */
projectSchema.statics.getUpcoming = async function(userId, days = 7) {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days); // Add N days

  return this.find({
    userId,
    status: 'active',                    // Only active projects
    deadline: { $gte: now, $lte: future } // Deadline between now and future
  })
    .populate('lifeAreaId', 'name color icon')
    .sort({ deadline: 1 }); // Earliest deadline first
};

/**
 * getOverdue(userId)
 * ------------------
 * Find projects that are past their deadline.
 * Useful for alerting users to overdue work.
 *
 * @param {string} userId - User's ID
 * @returns {Array} - Overdue projects, sorted by how late they are
 *
 * EXAMPLE:
 * const overdue = await Project.getOverdue(userId);
 */
projectSchema.statics.getOverdue = async function(userId) {
  const now = new Date();

  return this.find({
    userId,
    status: 'active',                      // Only active (not completed)
    deadline: { $lt: now, $ne: null }      // Deadline is in the past
  })
    .populate('lifeAreaId', 'name color icon')
    .sort({ deadline: 1 }); // Most overdue first
};

// =============================================================================
// LINKING METHODS
// =============================================================================

/**
 * These methods create bidirectional links between projects and other items.
 * When you link a note to a project, both the project AND the note are updated
 * to reference each other. This makes it easy to navigate in both directions.
 */

/**
 * linkNote(noteId)
 * ----------------
 * Attach a note to this project.
 * Creates a bidirectional link (project → note and note → project).
 *
 * @param {string} noteId - ID of the note to link
 * @returns {Object} - Updated project
 */
projectSchema.methods.linkNote = async function(noteId) {
  // Only add if not already linked
  if (!this.linkedNoteIds.includes(noteId)) {
    // Add note to project's linked notes
    this.linkedNoteIds.push(noteId);
    await this.save();

    // Also update the note to reference this project
    const Note = mongoose.model('Note');
    await Note.findByIdAndUpdate(noteId, { projectId: this._id });
  }
  return this;
};

/**
 * unlinkNote(noteId)
 * ------------------
 * Remove a note from this project.
 * Removes the bidirectional link.
 *
 * @param {string} noteId - ID of the note to unlink
 * @returns {Object} - Updated project
 */
projectSchema.methods.unlinkNote = async function(noteId) {
  // Remove from project's linked notes
  this.linkedNoteIds = this.linkedNoteIds.filter(
    id => id.toString() !== noteId.toString()
  );
  await this.save();

  // Also remove project reference from the note
  const Note = mongoose.model('Note');
  await Note.findByIdAndUpdate(noteId, { projectId: null });
  return this;
};

/**
 * linkTask(taskId)
 * ----------------
 * Attach a task to this project.
 * Also recalculates project progress since tasks affect it.
 *
 * @param {string} taskId - ID of the task to link
 * @returns {Object} - Updated project
 */
projectSchema.methods.linkTask = async function(taskId) {
  if (!this.linkedTaskIds.includes(taskId)) {
    this.linkedTaskIds.push(taskId);
    await this.calculateProgress(); // Update progress with new task
    await this.save();

    // Also update the task to reference this project
    const Task = mongoose.model('Task');
    await Task.findByIdAndUpdate(taskId, { projectId: this._id });
  }
  return this;
};

/**
 * unlinkTask(taskId)
 * ------------------
 * Remove a task from this project.
 * Also recalculates project progress.
 *
 * @param {string} taskId - ID of the task to unlink
 * @returns {Object} - Updated project
 */
projectSchema.methods.unlinkTask = async function(taskId) {
  this.linkedTaskIds = this.linkedTaskIds.filter(
    id => id.toString() !== taskId.toString()
  );
  await this.calculateProgress(); // Update progress without this task
  await this.save();

  // Also remove project reference from the task
  const Task = mongoose.model('Task');
  await Task.findByIdAndUpdate(taskId, { projectId: null });
  return this;
};

/**
 * linkEvent(eventId)
 * ------------------
 * Attach an event to this project.
 *
 * @param {string} eventId - ID of the event to link
 * @returns {Object} - Updated project
 */
projectSchema.methods.linkEvent = async function(eventId) {
  if (!this.linkedEventIds.includes(eventId)) {
    this.linkedEventIds.push(eventId);
    await this.save();

    // Also update the event to reference this project
    const Event = mongoose.model('Event');
    await Event.findByIdAndUpdate(eventId, { projectId: this._id });
  }
  return this;
};

/**
 * unlinkEvent(eventId)
 * --------------------
 * Remove an event from this project.
 *
 * @param {string} eventId - ID of the event to unlink
 * @returns {Object} - Updated project
 */
projectSchema.methods.unlinkEvent = async function(eventId) {
  this.linkedEventIds = this.linkedEventIds.filter(
    id => id.toString() !== eventId.toString()
  );
  await this.save();

  // Also remove project reference from the event
  const Event = mongoose.model('Event');
  await Event.findByIdAndUpdate(eventId, { projectId: null });
  return this;
};

/**
 * linkFile(fileId)
 * ----------------
 * Attach a file to this project.
 * Uses $addToSet to prevent duplicate links.
 *
 * @param {string} fileId - ID of the file to link
 * @returns {Object} - Updated project
 */
projectSchema.methods.linkFile = async function(fileId) {
  if (!this.linkedFileIds.includes(fileId)) {
    this.linkedFileIds.push(fileId);
    await this.save();

    // Also update the file to reference this project
    // Files can be linked to multiple projects, so we use $addToSet
    const File = mongoose.model('File');
    await File.findByIdAndUpdate(fileId, {
      $addToSet: { linkedProjectIds: this._id } // $addToSet prevents duplicates
    });
  }
  return this;
};

/**
 * unlinkFile(fileId)
 * ------------------
 * Remove a file from this project.
 *
 * @param {string} fileId - ID of the file to unlink
 * @returns {Object} - Updated project
 */
projectSchema.methods.unlinkFile = async function(fileId) {
  this.linkedFileIds = this.linkedFileIds.filter(
    id => id.toString() !== fileId.toString()
  );
  await this.save();

  // Also remove from the file's linked projects
  const File = mongoose.model('File');
  await File.findByIdAndUpdate(fileId, {
    $pull: { linkedProjectIds: this._id } // $pull removes from array
  });
  return this;
};

// =============================================================================
// TAG AGGREGATION
// =============================================================================

/**
 * getUserTags(userId)
 * -------------------
 * Get all unique tags used in a user's projects, with usage counts.
 * Useful for showing a tag cloud or autocomplete suggestions.
 *
 * @param {string} userId - User's ID
 * @returns {Array} - Array of { tag, count } objects sorted by usage
 *
 * EXAMPLE:
 * Returns: [
 *   { tag: 'client-work', count: 15 },
 *   { tag: 'personal', count: 8 },
 *   { tag: 'urgent', count: 3 }
 * ]
 */
projectSchema.statics.getUserTags = async function(userId) {
  // Use MongoDB aggregation pipeline
  const result = await this.aggregate([
    // Match only this user's projects
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    // Unwind tags array (creates one document per tag)
    { $unwind: '$tags' },
    // Group by tag and count occurrences
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    // Sort by count (most used first), then alphabetically
    { $sort: { count: -1, _id: 1 } }
  ]);

  // Transform to friendlier format
  return result.map(r => ({ tag: r._id, count: r.count }));
};

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the Project model from the schema.
 * This gives us methods to:
 * - Create projects: Project.create({ userId, title, outcome })
 * - Find projects: Project.find({ userId }), Project.findById(id)
 * - Update projects: Project.findByIdAndUpdate(id, updates)
 * - Delete projects: Project.findByIdAndDelete(id)
 * - Search projects: Project.searchProjects(userId, options)
 * - Get upcoming: Project.getUpcoming(userId, days)
 * - Get overdue: Project.getOverdue(userId)
 */
const Project = mongoose.model('Project', projectSchema);

export default Project;
