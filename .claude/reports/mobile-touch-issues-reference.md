# Mobile Touch Interaction Issues - Reference Guide

Quick reference for common mobile touch problems and how to verify them.

---

## Common Mobile Touch Issues & How to Detect Them

### Issue 1: Touch Targets Too Small

**What:** Interactive elements less than 44×44px (44×44px is WCAG AA standard)

**How to Detect:**
```bash
agent-browser --session mobile-qa get box @e{button-ref}
# Output shows width/height
# FAIL if width < 44 or height < 44
```

**Visual Cue:** Hard to tap accurately, easy to miss

**Elements to Check:**
- Icon buttons (should be 44×44px minimum)
- Close buttons (X icon, should be 44×44px)
- Checkboxes (should be 44×44px)
- Radio buttons (should be 44×44px)
- Small action buttons

**Fix Approach:**
```jsx
// BAD
<button className="w-8 h-8 p-1">
  <Icon />
</button>

// GOOD
<button className="min-h-[44px] min-w-[44px] flex items-center justify-center">
  <Icon />
</button>
```

---

### Issue 2: Touch Targets Too Close Together

**What:** Less than 8px spacing between interactive elements

**How to Detect:**
```bash
agent-browser --session mobile-qa snapshot -i
# Visualize spacing between buttons
# FAIL if spacing < 8px
```

**Visual Cue:** Accidentally tapping adjacent button

**Elements to Check:**
- Buttons in a row
- Navigation items
- List item actions
- Form input buttons

**Fix Approach:**
```jsx
// BAD
<div className="flex gap-0">
  <button>Option A</button>
  <button>Option B</button>
</div>

// GOOD
<div className="flex gap-2">  {/* gap-2 = 8px */}
  <button>Option A</button>
  <button>Option B</button>
</div>
```

---

### Issue 3: Hover-Only Interactions

**What:** Actions only work on hover, not on touch

**How to Detect:**
- Visual: Action buttons only appear on hover
- Code: Check for `group-hover:` or `:hover` without `active:`

**Examples:**
- Delete button appears on hover (should appear on tap)
- Action menu appears on hover (should appear on touch)
- Edit button hidden until hover (should be visible)

**Visual Cue:** Button doesn't respond to tap, only appears when cursor hovers

**Fix Approach:**
```jsx
// BAD - Hover only
<div className="group">
  <div className="group-hover:block hidden">
    Delete button
  </div>
</div>

// GOOD - Touch + Hover
<div className="group">
  <div className="group-hover:block active:block hidden">
    Delete button
  </div>
</div>

// BETTER - Always visible on mobile
<div className="sm:hidden">
  Delete button (always visible on mobile)
</div>
<div className="hidden sm:group-hover:block">
  Delete button (hover only on desktop)
</div>
```

---

### Issue 4: Missing Touch Feedback

**What:** No visual feedback when button is pressed

**How to Detect:**
```bash
# Click button and look for:
# - Scale down (active:scale-95)
# - Color change (active:text-primary)
# - Background change (active:bg-bg/50)
# - Border change (active:border-primary)

agent-browser --session mobile-qa click @e{button-ref}
# Compare before/after
```

**Visual Cue:** Button doesn't change when tapped, feels unresponsive

**Elements to Check:**
- All buttons
- List items
- Navigation links
- Card click targets
- Form submit button

**Fix Approach:**
```jsx
// BAD - No feedback
<button className="px-4 py-2 bg-primary text-white rounded">
  Click me
</button>

// GOOD - Has feedback
<button className="px-4 py-2 bg-primary text-white rounded
  active:scale-95 active:bg-primary/80 transition-all">
  Click me
</button>

// STANDARD PATTERN
<button className="
  active:scale-95
  active:bg-bg/50
  active:text-primary
  transition-all
">
  Click me
</button>
```

---

### Issue 5: Keyboard Obscuring Input

**What:** Keyboard covers input field when tapped

**How to Detect:**
- On real device: Tap input field and see if keyboard covers it
- Code: Check if parent container has `overflow-auto`

**Visual Cue:** Can't see what you're typing

**Elements to Check:**
- Input fields near bottom of screen
- Textarea fields
- Search inputs in fixed position

**Fix Approach:**
```jsx
// BAD - No scroll container
<div>
  <input />  {/* Keyboard covers if at bottom */}
</div>

// GOOD - Scrollable container
<div className="overflow-auto">
  <input />  {/* Container scrolls to show input */}
</div>

// BETTER - Bottom padding for nav
<div className="pb-[120px]">  {/* 56px nav + buffer */}
  <input />  {/* Always visible above nav */}
</div>
```

---

### Issue 6: Scroll Issues

