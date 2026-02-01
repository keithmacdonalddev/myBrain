# Sidebar Interactions - Test Execution Plan

**Test Protocol:** Manual Browser Testing with Agent-Browser
**Estimated Duration:** 2-3 hours
**Test Environment:**
- Local: http://localhost:5173
- Production: https://my-brain-gules.vercel.app
**Test Account:** claude-test-admin@mybrain.test / ClaudeTest123

---

## Pre-Test Checklist

- [ ] Frontend running on localhost:5173
- [ ] Production URL accessible
- [ ] Test account logged in
- [ ] Agent-browser installed and ready
- [ ] Screenshot directory created: `.claude/design/screenshots/qa/sidebar/`
- [ ] Chrome DevTools open (F12) for console monitoring

---

## TEST SUITE 1: QUICK ACTIONS TESTING

### Test 1.1: New Task Button
**Expected:** Modal opens for task creation
**Steps:**
1. Open sidebar (should be visible on desktop)
2. Locate "QUICK ACTIONS" section
3. Click "Task" button
4. Screenshot: `sidebar-qa-quick-actions-task-click.png`
5. Verify: Modal/panel appears with task creation form
6. Close panel (Esc or X button)

**Pass Criteria:**
- [ ] Modal opens immediately (< 500ms)
- [ ] Task creation form displays
- [ ] No console errors
- [ ] Panel closes on Esc key
- [ ] Panel closes on X button click

**Keyboard Test:**
1. Tab to "Task" button
2. Press Enter
3. Verify: Modal opens same as mouse click

---

### Test 1.2: New Note Button
**Expected:** Modal opens for note creation
**Steps:**
1. Click "Note" button in Quick Actions
2. Screenshot: `sidebar-qa-quick-actions-note-click.png`
3. Verify: Note creation form displays
4. Close panel

**Pass Criteria:**
- [ ] Modal opens immediately
- [ ] Note form displays
- [ ] Different from task form
- [ ] No console errors

---

### Test 1.3: New Event Button
**Expected:** Navigates to calendar/new event page
**Steps:**
1. Click "Event" button in Quick Actions
2. Screenshot: `sidebar-qa-quick-actions-event-click.png`
3. Wait for page load (max 2s)
4. Verify: URL changed to /app/calendar/new

**Pass Criteria:**
- [ ] Navigation occurs immediately
- [ ] Calendar page loads
- [ ] URL is /app/calendar/new
- [ ] No console errors

---

### Test 1.4: New File Button
**Expected:** Navigates to files page
**Steps:**
1. Click "File" button in Quick Actions
2. Screenshot: `sidebar-qa-quick-actions-file-click.png`
3. Wait for page load
4. Verify: URL changed to /app/files

**Pass Criteria:**
- [ ] Navigation occurs
- [ ] Files page loads
- [ ] URL is /app/files

---

### Test 1.5: Quick Capture Button
**Expected:** Opens quick capture panel
**Steps:**
1. Click "Quick Capture" button (gradient, full width)
2. Screenshot: `sidebar-qa-quick-actions-capture-click.png`
3. Verify: Capture panel opens
4. Close panel

**Pass Criteria:**
- [ ] Capture panel opens
- [ ] Unique from other panels
- [ ] Can close with Esc or X

**Keyboard Shortcut Test:**
1. Press Ctrl+Shift+Space (or Cmd+Shift+Space on Mac)
2. Verify: Quick capture opens
3. Note: May not be implemented yet

---

### Test 1.6: Rapid Click Test
**Expected:** Prevent double submission
**Steps:**
1. Click "Task" button 5 times rapidly
2. Screenshot: `sidebar-qa-rapid-clicks.png`
3. Count: How many modals open?

**Pass Criteria:**
- [ ] Only 1 modal opens
- [ ] Second clicks ignored or queued
- [ ] No error messages

**Expected Issue:** May open 2+ modals (needs debouncing)

---

## TEST SUITE 2: NAVIGATION ITEMS TESTING

### Test 2.1: Dashboard Navigation
**Steps:**
1. Click "Dashboard" nav item
2. Screenshot: `sidebar-qa-nav-dashboard.png`
3. Verify: Active state highlighted
4. Check: URL is /app

