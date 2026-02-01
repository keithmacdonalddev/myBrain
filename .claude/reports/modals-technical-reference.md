# Technical Reference: Modals & Overlays
**Last Updated:** 2026-01-31

This document provides technical implementation details for all modal components in myBrain, useful for developers implementing new modals or debugging modal issues.

---

## Table of Contents
1. Component Architecture
2. Base Components
3. Feature Modals Catalog
4. Implementation Checklist
5. Common Patterns & Pitfalls
6. Testing Guide

---

## Component Architecture

### Hierarchy

```
BaseModal
├── FormModal (form + validation)
├── ConfirmModal (simple confirmation)
└── Feature-specific modals
    ├── EventModal (custom layout)
    ├── LinkToItemModal (search + link)
    ├── Admin*Modal (forms)
    └── ... (25+ total)

Dropdown
├── Standard Dropdown
└── DropdownWithDescription

Tooltip
└── Positioned globally via portal

ConfirmDialog
└── Alternative confirmation (not BaseModal-based)
```

### Data Flow

```
User Action (click button)
    ↓
setState(isOpen: true)
    ↓
BaseModal renders with children
    ↓
Form/content mounted
    ↓
On user action (submit/cancel):
  - onSubmit/onClose called
  - setState(isOpen: false)
  - Modal unmounts
  - Focus returns to trigger element
```

---

## Base Components

### BaseModal Component
**File:** `myBrain-web/src/components/ui/BaseModal.jsx`
**Size:** 308 lines
**Exports:** `BaseModal`, `ConfirmModal`, `FormModal`

#### Props Documentation

```typescript
interface BaseModalProps {
  // Control
  isOpen: boolean;                    // Mount/unmount modal
  onClose: () => void;               // Called when closing
  onSubmit?: () => void;             // Form submission handler

  // Content
  title: string;                     // Modal title (h2)
  children: React.ReactNode;         // Modal body

  // Sizing
  size?: 'sm'|'md'|'lg'|'xl'|'2xl'|'full';  // Default: 'md'
  mobileFullscreen?: boolean;        // Bottom sheet on mobile

  // Footer
  showFooter?: boolean;              // Default: true
  submitText?: string;               // Default: 'Save'
  cancelText?: string;               // Default: 'Cancel'
  onSubmit?: () => void;
  submitDisabled?: boolean;
  isLoading?: boolean;               // Show spinner
  variant?: 'primary'|'danger';      // Button color

  // Customization
  footerLeft?: React.ReactNode;      // Left-aligned footer content
  customFooter?: React.ReactNode;    // Replace entire footer
  className?: string;                // Additional wrapper classes

  // Behavior
  closeOnBackdrop?: boolean;         // Default: true
  showCloseButton?: boolean;         // Default: true
}
```

#### Usage Example

```jsx
import BaseModal from './BaseModal';

function MyModal() {
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Perform action
    setIsOpen(false);
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Open</button>

      <BaseModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Edit Item"
        onSubmit={handleSubmit}
      >
        <input type="text" placeholder="Name" />
      </BaseModal>
    </>
  );
}
```

#### Size Reference

| Size | Max-Width | Use Case |
|------|-----------|----------|
| sm | 384px (Tailwind max-w-sm) | Confirmations, simple forms |
| md | 448px (max-w-md) | Default, most modals |
| lg | 512px (max-w-lg) | Complex forms |
| xl | 576px (max-w-xl) | Multi-step forms |
| 2xl | 672px (max-w-2xl) | Large content |
| full | 896px (max-w-4xl) | Full content modals |

#### Styling

```css
/* Backdrop */
.fixed.inset-0.z-50 { /* Container */
  background: transparent;
}
.absolute.inset-0 {
  background: rgba(0, 0, 0, 0.5);
}

/* Modal */
.bg-panel.glass-heavy { /* Card styling */
  border: 1px solid var(--border);
  border-radius: 8px;
  max-height: 90vh;
  overflow: hidden;
}

/* Header */
.border-b.border-border { /* Divider */
  padding: 16px;
}

/* Body */
.flex-1.overflow-auto { /* Scrollable content */
  padding: 16px;
}

/* Footer */
.border-t.border-border { /* Divider */
  padding: 16px;
  display: flex;
  gap: 8px;
}
```

