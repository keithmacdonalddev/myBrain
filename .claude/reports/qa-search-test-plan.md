# Search Functionality Comprehensive QA Test Plan

**Date:** 2026-01-31
**Test Scope:** Global and page-specific search/filter features
**Test Account:** claude-test-user@mybrain.test / ClaudeTest123
**Browser Session:** search-qa
**Test URLs:** http://localhost:5173 (dev) or https://my-brain-gules.vercel.app (prod)

---

## Features to Test

### 1. Tasks Search & Filter
- **Location:** Tasks page (`/tasks`)
- **Features Identified:**
  - Search input (search by title)
  - Status filter (todo, in_progress, done, cancelled)
  - Priority filter (high, medium, low)
  - Multiple views (list, board, table, calendar)
  - Tabs (active, archived, trash)
  - Clear filters button

### 2. Notes
- **Location:** Notes page (`/notes`)
- **Features to Test:**
  - Search capability (if exists)
  - Tags/filtering (if exists)
  - View modes

### 3. Projects
- **Location:** Projects page (`/projects`)
- **Features to Test:**
  - Search/filter capability
  - Status filtering
  - View modes

### 4. Calendar
- **Location:** Calendar page (`/calendar`)
- **Features to Test:**
  - Event search (if exists)
  - Date navigation/filtering

### 5. Global Features
- **Header/Navigation Search**
- **Sidebar search** (if exists)
- **Admin search** (logs, users)

---

## Test Execution Plan

### Phase 1: Discovery (5 min)
1. Log in to app
2. Explore header/navigation for global search
3. Visit each main feature and identify search/filter inputs
4. Document UI layout and controls

### Phase 2: Task Search & Filter (15 min)
1. **Search Input**
   - Type in search box
   - Verify results filter in real-time
   - Search exact match: search for specific task title
   - Search partial match: search for substring
   - Case sensitivity test
   - Special characters test
   - Empty search behavior
   - Very long query (100+ characters)
   - Spaces-only query

2. **Status Filter**
   - Select each status individually
   - Combine status + search
   - Verify correct tasks appear
   - Verify icons/colors match selected status

3. **Priority Filter**
   - Select each priority
   - Combine with status
   - Combine all three (search + status + priority)

4. **Clear Filters**
   - After applying filters, click "Clear"
   - Verify all tasks reappear
   - Verify button is disabled when no filters active

5. **View Switching**
   - Test search/filters in each view (list, board, table, calendar)
   - Verify filters persist when switching views
   - Verify filtered results display correctly in each view

6. **Tab Navigation**
   - Test filters on "Active" tab
   - Test filters on "Archived" tab
   - Test filters on "Trash" tab
   - Verify filters apply correctly per tab

### Phase 3: Notes Search (10 min)
1. Check if search input exists
2. If exists:
   - Search by title
   - Search by content (if applicable)
   - Test partial matches
   - Test case sensitivity

### Phase 4: Projects Search (5 min)
1. Look for project search/filter
2. Test search and filtering

### Phase 5: Calendar Search (5 min)
1. Check if event search exists
2. Test date navigation

### Phase 6: UX Quality Testing (10 min)
1. **Search Performance**
   - With many results (50+): response time acceptable?
   - UI freezes?
   - Debounce working (typing doesn't lag)?

2. **Feedback & Empty States**
   - No results message clear?
   - Loading indicator during search?
   - Result count displayed?
   - Highlights in results?

3. **Keyboard Navigation**
   - Tab through search inputs
   - Escape to clear search
   - Enter to submit (if applicable)

4. **Mobile Responsiveness**
   - Search input size/usability on mobile
   - Filter buttons responsive
   - No overflow issues

### Phase 7: Edge Cases & Adversarial Testing (10 min)
1. **Edge Cases**
   - Emoji in search
   - Numbers in search
   - Unicode characters
   - Very long task title (200+ chars) + search
   - Null/undefined data handling

2. **User Interactions**
   - Rapid clicking filters
   - Rapid typing in search
   - Filter toggle spam
   - Clear then immediately search

3. **Data Edge Cases**
   - Task with no title
   - Task with very long description
   - Task with special characters in title
   - Multiple tasks with same title

---

## Success Criteria

Each feature should meet these criteria to PASS:

| Feature | Criteria |
|---------|----------|
| Search input | Filters results in real-time, handles edge cases, no lag |
| Status filter | Correctly filters by status, can combine with other filters |
| Priority filter | Correctly filters by priority, can combine with other filters |
| Clear filters | Button works, disables when no filters active |
| View switching | Filters persist, results display correctly in all views |
| UX feedback | Loading states, no-result messages, clear results |
| Mobile | Fully functional and usable on 375px width |
| Performance | No UI freezes, debounce working, sub-500ms responses |

---

## Issues to Document

When finding issues, capture:
1. **What:** Clear description of the problem
2. **Where:** Exact location/page/feature
3. **Reproduce:** Steps to reproduce
4. **Expected:** What should happen
5. **Actual:** What actually happens
6. **Impact:** High/Medium/Low severity
7. **Screenshot:** Visual evidence

---

## Report Format

Save report to: `.claude/reports/qa-search-YYYY-MM-DD.md`

Create summary table:

| Feature | Location | Status | Issues | Notes |
|---------|----------|--------|--------|-------|
| Task Search | Tasks page | PASS/FAIL | List issues | Notes |
| Task Status Filter | Tasks page | PASS/FAIL | List issues | Notes |
| Task Priority Filter | Tasks page | PASS/FAIL | List issues | Notes |
| ... | ... | ... | ... | ... |

---

## Screenshots

Save to: `.claude/design/screenshots/qa/search/`

Naming format: `[YYYY-MM-DD]-[feature]-[condition].png`

Examples:
- `2026-01-31-task-search-results.png`
- `2026-01-31-filter-combined-status-priority.png`
- `2026-01-31-mobile-375px-search.png`
- `2026-01-31-empty-state-no-results.png`

