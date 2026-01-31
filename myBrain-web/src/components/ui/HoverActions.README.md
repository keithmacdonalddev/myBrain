# HoverActions Component

A reusable reveal-on-hover action buttons component used throughout the V2 dashboard.

## Overview

The `HoverActions` component provides a consistent pattern for inline actions that appear when hovering over items in lists, cards, and widgets. It's used extensively in the V2 dashboard widgets (tasks, events, notes, inbox) to provide quick access to common actions.

## Features

- **Hover Reveal**: Hidden by default, revealed on parent hover
- **Smooth Animations**: Fade in/slide animation with staggered timing
- **Multiple Variants**: Support for default, danger, primary, and success button styles
- **Accessibility**: Keyboard navigable with proper ARIA labels and focus states
- **Theming**: Uses V2 CSS variables for automatic light/dark mode support
- **Flexible Positioning**: Align actions to left or right
- **Forced Visibility**: Optional override to always show actions

## Installation

```jsx
import HoverActions from './components/ui/HoverActions';
```

## Basic Usage

```jsx
import HoverActions from './components/ui/HoverActions';
import { Edit, Trash } from 'lucide-react';

function TaskItem({ task }) {
  const handleEdit = (e) => {
    e.stopPropagation();
    // Edit logic
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    // Delete logic
  };

  return (
    <div className="v2-task-item">
      <div className="v2-task-content">
        <span className="v2-task-title">{task.title}</span>
      </div>

      <HoverActions
        actions={[
          { icon: <Edit />, label: 'Edit', onClick: handleEdit, variant: 'default' },
          { icon: <Trash />, label: 'Delete', onClick: handleDelete, variant: 'danger' },
        ]}
      />
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `actions` | `Array<Action>` | Required | Array of action objects (see Action shape below) |
| `visible` | `boolean` | `false` | Force actions to be visible (override hover behavior) |
| `position` | `'left' \| 'right'` | `'right'` | Alignment of action buttons |
| `className` | `string` | `''` | Additional CSS classes |

### Action Object Shape

```typescript
{
  icon: ReactNode;        // Icon component (e.g., from lucide-react)
  label: string;          // Accessible label and tooltip text
  onClick: Function;      // Click handler
  variant?: 'default' | 'danger' | 'primary' | 'success';  // Button style variant
  disabled?: boolean;     // Disable the button
}
```

## Variants

### Default
Neutral gray styling for general actions.

```jsx
{ icon: <Edit />, label: 'Edit', onClick: handleEdit, variant: 'default' }
```

### Danger
Red accent for destructive actions (delete, remove, etc.).

```jsx
{ icon: <Trash />, label: 'Delete', onClick: handleDelete, variant: 'danger' }
```

### Primary
Blue accent for primary actions (save, confirm, etc.).

```jsx
{ icon: <Check />, label: 'Approve', onClick: handleApprove, variant: 'primary' }
```

### Success
Green accent for positive actions (complete, accept, etc.).

```jsx
{ icon: <Check />, label: 'Complete', onClick: handleComplete, variant: 'success' }
```

## Parent Component Requirements

For the hover reveal effect to work, the parent component needs to show the actions on hover:

```css
.parent-item:hover .v2-hover-actions {
  opacity: 1;
}
```

**Example parent classes:**
- `.v2-task-item:hover .v2-hover-actions`
- `.v2-event-item:hover .v2-hover-actions`
- `.v2-inbox-item:hover .v2-hover-actions`
- `.v2-note-item:hover .v2-hover-actions`

This CSS is already included in `dashboard-v2.css` for all V2 dashboard widgets.

## Advanced Usage

### Forced Visibility

Show actions permanently (e.g., when item is selected):

```jsx
<HoverActions
  visible={isSelected}
  actions={actions}
/>
```

### Left Alignment

Align actions to the left side:

```jsx
<HoverActions
  position="left"
  actions={actions}
/>
```

### Conditional Actions

Build actions array based on permissions or state:

```jsx
const actions = [
  canEdit && {
    icon: <Edit />,
    label: 'Edit',
    onClick: handleEdit,
    variant: 'default'
  },
  canDelete && {
    icon: <Trash />,
    label: 'Delete',
    onClick: handleDelete,
    variant: 'danger'
  },
].filter(Boolean);

<HoverActions actions={actions} />
```

### Disabled State

Disable actions during mutations:

```jsx
const deleteItem = useMutation({ ... });

<HoverActions
  actions={[
    {
      icon: <Trash />,
      label: 'Delete',
      onClick: handleDelete,
      variant: 'danger',
      disabled: deleteItem.isPending
    }
  ]}
/>
```

## Accessibility

The component follows accessibility best practices:

- **Keyboard Navigation**: All buttons are keyboard focusable via Tab key
- **ARIA Labels**: Each button has `aria-label` matching the label prop
- **Tooltips**: `title` attribute provides hover tooltips
- **Focus States**: Clear focus rings for keyboard navigation
- **Button Type**: All buttons have `type="button"` to prevent form submission
- **Group Role**: Container has `role="group"` with descriptive `aria-label`

## Animation

Actions animate in with a subtle fade and slide effect when revealed. Individual buttons have staggered animation delays for a polished appearance:

- Button 1: 0ms delay
- Button 2: 30ms delay
- Button 3: 60ms delay
- Button 4: 90ms delay

## Theming

The component uses V2 CSS variables for automatic theming:

- `--v2-bg-surface` - Button background
- `--v2-border-default` - Border color
- `--v2-text-secondary` - Icon color
- `--v2-status-error` - Danger variant color
- `--v2-accent-primary` - Primary variant color
- `--v2-status-success` - Success variant color

All variants automatically adapt to light and dark mode.

## Testing

Run tests:

```bash
npm test HoverActions.test.jsx
```

The component includes comprehensive tests for:
- Rendering all action buttons
- Click handlers
- Variant classes
- Visibility control
- Position alignment
- Disabled state
- Accessibility attributes

## Examples

See `HoverActions.example.jsx` for complete usage examples including:

1. Basic usage with default variant
2. Primary actions with success variant
3. Forced visibility and position control
4. Multiple actions with different variants
5. Conditional actions with disabled state
6. Integration with TanStack Query mutations

## Related Components

- Dashboard V2 Widgets (TasksWidgetV2, EventsWidgetV2, InboxWidgetV2, NotesWidgetV2)
- All use HoverActions for consistent inline actions

## Migration Notes

If you're refactoring existing widgets to use this component:

**Before:**
```jsx
<div className="v2-task-actions">
  <button className="v2-action-btn" onClick={handleEdit}>
    <Edit />
  </button>
  <button className="v2-action-btn v2-action-btn--danger" onClick={handleDelete}>
    <Trash />
  </button>
</div>
```

**After:**
```jsx
<HoverActions
  actions={[
    { icon: <Edit />, label: 'Edit', onClick: handleEdit, variant: 'default' },
    { icon: <Trash />, label: 'Delete', onClick: handleDelete, variant: 'danger' },
  ]}
/>
```

Benefits:
- Less boilerplate
- Consistent styling
- Built-in accessibility
- Centralized animation logic
