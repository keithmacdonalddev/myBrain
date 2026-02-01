# Today Page - Issue Tracker

**Report Date:** January 31, 2026
**Component:** TodayPage.jsx
**Test Coverage:** 43 unit tests, needs E2E and visual verification

---

## Issue Register

### ISSUE #1: Red Overdue Icon on Red Background
**Severity:** 🟡 Medium
**Category:** Visual/Accessibility
**Status:** ⚠️ NEEDS VERIFICATION

**Location:** Lines 228-241 in TodayPage.jsx
```jsx
<div className="bg-[var(--v2-status-error)]/5 border border-[var(--v2-status-error)]/20">
  <AlertTriangle className="w-4 h-4 text-[var(--v2-status-error)]" />
```

**Problem:**
- AlertTriangle icon is colored `--v2-status-error` (red)
- Section background is `--v2-status-error)]/5` (very light red/pink)
- This creates poor contrast when both are red shades

**Impact:**
- May fail WCAG AA contrast requirements
- Reduces visual distinction of the alert
- Could be hard to see for users with color vision deficiency

**Reproduction:**
1. Navigate to Today page
2. Have at least one overdue task
3. Check contrast ratio of red alert icon vs light red background

**Solution Options:**
A) Change icon color to a darker shade (e.g., primary text color)
B) Change section background to neutral gray instead of red
C) Use a different icon color (e.g., `--v2-text-secondary`)

**Recommended Fix:**
Change icon color from `text-[var(--v2-status-error)]` to `text-[var(--v2-status-error)]/100` or `text-[var(--v2-text-primary)]`

**Affected Users:** Users with low vision, colorblind users

---

### ISSUE #2: Overdue Task Rows Not Keyboard Accessible
**Severity:** 🟡 Medium
**Category:** Accessibility (WCAG AA)
**Status:** ⚠️ NEEDS FIX

**Location:** Lines 44-71 in TodayPage.jsx (TodayTaskRow component)
```jsx
<div
  onClick={() => openTask(task._id)}
  className="group flex items-center gap-3 px-[var(--v2-spacing-md)] py-[var(--v2-spacing-sm)] hover:bg-[var(--v2-bg-elevated)] cursor-pointer transition-colors rounded-lg"
>
```

**Problem:**
- Task rows are `<div>` elements with `onClick` handlers
- Not focusable via keyboard (no Tab key navigation)
- Not semantically a button
- Screen readers won't announce as interactive

**Contrast with Event Rows:**
- Event rows correctly use `<button>` element (line 79)
- Task rows should follow same pattern

**Impact:**
- Keyboard-only users cannot interact with tasks
- Screen reader users don't know it's interactive
- WCAG AA level failure

**Reproduction:**
1. Navigate to Today page
2. Try Tab key to focus on task rows
3. Try to activate with Enter key
4. Use screen reader to verify semantic meaning

**Solution:**
Change `<div>` to `<button>` or add role/tabindex:

**Option A (Recommended):**
```jsx
<button
  onClick={() => openTask(task._id)}
  className="w-full text-left group flex items-center gap-3 px-[var(--v2-spacing-md)] py-[var(--v2-spacing-sm)] hover:bg-[var(--v2-bg-elevated)] cursor-pointer transition-colors rounded-lg"
>
```

**Option B (ARIA):**
```jsx
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => e.key === 'Enter' && openTask(task._id)}
  onClick={() => openTask(task._id)}
  className="group flex items-center gap-3 px-[var(--v2-spacing-md)] py-[var(--v2-spacing-sm)] hover:bg-[var(--v2-bg-elevated)] cursor-pointer transition-colors rounded-lg"
>
```

**Estimated Effort:** 10 minutes
**Testing:** Run `/accessibility-audit` after fix

---

### ISSUE #3: Long Task Titles May Overflow
**Severity:** 🟢 Low
**Category:** Visual/UX
**Status:** ⚠️ NEEDS TESTING

**Location:** Line 62 in TodayPage.jsx
```jsx
<span className={`flex-1 text-sm ${isCompleted ? '...' : 'text-[var(--v2-text-primary)]'}`}>
  {task.title}
</span>
```

**Problem:**
- Task title spans don't have `truncate` class
- Event rows DO have `truncate` class (line 88)
- Very long titles might wrap onto multiple lines or overflow

