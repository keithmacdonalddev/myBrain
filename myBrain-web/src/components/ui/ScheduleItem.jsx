/**
 * ScheduleItem - Reusable event/schedule row component
 *
 * A flexible event row component matching V2 dashboard design.
 * Used in dashboard calendar widget and full calendar views.
 *
 * Features:
 * - Time column on left (formatted like "10:00" - 12-hour without AM/PM)
 * - Color dot (8x8px) matching event type
 * - Event details (title, optional location)
 * - Left border color coding by event type
 * - Status indicator (upcoming, in-progress, past)
 * - Hover actions (Join, Prep, Skip) with text labels
 * - "NOW" badge if event is currently happening
 * - Full dark mode support
 *
 * Example:
 * ```jsx
 * <ScheduleItem
 *   event={{
 *     title: "Team standup",
 *     startTime: "2024-01-31T10:00:00",
 *     endTime: "2024-01-31T10:30:00",
 *     location: "Conference Room A",
 *     type: "meeting",
 *     meetingUrl: "https://zoom.us/..."
 *   }}
 *   onJoin={() => {}}
 *   onPrep={() => {}}
 *   onSkip={() => {}}
 *   showActions={true}
 * />
 * ```
 */

import PropTypes from 'prop-types';
import './ScheduleItem.css';

/**
 * Format time in 12-hour format WITHOUT AM/PM
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted time like "10:00" or "2:30"
 */
function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  let hours = d.getHours();
  const minutes = d.getMinutes();

  // Convert to 12-hour format
  hours = hours % 12 || 12;

  // Pad minutes with leading zero if needed
  const minuteStr = minutes.toString().padStart(2, '0');

  return `${hours}:${minuteStr}`;
}

/**
 * Get event status based on current time
 * @param {Date|string} startTime - Event start time
 * @param {Date|string} endTime - Event end time
 * @returns {'upcoming'|'in-progress'|'past'} Event status
 */
function getEventStatus(startTime, endTime) {
  const now = new Date();
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date(start.getTime() + 60 * 60 * 1000); // Default 1 hour

  if (now < start) return 'upcoming';
  if (now > end) return 'past';
  return 'in-progress';
}

/**
 * Get CSS class for event type color
 * Maps event types to V2 design system color classes
 * @param {string} type - Event type (work, personal, meeting, focus, deadline, reminder)
 * @returns {string} CSS class suffix for the event type
 */
function getEventTypeClass(type) {
  const typeMap = {
    work: 'work',
    personal: 'personal',
    meeting: 'meeting',
    focus: 'focus',
    deadline: 'deadline',
    reminder: 'reminder',
  };

  return typeMap[type] || 'default';
}

/**
 * ScheduleItem Component
 *
 * @param {Object} props
 * @param {Object} props.event - Event object
 * @param {string} props.event.title - Event title
 * @param {Date|string} props.event.startTime - Event start time
 * @param {Date|string} props.event.endTime - Event end time
 * @param {string} [props.event.location] - Event location
 * @param {string} [props.event.type] - Event type (work, personal, meeting, focus, deadline, reminder)
 * @param {string} [props.event.meetingUrl] - Meeting URL for Join action
 * @param {Function} [props.onJoin] - Callback when Join button is clicked
 * @param {Function} [props.onPrep] - Callback when Prep button is clicked (renamed from onPrepare)
 * @param {Function} [props.onSkip] - Callback when Skip button is clicked
 * @param {Function} [props.onClick] - Callback when item is clicked
 * @param {boolean} [props.showActions] - Whether to show action buttons (default: true when callbacks provided)
 * @returns {JSX.Element} Schedule item component
 */
