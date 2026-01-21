/**
 * =============================================================================
 * EVENTSERVICE.JS - Calendar Event Management Service
 * =============================================================================
 *
 * This service handles all business logic for calendar events in myBrain.
 * It supports single events, recurring events, linked tasks/notes, and more.
 *
 * WHAT ARE EVENTS?
 * ----------------
 * Events are time-bound items on a calendar. They have:
 * - Start and end dates/times
 * - Optional recurrence rules
 * - Links to tasks and notes
 * - Location and meeting URLs
 *
 * KEY FEATURES:
 * -------------
 * 1. CRUD: Create, read, update, delete events
 * 2. DATE RANGE QUERIES: Get events within a specific period
 * 3. RECURRING EVENTS: Daily, weekly, monthly, yearly repetition
 * 4. LINKED ITEMS: Connect tasks and notes to events
 * 5. TIME ZONES: Support for different time zones
 *
 * RECURRENCE SYSTEM:
 * ------------------
 * Events can repeat on a schedule:
 * - Daily: Every N days
 * - Weekly: Every N weeks on specific days
 * - Monthly: Every N months
 * - Yearly: Every N years
 *
 * When querying, recurring events are "expanded" into individual
 * occurrences within the requested date range.
 *
 * DATE RANGE QUERIES:
 * -------------------
 * The getEvents function handles complex date range logic:
 * - Events that START within the range
 * - Events that END within the range
 * - Events that SPAN the entire range
 * - Recurring events that have occurrences in the range
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Event model - The MongoDB schema for calendar events.
 */
import Event from '../models/Event.js';

/**
 * Usage tracking service for the intelligent dashboard.
 * Tracks creates, views, and edits.
 */
import { trackCreate, trackView, trackEdit } from './usageService.js';

// =============================================================================
// CREATE EVENT
// =============================================================================

/**
 * createEvent(userId, eventData)
 * ------------------------------
 * Creates a new calendar event.
 *
 * @param {ObjectId} userId - The user creating the event
 * @param {Object} eventData - Event data
 *   - eventData.title: Event title (required)
 *   - eventData.startDate: Start date/time (required)
 *   - eventData.endDate: End date/time (optional)
 *   - eventData.allDay: Is this an all-day event? (optional)
 *   - eventData.description: Event description (optional)
 *   - eventData.location: Physical location (optional)
 *   - eventData.meetingUrl: Virtual meeting link (optional)
 *   - eventData.recurrence: Recurrence rules (optional)
 *   - eventData.reminders: Reminder settings (optional)
 *   - eventData.linkedTasks: Array of task IDs (optional)
 *   - eventData.linkedNotes: Array of note IDs (optional)
 *   - eventData.lifeAreaId: Associated life area (optional)
 *   - eventData.projectId: Associated project (optional)
 *
 * @returns {Object} The created Event document
 *
 * EXAMPLE:
 * ```javascript
 * const event = await createEvent(userId, {
 *   title: 'Team Meeting',
 *   startDate: new Date('2024-01-15T10:00:00'),
 *   endDate: new Date('2024-01-15T11:00:00'),
 *   meetingUrl: 'https://zoom.us/j/123456',
 *   recurrence: {
 *     frequency: 'weekly',
 *     interval: 1,
 *     daysOfWeek: [1, 3, 5]  // Mon, Wed, Fri
 *   }
 * });
 * ```
 */
export async function createEvent(userId, eventData) {
  // Create the event document with user ID
  const event = await Event.create({
    userId,
    ...eventData,
  });

  // Track usage for intelligent dashboard
  trackCreate(userId, 'events');

  return event;
}

// =============================================================================
// GET EVENTS (WITH DATE RANGE)
// =============================================================================

