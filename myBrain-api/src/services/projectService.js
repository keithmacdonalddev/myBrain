/**
 * =============================================================================
 * PROJECTSERVICE.JS - Project Management Business Logic
 * =============================================================================
 *
 * This file handles all project-related operations in myBrain. Projects are
 * containers that group related notes, tasks, and events together to achieve
 * a specific outcome.
 *
 * WHAT IS A PROJECT?
 * ------------------
 * A project is a goal with a defined outcome and usually a deadline. Unlike
 * life areas (which are ongoing), projects have a clear end point. Examples:
 * - "Launch website redesign" (has specific completion criteria)
 * - "Plan vacation to Italy" (ends when trip is planned/completed)
 * - "Learn JavaScript basics" (ends when course is finished)
 *
 * PROJECT VS LIFE AREA:
 * --------------------
 * LIFE AREA (ongoing):     PROJECT (has end):
 * - "Health & Fitness"     - "Run a marathon"
 * - "Career"               - "Get AWS certification"
 * - "Family"               - "Plan birthday party"
 *
 * KEY FEATURES:
 * -------------
 * 1. ITEM LINKING: Connect notes, tasks, and events to projects
 * 2. PROGRESS TRACKING: Automatic progress based on linked task completion
 * 3. STATUS WORKFLOW: active → on_hold → completed (or cancelled)
 * 4. DEADLINES: Track deadlines and get overdue/upcoming alerts
 * 5. COMMENTS: Collaboration through project comments
 * 6. TAGS: Flexible labeling for organization
 *
 * PROGRESS CALCULATION:
 * --------------------
 * Project progress is automatically calculated based on linked tasks:
 * - 0% if no tasks linked
 * - Progress = (completed tasks / total tasks) * 100
 * - Updates automatically when task statuses change
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Project model - represents a project in the database.
 * Contains title, outcome, linked items, progress, and metadata.
 */
import Project from '../models/Project.js';

/**
 * Note model - used to verify notes exist when linking.
 * Also used to unlink notes when a project is deleted.
 */
import Note from '../models/Note.js';

/**
 * Task model - used to verify tasks exist when linking.
 * Tasks affect project progress calculation.
 */
import Task from '../models/Task.js';

/**
 * Event model - used to verify events exist when linking.
 * Events can be calendar items associated with a project.
 */
import Event from '../models/Event.js';

/**
 * Tag model - used to track tag usage when tags are added/removed.
 * Helps with tag suggestions and cleanup.
 */
import Tag from '../models/Tag.js';

// =============================================================================
// PROJECT CRUD OPERATIONS
// =============================================================================

/**
 * createProject(userId, data)
 * ---------------------------
 * Creates a new project for a user.
 *
 * @param {ObjectId} userId - ID of the user creating the project
 * @param {Object} data - Project data
 * @param {string} data.title - Project title (required)
 * @param {string} [data.description] - Detailed description
 * @param {string} [data.outcome] - Desired outcome/success criteria
 * @param {string} [data.status] - Status: 'active', 'on_hold', 'completed', 'cancelled'
 * @param {string} [data.priority] - Priority: 'low', 'medium', 'high', 'urgent'
 * @param {Date} [data.deadline] - Project deadline
 * @param {ObjectId} [data.lifeAreaId] - Associated life area/category
 * @param {string[]} [data.tags] - Array of tag names
 * @param {string} [data.color] - Hex color code for visual distinction
 * @param {boolean} [data.pinned] - Whether project is pinned to top
 *
 * @returns {Promise<Project>} The created project document
 *
 * EXAMPLE:
 * const project = await createProject(userId, {
 *   title: 'Launch Blog',
 *   outcome: 'Blog is live with 10 published posts',
 *   deadline: new Date('2024-06-01'),
 *   priority: 'high',
 *   tags: ['work', 'marketing']
 * });
 *
 * WHAT HAPPENS:
 * 1. Creates new Project document with provided data
 * 2. Sets defaults for missing optional fields
 * 3. Saves to database
 * 4. Tracks tag usage for tag suggestions
 * 5. Returns the created project
 */
