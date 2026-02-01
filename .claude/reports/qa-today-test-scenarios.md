# Today Page - Comprehensive Test Scenarios

**Date:** January 31, 2026
**Component:** TodayPage.jsx
**Total Test Scenarios:** 47

---

## Test Environment Setup

**URL:** https://my-brain-gules.vercel.app/today
**Test Account:** e2e-test-1769300679838@mybrain.test
**Password:** ClaudeTest123
**Browser:** Chromium (via agent-browser)
**Breakpoints to Test:** 375px (mobile), 768px (tablet), 1280px (desktop)

---

## Test Scenario Categories

### Category 1: Visual Layout & Rendering (8 scenarios)

#### 1.1 Mobile Layout (375px width)
**Precondition:** Navigate to /today on mobile viewport
**Steps:**
1. Verify MobilePageHeader displays with "Today" title
2. Verify date string shows below header (e.g., "Friday, January 31")
3. Verify sections stack vertically
4. Verify touch targets are at least 44x44px
5. Verify no horizontal scrolling needed
**Expected:** All content readable, proper spacing, no overflow

**Pass Criteria:**
- ✅ MobilePageHeader visible
- ✅ Date string present
- ✅ Sections in correct order
- ✅ All text readable without horizontal scroll

---

#### 1.2 Tablet Layout (768px width)
**Precondition:** Navigate to /today on tablet viewport
**Steps:**
1. Set viewport to 768px width
2. Verify MobilePageHeader still shows (below sm: breakpoint)
3. Verify max-width constraint applied (max-w-2xl)
4. Verify layout remains readable
**Expected:** Proper spacing for tablet size

**Pass Criteria:**
- ✅ Content centered with proper max-width
- ✅ Readable without overflow
- ✅ Spacing appropriate

---

#### 1.3 Desktop Layout (1280px+ width)
**Precondition:** Navigate to /today on desktop
**Steps:**
1. Set viewport to 1280px or wider
2. Verify MobilePageHeader is hidden (sm:hidden)
3. Verify Desktop header appears with:
   - Calendar icon in colored pill
   - "Today" heading (text-2xl)
   - Date string
4. Verify centered layout with max-width
**Expected:** Full desktop experience

**Pass Criteria:**
- ✅ MobilePageHeader hidden
- ✅ Desktop header visible with icon
- ✅ Proper typography sizing
- ✅ Content centered

---

#### 1.4 Dark Mode Colors
**Precondition:** Test account with dark mode enabled
**Steps:**
1. Open Today page with dark mode active
2. Verify text colors are readable:
   - Primary text: Bright on dark background
   - Tertiary text: Dimmed but readable
   - Section headers: Visible secondary color
3. Verify section backgrounds:
   - Surface background: Dark but distinct
   - Elevated hover: Slightly lighter
   - Overdue background: Dark red tint
**Expected:** All colors accessible, good contrast

**Pass Criteria:**
- ✅ All text meets contrast ratio (4.5:1)
- ✅ Backgrounds distinct from text
- ✅ No eye strain colors

---

#### 1.5 Light Mode Colors
**Precondition:** Test account with light mode enabled
**Steps:**
1. Open Today page with light mode active
2. Repeat color verification for light theme
3. Verify icon colors work on light backgrounds
**Expected:** Proper appearance in light mode

**Pass Criteria:**
- ✅ All contrast ratios met
- ✅ Icons visible
- ✅ Consistent theming

---

#### 1.6 Empty State Display (All Clear)
**Precondition:** Test account with no overdue, no due today, no events, no inbox
**Steps:**
1. Navigate to Today page
2. Verify all sections shown but empty:
   - "No events scheduled for today"
   - "No tasks due today. Nice work!"
   - "Inbox zero! You're all caught up."
3. Verify "All Clear!" state appears:
   - Green checkmark circle
   - "All Clear!" heading
   - "Nothing urgent today. Time to work on what matters." message
**Expected:** Clear, positive messaging for empty state

**Pass Criteria:**
- ✅ Empty messages show correctly
- ✅ "All Clear!" section displays
- ✅ Messaging is encouraging

---

#### 1.7 Loading State
**Precondition:** Component loading data
**Steps:**
1. Start page load
2. Watch for skeleton loaders
3. Verify skeletons appear while loading
4. Verify data replaces skeletons once loaded
**Expected:** Smooth loading experience

