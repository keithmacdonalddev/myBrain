# Comprehensive Search QA Test Instructions

**Execution Date:** 2026-01-31
**Test Plan Reference:** `.claude/reports/qa-search-test-plan.md`
**Output Location:** `.claude/reports/qa-search-2026-01-31.md`
**Screenshots:** `.claude/design/screenshots/qa/search/`

---

## Test Execution Sequence

### STEP 1: Environment & Login (5 minutes)
1. Open http://localhost:5173
2. Wait for page load
3. Log in with test account: claude-test-user@mybrain.test / ClaudeTest123
4. Screenshot after login: initial load state
5. Check for any console errors (F12 → Console)

### STEP 2: Global Navigation Discovery (5 minutes)
1. Look at header - any global search?
2. Check sidebar - any search input?
3. Visit main feature areas to identify search/filter entry points
4. Document which pages have search/filter

### STEP 3: Tasks Search & Filter Comprehensive Test (30 minutes)

#### Basic Search Testing
- Type search queries with exact, partial, case variations
- Test special characters, numbers, emoji
- Test empty search and very long queries
- Test spaces-only queries
- Document real-time vs. Enter-to-submit behavior

#### Status Filter Testing
- Test each status: todo, in_progress, done, cancelled
- Verify correct tasks appear for each status
- Test combining status with other filters
- Test "All Statuses" reset

#### Priority Filter Testing
- Test each priority: high, medium, low
- Verify correct tasks appear
- Test combining with search and status
- Test "All" reset

#### Combined Filters Testing
- Apply search + status + priority simultaneously
- Verify all conditions are met (AND logic)
- Change one filter and verify results update
- Clear all filters and verify reset

#### Clear Filters Button
- Verify button appears when filters active
- Verify button is disabled when no filters
- Verify clearing resets all inputs

#### View Switching with Filters
- Apply filters in list view
- Switch to board, table, calendar views
- Verify filters persist across view changes
- Verify display is correct in each view

#### Tab Navigation with Filters
- Test filters on Active, Archived, and Trash tabs
- Verify tab-specific filtering works
- Verify switching tabs doesn't lose filter state

### STEP 4: Notes Search Testing (10 minutes)
- Look for search input
- Test search by title and content (if applicable)
- Test tag filtering (if applicable)
- Test combinations

### STEP 5: Projects Search Testing (5 minutes)
- Look for search/filter capability
- Test search by name
- Test status filtering

### STEP 6: Calendar/Events Search (5 minutes)
- Look for event search
- Test date navigation

### STEP 7: Performance & UX Testing (15 minutes)

#### Search Performance
- Type character by character, watch for lag
- Verify debounce working
- Measure response time for large result sets

#### Empty State & Feedback
- Search for non-matching query
- Verify clear "no results" message
- Check if result count displayed
- Look for loading indicators

#### Keyboard Navigation
- Tab through search and filter inputs
- Verify Tab moves to next element
- Test Escape key to clear search
- Test arrow keys in filter dropdowns

#### Mobile Responsiveness
- Resize to 375px width
- Test search input functionality
- Test filter button and dropdowns
- Verify layout doesn't break
- Test filtering on mobile

### STEP 8: Edge Cases & Adversarial Testing (15 minutes)

#### Special Characters & Edge Cases
- Search for tasks with @, #, $, &, %, etc.
- Search for emoji if possible
- Search for numbers: 123, 2026, etc.
- Search for very long text (500+ chars)

#### Rapid Interactions
- Rapidly click filter button
- Type quickly without pausing
- Rapidly toggle between filters
- Check for crashes or lag

#### Data Edge Cases
- Find tasks with no title
- Find tasks with very long titles (200+ chars)
- Find tasks with only spaces
- Find tasks with HTML/code characters
- Find duplicate titles - verify all match

#### Browser State Edge Cases
- Clear local storage and refresh
- Test graceful degradation scenarios
- Check for memory leaks with DevTools

### STEP 9: Console Error Check
1. Keep DevTools open throughout testing
2. Take final screenshot of console
3. Document any errors, warnings, or network failures

---

## Issues to Document

For each issue found, capture:
1. **What:** Clear description of the problem
2. **Where:** Exact location/page/feature
3. **Reproduce:** Steps to reproduce
4. **Expected:** What should happen
5. **Actual:** What actually happens
6. **Severity:** Critical/High/Medium/Low
7. **Screenshot:** Evidence

---

## Success Criteria

| Feature | Criteria |
|---------|----------|
| Search Input | Filters results correctly, handles edge cases, no lag |
| Status Filter | Correctly filters by status, combines properly |
| Priority Filter | Correctly filters by priority, combines properly |
| Clear Filters | Works when filters active, disabled when not |
| View Switching | Filters persist, display correct in all views |
| Tab Navigation | Filters apply per tab, state persists |
| UX Feedback | Clear messaging, result counts, loading indicators |
| Mobile | Fully functional on 375px width |
| Performance | No UI freeze, debounce working, sub-500ms responses |
| Keyboard | Tab, Escape, arrow keys work as expected |
| Edge Cases | Handles special chars, emoji, long text, rapid clicks |

---

## Report Template

Save comprehensive report to: `.claude/reports/qa-search-2026-01-31.md`

Include sections:
1. Executive Summary
2. Features Tested (table with status)
3. Issues Found (by severity)
4. Screenshots Evidence
5. Test Coverage Summary
6. Recommendations

Save all screenshots to: `.claude/design/screenshots/qa/search/`

Naming format: `[YYYY-MM-DD]-[sequence]-[feature]-[description].png`
