# CSS Compliance Fixes - Quick Reference

## HIGH PRIORITY - Fix These First

### 1. dashboard-v2.css: Radar Blip Colors (Lines 1936-1938)

**Current:**
```css
.v2-radar-blip--task .v2-radar-blip-circle { fill: #3b82f6; }
.v2-radar-blip--event .v2-radar-blip-circle { fill: #10b981; }
.v2-radar-blip--note .v2-radar-blip-circle { fill: #f59e0b; }
```

**Fix:**
```css
.v2-radar-blip--task .v2-radar-blip-circle { fill: var(--v2-blue); }
.v2-radar-blip--event .v2-radar-blip-circle { fill: var(--v2-green); }
.v2-radar-blip--note .v2-radar-blip-circle { fill: var(--v2-orange); }
```

**Why:** Ensures radar view respects design system and theme switching

---

### 2. FocusHeroV2.css: Gradient Purple (Line 140)

**Current:**
```css
background: linear-gradient(90deg, var(--v2-accent-primary), #a855f7);
```

**Fix:**
```css
background: linear-gradient(90deg, var(--v2-accent-primary), var(--v2-purple));
```

**Why:** #a855f7 is not in the approved color palette; use v2-purple (#AF52DE)

---

### 3. dashboard-v2.css: Modal Gradient (Line 2076)

**Current:**
```css
background: linear-gradient(135deg, #00d4ff, #007AFF);
```

**Fix:**
```css
background: linear-gradient(135deg, var(--v2-teal), var(--v2-blue));
```

