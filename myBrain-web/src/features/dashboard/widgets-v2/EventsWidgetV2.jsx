/**
 * EventsWidgetV2 - Schedule widget for V2 dashboard
 *
 * Displays upcoming events in a timeline format matching the prototype design.
 * Features:
 * - Dropdown filter for Today/Tomorrow view
 * - Time column on the left (10:00, 2:00 format)
 * - Color dot indicator for each event
 * - Event name and location/meeting info
 * - Hover actions: Join Meeting, Skip
 * - Timeline visual with "now" marker
 */

import { useState } from 'react';
import { Calendar, ExternalLink } from 'lucide-react';

/**
 * Format time in short format: "10:00", "2:00", "5:30"
 * Uses 12-hour format without AM/PM for cleaner display
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted time string
 */
function formatShortTime(date) {
  if (!date) return '';
  const d = new Date(date);
  const hours = d.getHours();
  const minutes = d.getMinutes();

  // Convert to 12-hour format
  const hour12 = hours % 12 || 12;

  // Format minutes with leading zero if needed
  const minuteStr = minutes === 0 ? ':00' : `:${minutes.toString().padStart(2, '0')}`;

  return `${hour12}${minuteStr}`;
}

/**
 * Get color class based on event type/calendar
 * Maps event types to CSS color variables
 * @param {Object} event - Event object
 * @returns {string} CSS color value
 */
function getEventColor(event) {
  // Map calendar types to prototype colors
  const colorMap = {
    work: 'var(--v2-color-blue, #3b82f6)',
    personal: 'var(--v2-color-green, #22c55e)',
    meeting: 'var(--v2-color-purple, #a855f7)',
    deadline: 'var(--v2-color-red, #ef4444)',
    reminder: 'var(--v2-color-yellow, #eab308)',
  };

  // Use provided color, mapped type, or default blue
  return event.color || colorMap[event.calendarType] || 'var(--v2-color-purple, #a855f7)';
}

/**
 * Renders a single schedule item with time, color dot, content, and hover actions
 * @param {Object} props - Component props
 * @param {Object} props.event - Event object
 * @param {Function} props.onSkip - Callback when skip button is clicked
 */
function ScheduleItem({ event, onSkip }) {
  const time = formatShortTime(event.startDate);
  const color = getEventColor(event);

  /**
   * Handle join meeting button click
   * Opens meeting URL in a new tab
   */
  const handleJoinMeeting = (e) => {
    e.stopPropagation();
    if (event.meetingUrl) {
      window.open(event.meetingUrl, '_blank', 'noopener,noreferrer');
    }
  };

  /**
   * Handle skip button click
   * Hides the event from the dashboard
   */
  const handleSkip = (e) => {
    e.stopPropagation();
    onSkip(event._id);
  };

  return (
    <div className="schedule-item">
      {/* Time column on the left */}
      <span className="schedule-time">{time}</span>

      {/* Color dot indicator */}
      <span className="schedule-dot" style={{ background: color }} />

      {/* Main content - name and location */}
      <div className="schedule-content">
        <p className="schedule-name">{event.title}</p>
        <p className="schedule-location">
          {event.location || (event.meetingUrl ? 'Virtual Meeting' : 'No location')}
        </p>
      </div>

      {/* Hover action buttons */}
      <div className="schedule-actions">
        {/* Join button - only shows if event has meeting URL */}
        {event.meetingUrl && (
          <button
            className="schedule-action-btn join"
            onClick={handleJoinMeeting}
            aria-label={`Join meeting for ${event.title}`}
          >
            Join
          </button>
        )}

        {/* Skip button - always available */}
        <button
          className="schedule-action-btn skip"
          onClick={handleSkip}
          aria-label={`Skip ${event.title}`}
        >
          Skip
        </button>
      </div>
    </div>
  );
}

/**
 * EventsWidgetV2 - Main schedule widget component
 *
 * @param {Object} props
 * @param {Object} props.events - Object containing { today: Event[], tomorrow: Event[] }
 * @param {Function} props.onEventClick - Optional callback when event is clicked
 * @param {Function} props.onViewCalendar - Optional callback to navigate to calendar
 * @returns {JSX.Element} Schedule widget with timeline view
 */
function EventsWidgetV2({ events = { today: [], tomorrow: [] }, onEventClick, onViewCalendar }) {
  // Filter state: 'today' or 'tomorrow'
  const [filter, setFilter] = useState('today');

  // Track skipped events locally (optimistic UI - hides events for current session)
  const [skippedEventIds, setSkippedEventIds] = useState(new Set());

  /**
   * Handle skipping an event
   * Uses optimistic update - immediately hides the event from the list
   * @param {string} eventId - The ID of the event to skip
   */
  const handleSkipEvent = (eventId) => {
    setSkippedEventIds((prev) => new Set([...prev, eventId]));
  };

  /**
   * Handle filter dropdown change
   */
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  // Get events based on current filter, excluding skipped events
  const filteredEvents =
    filter === 'today'
      ? (events.today || []).filter((event) => !skippedEventIds.has(event._id))
      : (events.tomorrow || []).filter((event) => !skippedEventIds.has(event._id));

  // Check if list is empty
  const isEmpty = filteredEvents.length === 0;

  return (
    <section className="v2-widget v2-widget--schedule">
      {/* Widget header with title and dropdown filter */}
      <div className="v2-widget__header">
        <h2 className="v2-widget__title">📅 Schedule</h2>
        <select
          className="widget-dropdown"
          value={filter}
          onChange={handleFilterChange}
          aria-label="Filter schedule view"
        >
          <option value="today">Today</option>
          <option value="tomorrow">Tomorrow</option>
        </select>
      </div>

      <div className="v2-widget__content">
        {/* Empty state when no events */}
        {isEmpty ? (
          <div className="v2-empty-state">
            <Calendar className="v2-icon-lg" />
            <p>No events {filter === 'today' ? 'today' : 'tomorrow'}</p>
          </div>
        ) : (
          /* Timeline container with events */
          <div className="schedule-timeline">
            {/* Timeline line */}
            <div className="timeline-line" />

            {/* Event items */}
            {filteredEvents.map((event) => (
              <ScheduleItem key={event._id} event={event} onSkip={handleSkipEvent} />
            ))}
          </div>
        )}

        {/* Footer link to full calendar */}
        {onViewCalendar && (
          <button className="schedule-link" onClick={onViewCalendar}>
            See full calendar <ExternalLink className="v2-icon-xs" />
          </button>
        )}
      </div>
    </section>
  );
}

export default EventsWidgetV2;
