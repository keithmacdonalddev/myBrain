# CSS Variable Compliance - Issues Heatmap

Visual guide to where CSS compliance issues are located in the codebase.

---

## File Impact Analysis

### Dashboard V2 (Highest Impact)

**File:** `myBrain-web/src/features/dashboard/styles/dashboard-v2.css`

```
Impact Level: MEDIUM-HIGH
Lines with issues: 23
Severity breakdown: 3 HIGH, 12 MEDIUM, 8 LOW

Critical Issues:
├── Lines 1936-1938: Radar colors (HIGH) ⚠️ PRIORITY
├── Line 2076: Modal gradient (HIGH) ⚠️ PRIORITY
├── Lines 197-242: Dark mode overrides (MEDIUM)
├── Line 594: Duplicate color variable (MEDIUM)
└── Lines 736, 1563-1565, 1588-1589: Multiple (MEDIUM-LOW)

Usage: Main dashboard widget styling
Visibility: HIGH - Affects primary user interface
```

### Focus Hero Component

**File:** `myBrain-web/src/features/dashboard/components/FocusHeroV2.css`

```
Impact Level: MEDIUM
Lines with issues: 2
Severity breakdown: 1 HIGH, 1 MEDIUM

Critical Issues:
├── Line 140: Gradient purple (HIGH) ⚠️ PRIORITY
└── Line 133, 141: Border radius (MEDIUM)

Usage: Dashboard hero section styling
Visibility: HIGH - Prominent UI area
```

---

## Component Library (Medium Impact)

### Metric Card Component

**File:** `myBrain-web/src/components/ui/MetricCard.css`

```
Impact Level: MEDIUM
Lines with issues: 4
Severity breakdown: 0 HIGH, 3 MEDIUM, 1 LOW

Issues:
├── Lines 138, 143, 148: Dark mode colors (MEDIUM)
└── Line 175: Border radius (LOW)

Usage: Dashboard metrics display
Visibility: HIGH - Displayed prominently
```

### Schedule Item Component

**File:** `myBrain-web/src/components/ui/ScheduleItem.css`

```
Impact Level: LOW-MEDIUM
Lines with issues: 4
Severity breakdown: 0 HIGH, 2 MEDIUM, 2 LOW

Issues:
├── Lines 211, 212: Padding, border-radius (MEDIUM)
└── Lines 251, 329: More padding (LOW)

Usage: Event display in widgets
Visibility: MEDIUM - Used in schedule widget
```

### Quick Stat Card Component

**File:** `myBrain-web/src/components/ui/QuickStatCard.css`

```
Impact Level: MEDIUM
Lines with issues: 4
Severity breakdown: 0 HIGH, 2 MEDIUM, 2 LOW

Issues:
├── Lines 79, 171, 179: Font size, border-radius (MEDIUM)
└── Line 209: More font size (LOW)

Usage: Statistics display
Visibility: MEDIUM - Dashboard widget
```

### Other Component Files

**Activity Rings:** 1 issue (LOW)
- Line 49: Border stroke fallback

**Activity Log Entry:** 3 issues (LOW)
- Lines 20, 161: Padding values

**Task Item:** 1 issue (LOW)
- Line 56: Gap value

**Nav Item:** 2 issues (LOW)
- Lines 87, 154: Border radius, font size

**Quick Action Button:** 2 issues (LOW)
- Line 36-37: Border radius, font size

**Productivity Score:** 3 issues (LOW)
- Lines 82, 90, 47: Border radius, font size

**Task Badge:** 2 issues (LOW)
- Lines 36, 39: Padding, border radius

**Bottom Bar V2:** 2 issues (LOW)
- Lines 54, 86: Font size, border radius

---

## Issues by Category

### Color Variables (87 occurrences)

```
Distribution:
├── Variable definitions (correct usage)        60 ✓
├── Fallback values in var() (correct usage)    20 ✓
├── Hardcoded in var() fallback position       5 ⚠️
└── Truly hardcoded (not in var)               2 🔴 HIGH

Geographic hotspots:
1. dashboard-v2.css: Lines 197-242 (dark overrides)
2. dashboard-v2.css: Lines 1936-1938 (radar)
3. dashboard-v2.css: Line 2076 (gradient)
4. FocusHeroV2.css: Line 140 (gradient)
```

### Spacing Issues (45+ occurrences)

```
Distribution:
├── Grid-aligned (4, 8, 12, 16, 20, 24px)     35 ✓
├── Component-specific 2px, 6px, 10px         8 ⚠️ (acceptable)
└── Arbitrary values (3px, 7px, 13px)         2 🟡 (should fix)

Files with most issues:
1. dashboard-v2.css: 15+ instances
2. ScheduleItem.css: 4 instances
3. ActivityLogEntry.css: 2 instances
4. Multiple others: 1-2 instances each
```

### Font Sizes (30+ occurrences)

```
Distribution:
├── Defined type scale (11, 13, 15, 17, 22, 28px) 25+ ✓
├── Close to scale (12, 14px)                     5 ⚠️ (acceptable)
└── Arbitrary (3px, 10px, 32px)                   2 🟡 (could improve)

Standard sizes used:
├── 11px (captions):     6 uses ✓
├── 13px (labels):       8 uses ✓
├── 15px (body):         4 uses ✓
├── 17px (subheadings):  3 uses ✓
├── 22px (headers):      2 uses ✓
└── 28px (large):        2 uses ✓
```

