/**
 * =============================================================================
 * PROJECTS.JS - Projects CRUD Routes
 * =============================================================================
 *
 * This file handles all project management in myBrain.
 * Projects are containers for organizing work - they group related tasks,
 * notes, files, and links together.
 *
 * WHAT ARE PROJECTS?
 * ------------------
 * Projects are collections of related work items:
 * - HOME RENOVATION: Tasks (paint, flooring), notes, budget
 * - WRITE BOOK: Tasks (outline, chapters), notes, research files
 * - PRODUCT LAUNCH: Tasks (design, dev, marketing), timeline
 * - VACATION PLANNING: Tasks, notes, files, event dates
 *
 * PROJECT COMPONENTS:
 * -------------------
 * Each project contains:
 * - TITLE & DESCRIPTION: What the project is about
 * - TASKS: Actionable items to complete
 * - NOTES: Research, ideas, documentation
 * - FILES: Resources, documents, images
 * - LINKS: URLs to external resources
 * - LIFE AREA: Category (work, personal, health, etc.)
 * - DEADLINE: Optional target completion date
 * - STATUS: Active, completed, on-hold, canceled
 *
 * PROJECT STATUS:
 * ----------------
 * - ACTIVE: Currently working on it
 * - ON_HOLD: Paused temporarily
 * - COMPLETED: Finished (archived)
 * - CANCELED: Discontinued (archived)
 *
 * PROJECT HIERARCHY:
 * ------------------
 * TIMELINE (example):
 * Project created → Tasks added → Work progresses → Completed
 *
 * WORKFLOWS SUPPORTED:
 * --------------------
 * - KANBAN: Organize tasks by status (todo, in progress, done)
 * - LIST: Simple task list view
 * - CALENDAR: Timeline/deadline focused
 * - PORTFOLIO: Show completed projects
 *
 * PROJECT SETTINGS:
 * -----------------
 * - VISIBILITY: Private or shared
 * - SHARING: Who can see/edit
 * - TEMPLATES: Reusable project structure
 * - ARCHIVED: Hidden from main view
 *
 * ENDPOINTS:
 * -----------
 * - GET /projects - Get all projects (filtered)
 * - POST /projects - Create new project
 * - GET /projects/:id - Get project details
 * - PUT /projects/:id - Update project
 * - DELETE /projects/:id - Delete project
 * - POST /projects/:id/archive - Archive project
 * - POST /projects/:id/restore - Restore from archive
 * - POST /projects/:id/duplicate - Copy project structure
 * - GET /projects/:id/tasks - Get project tasks
 * - GET /projects/:id/notes - Get project notes
 * - GET /projects/:id/files - Get project files
 * - GET /projects/:id/links - Get project links
 * - POST /projects/:id/link - Add link to project
 *
 * SEARCH & FILTERS:
 * -----------------
 * Filter by:
 * - STATUS: Active, completed, on-hold
 * - PRIORITY: High, medium, low
 * - LIFE AREA: Work, personal, health, etc.
 * - TAGS: Custom tags for organization
 * - DEADLINE: Has deadline, due soon, overdue
 * - PINNED: Favorite projects
 *
 * STORAGE LIMITS:
 * ----------------
 * Free users: 50 projects
 * Premium users: 500 projects
 *
 * =============================================================================
 */

/**
 * Express is the web framework that handles HTTP requests and routing.
 * We use it to define API endpoints (URLs that the frontend can call).
 */
import express from 'express';

/**
 * Mongoose helps us work with MongoDB and validate ObjectIds.
 * We use it to check if project IDs are valid MongoDB ObjectIds.
 */
import mongoose from 'mongoose';
import Project from '../models/Project.js';

/**
 * requireAuth is middleware that checks if a user is logged in.
 * We use it to protect all project routes - only authenticated users can manage projects.
 */
import { requireAuth } from '../middleware/auth.js';

/**
 * attachError is a helper for logging errors to our audit trail.
 * When a project operation fails, we log what went wrong for debugging.
 */
import { attachError } from '../middleware/errorHandler.js';

/**
 * requireLimit is middleware that enforces project limits.
 * Checks if user has reached their project quota (free: 50, premium: 500).
 * Prevents creating more projects than allowed for their tier.
 */
import { requireLimit } from '../middleware/limitEnforcement.js';

/**
 * attachEntityId is a logging helper that records which projects are being modified.
 * This creates an audit trail: "User X modified Project Y at time Z"
 * Useful for security audits and understanding user behavior.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

/**
 * projectService contains the business logic for project operations:
 * - Creating, reading, updating, deleting projects
 * - Managing project status and deadlines
 * - Linking related items (notes, tasks, events, files)
 * - Project comments and activity
 * - Filtering and searching projects
 */
import projectService from '../services/projectService.js';

// =============================================================================
// ROUTER SETUP
// =============================================================================
// Create an Express router to group all project management routes together.
// This router will be mounted on the main server under /projects prefix.

const router = express.Router();

// =============================================================================
// GLOBAL MIDDLEWARE
// =============================================================================
// All routes in this router require authentication

/**
 * requireAuth - Check that user is logged in
 * Applied globally to all project routes
 * Ensures only authenticated users can manage projects
 */
router.use(requireAuth);

// =============================================================================
// PROJECT LISTING & SEARCH ROUTES
// =============================================================================
// These endpoints allow users to browse, search, and filter their projects.
// Projects can be filtered by status, priority, deadline, tags, life area.
// Results are paginated for performance.

