/**
 * ScheduleItem - Reusable event/schedule row component
 *
 * A flexible event row component matching V2 dashboard design.
 * Used in dashboard calendar widget and full calendar views.
 *
 * Features:
 * - Time column on left (formatted like "10:00 AM")
 * - Event details (title, optional location)
 * - Status indicator (upcoming, in-progress, past)
 * - Hover actions (Join if has link, Prepare, Skip)
 * - Different event types with subtle color coding
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
 *   onPrepare={() => {}}
 *   onSkip={() => {}}
 * />
 * ```
 */

import PropTypes from 'prop-types';
import { ExternalLink, FileText, X } from 'lucide-react';

/**
 * Format time in 12-hour format with AM/PM
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted time like "10:00 AM"
 */
function formatTime(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
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
 * Get border color CSS variable based on event type
 * Maps event types to V2 design system colors
 * @param {string} type - Event type (meeting, deadline, reminder, work, personal)
 * @returns {string} CSS color variable or hex value
 */
function getEventTypeColor(type) {
  const colorMap = {
    meeting: 'var(--v2-color-purple, #a855f7)',
    deadline: 'var(--v2-color-red, #ef4444)',
    reminder: 'var(--v2-color-yellow, #eab308)',
    work: 'var(--v2-color-blue, #3b82f6)',
    personal: 'var(--v2-color-green, #22c55e)',
  };

  return colorMap[type] || 'var(--v2-accent-primary)';
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
 * @param {string} [props.event.type] - Event type (meeting, deadline, reminder, work, personal)
 * @param {string} [props.event.meetingUrl] - Meeting URL for Join action
 * @param {Function} [props.onJoin] - Callback when Join button is clicked
 * @param {Function} [props.onPrepare] - Callback when Prepare button is clicked
 * @param {Function} [props.onSkip] - Callback when Skip button is clicked
 * @param {Function} [props.onClick] - Callback when item is clicked
 * @returns {JSX.Element} Schedule item component
 */
function ScheduleItem({
  event,
  onJoin,
  onPrepare,
  onSkip,
  onClick
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
  const borderColor = getEventTypeColor(type);

  // Check if event is happening now
  const isNow = status === 'in-progress';

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
   * Handle Prepare action
   * Opens preparation materials or calls onPrepare callback
   */
  const handlePrepare = (e) => {
    e.stopPropagation();
    if (onPrepare) {
      onPrepare(event);
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

  // Apply status class for styling
  const statusClass = status === 'past' ? 'v2-event-item--past' : '';

  return (
    <div
      className={`v2-event-item v2-event-item--${type} ${statusClass}`}
      style={{ borderLeftColor: borderColor }}
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
      {/* Time column on left */}
      <div className="v2-event-time">
        <span className="v2-event-time__start">{timeStr}</span>
      </div>

      {/* Event content - title and location */}
      <div className="v2-event-content">
        <div className="v2-event-title">
          {title}
          {/* NOW badge if event is currently happening */}
          {isNow && (
            <span className="v2-event-badge v2-event-badge--now">
              NOW
            </span>
          )}
        </div>

        {/* Location info if available */}
        {location && (
          <div className="v2-event-location">
            {location}
          </div>
        )}
      </div>

      {/* Hover action buttons */}
      <div className="v2-event-actions">
        {/* Join button - only shows if event has meeting URL */}
        {meetingUrl && onJoin && (
          <button
            type="button"
            className="v2-event-action v2-event-action--join"
            onClick={handleJoin}
            aria-label={`Join meeting: ${title}`}
            title="Join Meeting"
          >
            <ExternalLink className="v2-icon-sm" />
          </button>
        )}

        {/* Prepare button - shows if onPrepare callback provided */}
        {onPrepare && (
          <button
            type="button"
            className="v2-event-action v2-event-action--prepare"
            onClick={handlePrepare}
            aria-label={`Prepare for: ${title}`}
            title="Prepare"
          >
            <FileText className="v2-icon-sm" />
          </button>
        )}

        {/* Skip button - shows if onSkip callback provided */}
        {onSkip && (
          <button
            type="button"
            className="v2-event-action v2-event-action--skip"
            onClick={handleSkip}
            aria-label={`Skip: ${title}`}
            title="Skip"
          >
            <X className="v2-icon-sm" />
          </button>
        )}
      </div>
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
    type: PropTypes.oneOf(['meeting', 'deadline', 'reminder', 'work', 'personal']),
    meetingUrl: PropTypes.string
  }).isRequired,
  onJoin: PropTypes.func,
  onPrepare: PropTypes.func,
  onSkip: PropTypes.func,
  onClick: PropTypes.func
};

export default ScheduleItem;
