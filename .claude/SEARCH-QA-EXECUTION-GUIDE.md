# Search QA Test - Complete Execution Guide

**Start Time:** 2026-01-31
**Test Session:** search-qa
**Test Account:** claude-test-user@mybrain.test / ClaudeTest123
**App URL:** http://localhost:5173

---

## Quick Start

1. Use agent-browser with: `--session search-qa`
2. Navigate to http://localhost:5173
3. Log in with test account above
4. Follow the sequential test plan below
5. Take screenshots for every major step
6. Save screenshots to: `.claude/design/screenshots/qa/search/`
7. Create final report at: `.claude/reports/qa-search-2026-01-31.md`

---

## Test Plan Overview

| Phase | Task | Time | What to Do |
|-------|------|------|-----------|
| 1 | Discovery | 5 min | Find all search/filter features |
| 2 | Tasks Testing | 30 min | Comprehensive test of Task search/filters |
| 3 | Other Features | 20 min | Quick test of Notes, Projects, Calendar |
| 4 | UX Quality | 15 min | Keyboard, mobile, performance |
| 5 | Edge Cases | 15 min | Special chars, long text, rapid clicks |
| 6 | Final Check | 10 min | Console errors, summary |
| 7 | Reporting | 15 min | Write comprehensive report |

**Total Time:** ~2-2.5 hours

---

## Phase 1: Discovery (5 minutes)

### Objective: Map all search/filter features

1. **Log in** and navigate to home page
2. **Check Header** - Is there a global search input?
3. **Check Sidebar** - Any search capabilities?
4. **Visit each main page:**
   - /tasks → Look for search/filter UI
   - /notes → Look for search/filter UI
   - /projects → Look for search/filter UI
   - /calendar → Look for search/filter UI
   - /files → Look for search/filter UI
   - /images → Look for search/filter UI
5. **Document findings:**
   - Which pages have search inputs?
   - What types of filters are available?
   - Are they inline or in modals/dropdowns?

### Screenshot: Discovery Summary
Take one screenshot showing the tasks page with its search/filter UI clearly visible.

---

## Phase 2: Tasks Search & Filter Testing (30 minutes)

This is the PRIMARY focus - Tasks page has the most comprehensive search/filter features.

### 2.1 Basic Search (10 minutes)

**Goal:** Verify search input works correctly

1. Navigate to `/tasks`
2. **Screenshot 01:** Initial tasks page with no filters
3. **Identify the search input** and status/priority filters
4. **Search Test 1 - Exact Match:**
   - Type a task title that exists (or create one)
   - Verify results filter in real-time
   - Note: Does it require Enter or filter on keystroke?
   - **Screenshot 02:** Search results showing matches
5. **Search Test 2 - Partial Match:**
   - Clear search
   - Type partial task title (first 3-4 letters)
   - Verify it still finds the task
   - **Screenshot 03:** Partial match results
6. **Search Test 3 - Case Sensitivity:**
   - Search with uppercase: "COMPLETE"
   - Does it find lowercase "complete" task?
   - **Screenshot 04:** Case insensitive search
7. **Search Test 4 - Special Characters:**
   - If task title has @, #, $, search for it
   - Or search for these chars: "test@", "task#1"
   - **Screenshot 05:** Special character search
8. **Search Test 5 - Empty & Clear:**
   - Clear search completely
   - Do all tasks reappear?
   - **Screenshot 06:** Cleared search shows all
9. **Search Test 6 - Long Query:**
   - Type 100+ chars that won't match
   - Does app handle gracefully?
   - **Screenshot 07:** Long query handling
10. **Search Test 7 - Spaces:**
    - Type "     " (spaces only)
    - **Screenshot 08:** Spaces-only handling

### 2.2 Status Filter (5 minutes)

**Goal:** Verify status filter works