/**
 * GET /projects
 * List user's projects with comprehensive filtering and sorting
 *
 * This endpoint is the main way users browse their projects.
 * Supports filtering by status, priority, life area, tags, deadline.
 * Results are sorted by most recently updated by default.
 *
 * FILTERING OPTIONS:
 * - q: Search by title or description (text search)
 * - status: Filter by status (active, completed, on_hold, someday)
 * - lifeAreaId: Filter by life area (work, personal, health, etc.)
 * - priority: Filter by priority (high, medium, low)
 * - tags: Filter by tags (comma-separated)
 * - hasDeadline: Show only projects with/without deadline
 * - pinned: Show only pinned favorite projects
 * - sort: Sort field (-updatedAt, -createdAt, title, deadline)
 * - limit: Results per page (default 50, max 100)
 * - skip: Pagination offset
 *
 * EXAMPLE REQUEST:
 * GET /projects?status=active&priority=high&limit=20&skip=0
 *
 * EXAMPLE RESPONSE:
 * {
 *   "projects": [
 *     {
 *       "id": "507f1f77bcf86cd799439011",
 *       "title": "Website Redesign",
 *       "status": "active",
 *       "priority": "high",
 *       "deadline": "2026-02-15",
 *       "progress": 65,
 *       "taskCount": 12,
 *       "completedTaskCount": 8,
 *       "pinned": true
 *     }
 *   ],
 *   "total": 47,
 *   "limit": 20,
 *   "skip": 0
 * }
 *
 * @query {string} q - Text search query
 * @query {string} status - Project status filter
 * @query {string} lifeAreaId - Life area ID filter
 * @query {string} priority - Priority filter
 * @query {string} tags - Tag filters (comma-separated)
 * @query {boolean} hasDeadline - Filter by deadline existence
 * @query {boolean} pinned - Show only pinned projects
 * @query {string} sort - Sort field
 * @query {number} limit - Results per page
 * @query {number} skip - Pagination offset
 * @returns {Object} Projects array, total count, and pagination info
 */
router.get('/', async (req, res) => {
  try {
    // STEP 1: Extract filter and pagination parameters from query string
    const {
      q = '',                            // Text search
      status,                            // Status filter
      lifeAreaId,                        // Life area filter
      priority,                          // Priority filter
      tags = '',                         // Tags filter
      hasDeadline,                       // Deadline filter
      pinned,                            // Pinned filter
      favorited,                         // Favorited filter
      isGoal,                            // Goal filter
      sort = '-updatedAt',               // Default: most recently updated
      limit = 50,                        // Default: 50 projects per page
      skip = 0                           // Default: first page
    } = req.query;

    // STEP 2: Parse and validate filter parameters
    // Convert comma-separated strings to arrays
    // Validate ObjectIds
    // Convert string booleans to actual booleans
    const options = {
      q,
      // Parse status filter (can be single or comma-separated)
      status: status ? (status.includes(',') ? status.split(',') : status) : null,
      // Validate life area ID format
      lifeAreaId: lifeAreaId && mongoose.Types.ObjectId.isValid(lifeAreaId) ? lifeAreaId : null,
      priority: priority || null,
      // Parse tags from comma-separated string
      tags: tags ? tags.split(',').filter(Boolean) : [],
      // Convert string booleans to actual booleans
      hasDeadline: hasDeadline === 'true' ? true : hasDeadline === 'false' ? false : null,
      pinned: pinned === 'true' ? true : pinned === 'false' ? false : null,
      favorited: favorited === 'true' ? true : favorited === 'false' ? false : null,
      isGoal: isGoal === 'true' ? true : isGoal === 'false' ? false : null,
      sort,
      // Enforce max limit of 100 to prevent large queries
      limit: Math.min(parseInt(limit) || 50, 100),
      skip: parseInt(skip) || 0
    };

    // STEP 3: Call service to fetch projects with filters
    // Service handles:
    // - Building MongoDB query with all filters
    // - Paginating results
    // - Sorting
    // - Counting total for pagination
    const { projects, total } = await projectService.getProjects(req.user._id, options);

    // STEP 4: Return results to frontend
    // Convert to safe JSON (removes sensitive fields)
    res.json({
      projects: projects.map(p => p.toSafeJSON()),
      total,                             // Total projects matching filter
      limit: options.limit,              // Results per page
      skip: options.skip                 // Pagination offset
    });
  } catch (error) {
    attachError(req, error, { operation: 'projects_fetch' });
    res.status(500).json({
      error: 'Failed to fetch projects',
      code: 'PROJECTS_FETCH_ERROR'
    });
  }
});

/**
 * GET /projects/upcoming
 * Get projects with upcoming deadlines within specified days
 *
 * WHAT IT DOES:
 * Returns projects that have deadlines coming up in the next X days.
 * Useful for prioritization and timeline planning.
 *
 * DEFAULT:
 * Returns projects due in next 7 days
 *
 * USE CASES:
 * - "What's due this week?" widget
 * - Priority/urgency view
 * - Timeline planning dashboard
 *
 * EXAMPLE REQUEST:
 * GET /projects/upcoming?days=14
 *
 * EXAMPLE RESPONSE:
 * {
 *   "projects": [
 *     {
 *       "id": "507f1f77bcf86cd799439011",
 *       "title": "Q1 Report",
 *       "deadline": "2026-01-25",
 *       "daysUntilDeadline": 4,
 *       "priority": "high",
 *       "status": "active"
 *     }
 *   ]
 * }
 *
 * @query {number} days - Look ahead this many days (default: 7)
 * @returns {Object} Array of projects with upcoming deadlines
 * @throws {500} - Server error fetching projects
 */