**Pass Criteria:**
- [ ] Active state visible (blue background/text)
- [ ] URL changed to /app
- [ ] Page loads
- [ ] No console errors

---

### Test 2.2: Today Navigation
**Steps:**
1. Click "Today" nav item
2. Screenshot: `sidebar-qa-nav-today.png`
3. Verify: Active state, correct page, badge visible

**Pass Criteria:**
- [ ] Active state highlighted
- [ ] URL is /app/today
- [ ] Badge shows count (if > 0)
- [ ] Page content displays

---

### Test 2.3: Tasks Navigation
**Steps:**
1. Click "Tasks" nav item
2. Screenshot: `sidebar-qa-nav-tasks.png`
3. Verify: Active state, badge count

**Pass Criteria:**
- [ ] Active state highlighted
- [ ] URL is /app/tasks
- [ ] Badge shows pending task count
- [ ] Task list displays

---

### Test 2.4: Notes Navigation
**Steps:**
1. Click "Notes" nav item
2. Screenshot: `sidebar-qa-nav-notes.png`
3. Verify: Navigation works

**Pass Criteria:**
- [ ] Active state highlighted
- [ ] URL is /app/notes
- [ ] Notes page displays

---

### Test 2.5: Calendar Navigation (if feature enabled)
**Steps:**
1. Check if "Calendar" nav item visible
2. If visible: Click it
3. Screenshot: `sidebar-qa-nav-calendar.png`

**Pass Criteria:**
- [ ] Shows if calendarEnabled flag true
- [ ] Navigation works
- [ ] Calendar page displays

---

### Test 2.6: Projects Navigation (if feature enabled)
**Steps:**
1. Check if "Projects" nav item visible
2. If visible: Click it
3. Screenshot: `sidebar-qa-nav-projects.png`

**Pass Criteria:**
- [ ] Shows if projectsEnabled flag true
- [ ] Navigation works

---

### Test 2.7: Inbox Navigation
**Steps:**
1. Click "Inbox" nav item
2. Screenshot: `sidebar-qa-nav-inbox.png`
3. Verify: Badge count visible

**Pass Criteria:**
- [ ] Active state highlighted
- [ ] URL is /app/inbox
- [ ] Badge shows unread count
- [ ] Inbox page displays

---

### Test 2.8: Files Navigation (if feature enabled)
**Steps:**
1. Check if "Files" nav item visible
2. If visible: Click it
3. Screenshot: `sidebar-qa-nav-files.png`

**Pass Criteria:**
- [ ] Shows if filesEnabled flag true
- [ ] Navigation works

---

### Test 2.9: Tab Navigation
**Steps:**
1. Click on sidebar to focus
2. Press Tab repeatedly
3. Count: How many items get focus?
4. Verify: Focus ring visible on each item
5. Press Enter on several items
6. Screenshot: `sidebar-qa-keyboard-focus.png`

**Pass Criteria:**
- [ ] All nav items focusable
- [ ] Focus ring visible
- [ ] Enter activates nav items
- [ ] Logical tab order

---

## TEST SUITE 3: BADGE TESTING

### Test 3.1: Badge Display
**Steps:**
1. Go to Dashboard (neutral state)
2. Screenshot all nav items: `sidebar-qa-badges-display.png`
3. Note: Which items show badges?

**Expected Badges:**
- Inbox: Badge if unread items
- Tasks: Badge with count
- Today: Badge with count

**Pass Criteria:**
- [ ] Badges visible where expected
- [ ] Badge shows correct count
- [ ] No badge if count = 0
- [ ] Badge text color readable
- [ ] Badge position consistent

---

### Test 3.2: Badge Updates - Tasks
**Steps:**
1. In sidebar, note Tasks badge count (e.g., "12")
2. Click "Tasks" nav item
3. Create a new task (should increment count by 1)
4. Return to Dashboard/another page
5. Check Tasks badge: Should be "13"
6. Screenshot: `sidebar-qa-badges-update-tasks.png`

**Pass Criteria:**
- [ ] Badge incremented after task creation
- [ ] Update immediate (< 1s)
- [ ] No page refresh required

---

### Test 3.3: Badge Updates - Inbox
**Steps:**
1. Note Inbox badge count
2. Create a quick capture/note
3. Note should go to inbox
4. Return to sidebar
5. Check Inbox badge: Should increase
6. Screenshot: `sidebar-qa-badges-update-inbox.png`

