# Modal & Overlay QA: Action Items
**Generated:** 2026-01-31
**Based on:** `qa-modals-2026-01-31.md`

## Priority Overview

| Priority | Count | Effort | Status |
|----------|-------|--------|--------|
| Critical | 0 | - | ✅ NONE |
| High | 1 | Medium | 📋 BACKLOG |
| Medium | 2 | Medium | 📋 BACKLOG |
| Low | 2 | Small | 📋 BACKLOG |
| **Total** | **5** | **Varies** | **Ready** |

---

## HIGH PRIORITY (Block Next Release)

### 1. Dropdown Arrow Key Navigation ⚠️ HIGH

**Issue ID:** MODAL-001
**Component:** Dropdown
**File:** `myBrain-web/src/components/ui/Dropdown.jsx`

**Problem:**
Users cannot navigate dropdown options with arrow keys (up/down). Standard dropdown pattern requires arrow key support for keyboard users. Currently requires Tab key navigation which is less efficient.

**Impact:**
- Accessibility violation (not compliant with ARIA patterns)
- Keyboard power users penalized
- Mobile custom keyboards may not trigger proper selection

**Acceptance Criteria:**
- [ ] Up arrow navigates to previous option
- [ ] Down arrow navigates to next option
- [ ] Home key goes to first option
- [ ] End key goes to last option
- [ ] Enter selects highlighted option
- [ ] Escape closes dropdown
- [ ] Circular navigation (last→first, first→last)
- [ ] Works with icon/color options
- [ ] Works with DropdownWithDescription

**Implementation Notes:**
```jsx
// Add to Dropdown component's menu
const handleKeyDown = (e) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    // Move to next option
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    // Move to previous option
  } else if (e.key === 'Enter') {
    e.preventDefault();
    // Select current option
  } else if (e.key === 'Home') {
    e.preventDefault();
    // Go to first
  } else if (e.key === 'End') {
    e.preventDefault();
    // Go to last
  }
};

// Add visual indicator for highlighted option (not same as selected)
```

**Testing Plan:**
1. Keyboard navigation all four directions
2. Circular navigation wrapping
3. Selection with Enter
4. With disabled options (skip them)
5. With icon/color variants
6. With description variants

**Estimate:** 2-3 hours (implementation + testing)
**Priority:** Release blocker for accessibility compliance

---

## MEDIUM PRIORITY (Next Sprint)

### 2. Dropdown Viewport Edge Detection 📋 MEDIUM

**Issue ID:** MODAL-002
**Component:** Dropdown
**File:** `myBrain-web/src/components/ui/Dropdown.jsx`

**Problem:**
Dropdown menu always positions below trigger element. On small screens or when dropdown is near viewport bottom, menu content can overflow below visible area. Menu doesn't detect available space and reposition.

**Impact:**
- Content hidden on small screens
- Users can't scroll dropdown on small devices
- Poor mobile UX

**Acceptance Criteria:**
- [ ] Detects available space below trigger
- [ ] If insufficient space (<100px), positions menu above trigger instead
- [ ] Menu stays within viewport bounds (8px margin)
- [ ] Works on all screen sizes (375px, 768px, 1920px)
- [ ] Smooth positioning animation
- [ ] Handles scrollable parent containers

**Implementation Notes:**
```jsx
// Add to menu positioning logic
useEffect(() => {
  if (!isOpen || !dropdownRef.current) return;

  const trigger = dropdownRef.current.querySelector('button');
  const menu = dropdownRef.current.querySelector('[role="listbox"]');

  if (!trigger || !menu) return;

  const triggerRect = trigger.getBoundingClientRect();
  const menuHeight = menu.offsetHeight;
  const viewport = window.innerHeight;

  const spaceBelow = viewport - triggerRect.bottom;
  const spaceAbove = triggerRect.top;

  if (spaceBelow < 100 && spaceAbove > menuHeight + 8) {
    // Position above
    menu.style.top = 'auto';
    menu.style.bottom = 'calc(100% + 8px)';
  } else {
    // Position below (default)
    menu.style.top = 'calc(100% + 8px)';
    menu.style.bottom = 'auto';
  }
}, [isOpen]);
```

**Testing Plan:**
1. Dropdown at top of page (should go down)
2. Dropdown at bottom of page (should go up)
3. Dropdown in middle (should go down)
4. Small viewport (375px)
5. With scrollable parent
6. With many options (tall menu)
7. Animation smooth on reposition

