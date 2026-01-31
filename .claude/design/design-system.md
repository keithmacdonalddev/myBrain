# myBrain Design System

This document defines the visual language for myBrain. Follow these guidelines for all UI work.

**Last Updated:** 2026-01-31
**Version:** 2.0 (Dashboard V2 Update)

---

## Quick Reference

### CSS Variable Prefixes
| Prefix | Usage |
|--------|-------|
| `--v2-*` | Dashboard V2 components (preferred for new work) |
| `--bg`, `--panel`, etc. | Legacy components (maintain, don't extend) |

### Key Numbers
| Value | Usage |
|-------|-------|
| 48-64px | Hero metrics |
| 32-40px | Primary metrics |
| 24px | Minimum card padding |
| 8px | Grid base unit |
| 44px | Minimum touch target |
| 4.5:1 | Minimum contrast ratio |

### Theme Selector
```css
.dark { /* Dark mode - PRIMARY selector */ }
```

---

## Part 1: Design Philosophy

### The Three Fundamentals

Every design decision must embody these principles:

| Fundamental | Definition | Application |
|-------------|------------|-------------|
| **Symmetry** | Visual balance and alignment | Elements feel balanced, not randomly placed |
| **Simplicity** | Clarity over complexity | Remove what doesn't serve the user's goal |
| **Harmonious Proportions** | Consistent relationships | Spacing, sizing feel natural |

### Five myBrain Principles

#### Principle 1: Performance Is UX
Speed and responsiveness are core UX features, not technical concerns.

**Implementation:**
- All interactions under 100ms response
- Optimistic updates (show changes immediately, sync in background)
- Skeleton loaders matching actual content dimensions
- Prefetch data for likely next actions

#### Principle 2: Keyboard-First, Touch-Ready
Power users never need a mouse. Casual users never need a keyboard.

**Implementation:**
- Global shortcuts for all common actions
- Command palette (`Cmd+K` / `Ctrl+K`)
- Arrow keys navigate naturally
- Touch targets 44px+ minimum

**Priority Shortcuts:**
| Action | Shortcut |
|--------|----------|
| Quick Capture | `C` or `Cmd+Shift+Space` |
| Go to Today | `T` |
| Search Everything | `Cmd+K` |
| Complete Task | `E` or `Space` (when focused) |

#### Principle 3: Opinionated Defaults, Gentle Flexibility
Make the best choice for users by default. Allow customization without requiring it.

**Implementation:**
- Dashboard pre-configured with sensible layout
- Work beautifully out of the box
- Customization available but not prominent
- Settings progressive: basic visible, advanced tucked away

#### Principle 4: Calm Productivity
The interface reduces anxiety, not creates it. Productivity comes from clarity, not pressure.

**Implementation:**
- Never show more than one urgent notification at a time
- Overdue items visible but not screaming
- Progress celebrates, doesn't shame
- Generous whitespace - spacious, not cramped
- **Red only for true errors** (never for "overdue" or "you should do this")

#### Principle 5: One Glance, One Truth
The dashboard answers "What should I focus on right now?" in under 5 seconds.

**The 5-Second Test:**
```
User opens myBrain. Within 5 seconds they know:
1. How many things need attention today
2. What's most important right now
3. Their overall status (on track, behind, ahead)
```

### Target Aesthetic

**Primary:** Apple Command Center
- The feel, layout, typography, widget design
- Sidebar with activity rings
- Weather in header
- Today's Focus hero section

**Interaction Patterns:** Material Cockpit
- Hover action buttons (clearer than icon-only)
- Done/Defer buttons in tasks
- Trash/Task/Note triage in inbox
- Join/Prep/Skip in schedule

**Accent Features:** Mission Control
- Activity log widget (terminal style)
- Boxy aesthetic elements
- Status indicators

**Alternative View:** Radar HUD
- Toggle mode for spatial "you at center" layout

---

## Part 2: Colors

### V2 Color System (Dashboard & New Components)

#### Backgrounds
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--v2-bg-base` | #F2F2F7 | #121212 | App background |
| `--v2-bg-primary` | #F2F2F7 | #121212 | Main content area |
| `--v2-bg-secondary` | #FFFFFF | #1A1A1A | Panels, sidebars |
| `--v2-bg-surface` | #FFFFFF | #1E1E1E | Cards, widgets |
| `--v2-bg-tertiary` | #E5E5EA | #242424 | Subtle backgrounds |
| `--v2-sidebar-bg` | rgba(255,255,255,0.72) | #1A1A1A | Sidebar (glass in light) |

#### Text
| Token | Light | Dark | Contrast | Usage |
|-------|-------|------|----------|-------|
| `--v2-text-primary` | #1C1C1E | #E5E5E5 | 12.6:1 | Main text |
| `--v2-text-secondary` | #3C3C43 | #A0A0A0 | 6.3:1 | Secondary text |
| `--v2-text-tertiary` | #8E8E93 | #B0B0B0 | 7:1 | Muted text |

#### Borders
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--v2-separator` | rgba(60,60,67,0.12) | #2A2A2A | Dividers |
| `--v2-border-default` | rgba(60,60,67,0.12) | #383838 | Standard borders |

#### Accent Colors (Apple System)
| Token | Value | Light BG | Usage |
|-------|-------|----------|-------|
| `--v2-blue` | #007AFF | `--v2-blue-light` | Actions, links, selected |
| `--v2-green` | #34C759 | `--v2-green-light` | Success, completion |
| `--v2-orange` | #FF9500 | `--v2-orange-light` | Warnings, approaching deadlines |
| `--v2-red` | #FF3B30 | `--v2-red-light` | **TRUE ERRORS ONLY** |
| `--v2-purple` | #AF52DE | `--v2-purple-light` | Projects, categories |
| `--v2-pink` | #FF2D55 | - | Accents |
| `--v2-teal` | #5AC8FA | - | Information |
| `--v2-indigo` | #5856D6 | - | Special actions |

#### Light Variants (for backgrounds)
```css
--v2-blue-light: rgba(0, 122, 255, 0.12);   /* Light mode */
--v2-blue-light: rgba(0, 122, 255, 0.2);    /* Dark mode */
/* Same pattern for red, green, orange, purple */
```

### Color Psychology Rules

| Color | Use For | NEVER Use For |
|-------|---------|---------------|
| Blue | Actions, links, selected states | Warnings, urgency |
| Green | Completion, success | Attention-grabbing |
| Yellow/Amber | Gentle reminders, approaching deadlines | Strong warnings |
| **Red** | **True errors ONLY** | Overdue tasks, "you should do this" |

### Legacy Color System (Existing Components)

Maintain these for existing components. Don't extend.

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--bg` | #ffffff | #09090b | Page background |
| `--panel` | #f9fafb | #18181b | Card backgrounds |
| `--panel2` | #f3f4f6 | #27272a | Secondary panels |
| `--border` | #e5e7eb | #3f3f46 | Borders |
| `--text` | #111827 | #fafafa | Primary text |
| `--muted` | #6b7280 | #a1a1aa | Secondary text |
| `--primary` | #3b82f6 | #60a5fa | Primary actions |
| `--danger` | #ef4444 | #f87171 | Destructive actions |
| `--success` | #10b981 | #34d399 | Success states |
| `--warning` | #f59e0b | #fbbf24 | Warnings |

### Accessibility Requirements

- All text: WCAG AA minimum (4.5:1 for normal, 3:1 for large)
- Never rely on color alone - use icons, patterns, or text
- Focus states must be visible
- Dark mode text verified: #E5E5E5 on #1A1A1A = 12.6:1

---

## Part 3: Typography

### Font Stacks

```css
/* Primary - System fonts */
font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text',
  'SF Pro Display', 'Helvetica Neue', sans-serif;

/* Monospace - Activity log, code */
font-family: 'JetBrains Mono', 'SF Mono', 'Menlo', monospace;
```

### Type Scale

| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| `--metric-hero` | 48-64px | 700 | 1.1 | Single most important number |
| `--metric-primary` | 32-40px | 700 | 1.2 | Key stats that need visibility |
| `--heading-section` | 24px | 600 | 1.25 | Widget titles, section breaks |
| `text-xl` | 20px | 500 | 1.3 | Card titles |
| `text-lg` | 18px | 500 | 1.4 | Subheadings |
| `text-base` | 16px (15px V2) | 400 | 1.5 | Body text |
| `text-sm` | 14px | 400 | 1.5 | Labels, secondary |
| `text-xs` | 12px | 400 | 1.5 | Captions, timestamps |
| `text-2xs` | 11px | 500 | 1.4 | Badges, uppercase labels |

### Metric Display Pattern

**Lead with the number, label below:**

```
✓ CORRECT              ✗ INCORRECT
┌──────────┐           ┌──────────┐
│    7     │           │ Tasks    │
│  tasks   │           │   7      │
│  today   │           │  today   │
└──────────┘           └──────────┘
```

### Typography Rules

1. **30% size difference** between hierarchy levels for clear distinction
2. **Maximum 3 sizes per view** - creates clear hierarchy
3. **Weight for emphasis** - use semibold (600), not italics
4. **Line length** - 60-80 characters max for readability
5. **Consistent casing** - Sentence case for UI, Title Case for navigation

---

## Part 4: Spacing

### Spacing Scale (8px Grid)

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-xs` | 4px | Tight: icon-to-label |
| `--spacing-sm` | 8px | Compact: within components |
| `--spacing-md` | 12px | Default: between elements |
| `--spacing-lg` | 16px | Comfortable: between groups |
| `--spacing-xl` | 20px | Relaxed: section padding |
| `--spacing-2xl` | 24px | Spacious: card padding (MINIMUM) |
| `--spacing-3xl` | 32px | Large: section gaps |
| `--spacing-4xl` | 48px | Extra large: major sections |

### Spacing Rules

1. **Use the scale** - No arbitrary values (13px, 17px)
2. **Minimum card padding: 24px** - Never less
3. **Whitespace is design** - When in doubt, add more space
4. **Group related items** - Tighter spacing = stronger relationship

### Density Zones

| Zone | Density | Padding | Example |
|------|---------|---------|---------|
| Hero/Focus | Spacious | 32-48px | Top dashboard area |
| Content Cards | Comfortable | 20-24px | Widget bodies |
| List Items | Compact | 8-12px | Task lists, events |
| Navigation | Tight | 8px | Sidebar items |

### Border Radius (Apple Continuous Curves)

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Inputs, small buttons, badges |
| `--radius-md` | 10px | Buttons, small cards |
| `--radius-lg` | 14px | Cards, panels |
| `--radius-xl` | 18px | Modals, large cards |
| `rounded-full` | 9999px | Avatars, pills |

---

## Part 5: Shadows

### Shadow Scale

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--shadow-sm` | 0 1px 3px rgba(0,0,0,0.08) | 0 1px 3px rgba(0,0,0,0.4) | Subtle depth |
| `--shadow-md` | 0 4px 12px rgba(0,0,0,0.08) | 0 4px 12px rgba(0,0,0,0.5) | Cards, panels |
| `--shadow-lg` | 0 8px 24px rgba(0,0,0,0.12) | 0 8px 24px rgba(0,0,0,0.5) | Modals, dropdowns |

### Shadow Rules

1. **Light source top-left** - Shadows go down and right
2. **Dark mode softer** - Higher opacity, add subtle borders
3. **Interactive feedback** - Increase shadow on hover

---

## Part 6: Glassmorphism

### Glass Variables

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--glass-bg` | rgba(255,255,255,0.75) | rgba(24,24,27,0.8) | Standard glass |
| `--glass-bg-heavy` | rgba(255,255,255,0.85) | rgba(24,24,27,0.9) | Focal elements |
| `--blur-medium` | 12px | 12px | Standard blur |
| `--blur-heavy` | 20px | 20px | Strong blur |

### Glass Application

| Apply Glass | Keep Solid |
|-------------|------------|
| Sidebar | Widget content |
| Topbar | Form inputs |
| Modals | Tables/data |
| Dropdowns | Text-heavy areas |
| Tooltips | Buttons |

```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid var(--v2-separator);
}
```

---

## Part 7: Components

### V2 Dashboard Components

#### MetricCard
Hero metrics with icon and label.

```jsx
<MetricCard
  value={7}
  label="tasks today"
  icon={<CheckSquare />}
  variant="danger" // default | danger | success | warning
/>
```

**Variants:** `default`, `danger` (red value), `success` (green value)

#### Widget
Standard widget container with header and actions.

```jsx
<Widget
  title="Tasks"
  action={<Button>See All</Button>}
  loading={isLoading}
>
  {/* Widget content */}
</Widget>
```

**Features:** Title, optional action, loading skeleton, hover actions

#### HoverActions
Action buttons that appear on hover.

```jsx
<HoverActions visible={isHovered}>
  <HoverAction icon={<Check />} label="Done" onClick={onDone} />
  <HoverAction icon={<Clock />} label="Defer" onClick={onDefer} />
</HoverActions>
```

**Task Actions:** Done, Defer
**Schedule Actions:** Join, Prep, Skip
**Inbox Actions:** Task, Note, Delete

#### TaskItem
Task row with checkbox, name, metadata, hover actions.

```jsx
<TaskItem
  task={task}
  onComplete={handleComplete}
  onDefer={handleDefer}
/>
```

#### ScheduleItem
Event row with time, name, location, hover actions.

```jsx
<ScheduleItem
  event={event}
  onJoin={handleJoin}
  onPrep={handlePrep}
  onSkip={handleSkip}
/>
```

#### ActivityRings
SVG-based circular progress indicators.

```jsx
<ActivityRings
  tasks={{ completed: 5, total: 8 }}
  focus={{ minutes: 45, goal: 60 }}
  inbox={{ processed: 12, total: 15 }}
/>
```

#### ProgressRing
Single circular progress ring.

```jsx
<ProgressRing
  progress={0.75}
  size={64}
  strokeWidth={6}
  color="var(--v2-blue)"
/>
```

### Standard Components

#### Buttons

| Variant | Usage | Style |
|---------|-------|-------|
| Primary | Main CTA | `bg-primary text-white` |
| Secondary | Secondary actions | `bg-panel2 text-text border` |
| Ghost | Tertiary actions | `bg-transparent hover:bg-panel2` |
| Danger | Destructive | `bg-danger text-white` |

**Sizes:** Small (px-3 py-1.5), Medium (px-4 py-2), Large (px-6 py-3)

#### Cards

```css
.card {
  background: var(--v2-bg-surface);
  border: 1px solid var(--v2-border-default);
  border-radius: var(--radius-lg);
  padding: var(--spacing-2xl); /* 24px minimum */
  box-shadow: var(--shadow-md);
}
```

#### Inputs

```css
.input {
  background: var(--v2-bg-surface);
  border: 1px solid var(--v2-border-default);
  border-radius: var(--radius-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  font-size: 15px;
  color: var(--v2-text-primary);
}

.input:focus {
  border-color: var(--v2-blue);
  box-shadow: 0 0 0 3px var(--v2-blue-light);
  outline: none;
}
```

#### Modals

- Use `BaseModal` component - never create custom modals
- Centered with backdrop blur
- Max width 480px for forms, 640px for content
- Close on backdrop click and Escape key

---

## Part 8: Animation

### Timing

| Duration | Usage |
|----------|-------|
| 100ms | Micro-interactions (hover, active) |
| 150ms | Small transitions (color, opacity) |
| 200ms | Medium transitions (expand/collapse) |
| 300ms | Large transitions (modals, panels) |

### Easing

| Curve | Usage |
|-------|-------|
| `ease-out` | Elements entering |
| `ease-in` | Elements leaving |
| `ease-in-out` | Looping animations |
| `cubic-bezier(0.32, 0.72, 0, 1)` | Slide panels (spring-like) |

### Animation Rules

1. **Purpose** - Every animation communicates something
2. **Subtle** - Users feel polish, don't notice animations
3. **Fast** - Under 300ms, never delay work
4. **Respect reduced motion** - Check `prefers-reduced-motion`

### Standard Animations

```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Skeleton shimmer */
@keyframes skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Check bounce */
@keyframes check-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}
```

---

## Part 9: Information Density

### Density Position

```
SPARSE ◄─────────────────────────► DENSE

Notion    Todoist    myBrain    Asana    Linear
          (target: "Comfortable Density")
```

### Information Tiers

**Tier 1 - Always Visible:**
- Item title/name
- Primary status (complete/incomplete)
- Most urgent date indicator

**Tier 2 - Visible on Hover/Focus:**
- Full description
- Tags/categories
- Secondary dates
- Actions beyond primary

**Tier 3 - In Detail View Only:**
- Full history
- All metadata
- Related items
- Comments/notes

---

## Part 10: Progressive Disclosure

### Reveal Hierarchy

```
Layer 0: Dashboard Summary
    └─ Click widget → Layer 1: Widget Detail View
        └─ Click item → Layer 2: Slide Panel Detail
            └─ Click action → Layer 3: Modal for Confirmation
```

### Disclosure Triggers

| Trigger | Reveals | Example |
|---------|---------|---------|
| Hover | Preview, quick actions | Task shows edit/delete |
| Click | Full detail | Opens slide panel |
| Expand | Secondary info | Chevron shows tasks |
| Search | Filtered results | Command palette |

### Progressive Forms

```
Creating a Task:
  Step 1 (visible): Title input only
  Step 2 (on demand): + Add date, + Add to project
  Step 3 (expanded): Full form with all options
```

---

## Part 11: Focus Modes

### Mode 1: Dashboard (Default)
- Full widget layout
- All information available
- For: Planning, review, overview

### Mode 2: Today Focus
- Single column
- Only today's tasks and events
- Large typography
- For: Deep work, execution

### Mode 3: Quick Capture
- Minimal interface
- Just input field
- Keyboard-driven
- For: Rapid capture

### Mode 4: Radar HUD (Toggle)
- Full-screen overlay
- Spatial "you at center" layout
- Items positioned by urgency/timeline
- For: Big picture view

---

## Part 12: Dark Mode

### Implementation

```css
/* Theme selector - PRIMARY */
.dark { /* Dark mode styles */ }

/* CSS variables handle most theming automatically */
.component {
  background: var(--v2-bg-surface);
  color: var(--v2-text-primary);
}
/* Variables change values in .dark context */
```

### Dark Mode Rules

1. **Designed, not inverted** - Dark mode is intentionally designed
2. **Not pure black** - Use #121212, #1A1A1A (Material standard)
3. **Not pure white** - Use #E5E5E5 for text (87% white)
4. **Softer shadows** - Higher opacity, add subtle borders
5. **Accent colors brighter** - Increase saturation slightly

### Contrast Ratios (Verified)

| Text | Background | Ratio | Status |
|------|------------|-------|--------|
| #E5E5E5 | #1A1A1A | 12.6:1 | Primary |
| #A0A0A0 | #1A1A1A | 6.3:1 | Secondary |
| #B0B0B0 | #1A1A1A | 7:1 | Tertiary |

### Radar Exception

The Radar view stays dark even in light mode. This is intentional - the radar is a full-screen overlay with space/sci-fi aesthetic that works best dark.

---

## Part 13: Anti-Patterns

**Never do these:**

### 1. Wall of Sameness
Everything looks same importance. Fix: 30%+ size differences.

### 2. Configuration Before Value
Requiring setup before useful. Fix: Work beautifully from first login.

### 3. Notification Overload
Multiple badges competing. Fix: Single "attention needed" indicator.

### 4. Red Means Danger Everywhere
Red for urgency, overdue, warnings. Fix: **Red for true errors ONLY.**

### 5. Modal Abuse
Every action requires modal. Fix: Inline confirmations, modals only for destructive.

### 6. Hidden Primary Actions
Main actions buried in menus. Fix: Primary actions visible by default.

### 7. Animation Theater
Slow, flashy transitions. Fix: Under 300ms, purposeful.

### 8. Inconsistent Patterns
Same action works differently in different places. Fix: Same action = same result everywhere.

### 9. Bento Grid for Bento's Sake
Trendy layouts without purpose. Fix: Let content dictate layout.

### 10. Dense Data Tables
Treating dashboard like spreadsheet. Fix: Use cards, visual indicators.

---

## Part 14: Accessibility

### Every Component Must Have

- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Focus indicators (visible focus ring)
- [ ] ARIA labels for screen readers
- [ ] Color contrast (WCAG AA minimum)
- [ ] Touch targets (44x44px minimum on mobile)
- [ ] Error states (not just color - icons/text too)

### Testing Checklist

1. Navigate entire UI with keyboard only
2. Test with screen reader
3. Check with color blindness simulator
4. Test at 200% zoom
5. Verify all touch targets on mobile

---

## Part 15: Mobile Patterns

See **[mobile-patterns.md](./mobile-patterns.md)** for:

- Bottom tab navigation
- iOS-style slide transitions (300ms)
- Touch targets (44px minimum)
- Panel animations
- Collapsible widgets
- Responsive breakpoints

### Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

---

## Quick Reference Examples

### V2 Widget Card

```jsx
<div className="v2-widget">
  <div className="v2-widget-header">
    <h3 className="v2-widget-title">Tasks</h3>
    <button className="v2-widget-action">See All</button>
  </div>
  <div className="v2-widget-content">
    {/* Content */}
  </div>
</div>
```

### V2 Metric Card

```jsx
<div className="v2-metric-card">
  <span className="v2-metric-value">7</span>
  <span className="v2-metric-label">tasks today</span>
</div>
```

### V2 Task Item with Hover Actions

```jsx
<div className="v2-task-item">
  <div className="v2-task-checkbox" />
  <div className="v2-task-content">
    <span className="v2-task-name">Review PR #123</span>
    <span className="v2-task-meta">Due today</span>
  </div>
  <div className="v2-task-actions">
    <button className="v2-action-btn">Done</button>
    <button className="v2-action-btn">Defer</button>
  </div>
</div>
```

---

## Do's and Don'ts

### Do ✓

- Use CSS variables (preferably `--v2-*` for new work)
- Follow the 8px spacing grid
- Maintain 30%+ size difference in hierarchy
- Add hover/focus states to interactive elements
- Test in both light and dark mode
- Use existing components
- Keep card padding at least 24px
- Lead metrics with the number, label below

### Don't ✗

- Hardcode colors (`#3b82f6` → use `var(--v2-blue)`)
- Use arbitrary spacing (`13px` → use `12px` or `16px`)
- Use red for non-errors (overdue, urgency)
- Create new modal implementations
- Skip hover states on clickable elements
- Forget loading states
- Use padding less than 24px on cards
- Put labels above numbers in metrics

---

*This document is authoritative for all UI work. When in conflict with other guidance, this document wins.*
