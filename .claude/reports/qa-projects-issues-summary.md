# PROJECTS PAGE QA - ISSUES SUMMARY

**Report Date:** 2026-01-31
**Total Issues Found:** 16
**Critical:** 3 | **Medium:** 5 | **Low:** 8

---

## CRITICAL ISSUES (Must Fix)

### 🔴 #1: Progress Not Updating When Tasks Added
**File:** `myBrain-web/src/features/projects/hooks/useProjects.js`
**Problem:** Task cache not invalidated on task creation
**Impact:** Users see 0% progress until page refresh
**Fix:** Add `queryClient.invalidateQueries(['projects', projectId])` in task mutation onSuccess

---

### 🔴 #2: Progress Calculation - Division by Zero Edge Case
**File:** `myBrain-web/src/features/projects/components/ProjectProgress.jsx`
**Problem:** No safeguards when total tasks = 0
**Impact:** Could display NaN or undefined if progress object malformed
**Fix:** Add explicit null checks and edge case handling

---

### 🔴 #3: No Task Linking Verification
**File:** `myBrain-api/src/routes/projects.js` and `myBrain-api/src/routes/tasks.js`
**Problem:** Tasks can be assigned to projects without validation
**Impact:** Data integrity issues, orphaned tasks
**Fix:** Add validation in task update routes to verify project ownership

---

## MEDIUM ISSUES (High Priority)

### 🟠 #4: Stale Project Data in Edit Panel
**File:** `myBrain-web/src/contexts/ProjectPanelContext.jsx`
**Fix:** Refetch project on slide panel open

---

### 🟠 #5: Missing Archive Confirmation Dialog
**File:** `myBrain-web/src/features/projects/pages/ProjectDashboard.jsx`
**Fix:** Add confirmation for archive status (consistent with delete)

---

### 🟠 #6: Long Descriptions Break Mobile Layout
**File:** `myBrain-web/src/features/projects/components/ProjectCard.jsx` (line 136)
**Fix:** Change to `line-clamp-1` on mobile, `line-clamp-3` on desktop

---

### 🟠 #7: No Empty State for Filtered Results
**File:** `myBrain-web/src/features/projects/components/ProjectsList.jsx`
**Fix:** Add EmptyState component when filteredProjects.length === 0

---

### 🟠 #8: Progress Shows 0% During Loading
**File:** `myBrain-web/src/features/projects/components/ProjectProgress.jsx`
**Fix:** Show skeleton loader during task loading instead of 0%

---

## LOW ISSUES (Nice to Have)

- #9: Missing keyboard shortcuts (Cmd+N for new, Delete for remove)
- #10: No mobile active/tap states on cards
- #11: No batch delete/archive for multiple projects
- #12: Progress animation jumpy on status change
- #13: No pagination for 100+ projects
- #14: Missing undo for project deletion
- #15: Pinned projects sidebar overflow
- #16: No search in ProjectPicker component

---

## FILES TO MODIFY (CRITICAL FIXES)

1. **myBrain-web/src/features/projects/hooks/useProjects.js**
   - Add task mutation cache invalidation

2. **myBrain-web/src/features/projects/components/ProjectProgress.jsx**
   - Add edge case handling for 0 tasks
   - Add skeleton during loading

3. **myBrain-api/src/routes/tasks.js**
   - Add project ownership validation
   - Verify projectId on updates

4. **myBrain-web/src/features/projects/pages/ProjectDashboard.jsx**
   - Add archive confirmation dialog

5. **myBrain-web/src/features/projects/components/ProjectCard.jsx**
   - Fix mobile text truncation

6. **myBrain-web/src/features/projects/components/ProjectsList.jsx**
   - Add empty state handling

---

## TESTING ARTIFACTS

**Screenshots Location:** `.claude/design/screenshots/qa/`
**Report File:** `.claude/reports/qa-projects-20260131.md`

---

## NEXT STEPS

1. **Phase 1 (Today):** Fix 3 critical issues (4-6 hours)
2. **Phase 2 (Tomorrow):** Fix 5 medium issues (3-4 hours)
3. **Phase 3 (Next Week):** Address low-priority items (2-3 hours)

**Total Estimated Time:** 9-13 hours

---

## SIGN-OFF

✅ QA Testing Complete
⚠️ Issues Documented
📋 Ready for Developer Review
🔧 Ready for Fixes

**Next Action:** Create tickets for each issue, prioritize critical fixes first.