**Expected Behavior:**
- Titles should truncate with ellipsis on single line
- Consistent with event row styling

**Reproduction:**
1. Create a task with title > 50 characters
2. Add it to Today's tasks
3. Check if title wraps or truncates

**Solution:**
Add `truncate` class to title span:
```jsx
<span className={`flex-1 text-sm truncate ${isCompleted ? '...' : 'text-[var(--v2-text-primary)]'}`}>
```

**Estimated Effort:** 2 minutes
**Testing:** Visual verification with long titles

---

### ISSUE #4: Completed Overdue Tasks Still Show Red Color
**Severity:** 🟢 Low (Design issue, not a bug)
**Category:** Visual/UX
**Status:** ⚠️ NEEDS DECISION

**Location:** Lines 44-71 (TodayTaskRow) + 237-239 (overdue mapping)

**Problem:**
- If a task is completed in the overdue section, it remains in that section
- The checkbox becomes a green checkmark (correct)
- BUT the circle icon still appears red when not checked

**Current Behavior:**
```
✓ [Completed Overdue Task]  (checkmark is green)
```

**Issue:** Completed task should visually indicate it's done, not alarming

**Expected Behavior Options:**
A) Move completed tasks out of overdue section
B) Reduce emphasis on completed overdue tasks (gray text?)
C) Show both checkmark and gray background

**Recommendation:**
Option A is best - completed tasks shouldn't stay in overdue section. Consider filtering in the API hook instead.

**Estimated Effort:** 15 minutes (requires hook modification)

---

### ISSUE #5: Missing E2E/Visual Testing
**Severity:** 🟡 Medium
**Category:** Testing/QA
**Status:** 📋 OPEN

**Problem:**
- Only unit tests exist (1,042 lines in test file)
- No browser automation tests
- No responsive design verification
- No visual regression testing
- No real API integration testing

**What's Not Tested:**
- Mobile layout (375px)
- Tablet layout (768px)
- Desktop layout (1280px)
- Real data loading and display
- Task completion animation
- Event modal creation/editing
- Dark/light mode switching
- Timezone handling with real user data
- Performance with 20+ tasks

**Recommendation:**
Run `/smoke-test` skill after verifying component fixes

**Estimated Effort:** 30 minutes for comprehensive E2E coverage

---

### ISSUE #6: No Loading Indicators for Empty Data
**Severity:** 🟢 Low
**Category:** UX
**Status:** ℹ️ INFORMATIONAL

**Location:** Lines 176-181

**Observation:**
- Component shows skeleton loaders during initial load
- But after data loads, no indication if a section is empty due to:
  - No data from API
  - API error
  - Data still loading

**Current Behavior:**
- Empty events: "No events scheduled for today"
- Empty tasks: "No tasks due today. Nice work!"
- Empty inbox: "Inbox zero! You're all caught up"

**Potential Issue:**
- User can't distinguish between "no events" vs "events failed to load"

**Not Critical** because:
- Skeleton shows during load
- Error state probably handled by hook
- Empty messages are clear

**Note:** Monitor error handling in real usage

---

### ISSUE #7: Event Color Bar Contrast Not Verified
**Severity:** 🟢 Low
**Category:** Visual/Accessibility
**Status:** ⚠️ NEEDS VERIFICATION

**Location:** Line 85
```jsx
<div
  className="w-1 h-full min-h-[2rem] rounded-full flex-shrink-0 mt-1"
  style={{ backgroundColor: event.color || 'var(--v2-accent-primary)' }}
/>
```

**Problem:**
- Event colors are arbitrary (custom event colors from calendar)
- Color bar can be any value
- Against dark background, some colors might not be visible
- Against light background, some colors might be too bright

**Potential Issue:**
- User-defined event colors might fail contrast requirements
- Fallback color is primary accent (should be fine)

**Recommendation:**
- Document that event colors must pass contrast
- Consider enforcing color validation in calendar component
- Add fallback if color is too light/dark

**Not Urgent** because fallback exists

---

### ISSUE #8: Task/Event Click Propagation Edge Case
**Severity:** 🟢 Very Low
**Category:** Logic/Robustness
**Status:** ✅ TESTED (but verify behavior)

**Location:** Lines 36-40 (TodayTaskRow) and 73-111 (TodayEventRow)

