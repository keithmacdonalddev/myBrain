/**
 * =============================================================================
 * TASKS.JS - Tasks CRUD Routes
 * =============================================================================
 *
 * This file handles all task management in myBrain.
 * Tasks are actionable items with due dates, priorities, and progress tracking.
 * They're the primary way users get things done.
 *
 * WHAT ARE TASKS?
 * ---------------
 * Tasks are actionable items representing work to be done:
 * - "Write report" (by Friday)
 * - "Call dentist" (this week)
 * - "Buy groceries" (today)
 * - "Review code" (high priority)
 * - "Plan vacation" (this month)
 *
 * TASK PROPERTIES:
 * ----------------
 * - TITLE: What the task is
 * - DESCRIPTION: Additional details
 * - STATUS: todo, in-progress, completed, blocked, cancelled
 * - PRIORITY: Critical, high, medium, low
 * - DUE DATE: When it's due (optional)
 * - REMINDER: Notification time before due date
 * - PROJECT: Can be linked to a project
 * - SUBTASKS: Break task into smaller pieces
 * - TAGS: For organization and filtering
 * - CHECKLIST: Items within task to check off
 *
 * TASK LIFECYCLE:
 * ----------------
 * 1. CREATED: User creates new task
 * 2. TODO: Waiting to be started
 * 3. IN_PROGRESS: Currently working on it
 * 4. COMPLETED: Done! ✓
 *    OR
 * 3. BLOCKED: Waiting for something
 * 4. CANCELLED: Not doing it
 *
 * FILTERING & SORTING:
 * --------------------
 * Tasks can be filtered by:
 * - STATUS: Show todo, in-progress, done, blocked
 * - PRIORITY: Critical, high, medium, low
 * - LIFE AREA: Work, personal, health, etc.
 * - PROJECT: Tasks in specific project
 * - DUE DATE: Due today, this week, overdue
 * - TAGS: Find by tag
 * - TEXT SEARCH: Find in title/description
 *
 * VIEWS:
 * ------
 * - LIST: Simple task list with filters
 * - KANBAN: Cards organized by status
 * - CALENDAR: Tasks by due date
 * - PRIORITY: Sorted by importance
 * - TODAY: Today's view showing priority tasks
 * - UPCOMING: What's coming up
 *
 * SPECIAL FEATURES:
 * -----------------
 * - RECURRING: Task repeats (daily, weekly, monthly)
 * - SUBTASKS: Break into smaller tasks
 * - CHECKLISTS: Checklist items within task
 * - DEPENDENCIES: Task A must finish before B
 * - TIME TRACKING: Track hours spent
 *
 * REMINDERS:
 * -----------
 * Notifications before due date:
 * - 1 day before
 * - 1 hour before
 * - At time of due date
 * - Custom notification times
 *
 * ENDPOINTS:
 * -----------
 * - GET /tasks - Get tasks (with filters)
 * - POST /tasks - Create new task
 * - GET /tasks/:id - Get task details
 * - PUT /tasks/:id - Update task
 * - DELETE /tasks/:id - Delete task
 * - POST /tasks/:id/complete - Mark complete
 * - POST /tasks/:id/uncomplete - Mark incomplete
 * - POST /tasks/:id/duplicate - Copy task
 * - POST /tasks/:id/snooze - Snooze task
 * - GET /tasks/today - Get today's view
 * - GET /tasks/overdue - Get overdue tasks
 *
 * STORAGE LIMITS:
 * ----------------
 * Free users: 5,000 tasks
 * Premium users: 50,000 tasks
 *
 * =============================================================================
 */

/**
 * Express is the web framework that handles HTTP requests and routing.
 * We use it to define API endpoints (URLs that the frontend can call).
 * Each router.get/post/patch/delete defines a different task operation.
 */
import express from 'express';

/**
 * Mongoose is our MongoDB ODM (Object Document Mapper).
 * It lets us work with MongoDB documents as JavaScript objects
 * and provides validation, hooks, and query building.
 * We use it here to validate IDs (ObjectId.isValid) before database queries.
 */
import mongoose from 'mongoose';

/**
 * Auth middleware checks that the user is logged in.
 * Every task request must include a valid JWT token in the Authorization header.
 * If not, the request is rejected with a 401 Unauthorized response.
 */
import { requireAuth } from '../middleware/auth.js';

/**
 * Error handler middleware captures unexpected errors and logs them.
 * This helps us debug issues by recording what went wrong and the context.
 * We call attachError(req, error, {operation: '...'}) to log errors.
 */
import { attachError } from '../middleware/errorHandler.js';

/**
 * Request logger middleware tracks entity IDs and event names for analytics.
 * When we attach an entity ID, it lets us search logs for a specific task.
 * Example: attachEntityId(req, 'taskId', task._id) so admins can audit actions.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

/**
 * Limit middleware enforces storage quotas.
 * Free users: 5,000 tasks max
 * Premium users: 50,000 tasks max
 * When limit is reached, POST requests are rejected with 402 Payment Required.
 */
import { requireLimit } from '../middleware/limitEnforcement.js';

