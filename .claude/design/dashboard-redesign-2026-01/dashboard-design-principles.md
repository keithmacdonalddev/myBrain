# myBrain Dashboard Design Principles

This document codifies design principles derived from research into world-class dashboards (Linear, Stripe, Notion, Figma, Todoist, Slack, Asana, Apple HIG, Airbnb, Google Material) and tailored specifically for myBrain.

**Purpose:** Guide all dashboard and UI decisions with actionable, research-backed principles.

**Last Updated:** 2026-01-30

---

## Table of Contents

1. [Core Design Philosophy](#1-core-design-philosophy)
2. [Visual Hierarchy Rules](#2-visual-hierarchy-rules)
3. [Spacing System](#3-spacing-system)
4. [Information Density Guidelines](#4-information-density-guidelines)
5. [Progressive Disclosure Patterns](#5-progressive-disclosure-patterns)
6. [Scanability Standards](#6-scanability-standards)
7. [Customization Philosophy](#7-customization-philosophy)
8. [Focus and Attention Patterns](#8-focus-and-attention-patterns)
9. [Delight and Polish](#9-delight-and-polish)
10. [Anti-Patterns](#10-anti-patterns)

---

## 1. Core Design Philosophy

### The Three Fundamentals

Every design decision in myBrain must embody these three principles:

| Fundamental | Definition | Application |
|-------------|------------|-------------|
| **Symmetry** | Visual balance and alignment | Elements should feel balanced, not randomly placed |
| **Simplicity** | Clarity over complexity | Remove what doesn't serve the user's goal |
| **Harmonious Proportions** | Consistent relationships between elements | Spacing, sizing, and relationships should feel natural |

### Five myBrain-Specific Principles

#### Principle 1: Performance Is UX
**Statement:** Speed and responsiveness are not technical concerns - they are core user experience features.

**Research Support:** Linear built their entire product identity around this. Their 50ms interaction targets aren't arbitrary - they create the feeling of a tool that "keeps up with your thoughts."

**Implementation for myBrain:**
- All interactions should feel instantaneous (under 100ms response)
- Use optimistic updates - show changes immediately, sync in background
- Skeleton loaders that match actual content dimensions (already implemented)
- Prefetch data for likely next actions (hover on project = prefetch tasks)

**Practical Application:**
```
User clicks "Complete Task"
  └─ IMMEDIATELY: Task shows checkmark animation, moves to completed
  └─ BACKGROUND: API call syncs change
  └─ IF FAILS: Subtle undo with explanation
```

#### Principle 2: Keyboard-First, Touch-Ready
**Statement:** Power users should never need a mouse. Casual users should never need a keyboard.

**Research Support:** Linear's keyboard navigation isn't just a feature - it's fundamental to their speed promise. Todoist achieves similar with intelligent defaults.

**Implementation for myBrain:**
- Global shortcuts for all common actions (already partially implemented)
- Command palette for everything (`Cmd+K` / `Ctrl+K`)
- Arrow keys navigate between items naturally
- Touch targets remain 44px+ for mobile
- Both interaction modes should feel equally polished

**Priority Shortcuts:**
| Action | Shortcut | Reason |
|--------|----------|--------|
| Quick Capture | `C` or `Cmd+Shift+Space` | Fastest path to productivity |
| Go to Today | `T` | Most-used view |
| Search Everything | `Cmd+K` | Universal access |
| Complete Task | `E` or `Space` (when focused) | Frequent action |

#### Principle 3: Opinionated Defaults, Gentle Flexibility
**Statement:** Make the best choice for users by default. Allow customization, but don't require it.

**Research Support:** Linear is explicitly opinionated - they make decisions so users don't have to. Notion goes the opposite direction (blank canvas). For a productivity tool, opinionated wins.

**Implementation for myBrain:**
- Dashboard comes pre-configured with sensible widget layout
- New users see the "recommended" setup immediately
- Customization is available but not in your face
- Settings are progressive: basic visible, advanced tucked away

**What This Means Practically:**
- DON'T: Show empty state with "Add your first widget"
- DO: Show a complete, working dashboard from day one
- DON'T: Require configuration before the app is useful
- DO: Work beautifully out of the box, refine over time

#### Principle 4: Calm Productivity
**Statement:** The interface should reduce anxiety, not create it. Productivity comes from clarity, not pressure.

**Research Support:** Asana's "mindful design" explicitly reduces cognitive load. Todoist's deliberate minimalism serves the same goal. Slack's "Focus" mode exists because even they recognized overwhelm.

**Implementation for myBrain:**
- Never show more than one urgent-feeling notification at a time
- Overdue items are visible but not screaming
- Progress indicators celebrate progress, don't shame incompleteness
- Whitespace is generous - the app should feel spacious, not cramped
- Avoid red except for true errors (not just "overdue")

**Color Psychology in myBrain:**
| Color | Use For | Never Use For |
|-------|---------|---------------|
| Primary Blue | Actions, links, selected states | Warnings, urgency |
| Green | Completion, success | Attention-grabbing |
| Yellow/Amber | Gentle reminders, approaching deadlines | Strong warnings |
| Red | True errors only | Overdue tasks, "you should do this" |

#### Principle 5: One Glance, One Truth
**Statement:** The dashboard should answer "What should I focus on right now?" in under 5 seconds.

**Research Support:** Stripe's bold primary metrics exist because executives need answers fast. Apple's HIG emphasizes "focus on primary content." Every well-designed dashboard has a clear visual hierarchy.

**Implementation for myBrain:**
- One dominant metric or focus area per view
- Today's most important item should be immediately obvious
- Secondary information supports, doesn't compete with, the primary
- Use size, weight, and position - not just color - to create hierarchy

**The 5-Second Test:**
```
A user opens myBrain for the first time today.
Within 5 seconds, they should know:
  1. How many things need attention today
  2. What's most important right now
  3. Their overall "status" (on track, behind, ahead)
```

---

## 2. Visual Hierarchy Rules

### Typography Scale Recommendations

**Current Issue:** Similar sizes throughout create weak hierarchy. Body text (16px), labels (14px), and card titles (18px) are too close.

**Research-Backed Scale:**

| Level | Current | Recommended | Purpose | Inspiration |
|-------|---------|-------------|---------|-------------|
| Hero Metric | N/A | 48-64px | Single most important number | Stripe dashboards |
| Primary Metric | ~24px | 32-40px | Key stats that need visibility | Stripe, Linear |
| Section Header | 20px | 24px, semibold | Widget titles, section breaks | Apple HIG |
| Card Title | 18px | 20px, medium | Individual item titles | Todoist |
| Body | 16px | 16px | Content text | Universal |
| Secondary | 14px | 14px | Labels, metadata | Universal |
| Caption | 12px | 12px | Timestamps, hints | Universal |

**Implementation Guidance:**

```css
/* Add to theme.css */
--metric-hero: 3rem;      /* 48px - for single dominant stat */
--metric-primary: 2rem;   /* 32px - for key metrics */
--heading-section: 1.5rem; /* 24px - for section headers */
```

**Key Principle:** Create at least 30% size difference between hierarchy levels for clear distinction.

### Metric Sizing Patterns

**The Stripe Pattern:** One bold number dominates, supported by smaller contextual numbers.

```
┌─────────────────────────────┐
│  7 ←────── Hero (48px)      │
│  tasks today                │
│                             │
│  3 overdue  │  4 upcoming   │ ← Secondary (20px)
└─────────────────────────────┘
```

**For myBrain Dashboard:**

| Widget | Hero Metric | Supporting Metrics |
|--------|-------------|-------------------|
| Today Focus | Number of priority tasks | Completed vs remaining |
| Calendar | Next event (time) | Total events today |
| Projects | Active project count | Tasks due this week |
| Goals | Current streak or % | Days/items remaining |

### Emphasis Patterns

**Beyond Size - Weight and Position Matter:**

| Technique | When to Use | Example |
|-----------|-------------|---------|
| Size | Primary hierarchy | Hero metrics vs body text |
| Weight | Secondary emphasis | Bold task names, regular descriptions |
| Position | Importance ordering | Most urgent at top-left (western reading) |
| Contrast | Interactive elements | Primary buttons vs ghost buttons |
| Whitespace | Isolation = importance | Hero metric with ample padding |

**Never rely on color alone for emphasis** - this fails accessibility and reduces hierarchy clarity.

---

## 3. Spacing System

### Current Issues Identified

- Cramped padding throughout (0.625-0.75rem common)
- Inconsistent spacing between similar elements
- Widget content feels compressed

### Research-Backed Recommendations

**The 8px Grid (Google Material):**
All spacing should be multiples of 8px. This creates natural rhythm and consistency.

| Token | Current | Recommended | Usage |
|-------|---------|-------------|-------|
| `space-2` | 8px | 8px | Icon-to-label gaps |
| `space-3` | 12px | 12px | Within-component spacing |
| `space-4` | 16px | 16px | Between related elements |
| `space-6` | 24px | 24px | Card padding (minimum) |
| `space-8` | 32px | 32px | Section gaps |
| `space-10` | 40px | 48px | Major section breaks |

### Card Padding Updates

**Current:** Many cards use 0.625rem (10px) padding
**Recommendation:** Minimum 1rem (16px), prefer 1.5rem (24px) for content cards

**Airbnb's Whitespace Principle:** "When in doubt, add more space." Cramped interfaces feel stressful.

**Practical Changes:**

```css
/* Card padding - increase from current */
.widget-card {
  padding: 1.5rem; /* 24px minimum, up from 10-12px */
}

/* Widget header */
.widget-header {
  padding-bottom: 1rem; /* Clear separation from content */
  margin-bottom: 1rem;
}

/* List items within widgets */
.widget-item {
  padding: 0.75rem 0; /* 12px vertical breathing room */
}
```

### Density Zones

**Not all areas should have equal spacing:**

| Zone | Density | Padding | Example |
|------|---------|---------|---------|
| Hero/Focus | Spacious | 32-48px | Top dashboard area |
| Content Cards | Comfortable | 20-24px | Widget bodies |
| List Items | Compact | 8-12px | Task lists, event lists |
| Navigation | Tight | 8px | Sidebar items |

---

## 4. Information Density Guidelines

### The Density Spectrum

```
SPARSE ◄─────────────────────────────────► DENSE

Notion      Todoist      myBrain      Asana      Linear
(blank      (minimal,    (target)     (structured, (maximum
canvas)     focused)                  detailed)   info)
```

**myBrain's Position:** Aim for "Comfortable Density" - more structured than Todoist, less packed than Linear.

### When to Show More

| Scenario | Density Approach | Example |
|----------|------------------|---------|
| User is in "work mode" | Higher density acceptable | Full task list with metadata |
| Scanning/overview | Lower density | Dashboard summary cards |
| Making decisions | Show all relevant info | Project details panel |
| Quick capture | Minimal | Only input field visible |

### When to Show Less

| Scenario | Approach | Example |
|----------|----------|---------|
| Mobile viewport | Collapse secondary info | Hide task metadata, show title only |
| Empty/low-activity states | Emphasize the few items | Large cards for 1-3 items |
| First-time user | Gradual reveal | Start with essentials |
| Overdue/overwhelming | Filter to actionable | "Focus mode" showing only 3-5 items |

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

## 5. Progressive Disclosure Patterns

### The Reveal Hierarchy

**Figma Pattern:** "See before committing" - preview states before making changes.

**Implementation Layers:**

```
Layer 0: Dashboard Summary
    └─ Click widget → Layer 1: Widget Detail View
        └─ Click item → Layer 2: Slide Panel Detail
            └─ Click action → Layer 3: Modal for Confirmation
```

### Disclosure Triggers

| Trigger | Reveals | Example |
|---------|---------|---------|
| Hover | Preview, quick actions | Task hover shows edit/delete icons |
| Click | Full detail | Click task opens slide panel |
| Expand | Secondary info | Chevron expands project to show tasks |
| Search | Filtered results | Command palette shows matching items |
| Scroll | Lazy-loaded content | Load more tasks on scroll |

### Progressive Form Disclosure

**Don't show all form fields at once.**

```
Creating a Task:
  Step 1 (visible): Title input only
  Step 2 (on demand): + Add date, + Add to project
  Step 3 (expanded): Full form with all options
```

**Todoist does this well:** Quick add shows only title. Tab/click reveals more fields.

### "More" Patterns

| Pattern | When to Use | Implementation |
|---------|-------------|----------------|
| "Show more" link | List truncation | After 5 items, show link to expand |
| Ellipsis menu | Secondary actions | Group 3+ actions into dropdown |
| Expandable sections | Related but secondary | Chevron-toggle for details |
| "Advanced" toggle | Power-user options | Collapsed by default |

---

## 6. Scanability Standards

### The 5-Second Rule

**What users should understand within 5 seconds of seeing the dashboard:**

1. **Status Check:** Am I on track today? (via primary metric)
2. **Next Action:** What should I do first? (via prominence)
3. **Time Context:** What's happening when? (via calendar/schedule)
4. **Scope Awareness:** How much is on my plate? (via counts/progress)

### Visual Landmarks

**Create clear visual anchors that eyes can jump to:**

| Landmark | Purpose | Implementation |
|----------|---------|----------------|
| Top-left hero | Most important metric | Large, bold, isolated |
| Color accents | Status at a glance | Consistent semantic colors |
| Section headers | Navigation aid | Clear typography break |
| Empty space | Breathing room | Intentional whitespace |

### Scanability Checklist

For any dashboard view, verify:

- [ ] One element is clearly the most important (size, position, or weight)
- [ ] Numbers are scannable (proper sizing, not buried in text)
- [ ] Status is visible without reading (icons, colors support text)
- [ ] Related items are visually grouped
- [ ] Nothing critical requires scrolling to see

### Quick-Scan Metrics for myBrain

| Metric | Why Scannable | Display |
|--------|---------------|---------|
| Tasks due today | Immediate relevance | Large number, top of dashboard |
| Upcoming events | Time-sensitive | Next event with countdown |
| Streak/progress | Motivation | Visual progress indicator |
| Overdue count | Attention needed | Subtle (not alarming) indicator |

### Typography for Scanning

**Stripe Pattern:** Metric labels below numbers, not above.

```
✓ GOOD                    ✗ BAD
┌──────────┐              ┌──────────┐
│    7     │              │ Tasks    │
│  tasks   │              │   7      │
│  today   │              │  today   │
└──────────┘              └──────────┘
```

**The number is what matters. Lead with it.**

---

## 7. Customization Philosophy

### The Spectrum of Customization

```
RIGID ◄────────────────────────────────────► CHAOTIC

Apple       myBrain      Todoist       Notion
(our way    (target)     (some         (infinite
or highway)              flexibility)  canvas)
```

**myBrain's Position:** Guided customization - users can personalize within a designed framework.

### What Should Be Customizable

| Element | Customization Level | Reasoning |
|---------|---------------------|-----------|
| Widget visibility | Toggle on/off | Users have different workflows |
| Widget order | Drag to reorder | Prioritize what matters to them |
| Default view | Select from options | Today vs. Dashboard vs. Projects |
| Theme | Light/Dark/System | Personal preference |
| Density | Compact/Comfortable | Screen size, preference |

### What Should NOT Be Customizable

| Element | Why Fixed | Alternative |
|---------|-----------|-------------|
| Typography scale | Consistency, readability | None - trust the design |
| Spacing system | Visual rhythm | None - trust the design |
| Color meanings | Semantic consistency | Theme handles palette |
| Animation timing | Feel/quality | Reduced motion for accessibility |
| Core navigation | Learnability | Sidebar reordering only |

### Discoverable Customization (Notion Pattern)

**Don't make users hunt for customization. Don't make it prominent either.**

**Implementation:**

1. **Hover reveals:** Widget header shows gear icon on hover
2. **Context menus:** Right-click on items shows options
3. **Settings page:** Advanced customization in dedicated section
4. **Keyboard shortcuts:** Power users discover via Cmd+K

### Customization Without Configuration

**Intelligent defaults that adapt:**

| Observation | Automatic Adjustment |
|-------------|---------------------|
| User always collapses Calendar | Collapse by default |
| User primarily uses Tasks | Make Tasks widget larger |
| User rarely uses Files | Suggest hiding it |
| Morning logins | Show today's schedule first |

---

## 8. Focus and Attention Patterns

### The Problem of Overwhelm

**Current issue identified:** 3 columns x multiple widgets can feel overwhelming.

**Research insight:** Slack introduced "Focus" mode because even messaging apps needed cognitive load reduction.

### Focus Modes for myBrain

**Mode 1: Dashboard (Default)**
- Full widget layout
- All information available
- For: Planning, review, overview

**Mode 2: Today Focus**
- Single column
- Only today's tasks and events
- Large typography
- For: Deep work, execution

**Mode 3: Quick Capture**
- Minimal interface
- Just input field
- Keyboard-driven
- For: Rapid capture without context switch

### Attention Management Principles

**Reduce Decision Fatigue:**

| Instead of... | Do this... |
|---------------|------------|
| Showing all 47 tasks | Show "3 priority tasks for today" |
| Equal prominence for everything | Clear hierarchy of importance |
| Notification badges everywhere | Single "attention needed" indicator |
| Red for all urgency | Reserve red for true emergencies |

### View Transitions

**When switching focus modes, smooth the transition:**

```
Dashboard → Today Focus:
  1. Widgets fade and shrink to side
  2. Today content expands and centers
  3. Total duration: 300ms
```

This follows Figma's "see before committing" - users preview the change before it completes.

### Notification Philosophy

**From Slack's learning: Every notification is a tax on attention.**

| Notification Type | Treatment |
|-------------------|-----------|
| Task due today | Badge on Today view (not global) |
| Task overdue | Subtle indicator (amber, not red) |
| Message received | Single indicator, not per-message |
| System update | Dismissible banner, not modal |

**Never interrupt deep work for non-urgent notifications.**

---

## 9. Delight and Polish

### Micro-Interactions (Todoist Pattern)

**Small moments that feel good:**

| Interaction | Delight Element | Implementation |
|-------------|-----------------|----------------|
| Complete task | Satisfying checkmark animation | 200ms bounce + confetti (rare) |
| Add new item | Item slides in smoothly | 150ms ease-out |
| Drag reorder | Item "lifts" with shadow | Elevation + slight scale |
| Hover | Subtle highlight | 100ms background fade |
| Success | Gentle confirmation | Green checkmark + fade |

### Celebration Moments (Todoist Pattern)

**When to celebrate (sparingly):**

| Achievement | Celebration |
|-------------|-------------|
| All tasks completed for day | Subtle congratulatory message |
| Streak milestone (7, 30 days) | Small animation + message |
| Project completed | Completion animation |
| First task ever | Welcome acknowledgment |

**When NOT to celebrate:**
- Every single task completion (becomes noise)
- Routine actions (logging in, creating items)
- Small progressions (2 tasks done out of 50)

### Sound Design Principles

**If implementing sounds:**

| Action | Sound Character |
|--------|-----------------|
| Complete | Soft, satisfying "tick" |
| Error | Gentle "bump" (not alarming) |
| Notification | Subtle chime (not demanding) |
| All Done | Musical resolution |

**Always respect system sound/mute settings. Always optional.**

### Loading State Polish

**Skeleton loaders should:**
- Match actual content dimensions exactly
- Animate with subtle pulse (not harsh flash)
- Appear instantly (no delay before skeleton)
- Disappear smoothly (fade content in)

**Currently implemented, ensure:**
- View-aware dimensions (different skeletons for different contexts)
- Consistent animation timing across all skeletons

### Error State Polish

**Errors should be:**
- Helpful, not blaming ("Couldn't save" not "You broke it")
- Actionable ("Try again" button, not just message)
- Recoverable (offer clear path forward)
- Temporary (auto-dismiss success, persist errors until resolved)

---

## 10. Anti-Patterns

### What to Avoid (Research-Backed)

#### Anti-Pattern 1: The Wall of Sameness
**Problem:** Everything looks the same importance.
**Evidence:** Current myBrain has similar typography sizes throughout.

**Fix:** Create clear hierarchy with 30%+ size differences between levels.

```
✗ BAD                        ✓ GOOD
┌─────────────────┐          ┌─────────────────┐
│ Tasks: 7        │          │       7         │
│ Events: 3       │          │    tasks        │
│ Notes: 12       │          │                 │
│ Projects: 4     │          │ 3 events today  │
└─────────────────┘          └─────────────────┘
```

#### Anti-Pattern 2: Configuration Before Value
**Problem:** Requiring setup before the app is useful.
**Evidence:** Empty states that say "Add your first..."

**Fix:** Ship with intelligent defaults. Work beautifully from first login.

**Notion's trap:** Blank canvas overwhelms new users. Avoid this.

#### Anti-Pattern 3: Notification Overload
**Problem:** Every possible alert shown simultaneously.
**Evidence:** Multiple badges, red indicators, competing for attention.

**Fix:** Single "attention needed" indicator. Details on click.

#### Anti-Pattern 4: The Dense Data Table
**Problem:** Cramming everything into rows and columns.
**Evidence:** Treating dashboard like a spreadsheet.

**Fix:** Use cards, visual indicators, and progressive disclosure.

#### Anti-Pattern 5: Red Means Danger Everywhere
**Problem:** Using red for urgency, overdue, warnings, and attention.
**Evidence:** Red desensitizes users and creates anxiety.

**Fix:** Reserve red for true errors only. Use amber for urgency.

#### Anti-Pattern 6: Bento Grid for Bento's Sake
**Problem:** Using trendy layouts without purpose.
**Evidence:** User rejected bento grid as "same old feel."

**Fix:** Let content dictate layout. Prioritize function over aesthetic trend.

#### Anti-Pattern 7: Modal Abuse
**Problem:** Every action requires a modal confirmation.
**Evidence:** Click fatigue, interrupted flow.

**Fix:** Use inline confirmations. Modals only for truly destructive actions.

#### Anti-Pattern 8: Hidden Primary Actions
**Problem:** Main actions buried in menus or requiring discovery.
**Evidence:** Users can't find how to do basic things.

**Fix:** Primary actions visible by default. Progressive disclosure for secondary.

#### Anti-Pattern 9: Animation Theater
**Problem:** Animations that show off rather than serve function.
**Evidence:** Slow, flashy transitions that delay work.

**Fix:** Animations should feel fast (under 300ms) and purposeful.

#### Anti-Pattern 10: Inconsistent Patterns
**Problem:** Same action works differently in different places.
**Evidence:** Click opens panel here, modal there, new page elsewhere.

**Fix:** Same action = same result, everywhere in the app.

---

## Implementation Priority

### High Priority (Address First)

1. **Typography hierarchy** - Add hero metric sizing, increase header contrast
2. **Card padding** - Increase from 10px to 24px minimum
3. **Quick-scan metrics** - Add primary dashboard metric that's immediately visible
4. **Consistent spacing** - Audit and align to 8px grid

### Medium Priority (Next Phase)

5. **Progressive disclosure** - Implement hover-reveal for secondary actions
6. **Focus mode** - Add simplified "Today" view option
7. **Celebration moments** - Add completion animations (subtle)
8. **Command palette** - Implement `Cmd+K` for everything

### Lower Priority (Polish Phase)

9. **Discoverable customization** - Widget settings on hover
10. **Intelligent defaults** - Track usage, adapt layout suggestions
11. **Sound design** - Optional audio feedback
12. **Notification consolidation** - Single attention indicator

---

## Measuring Success

### Qualitative Signals

- Users describe the app as "calm" or "clear"
- New users understand the dashboard without explanation
- Power users feel the app keeps up with them
- Mobile users don't feel cramped

### Quantitative Signals

| Metric | Target | Why |
|--------|--------|-----|
| Time to first action | < 5 seconds | Quick understanding |
| Tasks completed per session | Increase | Effective workflow |
| Return visits | Increase | Value delivered |
| Settings customization rate | 20-40% | Defaults work, options exist |

---

## References

| Company | Key Learning |
|---------|--------------|
| Linear | Performance as UX, keyboard-first, opinionated |
| Stripe | Bold metrics, clear hierarchy |
| Notion | Progressive disclosure, flexibility |
| Figma | Preview before commit, micro-animations |
| Todoist | Minimalism, celebration moments |
| Slack | Focus modes, notification management |
| Asana | Mindful design, structure |
| Apple HIG | Primary content focus, feedback |
| Airbnb | Whitespace, typography |
| Google Material | 8dp grid, clarity |

---

*This document should be referenced for all dashboard and UI work. Principles here take precedence over general aesthetic preferences when they conflict.*