/**
 * getEvents(userId, options)
 * --------------------------
 * Gets events within a date range with optional filters.
 *
 * @param {ObjectId} userId - The user whose events to retrieve
 * @param {Object} options - Query options
 *   - options.startDate: Range start (ISO string or Date)
 *   - options.endDate: Range end (ISO string or Date)
 *   - options.status: Filter by status ('confirmed', 'tentative', 'cancelled')
 *   - options.area: Filter by area (legacy field)
 *   - options.lifeAreaId: Filter by life area
 *   - options.projectId: Filter by project
 *
 * @returns {Array} Array of Event documents (with recurring events expanded)
 *
 * DATE RANGE MATCHING:
 * -------------------
 * An event matches a date range if ANY of these are true:
 * 1. Event STARTS within the range
 * 2. Event ENDS within the range
 * 3. Event SPANS the entire range (started before, ends after)
 * 4. Recurring event has occurrences in the range
 *
 * RECURRING EVENT EXPANSION:
 * When a recurring event matches, we generate all occurrences
 * within the requested date range. Each occurrence becomes a
 * separate object with isRecurringInstance: true.
 *
 * EXAMPLE:
 * ```javascript
 * // Get all events for this week
 * const events = await getEvents(userId, {
 *   startDate: '2024-01-15T00:00:00Z',
 *   endDate: '2024-01-21T23:59:59Z',
 *   status: 'confirmed'
 * });
 * ```
 */
export async function getEvents(userId, options = {}) {
  const { startDate, endDate, status, area, lifeAreaId, projectId } = options;

  // Build base query - always filter by user
  const query = { userId };

  // =========================================================================
  // DATE RANGE FILTER
  // =========================================================================
  // This is complex because we need to find events that overlap with the
  // requested range in ANY way - not just events that start within it.

  if (startDate || endDate) {
    query.$or = [
      // Case 1: Events that START within the range
      {
        startDate: {
          ...(startDate && { $gte: new Date(startDate) }),
          ...(endDate && { $lte: new Date(endDate) }),
        },
      },
      // Case 2: Events that END within the range
      {
        endDate: {
          ...(startDate && { $gte: new Date(startDate) }),
          ...(endDate && { $lte: new Date(endDate) }),
        },
      },
      // Case 3: Events that SPAN the entire range
      // (started before range start, ends after range end)
      {
        startDate: { $lte: new Date(startDate || new Date()) },
        endDate: { $gte: new Date(endDate || new Date()) },
      },
      // Case 4: Recurring events that might have occurrences in the range
      // We fetch these and expand them later
      {
        recurrence: { $exists: true, $ne: null },
        startDate: { $lte: new Date(endDate || new Date()) },
        $or: [
          { 'recurrence.endDate': { $exists: false } },  // No end date (infinite)
          { 'recurrence.endDate': null },                // Explicitly null
          { 'recurrence.endDate': { $gte: new Date(startDate || new Date()) } },  // End date in future
        ],
      },
    ];
  }

  // =========================================================================
  // ADDITIONAL FILTERS
  // =========================================================================

  if (status) {
    query.status = status;
  }

  if (area) {
    query.area = area;
  }

  if (lifeAreaId) {
    query.lifeAreaId = lifeAreaId;
  }

  if (projectId) {
    query.projectId = projectId;
  }

  // =========================================================================
  // EXECUTE QUERY
  // =========================================================================

  const events = await Event.find(query)
    .sort({ startDate: 1 })  // Sort by start date ascending
    .populate('linkedTasks', 'title status priority')  // Include basic task info
    .populate('linkedNotes', 'title');  // Include basic note info

  // =========================================================================
  // EXPAND RECURRING EVENTS
  // =========================================================================
  // For each recurring event, generate all occurrences within the date range

  const expandedEvents = [];

  for (const event of events) {
    if (event.recurrence && startDate && endDate) {
      // Generate occurrences for this recurring event
      const occurrences = generateRecurringOccurrences(
        event,
        new Date(startDate),
        new Date(endDate)
      );
      expandedEvents.push(...occurrences);
    } else {
      // Non-recurring event - add as-is
      expandedEvents.push(event);
    }
  }

  return expandedEvents;
}

// =============================================================================
// RECURRING EVENT HELPERS
// =============================================================================