/**
 * Task service contains all the business logic for task operations.
 * Instead of writing database queries in this file, we call service methods.
 * This keeps routes clean and makes it easy to reuse logic in different places.
 *
 * Example: taskService.getTasks(userId, options) handles:
 * - Building the MongoDB query with filters
 * - Querying the database
 * - Returning results to the route
 */
import taskService from '../services/taskService.js';

// =============================================================================
// ROUTER SETUP
// =============================================================================
// Create an Express router to group all task-related endpoints together
const router = express.Router();

// =============================================================================
// MIDDLEWARE: AUTHENTICATION
// =============================================================================
// All task routes require the user to be logged in.
// requireAuth middleware checks that the Authorization header contains a valid JWT token.
// If missing or invalid, the request is rejected before reaching any route handler.
// This prevents unauthorized access to user tasks.
router.use(requireAuth);

/**
 * GET /tasks
 * Get tasks with search and filtering
 *
 * WHAT IT DOES:
 * Returns the user's tasks with support for powerful filtering and searching.
 * This is the primary endpoint for task views (list, kanban, calendar all use this).
 *
 * USE CASES:
 * - Frontend task list showing all tasks
 * - Kanban board fetching tasks by status
 * - Due date view showing tasks due next week
 * - Searching for tasks by text
 * - Dashboard showing high-priority tasks
 *
 * QUERY PARAMETERS:
 * - q: Text search in title/description
 * - status: Filter by status (todo, in_progress, done, cancelled) - comma-separated
 * - priority: Filter by priority (critical, high, medium, low)
 * - tags: Filter by tags (comma-separated)
 * - hasDueDate: true/false to show only tasks with/without due dates
 * - dueBefore: ISO date string - show tasks due before this date
 * - dueAfter: ISO date string - show tasks due after this date
 * - lifeAreaId: ObjectId - filter by life area (work, personal, health, etc.)
 * - projectId: ObjectId - filter tasks in a specific project
 * - sort: Field to sort by (default: -createdAt, newest first)
 * - limit: How many tasks to return (max 100, default 50)
 * - skip: How many tasks to skip (for pagination)
 *
 * EXAMPLE REQUEST:
 * GET /tasks?status=todo,in_progress&priority=critical&lifeAreaId=507f1f77bcf86cd799439011&limit=25&skip=0
 * (Get 25 critical tasks that are todo or in progress, starting from the first)
 *
 * EXAMPLE RESPONSE:
 * {
 *   tasks: [
 *     { id: "...", title: "Write report", status: "in_progress", priority: "high", dueDate: "2025-02-15" },
 *     { id: "...", title: "Call dentist", status: "todo", priority: "medium", dueDate: "2025-02-17" }
 *   ],
 *   total: 47,
 *   limit: 25,
 *   skip: 0
 * }
 */
router.get('/', async (req, res) => {
  try {
    // Step 1: Extract and provide defaults for all query parameters
    // Default behavior: no filters (show all), newest first, 50 tasks per page
    const {
      q = '',                    // Text search
      status,                    // Status filter(s)
      priority,                  // Priority filter
      tags = '',                 // Tag filter(s)
      hasDueDate,                // Has due date filter
      dueBefore,                 // Due date range start
      dueAfter,                  // Due date range end
      lifeAreaId,                // Life area filter
      projectId,                 // Project filter
      sort = '-createdAt',       // Sort field (- = descending)
      sortBy,                    // Alternative sort: dueDate, priority, title, createdAt
      groupBy,                   // Group tasks by: status, priority, or project
      limit = 50,                // Results per page
      skip = 0                   // Pagination offset
    } = req.query;

    // Step 2: Validate and normalize query parameters
    // Convert string values to proper types and validate ObjectIds
    const options = {
      q,
      // Handle both single status (status=todo) and multiple (status=todo,in_progress)
      status: status ? (status.includes(',') ? status.split(',') : status) : null,
      // Keep priority as-is (string value)
      priority: priority || null,
      // Split tags string into array and remove empty values
      tags: tags ? tags.split(',').filter(Boolean) : [],
      // Convert string boolean to actual boolean for hasDueDate filter
      hasDueDate: hasDueDate === 'true' ? true : hasDueDate === 'false' ? false : null,
      // Keep date strings as-is (service will parse them)
      dueBefore: dueBefore || null,
      dueAfter: dueAfter || null,
      // Validate life area ID is a valid MongoDB ObjectId before using
      lifeAreaId: lifeAreaId && mongoose.Types.ObjectId.isValid(lifeAreaId) ? lifeAreaId : null,
      // Validate project ID is a valid MongoDB ObjectId before using
      projectId: projectId && mongoose.Types.ObjectId.isValid(projectId) ? projectId : null,
      // If sortBy is provided, map it to a sort string; otherwise use the raw sort param
      sort: (() => {
        if (sortBy) {
          const sortMap = {
            dueDate: 'dueDate',
            priority: '-priority',
            title: 'title',
            createdAt: '-createdAt',
          };
          return sortMap[sortBy] || sort;
        }
        return sort;
      })(),
      // Cap limit at 100 to prevent loading huge datasets
      limit: Math.min(parseInt(limit) || 50, 100),
      // Parse skip as integer for pagination
      skip: parseInt(skip) || 0
    };

    // Step 3: Call task service to build MongoDB query and fetch results
    // Service handles all the database query logic and filtering complexity
    const { tasks, total } = await taskService.getTasks(req.user._id, options);

    // Step 4: Transform tasks to safe format (removes sensitive fields)
    const safeTasks = tasks.map(t => t.toSafeJSON());

    // Step 5: Build response with optional grouping
    const response = {
      tasks: safeTasks,
      total,
      limit: options.limit,
      skip: options.skip
    };

    // If groupBy is requested, organize tasks into groups by the specified field
    if (groupBy && ['status', 'priority', 'project'].includes(groupBy)) {
      const grouped = {};
      safeTasks.forEach(task => {
        const key = groupBy === 'project'
          ? (task.projectId?.toString() || 'none')
          : (task[groupBy] || 'none');
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(task);
      });
      response.grouped = grouped;
    }

    res.json(response);
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'tasks_fetch' });
    res.status(500).json({
      error: 'Failed to fetch tasks',
      code: 'TASKS_FETCH_ERROR'
    });
  }
});

