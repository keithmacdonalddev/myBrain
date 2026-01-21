---
name: design-review
description: Audit UI code for design system compliance. Finds inconsistencies, accessibility issues, and improvement opportunities.
---

You are conducting a design review of the myBrain codebase.

## Your Task

Audit specified files (or recent changes) for design system compliance.

## Process

### 1. Load Design Context

Read these files first:
- `.claude/design/design-system.md` - The rules to check against
- `.claude/design/design-log.md` - Decisions and preferences

### 2. Identify Files to Review

If files specified, review those.
If not, check recent changes:
```bash
git diff --name-only HEAD~5 | grep -E '\.(jsx|css)$'
```

### 3. Check Each File Against Design System

**Colors:**
- [ ] Uses CSS variables, not hardcoded colors
- [ ] Semantic usage (--primary for actions, --danger for destructive)
- [ ] Works in both light and dark mode

**Spacing:**
- [ ] Uses spacing scale (4, 8, 12, 16, 24, 32, etc.)
- [ ] No arbitrary values (13px, 17px, 22px)
- [ ] Consistent padding in similar components

**Typography:**
- [ ] Uses text scale (text-sm, text-base, text-lg, etc.)
- [ ] Proper hierarchy (max 3 sizes per view)
- [ ] Font weights from scale (400, 500, 600, 700)

**Components:**
- [ ] Uses existing UI components (BaseModal, Skeleton, etc.)
- [ ] No duplicate implementations
- [ ] Consistent patterns across similar features

**Interactions:**
- [ ] Hover states on clickable elements
- [ ] Focus states for keyboard navigation
- [ ] Loading states where needed
- [ ] Disabled states styled appropriately

**Accessibility:**
- [ ] Color contrast sufficient
- [ ] Touch targets 44x44px minimum on mobile
- [ ] ARIA labels where needed
- [ ] Keyboard navigable

**Animations:**
- [ ] Uses existing animation classes
- [ ] Appropriate duration (100-300ms)
- [ ] Respects reduced-motion preference

### 4. Generate Report

```markdown
## Design Review: [files/area reviewed]

### Summary
- Files reviewed: X
- Issues found: X
- Compliance score: X/10

### Critical Issues (Must Fix)
- [ ] `file:line` - Issue description

### Warnings (Should Fix)
- [ ] `file:line` - Issue description

### Suggestions (Consider)
- [ ] `file:line` - Suggestion

### Compliant ✓
- List of things done correctly

### Recommendations
Prioritized list of improvements
```

### 5. Update Design Log

If significant issues found, note them in:
`.claude/design/design-log.md` → Design Reviews section

## Focus Areas by Priority

1. **Color hardcoding** - Most common issue
2. **Missing hover/focus states** - Accessibility
3. **Inconsistent spacing** - Visual rhythm
4. **Duplicate components** - Maintainability
5. **Missing loading states** - User experience