**Pass Criteria:**
- ✅ Skeletons visible during load
- ✅ Content appears when ready
- ✅ No content flash/jank

---

#### 1.8 Overflow Behavior
**Precondition:** Page has many items
**Steps:**
1. Create scenario with 20+ tasks and events
2. Navigate to Today page
3. Verify scrolling works smoothly
4. Verify items aren't cut off
5. Verify sections remain readable when scrolled
**Expected:** Proper overflow handling

**Pass Criteria:**
- ✅ Vertical scroll works
- ✅ All items visible when scrolled
- ✅ Performance acceptable

---

### Category 2: Schedule/Events Section (6 scenarios)

#### 2.1 Single Event Display
**Precondition:** One event scheduled for today
**Steps:**
1. Create/add an event for today (e.g., "Team Meeting", 10:00-11:00)
2. Navigate to Today page
3. Verify "Schedule (1)" header shows
4. Verify event row contains:
   - Color bar on left (matching event color)
   - Event title
   - Time: "10:00 AM - 11:00 AM"
5. Hover over event - verify hover background color
**Expected:** Event displays with correct info

**Pass Criteria:**
- ✅ Count correct
- ✅ Title visible
- ✅ Times formatted correctly
- ✅ Hover state works

---

#### 2.2 Multiple Events
**Precondition:** 3+ events scheduled for today
**Steps:**
1. Create 3 events for today at different times
2. Navigate to Today page
3. Verify "Schedule (3)" shows
4. Verify all events listed in order
5. Verify no duplicates
**Expected:** All events shown, correct count

**Pass Criteria:**
- ✅ All events present
- ✅ Count accurate
- ✅ No duplicates

---

#### 2.3 All-Day Event
**Precondition:** All-day event scheduled for today
**Steps:**
1. Create all-day event (e.g., "Conference")
2. Navigate to Today page
3. Verify event shows "All day" instead of specific times
**Expected:** All-day events formatted correctly

**Pass Criteria:**
- ✅ Shows "All day" text
- ✅ No time range shown
- ✅ Still listed in events

---

#### 2.4 Event with Location
**Precondition:** Event with location scheduled
**Steps:**
1. Create event with location (e.g., "Meeting - Room 123")
2. Navigate to Today page
3. Verify location appears with map pin icon
4. Verify location doesn't truncate unexpectedly
**Expected:** Location displayed correctly

**Pass Criteria:**
- ✅ Map pin icon present
- ✅ Location text visible
- ✅ Proper spacing

---

#### 2.5 Event with Meeting URL
**Precondition:** Event with video meeting scheduled
**Steps:**
1. Create event with Zoom/Meet URL
2. Navigate to Today page
3. Verify video icon appears (blue)
**Expected:** Meeting indicator shown

**Pass Criteria:**
- ✅ Video icon visible
- ✅ Blue color applied
- ✅ Not overlapping other content

---

#### 2.6 Add Event Button
**Precondition:** Navigate to Today page
**Steps:**
1. Locate "+" button in Schedule header
2. Hover - verify hover styling
3. Click button
4. Verify EventModal opens
5. Verify modal has today's date pre-filled
**Expected:** Can create new event

**Pass Criteria:**
- ✅ Button visible and clickable
- ✅ Modal opens
- ✅ Date initialized correctly

---

#### 2.7 Click Event to Open Modal
**Precondition:** Event exists for today
**Steps:**
1. Navigate to Today page
2. Click on an event row
3. Verify EventModal opens with event details
4. Verify event title shows in modal
5. Close modal (X button or click outside)
6. Verify modal closes and page returns to normal
**Expected:** Event modal works correctly

**Pass Criteria:**
- ✅ Event details appear in modal
- ✅ Modal closes properly
- ✅ Page state preserved

---

#### 2.8 Open Calendar Link
**Precondition:** Navigate to Today page
**Steps:**
1. Locate "Open Calendar" link below events
2. Click link
3. Verify navigation to /app/calendar
**Expected:** Calendar opens

**Pass Criteria:**
- ✅ Link is blue/styled as link
- ✅ Navigates to calendar
- ✅ No errors in console

---

### Category 3: Overdue Tasks Section (7 scenarios)

