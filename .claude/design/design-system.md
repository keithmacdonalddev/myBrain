# myBrain Design System

This document defines the visual language for myBrain. Follow these guidelines for all UI work.

---

## Design Philosophy

### Core Principles

1. **Calm & Focused** - Reduce cognitive load. The app helps you think, not distract you.
2. **Consistent** - Same patterns everywhere. Users learn once, apply everywhere.
3. **Accessible** - Works for everyone. Color contrast, keyboard navigation, screen readers.
4. **Responsive** - Works on all devices. Mobile-first, scales up gracefully.
5. **Delightful** - Subtle animations and polish. Professional but not cold.

### Personality

| Trait | Expression |
|-------|------------|
| Professional | Clean lines, purposeful spacing, no clutter |
| Friendly | Rounded corners, warm colors, micro-animations |
| Trustworthy | Consistent patterns, predictable behavior |
| Modern | Current trends, but timeless fundamentals |

### Target Aesthetic

Think: **Linear, Notion, Raycast** - clean, modern productivity tools that feel premium but approachable.

---

## Colors

### Semantic Colors (Use These)

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--bg` | #ffffff | #09090b | Page background |
| `--panel` | #f9fafb | #18181b | Card/panel backgrounds |
| `--panel2` | #f3f4f6 | #27272a | Secondary panels, hover states |
| `--border` | #e5e7eb | #3f3f46 | Borders, dividers |
| `--text` | #111827 | #fafafa | Primary text |
| `--muted` | #6b7280 | #a1a1aa | Secondary text, placeholders |
| `--primary` | #3b82f6 | #60a5fa | Primary actions, links |
| `--primary-hover` | #2563eb | #3b82f6 | Primary hover states |
| `--danger` | #ef4444 | #f87171 | Destructive actions, errors |
| `--success` | #10b981 | #34d399 | Success states, confirmations |
| `--warning` | #f59e0b | #fbbf24 | Warnings, attention needed |

### Color Usage Rules

1. **Never hardcode colors** - Always use CSS variables
2. **Primary sparingly** - Only for main CTAs and links
3. **Danger carefully** - Only for destructive actions
4. **Text hierarchy** - `--text` for primary, `--muted` for secondary
5. **Borders subtle** - Use `--border`, never stark black/white

### Accessibility

- All text must meet WCAG AA contrast ratios (4.5:1 for normal text)
- Don't rely on color alone - use icons, patterns, or text labels
- Focus states must be visible

---

## Typography

### Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
  'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
```

### Type Scale

| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| `text-xs` | 12px | 400 | 1.5 | Captions, timestamps |
| `text-sm` | 14px | 400 | 1.5 | Secondary text, labels |
| `text-base` | 16px | 400 | 1.5 | Body text (default) |
| `text-lg` | 18px | 500 | 1.4 | Card titles, subheadings |
| `text-xl` | 20px | 600 | 1.3 | Section headings |
| `text-2xl` | 24px | 600 | 1.25 | Page titles |
| `text-3xl` | 30px | 700 | 1.2 | Hero/feature titles |

### Typography Rules

1. **Maximum 3 sizes per view** - Creates clear hierarchy
2. **Weight for emphasis** - Use semibold (600) not italics
3. **Line length** - 60-80 characters max for readability
4. **Consistent casing** - Sentence case for UI, Title Case for navigation

---

## Spacing

### Spacing Scale (Based on 4px)

| Token | Value | Usage |
|-------|-------|-------|
| `space-0` | 0px | Reset |
| `space-1` | 4px | Tight: between icon and label |
| `space-2` | 8px | Compact: within components |
| `space-3` | 12px | Default: between elements |
| `space-4` | 16px | Comfortable: between groups |
| `space-5` | 20px | Relaxed: section padding |
| `space-6` | 24px | Spacious: card padding |
| `space-8` | 32px | Large: section gaps |
| `space-10` | 40px | Extra large: major sections |
| `space-12` | 48px | Page padding |

