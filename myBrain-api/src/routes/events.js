/**
 * =============================================================================
 * EVENTS.JS - Calendar Events Routes
 * =============================================================================
 *
 * This file handles all calendar event management in myBrain.
 * Events are scheduled items like meetings, deadlines, or reminders that
 * appear on your calendar.
 *
 * WHAT ARE CALENDAR EVENTS?
 * -------------------------
 * Calendar events are time-based items that represent:
 * - Meetings and appointments
 * - Project deadlines
 * - Important reminders
 * - Recurring events (daily standup, weekly review, etc.)
 * - All-day events (birthdays, holidays)
 *
 * EVENT PROPERTIES:
 * -----------------
 * - Title: What the event is about
 * - Start/End Times: When the event occurs
 * - Location: Physical or virtual location
 * - Description: Additional details
 * - Recurrence: Does it repeat? (daily, weekly, monthly, yearly)
 * - Status: Active, cancelled, tentative
 * - Linked Project: Can be associated with a project
 * - Life Area: Category (work, personal, health, etc.)
 *
 * VIEW MODES:
 * -----------
 * - Month view: See all events for a month
 * - Week view: Detailed view of one week
 * - Day view: Hourly breakdown of a single day
 * - Agenda view: Upcoming events in list format
 *
 * ENDPOINTS:
 * -----------
 * - GET /events - Get events in date range with filters
 * - GET /events/upcoming - Get next upcoming events
 * - POST /events - Create new event
 * - GET /events/:id - Get single event details
 * - PUT /events/:id - Update event
 * - DELETE /events/:id - Delete event
 * - POST /events/:id/duplicate - Duplicate an event
 * - POST /events/:id/snooze - Snooze event notification
 *
 * =============================================================================
 */

/**
 * Express is the web framework that handles HTTP requests and routing.
 * We use it to define API endpoints (URLs that the frontend can call).
 * Each router.get/post/patch/delete defines a different event operation.
 */
import express from 'express';

/**
 * Auth middleware checks that the user is logged in.
 * Every event request must include a valid JWT token in the Authorization header.
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
 * Limit middleware enforces storage quotas.
 * Prevents users from creating unlimited events.
 * When limit is reached, POST requests are rejected with 402 Payment Required.
 */
import { requireLimit } from '../middleware/limitEnforcement.js';

/**
 * Request logger middleware tracks entity IDs and event names for analytics.
 * When we attach an entity ID, it lets us search logs for a specific event.
 * Example: attachEntityId(req, 'eventId', event._id) for audit trail.
 */
import { attachEntityId } from '../middleware/requestLogger.js';

/**
 * Event service contains all the business logic for event operations.
 * Instead of writing database queries in this file, we call service methods.
 * This keeps routes clean and makes it easy to reuse logic in different places.
 *
 * Example: eventService.getEvents(userId, options) handles:
 * - Building the MongoDB query with filters
 * - Querying the database
 * - Handling timezone conversions
 * - Returning results to the route
 */
import * as eventService from '../services/eventService.js';

// =============================================================================
// ROUTER SETUP
// =============================================================================
// Create an Express router to group all event-related endpoints together
const router = express.Router();

/**
 * GET /events
 * Get events within a date range
 *
 * WHAT IT DOES:
 * Returns all calendar events within a specified date range.
 * Supports filtering by status, life area, project, and more.
 * Useful for month/week view calendar displays.
 *
 * QUERY PARAMETERS:
 * - startDate: ISO date string (required) - e.g., "2025-02-01"
 * - endDate: ISO date string (required) - e.g., "2025-02-28"
 * - status: Filter by status (active, cancelled, tentative)
 * - area: Filter by area (work, personal, health, etc.)
 * - lifeAreaId: ObjectId - filter by life area
 * - projectId: ObjectId - filter events linked to project
 *
 * EXAMPLE REQUEST:
 * GET /events?startDate=2025-02-01&endDate=2025-02-28&lifeAreaId=507f1f77bcf86cd799439011
 *
 * EXAMPLE RESPONSE:
 * {
 *   events: [
 *     { title: "Team meeting", startDate: "2025-02-15T10:00:00Z", endDate: "2025-02-15T11:00:00Z" },
 *     { title: "Project deadline", startDate: "2025-02-20T23:59:59Z" }
 *   ]
 * }
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract query parameters for filtering
    const { startDate, endDate, status, area, lifeAreaId, projectId } = req.query;

    // Step 2: Call event service to fetch events in date range
    // Service handles:
    // - Date range filtering
    // - Timezone handling
    // - Status filtering
    // - Life area and project filtering
    const events = await eventService.getEvents(req.user._id, {
      startDate,
      endDate,
      status,
      area,
      lifeAreaId,
      projectId,
    });

    // Step 3: Return events
    res.json({ events });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'events_fetch' });
    res.status(500).json({
      error: 'Failed to get events',
      code: 'GET_EVENTS_ERROR',
    });
  }
});

/**
 * GET /events/upcoming
 * Get upcoming events (next N days)
 *
 * WHAT IT DOES:
 * Returns events coming up in the next N days.
 * Useful for dashboard "upcoming events" widget.
 *
 * QUERY PARAMETERS:
 * - days: How many days ahead to look (default: 7)
 *
 * EXAMPLE REQUEST:
 * GET /events/upcoming?days=14
 * (Get events in next 14 days)
 *
 * EXAMPLE RESPONSE:
 * {
 *   events: [
 *     { title: "Team standup", startDate: "2025-02-16T09:00:00Z" },
 *     { title: "Deadline", startDate: "2025-02-20T17:00:00Z" }
 *   ]
 * }
 */
