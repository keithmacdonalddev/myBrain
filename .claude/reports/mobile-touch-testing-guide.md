# Mobile Touch Testing Guide - Execution Steps

This guide provides step-by-step instructions for hands-on mobile touch interaction testing using agent-browser.

---

## Session Setup

### Step 1: Configure Agent-Browser Session

```bash
agent-browser --session mobile-qa set viewport 375 812
agent-browser --session mobile-qa set media dark  # Test dark mode
# OR
agent-browser --session mobile-qa set media light  # Test light mode
```

### Step 2: Navigate to Production

```bash
agent-browser --session mobile-qa open "https://my-brain-gules.vercel.app"
agent-browser --session mobile-qa wait 3000
```

### Step 3: Get Initial Page Snapshot

```bash
agent-browser --session mobile-qa snapshot -i > mobile-snapshot.txt
```

---

## Test 1: Bottom Navigation Bar

### Objective
Verify all bottom navigation buttons are tappable (44×44px minimum) and have proper feedback.

### Steps

1. **Get navigation snapshot:**
   ```bash
   agent-browser --session mobile-qa snapshot -i
   ```

2. **Locate menu button** - Look for refs with role="button" and name containing "Menu", "Home", or similar

3. **Test Menu Button:**
   ```bash
   agent-browser --session mobile-qa click @e{menu-ref}
   ```
   Verify:
   - [ ] Button scale-down feedback (active:scale-95)
   - [ ] Color change to primary color
   - [ ] Menu panel slides up from bottom (300ms animation)

4. **Test Search Button:**
   ```bash
   agent-browser --session mobile-qa click @e{search-ref}
   ```
   Verify:
   - [ ] Search bar slides up
   - [ ] Search input becomes visible
   - [ ] Keyboard appears (on real device)

5. **Test Settings Button:**
   ```bash
   agent-browser --session mobile-qa click @e{settings-ref}
   ```
   Verify:
   - [ ] Settings panel slides up
   - [ ] All settings sections visible
   - [ ] Each section is tappable (48px height minimum)

6. **Test Profile Button:**
   ```bash
   agent-browser --session mobile-qa click @e{profile-ref}
   ```
   Verify:
   - [ ] Profile panel slides up
   - [ ] Profile content visible
   - [ ] All action buttons tappable

7. **Test Spacing:**
   ```bash
   agent-browser --session mobile-qa get box @e{nav-items}
   ```
   Verify:
   - [ ] At least 8px spacing between nav buttons
   - [ ] Each button takes up equal width

8. **Take Screenshot:**
   ```bash
   agent-browser --session mobile-qa screenshot 2026-01-31-bottom-nav.png
   ```

---

## Test 2: Menu Panel Navigation

### Objective
Verify menu panel opens, items are tappable, and gestures work.

### Steps

1. **Open Menu Panel:**
   ```bash
   agent-browser --session mobile-qa snapshot -i > menu-state.txt
   ```
   Find and click menu button (from Test 1)

2. **Verify Animation:**
   - [ ] Panel slides up from bottom (should take 300ms)
   - [ ] Backdrop fades in
   - [ ] Menu items appear with stagger animation (if implemented)

3. **Get Menu Items Snapshot:**
   ```bash
   agent-browser --session mobile-qa snapshot -i
   ```

4. **Test Each Menu Item Tappability:**
   - Document each item's ref (@e1, @e2, etc.)
   - Verify each is at least 48px height
   - Click each item and verify:
     ```bash
     agent-browser --session mobile-qa click @e{item-ref}
     ```

5. **Test Touch Target Size:**
   ```bash
   agent-browser --session mobile-qa get box @e{menu-item}
   ```
   Verify:
   - [ ] Height >= 48px
   - [ ] Touch area is full width or >= 44px

6. **Test Closing Gesture:**
   ```bash
   # Test backdrop click to close
   agent-browser --session mobile-qa click @e{backdrop}
   ```
   Verify:
   - [ ] Menu slides down
   - [ ] Backdrop fades out
   - [ ] Bottom nav shows again

7. **Test Active State:**
   ```bash
   agent-browser --session mobile-qa click @e{menu-item}
   ```
   Verify:
   - [ ] Button scales down (active:scale-95)
   - [ ] Background darkens (active:bg-bg/50)
   - [ ] Color changes (active:text-primary)

