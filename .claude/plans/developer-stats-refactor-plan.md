# Developer Stats Feature - Implementation Plan

**Created**: 2026-01-25
**Based On**: Complete audit (code quality, logging, reuse, design, UX)
**Estimated Effort**: 5-6 hours
**Priority**: High (before production release)

---

## Executive Summary

The Developer Stats feature is functional and well-architected but needs:
- Design system alignment (hardcoded colors, missing reusable components)
- Code deduplication (7 major patterns duplicated)
- Accessibility improvements (focus states, mobile responsiveness)
- Visual testing and refinement

**Grade**: B- (7.2/10) → Target: A (9.0/10)

---

## Phase 1: Critical Fixes (Must Do Before Production)

**Total Time**: ~2 hours
**Impact**: High - Fixes breaking issues and major inconsistencies

### 1.1 Fix Hardcoded Chart Colors (30 min)

**Problem**: Chart colors hardcoded with hex values, breaks dark mode theming

**File**: `myBrain-web/src/components/settings/claude-usage/ModelUsageTrends.jsx`

**Current** (lines 20-29):
```javascript
const COLORS = [
  '#8b5cf6', // Purple (primary)
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
];
```

**Replace with**:
```javascript
// Use CSS variables that adapt to light/dark mode
const COLORS = [
  'hsl(var(--primary))',           // Primary blue
  'hsl(var(--success))',           // Green
  'hsl(var(--warning))',           // Amber
  'hsl(262.1 83.3% 57.8%)',        // Purple (violet-500)
  'hsl(346.8 77.2% 49.8%)',        // Pink (rose-500)
  'hsl(188.7 85.2% 53.3%)',        // Cyan
  'hsl(142.1 76.2% 36.3%)',        // Emerald (emerald-600)
  'hsl(24.6 95% 53.1%)',           // Orange
];
```

**Test**:
- [ ] Verify charts display in light mode
- [ ] Verify charts display in dark mode
- [ ] Check color contrast meets WCAG AA

---

### 1.2 Use EmptyState Component (20 min)

**Problem**: Custom empty states duplicated instead of using `components/ui/EmptyState.jsx`

**Files to update**:
1. `myBrain-web/src/components/settings/claude-usage/CostTrendChart.jsx:64-73`
2. `myBrain-web/src/components/settings/claude-usage/ModelUsageTrends.jsx:71-79`
3. `myBrain-web/src/components/settings/claude-usage/SyncHistoryList.jsx:67-75`

**Change in each file**:

```diff
+ import EmptyState from '../../ui/EmptyState';

  // No data state
  if (!stats?.dailyUsage || stats.dailyUsage.length === 0) {
    return (
-     <div className="text-center py-12 bg-bg rounded-xl border border-border">
-       <TrendingUp className="w-12 h-12 text-muted mx-auto mb-3 opacity-50" />
-       <h3 className="text-lg font-semibold text-text mb-2">No Trend Data</h3>
-       <p className="text-sm text-muted">
-         Sync more usage data to see trends over time
-       </p>
-     </div>
+     <EmptyState
+       icon={TrendingUp}
+       title="No Trend Data"
+       description="Sync more usage data to see trends over time"
+     />
    );
  }
```

**Apply to all 3 files** with appropriate icon/title/description for each.

---

### 1.3 Add Focus States (15 min)

**Problem**: Interactive elements lack visible focus rings for keyboard navigation

**Files**:
- All chart components with buttons/toggles

**Pattern to add**:
```diff
  <button
    onClick={...}
-   className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
+   className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
  >
```

**Apply to**:
1. `CostTrendChart.jsx:106-128` - Chart type toggle buttons
2. `ModelUsageTrends.jsx:106-114` - Period selector
3. `UsageDataTable.jsx:143-156` - Period tabs
4. `SyncHistoryList.jsx:88-96` - Limit selector

**Test**:
- [ ] Tab through all interactive elements
- [ ] Verify focus ring is visible
- [ ] Check focus ring doesn't overlap content

---

### 1.4 Mobile Responsiveness Testing & Fixes (1 hour)

