# Dashboard V2 - Action Plan

**Created:** 2026-01-31
**Priority:** Complete before production deployment

---

## Your Role: Manual Testing

Browser automation had issues, so I need you to verify the dashboard works by actually using it.

### Time Estimate: 15-20 minutes

---

## Step-by-Step Testing

### 1. Open the Dashboard (1 min)

1. Make sure both servers are running:
   ```bash
   # In Git Bash - Frontend
   cd /c/Users/NewAdmin/Desktop/PROJECTS/myBrain
   npm run dev

   # In another terminal - Backend
   cd server
   npm run dev
   ```

2. Open browser: http://localhost:5173
3. Open Console (F12) - leave it open to watch for errors

**Check:**
- [ ] Dashboard loads
- [ ] All widgets visible
- [ ] No red errors in console

---

### 2. Test Task Creation (2 min)

1. Click the "Quick Capture" button (bottom right area)
2. Type: "Test Task from Manual Testing"
3. Click "Capture"

**Check:**
- [ ] Panel closes
- [ ] Task appears in Tasks widget
- [ ] No errors in console

---

### 3. Test Task Completion (1 min)

1. Find the task you just created
2. Click the checkbox next to it

**Check:**
- [ ] Task marks as complete
- [ ] Task updates/disappears from list
- [ ] No errors in console

---

### 4. Test Navigation (2 min)

1. Click "Tasks" in sidebar
2. Verify Tasks page loads
3. Click "Dashboard" in sidebar
4. Verify you're back on dashboard
5. Try "Notes", "Calendar", "Projects"

**Check:**
- [ ] Each page loads
- [ ] No errors in console
- [ ] No broken pages

---

### 5. Test Sidebar Collapse (1 min)

1. Click the collapse button (arrow icon in sidebar)
2. Sidebar should collapse
3. Refresh the page (Ctrl+R)

**Check:**
- [ ] Sidebar collapses
- [ ] Sidebar state persists after refresh
- [ ] No layout breaks

---

### 6. Test Theme Toggle (1 min)

1. Find the theme toggle button (sun/moon icon in header)
2. Click it
3. Theme should switch (light ↔ dark)
4. Click it again

**Check:**
- [ ] Theme switches smoothly
- [ ] No flash of wrong colors
- [ ] All text remains readable
- [ ] No errors in console

---

### 7. Adversarial Testing (3 min)

**Test 1: Empty Input**
1. Click Quick Capture
2. Try to click "Capture" without typing anything

**Check:** [ ] Button is disabled (can't click)

**Test 2: Rapid Clicking**
1. Click any button 10 times rapidly

**Check:** [ ] UI doesn't break or create duplicates

**Test 3: Long Text**
1. Create a task with a very long title (copy/paste 500 characters)

**Check:** [ ] Text doesn't overflow the container

**Test 4: Empty State**
1. Complete or delete all tasks
2. Look at Tasks widget

**Check:** [ ] Shows helpful empty state message

---

### 8. Keyboard Shortcuts (2 min)

1. Press the 'R' key (not in a text field)

**Check:** [ ] Radar view opens

2. Press Escape or click outside

**Check:** [ ] Radar closes

3. Check bottom bar for other shortcuts
4. Try 'T' for task, 'N' for note

**Check:** [ ] Shortcuts work

---

### 9. Final Console Check (1 min)

1. Look at browser console (F12)
2. Note any red errors
3. Note any yellow warnings

**Check:**
- [ ] No new red errors during testing
- [ ] Any warnings noted below

---

## What to Report Back

### If Everything Works ✅
Just say: "All tests passed, no issues found"

### If Something Breaks ❌
Tell me:
1. **What you did** (which step)
2. **What happened** (describe the bug)
3. **Console errors** (copy any red text from F12 console)
4. **Screenshot** (if visual bug)

---

## Known Non-Critical Issues

These are expected and won't block deployment:

1. **2x 401 errors on page load** - Auth race condition, harmless
2. **Redux selector warning** - Performance warning, not breaking
3. **React Router future flag warnings** - Migration prep, not urgent

---

## After Testing

### If All Tests Pass
1. I'll fix the console warnings (quick fixes)
2. We can deploy Dashboard V2 to production
3. Celebrate! 🎉

### If Issues Found
1. I'll fix the issues
2. You test again (should be quick)
3. Then we deploy

---

## Questions?

If anything is unclear or breaks in an unexpected way, just describe what happened and I'll help troubleshoot.

**Remember:** Open the console (F12) and watch for red errors while you test. That's the best way to catch issues early.

---

**Estimated Total Time:** 15-20 minutes
**Goal:** Verify Dashboard V2 works as intended before production