/**
 * GET /tasks/today
 * Get tasks for today view (special dashboard view)
 *
 * WHAT IT DOES:
 * Returns a curated set of data for the "Today" view showing:
 * - Overdue tasks (were due yesterday or earlier)
 * - Tasks due today
 * - High-priority tasks
 * - Tasks in progress
 *
 * USE CASES:
 * - Dashboard "Today" widget showing urgent work
 * - Planning daily priorities each morning
 * - Quick glance at what's due today
 *
 * EXAMPLE RESPONSE:
 * {
 *   overdue: [
 *     { title: "Write report", dueDate: "2025-02-13" }
 *   ],
 *   dueToday: [
 *     { title: "Call dentist", dueDate: "2025-02-15" }
 *   ],
 *   inProgress: [
 *     { title: "Review code", status: "in_progress" }
 *   ],
 *   highPriority: [
 *     { title: "Fix bug", priority: "critical" }
 *   ]
 * }
 */
router.get('/today', async (req, res) => {
  try {
    // Step 1: Call service to fetch today view data
    // Service handles date calculations (what's "today", what's "overdue")
    const todayData = await taskService.getTodayView(req.user._id);

    // Step 2: Return the curated data
    res.json(todayData);
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'today_view_fetch' });
    res.status(500).json({
      error: 'Failed to fetch today view',
      code: 'TODAY_VIEW_ERROR'
    });
  }
});

/**
 * GET /tasks/tags
 * Get all unique tags used in user's tasks
 *
 * WHAT IT DOES:
 * Returns a list of all unique tags across all of the user's tasks.
 * This is used to populate tag filters and autocomplete in the UI.
 *
 * USE CASES:
 * - Tag filter dropdown showing what tags exist
 * - Autocomplete when typing tags in task creation
 * - Suggest existing tags to user
 *
 * EXAMPLE RESPONSE:
 * {
 *   tags: [
 *     "urgent",
 *     "work",
 *     "health",
 *     "home",
 *     "project-x"
 *   ]
 * }
 */
router.get('/tags', async (req, res) => {
  try {
    // Step 1: Call service to get unique tags from all user's tasks
    // Service uses MongoDB aggregation to get distinct tag values
    const tags = await taskService.getUserTaskTags(req.user._id);

    // Step 2: Return the list of tags
    res.json({ tags });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'task_tags_fetch' });
    res.status(500).json({
      error: 'Failed to fetch tags',
      code: 'TAGS_FETCH_ERROR'
    });
  }
});

/**
 * POST /tasks
 * Create a new task
 *
 * WHAT IT DOES:
 * Creates a new task with title, description, due date, priority, tags, and links.
 * Includes validation and enforces storage limits (5,000 tasks for free users).
 *
 * STORAGE LIMITS:
 * Free users: 5,000 tasks max (402 if exceeded)
 * Premium users: 50,000 tasks max
 *
 * REQUEST BODY:
 * {
 *   title: "Write report" (required),
 *   body: "Quarterly report...",
 *   status: "todo",
 *   priority: "high",
 *   dueDate: "2025-02-20",
 *   tags: ["work", "urgent"],
 *   lifeAreaId: "507f1f77bcf86cd799439011",
 *   projectId: "507f1f77bcf86cd799439012",
 *   linkedNoteIds: ["507f1f77bcf86cd799439013"],
 *   sourceNoteId: "507f1f77bcf86cd799439014"
 * }
 *
 * EXAMPLE RESPONSE (201 Created):
 * {
 *   message: "Task created successfully",
 *   task: { id: "...", title: "Write report", status: "todo", ... }
 * }
 */
