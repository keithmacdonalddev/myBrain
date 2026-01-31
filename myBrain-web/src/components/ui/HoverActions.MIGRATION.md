# HoverActions Migration Guide

This guide helps refactor existing V2 dashboard widgets to use the new reusable `HoverActions` component instead of inline action button code.

## Benefits of Migration

- **Less Boilerplate**: Reduce repetitive JSX and CSS
- **Consistent Styling**: Centralized styling across all widgets
- **Built-in Accessibility**: ARIA labels, keyboard navigation, focus states
- **Easier Maintenance**: Update one component instead of multiple widgets
- **Animation Included**: Staggered reveal animations out of the box

## Before and After Examples

### Example 1: InboxWidgetV2

**Before:**
```jsx
<div className="v2-inbox-actions">
  <button
    className="v2-item-action"
    onClick={(e) => handleConvertToTask(e, item._id)}
    aria-label="Convert to task"
    title="Convert to task"
  >
    <ArrowRightCircle className="v2-icon-sm" />
  </button>
  <button
    className="v2-item-action"
    onClick={(e) => handleArchive(e, item._id)}
    aria-label="Archive"
    title="Archive"
  >
    <Archive className="v2-icon-sm" />
  </button>
</div>
```

**After:**
```jsx
import HoverActions from '../../../components/ui/HoverActions';

<HoverActions
  actions={[
    {
      icon: <ArrowRightCircle className="v2-icon-sm" />,
      label: 'Convert to task',
      onClick: (e) => handleConvertToTask(e, item._id),
      variant: 'primary'
    },
    {
      icon: <Archive className="v2-icon-sm" />,
      label: 'Archive',
      onClick: (e) => handleArchive(e, item._id),
      variant: 'default'
    }
  ]}
/>
```

**Lines saved**: ~12 lines per widget item

---

### Example 2: NotesWidgetV2

**Before:**
```jsx
<div className="v2-note-actions">
  <button
    className="v2-item-action v2-item-action--danger"
    onClick={(e) => handleDelete(e, note._id)}
    aria-label="Delete"
    title="Delete"
  >
    <Trash className="v2-icon-sm" />
  </button>
</div>
```

**After:**
```jsx
import HoverActions from '../../../components/ui/HoverActions';

<HoverActions
  actions={[
    {
      icon: <Trash className="v2-icon-sm" />,
      label: 'Delete',
      onClick: (e) => handleDelete(e, note._id),
      variant: 'danger'
    }
  ]}
/>
```

**Lines saved**: ~8 lines per widget item

---

### Example 3: TasksWidgetV2 (with multiple actions)

**Before:**
```jsx
<div className="v2-task-actions">
  <button
    className="v2-action-btn"
    onClick={(e) => handleEdit(e, task._id)}
    aria-label="Edit"
    title="Edit"
  >
    <Edit className="v2-icon-sm" />
  </button>
  <button
    className="v2-action-btn v2-action-btn--danger"
    onClick={(e) => handleDelete(e, task._id)}
    aria-label="Delete"
    title="Delete"
  >
    <Trash className="v2-icon-sm" />
  </button>
  <button
    className="v2-action-btn v2-action-btn--success"
    onClick={(e) => handleComplete(e, task._id)}
    aria-label="Complete"
    title="Complete"
    disabled={task.completed}
  >
    <Check className="v2-icon-sm" />
  </button>
</div>
```

**After:**
```jsx
import HoverActions from '../../../components/ui/HoverActions';

<HoverActions
  actions={[
    {
      icon: <Edit className="v2-icon-sm" />,
      label: 'Edit',
      onClick: (e) => handleEdit(e, task._id),
      variant: 'default'
    },
    {
      icon: <Trash className="v2-icon-sm" />,
      label: 'Delete',
      onClick: (e) => handleDelete(e, task._id),
      variant: 'danger'
    },
    {
      icon: <Check className="v2-icon-sm" />,
      label: 'Complete',
      onClick: (e) => handleComplete(e, task._id),
      variant: 'success',
      disabled: task.completed
    }
  ]}
/>
```

**Lines saved**: ~18 lines per widget item

---

## Step-by-Step Migration Process

### Step 1: Import HoverActions

Add the import at the top of your widget file:

```jsx
import HoverActions from '../../../components/ui/HoverActions';
```

### Step 2: Identify Action Buttons

Find all instances of inline action buttons:
- Look for `className="v2-*-actions"` containers
- Look for button elements with click handlers inside widget items

### Step 3: Extract Action Data

Convert inline buttons to action objects:

```jsx
// From this:
<button
  className="v2-item-action v2-item-action--danger"
  onClick={(e) => handleDelete(e, item._id)}
  aria-label="Delete"
  title="Delete"
>
  <Trash className="v2-icon-sm" />
</button>

// To this:
{
  icon: <Trash className="v2-icon-sm" />,
  label: 'Delete',
  onClick: (e) => handleDelete(e, item._id),
  variant: 'danger'
}
```

### Step 4: Replace Inline Code

Replace the entire actions container with HoverActions:

```jsx
// Remove:
<div className="v2-note-actions">
  {/* ... inline buttons ... */}
</div>

// Add:
<HoverActions actions={[ /* action objects */ ]} />
```

### Step 5: Update CSS (if needed)

**Good news**: Most CSS is already in place! The parent hover styles are already defined in `dashboard-v2.css`:

```css
.v2-task-item:hover .v2-hover-actions { opacity: 1; }
.v2-event-item:hover .v2-hover-actions { opacity: 1; }
.v2-inbox-item:hover .v2-hover-actions { opacity: 1; }
.v2-note-item:hover .v2-hover-actions { opacity: 1; }
```

If you're creating a new widget type, add a similar hover rule.

### Step 6: Test

1. Hover over items - actions should appear
2. Click each action - handlers should fire correctly
3. Keyboard navigation - Tab through actions, press Enter
4. Screen reader - Check ARIA labels are announced

---

## Variant Mapping

Map your old CSS classes to new variants:

| Old Class | New Variant |
|-----------|-------------|
| `v2-item-action` (default) | `variant: 'default'` |
| `v2-item-action--danger` | `variant: 'danger'` |
| `v2-action-btn--primary` | `variant: 'primary'` |
| `v2-action-btn--success` | `variant: 'success'` |

---

## Common Patterns

### Pattern 1: Dynamic Actions with Mutation State

```jsx
const deleteItem = useMutation({ ... });

<HoverActions
  actions={[
    {
      icon: <Trash className="v2-icon-sm" />,
      label: 'Delete',
      onClick: (e) => handleDelete(e, item._id),
      variant: 'danger',
      disabled: deleteItem.isPending  // ← Disable during mutation
    }
  ]}
/>
```

### Pattern 2: Conditional Actions

```jsx
const actions = [
  canEdit && {
    icon: <Edit className="v2-icon-sm" />,
    label: 'Edit',
    onClick: handleEdit,
    variant: 'default'
  },
  canDelete && {
    icon: <Trash className="v2-icon-sm" />,
    label: 'Delete',
    onClick: handleDelete,
    variant: 'danger'
  }
].filter(Boolean);  // ← Remove falsy values

<HoverActions actions={actions} />
```

### Pattern 3: Force Visibility When Selected

```jsx
<HoverActions
  visible={isSelected}  // ← Show even without hover
  actions={actions}
/>
```

---

## CSS Cleanup After Migration

After migrating all widgets, you can remove these CSS rules from `dashboard-v2.css`:

- Widget-specific action container styles (`.v2-task-actions`, `.v2-event-actions`, etc.)
- Individual action button styles (`.v2-action-btn`, `.v2-item-action`, etc.)
- Variant-specific styles (`.v2-action-btn--danger`, etc.)

**Keep these:**
- Parent hover rules (`.v2-task-item:hover .v2-hover-actions`, etc.)

---

## Rollback Plan

If issues arise after migration:

1. **Revert component import**: Remove `import HoverActions`
2. **Restore inline code**: Uncomment old button code
3. **Test**: Verify old behavior works
4. **Report issue**: Document what went wrong for fixing

---

## Migration Checklist

Use this checklist when migrating each widget:

- [ ] Import HoverActions component
- [ ] Identify all inline action buttons
- [ ] Convert buttons to action objects
- [ ] Replace inline code with HoverActions
- [ ] Verify hover behavior works
- [ ] Test all click handlers
- [ ] Test keyboard navigation
- [ ] Verify disabled states work (if applicable)
- [ ] Check dark mode appearance
- [ ] Update widget tests if needed
- [ ] Remove unused CSS (optional, can batch later)

---

## Timeline Recommendation

**Phase 1** (Quick Win): Migrate simple widgets with 1-2 actions
- NotesWidgetV2
- InboxWidgetV2

**Phase 2** (Medium): Migrate widgets with 3+ actions
- TasksWidgetV2
- EventsWidgetV2

**Phase 3** (Cleanup): Remove old CSS rules

---

## Questions or Issues?

If you encounter problems during migration:

1. Check `HoverActions.README.md` for usage examples
2. Review `HoverActions.example.jsx` for patterns
3. Compare with successfully migrated widgets
4. Check browser console for prop validation errors