router.get('/upcoming', async (req, res) => {
  try {
    // STEP 1: Extract days parameter
    const { days = '7' } = req.query;

    // STEP 2: Fetch projects with upcoming deadlines
    // Service queries for projects where deadline is:
    // - Not null (has a deadline)
    // - Between now and now + X days
    // - Status is active (not completed or canceled)
    const projects = await projectService.getUpcomingProjects(
      req.user._id,
      parseInt(days) || 7     // Default to 7 days
    );

    // STEP 3: Return upcoming projects
    res.json({
      projects: projects.map(p => p.toSafeJSON())
    });
  } catch (error) {
    attachError(req, error, { operation: 'upcoming_projects_fetch' });
    res.status(500).json({
      error: 'Failed to fetch upcoming projects',
      code: 'UPCOMING_PROJECTS_ERROR'
    });
  }
});

/**
 * GET /projects/overdue
 * Get projects with overdue deadlines
 *
 * WHAT IT DOES:
 * Returns projects where the deadline has passed and project is not completed.
 * Useful for identifying projects that need attention.
 *
 * OVERDUE DEFINITION:
 * - Deadline in the past
 * - Status is NOT completed, canceled, or on_hold
 *
 * USE CASES:
 * - "What's overdue?" alert
 * - Priority/urgent view
 * - Project health check
 *
 * @returns {Object} Array of overdue projects
 */
router.get('/overdue', async (req, res) => {
  try {
    // STEP 1: Fetch overdue projects from service
    // Service queries for projects where:
    // - Deadline is in the past
    // - Status is not completed/canceled
    const projects = await projectService.getOverdueProjects(req.user._id);

    // STEP 2: Return overdue projects
    res.json({
      projects: projects.map(p => p.toSafeJSON())
    });
  } catch (error) {
    attachError(req, error, { operation: 'overdue_projects_fetch' });
    res.status(500).json({
      error: 'Failed to fetch overdue projects',
      code: 'OVERDUE_PROJECTS_ERROR'
    });
  }
});

/**
 * GET /projects/tags
 * Get all unique tags used on the user's projects
 *
 * Returns a list of every tag the user has applied to projects.
 * Used for tag filter dropdown in project list.
 * Includes count of how many projects use each tag.
 *
 * EXAMPLE RESPONSE:
 * {
 *   "tags": [
 *     { "name": "client-work", "count": 8 },
 *     { "name": "priority", "count": 5 },
 *     { "name": "archived", "count": 2 }
 *   ]
 * }
 *
 * @returns {Object} List of tags with usage counts
 */
router.get('/tags', async (req, res) => {
  try {
    // STEP 1: Fetch all unique tags for this user's projects
    // Service does MongoDB aggregation to get distinct tags and their counts
    const tags = await projectService.getUserProjectTags(req.user._id);

    // STEP 2: Return tags list
    // Frontend uses this to populate tag filter dropdown
    res.json({ tags });
  } catch (error) {
    attachError(req, error, { operation: 'project_tags_fetch' });
    res.status(500).json({
      error: 'Failed to fetch tags',
      code: 'TAGS_FETCH_ERROR'
    });
  }
});

// =============================================================================
// PROJECT CRUD ROUTES
// =============================================================================
// These endpoints handle creating, reading, updating, and deleting projects.
// All operations include ownership checks and validation.

/**
 * POST /projects
 * Create a new project
 *
 * WHAT IT DOES:
 * Creates a new project that will contain tasks, notes, files, and links.
 * Projects are the main organizational unit in myBrain.
 *
 * PROJECT STRUCTURE:
 * - Title (required): Name of the project
 * - Description (optional): What the project is about
 * - Outcome (optional): Goal or desired outcome
 * - Status (optional): active, completed, on_hold, someday
 * - Priority (optional): high, medium, low
 * - Deadline (optional): Target completion date
 * - Life Area (optional): Category (work, personal, health, etc.)
 * - Tags (optional): Custom tags for organization
 * - Color (optional): Display color for the project
 * - Pinned (optional): Mark as favorite
 *
 * LIMITS:
 * - Free users: 50 projects max
 * - Premium users: 500 projects max
 * - requireLimit middleware enforces these quotas
 *
 * EXAMPLE REQUEST:
 * POST /projects
 * {
 *   "title": "Website Redesign",
 *   "description": "Redesign company website for 2026",
 *   "status": "active",
 *   "priority": "high",
 *   "deadline": "2026-06-30",
 *   "lifeAreaId": "507f1f77bcf86cd799439011",
 *   "tags": ["work", "priority"],
 *   "color": "#3b82f6",
 *   "pinned": true
 * }
 *
 * @body {string} title - Project name (required)
 * @body {string} description - Project description
 * @body {string} outcome - Desired outcome
 * @body {string} status - Project status
 * @body {string} priority - Priority level
 * @body {string} deadline - Target completion date
 * @body {string} lifeAreaId - Life area ID
 * @body {string[]} tags - Tags array
 * @body {string} color - Display color
 * @body {boolean} pinned - Is favorite
 * @returns {Object} Created project object
 */
