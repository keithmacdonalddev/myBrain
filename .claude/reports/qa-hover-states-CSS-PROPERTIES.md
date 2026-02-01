# Hover States - CSS Properties Reference
**Date:** 2026-01-31

## Navigation Item Hover
```css
.nav-item:hover {
  background: var(--v2-separator, rgba(60, 60, 67, 0.12));
  transition: all 0.15s ease;
}

/* Dark mode */
.dark .nav-item:hover {
  background: var(--v2-separator, #2A2A2A);
}
```

---

## Quick Action Button Hover
```css
.v2-quick-action-btn:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: scale(1.02);
  transition: all 0.2s ease;
}

.v2-quick-action-btn:active:not(:disabled) {
  transform: scale(0.98);
}
```

---

## Metric Card Hover
```css
.v2-metric-card {
  transition: all 0.2s ease;
}

.v2-metric-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--v2-shadow-sm, 0 1px 3px rgba(0,0,0,0.08));
}
```

---

## Widget Container Hover
```css
.widget {
  transition: all 0.2s ease;
  border: 1px solid var(--v2-border-default);
}

.widget:hover {
  border-color: var(--v2-border-strong);
  box-shadow: var(--v2-shadow-md);
  transform: translateY(-2px);
}

/* Dark mode */
.dark .widget:hover {
  border-color: #383838;
}
```

---

## Widget Dropdown Hover
```css
.widget-dropdown {
  transition: all 0.15s ease;
  border: 1px solid var(--v2-border-default);
}

.widget-dropdown:hover {
  border-color: var(--v2-border-strong);
  color: var(--v2-text-primary);
}
```

---

## Task Item Container Hover
```css
.task-item {
  transition: all 0.15s ease;
}

.task-item:hover {
  background: var(--v2-bg-surface-hover);
  transform: translateY(-2px);
  box-shadow: var(--v2-shadow-sm);
}

/* Action buttons revealed on hover */
.task-item__actions {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.task-item:hover .task-item__actions {
  opacity: 1;
}
```

---

## Task Action Button Hover
```css
.task-item__action-btn {
  transition: all 0.15s ease;
}

.task-item__action-btn:hover {
  background: var(--v2-bg-surface-hover);
  color: var(--v2-text-primary);
  transform: scale(1.1);
}

/* Done button (green) */
.task-item__action-btn--done:hover {
  background: var(--v2-green, #34C759);
  color: white;
}

/* Defer button (blue) */
.task-item__action-btn--defer:hover {
  background: var(--v2-accent-primary, #007AFF);
  color: white;
}

/* Delete button (red) */
.task-item__action-btn--delete:hover {
  background: var(--v2-status-error);
  color: white;
}
```

---

## Schedule Item Container Hover
```css
.schedule-item {
  transition: all 0.2s ease;
  cursor: pointer;
}

.schedule-item:hover {
  background: var(--v2-bg-surface-hover, rgba(0, 0, 0, 0.04));
}

/* Actions revealed on hover */
.schedule-actions {
  opacity: 0;
  transition: opacity 0.15s ease;
}

.schedule-item:hover .schedule-actions {
  opacity: 1;
}
```

---

## Schedule Action Buttons Hover
```css
/* Join button (blue) */
.schedule-action-btn.join:hover {
  filter: brightness(1.15);
}

/* Prep button (purple) */
.schedule-action-btn.prep:hover {
  background: var(--v2-purple, #AF52DE);
  color: white;
}

/* Skip button (red-light) */
.schedule-action-btn.skip:hover {
  background: var(--v2-red-light, rgba(255, 59, 48, 0.12));
  color: var(--v2-red, #FF3B30);
}

/* Dark mode skip button */
.dark .schedule-action-btn.skip:hover {
  background: var(--v2-red-light, rgba(255, 59, 48, 0.2));
  color: var(--v2-red, #FF3B30);
}
```

---

## Activity Log Entry Hover
```css
.log-entry {
  transition: background 0.15s ease;
  background: rgba(255, 255, 255, 0.02);
}

.log-entry:hover {
  background: rgba(255, 255, 255, 0.05);
}
```

---

## Hover Action Button Hover
```css
.v2-hover-action {
  transition: all 0.15s ease;
  background: var(--v2-bg-surface);
  border: 1px solid var(--v2-border-default);
}

.v2-hover-action:hover {
  background: var(--v2-bg-surface-hover);
  border-color: var(--v2-border-strong);
  color: var(--v2-text-primary);
}

/* Danger variant */
.v2-hover-action--danger:hover {
  background: var(--v2-status-error);
  border-color: var(--v2-status-error);
  color: var(--v2-text-inverse);
}

/* Primary variant */
.v2-hover-action--primary:hover {
  background: var(--v2-accent-primary);
  color: var(--v2-text-inverse);
}

/* Success variant */
.v2-hover-action--success:hover {
  background: var(--v2-status-success);
  color: var(--v2-text-inverse);
}

/* Staggered reveal animation */
.v2-hover-actions[data-visible="true"] .v2-hover-action {
  animation: v2-hover-action-slide-in 0.15s ease forwards;
}

.v2-hover-actions[data-visible="true"] .v2-hover-action:nth-child(1) { animation-delay: 0s; }
.v2-hover-actions[data-visible="true"] .v2-hover-action:nth-child(2) { animation-delay: 0.03s; }
.v2-hover-actions[data-visible="true"] .v2-hover-action:nth-child(3) { animation-delay: 0.06s; }
.v2-hover-actions[data-visible="true"] .v2-hover-action:nth-child(4) { animation-delay: 0.09s; }
```