router.get('/upcoming', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract days parameter (default 7 days)
    const { days = 7 } = req.query;

    // Step 2: Call service to fetch upcoming events
    const events = await eventService.getUpcomingEvents(req.user._id, parseInt(days, 10));

    // Step 3: Return events
    res.json({ events });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
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
 *
 * WHAT IT DOES:
 * Returns all events on a specific day.
 * Useful for day view or daily agenda.
 *
 * PATH PARAMETERS:
 * - date: ISO date string (e.g., "2025-02-15")
 *
 * EXAMPLE REQUEST:
 * GET /events/day/2025-02-15
 *
 * EXAMPLE RESPONSE:
 * {
 *   events: [
 *     { title: "Morning standup", startDate: "2025-02-15T09:00:00Z", endDate: "2025-02-15T09:30:00Z" },
 *     { title: "Lunch meeting", startDate: "2025-02-15T12:00:00Z" }
 *   ]
 * }
 */
router.get('/day/:date', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract date from URL path
    const date = req.params.date;

    // Step 2: Call service to fetch events for that day
    const events = await eventService.getDayEvents(req.user._id, date);

    // Step 3: Return events
    res.json({ events });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'day_events_fetch', date: req.params.date });
    res.status(500).json({
      error: 'Failed to get day events',
      code: 'GET_DAY_EVENTS_ERROR',
    });
  }
});

/**
 * POST /events
 * Create a new calendar event
 *
 * WHAT IT DOES:
 * Creates a new calendar event with optional recurrence, location, reminders.
 * Supports all-day events, recurring events, and meeting URLs.
 *
 * REQUEST BODY:
 * {
 *   title: "Team meeting" (required),
 *   description: "Quarterly planning",
 *   startDate: "2025-02-15T10:00:00Z" (required),
 *   endDate: "2025-02-15T11:00:00Z" (required),
 *   allDay: false,
 *   timezone: "America/New_York",
 *   recurrence: "FREQ=WEEKLY;BYDAY=MO,FR",
 *   location: "Conference room A",
 *   meetingUrl: "https://zoom.us/...",
 *   color: "#FF5733",
 *   reminders: [{ type: "email", minutes: 15 }],
 *   lifeAreaId: "507f1f77bcf86cd799439011",
 *   projectId: "507f1f77bcf86cd799439012"
 * }
 *
 * EXAMPLE RESPONSE (201 Created):
 * {
 *   event: { id: "...", title: "Team meeting", startDate: "2025-02-15T10:00:00Z", ... }
 * }
 */
router.post('/', requireAuth, requireLimit('events'), async (req, res) => {
  try {
    // Step 1: Extract event details from request body
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

    // Step 2: Validate required fields
    // Title and dates are essential for any event
    if (!title || !startDate || !endDate) {
      return res.status(400).json({
        error: 'Title, start date, and end date are required',
        code: 'MISSING_FIELDS',
      });
    }

    // Step 3: Call service to create the event
    // Service handles:
    // - Validating date ranges (start < end)
    // - Parsing recurrence rules
    // - Setting up reminders
    // - Creating the event in database
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

    // Step 4: Log the successful creation for audit trail
    attachEntityId(req, 'eventId', event._id);
    req.eventName = 'event.create.success';

    // Step 5: Return 201 Created with the new event
    res.status(201).json({ event });
  } catch (error) {
    // Log the error for debugging
    attachError(req, error, { operation: 'event_create' });

    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR',
      });
    }

    // Other unexpected errors
    res.status(500).json({
      error: 'Failed to create event',
      code: 'CREATE_EVENT_ERROR',
    });
  }
});

