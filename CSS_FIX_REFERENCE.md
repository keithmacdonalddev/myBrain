# Button Spacing Fix - CSS Reference Guide

**File:** `myBrain-web/src/features/dashboard/components/FocusHeroV2.css`

---

## Current Code (Lines 160-182)

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
}
```

---

## Fixed Code (Option A - Minimal Change)

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
  flex-shrink: 0;  /* ← ADD THIS LINE */
}
```

---

## Fixed Code (Option B - With Min Width)

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
  flex-shrink: 0;        /* ← ADD THIS LINE */
  min-width: 75px;       /* ← ADD THIS LINE (optional) */
}
```

---

## Enhanced Fix with Mobile Support (Option C)

Replace the entire `.v2-btn` rule and add media query:

```css
/* Button styling */
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
  flex-shrink: 0;        /* ← ADD THIS */
  min-width: 75px;       /* ← ADD THIS */
}

/* Mobile optimization - stack buttons if needed */
@media (max-width: 640px) {
  .v2-current-task-actions {
    flex-wrap: wrap;
    gap: var(--v2-spacing-sm);
  }

  .v2-current-task-actions .v2-btn {
    flex: 0 1 calc(33.333% - 8px);
    justify-content: center;
  }
}

/* Very small screens - full width buttons */
@media (max-width: 380px) {
  .v2-current-task-actions {
    flex-direction: column;
    gap: var(--v2-spacing-md);
  }

  .v2-current-task-actions .v2-btn {
    width: 100%;
    min-width: unset;
  }
}
```

---

## Visual Comparison

### Before Fix (Broken)
```
┌─────────────────────────────────┐
│ CompletePause Skip              │  ← Text overlapped
└─────────────────────────────────┘
```

### After Fix - Option A/B (Works)
```
┌─────────────────────────────────┐
│ ✓ Complete  ⏸ Pause  → Skip     │  ← Properly spaced
└─────────────────────────────────┘
```

### After Fix - Option C Mobile (Better UX)
```
On mobile (< 640px):
┌──────────────┐
│ ✓ Complete   │
├──────────────┤
│ ⏸ Pause      │
├──────────────┤
│ → Skip       │
└──────────────┘

Or wrap:
┌─────────────────────────────────┐
│ ✓ Complete  ⏸ Pause             │
├─────────────────────────────────┤
│ → Skip                          │
└─────────────────────────────────┘
```

---

## Which Option to Choose?

| Option | Pros | Cons | When to Use |
|--------|------|------|------------|
| A (Minimal) | Simple, minimal changes | Only fixes width issue | Quick fix needed |
| B (Min Width) | Adds safety margin | Slightly more CSS | Preferred for consistency |
| C (Full Mobile) | Best UX, responsive | More CSS code | Best long-term solution |

**Recommendation:** Start with Option B (minimal + min-width), test on mobile. If UX needs improvement, upgrade to Option C.

---

## Testing Checklist

After applying fix:

- [ ] Desktop (> 768px): Buttons display horizontally with proper spacing
- [ ] Tablet (480-768px): Buttons visible without overlap
- [ ] Mobile (320-480px): Buttons readable (Option A/B might need Option C)
- [ ] Very small (< 320px): If using Option C, buttons stack properly
- [ ] All button states work:
  - [ ] Complete button clickable
  - [ ] Pause button clickable
  - [ ] Skip button clickable
- [ ] Hover effects still work
- [ ] Icons display correctly
- [ ] Text is clearly readable

---

## Files to Modify

Only ONE file needs changes:

```
myBrain-web/src/features/dashboard/components/FocusHeroV2.css
Lines: 160-182 (add flex-shrink: 0)
Optional: Add media queries after line 182
```

No JavaScript changes needed.
No HTML changes needed.
No other files affected.

