/**
 * EventsWidgetV2 - Schedule widget for V2 dashboard
 *
 * Displays upcoming events in a timeline format matching the prototype design.
 * Features:
 * - Uses Widget component for consistent container styling
 * - Dropdown filter for Today/Tomorrow view
 * - Time column on the left (10:00, 2:00 format)
 * - Color dot indicator for each event via CSS classes
 * - Event name and location/meeting info
 * - Hover actions: Join, Prep, Skip (based on event type)
 * - Timeline visual with "now" marker
 * - "View full calendar" link at bottom
 */

import { useState, useMemo } from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import Widget from '../../../components/ui/Widget';

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
 * Get color class name based on event type/calendar
 * Maps event types to prototype color classes (purple, blue, green, orange)
 * @param {Object} event - Event object
 * @returns {string} CSS class name for the color
 */
function getEventColorClass(event) {
  // Map calendar types to prototype color classes
  const colorMap = {
    work: 'blue',
    personal: 'green',
    meeting: 'purple',
    deadline: 'orange',
    reminder: 'orange',
  };

  // Use provided colorClass, mapped type, or default purple
  return event.colorClass || colorMap[event.calendarType] || 'purple';
}

/**
 * Calculate the "now" indicator position as a percentage of the day
 * @param {Array} events - Array of events to calculate position within
 * @returns {number|null} Position as percentage (0-100), or null if no events
 */
function calculateNowPosition(events) {
  if (!events || events.length === 0) return null;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Get the time range of events
  const eventTimes = events.map((e) => {
    const d = new Date(e.startDate);
    return d.getHours() * 60 + d.getMinutes();
  });

  const minTime = Math.min(...eventTimes);
  const maxTime = Math.max(...eventTimes);

  // Add buffer (1 hour before first and after last event)
  const rangeStart = Math.max(0, minTime - 60);
  const rangeEnd = Math.min(24 * 60, maxTime + 60);
  const totalRange = rangeEnd - rangeStart;

  if (totalRange <= 0) return null;

  // Calculate position as percentage
  const position = ((currentMinutes - rangeStart) / totalRange) * 100;

  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, position));
}

/**
 * Renders a single schedule item with time, color dot, content, and hover actions
 * @param {Object} props - Component props
 * @param {Object} props.event - Event object
 * @param {Function} props.onSkip - Callback when skip button is clicked
 * @param {Function} props.onPrep - Callback when prep button is clicked
 */
function ScheduleItem({ event, onSkip, onPrep }) {
  const time = formatShortTime(event.startDate);
  const colorClass = getEventColorClass(event);

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
   * Handle prep button click
   * Could open notes or preparation materials
   */
  const handlePrep = (e) => {
    e.stopPropagation();
    if (onPrep) {
      onPrep(event._id, event);
    }
  };

  /**
   * Handle skip button click
   * Hides the event from the dashboard
   */
  const handleSkip = (e) => {
    e.stopPropagation();
    if (onSkip) {
      onSkip(event._id);
    }
  };

  return (
    <div className={`schedule-item ${colorClass}`}>
      {/* Time column on the left */}
      <span className="schedule-time">{time}</span>

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

        {/* Prep button - for preparing notes/agenda */}
        <button
          className="schedule-action-btn prep"
          onClick={handlePrep}
          aria-label={`Prepare for ${event.title}`}
        >
          {event.meetingUrl ? 'Prep' : 'Notes'}
        </button>

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
 * @param {Function} props.onPrepEvent - Optional callback when prep button is clicked
 * @param {string} props.animationDelay - Animation delay for staggered entry
 * @returns {JSX.Element} Schedule widget with timeline view
 */
function EventsWidgetV2({
  events = { today: [], tomorrow: [] },
  onEventClick,
  onViewCalendar,
  onPrepEvent,
  animationDelay,
}) {
  // Filter state: 'today' or 'tomorrow'
  const [filter, setFilter] = useState('today');

  // Track skipped events locally (optimistic UI - hides events for current session)
  const [skippedEventIds, setSkippedEventIds] = useState(new Set());

  // Dropdown options for the widget header
  const filterOptions = [
    { label: 'Today', value: 'today' },
    { label: 'Tomorrow', value: 'tomorrow' },
  ];

  /**
   * Handle skipping an event
   * Uses optimistic update - immediately hides the event from the list
   * @param {string} eventId - The ID of the event to skip
   */
  const handleSkipEvent = (eventId) => {
    setSkippedEventIds((prev) => new Set([...prev, eventId]));
  };

  // Get events based on current filter, excluding skipped events
  const filteredEvents = useMemo(() => {
    const sourceEvents = filter === 'today' ? events.today || [] : events.tomorrow || [];
    return sourceEvents.filter((event) => !skippedEventIds.has(event._id));
  }, [filter, events, skippedEventIds]);

  // Calculate "now" indicator position for today view only
  const nowPosition = useMemo(() => {
    if (filter !== 'today') return null;
    return calculateNowPosition(filteredEvents);
  }, [filter, filteredEvents]);

  // Check if list is empty
  const isEmpty = filteredEvents.length === 0;

  return (
    <Widget
      title="Schedule"
      icon="📅"
      actions={filterOptions}
      actionValue={filter}
      onActionChange={setFilter}
      className="schedule-widget"
      animationDelay={animationDelay}
    >
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

          {/* "Now" indicator - only shown when viewing today and position is valid */}
          {nowPosition !== null && (
            <div
              className="timeline-now"
              style={{ top: `${nowPosition}%` }}
              aria-label="Current time"
            />
          )}

          {/* Event items */}
          {filteredEvents.map((event) => (
            <ScheduleItem
              key={event._id}
              event={event}
              onSkip={handleSkipEvent}
              onPrep={onPrepEvent}
            />
          ))}
        </div>
      )}

      {/* Footer link to full calendar */}
      {onViewCalendar && (
        <button className="schedule-link" onClick={onViewCalendar}>
          View full calendar <ArrowRight className="v2-icon-xs" />
        </button>
      )}
    </Widget>
  );
}

export default EventsWidgetV2;
