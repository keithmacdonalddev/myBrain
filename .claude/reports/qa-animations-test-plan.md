# Animation & Transition QA Test Plan

**Test Date:** 2026-01-31
**Test Account:** claude-test-user@mybrain.test / ClaudeTest123
**Session:** animation-qa
**Test URLs:**
- Local: http://localhost:5173
- Production: https://my-brain-gules.vercel.app

---

## Test Framework Reference

**Available Animation Classes (from globals.css & theme.css):**

| Animation Class | Duration | Easing | Properties |
|-----------------|----------|--------|------------|
| `animate-fade-in` | 0.2s | ease-out | opacity, translateY(-4px) |
| `animate-slide-in` | 0.3s | ease-out | translateX(100%) |
| `animate-slide-in-right` | 0.3s | ease-out | translateX(100%) |
| `animate-slide-up` | 0.3s | cubic-bezier | translateY(100%) |
| `animate-slide-down` | 0.25s | cubic-bezier | translateY(100%) |
| `animate-scale-in` | 0.15s | ease-out | scale(0.95) |
| `animate-scale-out` | 0.1s | ease-in | scale(0.95) |
| `animate-check-bounce` | 0.3s | ease-out | scale bounce |
| `animate-pulse-dot` | 1.5s | ease-in-out | opacity 0.5→1 |
| `animate-collapse` | 0.2s | ease-out | max-height collapse |
| `animate-expand` | 0.2s | ease-out | max-height expand |
| `animate-tab-fade-in` | 0.2s | ease-out | opacity, translateY |
| `animate-stagger-1/2/3/4` | 0.3s | ease-out | staggered with delay |
| `animate-success-flash` | 0.5s | ease-out | box-shadow expansion |
| `shimmer` (skeleton) | 1.5s | infinite | background-position |

**Global Transitions (theme.css line 561):**
```css
* {
  transition: background-color 0.3s ease-out,
              color 0.3s ease-out,
              border-color 0.3s ease-out;
}
```

---

## Test Category 1: Fade-In Animations

### 1.1 Dashboard Widget Load
**Steps:**
1. Navigate to dashboard
2. Refresh page (Ctrl+Shift+R)
3. Watch widgets load