function ScheduleItem({
  event,
  onJoin,
  onPrep,
  onSkip,
  onClick,
  showActions = true
}) {
  // Extract event properties
  const {
    title,
    startTime,
    endTime,
    location,
    type = 'meeting',
    meetingUrl
  } = event;

  // Format time and determine status
  const timeStr = formatTime(startTime);
  const status = getEventStatus(startTime, endTime);
  const typeClass = getEventTypeClass(type);

  // Check if event is happening now
  const isNow = status === 'in-progress';

  // Determine if we should show action buttons
  const hasActions = showActions && (onJoin || onPrep || onSkip || meetingUrl);

  /**
   * Handle Join Meeting action
   * Opens meeting URL in new tab if available, or calls onJoin callback
   */
  const handleJoin = (e) => {
    e.stopPropagation();
    if (meetingUrl) {
      window.open(meetingUrl, '_blank', 'noopener,noreferrer');
    }
    if (onJoin) {
      onJoin(event);
    }
  };

  /**
   * Handle Prep action
   * Opens preparation materials or calls onPrep callback
   */
  const handlePrep = (e) => {
    e.stopPropagation();
    if (onPrep) {
      onPrep(event);
    }
  };

  /**
   * Handle Skip action
   * Hides event from view or calls onSkip callback
   */
  const handleSkip = (e) => {
    e.stopPropagation();
    if (onSkip) {
      onSkip(event);
    }
  };

  /**
   * Handle item click
   * Opens event details or calls onClick callback
   */
  const handleClick = () => {
    if (onClick) {
      onClick(event);
    }
  };

  // Build class names
  const itemClasses = [
    'schedule-item',
    `schedule-item--${typeClass}`,
    status === 'past' ? 'schedule-item--past' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={itemClasses}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Time column on left - min-width 50px */}
      <span className="schedule-time">{timeStr}</span>

      {/* Event content - title, dot, and location */}
      <div className="schedule-content">
        <p className="schedule-name">
          {/* Color dot - 8x8px circle matching event type */}
          <span className={`schedule-dot schedule-dot--${typeClass}`} />
          {title}
          {/* NOW badge if event is currently happening */}
          {isNow && (
            <span className="schedule-badge schedule-badge--now">
              NOW
            </span>
          )}
        </p>

        {/* Location info if available */}
        {location && (
          <p className="schedule-location">
            {location}
          </p>
        )}
      </div>

      {/* Hover action buttons - Join (primary), Prep, Skip */}
      {hasActions && (
        <div className="schedule-actions">
          {/* Join button - shows if event has meeting URL or onJoin callback */}
          {(meetingUrl || onJoin) && (
            <button
              type="button"
              className="schedule-action-btn join"
              onClick={handleJoin}
              aria-label={`Join meeting: ${title}`}
              title="Join Meeting"
            >
              Join
            </button>
          )}

          {/* Prep button - shows if onPrep callback provided */}
          {onPrep && (
            <button
              type="button"
              className="schedule-action-btn prep"
              onClick={handlePrep}
              aria-label={`Prepare for: ${title}`}
              title="Prepare"
            >
              Prep
            </button>
          )}

          {/* Skip button - shows if onSkip callback provided */}
          {onSkip && (
            <button
              type="button"
              className="schedule-action-btn skip"
              onClick={handleSkip}
              aria-label={`Skip: ${title}`}
              title="Skip"
            >
              Skip
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// PropTypes for type checking and documentation
ScheduleItem.propTypes = {
  event: PropTypes.shape({
    title: PropTypes.string.isRequired,
    startTime: PropTypes.oneOfType([
      PropTypes.instanceOf(Date),
      PropTypes.string
    ]).isRequired,
    endTime: PropTypes.oneOfType([
      PropTypes.instanceOf(Date),
      PropTypes.string
    ]),
    location: PropTypes.string,
    type: PropTypes.oneOf(['meeting', 'deadline', 'reminder', 'work', 'personal', 'focus']),
    meetingUrl: PropTypes.string
  }).isRequired,
  onJoin: PropTypes.func,
  onPrep: PropTypes.func,
  onSkip: PropTypes.func,
  onClick: PropTypes.func,
  showActions: PropTypes.bool
};

export default ScheduleItem;
