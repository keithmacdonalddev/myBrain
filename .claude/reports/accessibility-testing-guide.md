# Accessibility Testing Guide

## How to Test for Accessibility Issues

This guide provides practical steps to find, verify, and fix accessibility problems in myBrain.

---

## Quick Test: Keyboard-Only Navigation (5 minutes)

**Purpose:** Verify all functionality works without mouse

### Steps:
1. Open the app in a browser
2. Close/hide your mouse or use touchpad carefully
3. Use **only Tab, Shift+Tab, Enter, and Arrow keys**
4. Navigate:
   - [ ] Can you tab to every button?
   - [ ] Can you open modals with Enter?
   - [ ] Can you close modals with Escape?
   - [ ] Can you navigate dropdowns with Arrow keys?
   - [ ] Can you submit forms with Enter?
   - [ ] Can you reach and activate the sidebar collapse button?

**Issues to Log:**
- ❌ Element not reachable by Tab
- ❌ Focus disappears
- ❌ Focus trap in modal not working
- ❌ Dropdown doesn't respond to Arrow keys

---

## Test with Screen Reader (15 minutes)

### Windows - NVDA (Free, Open Source)

#### Installation:
1. Download: https://www.nvaccess.org/download/
2. Install and restart browser
3. Open browser console (F12) - no errors should appear

#### Basic Testing:
1. **Start NVDA:** Press `Insert + N` (usually)
2. **Read page:** Insert + Down arrow (reads continuously)
3. **Navigate by headings:** H key (cycles through headings)
4. **Navigate by links:** K key (cycles through links)
5. **Form fields:** F key (cycles through form fields)
6. **Stop reading:** Control key

#### What to Listen For:
```
Good: "Heading level 1: Dashboard | Heading level 2: Tasks | Heading level 3: Today"
Bad:  "Heading level 1: Dashboard | Heading level 3: Today"  ← Skipped h2!

Good: "Edit field: Email, Required"
Bad:  "Input" ← Missing label!

Good: "Button: Close modal, pressed"
Bad:  "Button" ← Missing label!

Good: "Link: Sign in, visited"
Bad:  "Sign in" ← Missing link indication!
```

#### Test Checklist:
- [ ] Page heading is announced
- [ ] Navigation landmark announced
- [ ] Form labels associated with fields
- [ ] Error messages clearly linked to inputs
- [ ] Modal announced as dialog
- [ ] Focus trap works in modal
- [ ] Dynamic changes announced

### Mac - VoiceOver

**Activation:** Cmd + F5 (in System Preferences)

**Quick Commands:**
- VO + Right Arrow: Next item
- VO + Left Arrow: Previous item
- VO + Space: Activate
- VO + U: Open rotor (headings/links)

---

## Automated Testing with Browser Tools

### Chrome DevTools Accessibility Inspector

1. **Open DevTools:** F12
2. **Go to:** Elements tab
3. **Right-click element:** "Inspect accessibility properties"
4. **Check:**
   - ✅ Name (how screen reader announces it)
   - ✅ Role (button, heading, link, etc.)
   - ✅ Description (aria-describedby content)

#### Example Good Element:
```
Name: "Close modal"
Role: button
Description: (none needed for this case)
```

#### Example Bad Element:
```
Name: <Unnamed>
Role: button
Description: (none)
↑ This is inaccessible!
```

### Chrome Lighthouse Audit

1. **Open DevTools:** F12
2. **Go to:** Lighthouse tab
3. **Category:** Accessibility
4. **Click:** Analyze page load
5. **Review:** Issues list shows violations
6. **Click:** Each issue for explanation and fix

---

## Color Contrast Testing

### Using WebAIM Contrast Checker

1. Go to: https://webaim.org/resources/contrastchecker/
2. **Foreground color:** Click color picker, sample text color
3. **Background color:** Click color picker, sample background color
4. **Check:** Passes "AAA" or at least "AA"