router.post('/', requireLimit('projects'), async (req, res) => {
  try {
    // STEP 1: Extract project data from request body
    const {
      title,
      description,
      outcome,
      status,
      priority,
      deadline,
      lifeAreaId,
      tags,
      color,
      pinned
    } = req.body;

    // STEP 2: Validate required fields
    // Title is the only required field
    if (!title || !title.trim()) {
      return res.status(400).json({
        error: 'Project title is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // STEP 3: Create project in database
    // Service handles:
    // - Creating Project document
    // - Validating all fields
    // - Setting default values (status, priority, etc.)
    // - Creating empty arrays for tasks, notes, files, etc.
    const project = await projectService.createProject(req.user._id, {
      title,
      description,
      outcome,
      status,
      priority,
      deadline,
      lifeAreaId,
      tags,
      color,
      pinned
    });

    // STEP 4: Log the project creation
    attachEntityId(req, 'projectId', project._id);
    req.eventName = 'project.create.success';

    // STEP 5: Return created project
    // Status 201 = Created (standard for POST that creates a resource)
    res.status(201).json({
      message: 'Project created successfully',
      project: project.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'project_create' });

    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      error: 'Failed to create project',
      code: 'PROJECT_CREATE_ERROR'
    });
  }
});

/**
 * GET /projects/:id
 * Get a single project with all details and linked items
 *
 * WHAT IT RETURNS:
 * Complete project information including:
 * - Project metadata (title, description, status, priority)
 * - Linked tasks, notes, files, events
 * - Project comments
 * - Timeline and progress info
 * - Settings and preferences
 *
 * OPTIONAL POPULATION:
 * By default, returns summary of linked items.
 * Set populateLinks=true to get full details of linked items (slower).
 *
 * USE CASES:
 * - Project detail view/dashboard
 * - Project editing interface
 * - Getting full context for analysis
 *
 * EXAMPLE REQUEST:
 * GET /projects/507f1f77bcf86cd799439011?populateLinks=true
 *
 * @param id - Project ID
 * @query {boolean} populateLinks - Populate full details of linked items
 * @returns {Object} Complete project object
 */
router.get('/:id', async (req, res) => {
  try {
    // STEP 1: Extract and validate project ID
    const { id } = req.params;
    const { populateLinks = 'false' } = req.query;

    // Validate project ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid project ID',
        code: 'INVALID_ID'
      });
    }

    // STEP 2: Fetch project from database
    // Service includes ownership check - won't return if user doesn't own project
    // If populateLinks=true, expands linked items with full details
    const project = await projectService.getProjectById(
      req.user._id,
      id,
      populateLinks === 'true'
    );

    // STEP 3: If project not found or not owned, return 404
    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    // STEP 4: Return project details
    res.json({
      project: project.toSafeJSON ? project.toSafeJSON() : project
    });
  } catch (error) {
    attachError(req, error, { operation: 'project_fetch', projectId: req.params.id });
    res.status(500).json({
      error: 'Failed to fetch project',
      code: 'PROJECT_FETCH_ERROR'
    });
  }
});

/**
 * PATCH /projects/:id
 * Update project metadata
 *
 * WHAT IT DOES:
 * Updates one or more project properties. Any fields not provided are left unchanged.
 * Typical uses: renaming project, changing deadline, updating status, adding tags.
 *
 * UPDATABLE FIELDS:
 * - title: Project name
 * - description: Project description
 * - outcome: Desired outcome
 * - status: Project status (active, completed, on_hold, someday)
 * - priority: Priority level (high, medium, low)
 * - deadline: Target completion date (ISO format)
 * - lifeAreaId: Life area category ID
 * - tags: Tags array (for organization)
 * - color: Display color (hex format)
 * - pinned: Is favorite (boolean)
 *
 * EXAMPLE REQUEST:
 * PATCH /projects/507f1f77bcf86cd799439011
 * {
 *   "title": "Website Redesign v2",
 *   "status": "in_progress",
 *   "priority": "high",
 *   "deadline": "2026-06-30"
 * }
 *
 * EXAMPLE RESPONSE:
 * {
 *   "message": "Project updated successfully",
 *   "project": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "title": "Website Redesign v2",
 *     "status": "in_progress",
 *     "priority": "high",
 *     "deadline": "2026-06-30",
 *     "updatedAt": "2026-01-21T14:30:00Z"
 *   }
 * }
 *
 * @param {string} id - Project ID (MongoDB ObjectId)
 * @body {string} title - New project name (optional)
 * @body {string} description - New description (optional)
 * @body {string} outcome - New outcome (optional)
 * @body {string} status - New status (optional)
 * @body {string} priority - New priority (optional)
 * @body {string} deadline - New deadline date (optional)
 * @body {string} lifeAreaId - New life area ID (optional)
 * @body {string[]} tags - New tags array (optional)
 * @body {string} color - New color (optional)
 * @body {boolean} pinned - New pinned status (optional)
 * @returns {Object} Updated project object
 * @throws {400} - Invalid project ID format
 * @throws {404} - Project not found or doesn't belong to user
 * @throws {422} - Validation error on project fields
 * @throws {500} - Server error updating project
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid project ID',
        code: 'INVALID_ID'
      });
    }

    const updates = req.body;
    const project = await projectService.updateProject(req.user._id, id, updates);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    attachEntityId(req, 'projectId', project._id);
    req.eventName = 'project.update.success';

    res.json({
      message: 'Project updated successfully',
      project: project.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'project_update', projectId: req.params.id });

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      error: 'Failed to update project',
      code: 'PROJECT_UPDATE_ERROR'
    });
  }
});

/**
 * POST /projects/:id/status
 * Quickly change project status
 *
 * WHAT IT DOES:
 * Fast endpoint for status-only changes. Equivalent to PATCH but only for status field.
 * Useful for quick status toggles in UI (mark done, pause, resume).
 *
 * VALID STATUSES:
 * - active: Currently working on it
 * - completed: Finished and archived
 * - on_hold: Paused temporarily
 * - someday: Future/backlog item
 *
 * EXAMPLE REQUEST:
 * POST /projects/507f1f77bcf86cd799439011/status
 * {
 *   "status": "completed"
 * }
 *
 * EXAMPLE RESPONSE:
 * {
 *   "message": "Project status updated",
 *   "project": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "title": "Website Redesign",
 *     "status": "completed",
 *     "updatedAt": "2026-01-21T14:30:00Z"
 *   }
 * }
 *
 * @param {string} id - Project ID (MongoDB ObjectId)
 * @body {string} status - New status (active, completed, on_hold, someday)
 * @returns {Object} Updated project with new status
 * @throws {400} - Invalid project ID or invalid status value
 * @throws {404} - Project not found or doesn't belong to user
 * @throws {500} - Server error updating status
 */
