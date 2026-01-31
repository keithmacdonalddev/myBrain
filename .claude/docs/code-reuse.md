# Code Reuse Requirements

**IMPORTANT: Always check for existing code before writing new code.**

---

## Quick Reference

### Frontend - Check First
| Need | Location |
|------|----------|
| Modal/dialog | `components/ui/BaseModal.jsx` |
| Confirmation | `components/ui/ConfirmDialog.jsx` |
| Loading state | `components/ui/Skeleton.jsx` |
| Empty state | `components/ui/EmptyState.jsx` |
| Dropdown | `components/ui/Dropdown.jsx` |
| Tags | `components/ui/TagInput.jsx` |
| API calls | `lib/api.js` |
| Date formatting | `lib/dateUtils.js` |
| Debouncing | `hooks/useDebounce.js` |
| Auto-save | `hooks/useAutoSave.js` |

### Backend - Check First
| Need | Location |
|------|----------|
| Logging | `utils/logger.js` |
| Auth checks | `middleware/auth.js` |
| Error handling | `middleware/errorHandler.js` |

---

## Frontend (myBrain-web)

Before creating new components or utilities:

1. Search `src/components/ui/` for existing UI components
2. Check `src/hooks/` for existing custom hooks
3. Look in `src/lib/` for utilities
4. Review similar features in `src/features/` for patterns

### Never Duplicate These

| File | Use For |
|------|---------|
| `src/lib/api.js` | ALL API calls |
| `src/lib/dateUtils.js` | Date formatting/parsing |
| `src/components/ui/BaseModal.jsx` | All modal dialogs |
| `src/components/ui/ConfirmDialog.jsx` | Confirmation prompts |
| `src/components/ui/Skeleton.jsx` | Loading states |
| `src/components/ui/TagInput.jsx` | Tag selection |
| `src/hooks/useDebounce.js` | Debounced values |
| `src/hooks/useAutoSave.js` | Auto-save functionality |

### Example: Need a Modal?

```jsx
// ✓ Correct - use BaseModal
import BaseModal from '@/components/ui/BaseModal';

function MyFeatureModal({ isOpen, onClose }) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="My Feature">
      {/* content */}
    </BaseModal>
  );
}

// ✗ Wrong - creating custom modal
function MyFeatureModal({ isOpen, onClose }) {
  return (
    <div className="fixed inset-0 ...">  {/* Don't do this */}
      ...
    </div>
  );
}
```

---

## Backend (myBrain-api)

Before creating new services or utilities:

1. Check `src/services/` for existing business logic
2. Look in `src/middleware/` for reusable middleware
3. Review `src/utils/` for shared utilities

### Never Duplicate These

| File | Use For |
|------|---------|
| `src/utils/logger.js` | All logging |
| `src/middleware/auth.js` | Authentication checks |
| `src/middleware/errorHandler.js` | Error responses |

### Example: Need Auth Check?

```javascript
// ✓ Correct - use existing middleware
import { requireAuth, requireAdmin } from '../middleware/auth.js';

router.get('/protected', requireAuth, (req, res) => { ... });
router.get('/admin-only', requireAuth, requireAdmin, (req, res) => { ... });

// ✗ Wrong - custom auth check
router.get('/protected', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  // ...
});
```

---

## When to Extract New Reusables

If you write similar code 2+ times, extract it:

| Pattern | Extract To |
|---------|------------|
| UI pattern used twice | `src/components/ui/` |
| Data fetching pattern | Custom hook in `src/hooks/` |
| Utility function | `src/lib/utils.js` |
| Backend logic | `src/services/` |
| Validation logic | `src/utils/` or middleware |

### Extraction Checklist

Before extracting:
- [ ] Is it truly reusable (not just similar)?
- [ ] Will it be used in 2+ places?
- [ ] Does a similar utility already exist?
- [ ] Is the abstraction clear and simple?

After extracting:
- [ ] Update all usages to use the new component/utility
- [ ] Add to architecture.md if it's a significant addition
- [ ] Remove the duplicated code

---

## Running Reuse Audit

Use the `/reuse-check` skill to audit for:
- Duplicate code patterns
- Missed reuse opportunities
- Components that should be shared
- Utilities that should be extracted
