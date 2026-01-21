---
paths:
  - "myBrain-web/src/features/**/*.jsx"
  - "myBrain-web/src/components/**/*.jsx"
---

# Frontend Component Rules

## Core Principle

**Always check for existing components before creating new ones.** This codebase has a rich library of shared components.

## Required Checks Before Creating Components

### 1. Modal/Dialog Needs

**ALWAYS use BaseModal** - never create custom modal implementations:

```jsx
import BaseModal from '@/components/ui/BaseModal';

// Good
<BaseModal isOpen={open} onClose={close} title="Edit Note">
  {content}
</BaseModal>

// Bad - don't create custom modals
<div className="modal-overlay">
  <div className="modal-content">...</div>
</div>
```

For confirmation dialogs:
```jsx
import ConfirmDialog from '@/components/ui/ConfirmDialog';

<ConfirmDialog
  isOpen={showConfirm}
  onConfirm={handleDelete}
  onCancel={() => setShowConfirm(false)}
  title="Delete Note?"
  message="This cannot be undone."
  confirmText="Delete"
  variant="danger"
/>
```

### 2. Loading States

**ALWAYS use Skeleton** for loading states:

```jsx
import Skeleton from '@/components/ui/Skeleton';

// Good
if (isLoading) return <Skeleton variant="card" count={3} />;

// Bad
if (isLoading) return <div className="loading">Loading...</div>;
```

### 3. Empty States

**ALWAYS use EmptyState**:

```jsx
import EmptyState from '@/components/ui/EmptyState';

<EmptyState
  icon={FileIcon}
  title="No notes yet"
  description="Create your first note to get started"
  action={{ label: "Create Note", onClick: handleCreate }}
/>
```

### 4. Form Inputs

Use existing input components:

| Need | Component |
|------|-----------|
| Tag selection | `TagInput` |
| Date/time | `DateTimePicker` |
| Location | `LocationPicker` |
| Dropdown/select | `Dropdown` |

### 5. User Display

```jsx
import UserAvatar from '@/components/ui/UserAvatar';

<UserAvatar user={user} size="md" />
```

### 6. Expandable Sections

```jsx
import ExpandableSection from '@/components/ui/ExpandableSection';

<ExpandableSection title="Advanced Options" defaultOpen={false}>
  {content}
</ExpandableSection>
```

### 7. Save Status

For auto-save forms:
```jsx
import SaveStatus from '@/components/ui/SaveStatus';

<SaveStatus status={saveStatus} /> // 'saving' | 'saved' | 'error'
```

## Hooks to Use

| Need | Hook |
|------|------|
| Debounced input | `useDebounce` |
| Auto-save | `useAutoSave` |
| Keyboard shortcuts | `useKeyboardShortcuts` |
| Toast notifications | `useToast` |
| Feature flags | `useFeatureFlag` |
| WebSocket | `useWebSocket` |

## API Calls

**ALWAYS use the api client** - never use raw fetch:

```jsx
import api from '@/lib/api';

// Good
const notes = await api.get('/notes');
await api.post('/notes', { title, content });

// Bad
const res = await fetch('/api/notes');
```

## Date Formatting

**ALWAYS use dateUtils** - never format dates manually:

```jsx
import { formatDate, formatRelative, parseDate } from '@/lib/dateUtils';

// Good
formatDate(note.createdAt, 'short')
formatRelative(note.updatedAt)

// Bad
new Date(note.createdAt).toLocaleDateString()
```

## Feature Module Structure

New features should follow this structure:
```
features/featureName/
├── index.js              # Exports
├── routes.jsx            # Route definitions
├── components/           # Feature-specific components
│   └── FeatureList.jsx
├── hooks/                # Feature-specific hooks
│   └── useFeatureData.js
└── pages/                # Page components
    └── FeaturePage.jsx
```

## State Management

| Type | Solution |
|------|----------|
| Server data | TanStack Query (useQuery, useMutation) |
| Global UI state | Redux (auth, theme, toast, lifeAreas) |
| Local component state | useState |
| Form state | useState or react-hook-form |

## Common Mistakes to Avoid

1. **Creating custom modals** - Use BaseModal
2. **Inline loading spinners** - Use Skeleton
3. **Raw fetch calls** - Use api.js
4. **Manual date formatting** - Use dateUtils
5. **Duplicate form validation** - Check if pattern exists
6. **New toast implementation** - Use useToast hook