**Estimate:** 2-3 hours
**Priority:** Medium - affects mobile UX

---

### 3. Tooltip Mobile Support (Touch Interaction) 📋 MEDIUM

**Issue ID:** MODAL-003
**Component:** Tooltip
**File:** `myBrain-web/src/components/ui/Tooltip.jsx`

**Problem:**
Tooltips are hover-based and don't work on touch devices. Mobile users see no tooltip feedback when tapping elements. No alternative interaction method for touch.

**Impact:**
- Mobile users miss helpful information
- Poor mobile UX
- Accessibility issue for touch devices

**Acceptance Criteria:**
- [ ] Implement long-press (300ms+) to show tooltip
- [ ] Tap elsewhere to close tooltip
- [ ] Or: Implement tap-to-show pattern
- [ ] Visual feedback during long-press
- [ ] Works with dynamic content
- [ ] Doesn't interfere with click handlers
- [ ] Mobile (375px), tablet (768px) tested
- [ ] Fallback for desktop (hover still works)

**Implementation Options:**

**Option A: Long-press**
```jsx
const handleTouchStart = () => {
  const timeout = setTimeout(() => setShowTooltip(true), 300);
  touchTimeoutRef.current = timeout;
};

const handleTouchEnd = () => {
  if (touchTimeoutRef.current) {
    clearTimeout(touchTimeoutRef.current);
  }
};

// Detect long-press vs regular tap
```

**Option B: Tap-to-show**
```jsx
const handleTouchEnd = () => {
  setShowTooltip(!isShowTooltip);
};
```

**Recommendation:** Option A (long-press) is more intuitive and doesn't interfere with button clicks.