#### WCAG Standards:
- **Normal text:** Minimum 4.5:1 contrast (AA) or 7:1 (AAA)
- **Large text** (18pt+): Minimum 3:1 contrast (AA) or 4.5:1 (AAA)

#### What to Test:
- [ ] Body text on background
- [ ] Muted text (secondary text)
- [ ] Button text
- [ ] Placeholder text
- [ ] Links
- [ ] Labels
- [ ] Help text

---

## Manual Testing Checklist

### Heading Hierarchy ✓

**Test:**
1. Install "HeadingsMap" browser extension
2. Open any page
3. Click extension icon
4. Look at hierarchy - should go 1→2→3 without skipping

**Expected:**
```
Page Heading (h1)
  ├─ Section 1 (h2)
  │  ├─ Subsection (h3)
  │  └─ Subsection (h3)
  ├─ Section 2 (h2)
  │  └─ Subsection (h3)
```

**Unacceptable:**
```
Page Heading (h1)
  └─ Content (h3)  ← WRONG: Should be h2!
```

### Keyboard Focus Visible ✓

**Test:**
1. Tab through the page
2. Every element should show a visible focus ring
3. Focus ring should have enough contrast

**Expected:** Blue or colored ring around focused element

**Problem Signs:**
- [ ] Can't see where focus is
- [ ] Focus disappears
- [ ] Focus ring has poor contrast

### Form Labels ✓

**Test:**
1. Click on an input field
2. The associated label should highlight in DevTools
3. Check in accessibility tree that input name is set

**In DevTools:**
```javascript
// Console - test if label is connected
const input = document.querySelector('input#email');
console.log(input.labels);  // Should show associated label
```

### Skip Link ✓

**Test:**
1. Load a page
2. Press Tab once
3. Look for "Skip to main content" link
4. Press Enter
5. Focus should jump to main content

### Modal Focus Trap ✓

**Test:**
1. Open a modal
2. Tab through all elements in modal
3. When you reach the last button and press Tab again:
   - ✅ Focus returns to first element in modal
   - ❌ Focus escapes modal (broken)

### Images & Alt Text ✓

**Using DevTools:**
1. Right-click image
2. Check accessibility properties
3. Should show meaningful alt text

**Bad alt text examples:**
- `alt="image"` ← Generic, not helpful
- `alt=""` ← Missing entirely
- `alt="image123.jpg"` ← Filename, not description

**Good alt text:**
```
alt="Sarah Johnson's profile picture"
alt="Dashboard showing 5 completed tasks"
alt="Error icon indicating invalid email format"
```

---

## Automated Accessibility Testing (Setup)

### Using jest-axe for Unit Tests

```javascript
// setupTests.js
import 'jest-axe/extend-expect';

// ComponentName.test.jsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('LoginPage should not have accessibility violations', async () => {
  const { container } = render(<LoginPage />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

// Test specific component
test('Modal should have proper ARIA attributes', async () => {
  const { container } = render(
    <BaseModal isOpen={true} title="Test Modal">
      <p>Content</p>
    </BaseModal>
  );
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Using axe-core in E2E Tests

```javascript
// cypress/e2e/accessibility.cy.js
import { checkA11y } from 'axe-playwright';

describe('Accessibility', () => {
  it('HomePage should not have accessibility violations', async () => {
    await page.goto('http://localhost:5173');
    await checkA11y(page);
  });

  it('LoginPage should be accessible', async () => {
    await page.goto('http://localhost:5173/login');
    await checkA11y(page);
  });
});
```

### Command Line Testing

```bash
# Install global accessibility testing tools
npm install -g @axe-core/cli

# Scan local development server
axe http://localhost:5173 --tags wcag2aa

# Scan production
axe https://my-brain-gules.vercel.app --tags wcag2aa

