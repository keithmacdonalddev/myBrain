---
paths:
  - "myBrain-web/src/components/**/*.jsx"
  - "myBrain-web/src/components/**/*.css"
  - "myBrain-web/src/features/**/*.jsx"
  - "myBrain-web/src/features/**/*.css"
  - "myBrain-web/src/styles/*.css"
---

## Quick Reference
- Never hardcode colors - always use CSS variables (`--primary`, `--panel`, etc.)
- Spacing: use 4px scale only (4, 8, 12, 16, 20, 24, 32, 40, 48)
- Check `components/ui/` first: BaseModal, Skeleton, EmptyState, Dropdown
- All clickables need: hover state, focus state, transition
- Everything must work in dark mode - use CSS variables (they auto-switch)
- Touch targets: minimum 44x44px on mobile

---

# Design Rules

**IMPORTANT: Follow these rules when editing UI code.**

## Design Philosophy

Every design decision must prioritize:
1. Symmetry
2. Simplicity
3. Harmonious proportions

## Before Making UI Changes

1. **Read the design system:** `.claude/design/design-system.md`
2. **Check existing components:** Look in `components/ui/` first
3. **Review similar features:** Match existing patterns

## Design Exploration Tools

| Tool | Purpose | Output |
|------|---------|--------|
| `/prototype` | Static design preview | View-only HTML to review visuals |
| `/playground` | Interactive configurator | HTML with controls + copyable prompt |
| `/design` | Quick consultation | Discussion and recommendations |

**When to use each:**
- "How should this look?" → `/prototype`
- "Let me configure exactly what I want" → `/playground`
- "Quick design question" → `/design`

**Playground templates:**
- `design-playground` - Visual styling (components, layouts, spacing, color)
- `data-explorer` - Query building (SQL, APIs, regex)
- `concept-map` - Learning exploration (knowledge gaps, scope mapping)
- `document-critique` - Review workflow (approve/reject/comment)
- `diff-review` - Code review (line-by-line commentary)
- `code-map` - Architecture visualization (relationships, data flow)

## Visual Iteration with Playground

When iterating on CSS, typography, spacing, or component design:

1. **Consider `/playground:design-playground`** before implementing
   - Allows visual tweaking with interactive controls
   - Adjust colors, spacing, typography in real-time
   - See live preview of changes
   - Copy generated prompt with exact specifications

2. **Good for exploring options** before committing to code
   - Try multiple color combinations
   - Test different spacing scales
   - Compare typography hierarchies
   - Iterate quickly without touching codebase

3. **Workflow:**
   - Run `/playground:design-playground`
   - Adjust controls to explore design options
   - Copy prompt with your preferred configuration
   - Paste prompt back to Claude for implementation

**Agent awareness:** Agents working on visual/CSS changes can suggest using `/playground:design-playground` for exploration before implementation.

## Color Rules

**NEVER hardcode colors. Always use CSS variables:**

```jsx
// ✓ Good
className="bg-[var(--panel)] text-[var(--text)] border-[var(--border)]"

// ✗ Bad
className="bg-gray-100 text-gray-900 border-gray-200"
className="bg-[#f3f4f6]"
```

**Semantic usage:**
| Variable | Use For |
|----------|---------|
| `--primary` | Main actions, links, focus |
| `--danger` | Delete, errors, warnings |
| `--success` | Confirmations, positive states |
| `--muted` | Secondary text, placeholders |
| `--border` | All borders and dividers |
| `--panel` | Card/component backgrounds |
| `--bg` | Page background |

## Spacing Rules

**Use the 4px scale. No arbitrary values:**

```jsx
// ✓ Good - uses scale (4, 8, 12, 16, 20, 24, 32, 40, 48)
className="p-4 mb-6 gap-3"  // 16px, 24px, 12px

// ✗ Bad - arbitrary values
className="p-[13px] mb-[22px]"
```

## Component Rules

**Check before creating:**

| Need | Use This |
|------|----------|
| Modal/Dialog | `BaseModal` |
| Confirmation | `ConfirmDialog` |
| Loading state | `Skeleton` |
| Empty state | `EmptyState` |
| Dropdown menu | `Dropdown` |
| User image | `UserAvatar` |
| Tags | `TagInput` |
| Tooltips | `Tooltip` |

**Never create custom modals or dialogs.**

## Interaction Rules

**Every clickable element must have:**

```jsx
// Hover state
className="hover:bg-[var(--panel2)]"

// Focus state (for keyboard users)
className="focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"

// Transition
className="transition-colors"
```

**Buttons need all states:**
- Default
- Hover (`:hover`)
- Focus (`:focus-visible`)
- Active (`:active`)
- Disabled (`:disabled` + reduced opacity)

## Dark Mode Rules

**All UI must work in dark mode:**

1. Use CSS variables (they auto-switch)
2. Test with `.dark` class on html element
3. Never use `bg-white` or `text-black` directly
4. Shadows need adjustment (use theme shadows)

## Accessibility Rules

- **Touch targets:** Minimum 44x44px on mobile
- **Color contrast:** 4.5:1 for text (WCAG AA)
- **Focus visible:** Clear focus indicators
- **ARIA labels:** For icon-only buttons
- **Keyboard nav:** Everything reachable via Tab

```jsx
// Icon button needs aria-label
<button aria-label="Delete item" className="...">
  <Trash2 className="w-5 h-5" />
</button>
```

## Animation Rules

**Use existing animation classes:**

```jsx
// Available animations
"animate-fade-in"      // Gentle fade + Y movement
"animate-slide-in"     // Slide from right
"animate-slide-up"     // Slide from bottom
"animate-scale-in"     // Scale up (dropdowns)
```

**Timing:**
- Micro-interactions: 100-150ms
- State changes: 200ms
- Large transitions: 300ms

## Loading States

**Always show loading feedback:**

```jsx
if (isLoading) return <Skeleton variant="card" count={3} />;
```

## Quick Checklist

Before committing UI changes:

- [ ] Colors use CSS variables
- [ ] Spacing follows 4px scale
- [ ] Used existing components (no duplicates)
- [ ] Hover states on interactive elements
- [ ] Focus states for keyboard navigation
- [ ] Works in dark mode
- [ ] Has loading state if async
- [ ] Touch-friendly on mobile
