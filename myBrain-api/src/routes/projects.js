import express from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { attachError } from '../middleware/errorHandler.js';
import { requireLimit } from '../middleware/limitEnforcement.js';
import projectService from '../services/projectService.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /projects
 * Get projects with search/filter
 * Query params: q, status, lifeAreaId, priority, tags, hasDeadline, pinned, sort, limit, skip
 */
router.get('/', async (req, res) => {
  try {
    const {
      q = '',
      status,
      lifeAreaId,
      priority,
      tags = '',
      hasDeadline,
      pinned,
      sort = '-updatedAt',
      limit = 50,
      skip = 0
    } = req.query;

    const options = {
      q,
      status: status ? (status.includes(',') ? status.split(',') : status) : null,
      lifeAreaId: lifeAreaId && mongoose.Types.ObjectId.isValid(lifeAreaId) ? lifeAreaId : null,
      priority: priority || null,
      tags: tags ? tags.split(',').filter(Boolean) : [],
      hasDeadline: hasDeadline === 'true' ? true : hasDeadline === 'false' ? false : null,
      pinned: pinned === 'true' ? true : pinned === 'false' ? false : null,
      sort,
      limit: Math.min(parseInt(limit) || 50, 100),
      skip: parseInt(skip) || 0
    };

    const { projects, total } = await projectService.getProjects(req.user._id, options);

    res.json({
      projects: projects.map(p => p.toSafeJSON()),
      total,
      limit: options.limit,
      skip: options.skip
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
 * Get projects with upcoming deadlines
 */
router.get('/upcoming', async (req, res) => {
  try {
    const { days = '7' } = req.query;
    const projects = await projectService.getUpcomingProjects(
      req.user._id,
      parseInt(days) || 7
    );

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
 * Get overdue projects
 */
router.get('/overdue', async (req, res) => {
  try {
    const projects = await projectService.getOverdueProjects(req.user._id);

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
 * Get all unique tags for the user's projects
 */
router.get('/tags', async (req, res) => {
  try {
    const tags = await projectService.getUserProjectTags(req.user._id);
    res.json({ tags });
  } catch (error) {
    attachError(req, error, { operation: 'project_tags_fetch' });
    res.status(500).json({
      error: 'Failed to fetch tags',
      code: 'TAGS_FETCH_ERROR'
    });
  }
});

/**
 * POST /projects
 * Create a new project
 */
router.post('/', requireLimit('projects'), async (req, res) => {
  try {
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

    if (!title || !title.trim()) {
      return res.status(400).json({
        error: 'Project title is required',
        code: 'VALIDATION_ERROR'
      });
    }

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

    res.status(201).json({
      message: 'Project created successfully',
      project: project.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'project_create' });

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
 * Get a single project by ID with linked items
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { populateLinks = 'false' } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid project ID',
        code: 'INVALID_ID'
      });
    }

    const project = await projectService.getProjectById(
      req.user._id,
      id,
      populateLinks === 'true'
    );

    if (!project) {
      return res.status(404).json({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
    }

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
 * Update a project
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
 * Quick status change
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
 * DELETE /projects/:id
 * Delete a project
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

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    attachError(req, error, { operation: 'project_delete', projectId: req.params.id });
    res.status(500).json({
      error: 'Failed to delete project',
      code: 'PROJECT_DELETE_ERROR'
    });
  }
});

/**
 * POST /projects/:id/link-note
 * Link a note to a project
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
 * Link an event to a project
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
 * Unlink an event from a project
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

/**
 * POST /projects/:id/comments
 * Add a comment to a project
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

export default router;