### Spacing Rules

1. **Use the scale** - Don't use arbitrary values (13px, 17px)
2. **Consistent padding** - Cards always use `space-6` (24px)
3. **Whitespace is design** - When in doubt, add more space
4. **Group related items** - Tighter spacing = stronger relationship

---

## Shadows

### Shadow Scale

| Token | Usage |
|-------|-------|
| `--shadow-xs` | Subtle depth, inputs |
| `--shadow-sm` | Buttons, small cards |
| `--shadow-md` | Cards, panels |
| `--shadow-lg` | Dropdowns, popovers |
| `--shadow-xl` | Modals |
| `--shadow-2xl` | Floating elements |
| `--shadow-card` | Standard card elevation |
| `--shadow-elevated` | Hovered cards |
| `--shadow-floating` | Dropdowns, modals |
| `--shadow-glow` | Focus rings |

### Shadow Rules

1. **Light source top-left** - Shadows go down and right
2. **Elevation = importance** - Higher shadow = more prominent
3. **Dark mode softer** - Shadows less visible, use subtle borders
4. **Interactive feedback** - Increase shadow on hover

---

## Border Radius

### Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-none` | 0px | Tables, dividers |
| `rounded-sm` | 2px | Badges, tags |
| `rounded` | 4px | Inputs, small buttons |
| `rounded-md` | 6px | Buttons, small cards |
| `rounded-lg` | 8px | Cards, panels |
| `rounded-xl` | 12px | Modals, large cards |
| `rounded-2xl` | 16px | Featured cards |
| `rounded-full` | 9999px | Avatars, pills |

### Radius Rules

1. **Consistent within context** - All cards same radius
2. **Nested elements smaller** - Button inside card uses smaller radius
3. **Functional shapes** - Avatars circular, cards rectangular

---

## Components

### Buttons

**Variants:**
| Variant | Usage | Style |
|---------|-------|-------|
| Primary | Main CTA | `bg-primary text-white` |
| Secondary | Secondary actions | `bg-panel2 text-text border` |
| Ghost | Tertiary actions | `bg-transparent text-muted hover:bg-panel2` |
| Danger | Destructive | `bg-danger text-white` |

**Sizes:**
| Size | Padding | Font |
|------|---------|------|
| Small | `px-3 py-1.5` | `text-sm` |
| Medium | `px-4 py-2` | `text-base` |
| Large | `px-6 py-3` | `text-lg` |

**States:**
- Default → Hover (slight lift, deeper shadow) → Active (pressed down) → Disabled (50% opacity)

### Cards

```css
.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px; /* rounded-lg */
  padding: 24px; /* space-6 */
  box-shadow: var(--shadow-card);
}

.card:hover {
  box-shadow: var(--shadow-elevated);
}
```

### Inputs

```css
.input {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px; /* rounded-md */
  padding: 8px 12px; /* space-2 space-3 */
  font-size: 16px;
  color: var(--text);
}

.input:focus {
  border-color: var(--primary);
  box-shadow: var(--shadow-glow);
  outline: none;
}
```

### Modals

- Use `BaseModal` component - never create custom modals
- Centered with backdrop blur
- Max width 480px for forms, 640px for content
- Close on backdrop click and Escape key
- Focus trap inside modal

---

## Animation

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
| `ease-out` | Elements entering (fast start, gentle end) |
| `ease-in` | Elements leaving (gentle start, fast end) |
| `ease-in-out` | Looping animations |
| `cubic-bezier(0.32, 0.72, 0, 1)` | Slide panels (spring-like) |

### Animation Rules

1. **Purpose** - Every animation should communicate something
2. **Subtle** - Users shouldn't notice animations, just feel polish
3. **Interruptible** - Animations shouldn't block interaction
4. **Reduce motion** - Respect `prefers-reduced-motion`

### Available Animations

