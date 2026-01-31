/**
 * ActivityLogWidgetV2 - Terminal-style activity log widget
 *
 * Features:
 * - Dark terminal aesthetic with JetBrains Mono font
 * - Pulsing green status light in header
 * - Filter dropdown: Today / Yesterday / This Week
 * - Log entries with timestamp, action verb (color-coded), and item name
 * - Footer showing count of displayed actions
 */

import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { format, isToday, isYesterday, subDays, isAfter, startOfDay } from 'date-fns';

/**
 * Activity type to display configuration
 * Maps API activity types to display text and highlight color class
 */
const ACTIVITY_CONFIG = {
  // Green highlights (success/creation actions)
  task_completed: { verb: 'Completed', colorClass: '' },
  task_created: { verb: 'Created', colorClass: '' },
  project_created: { verb: 'Started', colorClass: '' },
  project_completed: { verb: 'Finished', colorClass: '' },
  note_created: { verb: 'Created note', colorClass: '' },

  // Amber highlights (modification actions)
  note_updated: { verb: 'Updated', colorClass: 'amber' },
  project_updated: { verb: 'Updated', colorClass: 'amber' },

  // Blue highlights (connection/sharing actions)
  file_uploaded: { verb: 'Uploaded', colorClass: 'blue' },
  connection_made: { verb: 'Connected with', colorClass: 'blue' },
  item_shared: { verb: 'Shared', colorClass: 'blue' },

  // Default fallback
  default: { verb: 'Activity', colorClass: '' },
};

/**
 * Get display configuration for an activity type
 *
 * @param {string} type - Activity type from API
 * @returns {Object} Display configuration with verb and colorClass
 */
const getActivityConfig = (type) => {
  return ACTIVITY_CONFIG[type] || ACTIVITY_CONFIG.default;
};

/**
 * Format timestamp to HH:mm format
 *
 * @param {string} dateString - ISO timestamp string
 * @returns {string} Formatted time (e.g., "14:32")
 */
const formatTime = (dateString) => {
  try {
    return format(new Date(dateString), 'HH:mm');
  } catch {
    return '--:--';
  }
};

/**
 * ActivityLogWidgetV2 Component
 *
 * @param {Object} props - Component props
 * @param {Array} props.activity - Array of activity items from dashboard API
 * @param {boolean} props.loading - Loading state for skeleton display
 */
function ActivityLogWidgetV2({ activity = [], loading = false }) {
  // Filter state: 'today' | 'yesterday' | 'week'
  const [filter, setFilter] = useState('today');

  /**
   * Filter activities based on selected time period
   */
  const filteredActivities = useMemo(() => {
    if (!activity || activity.length === 0) return [];

    const now = new Date();
    const todayStart = startOfDay(now);
    const yesterdayStart = startOfDay(subDays(now, 1));
    const weekAgoStart = startOfDay(subDays(now, 7));

    return activity.filter((item) => {
      const itemDate = new Date(item.createdAt);

      switch (filter) {
        case 'today':
          return isToday(itemDate);
        case 'yesterday':
          return isYesterday(itemDate);
        case 'week':
          return isAfter(itemDate, weekAgoStart);
        default:
          return true;
      }
    });
  }, [activity, filter]);

  /**
   * Handle filter dropdown change
   */
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  /**
   * Render loading skeleton for terminal-style entries
   */
  const renderSkeleton = () => (
    <div className="activity-log">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="log-entry">
          <span className="log-time" style={{ opacity: 0.3 }}>--:--</span>
          <span className="log-action" style={{ opacity: 0.3 }}>
            <span className="highlight">Loading</span> <span className="item">...</span>
          </span>
        </div>
      ))}
    </div>
  );

  /**
   * Render a single log entry
   */
  const renderLogEntry = (item) => {
    const config = getActivityConfig(item.type);
    const itemName = item.entitySnapshot?.title || 'Untitled';

    return (
      <div key={item._id || item.createdAt} className="log-entry">
        <span className="log-time">{formatTime(item.createdAt)}</span>
        <span className="log-action">
          <span className={`highlight ${config.colorClass}`}>{config.verb}</span>
          {' '}
          <span className="item">"{itemName}"</span>
        </span>
      </div>
    );
  };

  const isEmpty = filteredActivities.length === 0;
  const displayCount = filteredActivities.length;

  return (
    <div className="widget activity-log-widget">
      {/* Widget header with status light and filter dropdown */}
      <div className="widget-header">
        <span className="widget-title">
          <span className="status-light"></span>
          ACTIVITY LOG
        </span>
        <select
          className="widget-dropdown"
          value={filter}
          onChange={handleFilterChange}
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="week">This Week</option>
        </select>
      </div>

      {/* Activity log entries */}
      {loading ? (
        renderSkeleton()
      ) : isEmpty ? (
        <div className="activity-log">
          <div className="v2-empty-state" style={{ color: 'var(--v2-text-secondary)' }}>
            <p>No activity for this period</p>
          </div>
        </div>
      ) : (
        <div className="activity-log">
          {filteredActivities.slice(0, 8).map(renderLogEntry)}
        </div>
      )}

      {/* Footer with count */}
      <div className="activity-log-footer">
        Showing last {displayCount} {displayCount === 1 ? 'action' : 'actions'}
      </div>
    </div>
  );
}

ActivityLogWidgetV2.propTypes = {
  /** Array of activity items from dashboard API */
  activity: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string,
      type: PropTypes.string.isRequired,
      entitySnapshot: PropTypes.shape({
        title: PropTypes.string,
      }),
      createdAt: PropTypes.string.isRequired,
      userId: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    })
  ),
  /** Loading state for skeleton display */
  loading: PropTypes.bool,
};

export default ActivityLogWidgetV2;
