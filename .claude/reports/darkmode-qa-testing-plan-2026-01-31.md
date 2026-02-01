# Dark Mode QA Testing Plan - 2026-01-31

## Test Scope
- URL: http://localhost:5173 (dev) or https://my-brain-gules.vercel.app (prod)
- Test Account: claude-test-admin@mybrain.test / ClaudeTest123
- Browser Session: --session darkmode-qa

## Phase 1: Setup & Navigation (5 pages)
1. Dashboard
2. Tasks
3. Notes  
4. Projects
5. Calendar

## Phase 2: Additional Pages (5 pages)
1. Settings
2. Profile
3. Inbox
4. Today
5. All modals/dropdowns/tooltips

## Test Categories per Page

### Text Contrast (WCAG AA: 4.5:1 minimum)
- Primary text (#E5E5E5 on #1A1A1A = 12.6:1) ✓
- Secondary text (#A0A0A0 on #1A1A1A = 6.3:1)
- Tertiary/muted text (#B0B0B0 on #1A1A1A = 7:1)
- Links vs regular text
- Error messages
- Success messages
- Placeholder text

### Background Colors
- Page background (should be #121212)
- Card/panel backgrounds (should be #1A1A1A or #1E1E1E)
- Sidebar background (should be #1A1A1A)
- Modal backgrounds
- Dropdown backgrounds
- Input field backgrounds

### Borders & Dividers
- Borders visible but subtle (#2A2A2A or #383838)
- Dividers visible
- Focus rings visible (should be blue)
- Selection highlights visible

### Interactive Elements
- Buttons: primary, secondary, danger variants
- Checkboxes: unchecked and checked
- Radio buttons
- Toggle switches
- Dropdown selects
- Input fields: empty, filled, focused, error
- Links: default, hover, visited

### Icons & Images
- Icon colors correct
- Images have proper contrast/background
- Avatars display correctly
- Loading spinners visible

### Special Components
- Activity log (dark themed)
- Charts/graphs readable
- Calendar events visible
- Task priority colors distinguishable
- Progress bars visible

## Quality Gates
- CRITICAL: Text unreadable (contrast < 3:1)
- SERIOUS: Hard to read (contrast < 4.5:1)
- MINOR: Slightly off but usable

## Output
- Report: .claude/reports/qa-darkmode-2026-01-31.md
- Screenshots: .claude/design/screenshots/qa/darkmode/[page]/[component].png
