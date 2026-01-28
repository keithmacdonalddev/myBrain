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
// IMPORTS - Loading Dependencies
// =============================================================================
// This section imports the modules and dependencies needed for project operations.
// Each import enables a specific capability of the project service.

/**
 * Project model represents a project document in MongoDB.
 * Contains title, description, outcome, linked items, progress, deadlines.
 * Provides methods for creating projects, calculating progress, and managing project items.
 */
import Project from '../models/Project.js';

/**
 * Note model represents notes in the system.
 * We import this to verify notes exist before linking them to projects.
 * Also used to unlink notes when projects are deleted or modified.
 */
import Note from '../models/Note.js';

/**
 * Task model represents tasks in the system.
 * We import this because tasks are primary drivers of project progress.
 * When tasks linked to a project change status, project progress updates automatically.
 */
import Task from '../models/Task.js';

/**
 * Event model represents calendar events in the system.
 * We import this to link events to projects (milestones, deadlines, planning meetings).
 * Helps users see all calendar items related to a project.
 */
import Event from '../models/Event.js';

/**
 * Tag model tracks user-defined labels for organization.
 * When projects are created or updated with tags, we track tag usage counts.
 * This helps with tag suggestions and shows which tags are commonly used across projects.
 */
import Tag from '../models/Tag.js';

/**
 * Usage tracking service records what users do for analytics and smart suggestions.
 * We track: creates (new projects), views (opened projects), edits (modified projects).
 * This data helps the intelligent dashboard suggest what to work on next.
 */
import { trackCreate, trackView, trackEdit } from './usageService.js';

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

  // Track usage for intelligent dashboard
  trackCreate(userId, 'projects');

  return project;
}

/**
 * getProjects(userId, options)
 * ----------------------------
 * Retrieves projects for a user with comprehensive filtering and sorting.
 *
 * WHAT THIS DOES:
 * Queries projects with support for search, filtering by status/priority/
 * life area/tags, and pagination. Handles complex filter combinations.
 *
 * SEARCH & FILTER CAPABILITIES:
 * - Full-text search: "website redesign"
 * - Status filter: active, on_hold, completed, cancelled
 * - Priority filter: low, medium, high, urgent
 * - Life area filter: Work, Health, Family, etc.
 * - Tag filter: Custom labels on projects
 * - Date sorting: By deadline (asc/desc)
 * - Progress sorting: By completion percentage
 * - Custom sorting: Any field with direction
 *
 * USE CASES:
 * - Dashboard: Get all 'active' projects sorted by deadline
 * - Filter: Show only 'high' priority projects
 * - Search: Find project by name
 * - Life area view: Projects in "Work" life area
 * - Completed: Show finished projects
 *
 * DELEGATES TO MODEL:
 * Project.searchProjects() contains query building logic.
 * Service acts as a clean interface.
 *
 * @param {ObjectId} userId - ID of the user
 * @param {Object} [options={}] - Search/filter/sort options
 *   - options.search: Text to search (optional)
 *   - options.status: 'active' | 'on_hold' | 'completed' | 'cancelled' (optional)
 *   - options.priority: 'low' | 'medium' | 'high' | 'urgent' (optional)
 *   - options.lifeAreaId: Filter by life area (optional)
 *   - options.tags: Array of tags to filter by (optional)
 *   - options.page: Page number (optional)
 *   - options.limit: Items per page (optional)
 *   - options.sortBy: Field to sort by (optional)
 *   - options.sortOrder: 'asc' | 'desc' (optional)
 *
 * @returns {Promise<Array>} Array of Project documents
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Get all active projects sorted by deadline
 * const active = await getProjects(userId, {
 *   status: 'active',
 *   sortBy: 'deadline',
 *   sortOrder: 'asc'
 * });
 *
 * // Get high-priority projects
 * const urgent = await getProjects(userId, {
 *   priority: 'high',
 *   status: 'active'
 * });
 *
 * // Search for a project
 * const results = await getProjects(userId, {
 *   search: 'website redesign'
 * });
 *
 * // Get projects in a life area
 * const workProjects = await getProjects(userId, {
 *   lifeAreaId: workAreaId
 * });
 *
 * // Pagination
 * const page1 = await getProjects(userId, { page: 1, limit: 20 });
 * const page2 = await getProjects(userId, { page: 2, limit: 20 });
 * ```
 */
export async function getProjects(userId, options = {}) {
  // =====================================================
  // DELEGATE TO MODEL'S SEARCH METHOD
  // =====================================================
  // Project.searchProjects() handles:
  // - Text search across title/description
  // - Multi-field filtering
  // - Status/priority/life area matching
  // - Tag filtering
  // - Sorting and pagination
  // - Complex query combinations
  return Project.searchProjects(userId, options);
}