**Problem**: Charts may overflow or be unusable on mobile devices

**Test viewports**:
- 375px (iPhone SE, iPhone 12 mini)
- 768px (iPad)
- 1024px (iPad Pro)

**Test using agent-browser**:
```bash
# Mobile (375px)
agent-browser exec "window.resizeTo(375, 812)"
agent-browser screenshot 2026-01-25-developer-stats-mobile-375px.png

# Tablet (768px)
agent-browser exec "window.resizeTo(768, 1024)"
agent-browser screenshot 2026-01-25-developer-stats-tablet-768px.png
```

**Expected issues & fixes**:

1. **Charts overflow horizontally**:
   ```diff
   - <div className="h-64">
   + <div className="h-64 w-full overflow-x-auto">
   ```

2. **Touch targets too small**:
   ```diff
   - <button className="px-3 py-1.5">
   + <button className="px-4 py-2 min-h-[44px] min-w-[44px]">
   ```

3. **Period selector cramped**:
   ```diff
   - <div className="flex items-center gap-3">
   + <div className="flex flex-wrap items-center gap-2 sm:gap-3">
   ```

4. **Table horizontal scroll**:
   ```diff
   - <table className="w-full">
   + <div className="overflow-x-auto">
   +   <table className="w-full min-w-[640px]">
   ```

**Test checklist**:
- [ ] All charts visible without horizontal scroll
- [ ] All buttons are 44x44px or larger
- [ ] Text is readable (not too small)
- [ ] No layout breaks
- [ ] Touch interactions work

---

## Phase 2: High Priority Refactoring

**Total Time**: ~2 hours
**Impact**: Medium-High - Improves maintainability significantly

### 2.1 Extract PeriodSelector Component (45 min)

**Problem**: Period selector duplicated in 4 files

**Create**: `myBrain-web/src/components/ui/PeriodSelector.jsx`

```jsx
/**
 * =============================================================================
 * PERIODSELECTOR.JSX - Reusable Period/Time Range Selector
 * =============================================================================
 *
 * Dropdown selector for choosing time periods (Today, 7 Days, 30 Days, etc.)
 * Used across analytics and usage tracking features.
 *
 * =============================================================================
 */

import { ChevronDown } from 'lucide-react';

const DEFAULT_PERIODS = [
  { value: 1, label: 'Today' },
  { value: 7, label: '7 Days' },
  { value: 30, label: '30 Days' },
  { value: 90, label: '90 Days' },
];

/**
 * PeriodSelector
 * --------------
 * Dropdown for selecting time period
 *
 * @param {number} value - Currently selected period
 * @param {Function} onChange - Callback when period changes
 * @param {Array} periods - Optional custom periods array
 * @param {string} className - Optional additional classes
 */
export default function PeriodSelector({
  value,
  onChange,
  periods = DEFAULT_PERIODS,
  className = '',
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="px-3 py-1.5 bg-bg border border-border rounded-lg text-sm text-text appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors cursor-pointer"
      >
        {periods.map((period) => (
          <option key={period.value} value={period.value}>
            {period.label}
          </option>
        ))}
      </select>
      <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
    </div>
  );
}
```

**Update 4 files to use it**:

1. `CostTrendChart.jsx`:
```diff
+ import PeriodSelector from '../../ui/PeriodSelector';

- <select
-   value={period}
-   onChange={(e) => setPeriod(Number(e.target.value))}
-   className="px-3 py-1.5 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
- >
-   <option value={1}>Today</option>
-   <option value={7}>7 Days</option>
-   <option value={30}>30 Days</option>
-   <option value={90}>90 Days</option>
- </select>
+ <PeriodSelector value={period} onChange={setPeriod} />
```

2. `ModelUsageTrends.jsx` - Same pattern
3. `ClaudeUsageSettings.jsx` - Update PeriodSelector component to use shared one
4. `UsageDataTable.jsx` - Convert button group to use shared selector

**Test**:
- [ ] All 4 components still work
- [ ] Period changes update data correctly
- [ ] Styling is consistent

---

### 2.2 Consolidate Model Name Formatting (30 min)

