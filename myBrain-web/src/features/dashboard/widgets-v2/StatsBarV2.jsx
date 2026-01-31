/**
 * StatsBarV2 - Key metrics bar for V2 dashboard
 *
 * Displays quick stats in a horizontal bar below the greeting header:
 * - Tasks completed today
 * - Tasks due today
 * - Inbox items to process
 * - Notes created this week
 *
 * Uses v2 CSS variables for consistent styling with the V2 dashboard.
 */

import { CheckCircle, Clock, Inbox, FileText } from 'lucide-react';

/**
 * StatsBarV2 Component
 *
 * @param {Object} props - Component props
 * @param {Object} props.stats - Stats object containing:
 *   @param {number} props.stats.completedToday - Number of tasks completed today
 *   @param {number} props.stats.dueToday - Number of tasks due today
 *   @param {number} props.stats.inboxCount - Number of items in inbox
 *   @param {number} props.stats.notesThisWeek - Number of notes created this week
 */
function StatsBarV2({ stats = {} }) {
  // Destructure with defaults to handle undefined/null values gracefully
  const {
    completedToday = 0,
    dueToday = 0,
    inboxCount = 0,
    notesThisWeek = 0,
  } = stats;

  // Configuration for each stat card
  // Each stat has an icon, label, and value
  const statItems = [
    {
      id: 'completed',
      icon: CheckCircle,
      label: 'Completed Today',
      value: completedToday,
    },
    {
      id: 'due',
      icon: Clock,
      label: 'Due Today',
      value: dueToday,
    },
    {
      id: 'inbox',
      icon: Inbox,
      label: 'Inbox',
      value: inboxCount,
    },
    {
      id: 'notes',
      icon: FileText,
      label: 'Notes This Week',
      value: notesThisWeek,
    },
  ];

  return (
    <div className="v2-stats-bar">
      {statItems.map((stat) => {
        const IconComponent = stat.icon;
        return (
          <div key={stat.id} className="v2-stat-card">
            {/* Icon container with colored background */}
            <div className="v2-stat-icon">
              <IconComponent className="v2-icon-sm" />
            </div>

            {/* Stat content: value and label */}
            <div className="v2-stat-content">
              <span className="v2-stat-value">{stat.value}</span>
              <span className="v2-stat-label">{stat.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default StatsBarV2;