/**
 * generateRecurringOccurrences(event, rangeStart, rangeEnd)
 * ---------------------------------------------------------
 * Generates all occurrences of a recurring event within a date range.
 *
 * @param {Object} event - The recurring Event document
 * @param {Date} rangeStart - Start of the date range
 * @param {Date} rangeEnd - End of the date range
 *
 * @returns {Array} Array of occurrence objects
 *
 * HOW IT WORKS:
 * 1. Start from the event's original start date
 * 2. Iterate forward using recurrence rules
 * 3. Create an occurrence for each date within the range
 * 4. Skip any dates marked as exceptions
 * 5. Stop when past the range or max occurrences
 *
 * SPECIAL HANDLING FOR WEEKLY WITH DAYS:
 * When frequency is 'weekly' with specific daysOfWeek,
 * we iterate day-by-day and only create occurrences
 * on the selected days.
 */
function generateRecurringOccurrences(event, rangeStart, rangeEnd) {
  const occurrences = [];
  const { recurrence } = event;

  // No recurrence rules? Return the event as-is
  if (!recurrence) return [event];

  // Calculate how long each occurrence lasts
  const eventDuration = event.endDate - event.startDate;

  // Start from the original event date
  let currentDate = new Date(event.startDate);

  // Counter to prevent infinite loops
  let count = 0;
  const maxOccurrences = recurrence.count || 365;  // Default max: 365 occurrences

  // Check if this is weekly with specific days selected
  const isWeeklyWithDays = recurrence.frequency === 'weekly' && recurrence.daysOfWeek?.length > 0;

  // =========================================================================
  // GENERATE OCCURRENCES
  // =========================================================================

  while (currentDate <= rangeEnd && count < maxOccurrences) {
    // Check if this date is an exception (excluded from the series)
    const isException = recurrence.exceptions?.some(
      (exc) => new Date(exc).toDateString() === currentDate.toDateString()
    );

    // Check if recurrence has ended
    if (recurrence.endDate && currentDate > new Date(recurrence.endDate)) {
      break;
    }

    // Check if this occurrence falls within our query range
    if (currentDate >= rangeStart && !isException) {
      if (isWeeklyWithDays) {
        // For weekly with specific days, only add if it's a selected day
        // getDay() returns 0=Sunday, 1=Monday, etc.
        if (recurrence.daysOfWeek.includes(currentDate.getDay())) {
          occurrences.push(createOccurrence(event, currentDate, eventDuration));
        }
      } else {
        // Regular recurrence - add this occurrence
        occurrences.push(createOccurrence(event, currentDate, eventDuration));
      }
    }

    // Move to the next potential occurrence date
    if (isWeeklyWithDays) {
      // For weekly with specific days, advance one day at a time
      currentDate.setDate(currentDate.getDate() + 1);
    } else {
      // For other frequencies, use the recurrence interval
      currentDate = getNextOccurrence(currentDate, recurrence);
    }
    count++;
  }

  return occurrences;
}

/**
 * createOccurrence(event, startDate, duration)
 * --------------------------------------------
 * Creates a single occurrence object from a recurring event.
 *
 * @param {Object} event - The parent recurring Event
 * @param {Date} startDate - Start date for this occurrence
 * @param {number} duration - Duration in milliseconds
 *
 * @returns {Object} An occurrence object with adjusted dates
 *
 * OCCURRENCE OBJECT:
 * - All properties from the original event
 * - startDate/endDate adjusted for this occurrence
 * - isRecurringInstance: true (to identify as an occurrence)
 * - originalEventId: Reference to the parent event
 */
function createOccurrence(event, startDate, duration) {
  // Convert to plain object so we can modify it
  const occurrence = event.toObject();

  // Set this occurrence's specific dates
  occurrence.startDate = new Date(startDate);
  occurrence.endDate = new Date(startDate.getTime() + duration);

  // Mark as a recurring instance (not the original event)
  occurrence.isRecurringInstance = true;

  // Reference to the original recurring event
  occurrence.originalEventId = event._id;

  return occurrence;
}

/**
 * getNextOccurrence(currentDate, recurrence)
 * ------------------------------------------
 * Calculates the next occurrence date based on recurrence rules.
 *
 * @param {Date} currentDate - The current occurrence date
 * @param {Object} recurrence - Recurrence rules
 *   - recurrence.frequency: 'daily', 'weekly', 'monthly', 'yearly'
 *   - recurrence.interval: Number of units between occurrences
 *
 * @returns {Date} The next occurrence date
 *
 * EXAMPLES:
 * - Daily, interval=1: Tomorrow
 * - Weekly, interval=2: Two weeks from now
 * - Monthly, interval=1: Same day next month
 * - Yearly, interval=1: Same day next year
 */
