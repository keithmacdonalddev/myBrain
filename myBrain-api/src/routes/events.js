import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { attachError } from '../middleware/errorHandler.js';
import * as eventService from '../services/eventService.js';

const router = express.Router();

/**
 * GET /events
 * Get events within a date range
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { startDate, endDate, status, area, lifeAreaId, projectId } = req.query;

    const events = await eventService.getEvents(req.user._id, {
      startDate,
      endDate,
      status,
      area,
      lifeAreaId,
      projectId,
    });

    res.json({ events });
  } catch (error) {
    attachError(req, error, { operation: 'events_fetch' });
    res.status(500).json({
      error: 'Failed to get events',
      code: 'GET_EVENTS_ERROR',
    });
  }
});

/**
 * GET /events/upcoming
 * Get upcoming events
 */
router.get('/upcoming', requireAuth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const events = await eventService.getUpcomingEvents(req.user._id, parseInt(days, 10));
    res.json({ events });
  } catch (error) {
    attachError(req, error, { operation: 'upcoming_events_fetch' });
    res.status(500).json({
      error: 'Failed to get upcoming events',
      code: 'GET_UPCOMING_ERROR',
    });
  }
});

/**
 * GET /events/day/:date
 * Get events for a specific day
 */
router.get('/day/:date', requireAuth, async (req, res) => {
  try {
    const events = await eventService.getDayEvents(req.user._id, req.params.date);
    res.json({ events });
  } catch (error) {
    attachError(req, error, { operation: 'day_events_fetch', date: req.params.date });
    res.status(500).json({
      error: 'Failed to get day events',
      code: 'GET_DAY_EVENTS_ERROR',
    });
  }
});

/**
 * POST /events
 * Create a new event
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      allDay,
      timezone,
      recurrence,
      location,
      meetingUrl,
      area,
      color,
      reminders,
      lifeAreaId,
      projectId,
    } = req.body;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Title, start date, and end date are required',
        code: 'MISSING_FIELDS',
      });
    }

    const event = await eventService.createEvent(req.user._id, {
      title,
      description,
      startDate,
      endDate,
      allDay,
      timezone,
      recurrence,
      location,
      meetingUrl,
      area,
      color,
      reminders,
      lifeAreaId,
      projectId,
    });

    res.status(201).json({ event });
  } catch (error) {
    attachError(req, error, { operation: 'event_create' });

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR',
      });
    }

    res.status(500).json({
      error: 'Failed to create event',
      code: 'CREATE_EVENT_ERROR',
    });
  }
});

/**
 * GET /events/:id
 * Get a single event
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const event = await eventService.getEvent(req.params.id, req.user._id);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND',
      });
    }

    res.json({ event });
  } catch (error) {
    attachError(req, error, { operation: 'event_fetch', eventId: req.params.id });
    res.status(500).json({
      error: 'Failed to get event',
      code: 'GET_EVENT_ERROR',
    });
  }
});

/**
 * PATCH /events/:id
 * Update an event
 */
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const event = await eventService.updateEvent(req.params.id, req.user._id, req.body);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND',
      });
    }

    res.json({ event });
  } catch (error) {
    attachError(req, error, { operation: 'event_update', eventId: req.params.id });

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR',
      });
    }

    res.status(500).json({
      error: 'Failed to update event',
      code: 'UPDATE_EVENT_ERROR',
    });
  }
});

/**
 * DELETE /events/:id
 * Delete an event
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const event = await eventService.deleteEvent(req.params.id, req.user._id);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND',
      });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    attachError(req, error, { operation: 'event_delete', eventId: req.params.id });
    res.status(500).json({
      error: 'Failed to delete event',
      code: 'DELETE_EVENT_ERROR',
    });
  }
});

/**
 * POST /events/:id/link-task
 * Link a task to an event
 */
router.post('/:id/link-task', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.body;

    if (!taskId) {
      return res.status(400).json({
        error: 'Task ID is required',
        code: 'MISSING_TASK_ID',
      });
    }

    const event = await eventService.linkTask(req.params.id, req.user._id, taskId);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND',
      });
    }

    res.json({ event });
  } catch (error) {
    attachError(req, error, { operation: 'event_link_task', eventId: req.params.id });
    res.status(500).json({
      error: 'Failed to link task',
      code: 'LINK_TASK_ERROR',
    });
  }
});

/**
 * DELETE /events/:id/link-task/:taskId
 * Unlink a task from an event
 */
router.delete('/:id/link-task/:taskId', requireAuth, async (req, res) => {
  try {
    const event = await eventService.unlinkTask(req.params.id, req.user._id, req.params.taskId);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND',
      });
    }

    res.json({ event });
  } catch (error) {
    attachError(req, error, { operation: 'event_unlink_task', eventId: req.params.id });
    res.status(500).json({
      error: 'Failed to unlink task',
      code: 'UNLINK_TASK_ERROR',
    });
  }
});

/**
 * POST /events/:id/link-note
 * Link a note to an event
 */
router.post('/:id/link-note', requireAuth, async (req, res) => {
  try {
    const { noteId } = req.body;

    if (!noteId) {
      return res.status(400).json({
        error: 'Note ID is required',
        code: 'MISSING_NOTE_ID',
      });
    }

    const event = await eventService.linkNote(req.params.id, req.user._id, noteId);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND',
      });
    }

    res.json({ event });
  } catch (error) {
    attachError(req, error, { operation: 'event_link_note', eventId: req.params.id });
    res.status(500).json({
      error: 'Failed to link note',
      code: 'LINK_NOTE_ERROR',
    });
  }
});

/**
 * DELETE /events/:id/link-note/:noteId
 * Unlink a note from an event
 */
router.delete('/:id/link-note/:noteId', requireAuth, async (req, res) => {
  try {
    const event = await eventService.unlinkNote(req.params.id, req.user._id, req.params.noteId);

    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND',
      });
    }

    res.json({ event });
  } catch (error) {
    attachError(req, error, { operation: 'event_unlink_note', eventId: req.params.id });
    res.status(500).json({
      error: 'Failed to unlink note',
      code: 'UNLINK_NOTE_ERROR',
    });
  }
});

export default router;