- `.animate-fade-in` - Gentle fade with slight Y movement
- `.animate-slide-in` - Slide from right (toasts)
- `.animate-slide-up` - Slide from bottom (mobile panels)
- `.animate-scale-in` - Scale up (dropdowns, modals)
- `.animate-check-bounce` - Checkbox completion
- `.animate-stagger-1/2/3/4` - Staggered reveals

---

## Layout

### Container Widths

| Context | Max Width |
|---------|-----------|
| Full page content | 1280px |
| Article/reading | 768px |
| Forms | 480px |
| Modals | 480px-640px |

### Grid

- Use CSS Grid or Flexbox (via Tailwind)
- 12-column grid for complex layouts
- Gap of `space-4` (16px) or `space-6` (24px)

### Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

---

## Icons

### Guidelines

1. **Consistent set** - Use Lucide icons throughout
2. **Size with text** - Icons match nearby text size
3. **Stroke width** - Default 2px, adjust for balance
4. **Semantic** - Icon meaning should be obvious
5. **Labels** - Pair icons with text when possible

### Common Icons

| Action | Icon |
|--------|------|
| Add/Create | `Plus` |
| Edit | `Pencil` |
| Delete | `Trash2` |
| Settings | `Settings` |
| Search | `Search` |
| Close | `X` |
| Menu | `Menu` |
| Back | `ArrowLeft` |
| More options | `MoreHorizontal` |

---

## Accessibility Checklist

### Every Component Must Have:

- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Focus indicators (visible focus ring)
- [ ] ARIA labels for screen readers
- [ ] Color contrast (WCAG AA minimum)
- [ ] Touch targets (44x44px minimum on mobile)
- [ ] Error states (not just color - icons/text too)

### Testing

1. Navigate entire UI with keyboard only
2. Test with screen reader (VoiceOver/NVDA)
3. Check with color blindness simulator
4. Test at 200% zoom

---

## Dark Mode

### Implementation

- Use CSS variables for all colors
- Toggle `.dark` class on `html` element
- Store preference in localStorage
- Respect `prefers-color-scheme`

### Dark Mode Rules

1. **Not inverted** - Dark mode is designed, not just inverted
2. **Softer shadows** - Use higher opacity, add subtle borders
3. **Reduce contrast slightly** - Pure white (#fff) becomes off-white (#fafafa)
4. **Accent colors lighter** - Primary blue shifts from #3b82f6 to #60a5fa

---

## Do's and Don'ts

### Do ✓

- Use semantic color tokens
- Follow the spacing scale
- Add hover/focus states to interactive elements
- Test in both light and dark mode
- Use existing components (BaseModal, Skeleton, etc.)
- Match existing patterns in similar views

### Don't ✗

- Hardcode colors (`#3b82f6` → use `var(--primary)`)
- Use arbitrary spacing (`13px` → use `12px` or `16px`)
- Create new modal/dialog implementations
- Skip hover states on clickable elements
- Forget loading states
- Ignore mobile responsiveness

---

## Quick Reference

### Standard Card

```jsx
<div className="bg-[var(--panel)] border border-[var(--border)] rounded-lg p-6 shadow-theme-card hover:shadow-theme-elevated transition-shadow">
  {/* content */}
</div>
```

### Primary Button

```jsx
<button className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-md font-medium transition-colors">
  Button
</button>
```

### Input Field

```jsx
<input
  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-md px-3 py-2 text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-glow)] outline-none transition-colors"
  placeholder="Enter text..."
/>
```

---

## Mobile Patterns

See **[mobile-patterns.md](./mobile-patterns.md)** for comprehensive mobile documentation including:

- Bottom tab navigation (Menu, Search, Settings, Profile)
- iOS-style horizontal slide transitions (300ms ease-in-out)
- Touch targets (44px minimum)
- Panel animations (cubic-bezier(0.32, 0.72, 0, 1))
- Collapsible widget pattern
- Responsive breakpoint usage

---

*Last updated: 2025-01-21*