export async function createProject(userId, data) {
  // Extract tags (default to empty array if not provided)
  const tags = data.tags || [];

  // Create new project with provided data and sensible defaults
  const project = new Project({
    userId,
    title: data.title,
    description: data.description || '',          // Optional longer description
    outcome: data.outcome || '',                  // What does success look like?
    status: data.status || 'active',              // Most projects start active
    priority: data.priority || 'medium',          // Default to medium priority
    deadline: data.deadline || null,              // Optional deadline
    lifeAreaId: data.lifeAreaId || null,          // Optional category
    tags,                                         // For organization
    color: data.color || null,                    // Visual identifier
    pinned: data.pinned || false                  // Not pinned by default
  });

  // Save the project to the database
  await project.save();

  // Track tag usage for tag suggestions
  // This updates the usageCount on Tag documents
  if (tags.length > 0) {
    await Tag.trackUsage(userId, tags);
  }

  return project;
}

/**
 * getProjects(userId, options)
 * ----------------------------
 * Retrieves projects for a user with search and filter options.
 *
 * @param {ObjectId} userId - ID of the user
 * @param {Object} [options] - Search/filter options
 * @param {string} [options.search] - Search term for title/description
 * @param {string} [options.status] - Filter by status
 * @param {string} [options.priority] - Filter by priority
 * @param {ObjectId} [options.lifeAreaId] - Filter by life area
 * @param {string[]} [options.tags] - Filter by tags
 * @param {number} [options.page] - Page number for pagination
 * @param {number} [options.limit] - Items per page
 * @param {string} [options.sortBy] - Sort field
 * @param {string} [options.sortOrder] - Sort direction: 'asc' or 'desc'
 *
 * @returns {Promise<Project[]>} Array of matching projects
 *
 * EXAMPLE:
 * // Get all active high-priority projects
 * const projects = await getProjects(userId, {
 *   status: 'active',
 *   priority: 'high',
 *   sortBy: 'deadline',
 *   sortOrder: 'asc'
 * });
 */
export async function getProjects(userId, options = {}) {
  // Delegate to the static search method on the Project model
  // This handles complex filtering, sorting, and pagination
  return Project.searchProjects(userId, options);
}

/**
 * getProjectById(userId, projectId, populateLinks)
 * ------------------------------------------------
 * Retrieves a single project by ID with optional linked items.
 *
 * @param {ObjectId} userId - ID of the user (for ownership verification)
 * @param {ObjectId} projectId - ID of the project to retrieve
 * @param {boolean} [populateLinks=false] - Whether to include full linked item data
 *
 * @returns {Promise<Project|Object|null>} Project document, enriched object, or null
 *
 * EXAMPLE:
 * // Get project without linked item details
 * const project = await getProjectById(userId, projectId);
 *
 * // Get project with full linked note/task/event data
 * const projectWithItems = await getProjectById(userId, projectId, true);
 * // projectWithItems.linkedNotes = [{ _id, title, body, ... }, ...]
 * // projectWithItems.linkedTasks = [{ _id, title, status, ... }, ...]
 * // projectWithItems.linkedEvents = [{ _id, title, startDate, ... }, ...]
 *
 * WHEN TO USE populateLinks:
 * - false: For project lists (faster, less data)
 * - true: For project detail view (need all related items)
 */
export async function getProjectById(userId, projectId, populateLinks = false) {
  // Find the project, populating the life area reference
  let project = await Project.findOne({ _id: projectId, userId })
    .populate('lifeAreaId', 'name color icon');

  // Return null if project not found or doesn't belong to user
  if (!project) return null;

  // If we need to populate linked items
  if (populateLinks) {
    // Fetch all linked items in parallel for efficiency
    // These are stored as arrays of IDs in the project document
    const [notes, tasks, events] = await Promise.all([
      Note.find({ _id: { $in: project.linkedNoteIds } }),
      Task.find({ _id: { $in: project.linkedTaskIds } }),
      Event.find({ _id: { $in: project.linkedEventIds } })
    ]);

    // Convert project to a plain object so we can add properties
    const projectObj = project.toSafeJSON();

    // Add the populated linked items
    projectObj.linkedNotes = notes.map(n => n.toSafeJSON());
    projectObj.linkedTasks = tasks.map(t => t.toSafeJSON());
    projectObj.linkedEvents = events.map(e => e.toObject());

    return projectObj;
  }

  // Return the project without populated links
  return project;
}

