# Accessibility Remediation Recommendations

## Overview

myBrain has achieved **65% WCAG AA compliance** with 12 critical WCAG A violations, 18 serious WCAG AA violations, and 24 best practice improvements available.

This document provides actionable recommendations prioritized by impact and implementation effort.

---

## Phase 1: Critical WCAG A Compliance (Est. 10-14 hours)

### Goal: Achieve minimum WCAG A compliance before next release

#### 1.1: Add Main Landmark Region
**Files:** All page layouts
**Priority:** CRITICAL
**Effort:** 30 min - 1 hour

Current issue: No main content identification
```jsx
// In your main layout component (AppShell.jsx)
<div className="flex-1 flex flex-col">
  <header>...</header>
  <main className="flex-1 overflow-auto">
    {/* Page content */}
  </main>
</div>
```

**Verification:**
- Landmark outline in DevTools shows main region
- Screen reader announces main landmark

---

#### 1.2: Add Alt Text to All Images
**Files:**
- `myBrain-web/src/components/ui/DefaultAvatar.jsx`
- `myBrain-web/src/components/ui/UserAvatar.jsx`
- `myBrain-web/src/features/images/components/ImageGallery.jsx`
**Priority:** CRITICAL
**Effort:** 2-3 hours

**Pattern:**
```jsx
// Avatar with alt text
<img
  src={avatarUrl}
  alt={`${userName}'s profile picture`}
  className="..."
/>

// Fallback avatar
<div
  className="avatar-fallback"
  role="img"
  aria-label={`${userName}'s avatar`}
>
  {initials}
</div>

// Decorative icon (hidden from screen readers)
<svg aria-hidden="true">
  {/* Icon content */}
</svg>
```

**Verification:**
- All images have meaningful alt text
- Decorative elements have `aria-hidden="true"`
- Screen reader announces image content

---

#### 1.3: Fix Heading Hierarchy
**Files:** All feature pages
**Priority:** CRITICAL
**Effort:** 1-2 hours

**Pattern:** Never skip heading levels
```jsx
// GOOD heading hierarchy
<main>
  <h1>Page Title</h1>

  <section>
    <h2>Section Title</h2>

    <article>
      <h3>Article Subtitle</h3>
    </article>
  </section>
</main>

// BAD - skips h2
<main>
  <h1>Page Title</h1>
  <h3>Subsection</h3>  // WRONG: should be h2
</main>
```

**Verification:**
- Lighthouse accessibility audit shows no heading skips
- Screen reader outline shows logical progression
- headingsMap bookmarklet shows proper hierarchy

---

#### 1.4: Add Skip Link
**Files:** `myBrain-web/src/app/AppShell.jsx` or main layout
**Priority:** CRITICAL
**Effort:** 30-45 min

**Implementation:**
```jsx
import { useState } from 'react';