#### Keyboard Handling

**Controlled by:** `useModalShortcuts` hook

```javascript
// Automatically handled by BaseModal:
- Escape key: calls onClose()
- Tab key: cycles through focusable elements (trapped)
- Shift+Tab: cycles backward
- Enter key: submits form (if on submit button)
```

#### Focus Management

```javascript
// On mount:
1. Find all focusable elements in modal
2. Focus first focusable element
3. Add focus trap to Tab/Shift+Tab

// On Escape key:
1. Call onClose()
2. Focus returns to trigger element

// On unmount:
1. Remove event listeners
2. Restore body overflow
```

#### Common Issues & Fixes

**Issue: Modal doesn't close on backdrop click**
```jsx
// Wrong:
<BaseModal isOpen={isOpen} onClose={onClose}>
  {/* clickable elements that don't stop propagation */}
</BaseModal>

// Right:
<BaseModal isOpen={isOpen} onClose={onClose}>
  <div onClick={(e) => e.stopPropagation()}>
    {/* Content */}
  </div>
</BaseModal>
```

**Issue: Focus not moving to modal**
```jsx
// Ensure first element is focusable:
// ✅ Good:
<input autoFocus /> {/* or first button */}

// ❌ Bad:
<div>Content</div> {/* Non-focusable */}
```

**Issue: Submit button appears disabled**
```jsx
// Check props:
<BaseModal
  isOpen={isOpen}
  onSubmit={handleSubmit}
  submitDisabled={isLoading} // Make sure this is false when ready
>
```

---

### FormModal Component
**Extends:** BaseModal
**Purpose:** Structured form handling with validation

```jsx
import { FormModal } from './BaseModal';

function EditTaskModal() {
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Validate and submit
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Task"
      onSubmit={handleSubmit}
      error={error}
    >
      <input type="text" required />
      {/* Error automatically shown above form */}
    </FormModal>
  );
}
```

---

### ConfirmModal Component
**Extends:** BaseModal
**Purpose:** Simple confirmation dialogs

```jsx
import { ConfirmModal } from './BaseModal';

function DeleteConfirm({ isOpen, onClose, onConfirm }) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Task?"
      message="This action cannot be undone."
      confirmText="Delete"
      cancelText="Cancel"
      variant="danger"
      isLoading={isDeleting}
    />
  );
}
```

---

### ConfirmDialog Component
**File:** `myBrain-web/src/components/ui/ConfirmDialog.jsx`
**Purpose:** Alternative confirmation (NOT BaseModal-based)

#### Props

```typescript
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
}
```

#### Usage

```jsx
import ConfirmDialog from './ConfirmDialog';

function DeleteItem() {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <>
      <button onClick={() => setShowConfirm(true)}>Delete</button>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete?"
        message="Are you sure?"
        variant="danger"
      />
    </>
  );
}
```

#### Difference from ConfirmModal

| Feature | ConfirmModal | ConfirmDialog |
|---------|-------------|-----------------|
| Base | BaseModal | Standalone |
| Structure | Header/body/footer | Custom layout |
| Icon | No | Yes (AlertTriangle) |
| Animation | Fade in (from BaseModal) | Zoom + fade in |
| Z-index | 50 | 61 (custom) |
| Variants | 1 | 3 (danger/warning/default) |

**Recommendation:** Use `ConfirmModal` for consistency with other modals. Use `ConfirmDialog` only for special cases needing variant icons.

---

### Dropdown Component
**File:** `myBrain-web/src/components/ui/Dropdown.jsx`

#### Props

```typescript
interface DropdownProps {
  value: any;                                // Current value
  onChange: (value: any) => void;           // Selection handler
  options: Array<{                           // Available options
    value: any;
    label: string;
    icon?: React.ComponentType;              // Optional icon
    color?: string;                          // Tailwind color class
    description?: string;                    // DropdownWithDescription only
  }>;
  placeholder?: string;                      // When no value selected
  className?: string;                        // Button styling
  menuClassName?: string;                    // Menu styling
  minWidth?: number;                         // Minimum menu width (px)
  showCheck?: boolean;                       // Show checkmark on selected
  disabled?: boolean;                        // Disable dropdown
}
```