**Pass Criteria:**
- [ ] Badge incremented
- [ ] Update quick (< 1s)

---

### Test 3.4: Badge "99+" Overflow
**Steps:**
1. If any badge shows "99+" (unlikely with test account)
2. Screenshot: `sidebar-qa-badges-overflow.png`

**Pass Criteria:**
- [ ] Shows "99+" for values > 99
- [ ] Doesn't show "100", "101", etc.

---

## TEST SUITE 4: ACTIVITY RINGS TESTING

### Test 4.1: Activity Rings Display
**Steps:**
1. On Desktop, Sidebar NOT collapsed
2. Scroll sidebar down
3. Look for "TODAY'S PROGRESS" section
4. Screenshot: `sidebar-qa-activity-rings.png`
5. Verify: Three rings visible (Fitness, Health, Focus)

**Pass Criteria:**
- [ ] Three rings visible
- [ ] Labels visible ("Fitness", "Health", "Focus")
- [ ] Percentages displayed (e.g., "45%")
- [ ] Below navigation, above streak banner

**Mobile Check:**
1. Set viewport to mobile (375px)
2. Verify: Activity rings NOT visible in mobile sidebar

---

### Test 4.2: Activity Rings Values
**Steps:**
1. Screenshot activity rings: `sidebar-qa-rings-values.png`
2. Manually verify values seem reasonable:
   - Fitness: Based on task completion (0-100%)
   - Health: Based on events completed today (0-100%)
   - Focus: Based on urgent items (higher = fewer urgent)

**Pass Criteria:**
- [ ] All values between 0-100%
- [ ] Values look reasonable for current day
- [ ] No negative values
- [ ] No error display

---

## TEST SUITE 5: STREAK BANNER TESTING

### Test 5.1: Streak Banner Display
**Steps:**
1. On Desktop, Sidebar NOT collapsed
2. Scroll to bottom of sidebar
3. Look for streak banner (before version text)
4. Screenshot: `sidebar-qa-streak-banner.png`

**Expected Behavior:**
- If streak > 0: Banner visible
- If streak = 0: Banner NOT visible

**Pass Criteria:**
- [ ] Shows if streak > 0
- [ ] Hidden if streak = 0
- [ ] Positioned after activity rings
- [ ] Not visible on mobile

---

### Test 5.2: Streak Value
**Steps:**
1. Check streak count displayed
2. Note: Current implementation is placeholder (shows 5 if active, 0 if inactive)
3. Screenshot: `sidebar-qa-streak-value.png`

**Pass Criteria:**
- [ ] Shows 5 if user has activity
- [ ] Shows 0 if no activity (banner hidden)

---

## TEST SUITE 6: SIDEBAR COLLAPSE TESTING

### Test 6.1: Collapse Button Appears
**Steps:**
1. Desktop viewport (1280x720)
2. Hover over sidebar edge (right side)
3. Screenshot: `sidebar-qa-collapse-button.png`
4. Verify: Collapse/expand button appears

**Pass Criteria:**
- [ ] Button appears on sidebar hover
- [ ] Button positioned on right edge
- [ ] Button centered vertically
- [ ] Desktop only (not on mobile)

---

### Test 6.2: Collapse Animation
**Steps:**
1. Click collapse button
2. Screenshot during animation: `sidebar-qa-collapse-animation.png`
3. Wait for animation complete (300ms)
4. Screenshot collapsed state: `sidebar-qa-collapsed-state.png`

**Pass Criteria:**
- [ ] Smooth width animation
- [ ] Icons visible and centered
- [ ] Labels fade out
- [ ] Final width is narrow (~ 64px)
- [ ] No glitches during animation

---

### Test 6.3: Collapsed State Interactions
**Steps:**
1. In collapsed state:
2. Hover over nav icon
3. Screenshot: `sidebar-qa-collapsed-tooltip.png`
4. Verify: Tooltip appears showing label
5. Click nav item
6. Verify: Navigation works

**Pass Criteria:**
- [ ] Tooltip appears on icon hover
- [ ] Tooltip shows correct label
- [ ] Navigation works when collapsed
- [ ] Active state still visible (highlight)