#### 3.1 Overdue Tasks Display
**Precondition:** At least one task due before today
**Steps:**
1. Create task due yesterday (e.g., "Report Due")
2. Navigate to Today page
3. Verify "Overdue (1)" section appears
4. Verify red alert icon present
5. Verify section has red-tinted background
6. Verify task appears in this section
**Expected:** Overdue section shows correctly

**Pass Criteria:**
- ✅ Section visible
- ✅ Count correct
- ✅ Background styling applied
- ✅ Task listed

---

#### 3.2 Multiple Overdue Tasks
**Precondition:** 3+ tasks due in the past
**Steps:**
1. Create 3 tasks due yesterday/earlier
2. Navigate to Today page
3. Verify "Overdue (3)" header
4. Verify all 3 tasks listed
5. Verify tasks ordered correctly
**Expected:** Multiple overdue tasks shown

**Pass Criteria:**
- ✅ All tasks present
- ✅ Count accurate
- ✅ Order maintained

---

#### 3.3 High Priority Overdue Task
**Precondition:** High priority task that's overdue
**Steps:**
1. Create overdue task with priority="high"
2. Navigate to Today page
3. Verify unchecked checkbox shows circle icon
4. Verify red flag icon shows next to title
**Expected:** High priority indicated

**Pass Criteria:**
- ✅ Flag icon present
- ✅ Flag is red colored
- ✅ No text truncation

---

#### 3.4 Medium Priority Overdue Task
**Precondition:** Medium priority overdue task
**Steps:**
1. Create overdue task with priority="medium"
2. Navigate to Today page
3. Verify task appears in overdue section
4. Verify NO flag icon shown (medium priority)
**Expected:** No flag for medium priority

**Pass Criteria:**
- ✅ Task displays
- ✅ No flag icon
- ✅ Consistent with design

---

#### 3.5 Low Priority Overdue Task
**Precondition:** Low priority overdue task
**Steps:**
1. Create overdue task with priority="low"
2. Navigate to Today page
3. Verify gray/tertiary flag icon shows
**Expected:** Low priority flag shown

**Pass Criteria:**
- ✅ Flag present
- ✅ Gray/muted color
- ✅ Readable

---

#### 3.6 Complete Overdue Task
**Precondition:** Overdue task visible
**Steps:**
1. Navigate to Today page with overdue task
2. Click checkbox on overdue task
3. Verify checkmark appears
4. Verify task title gets strikethrough
5. Verify checkbox becomes green circle
6. Verify mutation call made to API
**Expected:** Task marked complete

**Pass Criteria:**
- ✅ Checkbox updates
- ✅ Strikethrough applied
- ✅ API call made
- ✅ Task doesn't disappear (stays in section)

---

#### 3.7 Click Overdue Task to Open
**Precondition:** Overdue task visible
**Steps:**
1. Navigate to Today page
2. Click on task title (NOT checkbox)
3. Verify TaskSlidePanel opens on right side
4. Verify task details visible in panel
5. Close panel
**Expected:** Task detail panel opens

**Pass Criteria:**
- ✅ Panel appears
- ✅ Task details show
- ✅ Panel can close
- ✅ Doesn't toggle status (checkbox didn't trigger)

---

### Category 4: Due Today Tasks Section (7 scenarios)

#### 4.1 Tasks Due Today Display
**Precondition:** At least one task due today
**Steps:**
1. Create task due today
2. Navigate to Today page
3. Verify "Due Today (1)" section
4. Verify clock icon in header
5. Verify task listed in this section (not overdue)
**Expected:** Due today section displays correctly

**Pass Criteria:**
- ✅ Section visible
- ✅ Count correct
- ✅ Clock icon present
- ✅ Task in right section

---

#### 4.2 Empty Due Today Section
**Precondition:** No tasks due today
**Steps:**
1. Navigate to Today page (with no due-today tasks)
2. Verify "Due Today (0)" header
3. Verify message: "No tasks due today. Nice work!"
**Expected:** Empty state shown

**Pass Criteria:**
- ✅ Message displays
- ✅ Positive tone
- ✅ Section still visible

---

#### 4.3 Multiple Due Today
**Precondition:** 5+ tasks due today
**Steps:**
1. Create 5 tasks due today
2. Navigate to Today page
3. Verify "Due Today (5)" header
4. Verify all 5 listed
5. Verify scrolling shows all items
**Expected:** All tasks visible

**Pass Criteria:**
- ✅ Count accurate
- ✅ All items shown
- ✅ Scroll works if needed

