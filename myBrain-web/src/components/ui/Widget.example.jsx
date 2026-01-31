/**
 * Widget Component - Usage Examples
 *
 * This file demonstrates various ways to use the Widget component.
 * Copy these patterns when creating new dashboard widgets.
 */

import { useState } from 'react';
import Widget from './Widget';

/**
 * Example 1: Basic Widget
 * Simplest form with just title and content
 */
export function BasicWidgetExample() {
  return (
    <Widget title="Basic Widget">
      <div style={{ padding: '16px' }}>
        <p>This is a basic widget with just content.</p>
      </div>
    </Widget>
  );
}

/**
 * Example 2: Widget with Icon
 * Add an emoji or icon to the title
 */
export function IconWidgetExample() {
  return (
    <Widget title="Tasks" icon="📋">
      <div className="task-list">
        <p>Task 1</p>
        <p>Task 2</p>
        <p>Task 3</p>
      </div>
    </Widget>
  );
}

/**
 * Example 3: Widget with Dropdown Actions
 * Provides a filter/view selector in the header
 */
export function DropdownWidgetExample() {
  const [filter, setFilter] = useState('today');

  const actions = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'All', value: 'all' },
  ];

  return (
    <Widget
      title="Filtered Tasks"
      icon="📋"
      actions={actions}
      actionValue={filter}
      onActionChange={setFilter}
    >
      <div className="task-list">
        <p>Showing: {filter}</p>
      </div>
    </Widget>
  );
}

/**
 * Example 4: Loading State
 * Show skeleton loading while fetching data
 */
export function LoadingWidgetExample() {
  const [isLoading] = useState(true);

  return (
    <Widget
      title="Loading Widget"
      icon="⏳"
      loading={isLoading}
    >
      <div>This content is hidden while loading</div>
    </Widget>
  );
}

/**
 * Example 5: Error State
 * Display error message when data fails to load
 */
export function ErrorWidgetExample() {
  const error = "Failed to fetch tasks from the server";

  return (
    <Widget
      title="Failed Widget"
      icon="📋"
      error={error}
    >
      <div>This content is hidden when error occurs</div>
    </Widget>
  );
}

/**
 * Example 6: Data-Driven Widget
 * Real-world example with data fetching states
 */
export function DataDrivenWidgetExample() {
  // Simulated data fetching
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  // Simulate data fetch
  React.useEffect(() => {
    setTimeout(() => {
      setData(['Item 1', 'Item 2', 'Item 3']);
      setIsLoading(false);
    }, 1000);
  }, []);

  const actions = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Completed', value: 'completed' },
  ];

  return (
    <Widget
      title="My Items"
      icon="📦"
      actions={actions}
      actionValue={filter}
      onActionChange={setFilter}
      loading={isLoading}
      error={error}
    >
      <div className="item-list">
        {data && data.map((item, index) => (
          <div key={index} className="item">
            {item}
          </div>
        ))}
      </div>
    </Widget>
  );
}

/**
 * Example 7: Empty State Pattern
 * Show helpful message when no data is available
 */
export function EmptyStateWidgetExample() {
  const tasks = [];

  return (
    <Widget title="Tasks" icon="📋">
      {tasks.length === 0 ? (
        <div className="v2-empty-state">
          <span className="v2-icon-lg">📭</span>
          <p>No tasks yet</p>
          <button className="v2-btn v2-btn--primary">
            Create your first task
          </button>
        </div>
      ) : (
        <div className="task-list">
          {tasks.map(task => <div key={task.id}>{task.title}</div>)}
        </div>
      )}
    </Widget>
  );
}

/**
 * Example 8: Custom Styling
 * Apply custom classes for specific widget types
 */
export function CustomStyledWidgetExample() {
  return (
    <Widget
      title="System Activity"
      icon="⚡"
      className="activity-log-widget"
    >
      <div className="v2-activity-log">
        <div className="v2-log-entry">
          <span className="v2-log-time">10:30</span>
          <span className="v2-log-action">
            Task <span className="highlight">completed</span>
          </span>
        </div>
      </div>
    </Widget>
  );
}

/**
 * Full Dashboard Example
 * Shows how multiple widgets work together
 */
export function DashboardExample() {
  return (
    <div className="v2-widget-grid">
      <IconWidgetExample />
      <DropdownWidgetExample />
      <ErrorWidgetExample />
      <EmptyStateWidgetExample />
    </div>
  );
}
