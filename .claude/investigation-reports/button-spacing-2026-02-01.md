# Button Spacing Investigation Report

**Date:** 2026-02-01  
**Status:** Root Cause Identified  
**Severity:** Medium (Visual bug on mobile)

---

## Issue Summary

**Problem:** Buttons in "Currently Working On" section display as "CompletePause Skip" instead of three separate buttons

**Location:** 
- Live site: https://my-brain-gules.vercel.app (Dashboard)
- Component: FocusHeroV2 section

**Root Cause:** Missing `flex-shrink: 0` CSS property on button elements

---

## Technical Analysis

### Missing CSS Property

**File:** `myBrain-web/src/features/dashboard/components/FocusHeroV2.css`  
**Lines:** 160-182

The `.v2-btn` class is missing `flex-shrink: 0`:

```css
.v2-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: var(--v2-spacing-sm) var(--v2-spacing-md);
  white-space: nowrap;
  
  /* ❌ MISSING: flex-shrink: 0; */
}
```

### Why This Causes Overlap

**Mobile screen (320px):**
1. Available width for buttons: ~224px
2. Buttons need to display: ~264px (3 buttons + gaps)
3. Without `flex-shrink: 0`, buttons compress to fit
4. Text gets squished horizontally
5. Result: "CompletePause Skip" (overlapped text)

### CSS Conflict in Project

Two stylesheets define button styles with different class names:

| File | Class Name | Has flex-shrink |
|------|-----------|-----------------|
| FocusHeroV2.css | `.v2-btn` | ❌ No |
| dashboard-v2.css | `.v2-action-btn--primary` | ✓ Yes |

Component uses `.v2-btn` class, so FocusHeroV2.css rules apply (incomplete).

---

## The Fix

### Add Missing CSS Property

In `FocusHeroV2.css`, update the `.v2-btn` rule around line 174:

```css
.v2-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: var(--v2-spacing-sm) var(--v2-spacing-md);
  border: none;
  border-radius: var(--v2-radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;        /* ADD THIS */
  min-width: 75px;       /* OPTIONAL */
}
```

---

## Related Files

| File | Role | Issue |
|------|------|-------|
| FocusHeroV2.jsx | Component JSX | Uses `.v2-btn` classes |
| FocusHeroV2.css | Component CSS | Missing flex-shrink property |
| dashboard-v2.css | Global CSS | Has correct styles (wrong class name) |

---

## Verification in Browser

To confirm the bug:

1. Open https://my-brain-gules.vercel.app
2. Log in
3. Press F12 (Developer Tools)
4. Right-click "Complete" button → Inspect
5. Look at `.v2-btn` CSS rule
6. Check if `flex-shrink` property is present
   - **Missing:** Bug confirmed
   - **Has value:** Already fixed

---

## Impact

- **Devices:** Mobile/Tablet (< 768px width)
- **Scope:** Currently Working On section buttons only
- **Users affected:** Mobile users
- **Severity:** Medium (visual, affects usability)
- **Fix time:** < 5 minutes

