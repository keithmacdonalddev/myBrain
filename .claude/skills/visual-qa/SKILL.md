---
name: visual-qa
description: Visual quality assurance - hierarchy, patterns, consistency
invocation: /visual-qa
arguments: "[path]"
---

# Visual QA Skill

Check visual hierarchy, design patterns, and UI consistency.

## Usage

```
/visual-qa                      # Check all UI components
/visual-qa src/features/dashboard/  # Check dashboard
/visual-qa src/components/      # Check component library
```

## What This Skill Does

1. **Checks typography hierarchy:**
   - Hero metrics (48-64px)
   - Section headers (24px)
   - 30% size difference between levels

2. **Verifies metric patterns:**
   - Number above label (Stripe pattern)
   - Proper sizing for metrics

3. **Detects anti-patterns:**
   - Wall of sameness
   - Red for non-errors
   - Modal abuse
   - Hidden primary actions

4. **Checks component consistency:**
   - Proper use of Widget, MetricCard, etc.
   - Consistent patterns across similar elements

## Execution Steps

### Step 1: Set Target
```bash
TARGET=${1:-myBrain-web/src}
echo "Running Visual QA on: $TARGET"
```

### Step 2: Check Typography Sizes
```bash
echo "=== Typography Hierarchy ==="

# Look for hero-sized text (48-64px or text-5xl, text-6xl)
echo "Hero metrics (48px+):"
grep -rn --include="*.jsx" --include="*.css" -E "text-5xl|text-6xl|font-size:\s*(48|56|64)px" "$TARGET" | head -10

# Section headers (24px or text-2xl)
echo ""
echo "Section headers (24px):"
grep -rn --include="*.jsx" --include="*.css" -E "text-2xl|font-size:\s*24px" "$TARGET" | head -10

# Check for flat hierarchy (multiple similar sizes)
echo ""
echo "Potential hierarchy issues (text-base used extensively):"
TEXT_BASE=$(grep -rn --include="*.jsx" "text-base" "$TARGET" 2>/dev/null | wc -l)
echo "text-base count: $TEXT_BASE"
```

### Step 3: Check Metric Patterns
```bash
echo ""
echo "=== Metric Display Patterns ==="

# Look for metric value/label patterns
echo "MetricCard usage:"
grep -rn --include="*.jsx" "MetricCard" "$TARGET" | wc -l

# Check for label-above-number anti-pattern
echo ""
echo "Potential label-above-number patterns (check manually):"
grep -rn --include="*.jsx" -B2 -A2 "metric-value\|metric-label" "$TARGET" | head -30
```

### Step 4: Check for Anti-Patterns
```bash
echo ""
echo "=== Anti-Pattern Detection ==="

# Red for non-errors
echo "Red color usage (check context for overdue/urgency misuse):"
grep -rn --include="*.jsx" -E "text-red|bg-red|--v2-red|--danger" "$TARGET" | head -20

# Modal usage
echo ""
echo "Modal usage count:"
grep -rn --include="*.jsx" "Modal" "$TARGET" | wc -l

# onClick on divs (potential accessibility issue)
echo ""
echo "Div with onClick (should be button):"
grep -rn --include="*.jsx" "div.*onClick" "$TARGET" | head -10
```

### Step 5: Check Component Consistency
```bash
echo ""
echo "=== Component Usage ==="

# Widget component
echo "Widget component usage:"
grep -rn --include="*.jsx" "<Widget" "$TARGET" | wc -l

# TaskItem component
echo "TaskItem component usage:"
grep -rn --include="*.jsx" "<TaskItem" "$TARGET" | wc -l

# HoverActions
echo "HoverActions component usage:"
grep -rn --include="*.jsx" "<HoverActions" "$TARGET" | wc -l

# Custom implementations (potential reuse issues)
echo ""
echo "Custom widget implementations (should use Widget component):"
grep -rn --include="*.jsx" "widget-header\|widget-content" "$TARGET" | grep -v "Widget\." | head -10
```

### Step 6: Generate Report

```markdown
# Visual QA Report

**Target:** [path]
**Date:** [date]

## Typography Hierarchy

| Level | Expected | Found | Status |
|-------|----------|-------|--------|
| Hero (48-64px) | Present | X instances | [PASS/MISSING] |
| Section (24px) | Present | X instances | [PASS/MISSING] |
| Body (16px) | Dominant | X instances | [OK] |

### Hierarchy Issues
- [ ] No hero metric on dashboard
- [ ] Multiple text sizes too similar
- [ ] Section headers same as body

## Metric Patterns

| Pattern | Expected | Status |
|---------|----------|--------|
| Number above label | All metrics | [PASS/VIOLATIONS] |
| MetricCard usage | For hero stats | X usages |

### Violations
- [file:line] - label appears above number

## Anti-Patterns Detected

| Anti-Pattern | Found | Severity |
|--------------|-------|----------|
| Red for non-errors | X instances | HIGH |
| Wall of sameness | [YES/NO] | HIGH |
| Modal overuse | X modals | MEDIUM |
| div onClick | X instances | MEDIUM |

### Details
1. [file:line] - Red used for "overdue" (should be amber)
2. [file:line] - div with onClick (should be button)

## Component Consistency

| Component | Usages | Custom Implementations |
|-----------|--------|------------------------|
| Widget | X | X (should migrate) |
| MetricCard | X | - |
| TaskItem | X | - |
| HoverActions | X | - |

### Reuse Issues
- [file] - custom widget instead of Widget component

## Recommendations

1. **High Priority:**
   - Add hero metric to dashboard (48px+)
   - Change red overdue to amber

2. **Medium Priority:**
   - Migrate custom widgets to Widget component
   - Replace div onClick with buttons

3. **Low Priority:**
   - Standardize text sizes across similar elements

## Overall Score: X/100

| Category | Score |
|----------|-------|
| Typography | X/25 |
| Metrics | X/25 |
| Anti-Patterns | X/25 |
| Consistency | X/25 |
```

## Pass/Fail Criteria

| Score | Status |
|-------|--------|
| 80-100 | PASS |
| 60-79 | NEEDS WORK |
| <60 | FAIL |

## Related

- `/design-audit` - Full design system audit
- `/theme-check` - Theme compliance
- `/accessibility-audit` - Accessibility check