# Generate JSON report
axe http://localhost:5173 --format json > a11y-report.json
```

---

## Common Issues & How to Find Them

### Issue 1: Missing Image Alt Text

**How to find:**
1. DevTools > Elements
2. Right-click image
3. "Inspect accessibility properties"
4. Check "Name" field

**Expected:** `"John Doe's profile picture"`
**Problem:** Empty or generic text

**Fix:**
```jsx
// Before
<img src={avatarUrl} />

// After
<img src={avatarUrl} alt={`${user.name}'s profile picture`} />
```

### Issue 2: Heading Hierarchy Broken

**How to find:**
1. Install HeadingsMap extension
2. Open page
3. Look for skipped levels (h1 → h3)

**Expected:**
```
h1: Page title
h2: Section
h3: Subsection
```

**Problem:**
```
h1: Page title
h3: Subsection  ← Wrong! Should be h2
```

**Fix:**
```jsx
// Before
<h1>Dashboard</h1>
<h3>Tasks</h3>  ← WRONG

// After
<h1>Dashboard</h1>
<h2>Tasks</h2>  ← CORRECT
```

### Issue 3: Button Without Label

**How to find:**
1. Screen Reader reads: "Button" (no description)
2. DevTools Accessibility Inspector shows empty "Name"

**Expected:** `<button aria-label="Close modal">...</button>`

**Problem:**
```jsx
<button>
  <X className="w-5 h-5" />  ← No aria-label!
</button>
```

**Fix:**
```jsx
<button aria-label="Close modal">
  <X className="w-5 h-5" aria-hidden="true" />
</button>
```

### Issue 4: Form Input Without Label

**How to find:**
1. Screen Reader reads: "Input" (no field name)
2. DevTools shows no associated label

**Expected:** `<input id="email" />` + `<label htmlFor="email">Email</label>`

**Problem:**
```jsx
<input placeholder="your@email.com" />  ← No label!
```

**Fix:**
```jsx
<label htmlFor="email">Email</label>
<input id="email" type="email" />
```

### Issue 5: Color-Only Indicator

**How to find:**
1. Look for status that relies only on color
2. Red text for error, green for success

**Problem:**
```jsx
{error && <p style={{ color: 'red' }}>{error}</p>}
```

**Fix:**
```jsx
{error && (
  <div className="flex gap-2">
    <AlertCircle className="w-5 h-5" aria-hidden="true" />
    <p role="alert">{error}</p>
  </div>
)}
```

---

## Testing Scenarios by Feature

### Login Form

```
Test Points:
- [ ] Email field has label and accessible name
- [ ] Password field has label and accessible name
- [ ] Error messages associated with fields (aria-describedby)
- [ ] Submit button accessible and labeled
- [ ] Form works with keyboard only (no mouse)
- [ ] Autocomplete attributes present (email, current-password)
- [ ] Focus visible on all inputs
- [ ] Contrast meets 4.5:1 ratio
```

### Navigation/Sidebar

```
Test Points:
- [ ] Navigation marked with <nav> or role="navigation"
- [ ] Navigation items in semantic list (<ul>/<li>)
- [ ] Active page indicated with aria-current="page"
- [ ] Expandable sections have aria-expanded
- [ ] Collapse button keyboard accessible
- [ ] Focus order logical (left to right, top to bottom)
- [ ] No focus traps (can escape any menu)
```

### Modal/Dialog

```
Test Points:
- [ ] Modal has role="dialog"
- [ ] Modal title in aria-labelledby
- [ ] Focus trapped inside modal
- [ ] Escape key closes modal
- [ ] Return focus to trigger button after close
- [ ] Modal backdrop doesn't receive focus
- [ ] Content is not accessible while modal open
```

### Data Table

```
Test Points:
- [ ] Table has <table>, <thead>, <tbody> elements
- [ ] Headers have <th> with proper scope
- [ ] Row/column headers identified
- [ ] Summary provided if complex
- [ ] Sortable columns indicate current sort
- [ ] Data cells associated with headers
```

---

## Reporting Accessibility Issues

### Good Issue Report Template:

```markdown
## Issue: Missing image alt text in avatar component