router.post('/', requireLimit('tasks'), async (req, res) => {
  try {
    // Step 1: Extract request body fields
    // All fields are optional except title
    const { title, body, status, priority, dueDate, tags, linkedNoteIds, sourceNoteId, lifeAreaId, projectId } = req.body;

    // Step 2: Validate required fields
    // Title is the only required field - can't create taskless tasks
    if (!title || !title.trim()) {
      return res.status(400).json({
        error: 'Task title is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Step 3: Call task service to create the task
    // Service handles:
    // - Creating task document in MongoDB
    // - Validating dates and priorities
    // - Linking to notes/projects
    // - Storing tags
    const task = await taskService.createTask(req.user._id, {
      title,
      body,
      status,
      priority,
      dueDate,
      tags,
      linkedNoteIds,
      sourceNoteId,
      lifeAreaId,
      projectId
    });

    // Step 4: Log the successful creation for audit trail
    // Store task ID so admins can search logs for this task
    attachEntityId(req, 'taskId', task._id);
    // Mark this event as successful in analytics
    req.eventName = 'task.create.success';

    // Step 5: Return 201 Created with the new task
    res.status(201).json({
      message: 'Task created successfully',
      task: task.toSafeJSON()  // Safe format removes internal fields
    });
  } catch (error) {
    // Log the error for debugging
    attachError(req, error, { operation: 'task_create' });

    // Handle MongoDB validation errors (invalid schema)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    // Other unexpected errors
    res.status(500).json({
      error: 'Failed to create task',
      code: 'TASK_CREATE_ERROR'
    });
  }
});

/**
 * GET /tasks/:id
 * Get task details by ID
 *
 * WHAT IT DOES:
 * Fetches a single task's complete details including description, status, due date, etc.
 * Includes ownership check - users can only see their own tasks.
 *
 * PATH PARAMETERS:
 * - id: Task ID (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * GET /tasks/507f1f77bcf86cd799439011
 *
 * EXAMPLE RESPONSE:
 * {
 *   task: {
 *     id: "507f1f77bcf86cd799439011",
 *     title: "Write report",
 *     body: "Quarterly report for stakeholders",
 *     status: "in_progress",
 *     priority: "high",
 *     dueDate: "2025-02-20",
 *     tags: ["work", "urgent"],
 *     createdAt: "2025-02-01T10:00:00Z"
 *   }
 * }
 */
router.get('/:id', async (req, res) => {
  try {
    // Step 1: Extract task ID from URL
    const { id } = req.params;

    // Step 2: Validate that the ID is a valid MongoDB ObjectId
    // Prevents malformed requests before querying database
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Call service to fetch task
    // Service checks ownership - ensures user can only see their own tasks
    const task = await taskService.getTaskById(req.user._id, id);

    // Step 4: Check if task exists
    // Returns 404 if not found (either doesn't exist or user doesn't own it)
    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    // Step 5: Return task details
    res.json({ task: task.toSafeJSON() });  // Safe format removes internal fields
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'task_fetch', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to fetch task',
      code: 'TASK_FETCH_ERROR'
    });
  }
});

/**
 * PATCH /tasks/:id
 * Update task fields
 *
 * WHAT IT DOES:
 * Updates one or more fields on a task (title, description, due date, etc.).
 * Can update multiple fields in a single request.
 * Includes ownership check - users can only update their own tasks.
 *
 * PATH PARAMETERS:
 * - id: Task ID (MongoDB ObjectId)
 *
 * REQUEST BODY (all optional):
 * {
 *   title: "Updated title",
 *   body: "Updated description",
 *   status: "in_progress",
 *   priority: "high",
 *   dueDate: "2025-02-25",
 *   tags: ["work", "revised"]
 * }
 *
 * EXAMPLE REQUEST:
 * PATCH /tasks/507f1f77bcf86cd799439011
 * { "status": "in_progress", "priority": "critical" }
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Task updated successfully",
 *   task: { id: "...", title: "Write report", status: "in_progress", priority: "critical", ... }
 * }
 */
router.patch('/:id', async (req, res) => {
  try {
    // Step 1: Extract task ID from URL
    const { id } = req.params;

    // Step 2: Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Extract updates from request body
    // PATCH means partial update - only changed fields are sent
    const updates = req.body;

    // Step 4: Call service to update the task
    // Service handles:
    // - Checking ownership (user can only update their own tasks)
    // - Validating new values
    // - Saving to MongoDB
    const task = await taskService.updateTask(req.user._id, id, updates);

    // Step 5: Check if task exists (or if user owns it)
    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    // Step 6: Log the successful update for audit trail
    attachEntityId(req, 'taskId', task._id);
    req.eventName = 'task.update.success';

    // Step 7: Return updated task
    res.json({
      message: 'Task updated successfully',
      task: task.toSafeJSON()
    });
  } catch (error) {
    // Log the error for debugging
    attachError(req, error, { operation: 'task_update', taskId: req.params.id });

    // Handle MongoDB validation errors (invalid field values)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    // Other unexpected errors
    res.status(500).json({
      error: 'Failed to update task',
      code: 'TASK_UPDATE_ERROR'
    });
  }
});

/**
 * POST /tasks/:id/status
 * Quick status change (todo → in_progress → done)
 *
 * WHAT IT DOES:
 * Changes task status with a single request. Simpler than PATCH /tasks/:id
 * because it only allows specific status values.
 *
 * VALID STATUSES:
 * - todo: Not yet started
 * - in_progress: Currently being worked on
 * - done: Complete! ✓
 * - cancelled: Not doing this
 *
 * REQUEST BODY:
 * { "status": "done" }
 *
 * EXAMPLE REQUEST:
 * POST /tasks/507f1f77bcf86cd799439011/status
 * { "status": "in_progress" }
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Task status updated",
 *   task: { id: "...", title: "Write report", status: "in_progress", ... }
 * }
 *
 * WHY THIS ENDPOINT?
 * Status changes are very common (mark done, start task, cancel task).
 * Having a dedicated endpoint makes it faster and prevents accidental updates to other fields.
 */
router.post('/:id/status', async (req, res) => {
  try {
    // Step 1: Extract task ID and new status
    const { id } = req.params;
    const { status } = req.body;

    // Step 2: Validate task ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Validate status is one of the allowed values
    // Prevents invalid statuses from being set
    if (!['todo', 'in_progress', 'done', 'cancelled'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        code: 'INVALID_STATUS'
      });
    }

    // Step 4: Call service to update the status
    // Service checks ownership and updates task
    const task = await taskService.updateTaskStatus(req.user._id, id, status);

    // Step 5: Check if task exists (or if user owns it)
    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    // Step 6: Log the status change for audit trail
    attachEntityId(req, 'taskId', task._id);
    // Use specific event name based on what status change occurred
    // This lets analytics track completion rates, reopens, etc.
    if (status === 'done') {
      req.eventName = 'task.complete.success';  // Task completion - important metric
    } else if (status === 'todo') {
      req.eventName = 'task.reopen.success';    // Task reopened - metrics on rework
    } else {
      req.eventName = 'task.status.success';    // Generic status change
    }

    // Step 7: Return updated task
    res.json({
      message: 'Task status updated',
      task: task.toSafeJSON()
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'task_status_update', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to update task status',
      code: 'STATUS_UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /tasks/:id
 * Delete a task permanently
 *
 * WHAT IT DOES:
 * Permanently removes a task from the database.
 * This is permanent - the task cannot be recovered after deletion.
 * Includes ownership check - users can only delete their own tasks.
 *
 * PATH PARAMETERS:
 * - id: Task ID (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * DELETE /tasks/507f1f77bcf86cd799439011
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Task deleted successfully"
 * }
 *
 * WARNING:
 * This is permanent deletion. There is no trash/recovery.
 * Consider moving to trash (POST /:id/trash) first if you want recovery ability.
 */
router.delete('/:id', async (req, res) => {
  try {
    // Step 1: Extract task ID from URL
    const { id } = req.params;

    // Step 2: Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Log taskId before deletion for audit trail
    // Important: Attach before deletion because we won't have the task object after
    attachEntityId(req, 'taskId', id);

    // Step 4: Call service to delete the task
    // Service checks ownership - user can only delete their own tasks
    const task = await taskService.deleteTask(req.user._id, id);

    // Step 5: Check if task was deleted
    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    // Step 6: Log the successful deletion
    req.eventName = 'task.delete.success';

    // Step 7: Return success message (no task data since it's deleted)
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'task_delete', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to delete task',
      code: 'TASK_DELETE_ERROR'
    });
  }
});

/**
 * POST /tasks/:id/link-note
 * Link a note to a task (create relationship)
 *
 * WHAT IT DOES:
 * Creates a link between a task and a note. This establishes a relationship
 * so the note is shown on the task's detail page.
 *
 * USE CASES:
 * - Attach research notes to a task
 * - Link decision notes to a task
 * - Group related notes and tasks
 *
 * PATH PARAMETERS:
 * - id: Task ID (MongoDB ObjectId)
 *
 * REQUEST BODY:
 * { "noteId": "507f1f77bcf86cd799439011" }
 *
 * EXAMPLE REQUEST:
 * POST /tasks/507f1f77bcf86cd799439011/link-note
 * { "noteId": "507f1f77bcf86cd799439012" }
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Note linked successfully",
 *   task: { id: "...", title: "Write report", linkedNotes: [...], ... }
 * }
 */
router.post('/:id/link-note', async (req, res) => {
  try {
    // Step 1: Extract task ID and note ID
    const { id } = req.params;
    const { noteId } = req.body;

    // Step 2: Validate both IDs are valid MongoDB ObjectIds
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(noteId)) {
      return res.status(400).json({
        error: 'Invalid ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Call service to create the link
    // Service handles:
    // - Checking ownership of both task and note
    // - Creating the relationship
    // - Preventing duplicate links
    const task = await taskService.linkNote(req.user._id, id, noteId);

    // Step 4: Check if link was created
    // Returns null if task/note not found or user doesn't own them
    if (!task) {
      return res.status(404).json({
        error: 'Task or note not found',
        code: 'NOT_FOUND'
      });
    }

    // Step 5: Log the successful link for audit trail
    attachEntityId(req, 'taskId', task._id);
    req.eventName = 'task.link_note.success';

    // Step 6: Return updated task with linked note
    res.json({
      message: 'Note linked successfully',
      task: task.toSafeJSON()
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'task_link_note', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to link note',
      code: 'LINK_ERROR'
    });
  }
});

/**
 * DELETE /tasks/:id/link-note/:noteId
 * Remove a note link from a task
 *
 * WHAT IT DOES:
 * Removes the link between a task and a note.
 * The note and task still exist - only the relationship is removed.
 *
 * PATH PARAMETERS:
 * - id: Task ID (MongoDB ObjectId)
 * - noteId: Note ID to unlink (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * DELETE /tasks/507f1f77bcf86cd799439011/link-note/507f1f77bcf86cd799439012
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Note unlinked successfully",
 *   task: { id: "...", title: "Write report", linkedNotes: [], ... }
 * }
 */
router.delete('/:id/link-note/:noteId', async (req, res) => {
  try {
    // Step 1: Extract task ID and note ID from URL
    const { id, noteId } = req.params;

    // Step 2: Validate both IDs are valid MongoDB ObjectIds
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(noteId)) {
      return res.status(400).json({
        error: 'Invalid ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Call service to remove the link
    // Service handles:
    // - Checking ownership of the task
    // - Removing the relationship
    const task = await taskService.unlinkNote(req.user._id, id, noteId);

    // Step 4: Check if unlink was successful
    // Returns null if task not found or user doesn't own it
    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    // Step 5: Log the successful unlink for audit trail
    attachEntityId(req, 'taskId', task._id);
    req.eventName = 'task.unlink_note.success';

    // Step 6: Return updated task
    res.json({
      message: 'Note unlinked successfully',
      task: task.toSafeJSON()
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'task_unlink_note', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to unlink note',
      code: 'UNLINK_ERROR'
    });
  }
});

/**
 * GET /tasks/:id/backlinks
 * Get items that link to this task
 *
 * WHAT IT DOES:
 * Returns all notes, projects, and other items that link to this task.
 * Useful for understanding task relationships and dependencies.
 *
 * USE CASES:
 * - See which notes mention this task
 * - See which projects have this task
 * - Find all references to a task
 *
 * PATH PARAMETERS:
 * - id: Task ID (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * GET /tasks/507f1f77bcf86cd799439011/backlinks
 *
 * EXAMPLE RESPONSE:
 * {
 *   backlinks: [
 *     { type: "note", id: "...", title: "Meeting notes" },
 *     { type: "project", id: "...", title: "Q1 Goals" }
 *   ]
 * }
 */
router.get('/:id/backlinks', async (req, res) => {
  try {
    // Step 1: Extract task ID from URL
    const { id } = req.params;

    // Step 2: Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Call service to find all backlinks
    // Service queries for:
    // - Notes that link to this task
    // - Projects that link to this task
    // - Comments mentioning this task
    const backlinks = await taskService.getTaskBacklinks(req.user._id, id);

    // Step 4: Return backlinks
    res.json({ backlinks });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'task_backlinks', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to fetch backlinks',
      code: 'BACKLINKS_ERROR'
    });
  }
});

/**
 * POST /tasks/:id/archive
 * Archive a task (hide from regular view)
 *
 * WHAT IT DOES:
 * Moves a completed task to the archive so it no longer appears in normal lists.
 * Archived tasks still exist and can be retrieved, just hidden by default.
 *
 * USE CASES:
 * - Hide completed tasks from today view
 * - Clean up task list
 * - Keep archive for reference/history
 *
 * PATH PARAMETERS:
 * - id: Task ID (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * POST /tasks/507f1f77bcf86cd799439011/archive
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Task archived",
 *   task: { id: "...", title: "Write report", archived: true, ... }
 * }
 */
router.post('/:id/archive', async (req, res) => {
  try {
    // Step 1: Extract task ID from URL
    const { id } = req.params;

    // Step 2: Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Call service to archive the task
    // Service checks ownership - user can only archive their own tasks
    const task = await taskService.archiveTask(req.user._id, id);

    // Step 4: Check if archive was successful
    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    // Step 5: Log the successful archive for audit trail
    attachEntityId(req, 'taskId', task._id);
    req.eventName = 'task.archive.success';

    // Step 6: Return updated task
    res.json({
      message: 'Task archived',
      task: task.toSafeJSON()
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'task_archive', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to archive task',
      code: 'ARCHIVE_ERROR'
    });
  }
});

/**
 * POST /tasks/:id/unarchive
 * Restore an archived task to normal view
 *
 * WHAT IT DOES:
 * Brings an archived task back into normal task lists.
 * Archived tasks are still queryable but hidden by default.
 * This endpoint unhides them.
 *
 * PATH PARAMETERS:
 * - id: Task ID (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * POST /tasks/507f1f77bcf86cd799439011/unarchive
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Task unarchived",
 *   task: { id: "...", title: "Write report", archived: false, ... }
 * }
 */
router.post('/:id/unarchive', async (req, res) => {
  try {
    // Step 1: Extract task ID from URL
    const { id } = req.params;

    // Step 2: Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Call service to unarchive the task
    // Service checks ownership - user can only unarchive their own tasks
    const task = await taskService.unarchiveTask(req.user._id, id);

    // Step 4: Check if unarchive was successful
    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    // Step 5: Log the successful unarchive for audit trail
    attachEntityId(req, 'taskId', task._id);
    req.eventName = 'task.unarchive.success';

    // Step 6: Return updated task
    res.json({
      message: 'Task unarchived',
      task: task.toSafeJSON()
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'task_unarchive', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to unarchive task',
      code: 'UNARCHIVE_ERROR'
    });
  }
});

/**
 * POST /tasks/:id/trash
 * Move a task to trash (soft delete - recoverable)
 *
 * WHAT IT DOES:
 * Moves a task to trash instead of permanently deleting it.
 * Trashed tasks are hidden from normal views but can be recovered within 30 days.
 * After 30 days, permanently deleted automatically.
 *
 * USE CASES:
 * - Delete task by mistake - recover from trash
 * - Move unwanted tasks to trash first (safer than delete)
 * - Review trash to clean up space
 *
 * PATH PARAMETERS:
 * - id: Task ID (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * POST /tasks/507f1f77bcf86cd799439011/trash
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Task moved to trash",
 *   task: { id: "...", title: "Write report", trashedAt: "2025-02-15T10:00:00Z", ... }
 * }
 *
 * RECOVERY:
 * Tasks in trash can be restored with POST /:id/restore within 30 days.
 * After 30 days, they are automatically permanently deleted.
 */
router.post('/:id/trash', async (req, res) => {
  try {
    // Step 1: Extract task ID from URL
    const { id } = req.params;

    // Step 2: Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Call service to move task to trash
    // Service marks task as trashed instead of deleting it
    // Trashed tasks are hidden from normal queries
    const task = await taskService.trashTask(req.user._id, id);

    // Step 4: Check if trash was successful
    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    // Step 5: Log the successful trash for audit trail
    attachEntityId(req, 'taskId', task._id);
    req.eventName = 'task.trash.success';

    // Step 6: Return updated task
    res.json({
      message: 'Task moved to trash',
      task: task.toSafeJSON()
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'task_trash', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to trash task',
      code: 'TRASH_ERROR'
    });
  }
});

/**
 * POST /tasks/:id/restore
 * Restore a task from trash back to normal
 *
 * WHAT IT DOES:
 * Recovers a task from trash and returns it to normal task lists.
 * Only works if task was trashed less than 30 days ago.
 *
 * PATH PARAMETERS:
 * - id: Task ID (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * POST /tasks/507f1f77bcf86cd799439011/restore
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Task restored",
 *   task: { id: "...", title: "Write report", trashedAt: null, ... }
 * }
 *
 * NOTES:
 * - Only works if task is in trash
 * - Automatically expire trash after 30 days
 * - Restore timestamp is cleared when task is restored
 */
router.post('/:id/restore', async (req, res) => {
  try {
    // Step 1: Extract task ID from URL
    const { id } = req.params;

    // Step 2: Validate that the ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Call service to restore task from trash
    // Service clears the "trashedAt" flag so task appears in normal lists
    const task = await taskService.restoreTask(req.user._id, id);

    // Step 4: Check if restore was successful
    // Returns null if task not found or not in trash
    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    // Step 5: Log the successful restore for audit trail
    attachEntityId(req, 'taskId', task._id);
    req.eventName = 'task.restore.success';

    // Step 6: Return updated task
    res.json({
      message: 'Task restored',
      task: task.toSafeJSON()
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'task_restore', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to restore task',
      code: 'RESTORE_ERROR'
    });
  }
});

/**
 * POST /tasks/:id/comments
 * Add a comment to a task
 *
 * WHAT IT DOES:
 * Adds a text comment to a task. Comments appear on the task's detail page
 * with timestamp and author information.
 *
 * PATH PARAMETERS:
 * - id: Task ID (MongoDB ObjectId)
 *
 * REQUEST BODY:
 * { "text": "This is my comment" }
 *
 * EXAMPLE REQUEST:
 * POST /tasks/507f1f77bcf86cd799439011/comments
 * { "text": "Started working on this task" }
 *
 * EXAMPLE RESPONSE (201 Created):
 * {
 *   message: "Comment added",
 *   task: {
 *     id: "...",
 *     title: "Write report",
 *     comments: [
 *       { id: "...", text: "Started working on this task", author: "user@example.com", createdAt: "2025-02-15T10:00:00Z" }
 *     ]
 *   }
 * }
 */
router.post('/:id/comments', async (req, res) => {
  try {
    // Step 1: Extract task ID and comment text
    const { id } = req.params;
    const { text } = req.body;

    // Step 2: Validate task ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Validate comment text is provided
    // Can't create empty comments
    if (!text || !text.trim()) {
      return res.status(400).json({
        error: 'Comment text is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Step 4: Call service to add comment
    // Service creates comment object with timestamp and author
    const task = await taskService.addComment(req.user._id, id, text);

    // Step 5: Check if comment was added
    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    // Step 6: Log the successful comment for audit trail
    attachEntityId(req, 'taskId', task._id);
    req.eventName = 'task.comment_add.success';

    // Step 7: Return updated task with new comment (201 Created status)
    res.status(201).json({
      message: 'Comment added',
      task: task.toSafeJSON()
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'task_add_comment', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to add comment',
      code: 'COMMENT_ADD_ERROR'
    });
  }
});

/**
 * PATCH /tasks/:id/comments/:commentId
 * Update a comment on a task
 *
 * WHAT IT DOES:
 * Edits an existing comment. Only the comment author can edit their own comments.
 * Other users cannot edit or delete comments they didn't write.
 *
 * AUTHORIZATION:
 * - Only comment author can update their own comments (403 if not author)
 *
 * PATH PARAMETERS:
 * - id: Task ID (MongoDB ObjectId)
 * - commentId: Comment ID (MongoDB ObjectId)
 *
 * REQUEST BODY:
 * { "text": "Updated comment text" }
 *
 * EXAMPLE REQUEST:
 * PATCH /tasks/507f1f77bcf86cd799439011/comments/507f1f77bcf86cd799439012
 * { "text": "Actually, I've finished this task" }
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Comment updated",
 *   task: {
 *     id: "...",
 *     comments: [
 *       { id: "...", text: "Actually, I've finished this task", updatedAt: "2025-02-15T11:00:00Z" }
 *     ]
 *   }
 * }
 */
router.patch('/:id/comments/:commentId', async (req, res) => {
  try {
    // Step 1: Extract task ID and comment ID
    const { id, commentId } = req.params;
    const { text } = req.body;

    // Step 2: Validate both IDs are valid MongoDB ObjectIds
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        error: 'Invalid ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Validate comment text is provided
    if (!text || !text.trim()) {
      return res.status(400).json({
        error: 'Comment text is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Step 4: Call service to update comment
    // Service handles:
    // - Checking ownership (only comment author can edit)
    // - Updating comment text
    // - Recording edit timestamp
    const result = await taskService.updateComment(req.user._id, id, commentId, text);

    // Step 5: Check if task exists
    if (!result) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    // Step 6: Check if comment exists
    if (result.error === 'COMMENT_NOT_FOUND') {
      return res.status(404).json({
        error: 'Comment not found',
        code: 'COMMENT_NOT_FOUND'
      });
    }

    // Step 7: Check if user is authorized to edit this comment
    // Users can only edit their own comments
    if (result.error === 'NOT_AUTHORIZED') {
      return res.status(403).json({
        error: 'You can only edit your own comments',
        code: 'NOT_AUTHORIZED'
      });
    }

    // Step 8: Log the successful update for audit trail
    attachEntityId(req, 'taskId', result._id);
    req.eventName = 'task.comment_update.success';

    // Step 9: Return updated task with edited comment
    res.json({
      message: 'Comment updated',
      task: result.toSafeJSON()
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'task_update_comment', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to update comment',
      code: 'COMMENT_UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /tasks/:id/comments/:commentId
 * Delete a comment from a task
 *
 * WHAT IT DOES:
 * Permanently removes a comment from a task.
 * Only the comment author can delete their own comments.
 * Other users cannot delete comments they didn't write.
 *
 * AUTHORIZATION:
 * - Only comment author can delete their own comments (403 if not author)
 *
 * PATH PARAMETERS:
 * - id: Task ID (MongoDB ObjectId)
 * - commentId: Comment ID (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * DELETE /tasks/507f1f77bcf86cd799439011/comments/507f1f77bcf86cd799439012
 *
 * EXAMPLE RESPONSE:
 * {
 *   message: "Comment deleted",
 *   task: { id: "...", title: "Write report", comments: [] }
 * }
 *
 * NOTE:
 * Deletion is permanent - comments cannot be recovered.
 * No undo or recovery option (unlike file/task trash).
 */
router.delete('/:id/comments/:commentId', async (req, res) => {
  try {
    // Step 1: Extract task ID and comment ID
    const { id, commentId } = req.params;

    // Step 2: Validate both IDs are valid MongoDB ObjectIds
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        error: 'Invalid ID',
        code: 'INVALID_ID'
      });
    }

    // Step 3: Call service to delete comment
    // Service handles:
    // - Checking ownership (only comment author can delete)
    // - Removing comment from task
    const result = await taskService.deleteComment(req.user._id, id, commentId);

    // Step 4: Check if task exists
    if (!result) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    // Step 5: Check if comment exists
    if (result.error === 'COMMENT_NOT_FOUND') {
      return res.status(404).json({
        error: 'Comment not found',
        code: 'COMMENT_NOT_FOUND'
      });
    }

    // Step 6: Check if user is authorized to delete this comment
    // Users can only delete their own comments
    if (result.error === 'NOT_AUTHORIZED') {
      return res.status(403).json({
        error: 'You can only delete your own comments',
        code: 'NOT_AUTHORIZED'
      });
    }

    // Step 7: Log the successful deletion for audit trail
    attachEntityId(req, 'taskId', result._id);
    req.eventName = 'task.comment_delete.success';

    // Step 8: Return updated task with comment removed
    res.json({
      message: 'Comment deleted',
      task: result.toSafeJSON()
    });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'task_delete_comment', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to delete comment',
      code: 'COMMENT_DELETE_ERROR'
    });
  }
});

export default router;