8. **Take Screenshot:**
   ```bash
   agent-browser --session mobile-qa screenshot 2026-01-31-menu-panel.png
   ```

---

## Test 3: Settings Panel

### Objective
Verify settings panel navigation and form input touch targets.

### Steps

1. **Open Settings Panel:**
   - Click settings button from bottom nav
   ```bash
   agent-browser --session mobile-qa snapshot -i
   ```

2. **Verify Horizontal Navigation (if present):**
   - Look for "Account", "Preferences", "Notifications", etc. sections
   - Verify each section header is tappable (44px minimum)

3. **Test Section Navigation:**
   - Get refs for each section header
   - Click each one:
     ```bash
     agent-browser --session mobile-qa click @e{section-ref}
     ```
   - Verify:
     - [ ] Content slides left (iOS-style 300ms animation)
     - [ ] Section title updates
     - [ ] Back option appears (if horizontal nav)

4. **Test Form Inputs:**
   ```bash
   agent-browser --session mobile-qa snapshot -i
   ```
   For each input field:
   - Get ref and click:
     ```bash
     agent-browser --session mobile-qa click @e{input-ref}
     ```
   - Verify:
     - [ ] Field receives focus
     - [ ] Keyboard appears (on real device)
     - [ ] Field remains visible above keyboard

5. **Test Toggles/Checkboxes:**
   ```bash
   agent-browser --session mobile-qa click @e{checkbox-ref}
   ```
   Verify:
   - [ ] 44×44px minimum touch target
   - [ ] Checkbox animates (200ms if custom)
   - [ ] Check state changes visually

6. **Test Dropdown Selects:**
   ```bash
   agent-browser --session mobile-qa click @e{dropdown-ref}
   ```
   Verify:
   - [ ] Dropdown opens on tap
   - [ ] Each option is tappable (44px minimum)
   - [ ] Selection updates immediately

7. **Take Screenshot:**
   ```bash
   agent-browser --session mobile-qa screenshot 2026-01-31-settings-panel.png
   ```

---

## Test 4: Task/Note List & Slide Panels

### Objective
Verify list items are tappable and slide panels open smoothly.

### Steps

1. **Navigate to Dashboard/Main View:**
   ```bash
   agent-browser --session mobile-qa click @e{home-ref}
   # or reload if at dashboard
   agent-browser --session mobile-qa reload
   agent-browser --session mobile-qa wait 2000
   ```

2. **Get Tasks List Snapshot:**
   ```bash
   agent-browser --session mobile-qa snapshot -i
   ```

3. **Verify Task List Item Sizes:**
   - Find first task item ref
   - Get its bounding box:
     ```bash
     agent-browser --session mobile-qa get box @e{task-item-ref}
     ```
   - Verify:
     - [ ] Height >= 48px
     - [ ] Width = full container (except padding)
     - [ ] Touch area includes checkbox + text

4. **Test Clicking Task Item:**
   ```bash
   agent-browser --session mobile-qa click @e{task-item-ref}
   ```
   Verify:
   - [ ] Task scales down (active:scale-95)
   - [ ] Background color changes (active:bg-bg/50)
   - [ ] Slide panel opens from right (300ms animation)
   - [ ] Task details visible in panel

5. **Test Slide Panel Close:**
   - Look for close button or swipe area
   ```bash
   agent-browser --session mobile-qa click @e{close-button}
   # OR swipe left (if implemented)
   agent-browser --session mobile-qa key Escape  # Test escape key
   ```
   Verify:
   - [ ] Panel slides out to right
   - [ ] Main view becomes visible again
   - [ ] List returns to normal state

6. **Test Checkbox Toggle:**
   - Open a task's slide panel
   - Click the checkbox:
     ```bash
     agent-browser --session mobile-qa click @e{task-checkbox-ref}
     ```
   - Verify:
     - [ ] 44×44px minimum size
     - [ ] Animated check mark
     - [ ] Task marked as complete

7. **Test Multiple Task Interactions:**
   - Click different tasks in rapid succession
   - Verify:
     - [ ] Each opens correctly
     - [ ] No stacking or lag
     - [ ] Close works between taps

