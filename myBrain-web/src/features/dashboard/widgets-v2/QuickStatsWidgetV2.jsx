/**
 * QuickStatsWidgetV2 - Quick statistics widget with productivity metrics
 *
 * Features:
 * - 2x2 grid of colored stat cards (Tasks Done, Focus Time, Notes Created, Meetings)
 * - Filter dropdown: This Week / Last Week / This Month
 * - Productivity score bar at bottom with percentage and change indicator
 * - Loading skeleton state for async data
 * - Empty/zero state handling with graceful fallbacks
 */

import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * Color variants for stat cards
 * Maps stat types to CSS color class names
 */
const STAT_COLORS = {
  tasks: 'blue',
  focus: 'green',
  notes: 'purple',
  meetings: 'orange',
};

/**
 * Filter options for time period selection
 */
const FILTER_OPTIONS = [
  { value: 'week', label: 'This Week' },
  { value: 'lastWeek', label: 'Last Week' },
  { value: 'month', label: 'This Month' },
];

/**
 * QuickStatsWidgetV2 Component
 *
 * @param {Object} props - Component props
 * @param {Object} props.stats - Stats object from dashboard API
 * @param {number} props.stats.tasks.completed - Number of tasks completed
 * @param {number} props.stats.tasks.total - Total number of tasks
 * @param {number} props.stats.tasks.completionRate - Task completion percentage (0-100)
 * @param {number} props.eventsCount - Number of events/meetings
 * @param {number} props.notesCount - Number of notes created
 * @param {boolean} props.loading - Loading state for skeleton display
 */
