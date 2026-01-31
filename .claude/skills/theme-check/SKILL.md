---
name: theme-check
description: Quick theme compliance verification
invocation: /theme-check
arguments: "[path]"
---

# Theme Check Skill

Quick verification of theme compliance - CSS variables and dark mode support.

## Usage

```
/theme-check                    # Check entire frontend
/theme-check src/features/      # Check specific directory
/theme-check src/components/ui/Button.jsx  # Check single file
```

## What This Skill Does

1. **Scans for hardcoded colors:**
   - Hex codes (#FFFFFF, #007AFF)
   - RGB/RGBA values
   - HSL values

2. **Verifies CSS variable usage:**
   - V2 variables (--v2-*) for new components
   - Legacy variables (--bg, --text) for existing

3. **Checks dark mode support:**
   - .dark selector presence
   - Proper variable usage that supports both modes

4. **Reports compliance status:**
   - Quick pass/fail
   - Specific violations

## Execution Steps

### Step 1: Set Target
```bash
TARGET=${1:-myBrain-web/src}
echo "Checking theme compliance in: $TARGET"
```

### Step 2: Count Hardcoded Colors
```bash
echo "=== Hardcoded Colors ==="

# Hex colors
HEX_COUNT=$(grep -rn --include="*.jsx" --include="*.css" --include="*.tsx" -E "#[0-9a-fA-F]{3,8}" "$TARGET" 2>/dev/null | grep -v node_modules | wc -l)
echo "Hex colors found: $HEX_COUNT"

# RGB/RGBA
RGB_COUNT=$(grep -rn --include="*.jsx" --include="*.css" -E "rgb\(|rgba\(" "$TARGET" 2>/dev/null | grep -v node_modules | wc -l)
echo "RGB/RGBA found: $RGB_COUNT"

# Show first 10 violations
echo ""
echo "Sample violations:"
grep -rn --include="*.jsx" --include="*.css" -E "#[0-9a-fA-F]{3,8}" "$TARGET" 2>/dev/null | grep -v node_modules | head -10
```

### Step 3: Check CSS Variable Usage
```bash
echo ""
echo "=== CSS Variable Usage ==="

# V2 variables
V2_COUNT=$(grep -rn --include="*.jsx" --include="*.css" "var(--v2-" "$TARGET" 2>/dev/null | wc -l)
echo "V2 variables (--v2-*): $V2_COUNT usages"

# Legacy variables
LEGACY_COUNT=$(grep -rn --include="*.jsx" --include="*.css" -E "var\(--bg\)|var\(--panel\)|var\(--text\)|var\(--border\)" "$TARGET" 2>/dev/null | wc -l)
echo "Legacy variables: $LEGACY_COUNT usages"
```

### Step 4: Check Dark Mode Coverage
```bash
echo ""
echo "=== Dark Mode Coverage ==="

# CSS files without .dark
echo "CSS files missing .dark selector:"
for file in $(find "$TARGET" -name "*.css" -type f 2>/dev/null); do
  if ! grep -q "\.dark" "$file" 2>/dev/null; then
    echo "  - $file"
  fi
done | head -20
```

### Step 5: Generate Quick Report

```markdown
# Theme Compliance Check

**Target:** [path]
**Date:** [date]

## Quick Status

| Check | Status | Count |
|-------|--------|-------|
| Hardcoded Hex | [PASS/FAIL] | X |
| Hardcoded RGB | [PASS/FAIL] | X |
| V2 Variables | [INFO] | X usages |
| Legacy Variables | [INFO] | X usages |
| Dark Mode CSS | [PASS/FAIL] | X files missing |

## Overall: [PASS / NEEDS WORK / FAIL]

### If FAIL, top issues:
1. [file:line] - hardcoded color
2. [file:line] - hardcoded color
3. [file] - missing dark mode

### Quick Fixes:
- Replace `#007AFF` with `var(--v2-blue)`
- Replace `#FFFFFF` with `var(--v2-bg-surface)`
- Add `.dark` selectors to CSS files
```

## Pass/Fail Criteria

| Status | Criteria |
|--------|----------|
| PASS | 0 hardcoded colors, all CSS has dark mode |
| NEEDS WORK | 1-10 hardcoded colors |
| FAIL | >10 hardcoded colors OR major dark mode gaps |

## Common Color Mappings

| Hardcoded | Replace With |
|-----------|--------------|
| #FFFFFF, white | var(--v2-bg-surface) |
| #F2F2F7 | var(--v2-bg-primary) |
| #1C1C1E | var(--v2-text-primary) |
| #007AFF | var(--v2-blue) |
| #34C759 | var(--v2-green) |
| #FF9500 | var(--v2-orange) |
| #FF3B30 | var(--v2-red) |

## Related

- `/design-audit` - Full design system audit
- `/visual-qa` - Visual hierarchy check