8. **Take Screenshot:**
   ```bash
   agent-browser --session mobile-qa screenshot 2026-01-31-task-list.png
   ```

9. **Repeat for Notes:**
   - Test similar interactions in notes section
   ```bash
   agent-browser --session mobile-qa screenshot 2026-01-31-notes-list.png
   ```

---

## Test 5: Form Interactions

### Objective
Verify form inputs are properly sized and keyboard appears above them.

### Steps

1. **Navigate to a form:**
   - Settings > Profile
   - Or create new task/note dialog
   ```bash
   agent-browser --session mobile-qa click @e{new-task-button}
   # or navigate to form page
   ```

2. **Get Form Fields Snapshot:**
   ```bash
   agent-browser --session mobile-qa snapshot -i
   ```

3. **Test Text Input (Email, Name, etc.):**
   ```bash
   agent-browser --session mobile-qa click @e{email-input-ref}
   ```
   Verify:
   - [ ] Input is at least 44px height
   - [ ] Focus state visible (border color change)
   - [ ] Cursor appears (on real device, keyboard shows)

4. **Test Typing in Input:**
   ```bash
   agent-browser --session mobile-qa type @e{email-input-ref} "test@example.com"
   ```
   Verify:
   - [ ] Text appears as typed
   - [ ] Field doesn't exceed viewport
   - [ ] Text is readable at base size

5. **Test Input Clearing (if +/- exists):**
   - Some mobile inputs have clear button
   ```bash
   agent-browser --session mobile-qa click @e{clear-button}
   ```
   Verify:
   - [ ] Clear button is 44×44px
   - [ ] Content clears when clicked

6. **Test Textarea (if present):**
   ```bash
   agent-browser --session mobile-qa click @e{textarea-ref}
   agent-browser --session mobile-qa type @e{textarea-ref} "Multi-line text here"
   ```
   Verify:
   - [ ] Min height >= 44px
   - [ ] Content scrolls if exceeds viewport
   - [ ] Line breaks appear correctly

7. **Test Select/Dropdown:**
   ```bash
   agent-browser --session mobile-qa click @e{select-ref}
   ```
   Verify:
   - [ ] Native select on some devices (iOS)
   - [ ] OR custom dropdown opens
   - [ ] Each option is tappable (44px)

8. **Test Radio Buttons:**
   ```bash
   agent-browser --session mobile-qa click @e{radio-button-ref}
   ```
   Verify:
   - [ ] 44×44px minimum
   - [ ] Label is clickable (44px tap area)
   - [ ] Selection animates

9. **Test Date Picker:**
   ```bash
   agent-browser --session mobile-qa click @e{date-picker-ref}
   ```
   Verify:
   - [ ] Native date picker on real device
   - [ ] OR custom calendar appears
   - [ ] Date selection tappable

10. **Take Screenshot:**
    ```bash
    agent-browser --session mobile-qa screenshot 2026-01-31-form-inputs.png
    ```

---

## Test 6: Modals & Dialogs

### Objective
Verify modals/dialogs are properly sized for mobile.

### Steps

1. **Trigger a Modal:**
   - Click delete button, or confirmation dialog
   ```bash
   agent-browser --session mobile-qa snapshot -i
   ```
   Find a button that opens a modal

2. **Test Modal Size:**
   - Fullscreen on mobile (bottom sheet style)
   ```bash
   agent-browser --session mobile-qa get box @e{modal-ref}
   ```
   Verify:
   - [ ] Width = 100% (full width)
   - [ ] Rounded corners (rounded-t-2xl on mobile)
   - [ ] Backdrop visible (semi-transparent black)

3. **Test Modal Buttons:**
   - Get refs for buttons in modal
   ```bash
   agent-browser --session mobile-qa snapshot -i
   ```
   - Verify each button:
     - [ ] 44px minimum height
     - [ ] Full width or side-by-side if space allows
     - [ ] Tappable without scrolling

4. **Test Scroll in Modal:**
   - If modal has lots of content
   ```bash
   agent-browser --session mobile-qa scroll down
   ```
   Verify:
   - [ ] Content scrolls smoothly
   - [ ] Buttons remain accessible
   - [ ] No layout shift