/**
 * updateProject(userId, projectId, updates)
 * -----------------------------------------
 * Updates a project with new data.
 *
 * @param {ObjectId} userId - ID of the user (for ownership verification)
 * @param {ObjectId} projectId - ID of the project to update
 * @param {Object} updates - Fields to update
 *
 * @returns {Promise<Project|null>} Updated project or null if not found
 *
 * SPECIAL BEHAVIORS:
 * 1. Setting status to 'completed' automatically sets completedAt timestamp
 * 2. Changing status from 'completed' clears completedAt
 * 3. Protected fields (_id, userId, createdAt, progress) cannot be updated
 * 4. Tag changes are tracked for usage statistics
 *
 * EXAMPLE:
 * const updated = await updateProject(userId, projectId, {
 *   title: 'Updated Title',
 *   status: 'completed',
 *   priority: 'low'
 * });
 */
export async function updateProject(userId, projectId, updates) {
  // =====================================================
  // PROTECT IMMUTABLE FIELDS
  // =====================================================
  // These fields should never be changed through updates
  delete updates._id;         // Document ID is immutable
  delete updates.userId;      // Owner cannot change
  delete updates.createdAt;   // Creation time is fixed
  delete updates.progress;    // Progress is calculated automatically

  // =====================================================
  // HANDLE STATUS TRANSITIONS
  // =====================================================
  // When marking as completed, record the completion time
  if (updates.status === 'completed') {
    updates.completedAt = new Date();
  } else if (updates.status && updates.status !== 'completed') {
    // If changing to any non-completed status, clear the completion time
    updates.completedAt = null;
  }

  // =====================================================
  // TRACK TAG CHANGES
  // =====================================================
  // We need the old tags to compare with new tags
  let oldTags = [];
  if (updates.tags) {
    // Get the existing project to compare tags
    const existingProject = await Project.findOne({ _id: projectId, userId });
    if (existingProject) {
      oldTags = existingProject.tags || [];
    }
  }

  // =====================================================
  // PERFORM THE UPDATE
  // =====================================================
  const project = await Project.findOneAndUpdate(
    { _id: projectId, userId },       // Filter: must match ID and owner
    { $set: updates },                // Update: set the new values
    { new: true, runValidators: true } // Options: return updated doc, validate
  ).populate('lifeAreaId', 'name color icon');

  // =====================================================
  // UPDATE TAG USAGE STATISTICS
  // =====================================================
  // Track new tags and decrement usage for removed tags
  if (updates.tags && project) {
    const newTags = updates.tags || [];

    // Find tags that were added (in new but not in old)
    const addedTags = newTags.filter(t => !oldTags.includes(t));

    // Find tags that were removed (in old but not in new)
    const removedTags = oldTags.filter(t => !newTags.includes(t));

    // Update tag usage counts
    if (addedTags.length > 0) {
      await Tag.trackUsage(userId, addedTags);
    }
    if (removedTags.length > 0) {
      await Tag.decrementUsage(userId, removedTags);
    }
  }

  return project;
}

/**
 * updateProjectStatus(userId, projectId, status)
 * ----------------------------------------------
 * Quick method to change just the project status.
 *
 * @param {ObjectId} userId - ID of the user
 * @param {ObjectId} projectId - ID of the project
 * @param {string} status - New status: 'active', 'on_hold', 'completed', 'cancelled'
 *
 * @returns {Promise<Project|null>} Updated project or null
 *
 * WHY A SEPARATE METHOD?
 * This is a common operation (marking complete, putting on hold) that
 * benefits from a simpler, faster code path than full updates.
 *
 * EXAMPLE:
 * // Mark project as completed
 * await updateProjectStatus(userId, projectId, 'completed');
 *
 * // Put project on hold
 * await updateProjectStatus(userId, projectId, 'on_hold');
 */
export async function updateProjectStatus(userId, projectId, status) {
  const updates = { status };

  // Set or clear completedAt based on status
  if (status === 'completed') {
    updates.completedAt = new Date();
  } else {
    updates.completedAt = null;
  }

  // Perform the update
  const project = await Project.findOneAndUpdate(
    { _id: projectId, userId },
    { $set: updates },
    { new: true }
  ).populate('lifeAreaId', 'name color icon');

  return project;
}

/**
 * deleteProject(userId, projectId)
 * --------------------------------
 * Permanently deletes a project and unlinks all associated items.
 *
 * @param {ObjectId} userId - ID of the user
 * @param {ObjectId} projectId - ID of the project to delete
 *
 * @returns {Promise<Project|null>} Deleted project or null if not found
 *
 * IMPORTANT BEHAVIOR:
 * - Linked notes, tasks, and events are NOT deleted
 * - They are only unlinked (projectId set to null)
 * - This preserves user data even when project is deleted
 * - Tag usage counts are decremented
 *
 * EXAMPLE:
 * // Delete a project
 * const deleted = await deleteProject(userId, projectId);
 * if (deleted) {
 *   console.log('Project deleted, items unlinked');
 * }
 */