#### Usage

```jsx
import Dropdown from './Dropdown';
import { Heart, Home } from 'lucide-react';

function PrioritySelect() {
  const [priority, setPriority] = useState('medium');

  return (
    <Dropdown
      value={priority}
      onChange={setPriority}
      options={[
        { value: 'low', label: 'Low', icon: Heart, color: 'text-blue-500' },
        { value: 'medium', label: 'Medium', icon: Home, color: 'text-yellow-500' },
        { value: 'high', label: 'High', icon: AlertTriangle, color: 'text-red-500' },
      ]}
      showCheck
    />
  );
}
```

#### Keyboard Behavior

```
Current:
  - Click to open/close
  - Escape to close
  - Tab to navigate items
  - Click to select

Missing (ISSUE):
  - Arrow Up/Down to navigate
  - Enter to select
  - Space to open
```

---

### Tooltip Component
**File:** `myBrain-web/src/components/ui/Tooltip.jsx`

#### Props

```typescript
interface TooltipProps {
  children: React.ReactNode;          // Trigger element
  content: string;                    // Tooltip text
  position?: 'top'|'bottom'|'left'|'right'; // Default: 'top'
  delay?: number;                     // Show delay (ms, default: 300)
  disabled?: boolean;                 // Disable this tooltip
  ignoreGlobalSetting?: boolean;      // Force show regardless of context
}
```

#### Usage

```jsx
import Tooltip from './Tooltip';

function HelpButton() {
  return (
    <Tooltip content="Click to learn more" position="right">
      <button className="help-icon">?</button>
    </Tooltip>
  );
}
```

#### Context Control

```jsx
import TooltipsContext from '../contexts/TooltipsContext';

// Provider (in AppShell):
<TooltipsContext.Provider value={{ tooltipsEnabled: true }}>
  {/* App content */}
</TooltipsContext.Provider>

// To disable all tooltips globally:
<TooltipsContext.Provider value={{ tooltipsEnabled: false }}>
```

#### Positioning Logic

```javascript
// Calculates position based on trigger and tooltip dimensions
// Clamps to viewport with 8px margin:

top = Math.max(8, Math.min(top, windowHeight - tooltipHeight - 8));
left = Math.max(8, Math.min(left, windowWidth - tooltipWidth - 8));

// Handles 4 positions: top, bottom, left, right
// Arrow pointer auto-adjusts for each position
```

---

## Feature Modals Catalog

### Admin Feature (5 modals)

#### AddAdminNoteModal
**Path:** `features/admin/components/AddAdminNoteModal.jsx`
**Type:** Form Modal
**Fields:** Note text, rich editor
**Actions:** Save, Cancel
**Parent:** Admin > Users > [User] > Add Note

#### BanUserModal
**Path:** `features/admin/components/BanUserModal.jsx`
**Type:** Confirm Modal
**Fields:** Reason (textarea)
**Actions:** Ban, Cancel
**Variant:** danger
**Parent:** Admin > Users > [User] > Ban

#### SuspendUserModal
**Path:** `features/admin/components/SuspendUserModal.jsx`
**Type:** Confirm Modal
**Fields:** Reason, duration
**Actions:** Suspend, Cancel
**Variant:** warning
**Parent:** Admin > Users > [User] > Suspend

#### WarnUserModal
**Path:** `features/admin/components/WarnUserModal.jsx`
**Type:** Confirm Modal
**Fields:** Warning message
**Actions:** Send, Cancel
**Variant:** warning
**Parent:** Admin > Users > [User] > Warn

#### SendAdminMessageModal
**Path:** `features/admin/components/SendAdminMessageModal.jsx`
**Type:** Form Modal
**Fields:** Message text, rich editor
**Actions:** Send, Cancel
**Parent:** Admin > Users > [User] > Send Message

---