router.post('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid project ID',
        code: 'INVALID_ID'
      });
    }

    // Validate status is one of the allowed values
    if (!['active', 'completed', 'on_hold', 'someday'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        code: 'INVALID_STATUS'
      });
    }

    const project = await projectService.updateProjectStatus(req.user._id, id, status);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    attachEntityId(req, 'projectId', project._id);
    req.eventName = 'project.status.success';

    res.json({
      message: 'Project status updated',
      project: project.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'project_status_update', projectId: req.params.id });
    res.status(500).json({
      error: 'Failed to update project status',
      code: 'STATUS_UPDATE_ERROR'
    });
  }
});

/**
 * PATCH /projects/:id/favorite
 * Mark a project as favorited
 *
 * WHAT IT DOES:
 * Sets the favorited flag to true on a project, making it appear in
 * favorites views and filtered lists.
 *
 * EXAMPLE REQUEST:
 * PATCH /projects/507f1f77bcf86cd799439011/favorite
 *
 * EXAMPLE RESPONSE:
 * {
 *   "message": "Project favorited",
 *   "project": { ... }
 * }
 */
router.patch('/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid project ID', code: 'INVALID_ID' });
    }

    const project = await projectService.favoriteProject(id, req.user._id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found', code: 'PROJECT_NOT_FOUND' });
    }

    attachEntityId(req, 'projectId', project._id);
    req.eventName = 'project.favorite.success';

    res.json({ message: 'Project favorited', project: project.toSafeJSON() });
  } catch (error) {
    attachError(req, error, { operation: 'project_favorite', projectId: req.params.id });
    res.status(500).json({ error: 'Failed to favorite project', code: 'FAVORITE_ERROR' });
  }
});

/**
 * PATCH /projects/:id/unfavorite
 * Remove favorite flag from a project
 *
 * WHAT IT DOES:
 * Sets the favorited flag to false on a project, removing it from
 * favorites views and filtered lists.
 *
 * EXAMPLE REQUEST:
 * PATCH /projects/507f1f77bcf86cd799439011/unfavorite
 *
 * EXAMPLE RESPONSE:
 * {
 *   "message": "Project unfavorited",
 *   "project": { ... }
 * }
 */
router.patch('/:id/unfavorite', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid project ID', code: 'INVALID_ID' });
    }

    const project = await projectService.unfavoriteProject(id, req.user._id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found', code: 'PROJECT_NOT_FOUND' });
    }

    attachEntityId(req, 'projectId', project._id);
    req.eventName = 'project.unfavorite.success';

    res.json({ message: 'Project unfavorited', project: project.toSafeJSON() });
  } catch (error) {
    attachError(req, error, { operation: 'project_unfavorite', projectId: req.params.id });
    res.status(500).json({ error: 'Failed to unfavorite project', code: 'UNFAVORITE_ERROR' });
  }
});

/**
 * DELETE /projects/:id
 * Permanently delete a project
 *
 * WARNING: This deletes the project AND all linked items (tasks, notes, etc.)
 * This is PERMANENT and cannot be undone.
 *
 * WHAT IT DOES:
 * Permanently removes a project from the database.
 * Also removes all project relationships (linked tasks, notes, events, etc.).
 * No recovery possible - consider using status updates instead for soft delete.
 *
 * USE CASES:
 * - Permanently remove unwanted project
 * - Clean up test/duplicate projects
 * - Hard delete after archiving
 *
 * EXAMPLE REQUEST:
 * DELETE /projects/507f1f77bcf86cd799439011
 *
 * EXAMPLE RESPONSE:
 * {
 *   "message": "Project deleted successfully"
 * }
 *
 * @param {string} id - Project ID to delete (MongoDB ObjectId)
 * @returns {Object} Success message
 * @throws {400} - Invalid project ID format
 * @throws {404} - Project not found or doesn't belong to user
 * @throws {500} - Server error deleting project
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid project ID',
        code: 'INVALID_ID'
      });
    }

    const project = await projectService.deleteProject(req.user._id, id);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    attachEntityId(req, 'projectId', id);
    req.eventName = 'project.delete.success';

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    attachError(req, error, { operation: 'project_delete', projectId: req.params.id });
    res.status(500).json({
      error: 'Failed to delete project',
      code: 'PROJECT_DELETE_ERROR'
    });
  }
});

// =============================================================================
// PROJECT ENTITY LINKING ROUTES
// =============================================================================
// These endpoints connect projects to other entities (notes, tasks, events).
// Allows organizing related items together in a project context.
// Each entity type (note, task, event) can be linked/unlinked independently.

/**
 * POST /projects/:id/link-note
 * Link a note to a project
 *
 * WHAT IT DOES:
 * Associates a note with a project. The note becomes part of the project's context.
 * Creates a one-way relationship: "This note is referenced by this project".
 *
 * USE CASES:
 * - Add research notes to project
 * - Add meeting notes to project
 * - Add planning notes to project
 * - Attach supporting documentation
 *
 * EXAMPLE REQUEST:
 * POST /projects/507f1f77bcf86cd799439011/link-note
 * {
 *   "noteId": "507f1f77bcf86cd799439012"
 * }
 *
 * EXAMPLE RESPONSE:
 * {
 *   "message": "Note linked successfully",
 *   "project": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "title": "Website Redesign",
 *     "linkedNotes": ["507f1f77bcf86cd799439012"]
 *   }
 * }
 *
 * @param {string} id - Project ID (MongoDB ObjectId)
 * @body {string} noteId - Note ID to link (MongoDB ObjectId)
 * @returns {Object} Updated project with linked note in linkedNotes array
 * @throws {400} - Invalid project ID or noteId format
 * @throws {404} - Project or note not found, or doesn't belong to user
 * @throws {500} - Server error linking note
 */