export async function deleteProject(userId, projectId) {
  // Find the project first to get linked item IDs
  const project = await Project.findOne({ _id: projectId, userId });

  if (!project) return null;

  // =====================================================
  // UNLINK ALL ASSOCIATED ITEMS
  // =====================================================
  // Set projectId to null on all linked items
  // This preserves the items but removes the project association
  await Promise.all([
    // Unlink notes - they remain but lose project reference
    Note.updateMany(
      { _id: { $in: project.linkedNoteIds } },
      { projectId: null }
    ),
    // Unlink tasks - they remain but lose project reference
    Task.updateMany(
      { _id: { $in: project.linkedTaskIds } },
      { projectId: null }
    ),
    // Unlink events - they remain but lose project reference
    Event.updateMany(
      { _id: { $in: project.linkedEventIds } },
      { projectId: null }
    )
  ]);

  // =====================================================
  // UPDATE TAG USAGE
  // =====================================================
  // Decrement usage count for tags that were on this project
  if (project.tags.length > 0) {
    await Tag.decrementUsage(userId, project.tags);
  }

  // =====================================================
  // DELETE THE PROJECT
  // =====================================================
  await Project.findByIdAndDelete(projectId);

  return project;
}

// =============================================================================
// ITEM LINKING OPERATIONS
// =============================================================================

/**
 * linkNote(userId, projectId, noteId)
 * -----------------------------------
 * Links a note to a project for organization.
 *
 * @param {ObjectId} userId - ID of the user
 * @param {ObjectId} projectId - ID of the project
 * @param {ObjectId} noteId - ID of the note to link
 *
 * @returns {Promise<Project|null>} Updated project or null
 *
 * WHAT LINKING DOES:
 * 1. Adds noteId to project's linkedNoteIds array
 * 2. Sets projectId on the note document
 * 3. Note appears in project's detail view
 *
 * EXAMPLE:
 * // Link a research note to a project
 * await linkNote(userId, projectId, noteId);
 */
export async function linkNote(userId, projectId, noteId) {
  // Verify project exists and belongs to user
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) return null;

  // Verify note exists and belongs to user
  const note = await Note.findOne({ _id: noteId, userId });
  if (!note) return null;

  // Link the note (project model handles the bidirectional link)
  await project.linkNote(noteId);
  return project;
}

/**
 * unlinkNote(userId, projectId, noteId)
 * -------------------------------------
 * Removes the link between a note and a project.
 *
 * @param {ObjectId} userId - ID of the user
 * @param {ObjectId} projectId - ID of the project
 * @param {ObjectId} noteId - ID of the note to unlink
 *
 * @returns {Promise<Project|null>} Updated project or null
 *
 * NOTE: The note is NOT deleted, just unlinked from this project.
 */
export async function unlinkNote(userId, projectId, noteId) {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) return null;

  // Remove the link (project model handles both directions)
  await project.unlinkNote(noteId);
  return project;
}

/**
 * linkTask(userId, projectId, taskId)
 * -----------------------------------
 * Links a task to a project. Affects project progress calculation.
 *
 * @param {ObjectId} userId - ID of the user
 * @param {ObjectId} projectId - ID of the project
 * @param {ObjectId} taskId - ID of the task to link
 *
 * @returns {Promise<Project|null>} Updated project or null
 *
 * PROGRESS IMPACT:
 * Linking a task affects the project's progress calculation.
 * If the task is completed, progress might increase.
 * If the task is incomplete, progress might decrease.
 */
export async function linkTask(userId, projectId, taskId) {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) return null;

  const task = await Task.findOne({ _id: taskId, userId });
  if (!task) return null;

  await project.linkTask(taskId);
  return project;
}

/**
 * unlinkTask(userId, projectId, taskId)
 * -------------------------------------
 * Removes the link between a task and a project.
 *
 * @param {ObjectId} userId - ID of the user
 * @param {ObjectId} projectId - ID of the project
 * @param {ObjectId} taskId - ID of the task to unlink
 *
 * @returns {Promise<Project|null>} Updated project or null
 */