**Why:** Cyan (#00d4ff) is not in design system; teal is the approved light blue

---

## MEDIUM PRIORITY - Fix This Sprint

### 4. MetricCard.css: Dark Mode Text Colors (Lines 138, 143, 148)

**Current:**
```css
.dark .v2-metric-card__value {
  color: #E5E5E5;
}

.dark .v2-metric-card--danger .v2-metric-card__value {
  color: #FF6B6B;
}

.dark .v2-metric-card--success .v2-metric-card__value {
  color: #4ADE80;
}
```

**Option A (Best):** Create new color variables in theme.css:
```css
:root {
  --v2-danger-dark: #FF6B6B;
  --v2-success-dark: #4ADE80;
}

.dark .v2-metric-card__value {
  color: var(--v2-text-primary);
}

.dark .v2-metric-card--danger .v2-metric-card__value {
  color: var(--v2-danger-dark);
}

.dark .v2-metric-card--success .v2-metric-card__value {
  color: var(--v2-success-dark);
}
```

**Option B (Quick):** Just reference existing variables:
```css
.dark .v2-metric-card__value {
  color: var(--v2-text-primary);
}

/* Keep hardcoded for now if variable doesn't exist */
.dark .v2-metric-card--danger .v2-metric-card__value {
  color: #FF6B6B;  /* Could become var(--v2-danger-dark) later */
}
```

**Why:** Makes dark mode colors theme-aware and maintainable

---

### 5. All Files: Border Radius Standardization

**Pattern to fix (find all instances):**

```css
/* WRONG - Hardcoded values */
border-radius: 4px;
border-radius: 3px;
border-radius: 2px;
border-radius: 10px;

/* RIGHT - Use variables */
border-radius: var(--v2-radius-sm);    /* 6px */
border-radius: var(--v2-radius-md);    /* 10px */
border-radius: var(--v2-radius-lg);    /* 14px */
border-radius: var(--v2-radius-xl);    /* 18px */
```

**Files to fix:**
- ProductivityScore.css: lines 82, 90
- QuickActionButton.css: line 36
- NavItem.css: line 87
- ScheduleItem.css: line 212
- QuickStatCard.css: lines 171, 179
- TaskBadge.css: line 39
- BottomBarV2.css: line 86
- MetricCard.css: line 175
- FocusHeroV2.css: lines 133, 141

**Why:** Ensures consistent rounded corner style across all components

---

### 6. dashboard-v2.css: Remove !important from Dark Mode Colors (Lines 197-242)

**Current (example):**
```css
.dark .v2-task-name {
  color: #E5E5E5 !important;
}
```

**Better approach:** Use variables instead

```css
.dark .v2-task-name {
  color: var(--v2-text-primary);
}
```

**Why:** Variables are more maintainable and don't require !important

---

## LOW PRIORITY - Nice to Have

### 7. Standardize Spacing to Grid

**Pattern:**
```css
/* Non-grid values to replace */
padding: 2px 6px;     → var(--v2-spacing-xs) var(--v2-spacing-sm)
padding: 10px;        → var(--v2-spacing-md) or --v2-spacing-lg
gap: 2px;             → keep as-is (for text alignment) OR var(--v2-spacing-xs)
margin: 2px 0 0 0;    → var(--v2-spacing-xs) 0 0 0
```

**Files with spacing issues:**
- ScheduleItem.css: lines 211, 251
- ActivityLogEntry.css: line 20
- TaskBadge.css: line 36
- NavItem.css: line 86
- QuickStatCard.css: line 209

---

### 8. Font Size Consistency

**Consider standardizing to these sizes (defined in design-system.md):**
- 11px - captions (--v2-text-xs)
- 13px - labels (--v2-text-sm)
- 15px - body (--v2-text-md)
- 17px - subheadings (--v2-text-lg)
- 22px - section titles (--v2-text-xl)
- 28px - large headers (--v2-text-2xl)

**Files with arbitrary sizes:**
- BottomBarV2.css: 13px (OK - matches --v2-text-sm)
- ProductivityScore.css: 32px (metric hero - could define variable)
- QuickStatCard.css: 28px (matches --v2-text-2xl)
- Most files: 12px, 14px (between standard sizes - OK for UI)

---

## Testing After Fixes

### Visual Testing Checklist

- [ ] Radar view in light mode - colors correct
- [ ] Radar view in dark mode - colors correct and readable
- [ ] Focus hero gradient in light mode
- [ ] Focus hero gradient in dark mode
- [ ] Metric cards in dark mode - values readable
- [ ] All borders properly rounded (consistent style)
- [ ] Dark mode text contrast > 4.5:1

### Automated Testing

```bash
# After fixes, verify no remaining hardcoded colors in key files
grep -E "color:\s*#[0-9a-f]{6}" src/components/ui/*.css src/features/dashboard/components/*.css | grep -v "!important\|fallback"

# Verify border-radius uses variables
grep "border-radius:" src/components/ui/*.css | grep -v "var("
```

---

## Summary of Changes

| File | Type | Count | Priority |
|------|------|-------|----------|
| dashboard-v2.css | Color refs | 3 | HIGH |
| FocusHeroV2.css | Gradient color | 1 | HIGH |
| dashboard-v2.css | Gradient color | 1 | HIGH |
| MetricCard.css | Dark colors | 3 | MEDIUM |
| Multiple | Border radius | 8 | MEDIUM |
| Multiple | Spacing | 8 | LOW |
| Multiple | Font sizes | 30+ | LOW |

---

## Variables Reference

### Colors (Design System Approved)

```css
/* Primary palette */
--v2-blue: #007AFF
--v2-red: #FF3B30
--v2-green: #34C759
--v2-orange: #FF9500
--v2-purple: #AF52DE
--v2-pink: #FF2D55
--v2-teal: #5AC8FA
--v2-indigo: #5856D6

/* Text colors */
--v2-text-primary: #1C1C1E (light) / #E5E5E5 (dark)
--v2-text-secondary: #3C3C43 (light) / #A0A0A0 (dark)
--v2-text-tertiary: #8E8E93 (light) / #B0B0B0 (dark)

/* Backgrounds */
--v2-bg-primary: #F2F2F7 (light) / #121212 (dark)
--v2-bg-secondary: #FFFFFF (light) / #1A1A1A (dark)
--v2-bg-tertiary: #E5E5EA (light) / #242424 (dark)
--v2-bg-surface: #FFFFFF (light) / #1A1A1A (dark)

/* Borders */
--v2-separator: rgba(60,60,67,0.12) (light) / #2A2A2A (dark)
--v2-border-default: rgba(60,60,67,0.12) (light) / #383838 (dark)

/* Shadows */
--v2-shadow-sm: 0 1px 3px rgba(0,0,0,0.08) (light) / rgba(0,0,0,0.4) (dark)
--v2-shadow-md: 0 4px 12px rgba(0,0,0,0.08) (light) / rgba(0,0,0,0.5) (dark)
--v2-shadow-lg: 0 8px 24px rgba(0,0,0,0.12) (light) / rgba(0,0,0,0.5) (dark)
```

### Spacing Grid

```css
--v2-spacing-xs: 4px
--v2-spacing-sm: 8px
--v2-spacing-md: 12px
--v2-spacing-lg: 16px
--v2-spacing-xl: 20px
--v2-spacing-2xl: 24px
```

### Border Radius (Apple Continuous Curves)

```css
--v2-radius-sm: 6px
--v2-radius-md: 10px
--v2-radius-lg: 14px
--v2-radius-xl: 18px
--v2-radius-full: 9999px
```

---

## Estimated Time to Complete

| Priority | Tasks | Est. Time |
|----------|-------|-----------|
| HIGH | 3 color fixes | 15 min |
| MEDIUM | 18 issues (colors, radius, spacing) | 45 min - 1 hr |
| LOW | 89+ issues (fonts, misc spacing) | 2-3 hrs |
| **TOTAL** | **All fixes** | **3-5 hours** |

---

*Report generated: 2026-01-31*