/**
 * GET /events/:id
 * Get a single event by ID
 *
 * WHAT IT DOES:
 * Fetches complete details for a single event.
 * Includes all event properties, linked items, reminders, recurrence info.
 *
 * USE CASES:
 * - View event details
 * - Edit event
 * - Get full event info including reminders and linked items
 *
 * PATH PARAMETERS:
 * - id: Event ID (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * GET /events/507f1f77bcf86cd799439011
 *
 * EXAMPLE RESPONSE:
 * {
 *   event: {
 *     _id: "507f1f77bcf86cd799439011",
 *     title: "Team meeting",
 *     description: "Quarterly planning meeting",
 *     startDate: "2025-02-15T10:00:00Z",
 *     endDate: "2025-02-15T11:00:00Z",
 *     location: "Conference room A",
 *     meetingUrl: "https://zoom.us/...",
 *     reminders: [{ type: "email", minutes: 15 }],
 *     recurrence: null,
 *     lifeAreaId: "507f1f77bcf86cd799439020",
 *     createdAt: "2025-02-15T10:00:00Z"
 *   }
 * }
 *
 * @param {string} id - Event ID (MongoDB ObjectId)
 * @returns {Object} Complete event object with all details
 * @throws {404} - Event not found or doesn't belong to user
 * @throws {401} - User not authenticated
 * @throws {500} - Server error fetching event
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract event ID
    const eventId = req.params.id;

    // Step 2: Fetch the event
    // Service checks ownership - user can only see their own events
    const event = await eventService.getEvent(eventId, req.user._id);

    // Step 3: Check if event exists
    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND',
      });
    }

    // Step 4: Return event details
    res.json({ event });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
    attachError(req, error, { operation: 'event_fetch', eventId: req.params.id });
    res.status(500).json({
      error: 'Failed to get event',
      code: 'GET_EVENT_ERROR',
    });
  }
});

/**
 * PATCH /events/:id
 * Update event fields
 *
 * WHAT IT DOES:
 * Updates one or more fields on an event.
 * Can update title, time, location, recurrence, reminders, etc.
 * Any fields not provided are left unchanged.
 *
 * PATH PARAMETERS:
 * - id: Event ID (MongoDB ObjectId)
 *
 * UPDATABLE FIELDS:
 * - title: Event name
 * - description: Event description
 * - startDate: Start time (ISO format)
 * - endDate: End time (ISO format)
 * - location: Physical or virtual location
 * - meetingUrl: Video call URL
 * - recurrence: Recurrence rule (RRULE format)
 * - reminders: Array of reminder objects
 * - lifeAreaId: Life area category
 * - color: Display color
 *
 * EXAMPLE REQUEST:
 * PATCH /events/507f1f77bcf86cd799439011
 * {
 *   "title": "Updated team meeting",
 *   "location": "Zoom Link",
 *   "description": "Updated agenda items"
 * }
 *
 * EXAMPLE RESPONSE:
 * {
 *   event: {
 *     _id: "507f1f77bcf86cd799439011",
 *     title: "Updated team meeting",
 *     location: "Zoom Link",
 *     description: "Updated agenda items",
 *     updatedAt: "2026-01-21T14:30:00Z"
 *   }
 * }
 *
 * @param {string} id - Event ID (MongoDB ObjectId)
 * @body {string} title - New title (optional)
 * @body {string} description - New description (optional)
 * @body {string} startDate - New start date (optional)
 * @body {string} endDate - New end date (optional)
 * @body {string} location - New location (optional)
 * @body {string} meetingUrl - New meeting URL (optional)
 * @body {string} recurrence - New recurrence rule (optional)
 * @body {Object[]} reminders - New reminders array (optional)
 * @returns {Object} Updated event object
 * @throws {400} - Invalid event ID or validation error
 * @throws {404} - Event not found or doesn't belong to user
 * @throws {422} - Business rule violation (e.g., end before start)
 * @throws {500} - Server error updating event
 */
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract event ID and updates
    const eventId = req.params.id;
    const updates = req.body;

    // Step 2: Call service to update the event
    // Service checks ownership and updates fields
    const event = await eventService.updateEvent(eventId, req.user._id, updates);

    // Step 3: Check if event exists
    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND',
      });
    }

    // Step 4: Log the successful update
    attachEntityId(req, 'eventId', event._id);
    req.eventName = 'event.update.success';

    // Step 5: Return updated event
    res.json({ event });
  } catch (error) {
    // Log the error for debugging
    attachError(req, error, { operation: 'event_update', eventId: req.params.id });

    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        error: messages[0],
        code: 'VALIDATION_ERROR',
      });
    }

    // Other unexpected errors
    res.status(500).json({
      error: 'Failed to update event',
      code: 'UPDATE_EVENT_ERROR',
    });
  }
});