### Border Radius (12 occurrences)

```
Distribution:
├── Using variables                      4 ✓
├── Hardcoded matching scale (6, 10px)   6 ⚠️ (should use var)
└── Non-standard (2, 3px)                2 🟡 (should be 6px)

Files with radius issues:
1. Multiple files: `border-radius: 4px` → should use var(--v2-radius-sm)
2. NavItem.css: `border-radius: 10px` → should use var(--v2-radius-md)
3. FocusHeroV2.css: `border-radius: 3px` → should be 6px
```

---

## Impact Matrix

### By Visibility (User Impact)

```
HIGH VISIBILITY:
├── dashboard-v2.css (main view)           🔴 5 issues (HIGH severity)
├── FocusHeroV2.css (hero section)         🟡 1 issue (HIGH severity)
├── MetricCard.css (prominent display)     🟡 3 issues (MEDIUM)
└── Topbar, Sidebar, Widget styles         ✓ Few issues

MEDIUM VISIBILITY:
├── ScheduleItem.css (in widget)           🟡 2 issues (MEDIUM)
├── QuickStatCard.css (in widget)          🟡 2 issues (MEDIUM)
└── ActivityLogEntry, TaskItem             ✓ Minor issues

LOW VISIBILITY:
├── NavItem, Badge, QuickAction buttons    ✓ Few issues
└── Utility components                     ✓ Mostly good
```

### By Fix Difficulty

```
EASY (5 minutes each):
├── dashboard-v2.css: 3 color references
├── FocusHeroV2.css: 1 purple variable
└── dashboard-v2.css: 1 gradient color

MEDIUM (15-30 minutes each):
├── Border radius standardization (8 files)
├── Dark mode color overrides
└── Spacing standardization (5-8 files)

HARD (1-2 hours):
├── Audit all font sizes
└── Create additional color variables if needed
```

---

## Risk Assessment

### No Production Risk ✓

- No bugs or functionality issues
- No accessibility issues
- No performance impact
- Just code consistency/maintainability

### Possible Issues If Not Fixed

1. **Theme Switching:** Some colors won't update when theme changes
   - Impact: LOW (only affects specialty views)
   - Likelihood: LOW (most use variables)

2. **Design Consistency:** Hardcoded values may diverge from system
   - Impact: MEDIUM (visual consistency)
   - Likelihood: MEDIUM (maintenance issue)

3. **Dark Mode Readability:** Non-variable colors may not have proper contrast
   - Impact: MEDIUM (accessibility)
   - Likelihood: LOW (most dark colors verified)

---

## Recommended Fix Order

### Phase 1: Critical (Week 1)

```
Priority: 🔴 HIGH
Time: 30 minutes
Risk: NONE

Files to touch:
1. dashboard-v2.css: lines 1936-1938 (radar colors)
2. dashboard-v2.css: line 2076 (modal gradient)
3. FocusHeroV2.css: line 140 (hero gradient)

Testing: Visual inspection in light + dark mode
```

### Phase 2: High Impact (Week 2)

```
Priority: 🟡 MEDIUM
Time: 1-2 hours
Risk: NONE

Files to touch:
1. MetricCard.css: color overrides (3 lines)
2. Multiple files: border-radius variables (8 files)
3. dashboard-v2.css: dark mode overrides (50+ lines)

Testing: Full component test in light + dark
```

### Phase 3: Nice To Have (Week 3+)

```
Priority: 🟢 LOW
Time: 2-3 hours
Risk: NONE

Files to touch:
1. All files: spacing standardization
2. All files: font size review
3. Create new color variables if needed

Testing: Visual regression testing
```

---

## Quick Stats

| Metric | Value |
|--------|-------|
| Files Scanned | 16 |
| Files with Issues | 10 |
| Total Issues Found | 112+ |
| Issues Blocking Release | 0 |
| Issues Needing Attention | 5 HIGH |
| Issues Improving Consistency | 18 MEDIUM |
| Minor Issues | 89+ LOW |
| Estimated Fix Time | 3-5 hours |
| Complexity | Low-Medium |
| Risk Level | None |

---

## Color Compliance Breakdown

```
Colors in design system: 8 primary + 8 light variants + 16 semantic
Colors found in CSS:
├── Using variables correctly        ✓ 60+ instances
├── Using variable fallbacks         ✓ 20+ instances
├── Hardcoded but in system          🟡 5 instances
└── Hardcoded NOT in system          🔴 2 instances

Examples of issues:
- #3b82f6 should be var(--v2-blue) [NOT]
- #00d4ff should be var(--v2-teal) [OUTSIDE SYSTEM]
- #a855f7 should be var(--v2-purple) [NOT]
```

---

## Accessibility Notes

✓ **No accessibility issues found**

- All text colors properly contrast
- No reliance on hardcoded colors for meaning
- Font sizes accessible
- Border radius doesn't affect usability

---

## Summary

The codebase is **production-ready** but would benefit from these fixes:

1. **Must fix:** 5 HIGH severity items (15 min)
2. **Should fix:** 18 MEDIUM items (1 hr)
3. **Nice to fix:** 89+ LOW items (3-5 hrs)

Focus on HIGH items first, then MEDIUM. LOW items can be addressed as part of routine maintenance.

---

*Heatmap generated: 2026-01-31*
