# CSS Variable Compliance Audit - Quick Summary

**Date:** 2026-01-31

## Overall Status: GOOD ✓

The myBrain-web codebase demonstrates good compliance with the V2 design system. Most components correctly use CSS variables with proper fallbacks.

---

## Key Findings

### 5 HIGH SEVERITY Issues

These affect visual consistency and should be fixed:

1. **Radar View Colors** (dashboard-v2.css lines 1936-1938)
   - Using hardcoded colors instead of V2 variables
   - Impact: Radar blips may not match design system
   - Fix: Use `var(--v2-blue)`, `var(--v2-green)`, `var(--v2-orange)`

2. **Focus Hero Gradient** (FocusHeroV2.css line 140)
   - Using `#a855f7` instead of `var(--v2-purple)`
   - Impact: Color may not match theme
   - Fix: Replace with `var(--v2-purple)`

3. **Modal Gradient** (dashboard-v2.css line 2076)
   - Using `#00d4ff` (cyan not in design system)
   - Impact: Cyan is not approved color
   - Fix: Use blue and purple from palette

### 18 MEDIUM SEVERITY Issues

These improve consistency but don't break functionality:

- Dark mode text color overrides use hardcoded colors (consider using var())
- Some border-radius values hardcoded (should use var(--v2-radius-*))
- Arbitrary spacing values like 2px, 6px, 10px (should use 4px, 8px, 12px grid)

### 89+ LOW SEVERITY Issues

Mostly acceptable font sizes and component-specific spacing:
- Font sizes: 11px-14px range (acceptable)
- Gaps: 2px in labels (acceptable for alignment)
- Padding: 2px, 6px in badges (acceptable)

---

## By The Numbers

| Metric | Count |
|--------|-------|
| Files with issues | 10/16 |
| Hardcoded colors | 87 (many are variable fallbacks) |
| Hardcoded spacing | 45+ |
| Hardcoded font sizes | 30+ |
| Border radius issues | 12 |
| **HIGH severity** | 5 |
| **MEDIUM severity** | 18 |
| **LOW severity** | 89+ |

---

## Recommended Actions

### Immediate (This Week)
- [ ] Fix 5 HIGH severity radar and gradient colors
- [ ] Test radar view in light and dark mode
- [ ] Test focus hero gradient in both modes

### Short Term (This Sprint)
- [ ] Standardize border-radius to use variables
- [ ] Fix dark mode text color overrides to use var()
- [ ] Standardize small padding/gap values to grid

### Long Term (Next Sprint)
- [ ] Audit all font sizes and use type scale
- [ ] Convert arbitrary spacing to grid values
- [ ] Update fallback colors to be consistent

---

## Files with Most Issues

1. **dashboard-v2.css** (23 issues) - Main dashboard stylesheet
2. **QuickStatCard.css** (4 issues) - Font size inconsistencies
3. **ScheduleItem.css** (4 issues) - Spacing inconsistencies
4. **MetricCard.css** (4 issues) - Dark mode color hardcoding

---

## Best Practices to Follow

✓ **DO:**
- Use `var(--v2-*)` for all theme-aware properties
- Include fallback values in var(): `var(--v2-blue, #007AFF)`
- Use spacing grid: 4px, 8px, 12px, 16px, 20px, 24px
- Use border radius variables: --v2-radius-sm (6px), --v2-radius-md (10px), etc.
- Use typography scale: 11px, 13px, 15px, 17px, 22px, 28px

✗ **DON'T:**
- Hardcode colors like `#3b82f6` when `var(--v2-blue)` exists
- Use arbitrary spacing like `10px`, `7px`, `13px`
- Use arbitrary border-radius like `3px` when scale goes `6px, 10px, 14px, 18px`
- Hardcode text colors in dark mode (use var() instead)
- Use colors not in the design system (like `#00d4ff` cyan)

---

## Design System Reference

**Color Variables:** `--v2-blue`, `--v2-red`, `--v2-green`, `--v2-orange`, `--v2-purple`, `--v2-pink`, `--v2-teal`, `--v2-indigo`

**Text Colors:** `--v2-text-primary` (#E5E5E5 dark, #1C1C1E light), `--v2-text-secondary`, `--v2-text-tertiary`

**Spacing:** `--v2-spacing-xs` (4px), `-sm` (8px), `-md` (12px), `-lg` (16px), `-xl` (20px), `-2xl` (24px)

**Border Radius:** `--v2-radius-sm` (6px), `-md` (10px), `-lg` (14px), `-xl` (18px), `-full` (9999px)

**Shadows:** `--v2-shadow-sm`, `-md`, `-lg`

---

## Full Report

For detailed findings, see: **qa-css-compliance-2026-01-31.md**

---

*Audit completed: 2026-01-31 | Total time to fix: ~3-5 hours*
