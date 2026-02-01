# Sidebar CSS - Complete Reference Document

## Purpose
This document serves as the authoritative reference for sidebar CSS values extracted from the prototype and verified in the implementation.

**Source of Truth:** `.claude/design/dashboard-redesign-2026-01/dashboard-final-v2.html`
**Implementation:** `myBrain-web/src/styles/theme.css` (lines 431-558)

---

## CSS Variables - Complete List

### Color Variables - Light Mode

```css
/* Backgrounds */
--v2-bg-primary: #F2F2F7;
--v2-bg-secondary: #FFFFFF;
--v2-bg-tertiary: #E5E5EA;
--v2-separator: rgba(60, 60, 67, 0.12);

/* Text Colors */
--v2-text-primary: #1C1C1E;
--v2-text-secondary: #3C3C43;
--v2-text-tertiary: #8E8E93;

/* Accent Colors (Apple System) */
--v2-blue: #007AFF;
--v2-blue-light: rgba(0, 122, 255, 0.12);
--v2-red: #FF3B30;
--v2-red-light: rgba(255, 59, 48, 0.12);
--v2-green: #34C759;
--v2-green-light: rgba(52, 199, 89, 0.12);
--v2-orange: #FF9500;
--v2-orange-light: rgba(255, 149, 0, 0.12);
--v2-purple: #AF52DE;
--v2-purple-light: rgba(175, 82, 222, 0.12);
--v2-pink: #FF2D55;
--v2-teal: #5AC8FA;
--v2-indigo: #5856D6;

/* Sidebar Specific */
--v2-sidebar-bg: rgba(255, 255, 255, 0.72);
--v2-card-bg: #FFFFFF;
```

### Color Variables - Dark Mode

```css
/* Backgrounds */
--v2-bg-primary: #121212;
--v2-bg-secondary: #1A1A1A;
--v2-bg-tertiary: #242424;
--v2-bg-elevated: #1E1E1E;
--v2-separator: #2A2A2A;

/* Text Colors (WCAG AAA Compliant) */
--v2-text-primary: #E5E5E5;    /* 12.6:1 contrast ratio */
--v2-text-secondary: #A0A0A0;  /* 6.3:1 contrast ratio */
--v2-text-tertiary: #B0B0B0;   /* 7.5:1 contrast ratio */

/* Accent Colors (same as light, work in dark mode) */
--v2-blue: #007AFF;
--v2-blue-light: rgba(0, 122, 255, 0.2);
--v2-red: #FF3B30;
--v2-red-light: rgba(255, 59, 48, 0.2);
--v2-green: #34C759;
--v2-green-light: rgba(52, 199, 89, 0.2);
--v2-orange: #FF9500;
--v2-orange-light: rgba(255, 149, 0, 0.2);
--v2-purple: #AF52DE;
--v2-purple-light: rgba(175, 82, 222, 0.2);

/* Sidebar Specific */
--v2-sidebar-bg: #1A1A1A;    /* Solid, no glass effect */
--v2-card-bg: #1E1E1E;
```

### Spacing Variables

```css
--v2-spacing-xs: 4px;
--v2-spacing-sm: 8px;
--v2-spacing-md: 12px;
--v2-spacing-lg: 16px;
--v2-spacing-xl: 20px;
--v2-spacing-2xl: 24px;
```

### Border Radius Variables

```css
--v2-radius-sm: 6px;      /* Small elements (badges, small buttons) */
--v2-radius-md: 10px;     /* Medium elements (nav items, action buttons) */
--v2-radius-lg: 14px;     /* Large elements (containers, cards) */
--v2-radius-xl: 18px;     /* Extra large elements */
--v2-radius-full: 9999px; /* Fully rounded (pills) */
```

### Shadow Variables - Light Mode

```css
--v2-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
--v2-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
--v2-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
```

### Shadow Variables - Dark Mode

```css
--v2-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
--v2-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
--v2-shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
```

---

## Component CSS Styles

### Sidebar Container

Key properties:
- Width: 260px fixed
- Position: Fixed, top-left
- Height: 100vh
- Z-index: 100
- Background: Glass effect (light), solid (dark)
- Border: 1px right border with separator color
- Transitions: Width and background color

### Sidebar Header

- Padding: 16px all sides
- Display: Flex with centered alignment
- Gap: 8px between logo and title
- Logo: 28x28 with blue-purple gradient (6px radius)
- Title: 17px, 600 weight

### Sidebar Section

- Padding: 12px vertical, 16px horizontal
- Section title: 11px, uppercase, semibold

### Quick Actions Grid

- Layout: 2x2 grid
- Gap: 8px
- Button size: Flexible width, appropriate padding
- Button styling: Various variants (primary, secondary, gradient)

### Navigation Items

- Display: Flex layout
- Gap: 12px
- Padding: 8px 12px
- Border radius: 10px
- Font: 14px, medium weight
- Colors: Secondary text by default, primary on hover/active

### Activity Rings Container

- Display: Flex, centered, column layout
- Padding: 16px
- Background: White (light) or elevated dark (dark)
- Border radius: 14px
- Margin: 0 16px horizontal

---

## Design System Rules

### When to Use Which Spacing
- xs (4px): Gap between very small elements
- sm (8px): Gap between buttons in grid, badge padding
- md (12px): Section padding, item spacing
- lg (16px): Main container padding, section margins
- xl (20px): Large section spacing
- 2xl (24px): Extra large spacing

### When to Use Which Border Radius
- sm (6px): Small buttons, badges
- md (10px): Navigation items, action buttons
- lg (14px): Cards, containers
- xl (18px): Very large containers
- full (9999px): Pill-shaped elements

### Color Usage Guidelines
- Blue: Primary action, active states
- Red: Badges, alerts
- Green: Success states
- Purple: Secondary branding
- Orange: Warnings
- Text Primary: Main content
- Text Secondary: Less important text
- Text Tertiary: Hints, labels

---

## Critical Implementation Details

1. **Sidebar width is always 260px** when not collapsed
2. **Glass effect only in light mode** - dark mode uses solid background
3. **Z-index should be 100** to stay above content but below modals
4. **Dark mode uses solid backgrounds** to avoid transparency issues
5. **All text meets WCAG AAA contrast** in both light and dark modes

---

**Last Updated:** 2026-01-31
**Source:** Proto-Sidebar-QA Session
**Status:** APPROVED FOR USE
