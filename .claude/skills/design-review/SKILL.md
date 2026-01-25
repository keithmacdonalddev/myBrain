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

### 3. Visual Inspection with agent-browser

**IMPORTANT: Always use agent-browser for visual inspection when reviewing UI.**

#### Setup:
```bash
# Check if frontend is running
curl -s http://localhost:5173 > /dev/null || echo "Frontend not running"

# If needed, start frontend in background
# cd myBrain-web && npm run dev &

# Check if backend is running (if needed for auth)
curl -s http://localhost:5000/health > /dev/null || echo "Backend not running"
```

#### Visual Review Process:
1. **Open the app**:
```bash
/c/Users/NewAdmin/AppData/Roaming/npm/node_modules/agent-browser/bin/agent-browser-win32-x64.exe --session claude open http://localhost:5173
```

2. **Login if needed** (use test account from `.claude/credentials.json`):
```bash
# Get snapshot, fill credentials, click sign in
agent-browser snapshot -i
agent-browser fill @e1 "claude-test-admin@mybrain.test"
agent-browser fill @e2 "ClaudeTest123"
agent-browser click @e3  # Sign in button
```

3. **Navigate to the feature being reviewed**:
```bash
# Example: Navigate to settings → developer stats
agent-browser click @eN  # Settings button
agent-browser click @eM  # Developer Stats option
```

4. **Take screenshots** at different states:
```bash
# Desktop view
cd .claude/design/screenshots
agent-browser screenshot YYYY-MM-DD-feature-desktop.png

# Test at mobile viewport (375px)
agent-browser exec "window.resizeTo(375, 812)"
agent-browser screenshot YYYY-MM-DD-feature-mobile-375px.png

# Test at tablet viewport (768px)
agent-browser exec "window.resizeTo(768, 1024)"
agent-browser screenshot YYYY-MM-DD-feature-tablet-768px.png
```

5. **Check interactions**:
```bash
# Hover states (use snapshot to get refs)
agent-browser snapshot -i
# Click/interact with elements
agent-browser click @eX
# Screenshot after interaction
```

6. **Close browser**:
```bash
agent-browser close
```

#### What to Look For Visually:
- [ ] Colors match design system (check in both light and dark mode)
- [ ] Spacing follows 4px scale
- [ ] Typography hierarchy is clear
- [ ] Interactive elements have visible hover/focus states
- [ ] Touch targets are 44x44px minimum on mobile
- [ ] Layout doesn't overflow on mobile
- [ ] Charts/tables are readable at all viewports
- [ ] Empty states are clear and helpful
- [ ] Loading states are smooth
- [ ] Glassmorphism applied correctly (if applicable)

### 4. Check Code Against Design System

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

### 5. Generate Report

```markdown
## Design Review: [files/area reviewed]

### Summary
- Files reviewed: X
- Screenshots captured: X
- Issues found: X
- Compliance score: X/10

### Screenshots
- 📸 `.claude/design/screenshots/YYYY-MM-DD-feature-desktop.png`
- 📸 `.claude/design/screenshots/YYYY-MM-DD-feature-mobile-375px.png`

### Critical Issues (Must Fix)
- [ ] `file:line` - Issue description
- [ ] Visual: [description of visual issue from screenshot]

### Warnings (Should Fix)
- [ ] `file:line` - Issue description

### Suggestions (Consider)
- [ ] `file:line` - Suggestion

### Compliant ✓
- List of things done correctly

### Visual Assessment
- Desktop UX: [rating/notes]
- Mobile UX: [rating/notes]
- Accessibility: [rating/notes]

### Recommendations
Prioritized list of improvements
```

### 6. Update Design Log

If significant issues found, note them in:
`.claude/design/design-log.md` → Design Reviews section

## Focus Areas by Priority

1. **Color hardcoding** - Most common issue
2. **Missing hover/focus states** - Accessibility
3. **Inconsistent spacing** - Visual rhythm
4. **Duplicate components** - Maintainability
5. **Missing loading states** - User experience
