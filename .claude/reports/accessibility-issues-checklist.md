# Accessibility Issues - Detailed Checklist

## WCAG A Violations (12 Critical Issues)

### 1. Missing `<main>` Landmark (1.3.1)
- **Severity:** CRITICAL
- **Affected Pages:** All pages in app
- **Current State:** No `<main>` element or `role="main"` found
- **Impact:** Screen reader users can't jump to main content
- **Fix:**
  ```jsx
  // In AppShell or main layout wrapper
  <main className="flex-1">
    {/* Page content */}
  </main>
  ```
- **Time Estimate:** 30 minutes
- **File(s) to Update:**
  - `myBrain-web/src/app/AppShell.jsx` or similar main layout
  - All feature page layouts

---

### 2. Missing Image Alt Text (1.1.1)
- **Severity:** CRITICAL
- **Affected Components:**
  - `DefaultAvatar.jsx` - Avatar fallbacks
  - `UserAvatar.jsx` - User profile pictures
  - `ImageGallery.jsx` - Gallery images
  - `RadarView.jsx` - Radar chart visualization
  - `ActivityRings.jsx` - Activity visualization
- **Current State:** Images rendered without `alt` attribute
- **Example Issue:**
  ```jsx
  // BEFORE (inaccessible)
  <img src={avatarUrl} />

  // AFTER (accessible)
  <img src={avatarUrl} alt={`${userName}'s profile picture`} />
  ```
- **Time Estimate:** 2 hours
- **Impact:** Blind/low vision users can't identify images

---

### 3. Missing Autocomplete Attributes (1.3.5)
- **Severity:** CRITICAL
- **Affected Components:**
  - `LoginPage.jsx` - Email field (line 109), Password field (line 136)
  - `SignupPage.jsx` - Similar fields
- **Current State:**
  ```jsx
  <input type="email" />  // Missing autocomplete
  <input type="password" />  // Missing autocomplete
  ```
- **Fix:**
  ```jsx
  <input type="email" autocomplete="email" />
  <input type="password" autocomplete="current-password" />
  ```
- **Time Estimate:** 15 minutes
- **Impact:** Users can't access password managers, worse UX

---

### 4. No Skip Link (2.4.1)
- **Severity:** CRITICAL
- **Affected Pages:** All pages
- **Current State:** No skip-to-main-content link
- **Fix:** Add at top of AppShell
  ```jsx
  <a href="#main-content" className="sr-only focus:not-sr-only">
    Skip to main content
  </a>
  ```
- **Time Estimate:** 30 minutes
- **Impact:** Keyboard users must tab through entire navigation

---

### 5. Broken Heading Hierarchy (1.3.1)
- **Severity:** CRITICAL
- **Affected Pages:** Dashboard pages
- **Example Issues:**
  - DashboardPageV2.jsx: h1 → h3 (skips h2)
  - FocusHeroV2.jsx: h2 → h3
- **Impact:** Screen reader users can't navigate by headings
- **Fix:** Ensure h1 → h2 → h3 progression without skipping
- **Time Estimate:** 1-2 hours

---

### 6. Missing Semantic List Structure (1.3.1)
- **Severity:** CRITICAL
- **Affected Component:** Sidebar V2 navigation (line 620+)
- **Current State:**
  ```jsx
  // Using divs for layout instead of <ul>/<li>
  <div className="flex flex-col gap-0.5">
    <li><NavItem /></li>  // Inconsistent
  </div>
  ```
- **Fix:** Use proper semantic structure:
  ```jsx
  <nav>
    <ul className="flex flex-col gap-0.5">
      <li><NavItem /></li>
    </ul>
  </nav>
  ```
- **Time Estimate:** 1 hour
- **Files:** `myBrain-web/src/components/layout/Sidebar.jsx`

---

### 7. Dropdown Arrow Key Navigation Missing (2.1.1)
- **Severity:** CRITICAL
- **Affected Component:** `Dropdown.jsx`
- **Current State:** Only Escape key works, Tab cycles through options
- **Issue:** WCAG requires arrow keys for menu navigation
- **Fix:** Add arrow key handlers:
  ```jsx
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusNextOption();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusPreviousOption();
    }
    // Also handle Home, End, Enter
  };
  ```
- **Time Estimate:** 2 hours
- **Impact:** Keyboard users can't efficiently navigate dropdowns

---

### 8. Sidebar Collapse Button Hidden from Keyboard (2.4.3)
- **Severity:** CRITICAL
- **Affected Component:** `Sidebar.jsx` line 608
- **Current State:** Button only appears on hover
- **Issue:** Keyboard users can't find/activate button
- **Fix:** Make button always keyboard accessible:
  ```jsx
  className="absolute -right-3 ... opacity-0 group-hover:opacity-100
    focus-within:opacity-100 ..."  // Add focus visibility
  ```
- **Time Estimate:** 30 minutes
- **Impact:** Desktop users can't collapse sidebar

---

### 9. Missing Form Status Announcements (4.1.3)
- **Severity:** CRITICAL
- **Affected Component:** All forms with validation
- **Example:** LoginPage.jsx error messages
- **Current State:** Errors appear but not announced to screen readers
- **Fix:** Use `role="alert"` and `aria-live="polite"`:
  ```jsx
  {error && (
    <div role="alert" aria-live="polite" aria-atomic="true">
      {error}
    </div>
  )}
  ```
- **Time Estimate:** 1 hour
- **Impact:** Screen reader users miss validation feedback

---

### 10. No Page Headings (1.3.1)
- **Severity:** CRITICAL
- **Affected Pages:** Most feature pages
- **Current State:** No visible h1 on page load
- **Fix:** Add page title as h1:
  ```jsx
  <h1 className="sr-only">Tasks Page</h1>
  // or visible:
  <h1>Tasks</h1>
  ```
- **Time Estimate:** 1 hour
- **Impact:** Screen readers can't identify page

---

### 11. Decorative Icons Not Hidden (1.1.1)
- **Severity:** CRITICAL (when used as content)
- **Affected Component:** Many components with icon buttons
- **Issue:** Decorative icons should be `aria-hidden="true"`
- **Example Needs Checking:**
  - Chevron icons in dropdowns/sections
  - X icons in buttons (should have aria-label)
- **Time Estimate:** 1-2 hours
- **Fix:** Add `aria-hidden="true"` to decorative SVGs:
  ```jsx
  <ChevronDown className="..." aria-hidden="true" />
  ```

---

### 12. No Main Navigation Labeling (1.3.1)
- **Severity:** CRITICAL
- **Affected Component:** Sidebar navigation sections
- **Issue:** Multiple nav sections not distinguished
- **Fix:** Add aria-label to each nav section:
  ```jsx
  <nav aria-label="Main navigation" />
  <nav aria-label="Categories" />
  <nav aria-label="Admin" />
  ```
- **Time Estimate:** 30 minutes

---

## WCAG AA Violations (18 Issues)

### 1. Links Without Visual Distinction (1.4.1)
- **Severity:** SERIOUS
- **Affected Components:** Links throughout (use primary color)
- **Current State:** Links use color alone, no underline
- **Fix:** Add text-decoration or icon:
  ```css
  a {
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 4px;
  }
  ```
- **Time Estimate:** 30 minutes

---

### 2. Color-Only Error Indication (1.4.1)
- **Severity:** SERIOUS
- **Affected Component:** Form validation, status indicators
- **Current State:** Red = error, Green = success (color only)
- **Fix:** Add icons or text labels:
  ```jsx
  {error && (
    <div className="flex gap-2">
      <AlertCircle className="text-red-500" aria-hidden="true" />
      <span>{error}</span>
    </div>
  )}
  ```
- **Time Estimate:** 1-2 hours

---

### 3. Muted Text Contrast (1.4.3)
- **Severity:** SERIOUS
- **Affected Component:** `.text-muted` class throughout
- **Current State:** May not meet 4.5:1 contrast ratio
- **Fix:** Verify contrast and adjust:
  ```css
  .dark .text-muted {
    color: #a1a1a1;  /* Adjust to meet 4.5:1 with background */
  }
  ```
- **Time Estimate:** 1 hour
- **Impact:** Low vision users can't read secondary text

---

### 4. Placeholder Text Contrast (1.4.3)
- **Severity:** SERIOUS
- **Affected Component:** All input fields
- **Fix:** Ensure placeholder meets 3:1 minimum contrast
- **Time Estimate:** 30 minutes

---

### 5. Modal Animation Ignores Motion Preferences (2.3.3)
- **Severity:** SERIOUS
- **Affected Component:** `BaseModal.jsx` and all modals
- **Current State:** No `prefers-reduced-motion` support
- **Fix:**
  ```css
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```
- **Time Estimate:** 1 hour
- **Impact:** Users with vestibular disorders get motion sickness

---

### 6. Transitions Ignore Motion Preferences (2.3.3)
- **Severity:** SERIOUS
- **Affected Components:** Sidebar collapse, dropdown open/close, all animated elements
- **Fix:** Apply same `prefers-reduced-motion` rule
- **Time Estimate:** 1 hour

---

### 7. Dropdown Missing Listbox Role (1.3.1)
- **Severity:** SERIOUS
- **Affected Component:** `Dropdown.jsx` line 101-131
- **Current State:** Menu wrapper missing `role="listbox"`
- **Fix:**
  ```jsx
  <div
    role="listbox"
    className="..."
  >
    {/* Options with role="option" */}
  </div>
  ```
- **Time Estimate:** 30 minutes

---

### 8. Search Input Missing Label (1.3.1)
- **Severity:** SERIOUS
- **Affected Component:** `Topbar.jsx` line 84
- **Current State:** Only placeholder, no `<label>`
- **Fix:**
  ```jsx
  <label htmlFor="search" className="sr-only">
    Search
  </label>
  <input id="search" type="search" placeholder="Search..." />
  ```
- **Time Estimate:** 15 minutes

---

### 9. Breadcrumb Missing Current Page Indicator (1.3.1)
- **Severity:** SERIOUS
- **Affected Component:** `Breadcrumbs.jsx`
- **Current State:** Last item doesn't indicate it's current page
- **Fix:**
  ```jsx
  <li aria-current="page">{currentPage}</li>
  ```
- **Time Estimate:** 15 minutes

---

### 10. Save Status Not Announced (4.1.3)
- **Severity:** SERIOUS
- **Affected Component:** `NoteEditor.jsx` SaveStatusIndicator
- **Current State:** Status changes but not announced
- **Fix:** Add live region:
  ```jsx
  <div aria-live="polite" aria-atomic="true">
    {status === 'saved' && `Last saved ${timeAgo}`}
  </div>
  ```
- **Time Estimate:** 30 minutes

---

### 11. Toast Notifications Not Announced (4.1.3)
- **Severity:** SERIOUS
- **Affected Component:** `ToastContainer.jsx`
- **Fix:** Add role and aria-live:
  ```jsx
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    {/* Toast content */}
  </div>
  ```
- **Time Estimate:** 1 hour

---

### 12. Focus Indicators Insufficient (2.4.7)
- **Severity:** SERIOUS
- **Affected Components:** Some components on certain backgrounds
- **Current State:** `focus:ring-2` may not be visible on all backgrounds
- **Fix:** Add outline fallback:
  ```css
  button:focus-visible {
    outline: 3px solid var(--primary);
    outline-offset: 2px;
  }
  ```
- **Time Estimate:** 1 hour

---

### 13-18. Other AA Issues (Forms, Tab indices, etc.)
- Form field hint text needs `aria-describedby` association
- Some components may have incorrect tab index
- Error prevention not implemented for destructive actions
- Loading states need `aria-busy` indication
- Inconsistent button roles
- Semantic footer missing

---

## Best Practice Issues (24 Issues)

### High Priority Best Practices

1. **Add aria-current to active nav items** - 30 min
2. **Add aria-label to all icon-only buttons** - 1 hour
3. **Implement focus-visible outline consistently** - 1 hour
4. **Add aria-expanded to collapsible sections** - 1 hour
5. **Add aria-busy during loading states** - 1 hour
6. **Add aria-describedby to inputs with hints** - 1 hour
7. **Implement high contrast mode detection** - 2 hours
8. **Add success/error icons with color** - 2 hours
9. **Add voice control command support** - 2 hours
10. **Implement proper form field groups** - 1 hour

### Medium Priority Best Practices

11-20. Form improvements, tooltips, breadcrumb enhancements, etc.

### Lower Priority Best Practices

21-24. Nice-to-have improvements

---

## Remediation Summary

| Category | Count | Total Time |
|----------|-------|-----------|
| WCAG A (Critical) | 12 | 10-14 hours |
| WCAG AA (Serious) | 18 | 12-18 hours |
| Best Practices | 24 | 15-20 hours |
| **TOTAL** | **54** | **37-52 hours** |

---

## Recommended Implementation Order

### Week 1 (WCAG A - Critical Compliance)
1. Add `<main>` landmark ✓
2. Add alt text to images ✓
3. Fix heading hierarchy ✓
4. Add skip link ✓
5. Add autocomplete attributes ✓
6. Fix list semantics ✓

### Week 2 (WCAG AA - Serious Issues)
1. Implement dropdown arrow keys ✓
2. Add prefers-reduced-motion support ✓
3. Add link underlines ✓
4. Add error icons ✓
5. Add form status announcements ✓
6. Fix color contrast ✓

### Week 3+ (Polish & Best Practices)
1. Implement all best practices
2. Complete testing with screen readers
3. Full keyboard navigation testing
4. Regular accessibility audits

---

## Testing Checklist

- [ ] Keyboard-only navigation (no mouse)
- [ ] Screen reader testing (NVDA/JAWS/VoiceOver)
- [ ] Color contrast verification (WCAG AA: 4.5:1)
- [ ] Focus indicator visibility
- [ ] Heading hierarchy check
- [ ] Landmark region verification
- [ ] Form label association
- [ ] Error message clarity
- [ ] Image alt text relevance
- [ ] Motion preference respect
- [ ] Zoom to 200% readability
- [ ] Small text legibility
- [ ] Touch target sizing (44x44px minimum)
- [ ] Tab order verification
- [ ] Modal focus trap
- [ ] Dynamic content announcement

---

*Last Updated: 2026-01-31*