### Calendar Feature (1 modal - complex)

#### EventModal
**Path:** `features/calendar/components/EventModal.jsx`
**Type:** Complex Custom Modal
**Size:** Largest in app (~400 lines)
**Features:**
- Date/time picker (dual inputs)
- Recurrence options (daily/weekly/monthly/yearly)
- Location picker with saved locations
- Rich text editor for description
- Link tasks to event
- Link notes to event
- Color selection (7 colors)
- Time zone support
- Repeat pattern builder
- Delete with confirmation

**Key Implementation Details:**
```jsx
// Lazy load RichTextEditor to reduce bundle
const RichTextEditor = lazy(() => import('../../../components/ui/RichTextEditor'));

// Separate modal for delete confirmation
const [showDeleteDialog, setShowDeleteDialog] = useState(false);

// Search state for linking items
const [taskSearch, setTaskSearch] = useState('');
const [noteSearch, setNoteSearch] = useState('');

// Use multiple mutations
const createMutation = useCreateEvent();
const updateMutation = useUpdateEvent();
const deleteMutation = useDeleteEvent();
```

**Usage:**
```jsx
<EventModal
  event={selectedEvent}           // For editing
  initialDate={new Date()}         // For creating
  onClose={handleClose}
  onCreated={handleSuccess}
  taskIdToLink={taskId}           // Optional link
/>
```

---

### Messaging Feature (3 modals)

#### GroupMembersModal
**Path:** `features/messages/components/GroupMembersModal.jsx`
**Type:** List Modal
**Content:** Group member list with actions

#### MessageSearchModal
**Path:** `features/messages/components/MessageSearchModal.jsx`
**Type:** Search Modal
**Content:** Message search with filters

#### NewConversationModal
**Path:** `features/messages/components/NewConversationModal.jsx`
**Type:** Form Modal
**Fields:** User search, initial message

---

### Notes Feature (1 modal)

#### LinkToItemModal
**Path:** `features/notes/components/LinkToItemModal.jsx`
**Type:** Search + Link Modal
**Size:** md
**Features:**
- Search across 3 types (project/task/event)
- Filter results in real-time
- Link confirmation
- Error handling

**Implementation Pattern:**
```jsx
// Type configuration
const TYPE_CONFIG = {
  project: { icon: FolderKanban, label: 'Project' },
  task: { icon: CheckSquare, label: 'Task' },
  event: { icon: Calendar, label: 'Event' },
};

// Conditional fetching
const { data: projectsData } = useProjects(
  { ...params },
  { enabled: type === 'project' }
);

// Link mutation
const handleLink = async (itemId) => {
  await projectsApi.linkNote(itemId, noteId);
  queryClient.invalidateQueries(...);
  onSuccess?.();
};
```

---

### Files Feature (2 modals)

#### CreateFolderModal
**Path:** `features/files/components/CreateFolderModal.jsx`
**Type:** Form Modal
**Fields:** Folder name
**Parent:** Files > Create Folder button

#### FileMoveModal
**Path:** `features/files/components/FileMoveModal.jsx`
**Type:** Form Modal + Selector
**Fields:** Target folder selection
**Parent:** File > Move action

---

### Other Modals (Remaining 17)

| Feature | Modal | Type |
|---------|-------|------|
| Images | ImageDetailsModal | Details |
| Life Areas | LifeAreaModal | Form |
| Projects | LinkItemModal | Link |
| Social | ReportModal | Form |
| Social | ShareModal | Share |
| Capture | QuickCaptureModal | Form |
| ... | ... | ... |

(See main QA report for complete list)

---

## Implementation Checklist

When creating a new modal, follow this checklist:

### Structure
- [ ] Extends BaseModal (or good reason not to)
- [ ] Has clear title
- [ ] Has form (if user input required)
- [ ] Has submit/cancel buttons
- [ ] Shows loading state during mutation

### Accessibility
- [ ] Modal has `role="dialog"` (automatic with BaseModal)
- [ ] Title is descriptive
- [ ] Close button has aria-label
- [ ] Form inputs have labels
- [ ] Error messages shown clearly
- [ ] Focus moves to modal on open
- [ ] Focus returns on close
- [ ] Keyboard shortcuts work (Escape, Enter, Tab)

