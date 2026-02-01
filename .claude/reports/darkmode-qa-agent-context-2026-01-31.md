# Dark Mode QA Testing - Agent Context & Instructions

## Critical Information for Testing Agent

### Design System Specs (From design-system.md)
**Dark Mode Color Variables (VERIFIED):**
- `--v2-bg-base`: #121212 (app background)
- `--v2-bg-primary`: #121212 (main content)
- `--v2-bg-secondary`: #1A1A1A (panels, sidebars)
- `--v2-bg-surface`: #1E1E1E (cards, widgets)
- `--v2-bg-tertiary`: #242424 (subtle backgrounds)
- `--v2-text-primary`: #E5E5E5 (main text, 12.6:1 contrast)
- `--v2-text-secondary`: #A0A0A0 (secondary text, 6.3:1 contrast)
- `--v2-text-tertiary`: #B0B0B0 (muted text, 7:1 contrast)
- `--v2-separator`: #2A2A2A (dividers)
- `--v2-border-default`: #383838 (borders)

**Accent Colors:**
- `--v2-blue`: #007AFF (actions, links)
- `--v2-green`: #34C759 (success, completion)
- `--v2-orange`: #FF9500 (warnings, deadlines)
- `--v2-red`: #FF3B30 (TRUE ERRORS ONLY - never overdue/urgency)

**Theme Selector:**
- Primary: `.dark` class
- Legacy: `[data-theme="dark"]` converted from prototype

### WCAG AA Contrast Requirements
- Normal text: minimum 4.5:1 ✓
- Large text (18px+): minimum 3:1 ✓
- Graphical elements: minimum 3:1 ✓

### Recent Dark Mode Issues (from Session Log)
**Previous Failures:**
- Agents repeatedly said "PASS" while user showed screenshots of unreadable text
- Root cause: agents lacked context (no screenshots, no failure history)
- Fix approach: nuclear CSS with explicit text colors on ALL elements
- Key lesson: Barely readable = FAIL, only "clearly visible at a glance" = PASS

### Test Account
- Email: claude-test-admin@mybrain.test
- Password: ClaudeTest123
- Works in both dev (localhost:5173) and prod (my-brain-gules.vercel.app)

### Browser Automation Setup
- Tool: agent-browser CLI
- Session flag: --session darkmode-qa
- Screenshots location: .claude/design/screenshots/qa/darkmode/
- Screenshot naming: [YYYY-MM-DD]-[page]-[component].png

---

## All Pages to Test

### Priority 1 (Core Pages)
1. **Dashboard** - Hero section, widgets, activity log
2. **Tasks** - Task list, priority colors, due dates
3. **Notes** - Note list, content preview
4. **Projects** - Project cards, progress bars
5. **Calendar** - Calendar grid, events, time slots

### Priority 2 (Secondary Pages)
6. **Settings** - Form inputs, toggles, dropdowns
7. **Profile** - User info, editable fields
8. **Inbox** - Messages, notification items
9. **Today** - Focused task view, large typography
10. **All Modals/Tooltips** - Dialog backgrounds, hover tooltips

---

## Verification Checklist per Page