1. Find the Status filter dropdown
2. **Select "To Do"** → Only show todo tasks → **Screenshot 09**
3. **Select "In Progress"** → Show in_progress tasks → **Screenshot 10**
4. **Select "Done"** → Show done tasks → **Screenshot 11**
5. **Select "Cancelled"** → Show cancelled tasks → **Screenshot 12**
6. **Select "All Statuses"** → All tasks return → **Screenshot 13**

### 2.3 Priority Filter (3 minutes)

**Goal:** Verify priority filter works

1. Find the Priority filter dropdown
2. **Select "High"** → Only high priority → **Screenshot 14**
3. **Select "Medium"** → Only medium priority → **Screenshot 15**
4. **Select "Low"** → Only low priority → **Screenshot 16**
5. **Select "All"** → All return → **Screenshot 17**

### 2.4 Combined Filters (5 minutes)

**Goal:** Verify filters combine correctly (AND logic)

1. **Setup:** Search "complete" + Status "In Progress" + Priority "High"
2. Results should show ONLY tasks that match ALL three conditions
3. **Screenshot 18:** Combined filters applied
4. **Change Status to "Done"** (keep search and priority)
5. Results should update to show different tasks
6. **Screenshot 19:** Changed filter, results updated
7. **Clear Search** (keep status and priority)
8. **Screenshot 20:** Without search filter
9. **Click "Clear" Button** → Reset all filters → **Screenshot 21**

### 2.5 View Switching (5 minutes)

**Goal:** Verify filters persist across view changes

1. Apply filters: search="complete", status="todo"
2. Take **Screenshot 22:** List view with filters
3. Switch to Board view → **Screenshot 23:** Same filters in board view
4. Switch to Table view → **Screenshot 24:** Same filters in table view
5. Switch to Calendar view → **Screenshot 25:** Same filters in calendar view
6. Return to List view → **Screenshot 26:** Filters still there

### 2.6 Tab Navigation (2 minutes)

**Goal:** Verify filters work per-tab

1. On "Active" tab, apply filters (search="complete")
2. **Screenshot 27:** Active tab with filters
3. Click "Archived" tab
4. **Screenshot 28:** Archived tab (filters may reset)
5. Return to "Active" tab
6. **Screenshot 29:** Verify filters restored

---

## Phase 3: Other Features Testing (20 minutes)

### 3.1 Notes Search (5 minutes)

1. Navigate to `/notes`
2. **Screenshot 30:** Notes page overview
3. Look for search input
4. If search exists:
   - Search for note title
   - **Screenshot 31:** Notes search results
   - Test partial match
   - **Screenshot 32:** Partial match
5. Look for tag filtering
6. If tags exist:
   - Click a tag
   - **Screenshot 33:** Tag filtered notes

### 3.2 Projects (5 minutes)

1. Navigate to `/projects`
2. **Screenshot 34:** Projects page overview
3. Look for search/filter
4. If exists, test similar to tasks
5. **Screenshot 35:** Projects search/filter (if exists)

### 3.3 Calendar (5 minutes)

1. Navigate to `/calendar`
2. **Screenshot 36:** Calendar overview
3. Look for event search
4. If exists, test search and navigation
5. **Screenshot 37:** Calendar search (if exists)

### 3.4 Files & Images (5 minutes)

1. Quick check on `/files` and `/images`
2. Look for search capabilities
3. **Screenshot 38:** Files/Images overview (if search exists)

---

## Phase 4: UX Quality Testing (15 minutes)

### 4.1 Keyboard Navigation (5 minutes)

1. Go to Tasks page
2. **Tab through search input** - Can you focus it?
3. **Type search** - Does input accept text?
4. **Tab to filter button** - Can you focus it?
5. **Press Enter on filter button** - Does it toggle filters?
6. **Press Escape** - Does search clear?
7. **Screenshot 39:** Keyboard nav working
8. Test in filter dropdowns - Arrow keys work?

### 4.2 Mobile Responsiveness (5 minutes)