function QuickStatsWidgetV2({
  stats = {},
  eventsCount = 0,
  notesCount = 0,
  loading = false,
}) {
  // Filter state: 'week' | 'lastWeek' | 'month'
  const [filter, setFilter] = useState('week');

  /**
   * Computed stat values with fallbacks
   * Note: Focus time is mocked for now (feature not yet implemented)
   */
  const computedStats = useMemo(() => {
    const tasksCompleted = stats?.tasks?.completed ?? 0;
    const completionRate = stats?.tasks?.completionRate ?? 0;

    return {
      tasksDone: tasksCompleted,
      focusTime: null, // Not implemented yet - will show "---"
      notesCreated: notesCount,
      meetings: eventsCount,
      productivityScore: Math.round(completionRate),
      // Mock change percentage - in real implementation this would compare to previous period
      productivityChange: completionRate > 0 ? 8 : 0,
    };
  }, [stats, eventsCount, notesCount]);

  /**
   * Handle filter dropdown change
   *
   * @param {React.ChangeEvent<HTMLSelectElement>} e - Change event
   */
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  /**
   * Format focus time display
   * Returns formatted string or placeholder if not available
   *
   * @param {number|null} hours - Focus time in hours
   * @returns {string} Formatted focus time
   */
  const formatFocusTime = (hours) => {
    if (hours === null || hours === undefined) return '---';
    if (hours === 0) return '0h';
    return `${hours}h`;
  };

  /**
   * Determine progress bar color based on score
   *
   * @param {number} score - Productivity score (0-100)
   * @returns {string} CSS color variable
   */
  const getProgressColor = (score) => {
    if (score >= 70) return 'var(--v2-green)';
    if (score >= 40) return 'var(--v2-orange)';
    return 'var(--v2-red)';
  };

  /**
   * Render loading skeleton for stat cards
   */
  const renderSkeleton = () => (
    <>
      <div className="v2-quick-stats-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="v2-quick-stat">
            <p
              className="v2-quick-stat-value skeleton-v2"
              style={{ width: '48px', height: '32px', margin: '0 auto' }}
            >
              &nbsp;
            </p>
            <p
              className="v2-quick-stat-label skeleton-v2"
              style={{ width: '64px', height: '14px', margin: '8px auto 0' }}
            >
              &nbsp;
            </p>
          </div>
        ))}
      </div>
      <div className="v2-productivity-score">
        <p
          className="v2-productivity-score-label skeleton-v2"
          style={{ width: '120px', height: '14px' }}
        >
          &nbsp;
        </p>
        <div className="v2-productivity-score-row">
          <span
            className="v2-productivity-value skeleton-v2"
            style={{ width: '40px', height: '32px' }}
          >
            &nbsp;
          </span>
          <div style={{ flex: 1 }}>
            <div className="v2-progress-bar">
              <div className="v2-progress-fill" style={{ width: '0%' }}></div>
            </div>
          </div>
          <span
            className="v2-productivity-change skeleton-v2"
            style={{ width: '32px', height: '16px' }}
          >
            &nbsp;
          </span>
        </div>
      </div>
    </>
  );

  /**
   * Format change indicator with sign
   *
   * @param {number} change - Change percentage
   * @returns {string} Formatted change with sign
   */
  const formatChange = (change) => {
    if (change === 0) return '0%';
    return change > 0 ? `+${change}%` : `${change}%`;
  };

  const { productivityScore, productivityChange } = computedStats;
  const isNegativeChange = productivityChange < 0;

  return (
    <div className="widget v2-quick-stats-widget">
      {/* Widget header with title and filter dropdown */}
      <div className="widget-header">
        <span className="widget-title">
          <span role="img" aria-label="Chart">
            &#128202;
          </span>
          This Week
        </span>
        <select
          className="widget-dropdown"
          value={filter}
          onChange={handleFilterChange}
          aria-label="Select time period"
        >
          {FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Stats grid and productivity score */}
      {loading ? (
        renderSkeleton()
      ) : (
        <>
          {/* 2x2 Stats Grid */}
          <div className="v2-quick-stats-grid">
            {/* Tasks Done */}
            <div className={`v2-quick-stat ${STAT_COLORS.tasks}`}>
              <p className="v2-quick-stat-value">{computedStats.tasksDone}</p>
              <p className="v2-quick-stat-label">Tasks Done</p>
            </div>

            {/* Focus Time */}
            <div className={`v2-quick-stat ${STAT_COLORS.focus}`}>
              <p className="v2-quick-stat-value">
                {formatFocusTime(computedStats.focusTime)}
              </p>
              <p className="v2-quick-stat-label">Focus Time</p>
            </div>

            {/* Notes Created */}
            <div className={`v2-quick-stat ${STAT_COLORS.notes}`}>
              <p className="v2-quick-stat-value">
                {computedStats.notesCreated}
              </p>
              <p className="v2-quick-stat-label">Notes Created</p>
            </div>

            {/* Meetings */}
            <div className={`v2-quick-stat ${STAT_COLORS.meetings}`}>
              <p className="v2-quick-stat-value">{computedStats.meetings}</p>
              <p className="v2-quick-stat-label">Meetings</p>
            </div>
          </div>

          {/* Productivity Score Section */}
          <div className="v2-productivity-score">
            <p className="v2-productivity-score-label">Productivity Score</p>
            <div className="v2-productivity-score-row">
              <span className="v2-productivity-value">{productivityScore}</span>
              <div style={{ flex: 1 }}>
                <div className="v2-progress-bar">
                  <div
                    className="v2-progress-fill"
                    style={{
                      width: `${productivityScore}%`,
                      background: getProgressColor(productivityScore),
                    }}
                  ></div>
                </div>
              </div>
              <span
                className={`v2-productivity-change ${isNegativeChange ? 'negative' : ''}`}
              >
                {formatChange(productivityChange)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

QuickStatsWidgetV2.propTypes = {
  /** Stats object from dashboard API containing task completion data */
  stats: PropTypes.shape({
    tasks: PropTypes.shape({
      completed: PropTypes.number,
      total: PropTypes.number,
      completionRate: PropTypes.number,
    }),
  }),
  /** Number of calendar events/meetings */
  eventsCount: PropTypes.number,
  /** Number of notes created */
  notesCount: PropTypes.number,
  /** Loading state for skeleton display */
  loading: PropTypes.bool,
};

export default QuickStatsWidgetV2;