**Problem**: Two different functions format model names

**Add to**: `myBrain-web/src/lib/utils.js`

```javascript
/**
 * Format Claude model name for display
 * @param {string} model - Full model identifier
 * @param {string} format - 'short' or 'friendly'
 * @returns {string} Formatted model name
 *
 * @example
 * formatModelName('claude-opus-4-5-20251101', 'short')
 * // Returns: 'opus-4-5'
 *
 * formatModelName('claude-opus-4-5-20251101', 'friendly')
 * // Returns: 'Opus 4.5'
 */
export function formatModelName(model, format = 'short') {
  if (!model) return model;

  // Extract model family and version from Claude model strings
  // Pattern: claude-{family}-{version}-{date}
  const match = model.match(/claude-(\w+)-(\d+)-(\d+)/);

  if (!match) {
    // Fallback: just clean up
    return model.replace(/claude-/i, '').replace(/-/g, ' ');
  }

  const [, family, major, minor] = match;

  if (format === 'short') {
    // Short format: "opus-4-5"
    return `${family}-${major}-${minor}`;
  }

  // Friendly format: "Opus 4.5"
  const capitalizedFamily = family.charAt(0).toUpperCase() + family.slice(1);
  return `${capitalizedFamily} ${major}.${minor}`;
}
```

**Update files**:

1. `UsageDataTable.jsx:35-39` - Replace `shortModelName`:
```diff
- function shortModelName(model) {
-   if (!model) return model;
-   const match = model.match(/claude-(\w+)-(\d+)-(\d+)/);
-   return match ? `${match[1]}-${match[2]}-${match[3]}` : model;
- }
+ import { formatModelName } from '../../../lib/utils';

  // Usage
- models: modelsUsed.map(shortModelName),
+ models: modelsUsed.map(m => formatModelName(m, 'short')),
```

2. `SinceLastSyncCard.jsx:364-378` - Replace `formatModelName`:
```diff
- function formatModelName(model) {
-   if (!model) return model;
-   const match = model.match(/claude-(\w+)-(\d+)-(\d+)/);
-   if (match) {
-     const family = match[1].charAt(0).toUpperCase() + match[1].slice(1);
-     const version = `${match[2]}.${match[3]}`;
-     return `${family} ${version}`;
-   }
-   return model.replace(/claude-/i, '').replace(/-/g, ' ');
- }
+ import { formatModelName } from '../../../lib/utils';

  // Usage stays the same
  {formatModelName(model)}  // Uses 'short' by default
```

---

### 2.3 Remove formatNum Duplication (10 min)

**File**: `myBrain-web/src/components/settings/claude-usage/UsageDataTable.jsx`

**Change**:
```diff
- import { formatCurrency } from '../../../lib/utils';
+ import { formatCurrency, formatNumber } from '../../../lib/utils';

- /**
-  * Format number with commas (full display, not compact)
-  * 1234567 -> "1,234,567"
-  */
- function formatNum(num) {
-   if (num == null || num === 0) return '0';
-   return num.toLocaleString();
- }

  // Replace all usages
- {formatNum(row.input)}
+ {formatNumber(row.input || 0)}
```

**Count**: ~12 replacements in the file

---

### 2.4 Add Reduced-Motion Support (30 min)

**Problem**: Animations don't respect `prefers-reduced-motion` preference

**Files to update**: All components with transitions/animations

**Pattern**:
```diff
+ // Add to component or shared CSS
+ @media (prefers-reduced-motion: reduce) {
+   * {
+     animation-duration: 0.01ms !important;
+     animation-iteration-count: 1 !important;
+     transition-duration: 0.01ms !important;
+   }
+ }
```

**OR in Tailwind** (preferred):
```diff
  <div
-   className="transition-all duration-500"
+   className="transition-all duration-500 motion-reduce:transition-none"
  >
```

**Apply to**:
1. Progress bar animations
2. Chart transitions
3. Hover state transitions
4. Modal/panel animations

---

## Phase 3: Medium Priority Improvements

**Total Time**: ~1.5 hours
**Impact**: Medium - Nice to have, improves polish

