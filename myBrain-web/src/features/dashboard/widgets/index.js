/**
 * =============================================================================
 * WIDGETS INDEX - Dashboard Widget Exports
 * =============================================================================
 *
 * Central export point for all dashboard widgets.
 * Also exports the widget registry for dynamic loading.
 *
 * =============================================================================
 */

// Widget Components
export { default as TimeWidget } from './TimeWidget';
export { default as TasksWidget } from './TasksWidget';
export { default as EventsWidget } from './EventsWidget';
export { default as ProjectsWidget } from './ProjectsWidget';
export { default as StatsWidget } from './StatsWidget';
export { default as InboxWidget } from './InboxWidget';
export { default as ActivityWidget } from './ActivityWidget';

// Widget Registry
// Used for dynamic widget loading and configuration
export const WIDGET_REGISTRY = {
  time: {
    id: 'time',
    name: 'Time',
    component: 'TimeWidget',
    defaultSize: 'narrow',
    category: 'utility'
  },
  tasks: {
    id: 'tasks',
    name: "Today's Tasks",
    component: 'TasksWidget',
    defaultSize: 'default',
    category: 'productivity'
  },
  events: {
    id: 'events',
    name: "Today's Events",
    component: 'EventsWidget',
    defaultSize: 'default',
    category: 'productivity'
  },
  projects: {
    id: 'projects',
    name: 'Active Projects',
    component: 'ProjectsWidget',
    defaultSize: 'default',
    category: 'productivity'
  },
  stats: {
    id: 'stats',
    name: 'Progress Stats',
    component: 'StatsWidget',
    defaultSize: 'wide',
    category: 'overview'
  },
  inbox: {
    id: 'inbox',
    name: 'Inbox',
    component: 'InboxWidget',
    defaultSize: 'default',
    category: 'attention'
  },
  activity: {
    id: 'activity',
    name: 'Activity Feed',
    component: 'ActivityWidget',
    defaultSize: 'default',
    category: 'social'
  }
};

// Default widget order
export const DEFAULT_WIDGET_ORDER = [
  'tasks',
  'events',
  'projects',
  'stats',
  'inbox',
  'activity'
];
