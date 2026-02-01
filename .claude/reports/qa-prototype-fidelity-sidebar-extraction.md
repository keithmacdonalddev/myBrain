# Sidebar CSS Extraction from Prototype

## Color Variables (Root)

### Light Mode
```css
--bg-primary: #F2F2F7
--bg-secondary: #FFFFFF
--bg-tertiary: #E5E5EA
--sidebar-bg: rgba(255, 255, 255, 0.72)
--card-bg: #FFFFFF
--text-primary: #1C1C1E
--text-secondary: #3C3C43
--text-tertiary: #8E8E93
--separator: rgba(60, 60, 67, 0.12)

--blue: #007AFF
--blue-light: rgba(0, 122, 255, 0.12)
--red: #FF3B30
--red-light: rgba(255, 59, 48, 0.12)
--green: #34C759
--green-light: rgba(52, 199, 89, 0.12)
--orange: #FF9500
--orange-light: rgba(255, 149, 0, 0.12)
--purple: #AF52DE
--purple-light: rgba(175, 82, 222, 0.12)
--pink: #FF2D55
--teal: #5AC8FA
--indigo: #5856D6
```

### Dark Mode
```css
--bg-primary: #121212
--bg-secondary: #1A1A1A
--bg-tertiary: #242424
--card-bg: #1E1E1E
--sidebar-bg: #1A1A1A (solid, not transparent)
--text-primary: #E5E5E5
--text-secondary: #A0A0A0
--text-tertiary: #B0B0B0
--separator: #2A2A2A
--border-default: #383838
--blue-light: rgba(0, 122, 255, 0.2)
--red-light: rgba(255, 59, 48, 0.2)
--green-light: rgba(52, 199, 89, 0.2)
--orange-light: rgba(255, 149, 0, 0.2)
--purple-light: rgba(175, 82, 222, 0.2)
```

## Spacing Variables
```css
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 12px
--spacing-lg: 16px
--spacing-xl: 20px
--spacing-2xl: 24px
```

## Border Radius Variables
```css
--radius-sm: 6px
--radius-md: 10px
--radius-lg: 14px
--radius-xl: 18px
```

## Shadow Variables
```css
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08)
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08)
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12)

[data-theme="dark"]:
--shadow-sm: 0 1px 3px rgba(0,0,0,0.4)
--shadow-md: 0 4px 12px rgba(0,0,0,0.5)
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5)
```

## SIDEBAR SPECIFIC STYLES

### Sidebar Container
```css
.sidebar {
  width: 260px
  min-width: 260px
  height: 100vh
  position: fixed
  left: 0
  top: 0
  background: var(--sidebar-bg)
  backdrop-filter: blur(20px) saturate(180%)
  -webkit-backdrop-filter: blur(20px) saturate(180%)
  border-right: 1px solid var(--separator)
  display: flex
  flex-direction: column
  overflow-y: auto
  z-index: 100
  transition: transform 0.3s ease
}
```

### Sidebar Header
```css
.sidebar-header {
  padding: var(--spacing-lg)           // 16px
  display: flex
  align-items: center
  gap: var(--spacing-sm)              // 8px
  border-bottom: 1px solid var(--separator)
}

.sidebar-logo {
  width: 28px
  height: 28px
  background: linear-gradient(135deg, var(--blue), var(--purple))
  border-radius: var(--radius-sm)     // 6px
  display: flex
  align-items: center
  justify-content: center
  color: white
  font-weight: 700
  font-size: 14px
}

.sidebar-title {
  font-size: 17px
  font-weight: 600
}
```

### Sidebar Sections
```css
.sidebar-section {
  padding: var(--spacing-md) var(--spacing-lg)  // 12px 16px
}

.sidebar-section-title {
  font-size: 11px
  font-weight: 600
  text-transform: uppercase
  letter-spacing: 0.08em
  color: var(--text-tertiary)
  margin-bottom: var(--spacing-sm)   // 8px
}
```

