import express from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { attachError } from '../middleware/errorHandler.js';
import { requireLimit } from '../middleware/limitEnforcement.js';
import taskService from '../services/taskService.js';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /tasks
 * Get tasks with search/filter
 * Query params: q, status, priority, tags, hasDueDate, dueBefore, dueAfter, sort, limit, skip
 */
router.get('/', async (req, res) => {
  try {
    const {
      q = '',
      status,
      priority,
      tags = '',
      hasDueDate,
      dueBefore,
      dueAfter,
      lifeAreaId,
      projectId,
      sort = '-createdAt',
      limit = 50,
      skip = 0
    } = req.query;

    const options = {
      q,
      status: status ? (status.includes(',') ? status.split(',') : status) : null,
      priority: priority || null,
      tags: tags ? tags.split(',').filter(Boolean) : [],
      hasDueDate: hasDueDate === 'true' ? true : hasDueDate === 'false' ? false : null,
      dueBefore: dueBefore || null,
      dueAfter: dueAfter || null,
      lifeAreaId: lifeAreaId && mongoose.Types.ObjectId.isValid(lifeAreaId) ? lifeAreaId : null,
      projectId: projectId && mongoose.Types.ObjectId.isValid(projectId) ? projectId : null,
      sort,
      limit: Math.min(parseInt(limit) || 50, 100),
      skip: parseInt(skip) || 0
    };

    const { tasks, total } = await taskService.getTasks(req.user._id, options);

    res.json({
      tasks: tasks.map(t => t.toSafeJSON()),
      total,
      limit: options.limit,
      skip: options.skip
    });
  } catch (error) {
    attachError(req, error, { operation: 'tasks_fetch' });
    res.status(500).json({
      error: 'Failed to fetch tasks',
      code: 'TASKS_FETCH_ERROR'
    });
  }
});

/**
 * GET /tasks/today
 * Get today view data (overdue + due today + inbox count)
 */
router.get('/today', async (req, res) => {
  try {
    const todayData = await taskService.getTodayView(req.user._id);
    res.json(todayData);
  } catch (error) {
    attachError(req, error, { operation: 'today_view_fetch' });
    res.status(500).json({
      error: 'Failed to fetch today view',
      code: 'TODAY_VIEW_ERROR'
    });
  }
});

/**
 * GET /tasks/tags
 * Get all unique tags for the user's tasks
 */
router.get('/tags', async (req, res) => {
  try {
    const tags = await taskService.getUserTaskTags(req.user._id);
    res.json({ tags });
  } catch (error) {
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
 */
router.post('/', requireLimit('tasks'), async (req, res) => {
  try {
    const { title, body, status, priority, dueDate, tags, linkedNoteIds, sourceNoteId, lifeAreaId, projectId } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        error: 'Task title is required',
        code: 'VALIDATION_ERROR'
      });
    }

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

    res.status(201).json({
      message: 'Task created successfully',
      task: task.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'task_create' });

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      error: 'Failed to create task',
      code: 'TASK_CREATE_ERROR'
    });
  }
});

/**
 * GET /tasks/:id
 * Get a single task by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        code: 'INVALID_ID'
      });
    }

    const task = await taskService.getTaskById(req.user._id, id);

    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    res.json({ task: task.toSafeJSON() });
  } catch (error) {
    attachError(req, error, { operation: 'task_fetch', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to fetch task',
      code: 'TASK_FETCH_ERROR'
    });
  }
});

/**
 * PATCH /tasks/:id
 * Update a task
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        code: 'INVALID_ID'
      });
    }

    const updates = req.body;
    const task = await taskService.updateTask(req.user._id, id, updates);

    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    res.json({
      message: 'Task updated successfully',
      task: task.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'task_update', taskId: req.params.id });

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(500).json({
      error: 'Failed to update task',
      code: 'TASK_UPDATE_ERROR'
    });
  }
});

/**
 * POST /tasks/:id/status
 * Quick status change
 */
router.post('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        code: 'INVALID_ID'
      });
    }

    if (!['todo', 'in_progress', 'done', 'cancelled'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        code: 'INVALID_STATUS'
      });
    }

    const task = await taskService.updateTaskStatus(req.user._id, id, status);

    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    res.json({
      message: 'Task status updated',
      task: task.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'task_status_update', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to update task status',
      code: 'STATUS_UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /tasks/:id
 * Delete a task
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        code: 'INVALID_ID'
      });
    }

    const task = await taskService.deleteTask(req.user._id, id);

    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    attachError(req, error, { operation: 'task_delete', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to delete task',
      code: 'TASK_DELETE_ERROR'
    });
  }
});

/**
 * POST /tasks/:id/link-note
 * Link a note to a task
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

    const task = await taskService.linkNote(req.user._id, id, noteId);

    if (!task) {
      return res.status(404).json({
        error: 'Task or note not found',
        code: 'NOT_FOUND'
      });
    }

    res.json({
      message: 'Note linked successfully',
      task: task.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'task_link_note', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to link note',
      code: 'LINK_ERROR'
    });
  }
});

/**
 * DELETE /tasks/:id/link-note/:noteId
 * Unlink a note from a task
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

    const task = await taskService.unlinkNote(req.user._id, id, noteId);

    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    res.json({
      message: 'Note unlinked successfully',
      task: task.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'task_unlink_note', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to unlink note',
      code: 'UNLINK_ERROR'
    });
  }
});

/**
 * GET /tasks/:id/backlinks
 * Get backlinks for a task
 */
router.get('/:id/backlinks', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        code: 'INVALID_ID'
      });
    }

    const backlinks = await taskService.getTaskBacklinks(req.user._id, id);
    res.json({ backlinks });
  } catch (error) {
    attachError(req, error, { operation: 'task_backlinks', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to fetch backlinks',
      code: 'BACKLINKS_ERROR'
    });
  }
});

/**
 * POST /tasks/:id/archive
 * Archive a task
 */
router.post('/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        code: 'INVALID_ID'
      });
    }

    const task = await taskService.archiveTask(req.user._id, id);

    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    res.json({
      message: 'Task archived',
      task: task.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'task_archive', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to archive task',
      code: 'ARCHIVE_ERROR'
    });
  }
});

/**
 * POST /tasks/:id/unarchive
 * Unarchive a task
 */
router.post('/:id/unarchive', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        code: 'INVALID_ID'
      });
    }

    const task = await taskService.unarchiveTask(req.user._id, id);

    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    res.json({
      message: 'Task unarchived',
      task: task.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'task_unarchive', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to unarchive task',
      code: 'UNARCHIVE_ERROR'
    });
  }
});

/**
 * POST /tasks/:id/trash
 * Move a task to trash
 */
router.post('/:id/trash', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        code: 'INVALID_ID'
      });
    }

    const task = await taskService.trashTask(req.user._id, id);

    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    res.json({
      message: 'Task moved to trash',
      task: task.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'task_trash', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to trash task',
      code: 'TRASH_ERROR'
    });
  }
});

/**
 * POST /tasks/:id/restore
 * Restore a task from trash
 */
router.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Invalid task ID',
        code: 'INVALID_ID'
      });
    }

    const task = await taskService.restoreTask(req.user._id, id);

    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    res.json({
      message: 'Task restored',
      task: task.toSafeJSON()
    });
  } catch (error) {
    attachError(req, error, { operation: 'task_restore', taskId: req.params.id });
    res.status(500).json({
      error: 'Failed to restore task',
      code: 'RESTORE_ERROR'
    });
  }
});

export default router;