function getNextOccurrence(currentDate, recurrence) {
  const next = new Date(currentDate);
  const interval = recurrence.interval || 1;

  switch (recurrence.frequency) {
    case 'daily':
      // Add N days
      next.setDate(next.getDate() + interval);
      break;
    case 'weekly':
      // Add N weeks (7 days * interval)
      next.setDate(next.getDate() + (7 * interval));
      break;
    case 'monthly':
      // Add N months
      next.setMonth(next.getMonth() + interval);
      break;
    case 'yearly':
      // Add N years
      next.setFullYear(next.getFullYear() + interval);
      break;
  }

  return next;
}

// =============================================================================
// GET SINGLE EVENT
// =============================================================================

/**
 * getEvent(eventId, userId)
 * -------------------------
 * Gets a single event by its ID.
 *
 * @param {ObjectId} eventId - The event's unique ID
 * @param {ObjectId} userId - The user who owns the event
 *
 * @returns {Object|null} The Event document with populated links, or null
 *
 * POPULATES:
 * - linkedTasks: Basic task info (title, status, priority)
 * - linkedNotes: Basic note info (title)
 */
export async function getEvent(eventId, userId) {
  const event = await Event.findOne({ _id: eventId, userId })
    .populate('linkedTasks', 'title status priority')
    .populate('linkedNotes', 'title');
  return event;
}

// =============================================================================
// UPDATE EVENT
// =============================================================================

/**
 * updateEvent(eventId, userId, updates)
 * -------------------------------------
 * Updates an event with new data.
 *
 * @param {ObjectId} eventId - The event to update
 * @param {ObjectId} userId - The user who owns the event
 * @param {Object} updates - Fields to update
 *
 * @returns {Object|null} The updated Event document, or null
 *
 * ALLOWED UPDATES:
 * Only specific fields can be updated to prevent accidental
 * modification of system fields like _id or userId.
 *
 * NOTE ON RECURRING EVENTS:
 * Updating a recurring event affects ALL future occurrences.
 * Individual occurrence editing is not yet supported.
 */
export async function updateEvent(eventId, userId, updates) {
  // List of fields that can be updated
  const allowedUpdates = [
    'title', 'description', 'startDate', 'endDate', 'allDay', 'timezone',
    'recurrence', 'location', 'meetingUrl', 'linkedTasks', 'linkedNotes',
    'area', 'color', 'reminders', 'status', 'lifeAreaId', 'projectId'
  ];

  // Filter updates to only include allowed fields
  const filteredUpdates = {};
  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }

  // Update the event
  const event = await Event.findOneAndUpdate(
    { _id: eventId, userId },
    { $set: filteredUpdates },
    { new: true, runValidators: true }
  )
    .populate('linkedTasks', 'title status priority')
    .populate('linkedNotes', 'title');

  // Track edit for intelligent dashboard
  if (event) {
    trackEdit(userId, 'events');
  }

  return event;
}

// =============================================================================
// DELETE EVENT
// =============================================================================

/**
 * deleteEvent(eventId, userId)
 * ----------------------------
 * Deletes an event permanently.
 *
 * @param {ObjectId} eventId - The event to delete
 * @param {ObjectId} userId - The user who owns the event
 *
 * @returns {Object|null} The deleted Event document, or null
 *
 * NOTE ON RECURRING EVENTS:
 * Deleting a recurring event deletes ALL occurrences.
 */