### Responsive
- [ ] Works on mobile (375px)
- [ ] Works on tablet (768px)
- [ ] Works on desktop (1920px)
- [ ] Use `mobileFullscreen={true}` if content-heavy

### Theming
- [ ] Light mode text readable
- [ ] Dark mode text readable (4.5:1 contrast minimum)
- [ ] Uses CSS variables (`--text`, `--panel`, `--border`)
- [ ] Icons use `--muted` color

### Error Handling
- [ ] Try/catch around mutations
- [ ] Toast on success
- [ ] Toast or error message on failure
- [ ] Loading state prevents double-submission
- [ ] Error state clears on retry

### Performance
- [ ] Lazy load heavy components (e.g., RichTextEditor)
- [ ] Memoize expensive computations
- [ ] Don't fetch unless modal is open
- [ ] Cleanup subscriptions/timers

### Testing
- [ ] Unit test with React Testing Library
- [ ] Test open/close
- [ ] Test form submission
- [ ] Test error states
- [ ] Test keyboard navigation
- [ ] Accessibility audit (axe-core)

### Code Quality
- [ ] Proper prop types or TypeScript
- [ ] JSDoc comments
- [ ] No console.logs
- [ ] No hardcoded values
- [ ] Consistent with codebase style

---

## Common Patterns & Pitfalls

### Pattern: Form Submission with Loading

```jsx
const [isLoading, setIsLoading] = useState(false);

const handleSubmit = async (e) => {
  e.preventDefault();
  setIsLoading(true);
  try {
    const result = await api.create(data);
    toast.success('Created!');
    onSuccess(result);
  } catch (err) {
    toast.error(err.message);
  } finally {
    setIsLoading(false);
  }
};

return (
  <BaseModal
    onSubmit={handleSubmit}
    isLoading={isLoading}
    submitDisabled={/* validation check */}
  >
    {/* Form content */}
  </BaseModal>
);
```

### Pattern: Conditional Modal Opening

```jsx
const [editingId, setEditingId] = useState(null);
const isOpen = editingId !== null;

const handleClose = () => setEditingId(null);
const handleOpen = (id) => setEditingId(id);

// Instead of separate isOpen state:
// ✅ Better: Track WHAT you're editing, derive isOpen from that
```

### Pattern: Linking Items in Modal

```jsx
// Search + select pattern
const [search, setSearch] = useState('');
const { data: items } = useItemsQuery({ search, limit: 10 });

const handleLink = async (itemId) => {
  try {
    await api.link(sourceId, itemId);
    queryClient.invalidateQueries(...);
    onSuccess?.();
    onClose();
  } catch (err) {
    toast.error(err.message);
  }
};
```

### Pattern: Delete Confirmation Inside Modal

```jsx
// Don't nest modals - use state flag and separate confirmation
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

return (
  <>
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <button onClick={() => setShowDeleteConfirm(true)}>Delete</button>
    </BaseModal>

    <ConfirmDialog
      isOpen={showDeleteConfirm}
      onConfirm={handleDelete}
      onClose={() => setShowDeleteConfirm(false)}
    />
  </>
);
```

### Pitfall: Forgetting Focus Trap

```jsx
// ❌ Wrong: No focusable element in modal
<BaseModal isOpen={isOpen} onClose={onClose}>
  <div>Just text, no inputs</div>
</BaseModal>

// ✅ Right: Always have at least one focusable element
<BaseModal isOpen={isOpen} onClose={onClose}>
  <input autoFocus />
</BaseModal>
```

### Pitfall: Not Stopping Event Propagation

```jsx
// ❌ Wrong: Click inside opens AND closes modal
<BaseModal isOpen={isOpen} onClose={onClose} closeOnBackdrop={true}>
  <button onClick={() => console.log('button clicked')}>
    Click me
  </button>
</BaseModal>

// ✅ Right: Stop propagation if needed
<BaseModal isOpen={isOpen} onClose={onClose} closeOnBackdrop={true}>
  <button onClick={(e) => {
    e.stopPropagation();
    console.log('button clicked');
  }}>
    Click me
  </button>
</BaseModal>
```