router.post('/:id/link-note', async (req, res) => {
  try {
    const { id } = req.params;
    const { noteId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(noteId)) {
      return res.status(400).json({
        error: 'Invalid ID',
        code: 'INVALID_ID'
      });
    }

    const project = await projectService.linkNote(req.user._id, id, noteId);

    if (!project) {
      return res.status(404).json({
        error: 'Project or note not found',
        code: 'NOT_FOUND'
      });
    }

    attachEntityId(req, 'projectId', project._id);
    req.eventName = 'project.linkNote.success';

    res.json({
      message: 'Note linked successfully',
      project: project.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'project_link_note', projectId: req.params.id });
    res.status(500).json({
      error: 'Failed to link note',
      code: 'LINK_ERROR'
    });
  }
});

/**
 * DELETE /projects/:id/link-note/:noteId
 * Unlink a note from a project
 *
 * WHAT IT DOES:
 * Removes the association between a note and project.
 * Note still exists independently - this only removes the link.
 * Reverse operation of POST /projects/:id/link-note.
 *
 * EXAMPLE REQUEST:
 * DELETE /projects/507f1f77bcf86cd799439011/link-note/507f1f77bcf86cd799439012
 *
 * EXAMPLE RESPONSE:
 * {
 *   "message": "Note unlinked successfully",
 *   "project": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "title": "Website Redesign",
 *     "linkedNotes": []
 *   }
 * }
 *
 * @param {string} id - Project ID (MongoDB ObjectId)
 * @param {string} noteId - Note ID to unlink (MongoDB ObjectId)
 * @returns {Object} Updated project with note removed from linkedNotes array
 * @throws {400} - Invalid project ID or noteId format
 * @throws {404} - Project not found or doesn't belong to user
 * @throws {500} - Server error unlinking note
 */
router.delete('/:id/link-note/:noteId', async (req, res) => {
  try {
    const { id, noteId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(noteId)) {
      return res.status(400).json({
        error: 'Invalid ID',
        code: 'INVALID_ID'
      });
    }

    const project = await projectService.unlinkNote(req.user._id, id, noteId);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    attachEntityId(req, 'projectId', project._id);
    req.eventName = 'project.unlinkNote.success';

    res.json({
      message: 'Note unlinked successfully',
      project: project.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'project_unlink_note', projectId: req.params.id });
    res.status(500).json({
      error: 'Failed to unlink note',
      code: 'UNLINK_ERROR'
    });
  }
});

/**
 * POST /projects/:id/link-task
 * Link a task to a project
 *
 * WHAT IT DOES:
 * Associates a task with a project. Tasks become the actionable items in the project.
 * Creates a relationship: "This task is part of this project".
 *
 * USE CASES:
 * - Add project tasks
 * - Organize work items
 * - Track project progress via tasks
 * - Group related tasks under project
 *
 * EXAMPLE REQUEST:
 * POST /projects/507f1f77bcf86cd799439011/link-task
 * {
 *   "taskId": "507f1f77bcf86cd799439012"
 * }
 *
 * EXAMPLE RESPONSE:
 * {
 *   "message": "Task linked successfully",
 *   "project": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "title": "Website Redesign",
 *     "linkedTasks": ["507f1f77bcf86cd799439012"]
 *   }
 * }
 *
 * @param {string} id - Project ID (MongoDB ObjectId)
 * @body {string} taskId - Task ID to link (MongoDB ObjectId)
 * @returns {Object} Updated project with task added to linkedTasks array
 * @throws {400} - Invalid project ID or taskId format
 * @throws {404} - Project or task not found, or doesn't belong to user
 * @throws {500} - Server error linking task
 */
router.post('/:id/link-task', async (req, res) => {
  try {
    const { id } = req.params;
    const { taskId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        error: 'Invalid ID',
        code: 'INVALID_ID'
      });
    }

    const project = await projectService.linkTask(req.user._id, id, taskId);

    if (!project) {
      return res.status(404).json({
        error: 'Project or task not found',
        code: 'NOT_FOUND'
      });
    }

    attachEntityId(req, 'projectId', project._id);
    req.eventName = 'project.linkTask.success';

    res.json({
      message: 'Task linked successfully',
      project: project.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'project_link_task', projectId: req.params.id });
    res.status(500).json({
      error: 'Failed to link task',
      code: 'LINK_ERROR'
    });
  }
});