export async function deleteEvent(eventId, userId) {
  const event = await Event.findOneAndDelete({ _id: eventId, userId });
  return event;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * getUpcomingEvents(userId, days)
 * -------------------------------
 * Gets events coming up in the next N days.
 *
 * @param {ObjectId} userId - The user whose events to retrieve
 * @param {number} days - Number of days to look ahead (default: 7)
 *
 * @returns {Array} Array of upcoming Event documents
 *
 * USED FOR:
 * - Dashboard "Upcoming Events" section
 * - Daily agenda view
 * - Calendar widgets
 */
export async function getUpcomingEvents(userId, days = 7) {
  const now = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  return getEvents(userId, {
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    status: 'confirmed',  // Only confirmed events
  });
}

/**
 * getDayEvents(userId, date)
 * --------------------------
 * Gets all events for a specific day.
 *
 * @param {ObjectId} userId - The user whose events to retrieve
 * @param {string} date - Date string in YYYY-MM-DD format
 *
 * @returns {Array} Array of Event documents for that day
 *
 * DATE PARSING:
 * The date is parsed as local time to avoid timezone issues.
 * '2024-01-15' is treated as midnight local time on Jan 15.
 *
 * EXAMPLE:
 * ```javascript
 * const events = await getDayEvents(userId, '2024-01-15');
 * // Returns all events on January 15, 2024
 * ```
 */
export async function getDayEvents(userId, date) {
  // Parse date string as local date
  // Split '2024-01-15' into [2024, 1, 15]
  const [year, month, day] = date.split('-').map(Number);

  // Create start of day (00:00:00.000)
  const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);

  // Create end of day (23:59:59.999)
  const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

  return getEvents(userId, {
    startDate: dayStart.toISOString(),
    endDate: dayEnd.toISOString(),
  });
}

// =============================================================================
// LINK/UNLINK FUNCTIONS
// =============================================================================

/**
 * linkTask(eventId, userId, taskId)
 * ---------------------------------
 * Links a task to an event.
 *
 * @param {ObjectId} eventId - The event to link to
 * @param {ObjectId} userId - The user who owns the event
 * @param {ObjectId} taskId - The task to link
 *
 * @returns {Object|null} The updated Event document
 *
 * USE CASE:
 * "I have a meeting about reviewing the Q1 report - let me link
 * the 'Review Q1 Report' task to this meeting event."
 *
 * $addToSet:
 * This MongoDB operator adds to an array only if not already present.
 * This prevents duplicate links.
 */
export async function linkTask(eventId, userId, taskId) {
  const event = await Event.findOneAndUpdate(
    { _id: eventId, userId },
    { $addToSet: { linkedTasks: taskId } },  // Add if not present
    { new: true }
  );
  return event;
}

/**
 * unlinkTask(eventId, userId, taskId)
 * -----------------------------------
 * Removes a task link from an event.
 *
 * @param {ObjectId} eventId - The event to unlink from
 * @param {ObjectId} userId - The user who owns the event
 * @param {ObjectId} taskId - The task to unlink
 *
 * @returns {Object|null} The updated Event document
 *
 * $pull:
 * This MongoDB operator removes all instances of a value from an array.
 */
export async function unlinkTask(eventId, userId, taskId) {
  const event = await Event.findOneAndUpdate(
    { _id: eventId, userId },
    { $pull: { linkedTasks: taskId } },  // Remove from array
    { new: true }
  );
  return event;
}

/**
 * linkNote(eventId, userId, noteId)
 * ---------------------------------
 * Links a note to an event.
 *
 * @param {ObjectId} eventId - The event to link to
 * @param {ObjectId} userId - The user who owns the event
 * @param {ObjectId} noteId - The note to link
 *
 * @returns {Object|null} The updated Event document
 *
 * USE CASE:
 * "I want to reference my meeting notes from the event itself."
 */
export async function linkNote(eventId, userId, noteId) {
  const event = await Event.findOneAndUpdate(
    { _id: eventId, userId },
    { $addToSet: { linkedNotes: noteId } },
    { new: true }
  );
  return event;
}

/**
 * unlinkNote(eventId, userId, noteId)
 * -----------------------------------
 * Removes a note link from an event.
 *
 * @param {ObjectId} eventId - The event to unlink from
 * @param {ObjectId} userId - The user who owns the event
 * @param {ObjectId} noteId - The note to unlink
 *
 * @returns {Object|null} The updated Event document
 */
export async function unlinkNote(eventId, userId, noteId) {
  const event = await Event.findOneAndUpdate(
    { _id: eventId, userId },
    { $pull: { linkedNotes: noteId } },
    { new: true }
  );
  return event;
}