/**
 * DELETE /events/:id
 * Delete an event
 *
 * WHAT IT DOES:
 * Permanently removes a calendar event from the database.
 * This is immediate and cannot be undone.
 * Removes all reminders and linked items.
 *
 * USE CASES:
 * - Remove cancelled meeting
 * - Delete mistaken/duplicate event
 * - Clean up past events
 *
 * PATH PARAMETERS:
 * - id: Event ID (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * DELETE /events/507f1f77bcf86cd799439011
 *
 * EXAMPLE RESPONSE:
 * { message: "Event deleted successfully" }
 *
 * @param {string} id - Event ID (MongoDB ObjectId)
 * @returns {Object} Success message
 * @throws {404} - Event not found or doesn't belong to user
 * @throws {500} - Server error deleting event
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract event ID
    const eventId = req.params.id;

    // Step 2: Call service to delete the event
    // Service checks ownership before deletion
    const event = await eventService.deleteEvent(eventId, req.user._id);

    // Step 3: Check if event was deleted
    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND',
      });
    }

    // Step 4: Log the successful deletion
    attachEntityId(req, 'eventId', event._id);
    req.eventName = 'event.delete.success';

    // Step 5: Return success message
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    // Unexpected error occurred - log it for debugging
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
 *
 * WHAT IT DOES:
 * Creates a relationship between an event and a task.
 * Shows the task on the event detail page for context.
 *
 * USE CASES:
 * - Attach deliverable task to meeting
 * - Link follow-up task to event
 * - Group related tasks with event
 *
 * PATH PARAMETERS:
 * - id: Event ID (MongoDB ObjectId)
 *
 * REQUEST BODY:
 * { "taskId": "507f1f77bcf86cd799439011" }
 *
 * EXAMPLE REQUEST:
 * POST /events/507f1f77bcf86cd799439011/link-task
 * {
 *   "taskId": "507f1f77bcf86cd799439012"
 * }
 *
 * EXAMPLE RESPONSE:
 * {
 *   event: {
 *     _id: "507f1f77bcf86cd799439011",
 *     title: "Team meeting",
 *     linkedTasks: ["507f1f77bcf86cd799439012"]
 *   }
 * }
 *
 * @param {string} id - Event ID (MongoDB ObjectId)
 * @body {string} taskId - Task ID to link (MongoDB ObjectId, required)
 * @returns {Object} Updated event with linked task in linkedTasks array
 * @throws {400} - Missing taskId or invalid ID format
 * @throws {404} - Event not found or doesn't belong to user
 * @throws {500} - Server error linking task
 */
