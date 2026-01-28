/**
 * =============================================================================
 * NAVIGATIONZONE.JSX - Quick Access Navigation
 * =============================================================================
 *
 * Simple navigation buttons to key areas of the app.
 * Provides quick access to commonly used features.
 *
 * Links:
 * - Today: Daily focus view
 * - Tasks: All tasks
 * - Notes: All notes
 * - Projects: Project list
 * - Calendar: Full calendar view
 *
 * =============================================================================
 */

import { Link } from 'react-router-dom';
import { Sun, CheckSquare, FileText, FolderKanban, Calendar } from 'lucide-react';

// Navigation items configuration
const NAV_ITEMS = [
  {
    id: 'today',
    label: 'Today',
    icon: Sun,
    path: '/app/today',
    color: 'amber'
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: CheckSquare,
    path: '/app/tasks',
    color: 'orange'
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: FileText,
    path: '/app/notes',
    color: 'blue'
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: FolderKanban,
    path: '/app/projects',
    color: 'purple'
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: Calendar,
    path: '/app/calendar',
    color: 'green'
  }
];

/**
 * NavigationZone
 * --------------
 * Quick access navigation buttons to main areas.
 */
export default function NavigationZone() {
  return (
    <section className="navigation-zone">
      <h2 className="navigation-zone-title">Quick Access</h2>
      <div className="navigation-zone-grid">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`navigation-zone-item navigation-zone-item-${item.color}`}
            >
              <Icon className="navigation-zone-icon" />
              <span className="navigation-zone-label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