---

### Test 6.4: Badge in Collapsed State
**Steps:**
1. In collapsed state
2. Screenshot nav items with badges: `sidebar-qa-collapsed-badges.png`
3. Verify: Badges repositioned

**Pass Criteria:**
- [ ] Badges visible in collapsed state
- [ ] Positioned correctly on icon
- [ ] Count still visible

---

### Test 6.5: Expand Animation
**Steps:**
1. Click expand button (or edge toggle)
2. Screenshot during expansion: `sidebar-qa-expand-animation.png`
3. Wait for animation complete
4. Screenshot expanded state: `sidebar-qa-expanded-state.png`

**Pass Criteria:**
- [ ] Smooth width expansion (300ms)
- [ ] Labels fade in
- [ ] Icons remain centered
- [ ] Final width is normal (~ 256px)

---

### Test 6.6: State Persistence
**Steps:**
1. Collapse sidebar
2. Refresh page (Ctrl+R)
3. Screenshot: `sidebar-qa-collapse-persistence.png`
4. Verify: Sidebar still collapsed

**Pass Criteria:**
- [ ] State persisted in localStorage
- [ ] Collapsed state restored after refresh
- [ ] Works across navigation

---

## TEST SUITE 7: MOBILE SIDEBAR TESTING

### Test 7.1: Mobile Sidebar Open
**Steps:**
1. Set viewport to mobile (375x667)
2. Verify: Hamburger menu button visible (top-left)
3. Screenshot: `sidebar-qa-mobile-hamburger.png`
4. Click hamburger menu
5. Screenshot: `sidebar-qa-mobile-sidebar-open.png`
6. Verify: Sidebar slides in from left

**Pass Criteria:**
- [ ] Hamburger menu visible
- [ ] Sidebar slides in smoothly
- [ ] Overlay backdrop visible
- [ ] Sidebar takes up most screen width

---

### Test 7.2: Mobile Sidebar Close
**Steps:**
1. Mobile sidebar open
2. Click X button (top-right of sidebar)
3. Screenshot during close: `sidebar-qa-mobile-close.png`
4. Verify: Sidebar slides out

**Pass Criteria:**
- [ ] Close button visible
- [ ] Smooth slide-out animation
- [ ] Backdrop disappears

**Alternative Close:**
1. Click on backdrop (gray area)
2. Verify: Sidebar closes same way

---

### Test 7.3: Mobile Navigation
**Steps:**
1. Open mobile sidebar
2. Click "Today" nav item
3. Wait for navigation
4. Screenshot: `sidebar-qa-mobile-nav.png`
5. Verify: Sidebar closes automatically

**Pass Criteria:**
- [ ] Navigation occurs
- [ ] Sidebar closes after navigation
- [ ] Page loads correctly

---

### Test 7.4: Mobile Badges
**Steps:**
1. Open mobile sidebar
2. Screenshot: `sidebar-qa-mobile-badges.png`
3. Verify: Badge counts visible

**Pass Criteria:**
- [ ] Badges visible on mobile nav items
- [ ] Badge counts match desktop
- [ ] Readable size

---

### Test 7.5: Mobile Categories
**Steps:**
1. Open mobile sidebar
2. Look for "Categories" section
3. Screenshot: `sidebar-qa-mobile-categories.png`
4. Click to expand if collapsed
5. Verify: Life areas display

**Pass Criteria:**
- [ ] Categories section visible
- [ ] Expandable/collapsible
- [ ] Shows life areas when expanded
- [ ] Touch targets 48px+ minimum

---

### Test 7.6: Mobile Touch Targets
**Steps:**
1. Mobile sidebar open
2. Inspect each button/link size
3. Verify: Minimum 44-48px height
4. Screenshot: `sidebar-qa-mobile-touch-targets.png`

**Pass Criteria:**
- [ ] All touch targets >= 44px height
- [ ] Adequate spacing between targets
- [ ] Easy to tap without misses

---

## TEST SUITE 8: KEYBOARD ACCESSIBILITY

### Test 8.1: Tab Navigation
**Steps:**
1. Desktop sidebar
2. Click on sidebar to focus
3. Press Tab key repeatedly
4. Count: Items focused in order
5. Screenshot: `sidebar-qa-keyboard-tab.png`

