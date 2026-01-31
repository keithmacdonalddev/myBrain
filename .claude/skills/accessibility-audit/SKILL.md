---
name: accessibility-audit
description: Accessibility compliance audit (WCAG AA)
invocation: /accessibility-audit
arguments: "[path]"
---

# Accessibility Audit Skill

Audit UI for WCAG AA accessibility compliance.

## Usage

```
/accessibility-audit                    # Audit entire frontend
/accessibility-audit src/components/    # Audit component library
/accessibility-audit src/features/dashboard/  # Audit dashboard
```

## What This Skill Does

1. **Checks keyboard accessibility:**
   - Interactive elements focusable
   - div with onClick (should be button)
   - Focus indicators present

2. **Checks ARIA compliance:**
   - Icon buttons have aria-label
   - Images have alt text
   - Form inputs have labels

3. **Checks semantic HTML:**
   - Proper heading hierarchy
   - Button vs div for actions
   - Semantic landmarks

4. **Checks color/contrast:**
   - Color-only indicators
   - Focus ring visibility

## Execution Steps

### Step 1: Set Target
```bash
TARGET=${1:-myBrain-web/src}
echo "Running Accessibility Audit on: $TARGET"
```

### Step 2: Check Keyboard Accessibility
```bash
echo "=== Keyboard Accessibility ==="

# div with onClick (not keyboard accessible by default)
echo "Non-keyboard accessible patterns:"
echo "div with onClick:"
grep -rn --include="*.jsx" "div.*onClick" "$TARGET" | grep -v "tabIndex\|role=" | head -20

echo ""
echo "span with onClick:"
grep -rn --include="*.jsx" "span.*onClick" "$TARGET" | grep -v "tabIndex\|role=" | head -10
```

### Step 3: Check Focus Indicators
```bash
echo ""
echo "=== Focus Indicators ==="

# outline: none (removing focus)
echo "Potentially removed focus indicators:"
grep -rn --include="*.css" "outline.*none\|outline:\s*0" "$TARGET" | head -10

# focus: or focus-visible usage
echo ""
echo "Focus styles defined:"
grep -rn --include="*.css" ":focus\|:focus-visible" "$TARGET" | wc -l
```

### Step 4: Check ARIA Labels
```bash
echo ""
echo "=== ARIA Labels ==="

# Icon buttons without aria-label
echo "Icon-only buttons (check for aria-label):"
grep -rn --include="*.jsx" "<button.*Icon\|<Button.*Icon" "$TARGET" | grep -v "aria-label" | head -15

# Images without alt
echo ""
echo "Images without alt text:"
grep -rn --include="*.jsx" "<img" "$TARGET" | grep -v "alt=" | head -10
```

### Step 5: Check Semantic HTML
```bash
echo ""
echo "=== Semantic HTML ==="

# Heading hierarchy
echo "Headings found:"
grep -rn --include="*.jsx" "<h[1-6]" "$TARGET" | head -20

# nav, main, aside landmarks
echo ""
echo "Semantic landmarks:"
echo "nav: $(grep -rn --include="*.jsx" "<nav" "$TARGET" | wc -l)"
echo "main: $(grep -rn --include="*.jsx" "<main" "$TARGET" | wc -l)"
echo "aside: $(grep -rn --include="*.jsx" "<aside" "$TARGET" | wc -l)"
```

### Step 6: Check Color Independence
```bash
echo ""
echo "=== Color Independence ==="

# Status indicators that might be color-only
echo "Status indicators (verify not color-only):"
grep -rn --include="*.jsx" -E "status|error|success|warning" "$TARGET" | grep -E "text-red|text-green|text-yellow|bg-red|bg-green" | head -15
```

### Step 7: Check Form Accessibility
```bash
echo ""
echo "=== Form Accessibility ==="

# Inputs without labels
echo "Inputs (verify they have labels):"
grep -rn --include="*.jsx" "<input" "$TARGET" | grep -v "aria-label\|id=.*label\|htmlFor" | head -15

# Required fields
echo ""
echo "Required fields (verify announced):"
grep -rn --include="*.jsx" "required" "$TARGET" | head -10
```

### Step 8: Generate Report

```markdown
# Accessibility Audit Report

**Target:** [path]
**Date:** [date]
**Standard:** WCAG 2.1 AA

## Summary

| Category | Issues | Severity |
|----------|--------|----------|
| Keyboard | X | HIGH |
| ARIA | X | HIGH |
| Semantic HTML | X | MEDIUM |
| Focus Indicators | X | HIGH |
| Color Independence | X | MEDIUM |
| Forms | X | HIGH |

**Overall Status:** [COMPLIANT / VIOLATIONS / CRITICAL]

## Critical Issues (Must Fix)

### Keyboard Accessibility
| File | Line | Issue | Fix |
|------|------|-------|-----|
| [file] | [line] | div with onClick | Use `<button>` |

### Missing ARIA Labels
| File | Line | Element | Needs |
|------|------|---------|-------|
| [file] | [line] | Icon button | aria-label |

### Missing Alt Text
| File | Line | Image |
|------|------|-------|
| [file] | [line] | <img src="..."> |

## Serious Issues (Should Fix)

### Focus Indicators
| File | Line | Issue |
|------|------|-------|
| [file] | [line] | outline: none without replacement |

### Color-Only Indicators
| File | Line | Element | Issue |
|------|------|---------|-------|
| [file] | [line] | Error status | Red color only, needs icon |

### Form Labels
| File | Line | Input | Issue |
|------|------|-------|-------|
| [file] | [line] | text input | No associated label |

## Minor Issues (Nice to Fix)

### Semantic HTML
| File | Line | Issue | Suggestion |
|------|------|-------|------------|
| [file] | [line] | div container | Could use `<section>` |

### Heading Hierarchy
| File | Issue |
|------|-------|
| [file] | h1 → h3 (skipped h2) |

## Recommendations

### High Priority
1. Replace all `div onClick` with `<button>`
2. Add aria-label to all icon buttons
3. Add alt text to all images

### Medium Priority
4. Add visible focus indicators
5. Add icons to color-coded status indicators
6. Associate all inputs with labels

### Low Priority
7. Improve heading hierarchy
8. Add more semantic landmarks

## Testing Checklist

- [ ] Navigate entire UI with keyboard only
- [ ] Test with screen reader
- [ ] Verify all images have alt text
- [ ] Check focus visible on all interactive elements
- [ ] Verify forms can be completed without mouse

## Score: X/100

| Category | Weight | Score |
|----------|--------|-------|
| Keyboard | 25% | X |
| ARIA | 25% | X |
| Focus | 20% | X |
| Semantic | 15% | X |
| Color | 15% | X |
```

## Pass/Fail Criteria

| Score | Status |
|-------|--------|
| 90-100 | COMPLIANT |
| 70-89 | MINOR ISSUES |
| 50-69 | NEEDS WORK |
| <50 | CRITICAL - Must remediate |

## Common Fixes

### div with onClick
```jsx
// Before (inaccessible)
<div onClick={handleClick}>Click me</div>

// After (accessible)
<button onClick={handleClick}>Click me</button>
```

### Icon Button
```jsx
// Before (no label)
<button><TrashIcon /></button>

// After (accessible)
<button aria-label="Delete item"><TrashIcon /></button>
```

### Image
```jsx
// Before (no alt)
<img src="chart.png" />

// After (accessible)
<img src="chart.png" alt="Task completion chart showing 75% complete" />
```

## Related

- `/design-audit` - Full design system audit
- `/visual-qa` - Visual hierarchy check
- `/theme-check` - Theme compliance
