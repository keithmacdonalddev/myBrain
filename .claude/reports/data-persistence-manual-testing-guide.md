# Data Persistence Manual Testing Guide

**Purpose:** Step-by-step procedures for testing myBrain's data persistence
**Date:** 2026-01-31
**Environment:** Production (https://my-brain-gules.vercel.app)
**Test Account:** e2e-test-1769300679838@mybrain.test / ClaudeTest123
**Total Time:** ~45 minutes for all tests

---

## Pre-Test Setup

### What You'll Need
- 2 browser tabs/windows open to same URL
- Ability to open browser DevTools (F12)
- Test account already set up
- Clock or timer

### Test Environment Verification
1. Open https://my-brain-gules.vercel.app
2. Login with test account
3. Verify you see the dashboard
4. Open DevTools (F12) → Application tab
5. Check localStorage has these keys:
   - `mybrain_token`
   - `themeMode`
   - `accentColor`
   - (Others listed in technical analysis)

---

## Test Suite 1: Basic Data Persistence (10 min)

### Test 1.1: Task Creation & Refresh

**Purpose:** Verify tasks persist after page refresh
**Time:** 3 min

**Steps:**
```
1. Navigate to Tasks section
2. Create new task
   Title: "QA-Task-" + current timestamp (e.g., "QA-Task-20260131-1430")
   Description: "Auto-save test"
   Due Date: Today
3. Click "Create" or "Save"
4. Verify task appears in list
5. Note the task ID (if visible)
6. Press F5 (hard refresh)
7. Wait for page to load
8. Verify task still in list
9. Click task to view details
10. Verify all properties match what you entered
```

**Result:** PASS / FAIL
- **PASS:** Task visible with correct data after refresh
- **FAIL:** Task missing or data changed

---

### Test 1.2: Note Creation & Refresh

**Purpose:** Verify notes persist after refresh
**Time:** 3 min

**Steps:**
```
1. Navigate to Notes section
2. Create new note
   Title: "QA-Note-" + timestamp
   Content: "This is a persistence test"
3. Click "Save" (if auto-save, wait 2 sec)
4. Verify note appears in list
5. Press F5
6. Wait for load
7. Verify note still visible
8. Click note to view
9. Verify content intact
```

**Result:** PASS / FAIL

---

### Test 1.3: Project Creation & Refresh

**Purpose:** Verify projects persist
**Time:** 2 min

**Steps:**
```
1. Navigate to Projects
2. Create new project
   Name: "QA-Project-" + timestamp
   Description: "Persistence test"
3. Save
4. Verify in list
5. F5
6. Verify still there
7. Click to verify details
```

**Result:** PASS / FAIL

---

### Test 1.4: Settings Persistence

**Purpose:** Verify settings save
**Time:** 2 min

**Steps:**
```
1. Navigate to Settings
2. Change a setting (e.g., notification frequency)
3. Note the change
4. Save
5. F5
6. Check if setting is still changed
   → If not visible on first load, click Settings again
```

**Result:** PASS / FAIL

---

## Test Suite 2: Theme Persistence (8 min)

### Test 2.1: Dark Mode Refresh

**Purpose:** Theme survives page refresh
**Time:** 2 min

**Steps:**
```
1. Open Settings → Appearance
2. Verify current theme (light/dark/system)
3. Set to "Dark"
4. Verify page turns dark
5. F5
6. Verify still dark after refresh
```

**Result:** PASS / FAIL
- **PASS:** Dark mode persists after refresh
- **FAIL:** Reverts to light/system

---

### Test 2.2: Dark Mode Persistence (Logout/Login)

**Purpose:** Theme persists after logout/login
**Time:** 3 min

**Steps:**
```
1. Ensure dark mode is enabled
2. Verify page is dark
3. Click profile menu → Logout
4. Wait for redirect to login page
5. Login again with test account
6. Wait for dashboard to load
7. Open Settings → Appearance
8. Check theme setting
```

**Result:** PASS / FAIL
- **PASS:** Dark mode still selected
- **FAIL:** Reverted to light/system

---

### Test 2.3: Accent Color Persistence

**Purpose:** Accent color saved across sessions
**Time:** 3 min

**Steps:**
```
1. Open Settings → Appearance
2. Change Accent Color (e.g., Blue → Purple)
3. Verify color changes on page
4. F5
5. Verify accent color still applied
6. Logout and login
7. Verify accent still purple
```

**Result:** PASS / FAIL

---

## Test Suite 3: Authentication Persistence (10 min)

### Test 3.1: Logout/Login Data Persistence

**Purpose:** All data available after logout/login
**Time:** 5 min

**Steps:**
```
1. Create three items:
   - Task: "QA-Task-LogoutTest-" + timestamp
   - Note: "QA-Note-LogoutTest-" + timestamp
   - Project: "QA-Project-LogoutTest-" + timestamp
2. Verify all three visible in their sections
3. Click profile → Logout
4. On login page, login again with same account
5. Wait for dashboard to fully load
6. Go to Tasks → Check if task visible
7. Go to Notes → Check if note visible
8. Go to Projects → Check if project visible
```

**Result:** PASS / FAIL
- **PASS:** All items visible after logout/login
- **FAIL:** Any item missing

**Document:** Which items missing?

---

### Test 3.2: Token Validation on App Close/Reopen

**Purpose:** Session restored after browser close
**Time:** 5 min

**Steps:**
```
1. Create a task: "QA-SessionTest-" + timestamp
2. Verify task visible
3. Open DevTools → Application → Cookies
4. Find "HTTP Only" auth cookie
5. Close the ENTIRE BROWSER (not just tab)
6. Reopen browser
7. Navigate to https://my-brain-gules.vercel.app
8. Should automatically log in (check if redirected to dashboard)
9. Go to Tasks
10. Verify task still visible
```

**Note:** If not auto-logged in after browser close:
- This might be expected depending on session timeout
- Manually login
- Still verify data is there

**Result:** PASS / FAIL
- **PASS:** Auto-logged in or can login and see data
- **FAIL:** Task missing after browser close

---

## Test Suite 4: Form & Navigation State (8 min)

### Test 4.1: Filter Preservation

**Purpose:** Filters preserved when navigating away
**Time:** 4 min

**Steps:**
```
1. Go to Tasks
2. Apply a filter (e.g., Status = "Pending")
3. Verify filtered results show
4. Navigate to Notes
5. Navigate back to Tasks
6. Check if filter is still applied
```

**Result:** PASS / FAIL
- **PASS:** Filter still showing results
- **FAIL:** Filter cleared, showing all tasks

**Special Case:** If no filter feature, try:
- Sorting (e.g., by Due Date)
- Search (if available)

---

### Test 4.2: Scroll Position (Optional)

**Purpose:** Scroll position restored
**Time:** 2 min

**Steps:**
```
1. Go to Tasks
2. Scroll down to middle or bottom of list
3. Click one task to open detail view
4. Go back (browser back or close detail)
5. Check if scroll position restored
```

**Result:** PASS / FAIL (Low priority)
- **PASS:** Scroll position where you left it
- **FAIL:** Scrolled to top

---

### Test 4.3: Sidebar State (Optional)

**Purpose:** Sidebar collapsed/expanded persists
**Time:** 2 min

**Steps:**
```
1. If sidebar can collapse: Click collapse button
2. Sidebar should collapse
3. Navigate to another page
4. Check if sidebar still collapsed
5. F5
6. Check if sidebar still collapsed after refresh
```

**Result:** PASS / FAIL (Low priority if no collapse feature)

---

## Test Suite 5: Multi-Tab Behavior (8 min)

### Test 5.1: Create in Tab A, Check Tab B

**Purpose:** Changes sync between tabs
**Time:** 4 min

**Steps:**
```
1. Open myBrain in two browser tabs (Tab A and Tab B)
2. In Tab A: Go to Tasks
3. In Tab B: Go to Tasks (same page, same section)
4. In Tab A: Create new task
   Title: "QA-MultiTab-" + timestamp
   Click Save
5. Verify task appears in Tab A's list
6. In Tab B: Wait 2-3 seconds
7. Check if task appears in Tab B
   - WITHOUT refreshing
   - Should appear automatically if real-time sync works
```

**Result:** PASS / FAIL / MANUAL
- **PASS:** Task appears in Tab B within 3 seconds
- **FAIL:** Task doesn't appear without refresh
- **MANUAL:** Task appears after F5 in Tab B

---

### Test 5.2: Delete in Tab A, Check Tab B

**Purpose:** Deletions sync between tabs
**Time:** 2 min

**Steps:**
```
1. In Tab A: Delete the task created in 5.1
2. In Tab B: Wait 2-3 seconds
3. Check if task disappears from Tab B
```

**Result:** PASS / FAIL / MANUAL

---

### Test 5.3: Edit in Tab A, Check Tab B

**Purpose:** Edits sync between tabs
**Time:** 2 min

**Steps:**
```
1. Create a task in Tab A (if not already)
2. In Tab A: Edit the task (change title)
3. Save
4. In Tab B: Check if title updated without refresh
```

**Result:** PASS / FAIL / MANUAL

---

## Test Suite 6: Data Integrity (7 min)

### Test 6.1: Edit Persistence

**Purpose:** Edits survive refresh
**Time:** 3 min

**Steps:**
```
1. Go to a task/note/project
2. Edit the title (e.g., add "-EDITED" to end)
3. Save
4. Verify change appears immediately
5. F5
6. Verify change still there after refresh
```

**Result:** PASS / FAIL

---

### Test 6.2: Delete Verification

**Purpose:** Deletions actually persist
**Time:** 2 min

**Steps:**
```
1. Create a task: "QA-DeleteTest-" + timestamp
2. Verify it's in list
3. Delete it
4. Verify gone from list
5. F5
6. Verify still gone (check whole list)
```

**Result:** PASS / FAIL

---

### Test 6.3: Concurrent Edit Simulation

**Purpose:** See how conflicts are handled
**Time:** 2 min

**Steps:**
```
1. Have task open in Tab A and Tab B
2. In Tab A: Edit title to "A-Edit-" + timestamp
3. In Tab B: Edit title to "B-Edit-" + timestamp
4. In Tab A: Save
5. In Tab B: Save
6. Check final state:
   - Which edit won? (A or B)
   - Any conflict warning?
   - Any data lost?
```

**Result:** DOCUMENT
- Which version saved?
- Any warning shown?
- Both edits combined or one won?

---

## Summary Report Template

### Results Table

| Test | Result | Notes |
|------|--------|-------|
| 1.1: Task Refresh | PASS/FAIL | Task [ID] persisted |
| 1.2: Note Refresh | PASS/FAIL | |
| 1.3: Project Refresh | PASS/FAIL | |
| 1.4: Settings Refresh | PASS/FAIL | Which setting? |
| 2.1: Dark Mode Refresh | PASS/FAIL | |
| 2.2: Dark Mode Logout/Login | PASS/FAIL | |
| 2.3: Accent Color | PASS/FAIL | |
| 3.1: Logout/Login Data | PASS/FAIL | Which items missing? |
| 3.2: Browser Close/Reopen | PASS/FAIL | |
| 4.1: Filter Preservation | PASS/FAIL | |
| 4.2: Scroll Position | PASS/FAIL | (Optional) |
| 4.3: Sidebar State | PASS/FAIL | (Optional) |
| 5.1: Multi-Tab Create | PASS/FAIL/MANUAL | Time to sync? |
| 5.2: Multi-Tab Delete | PASS/FAIL/MANUAL | Time to sync? |
| 5.3: Multi-Tab Edit | PASS/FAIL/MANUAL | Time to sync? |
| 6.1: Edit Persistence | PASS/FAIL | |
| 6.2: Delete Verification | PASS/FAIL | |
| 6.3: Concurrent Edits | DOCUMENT | Which won? |

### Issues Found

```
1. [Issue Title]
   Category: [Data Loss / UI Issue / Performance]
   Steps: [How to reproduce]
   Expected: [What should happen]
   Actual: [What happened instead]
   Severity: [Critical / High / Medium / Low]
```

---

## DevTools Debugging

### Check localStorage After Each Test

```javascript
// Open browser console (F12) and paste:
Object.keys(localStorage).forEach(key => {
  console.log(`${key}: ${localStorage.getItem(key).substring(0, 100)}`);
});
```

**Look for:**
- `mybrain_token` - Should contain JWT
- `themeMode` - Should be 'dark', 'light', or 'system'
- Other settings keys

### Check Network Tab During CRUD

```
1. Open DevTools → Network tab
2. Create a task
3. Watch network requests
4. Should see:
   POST /api/tasks with 201 response
5. Verify response includes task data with ID
```

### Check Application State (Redux)

If app uses Redux DevTools extension:
```
1. Open DevTools
2. Find Redux tab
3. Expand auth state
4. Verify user object has expected properties
5. Verify isAuthenticated = true
```

---

## Common Issues & Solutions

### Issue: Login Loop After Logout
**Cause:** Token not cleared from localStorage
**Fix:** Check DevTools > Application > localStorage > Remove mybrain_token manually

### Issue: Old Data Still Showing
**Cause:** Cache not cleared on logout
**Fix:** F5 or clear browser cache

### Issue: Theme Resets on Refresh
**Cause:** localStorage key misspelled
**Fix:** Check localStorage keys match code (see technical analysis)

### Issue: Can't See Network Requests
**Solution:** Open DevTools before navigating, or check "Preserve log" checkbox

---

## Quick Reference: Expected Behaviors

| Scenario | Expected Result | Confidence |
|----------|-----------------|------------|
| Create → F5 → Task exists | ✅ PASS | HIGH |
| Create → Logout → Login → Task exists | ✅ PASS | HIGH |
| Dark mode → F5 → Dark still | ✅ PASS | HIGH |
| Tab A create → Tab B auto-sees | ⚠️ UNCLEAR | MEDIUM |
| Form draft auto-saves | ❓ UNKNOWN | LOW |
| Scroll position preserved | ❌ UNLIKELY | LOW |

---

## After Testing

1. **Document all FAIL results**
2. **Create bug reports for each issue**
3. **Attach screenshots to bug reports**
4. **Note exact steps to reproduce**
5. **Include expected vs actual behavior**
6. **Save this report for reference**

---

**Testing Guide Created:** 2026-01-31
**Estimated Total Time:** 45 minutes
**Difficulty Level:** Easy (no coding required)
**Next Steps:** Execute tests and document findings