### 3.1 Extract useDismissable Hook (30 min)

**Create**: `myBrain-web/src/hooks/useDismissable.js`

```javascript
/**
 * useDismissable Hook
 * -------------------
 * Manages dismissable UI element state with localStorage persistence
 *
 * @param {string} storageKey - Unique key for localStorage
 * @returns {Object} - { isVisible, dismiss, restore }
 */
import { useState } from 'react';

export function useDismissable(storageKey) {
  const [isVisible, setIsVisible] = useState(() => {
    return localStorage.getItem(storageKey) !== 'true';
  });

  const dismiss = () => {
    setIsVisible(false);
    localStorage.setItem(storageKey, 'true');
  };

  const restore = () => {
    setIsVisible(true);
    localStorage.removeItem(storageKey);
  };

  return { isVisible, dismiss, restore };
}
```

**Update files**:

1. `SubscriptionLimitsCard.jsx:24-48`
2. `SinceLastSyncCard.jsx:32-58`

```diff
+ import { useDismissable } from '../../../hooks/useDismissable';

- const [isVisible, setIsVisible] = useState(() => {
-   return localStorage.getItem(STORAGE_KEY) !== 'true';
- });
-
- const handleDismiss = () => {
-   setIsVisible(false);
-   localStorage.setItem(STORAGE_KEY, 'true');
- };
-
- const handleRestore = () => {
-   setIsVisible(true);
-   localStorage.removeItem(STORAGE_KEY);
- };
+ const { isVisible, dismiss, restore } = useDismissable('hideSubscriptionLimits');

- onClick={handleDismiss}
+ onClick={dismiss}

- onClick={handleRestore}
+ onClick={restore}
```

---

### 3.2 Optimize Chart Re-renders (1 hour)

**Problem**: Expensive calculations run on every render

**Files**: `CostTrendChart.jsx`, `ModelUsageTrends.jsx`

**Pattern**:
```diff
+ import { useMemo } from 'react';

  // Expensive calculation
- const chartData = stats.dailyUsage
-   .map((day) => ({...}))
-   .sort(...);
+ const chartData = useMemo(() => {
+   if (!stats?.dailyUsage) return [];
+   return stats.dailyUsage
+     .map((day) => ({...}))
+     .sort(...);
+ }, [stats?.dailyUsage]);

- const avgCost = chartData.reduce(...) / chartData.length;
+ const avgCost = useMemo(() => {
+   if (chartData.length === 0) return 0;
+   return chartData.reduce((sum, d) => sum + d.cost, 0) / chartData.length;
+ }, [chartData]);
```

**Apply to**:
- Chart data transformations
- Average calculations
- Peak value calculations
- Model breakdown calculations

---

## Phase 4: Accessibility & Polish

**Total Time**: ~1 hour
**Impact**: Low-Medium - Accessibility and edge cases

### 4.1 Add Patterns to Pie Charts (30 min)

**Problem**: Color-blind users can't distinguish pie chart segments

**File**: `ModelUsageTrends.jsx`

**Add patterns**:
```jsx
<PieChart>
  <defs>
    <pattern id="stripes-1" patternUnits="userSpaceOnUse" width="4" height="4">
      <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="white" strokeWidth="1"/>
    </pattern>
    <pattern id="dots-1" patternUnits="userSpaceOnUse" width="4" height="4">
      <circle cx="2" cy="2" r="1" fill="white"/>
    </pattern>
    {/* More patterns */}
  </defs>
  <Pie dataKey="cost">
    {chartData.map((entry, index) => (
      <Cell
        key={entry.name}
        fill={COLORS[index]}
        stroke="var(--border)"
        strokeWidth={1}
        style={{
          // Alternate patterns
          fill: index % 2 === 0 ? COLORS[index] : `url(#stripes-${index})`
        }}
      />
    ))}
  </Pie>
</PieChart>
```

---

### 4.2 Add Keyboard Shortcuts (30 min)

**Enhancement**: Add keyboard navigation for power users

**Add to**: `ClaudeUsageSettings.jsx`

```jsx
import { useEffect } from 'react';