**Check for:**
- [ ] Widgets fade in smoothly (0.2s)
- [ ] No popping or flashing
- [ ] Staggered timing (widgets don't all appear at once)
- [ ] Animation uses ease-out easing

**Evidence:**
- Screenshot of widgets during load
- Console: Check `getComputedStyle()` for animation property
- DevTools: Verify animation duration in Animation tab

### 1.2 Card Loading
**Steps:**
1. On any page with cards
2. Trigger refresh
3. Observe card animation

**Check for:**
- [ ] Cards fade in with slight upward movement
- [ ] Timing consistent (0.2s ± 50ms)
- [ ] No layout shift during animation

---

## Test Category 2: Hover Animations

### 2.1 Button Hover
**Steps:**
1. Locate any button
2. Hover over button
3. Watch for visual feedback

**Check for:**
- [ ] Button shows visual change (color, shadow, or scale)
- [ ] Transition is smooth (0.15-0.2s)
- [ ] No jumping or stuttering
- [ ] Focus ring visible on Tab (keyboard nav)

**DevTools Check:**
```javascript
// In Chrome DevTools Console
const btn = document.querySelector('button');
const style = window.getComputedStyle(btn);
console.log('Transition:', style.transition);
console.log('Transform:', style.transform);
```

### 2.2 Card Hover (Lift Effect)
**Steps:**
1. Find a card element
2. Hover over card
3. Observe elevation change

**Check for:**
- [ ] Card appears to lift (slight translateY)
- [ ] Shadow increases
- [ ] Transition smooth (~0.2s)
- [ ] No jank or stutter

### 2.3 Nav Item Hover
**Steps:**
1. Hover over navigation item
2. Check background color change
3. Verify text color change

**Check for:**
- [ ] Background transitions smoothly
- [ ] Text color changes with transition
- [ ] No harsh flashing
- [ ] Timing ~0.2s

---

## Test Category 3: Page Transitions

### 3.1 Navigation Between Pages
**Steps:**
1. Click navigation link (e.g., Dashboard → Tasks)
2. Watch page content change
3. Check for transition

**Check for:**
- [ ] No white flash of unstyled content
- [ ] Content appears smoothly
- [ ] No abrupt disappearance of old content
- [ ] Scrolls to top smoothly

### 3.2 Theme Toggle
**Steps:**
1. Find theme toggle button (usually header)
2. Click to switch light → dark
3. Observe color changes
4. Click to switch dark → light

**Check for:**
- [ ] All colors transition together
- [ ] No harsh flash
- [ ] Transition timing ~0.3s
- [ ] Text remains readable during transition
- [ ] Both light and dark readable (min 4.5:1 contrast)

**Specific Elements to Check:**
- [ ] Background color changes smoothly
- [ ] Text color changes smoothly
- [ ] Borders transition color
- [ ] Cards transition background
- [ ] Shadows adjust for theme

---

## Test Category 4: Modal Animations

### 4.1 Modal Open
**Steps:**
1. Trigger modal (button that says "Add", "New", "Edit", etc.)
2. Watch modal appear
3. Check timing

**Check for:**
- [ ] Modal fades in
- [ ] Modal scales in (starts smaller)
- [ ] Backdrop fades in behind modal
- [ ] Timing ~0.2-0.3s
- [ ] Smooth easing (not linear)

### 4.2 Modal Close
**Steps:**
1. Close modal (close button, X, Escape, click outside)
2. Watch modal disappear
3. Check timing

**Check for:**
- [ ] Modal fades out
- [ ] No abrupt disappear
- [ ] Backdrop fades out
- [ ] Timing ~0.1-0.25s
- [ ] Smooth exit animation

---

## Test Category 5: Loading Animations

### 5.1 Skeleton Pulse Animation
**Steps:**
1. Trigger loading state (if possible)
2. Look for skeleton loaders
3. Observe pulse effect

**Check for:**
- [ ] Shimmer animation visible (left to right)
- [ ] Duration 1.5s per cycle
- [ ] Smooth infinite loop
- [ ] No jarring jumps

**Implementation Check:**
```css
/* From globals.css - should use background-position animation */
.skeleton {
  animation: shimmer 1.5s infinite;
  background-position: -200% 0;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

### 5.2 Loading Spinner
**Steps:**
1. Find any loading spinner
2. Observe rotation

**Check for:**
- [ ] Smooth continuous rotation
- [ ] No stuttering or pausing
- [ ] Appropriate speed
- [ ] Uses GPU-accelerated properties (transform: rotate)

---

## Test Category 6: Micro-Interactions

### 6.1 Checkbox Animation
**Steps:**
1. Find checkbox in task list or form
2. Click to check
3. Observe checkmark animation

**Check for:**
- [ ] Checkmark appears with animation (not instant)
- [ ] Animation timing ~0.2-0.3s
- [ ] Bounce or scale animation smooth
- [ ] Task text may have strike-through with animation

**Implementation Check:**
```css
/* From globals.css */
@keyframes check-bounce {
  0% { transform: scale(1); }
  30% { transform: scale(0.85); }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); }
}
.animate-check-bounce { animation: check-bounce 0.3s ease-out; }
```

### 6.2 Toggle Switch
**Steps:**
1. Find toggle switch (if present)
2. Click to toggle
3. Watch state change

**Check for:**
- [ ] Smooth state transition
- [ ] Color change smooth
- [ ] Knob movement smooth
- [ ] Timing ~0.2-0.3s

### 6.3 Dropdown Open/Close
**Steps:**
1. Click dropdown/select menu
2. Watch options appear
3. Click option
4. Watch menu close

**Check for:**
- [ ] Dropdown slides down (or scales in)
- [ ] Options appear without jank
- [ ] Selection closes smoothly
- [ ] Timing ~0.15-0.2s for open/close

### 6.4 Toast/Notification
**Steps:**
1. Trigger notification (if possible - create task, delete item, etc.)
2. Watch toast appear
3. Watch auto-dismiss

**Check for:**
- [ ] Toast slides in from right
- [ ] Animation ~0.3s
- [ ] Auto-dismiss smooth (fade out)
- [ ] Multiple toasts stack properly

**Implementation Check:**
```css
/* From globals.css */
@keyframes slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
.animate-slide-in { animation: slide-in 0.3s ease-out; }
```

---

## Test Category 7: Scroll Animations

### 7.1 Smooth Scroll
**Steps:**
1. Scroll through any long page
2. Observe scroll smoothness
3. Check for jank

**Check for:**
- [ ] No stuttering during scroll
- [ ] Smooth 60fps (if possible to observe)
- [ ] Content moves fluidly
- [ ] No layout shift during scroll

### 7.2 Scroll-Triggered Animations (if implemented)
**Steps:**
1. Scroll through dashboard
2. Watch for elements animating on scroll
3. Check timing

**Check for:**
- [ ] Animations trigger at right point
- [ ] Timing appropriate (~0.3s)
- [ ] No lag or delay
- [ ] Multiple elements don't cause slowdown

---

## Test Category 8: Performance

### 8.1 Frame Rate Check
**Steps:**
1. Open Chrome DevTools (F12)
2. Go to Performance tab
3. Record animation (modal open, theme switch, scroll)
4. Play back and check

**Check for:**
- [ ] Green bars (60fps) - no red dropped frames
- [ ] FPS counter shows 50+ consistently
- [ ] GPU acceleration used (transform, opacity)
- [ ] No excessive repaints

**DevTools Console Check:**
```javascript
// Check what properties are animated
const el = document.querySelector('[class*="animate"]');
const style = window.getComputedStyle(el);
console.log('Animation:', style.animation);
console.log('Will-change:', style.willChange);
```

### 8.2 Reduced Motion
**Steps (if system supports):**
1. Enable system-level "Reduce Motion" (Windows: Settings → Ease of Access)
2. Or check DevTools: Settings → Rendering → "Emulate CSS media feature prefers-reduced-motion"
3. Test animations

**Check for:**
- [ ] Animations disabled (animation-duration: 0.01ms)
- [ ] App still functional
- [ ] No visual glitches
- [ ] All interactions still work

**Implementation Check (from globals.css):**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## Test Category 9: Cross-Browser

### 9.1 Chrome/Edge
- [ ] All animations smooth
- [ ] GPU acceleration working
- [ ] DevTools shows no warnings

### 9.2 Firefox
- [ ] Animations work (may use different rendering)
- [ ] Scrollbar styling works
- [ ] No jank

### 9.3 Safari (if available)
- [ ] Webkit-specific properties work
- [ ] Backdrop-filter working
- [ ] Touch animations smooth

---

## Issues to Watch For

| Issue | Evidence | Severity |
|-------|----------|----------|
| Janky/stuttery animations | DevTools shows dropped frames | HIGH |
| Missing animations | Element appears instantly | MEDIUM |
| Inconsistent timing | Some animations 0.1s, others 0.5s | MEDIUM |
| Abrupt transitions | Flash of unstyled content | HIGH |
| Not using GPU properties | `background-position` instead of `transform` | MEDIUM |
| Accessibility ignored | Reduced motion not working | HIGH |
| Flash on theme switch | Dark background flashes white | HIGH |
| Animation loops broken | Skeleton pulse stops animating | MEDIUM |

---

## Output Format

For each test, record:

```
| Animation | Location | Expected | Actual | Smooth? | Timing (obs) | Issue |
|-----------|----------|----------|--------|---------|--------------|-------|
```

Example:
```
| Button hover scale | Header buttons | Scale up 1.05x | Scale visible | PASS | 0.15s | None |
| Modal fade-in | Add Task modal | Fade + scale-in | Both visible | PASS | 0.25s | None |
| Dropdown open | Settings menu | Slide down smooth | Slight jank | FAIL | 0.2s | Check GPU accel |
```

---

## Final Checklist

- [ ] All fade-in animations smooth (0.2s)
- [ ] All hover animations smooth (0.15-0.2s)
- [ ] Page transitions smooth (no flash)
- [ ] Theme switch smooth (no flash)
- [ ] Modal animations working (open/close)
- [ ] Loading states animated (skeleton, spinner)
- [ ] Checkboxes animated
- [ ] Dropdowns smooth
- [ ] Toasts slide in/out
- [ ] Scroll smooth (60fps)
- [ ] Reduced motion respected
- [ ] No console errors during animations
- [ ] GPU acceleration used (transform, opacity)
- [ ] Cross-browser compatible

---

## Report Location

Save findings to: `.claude/reports/qa-animations-TIMESTAMP.md`

Use timestamp format: `YYYY-MM-DD-HH-MM-SS`
Example: `qa-animations-2026-01-31-14-30-45.md`