**Component:** UserAvatar.jsx
**WCAG Criterion:** 1.1.1 (Images - Text Alternatives)
**Severity:** WCAG A (Must fix)

**Current Behavior:**
The avatar image renders without an alt attribute, making it inaccessible to screen reader users.

**Code:**
```jsx
<img src={avatarUrl} />
```

**Expected Behavior:**
Image should have meaningful alt text:
```jsx
<img src={avatarUrl} alt={`${userName}'s profile picture`} />
```

**Test Method:**
- NVDA screen reader reads "image" with no description
- DevTools accessibility inspector shows empty Name

**Affected Users:** Blind and low vision users
```

---

## Quick Reference: Test Commands

```bash
# Install free tools
npm install --save-dev jest-axe @axe-core/cli

# Run automated a11y tests
npm test -- --testNamePattern="a11y"

# Scan local dev server
axe http://localhost:5173 --tags wcag2aa

# Open Chrome DevTools
F12

# Open accessibility inspector
F12 → Elements → Right-click → Inspect accessibility properties

# Enable NVDA screen reader
Download from: https://www.nvaccess.org/
```

---

## Success Criteria for Each Phase

### Phase 1 (WCAG A) - Test Checklist
- [ ] No critical WCAG A violations in automated scan
- [ ] NVDA announces page structure correctly
- [ ] All pages have h1 heading
- [ ] Skip link visible on Tab
- [ ] Keyboard navigation works (Tab through all elements)
- [ ] Modal focus trap works
- [ ] Form labels associated with inputs
- [ ] Error messages announced
- [ ] Images have alt text

### Phase 2 (WCAG AA) - Test Checklist
- [ ] No violations in axe DevTools scan
- [ ] Arrow keys work in dropdowns
- [ ] Links have visual distinction (underline)
- [ ] 4.5:1 color contrast verified
- [ ] Motion preferences respected
- [ ] Status changes announced
- [ ] All expected ARIA roles present
- [ ] Focus visible on all interactive elements

### Phase 3 (Best Practices) - Test Checklist
- [ ] Active nav items marked with aria-current
- [ ] All icon buttons have aria-label
- [ ] Dynamic content in live regions
- [ ] Loading states announced
- [ ] Help text associated with inputs
- [ ] Consistent focus indicators
- [ ] No decorative elements announced
- [ ] Proper semantic HTML throughout

---

## Troubleshooting Common Testing Issues

### "I can't hear what NVDA says"
- Volume is muted: Check system volume
- NVDA not talking: Alt + N to toggle speech
- Too fast: Alt + 6 (slower) / Alt + 7 (faster)

### "I see the focus ring but it's hard to see"
- Adjust contrast in DevTools
- Test on different backgrounds
- Consider outline instead of shadow

### "Axe says something is a violation but it looks fine"
- Trust the accessibility tool, not your eyes
- Vision-impaired users may disagree
- Follow WCAG guidelines, not intuition

### "The form works on my computer but screen reader tester says it's broken"
- They're testing with actual screen reader
- Your computer may have accessibility features enabled
- Disable all a11y features and test with NVDA

---

## Resources

### Tools
- **NVDA:** https://www.nvaccess.org/
- **axe DevTools:** https://www.deque.com/axe/devtools/
- **WAVE:** https://wave.webaim.org/
- **Lighthouse:** Built into Chrome DevTools
- **HeadingsMap:** Browser extension

### Learning
- **WCAG 2.1:** https://www.w3.org/WAI/WCAG21/quickref/
- **WebAIM:** https://webaim.org/
- **Inclusive Components:** https://inclusive-components.design/
- **MDN Accessibility:** https://developer.mozilla.org/en-US/docs/Web/Accessibility/

---

*Last Updated: 2026-01-31*