### Text Contrast (Always First)
- [ ] Primary text readable at a glance (should be #E5E5E5)
- [ ] Secondary text readable (should be #A0A0A0)
- [ ] Muted/tertiary text readable (should be #B0B0B0)
- [ ] Links distinguishable from regular text
- [ ] Error messages clearly visible
- [ ] Success messages clearly visible
- [ ] Placeholder text visible in inputs

### Background Colors
- [ ] Page background correct (#121212)
- [ ] Card backgrounds correct (#1A1A1A or #1E1E1E)
- [ ] Sidebar background correct (#1A1A1A)
- [ ] Modal/panel backgrounds correct
- [ ] Dropdown backgrounds correct
- [ ] Input field backgrounds correct (should contrast with text)
- [ ] No pure black or pure white

### Borders & Dividers
- [ ] Borders visible but subtle (#2A2A2A or #383838)
- [ ] Section dividers visible
- [ ] Focus rings visible (blue outline)
- [ ] Selection highlights visible
- [ ] Underlines/separators not invisible

### Interactive Elements
- [ ] **Buttons:** All variants visible (primary blue, secondary muted, danger red)
- [ ] **Checkboxes:** Unchecked and checked states both clear
- [ ] **Radio buttons:** Visible in both states
- [ ] **Toggles:** On/off states clearly different
- [ ] **Dropdowns:** Text readable in closed and open states
- [ ] **Input fields:** Empty, filled, focused, error states all readable
- [ ] **Links:** Default, hover, visited states distinguishable

### Icons & Images
- [ ] Icons have correct color (not disappearing in dark background)
- [ ] Avatars display correctly
- [ ] Loading spinners visible
- [ ] Status icons (checkmarks, X's) visible

### Special Components
- [ ] Activity log readable (terminal-style text)
- [ ] Charts/graphs readable
- [ ] Calendar events visible against calendar background
- [ ] Task priority colors (red/orange/yellow) distinguishable
- [ ] Progress bars visible
- [ ] Metric values readable

---

## Critical Quality Standards

**From memory.md - Agent Context Requirements:**
- User standard: "better than 100% quality"
- Barely readable = FAIL
- Only "clearly visible at a glance" = PASS
- Provide screenshot evidence for every claim
- Use computed color values via browser inspector when possible

**Severity Levels:**
- CRITICAL: Text unreadable (contrast < 3:1) - MUST FIX
- SERIOUS: Hard to read (contrast < 4.5:1) - Should fix
- MINOR: Slightly off but usable - Document but not blocking

---

## Testing Procedure

### Per Page (10 pages total)
1. Take screenshot of full page
2. Verify text contrast on all text elements
3. Check background colors match design system
4. Verify interactive elements work and are visible
5. Document any issues in findings table
6. Screenshot problematic areas with zoomed detail if needed

### Browser Inspector Verification (for questionable elements)
1. Right-click on element → Inspect
2. Check computed background-color and color properties
3. Calculate contrast ratio manually if needed
4. Check CSS classes to verify design system variables are being used

### Issue Documentation Template
```
| Component | Page | Issue | Severity | Current Colors | Expected Colors |
|-----------|------|-------|----------|----------------|-----------------|
| [Name] | [Page] | [Description] | CRITICAL/SERIOUS/MINOR | #XXX on #XXX | #XXX on #XXX |
```

---

## Output Deliverables

1. **Main Report:** `.claude/reports/qa-darkmode-2026-01-31.md`
   - Summary of all findings
   - Issues table with all problems found
   - By page breakdown
   - By severity breakdown

2. **Screenshots:** `.claude/design/screenshots/qa/darkmode/`
   - One screenshot per page showing full page
   - Additional detail screenshots for issues
   - Naming: `2026-01-31-[page]-[component].png`

3. **Evidence Format:**
   - Every issue must have screenshot proof
   - Include computed color values where applicable
   - Document contrast ratios for failing elements

---

## Known Good State (from design-system.md)
- Dark mode is designed, not inverted
- Primary text #E5E5E5 on #1A1A1A = 12.6:1 contrast (EXCELLENT)
- Secondary text #A0A0A0 on #1A1A1A = 6.3:1 contrast (GOOD)
- Tertiary text #B0B0B0 on #1A1A1A = 7:1 contrast (GOOD)
- All text should use CSS variables, not hardcoded colors
- Focus rings should be blue (#007AFF)
- Red (#FF3B30) should ONLY appear for true errors, never for overdue/urgency

---

## Previous Testing Session Issues (for context)
- Previous agent responses lacked evidence
- "PASS" claimed without verification
- User showed screenshots of obvious failures
- Solution: Full context provided, evidence required for all claims
- This session: Every issue must have screenshot proof

**You are responsible for thorough, evidence-based testing. When in doubt, screenshot and verify with browser inspector.**