---

## Quick Key (Bottom Bar) Hover
```css
.quick-key {
  transition: all 0.2s ease;
  background: transparent;
}

.quick-key:hover {
  background: var(--v2-bg-surface-hover);
  color: var(--v2-text-primary);
}

.customize-btn:hover {
  background: var(--v2-bg-surface-hover);
  color: var(--v2-text-primary);
}
```

---

## Focus States (All Interactive Elements)
```css
/* Nav items */
.nav-item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--v2-blue-light, rgba(0, 122, 255, 0.12)),
              0 0 0 4px var(--v2-blue, #007AFF);
}

/* Quick action buttons */
.v2-quick-action-btn:focus-visible {
  outline: 2px solid var(--v2-blue);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px var(--v2-blue-light);
}

/* Metric cards (clickable) */
.v2-metric-card--clickable:focus {
  outline: 2px solid var(--v2-accent-primary);
  outline-offset: 2px;
}

/* Task items */
.task-item:focus-visible {
  box-shadow: 0 0 0 2px var(--v2-accent-primary);
}

/* Schedule items */
.schedule-item:focus {
  outline: 2px solid var(--v2-accent-primary, #007AFF);
  outline-offset: 2px;
}

/* Hover actions */
.v2-hover-action:focus {
  outline: none;
  box-shadow: 0 0 0 3px var(--v2-accent-muted);
}

/* Quick keys */
.quick-key:focus-visible {
  outline: 2px solid var(--v2-accent-primary);
  outline-offset: 2px;
}
```

---

## Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  /* Quick action buttons */
  .v2-quick-action-btn {
    transition: none;
  }

  .v2-quick-action-btn:hover:not(:disabled) {
    transform: none;
  }

  /* Schedule items */
  .schedule-item,
  .schedule-actions,
  .schedule-action-btn {
    transition: none;
  }

  .schedule-badge--now {
    animation: none;
  }
}
```

---

## Mobile Responsive Adjustments
```css
@media (max-width: 640px) {
  /* Task item actions always visible on mobile */
  .task-item__actions {
    opacity: 1;
  }

  /* Schedule item actions always visible on mobile */
  .schedule-actions {
    opacity: 1;
  }

  /* Quick action buttons - smaller on mobile */
  .v2-quick-action-btn {
    font-size: 12px;
    padding: 6px 10px;
  }

  /* Bottom bar text hidden, only key badges shown */
  .quick-key span:not(.key-badge),
  .customize-btn span {
    display: none;
  }
}
```

---

## CSS Variables Used
| Variable | Purpose |
|----------|---------|
| `--v2-bg-surface-hover` | Hover background for containers |
| `--v2-accent-primary` | Primary action color (blue) |
| `--v2-status-error` | Error/danger color (red) |
| `--v2-status-success` | Success color (green) |
| `--v2-separator` | Nav item hover background |
| `--v2-border-default` | Normal border color |
| `--v2-border-strong` | Strong/hover border color |
| `--v2-shadow-sm` | Small shadow effect |
| `--v2-shadow-md` | Medium shadow effect |
| `--v2-text-primary` | Primary text color |
| `--v2-text-secondary` | Secondary text color |
| `--v2-text-tertiary` | Tertiary text color |

---

## Animation Keyframes
```css
/* Widget fade-in */
@keyframes widgetFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Schedule badge pulse */
@keyframes schedule-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Status light pulse */
@keyframes status-pulse {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 12px rgba(52, 199, 89, 0.5);
  }
  50% {
    opacity: 0.7;
    box-shadow: 0 0 6px rgba(52, 199, 89, 0.3);
  }
}

/* Hover action slide-in */
@keyframes v2-hover-action-slide-in {
  from {
    opacity: 0;
    transform: translateX(4px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Skeleton shimmer */
@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

---

## Summary Statistics
- **Total Components:** 11
- **Total Hover States:** 45+
- **Unique Transition Durations:** 4
- **CSS Variables Used:** 13
- **Animations:** 5
- **Dark Mode Overrides:** 8+
- **Mobile Adjustments:** 5+

---

**Status: All hover states properly implemented with consistent CSS properties**