**Expected Order:**
1. Dashboard
2. Today
3. Tasks
4. Notes
5. Calendar (if enabled)
6. Projects (if enabled)
7. Inbox
8. Files (if enabled)
9. [Other sections and collapse button]

**Pass Criteria:**
- [ ] All items focusable
- [ ] Tab order logical (top-to-bottom)
- [ ] Focus ring visible on each item
- [ ] Can Tab back (Shift+Tab)

---

### Test 8.2: Enter Key Activation
**Steps:**
1. Tab to "Dashboard" nav item
2. Focus ring visible
3. Press Enter
4. Verify: Navigation occurs
5. Screenshot: `sidebar-qa-keyboard-enter.png`

**Pass Criteria:**
- [ ] Enter activates nav items
- [ ] Navigation works via keyboard
- [ ] Works on all nav items

---

### Test 8.3: Collapse Button Keyboard
**Steps:**
1. Tab to collapse/expand button
2. Press Enter
3. Screenshot: `sidebar-qa-keyboard-collapse.png`
4. Verify: Sidebar toggles

**Pass Criteria:**
- [ ] Button focusable
- [ ] Enter activates toggle
- [ ] Collapse/expand works

---

### Test 8.4: Mobile - Escape Key
**Steps:**
1. Mobile viewport
2. Open sidebar
3. Press Escape key
4. Screenshot: `sidebar-qa-keyboard-mobile-escape.png`
5. Verify: Sidebar closes

**Pass Criteria:**
- [ ] Escape closes mobile sidebar
- [ ] Works in addition to close button
- [ ] Smooth close animation

**Expected Issue:** May not be implemented yet

---

## TEST SUITE 9: HOVER STATES

### Test 9.1: Nav Item Hover
**Steps:**
1. Desktop sidebar expanded
2. Hover over "Dashboard" nav item
3. Screenshot: `sidebar-qa-hover-navitem.png`
4. Verify: Background color changes slightly

**Pass Criteria:**
- [ ] Background color changes on hover
- [ ] Text remains readable
- [ ] Smooth transition (not instant)
- [ ] Visual feedback clear

---

### Test 9.2: Collapse Button Hover
**Steps:**
1. Hover over edge collapse button
2. Screenshot: `sidebar-qa-hover-collapse-button.png`
3. Verify: Button styling changes

**Pass Criteria:**
- [ ] Background color darkens
- [ ] Shadow effect appears
- [ ] Smooth transition

---

### Test 9.3: Section Header Hover
**Steps:**
1. In expanded sidebar
2. Look for collapsible section (Categories, Beta)
3. Hover over section header
4. Screenshot: `sidebar-qa-hover-section-header.png`

**Pass Criteria:**
- [ ] Text color changes on hover
- [ ] Indicates interactivity
- [ ] Cursor is pointer

---

## TEST SUITE 10: EDGE CASES

### Test 10.1: Empty States
**Steps:**
1. Go to Dashboard
2. Screenshot sidebar: `sidebar-qa-empty-state.png`
3. Verify: Badges hidden when count = 0

**Pass Criteria:**
- [ ] No badge on items with 0 count
- [ ] Clean appearance when empty
- [ ] Nav items still visible

---

### Test 10.2: Rapid Navigation Clicks
**Steps:**
1. Click "Tasks" nav item
2. Immediately click "Notes" nav item
3. Immediately click "Today" nav item
4. Screenshot: `sidebar-qa-rapid-nav.png`
5. Final page should be "Today"

**Pass Criteria:**
- [ ] Navigation queued correctly
- [ ] Final page is correct
- [ ] No errors in console
- [ ] No duplicate navigations

---

### Test 10.3: Rapid Collapse Clicks
**Steps:**
1. Click collapse button 3 times rapidly
2. Wait for animation to complete
3. Screenshot: `sidebar-qa-rapid-collapse.png`
4. Verify: Final state is correct (should be expanded after 3 clicks)

**Pass Criteria:**
- [ ] Final state is correct
- [ ] Animation smooth even with rapid clicks
- [ ] No animation glitches

---

