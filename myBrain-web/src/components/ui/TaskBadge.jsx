/**
 * =============================================================================
 * TASKBADGE.JSX - Task Status/Priority Badge Component
 * =============================================================================
 *
 * Displays a small, colored badge indicating task timing (overdue, today, upcoming)
 * or priority level (urgent, high, medium, low).
 *
 * Props:
 * - variant: 'overdue' | 'today' | 'upcoming' | 'urgent' | 'high' | 'medium' | 'low'
 * - children: Badge text content
 *
 * Color Philosophy:
 * - OVERDUE uses ORANGE/AMBER, not red (red is reserved for true errors)
 * - Today uses blue (active/current)
 * - Upcoming uses gray (neutral/future)
 * - Priority variants match timing variants for consistency
 *
 * Typography:
 * - 10px uppercase with 600 weight for compact readability
 * - Slight letter-spacing for legibility at small size
 *
 * Uses V2 CSS variables for theme consistency.
 * Includes dark mode support with brighter text colors for visibility.
 *
 * =============================================================================
 */

import PropTypes from 'prop-types';
import './TaskBadge.css';

/**
 * TaskBadge - Displays task timing or priority status
 *
 * @param {Object} props
 * @param {string} props.variant - Badge variant: 'overdue' | 'today' | 'upcoming' | 'urgent' | 'high' | 'medium' | 'low'
 * @param {React.ReactNode} props.children - Badge text content
 */
export default function TaskBadge({ variant = 'upcoming', children }) {
  return (
    <span className={`task-badge task-badge--${variant}`}>
      {children}
    </span>
  );
}

TaskBadge.propTypes = {
  variant: PropTypes.oneOf(['overdue', 'today', 'upcoming', 'urgent', 'high', 'medium', 'low']),
  children: PropTypes.node
};