1. Resize browser to **375px width**
2. Navigate to `/tasks`
3. **Screenshot 40:** Mobile layout
4. **Click search input** - Can you type?
5. **Screenshot 41:** Mobile search focus
6. **Click filter button** - Opens properly?
7. **Screenshot 42:** Mobile filters
8. **Apply search + filter on mobile**
9. **Screenshot 43:** Mobile filtered results
10. Resize back to **1280px** (desktop)

### 4.3 Performance Testing (3 minutes)

1. Go to Tasks with many tasks (50+)
2. **Type slowly:** "t", "a", "s", "k"
3. At each keystroke, check:
   - Does UI lag?
   - Debounce working? (not updating on every keystroke?)
   - Response time OK?
4. **Screenshot 44:** Typing performance
5. **Rapidly click filter button** 5-10 times
6. No crashes? No lag?
7. **Screenshot 45:** Rapid clicking handled

### 4.4 Empty State & Feedback (2 minutes)

1. Search for something that won't match: "xyzabc12345"
2. **Screenshot 46:** No results state
3. Is message clear?
4. **Screenshot 47:** Result count display (if shown)

---

## Phase 5: Edge Cases & Adversarial (15 minutes)

### 5.1 Special Characters (3 minutes)

1. Search for these: "@", "#", "$", "%", "&", "*"
2. **Screenshot 48:** Special char search
3. Search for HTML: "<script>"
4. Does it display safely?
5. **Screenshot 49:** HTML in search

### 5.2 Emoji & Unicode (2 minutes)

1. Try searching for emoji: 😀 🎯 ✅ 🚀
2. Copy/paste emoji in search
3. **Screenshot 50:** Emoji handling
4. Unicode characters?
5. **Screenshot 51:** Unicode handling

### 5.3 Long Text (2 minutes)

1. Type 200+ character string in search
2. Does app handle gracefully?
3. **Screenshot 52:** Long text handling
4. Type 500+ characters
5. **Screenshot 53:** Very long text

### 5.4 Rapid Interactions (3 minutes)

1. Rapidly click filter toggle (10 times)
2. **Screenshot 54:** Rapid toggle stability
3. Type quickly without pausing (type "aaaaaaaaa")
4. **Screenshot 55:** Rapid typing
5. Rapidly switch between filters
6. Check console for errors

### 5.5 Data Edge Cases (3 minutes)

1. Look for tasks with no title
2. Search for empty/null values
3. **Screenshot 56:** Edge case data
4. Duplicate task titles - search for one
5. Do ALL matches appear?
6. **Screenshot 57:** Duplicate results

### 5.6 Console Check (2 minutes)

1. Open DevTools (F12)
2. Go to Console tab
3. Perform all above tests
4. **Screenshot 58:** Console errors (if any)
5. Document any red errors

---

## Phase 6: Final Verification (10 minutes)

### 6.1 Regression Check

1. Verify main features still work:
   - Can create task?
   - Can edit task?
   - Can delete task?
2. Check no data was lost

### 6.2 Console Final Check

1. **Screenshot 59:** Final console state
2. Document all errors/warnings

### 6.3 Cross-Browser Check (if time)

1. Test on Firefox or Safari (if available)
2. Any differences in search behavior?
3. **Screenshot 60:** Different browser (if tested)

---

## Phase 7: Report Writing (15 minutes)

### Create Report File

Location: `.claude/reports/qa-search-2026-01-31.md`

Content structure:

```markdown
# Search QA Test Report
**Date:** 2026-01-31
**Tester:** Agent
**Duration:** ~2.5 hours

## Executive Summary
[1-2 paragraphs about overall findings]

## Features Tested

| Feature | Location | Status | Issues | Notes |
|---------|----------|--------|--------|-------|
| Task Search | /tasks | PASS/FAIL | [list] | [notes] |
| Task Status Filter | /tasks | PASS/FAIL | | |
| Task Priority Filter | /tasks | PASS/FAIL | | |
| ... | | | | |

## Issues Found (by Severity)

### Critical
[List any critical issues]

### High
[List high severity issues]

### Medium
[List medium issues]

### Low
[List low/nice-to-have items]

## Test Coverage

- Search: Exact, partial, case, special chars, long text, empty
- Filters: Status, priority, combinations
- Views: List, board, table, calendar
- Tabs: Active, archived, trash
- UX: Keyboard, mobile, performance
- Edge Cases: Special chars, emoji, long text, rapid clicks, data edge cases

## Test Results Summary

- Total screenshots: [number]
- Total issues found: [number]
- Critical issues: [number]
- App stability: STABLE/UNSTABLE
- Mobile compatibility: PASS/FAIL
- Performance: ACCEPTABLE/SLOW

## Recommendations

[Your recommendations for improvements]

## Screenshot Evidence

[Links to screenshot files]
```

