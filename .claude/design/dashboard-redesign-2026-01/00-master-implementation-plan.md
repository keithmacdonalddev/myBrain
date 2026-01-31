# Dashboard V2 Complete Implementation Plan

## Executive Summary

**Goal:** 100% adoption of the prototype design (`dashboard-final-v2.html`) across the entire myBrain application with fully reusable components.

**Scope:**
1. Sidebar complete redesign (Quick Actions, Navigation, Activity Rings)
2. Dashboard V2 widget styling fixes
3. Site-wide design system adoption (150+ files)
4. Reusable component library

**Source of Truth:** `.claude/design/dashboard-redesign-2026-01/dashboard-final-v2.html`

---

## Monitoring Strategy

### Always-Active Monitors (Run Throughout)

| Monitor ID | Monitor Type | Purpose | Trigger |
|------------|--------------|---------|---------|
| M1 | Prototype Fidelity | Compare implementation to HTML prototype | After any component change |
| M2 | CSS Compliance | Verify v2 CSS variables used | After any CSS change |
| M3 | Dark Mode Contrast | Verify WCAG AA compliance | After any color change |
| M4 | Component Reusability | Ensure no duplicate code | After any component creation |
| M5 | Test Coverage | Ensure tests exist for new code | After any new component |
| M6 | Build Health | Verify no build errors | After every 10 tasks |
| M7 | Cross-Reference | Check docs match code | After documentation updates |
| M8 | Visual Regression | Screenshot comparison | After each phase |

### Validation Checkpoints

| Checkpoint | After Phase | Requirements |
|------------|-------------|--------------|
| CP1 | Phase 1 | All CSS variables defined, build passes |
| CP2 | Phase 2 | All components render, tests pass |
| CP3 | Phase 3 | Sidebar matches prototype |
| CP4 | Phase 4 | Dashboard matches prototype |
| CP5 | Phase 5 | All pages use v2 system |
| CP6 | Phase 6 | Dark mode fully working |
| CP7 | Phase 7 | Animations smooth |
| CP8 | Phase 8 | All tests pass |
| CP9 | Phase 9 | Production ready |

---

## Phase 1: Design System Foundation (68 tasks)

### 1.1 CSS Variables - Light Mode (16 tasks)
**File:** `myBrain-web/src/styles/theme.css`

| Task ID | Task | Validation |
|---------|------|------------|
| 1.1.1 | Add `--v2-bg-primary: #F2F2F7` | Verify exact hex value |
| 1.1.2 | Add `--v2-bg-secondary: #FFFFFF` | Verify exact hex value |
| 1.1.3 | Add `--v2-bg-tertiary: #E5E5EA` | Verify exact hex value |
| 1.1.4 | Add `--v2-bg-surface: #FFFFFF` | Cross-ref prototype line 27 |
| 1.1.5 | Add `--v2-bg-elevated: #FFFFFF` | Cross-ref prototype |
| 1.1.6 | Add `--v2-bg-surface-hover: rgba(0,0,0,0.04)` | Cross-ref prototype |
| 1.1.7 | Add `--v2-text-primary: #1C1C1E` | Verify contrast ratio |
| 1.1.8 | Add `--v2-text-secondary: #3C3C43` | Verify contrast ratio |
| 1.1.9 | Add `--v2-text-tertiary: #8E8E93` | Verify contrast ratio |
| 1.1.10 | Add `--v2-border-default: rgba(60,60,67,0.12)` | Match prototype |
| 1.1.11 | Add `--v2-border-strong: rgba(60,60,67,0.29)` | Match prototype |
| 1.1.12 | Add `--v2-border-subtle: rgba(60,60,67,0.06)` | Match prototype |
| 1.1.13 | Add `--v2-separator: rgba(60,60,67,0.12)` | Match prototype |
| 1.1.14 | Add `--v2-sidebar-bg: rgba(255,255,255,0.72)` | Match prototype line 26 |
| 1.1.15 | Add `--v2-card-bg: #FFFFFF` | Match prototype |
| 1.1.16 | **VALIDATE:** Run M2 monitor | All 15 variables defined correctly |

### 1.2 CSS Variables - Dark Mode (16 tasks)
**File:** `myBrain-web/src/styles/theme.css`

| Task ID | Task | Validation |
|---------|------|------------|
| 1.2.1 | Add `[data-theme="dark"] --v2-bg-primary: #121212` | Match prototype line 82 |
| 1.2.2 | Add `[data-theme="dark"] --v2-bg-secondary: #1A1A1A` | Match prototype line 83 |
| 1.2.3 | Add `[data-theme="dark"] --v2-bg-tertiary: #242424` | Match prototype line 84 |
| 1.2.4 | Add `[data-theme="dark"] --v2-bg-surface: #1A1A1A` | Match prototype |
| 1.2.5 | Add `[data-theme="dark"] --v2-bg-elevated: #1E1E1E` | Match prototype |
| 1.2.6 | Add `[data-theme="dark"] --v2-bg-surface-hover: rgba(255,255,255,0.05)` | Match prototype |
| 1.2.7 | Add `[data-theme="dark"] --v2-text-primary: #E5E5E5` | Contrast 12.6:1 on #1A1A1A |
| 1.2.8 | Add `[data-theme="dark"] --v2-text-secondary: #A0A0A0` | Contrast 6.3:1 on #1A1A1A |
| 1.2.9 | Add `[data-theme="dark"] --v2-text-tertiary: #B0B0B0` | Contrast 7:1 (WCAG AAA) |
| 1.2.10 | Add `[data-theme="dark"] --v2-border-default: #2A2A2A` | Match prototype line 94 |
| 1.2.11 | Add `[data-theme="dark"] --v2-border-strong: #383838` | Match prototype |
| 1.2.12 | Add `[data-theme="dark"] --v2-separator: #2A2A2A` | Match prototype |
| 1.2.13 | Add `[data-theme="dark"] --v2-sidebar-bg: #1A1A1A` | Solid for readability |
| 1.2.14 | Add `[data-theme="dark"] --v2-card-bg: #1E1E1E` | Match prototype line 85 |
| 1.2.15 | **VALIDATE:** Run M3 monitor | All contrast ratios pass WCAG AA |
| 1.2.16 | **VALIDATE:** Cross-reference all values with prototype | 100% match |

### 1.3 CSS Variables - Accent Colors (12 tasks)
**File:** `myBrain-web/src/styles/theme.css`

| Task ID | Task | Validation |
|---------|------|------------|
| 1.3.1 | Add `--v2-accent-blue: #007AFF` | Match prototype line 34 |
| 1.3.2 | Add `--v2-accent-red: #FF3B30` | Match prototype line 36 |
| 1.3.3 | Add `--v2-accent-green: #34C759` | Match prototype line 38 |
| 1.3.4 | Add `--v2-accent-orange: #FF9500` | Match prototype line 40 |
| 1.3.5 | Add `--v2-accent-purple: #AF52DE` | Match prototype line 42 |
| 1.3.6 | Add `--v2-accent-pink: #FF2D55` | Match prototype line 44 |
| 1.3.7 | Add `--v2-accent-teal: #5AC8FA` | Match prototype line 45 |
| 1.3.8 | Add `--v2-accent-indigo: #5856D6` | Match prototype line 46 |
| 1.3.9 | Add light variants (12% opacity) | For backgrounds |
| 1.3.10 | Add dark mode light variants (20% opacity) | Match lines 97-101 |
| 1.3.11 | Add status colors (success, error, warning) | Map to green, red, orange |
| 1.3.12 | **VALIDATE:** All accent colors defined | Cross-ref prototype |

### 1.4 CSS Variables - Spacing & Radius (12 tasks)
**File:** `myBrain-web/src/styles/theme.css`

| Task ID | Task | Validation |
|---------|------|------------|
| 1.4.1 | Add `--v2-spacing-xs: 4px` | Match prototype line 49 |
| 1.4.2 | Add `--v2-spacing-sm: 8px` | Match prototype line 50 |
| 1.4.3 | Add `--v2-spacing-md: 12px` | Match prototype line 51 |
| 1.4.4 | Add `--v2-spacing-lg: 16px` | Match prototype line 52 |
| 1.4.5 | Add `--v2-spacing-xl: 20px` | Match prototype line 53 |
| 1.4.6 | Add `--v2-spacing-2xl: 24px` | Match prototype line 54 |
| 1.4.7 | Add `--v2-radius-sm: 6px` | Match prototype line 57 |
| 1.4.8 | Add `--v2-radius-md: 10px` | Match prototype line 58 |
| 1.4.9 | Add `--v2-radius-lg: 14px` | Match prototype line 59 |
| 1.4.10 | Add `--v2-radius-xl: 18px` | Match prototype line 60 |
| 1.4.11 | Add `--v2-sidebar-width: 260px` | Match prototype line 68 |
| 1.4.12 | **VALIDATE:** All spacing/radius defined | Cross-ref prototype |

### 1.5 CSS Variables - Shadows (8 tasks)
**File:** `myBrain-web/src/styles/theme.css`

| Task ID | Task | Validation |
|---------|------|------------|
| 1.5.1 | Add `--v2-shadow-sm: 0 1px 3px rgba(0,0,0,0.08)` | Light mode |
| 1.5.2 | Add `--v2-shadow-md: 0 4px 12px rgba(0,0,0,0.08)` | Light mode |
| 1.5.3 | Add `--v2-shadow-lg: 0 8px 24px rgba(0,0,0,0.12)` | Light mode |
| 1.5.4 | Add dark mode `--v2-shadow-sm: 0 1px 3px rgba(0,0,0,0.4)` | Match prototype |
| 1.5.5 | Add dark mode `--v2-shadow-md: 0 4px 12px rgba(0,0,0,0.5)` | Match prototype |
| 1.5.6 | Add dark mode `--v2-shadow-lg: 0 8px 24px rgba(0,0,0,0.5)` | Match prototype |
| 1.5.7 | **VALIDATE:** All shadows defined | Cross-ref prototype |
| 1.5.8 | **VALIDATE:** Test shadows in both themes | Visual check |

### 1.6 Typography System (12 tasks)
**File:** `myBrain-web/src/styles/theme.css`