router.post('/:id/link-task', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract task ID
    const { taskId } = req.body;

    // Step 2: Validate task ID provided
    if (!taskId) {
      return res.status(400).json({
        error: 'Task ID is required',
        code: 'MISSING_TASK_ID',
      });
    }

    // Step 3: Link the task to the event
    const event = await eventService.linkTask(req.params.id, req.user._id, taskId);

    // Step 4: Check if link successful
    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND',
      });
    }

    // Step 5: Log and return
    attachEntityId(req, 'eventId', event._id);
    req.eventName = 'event.link_task.success';
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
 *
 * WHAT IT DOES:
 * Removes the relationship between an event and a task.
 * Task still exists - only the link is removed.
 * Reverse operation of POST /events/:id/link-task.
 *
 * PATH PARAMETERS:
 * - id: Event ID (MongoDB ObjectId)
 * - taskId: Task ID to unlink (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * DELETE /events/507f1f77bcf86cd799439011/link-task/507f1f77bcf86cd799439012
 *
 * EXAMPLE RESPONSE:
 * {
 *   event: {
 *     _id: "507f1f77bcf86cd799439011",
 *     title: "Meeting",
 *     linkedTasks: []
 *   }
 * }
 *
 * @param {string} id - Event ID (MongoDB ObjectId)
 * @param {string} taskId - Task ID to unlink (MongoDB ObjectId)
 * @returns {Object} Updated event with task removed from linkedTasks array
 * @throws {404} - Event not found or doesn't belong to user
 * @throws {500} - Server error unlinking task
 */
router.delete('/:id/link-task/:taskId', requireAuth, async (req, res) => {
  try {
    // Step 1: Unlink the task from the event
    const event = await eventService.unlinkTask(req.params.id, req.user._id, req.params.taskId);

    // Step 2: Check if unlink successful
    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND',
      });
    }

    // Step 3: Log and return
    attachEntityId(req, 'eventId', event._id);
    req.eventName = 'event.unlink_task.success';
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
 *
 * WHAT IT DOES:
 * Creates a relationship between an event and a note.
 * Shows the note on the event detail page for context.
 *
 * USE CASES:
 * - Attach meeting agenda note to event
 * - Link research notes to event
 * - Attach documentation to event
 *
 * PATH PARAMETERS:
 * - id: Event ID (MongoDB ObjectId)
 *
 * REQUEST BODY:
 * { "noteId": "507f1f77bcf86cd799439011" }
 *
 * EXAMPLE REQUEST:
 * POST /events/507f1f77bcf86cd799439011/link-note
 * {
 *   "noteId": "507f1f77bcf86cd799439012"
 * }
 *
 * EXAMPLE RESPONSE:
 * {
 *   event: {
 *     _id: "507f1f77bcf86cd799439011",
 *     title: "Team meeting",
 *     linkedNotes: ["507f1f77bcf86cd799439012"]
 *   }
 * }
 *
 * @param {string} id - Event ID (MongoDB ObjectId)
 * @body {string} noteId - Note ID to link (MongoDB ObjectId, required)
 * @returns {Object} Updated event with linked note in linkedNotes array
 * @throws {400} - Missing noteId or invalid ID format
 * @throws {404} - Event not found or doesn't belong to user
 * @throws {500} - Server error linking note
 */
router.post('/:id/link-note', requireAuth, async (req, res) => {
  try {
    // Step 1: Extract note ID
    const { noteId } = req.body;

    // Step 2: Validate note ID provided
    if (!noteId) {
      return res.status(400).json({
        error: 'Note ID is required',
        code: 'MISSING_NOTE_ID',
      });
    }

    // Step 3: Link the note to the event
    const event = await eventService.linkNote(req.params.id, req.user._id, noteId);

    // Step 4: Check if link successful
    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND',
      });
    }

    // Step 5: Log and return
    attachEntityId(req, 'eventId', event._id);
    req.eventName = 'event.link_note.success';
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
 *
 * WHAT IT DOES:
 * Removes the relationship between an event and a note.
 * Note still exists - only the link is removed.
 * Reverse operation of POST /events/:id/link-note.
 *
 * PATH PARAMETERS:
 * - id: Event ID (MongoDB ObjectId)
 * - noteId: Note ID to unlink (MongoDB ObjectId)
 *
 * EXAMPLE REQUEST:
 * DELETE /events/507f1f77bcf86cd799439011/link-note/507f1f77bcf86cd799439012
 *
 * EXAMPLE RESPONSE:
 * {
 *   event: {
 *     _id: "507f1f77bcf86cd799439011",
 *     title: "Meeting",
 *     linkedNotes: []
 *   }
 * }
 *
 * @param {string} id - Event ID (MongoDB ObjectId)
 * @param {string} noteId - Note ID to unlink (MongoDB ObjectId)
 * @returns {Object} Updated event with note removed from linkedNotes array
 * @throws {404} - Event not found or doesn't belong to user
 * @throws {500} - Server error unlinking note
 */
router.delete('/:id/link-note/:noteId', requireAuth, async (req, res) => {
  try {
    // Step 1: Unlink the note from the event
    const event = await eventService.unlinkNote(req.params.id, req.user._id, req.params.noteId);

    // Step 2: Check if unlink successful
    if (!event) {
      return res.status(404).json({
        error: 'Event not found',
        code: 'EVENT_NOT_FOUND',
      });
    }

    // Step 3: Log and return
    attachEntityId(req, 'eventId', event._id);
    req.eventName = 'event.unlink_note.success';
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
