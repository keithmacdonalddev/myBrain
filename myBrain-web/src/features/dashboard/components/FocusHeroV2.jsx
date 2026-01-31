/**
 * =============================================================================
 * FOCUSHEROV2.JSX - Today's Focus Hero Section (V2 Dashboard)
 * =============================================================================
 *
 * Displays the TODAY'S FOCUS section with:
 * 1. Header with section title and time remaining in the day
 * 2. Four metric cards: Overdue, Events, Inbox, Completed %
 * 3. "Currently Working On" card with progress and action buttons
 *
 * Design follows dashboard-design-principles.md:
 * - Metric values are large (32px) for quick scanning
 * - Generous padding (24px) for calm productivity
 * - Progress bar has gradient fill for visual interest
 * - Uses V2 CSS variables for theme consistency
 *
 * =============================================================================
 */

import { useMemo } from 'react';
import MetricCard from '../../../components/ui/MetricCard';
import './FocusHeroV2.css';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

/**
 * FocusHeroV2 - Today's Focus Hero Section
 *
 * @param {Object} stats - Metrics for the hero section
 * @param {number} stats.overdue - Number of overdue items
 * @param {number} stats.events - Number of events today
 * @param {number} stats.inbox - Number of inbox items
 * @param {number} stats.completedPercent - Percentage of tasks completed
 * @param {Object} currentTask - The task currently being worked on
 * @param {string} currentTask.title - Task title
 * @param {number} currentTask.progress - Progress percentage (0-100)
 * @param {string} currentTask.timeRemaining - Estimated time remaining
 * @param {Function} onComplete - Handler for completing the current task
 * @param {Function} onPause - Handler for pausing the current task
 * @param {Function} onSkip - Handler for skipping the current task
 */
export default function FocusHeroV2({
  stats = {},
  currentTask = null,
  onComplete,
  onPause,
  onSkip
}) {
  // Calculate current time and remaining work hours
  const timeInfo = useMemo(() => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    // Calculate time remaining until end of workday (assume 6 PM)
    const endOfDay = new Date(now);
    endOfDay.setHours(18, 0, 0, 0);

    const diffMs = endOfDay - now;
    if (diffMs <= 0) {
      return { currentTime, remaining: 'Day complete' };
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      currentTime,
      remaining: `${hours}h ${minutes}m remaining`
    };
  }, []);

  // Default stats if not provided
  const safeStats = {
    overdue: stats.overdue ?? 0,
    events: stats.events ?? 0,
    inbox: stats.inbox ?? 0,
    completedPercent: stats.completedPercent ?? 0
  };

  return (
    <section className="v2-focus-section">
      {/* Section Header */}
      <div className="v2-focus-header">
        <h2 className="v2-section-title">TODAY'S FOCUS</h2>
        <span className="v2-time-remaining">
          {timeInfo.currentTime} - {timeInfo.remaining}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="v2-metrics-row">
        <MetricCard
          icon="⚠️"
          value={safeStats.overdue}
          label="Overdue"
          type={safeStats.overdue > 0 ? 'danger' : 'default'}
        />
        <MetricCard
          icon="📅"
          value={safeStats.events}
          label="Events"
        />
        <MetricCard
          icon="📥"
          value={safeStats.inbox}
          label="Inbox"
        />
        <MetricCard
          icon="✓"
          value={`${safeStats.completedPercent}%`}
          label="Completed"
          type="success"
        />
      </div>

      {/* Current Task Card */}
      {currentTask && (
        <div className="v2-current-task">
          <div className="v2-current-task-content">
            <span className="v2-current-task-label">Currently Working On</span>
            <h3 className="v2-current-task-name">{currentTask.title}</h3>
            <div className="v2-progress-bar">
              <div
                className="v2-progress-fill"
                style={{ width: `${currentTask.progress || 0}%` }}
              />
            </div>
            <span className="v2-progress-label">
              {currentTask.progress || 0}% complete
              {currentTask.timeRemaining && ` - Est. ${currentTask.timeRemaining} remaining`}
            </span>
          </div>
          <div className="v2-current-task-actions">
            <button
              className="v2-btn v2-btn-success"
              onClick={onComplete}
              aria-label="Complete task"
            >
              <span className="v2-btn-icon">✓</span>
              Complete
            </button>
            <button
              className="v2-btn v2-btn-secondary"
              onClick={onPause}
              aria-label="Pause task"
            >
              <span className="v2-btn-icon">⏸</span>
              Pause
            </button>
            <button
              className="v2-btn v2-btn-ghost"
              onClick={onSkip}
              aria-label="Skip task"
            >
              <span className="v2-btn-icon">→</span>
              Skip
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

