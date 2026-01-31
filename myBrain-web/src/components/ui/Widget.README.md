# Widget Component

A reusable, standardized dashboard widget container component for the V2 dashboard.

## Overview

The `Widget` component provides a consistent container structure for all dashboard widgets with built-in support for:
- Header with title and optional icon
- Optional dropdown menu for filters/actions
- Loading states with skeleton UI
- Error states with helpful messages
- Flexible content area using children pattern

## Location

`myBrain-web/src/components/ui/Widget.jsx`

## CSS Variables Used

The Widget component uses V2 CSS variables for styling consistency:

```css
--v2-bg-surface         /* Widget background */
--v2-border-default     /* Widget border */
--v2-radius-lg          /* Border radius */
--v2-spacing-lg         /* Internal padding */
--v2-text-primary       /* Title color */
--v2-text-secondary     /* Secondary text */
--v2-text-tertiary      /* Muted text */
--v2-bg-elevated        /* Skeleton items */
--v2-bg-surface-hover   /* Hover states */
--v2-status-error       /* Error state color */
```

All styles are defined in `myBrain-web/src/features/dashboard/styles/dashboard-v2.css`

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | string | Yes | - | Widget title displayed in header |
| `icon` | string \| node | No | - | Icon displayed before title (emoji or React element) |
| `children` | node | No | - | Widget content |
| `actions` | array | No | - | Dropdown menu items: `[{ label: string, value: string }]` |
| `actionValue` | string | No | - | Currently selected action value (controlled) |
| `onActionChange` | function | No | - | Callback when action selection changes: `(value) => void` |
| `className` | string | No | '' | Additional CSS classes |
| `loading` | boolean | No | false | Show loading skeleton instead of content |
| `error` | string | No | null | Error message to display (hides content) |

## Basic Usage

### Simple Widget

```jsx
import Widget from '../../../components/ui/Widget';

function MyWidget() {
  return (
    <Widget title="My Widget">
      <div className="widget-content">
        <p>Widget content goes here</p>
      </div>
    </Widget>
  );
}
```

### Widget with Icon

```jsx
<Widget title="Tasks" icon="📋">
  <TaskList tasks={tasks} />
</Widget>
```

### Widget with Dropdown Filter

```jsx
function TasksWidget({ tasks }) {
  const [filter, setFilter] = useState('today');

  const actions = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'All', value: 'all' }
  ];

  const filteredTasks = filterTasks(tasks, filter);

  return (
    <Widget
      title="Tasks"
      icon="📋"
      actions={actions}
      actionValue={filter}
      onActionChange={setFilter}
    >
      <TaskList tasks={filteredTasks} />
    </Widget>
  );
}
```

## State Management

### Loading State

```jsx
function DataWidget() {
  const { data, isLoading } = useQuery(['data'], fetchData);

  return (
    <Widget title="Data" loading={isLoading}>
      {data && <DataDisplay data={data} />}
    </Widget>
  );
}
```

### Error State

```jsx
function DataWidget() {
  const { data, error } = useQuery(['data'], fetchData);

  return (
    <Widget
      title="Data"
      error={error?.message}
    >
      {data && <DataDisplay data={data} />}
    </Widget>
  );
}
```

### Combined States

```jsx
function SmartWidget() {
  const { data, isLoading, error } = useQuery(['data'], fetchData);

  return (
    <Widget
      title="Smart Widget"
      icon="⚡"
      loading={isLoading}
      error={error?.message}
    >
      {data && <Content data={data} />}
    </Widget>
  );
}
```

## Empty State Pattern

When there's no data to display, use the v2-empty-state class:

```jsx
<Widget title="Tasks" icon="📋">
  {tasks.length === 0 ? (
    <div className="v2-empty-state">
      <span className="v2-icon-lg">📭</span>
      <p>No tasks yet</p>
      <button className="v2-btn v2-btn--primary" onClick={onCreateTask}>
        Create your first task
      </button>
    </div>
  ) : (
    <TaskList tasks={tasks} />
  )}
</Widget>
```

