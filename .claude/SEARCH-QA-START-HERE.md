# Search QA Test - START HERE

**Ready to run comprehensive search functionality testing?**

---

## What You Have

A complete, production-ready QA test package with:
- ✅ 6 comprehensive documentation files
- ✅ Detailed step-by-step execution guide
- ✅ 7-phase test plan
- ✅ Quality standards and success criteria
- ✅ Screenshot organization system
- ✅ Report template
- ✅ All supporting materials

---

## Files (Read in This Order)

### 1. START HERE (This File)
**You are here.** Quick orientation.

### 2. SEARCH-QA-EXECUTION-GUIDE.md (Main Instructions)
**READ THIS NEXT.** Complete step-by-step guide for the test.
- 7 phases with detailed procedures
- 60+ screenshot points
- Timing and checkpoints
- Quality checklist

### 3. SEARCH-QA-README.md (Quick Reference)
**Quick overview** of what's being tested and deliverables.

### 4. qa-search-test-plan.md (Detailed Scope)
**Full test scope** organized by feature area.

### 5. qa-search-context.md (Standards & Approach)
**Quality standards** and testing approach details.

### 6. SEARCH-QA-SETUP-SUMMARY.md (Setup Overview)
**Complete overview** of the test and next steps.

### 7. QA-SEARCH-PACKAGE-COMPLETE.md (Package Verification)
**Verification** that all materials are in place.

---

## How to Execute (3 Steps)

### Step 1: Read the Execution Guide
Open: `.claude/SEARCH-QA-EXECUTION-GUIDE.md`

This is the main instructions file. It contains:
- 7 detailed phases
- Step-by-step procedures
- Screenshot naming convention
- Quality checklist
- Pro tips

Time: 10-15 minutes to read

### Step 2: Run the Test
```bash
# Ensure servers running (if testing locally):
cd myBrain-web && npm run dev        # Terminal 1
cd myBrain-api && npm start          # Terminal 2

# Run the test:
agent-browser --session search-qa

# Navigate to http://localhost:5173
# Log in: claude-test-user@mybrain.test / ClaudeTest123
# Follow the execution guide
```

Time: 2-2.5 hours for complete test

### Step 3: Write the Report
Create file: `.claude/reports/qa-search-2026-01-31.md`

Using the template from SEARCH-QA-EXECUTION-GUIDE.md:
- Executive summary
- Features tested table
- Issues found (by severity)
- Test coverage summary
- Recommendations
- Screenshot evidence

Time: 15-30 minutes

---

## Quick Facts

| Item | Value |
|------|-------|
| Total Duration | 2-2.5 hours |
| Test Account | claude-test-user@mybrain.test |
| Primary Feature | Tasks search/filter |
| Test Phases | 7 (Discovery → Report) |
| Expected Screenshots | 50-70 |
| Documentation Files | 6 |
| Features to Test | 15+ |
| Success Criteria | 10 major + edge cases |

---

## What's Being Tested

### Primary (Priority 1)
**Tasks Search & Filter** - Complete testing with:
- Search input (all variations)
- Status filter (4 statuses)
- Priority filter (3 priorities)
- Combined filters
- View switching (4 views)
- Tab navigation (3 tabs)

### Secondary (Priority 2-4)
- Notes search
- Projects search
- Calendar search
- Mobile (375px)
- Keyboard navigation
- Performance
- Edge cases

---

## Success = All Tests Pass

Each feature must:
1. ✅ Work correctly (match results found)
2. ✅ Handle edge cases (special chars, emoji, long text)
3. ✅ Combine properly (AND logic)
4. ✅ Feel responsive (no lag)
5. ✅ Be accessible (keyboard, mobile)
6. ✅ Give feedback (loading, empty state, counts)
7. ✅ Have clean console (no errors)
8. ✅ Persist state (across views/tabs)
9. ✅ Meet quality bar ("better than 100%")

---

## Test Phases at a Glance

1. **Discovery** (5 min)
   - Map all search/filter features
   - Take screenshots of key areas

2. **Tasks Testing** (30 min)
   - Search: exact, partial, case, special chars
   - Filters: status, priority, combined
   - Views: list, board, table, calendar
   - Tabs: active, archived, trash

3. **Other Features** (20 min)
   - Notes, Projects, Calendar
   - Quick test of each

4. **UX Quality** (15 min)
   - Keyboard navigation
   - Mobile (375px)
   - Performance (no lag)
   - Feedback (messages, counts)

5. **Edge Cases** (15 min)
   - Special characters
   - Emoji and unicode
   - Long text
   - Rapid interactions
   - Data edge cases

6. **Final Check** (10 min)
   - Console errors
   - Verification
   - Summary

7. **Report** (15 min)
   - Write comprehensive report
   - Organize findings
   - Provide recommendations

---

## Expected Output

### Report File
**Location:** `.claude/reports/qa-search-2026-01-31.md`

**Contents:**
- Executive summary
- Features tested (comprehensive table)
- Issues found (organized by severity)
- Test coverage summary
- Recommendations
- Screenshot evidence

### Screenshots
**Location:** `.claude/design/screenshots/qa/search/`

**Format:** 
- 50-70 files
- Naming: `2026-01-31-[#]-[feature]-[description].png`
- Evidence for every major test step

---

## Key Information

**Test Account:**
- Email: claude-test-user@mybrain.test
- Password: ClaudeTest123
- (Shared database - test account works in dev and prod)

**Browser Session:**
- Command: `agent-browser --session search-qa`
- URL: http://localhost:5173 (dev) or https://my-brain-gules.vercel.app (prod)
- Tools: F12 for console access

**Quality Standard:**
- User preference: "Better than 100% quality"
- This means: Works well, not just "works"
- No lag, smooth interactions, clear feedback

---

## Checklist Before Starting

- [ ] Read SEARCH-QA-EXECUTION-GUIDE.md
- [ ] Servers running (dev) or confirmed to use production
- [ ] Test account exists and is accessible
- [ ] Browser ready with DevTools capability
- [ ] 2-2.5 hours available
- [ ] Screenshot directory exists: `.claude/design/screenshots/qa/search/`
- [ ] Ready to be thorough and methodical

---

## Pro Tips

1. **Stay organized** - Number screenshots as you take them
2. **Keep console open** - F12 stays open throughout test
3. **Document immediately** - Don't wait to remember issues
4. **Test systematically** - Follow phases in order
5. **Take lots of screenshots** - 60+ is target
6. **Try to break it** - Adversarial testing is important
7. **Check mobile** - Don't skip 375px width testing

---

## If You Get Stuck

### Can't find a feature?
Check the code: `myBrain-web/src/features/tasks/components/TaskFilters.jsx`
This shows the search/filter UI

### Got an error?
Take screenshot and document it. Note:
- Exact error message
- When it occurred
- How to reproduce
- Severity

### Need clarification?
Review:
- SEARCH-QA-EXECUTION-GUIDE.md (detailed procedures)
- qa-search-context.md (standards and approach)
- QA-SEARCH-PACKAGE-COMPLETE.md (complete overview)

---

## Ready?

**Next step:** 

Open and read: `.claude/SEARCH-QA-EXECUTION-GUIDE.md`

This is your main instructions file for the complete test.

---

## Summary

You have:
✅ Complete test documentation
✅ Detailed execution guide
✅ Quality standards
✅ Report templates
✅ Screenshot system

You need to:
1. Read SEARCH-QA-EXECUTION-GUIDE.md
2. Run test following 7 phases
3. Take 50-70 screenshots
4. Document all findings
5. Create comprehensive report

**Estimated time:** 2-2.5 hours

**Let's go!**