### Pitfall: Modal Stuck Open

```jsx
// ❌ Wrong: No onClose handler
<BaseModal isOpen={true} onClose={undefined}>
  Can't close!
</BaseModal>

// ✅ Right: Always provide onClose
const [isOpen, setIsOpen] = useState(false);
<BaseModal isOpen={isOpen} onClose={() => setIsOpen(false)}>
```

---

## Testing Guide

### Unit Test Template

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import MyModal from './MyModal';

describe('MyModal', () => {
  it('renders when open', () => {
    render(<MyModal isOpen={true} onClose={jest.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<MyModal isOpen={false} onClose={jest.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on escape key', () => {
    const onClose = jest.fn();
    render(<MyModal isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('submits form correctly', async () => {
    const onSuccess = jest.fn();
    render(<MyModal isOpen={true} onClose={jest.fn()} onSuccess={onSuccess} />);

    fireEvent.click(screen.getByText('Save'));
    // Wait for async operations
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('shows error message on failure', async () => {
    // Mock API to fail
    jest.spyOn(api, 'create').mockRejectedValue(new Error('API Error'));

    render(<MyModal isOpen={true} onClose={jest.fn()} />);
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText(/API Error/)).toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', () => {
    render(<MyModal isOpen={true} onClose={jest.fn()} title="Test" />);

    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby');
  });
});
```

### Accessibility Testing

```jsx
import { axe } from 'jest-axe';

it('has no accessibility violations', async () => {
  const { container } = render(<MyModal isOpen={true} onClose={jest.fn()} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Visual Regression Testing

```jsx
it('matches snapshot in light mode', () => {
  const { container } = render(<MyModal isOpen={true} onClose={jest.fn()} />);
  expect(container).toMatchSnapshot();
});

it('matches snapshot in dark mode', () => {
  document.documentElement.classList.add('dark');
  const { container } = render(<MyModal isOpen={true} onClose={jest.fn()} />);
  expect(container).toMatchSnapshot();
  document.documentElement.classList.remove('dark');
});
```

---

## Migration Guide (from Old to New Components)

If migrating from old modal implementations to BaseModal:

### Before
```jsx
<div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
  <div className="bg-white rounded-lg p-4 max-w-md">
    <h2>Title</h2>
    {/* Content */}
  </div>
</div>
```

### After
```jsx
<BaseModal isOpen={isOpen} onClose={onClose} title="Title">
  {/* Content */}
</BaseModal>
```

**Benefits:**
- ✅ Automatic focus management
- ✅ Automatic keyboard handling
- ✅ Consistent styling
- ✅ Proper accessibility
- ✅ Loading state support
- ✅ Mobile responsive

---

## FAQ

**Q: Should I use BaseModal or ConfirmDialog?**
A: Use BaseModal-based ConfirmModal for consistency. Use ConfirmDialog only if you need the icon variants.

**Q: Can I nest modals?**
A: Technically yes, but it's poor UX. Instead, use separate state flags and sequential modals.

**Q: How do I pass data to modal?**
A: Via props when opening, or via React Context for deeply nested data.

**Q: Do I need to memoize my modal component?**
A: Only if it's re-rendering unnecessarily. Check React DevTools Profiler first.

**Q: Can I make modal fullscreen on mobile?**
A: Yes, use `mobileFullscreen={true}` on BaseModal.

**Q: How do I customize modal styling?**
A: Use `className` prop for wrapper, or override CSS variables for colors.

---

## References

- [Design System](../..) - Colors, spacing, typography
- [BaseModal Tests](../../../myBrain-web/src/components/ui/BaseModal.test.jsx)
- [WCAG Modal Patterns](https://www.w3.org/WAI/ARIA/apg/patterns/dialogmodal/)
- [React Hook Form Integration](https://react-hook-form.com/)
- [Accessible Dropdowns](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)

---

**Last Updated:** 2026-01-31
**Version:** 1.0
**Maintainer:** Claude Code