**Testing Plan:**
1. Long-press on mobile (375px)
2. Tooltip appears after 300ms
3. Release dismisses tooltip
4. Tap outside closes tooltip
5. Works with action buttons (doesn't prevent click)
6. Works on tablet with touch
7. Desktop hover still works
8. No regression in existing behavior

**Estimate:** 2-3 hours
**Priority:** Medium - improves mobile experience

---

## LOW PRIORITY (Nice to Have)

### 4. Z-Index Strategy Documentation 📋 LOW

**Issue ID:** MODAL-004
**Location:** `.claude/design/design-system.md` or new file

**Problem:**
Z-index values are scattered across components (99999, 50, 20, 10, 60, 61). No central documentation of stacking strategy. Future developers may create conflicts.

**Solution:**
Centralize z-index values as constants, document stacking strategy.

**Deliverable:**
```javascript
// lib/zindex.js
export const ZINDEX = {
  BASE: 1,
  DROPDOWN_BACKDROP: 10,
  DROPDOWN_MENU: 20,
  CONFIRM_DIALOG_BACKDROP: 60,
  CONFIRM_DIALOG: 61,
  MODAL_BACKDROP: 40, // implied
  MODAL: 50,
  TOOLTIP: 99999,
};

// Usage:
<div style={{ zIndex: ZINDEX.MODAL }} />
```

**Deliverable:**
Documentation section in design-system.md:
```markdown
## Z-Index Strategy

All z-index values are centralized in `lib/zindex.js` to prevent conflicts.

| Layer | Z-Index | Components | Notes |
|-------|---------|------------|-------|
| Base | 1 | Page content | Default |
| Dropdown backdrop | 10 | Dropdown click shield | Prevents click-through |
| Dropdown menu | 20 | Select options | Above dropdown backdrop |
| Confirm dialog | 60-61 | Confirmation popups | Special case, custom layer |
| Modal | 50 | Main modals | Centered overlays |
| Tooltip | 99999 | Hover hints | Always on top |

**Import pattern:**
```jsx
import { ZINDEX } from '../lib/zindex';
<div className="..." style={{ zIndex: ZINDEX.MODAL }}>
```

Always use constants - never hardcode z-index values.
```

**Estimate:** 30 minutes
**Priority:** Low - improves maintainability

---

### 5. Dropdown Positioning Enhancement 📋 LOW

**Issue ID:** MODAL-005
**Component:** Dropdown
**File:** `myBrain-web/src/components/ui/Dropdown.jsx`

**Problem:**
Dropdown always positions below trigger. Add option to prefer positioning above when more space available. Improves UX in certain layouts.

**Acceptance Criteria:**
- [ ] Add `preferUp` prop
- [ ] Detect available space above/below
- [ ] Choose best direction
- [ ] Document new prop
- [ ] Add tests

**Implementation:**
```jsx
function Dropdown({
  // ... existing props ...
  preferUp = false,  // New prop
}) {
  // Existing positioning logic, but check preferUp

  const getMenuPosition = () => {
    const trigger = dropdownRef.current?.querySelector('button');
    if (!trigger) return { top: 'auto', bottom: 'auto' };

    const triggerRect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;

    if (preferUp && spaceAbove > 200) {
      return { bottom: 'calc(100% + 4px)', top: 'auto' };
    }

    return { top: 'calc(100% + 4px)', bottom: 'auto' };
  };
}
```

**Estimate:** 1-2 hours
**Priority:** Low - minor convenience feature

---

## VERIFICATION NEEDED

### Verify: Tooltip Accessibility on Screen Readers

**Status:** ⚠️ NEEDS TESTING
**Issue ID:** MODAL-TEST-001
**Component:** Tooltip
**File:** `myBrain-web/src/components/ui/Tooltip.jsx`

**Question:** Do screen readers announce tooltip content?

**Current Implementation:**
```jsx
<div
  role="tooltip"
  {...}
>
  {content}
</div>
```

**Recommendation:**
Test with screen readers (NVDA, JAWS, VoiceOver) to confirm tooltip content is announced. May need to add `aria-describedby` on trigger element.

**Testing Checklist:**
- [ ] NVDA announces tooltip on hover
- [ ] JAWS announces tooltip on hover
- [ ] VoiceOver announces tooltip on focus
- [ ] Trigger element has correct aria-describedby
- [ ] Desktop behavior maintained

---

### Verify: Focus Return After Modal Close

**Status:** ⚠️ NEEDS TESTING
**Issue ID:** MODAL-TEST-002
**Component:** BaseModal
**File:** `myBrain-web/src/components/ui/BaseModal.jsx`

**Question:** Does focus return to trigger element when modal closes?

**Current Implementation:**
```jsx
// BaseModal has focus trap logic
// But may not return focus to trigger on close
```

**Recommendation:**
Verify focus return behavior with keyboard navigation tests. May need to track trigger element ref.

**Testing Checklist:**
- [ ] Tab into modal
- [ ] Escape to close
- [ ] Focus returns to trigger button
- [ ] With multiple modals on page
- [ ] With button that opens modal

---

## Summary of Action Items

### By Sprint

**Sprint 1 (IMMEDIATE):**
- [ ] MODAL-001: Implement dropdown arrow key navigation (HIGH)

**Sprint 2:**
- [ ] MODAL-002: Add dropdown viewport edge detection (MEDIUM)
- [ ] MODAL-003: Implement tooltip mobile support (MEDIUM)

**Sprint 3 (BACKLOG):**
- [ ] MODAL-004: Document z-index strategy (LOW)
- [ ] MODAL-005: Add dropdown preferUp positioning (LOW)

**Testing (Parallel):**
- [ ] Verify tooltip screen reader support
- [ ] Verify focus return after close

---

## Release Checklist

Before releasing next version:

- [ ] MODAL-001 completed and tested
- [ ] All unit tests passing
- [ ] Accessibility audit clean (axe-core)
- [ ] No console errors in E2E tests
- [ ] Keyboard navigation verified
- [ ] Mobile responsive verified
- [ ] Dark mode verified
- [ ] Documentation updated

---

## Tracking

| Item | Owner | Status | ETA | Notes |
|------|-------|--------|-----|-------|
| MODAL-001 | - | 📋 Backlog | - | Arrow key navigation |
| MODAL-002 | - | 📋 Backlog | - | Viewport detection |
| MODAL-003 | - | 📋 Backlog | - | Touch support |
| MODAL-004 | - | 📋 Backlog | - | Documentation |
| MODAL-005 | - | 📋 Backlog | - | Positioning enhancement |

---

## Questions & Discussion

**Q: Should we migrate away from ConfirmDialog to ConfirmModal?**
A: Recommend consolidating on ConfirmModal for consistency. ConfirmDialog can be deprecated with migration path.

**Q: Should dropdown arrow key support be backwards compatible?**
A: Yes, just add to existing behavior. No breaking changes.

**Q: Is tooltip mobile support blocking?**
A: No, but recommended for next sprint. Current behavior acceptable for now.

**Q: Should z-index be in separate file or design-system.md?**
A: Recommend separate `lib/zindex.js` for re-export, with documentation in design-system.md.

---

**Report Generated:** 2026-01-31
**QA Lead:** Claude Code
**Status:** Ready for Backlog Prioritization
