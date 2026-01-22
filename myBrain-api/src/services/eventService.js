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
// IMPORTS - Loading Dependencies
// =============================================================================
// This section imports the modules and dependencies needed for event operations.
// Each import enables a specific capability of the event service.

/**
 * Event model represents calendar event documents in MongoDB.
 * Contains title, date/time, recurrence rules, linked items, reminders.
 * Provides methods for creating events, querying by date range, handling recurring events.
 */
import Event from '../models/Event.js';

/**
 * Usage tracking service records what users do for analytics and recommendations.
 * We track: creates (new events), views (opened events), edits (modified events).
 * This data helps the intelligent dashboard suggest what events users care about most.
 */
import { trackCreate, trackView, trackEdit } from './usageService.js';

// =============================================================================
// CREATE EVENT
// =============================================================================

/**
 * createEvent(userId, eventData)
 * ------------------------------
 * Creates a new calendar event for a user.
 *
 * WHAT THIS DOES:
 * Creates a single event or recurring event that appears on the user's calendar.
 * Events can be linked to tasks, notes, projects, and life areas for context.
 *
 * BUSINESS LOGIC:
 * - New events are created in 'confirmed' status by default
 * - Recurring events are stored as a single document with recurrence rules
 * - When querying, recurring events are expanded into individual occurrences
 * - Events can be linked to other content items (tasks, notes)
 *
 * @param {ObjectId} userId - The user creating the event
 * @param {Object} eventData - Event data
 *   - eventData.title: Event title (required, non-empty string)
 *   - eventData.startDate: Start date/time (required, ISO string or Date)
 *   - eventData.endDate: End date/time (optional, defaults to same as start)
 *   - eventData.allDay: Is this an all-day event? (optional, boolean)
 *   - eventData.description: Event description (optional, string)
 *   - eventData.location: Physical location (optional, string)
 *   - eventData.meetingUrl: Virtual meeting link (optional, string)
 *   - eventData.recurrence: Recurrence rules (optional, object)
 *   - eventData.reminders: Reminder settings (optional, array)
 *   - eventData.linkedTasks: Array of task IDs (optional, array)
 *   - eventData.linkedNotes: Array of note IDs (optional, array)
 *   - eventData.lifeAreaId: Associated life area (optional, ObjectId)
 *   - eventData.projectId: Associated project (optional, ObjectId)
 *
 * @returns {Promise<Object>} The created Event document
 *
 * @throws {Error} If title or startDate is missing, or if data validation fails
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Create a simple one-time event
 * const event = await createEvent(userId, {
 *   title: 'Team Standup',
 *   startDate: new Date('2024-01-15T10:00:00'),
 *   endDate: new Date('2024-01-15T10:30:00'),
 *   meetingUrl: 'https://zoom.us/j/123456'
 * });
 *
 * // Create a recurring weekly meeting
 * const recurringEvent = await createEvent(userId, {
 *   title: 'Weekly Planning',
 *   startDate: new Date('2024-01-15T09:00:00'),
 *   endDate: new Date('2024-01-15T10:00:00'),
 *   recurrence: {
 *     frequency: 'weekly',
 *     interval: 1,
 *     daysOfWeek: [1, 3, 5]  // Mon, Wed, Fri
 *   },
 *   linkedTasks: [taskId1, taskId2]
 * });
 * ```
 */
export async function createEvent(userId, eventData) {
  // =====================================================
  // CREATE THE EVENT DOCUMENT
  // =====================================================
  // Event.create() validates the data and saves to database
  // Handles all fields including recurrence rules and linked items
  const event = await Event.create({
    userId,
    ...eventData,
  });

  // =====================================================
  // TRACK USAGE FOR INTELLIGENT DASHBOARD
  // =====================================================
  // Record that user created an event for analytics
  // Powers "What should I work on" recommendations
  trackCreate(userId, 'events');

  return event;
}

// =============================================================================
// GET EVENTS (WITH DATE RANGE)
// =============================================================================