5. **Test Modal Closing:**
   ```bash
   agent-browser --session mobile-qa click @e{cancel-button}
   # OR click backdrop
   agent-browser --session mobile-qa key Escape
   ```
   Verify:
   - [ ] Modal closes
   - [ ] Slide animation (300ms)
   - [ ] Main content visible again

6. **Test Modal Action:**
   ```bash
   agent-browser --session mobile-qa click @e{confirm-button}
   ```
   Verify:
   - [ ] Action executes (delete, save, etc.)
   - [ ] Modal closes
   - [ ] List updates (if applicable)

7. **Take Screenshot:**
   ```bash
   agent-browser --session mobile-qa screenshot 2026-01-31-modal.png
   ```

---

## Test 7: Scroll Performance

### Objective
Verify smooth scrolling and no jank on mobile.

### Steps

1. **Open a Long List:**
   - Dashboard with many tasks
   - Or notes/projects list
   ```bash
   agent-browser --session mobile-qa wait 2000
   ```

2. **Scroll Down Smoothly:**
   ```bash
   agent-browser --session mobile-qa scroll down 500
   ```
   Verify:
   - [ ] Scroll is smooth (no stutter)
   - [ ] Items load/appear smoothly
   - [ ] No layout shift as items load

3. **Scroll to End:**
   ```bash
   agent-browser --session mobile-qa scroll down 1000
   ```
   Verify:
   - [ ] Momentum scrolling (if on real device)
   - [ ] End of list reached
   - [ ] No errors in console

4. **Scroll Back to Top:**
   ```bash
   agent-browser --session mobile-qa scroll up 1000
   ```

5. **Check Console for Errors:**
   ```bash
   agent-browser --session mobile-qa console
   ```
   Verify:
   - [ ] No JavaScript errors
   - [ ] No performance warnings

6. **Take Screenshot:**
   ```bash
   agent-browser --session mobile-qa screenshot 2026-01-31-scroll-test.png
   ```

---

## Test 8: Orientation Change

### Objective
Verify layout adapts to landscape and back to portrait.

### Steps

1. **Change to Landscape:**
   ```bash
   agent-browser --session mobile-qa set viewport 812 375
   ```

2. **Verify Layout Adapts:**
   ```bash
   agent-browser --session mobile-qa snapshot -i
   ```
   Verify:
   - [ ] Content reflows for wider viewport
   - [ ] No horizontal scrolling
   - [ ] Navigation still accessible
   - [ ] Touch targets still >= 44px

3. **Take Screenshot:**
   ```bash
   agent-browser --session mobile-qa screenshot 2026-01-31-landscape.png
   ```

4. **Change Back to Portrait:**
   ```bash
   agent-browser --session mobile-qa set viewport 375 812
   agent-browser --session mobile-qa wait 500
   ```

5. **Verify Original Layout:**
   ```bash
   agent-browser --session mobile-qa screenshot 2026-01-31-portrait-restored.png
   ```

---

## Test 9: Dark Mode

### Objective
Verify touch targets remain visible in dark mode.

### Steps

1. **Switch to Dark Mode:**
   ```bash
   agent-browser --session mobile-qa set media dark
   agent-browser --session mobile-qa reload
   agent-browser --session mobile-qa wait 1000
   ```

2. **Verify Text Contrast:**
   ```bash
   agent-browser --session mobile-qa snapshot -i
   ```
   Verify:
   - [ ] All text readable
   - [ ] Buttons clearly visible
   - [ ] No white text on light background

3. **Test Touch Feedback:**
   - Click buttons and verify active states
   ```bash
   agent-browser --session mobile-qa click @e{button-ref}
   ```
   Verify:
   - [ ] Scale-down visible
   - [ ] Color change visible
   - [ ] Feedback is clear

4. **Take Screenshot:**
   ```bash
   agent-browser --session mobile-qa screenshot 2026-01-31-dark-mode.png
   ```

5. **Switch Back to Light Mode:**
   ```bash
   agent-browser --session mobile-qa set media light
   agent-browser --session mobile-qa reload
   agent-browser --session mobile-qa wait 1000
   ```

---

## Test 10: Fast Tapping & Edge Cases