/**
 * DELETE /projects/:id/link-task/:taskId
 * Unlink a task from a project
 *
 * WHAT IT DOES:
 * Removes the association between a task and project.
 * Task still exists independently - this only removes the project link.
 * Reverse operation of POST /projects/:id/link-task.
 *
 * EXAMPLE REQUEST:
 * DELETE /projects/507f1f77bcf86cd799439011/link-task/507f1f77bcf86cd799439012
 *
 * EXAMPLE RESPONSE:
 * {
 *   "message": "Task unlinked successfully",
 *   "project": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "title": "Website Redesign",
 *     "linkedTasks": []
 *   }
 * }
 *
 * @param {string} id - Project ID (MongoDB ObjectId)
 * @param {string} taskId - Task ID to unlink (MongoDB ObjectId)
 * @returns {Object} Updated project with task removed from linkedTasks array
 * @throws {400} - Invalid project ID or taskId format
 * @throws {404} - Project not found or doesn't belong to user
 * @throws {500} - Server error unlinking task
 */
router.delete('/:id/link-task/:taskId', async (req, res) => {
  try {
    const { id, taskId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({
        error: 'Invalid ID',
        code: 'INVALID_ID'
      });
    }

    const project = await projectService.unlinkTask(req.user._id, id, taskId);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    attachEntityId(req, 'projectId', project._id);
    req.eventName = 'project.unlinkTask.success';

    res.json({
      message: 'Task unlinked successfully',
      project: project.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'project_unlink_task', projectId: req.params.id });
    res.status(500).json({
      error: 'Failed to unlink task',
      code: 'UNLINK_ERROR'
    });
  }
});

/**
 * POST /projects/:id/link-event
 * Link a calendar event to a project
 *
 * WHAT IT DOES:
 * Associates a calendar event with a project for timeline management.
 * Links project to specific calendar dates for scheduling/deadlines.
 *
 * EXAMPLE REQUEST:
 * POST /projects/507f1f77bcf86cd799439011/link-event
 * {
 *   "eventId": "507f1f77bcf86cd799439012"
 * }
 *
 * EXAMPLE RESPONSE:
 * {
 *   "message": "Event linked successfully",
 *   "project": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "title": "Website Redesign",
 *     "linkedEvents": ["507f1f77bcf86cd799439012"]
 *   }
 * }
 *
 * @param {string} id - Project ID (MongoDB ObjectId)
 * @body {string} eventId - Event ID to link (MongoDB ObjectId)
 * @returns {Object} Updated project with event added to linkedEvents array
 * @throws {400} - Invalid project ID or eventId format
 * @throws {404} - Project or event not found, or doesn't belong to user
 * @throws {500} - Server error linking event
 */
router.post('/:id/link-event', async (req, res) => {
  try {
    const { id } = req.params;
    const { eventId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        error: 'Invalid ID',
        code: 'INVALID_ID'
      });
    }

    const project = await projectService.linkEvent(req.user._id, id, eventId);

    if (!project) {
      return res.status(404).json({
        error: 'Project or event not found',
        code: 'NOT_FOUND'
      });
    }

    attachEntityId(req, 'projectId', project._id);
    req.eventName = 'project.linkEvent.success';

    res.json({
      message: 'Event linked successfully',
      project: project.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'project_link_event', projectId: req.params.id });
    res.status(500).json({
      error: 'Failed to link event',
      code: 'LINK_ERROR'
    });
  }
});

/**
 * DELETE /projects/:id/link-event/:eventId
 * Unlink a calendar event from a project
 *
 * WHAT IT DOES:
 * Removes the association between a calendar event and project.
 * Event still exists - this only removes the project link.
 * Reverse operation of POST /projects/:id/link-event.
 *
 * EXAMPLE REQUEST:
 * DELETE /projects/507f1f77bcf86cd799439011/link-event/507f1f77bcf86cd799439012
 *
 * EXAMPLE RESPONSE:
 * {
 *   "message": "Event unlinked successfully",
 *   "project": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "title": "Website Redesign",
 *     "linkedEvents": []
 *   }
 * }
 *
 * @param {string} id - Project ID (MongoDB ObjectId)
 * @param {string} eventId - Event ID to unlink (MongoDB ObjectId)
 * @returns {Object} Updated project with event removed from linkedEvents array
 * @throws {400} - Invalid project ID or eventId format
 * @throws {404} - Project not found or doesn't belong to user
 * @throws {500} - Server error unlinking event
 */
router.delete('/:id/link-event/:eventId', async (req, res) => {
  try {
    const { id, eventId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        error: 'Invalid ID',
        code: 'INVALID_ID'
      });
    }

    const project = await projectService.unlinkEvent(req.user._id, id, eventId);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    attachEntityId(req, 'projectId', project._id);
    req.eventName = 'project.unlinkEvent.success';

    res.json({
      message: 'Event unlinked successfully',
      project: project.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'project_unlink_event', projectId: req.params.id });
    res.status(500).json({
      error: 'Failed to unlink event',
      code: 'UNLINK_ERROR'
    });
  }
});

// =============================================================================
// PROJECT COMMENTS ROUTES
// =============================================================================
// These endpoints manage comments/notes on projects.
// Team members can discuss project details in comments.

/**
 * POST /projects/:id/comments
 * Add a comment to a project
 *
 * WHAT IT DOES:
 * Adds a comment to the project discussion thread.
 * Comments are linked to the user who created them with timestamp.
 *
 * USE CASES:
 * - Project updates and status
 * - Questions and discussions
 * - Progress notes
 * - Collaboration on project details
 *
 * EXAMPLE REQUEST:
 * POST /projects/507f1f77bcf86cd799439011/comments
 * {
 *   "text": "Started working on the home page redesign"
 * }
 *
 * EXAMPLE RESPONSE:
 * {
 *   "message": "Comment added",
 *   "project": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "title": "Website Redesign",
 *     "comments": [
 *       {
 *         "_id": "507f1f77bcf86cd799439013",
 *         "userId": "507f1f77bcf86cd799439020",
 *         "text": "Started working on the home page redesign",
 *         "createdAt": "2026-01-21T14:30:00Z"
 *       }
 *     ]
 *   }
 * }
 *
 * @param {string} id - Project ID (MongoDB ObjectId)
 * @body {string} text - Comment text (required, non-empty)
 * @returns {Object} Updated project with new comment added to comments array
 * @throws {400} - Invalid project ID or missing/empty comment text
 * @throws {404} - Project not found or doesn't belong to user
 * @throws {500} - Server error adding comment
 */