export async function unlinkTask(userId, projectId, taskId) {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) return null;

  await project.unlinkTask(taskId);
  return project;
}

/**
 * linkEvent(userId, projectId, eventId)
 * -------------------------------------
 * Links a calendar event to a project.
 *
 * @param {ObjectId} userId - ID of the user
 * @param {ObjectId} projectId - ID of the project
 * @param {ObjectId} eventId - ID of the event to link
 *
 * @returns {Promise<Project|null>} Updated project or null
 *
 * USE CASES:
 * - Link a meeting about the project
 * - Link the project deadline event
 * - Link milestone review events
 */
export async function linkEvent(userId, projectId, eventId) {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) return null;

  const event = await Event.findOne({ _id: eventId, userId });
  if (!event) return null;

  await project.linkEvent(eventId);
  return project;
}

/**
 * unlinkEvent(userId, projectId, eventId)
 * ---------------------------------------
 * Removes the link between an event and a project.
 *
 * @param {ObjectId} userId - ID of the user
 * @param {ObjectId} projectId - ID of the project
 * @param {ObjectId} eventId - ID of the event to unlink
 *
 * @returns {Promise<Project|null>} Updated project or null
 */
export async function unlinkEvent(userId, projectId, eventId) {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) return null;

  await project.unlinkEvent(eventId);
  return project;
}

// =============================================================================
// PROGRESS TRACKING
// =============================================================================

/**
 * recalculateProgress(projectId)
 * ------------------------------
 * Recalculates the progress percentage for a project.
 *
 * @param {ObjectId} projectId - ID of the project
 *
 * @returns {Promise<Project|null>} Updated project or null
 *
 * HOW PROGRESS IS CALCULATED:
 * - Counts all linked tasks
 * - Counts completed linked tasks (status = 'done')
 * - Progress = (completed / total) * 100
 * - If no tasks, progress stays at 0
 *
 * WHEN TO CALL:
 * This is typically called automatically when task statuses change.
 * See onTaskStatusChange() below.
 */
export async function recalculateProgress(projectId) {
  const project = await Project.findById(projectId);
  if (!project) return null;

  // The updateProgress method on the model does the calculation
  await project.updateProgress();
  return project;
}

/**
 * onTaskStatusChange(taskId)
 * --------------------------
 * Called when a task's status changes to update related project progress.
 *
 * @param {ObjectId} taskId - ID of the task that changed
 *
 * WHEN THIS IS CALLED:
 * - Task marked as done
 * - Task marked as todo/in_progress (reopened)
 * - Task cancelled
 *
 * WHY THIS EXISTS:
 * Project progress should automatically reflect task completion.
 * This hook ensures the project stays up-to-date.
 */
export async function onTaskStatusChange(taskId) {
  // Find any project that has this task linked
  const project = await Project.findOne({ linkedTaskIds: taskId });

  if (project) {
    // Recalculate the project's progress based on all linked tasks
    await project.updateProgress();
  }
}

// =============================================================================
// PROJECT QUERIES
// =============================================================================

/**
 * getUpcomingProjects(userId, days)
 * ---------------------------------
 * Gets projects with deadlines within the specified number of days.
 *
 * @param {ObjectId} userId - ID of the user
 * @param {number} [days=7] - Number of days to look ahead
 *
 * @returns {Promise<Project[]>} Projects with upcoming deadlines
 *
 * EXAMPLE:
 * // Get projects due in the next 7 days
 * const upcoming = await getUpcomingProjects(userId);
 *
 * // Get projects due in the next 30 days
 * const monthAhead = await getUpcomingProjects(userId, 30);
 */
export async function getUpcomingProjects(userId, days = 7) {
  return Project.getUpcoming(userId, days);
}

/**
 * getOverdueProjects(userId)
 * --------------------------
 * Gets all projects that are past their deadline but not completed.
 *
 * @param {ObjectId} userId - ID of the user
 *
 * @returns {Promise<Project[]>} Overdue projects
 *
 * DEFINITION OF OVERDUE:
 * - deadline < today
 * - status is NOT 'completed' or 'cancelled'
 */
export async function getOverdueProjects(userId) {
  return Project.getOverdue(userId);
}

/**
 * getUserProjectTags(userId)
 * --------------------------
 * Gets all unique tags used across a user's projects.
 *
 * @param {ObjectId} userId - ID of the user
 *
 * @returns {Promise<string[]>} Array of unique tag names
 *
 * USE CASES:
 * - Tag autocomplete suggestions
 * - Filter dropdown options
 * - Tag cloud display
 */
