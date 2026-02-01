# Search Functionality Comprehensive QA Test

**Created:** 2026-01-31
**Status:** READY FOR EXECUTION
**Session:** search-qa
**Duration:** ~2-2.5 hours

---

## Quick Start

1. Read: `.claude/SEARCH-QA-EXECUTION-GUIDE.md` (main instructions)
2. Run: `agent-browser --session search-qa`
3. Navigate: http://localhost:5173 (or production URL)
4. Login: claude-test-user@mybrain.test / ClaudeTest123
5. Follow: 7-phase test plan in execution guide
6. Report: Save to `.claude/reports/qa-search-2026-01-31.md`
7. Screenshots: Save to `.claude/design/screenshots/qa/search/`

---

## What's Being Tested

**Primary:** Tasks search and filter features
- Search input (exact, partial, special chars, edge cases)
- Status filter (todo, in_progress, done, cancelled)
- Priority filter (high, medium, low)
- Combined filters
- View switching (list, board, table, calendar)
- Tab navigation (active, archived, trash)

**Secondary:** Notes, Projects, Calendar search (5-10 min each)

**Quality:** Keyboard accessibility, mobile (375px), performance, edge cases

---

## Documentation Files

| File | Purpose |
|------|---------|
| `SEARCH-QA-EXECUTION-GUIDE.md` | **START HERE** - Complete step-by-step instructions |
| `qa-search-test-plan.md` | Detailed test plan and scope |
| `qa-search-context.md` | Context, standards, and quality bar |
| `qa-search-instructions.md` | Test procedures and templates |
| `SEARCH-QA-SETUP-SUMMARY.md` | Setup overview and next steps |

---

## Test Phases

1. **Discovery** (5 min) - Map all search features
2. **Tasks** (30 min) - Comprehensive task search/filter testing
3. **Other** (20 min) - Notes, Projects, Calendar
4. **UX** (15 min) - Keyboard, mobile, performance
5. **Edge Cases** (15 min) - Special chars, emoji, long text, rapid clicks
6. **Final** (10 min) - Console errors, summary
7. **Report** (15 min) - Write comprehensive report

---

## Expected Deliverables

✅ Comprehensive QA report (50-60 paragraphs)
✅ 50-70 screenshots (organized and named)
✅ Issues documented by severity
✅ Test coverage summary
✅ Recommendations for improvements

Location: `.claude/reports/qa-search-2026-01-31.md`

---

## Success Criteria

Each feature must:
1. Work correctly (exact + partial matches)
2. Combine filters properly (AND logic)
3. Handle edge cases gracefully
4. Provide clear feedback
5. Be keyboard accessible
6. Work on mobile (375px)
7. Persist state across views
8. Perform without lag
9. Have no console errors
10. Meet "better than 100%" quality standard

---

## Key Features

### Tasks Search & Filter (PRIORITY 1)
- Search input (real-time filtering)
- Status dropdown (4 statuses)
- Priority dropdown (3 priorities)
- Clear filters button
- 4 view modes (persistence test)
- 3 tabs (state test)

### Notes Search (PRIORITY 2)
- Title search
- Tag filtering (if exists)
- Combinations

### Projects (PRIORITY 3)
- Name search
- Status filtering

### Calendar (PRIORITY 4)
- Event search
- Date navigation

---

## Testing Approach

✅ Systematic: Each feature tested completely
✅ Methodical: Follow step-by-step guide
✅ Evidence-based: Screenshot every major step
✅ Adversarial: Try to break it intentionally
✅ Quality-focused: Assess against "better than 100%" standard

---

## Time Budget

- Discovery: 5 min
- Tasks: 30 min
- Other: 20 min
- UX: 15 min
- Edge Cases: 15 min
- Final: 10 min
- Report: 15 min
- **Total: 2-2.5 hours**

---

## Screenshots

Save all to: `.claude/design/screenshots/qa/search/`

Naming: `2026-01-31-[number]-[feature]-[description].png`

Expected: 50-70 screenshots

---

## Report

Save to: `.claude/reports/qa-search-2026-01-31.md`

Include:
- Executive summary
- Features tested table
- Issues by severity
- Test coverage
- Recommendations
- Screenshot evidence

---

## Ready?

Yes! All documentation is prepared.

**Next:** Read `SEARCH-QA-EXECUTION-GUIDE.md` and begin testing.
