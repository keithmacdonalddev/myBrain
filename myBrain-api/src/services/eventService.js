import Event from '../models/Event.js';

/**
 * Create a new event
 */
export async function createEvent(userId, eventData) {
  const event = await Event.create({
    userId,
    ...eventData,
  });
  return event;
}

/**
 * Get events within a date range
 */
export async function getEvents(userId, options = {}) {
  const { startDate, endDate, status, area } = options;

  const query = { userId };

  // Filter by date range
  if (startDate || endDate) {
    query.$or = [
      // Events that start within the range
      {
        startDate: {
          ...(startDate && { $gte: new Date(startDate) }),
          ...(endDate && { $lte: new Date(endDate) }),
        },
      },
      // Events that end within the range
      {
        endDate: {
          ...(startDate && { $gte: new Date(startDate) }),
          ...(endDate && { $lte: new Date(endDate) }),
        },
      },
      // Events that span the entire range
      {
        startDate: { $lte: new Date(startDate || new Date()) },
        endDate: { $gte: new Date(endDate || new Date()) },
      },
    ];
  }

  if (status) {
    query.status = status;
  }

  if (area) {
    query.area = area;
  }

  const events = await Event.find(query)
    .sort({ startDate: 1 })
    .populate('linkedTasks', 'title status priority')
    .populate('linkedNotes', 'title');

  // Expand recurring events within the date range
  const expandedEvents = [];

  for (const event of events) {
    if (event.recurrence && startDate && endDate) {
      const occurrences = generateRecurringOccurrences(
        event,
        new Date(startDate),
        new Date(endDate)
      );
      expandedEvents.push(...occurrences);
    } else {
      expandedEvents.push(event);
    }
  }

  return expandedEvents;
}

/**
 * Generate recurring event occurrences within a date range
 */
function generateRecurringOccurrences(event, rangeStart, rangeEnd) {
  const occurrences = [];
  const { recurrence } = event;

  if (!recurrence) return [event];

  const eventDuration = event.endDate - event.startDate;
  let currentDate = new Date(event.startDate);
  let count = 0;
  const maxOccurrences = recurrence.count || 365; // Limit to prevent infinite loops

  while (currentDate <= rangeEnd && count < maxOccurrences) {
    // Check if this occurrence should be excluded
    const isException = recurrence.exceptions?.some(
      (exc) => new Date(exc).toDateString() === currentDate.toDateString()
    );

    // Check if recurrence has ended
    if (recurrence.endDate && currentDate > new Date(recurrence.endDate)) {
      break;
    }

    // Check if occurrence falls within our query range
    if (currentDate >= rangeStart && !isException) {
      // For weekly recurrence, check if it's on the right day
      if (recurrence.frequency === 'weekly' && recurrence.daysOfWeek?.length > 0) {
        if (recurrence.daysOfWeek.includes(currentDate.getDay())) {
          occurrences.push(createOccurrence(event, currentDate, eventDuration));
        }
      } else {
        occurrences.push(createOccurrence(event, currentDate, eventDuration));
      }
    }

    // Move to next occurrence
    currentDate = getNextOccurrence(currentDate, recurrence);
    count++;
  }

  return occurrences;
}

/**
 * Create an occurrence object from a recurring event
 */
function createOccurrence(event, startDate, duration) {
  const occurrence = event.toObject();
  occurrence.startDate = new Date(startDate);
  occurrence.endDate = new Date(startDate.getTime() + duration);
  occurrence.isRecurringInstance = true;
  occurrence.originalEventId = event._id;
  return occurrence;
}

/**
 * Get the next occurrence date based on recurrence rules
 */
function getNextOccurrence(currentDate, recurrence) {
  const next = new Date(currentDate);
  const interval = recurrence.interval || 1;

  switch (recurrence.frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + (7 * interval));
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval);
      break;
  }

  return next;
}

/**
 * Get a single event by ID
 */
export async function getEvent(eventId, userId) {
  const event = await Event.findOne({ _id: eventId, userId })
    .populate('linkedTasks', 'title status priority')
    .populate('linkedNotes', 'title');
  return event;
}

/**
 * Update an event
 */
export async function updateEvent(eventId, userId, updates) {
  const allowedUpdates = [
    'title', 'description', 'startDate', 'endDate', 'allDay', 'timezone',
    'recurrence', 'location', 'meetingUrl', 'linkedTasks', 'linkedNotes',
    'area', 'color', 'reminders', 'status'
  ];

  const filteredUpdates = {};
  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      filteredUpdates[key] = updates[key];
    }
  }

  const event = await Event.findOneAndUpdate(
    { _id: eventId, userId },
    { $set: filteredUpdates },
    { new: true, runValidators: true }
  )
    .populate('linkedTasks', 'title status priority')
    .populate('linkedNotes', 'title');

  return event;
}

/**
 * Delete an event
 */
export async function deleteEvent(eventId, userId) {
  const event = await Event.findOneAndDelete({ _id: eventId, userId });
  return event;
}

/**
 * Get upcoming events (next 7 days by default)
 */
export async function getUpcomingEvents(userId, days = 7) {
  const now = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  return getEvents(userId, {
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    status: 'confirmed',
  });
}

/**
 * Get events for a specific day
 */
export async function getDayEvents(userId, date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return getEvents(userId, {
    startDate: dayStart.toISOString(),
    endDate: dayEnd.toISOString(),
  });
}

/**
 * Link a task to an event
 */
export async function linkTask(eventId, userId, taskId) {
  const event = await Event.findOneAndUpdate(
    { _id: eventId, userId },
    { $addToSet: { linkedTasks: taskId } },
    { new: true }
  );
  return event;
}

/**
 * Unlink a task from an event
 */
export async function unlinkTask(eventId, userId, taskId) {
  const event = await Event.findOneAndUpdate(
    { _id: eventId, userId },
    { $pull: { linkedTasks: taskId } },
    { new: true }
  );
  return event;
}

/**
 * Link a note to an event
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
 * Unlink a note from an event
 */
export async function unlinkNote(eventId, userId, noteId) {
  const event = await Event.findOneAndUpdate(
    { _id: eventId, userId },
    { $pull: { linkedNotes: noteId } },
    { new: true }
  );
  return event;
}