function AppShell() {
  const [skipLinkVisible, setSkipLinkVisible] = useState(false);

  return (
    <>
      {/* Skip link - always keyboard accessible, visible on focus */}
      <a
        href="#main-content"
        className={`
          fixed top-0 left-0 z-[999]
          px-4 py-2 bg-primary text-white
          transition-opacity duration-200
          ${skipLinkVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onFocus={() => setSkipLinkVisible(true)}
        onBlur={() => setSkipLinkVisible(false)}
      >
        Skip to main content
      </a>

      {/* Main layout */}
      <div className="flex">
        <Sidebar />
        <div className="flex-1">
          <Topbar />
          <main id="main-content" className="flex-1 overflow-auto">
            {/* Page content */}
          </main>
        </div>
      </div>
    </>
  );
}
```

**Verification:**
- Tab once from page start, skip link appears
- Enter key on skip link jumps to main content
- No visual distraction when not focused

---

#### 1.5: Add Autocomplete Attributes
**Files:**
- `myBrain-web/src/features/auth/LoginPage.jsx`
- `myBrain-web/src/features/auth/SignupPage.jsx`
**Priority:** CRITICAL
**Effort:** 15 minutes

**Pattern:**
```jsx
<form>
  <label htmlFor="email">Email</label>
  <input
    id="email"
    type="email"
    autocomplete="email"
    required
  />

  <label htmlFor="password">Password</label>
  <input
    id="password"
    type="password"
    autocomplete="current-password"  // For login
    // OR
    autocomplete="new-password"  // For signup
    required
  />

  <label htmlFor="confirm-password">Confirm Password</label>
  <input
    id="confirm-password"
    type="password"
    autocomplete="new-password"
    required
  />
</form>
```

**Standard Autocomplete Values:**
- `email` - Email address
- `current-password` - Current password (login)
- `new-password` - New password (signup/reset)
- `username` - Username/login name
- `name` - Full name
- `given-name` - First name
- `family-name` - Last name

---

#### 1.6: Fix List Semantics in Navigation
**Files:** `myBrain-web/src/components/layout/Sidebar.jsx`
**Priority:** CRITICAL
**Effort:** 1-2 hours

**Pattern:**
```jsx
// GOOD semantic navigation
<nav aria-label="Main navigation">
  <ul className="flex flex-col gap-1">
    <li>
      <NavLink to="/app" className={...}>
        Dashboard
      </NavLink>
    </li>
    <li>
      <NavLink to="/app/tasks" className={...}>
        Tasks
      </NavLink>
    </li>
  </ul>
</nav>

// Collapsible sections
<nav aria-label="Categories">
  <button
    aria-expanded={expanded}
    aria-controls="categories-list"
    onClick={toggleExpanded}
  >
    Categories
  </button>
  <ul id="categories-list" role="region">
    {items.map(item => (
      <li key={item.id}>
        <button>{item.name}</button>
      </li>
    ))}
  </ul>
</nav>
```

**Verification:**
- Semantic outline shows proper list structure
- Screen reader announces "navigation" and list context
- All navigation items are in `<li>` elements

---

## Phase 2: WCAG AA Compliance (Est. 12-18 hours)

### Goal: Achieve full WCAG AA compliance

#### 2.1: Implement Dropdown Arrow Key Navigation
**Files:** `myBrain-web/src/components/ui/Dropdown.jsx`
**Priority:** SERIOUS
**Effort:** 2-3 hours

**Implementation Pattern:**
```jsx
function Dropdown({ value, onChange, options = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const menuRef = useRef(null);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    const maxIndex = options.length - 1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev < maxIndex ? prev + 1 : maxIndex
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev > 0 ? prev - 1 : 0
        );
        break;

      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;

      case 'End':
        e.preventDefault();
        setFocusedIndex(maxIndex);
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0) {
          onChange(options[focusedIndex].value);
          setIsOpen(false);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        break;

      case 'Tab':
        // Tab closes dropdown, which is expected behavior
        setIsOpen(false);
        setFocusedIndex(-1);
        break;

      default:
        // Typeahead: jump to option starting with typed letter
        if (e.key.length === 1) {
          const char = e.key.toLowerCase();
          const nextIndex = options.findIndex(
            (opt, idx) =>
              idx > focusedIndex &&
              opt.label.toLowerCase().startsWith(char)
          );
          if (nextIndex !== -1) {
            setFocusedIndex(nextIndex);
          }
        }
        break;
    }
  };

  // Render menu with proper focus management
  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onKeyDown={handleKeyDown}
      >
        {/* Button content */}
      </button>

      {isOpen && (
        <div role="listbox" ref={menuRef}>
          {options.map((option, index) => (
            <button
              key={option.value}
              role="option"
              aria-selected={value === option.value}
              className={`${
                focusedIndex === index ? 'bg-primary text-white' : ''
              }`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Keyboard Support Required:**
- ↓ Arrow Down: Move focus down
- ↑ Arrow Up: Move focus up
- Home: Move to first option
- End: Move to last option
- Enter: Select focused option
- Space: Select focused option (or open if closed)
- Escape: Close menu
- Tab: Close menu and move focus to next element
- Typeahead: Jump to option starting with typed letter

---

#### 2.2: Implement prefers-reduced-motion Support
**Files:** Global CSS file
**Priority:** SERIOUS
**Effort:** 1-2 hours

**CSS Pattern:**
```css
/* Base styles with transitions */
button {
  transition: background-color 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Respect motion preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**React Pattern for Custom Animation:**
```jsx
function AnimatedComponent() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <div
      className={`transition-all ${
        prefersReducedMotion ? 'duration-0' : 'duration-300'
      }`}
    >
      {/* Content */}
    </div>
  );
}
```

**Impact:** Users with vestibular disorders won't experience motion sickness.

---

#### 2.3: Add Link Underlines and Visual Distinction
**Files:** Global styles, link components
**Priority:** SERIOUS
**Effort:** 1-2 hours

**CSS Pattern:**
```css
a:not([aria-current="page"]) {
  text-decoration: underline;
  text-decoration-color: currentColor;
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
}

a:hover {
  text-decoration-thickness: 3px;
}

a:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 4px;
  border-radius: 2px;
}

/* Active page indicator */
a[aria-current="page"] {
  font-weight: 600;
  position: relative;
}

a[aria-current="page"]::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: currentColor;
}
```

**Tailwind Alternative:**
```jsx
<a href="/path" className="underline decoration-2 underline-offset-4 hover:decoration-4">
  Link text
</a>
```

---

#### 2.4: Add Icon Companions to Color-Only States
**Files:** Forms, status indicators throughout
**Priority:** SERIOUS
**Effort:** 2-3 hours

**Pattern:**
```jsx
// Error with icon
{error && (
  <div className="flex gap-2 items-start text-red-600 text-sm mt-1">
    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
    <span role="alert">{error}</span>
  </div>
)}

// Success with icon
{success && (
  <div className="flex gap-2 items-start text-green-600 text-sm mt-1">
    <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
    <span role="status" aria-live="polite">{success}</span>
  </div>
)}

// Warning with icon
{warning && (
  <div className="flex gap-2 items-start text-amber-600 text-sm mt-1">
    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
    <span role="alert">{warning}</span>
  </div>
)}
```

---

#### 2.5: Improve Color Contrast for Muted Text
**Files:** CSS variables, theme configuration
**Priority:** SERIOUS
**Effort:** 1-2 hours

**Verification Tool:** WebAIM Color Contrast Checker

**Current Issue:**
- `.text-muted` may not meet 4.5:1 contrast ratio
- WCAG AA requires 4.5:1 for normal text, 3:1 for large text

**Fix:**
```css
/* Verify and adjust muted text color */
:root.dark {
  --muted: #a1a1a1;  /* Ensures 4.5:1 contrast on dark backgrounds */
}

/* If muted is only for secondary text, 3:1 is acceptable */
.text-muted-secondary {
  color: #808080;  /* 3:1 contrast acceptable for labels */
}
```

**Testing:**
- Use WebAIM Contrast Checker for every color
- Test at actual usage size
- Test on both light and dark backgrounds

---

## Phase 3: Best Practices & Polish (Est. 15-20 hours)

### High-Impact Best Practices

#### 3.1: Add aria-current to Active Navigation Items
**Effort:** 1 hour

```jsx
<NavLink
  to="/app/tasks"
  className={({ isActive }) => isActive ? 'text-primary' : ''}
  // NavLink automatically sets aria-current="page" when active
>
  Tasks
</NavLink>

// Manual version for custom links
<a
  href="/app/tasks"
  aria-current={isCurrentPage ? 'page' : undefined}
>
  Tasks
</a>
```

#### 3.2: Add aria-label to Icon-Only Buttons
**Effort:** 2 hours
**Pattern:** Already well-implemented (321 instances found)
**Remaining:** Ensure 100% coverage

```jsx
// Good - has aria-label
<button aria-label="Close menu">
  <X className="w-5 h-5" />
</button>

// Bad - missing aria-label
<button>
  <X className="w-5 h-5" />
</button>
```

#### 3.3: Announce Dynamic Content Changes
**Effort:** 2-3 hours

```jsx
// Live region for status updates
<div aria-live="polite" aria-atomic="true">
  {loadingMessage}
</div>

// Form submission status
<div role="status" aria-live="assertive">
  {submitStatus}
</div>

// Toast notifications
<ToastContainer>
  {toasts.map(toast => (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {toast.message}
    </div>
  ))}
</ToastContainer>
```

#### 3.4: Add Loading State Announcements
**Effort:** 2 hours

```jsx
<button
  onClick={handleSubmit}
  aria-busy={isLoading}
  disabled={isLoading}
>
  {isLoading ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      <span className="sr-only">Loading, please wait</span>
      Saving...
    </>
  ) : (
    'Save'
  )}
</button>

// Also announce in live region
{isLoading && (
  <div role="status" aria-live="polite">
    Saving your changes...
  </div>
)}
```

#### 3.5: Implement Help Text with aria-describedby
**Effort:** 1-2 hours

```jsx
<label htmlFor="password">Password</label>
<p id="password-hint" className="text-sm text-muted">
  At least 8 characters with uppercase, lowercase, and numbers
</p>
<input
  id="password"
  type="password"
  aria-describedby="password-hint password-error"
/>
{error && (
  <p id="password-error" role="alert" className="text-red-600">
    {error}
  </p>
)}
```

---

## Testing Checklist for Implementation

### Phase 1 Testing (WCAG A)
- [ ] Keyboard navigation: Tab through entire page
- [ ] Screen reader: Use NVDA or VoiceOver to review page structure
- [ ] Landmark regions: Verify main, nav, header landmarks exist
- [ ] Heading hierarchy: Use screen reader to navigate by headings
- [ ] Image alt text: Verify all images have meaningful alt text
- [ ] Skip link: Tab from page start and verify skip link appears
- [ ] Autocomplete: Verify browser password manager can fill form

### Phase 2 Testing (WCAG AA)
- [ ] Arrow keys in dropdowns: Test all keyboard shortcuts
- [ ] Motion preferences: Enable `prefers-reduced-motion` and test
- [ ] Link underlines: Verify all links have visual distinction
- [ ] Color contrast: Use WebAIM Contrast Checker on all text
- [ ] Form errors: Verify errors are announced to screen readers
- [ ] Listbox role: Verify dropdown structure in DevTools

### Phase 3 Testing (Best Practices)
- [ ] Current page indication: Verify active nav item indicated
- [ ] Icon labels: Use screen reader, all icons should be labeled
- [ ] Live regions: Verify dynamic content updates announced
- [ ] Loading states: Verify loading announcements work
- [ ] Help text: Verify aria-describedby connects label to help text

---

## Automated Testing Integration

### Add to CI/CD Pipeline

```bash
# Install accessibility testing tools
npm install --save-dev @axe-core/react axe-core jest-axe

# Add to Jest test setup
// setupTests.js
import 'jest-axe/extend-expect';

// Example test
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('LoginPage should not have accessibility violations', async () => {
  const { container } = render(<LoginPage />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Pre-commit Hook for Accessibility

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run test:a11y -- --bail
```

---

## Tools & Resources

### Recommended Tools
1. **axe DevTools** - Chrome/Firefox extension for automated scanning
2. **WAVE** - WebAIM's accessibility evaluation tool
3. **Lighthouse** - Built into Chrome DevTools
4. **Color Contrast Analyzer** - Verify color ratios
5. **Screen Readers** - NVDA (free), JAWS (paid), VoiceOver (Mac)
6. **jest-axe** - Automated testing with jest

### Learning Resources
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Learn/Accessibility)
- [WebAIM Articles](https://webaim.org/articles/)
- [Inclusive Components](https://inclusive-components.design/)

---

## Success Metrics

### Phase 1 (Critical)
✅ **Target:** WCAG A Compliance (100%)
- [ ] Zero critical issues remaining
- [ ] Main landmark on all pages
- [ ] All images have alt text
- [ ] Proper heading hierarchy
- [ ] Skip link implemented
- [ ] Autocomplete attributes added

### Phase 2 (Important)
✅ **Target:** WCAG AA Compliance (100%)
- [ ] Arrow key navigation in dropdowns
- [ ] prefers-reduced-motion support
- [ ] Link visual distinction
- [ ] Contrast ratio verification
- [ ] Form error announcements
- [ ] Proper ARIA structure

### Phase 3 (Polish)
✅ **Target:** Best Practices (80%+)
- [ ] Active page indication
- [ ] Icon labels complete
- [ ] Live regions for dynamic content
- [ ] Loading state announcements
- [ ] Help text implementation
- [ ] Consistent focus indicators

---

## Timeline Recommendation

**Week 1:** Phase 1 (WCAG A) - 10-14 hours
**Week 2:** Phase 2 (WCAG AA) - 12-18 hours
**Week 3:** Phase 3 (Best Practices) - 15-20 hours
**Week 4:** Testing, fixes, documentation - 10-15 hours

**Total: 4-5 weeks to full WCAG AA compliance**

---

## Maintenance

### Monthly
- [ ] Run axe DevTools on all pages
- [ ] Test with screen reader
- [ ] Keyboard-only navigation test
- [ ] Zoom to 200% readability check

### Quarterly
- [ ] Full accessibility audit
- [ ] Update contrast ratios if colors change
- [ ] Review new WCAG guidelines
- [ ] User feedback from accessibility users

### Ongoing
- [ ] Accessibility checklist in code review
- [ ] New components include a11y tests
- [ ] Team training on accessibility
- [ ] Track accessibility metrics

---

*Last Updated: 2026-01-31*