### Objective
Verify app handles rapid interactions gracefully.

### Steps

1. **Rapid Button Clicks:**
   ```bash
   agent-browser --session mobile-qa click @e{button-ref}
   agent-browser --session mobile-qa wait 100
   agent-browser --session mobile-qa click @e{button-ref}
   agent-browser --session mobile-qa wait 100
   agent-browser --session mobile-qa click @e{button-ref}
   ```
   Verify:
   - [ ] No duplicate actions
   - [ ] Button debounced/throttled
   - [ ] Only last action executes

2. **Double-Tap (if implemented):**
   ```bash
   agent-browser --session mobile-qa dblclick @e{item-ref}
   ```
   Verify:
   - [ ] Double-tap action works (e.g., like/favorite)
   - [ ] Single tap also works
   - [ ] No zoom on double-tap (check viewport)

3. **Overlapping Buttons:**
   - Test buttons that might overlap
   ```bash
   agent-browser --session mobile-qa snapshot -i
   ```
   Verify:
   - [ ] No overlap
   - [ ] All buttons have click area

4. **Empty States:**
   - Navigate to empty list
   - Verify:
     - [ ] Empty state message visible
     - [ ] Call-to-action button tappable (44px)
     - [ ] Navigation still works

5. **Error States:**
   - Trigger an error (invalid form, network error)
   - Verify:
     - [ ] Error message visible
     - [ ] Dismiss/retry button tappable
     - [ ] 44px minimum height

6. **Take Screenshot:**
   ```bash
   agent-browser --session mobile-qa screenshot 2026-01-31-edge-cases.png
   ```

---

## Data Collection Template

### For Each Test, Record:

```
## Test: [Name]
Date: 2026-01-31
Device: iPhone 375×812px (simulated)
Dark Mode: [Yes/No]

### Results:
- Touch Target Sizes: PASS / FAIL
  - Details: ...

- Active State Feedback: PASS / FAIL
  - Details: ...

- Animation Smoothness: PASS / FAIL
  - Details: ...

- Gestures: PASS / FAIL
  - Details: ...

### Screenshots:
- 2026-01-31-[test-name]-1.png
- 2026-01-31-[test-name]-2.png

### Issues Found:
- [ ] Issue 1: ...
- [ ] Issue 2: ...
- [ ] Issue 3: ...

### Notes:
...
```

---

## Summary Checklist

After all tests complete, verify:

- [ ] All touch targets >= 44×44px
- [ ] All buttons have active state feedback
- [ ] All animations smooth (300ms panels, 150ms buttons)
- [ ] All gestures work (tap, scroll, swipe)
- [ ] Keyboard appears correctly for inputs
- [ ] Forms are usable on mobile
- [ ] Modals/panels close properly
- [ ] Scroll is smooth with no jank
- [ ] Orientation changes work
- [ ] Dark mode has sufficient contrast
- [ ] No console errors
- [ ] No layout shifts
- [ ] No hover-only interactions
- [ ] All screenshots captured

---

## Troubleshooting

### Agent-Browser Issues

**Command hangs:**
```bash
# Close session and retry
agent-browser --session mobile-qa close
agent-browser --session mobile-qa set viewport 375 812
agent-browser --session mobile-qa open "https://my-brain-gules.vercel.app"
```

**Snapshot returns empty:**
```bash
# Wait for page load
agent-browser --session mobile-qa wait 3000
# Try snapshot again
agent-browser --session mobile-qa snapshot -i
```

**Can't click element:**
```bash
# Get fresh snapshot with refs
agent-browser --session mobile-qa snapshot -i > snapshot.txt
# Check ref exists, try scrolling to it first
agent-browser --session mobile-qa scrollintoview @e{ref}
agent-browser --session mobile-qa click @e{ref}
```

### Real Device Testing

If testing on actual device:
1. Open https://my-brain-gules.vercel.app in mobile browser
2. Test account: e2e-test-1769287147232@mybrain.test / ClaudeTest123
3. Use device's developer tools for element inspection
4. Test with both WiFi and cellular (4G)
5. Test with both light and dark system settings

---

*Testing guide created: 2026-01-31*
*Use with agent-browser for comprehensive mobile QA validation*
