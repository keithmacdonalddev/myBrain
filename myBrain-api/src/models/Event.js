/**
 * =============================================================================
 * EVENT.JS - Calendar Event Data Model
 * =============================================================================
 *
 * This file defines the Event model - the data structure for calendar events
 * in myBrain. Events are time-based entries that appear on the calendar.
 *
 * WHAT IS AN EVENT?
 * -----------------
 * An event is something that happens at a specific time and place. Unlike tasks
 * (which are things to do) or notes (which are information to remember), events
 * are tied to specific dates and times.
 *
 * EXAMPLES OF EVENTS:
 * - "Team Meeting" on Tuesday at 2pm in Conference Room A
 * - "Doctor's Appointment" on March 15th at 10:30am
 * - "Birthday Party" all day on Saturday
 * - "Weekly Standup" every Monday at 9am (recurring)
 *
 * EVENT TYPES:
 * ------------
 * 1. Single Events: Happen once at a specific time
 * 2. All-Day Events: Span an entire day (no specific time)
 * 3. Recurring Events: Repeat on a schedule (daily, weekly, monthly, yearly)
 *
 * KEY FEATURES:
 * - Start and end times with timezone support
 * - Location and meeting URL for virtual meetings
 * - Reminders (notification or email)
 * - Recurrence patterns with exceptions
 * - Links to tasks, notes, and projects
 * - External calendar sync (Google, Outlook)
 *
 * =============================================================================
 */

// =============================================================================
// IMPORTS
// =============================================================================

/**
 * Mongoose is the library we use to interact with MongoDB.
 * It provides schemas (blueprints) and models (tools to work with data).
 */
import mongoose from 'mongoose';

// =============================================================================
// SUB-SCHEMAS (Embedded Documents)
// =============================================================================

/**
 * Reminder Schema
 * ---------------
 * Defines how users are notified before an event starts.
 * Each event can have multiple reminders at different times.
 *
 * EXAMPLE:
 * An event might have:
 * - A notification 15 minutes before
 * - An email reminder 1 day (1440 minutes) before
 *
 * _id: false means this sub-document won't get its own MongoDB ID
 */
const reminderSchema = new mongoose.Schema({
  /**
   * type: How to deliver the reminder
   *
   * VALUES:
   * - 'notification': Browser/mobile push notification
   * - 'email': Send an email reminder
   */
  type: {
    type: String,
    enum: ['notification', 'email'],
    default: 'notification',
  },

  /**
   * minutes: How many minutes before the event to send the reminder
   *
   * COMMON VALUES:
   * - 5: 5 minutes before
   * - 15: 15 minutes before (default)
   * - 30: 30 minutes before
   * - 60: 1 hour before
   * - 1440: 1 day before (24 hours × 60 minutes)
   */
  minutes: {
    type: Number,
    required: true,
    default: 15,
  },
}, { _id: false });

/**
 * Recurrence Schema
 * -----------------
 * Defines how an event repeats over time.
 * This follows patterns similar to iCalendar (RFC 5545) RRULE specification.
 *
 * EXAMPLES:
 * - Daily standup: { frequency: 'daily', interval: 1 }
 * - Bi-weekly meeting: { frequency: 'weekly', interval: 2 }
 * - Monthly on the 15th: { frequency: 'monthly', interval: 1 }
 * - Every Tuesday and Thursday: { frequency: 'weekly', interval: 1, daysOfWeek: [2, 4] }
 *
 * _id: false means this sub-document won't get its own MongoDB ID
 */
const recurrenceSchema = new mongoose.Schema({
  /**
   * frequency: How often the event repeats
   *
   * VALUES:
   * - 'daily': Every N days
   * - 'weekly': Every N weeks
   * - 'monthly': Every N months
   * - 'yearly': Every N years
   */
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true,
  },

  /**
   * interval: The frequency multiplier
   * - 1 = every (day/week/month/year)
   * - 2 = every other (bi-weekly, bi-monthly, etc.)
   * - 3 = every third, etc.
   *
   * EXAMPLE:
   * frequency: 'weekly', interval: 2 = every 2 weeks (bi-weekly)
   */
  interval: {
    type: Number,
    default: 1,
    min: 1,  // Must be at least 1
  },

  /**
   * endDate: When the recurrence stops
   * - If set, no occurrences after this date
   * - If null, recurs indefinitely (or until count is reached)
   */
  endDate: {
    type: Date,
  },

  /**
   * count: Maximum number of occurrences
   * - If set, event repeats this many times total
   * - If null, continues indefinitely (or until endDate)
   *
   * EXAMPLE:
   * count: 10 means the event happens 10 times then stops
   */
  count: {
    type: Number,
  },

  /**
   * daysOfWeek: Which days of the week the event occurs (for weekly frequency)
   * - Array of day numbers: 0=Sunday, 1=Monday, ..., 6=Saturday
   *
   * EXAMPLE:
   * daysOfWeek: [1, 3, 5] = Monday, Wednesday, Friday
   * daysOfWeek: [2, 4] = Tuesday, Thursday
   */
  daysOfWeek: [{
    type: Number,
    min: 0,  // Sunday
    max: 6,  // Saturday
  }],

  /**
   * exceptions: Specific dates when the event does NOT occur
   * - Used to skip certain occurrences without deleting the whole pattern
   *
   * EXAMPLE:
   * A weekly meeting that's cancelled on a holiday would have that
   * holiday date in the exceptions array
   */
  exceptions: [{
    type: Date,
  }],
}, { _id: false });