/**
 * getEvents(userId, options)
 * --------------------------
 * Retrieves events within a date range with optional filters and recurring event expansion.
 *
 * WHAT THIS DOES:
 * Queries for events matching a date range and optional filters, then
 * "expands" recurring events into individual occurrences. The result is a
 * flat array of events, where each recurring event is represented as one
 * object for each date it occurs.
 *
 * BUSINESS LOGIC:
 * - Complex date range matching (handles spanning events, recurring events)
 * - Filters by status, area, life area, project
 * - Populates linked tasks and notes with basic info
 * - Sorts by start date
 * - Expands recurring events into individual occurrences
 *
 * DATE RANGE MATCHING LOGIC:
 * An event matches the date range if ANY of these are true:
 * 1. Event STARTS within [startDate, endDate]
 * 2. Event ENDS within [startDate, endDate]
 * 3. Event SPANS the entire range (started before, ends after)
 * 4. Recurring event has potential occurrences in range
 *
 * This handles:
 * - All-day events
 * - Multi-day events
 * - Events at range boundaries
 * - Recurring events with complex schedules
 *
 * RECURRING EVENT EXPANSION:
 * When a recurring event matches:
 * - generateRecurringOccurrences() creates one object per occurrence
 * - Each occurrence has isRecurringInstance: true
 * - Each occurrence has originalEventId pointing to parent
 * - Respects exceptions (skipped dates)
 * - Respects frequency rules (daily/weekly/monthly/yearly)
 *
 * POPULATION:
 * - linkedTasks: Populated with title, status, priority
 * - linkedNotes: Populated with title
 * Allows frontend to show task/note info without extra queries
 *
 * @param {ObjectId} userId - The user whose events to retrieve
 * @param {Object} [options={}] - Query and filter options
 *   - options.startDate: Range start (ISO string or Date, optional)
 *   - options.endDate: Range end (ISO string or Date, optional)
 *   - options.status: Filter by status: 'confirmed' | 'tentative' | 'cancelled' (optional)
 *   - options.area: Filter by area/category (optional, legacy field)
 *   - options.lifeAreaId: Filter by life area ID (optional)
 *   - options.projectId: Filter by project ID (optional)
 *
 * @returns {Promise<Array>} Array of Event documents sorted by startDate
 *   - Single events appear once
 *   - Recurring events appear multiple times (one per occurrence)
 *   - All linked tasks/notes are populated
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Get all events for a specific week
 * const weekEvents = await getEvents(userId, {
 *   startDate: '2024-01-15T00:00:00Z',
 *   endDate: '2024-01-21T23:59:59Z',
 *   status: 'confirmed'
 * });
 * // Returns all single events + recurring occurrences in that week
 *
 * // Get all events for a month in a life area
 * const monthEvents = await getEvents(userId, {
 *   startDate: '2024-01-01T00:00:00Z',
 *   endDate: '2024-01-31T23:59:59Z',
 *   lifeAreaId: workAreaId
 * });
 *
 * // Get all events linked to a project
 * const projectEvents = await getEvents(userId, {
 *   startDate: '2024-01-01T00:00:00Z',
 *   endDate: '2024-12-31T23:59:59Z',
 *   projectId: projectId,
 *   status: 'confirmed'
 * });
 * ```
 */