### Test 10.4: Feature Flag Visibility
**Steps:**
1. Check which nav items are visible
2. Expected visible: Dashboard, Today, Tasks, Notes, Inbox
3. Expected conditional: Calendar, Projects, Files (based on feature flags)
4. Screenshot: `sidebar-qa-feature-flags.png`

**Pass Criteria:**
- [ ] Base items always visible
- [ ] Optional items show/hide based on flags
- [ ] Admin-only items show only for admin

---

## TEST SUITE 11: PERFORMANCE

### Test 11.1: Collapse Animation Performance
**Steps:**
1. Open Chrome DevTools (F12)
2. Go to Performance tab
3. Click collapse button
4. Observe: Animation should be smooth (60fps)
5. Screenshot: `sidebar-qa-performance-collapse.png`

**Pass Criteria:**
- [ ] Animation smooth (60+ fps)
- [ ] No stuttering or jank
- [ ] Consistent frame rate

---

### Test 11.2: Badge Update Performance
**Steps:**
1. Open DevTools
2. Create a new task
3. Return to sidebar
4. Observe: Badge updates immediately
5. Screenshot: `sidebar-qa-performance-badges.png`

**Pass Criteria:**
- [ ] Badge updates < 500ms
- [ ] No lag or delay
- [ ] Smooth visual update

---

## TEST SUITE 12: ACCESSIBILITY

### Test 12.1: Screen Reader Test (Optional)
**Equipment Needed:** Screen reader (NVDA on Windows, VoiceOver on Mac)

**Steps:**
1. Enable screen reader
2. Navigate sidebar with arrow keys
3. Listen: What does screen reader announce?
4. Screenshot: `sidebar-qa-screen-reader.png`

**Expected Announcements:**
- "Navigation" for sidebar
- Item names for each nav item
- "x notifications" for badges
- "Expand"/"Collapse" for toggles

**Pass Criteria:**
- [ ] All items announced correctly
- [ ] No duplicate or confusing announcements

---

### Test 12.2: Contrast Verification
**Steps:**
1. Open accessibility checker (Chrome DevTools, Axe, WAVE)
2. Run audit on sidebar
3. Screenshot: `sidebar-qa-contrast.png`
4. Check: All text has sufficient contrast

**Pass Criteria:**
- [ ] All text >= 4.5:1 contrast ratio
- [ ] Active state clearly visible
- [ ] Dark mode also compliant

---

## Final Verification Checklist

### Pre-Completion
- [ ] All tests executed
- [ ] All issues documented
- [ ] Screenshots captured (25+ total)
- [ ] Console monitored for errors
- [ ] No broken features identified

### Post-Completion
- [ ] Test results compiled
- [ ] Issues categorized (Critical/High/Medium/Low)
- [ ] Summary report generated
- [ ] Next steps documented
- [ ] Recommendations provided

---

## Issue Logging Template

For each issue found, use this template:

```
## Issue: [Brief Title]

**Severity:** Critical | High | Medium | Low
**Component:** [Sidebar/NavItem/etc]
**Steps to Reproduce:**
1.
2.
3.

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Screenshot:**
[Filename.png]

**Environment:**
- Desktop/Mobile
- Browser: Chrome/Firefox/Safari
- URL: localhost:5173 or production

**Recommendation:**
[How to fix or improve]
```

---

## Time Breakdown

- Quick Actions Testing: 15 min
- Navigation Items: 15 min
- Badges: 15 min
- Activity Rings: 10 min
- Streak Banner: 10 min
- Collapse: 20 min
- Mobile: 20 min
- Keyboard: 15 min
- Hover States: 10 min
- Edge Cases: 15 min
- Performance: 15 min
- Accessibility: 15 min
- Documentation: 15 min

**Total: ~180 minutes (3 hours)**

---

## Success Criteria

**OVERALL PASS** if:
- ✅ All navigation items work correctly
- ✅ All badges update in real-time
- ✅ Keyboard navigation functional
- ✅ Mobile sidebar works smoothly
- ✅ Animations smooth and performant
- ✅ No console errors
- ✅ Accessibility features working
- ✅ All touch targets >= 44px

**ISSUES ACCEPTABLE** if:
- No critical bugs
- High-priority issues documented with workarounds
- Recommendations documented for future improvement

---

**Generated:** 2026-01-31
**Next Run:** After code changes or feature additions to sidebar