router.post('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid project ID',
        code: 'INVALID_ID'
      });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: 'Comment text is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const project = await projectService.addComment(req.user._id, id, text);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    attachEntityId(req, 'projectId', project._id);
    req.eventName = 'project.addComment.success';

    res.status(201).json({
      message: 'Comment added',
      project: project.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'project_add_comment', projectId: req.params.id });
    res.status(500).json({
      error: 'Failed to add comment',
      code: 'COMMENT_ADD_ERROR'
    });
  }
});

/**
 * PATCH /projects/:id/comments/:commentId
 * Update a comment on a project
 *
 * WHAT IT DOES:
 * Updates the text of an existing comment.
 * Users can only update their own comments (ownership check).
 * Admins can update any comment.
 *
 * EXAMPLE REQUEST:
 * PATCH /projects/507f1f77bcf86cd799439011/comments/507f1f77bcf86cd799439013
 * {
 *   "text": "Started working on the home page redesign - now at 50% complete"
 * }
 *
 * EXAMPLE RESPONSE:
 * {
 *   "message": "Comment updated",
 *   "project": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "comments": [
 *       {
 *         "_id": "507f1f77bcf86cd799439013",
 *         "text": "Started working on the home page redesign - now at 50% complete",
 *         "updatedAt": "2026-01-21T15:00:00Z"
 *       }
 *     ]
 *   }
 * }
 *
 * @param {string} id - Project ID (MongoDB ObjectId)
 * @param {string} commentId - Comment ID to update (MongoDB ObjectId)
 * @body {string} text - New comment text (required, non-empty)
 * @returns {Object} Updated project with modified comment
 * @throws {400} - Invalid project ID or commentId format, or missing/empty text
 * @throws {403} - User is not the comment author and not admin
 * @throws {404} - Project or comment not found, or project doesn't belong to user
 * @throws {500} - Server error updating comment
 */
router.patch('/:id/comments/:commentId', async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { text } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        error: 'Invalid ID',
        code: 'INVALID_ID'
      });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: 'Comment text is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const result = await projectService.updateComment(req.user._id, id, commentId, text);

    if (!result) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    if (result.error === 'COMMENT_NOT_FOUND') {
      return res.status(404).json({
        error: 'Comment not found',
        code: 'COMMENT_NOT_FOUND'
      });
    }

    if (result.error === 'NOT_AUTHORIZED') {
      return res.status(403).json({
        error: 'You can only edit your own comments',
        code: 'NOT_AUTHORIZED'
      });
    }

    attachEntityId(req, 'projectId', result._id);
    req.eventName = 'project.updateComment.success';

    res.json({
      message: 'Comment updated',
      project: result.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'project_update_comment', projectId: req.params.id });
    res.status(500).json({
      error: 'Failed to update comment',
      code: 'COMMENT_UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /projects/:id/comments/:commentId
 * Delete a comment from a project
 *
 * WHAT IT DOES:
 * Permanently removes a comment from a project.
 * Users can only delete their own comments.
 * Admins can delete any comment.
 *
 * EXAMPLE REQUEST:
 * DELETE /projects/507f1f77bcf86cd799439011/comments/507f1f77bcf86cd799439013
 *
 * EXAMPLE RESPONSE:
 * {
 *   "message": "Comment deleted",
 *   "project": {
 *     "_id": "507f1f77bcf86cd799439011",
 *     "title": "Website Redesign",
 *     "comments": []
 *   }
 * }
 *
 * @param {string} id - Project ID (MongoDB ObjectId)
 * @param {string} commentId - Comment ID to delete (MongoDB ObjectId)
 * @returns {Object} Updated project with comment removed from comments array
 * @throws {400} - Invalid project ID or commentId format
 * @throws {403} - User is not the comment author and not admin
 * @throws {404} - Project or comment not found, or project doesn't belong to user
 * @throws {500} - Server error deleting comment
 */
router.delete('/:id/comments/:commentId', async (req, res) => {
  try {
    const { id, commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        error: 'Invalid ID',
        code: 'INVALID_ID'
      });
    }

    const result = await projectService.deleteComment(req.user._id, id, commentId);

    if (!result) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    if (result.error === 'COMMENT_NOT_FOUND') {
      return res.status(404).json({
        error: 'Comment not found',
        code: 'COMMENT_NOT_FOUND'
      });
    }

    if (result.error === 'NOT_AUTHORIZED') {
      return res.status(403).json({
        error: 'You can only delete your own comments',
        code: 'NOT_AUTHORIZED'
      });
    }

    attachEntityId(req, 'projectId', result._id);
    req.eventName = 'project.deleteComment.success';

    res.json({
      message: 'Comment deleted',
      project: result.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'project_delete_comment', projectId: req.params.id });
    res.status(500).json({
      error: 'Failed to delete comment',
      code: 'COMMENT_DELETE_ERROR'
    });
  }
});

// =============================================================================
// EXPORT ROUTER
// =============================================================================
// This router is imported in server.js and mounted on the /projects prefix.
// All routes are prepended with /projects when mounted.
// Example: POST / → POST /projects

export default router;