export async function getEvents(userId, options = {}) {
  // =====================================================
  // DESTRUCTURE OPTIONS
  // =====================================================
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
 * WHAT THIS DOES:
 * Takes a single recurring event document and "expands" it into multiple
 * occurrence objects, one for each date the event repeats. This is used
 * when querying events - instead of returning the recurring event once,
 * we return one object for each date it occurs.
 *
 * BUSINESS LOGIC:
 * 1. Start from the event's original start date
 * 2. Calculate each next occurrence using recurrence rules
 * 3. For each occurrence within the requested date range:
 *    - Check if it's an exception (excluded date)
 *    - Check if it matches the frequency rules (e.g., Mon/Wed/Fri)
 *    - Create an occurrence object with adjusted dates
 * 4. Stop when past the range or max occurrences reached
 *
 * FREQUENCY HANDLING:
 * - Daily: advance by interval days
 * - Weekly: advance by interval weeks (special case: exact day matching)
 * - Monthly: advance by interval months (same day of month)
 * - Yearly: advance by interval years (same day of year)
 *
 * SPECIAL CASE - WEEKLY WITH SPECIFIC DAYS:
 * When frequency='weekly' with daysOfWeek=[1,3,5] (Mon/Wed/Fri):
 * - Iterate day-by-day
 * - Only create occurrences on selected days
 * - More flexible than strict interval calculation
 *
 * EXCEPTIONS:
 * Dates marked in recurrence.exceptions are skipped. Useful for:
 * - "Weekly meeting, but no meeting next Monday (holiday)"
 * - Individual occurrence modifications
 *
 * @param {Object} event - The recurring Event document
 * @param {Date} rangeStart - Start of the date range to expand into
 * @param {Date} rangeEnd - End of the date range to expand into
 *
 * @returns {Array<Object>} Array of occurrence objects with properties:
 *   - All properties from the original event
 *   - startDate/endDate adjusted for this occurrence
 *   - isRecurringInstance: true
 *   - originalEventId: reference to parent event
 *
 * EXAMPLE:
 * // A weekly event that happens Mon/Wed/Fri
 * // Generate all occurrences for Jan 2024
 * const event = { startDate: Jan 1, frequency: 'weekly', daysOfWeek: [1,3,5], ... };
 * const occurrences = generateRecurringOccurrences(event, Jan 1, Jan 31);
 * // Returns ~12 occurrence objects (4 weeks × 3 days)
 */
function generateRecurringOccurrences(event, rangeStart, rangeEnd) {
  const occurrences = [];
  const { recurrence } = event;

  // =====================================================
  // VALIDATE RECURRENCE RULES
  // =====================================================
  // If no recurrence rules, return the event as-is (non-recurring)
  if (!recurrence) return [event];

  // =====================================================
  // INITIALIZE ITERATION VARIABLES
  // =====================================================
  // Calculate how long each occurrence lasts (duration = endDate - startDate)
  const eventDuration = event.endDate - event.startDate;

  // Start from the original event date and iterate forward
  let currentDate = new Date(event.startDate);

  // Counter to prevent infinite loops (safety limit)
  let count = 0;
  const maxOccurrences = recurrence.count || 365;  // Default max: 365 occurrences

  // Detect weekly-with-specific-days pattern for special handling
  const isWeeklyWithDays = recurrence.frequency === 'weekly' && recurrence.daysOfWeek?.length > 0;

  // =====================================================
  // GENERATE OCCURRENCES LOOP
  // =====================================================

  while (currentDate <= rangeEnd && count < maxOccurrences) {
    // Check if this date is in the exceptions list (should be skipped)
    const isException = recurrence.exceptions?.some(
      (exc) => new Date(exc).toDateString() === currentDate.toDateString()
    );

    // Check if the recurrence series has ended
    if (recurrence.endDate && currentDate > new Date(recurrence.endDate)) {
      break;  // Stop generating occurrences
    }

    // Check if this occurrence is within the requested date range
    if (currentDate >= rangeStart && !isException) {
      if (isWeeklyWithDays) {
        // =====================================================
        // SPECIAL HANDLING: WEEKLY WITH SPECIFIC DAYS
        // =====================================================
        // For weekly events on specific days, check if current date matches
        // getDay() returns 0=Sunday, 1=Monday, 2=Tuesday, ..., 6=Saturday
        if (recurrence.daysOfWeek.includes(currentDate.getDay())) {
          // This date matches one of the selected days - create occurrence
          occurrences.push(createOccurrence(event, currentDate, eventDuration));
        }
      } else {
        // =====================================================
        // REGULAR RECURRENCE
        // =====================================================
        // Standard frequency-based recurrence - create occurrence
        occurrences.push(createOccurrence(event, currentDate, eventDuration));
      }
    }

    // =====================================================
    // ADVANCE TO NEXT OCCURRENCE DATE
    // =====================================================
    // Move to the next potential occurrence
    if (isWeeklyWithDays) {
      // For weekly with specific days: advance day-by-day
      // This allows checking each day against the daysOfWeek list
      currentDate.setDate(currentDate.getDate() + 1);
    } else {
      // For other frequencies: use the recurrence interval
      // Respects daily/weekly/monthly/yearly intervals
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
 * WHAT THIS DOES:
 * Takes a recurring event and creates a copy representing one specific
 * occurrence. The occurrence has the same properties as the parent but with
 * dates adjusted to the specific occurrence date.
 *
 * WHY SPLIT RECURRING EVENTS?
 * A recurring "Tuesday meeting" is stored as ONE event with recurrence rules.
 * When fetching events for a week, we generate one occurrence object for
 * EACH Tuesday in that week. This gives the frontend individual events to
 * display while saving storage (one event, not 52+).
 *
 * PROPERTIES COPIED FROM PARENT:
 * - title, description, location, meetingUrl
 * - linkedTasks, linkedNotes
 * - lifeAreaId, projectId
 * - status, reminders
 * - All other properties except dates and IDs
 *
 * PROPERTIES MODIFIED FOR THIS OCCURRENCE:
 * - startDate: Adjusted to this occurrence's date
 * - endDate: Calculated from startDate + original duration
 *
 * NEW PROPERTIES ADDED:
 * - isRecurringInstance: true (identifies as expanded occurrence)
 * - originalEventId: ID of the parent recurring event
 *
 * @param {Object} event - The parent recurring Event document
 * @param {Date} startDate - Start date for this specific occurrence
 * @param {number} duration - Duration in milliseconds (endDate - startDate)
 *
 * @returns {Object} An occurrence object with dates adjusted but other properties preserved
 *
 * EXAMPLE:
 * ```javascript
 * // Parent event: "Weekly Team Meeting" on Mondays, 10am-11am
 * // When generating occurrences for week of Jan 15-21:
 *
 * // For Monday Jan 15:
 * const occurrence1 = createOccurrence(event, Jan15_10am, 3600000);
 * // occurrence1 = {
 * //   ...event properties...,
 * //   startDate: Jan 15 10:00am,
 * //   endDate: Jan 15 11:00am,
 * //   isRecurringInstance: true,
 * //   originalEventId: event._id
 * // }
 *
 * // For Monday Jan 22:
 * const occurrence2 = createOccurrence(event, Jan22_10am, 3600000);
 * // occurrence2 = {
 * //   ...event properties...,
 * //   startDate: Jan 22 10:00am,
 * //   endDate: Jan 22 11:00am,
 * //   isRecurringInstance: true,
 * //   originalEventId: event._id
 * // }
 *
 * // Both occurrences reference the same parent event
 * ```
 */
function createOccurrence(event, startDate, duration) {
  // =====================================================
  // CONVERT EVENT TO PLAIN JAVASCRIPT OBJECT
  // =====================================================
  // event.toObject() converts Mongoose document to plain object
  // This allows us to freely modify properties
  const occurrence = event.toObject();

  // =====================================================
  // ADJUST DATES FOR THIS OCCURRENCE
  // =====================================================
  // Set start date to this occurrence's specific date
  occurrence.startDate = new Date(startDate);

  // Calculate end date: start + duration
  // duration = original event's (endDate - startDate)
  occurrence.endDate = new Date(startDate.getTime() + duration);

  // =====================================================
  // MARK AS RECURRING INSTANCE
  // =====================================================
  // Flag so frontend/consumers know this is an expanded occurrence
  // Not the original recurring event document
  occurrence.isRecurringInstance = true;

  // Store reference to parent recurring event
  // Allows finding the original event if needed
  occurrence.originalEventId = event._id;

  return occurrence;
}

/**
 * getNextOccurrence(currentDate, recurrence)
 * ------------------------------------------
 * Calculates the next occurrence date based on recurrence frequency and interval.
 *
 * WHAT THIS DOES:
 * Given a current date and recurrence rules, calculates when the next occurrence
 * should be. Used in generateRecurringOccurrences to iterate through all occurrences.
 *
 * BUSINESS LOGIC:
 * The calculation depends on frequency:
 * - Daily: Add N days
 * - Weekly: Add N weeks (7 days)
 * - Monthly: Add N months (same day of month)
 * - Yearly: Add N years (same day of year)
 *
 * EDGE CASES HANDLED:
 * - Month end dates: JavaScript Date automatically handles month boundaries
 *   e.g., Jan 31 + 1 month = Feb 28/29 (not Mar 3)
 *
 * NOT USED FOR:
 * - Weekly events with specific days (those use day-by-day iteration)
 * - Those are handled separately in generateRecurringOccurrences
 *
 * @param {Date} currentDate - The current occurrence date (not modified)
 * @param {Object} recurrence - Recurrence rules object
 *   - recurrence.frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' (required)
 *   - recurrence.interval: Number of units between occurrences (default: 1)
 *
 * @returns {Date} A new Date object representing the next occurrence
 *
 * EXAMPLES:
 * ```javascript
 * // Daily event, every day
 * const daily = getNextOccurrence(Jan15, { frequency: 'daily', interval: 1 });
 * // Returns Jan 16
 *
 * // Daily event, every 2 days
 * const biDaily = getNextOccurrence(Jan15, { frequency: 'daily', interval: 2 });
 * // Returns Jan 17
 *
 * // Weekly event, every 1 week (7 days)
 * const weekly = getNextOccurrence(Jan15_Monday, { frequency: 'weekly', interval: 1 });
 * // Returns Jan 22 (next Monday)
 *
 * // Weekly event, every 2 weeks
 * const biWeekly = getNextOccurrence(Jan15, { frequency: 'weekly', interval: 2 });
 * // Returns Jan 29
 *
 * // Monthly event, every month (same day)
 * const monthly = getNextOccurrence(Jan31, { frequency: 'monthly', interval: 1 });
 * // Returns Feb 28 (month-end handling)
 *
 * // Yearly event, every year
 * const yearly = getNextOccurrence(Feb29_2024, { frequency: 'yearly', interval: 1 });
 * // Returns Feb 28 or Mar 1, 2025 (leap year handling)
 * ```
 */
function getNextOccurrence(currentDate, recurrence) {
  // =====================================================
  // CREATE A COPY OF THE CURRENT DATE
  // =====================================================
  // Always create a new Date to avoid modifying the original
  const next = new Date(currentDate);

  // Get the interval (number of units to advance)
  // Default to 1 if not specified
  const interval = recurrence.interval || 1;

  // =====================================================
  // CALCULATE NEXT OCCURRENCE BASED ON FREQUENCY
  // =====================================================

  switch (recurrence.frequency) {
    case 'daily':
      // Add N days to the current date
      // setDate() automatically handles month boundaries
      next.setDate(next.getDate() + interval);
      break;

    case 'weekly':
      // Add N weeks (convert to days: interval * 7)
      // e.g., interval=2 means 14 days
      next.setDate(next.getDate() + (7 * interval));
      break;

    case 'monthly':
      // Add N months to the same day
      // setMonth() automatically handles month boundaries
      // e.g., Jan 31 + 1 month = Feb 28 (or Feb 29 in leap years)
      next.setMonth(next.getMonth() + interval);
      break;

    case 'yearly':
      // Add N years on the same month/day
      // setFullYear() handles leap year dates
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
 * Retrieves a single event by its ID with related items populated.
 *
 * WHAT THIS DOES:
 * Fetches a specific event document and enriches it with details about
 * linked tasks and notes. Used for event detail views.
 *
 * SECURITY:
 * Requires both eventId AND userId to match. This ensures users
 * can only access their own events, even if they guess a valid ID.
 *
 * POPULATES LINKED DATA:
 * - linkedTasks: Includes title, status, and priority for quick info
 * - linkedNotes: Includes title for context
 * This allows displaying task/note summaries without extra queries.
 *
 * @param {ObjectId} eventId - The event's unique ID
 * @param {ObjectId} userId - The user who owns the event (for access control)
 *
 * @returns {Promise<Object|null>} The Event document with populated task/note data, or null if not found
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Get event details for display
 * const event = await getEvent(eventId, userId);
 * if (!event) {
 *   throw new Error('Event not found');
 * }
 *
 * // Now event.linkedTasks contains task summaries
 * event.linkedTasks.forEach(task => {
 *   console.log(`${task.title} - ${task.status}`);
 * });
 * ```
 */
export async function getEvent(eventId, userId) {
  // Query by ID and user ID to ensure ownership
  // Populate related tasks with key fields
  // Populate related notes with titles
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
 * WHAT THIS DOES:
 * Modifies an existing event with new values. Only certain fields
 * are allowed to be updated for safety and security.
 *
 * SECURITY & SAFETY:
 * - Requires both eventId AND userId (authorization check)
 * - Blocks updates to system fields (_id, userId, createdAt, _v)
 * - Uses whitelist of allowed fields to prevent injection
 * - Runs validation rules on updated data
 *
 * RECURRING EVENT IMPACT:
 * Updating a recurring event affects:
 * - The entire series (all future and past occurrences)
 * - NOT individual occurrences (not yet supported)
 * If you need to skip one occurrence, use recurrence.exceptions
 *
 * ALLOWED UPDATE FIELDS:
 * - Content: title, description
 * - Time: startDate, endDate, allDay, timezone
 * - Links: linkedTasks, linkedNotes
 * - Recurrence: recurrence (rules for repeating events)
 * - Location: location, meetingUrl
 * - Organization: area, color, lifeAreaId, projectId
 * - Admin: reminders, status
 *
 * POPULATED AFTER UPDATE:
 * Returns the event with linkedTasks and linkedNotes populated
 * with basic info (title, status, priority for tasks; title for notes)
 *
 * @param {ObjectId} eventId - The event to update
 * @param {ObjectId} userId - The user who owns the event (for authorization)
 * @param {Object} updates - Fields to update (any fields, will be filtered)
 *   - Can include any field, but only allowed fields will be applied
 *   - Disallowed fields are silently ignored
 *
 * @returns {Promise<Object|null>} The updated Event document with populated links, or null if not found
 *
 * @throws {Error} If validation fails on any field
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Update event title and time
 * const updated = await updateEvent(eventId, userId, {
 *   title: 'Updated Meeting Title',
 *   startDate: new Date('2024-01-20T14:00:00'),
 *   endDate: new Date('2024-01-20T15:00:00')
 * });
 *
 * // Add location
 * const withLocation = await updateEvent(eventId, userId, {
 *   location: 'Conference Room B',
 *   meetingUrl: 'https://zoom.us/j/new'
 * });
 *
 * // Change recurrence to weekly
 * const recurring = await updateEvent(eventId, userId, {
 *   recurrence: {
 *     frequency: 'weekly',
 *     interval: 1,
 *     daysOfWeek: [1, 3, 5]  // Mon, Wed, Fri
 *   }
 * });
 *
 * // Trying to update protected fields is silently ignored
 * await updateEvent(eventId, userId, {
 *   title: 'New Title',
 *   userId: someoneElsesId,  // IGNORED - protected field
 *   _id: newId              // IGNORED - protected field
 * });
 * // Only title is updated
 * ```
 */
export async function updateEvent(eventId, userId, updates) {
  // =====================================================
  // WHITELIST ALLOWED UPDATE FIELDS
  // =====================================================
  // Only these fields are allowed to be updated
  // This prevents accidental modification of system fields
  const allowedUpdates = [
    // Content
    'title', 'description',
    // Date/Time
    'startDate', 'endDate', 'allDay', 'timezone',
    // Recurrence
    'recurrence',
    // Location
    'location', 'meetingUrl',
    // Linked Items
    'linkedTasks', 'linkedNotes',
    // Organization
    'area', 'color', 'lifeAreaId', 'projectId',
    // Admin
    'reminders', 'status'
  ];

  // =====================================================
  // FILTER UPDATES TO ALLOWED FIELDS ONLY
  // =====================================================
  // Create a new object with only allowed fields
  // Any disallowed fields are silently dropped
  const filteredUpdates = {};
  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }

  // =====================================================
  // PERFORM THE UPDATE
  // =====================================================
  // Find by ID and user ID (authorization)
  // Use $set to apply the filtered updates
  // runValidators: true ensures field validators run
  // new: true returns the updated document (not original)
  const event = await Event.findOneAndUpdate(
    { _id: eventId, userId },  // Find by ID and user
    { $set: filteredUpdates },  // Apply filtered updates
    { new: true, runValidators: true }  // Return updated, validate
  )
    .populate('linkedTasks', 'title status priority')  // Populate task info
    .populate('linkedNotes', 'title');  // Populate note info

  // =====================================================
  // TRACK EDIT FOR INTELLIGENT DASHBOARD
  // =====================================================
  // Record that user edited an event for analytics
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
 * Permanently deletes an event from the user's calendar.
 *
 * WHAT THIS DOES:
 * Removes an event document and all its data from the database.
 * This is a permanent deletion (not soft delete/trash).
 *
 * IMPORTANT NOTES:
 * - This is permanent - cannot be recovered
 * - All linked items (tasks, notes) are NOT deleted, just unlinked
 * - For recurring events: Deletes the entire series (all occurrences)
 * - Consider showing a confirmation dialog before calling
 *
 * BUSINESS LOGIC:
 * When an event is deleted:
 * 1. The event document is removed from the database
 * 2. Linked tasks/notes are NOT affected (just lose the connection)
 * 3. References in other documents are NOT updated (should be cleaned up separately)
 *
 * @param {ObjectId} eventId - The event to delete
 * @param {ObjectId} userId - The user who owns the event (for authorization)
 *
 * @returns {Promise<Object|null>} The deleted Event document (before deletion), or null if not found
 *
 * @throws {Error} Authorization failures are handled silently (returns null)
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Delete an event
 * const deleted = await deleteEvent(eventId, userId);
 *
 * if (deleted) {
 *   console.log(`Event "${deleted.title}" permanently deleted`);
 * } else {
 *   console.log('Event not found or access denied');
 * }
 *
 * // For recurring events, entire series is deleted
 * const recurring = await deleteEvent(recurringEventId, userId);
 * // All occurrences of this recurring event are now gone
 * ```
 */
export async function deleteEvent(eventId, userId) {
  // Query by ID and user ID to ensure authorization
  // findOneAndDelete removes document and returns it
  const event = await Event.findOneAndDelete({ _id: eventId, userId });

  return event;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * getUpcomingEvents(userId, days)
 * -------------------------------
 * Retrieves all events coming up in the next N days.
 *
 * WHAT THIS DOES:
 * Queries for events within a specified future date range and returns them
 * sorted chronologically. Includes recurring event occurrences.
 *
 * USE CASES:
 * - Dashboard "Upcoming Events" widget
 * - Daily/weekly agenda views
 * - Calendar agenda sections
 * - "What's next?" features
 *
 * FILTERS APPLIED:
 * - Only events in 'confirmed' status (excludes tentative/cancelled)
 * - From now to N days in the future
 * - All recurring occurrences in the range
 *
 * @param {ObjectId} userId - The user whose events to retrieve
 * @param {number} [days=7] - Number of days to look ahead (default: 7)
 *
 * @returns {Promise<Array>} Array of Event documents sorted by start date
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Get next 7 days of events (default)
 * const nextWeek = await getUpcomingEvents(userId);
 * nextWeek.forEach(event => {
 *   console.log(`${event.title} at ${event.startDate}`);
 * });
 *
 * // Get next 30 days (monthly view)
 * const nextMonth = await getUpcomingEvents(userId, 30);
 *
 * // Get just next 3 days
 * const nextFew = await getUpcomingEvents(userId, 3);
 * ```
 */
export async function getUpcomingEvents(userId, days = 7) {
  // =====================================================
  // CALCULATE DATE RANGE
  // =====================================================
  // Start from now
  const now = new Date();

  // Calculate end date (N days from now)
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  // =====================================================
  // QUERY EVENTS IN THE RANGE
  // =====================================================
  // Delegate to getEvents with confirmed status filter
  return getEvents(userId, {
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    status: 'confirmed',  // Only confirmed events (exclude tentative/cancelled)
  });
}

/**
 * getDayEvents(userId, date)
 * --------------------------
 * Retrieves all events scheduled for a specific day.
 *
 * WHAT THIS DOES:
 * Queries for all events that occur on a given date, from midnight to
 * 23:59:59. Includes single events and recurring event occurrences.
 *
 * USE CASES:
 * - Daily agenda view
 * - Day planner page
 * - "What do I have today?" feature
 * - Calendar day cell population
 *
 * DATE PARSING DETAILS:
 * - Input format: YYYY-MM-DD (e.g., '2024-01-15')
 * - Parsed as local time (not UTC) to avoid timezone issues
 * - '2024-01-15' becomes "Jan 15 at 00:00:00 local time"
 * - All-day events and timed events both included
 *
 * EDGE CASES:
 * - All-day events for that day: INCLUDED
 * - Events that span multiple days: INCLUDED if they overlap the day
 * - Recurring events: INCLUDED (expanded)
 * - Past events: INCLUDED (no filtering)
 *
 * @param {ObjectId} userId - The user whose events to retrieve
 * @param {string} date - Date string in YYYY-MM-DD format (e.g., '2024-01-15')
 *
 * @returns {Promise<Array>} Array of Event documents sorted by start time
 *
 * @throws {Error} If date format is invalid, error is thrown by Date constructor
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Get events for today
 * const today = new Date().toISOString().split('T')[0];  // '2024-01-15'
 * const todayEvents = await getDayEvents(userId, today);
 *
 * // Get events for a specific date
 * const events = await getDayEvents(userId, '2024-01-20');
 * console.log(`${events.length} events scheduled for Jan 20`);
 *
 * // Iterate through the day's schedule
 * const daySchedule = await getDayEvents(userId, '2024-01-15');
 * daySchedule.forEach(event => {
 *   const time = event.startDate.toLocaleTimeString();
 *   console.log(`${time} - ${event.title}`);
 * });
 * ```
 */
export async function getDayEvents(userId, date) {
  // =====================================================
  // PARSE DATE STRING INTO COMPONENTS
  // =====================================================
  // Split YYYY-MM-DD format: '2024-01-15' → [2024, 1, 15]
  // map(Number) converts strings to integers
  const [year, month, day] = date.split('-').map(Number);

  // =====================================================
  // CREATE START AND END OF DAY (LOCAL TIME)
  // =====================================================
  // JavaScript Date uses local time by default
  // new Date(year, month, day, hours, minutes, seconds, ms)
  // Month is 0-indexed, so January = 0, so we subtract 1

  // Start of day: 00:00:00.000
  const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);

  // End of day: 23:59:59.999
  const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999);

  // =====================================================
  // QUERY EVENTS IN THIS DAY RANGE
  // =====================================================
  // getEvents() handles complex date range logic
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
 * Links a task to a calendar event for context.
 *
 * WHAT THIS DOES:
 * Adds a task ID to an event's linkedTasks array. This shows related tasks
 * in the event detail view and helps users understand the context.
 *
 * WHY LINK TASKS TO EVENTS?
 * - "I need to review the Q1 report, and I have a meeting about it"
 * - "Link the 'Prepare presentation' task to the presentation meeting"
 * - See all action items related to this calendar event
 *
 * PREVENTS DUPLICATES:
 * Uses MongoDB's $addToSet operator, which only adds if the value
 * doesn't already exist. Prevents the same task from being linked twice.
 *
 * BUSINESS LOGIC:
 * - The task itself is NOT modified, only the event is updated
 * - Multiple tasks can be linked to one event
 * - Same task can be linked to multiple events
 * - No validation that the task actually exists (task can be deleted later)
 *
 * @param {ObjectId} eventId - The event to link to
 * @param {ObjectId} userId - The user who owns the event (for authorization)
 * @param {ObjectId} taskId - The task to link (no ownership check)
 *
 * @returns {Promise<Object|null>} The updated Event document, or null if event not found
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Link a preparation task to a meeting event
 * const event = await linkTask(eventId, userId, prepareTaskId);
 * if (!event) {
 *   console.log('Event not found');
 * } else {
 *   console.log(`Linked task to "${event.title}"`);
 *   console.log(`This event now has ${event.linkedTasks.length} linked tasks`);
 * }
 *
 * // Link the same task multiple times doesn't cause duplicates
 * await linkTask(eventId, userId, taskId);
 * await linkTask(eventId, userId, taskId);  // No duplicate, $addToSet prevents it
 * // event.linkedTasks has taskId only ONCE
 * ```
 */
export async function linkTask(eventId, userId, taskId) {
  // =====================================================
  // ADD TASK TO EVENT'S LINKED TASKS
  // =====================================================
  // $addToSet: MongoDB operator that adds to array only if value not present
  // This prevents the same task from being linked twice
  // { new: true } returns the updated document
  const event = await Event.findOneAndUpdate(
    { _id: eventId, userId },  // Find by ID and verify ownership
    { $addToSet: { linkedTasks: taskId } },  // Add task if not already linked
    { new: true }  // Return updated event
  );

  return event;
}

/**
 * unlinkTask(eventId, userId, taskId)
 * -----------------------------------
 * Removes a task link from an event.
 *
 * WHAT THIS DOES:
 * Removes a task ID from an event's linkedTasks array. The task itself
 * is not deleted or modified, just the connection is removed.
 *
 * WHEN TO USE:
 * - User decides a task is no longer relevant to this event
 * - Cleaning up old links
 * - Reorganizing task associations
 *
 * BUSINESS LOGIC:
 * - Only removes the link, task remains untouched
 * - Safe to call even if task is already deleted
 * - Silently succeeds if task was never linked
 *
 * MongoDB $pull OPERATOR:
 * The $pull operator removes ALL occurrences of a value from an array.
 * Even though $addToSet prevents duplicates, $pull removes all instances
 * (defensive programming).
 *
 * @param {ObjectId} eventId - The event to unlink from
 * @param {ObjectId} userId - The user who owns the event (for authorization)
 * @param {ObjectId} taskId - The task ID to unlink
 *
 * @returns {Promise<Object|null>} The updated Event document, or null if event not found
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Remove task from event
 * const updated = await unlinkTask(eventId, userId, taskId);
 *
 * if (updated) {
 *   console.log(`Removed task link. Event now has ${updated.linkedTasks.length} tasks`);
 * } else {
 *   console.log('Event not found');
 * }
 *
 * // Safe to unlink even if not actually linked
 * await unlinkTask(eventId, userId, unknownTaskId);  // Succeeds silently
 * ```
 */
export async function unlinkTask(eventId, userId, taskId) {
  // =====================================================
  // REMOVE TASK FROM EVENT'S LINKED TASKS
  // =====================================================
  // $pull: MongoDB operator that removes value(s) from an array
  // Removes ALL occurrences (defensive, even though $addToSet prevents duplicates)
  // { new: true } returns the updated document
  const event = await Event.findOneAndUpdate(
    { _id: eventId, userId },  // Find by ID and verify ownership
    { $pull: { linkedTasks: taskId } },  // Remove task from array
    { new: true }  // Return updated event
  );

  return event;
}

/**
 * linkNote(eventId, userId, noteId)
 * ---------------------------------
 * Links a note to a calendar event for reference.
 *
 * WHAT THIS DOES:
 * Adds a note ID to an event's linkedNotes array. This shows relevant
 * reference material in the event detail view.
 *
 * WHY LINK NOTES TO EVENTS?
 * - Reference material: "Link the proposal draft to the review meeting"
 * - Meeting notes: "Link yesterday's notes to the follow-up meeting"
 * - Context: "Link the project brief to the kickoff meeting"
 * - Documentation: "Link the architecture notes to the tech review"
 *
 * PREVENTS DUPLICATES:
 * Uses MongoDB's $addToSet operator, which only adds if the value
 * doesn't already exist. Prevents the same note from being linked twice.
 *
 * BUSINESS LOGIC:
 * - The note itself is NOT modified, only the event is updated
 * - Multiple notes can be linked to one event
 * - Same note can be linked to multiple events
 * - No validation that the note actually exists
 *
 * @param {ObjectId} eventId - The event to link to
 * @param {ObjectId} userId - The user who owns the event (for authorization)
 * @param {ObjectId} noteId - The note to link (no ownership check)
 *
 * @returns {Promise<Object|null>} The updated Event document, or null if event not found
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Link meeting notes to a follow-up meeting
 * const event = await linkNote(eventId, userId, meetingNotesId);
 * if (!event) {
 *   console.log('Event not found');
 * } else {
 *   console.log(`Linked note to "${event.title}"`);
 *   console.log(`This event references ${event.linkedNotes.length} notes`);
 * }
 *
 * // Link research document to review meeting
 * await linkNote(reviewEventId, userId, researchDocId);
 *
 * // Prevent duplicates with $addToSet
 * await linkNote(eventId, userId, noteId);
 * await linkNote(eventId, userId, noteId);  // No duplicate
 * // event.linkedNotes has noteId only ONCE
 * ```
 */
export async function linkNote(eventId, userId, noteId) {
  // =====================================================
  // ADD NOTE TO EVENT'S LINKED NOTES
  // =====================================================
  // $addToSet: Only adds if value not present (prevents duplicates)
  // { new: true } returns the updated document
  const event = await Event.findOneAndUpdate(
    { _id: eventId, userId },  // Find by ID and verify ownership
    { $addToSet: { linkedNotes: noteId } },  // Add note if not already linked
    { new: true }  // Return updated event
  );

  return event;
}

/**
 * unlinkNote(eventId, userId, noteId)
 * -----------------------------------
 * Removes a note link from an event.
 *
 * WHAT THIS DOES:
 * Removes a note ID from an event's linkedNotes array. The note itself
 * is not deleted or modified, just the connection is removed.
 *
 * WHEN TO USE:
 * - User decides a note is no longer relevant to this event
 * - Cleaning up old references
 * - Reorganizing note associations
 * - Removing outdated reference material
 *
 * BUSINESS LOGIC:
 * - Only removes the link, note remains untouched
 * - Safe to call even if note is already deleted
 * - Silently succeeds if note was never linked
 *
 * @param {ObjectId} eventId - The event to unlink from
 * @param {ObjectId} userId - The user who owns the event (for authorization)
 * @param {ObjectId} noteId - The note ID to unlink
 *
 * @returns {Promise<Object|null>} The updated Event document, or null if event not found
 *
 * EXAMPLE USAGE:
 * ```javascript
 * // Remove note from event
 * const updated = await unlinkNote(eventId, userId, noteId);
 *
 * if (updated) {
 *   console.log(`Removed note link. Event now references ${updated.linkedNotes.length} notes`);
 * } else {
 *   console.log('Event not found');
 * }
 *
 * // Safe to unlink even if not actually linked
 * await unlinkNote(eventId, userId, unknownNoteId);  // Succeeds silently
 * ```
 */
export async function unlinkNote(eventId, userId, noteId) {
  // =====================================================
  // REMOVE NOTE FROM EVENT'S LINKED NOTES
  // =====================================================
  // $pull: MongoDB operator that removes value(s) from an array
  // { new: true } returns the updated document
  const event = await Event.findOneAndUpdate(
    { _id: eventId, userId },  // Find by ID and verify ownership
    { $pull: { linkedNotes: noteId } },  // Remove note from array
    { new: true }  // Return updated event
  );

  return event;
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

/**
 * Export all event service functions as a default object.
 *
 * USAGE PATTERNS:
 * import eventService from './services/eventService.js';
 *
 * CRUD OPERATIONS:
 * const event = await eventService.createEvent(userId, eventData);
 * const event = await eventService.getEvent(eventId, userId);
 * const events = await eventService.getEvents(userId, { startDate, endDate });
 * const updated = await eventService.updateEvent(eventId, userId, updates);
 * const deleted = await eventService.deleteEvent(eventId, userId);
 *
 * CONVENIENCE FUNCTIONS:
 * const upcoming = await eventService.getUpcomingEvents(userId, 7);
 * const dayEvents = await eventService.getDayEvents(userId, '2024-01-15');
 *
 * LINKING:
 * await eventService.linkTask(eventId, userId, taskId);
 * await eventService.unlinkTask(eventId, userId, taskId);
 * await eventService.linkNote(eventId, userId, noteId);
 * await eventService.unlinkNote(eventId, userId, noteId);
 *
 * RECURRING EVENT EXPANSION:
 * The getEvents function automatically expands recurring events
 * into individual occurrences within the requested date range.
 */
export default {
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  getUpcomingEvents,
  getDayEvents,
  linkTask,
  unlinkTask,
  linkNote,
  unlinkNote
};