**What:** Scroll is janky, laggy, or non-responsive

**How to Detect:**
```bash
agent-browser --session mobile-qa scroll down 500
# Watch for:
# - Smooth motion
# - No stutter/jank
# - Responsive scrolling
```

**Visual Cue:** Scrolling feels stuttery, items jump around

**Root Causes:**
- Heavy JavaScript on scroll events
- Unoptimized images
- Too many DOM elements
- Missing `will-change: transform` on animated elements

**Fix Approach:**
```jsx
// BAD - Scroll handler causes jank
<div onScroll={() => expensiveCalculation()}>
  {items.map(item => <ComplexComponent key={item.id} item={item} />)}
</div>

// GOOD - Debounced scroll handler
<div onScroll={debounce(() => expensiveCalculation(), 150)}>
  {items.map(item => <MemoizedComponent key={item.id} item={item} />)}
</div>

// GOOD - Add momentum scrolling
<div className="-webkit-overflow-scrolling-touch overflow-auto">
  {items}
</div>
```

---

### Issue 7: Animation Too Slow/Fast

**What:** Panel/modal animations don't match documented timing

**How to Detect:**
- Visual: Count animation time (should be 300ms for panels, 150ms for buttons)
- Code: Check `duration-300` (300ms) or `duration-150` (150ms) in Tailwind

**Standards:**
- Panel slide: 300ms
- Button press: 150ms
- Fade in: 200ms

**Visual Cue:** Animation feels sluggish or too abrupt

**Fix Approach:**
```jsx
// BAD - Too slow
<div className="transition-transform duration-700">
  {/* Takes 700ms to slide - feels slow */}
</div>

// GOOD - Standard timing
<div className="transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
  {/* 300ms slide with proper easing */}
</div>

// BAD - No easing
<div className="transition-transform duration-300 linear">
  {/* Linear easing feels mechanical */}
</div>

// GOOD - Easing in
<div className="transition-transform duration-300 ease-in-out">
  {/* Ease in-out feels natural */}
</div>
```

---

### Issue 8: Layout Shift (CLS - Cumulative Layout Shift)

**What:** Content shifts when elements load/appear

**How to Detect:**
```bash
agent-browser --session mobile-qa screenshot before-load.png
agent-browser --session mobile-qa wait 1000
agent-browser --session mobile-qa screenshot after-load.png
# Compare: Did anything jump around?
```

**Visual Cue:** Text/buttons move when images or widgets load

**Root Causes:**
- Images without fixed dimensions
- Lazy-loaded content
- Widgets loading asynchronously

**Fix Approach:**
```jsx
// BAD - Image height unknown
<img src="..." />  {/* Page reflows when image loads */}

// GOOD - Fixed dimensions
<img src="..." width={400} height={300} />
<img src="..." className="w-96 h-64" />

// GOOD - Use placeholder/skeleton
<Skeleton width={400} height={300} />
<Suspense fallback={<Skeleton />}>
  <Image src="..." />
</Suspense>
```

---

### Issue 9: Gesture Not Working (Swipe, Pinch, etc.)

**What:** Swipe-to-dismiss or other gestures don't work

**How to Detect:**
- Visual: Try swiping, nothing happens
- Code: Check for touch event handlers

**Common Gestures in myBrain:**
- Swipe left on slide panel to close
- Swipe between views (iOS horizontal nav)
- Pull to refresh (if implemented)

**Visual Cue:** Gesture doesn't trigger expected action

**Fix Approach:**
```jsx
// BAD - No swipe handler
<div className="translate-x-full">
  {/* Doesn't respond to swipe */}
</div>

// GOOD - With swipe handler
<div
  className={`transition-transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
>
  {/* Responds to swipe */}
</div>

// Or use gesture library
import { useSwipe } from 'react-use-gesture';

function SwipePanel() {
  const [open, setOpen] = useState(false);
  const bind = useSwipe(({ direction }) => {
    if (direction[0] < 0) setOpen(false); // Swipe left
  });

  return <div {...bind}>{/* Panel */}</div>;
}
```

---

### Issue 10: Insufficient Contrast in Dark Mode

**What:** Text hard to read on dark background

**How to Detect:**
```bash
agent-browser --session mobile-qa set media dark
agent-browser --session mobile-qa reload
agent-browser --session mobile-qa screenshot
# Check: Can you read all text clearly?
```

**Visual Cue:** Text appears faded or low-contrast

**Common Problem Elements:**
- Primary text on semi-transparent backgrounds
- Secondary text that's too light
- Icons that are too light

**Fix Approach:**
```jsx
// BAD - Too light in dark mode
<div className="text-gray-400">
  {/* Hard to read on dark background */}