### Requirements for Report

1. **Must include:** All features tested, status of each, issues found
2. **Must organize issues** by severity (Critical/High/Medium/Low)
3. **Must reference screenshots** as evidence
4. **Must assess:** Overall quality against "better than 100%" standard
5. **Must recommend** fixes for any issues found

---

## Screenshot Naming Convention

Name every screenshot exactly as: `2026-01-31-[number]-[feature]-[description].png`

Examples:
- `2026-01-31-01-discovery-initial-load.png`
- `2026-01-31-02-task-search-exact-match.png`
- `2026-01-31-10-task-filter-status-todo.png`
- `2026-01-31-20-mobile-375px-search.png`
- `2026-01-31-58-console-final-check.png`

Number them sequentially as you take them.

---

## Quality Checklist

Before finishing, verify:

- [ ] Tested all search/filter features identified
- [ ] Tested on both desktop (1280px) and mobile (375px)
- [ ] Tested keyboard navigation (Tab, Escape)
- [ ] Tested edge cases (special chars, emoji, long text)
- [ ] Tested rapid interactions (no crashes?)
- [ ] Checked console for errors
- [ ] Took 50-60+ screenshots
- [ ] Documented all issues found
- [ ] Rated severity of each issue
- [ ] Created comprehensive report
- [ ] Organized report by severity and feature
- [ ] Included screenshot evidence references

---

## Key Success Indicators

✅ = SUCCESS if:
- All search filters work correctly
- No UI lag or freeze
- Mobile fully functional
- Clear user feedback (no results message, etc.)
- No console errors
- Edge cases handled gracefully
- Filters persist across views/tabs

❌ = FAILURE if:
- Search doesn't work at all
- Filters don't apply
- Results are wrong
- App crashes
- Serious UI lag
- Mobile unusable
- Console errors

---

## Duration Target

- Phase 1 (Discovery): 5 min
- Phase 2 (Tasks): 30 min
- Phase 3 (Other): 20 min
- Phase 4 (UX): 15 min
- Phase 5 (Edge): 15 min
- Phase 6 (Final): 10 min
- Phase 7 (Report): 15 min
- **Total: ~2 hours**

If running over, prioritize Phase 2 (Tasks) - that's the core functionality.

---

## When to Stop & Escalate

Stop testing and report immediately if:
1. App won't start or crashes
2. You can't log in
3. Data is corrupted/missing
4. Security issue found (code injection in search)
5. Search/filter completely broken (doesn't work at all)

These are showstoppers - report right away rather than continuing.

---

## Pro Tips

1. **Stay organized** - Number screenshots as you go, don't batch later
2. **Document issues immediately** - Don't wait until end to remember
3. **Refresh between phases** - Prevent state issues from accumulating
4. **Use console frequently** - Keep F12 open during testing
5. **Take mobile screenshots** - Don't skip - many users on mobile
6. **Test combinations** - Not just individual features
7. **Read error messages** - They often tell you what's wrong
8. **Trust your instincts** - If something feels wrong, investigate

---

## Ready to Execute

When you start:
1. Confirm both servers running (frontend + backend)
2. Open agent-browser with correct session
3. Navigate to http://localhost:5173
4. Log in
5. Begin Phase 1: Discovery
6. Follow sequence through Phase 7
7. Create final report
8. Save all screenshots

**You've got this! Go thorough, be methodical, and find all the issues.**