## Custom Styling

Apply custom classes for specific widget types:

```jsx
<Widget
  title="Activity Log"
  icon="⚡"
  className="activity-log-widget"
>
  <ActivityLog entries={entries} />
</Widget>
```

## Structure

The component renders this HTML structure:

```html
<div class="v2-widget widget">
  <div class="v2-widget__header widget-header">
    <div class="v2-widget__title widget-title">
      <span class="v2-widget__icon">📋</span>
      <h3>Widget Title</h3>
    </div>
    <select class="widget-dropdown v2-widget-dropdown">
      <option value="today">Today</option>
    </select>
  </div>
  <div class="v2-widget__content">
    <!-- Your content here -->
  </div>
</div>
```

## Loading Skeleton

When `loading={true}`, displays 3 skeleton items:

```jsx
<div className="skeleton-v2-list-item">
  <div className="skeleton-v2" />  <!-- Circle -->
  <div>
    <div className="skeleton-v2" />  <!-- Title line -->
    <div className="skeleton-v2" />  <!-- Meta line -->
  </div>
</div>
```

## Error Display

When `error` prop is provided:

```jsx
<div className="v2-empty-state">
  <span className="v2-icon-lg">⚠️</span>
  <p style={{ color: 'var(--v2-status-error)' }}>
    {error || 'Failed to load widget'}
  </p>
</div>
```

## Accessibility

- Uses semantic HTML: `<h3>` for titles, `<select>` for dropdowns
- Error states use color AND icon for visibility
- Loading states show skeleton placeholders
- Dropdown has proper role="combobox" for screen readers

## Testing

Tests are located in `Widget.test.jsx` and cover:
- Basic rendering
- Icon display
- Loading state
- Error state
- Dropdown functionality
- State callbacks
- Custom classes

Run tests:
```bash
npm test Widget.test.jsx
```

## Migrating Existing Widgets

To convert an existing widget to use this component:

1. **Replace the wrapper div:**
   ```jsx
   // Before
   <div className="widget task-widget">
     <div className="widget-header">
       <span className="widget-title">📋 Tasks</span>
     </div>
     {/* content */}
   </div>

   // After
   <Widget title="Tasks" icon="📋">
     {/* content */}
   </Widget>
   ```

2. **Convert filter dropdowns:**
   ```jsx
   // Before
   <select className="widget-dropdown" onChange={handleChange}>
     <option>Today</option>
   </select>

   // After
   <Widget
     title="Tasks"
     actions={[{ label: 'Today', value: 'today' }]}
     actionValue={filter}
     onActionChange={setFilter}
   >
   ```

3. **Update loading/error handling:**
   ```jsx
   // Before
   {isLoading ? <Spinner /> : <Content />}
   {error && <ErrorMessage />}

   // After
   <Widget loading={isLoading} error={error?.message}>
     <Content />
   </Widget>
   ```

## Related Components

- `WidgetErrorBoundary.jsx` - Error boundary wrapper for widgets
- `Skeleton.jsx` - Skeleton loading components (not used here, using inline skeletons)
- `EmptyState.jsx` - Empty state component (can be used inside Widget)

## CSS Classes Reference

All CSS classes are defined in `dashboard-v2.css`:

- `.v2-widget` - Main widget container
- `.v2-widget__header` - Header section
- `.v2-widget__title` - Title container
- `.v2-widget__icon` - Icon wrapper
- `.v2-widget__content` - Content area
- `.widget-dropdown` - Dropdown select
- `.v2-empty-state` - Empty state container
- `.skeleton-v2-list-item` - Loading skeleton item
- `.skeleton-v2` - Animated skeleton element

## Examples

See `Widget.example.jsx` for comprehensive usage examples including:
- Basic widgets
- Widgets with icons
- Dropdown filters
- Loading states
- Error states
- Empty states
- Custom styling
- Data-driven widgets