// =============================================================================
// MAIN EVENT SCHEMA
// =============================================================================

/**
 * The Event Schema
 * ----------------
 * Defines all the fields an Event document can have.
 */
const eventSchema = new mongoose.Schema(
  {
    // =========================================================================
    // OWNERSHIP
    // =========================================================================

    /**
     * userId: Which user owns this event
     * - Required: Every event must belong to a user
     * - References: Points to a User document
     * - Index: Creates a database index for faster lookups by user
     */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // =========================================================================
    // ORGANIZATION
    // =========================================================================

    /**
     * lifeAreaId: Which life area category this event belongs to
     * - Optional: Events don't have to be in a life area
     * - References: Points to a LifeArea document
     *
     * Life areas are broad categories like "Work", "Personal", "Health"
     */
    lifeAreaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LifeArea',
      default: null,
      index: true,
    },

    /**
     * projectId: Which project this event is part of
     * - Optional: Events don't have to belong to a project
     * - References: Points to a Project document
     *
     * EXAMPLE: A "Design Review Meeting" might be linked to a
     * "Website Redesign" project
     */
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
    },

    // =========================================================================
    // BASIC INFO
    // =========================================================================

    /**
     * title: The event's name/subject
     * - Required: Every event needs a name
     * - Max 200 characters
     * - Trimmed: Removes extra whitespace
     *
     * EXAMPLES: "Team Standup", "Dentist Appointment", "Flight to NYC"
     */
    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: 200,
    },

    /**
     * description: Detailed information about the event
     * - Optional: Events can exist without a description
     * - Max 5000 characters: Room for agendas, notes, etc.
     *
     * EXAMPLE: Meeting agenda, preparation notes, directions
     */
    description: {
      type: String,
      trim: true,
      maxLength: 5000,
    },

    // =========================================================================
    // TIMING
    // =========================================================================

    /**
     * startDate: When the event begins
     * - Required: Every event must have a start time
     * - Indexed: For efficient calendar queries
     *
     * For all-day events, this is midnight (00:00) on the start day
     */
    startDate: {
      type: Date,
      required: true,
      index: true,
    },

    /**
     * endDate: When the event ends
     * - Required: Every event must have an end time
     * - Must be after startDate (validated by pre-validate hook)
     *
     * For all-day events, this is midnight (00:00) on the day AFTER the end day
     * (so a single all-day event on Jan 1 has endDate of Jan 2 00:00)
     */
    endDate: {
      type: Date,
      required: true,
    },

    /**
     * allDay: Whether this is an all-day event (no specific time)
     * - true: Shows as a banner spanning the day (like "Birthday")
     * - false: Shows with specific start/end times
     */
    allDay: {
      type: Boolean,
      default: false,
    },

    /**
     * timezone: The timezone for this event's times
     * - Default: 'UTC'
     * - Stores timezone identifier (e.g., "America/New_York")
     *
     * Important for events created while traveling or for
     * meetings with people in different timezones
     */
    timezone: {
      type: String,
      default: 'UTC',
    },

    // =========================================================================
    // RECURRENCE
    // =========================================================================

    /**
     * recurrence: Pattern for repeating events
     * - Optional: Only set if the event repeats
     * - Uses the recurrenceSchema defined above
     *
     * If not set, this is a one-time event
     */
    recurrence: recurrenceSchema,

    // =========================================================================
    // LOCATION
    // =========================================================================

    /**
     * location: Where the event takes place
     * - Optional: Virtual events may not have a physical location
     * - Max 500 characters
     *
     * EXAMPLES: "Conference Room B", "123 Main St, City", "Central Park"
     */
    location: {
      type: String,
      trim: true,
      maxLength: 500,
    },

    /**
     * meetingUrl: Link to join a virtual meeting
     * - Optional: Only for virtual/hybrid events
     *
     * EXAMPLES:
     * - "https://zoom.us/j/123456789"
     * - "https://meet.google.com/abc-defg-hij"
     * - "https://teams.microsoft.com/l/meetup-join/..."
     */
    meetingUrl: {
      type: String,
      trim: true,
    },

    // =========================================================================
    // RELATIONSHIPS
    // =========================================================================

    /**
     * linkedTasks: Tasks related to this event
     * - Array of Task document IDs
     * - Useful for preparation or follow-up tasks
     *
     * EXAMPLE: A meeting event might link to tasks like:
     * - "Prepare presentation slides"
     * - "Send meeting notes to team"
     */
    linkedTasks: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    }],

    /**
     * linkedNotes: Notes related to this event
     * - Array of Note document IDs
     * - Useful for meeting notes, agendas, etc.
     *
     * EXAMPLE: A meeting event might link to notes like:
     * - Meeting agenda
     * - Notes from the meeting
     * - Background research
     */
    linkedNotes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
    }],

    /**
     * area: Legacy text-based area categorization
     * - Optional: Older field, prefer lifeAreaId for new events
     * - Kept for backward compatibility
     */
    area: {
      type: String,
      trim: true,
    },

    // =========================================================================
    // APPEARANCE
    // =========================================================================

    /**
     * color: Visual color for this event on the calendar
     * - Default: Primary blue (#3b82f6)
     * - Helps distinguish different types of events
     *
     * COMMON COLORS:
     * - "#3b82f6" (blue): Work meetings
     * - "#10b981" (green): Personal
     * - "#f59e0b" (yellow): Reminders
     * - "#ef4444" (red): Important/Urgent
     */
    color: {
      type: String,
      default: '#3b82f6', // primary blue
    },

    // =========================================================================
    // REMINDERS
    // =========================================================================

    /**
     * reminders: Notifications before the event
     * - Array of reminder sub-documents
     * - Each reminder fires at its specified time before the event
     *
     * EXAMPLE:
     * [
     *   { type: 'notification', minutes: 15 },  // 15 min before
     *   { type: 'email', minutes: 1440 }        // 1 day before
     * ]
     */
    reminders: [reminderSchema],

    // =========================================================================
    // EXTERNAL SYNC
    // =========================================================================

    /**
     * externalId: ID from an external calendar service
     * - Used to sync with Google Calendar, Outlook, etc.
     * - Indexed: For efficient sync lookups
     *
     * When syncing, this links our event to the external service's event
     */
    externalId: {
      type: String,
      index: true,
    },

    /**
     * externalSource: Where this event was imported from
     *
     * VALUES:
     * - 'google': Google Calendar
     * - 'outlook': Microsoft Outlook/365
     * - 'manual': Created directly in myBrain (default)
     */
    externalSource: {
      type: String,
      enum: ['google', 'outlook', 'manual'],
      default: 'manual',
    },

    // =========================================================================
    // STATUS
    // =========================================================================

    /**
     * status: Current state of the event
     *
     * VALUES:
     * - 'confirmed': Event is happening as planned (default)
     * - 'tentative': Event might happen (pending confirmation)
     * - 'cancelled': Event was cancelled
     *
     * Cancelled events are kept in the database for history but
     * may be displayed differently or hidden in calendar views.
     */
    status: {
      type: String,
      enum: ['confirmed', 'tentative', 'cancelled'],
      default: 'confirmed',
    },
  },
  {
    /**
     * timestamps: true automatically adds:
     * - createdAt: When the event was created
     * - updatedAt: When the event was last modified
     */
    timestamps: true,
  }
);