---

#### 4.4 Completed Due Today Task
**Precondition:** Due today task
**Steps:**
1. Navigate to Today page
2. Find due today task
3. Click checkbox
4. Verify checkmark + strikethrough appears
5. Verify checkbox is green circle
6. Verify task remains in due today section
**Expected:** Complete task visually

**Pass Criteria:**
- ✅ Visual updates
- ✅ Strikethrough applied
- ✅ Icon becomes green
- ✅ Remains in section

---

#### 4.5 High Priority Due Today
**Precondition:** High priority task due today
**Steps:**
1. Create high priority task due today
2. Navigate to Today page
3. Verify red flag icon shows
**Expected:** Priority indicated

**Pass Criteria:**
- ✅ Flag present and red
- ✅ Visible

---

#### 4.6 Toggle Task Status Multiple Times
**Precondition:** Due today task
**Steps:**
1. Navigate to Today page
2. Click checkbox: todo → done (checkmark appears)
3. Click checkbox again: done → todo (checkmark disappears)
4. Click checkbox again: todo → done
5. Verify status toggles correctly each time
**Expected:** Status toggle works consistently

**Pass Criteria:**
- ✅ Each toggle works
- ✅ Visual state matches
- ✅ API called each time

---

#### 4.7 Click Due Today Task
**Precondition:** Due today task visible
**Steps:**
1. Click task title
2. Verify TaskSlidePanel opens
3. Verify correct task details in panel
4. Verify checkbox click on panel row doesn't toggle (stop propagation)
**Expected:** Panel interaction works

**Pass Criteria:**
- ✅ Panel opens on title click
- ✅ Details visible
- ✅ Click on checkbox stops propagation

---

### Category 5: Inbox Section (5 scenarios)

#### 5.1 Inbox with Items
**Precondition:** Test account with unprocessed notes
**Steps:**
1. Create 3 unprocessed notes (Inbox status)
2. Navigate to Today page
3. Verify "Inbox" section with badge showing "3"
4. Verify message: "You have 3 unprocessed notes waiting for review"
5. Verify "View Inbox" link present
**Expected:** Inbox count displayed

**Pass Criteria:**
- ✅ Count badge shows
- ✅ Message correct (plural)
- ✅ Link visible

---

#### 5.2 Inbox Singular
**Precondition:** Exactly 1 unprocessed note
**Steps:**
1. Ensure 1 unprocessed note
2. Navigate to Today page
3. Verify message: "You have 1 unprocessed note waiting for review" (singular)
**Expected:** Singular "note" used

**Pass Criteria:**
- ✅ Singular form used
- ✅ Count shows "1"

---

#### 5.3 Inbox Zero
**Precondition:** No unprocessed notes
**Steps:**
1. Process all notes from inbox
2. Navigate to Today page
3. Verify "Inbox zero! You're all caught up." message
4. Verify no count badge shown
**Expected:** Zero state messaging

**Pass Criteria:**
- ✅ Message shows
- ✅ No badge
- ✅ Section still visible

---

#### 5.4 View Inbox Link
**Precondition:** Inbox has items
**Steps:**
1. Navigate to Today page with inbox items
2. Click "View Inbox" link
3. Verify navigation to /app/inbox
**Expected:** Links to inbox

**Pass Criteria:**
- ✅ Link navigates
- ✅ Correct href
- ✅ No errors

---

#### 5.5 Inbox Count Fallback
**Precondition:** Test useInboxCount fallback
**Steps:**
1. Verify component uses fallback when useInboxCount returns null
2. Ensure todayData.inboxCount is used as fallback
**Expected:** Fallback works if hook fails

**Pass Criteria:**
- ✅ Data displayed even if primary hook fails
- ✅ No blank count

---

### Category 6: Interactions & State Management (6 scenarios)

#### 6.1 Task Status Mutation
**Precondition:** Task visible in either overdue or due today
**Steps:**
1. Click checkbox
2. Open browser console
3. Monitor network tab
4. Verify API call made: PATCH /api/tasks/{id} with status update
5. Verify response received
**Expected:** API call made correctly

**Pass Criteria:**
- ✅ Request sent to correct endpoint
- ✅ Correct task ID
- ✅ New status in payload
- ✅ Response success

---

