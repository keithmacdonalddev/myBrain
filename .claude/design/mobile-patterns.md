# Mobile Design Patterns - myBrain

Comprehensive documentation of all mobile-specific patterns in the myBrain codebase.

---

## Navigation Architecture

### Bottom Tab Bar
**Location:** `AppShell.jsx` → `MobileBottomNav`

```
┌─────────────────────────────────────────┐
│  Menu  │  Search  │  Settings │ Profile │
└─────────────────────────────────────────┘
```

- **Height:** 56px per button
- **Position:** Fixed bottom, z-40
- **Visibility:** `sm:hidden` (mobile only)
- **Hides when:** Any panel is open (`translate-y-full`)

**3D Groove Dividers:**
```css
background: linear-gradient(180deg,
  rgba(0,0,0,0.25) 0%,
  rgba(0,0,0,0.15) 50%,
  rgba(0,0,0,0.25) 100%);
box-shadow: 1px 0 0 rgba(255,255,255,0.08);
```

**Search Bar:** Slides up from nav (max-h-0 → max-h-[60px])

### Panel Types

| Panel Type | Animation | Trigger |
|------------|-----------|---------|
| Menu Panel | Slide up (translateY) | Bottom nav "Menu" |
| Settings Panel | Slide up | Bottom nav "Settings" |
| Profile Panel | Slide up | Bottom nav "Profile" |
| Note/Task Panel | Slide from right (translateX) | Item tap |
| Calendar Modal | Slide up (fullscreen) | Dashboard calendar icon |

### iOS-Style Horizontal Navigation
**Used in:** SettingsPage.jsx, ProfilePage.jsx

```jsx
// Menu slides left when section selected
mobileSection ? '-translate-x-full' : 'translate-x-0'

// Content slides in from right
mobileSection ? 'translate-x-0' : 'translate-x-full'
```

**Duration:** 300ms ease-in-out

---

## Touch Standards

### Touch Targets
| Element | Minimum Size | Implementation |
|---------|--------------|----------------|
| Icon buttons | 44×44px | `min-h-[44px] min-w-[44px]` |
| Text buttons | 44px height | `min-h-[44px]` |
| List items | 48px height | `min-h-[48px]` |
| Input fields | 44-48px | `min-h-[44px]` or `py-3` |

### Active State Feedback
Every interactive element must have:

```jsx
className="
  active:scale-95        // Scale down on press
  active:bg-bg/50        // Background darken
  active:text-primary    // Color change
  transition-all         // Smooth transition
"
```

### Button Pattern
```jsx
<button className="
  p-2 sm:p-1.5                    // Larger padding on mobile
  min-h-[44px] min-w-[44px]       // Touch target
  flex items-center justify-center
  text-muted hover:text-text      // Color states
  active:text-primary active:scale-95  // Press feedback
  rounded-lg transition-all
">
```

---

## Animation Standards

### Timing
| Animation Type | Duration | Easing |
|----------------|----------|--------|
| Button press | 150ms | ease-out |
| Panel slide | 300ms | cubic-bezier(0.32, 0.72, 0, 1) |
| Fade in | 200ms | ease-out |
| Collapse/expand | 200ms | ease-out |
| Backdrop | 200ms | linear |

### Panel Slide Animation
```css
/* Slide up from bottom */
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* iOS horizontal slide */
transition: transform 0.3s ease-in-out;
transform: translateX(100%);  /* Hidden right */
transform: translateX(0);      /* Visible */
transform: translateX(-100%);  /* Hidden left */
```

### Stagger Animation
```jsx
// Header animates first
className={isOpen ? 'animate-stagger-1' : ''}

// Content animates second (50ms delay)
className={isOpen ? 'animate-stagger-2' : ''}
```

---

## Responsive Breakpoints

### Tailwind Breakpoints Used
| Prefix | Width | Usage |
|--------|-------|-------|
| (none) | 0px+ | Mobile-first base styles |
| sm: | 640px+ | Tablet/small desktop |
| md: | 768px+ | Medium screens |
| lg: | 1024px+ | Desktop |
| xl: | 1280px+ | Large desktop |

### Common Patterns
```jsx
// Hide on mobile, show on desktop
className="hidden sm:block"

// Show on mobile, hide on desktop
className="sm:hidden"

// Different padding per breakpoint
className="p-4 sm:p-6 lg:p-8"

// Different grid columns
className="grid grid-cols-1 lg:grid-cols-2"

// Larger touch targets on mobile
className="p-2.5 sm:p-1.5"
className="w-5 h-5 sm:w-4 sm:h-4"
```

---

## Collapsible Widget Pattern

**Used in:** Dashboard TasksWidget, UpcomingWidget

