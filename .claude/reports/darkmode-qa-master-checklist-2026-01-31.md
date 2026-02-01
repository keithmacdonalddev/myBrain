# Dark Mode QA Testing - Master Checklist
**Date:** 2026-01-31
**Session:** darkmode-qa
**Account:** claude-test-admin@mybrain.test / ClaudeTest123

---

## Setup Verification (Before Testing)

- [ ] Dark mode enabled in app settings/theme toggle
- [ ] Browser dev tools open (F12) for color inspection
- [ ] Session: `--session darkmode-qa` active
- [ ] Can access browser inspector to verify CSS colors
- [ ] Screenshot directory ready: `.claude/design/screenshots/qa/darkmode/`

---

## Page 1: Dashboard

### Full Page
- [ ] Screenshot: `2026-01-31-dashboard-fullpage.png`
- [ ] Page background color correct (#121212)

### Text Contrast (WCAG AA 4.5:1 minimum)
- [ ] Hero metrics readable (should be #E5E5E5 - very large)
- [ ] Widget titles readable (24px, should be #E5E5E5)
- [ ] Body text readable (15-16px, should be #E5E5E5)
- [ ] Secondary text readable (should be #A0A0A0)
- [ ] Muted/tertiary text readable (should be #B0B0B0)
- [ ] Placeholder text in inputs visible

### Background Colors
- [ ] Page background: #121212 ✓
- [ ] Card backgrounds: #1A1A1A or #1E1E1E ✓
- [ ] Sidebar background: #1A1A1A ✓
- [ ] No pure black (#000000) or pure white (#FFFFFF)

### Borders & Dividers
- [ ] Section dividers visible but subtle
- [ ] Card borders visible (#383838)
- [ ] Focus rings visible (blue) when tabbing through elements

### Interactive Elements
- [ ] Primary buttons visible and readable (blue)
- [ ] Secondary buttons visible (muted background)
- [ ] Hover states visible
- [ ] Links visible and distinguishable from text

### Components (Dashboard Specific)
- [ ] Activity log readable (terminal-style text)
- [ ] Metric cards readable (number + label)
- [ ] Task widgets readable
- [ ] Event/calendar widgets readable
- [ ] Progress rings/bars visible

### Issues Found
- [ ] Screenshot: `2026-01-31-dashboard-issues.png` (if any)
- [ ] Document in master issues table

---

## Page 2: Tasks

### Full Page
- [ ] Screenshot: `2026-01-31-tasks-fullpage.png`

### Text Contrast
- [ ] Task titles readable
- [ ] Due dates readable
- [ ] Priority labels readable
- [ ] Task metadata readable

### Background Colors
- [ ] Page background correct
- [ ] Task item backgrounds correct
- [ ] Hover state backgrounds correct

### Interactive Elements
- [ ] Checkboxes visible (unchecked and checked)
- [ ] Task priority indicators visible
- [ ] Due date colors (red/orange/green) distinguishable
- [ ] Action buttons (edit, delete, defer) visible on hover

### Task-Specific
- [ ] Completed tasks have clear visual distinction
- [ ] Overdue tasks visible (should NOT use red per design rules - use orange)
- [ ] Due today tasks visible
- [ ] Future tasks visible
- [ ] Filter/sort controls readable

### Issues Found
- [ ] Screenshot: `2026-01-31-tasks-issues.png` (if any)
- [ ] Document in master issues table

---

## Page 3: Notes

### Full Page
- [ ] Screenshot: `2026-01-31-notes-fullpage.png`

### Text Contrast
- [ ] Note titles readable
- [ ] Note preview text readable
- [ ] Note metadata (date, tags) readable

### Background Colors
- [ ] Note list items have correct background
- [ ] No items hard to read

### Interactive Elements
- [ ] Notes clickable and hover state visible
- [ ] Edit/delete actions visible
- [ ] Note status indicators visible
- [ ] Tags/labels readable

### Issues Found
- [ ] Screenshot: `2026-01-31-notes-issues.png` (if any)
- [ ] Document in master issues table

---

## Page 4: Projects

### Full Page
- [ ] Screenshot: `2026-01-31-projects-fullpage.png`

### Text Contrast
- [ ] Project names readable
- [ ] Project descriptions readable
- [ ] Progress percentages readable
- [ ] Member info readable

### Background Colors
- [ ] Project card backgrounds correct
- [ ] Progress bar backgrounds visible

### Interactive Elements
- [ ] Project cards clickable
- [ ] Hover states visible
- [ ] Action buttons visible
- [ ] Status indicators visible

### Project-Specific
- [ ] Progress bars visible and readable
- [ ] Status colors distinguishable
- [ ] Member avatars visible

### Issues Found
- [ ] Screenshot: `2026-01-31-projects-issues.png` (if any)
- [ ] Document in master issues table

---

## Page 5: Calendar

### Full Page
- [ ] Screenshot: `2026-01-31-calendar-fullpage.png`

### Text Contrast
- [ ] Calendar dates readable
- [ ] Event titles readable
- [ ] Time slots readable
- [ ] Day names readable

### Background Colors
- [ ] Calendar grid visible
- [ ] Current day highlighted but readable
- [ ] Event backgrounds visible

### Interactive Elements
- [ ] Calendar navigation controls visible
- [ ] Events clickable
- [ ] Hover states on dates visible
- [ ] Time slot colors distinguishable

### Calendar-Specific
- [ ] Multiple events on same day readable
- [ ] All-day events visible
- [ ] Conflict indicators visible (if applicable)
- [ ] Week/month view toggles visible

### Issues Found
- [ ] Screenshot: `2026-01-31-calendar-issues.png` (if any)
- [ ] Document in master issues table

---

## Page 6: Settings

### Full Page
- [ ] Screenshot: `2026-01-31-settings-fullpage.png`

### Text Contrast
- [ ] Settings labels readable
- [ ] Setting descriptions readable
- [ ] Help text readable

### Background Colors
- [ ] Input field backgrounds correct
- [ ] Setting group backgrounds correct
- [ ] Disabled setting backgrounds visible

### Interactive Elements
- [ ] Input fields visible and readable
- [ ] Toggles visible (on/off states clear)
- [ ] Dropdown selects visible and readable
- [ ] Buttons visible
- [ ] Form validation errors readable

### Settings-Specific
- [ ] Theme toggle visible and works
- [ ] Save/cancel buttons visible
- [ ] Required field indicators visible
- [ ] Success/error messages readable

### Issues Found
- [ ] Screenshot: `2026-01-31-settings-issues.png` (if any)
- [ ] Document in master issues table

---

## Page 7: Profile

### Full Page
- [ ] Screenshot: `2026-01-31-profile-fullpage.png`

### Text Contrast
- [ ] Profile name readable
- [ ] Profile info readable
- [ ] Section headers readable

### Background Colors
- [ ] Profile card backgrounds correct
- [ ] Input backgrounds correct

### Interactive Elements
- [ ] Edit fields visible
- [ ] Buttons visible
- [ ] Avatar visible

### Profile-Specific
- [ ] User info editable and visible
- [ ] Status indicator visible
- [ ] Profile image/avatar displays correctly

### Issues Found
- [ ] Screenshot: `2026-01-31-profile-issues.png` (if any)
- [ ] Document in master issues table

---

## Page 8: Inbox

### Full Page
- [ ] Screenshot: `2026-01-31-inbox-fullpage.png`

### Text Contrast
- [ ] Message titles readable
- [ ] Message preview readable
- [ ] Message timestamps readable

### Background Colors
- [ ] Message item backgrounds correct
- [ ] Unread message backgrounds visible

### Interactive Elements
- [ ] Messages clickable
- [ ] Read/unread toggles visible
- [ ] Action buttons visible
- [ ] Delete/archive buttons visible

### Inbox-Specific
- [ ] Unread count visible
- [ ] New messages highlighted
- [ ] Message status visible

### Issues Found
- [ ] Screenshot: `2026-01-31-inbox-issues.png` (if any)
- [ ] Document in master issues table

---

## Page 9: Today

### Full Page
- [ ] Screenshot: `2026-01-31-today-fullpage.png`

### Text Contrast
- [ ] Focus task title readable (large)
- [ ] Task list readable
- [ ] Time information readable
- [ ] Progress info readable

### Background Colors
- [ ] Page background correct
- [ ] Task backgrounds correct
- [ ] Focus area background correct

### Interactive Elements
- [ ] Tasks completable
- [ ] Time adjustment controls visible
- [ ] Navigation visible

### Today-Specific
- [ ] Today's focus section prominent
- [ ] Tasks for today readable
- [ ] Time/schedule information readable

### Issues Found
- [ ] Screenshot: `2026-01-31-today-issues.png` (if any)
- [ ] Document in master issues table

---

## Page 10: Modals, Dropdowns, Tooltips

### Modals
- [ ] Screenshot modal: `2026-01-31-modal-example.png`
- [ ] Modal background color correct
- [ ] Modal text readable
- [ ] Modal buttons visible
- [ ] Close button visible
- [ ] Backdrop visible (dark with blur)

### Dropdowns
- [ ] Screenshot dropdown: `2026-01-31-dropdown-example.png`
- [ ] Dropdown background correct
- [ ] Dropdown text readable
- [ ] Selected item visible
- [ ] Hover states visible
- [ ] Scrollable lists readable

### Tooltips
- [ ] Screenshot tooltip: `2026-01-31-tooltip-example.png`
- [ ] Tooltip background visible
- [ ] Tooltip text readable
- [ ] Tooltip positioning correct
- [ ] Arrow/pointer visible

### All Dialog Elements
- [ ] Form inputs in modals readable
- [ ] Validation errors in modals readable
- [ ] Buttons in modals visible

### Issues Found
- [ ] Screenshot: `2026-01-31-modals-issues.png` (if any)
- [ ] Document in master issues table

---

## Cross-Page Testing

### Navigation
- [ ] All page links/navigation visible and clickable
- [ ] Current page highlighted
- [ ] Navigation text readable

### Global Elements
- [ ] Top navigation bar colors correct
- [ ] Sidebar (if exists) colors correct
- [ ] Global buttons visible

### Consistency
- [ ] Text colors consistent across pages
- [ ] Button styles consistent
- [ ] Background colors consistent
- [ ] Border styles consistent

---

## Master Issues Table

**Template for every issue found:**

| Page | Component | Issue | Severity | Current Colors | Expected Colors | Screenshot |
|------|-----------|-------|----------|----------------|-----------------|------------|
| [Page] | [Component Name] | [Description of problem] | CRITICAL/SERIOUS/MINOR | [actual #color on #bg] | [expected #color on #bg] | [filename] |

### CRITICAL Issues (Text Unreadable - Contrast < 3:1)
*(Highest priority - blocks testing)*

| Page | Component | Issue | Severity | Current Colors | Expected Colors | Screenshot |
|------|-----------|-------|----------|----------------|-----------------|------------|

### SERIOUS Issues (Hard to Read - Contrast < 4.5:1)
*(High priority - should fix)*

| Page | Component | Issue | Severity | Current Colors | Expected Colors | Screenshot |
|------|-----------|-------|----------|----------------|-----------------|------------|

### MINOR Issues (Usable but Off - Works but looks wrong)
*(Low priority - fix if time)*

| Page | Component | Issue | Severity | Current Colors | Expected Colors | Screenshot |
|------|-----------|-------|----------|----------------|-----------------|------------|

---

## Quality Assurance Standards

**From memory.md - Critical Requirements:**
- Quality standard: "better than 100%" = "clearly visible at a glance"
- Barely readable = FAIL (must fix)
- Clearly visible = PASS
- Every claim requires screenshot proof
- Use browser inspector to verify computed colors

**Severity Definitions:**
- **CRITICAL:** Text unreadable (contrast < 3:1), blocks usability
- **SERIOUS:** Text hard to read (contrast < 4.5:1), impacts accessibility
- **MINOR:** Slightly off colors but usable, affects polish

---

## Final Summary

**Total Pages Tested:** _____ / 10
**Total Screenshots:** _____
**Total Issues Found:** _____
- Critical: _____
- Serious: _____
- Minor: _____

**All Issues Documented:** Yes / No
**All Screenshots Captured:** Yes / No
**Master Report Generated:** Yes / No

---

## Deliverables Checklist

- [ ] Main report: `.claude/reports/qa-darkmode-2026-01-31.md`
- [ ] All screenshots in: `.claude/design/screenshots/qa/darkmode/`
- [ ] Issues table completed
- [ ] By-page breakdown completed
- [ ] By-severity breakdown completed
- [ ] Design system reference included
- [ ] Test account and session documented
- [ ] Evidence captured for all issues

**Report Status:** _______________
**Date Completed:** _______________
**Verified By:** _______________

---

## Notes

Use this as a master checklist. Document every finding, screenshot every issue, verify all claims with browser inspector. No "PASS" without evidence.