/**
 * getProjectById(userId, projectId, populateLinks)
 * ------------------------------------------------
 * Retrieves a single project with optional linked items.
 *
 * WHAT THIS DOES:
 * Fetches a specific project document. Can optionally enrich it with
 * full details of linked notes, tasks, and events.
 *
 * PERFORMANCE OPTIMIZATION:
 * The populateLinks parameter lets you control data fetching:
 * - populateLinks=false: Returns project only (fast, minimal data)
 * - populateLinks=true: Returns project + linked items (more data, more queries)
 *
 * TWO MODES:
 *
 * MODE 1: populateLinks=false (Default)
 * - Returns project with just IDs of linked items
 * - linkedNoteIds: [id1, id2, id3] (array of IDs only)
 * - linkedTaskIds: [id1, id2] (array of IDs only)
 * - linkedEventIds: [id1] (array of IDs only)
 * - Use for: Lists, summaries, quick views
 * - Performance: Fast (one query)
 *
 * MODE 2: populateLinks=true
 * - Returns project with full linked item objects
 * - linkedNotes: [{ _id, title, body, ... }, ...]
 * - linkedTasks: [{ _id, title, status, ... }, ...]
 * - linkedEvents: [{ _id, title, startDate, ... }, ...]
 * - Use for: Detail views, editing, full context
 * - Performance: Slower (multiple queries in parallel)
 *
 * SECURITY:
 * Requires both projectId AND userId to match for access.
 *
 * @param {ObjectId} userId - ID of the user (for authorization check)
 * @param {ObjectId} projectId - ID of the project to retrieve
 * @param {boolean} [populateLinks=false] - Include full linked item data
 *
 * @returns {Promise<Project|Object|null>} Project document (with or without links), or null if not found
 *
 * @throws {Error} If database queries fail
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Get project for display in list (no linked items)
 * const project = await getProjectById(userId, projectId, false);
 * if (!project) {
 *   return res.status(404).json({ error: 'Project not found' });
 * }
 * // project.linkedNoteIds = [id1, id2, id3]
 * // Can fetch notes separately if needed
 *
 * // Get project for detail view (WITH all linked items)
 * const fullProject = await getProjectById(userId, projectId, true);
 * if (!fullProject) {
 *   return res.status(404).json({ error: 'Project not found' });
 * }
 * // fullProject.linkedNotes = [{ title, body, ... }, ...]
 * // fullProject.linkedTasks = [{ title, status, ... }, ...]
 * // fullProject.linkedEvents = [{ title, startDate, ... }, ...]
 *
 * // Display project with all items
 * <ProjectDetail
 *   title={fullProject.title}
 *   notes={fullProject.linkedNotes}
 *   tasks={fullProject.linkedTasks}
 *   events={fullProject.linkedEvents}
 * />
 * ```
 */
