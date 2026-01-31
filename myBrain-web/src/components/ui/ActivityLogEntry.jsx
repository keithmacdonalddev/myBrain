/**
 * ActivityLogEntry - Terminal-style log entry for the Activity Log widget
 *
 * Features:
 * - Monospace font styling (JetBrains Mono)
 * - Muted timestamp on the left
 * - Color-coded action verbs (success/warning/error/info)
 * - Teal-colored item names
 * - Hover effect for row highlight
 * - Always dark themed (terminal aesthetic)
 *
 * Used within ActivityLogWidgetV2 to display individual activity items.
 *
 * @example
 * <ActivityLogEntry
 *   time="14:32"
 *   action="Completed"
 *   actionType="success"
 *   item="Review dashboard design"
 * />
 */

import PropTypes from 'prop-types';
import './ActivityLogEntry.css';

/**
 * Map actionType to CSS highlight class
 *
 * @param {string} actionType - The type of action
 * @returns {string} CSS class for highlight color
 */
const getHighlightClass = (actionType) => {
  const classMap = {
    success: '',        // Default green (#34C759)
    warning: 'amber',   // Amber (#FF9500)
    error: 'red',       // Red (#FF3B30)
    info: 'blue',       // Blue (#007AFF)
  };
  return classMap[actionType] || '';
};

/**
 * ActivityLogEntry Component
 *
 * @param {Object} props - Component props
 * @param {string} props.time - Formatted time string (e.g., "2:34 PM" or "14:32")
 * @param {string} props.action - Action verb (e.g., "Completed", "Created", "Updated")
 * @param {string} props.actionType - Color coding type: 'success' | 'warning' | 'error' | 'info'
 * @param {string} props.item - Item name to display (e.g., task title)
 * @param {string} props.details - Additional context text after the item
 * @param {string} props.className - Additional CSS classes
 */
function ActivityLogEntry({
  time,
  action,
  actionType = 'success',
  item,
  details,
  className = '',
}) {
  const highlightClass = getHighlightClass(actionType);

  return (
    <div className={`log-entry ${className}`}>
      <span className="log-time">{time}</span>
      <span className="log-action">
        <span className={`highlight ${highlightClass}`}>{action}</span>
        {item && (
          <>
            {' '}
            <span className="item">"{item}"</span>
          </>
        )}
        {details && <> {details}</>}
      </span>
    </div>
  );
}

ActivityLogEntry.propTypes = {
  /** Formatted time string (e.g., "2:34 PM" or "14:32") */
  time: PropTypes.string.isRequired,
  /** Action verb displayed with highlight color */
  action: PropTypes.string.isRequired,
  /** Color coding for the action: success (green), warning (amber), error (red), info (blue) */
  actionType: PropTypes.oneOf(['success', 'warning', 'error', 'info']),
  /** Item name to display after the action verb */
  item: PropTypes.string,
  /** Additional context text after the item */
  details: PropTypes.string,
  /** Additional CSS classes */
  className: PropTypes.string,
};

/**
 * StatusLight - Pulsing indicator light for activity log header
 *
 * A small circular indicator that pulses to show system activity.
 * Supports custom colors via CSS variable.
 *
 * @example
 * <StatusLight color="#34C759" pulsing={true} />
 */
function StatusLight({ color = '#34C759', pulsing = true }) {
  return (
    <span
      className={`status-light ${pulsing ? 'pulsing' : ''}`}
      style={{ '--status-color': color }}
      aria-hidden="true"
    />
  );
}

StatusLight.propTypes = {
  /** Color of the status light (CSS color value) */
  color: PropTypes.string,
  /** Whether the light should pulse */
  pulsing: PropTypes.bool,
};

export default ActivityLogEntry;
export { StatusLight };
