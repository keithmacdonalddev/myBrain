# Button Spacing Issue Investigation Report

**Date:** 2026-02-01
**Issue:** Buttons in "Currently Working On" section show as "CompletePause Skip" (overlapping text instead of three separate buttons)

---

## Root Cause Analysis

### The CSS Problem: Two conflicting stylesheets

The project has **TWO separate CSS definitions** for the `.v2-current-task` and button styles:

1. **FocusHeroV2.css** (Component-specific styles)
2. **dashboard-v2.css** (Global dashboard styles)

These stylesheets define conflicting button styling and container layout.

---

## Detailed CSS Findings

### File 1: FocusHeroV2.css (Lines 85-170)

**Container styling:**
```css
.v2-current-task-actions {
  display: flex;
  gap: var(--v2-spacing-md);
  flex-shrink: 0;
}
```

**Button styling:**
```css
.v2-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: var(--v2-spacing-sm) var(--v2-spacing-md);
  white-space: nowrap;
}
```

**Issue:** Buttons lack `flex-shrink: 0`, allowing them to compress when space is tight.

---

### File 2: dashboard-v2.css (Lines 2311-2360)

Defines `.v2-current-task__actions` and `.v2-action-btn--*` classes (different naming).

**Mobile breakpoint issue (max-width: 768px):**
```css
.v2-current-task__actions {
  justify-content: stretch;  /* Stretches buttons */
}
.v2-current-task__actions button {
  flex: 1;  /* Makes buttons expand */
}
```

---

## HTML vs CSS Name Mismatch

**Component uses:**
- Class: `.v2-current-task-actions` (with dash)
- Button class: `.v2-btn v2-btn-success`

**CSS defines:**
- Class: `.v2-current-task__actions` (with double underscore)
- Button class: `.v2-action-btn--primary` (with double dash)

**Result:** Class name mismatch means the global dashboard-v2.css styles may not apply correctly to the FocusHeroV2 component.

---

## Width Calculation Problem

**Estimated minimum widths:**
- Complete button: ~90px
- Pause button: ~80px  
- Skip button: ~70px
- Gaps (2 × 12px): 24px
- **Total needed: ~264px**

**Available on mobile (320px device):**
- Dashboard width: 320px - 48px padding = 272px
- Actually available: ~256px

**Result:** Buttons barely fit or overflow, causing text compression and overlap.

---

## Why "CompletePause Skip" Appears

When container is too narrow:
1. Buttons have `white-space: nowrap` (text won't wrap)
2. Buttons lack `flex-shrink: 0` in some CSS rules
3. Flex algorithm compresses button widths excessively
4. Icon + text get squished together
5. Text appears overlapped: "CompletePause Skip"

---

## Next Steps

1. **Open browser dev tools** (F12) on https://my-brain-gules.vercel.app
2. **Log in and inspect the Complete button**
3. **Check computed CSS:**
   - What is the actual class name being applied?
   - What is the actual padding value?
   - What is the container width?
   - What is `flex-shrink` set to?
4. **Take screenshot** showing:
   - Inspector with button element highlighted
   - Styles panel showing applied CSS rules
   - Computed panel showing actual widths/paddings

---

## Files Involved

- `myBrain-web/src/features/dashboard/components/FocusHeroV2.jsx`
- `myBrain-web/src/features/dashboard/components/FocusHeroV2.css`
- `myBrain-web/src/features/dashboard/styles/dashboard-v2.css`

The issue is most likely in **FocusHeroV2.css** - missing `flex-shrink: 0` on buttons and/or container width being too narrow.