export async function getProjectById(userId, projectId, populateLinks = false) {
  // =====================================================
  // FETCH THE PROJECT
  // =====================================================
  // Find by ID and user ID (authorization)
  // Populate life area name and icon for display
  let project = await Project.findOne({ _id: projectId, userId })
    .populate('lifeAreaId', 'name color icon');

  // Return null if not found or user doesn't own it
  if (!project) return null;

  // =====================================================
  // OPTIONALLY POPULATE LINKED ITEMS
  // =====================================================

  if (populateLinks) {
    // =====================================================
    // FETCH ALL LINKED ITEMS IN PARALLEL
    // =====================================================
    // Project has arrays of linked IDs (linkedNoteIds, linkedTaskIds, etc.)
    // Fetch the actual documents for all three types in parallel
    const [notes, tasks, events] = await Promise.all([
      // Fetch all notes referenced by this project
      Note.find({ _id: { $in: project.linkedNoteIds } }),
      // Fetch all tasks referenced by this project
      Task.find({ _id: { $in: project.linkedTaskIds } }),
      // Fetch all events referenced by this project
      Event.find({ _id: { $in: project.linkedEventIds } })
    ]);

    // =====================================================
    // ENRICH PROJECT WITH LINKED ITEM DATA
    // =====================================================
    // Convert to plain object so we can add/modify properties
    const projectObj = project.toSafeJSON();

    // Replace ID arrays with full item objects
    projectObj.linkedNotes = notes.map(n => n.toSafeJSON());
    projectObj.linkedTasks = tasks.map(t => t.toSafeJSON());
    projectObj.linkedEvents = events.map(e => e.toObject());

    // =====================================================
    // TRACK VIEW FOR INTELLIGENT DASHBOARD
    // =====================================================
    trackView(userId, 'projects');

    return projectObj;
  }

  // =====================================================
  // RETURN PROJECT WITHOUT LINKED ITEMS
  // =====================================================
  // Track view for intelligent dashboard
  trackView(userId, 'projects');

  // Return project as-is (linked item data is just IDs)
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

  // Track edit for intelligent dashboard
  if (project) {
    trackEdit(userId, 'projects');
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
 * WHAT THIS DOES:
 * Updates the project's progress field based on its linked tasks'
 * completion status. Called when task statuses change.
 *
 * PROGRESS FORMULA:
 * If project has linked tasks:
 *   progress = (completedTasks / totalTasks) * 100
 * If project has no linked tasks:
 *   progress = 0
 *
 * WHAT COUNTS AS COMPLETE:
 * - status = 'done' (counts toward numerator)
 * - Only non-archived, non-trashed tasks count in denominator
 *
 * AUTOMATION:
 * In the future, this should be called automatically:
 * - After task status changes (done/cancelled/reopened)
 * - When task added/removed from project
 * - Via message queue or hooks (not yet implemented)
 *
 * CURRENTLY MANUAL:
 * Routes call this after status changes, but ideally it would be
 * automatic through pre/post hooks or event listeners.
 *
 * @param {ObjectId} projectId - ID of the project to recalculate for
 *
 * @returns {Promise<Project|null>} Updated project with new progress, or null if not found
 *
 * @throws {Error} If database operations fail
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // After a task changes status
 * const task = await updateTaskStatus(userId, taskId, 'done');
 *
 * // Recalculate affected project's progress
 * if (task.projectId) {
 *   const updatedProject = await recalculateProgress(task.projectId);
 *   if (updatedProject) {
 *     console.log(`Project progress updated to ${updatedProject.progress}%`);
 *   }
 * }
 * ```
 */
export async function recalculateProgress(projectId) {
  // =====================================================
  // FETCH THE PROJECT
  // =====================================================
  const project = await Project.findById(projectId);

  // Return null if project not found
  if (!project) return null;

  // =====================================================
  // RECALCULATE PROGRESS
  // =====================================================
  // The project's updateProgress() method:
  // 1. Counts all linked tasks
  // 2. Counts completed linked tasks (status='done')
  // 3. Calculates percentage
  // 4. Saves the updated progress to the database
  await project.updateProgress();

  // Return the updated project (with new progress value)
  return project;
}

/**
 * onTaskStatusChange(taskId)
 * --------------------------
 * Updates related project progress when a task's status changes.
 *
 * WHAT THIS DOES:
 * Finds any project containing this task and recalculates its progress.
 * Ensures project progress stays synchronized with task completion.
 *
 * WHEN TO CALL:
 * - After task status changes to 'done' (completed)
 * - After task status changes from 'done' (reopened)
 * - After task is cancelled
 * - After task status changes to/from 'in_progress'
 *
 * WHY THIS IS IMPORTANT:
 * Project progress is calculated from linked task completion.
 * Without this hook, projects become out-of-date when tasks change.
 *
 * EXAMPLE SCENARIO:
 * 1. Project "Website Redesign" has 5 linked tasks (0% progress)
 * 2. User completes first task (marks as 'done')
 * 3. onTaskStatusChange() is called
 * 4. Project progress recalculated: 1/5 = 20%
 * 5. Project now shows as 20% complete
 *
 * HOW IT WORKS:
 * 1. Query for any project containing this task ID
 * 2. If found, call project.updateProgress()
 * 3. Progress is recalculated and saved
 *
 * LIMITATION:
 * Only updates one project. If a task is linked to multiple projects
 * (not currently supported), only the first match would be updated.
 *
 * @param {ObjectId} taskId - ID of the task that changed status
 *
 * @returns {Promise<void>} No return value
 *
 * @throws {Error} If database operations fail (errors are silent for hooks)
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // In task update route
 * const task = await updateTaskStatus(userId, taskId, 'done');
 *
 * // Trigger progress recalculation
 * if (task.projectId) {
 *   await onTaskStatusChange(taskId);
 * }
 *
 * // Project progress is now updated
 * ```
 *
 * FUTURE IMPROVEMENT:
 * Should be called automatically via:
 * - Post-save hook on Task model
 * - Message queue (RabbitMQ, Redis)
 * - Event listener pattern
 * - Instead of manual calls from routes
 */
export async function onTaskStatusChange(taskId) {
  // =====================================================
  // FIND PROJECT CONTAINING THIS TASK
  // =====================================================
  // Query for any project where linkedTaskIds contains this taskId
  const project = await Project.findOne({ linkedTaskIds: taskId });

  // If no project contains this task, nothing to do
  if (!project) {
    return;
  }

  // =====================================================
  // RECALCULATE PROJECT PROGRESS
  // =====================================================
  // Project's updateProgress() method:
  // 1. Fetches all linked task documents
  // 2. Counts completed tasks (status='done')
  // 3. Calculates progress percentage
  // 4. Saves updated progress to database
  await project.updateProgress();
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
/**
 * favoriteProject(projectId, userId)
 * -----------------------------------
 * Marks a project as favorited.
 *
 * @param {ObjectId} projectId - ID of the project
 * @param {ObjectId} userId - ID of the user
 * @returns {Promise<Project|null>} Updated project or null if not found
 */
export async function favoriteProject(projectId, userId) {
  const project = await Project.findOneAndUpdate(
    { _id: projectId, userId },
    { favorited: true },
    { new: true }
  );
  return project;
}

/**
 * unfavoriteProject(projectId, userId)
 * -------------------------------------
 * Removes the favorite flag from a project.
 *
 * @param {ObjectId} projectId - ID of the project
 * @param {ObjectId} userId - ID of the user
 * @returns {Promise<Project|null>} Updated project or null if not found
 */
export async function unfavoriteProject(projectId, userId) {
  const project = await Project.findOneAndUpdate(
    { _id: projectId, userId },
    { favorited: false },
    { new: true }
  );
  return project;
}

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
  deleteComment,
  favoriteProject,
  unfavoriteProject
};