#### 6.2 Event Modal Creation
**Precondition:** Navigate to Today page
**Steps:**
1. Click "+" button in Schedule section
2. Verify EventModal opens
3. Verify modal has fields for event creation
4. Create new event
5. Verify event appears in Today page
**Expected:** Event creation works

**Pass Criteria:**
- ✅ Modal opens
- ✅ Can fill fields
- ✅ Submit creates event
- ✅ Event appears on page

---

#### 6.3 Event Modal Edit
**Precondition:** Event exists for today
**Steps:**
1. Click event row to open modal
2. Edit event details (title, time, etc.)
3. Save changes
4. Verify changes appear on Today page
**Expected:** Event edit works

**Pass Criteria:**
- ✅ Modal shows event details
- ✅ Can modify fields
- ✅ Changes persist

---

#### 6.4 Event Modal Close
**Precondition:** EventModal open
**Steps:**
1. Click X button to close
2. Verify modal closes
3. Click event again to reopen
4. Verify modal opens successfully
**Expected:** Modal can close and reopen

**Pass Criteria:**
- ✅ Close button works
- ✅ Modal disappears
- ✅ Can reopen

---

#### 6.5 Click Propagation Test
**Precondition:** Task with checkbox visible
**Steps:**
1. Click checkbox - should toggle status only
2. Verify TaskSlidePanel doesn't open
3. Click task title/row area - should open panel
4. Verify checkbox click doesn't propagate
**Expected:** Proper event handling

**Pass Criteria:**
- ✅ Checkbox doesn't trigger row click
- ✅ Row click doesn't trigger checkbox
- ✅ stopPropagation working

---

#### 6.6 Page Refresh Updates
**Precondition:** Make change (complete task)
**Steps:**
1. Complete a task (mark done)
2. Refresh page (F5)
3. Verify task state persisted
4. Verify count updated
**Expected:** State persists across refresh

**Pass Criteria:**
- ✅ Task remains marked complete
- ✅ Section count correct
- ✅ No data loss

---

### Category 7: Edge Cases & Error Handling (8 scenarios)

#### 7.1 Very Long Task Title
**Precondition:** Create task with 100+ character title
**Steps:**
1. Create task: "This is a very long task title that goes on and on and on and probably should truncate or wrap depending on design"
2. Navigate to Today page
3. Verify title doesn't overflow
4. Verify text readable (truncated or wrapped appropriately)
**Expected:** Long titles handled gracefully

**Pass Criteria:**
- ✅ No horizontal overflow
- ✅ Title still visible
- ✅ Proper truncation (if used)

---

#### 7.2 Very Long Event Title
**Precondition:** Event with very long title
**Steps:**
1. Create event with long title (100+ chars)
2. Navigate to Today page
3. Verify title in event row truncates with ellipsis
4. Verify full title visible on hover (if implemented)
**Expected:** Long title handled

**Pass Criteria:**
- ✅ Uses truncate class
- ✅ No overflow
- ✅ Readable

---

#### 7.3 Many Tasks (20+)
**Precondition:** Create 20+ tasks for today
**Steps:**
1. Create 20 tasks due today
2. Navigate to Today page
3. Verify all load
4. Scroll through list
5. Monitor performance (no lag)
6. Verify no tasks cut off at bottom
**Expected:** Handles large lists

**Pass Criteria:**
- ✅ All tasks render
- ✅ Scroll smooth
- ✅ Performance acceptable
- ✅ No visual cuts

---

#### 7.4 Many Events (10+)
**Precondition:** Create 10+ events for today
**Steps:**
1. Create 10 events at different times
2. Navigate to Today page
3. Verify all events listed
4. Verify correct count
5. Verify no duplicate rendering
**Expected:** Handles many events

**Pass Criteria:**
- ✅ All events shown
- ✅ Count accurate
- ✅ No duplicates

---

#### 7.5 Events with No Color Property
**Precondition:** Event missing color property
**Steps:**
1. Manually create event with null color in DB (or via API)
2. Navigate to Today page
3. Verify event color bar defaults to primary accent color
4. Verify doesn't break rendering
**Expected:** Graceful fallback

**Pass Criteria:**
- ✅ Fallback color applied
- ✅ Event still renders
- ✅ No errors in console

---

#### 7.6 Null/Missing Data Handling
**Precondition:** Component receives null data from hooks
**Steps:**
1. Simulate hook returning null
2. Verify component doesn't crash
3. Verify loading state shown
4. Verify message displayed when load completes
**Expected:** Graceful error handling