// =============================================================================
// DATABASE INDEXES
// =============================================================================

/**
 * Compound Indexes for Common Queries
 * -----------------------------------
 * These indexes speed up the most common ways events are queried.
 * Calendar queries often involve date ranges, so these indexes are crucial.
 */

// For finding events in a date range (the most common calendar query)
// Used by: Calendar view, week view, month view
eventSchema.index({ userId: 1, startDate: 1, endDate: 1 });

// For filtering events by status
// Used by: Showing only confirmed events, hiding cancelled
eventSchema.index({ userId: 1, status: 1 });

// For finding events in a specific life area
// Used by: Life area calendar filter
eventSchema.index({ userId: 1, lifeAreaId: 1, startDate: 1 });

// For finding events in a specific project
// Used by: Project timeline view
eventSchema.index({ userId: 1, projectId: 1, startDate: 1 });

// =============================================================================
// VALIDATION HOOKS
// =============================================================================

/**
 * Pre-Validate Hook: Ensure endDate is after startDate
 * ----------------------------------------------------
 * This hook runs before the event is validated/saved.
 * It prevents creating events where the end time is before the start time.
 *
 * WHY THIS MATTERS:
 * An event that ends before it starts makes no sense and would break
 * calendar displays and duration calculations.
 */
eventSchema.pre('validate', function(next) {
  // Check if both dates exist and end is before start
  if (this.endDate && this.startDate && this.endDate < this.startDate) {
    // Add a validation error (prevents the save)
    this.invalidate('endDate', 'End date must be after start date');
  }

  // Continue with the rest of validation
  next();
});

// =============================================================================
// CREATE AND EXPORT MODEL
// =============================================================================

/**
 * Create the Event model from the schema.
 * This gives us methods to:
 * - Create events: Event.create({ userId, title, startDate, endDate })
 * - Find events: Event.find({ userId, startDate: { $gte: date } })
 * - Update events: Event.findByIdAndUpdate(id, updates)
 * - Delete events: Event.findByIdAndDelete(id)
 *
 * COMMON QUERIES:
 * ```
 * // Get events for a week
 * const events = await Event.find({
 *   userId,
 *   startDate: { $lte: weekEnd },
 *   endDate: { $gte: weekStart }
 * });
 *
 * // Get upcoming events
 * const upcoming = await Event.find({
 *   userId,
 *   startDate: { $gte: now },
 *   status: 'confirmed'
 * }).sort({ startDate: 1 }).limit(10);
 * ```
 */
const Event = mongoose.model('Event', eventSchema);

export default Event;