</div>

// GOOD - Adaptive colors
<div className="text-gray-700 dark:text-gray-200">
  {/* Readable in both light and dark */}
</div>

// GOOD - Using CSS variables
<div className="text-text dark:text-text-dark">
  {/* Automatically adjusts for theme */}
</div>
```

---

### Issue 11: Orientation Change Breaks Layout

**What:** Layout doesn't adapt when device rotates

**How to Detect:**
```bash
# Portrait
agent-browser --session mobile-qa set viewport 375 812
agent-browser --session mobile-qa screenshot portrait.png

# Landscape
agent-browser --session mobile-qa set viewport 812 375
agent-browser --session mobile-qa screenshot landscape.png

# Compare layouts - should both be readable
```

**Visual Cue:** Content gets cut off, overlaps, or overflows in landscape

**Fix Approach:**
```jsx
// BAD - Mobile only
<div className="grid grid-cols-1">
  {items.map(item => <Item key={item.id} item={item} />)}
</div>

// GOOD - Responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
  {items.map(item => <Item key={item.id} item={item} />)}
</div>

// GOOD - Responsive padding
<div className="p-4 sm:p-6 lg:p-8">
  {/* Padding adjusts based on screen size */}
</div>
```

---

### Issue 12: Input Field Label Not Clickable

**What:** Can't click label to focus input field

**How to Detect:**
- Visual: Try clicking label, nothing happens
- Code: Check `<label htmlFor="input-id">`

**Visual Cue:** Only the input itself is focusable, not the label

**Fix Approach:**
```jsx
// BAD - Label not connected to input
<label>Email:</label>
<input />

// GOOD - Label connected via htmlFor
<label htmlFor="email">Email:</label>
<input id="email" />

// GOOD - Label wraps input
<label>
  Email:
  <input />
</label>

// With Tailwind for larger touch area
<label htmlFor="email" className="block cursor-pointer p-2">
  Email:
  <input id="email" className="block w-full" />
</label>
```

---

## Quick Verification Checklist

For each interactive element, verify:

- [ ] **Size**: Get bounding box with `get box @e{ref}`
  - Buttons: >= 44×44px
  - Inputs: >= 44px height
  - List items: >= 48px height

- [ ] **Spacing**: Visual inspection with `snapshot`
  - Minimum 8px between targets
  - Check with Tailwind gap classes (gap-2 = 8px)

- [ ] **Feedback**: Click and visually verify
  - active:scale-95 (scales down)
  - active:bg-* (background changes)
  - active:text-* (text color changes)
  - transition-all (smooth transition)

- [ ] **Keyboard**: Tap input and verify
  - Focus state visible
  - Keyboard appears (on real device)
  - Field stays visible above keyboard

- [ ] **Scroll**: Test with `scroll` command
  - Smooth scrolling
  - No jank or stutter
  - Responsive to input

- [ ] **Animations**: Visual inspection
  - Panel slide: 300ms
  - Button press: 150ms
  - Proper easing (not linear)

---

## Testing Commands Reference

```bash
# Get element size
agent-browser --session mobile-qa get box @e{ref}

# Get text/content
agent-browser --session mobile-qa get text @e{ref}

# Check visibility
agent-browser --session mobile-qa is visible @e{ref}

# Click element
agent-browser --session mobile-qa click @e{ref}

# Fill input
agent-browser --session mobile-qa fill @e{ref} "text"

# Scroll
agent-browser --session mobile-qa scroll down 500

# Take screenshot
agent-browser --session mobile-qa screenshot 2026-01-31-test.png

# Check console
agent-browser --session mobile-qa console

# Get snapshot with refs
agent-browser --session mobile-qa snapshot -i
```

---

## When to Use Each Test

| Issue Type | Test to Run | Evidence Needed |
|------------|------------|-----------------|
| Touch target too small | `get box @e{ref}` | Width/height measurements |
| Spacing problem | `snapshot -i` + visual | Screenshot showing gap |
| No touch feedback | `click @e{ref}` + screenshot | Before/after comparison |
| Keyboard obscuring | Real device test | Video or screenshot |
| Scroll janky | `scroll down` + visual | Smooth vs. stuttery comparison |
| Animation wrong speed | Visual + CSS inspection | Duration value check |
| Layout shifts | Two screenshots with delay | Content position before/after |
| Gesture not working | Visual interaction test | Swipe attempt + result |
| Dark mode unreadable | `set media dark` + screenshot | Contrast visual check |
| Orientation broken | Two screenshots with viewport change | Layout comparison |

---

*Reference guide created: 2026-01-31*
*Use as quick lookup for mobile touch issue detection and fixes*