export async function getUserProjectTags(userId) {
  return Project.getUserTags(userId);
}

// =============================================================================
// PROJECT COMMENTS
// =============================================================================

/**
 * addComment(userId, projectId, text)
 * -----------------------------------
 * Adds a comment to a project.
 *
 * @param {ObjectId} userId - ID of the user adding the comment
 * @param {ObjectId} projectId - ID of the project
 * @param {string} text - Comment text
 *
 * @returns {Promise<Project|null>} Updated project or null
 *
 * USE CASES:
 * - Progress updates
 * - Status notes
 * - Team communication (if collaboration is added)
 *
 * EXAMPLE:
 * await addComment(userId, projectId, 'Design phase completed, moving to development');
 */
export async function addComment(userId, projectId, text) {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) return null;

  // Add the comment to the comments array
  // Comment includes userId and text, timestamp is auto-set
  project.comments.push({
    userId,
    text
  });

  await project.save();
  return project;
}

/**
 * updateComment(userId, projectId, commentId, text)
 * -------------------------------------------------
 * Updates an existing comment. Only the comment owner can update.
 *
 * @param {ObjectId} userId - ID of the user attempting to update
 * @param {ObjectId} projectId - ID of the project
 * @param {ObjectId} commentId - ID of the comment to update
 * @param {string} text - New comment text
 *
 * @returns {Promise<Project|{error: string}|null>} Updated project, error object, or null
 *
 * POSSIBLE ERRORS:
 * - { error: 'COMMENT_NOT_FOUND' } - Comment doesn't exist
 * - { error: 'NOT_AUTHORIZED' } - User doesn't own the comment
 * - null - Project not found
 */
export async function updateComment(userId, projectId, commentId, text) {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) return null;

  // Find the specific comment in the comments array
  const comment = project.comments.id(commentId);
  if (!comment) return { error: 'COMMENT_NOT_FOUND' };

  // Verify the user owns this comment
  // Only the comment author can edit their comment
  if (comment.userId.toString() !== userId.toString()) {
    return { error: 'NOT_AUTHORIZED' };
  }

  // Update the comment text
  comment.text = text;
  await project.save();
  return project;
}

/**
 * deleteComment(userId, projectId, commentId)
 * -------------------------------------------
 * Deletes a comment from a project. Only the comment owner can delete.
 *
 * @param {ObjectId} userId - ID of the user attempting to delete
 * @param {ObjectId} projectId - ID of the project
 * @param {ObjectId} commentId - ID of the comment to delete
 *
 * @returns {Promise<Project|{error: string}|null>} Updated project, error object, or null
 *
 * POSSIBLE ERRORS:
 * - { error: 'COMMENT_NOT_FOUND' } - Comment doesn't exist
 * - { error: 'NOT_AUTHORIZED' } - User doesn't own the comment
 * - null - Project not found
 */
export async function deleteComment(userId, projectId, commentId) {
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) return null;

  // Find the specific comment
  const comment = project.comments.id(commentId);
  if (!comment) return { error: 'COMMENT_NOT_FOUND' };

  // Verify ownership
  if (comment.userId.toString() !== userId.toString()) {
    return { error: 'NOT_AUTHORIZED' };
  }

  // Remove the comment using Mongoose's pull method
  project.comments.pull(commentId);
  await project.save();
  return project;
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all project service functions as a default object.
 *
 * USAGE:
 * import projectService from './services/projectService.js';
 *
 * // Create a project
 * const project = await projectService.createProject(userId, data);
 *
 * // Get projects with filtering
 * const projects = await projectService.getProjects(userId, { status: 'active' });
 *
 * // Link items to projects
 * await projectService.linkNote(userId, projectId, noteId);
 * await projectService.linkTask(userId, projectId, taskId);
 *
 * // Add comments
 * await projectService.addComment(userId, projectId, 'Great progress today!');
 */
export default {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  updateProjectStatus,
  deleteProject,
  linkNote,
  unlinkNote,
  linkTask,
  unlinkTask,
  linkEvent,
  unlinkEvent,
  recalculateProgress,
  getUpcomingProjects,
  getOverdueProjects,
  getUserProjectTags,
  onTaskStatusChange,
  addComment,
  updateComment,
  deleteComment
};