### Quick Actions
```css
.quick-actions {
  display: grid
  grid-template-columns: 1fr 1fr
  gap: var(--spacing-sm)              // 8px
}

.quick-action-btn {
  display: flex
  align-items: center
  justify-content: center
  gap: var(--spacing-xs)              // 4px
  padding: var(--spacing-sm) var(--spacing-md)  // 8px 12px
  background: var(--blue)
  color: white
  border: none
  border-radius: var(--radius-md)    // 10px
  font-size: 13px
  font-weight: 500
  cursor: pointer
  transition: all 0.2s ease
}

.quick-action-btn:hover {
  filter: brightness(1.1)
  transform: scale(1.02)
}

.quick-action-btn.secondary {
  background: var(--bg-tertiary)
  color: var(--text-primary)
}

.quick-action-btn.full {
  grid-column: span 2
  background: linear-gradient(135deg, var(--purple), var(--pink))
}
```

### Navigation Items
```css
.nav-list {
  list-style: none
}

.nav-item {
  display: flex
  align-items: center
  gap: var(--spacing-md)              // 12px
  padding: var(--spacing-sm) var(--spacing-md)  // 8px 12px
  border-radius: var(--radius-md)    // 10px
  cursor: pointer
  transition: background 0.2s ease
  color: var(--text-primary)
  text-decoration: none
}

.nav-item:hover {
  background: var(--separator)
}

.nav-item.active {
  background: var(--blue-light)
  color: var(--blue)
}

.nav-icon {
  width: 20px
  text-align: center
  font-size: 16px
}

.nav-badge {
  margin-left: auto
  background: var(--red)
  color: white
  font-size: 11px
  font-weight: 600
  padding: 2px 6px
  border-radius: 10px
  min-width: 18px
  text-align: center
}
```

### Activity Rings
```css
.activity-rings-container {
  display: flex
  flex-direction: column
  align-items: center
  padding: var(--spacing-lg)          // 16px
  background: var(--bg-secondary)
  border-radius: var(--radius-lg)    // 14px
  margin: 0 var(--spacing-lg)         // 0 16px
}

.rings-wrapper {
  position: relative
  width: 100px
  height: 100px
  margin-bottom: var(--spacing-md)   // 12px
}

.ring {
  position: absolute
  top: 50%
  left: 50%
  transform: translate(-50%, -50%)
  fill: none
  stroke-linecap: round
}

.ring-outer { width: 100px; height: 100px; }
.ring-middle { width: 76px; height: 76px; }
.ring-inner { width: 52px; height: 52px; }

.ring-bg {
  stroke: var(--bg-tertiary)
}

.ring-progress {
  transition: stroke-dashoffset 1s ease
}

.ring-labels {
  display: flex
  flex-direction: column
  gap: var(--spacing-xs)              // 4px
  width: 100%
}

.ring-label {
  display: flex
  align-items: center
  gap: var(--spacing-sm)              // 8px
  font-size: 12px
}

.ring-dot {
  width: 8px
  height: 8px
  border-radius: 50%
}

.ring-dot.red { background: var(--red); }
.ring-dot.green { background: var(--green); }
.ring-dot.blue { background: var(--blue); }

.ring-value {
  margin-left: auto
  font-weight: 600
}
```

### Streak Banner
```css
.streak-banner {
  display: flex
  align-items: center
  gap: var(--spacing-sm)              // 8px
  padding: var(--spacing-md)          // 12px
  margin: var(--spacing-md) var(--spacing-lg)  // 12px 16px
  background: linear-gradient(135deg, var(--orange-light), var(--red-light))
  border-radius: var(--radius-md)    // 10px
  font-size: 13px
  font-weight: 500
}

.streak-icon {
  font-size: 18px
}
```

### Projects List
```css
.project-item {
  display: flex
  align-items: center
  gap: var(--spacing-md)              // 12px
  padding: var(--spacing-sm) var(--spacing-md)  // 8px 12px
  border-radius: var(--radius-md)    // 10px
  cursor: pointer
  transition: background 0.2s ease
}

.project-item:hover {
  background: var(--separator)
}

.project-dot {
  width: 10px
  height: 10px
  border-radius: 50%
}

.project-progress {
  margin-left: auto
  font-size: 12px
  color: var(--text-tertiary)
}
```

## Summary of Key Sidebar Properties

| Property | Value |
|----------|-------|
| Width | 260px |
| Position | Fixed, left: 0, top: 0 |
| Height | 100vh |
| Z-index | 100 |
| Border Right | 1px solid (separator color) |
| Background (Light) | rgba(255, 255, 255, 0.72) |
| Background (Dark) | #1A1A1A (solid) |
| Backdrop Filter | blur(20px) saturate(180%) |
| Overflow | y-auto |
| Transition | transform 0.3s ease |