**Pass Criteria:**
- ✅ No console errors
- ✅ UI stable
- ✅ Appropriate messaging

---

#### 7.7 API Error Recovery
**Precondition:** API call fails
**Steps:**
1. Simulate API error (network issue)
2. Verify error state handled by hook
3. Verify user sees appropriate message
4. Verify retry option if available
**Expected:** Error handled gracefully

**Pass Criteria:**
- ✅ No crash
- ✅ Error message clear
- ✅ Recovery possible

---

#### 7.8 Concurrent Interactions
**Precondition:** Multiple items on page
**Steps:**
1. Rapidly click multiple checkboxes
2. Click event while previous modal still opening
3. Click "View Inbox" while event modal open
4. Verify no race conditions
5. Verify final state is consistent
**Expected:** Handles concurrent interactions

**Pass Criteria:**
- ✅ No state corruption
- ✅ Each action queued properly
- ✅ Final state correct

---

### Category 8: Accessibility & Keyboard Navigation (6 scenarios)

#### 8.1 Tab Through All Interactive Elements
**Precondition:** Navigate to Today page
**Steps:**
1. Press Tab repeatedly
2. Verify focus moves through interactive elements in logical order
3. Note which elements are skipped:
   - Event rows should be tabable (are buttons)
   - Task rows should be tabable (but aren't - BUG #2)
   - Links should be tabable (Open Calendar, View Inbox)
4. Verify focus visible (outline/highlight on focused element)
**Expected:** Logical tab order

**Pass Criteria:**
- ✅ All interactive elements tabable
- ✅ Logical order (top to bottom)
- ✅ Focus visible
- ✅ Task rows keyboard accessible (after fix)

---

#### 8.2 Keyboard Activation
**Precondition:** Elements focused via keyboard
**Steps:**
1. Tab to "Open Calendar" link
2. Press Enter
3. Verify navigation works
4. Tab to "View Inbox" link
5. Press Enter
6. Verify navigation works
7. Tab to event row (button)
8. Press Enter
9. Verify event modal opens
**Expected:** Keyboard activation works

**Pass Criteria:**
- ✅ Enter activates links
- ✅ Enter activates buttons
- ✅ Modal opens on Enter

---

#### 8.3 Screen Reader Announcement
**Precondition:** Using screen reader (NVDA, JAWS, VoiceOver)
**Steps:**
1. Launch screen reader
2. Navigate to Today page
3. Verify announcements:
   - Heading: "Today"
   - Schedule section header with count
   - Event buttons announced as buttons
   - Task rows announced as clickable (after fix)
   - Link targets announced
4. Verify no duplicate announcements
**Expected:** Screen reader friendly

**Pass Criteria:**
- ✅ All headings announced
- ✅ Interactive elements identified
- ✅ Count information announced
- ✅ No false announcements

---

#### 8.4 Color Not Sole Indicator
**Precondition:** Navigate to Today page
**Steps:**
1. Verify overdue section indicated by:
   - Icon + text "Overdue"
   - Not just red color
2. Verify completed task indicated by:
   - Checkmark icon + strikethrough
   - Not just color change
3. Verify priority indicated by:
   - Flag icon
   - Color of flag
4. Verify status indicated by:
   - Icon (circle vs checkmark)
   - Text styling
**Expected:** Multiple indicators used

**Pass Criteria:**
- ✅ Icon + text for overdue
- ✅ Icon + text for status
- ✅ Icons for priority

---

#### 8.5 Contrast Ratios
**Precondition:** Test colors against WCAG AA (4.5:1 for text)
**Steps:**
1. Use contrast checker tool
2. Test primary text on surface background: ratio ≥ 4.5:1?
3. Test secondary text: ratio ≥ 4.5:1?
4. Test tertiary text: ratio ≥ 4.5:1?
5. Test overdue red text on red background: ratio ≥ 4.5:1? ⚠️ LIKELY FAIL
6. Test accent color on background: ratio ≥ 3:1?
**Expected:** All meet WCAG AA

**Pass Criteria:**
- ✅ All critical text ≥ 4.5:1
- ✅ UI components ≥ 3:1
- ✅ ⚠️ Overdue section may fail (ISSUE #1)

---

#### 8.6 Focus Visible on All Interactive Elements
**Precondition:** Navigate to Today page
**Steps:**
1. Tab through page
2. Check each interactive element has visible focus indicator:
   - Checkboxes: ring/outline visible?
   - Event buttons: ring/outline visible?
   - Links: underline/outline visible?
   - "+Add event" button: outline visible?
3. Verify focus indicator meets contrast requirements
**Expected:** Focus always visible

**Pass Criteria:**
- ✅ All interactive elements show focus
- ✅ Focus ring/outline visible
- ✅ Contrast sufficient

---

### Category 9: Responsive Behavior (4 scenarios)

#### 9.1 Layout Shift During Load
**Precondition:** Page loading
**Steps:**
1. Open Dev Tools → Lighthouse → Performance
2. Load Today page
3. Check Cumulative Layout Shift (CLS) score
4. Should be < 0.1 (good)
5. Verify no content jumps around while loading
**Expected:** Minimal layout shift

**Pass Criteria:**
- ✅ CLS < 0.1
- ✅ Smooth appearance
- ✅ Skeleton properly sized

---

#### 9.2 Orientation Change (Mobile)
**Precondition:** Mobile device or emulation
**Steps:**
1. Open Today page on mobile
2. Verify portrait layout
3. Rotate to landscape
4. Verify layout adjusts properly
5. All content still visible
6. No overflow
**Expected:** Adapts to orientation

**Pass Criteria:**
- ✅ Portrait works
- ✅ Landscape works
- ✅ No content loss
- ✅ Smooth transition

---

#### 9.3 Zoom/Scale Up (Accessibility)
**Precondition:** Browser zoom at 200%
**Steps:**
1. Set browser zoom to 200%
2. Navigate to Today page
3. Verify layout doesn't break
4. Verify no horizontal scrollbar at 200%
5. Verify text remains readable
**Expected:** Scales gracefully

**Pass Criteria:**
- ✅ No layout breaks
- ✅ Text readable
- ✅ Touch targets still usable

---

#### 9.4 Small Devices (320px width)
**Precondition:** Very small phone (320px)
**Steps:**
1. Set viewport to 320x600
2. Navigate to Today page
3. Verify all content reflows
4. Verify no unintended horizontal scroll
5. Verify touch targets are 44x44px minimum
**Expected:** Works on small screens

**Pass Criteria:**
- ✅ No overflow
- ✅ Readable text size
- ✅ Tappable elements

---

### Category 10: Performance (2 scenarios)

#### 10.1 Page Load Performance
**Precondition:** Measure performance metrics
**Steps:**
1. Open Dev Tools → Network tab
2. Hard reload (Ctrl+Shift+R)
3. Measure:
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
   - Total load time
4. Should be:
   - FCP < 1.8s
   - LCP < 2.5s
   - Total < 3s
**Expected:** Fast load

**Pass Criteria:**
- ✅ FCP < 1.8s
- ✅ LCP < 2.5s
- ✅ Perceived load fast

---

#### 10.2 Scroll Performance with Many Items
**Precondition:** 20+ items in sections
**Steps:**
1. Create page with many tasks/events
2. Scroll up/down rapidly
3. Monitor FPS (should stay 60fps)
4. Monitor GPU usage
5. Verify smooth scrolling
**Expected:** No jank while scrolling

**Pass Criteria:**
- ✅ 60fps maintained
- ✅ Smooth scroll
- ✅ No lag

---

## Test Execution Summary

**Total Scenarios:** 47
**Estimated Time:** 4-6 hours for complete testing
**Skill Needed:** Intermediate QA with browser dev tools

### Priority Testing Order
1. **Critical (1-2 hours):** Scenarios 1.1-1.5 (visual), 2.1 (events), 3.1 (overdue), 4.1 (due today), 5.1 (inbox), 8.1 (keyboard)
2. **Important (1-2 hours):** Scenarios 6.1-6.5 (interactions), 9.1 (responsive)
3. **Nice to Have (1-2 hours):** Scenarios 7.1-7.8 (edge cases), 8.2-8.6 (accessibility), 10.1 (performance)

### Test Documentation
- Record screenshots at each breakpoint
- Note any deviations from expected behavior
- Save console errors/warnings
- Document timing for performance tests
- Verify all pass criteria met for each scenario

---

**Created:** January 31, 2026
**Component:** TodayPage.jsx
**Last Updated:** 2026-01-31