// Inside component
useEffect(() => {
  const handleKeyPress = (e) => {
    // Only if settings are open
    if (!isOpen) return;

    switch(e.key) {
      case '1':
        setPeriod(1);  // Today
        break;
      case '7':
        setPeriod(7);  // 7 days
        break;
      case '3':
        setPeriod(30);  // 30 days
        break;
      case 'Escape':
        // Close panel
        break;
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [isOpen]);
```

---

## Testing Checklist

After completing all phases, test:

### Functional Testing
- [ ] All charts render correctly with real data
- [ ] Period selectors update data
- [ ] Sync history expands/collapses
- [ ] Subscription limits display correctly
- [ ] Empty states show when no data
- [ ] Loading skeletons appear while fetching

### Visual Testing
- [ ] Desktop (1280px) - all components visible
- [ ] Tablet (768px) - layout adapts correctly
- [ ] Mobile (375px) - no overflow, readable text
- [ ] Dark mode - all colors display correctly
- [ ] Light mode - all colors display correctly

### Accessibility Testing
- [ ] Keyboard navigation - tab through all elements
- [ ] Focus states - visible on all interactive elements
- [ ] Screen reader - ARIA labels present
- [ ] Color contrast - meets WCAG AA (4.5:1)
- [ ] Touch targets - 44x44px minimum
- [ ] Reduced motion - animations disabled when preferred

### Performance Testing
- [ ] No unnecessary re-renders (React DevTools Profiler)
- [ ] Charts render smoothly
- [ ] Large datasets don't freeze UI

---

## Success Metrics

**Before**:
- Code duplication: 7 major patterns
- Design compliance: 6.5/10
- Mobile responsiveness: Untested
- Accessibility: 5/10

**After**:
- Code duplication: 0 (all extracted to reusable components/utils)
- Design compliance: 9/10
- Mobile responsiveness: Fully tested and working
- Accessibility: 8.5/10

**Overall Grade**: B- (7.2/10) → **A (9.0/10)**

---

## Files Modified Summary

### New Files (3):
1. `myBrain-web/src/components/ui/PeriodSelector.jsx`
2. `myBrain-web/src/hooks/useDismissable.js`
3. `myBrain-web/src/lib/utils.js` (add formatModelName)

### Modified Files (8):
1. `myBrain-web/src/components/settings/claude-usage/CostTrendChart.jsx`
2. `myBrain-web/src/components/settings/claude-usage/ModelUsageTrends.jsx`
3. `myBrain-web/src/components/settings/claude-usage/UsageDataTable.jsx`
4. `myBrain-web/src/components/settings/claude-usage/SyncHistoryList.jsx`
5. `myBrain-web/src/components/settings/claude-usage/SubscriptionLimitsCard.jsx`
6. `myBrain-web/src/components/settings/claude-usage/SinceLastSyncCard.jsx`
7. `myBrain-web/src/components/settings/ClaudeUsageSettings.jsx`
8. `myBrain-web/src/lib/utils.js`

---

## Rollout Strategy

### Option A: All at Once (Recommended)
- Create feature branch: `refactor/developer-stats`
- Complete all 4 phases
- Single PR with comprehensive testing
- **Pros**: Clean, atomic change
- **Cons**: Larger PR to review

### Option B: Phased Rollout
- Phase 1 → PR #1 (critical fixes)
- Phase 2 → PR #2 (refactoring)
- Phase 3 → PR #3 (optimizations)
- Phase 4 → PR #4 (polish)
- **Pros**: Smaller PRs, faster reviews
- **Cons**: Intermediate states may have inconsistencies

**Recommendation**: Option A - atomic refactor ensures consistency

---

## Next Steps

1. **Create branch**: `git checkout -b refactor/developer-stats`
2. **Start with Phase 1** (critical fixes)
3. **Test after each phase**
4. **Take screenshots** at each stage for comparison
5. **Update design-log.md** with improvements
6. **Create PR** with before/after screenshots
7. **Deploy to production** after approval

---

**Plan Owner**: Claude Code
**Status**: Ready to implement
**Last Updated**: 2026-01-25