**Current Implementation:**
```jsx
const handleStatusClick = (e) => {
  e.stopPropagation();  // Prevent row click from opening task panel
  // ... toggle status
};
```

**Note:** Test file covers this (line 819), but verify:
- Rapid double-clicks don't both trigger
- Mobile touch events work correctly
- No event bubbling on nested elements

**Status:** Low risk - stopPropagation is correct

---

### ISSUE #9: Missing Timezone Documentation
**Severity:** 🟡 Medium
**Category:** Technical/Maintenance
**Status:** 📋 OPEN

**Location:** Lines 120-123
```javascript
const today = new Date();
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const { data: eventsData, isLoading: eventsLoading } = useDayEvents(todayStr);
```

**Problem:**
- Code uses local date (good!)
- But no comments explaining timezone handling
- useDayEvents() and useTodayView() must handle timezone on backend
- If backend is timezone-unaware, could show wrong date for users

**Recommendation:**
- Document timezone assumptions
- Add JSDoc comment explaining date handling
- Verify backend API docs mention timezone support

**Estimated Effort:** 10 minutes (documentation only)

---

### ISSUE #10: Performance Not Tested with Large Datasets
**Severity:** 🟢 Low
**Category:** Performance
**Status:** 📋 UNTESTED

**Scenarios Not Tested:**
- 20+ overdue tasks
- 20+ due today tasks
- 20+ events
- 50+ total items
- Scroll performance with large lists

**Potential Issues:**
- No virtualization (all items rendered at once)
- DOM might be slow with 50+ list items
- No pagination
- No lazy loading

**Recommendation:**
- Monitor performance in real usage with power users
- Add virtual scrolling if users regularly have 50+ items
- Consider pagination or "load more" pattern

**Not Urgent** because:
- Most users won't have that many items on a single day
- Initial load/scroll should be fine
- Can optimize later if needed

---

## Issue Summary Table

| # | Title | Severity | Type | Status | Fix Time |
|---|-------|----------|------|--------|----------|
| 1 | Red icon on red background | 🟡 Medium | Visual/A11y | VERIFY | 5 min |
| 2 | Task rows not keyboard accessible | 🟡 Medium | A11y (WCAG) | FIX | 10 min |
| 3 | Long titles overflow | 🟢 Low | Visual | TEST | 2 min |
| 4 | Completed overdue tasks | 🟢 Low | UX/Design | DECIDE | 15 min |
| 5 | Missing E2E tests | 🟡 Medium | Testing | OPEN | 30 min |
| 6 | No loading error indication | 🟢 Low | UX | MONITOR | — |
| 7 | Event color contrast | 🟢 Low | Visual/A11y | VERIFY | — |
| 8 | Click propagation edge case | 🟢 Very Low | Logic | TESTED | — |
| 9 | Timezone documentation missing | 🟡 Medium | Docs | OPEN | 10 min |
| 10 | Performance with large data | 🟢 Low | Performance | UNTESTED | TBD |

---

## Priority Roadmap

### Must Fix Before Production
1. ✅ ISSUE #2 - Make task rows keyboard accessible (WCAG requirement)
2. ⚠️ ISSUE #1 - Verify/fix red on red contrast

### Should Fix This Sprint
3. ISSUE #5 - Add E2E tests
4. ISSUE #3 - Add truncate to task titles
5. ISSUE #9 - Document timezone handling

### Can Schedule Later
6. ISSUE #4 - Decide on completed overdue task handling
7. ISSUE #10 - Optimize for large datasets if needed

### Monitor
8. ISSUE #6 - Error state handling
9. ISSUE #7 - Event color validation
10. ISSUE #8 - Already well-tested

---

## Testing Checklist

- [ ] Run `/accessibility-audit` on component
- [ ] Test keyboard navigation with Tab key
- [ ] Verify color contrast with contrast checker
- [ ] Test with real data (overdue, today, events, inbox)
- [ ] Test responsive layout (375px, 768px, 1280px)
- [ ] Test with long task titles (100+ chars)
- [ ] Test with many items (20+)
- [ ] Test dark mode colors
- [ ] Test with timezone-aware data
- [ ] Run `/smoke-test` after any changes

---

**Created:** January 31, 2026
**Component:** TodayPage.jsx
**File Path:** /myBrain-web/src/features/today/TodayPage.jsx