| Task ID | Task | Validation |
|---------|------|------------|
| 1.6.1 | Add SF Pro font stack to body | Match prototype line 195 |
| 1.6.2 | Add JetBrains Mono Google Fonts import | For Activity Log |
| 1.6.3 | Add `.v2-text-xs` class (11px, 0.06em) | Match prototype line 204 |
| 1.6.4 | Add `.v2-text-sm` class (13px) | Match prototype line 205 |
| 1.6.5 | Add `.v2-text-md` class (15px) | Match prototype line 206 |
| 1.6.6 | Add `.v2-text-lg` class (17px, 600) | Match prototype line 207 |
| 1.6.7 | Add `.v2-text-xl` class (22px, 700) | Match prototype line 208 |
| 1.6.8 | Add `.v2-text-2xl` class (28px, 700, -0.02em) | Match prototype line 209 |
| 1.6.9 | Add `.v2-text-secondary` class | Uses secondary color |
| 1.6.10 | Add `.v2-text-tertiary` class | Uses tertiary color |
| 1.6.11 | Add `.v2-text-uppercase` class | 0.08em letter-spacing |
| 1.6.12 | **VALIDATE:** All typography classes work | Visual test |

### 1.7 Phase 1 Checkpoint (CP1) (4 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 1.7.1 | Run build | No errors |
| 1.7.2 | Run M2 monitor on theme.css | All v2 variables present |
| 1.7.3 | Cross-reference with prototype CSS | 100% match on variables |
| 1.7.4 | Screenshot test page with variables | Visual verification |

---

## Phase 2: Reusable Component Library (288 tasks)

### 2.1 Activity Rings Component (16 tasks)
**File:** `myBrain-web/src/components/ui/ActivityRings.jsx` (CREATE)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.1.1 | Create component file | File exists |
| 2.1.2 | Create `.rings-wrapper` container (100x100px) | Matches prototype lines 377-381 |
| 2.1.3 | Create outer ring SVG (100x100, stroke-width: 10) | Match prototype lines 401 |
| 2.1.4 | Create outer ring red gradient | Match prototype ring colors |
| 2.1.5 | Create middle ring SVG (76x76, stroke-width: 10) | Match prototype line 402 |
| 2.1.6 | Create middle ring green gradient | Match prototype ring colors |
| 2.1.7 | Create inner ring SVG (52x52, stroke-width: 10) | Match prototype line 403 |
| 2.1.8 | Create inner ring blue gradient | Match prototype ring colors |
| 2.1.9 | Add stroke-dasharray for progress | Calculate based on circumference |
| 2.1.10 | Add stroke-dashoffset for progress | Based on percentage prop |
| 2.1.11 | Add progress animation (1s ease) | Smooth transition |
| 2.1.12 | Create ring labels component | Color dot + label + % |
| 2.1.13 | Add props interface (fitness, health, focus) | PropTypes defined |
| 2.1.14 | Add loading skeleton | Matches ring dimensions |
| 2.1.15 | Export from components/ui/index.js | Barrel export added |
| 2.1.16 | **VALIDATE:** Component renders correctly | Visual test |

### 2.1.V Validation - Activity Rings (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.1.V1 | Visual compare to prototype | Screenshot match |
| 2.1.V2 | Test with 0% values | Shows empty rings |
| 2.1.V3 | Test with 100% values | Shows full rings |
| 2.1.V4 | Test with mixed values | Shows correct percentages |
| 2.1.V5 | Test animation | Smooth progress animation |
| 2.1.V6 | Test in dark mode | Colors correct |
| 2.1.V7 | Write unit test | Test file exists, passes |
| 2.1.V8 | Run M4 monitor | No duplicate code |

