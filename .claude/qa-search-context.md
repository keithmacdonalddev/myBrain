# Search QA Context for Agent Execution

**Mission:** Comprehensive QA testing of all search and filter functionality in myBrain application

**Scope:** All features, all pages, all edge cases
**Test Account:** claude-test-user@mybrain.test / ClaudeTest123
**Browser Session:** search-qa
**Duration:** ~2-3 hours

---

## Key Features to Test

### 1. Tasks (HIGHEST PRIORITY)
- Search input (real-time filtering by title)
- Status filter (todo, in_progress, done, cancelled)
- Priority filter (high, medium, low)
- Combined filters (search + status + priority)
- Clear filters button (should disable when no filters)
- View persistence (list, board, table, calendar views)
- Tab navigation (Active, Archived, Trash tabs)

### 2. Notes
- Search by title (if exists)
- Search by content (if exists)
- Tag filtering (if exists)

### 3. Projects
- Search by name (if exists)
- Status filtering (if exists)

### 4. Calendar/Events
- Event search (if exists)
- Date navigation (if exists)

### 5. Global
- Header search (if exists)
- Sidebar search (if exists)

---

## Success Criteria

Each feature MUST:
1. Filter/search correctly with exact matches
2. Filter/search correctly with partial matches
3. Handle edge cases (special chars, emoji, long text)
4. Perform well (no UI lag, debounce working)
5. Provide clear feedback (loading, empty state, result count)
6. Be keyboard accessible (Tab, Escape)
7. Work on mobile (375px width)
8. Persist state across view/tab changes
9. Combine filters correctly (AND logic)
10. Have no console errors

---

## Testing Approach

### Phase 1: Discovery (5 min)
Find all search/filter inputs in the app

### Phase 2: Task Search Comprehensive (30 min)
- Basic search (exact, partial, case, special chars)
- Status filter (each status individually)
- Priority filter (each priority individually)
- Combined filters (all combinations)
- Clear filters button
- View switching with filters
- Tab navigation with filters

### Phase 3: Other Features (20 min)
- Notes, Projects, Calendar (each 5-10 min)
- Document what exists and what's missing

### Phase 4: UX & Performance (15 min)
- Keyboard navigation
- Mobile responsiveness
- Performance (no lag, debounce)
- Empty states and feedback

### Phase 5: Edge Cases & Adversarial (15 min)
- Special characters (@, #, $, %, emoji, etc.)
- Very long queries (500+ chars)
- Rapid clicking/typing
- Data edge cases (no title, very long title, duplicates)
- Browser state edge cases

### Phase 6: Console & Final Check (10 min)
- Monitor console for errors
- Final verification

---

## Critical Quality Standards

**User's "better than 100% quality" standard applies.**

This means:
- NOT just "does it work" - it must work WELL
- No UI lag or freeze
- Smooth interactions
- Clear feedback
- Intuitive UX

---

## Output Requirements

### Report: `.claude/reports/qa-search-2026-01-31.md`
- Executive summary (1-2 paragraphs)
- Features tested (comprehensive table)
- Issues found (organized by severity: Critical/High/Medium/Low)
- Test coverage summary
- Recommendations
- Screenshot evidence links

### Screenshots: `.claude/design/screenshots/qa/search/`
- Organized naming: `[YYYY-MM-DD]-[number]-[feature]-[description].png`
- Every major test step should have screenshot evidence
- Expected: 60-70 screenshots total
- Include mobile screenshots (375px)
- Include console error screenshots

### Data Collection
Track for each feature:
- Status (PASS/FAIL)
- Issues found (list by name)
- Severity (Critical/High/Medium/Low)
- Impact assessment
- Recommendations for fix

---

## Known Features (from code review)

These ARE implemented and should be tested:
1. **Tasks page:** Search input + Status filter + Priority filter in TaskFilters.jsx
2. **Tasks view switching:** List, Board, Table, Calendar views
3. **Tasks tabs:** Active, Archived, Trash
4. **Notes:** NotesList.jsx with various features
5. **Projects:** ProjectsList.jsx with filtering

These MAY NOT exist:
- Global search (across all features)
- Notes content search (only title search likely)
- Calendar event search
- Admin search

---

## Execution Commands

All commands use: `agent-browser --session search-qa`

Standard flow:
1. `agent-browser --session search-qa` to start
2. Navigate to http://localhost:5173
3. Log in
4. Execute test steps
5. Take screenshots as specified
6. Monitor console (F12)
7. Create final report

---

## Red Flags to Watch For

Stop testing and escalate if:
1. App crashes or won't load
2. Data loss occurs
3. Security issue found (can execute code via search)
4. Complete feature missing (e.g., search doesn't work at all)
5. Serious UX issue (e.g., search results hidden, filter doesn't apply)

---

## Time Budget

- Discovery: 5 min
- Tasks testing: 30 min
- Other features: 20 min
- UX/Performance: 15 min
- Edge cases: 15 min
- Console check: 10 min
- Report writing: 15 min
- Total: ~2-2.5 hours

If you finish early, add more detailed edge case testing or mobile testing.

---

## Key Differences from Standard QA

This test emphasizes:
1. **Completeness** - All combinations and edge cases
2. **User experience** - Not just "does it work" but "does it feel good"
3. **Real-world scenarios** - How would users actually use this?
4. **Adversarial testing** - Try to break it intentionally
5. **Documentation** - Capture everything with screenshots

---

## Questions for Agent During Execution

Ask yourself during testing:
1. Does this feel smooth and responsive?
2. Is it obvious what to do?
3. Would a non-technical user understand the results?
4. Are there any confusing states?
5. Does the app give good feedback?
6. Would I be frustrated using this?
7. Did I find any bugs?
8. Is anything misleading or wrong?

---

## Success Looks Like

When complete, you should have:
1. Tested every search/filter feature in the app
2. Captured 60-70 screenshots showing different states
3. Found and documented any issues
4. Confirmed that all tests pass (or documented why they fail)
5. Assessed quality against "better than 100%" standard
6. Created professional, detailed report
7. Provided clear recommendations