### Structure
```jsx
function CollapsibleWidget() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="card">
      {/* Header - clickable on mobile only */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="sm:pointer-events-none w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Icon />
          <h3>Title</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Count badge - mobile only */}
          <span className="sm:hidden">{count}</span>
          {/* Chevron - mobile only */}
          <ChevronRight className={`sm:hidden transition-transform ${
            isExpanded ? 'rotate-90' : ''
          }`} />
        </div>
      </button>

      {/* Body - collapsible on mobile, always visible on desktop */}
      <div className={`${isExpanded ? 'block' : 'hidden'} sm:block`}>
        {/* Content */}
      </div>
    </div>
  );
}
```

---

## Modal Patterns

### Bottom Sheet (Mobile) / Centered (Desktop)
```jsx
className="
  fixed inset-x-0 bottom-0           // Mobile: full width, from bottom
  sm:inset-auto sm:top-1/2 sm:left-1/2  // Desktop: centered
  sm:-translate-x-1/2 sm:-translate-y-1/2
  w-full sm:max-w-md
  rounded-t-2xl sm:rounded-lg
"
```

### Fullscreen Modal (Mobile Only)
```jsx
<div className="fixed inset-0 z-50 bg-bg sm:hidden flex flex-col">
  {/* Close button */}
  <div className="flex items-center justify-end px-4 py-2">
    <button className="p-2 min-h-[44px] min-w-[44px]">
      <X />
    </button>
  </div>
  {/* Scrollable content */}
  <div className="flex-1 overflow-auto px-4 pb-4">
    {children}
  </div>
</div>
```

### Backdrop
```jsx
<div
  className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-200"
  onClick={onClose}
/>
```

---

## Slide Panel Pattern

**Used in:** NoteSlidePanel, TaskSlidePanel, ProjectSlidePanel

### Structure
```jsx
<div className={`
  fixed top-0 right-0 bottom-0
  w-full sm:w-[480px]
  bg-panel border-l border-border
  shadow-theme-2xl z-50
  transition-transform duration-300 ease-out
  ${isOpen ? 'translate-x-0' : 'translate-x-full'}
`}>
  {/* Panel content */}
</div>
```

---

## Safe Areas

### Bottom Padding for Nav Bar
```jsx
// Main content area in AppShell
<main className="flex-1 overflow-auto pb-[120px] sm:pb-0">
```

- 120px accounts for: 56px nav + scroll buffer
- Removed on desktop (sm:pb-0)

### Scroll Containers
```jsx
<div className="flex-1 overflow-auto -webkit-overflow-scrolling-touch">
```

---

## Icon & Text Scaling

### Icon Sizes
| Context | Mobile | Desktop |
|---------|--------|---------|
| Navigation | w-6 h-6 | w-5 h-5 |
| Buttons | w-5 h-5 | w-4 h-4 |
| Inline | w-4 h-4 | w-3.5 h-3.5 |

### Implementation
```jsx
className="w-5 h-5 sm:w-4 sm:h-4"
```

### Text Sizes
| Context | Size |
|---------|------|
| Page title | text-page-title (30px) |
| Section header | text-section-header (18px) |
| Body | text-sm (14px) |
| Secondary | text-small (13px) |
| Label | text-xs (12px) |

---

## State Management

### Panel State
```jsx
const [activePanel, setActivePanel] = useState(null);
// Values: 'menu' | 'settings' | 'profile' | null

// Bottom nav hides when panel open
const isHidden = activePanel !== null;
```

### Section Navigation State
```jsx
const [mobileSection, setMobileSection] = useState(null);
// null = show menu list
// 'section-id' = show section content
```

### Collapse State
```jsx
const [isExpanded, setIsExpanded] = useState(false);
// false = collapsed (mobile), always shown (desktop)
```

---

## Quick Reference

### Must-Have for Mobile Elements

1. **Touch target:** `min-h-[44px] min-w-[44px]`
2. **Active feedback:** `active:scale-95 active:bg-bg/50`
3. **Transition:** `transition-all` or `transition-colors`
4. **Mobile visibility:** `sm:hidden` or `hidden sm:block`

### Panel Animation Recipe
```jsx
className={`
  fixed inset-0 z-50 bg-bg
  transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
  ${isOpen ? 'translate-y-0' : 'translate-y-full'}
`}
```

### iOS Slide Recipe
```jsx
// Container
className="relative overflow-hidden"

// Left view (menu)
className={`transition-transform duration-300 ease-in-out ${
  showDetail ? '-translate-x-full' : 'translate-x-0'
}`}

// Right view (detail)
className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
  showDetail ? 'translate-x-0' : 'translate-x-full'
}`}
```

---

*Last updated: 2025-01-21*