### 2.2 Quick Action Button Component (16 tasks)
**File:** `myBrain-web/src/components/ui/QuickActionButton.jsx` (CREATE)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.2.1 | Create component file | File exists |
| 2.2.2 | Create base button element | Proper HTML button |
| 2.2.3 | Add variant prop (primary, secondary, gradient) | PropTypes defined |
| 2.2.4 | Style primary variant | Blue bg (#007AFF), white text |
| 2.2.5 | Style secondary variant | Gray bg, dark text |
| 2.2.6 | Style gradient variant | Purple-to-pink gradient |
| 2.2.7 | Add hover brightness effect | `filter: brightness(1.1)` |
| 2.2.8 | Add hover scale effect | `transform: scale(1.02)` |
| 2.2.9 | Add transition (0.2s ease) | Smooth hover |
| 2.2.10 | Add icon slot (left side) | Icon + text layout |
| 2.2.11 | Add fullWidth prop | `grid-column: span 2` |
| 2.2.12 | Create CSS file | QuickActionButton.css |
| 2.2.13 | Add focus state | Accessibility |
| 2.2.14 | Add disabled state | Proper styling |
| 2.2.15 | Export from index | Barrel export |
| 2.2.16 | **VALIDATE:** All variants work | Visual test |

### 2.2.V Validation - Quick Action Button (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.2.V1 | Visual compare to prototype sidebar | Match exactly |
| 2.2.V2 | Test primary variant | Blue styling |
| 2.2.V3 | Test secondary variant | Gray styling |
| 2.2.V4 | Test gradient variant | Purple-pink gradient |
| 2.2.V5 | Test hover effects | Brightness + scale |
| 2.2.V6 | Test fullWidth prop | Spans columns |
| 2.2.V7 | Write unit test | Test file exists, passes |
| 2.2.V8 | Run M4 monitor | No duplicate code |

### 2.3 Navigation Item Component (16 tasks)
**File:** `myBrain-web/src/components/ui/NavItem.jsx` (CREATE)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.3.1 | Create component file | File exists |
| 2.3.2 | Create nav item container | Flex layout |
| 2.3.3 | Add icon slot (20px, centered) | Match prototype line 348-351 |
| 2.3.4 | Add label text | Primary text color |
| 2.3.5 | Add badge component (optional) | Red pill, white text |
| 2.3.6 | Style badge (11px, 600, padding) | Match prototype lines 354-364 |
| 2.3.7 | Add active state (blue bg + text) | Match prototype lines 343-346 |
| 2.3.8 | Add hover state (separator bg) | Match prototype lines 339-341 |
| 2.3.9 | Add click handler | onClick prop |
| 2.3.10 | Add NavLink integration | React Router |
| 2.3.11 | Add tooltip support | For collapsed sidebar |
| 2.3.12 | Add focus state | Keyboard navigation |
| 2.3.13 | Create CSS file | NavItem.css |
| 2.3.14 | Add collapsed variant | Icon only |
| 2.3.15 | Export from index | Barrel export |
| 2.3.16 | **VALIDATE:** Renders correctly | Visual test |

### 2.3.V Validation - Nav Item (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.3.V1 | Visual compare to prototype | Match sidebar nav items |
| 2.3.V2 | Test active state | Blue highlight |
| 2.3.V3 | Test hover state | Gray background |
| 2.3.V4 | Test with badge | Badge displays correctly |
| 2.3.V5 | Test without badge | No badge shown |
| 2.3.V6 | Test collapsed mode | Icon only |
| 2.3.V7 | Write unit test | Test file exists, passes |
| 2.3.V8 | Run M4 monitor | No duplicate code |

### 2.4 Streak Banner Component (16 tasks)
**File:** `myBrain-web/src/components/ui/StreakBanner.jsx` (CREATE)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.4.1 | Create component file | File exists |
| 2.4.2 | Create banner container | Flex, center aligned |
| 2.4.3 | Add gradient background | Orange-to-red |
| 2.4.4 | Match gradient to prototype | Lines 441-442 |
| 2.4.5 | Add fire emoji icon (18px) | Left side |
| 2.4.6 | Add streak text | "{count}-day streak!" |
| 2.4.7 | Style text (13px, 500) | Match prototype lines 443-444 |
| 2.4.8 | Add border radius | `var(--v2-radius-md)` |
| 2.4.9 | Add padding | `var(--v2-spacing-md)` |
| 2.4.10 | Add margin | `var(--v2-spacing-md) var(--v2-spacing-lg)` |
| 2.4.11 | Add count prop | Number, required |
| 2.4.12 | Add loading skeleton | Match dimensions |
| 2.4.13 | Add conditional render | Only if count > 0 |
| 2.4.14 | Create CSS file | StreakBanner.css |
| 2.4.15 | Export from index | Barrel export |
| 2.4.16 | **VALIDATE:** Renders correctly | Visual test |

### 2.4.V Validation - Streak Banner (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.4.V1 | Visual compare to prototype | Match exactly |
| 2.4.V2 | Test with count=7 | Shows "7-day streak!" |
| 2.4.V3 | Test with count=0 | Hidden |
| 2.4.V4 | Test with count=100 | Shows "100-day streak!" |
| 2.4.V5 | Test gradient colors | Orange to red |
| 2.4.V6 | Test dark mode | Gradient still visible |
| 2.4.V7 | Write unit test | Test file exists, passes |
| 2.4.V8 | Run M4 monitor | No duplicate code |

### 2.5 Metric Card Component UPDATE (16 tasks)
**File:** `myBrain-web/src/components/ui/MetricCard.jsx`

| Task ID | Task | Validation |
|---------|------|------------|
| 2.5.1 | Read existing component | Understand current structure |
| 2.5.2 | Update background to `--v2-bg-elevated` | Match prototype |
| 2.5.3 | Update icon size to 1.5rem | Match prototype |
| 2.5.4 | Update value typography (1.5rem, 700) | Match prototype |
| 2.5.5 | Update label typography (0.75rem, uppercase) | Match prototype |
| 2.5.6 | Add hover translateY(-2px) | Match prototype behavior |
| 2.5.7 | Add hover shadow | `var(--v2-shadow-sm)` |
| 2.5.8 | Add transition (0.2s ease) | Smooth hover |
| 2.5.9 | Update danger variant | Red value color |
| 2.5.10 | Update success variant | Green value color |
| 2.5.11 | Verify dark mode styling | Text readable |
| 2.5.12 | Update MetricCard.css | All styles |
| 2.5.13 | Add onClick prop support | For clickable cards |
| 2.5.14 | Add cursor pointer when clickable | UX |
| 2.5.15 | Update PropTypes | All props documented |
| 2.5.16 | **VALIDATE:** Compare to prototype | Visual match |

### 2.5.V Validation - Metric Card (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.5.V1 | Visual compare to prototype focus section | Exact match |
| 2.5.V2 | Test default variant | Normal styling |
| 2.5.V3 | Test danger variant | Red value |
| 2.5.V4 | Test success variant | Green value |
| 2.5.V5 | Test hover effect | Elevates |
| 2.5.V6 | Test dark mode | Colors correct |
| 2.5.V7 | Update existing tests | Tests pass |
| 2.5.V8 | Run M4 monitor | No regressions |

### 2.6 Widget Container Component UPDATE (16 tasks)
**File:** `myBrain-web/src/components/ui/Widget.jsx`

| Task ID | Task | Validation |
|---------|------|------------|
| 2.6.1 | Read existing component | Understand current structure |
| 2.6.2 | Update background to `--v2-bg-surface` | Match prototype |
| 2.6.3 | Add border `1px solid var(--v2-border-default)` | Match prototype |
| 2.6.4 | Update border radius to `--v2-radius-lg` | Match prototype |
| 2.6.5 | Update padding to `--v2-spacing-lg` | Match prototype |
| 2.6.6 | Add overflow hidden | Proper clipping |
| 2.6.7 | Add hover border color change | `--v2-border-strong` |
| 2.6.8 | Add hover shadow | `--v2-shadow-md` |
| 2.6.9 | Add transition (0.2s ease) | Smooth hover |
| 2.6.10 | Add fade-in animation | `v2-fadeIn 0.4s ease` |
| 2.6.11 | Add animationDelay prop | For staggering |
| 2.6.12 | Update dark mode styling | Card bg #1E1E1E |
| 2.6.13 | Update Widget.css | All styles |
| 2.6.14 | Add className prop | For custom styling |
| 2.6.15 | Update PropTypes | All props documented |
| 2.6.16 | **VALIDATE:** Compare to prototype | Visual match |

### 2.6.V Validation - Widget Container (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.6.V1 | Visual compare to prototype widgets | Match exactly |
| 2.6.V2 | Test default styling | Correct bg, border |
| 2.6.V3 | Test hover effect | Border + shadow change |
| 2.6.V4 | Test animation | Fades in smoothly |
| 2.6.V5 | Test stagger delay | Different delays work |
| 2.6.V6 | Test dark mode | Correct dark bg |
| 2.6.V7 | Update existing tests | Tests pass |
| 2.6.V8 | Run M4 monitor | No regressions |

### 2.7 Widget Header Component (16 tasks)
**File:** `myBrain-web/src/components/ui/WidgetHeader.jsx` (CREATE)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.7.1 | Create component file | File exists |
| 2.7.2 | Create flex container | space-between |
| 2.7.3 | Add bottom border | `1px solid var(--v2-border-subtle)` |
| 2.7.4 | Add margin-bottom | `var(--v2-spacing-lg)` |
| 2.7.5 | Add padding-bottom | `var(--v2-spacing-md)` |
| 2.7.6 | Create title slot | Left side |
| 2.7.7 | Style title (0.9375rem, 600, uppercase, 0.025em) | Match prototype |
| 2.7.8 | Add icon support in title | Flex with gap |
| 2.7.9 | Create actions slot | Right side |
| 2.7.10 | Add dropdown filter support | Styled select |
| 2.7.11 | Style dropdown | v2 styling |
| 2.7.12 | Add children prop | For title content |
| 2.7.13 | Add actions prop | For action content |
| 2.7.14 | Create CSS file | WidgetHeader.css |
| 2.7.15 | Export from index | Barrel export |
| 2.7.16 | **VALIDATE:** Renders correctly | Visual test |

### 2.7.V Validation - Widget Header (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.7.V1 | Visual compare to prototype widget headers | Match exactly |
| 2.7.V2 | Test with title only | Correct styling |
| 2.7.V3 | Test with icon + title | Correct layout |
| 2.7.V4 | Test with dropdown | Dropdown styled |
| 2.7.V5 | Test border | Visible subtle border |
| 2.7.V6 | Test dark mode | Colors correct |
| 2.7.V7 | Write unit test | Test file exists, passes |
| 2.7.V8 | Run M4 monitor | No duplicate code |

### 2.8 Task Item Component UPDATE (16 tasks)
**File:** `myBrain-web/src/components/ui/TaskItem.jsx`

| Task ID | Task | Validation |
|---------|------|------------|
| 2.8.1 | Read existing component | Understand structure |
| 2.8.2 | Update background to `--v2-bg-elevated` | Match prototype |
| 2.8.3 | Add hover background | `--v2-bg-surface-hover` |
| 2.8.4 | Add overdue left border | `3px solid var(--v2-status-error)` |
| 2.8.5 | Update checkbox size to 20x20px | Match prototype |
| 2.8.6 | Update checkbox border | `2px solid var(--v2-border-strong)` |
| 2.8.7 | Update checkbox checked state | Green bg + white check |
| 2.8.8 | Update task name typography | 0.875rem, 500 |
| 2.8.9 | Update task meta typography | 0.75rem, tertiary |
| 2.8.10 | Add hover action reveal | Done/Defer buttons |
| 2.8.11 | Style action buttons | Match prototype |
| 2.8.12 | Add transition | Smooth hover |
| 2.8.13 | Update dark mode | Text readable |
| 2.8.14 | Update TaskItem.css | All styles |
| 2.8.15 | Update PropTypes | All props documented |
| 2.8.16 | **VALIDATE:** Compare to prototype | Visual match |

### 2.8.V Validation - Task Item (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.8.V1 | Visual compare to prototype task list | Exact match |
| 2.8.V2 | Test normal task | Correct styling |
| 2.8.V3 | Test overdue task | Red left border |
| 2.8.V4 | Test hover actions | Buttons appear |
| 2.8.V5 | Test checkbox states | Unchecked/checked |
| 2.8.V6 | Test dark mode | Text readable |
| 2.8.V7 | Update existing tests | Tests pass |
| 2.8.V8 | Run M4 monitor | No regressions |

### 2.9 Task Badge Component (16 tasks)
**File:** `myBrain-web/src/components/ui/TaskBadge.jsx` (CREATE)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.9.1 | Create component file | File exists |
| 2.9.2 | Create badge container | inline-flex, center |
| 2.9.3 | Add variant prop | overdue, today, upcoming |
| 2.9.4 | Style OVERDUE variant | Red bg, white text |
| 2.9.5 | Style TODAY variant | Blue bg, white text |
| 2.9.6 | Style UPCOMING variant | Gray bg |
| 2.9.7 | Set typography | 0.625rem, 600, uppercase |
| 2.9.8 | Set padding | 2px 6px |
| 2.9.9 | Set border radius | 4px |
| 2.9.10 | Add children prop | Badge text |
| 2.9.11 | Create CSS file | TaskBadge.css |
| 2.9.12 | Add dark mode colors | Brighter variants |
| 2.9.13 | Export from index | Barrel export |
| 2.9.14 | Add PropTypes | All props documented |
| 2.9.15 | **VALIDATE:** Renders correctly | Visual test |
| 2.9.16 | Write unit test | Test file created |

### 2.9.V Validation - Task Badge (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.9.V1 | Visual compare to prototype badges | Match exactly |
| 2.9.V2 | Test OVERDUE variant | Red styling |
| 2.9.V3 | Test TODAY variant | Blue styling |
| 2.9.V4 | Test UPCOMING variant | Gray styling |
| 2.9.V5 | Test typography | Correct size/weight |
| 2.9.V6 | Test dark mode | Brighter colors |
| 2.9.V7 | Unit test passes | All tests green |
| 2.9.V8 | Run M4 monitor | No duplicate code |

### 2.10 Schedule Item Component UPDATE (16 tasks)
**File:** `myBrain-web/src/components/ui/ScheduleItem.jsx`

| Task ID | Task | Validation |
|---------|------|------------|
| 2.10.1 | Read existing component | Understand structure |
| 2.10.2 | Add colored left border (3px) | By event type |
| 2.10.3 | Add time column (min-width: 50px) | Left side |
| 2.10.4 | Format time (12-hour, no AM/PM) | e.g., "10:00" |
| 2.10.5 | Add color dot (8x8px) | Match event type |
| 2.10.6 | Update name typography | 0.875rem, 500 |
| 2.10.7 | Update location typography | 0.75rem, tertiary |
| 2.10.8 | Add event type colors | Work: blue, Personal: green, etc. |
| 2.10.9 | Add hover action reveal | Join/Prep/Skip buttons |
| 2.10.10 | Style Join button | Blue, primary |
| 2.10.11 | Style Prep/Skip buttons | Secondary |
| 2.10.12 | Add transition | Smooth hover |
| 2.10.13 | Update dark mode | Text readable |
| 2.10.14 | Update CSS | ScheduleItem.css |
| 2.10.15 | Update PropTypes | All props documented |
| 2.10.16 | **VALIDATE:** Compare to prototype | Visual match |

### 2.10.V Validation - Schedule Item (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.10.V1 | Visual compare to prototype schedule | Exact match |
| 2.10.V2 | Test different event types | Correct colors |
| 2.10.V3 | Test time formatting | Correct format |
| 2.10.V4 | Test hover actions | Buttons appear |
| 2.10.V5 | Test color dots | Correct colors |
| 2.10.V6 | Test dark mode | Text readable |
| 2.10.V7 | Update existing tests | Tests pass |
| 2.10.V8 | Run M4 monitor | No regressions |

### 2.11 Inbox Item Component (24 tasks)
**File:** `myBrain-web/src/components/ui/InboxItem.jsx` (CREATE)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.11.1 | Create component file | File exists |
| 2.11.2 | Create item container | Flex, padding |
| 2.11.3 | Add text content area | Title + preview |
| 2.11.4 | Style title (0.875rem, 500) | Match prototype |
| 2.11.5 | Style preview (0.75rem, tertiary) | Match prototype |
| 2.11.6 | Add triage buttons container | Right side |
| 2.11.7 | Create Archive button (blue) | Styled correctly |
| 2.11.8 | Create Task button (green) | Styled correctly |
| 2.11.9 | Create Delete button (red) | Styled correctly |
| 2.11.10 | Add button hover effects | Brightness |
| 2.11.11 | Add hover background | `--v2-bg-surface-hover` |
| 2.11.12 | Add transition | Smooth hover |
| 2.11.13 | Create CSS file | InboxItem.css |
| 2.11.14 | Add dark mode colors | Text readable |
| 2.11.15 | Export from index | Barrel export |
| 2.11.16 | **VALIDATE:** Renders correctly | Visual test |

### 2.11.V Validation - Inbox Item (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.11.V1 | Visual compare to prototype | Match exactly |
| 2.11.V2 | Test triage buttons | All 3 visible |
| 2.11.V3 | Test button colors | Blue, green, red |
| 2.11.V4 | Test hover effects | Background change |
| 2.11.V5 | Test button clicks | Handlers called |
| 2.11.V6 | Test dark mode | Colors correct |
| 2.11.V7 | Write unit test | Test file exists |
| 2.11.V8 | Run M4 monitor | No duplicate code |

### 2.12 Project Card Component (24 tasks)
**File:** `myBrain-web/src/components/ui/ProjectCard.jsx` (CREATE)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.12.1 | Create component file | File exists |
| 2.12.2 | Create card container | Flex, padding |
| 2.12.3 | Add project icon (emoji or icon) | Left side |
| 2.12.4 | Add name and description | Primary + secondary text |
| 2.12.5 | Add progress bar | Below text |
| 2.12.6 | Style progress bar track | Gray background |
| 2.12.7 | Style progress bar fill | Blue fill |
| 2.12.8 | Add percentage text | Right aligned |
| 2.12.9 | Add task count badge | Secondary |
| 2.12.10 | Add hover effects | Background + shadow |
| 2.12.11 | Add click handler | Navigate to project |
| 2.12.12 | Add transition | Smooth hover |
| 2.12.13 | Create CSS file | ProjectCard.css |
| 2.12.14 | Add dark mode colors | Text readable |
| 2.12.15 | Export from index | Barrel export |
| 2.12.16 | **VALIDATE:** Renders correctly | Visual test |

### 2.12.V Validation - Project Card (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.12.V1 | Visual compare to prototype | Match exactly |
| 2.12.V2 | Test progress bar | Shows percentage |
| 2.12.V3 | Test task count | Shows correctly |
| 2.12.V4 | Test hover effects | Elevates |
| 2.12.V5 | Test navigation | Clicks work |
| 2.12.V6 | Test dark mode | Colors correct |
| 2.12.V7 | Write unit test | Test file exists |
| 2.12.V8 | Run M4 monitor | No duplicate code |

### 2.13 Activity Log Entry Component (24 tasks)
**File:** `myBrain-web/src/components/ui/ActivityLogEntry.jsx` (CREATE)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.13.1 | Create component file | File exists |
| 2.13.2 | Create entry container | Flex, monospace |
| 2.13.3 | Add timestamp (tertiary color) | Left side |
| 2.13.4 | Format timestamp (HH:MM:SS) | Correct format |
| 2.13.5 | Add log type indicator | Colored dot |
| 2.13.6 | Define type colors | sync=blue, task=green, error=red, info=gray |
| 2.13.7 | Add message text | Primary color |
| 2.13.8 | Style message (JetBrains Mono) | Match prototype |
| 2.13.9 | Add hover highlight | Subtle background |
| 2.13.10 | Add transition | Smooth hover |
| 2.13.11 | Add expanded details (optional) | More info on click |
| 2.13.12 | Create CSS file | ActivityLogEntry.css |
| 2.13.13 | **ALWAYS DARK MODE** | Never use light mode |
| 2.13.14 | Export from index | Barrel export |
| 2.13.15 | Add PropTypes | All props documented |
| 2.13.16 | **VALIDATE:** Renders correctly | Visual test |

### 2.13.V Validation - Activity Log Entry (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.13.V1 | Visual compare to prototype | Match exactly |
| 2.13.V2 | Test all type colors | Correct colors |
| 2.13.V3 | Test timestamp format | HH:MM:SS |
| 2.13.V4 | Test monospace font | JetBrains Mono |
| 2.13.V5 | Verify ALWAYS DARK | Never light |
| 2.13.V6 | Test hover highlight | Visible |
| 2.13.V7 | Write unit test | Test file exists |
| 2.13.V8 | Run M4 monitor | No duplicate code |

### 2.14 Status Light Component (16 tasks)
**File:** `myBrain-web/src/components/ui/StatusLight.jsx` (CREATE)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.14.1 | Create component file | File exists |
| 2.14.2 | Create wrapper | inline-flex |
| 2.14.3 | Create light circle (8x8px) | Centered |
| 2.14.4 | Add status prop | online, offline, syncing, error |
| 2.14.5 | Style online (green) | #34C759 |
| 2.14.6 | Style offline (gray) | #8E8E93 |
| 2.14.7 | Style syncing (blue, pulse) | #007AFF |
| 2.14.8 | Style error (red) | #FF3B30 |
| 2.14.9 | Add pulse animation | For syncing |
| 2.14.10 | Add label prop (optional) | Text beside light |
| 2.14.11 | Create CSS file | StatusLight.css |
| 2.14.12 | Add dark mode brightness | Slightly brighter |
| 2.14.13 | Export from index | Barrel export |
| 2.14.14 | Add PropTypes | All props documented |
| 2.14.15 | **VALIDATE:** Renders correctly | Visual test |
| 2.14.16 | Write unit test | Test file created |

### 2.14.V Validation - Status Light (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.14.V1 | Visual compare to prototype | Match exactly |
| 2.14.V2 | Test all status types | Correct colors |
| 2.14.V3 | Test syncing animation | Pulses |
| 2.14.V4 | Test with label | Shows label |
| 2.14.V5 | Test without label | Light only |
| 2.14.V6 | Test dark mode | Brighter colors |
| 2.14.V7 | Unit test passes | All tests green |
| 2.14.V8 | Run M4 monitor | No duplicate code |

### 2.15 Quick Stat Card Component (16 tasks)
**File:** `myBrain-web/src/components/ui/QuickStatCard.jsx` (CREATE)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.15.1 | Create component file | File exists |
| 2.15.2 | Create card container | Column flex |
| 2.15.3 | Add icon slot (top) | Colored icon |
| 2.15.4 | Add value text (large) | 1.5rem, 700 |
| 2.15.5 | Add label text | 0.75rem, uppercase |
| 2.15.6 | Add trend indicator (optional) | Arrow + percentage |
| 2.15.7 | Style positive trend | Green |
| 2.15.8 | Style negative trend | Red |
| 2.15.9 | Add hover effects | Subtle elevation |
| 2.15.10 | Add transition | Smooth hover |
| 2.15.11 | Add onClick support | For drill-down |
| 2.15.12 | Create CSS file | QuickStatCard.css |
| 2.15.13 | Add dark mode colors | Text readable |
| 2.15.14 | Export from index | Barrel export |
| 2.15.15 | **VALIDATE:** Renders correctly | Visual test |
| 2.15.16 | Write unit test | Test file created |

### 2.15.V Validation - Quick Stat Card (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.15.V1 | Visual compare to prototype | Match exactly |
| 2.15.V2 | Test with trend | Shows arrow + % |
| 2.15.V3 | Test positive trend | Green styling |
| 2.15.V4 | Test negative trend | Red styling |
| 2.15.V5 | Test hover effect | Elevates |
| 2.15.V6 | Test dark mode | Colors correct |
| 2.15.V7 | Unit test passes | All tests green |
| 2.15.V8 | Run M4 monitor | No duplicate code |

### 2.16 Productivity Score Component (16 tasks)
**File:** `myBrain-web/src/components/ui/ProductivityScore.jsx` (CREATE)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.16.1 | Create component file | File exists |
| 2.16.2 | Create circular progress | SVG circle |
| 2.16.3 | Add score text (center) | Large number |
| 2.16.4 | Add "/100" suffix | Smaller text |
| 2.16.5 | Add label below | "PRODUCTIVITY" |
| 2.16.6 | Color by score | Green 70+, Yellow 40-69, Red 0-39 |
| 2.16.7 | Add progress animation | Smooth fill |
| 2.16.8 | Add sparkline (optional) | Below score |
| 2.16.9 | Add trend indicator | Up/down arrow |
| 2.16.10 | Create CSS file | ProductivityScore.css |
| 2.16.11 | Add dark mode colors | Brighter |
| 2.16.12 | Export from index | Barrel export |
| 2.16.13 | Add PropTypes | All props documented |
| 2.16.14 | Add loading skeleton | Circular |
| 2.16.15 | **VALIDATE:** Renders correctly | Visual test |
| 2.16.16 | Write unit test | Test file created |

### 2.16.V Validation - Productivity Score (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.16.V1 | Visual compare to prototype | Match exactly |
| 2.16.V2 | Test green score (80) | Green color |
| 2.16.V3 | Test yellow score (50) | Yellow color |
| 2.16.V4 | Test red score (20) | Red color |
| 2.16.V5 | Test animation | Smooth fill |
| 2.16.V6 | Test dark mode | Colors correct |
| 2.16.V7 | Unit test passes | All tests green |
| 2.16.V8 | Run M4 monitor | No duplicate code |

### 2.17 Keyboard Shortcut Component (16 tasks)
**File:** `myBrain-web/src/components/ui/KeyboardShortcut.jsx` (CREATE)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.17.1 | Create component file | File exists |
| 2.17.2 | Create wrapper | inline-flex, gap |
| 2.17.3 | Add key container | Styled kbd |
| 2.17.4 | Style key background | Subtle bg, border |
| 2.17.5 | Style key text | Monospace, small |
| 2.17.6 | Add "+" separator | Between keys |
| 2.17.7 | Add action label | After keys |
| 2.17.8 | Handle modifier keys | Cmd/Ctrl icon |
| 2.17.9 | Add hover effects | Subtle glow |
| 2.17.10 | Add transition | Smooth hover |
| 2.17.11 | Create CSS file | KeyboardShortcut.css |
| 2.17.12 | Add dark mode colors | Visible |
| 2.17.13 | Export from index | Barrel export |
| 2.17.14 | Add PropTypes | keys: string[], action: string |
| 2.17.15 | **VALIDATE:** Renders correctly | Visual test |
| 2.17.16 | Write unit test | Test file created |

### 2.17.V Validation - Keyboard Shortcut (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.17.V1 | Visual compare to prototype | Match exactly |
| 2.17.V2 | Test single key | Correct styling |
| 2.17.V3 | Test multiple keys | Plus separator |
| 2.17.V4 | Test with action | Shows label |
| 2.17.V5 | Test modifier display | Cmd/Ctrl symbol |
| 2.17.V6 | Test dark mode | Colors visible |
| 2.17.V7 | Unit test passes | All tests green |
| 2.17.V8 | Run M4 monitor | No duplicate code |

### 2.18 Bottom Bar V2 Component (16 tasks)
**File:** `myBrain-web/src/components/layout/BottomBarV2.jsx`

| Task ID | Task | Validation |
|---------|------|------------|
| 2.18.1 | Read existing component | Understand structure |
| 2.18.2 | Update background | Glassmorphism blur |
| 2.18.3 | Add backdrop-filter | blur(20px) saturate(180%) |
| 2.18.4 | Update border | 1px solid separator |
| 2.18.5 | Add keyboard shortcuts section | Left side |
| 2.18.6 | Use KeyboardShortcut components | Consistent styling |
| 2.18.7 | Add [R] Radar shortcut | First |
| 2.18.8 | Add [T] Tasks shortcut | Second |
| 2.18.9 | Add [N] Notes shortcut | Third |
| 2.18.10 | Add [?] Help shortcut | Fourth |
| 2.18.11 | Add "Customize" button | Right side |
| 2.18.12 | Style Customize button | Text button |
| 2.18.13 | Update dark mode | Semi-transparent dark bg |
| 2.18.14 | Update BottomBarV2.css | All styles |
| 2.18.15 | **VALIDATE:** Compare to prototype | Visual match |
| 2.18.16 | Add keyboard event listeners | Shortcuts work |

### 2.18.V Validation - Bottom Bar V2 (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.18.V1 | Visual compare to prototype | Match exactly |
| 2.18.V2 | Test glassmorphism | Blur visible |
| 2.18.V3 | Test all shortcuts display | 4 shortcuts |
| 2.18.V4 | Test keyboard events | R/T/N/? work |
| 2.18.V5 | Test Customize button | Visible, clickable |
| 2.18.V6 | Test dark mode | Colors correct |
| 2.18.V7 | Update existing tests | Tests pass |
| 2.18.V8 | Run M4 monitor | No regressions |

### 2.19 Phase 2 Checkpoint (CP2) (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 2.19.1 | Run full build | No errors |
| 2.19.2 | Run all component tests | All pass |
| 2.19.3 | Run M4 monitor on all new components | No duplicates |
| 2.19.4 | Run M5 monitor | All components have tests |
| 2.19.5 | Visual test all components | Match prototype |
| 2.19.6 | Test all in dark mode | Colors correct |
| 2.19.7 | Cross-reference component count | All 18 components exist |
| 2.19.8 | Update architecture.md | Document new components |

---

## Phase 3: Sidebar Complete Redesign (112 tasks)

### 3.1 Sidebar Structure (16 tasks)
**File:** `myBrain-web/src/components/layout/Sidebar.jsx`

| Task ID | Task | Validation |
|---------|------|------------|
| 3.1.1 | Read existing Sidebar.jsx | Understand 642 lines |
| 3.1.2 | Add sidebar header section | Logo + title |
| 3.1.3 | Create logo component | Blue-purple gradient, "m" |
| 3.1.4 | Style logo (28x28px, rounded) | Match prototype lines 253-264 |
| 3.1.5 | Add title "myBrain" (17px, 600) | Match prototype lines 266-269 |
| 3.1.6 | Add bottom border to header | `1px solid var(--v2-separator)` |
| 3.1.7 | Add glassmorphism effect | `backdrop-filter: blur(20px) saturate(180%)` |
| 3.1.8 | Update width to 260px | `var(--v2-sidebar-width)` |
| 3.1.9 | Add overflow-y: auto | Scrollable content |
| 3.1.10 | Update background | `var(--v2-sidebar-bg)` |
| 3.1.11 | Add border-right | `1px solid var(--v2-separator)` |
| 3.1.12 | Restructure sections order | Quick Actions, Navigate, Progress, Projects |
| 3.1.13 | Update z-index | 100 |
| 3.1.14 | Update transition | 0.3s ease |
| 3.1.15 | Test structure | Visual verification |
| 3.1.16 | **VALIDATE:** Structure matches prototype | Screenshot compare |

### 3.1.V Validation - Sidebar Structure (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 3.1.V1 | Compare to prototype sidebar | Structure matches |
| 3.1.V2 | Test logo appearance | Correct gradient |
| 3.1.V3 | Test glassmorphism | Blur visible |
| 3.1.V4 | Test scroll behavior | Scrolls properly |
| 3.1.V5 | Test dark mode | Correct bg color |
| 3.1.V6 | Test width | 260px |
| 3.1.V7 | Run M1 monitor | Prototype fidelity check |
| 3.1.V8 | Screenshot for comparison | Saved for reference |

### 3.2 Quick Actions Section (16 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 3.2.1 | Create section container | With padding |
| 3.2.2 | Add section title "QUICK ACTIONS" | Uppercase, small |
| 3.2.3 | Style section title | Match prototype lines 275-281 |
| 3.2.4 | Create 2x2 grid | `grid-template-columns: 1fr 1fr` |
| 3.2.5 | Add gap | `var(--v2-spacing-sm)` |
| 3.2.6 | Add "+ Task" QuickActionButton | Primary variant |
| 3.2.7 | Add "+ Note" QuickActionButton | Primary variant |
| 3.2.8 | Add "+ Event" QuickActionButton | Secondary variant |
| 3.2.9 | Add "+ File" QuickActionButton | Secondary variant |
| 3.2.10 | Add "Quick Capture" QuickActionButton | Gradient, fullWidth |
| 3.2.11 | Wire Task button | Opens task modal |
| 3.2.12 | Wire Note button | Opens note modal |
| 3.2.13 | Wire Event button | Opens event modal |
| 3.2.14 | Wire File button | Opens file upload |
| 3.2.15 | Wire Quick Capture button | Opens capture modal |
| 3.2.16 | **VALIDATE:** All buttons work | Functional test |

### 3.2.V Validation - Quick Actions (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 3.2.V1 | Compare to prototype | Layout matches |
| 3.2.V2 | Test grid layout | 2x2 grid correct |
| 3.2.V3 | Test button variants | Colors correct |
| 3.2.V4 | Test Quick Capture | Gradient, full width |
| 3.2.V5 | Test all click handlers | Modals open |
| 3.2.V6 | Test hover effects | Brightness + scale |
| 3.2.V7 | Test dark mode | Buttons visible |
| 3.2.V8 | Run M1 monitor | Matches prototype |

### 3.3 Navigate Section (16 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 3.3.1 | Create section container | With padding |
| 3.3.2 | Add section title "NAVIGATE" | Uppercase, small |
| 3.3.3 | Create nav list container | ul element |
| 3.3.4 | Add Dashboard NavItem | Home icon, active by default |
| 3.3.5 | Add Today NavItem | Calendar icon, with badge |
| 3.3.6 | Add Tasks NavItem | Checkmark icon, with badge |
| 3.3.7 | Add Notes NavItem | Note icon |
| 3.3.8 | Add Calendar NavItem | Calendar icon |
| 3.3.9 | Add Projects NavItem | Folder icon |
| 3.3.10 | Add Inbox NavItem | Message icon, with badge |
| 3.3.11 | Add Files NavItem | Folder icon |
| 3.3.12 | Fetch Today badge count | Use existing hook |
| 3.3.13 | Fetch Tasks badge count | Use existing hook |
| 3.3.14 | Fetch Inbox badge count | Use existing hook |
| 3.3.15 | Wire active states | React Router |
| 3.3.16 | **VALIDATE:** Navigation works | Click test all |

### 3.3.V Validation - Navigate Section (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 3.3.V1 | Compare to prototype | Layout matches |
| 3.3.V2 | Test all nav items | 8 items present |
| 3.3.V3 | Test badges | Show counts |
| 3.3.V4 | Test active state | Blue highlight |
| 3.3.V5 | Test hover state | Gray background |
| 3.3.V6 | Test navigation | Routes correctly |
| 3.3.V7 | Test dark mode | Colors correct |
| 3.3.V8 | Run M1 monitor | Matches prototype |

### 3.4 Today's Progress Section (16 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 3.4.1 | Create section container | With padding |
| 3.4.2 | Add section title "TODAY'S PROGRESS" | Uppercase, small |
| 3.4.3 | Create card container | White bg, rounded |
| 3.4.4 | Style card | Match prototype lines 367-375 |
| 3.4.5 | Add ActivityRings component | Import from ui |
| 3.4.6 | Create useTodayProgress hook | Fetch progress data |
| 3.4.7 | Fetch fitness progress | From API or calculate |
| 3.4.8 | Fetch health progress | From API or calculate |
| 3.4.9 | Fetch focus progress | From API or calculate |
| 3.4.10 | Pass data to ActivityRings | Props wired |
| 3.4.11 | Add ring labels below | Using ring-labels class |
| 3.4.12 | Add loading skeleton | Matches card dimensions |
| 3.4.13 | Handle error state | Graceful degradation |
| 3.4.14 | Handle empty state | Show zeros with message |
| 3.4.15 | Test data flow | Console log values |
| 3.4.16 | **VALIDATE:** Rings display correctly | Visual test |

### 3.4.V Validation - Today's Progress (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 3.4.V1 | Compare to prototype | Ring layout matches |
| 3.4.V2 | Test data fetching | Values load |
| 3.4.V3 | Test ring progress | Shows percentages |
| 3.4.V4 | Test ring labels | Show correctly |
| 3.4.V5 | Test loading state | Skeleton shows |
| 3.4.V6 | Test dark mode | Colors correct |
| 3.4.V7 | Run M1 monitor | Matches prototype |
| 3.4.V8 | Test responsive | Fits in sidebar |

### 3.5 Streak Banner Section (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 3.5.1 | Import StreakBanner component | From ui |
| 3.5.2 | Position after Today's Progress | Correct order |
| 3.5.3 | Fetch streak data | From user stats API |
| 3.5.4 | Pass count prop | Correct value |
| 3.5.5 | Conditional render (count > 0) | Only show if streak |
| 3.5.6 | Add loading state | Match skeleton |
| 3.5.7 | Handle error state | Hide on error |
| 3.5.8 | **VALIDATE:** Banner displays | When streak > 0 |

### 3.5.V Validation - Streak Banner (4 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 3.5.V1 | Compare to prototype | Matches styling |
| 3.5.V2 | Test with streak | Shows banner |
| 3.5.V3 | Test without streak | Hidden |
| 3.5.V4 | Test dark mode | Gradient visible |

### 3.6 Projects Section (16 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 3.6.1 | Create section container | With padding |
| 3.6.2 | Add section title "PROJECTS" | Uppercase, small |
| 3.6.3 | Fetch recent/favorite projects | Use existing hook |
| 3.6.4 | Limit to 4-5 projects | Slice array |
| 3.6.5 | Create project item renderer | Map over projects |
| 3.6.6 | Add color dot (10px) | By project color |
| 3.6.7 | Add project name | Primary text |
| 3.6.8 | Add progress percentage | Right aligned, tertiary |
| 3.6.9 | Style project item | Match prototype lines 452-476 |
| 3.6.10 | Add hover state | Gray background |
| 3.6.11 | Add click handler | Navigate to project |
| 3.6.12 | Add "View All" link | If more than limit |
| 3.6.13 | Add loading skeleton | 4 items |
| 3.6.14 | Handle empty state | "No projects" message |
| 3.6.15 | Handle error state | Graceful degradation |
| 3.6.16 | **VALIDATE:** Projects display | Visual test |

### 3.6.V Validation - Projects Section (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 3.6.V1 | Compare to prototype | Layout matches |
| 3.6.V2 | Test data loading | Projects load |
| 3.6.V3 | Test color dots | Correct colors |
| 3.6.V4 | Test progress display | Shows percentage |
| 3.6.V5 | Test hover state | Background changes |
| 3.6.V6 | Test navigation | Navigates correctly |
| 3.6.V7 | Test dark mode | Colors correct |
| 3.6.V8 | Run M1 monitor | Matches prototype |

### 3.7 Sidebar Collapsed State (16 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 3.7.1 | Define collapsed width | 64px |
| 3.7.2 | Hide Quick Actions section | When collapsed |
| 3.7.3 | Show tooltip for Quick Actions | On hover |
| 3.7.4 | Show icons only in Navigate | Hide labels |
| 3.7.5 | Position badges on icons | Overlay style |
| 3.7.6 | Hide Today's Progress section | When collapsed |
| 3.7.7 | Hide Streak Banner | When collapsed |
| 3.7.8 | Hide Projects section | When collapsed |
| 3.7.9 | Add smooth width transition | 0.3s ease |
| 3.7.10 | Add content fade transition | Opacity 0.3s |
| 3.7.11 | Update edge toggle position | For new width |
| 3.7.12 | Test collapsed to expanded | Smooth |
| 3.7.13 | Test expanded to collapsed | Smooth |
| 3.7.14 | Persist collapsed state | Redux + localStorage |
| 3.7.15 | Sync with server | Fire-and-forget |
| 3.7.16 | **VALIDATE:** Collapsed works | Visual test |

### 3.7.V Validation - Collapsed State (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 3.7.V1 | Test collapsed width | 64px |
| 3.7.V2 | Test icon-only nav | Icons visible |
| 3.7.V3 | Test badge overlay | On icons |
| 3.7.V4 | Test sections hidden | Not visible |
| 3.7.V5 | Test transitions | Smooth |
| 3.7.V6 | Test state persistence | Remembered |
| 3.7.V7 | Test dark mode collapsed | Colors correct |
| 3.7.V8 | Run M1 monitor | Works correctly |

### 3.8 Phase 3 Checkpoint (CP3) (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 3.8.1 | Full sidebar screenshot (light) | Save for comparison |
| 3.8.2 | Full sidebar screenshot (dark) | Save for comparison |
| 3.8.3 | Compare to prototype sidebar | Visual match % |
| 3.8.4 | Run M1 monitor | Prototype fidelity |
| 3.8.5 | Run M3 monitor | Dark mode contrast |
| 3.8.6 | Test all interactive elements | Click tests |
| 3.8.7 | Test collapsed/expanded toggle | Works correctly |
| 3.8.8 | Update memory.md | Document progress |

---

## Phase 4: Dashboard V2 Widget Fixes (96 tasks)

### 4.1 Focus Hero Widget (12 tasks)
**File:** `myBrain-web/src/features/dashboard/widgets-v2/FocusHeroV2.jsx`

| Task ID | Task | Validation |
|---------|------|------------|
| 4.1.1 | Read existing component | Understand structure |
| 4.1.2 | Fix metric cards layout | 4 cards in row |
| 4.1.3 | Update metric card styling | Use MetricCard component |
| 4.1.4 | Fix Current Task section | Card styling |
| 4.1.5 | Fix button text ("ComplPauseSkip") | Separate buttons |
| 4.1.6 | Style Complete button | Green |
| 4.1.7 | Style Pause button | Secondary |
| 4.1.8 | Style Skip button | Secondary |
| 4.1.9 | Add button icons | Checkmark, pause, skip |
| 4.1.10 | Update progress bar | Match prototype |
| 4.1.11 | Update dark mode | Text readable |
| 4.1.12 | **VALIDATE:** Compare to prototype | Visual match |

### 4.2 Tasks Widget (12 tasks)
**File:** `myBrain-web/src/features/dashboard/widgets-v2/TasksWidgetV2.jsx`

| Task ID | Task | Validation |
|---------|------|------------|
| 4.2.1 | Read existing component | Understand structure |
| 4.2.2 | Update widget header | Use WidgetHeader |
| 4.2.3 | Style dropdown filter | Match prototype |
| 4.2.4 | Update task items | Use TaskItem component |
| 4.2.5 | Add overdue styling | Red left border |
| 4.2.6 | Add hover actions | Done/Defer buttons |
| 4.2.7 | Style Done button | Green text |
| 4.2.8 | Style Defer button | Blue text |
| 4.2.9 | Add "View All" link | Bottom of widget |
| 4.2.10 | Update empty state | Match styling |
| 4.2.11 | Update dark mode | Text readable |
| 4.2.12 | **VALIDATE:** Compare to prototype | Visual match |

### 4.3 Schedule Widget (12 tasks)
**File:** `myBrain-web/src/features/dashboard/widgets-v2/ScheduleWidgetV2.jsx`

| Task ID | Task | Validation |
|---------|------|------------|
| 4.3.1 | Read existing component | Understand structure |
| 4.3.2 | Update widget header | Use WidgetHeader |
| 4.3.3 | Update schedule items | Use ScheduleItem component |
| 4.3.4 | Add colored left borders | By event type |
| 4.3.5 | Add time column | Formatted time |
| 4.3.6 | Add color dots | Match event type |
| 4.3.7 | Add hover actions | Join/Prep/Skip buttons |
| 4.3.8 | Style Join button | Blue |
| 4.3.9 | Style Prep/Skip buttons | Secondary |
| 4.3.10 | Add "View Full Calendar" link | Bottom of widget |
| 4.3.11 | Update dark mode | Text readable |
| 4.3.12 | **VALIDATE:** Compare to prototype | Visual match |

### 4.4 Inbox Widget (12 tasks)
**File:** `myBrain-web/src/features/dashboard/widgets-v2/InboxWidgetV2.jsx`

| Task ID | Task | Validation |
|---------|------|------------|
| 4.4.1 | Read existing component | Understand structure |
| 4.4.2 | Update widget header | Use WidgetHeader |
| 4.4.3 | Update inbox items | Use InboxItem component |
| 4.4.4 | Fix triage buttons | Archive/Task/Delete |
| 4.4.5 | Style Archive button | Blue |
| 4.4.6 | Style Task button | Green |
| 4.4.7 | Style Delete button | Red |
| 4.4.8 | Add button hover effects | Brightness |
| 4.4.9 | Add "View All" link | Bottom of widget |
| 4.4.10 | Update empty state | Match styling |
| 4.4.11 | Update dark mode | Text readable |
| 4.4.12 | **VALIDATE:** Compare to prototype | Visual match |

### 4.5 Projects Widget (12 tasks)
**File:** `myBrain-web/src/features/dashboard/widgets-v2/ProjectsWidgetV2.jsx`

| Task ID | Task | Validation |
|---------|------|------------|
| 4.5.1 | Read existing component | Understand structure |
| 4.5.2 | Update widget header | Use WidgetHeader |
| 4.5.3 | Update project cards | Use ProjectCard component |
| 4.5.4 | Add progress bars | Per project |
| 4.5.5 | Add task counts | Per project |
| 4.5.6 | Add color indicators | By project color |
| 4.5.7 | Add hover effects | Elevation |
| 4.5.8 | Add click navigation | To project page |
| 4.5.9 | Add "View All" link | Bottom of widget |
| 4.5.10 | Update empty state | Match styling |
| 4.5.11 | Update dark mode | Text readable |
| 4.5.12 | **VALIDATE:** Compare to prototype | Visual match |

### 4.6 Quick Stats Widget (12 tasks)
**File:** `myBrain-web/src/features/dashboard/widgets-v2/QuickStatsWidgetV2.jsx`

| Task ID | Task | Validation |
|---------|------|------------|
| 4.6.1 | Read existing component | Understand structure |
| 4.6.2 | Update widget header | Use WidgetHeader |
| 4.6.3 | Create stats grid | 2x2 layout |
| 4.6.4 | Add productivity score | Use ProductivityScore |
| 4.6.5 | Add focus time stat | Use QuickStatCard |
| 4.6.6 | Add tasks completed stat | Use QuickStatCard |
| 4.6.7 | Add streak stat | Use QuickStatCard |
| 4.6.8 | Add trend indicators | Per stat |
| 4.6.9 | Add sparklines (optional) | Per stat |
| 4.6.10 | Add hover effects | Elevation |
| 4.6.11 | Update dark mode | Text readable |
| 4.6.12 | **VALIDATE:** Compare to prototype | Visual match |

### 4.7 Activity Log Widget (12 tasks)
**File:** `myBrain-web/src/features/dashboard/widgets-v2/ActivityLogWidgetV2.jsx`

| Task ID | Task | Validation |
|---------|------|------------|
| 4.7.1 | Read existing component | Understand structure |
| 4.7.2 | **FORCE DARK MODE** | Never light |
| 4.7.3 | Update background | #0A0A0A |
| 4.7.4 | Add status lights | At top |
| 4.7.5 | Add filter tabs | All/Sync/Tasks/Errors |
| 4.7.6 | Use ActivityLogEntry component | For entries |
| 4.7.7 | Add colored dots | By type |
| 4.7.8 | Add timestamps | HH:MM:SS format |
| 4.7.9 | Add monospace font | JetBrains Mono |
| 4.7.10 | Add scroll behavior | Auto-scroll new |
| 4.7.11 | Add max-height | Scrollable |
| 4.7.12 | **VALIDATE:** Always dark | Visual test |

### 4.8 Topbar V2 (12 tasks)
**File:** `myBrain-web/src/components/layout/Topbar.jsx`

| Task ID | Task | Validation |
|---------|------|------------|
| 4.8.1 | Read existing component | Understand structure |
| 4.8.2 | Add greeting section | "Good morning, Keith" |
| 4.8.3 | Add date section | Format correctly |
| 4.8.4 | Update weather widget | Match prototype |
| 4.8.5 | Add Radar toggle button | With [R] hint |
| 4.8.6 | Style Radar button | Match prototype |
| 4.8.7 | Update theme toggle | Match prototype |
| 4.8.8 | Update avatar | Rounded, hover effect |
| 4.8.9 | Add glassmorphism | Subtle blur |
| 4.8.10 | Update dark mode | Colors correct |
| 4.8.11 | Add keyboard shortcut | R for radar |
| 4.8.12 | **VALIDATE:** Compare to prototype | Visual match |

### 4.9 Phase 4 Checkpoint (CP4) (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 4.9.1 | Full dashboard screenshot (light) | Save |
| 4.9.2 | Full dashboard screenshot (dark) | Save |
| 4.9.3 | Compare each widget to prototype | Visual match % |
| 4.9.4 | Run M1 monitor on all widgets | Prototype fidelity |
| 4.9.5 | Test all hover interactions | Work correctly |
| 4.9.6 | Test all click handlers | Navigate/action |
| 4.9.7 | Test keyboard shortcuts | R for radar |
| 4.9.8 | Update design-log.md | Document changes |

---

## Phase 5: Site-Wide Design System (80 tasks)

### 5.1 Tasks Page (8 tasks)
**File:** `myBrain-web/src/features/tasks/TasksPage.jsx`

| Task ID | Task | Validation |
|---------|------|------------|
| 5.1.1 | Update page background | `--v2-bg-primary` |
| 5.1.2 | Update card backgrounds | `--v2-bg-surface` |
| 5.1.3 | Update text colors | v2 text variables |
| 5.1.4 | Update buttons | v2 button styling |
| 5.1.5 | Update form inputs | v2 input styling |
| 5.1.6 | Update task list | Use TaskItem |
| 5.1.7 | Update dark mode | All colors correct |
| 5.1.8 | **VALIDATE:** Matches v2 system | Visual test |

### 5.2 Notes Page (8 tasks)
### 5.3 Projects Page (8 tasks)
### 5.4 Calendar Page (8 tasks)
### 5.5 Settings Page (8 tasks)
### 5.6 Profile Page (8 tasks)
### 5.7 Files Page (8 tasks)
### 5.8 Search Results (8 tasks)
### 5.9 Modals (8 tasks)
### 5.10 Auth Pages (8 tasks)

*Each follows the same 8-task pattern as 5.1*

### 5.11 Phase 5 Checkpoint (CP5) (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 5.11.1 | Screenshot every page (light) | Save all |
| 5.11.2 | Screenshot every page (dark) | Save all |
| 5.11.3 | Run M2 monitor site-wide | All use v2 variables |
| 5.11.4 | Run M3 monitor site-wide | All dark mode compliant |
| 5.11.5 | Test navigation between pages | Consistent styling |
| 5.11.6 | Test responsive on all pages | Works at all breakpoints |
| 5.11.7 | Cross-reference with prototype | Colors match |
| 5.11.8 | Update architecture.md | Document changes |

---

## Phase 6: Dark Mode & Accessibility (48 tasks)

### 6.1 Dark Mode Text Overrides (16 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 6.1.1 | Audit all text elements | Find low contrast |
| 6.1.2 | Update heading colors | #E5E5E5 |
| 6.1.3 | Update body text colors | #E5E5E5 |
| 6.1.4 | Update secondary text | #A0A0A0 |
| 6.1.5 | Update tertiary text | #B0B0B0 |
| 6.1.6 | Update link colors | Brighter blue |
| 6.1.7 | Update placeholder text | Sufficient contrast |
| 6.1.8 | Update disabled text | Still readable |
| 6.1.9 | Update error text | Brighter red |
| 6.1.10 | Update success text | Brighter green |
| 6.1.11 | Update warning text | Brighter orange |
| 6.1.12 | Test all text with contrast checker | WCAG AA |
| 6.1.13 | Update form labels | Readable |
| 6.1.14 | Update button text | High contrast |
| 6.1.15 | Update table text | Readable |
| 6.1.16 | **VALIDATE:** All text passes WCAG AA | Run M3 |

### 6.2 Dark Mode Component Fixes (16 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 6.2.1 | Audit all components | Find dark mode issues |
| 6.2.2 | Fix card backgrounds | #1E1E1E |
| 6.2.3 | Fix modal backgrounds | Proper dark bg |
| 6.2.4 | Fix dropdown backgrounds | Dark with border |
| 6.2.5 | Fix tooltip backgrounds | Inverted colors |
| 6.2.6 | Fix input backgrounds | Dark with border |
| 6.2.7 | Fix button backgrounds | Proper contrast |
| 6.2.8 | Fix scrollbar colors | Visible but subtle |
| 6.2.9 | Fix border colors | #2A2A2A |
| 6.2.10 | Fix separator colors | #2A2A2A |
| 6.2.11 | Fix shadow intensities | More subtle |
| 6.2.12 | Fix icon colors | Brighter |
| 6.2.13 | Fix focus outlines | Visible |
| 6.2.14 | Fix selection colors | Proper contrast |
| 6.2.15 | Fix hover states | Visible changes |
| 6.2.16 | **VALIDATE:** All components dark mode compliant | Visual test |

### 6.3 Accessibility Audit (16 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 6.3.1 | Audit keyboard navigation | All elements reachable |
| 6.3.2 | Add missing focus states | Visible focus rings |
| 6.3.3 | Add aria-labels | To icon buttons |
| 6.3.4 | Add alt text | To all images |
| 6.3.5 | Add role attributes | Where needed |
| 6.3.6 | Fix tab order | Logical sequence |
| 6.3.7 | Add skip links | Main content |
| 6.3.8 | Add landmark regions | nav, main, aside |
| 6.3.9 | Audit color contrast | All pass WCAG AA |
| 6.3.10 | Add error descriptions | Accessible errors |
| 6.3.11 | Add loading announcements | Screen reader |
| 6.3.12 | Test with NVDA/VoiceOver | Accessibility |
| 6.3.13 | Fix touch targets | 44px minimum |
| 6.3.14 | Add reduced motion support | prefers-reduced-motion |
| 6.3.15 | Add high contrast support | If applicable |
| 6.3.16 | **VALIDATE:** Run /accessibility-audit | Full report |

### 6.4 Phase 6 Checkpoint (CP6) (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 6.4.1 | Run M3 monitor full site | All pass WCAG AA |
| 6.4.2 | Test with screen reader | Accessible |
| 6.4.3 | Test keyboard navigation | Tab order correct |
| 6.4.4 | Test focus states | All visible |
| 6.4.5 | Test color contrast | All pass |
| 6.4.6 | Test touch targets | 44px minimum |
| 6.4.7 | Run /accessibility-audit skill | Full report |
| 6.4.8 | Document compliance level | In memory.md |

---

## Phase 7: Animations & Polish (40 tasks)

### 7.1 Widget Animations (16 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 7.1.1 | Add fade-in keyframe | v2-fadeIn |
| 7.1.2 | Add slide-up keyframe | v2-slideUp |
| 7.1.3 | Add scale-in keyframe | v2-scaleIn |
| 7.1.4 | Apply fade-in to widgets | 0.4s ease |
| 7.1.5 | Add staggered delays | 0.1s increments |
| 7.1.6 | Add widget hover animations | translateY(-2px) |
| 7.1.7 | Add card hover shadows | Smooth transition |
| 7.1.8 | Add button press animation | scale(0.98) |
| 7.1.9 | Add list item slide-in | For dynamic content |
| 7.1.10 | Add skeleton pulse | For loading states |
| 7.1.11 | Add ring progress animation | Smooth fill |
| 7.1.12 | Add number count-up | For metrics |
| 7.1.13 | Add page transition | Fade |
| 7.1.14 | Test reduced motion | Respects preference |
| 7.1.15 | Profile animation performance | 60fps |
| 7.1.16 | **VALIDATE:** All animations smooth | Visual test |

### 7.2 Micro-interactions (16 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 7.2.1 | Add checkbox check animation | Scale + rotate |
| 7.2.2 | Add button ripple effect | On click |
| 7.2.3 | Add input focus glow | Subtle |
| 7.2.4 | Add dropdown open animation | Slide down |
| 7.2.5 | Add modal open animation | Fade + scale |
| 7.2.6 | Add toast slide-in | From edge |
| 7.2.7 | Add sidebar collapse animation | Smooth width |
| 7.2.8 | Add nav item active transition | Background slide |
| 7.2.9 | Add progress bar fill | Smooth animation |
| 7.2.10 | Add loading spinner | Smooth rotation |
| 7.2.11 | Add status light pulse | For syncing |
| 7.2.12 | Add badge count change | Pop effect |
| 7.2.13 | Add theme toggle transition | Smooth colors |
| 7.2.14 | Add radar view transition | Overlay fade |
| 7.2.15 | Test all micro-interactions | Work correctly |
| 7.2.16 | **VALIDATE:** All interactions feel polished | UX test |

### 7.3 Custom Scrollbar (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 7.3.1 | Style webkit scrollbar track | Transparent |
| 7.3.2 | Style webkit scrollbar thumb | Subtle gray |
| 7.3.3 | Add hover effect to thumb | Darker |
| 7.3.4 | Set scrollbar width | Thin |
| 7.3.5 | Add dark mode scrollbar | Lighter thumb |
| 7.3.6 | Style Firefox scrollbar | scrollbar-width |
| 7.3.7 | Test cross-browser | Chrome, Firefox, Safari |
| 7.3.8 | **VALIDATE:** Scrollbars styled consistently | Visual test |

### 7.4 Phase 7 Checkpoint (CP7) (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 7.4.1 | Test all animations | Smooth 60fps |
| 7.4.2 | Test reduced motion preference | Respects setting |
| 7.4.3 | Test animation timing | Matches prototype |
| 7.4.4 | Test hover transitions | Smooth |
| 7.4.5 | Test scrollbar styling | Custom styled |
| 7.4.6 | Profile performance | No jank |
| 7.4.7 | Cross-browser test | Chrome, Firefox, Safari |
| 7.4.8 | Document animations | In design-system.md |

---

## Phase 8: Testing & Verification (64 tasks)

### 8.1 Visual Regression Testing (16 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 8.1.1 | Screenshot dashboard (light) | Baseline |
| 8.1.2 | Screenshot dashboard (dark) | Baseline |
| 8.1.3 | Screenshot sidebar expanded (light) | Baseline |
| 8.1.4 | Screenshot sidebar expanded (dark) | Baseline |
| 8.1.5 | Screenshot sidebar collapsed | Baseline |
| 8.1.6 | Screenshot all widgets individually | Baselines |
| 8.1.7 | Screenshot all pages (light) | Baselines |
| 8.1.8 | Screenshot all pages (dark) | Baselines |
| 8.1.9 | Compare to prototype screenshots | Match % |
| 8.1.10 | Document any intentional differences | With reasons |
| 8.1.11 | Fix visual regressions | If any |
| 8.1.12 | Re-screenshot after fixes | Update baselines |
| 8.1.13 | Compare before/after | Document changes |
| 8.1.14 | Get user visual approval | Sign-off |
| 8.1.15 | Archive screenshot baselines | For future |
| 8.1.16 | **VALIDATE:** All visual tests pass | Green |

### 8.2 Responsive Testing (16 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 8.2.1 | Test dashboard at 1920px | Layout correct |
| 8.2.2 | Test dashboard at 1440px | Layout correct |
| 8.2.3 | Test dashboard at 1280px | Layout correct |
| 8.2.4 | Test dashboard at 1024px | Layout correct |
| 8.2.5 | Test dashboard at 768px | Tablet layout |
| 8.2.6 | Test dashboard at 480px | Mobile layout |
| 8.2.7 | Test sidebar at all breakpoints | Responsive |
| 8.2.8 | Test widgets at narrow widths | Stack correctly |
| 8.2.9 | Test all pages at mobile | Usable |
| 8.2.10 | Test touch interactions | Work correctly |
| 8.2.11 | Test landscape orientation | Proper layout |
| 8.2.12 | Test with browser zoom | Scales correctly |
| 8.2.13 | Fix responsive issues | If any |
| 8.2.14 | Test on real devices | iPhone, Android |
| 8.2.15 | Document breakpoint behavior | In design-system.md |
| 8.2.16 | **VALIDATE:** Responsive at all sizes | Pass |

### 8.3 Functional Testing (16 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 8.3.1 | Test sidebar navigation | All links work |
| 8.3.2 | Test Quick Actions buttons | All modals open |
| 8.3.3 | Test task CRUD | Create, update, delete |
| 8.3.4 | Test note CRUD | Create, update, delete |
| 8.3.5 | Test project CRUD | Create, update, delete |
| 8.3.6 | Test event CRUD | Create, update, delete |
| 8.3.7 | Test search | Results correct |
| 8.3.8 | Test filters | Work correctly |
| 8.3.9 | Test sorting | Works correctly |
| 8.3.10 | Test theme toggle | Switches correctly |
| 8.3.11 | Test sidebar collapse | Works correctly |
| 8.3.12 | Test radar view | Toggles correctly |
| 8.3.13 | Test keyboard shortcuts | All work |
| 8.3.14 | Test form validation | Shows errors |
| 8.3.15 | Test error states | Graceful handling |
| 8.3.16 | **VALIDATE:** All functionality works | Pass |

### 8.4 Run Existing Tests (16 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 8.4.1 | Run all unit tests | npm test |
| 8.4.2 | Fix any failures | Green |
| 8.4.3 | Run component tests | All pass |
| 8.4.4 | Run integration tests | All pass |
| 8.4.5 | Update snapshot tests | If UI changed |
| 8.4.6 | Add tests for new components | Coverage |
| 8.4.7 | Run coverage report | Check % |
| 8.4.8 | Run /smoke-test skill | E2E passes |
| 8.4.9 | Run /qa-status skill | Report |
| 8.4.10 | Run build | No errors |
| 8.4.11 | Run lint | No warnings |
| 8.4.12 | Run type check | No errors |
| 8.4.13 | Check bundle size | Not increased |
| 8.4.14 | Check performance metrics | Not degraded |
| 8.4.15 | Document test results | In report |
| 8.4.16 | **VALIDATE:** All tests pass | 100% |

### 8.5 Phase 8 Checkpoint (CP8) (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 8.5.1 | All unit tests pass | 100% |
| 8.5.2 | All component tests pass | 100% |
| 8.5.3 | Run /smoke-test | Passes |
| 8.5.4 | Run /qa-status | Coverage acceptable |
| 8.5.5 | No console errors | Clean |
| 8.5.6 | No TypeScript errors | Clean build |
| 8.5.7 | No ESLint warnings | Clean lint |
| 8.5.8 | Create test report | Document results |

---

## Phase 9: Documentation & Cleanup (40 tasks)

### 9.1 Update Documentation (16 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 9.1.1 | Update architecture.md | New components |
| 9.1.2 | Update design-system.md | V2 system |
| 9.1.3 | Update design-log.md | Implementation notes |
| 9.1.4 | Update memory.md | Decisions made |
| 9.1.5 | Update PROCESS-SUMMARY.md | Completion status |
| 9.1.6 | Add component documentation | Each new component |
| 9.1.7 | Add storybook stories | If using Storybook |
| 9.1.8 | Document CSS variables | Full list |
| 9.1.9 | Document breakpoints | Responsive system |
| 9.1.10 | Document animations | Available animations |
| 9.1.11 | Document accessibility | Features |
| 9.1.12 | Update README if needed | Project overview |
| 9.1.13 | Archive prototype files | If complete |
| 9.1.14 | Update SKILLS.md | If skills changed |
| 9.1.15 | Create migration guide | V1 to V2 |
| 9.1.16 | **VALIDATE:** All docs current | Review |

### 9.2 Code Cleanup (16 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 9.2.1 | Remove unused CSS | Dead code |
| 9.2.2 | Remove unused components | Dead code |
| 9.2.3 | Remove console.logs | Debugging |
| 9.2.4 | Remove commented code | Clean |
| 9.2.5 | Remove TODO comments | Resolved |
| 9.2.6 | Remove V1 code if replaced | Clean |
| 9.2.7 | Consolidate CSS files | If possible |
| 9.2.8 | Organize component exports | Barrel files |
| 9.2.9 | Run Prettier | Format |
| 9.2.10 | Run ESLint --fix | Auto-fix |
| 9.2.11 | Check for duplicate code | DRY |
| 9.2.12 | Optimize imports | Tree shaking |
| 9.2.13 | Optimize bundle | Size |
| 9.2.14 | Remove feature flags if complete | V2 enabled |
| 9.2.15 | Final build check | No errors |
| 9.2.16 | **VALIDATE:** Code is clean | Review |

### 9.3 Final Verification (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 9.3.1 | Full site walkthrough (light) | No issues |
| 9.3.2 | Full site walkthrough (dark) | No issues |
| 9.3.3 | Test all user flows | Work correctly |
| 9.3.4 | Performance audit | Lighthouse |
| 9.3.5 | Security audit | No vulnerabilities |
| 9.3.6 | Cross-browser final test | All work |
| 9.3.7 | Mobile final test | Works correctly |
| 9.3.8 | **VALIDATE:** Production ready | Sign-off |

### 9.4 Phase 9 Checkpoint (CP9 - FINAL) (8 tasks)

| Task ID | Task | Validation |
|---------|------|------------|
| 9.4.1 | Run full build | No errors |
| 9.4.2 | Run /health-audit | All pass |
| 9.4.3 | Run /design-audit | All pass |
| 9.4.4 | Final screenshot comparison | 100% match |
| 9.4.5 | Get user visual approval | Sign-off |
| 9.4.6 | Enable V2 for test user | Feature flag |
| 9.4.7 | Production smoke test | Works live |
| 9.4.8 | Enable for all users | Full rollout |

---

## Cross-Reference Matrix

| Component | Prototype Lines | CSS Variables | Tests | Docs |
|-----------|-----------------|---------------|-------|------|
| Sidebar | 225-477 | 26-27, 67-68 | sidebar.test.js | architecture.md |
| Activity Rings | 366-432 | red, green, blue | ActivityRings.test.jsx | design-system.md |
| Quick Actions | 284-320 | blue, gray | QuickActionButton.test.jsx | design-system.md |
| Nav Item | 323-365 | blue-light, separator | NavItem.test.jsx | design-system.md |
| Widget | varies | surface, border | Widget.test.jsx | design-system.md |
| Metric Card | 540-608 | elevated, status | MetricCard.test.jsx | design-system.md |
| Task Item | varies | elevated, error | TaskItem.test.jsx | design-system.md |
| Schedule Item | 966-1110 | event colors | ScheduleItem.test.jsx | design-system.md |
| Activity Log | 1374-1575 | always dark | ActivityLogEntry.test.jsx | design-system.md |
| Bottom Bar | 1928-2003 | blur, semi-transparent | BottomBarV2.test.jsx | design-system.md |

---

## Verification Checklist (Pre-Completion)

### Sidebar
- [ ] Logo matches prototype (gradient, size)
- [ ] Quick Actions 2x2 grid matches
- [ ] Quick Capture button matches (gradient, full width)
- [ ] Navigate section has all 8 items
- [ ] Navigate badges show counts
- [ ] Activity Rings display correctly
- [ ] Streak banner shows when applicable
- [ ] Projects section shows 4-5 projects
- [ ] Collapsed state works correctly
- [ ] Light mode matches prototype
- [ ] Dark mode text readable

### Dashboard
- [ ] Topbar matches (greeting, date, weather, radar, theme, avatar)
- [ ] Metrics row has 4 cards with correct styling
- [ ] Metric cards hover effect works
- [ ] Current task card shows task with progress
- [ ] Current task buttons styled correctly (not "ComplPauseSkip")
- [ ] Widget grid 2x3 layout
- [ ] All 6 widgets have correct styling
- [ ] Widget hover effects work
- [ ] Task hover actions work (Done/Defer)
- [ ] Schedule hover actions work (Join/Prep/Skip)
- [ ] Inbox triage buttons work
- [ ] Activity log always dark
- [ ] Bottom bar matches (shortcuts + Customize)
- [ ] Radar view toggles correctly

### Site-Wide
- [ ] All pages use v2 CSS variables
- [ ] All text readable in dark mode
- [ ] All components have consistent styling
- [ ] No visual regressions from V1

---

## Total Task Count Summary

| Phase | Tasks |
|-------|-------|
| Phase 1: Design System Foundation | 68 |
| Phase 2: Reusable Components | 288 |
| Phase 3: Sidebar Redesign | 112 |
| Phase 4: Dashboard Widget Fixes | 96 |
| Phase 5: Site-Wide Updates | 80 |
| Phase 6: Dark Mode & Accessibility | 48 |
| Phase 7: Animations & Polish | 40 |
| Phase 8: Testing & Verification | 64 |
| Phase 9: Documentation & Cleanup | 40 |
| **TOTAL** | **836 micro-tasks** |

---

## Monitoring Agent Requirements

**Concurrent Monitors (Always Running):**
1. M1: Prototype Fidelity Monitor - Compares every change to HTML prototype
2. M2: CSS Compliance Monitor - Verifies v2 variables used everywhere
3. M3: Dark Mode Contrast Monitor - Checks WCAG AA compliance
4. M4: Component Reusability Monitor - Ensures no duplicate code
5. M5: Test Coverage Monitor - Ensures tests exist for new code
6. M6: Build Health Monitor - Verifies no build errors
7. M7: Cross-Reference Monitor - Checks docs match code
8. M8: Visual Regression Monitor - Screenshot comparisons

**Execution Agents (Per Phase):**
- Phase 1: 2-3 agents (CSS variables, typography)
- Phase 2: 4-6 agents (parallel component development)
- Phase 3: 2-3 agents (sidebar sections)
- Phase 4: 4-6 agents (parallel widget updates)
- Phase 5: 4-6 agents (parallel page updates)
- Phase 6: 2-3 agents (dark mode, accessibility)
- Phase 7: 2 agents (animations, polish)
- Phase 8: 3-4 agents (testing types)
- Phase 9: 2 agents (docs, cleanup)

**Total Agent Capacity:** 8 monitors + 6 execution agents = 14 concurrent agents max

---

## Success Criteria

1. **Visual Match:** 100% match to prototype (screenshot comparison)
2. **Build Health:** Zero errors, zero warnings
3. **Test Coverage:** All new components have tests, all tests pass
4. **Accessibility:** WCAG AA compliance on all pages
5. **Performance:** 60fps animations, no layout shifts
6. **Documentation:** All changes documented in architecture.md, design-system.md
7. **User Approval:** Visual sign-off from user
8. **Production Verified:** Works correctly in production

---

*Document created: 2026-01-31*
*Source of truth: `.claude/design/dashboard-redesign-2026-01/dashboard-final-v2.html`*
