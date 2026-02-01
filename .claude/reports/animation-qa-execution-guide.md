# Animation QA Testing - Execution Guide

**Test Date:** 2026-01-31
**Tester:** Claude Agent
**Test Environment:** Local (http://localhost:5173) & Production (https://my-brain-gules.vercel.app)

---

## Quick Start

### Open DevTools Console Commands

Use these in Chrome DevTools console (F12 → Console tab) to inspect animations:

```javascript
// Check animation on any element
function checkAnimation(selector = 'button') {
  const el = document.querySelector(selector);
  if (!el) return console.log('Element not found');
  const style = window.getComputedStyle(el);
  console.log('Element:', selector);
  console.log('Animation:', style.animation);
  console.log('Duration:', style.animationDuration);
  console.log('Timing Function:', style.animationTimingFunction);
  console.log('Transition:', style.transition);
}

// Check multiple animations
function listAnimations() {
  const animated = document.querySelectorAll('[class*="animate"]');
  console.log(`Found ${animated.length} animated elements`);
  animated.forEach((el, i) => {
    const style = window.getComputedStyle(el);
    console.log(`${i}: ${el.className} → ${style.animation}`);
  });
}

// Check theme transition
function checkThemeTransition() {
  const style = window.getComputedStyle(document.documentElement);
  console.log('Theme transition:', style.transition);
}

// Check for reduced motion
function checkReducedMotion() {
  const pref = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  console.log('Prefers reduced motion:', pref);
}
```

---

## Test Execution Steps

### Phase 1: Fade-In Animations (10 minutes)

**1.1 Dashboard Load**
1. Go to: http://localhost:5173/dashboard
2. Open DevTools Console
3. Hard refresh (Ctrl+Shift+R)
4. **WATCH:** Widgets fade in with slight upward movement
5. Run console: `listAnimations()`
6. **Record:**
   - [ ] Do widgets fade in smoothly? (Y/N)
   - [ ] Timing (estimate): ___ms
   - [ ] Any flashing/popping? (Y/N)
   - [ ] Staggered (appear one-by-one)? (Y/N)
7. Take screenshot during load animation

**Expected Animation:**
- Class: `animate-fade-in`
- Duration: 0.2s
- Easing: ease-out
- Properties: opacity 0→1, translateY(-4px)→0

---

### Phase 2: Hover Animations (15 minutes)

**2.1 Button Hover**
1. Find any blue button on page
2. **HOVER:** Mouse over button
3. **OBSERVE:**
   - Does color/brightness change?
   - Does shadow change?
   - Does button scale/lift?
4. Console: `checkAnimation('button')`
5. **Record Observations:**
   - [ ] Visual feedback visible? (Y/N)
   - [ ] Transition smooth? (Y/N)
   - Transition timing: ___ms
   - [ ] No jumping/stuttering? (Y/N)
6. Try **FOCUS** with Tab key - verify focus ring visible

**Expected Behavior:**
- Transition: ~0.15s ease-out
- Properties: transform, box-shadow, or background-color
- Focus state: 2px outline in primary color

**2.2 Card Hover (Lift Effect)**
1. Find a card element (dashboard widget, project card, etc.)
2. **HOVER:** Move mouse over card
3. **OBSERVE:**
   - Card lifts/elevates slightly?
   - Shadow increases?
   - Background changes slightly?
4. Console: `checkAnimation('[class*="card"]')`
5. **Record:**
   - [ ] Lift visible (translateY up)? (Y/N)
   - [ ] Shadow increases? (Y/N)
   - [ ] Smooth transition? (Y/N)
   - Timing: ___ms

**Expected:**
- Transform: translateY(-1px to -4px)
- Box-shadow: card → elevated
- Duration: 0.2s

**2.3 Navigation Items**
1. Hover over nav items (sidebar or top nav)
2. **OBSERVE:** Background/text color change
3. Console: `checkAnimation('[class*="nav"]')`
4. **Record:**
   - [ ] Color transition smooth? (Y/N)
   - [ ] No harsh flash? (Y/N)
   - Timing: ___ms

---

### Phase 3: Page Transitions (10 minutes)

**3.1 Navigation Between Pages**
1. On Dashboard, click → Tasks (or any other nav link)
2. **OBSERVE:** Page content swap
3. **WATCH FOR:**
   - No white/unstyled flash?
   - Content appears smoothly?
   - Old content disappears gracefully?
4. **Record:**
   - [ ] Smooth transition? (Y/N)
   - [ ] Any flash of unstyled content? (Y/N)
   - Transition appearance: _____________

**3.2 Theme Toggle**
1. Find theme toggle (usually top-right corner)
2. Click: Light → Dark
3. **CAREFULLY OBSERVE:**
   - Colors transition together?
   - Text readable during transition?
   - No harsh white/black flash?
4. Click: Dark → Light
5. Repeat observation
6. Console: `checkThemeTransition()`
7. **Record:**
   - [ ] Smooth color transition? (Y/N)
   - [ ] No flash observed? (Y/N)
   - [ ] Text readable in light mode? (Y/N - check contrast)
   - [ ] Text readable in dark mode? (Y/N - check contrast)
   - Duration: ___ms
   - **Specific elements to check:**
     - [ ] Background color smooth
     - [ ] Text color smooth
     - [ ] Borders smooth
     - [ ] Card backgrounds smooth
     - [ ] Shadows adjust

---

### Phase 4: Modal Animations (10 minutes)

**4.1 Modal Open**
1. Find button that opens modal (look for "Add", "New", "Create", "Edit" button)
2. Click button
3. **WATCH:**
   - Modal fade in?
   - Modal scale in (starts small, grows to full size)?
   - Backdrop fades behind modal?
4. Console: `checkAnimation('[role="dialog"]')`
5. **Record:**
   - [ ] Fade-in visible? (Y/N)
   - [ ] Scale-in visible? (Y/N)
   - [ ] Backdrop appears? (Y/N)
   - Timing (both fade & scale): ___ms
   - Easing: _____________

**4.2 Modal Close**
1. Close modal (close button, X, press Escape)
2. **WATCH:** Modal disappear animation
3. **Record:**
   - [ ] Fade-out smooth? (Y/N)
   - [ ] No abrupt disappear? (Y/N)
   - [ ] Backdrop fades? (Y/N)
   - Timing: ___ms

**Expected Animations:**
- Open: animate-scale-in 0.15s ease-out
- Close: animate-scale-out 0.1s ease-in

---

### Phase 5: Loading Animations (10 minutes)

**5.1 Skeleton Pulse**
1. Trigger loading state if possible (reload page, navigate with slow network)
2. Look for skeleton loaders (gray animated boxes)
3. **OBSERVE:** Shimmer animation (left-to-right sweep)
4. Console: `checkAnimation('.skeleton')`
5. **Record:**
   - [ ] Shimmer animation visible? (Y/N)
   - [ ] Smooth pulse/sweep? (Y/N)
   - [ ] No jarring jumps? (Y/N)
   - Timing: ___ms per cycle
   - Direction: Left→Right? (Y/N)

**Expected:**
- Animation: shimmer
- Duration: 1.5s infinite
- Background-position: -200% → 200%

**5.2 Loading Spinner**
1. Find any loading spinner (rotating circle)
2. **OBSERVE:** Rotation smoothness
3. **Record:**
   - [ ] Smooth rotation? (Y/N)
   - [ ] Consistent speed? (Y/N)
   - [ ] No stutter/pause? (Y/N)
   - Timing: ___RPM (estimate)

---

### Phase 6: Micro-Interactions (15 minutes)

**6.1 Checkbox Click**
1. Find checkbox in task list
2. **CLICK:** Check the checkbox
3. **CAREFULLY WATCH:**
   - Checkmark appears with animation?
   - Bounce effect?
   - Text gets strike-through?
4. Uncheck and observe reverse
5. Console: `checkAnimation('input[type="checkbox"]')`
6. **Record:**
   - [ ] Checkmark animated? (Y/N)
   - [ ] Bounce animation? (Y/N)
   - [ ] Strike-through animated? (Y/N)
   - Timing: ___ms
   - Smooth? (Y/N)

**Expected:**
- Animation: check-bounce
- Duration: 0.3s ease-out
- Scale: 1 → 0.85 → 1.1 → 1

**6.2 Dropdown Open/Close**
1. Click any dropdown or select
2. **OBSERVE:** Options appear
3. **RECORD:**
   - [ ] Slides down smooth? (Y/N)
   - [ ] No jank? (Y/N)
   - Timing: ___ms
4. Click option to close
5. **RECORD:**
   - [ ] Closes smoothly? (Y/N)
   - Timing: ___ms

**6.3 Toast Notification**
1. Trigger notification (e.g., create task, delete item, save change)
2. **WATCH:** Toast slide in from right
3. **RECORD:**
   - [ ] Slides in smooth? (Y/N)
   - Timing: ___ms
   - [ ] Auto-dismisses with animation? (Y/N)
   - Dismiss timing: ___ms

**Expected:**
- Open animation: slide-in 0.3s ease-out
- Close animation: slide-down or fade-out 0.25s

---

### Phase 7: Scroll Animations (5 minutes)

**7.1 Scroll Smoothness**
1. Scroll through dashboard or long page
2. **OBSERVE:** Scroll smoothness
3. **RECORD:**
   - [ ] No stuttering? (Y/N)
   - [ ] Smooth 60fps feel? (Y/N)
   - [ ] No layout shift? (Y/N)

**7.2 DevTools Performance Check (Optional)**
1. Open DevTools → Performance tab
2. Click Record
3. Perform an animation (modal open, theme switch)
4. Stop recording
5. **OBSERVE:** Green bars (60fps) vs red (dropped frames)
6. **RECORD:**
   - FPS Range: ___fps
   - Dropped frames? (Y/N)
   - GPU acceleration (check Timeline)?

---

### Phase 8: Accessibility - Reduced Motion (5 minutes)

**8.1 System Preference Check**
1. Windows: Settings → Ease of Access → Display → Show animations
2. Or Chrome DevTools: F12 → ⋮ → More tools → Rendering → Emulate CSS media feature `prefers-reduced-motion`
3. **Enable "prefers-reduced-motion"**
4. Reload page
5. **OBSERVE:** Animations should be removed
6. Console: `checkReducedMotion()`
7. **RECORD:**
   - [ ] Animations disabled? (Y/N)
   - [ ] App still functional? (Y/N)
   - [ ] No glitches? (Y/N)
   - Can still interact with all elements? (Y/N)

**Expected:**
- animation-duration: 0.01ms (effectively instant)
- transition-duration: 0.01ms
- All animations should complete immediately

---

## Comprehensive Test Results Table

Fill in as you test each animation:

| Animation | Location | Expected Behavior | Observed Behavior | Smooth? | Timing (observed) | Issue Found |
|-----------|----------|-------------------|-------------------|---------|------------------|-------------|
| Fade-in | Dashboard widgets | 0.2s fade + rise | | PASS/FAIL | ___ms | |
| Button hover | All buttons | Color/shadow change | | PASS/FAIL | ___ms | |
| Card lift | Dashboard cards | Translate up + shadow | | PASS/FAIL | ___ms | |
| Nav hover | Navigation | BG color transition | | PASS/FAIL | ___ms | |
| Page transition | Navigation | Smooth content swap | | PASS/FAIL | ___ms | |
| Theme switch | Header toggle | All colors transition | | PASS/FAIL | ___ms | |
| Modal open | Add Task | Scale in + fade | | PASS/FAIL | ___ms | |
| Modal close | Modal | Scale out + fade | | PASS/FAIL | ___ms | |
| Skeleton pulse | Loading states | Shimmer animation | | PASS/FAIL | ___ms | |
| Spinner | Loading | Smooth rotation | | PASS/FAIL | ___ms | |
| Checkbox | Task checkbox | Check bounce animation | | PASS/FAIL | ___ms | |
| Dropdown open | Dropdowns | Slide down smooth | | PASS/FAIL | ___ms | |
| Dropdown close | Dropdowns | Close smooth | | PASS/FAIL | ___ms | |
| Toast in | Notifications | Slide in right | | PASS/FAIL | ___ms | |
| Toast dismiss | Notifications | Fade/slide out | | PASS/FAIL | ___ms | |
| Scroll | Any long page | Smooth 60fps | | PASS/FAIL | ___fps | |
| Reduced motion | All animations | Animations disabled | | PASS/FAIL | ___ms | |

---

## Common Issues & How to Identify Them

### Janky/Stuttery Animation
**Signs:**
- Animation appears to skip frames
- Visible pause/stutter during animation
- Jerky movement instead of smooth
**Check:**
```javascript
// DevTools Performance tab
// Look for: Red bars in timeline = dropped frames
// FPS counter should show 50+ fps
```

### Missing Animation
**Signs:**
- Element appears instantly (no fade/slide)
- No visual transition
- Abrupt state change
**Check:**
```javascript
checkAnimation('selector')
// If no animation property shown, animation missing
```

### Inconsistent Timing
**Signs:**
- Different animations have vastly different speeds
- Same animation type varies in duration
- Doesn't match design spec
**Check:**
```javascript
// Compare observed timing to design specs:
// - Micro-interactions: 100-150ms
// - State changes: 200ms
// - Large transitions: 300ms
```

### Flash of Unstyled Content (FOUC)
**Signs:**
- White flash when switching pages
- Style loads visibly late
- Dark/light theme flashes
**Check:**
- Theme switch: Should see smooth gradient, not flash
- Page nav: Content should not blank out

### Not GPU Accelerated
**Signs:**
- Jank during animation + scroll
- High CPU usage (DevTools)
- Dropping many frames
**Check:**
```javascript
// Should use: transform, opacity (GPU)
// Not: left, top, width, height, background-position (CPU)
const style = window.getComputedStyle(el);
console.log(style.transform); // Should not be 'none'
```

---

## Photo/Screenshot Evidence Guide

Take screenshots at these moments:

1. **Widget fade-in** - During dashboard load (mid-animation)
2. **Button hover** - Mouse over button, before and after
3. **Card lift** - Card in hover state
4. **Theme dark** - Page in dark mode
5. **Theme light** - Page in light mode
6. **Modal open** - Modal during open animation
7. **Reduced motion** - Page with animations disabled
8. **DevTools Performance** - FPS graph showing 60fps
9. **Console check** - Results of animation checks

Save all screenshots to: `.claude/design/screenshots/verify/animations/`

Format filename: `YYYY-MM-DD-[description].png`
Example: `2026-01-31-dashboard-fade-in-animation.png`

---

## Final Checklist

- [ ] Phase 1: Fade-in animations tested
- [ ] Phase 2: Hover animations tested
- [ ] Phase 3: Page transitions tested
- [ ] Phase 4: Modal animations tested
- [ ] Phase 5: Loading animations tested
- [ ] Phase 6: Micro-interactions tested
- [ ] Phase 7: Scroll animations tested
- [ ] Phase 8: Accessibility tested
- [ ] All results recorded in table above
- [ ] Screenshots collected
- [ ] Report generated

---

## Report Generation

Once testing is complete:
1. Fill in all observations in tables above
2. Note any issues found with evidence
3. Save this guide with completed data
4. Create summary report with findings
5. Include severity/priority for any issues
