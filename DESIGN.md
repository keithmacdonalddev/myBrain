# myBrain - UX Design Document

## Part 1: User Mental Models

### What does the user think this is?

**Primary Mental Model**: "A place where I put things I don't want to forget"

Users will think of myBrain as:
- A digital extension of their memory
- A personal filing cabinet they can search
- A place to capture thoughts before thfey disappear
- NOT a todo app, NOT a project manager, NOT social media

**The Promise**: "Capture now, organize later, find always"

### What are they trying to accomplish?

| User Intent | Frequency | Urgency |
|-------------|-----------|---------|
| Quickly capture a thought before I forget | Very High | HIGH |
| Find something I saved before | High | Medium |
| Review/edit something I'm working on | Medium | Low |
| Organize my accumulated notes | Low | Low |
| Track personal data (fitness, habits) | Medium | Low |
| Reference knowledge I've collected | Medium | Medium |

**Key Insight**: Capture is urgent, organization is not. The UI must prioritize speed of capture over perfection of organization.

### Wrong Mental Models (What users will incorrectly assume)

| Wrong Assumption | Reality | How to Correct |
|------------------|---------|----------------|
| "I need to organize before saving" | Capture first, organize never if you want | Make save instant, tags optional |
| "Notes are like files in folders" | Notes are searchable, taggable, fluid | Don't use folder metaphor |
| "If I don't categorize it, I'll lose it" | Search will find it | Make search prominent, instant |
| "Coming Soon means I can click it" | It's a preview of future features | Grayed out + tooltip explains |
| "The sidebar is for navigation only" | Sidebar shows areas + quick actions | Add + button for quick capture |
| "I need to be logged in to do anything" | Yes, this is personal data | Make login fast, memorable |

---

## Part 2: Information Architecture

### Core Concepts (What exists in the system)

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER IDENTITY                            │
│  - Account (email, password, role)                               │
│  - Preferences (theme, default area, sidebar state)             │
│  - Feature Flags (what features they can access)                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                           AREAS                                  │
│  Logical groupings of features. Think of them as "modes"        │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Notes   │ │ Fitness  │ │   KB     │ │ Messages │  ...      │
│  │ (active) │ │ (future) │ │ (future) │ │ (future) │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AREA-SPECIFIC CONTENT                         │
│                                                                  │
│  NOTES AREA:                                                    │
│  ├── Notes (title, body, tags, status, pinned)                  │
│  ├── Tags (derived from notes)                                   │
│  └── Views (all, pinned, archived, trash)                       │
│                                                                  │
│  FITNESS AREA (future):                                         │
│  ├── Workouts (exercises, sets, reps)                           │
│  ├── Meals (foods, calories, macros)                            │
│  ├── Body Metrics (weight, measurements)                        │
│  └── Goals (targets, progress)                                  │
│                                                                  │
│  KNOWLEDGE BASE AREA (future):                                  │
│  ├── Articles (long-form content)                               │
│  ├── Links (bookmarks with notes)                               │
│  ├── Collections (grouped articles)                             │
│  └── Topics (hierarchical categories)                           │
│                                                                  │
│  MESSAGES AREA (future):                                        │
│  ├── Conversations (with other users)                           │
│  ├── Contacts (people)                                          │
│  └── Groups (shared conversations)                              │
└─────────────────────────────────────────────────────────────────┘
```

### Concept Groupings (Logical Buckets)

**Bucket 1: Capture & Create**
- Quick Capture (dashboard widget)
- New Note button
- New [anything] button per area

**Bucket 2: Browse & Find**
- Sidebar navigation (areas)
- Search (global, per-area)
- Filters (status, tags, dates)
- Views (all, pinned, archived, trash)

**Bucket 3: View & Edit**
- Note detail/editor
- Content viewers per area

**Bucket 4: Organize**
- Pin/unpin
- Archive
- Trash/restore
- Tag management

**Bucket 5: Settings & Admin**
- User settings
- Theme toggle
- Admin panel (if admin)

### URL Structure (How navigation maps to URLs)

```
/                     → Redirect to /app
/login               → Login page
/signup              → Signup page
/app                 → Dashboard (home after login)
/app/notes           → Notes list
/app/notes/:id       → Single note (view/edit)
/app/fitness         → Fitness dashboard (future)
/app/fitness/workouts → Workout log
/app/kb              → Knowledge base (future)
/app/messages        → Messages (future)
/app/settings        → User settings
/admin               → Admin dashboard
/admin/users         → User management
/admin/areas         → Area management
/admin/logs          → Request logs
```

---

## Part 3: Affordances & Action Clarity

### What is Clickable?

| Element | Visual Treatment | Cursor | Feedback on Hover |
|---------|------------------|--------|-------------------|
| Primary buttons | Solid color, rounded | pointer | Darken 10% |
| Secondary buttons | Border only | pointer | Fill with 10% opacity |
| Links in text | Primary color, underline on hover | pointer | Underline appears |
| Sidebar items | Full width, icon + text | pointer | Background highlight |
| Note cards | Border, full card clickable | pointer | Border color change |
| Quick action icons | Icon only, muted color | pointer | Primary color |
| Tags | Pill shape | pointer | Slight lift shadow |
| Dropdown triggers | Text + chevron | pointer | Chevron rotates |

### What Looks Editable?

| Element | Visual Treatment | Interaction |
|---------|------------------|-------------|
| Text inputs | Border, placeholder text | Focus ring on click |
| Text areas | Border, placeholder, resize handle | Focus ring, auto-grow |
| Note title (edit mode) | Larger font, no border until hover | Border appears on hover |
| Note body (edit mode) | Clean, minimal border | Focus ring |
| Toggle switches | Track + thumb | Thumb moves, color changes |
| Dropdowns | Border + chevron | Opens options list |

### What Looks Read-Only?

| Element | Visual Treatment |
|---------|------------------|
| Stats/numbers | Large font, no border, muted label |
| Timestamps | Small, muted text |
| User email (in settings) | Grayed background, no focus |
| Status badges | Pill with background color |
| Empty state text | Centered, muted, icon above |

### What Looks Final vs In-Progress?

| State | Visual Treatment |
|-------|------------------|
| **Final/Saved** | No indicators, clean state |
| **Unsaved changes** | Subtle dot indicator, or "Saving..." text |
| **Currently saving** | Spinner, "Saving..." |
| **Save failed** | Red indicator, "Failed to save" with retry |
| **Archived** | Muted card, "Archived" badge |
| **Trashed** | More muted, "In Trash" badge, expiry warning |

### Coming Soon Features

| Element | Visual Treatment | Behavior |
|---------|------------------|----------|
| Sidebar item | Grayed out icon + text | Not clickable |
| Badge | "Coming Soon" pill | Static |
| Tooltip | On hover: "This feature is coming soon" | Informative |
| Click | Nothing happens | No feedback needed |

---

## Part 4: Cognitive Load & Decision Minimization

### Where Will Users Hesitate?

**Moment 1: First Login - "Where do I start?"**
```
Problem: Empty dashboard, no context
Solution:
- Prominent "Create your first note" CTA
- Quick capture widget pre-focused
- Getting started checklist (optional, dismissible)
```

**Moment 2: Creating a Note - "Do I need to add tags?"**
```
Problem: Tags field visible, feels required
Solution:
- Tags field collapsed by default
- Placeholder: "Add tags (optional)"
- Auto-suggest based on content (future)
```

**Moment 3: Sidebar Areas - "What are these grayed out things?"**
```
Problem: Coming soon areas confuse users
Solution:
- Tooltip on hover explains
- Small "Coming Soon" badge
- Don't make them look clickable
```

**Moment 4: Search - "Will it find what I need?"**
```
Problem: Uncertainty about search scope
Solution:
- Search placeholder: "Search notes..."
- Show result count immediately
- Highlight matches in results
```

**Moment 5: Archive vs Trash - "What's the difference?"**
```
Problem: Two ways to "remove" something
Solution:
- Archive: "Hide from main view" (reversible, permanent)
- Trash: "Delete in 30 days" (temporary, then gone)
- Confirmation only for permanent delete
```

### Decision Reduction Strategies

**Collapse Decisions (fewer choices)**
```
BEFORE: Create Note → Choose folder → Choose template → Add tags → Save
AFTER:  Create Note → Write → (auto-save) → Add tags later if you want
```

**Delay Complexity (progressive disclosure)**
```
Note Editor:
- Level 1 (default): Title, body, save
- Level 2 (click "..."): Tags, pin, archive
- Level 3 (settings): Advanced options
```

**Smart Defaults**
```
- New notes: Active status, unpinned, no tags
- Theme: Match system preference
- View: Show all active notes, newest first
- Search: Search everywhere, not just titles
```

**Reduce Friction**
```
- Auto-save every 2 seconds (no save button needed)
- Remember last opened note
- Preserve search/filter state on navigation
- Keyboard shortcuts for power users
```

---

## Part 5: State Design & Feedback

### Major Element States

#### Notes List

| State | What User Sees | What They Understand | What They Can Do |
|-------|----------------|----------------------|------------------|
| **Empty** | Illustration + "No notes yet" + CTA | I haven't created anything | Click "Create Note" |
| **Loading** | 3 skeleton cards | Data is being fetched | Wait |
| **Success** | List of note cards | Here are my notes | Click to view, search, filter |
| **Partial** | Some notes + load more | There are more notes | Scroll or click "Load more" |
| **Error** | Error message + retry | Something went wrong | Click "Try again" |
| **Filtered Empty** | "No results for X" | My search found nothing | Clear filters, try different search |

#### Single Note Editor

| State | What User Sees | What They Understand | What They Can Do |
|-------|----------------|----------------------|------------------|
| **Loading** | Skeleton layout | Note is loading | Wait |
| **Viewing** | Note content, edit button | This is my note | Read, click edit |
| **Editing** | Editable fields, auto-save indicator | I can change this | Type, changes auto-save |
| **Saving** | "Saving..." indicator | Changes being saved | Continue editing |
| **Saved** | "Saved" or no indicator | Changes are safe | Continue or navigate away |
| **Save Error** | "Failed to save" + retry | Something went wrong | Retry, or copy content |
| **Not Found** | "Note not found" | Note doesn't exist | Go back to list |

#### Quick Capture Widget

| State | What User Sees | What They Understand | What They Can Do |
|-------|----------------|----------------------|------------------|
| **Empty** | Placeholder "What's on your mind?" | Ready for input | Start typing |
| **Has Content** | Their text + enabled Save button | Ready to save | Click Save or Ctrl+Enter |
| **Saving** | Disabled button, spinner | Creating note | Wait |
| **Saved** | Success toast, cleared input | Note was created | Start new capture or view note |
| **Error** | Error toast, content preserved | Save failed | Retry (content not lost!) |

#### Dashboard

| State | What User Sees | What They Understand | What They Can Do |
|-------|----------------|----------------------|------------------|
| **First Visit** | Welcome + quick capture + getting started | I'm new here | Create first note |
| **Has Content** | Continue section + recent + pinned | Here's my stuff | Resume work, quick capture |
| **Loading** | Skeleton sections | Loading my data | Wait |
| **Error** | Error message per section | Partial failure | Retry individual sections |

### Feedback Mechanisms

**Immediate Feedback (< 100ms)**
- Button press: Visual depression/color change
- Toggle: Instant state change
- Keyboard shortcut: Immediate action

**Short Feedback (100ms - 1s)**
- Search: Results appear as you type
- Auto-save: "Saving..." indicator
- Navigation: Page transition

**Medium Feedback (1-5s)**
- Save confirmation: Toast appears and auto-dismisses
- Create note: Redirect to new note
- Delete: Undo toast with timer

**Long Feedback (> 5s)**
- Initial data load: Skeleton screens
- Heavy operations: Progress indicator with context

---

## Part 6: Flow Integrity Check

### Core User Flows

#### Flow 1: Quick Capture (most common)

```
User arrives → Dashboard loads → Quick capture widget visible
     ↓
User types thought → Sees text in field
     ↓
User presses Ctrl+Enter (or clicks Save) → Button shows loading
     ↓
Note created → Toast: "Note created" with "View" link
     ↓
Widget clears → Ready for next capture

TIME: < 3 seconds for entire flow
DECISIONS: 0 (just type and save)
```

#### Flow 2: Find and Edit a Note

```
User opens app → Dashboard shows "Continue" with last note
     ↓
OR: User clicks Notes in sidebar → Notes list loads
     ↓
User types in search → Results filter instantly
     ↓
User clicks note card → Note opens in editor
     ↓
User edits → Changes auto-save (indicator shows)
     ↓
User navigates away → No action needed, already saved

TIME: Variable, but each step < 1 second
DECISIONS: 1 (which note to open)
```

#### Flow 3: Organize Notes (occasional)

```
User on notes list → Sees note cards with quick action icons
     ↓
User hovers note → Quick actions appear (pin, archive, trash)
     ↓
User clicks pin → Note pins (toast: "Note pinned")
     ↓
Note appears in Pinned section
     ↓
OR: User clicks archive → Note moves to archived (toast with Undo)
     ↓
Note disappears from list → Undo available for 8 seconds

TIME: < 2 seconds per action
DECISIONS: 1 (what action to take)
```

### Does This Feel Inevitable?

**Test: Can a user accomplish their goal without thinking about the UI?**

| Goal | Path | Friction Points |
|------|------|-----------------|
| Capture a thought | Dashboard → Type → Save | None - immediate |
| Find a note | Notes → Search → Click | Minimal - search is prominent |
| Pin something important | Note → Click pin icon | Clear - icon is obvious |
| Trash something | Note → Click trash icon | Clear - confirms with undo |
| Change theme | Topbar → Click sun/moon | Obvious - universal icon |

---

## Part 7: Final Sanity Check

### Where Could Users Get Lost?

| Scenario | Risk | Mitigation |
|----------|------|------------|
| First-time user, empty state | Don't know where to start | Prominent CTA, quick capture ready |
| Looking for archived notes | Can't find them | Clear "Archived" tab in notes view |
| Accidentally trashed note | Panic about data loss | Undo toast, trash view shows all |
| Admin features not visible | Confusion if admin | Admin link only shows for admins |
| Mobile sidebar hidden | Can't navigate | Hamburger menu standard pattern |
| Coming soon click | Frustration, nothing happens | Tooltip explains, not clickable look |

### Where Would Users Fail?

| Failure Mode | Detection | Recovery |
|--------------|-----------|----------|
| Network error during save | Error toast, content preserved | Retry button, content in field |
| Session expired | API returns 401 | Redirect to login, preserve URL |
| Note not found | 404 from API | "Not found" message + back button |
| Search returns nothing | Empty results | Clear message + suggestions |
| Validation error | Red border + message | Explain what's wrong |

### What Must Be Visible vs Implied?

**Must Be Visible (explicit)**
- Current area (sidebar highlight)
- Unsaved changes indicator
- Error states
- Empty states with CTAs
- Loading states
- User role (admin badge)
- System status (saving, syncing)

**Can Be Implied (hidden until needed)**
- Keyboard shortcuts (shown on hover/help)
- Advanced options (in "..." menu)
- Tags input (collapsed by default)
- Full timestamp (show relative, full on hover)
- Note word count (show in editor footer)
- Admin features (only shown to admins)

---

## Part 8: Feature Flag Philosophy

### User-Facing Feature Flags

Feature flags control what users can access:

```
VISIBILITY LEVELS:
1. Hidden - Feature doesn't exist for this user
2. Coming Soon - Visible but not usable (builds anticipation)
3. Beta - Usable but marked as beta (sets expectations)
4. Active - Fully available
```

### Admin Control Principles

**What admins can control:**
- Which areas are visible to all users
- Which areas are coming soon vs active
- Per-user feature flag overrides (beta testers)
- Global feature states

**What admins cannot break:**
- Core authentication (always works)
- Data integrity (flags don't delete data)
- Admin access to admin panel

### Progressive Rollout Pattern

```
1. Feature developed behind flag (hidden to all)
2. Enable for specific beta users (flag override)
3. Gather feedback, iterate
4. Enable as "beta" for all users
5. Promote to "active" (stable)
```

---

## Part 9: Future-Proofing the Architecture

### How New Areas Integrate

When adding a new area (e.g., Fitness):

```
1. BACKEND: Create models, routes, services
   └── Following existing patterns (notes as template)

2. ADMIN: Create area in admin panel
   └── Name, icon, status (coming_soon initially)

3. FRONTEND: Create feature module
   └── features/fitness/
       ├── routes.jsx
       ├── components/
       └── hooks/

4. REGISTRY: Add to feature registry
   └── Lazy loaded, gated by area status

5. SIDEBAR: Automatically shows (data-driven)
   └── No code change needed

6. ACTIVATE: Admin changes status to "active"
   └── Users see it immediately
```

### Cross-Area Connections (Future)

As areas grow, they'll connect:

```
NOTES ←→ FITNESS
"Attach a note to a workout"

NOTES ←→ KB
"Promote a note to a KB article"

NOTES ←→ MESSAGES
"Share a note in a conversation"

DASHBOARD ←→ ALL
"Show highlights from all areas"
```

### Data Organization Philosophy

```
PRINCIPLE: Everything belongs to a user, optionally to an area

USER
  └── NOTES (notes area)
  └── WORKOUTS (fitness area)
  └── ARTICLES (kb area)
  └── MESSAGES (messages area)
  └── SETTINGS (global)

CROSS-CUTTING:
  └── TAGS (shared across areas? or per-area?)
  └── SEARCH (global across all areas)
  └── ACTIVITY (recent from all areas)
```

---

## Part 10: Key UX Principles Summary

### The 5 Laws of myBrain UX

1. **Capture is king**: Getting something in is more important than organizing it
2. **Search is the escape hatch**: If organization fails, search saves you
3. **Auto-save is trust**: Never lose user's work
4. **Progressive disclosure**: Simple by default, powerful when needed
5. **Feedback is immediate**: Every action shows result

### Metrics to Track (Future Analytics)

| Metric | Why It Matters |
|--------|----------------|
| Time to first capture | Are we making it easy to start? |
| Captures per session | Are users actively using it? |
| Search usage | Are users finding things? |
| Search success rate | Are searches finding results? |
| Feature adoption by area | Which areas are valuable? |
| Undo usage | Are we saving users from mistakes? |
| Error rate by flow | Where is the system failing? |
| Session duration | Are users engaged? |

---

## Appendix: Design Token Reference

### Colors (CSS Variables)

```css
/* Semantic Colors */
--primary: Action color (buttons, links)
--danger: Destructive actions (delete, errors)
--success: Positive feedback (saved, created)
--warning: Caution (unsaved, expiring)

/* Surface Colors */
--bg: Page background
--panel: Card/component background
--border: Dividers, borders

/* Text Colors */
--text: Primary text
--muted: Secondary text, placeholders
```

### Spacing Scale

```
4px  - Tight (icon padding)
8px  - Compact (between related items)
12px - Default (button padding)
16px - Comfortable (card padding)
24px - Spacious (section gaps)
32px - Loose (page margins)
```

### Typography

```
Headings: font-semibold
Body: font-normal
Muted: text-muted
Mono: font-mono (code, IDs, timestamps)
```

---

*This document should evolve as the product evolves. Review after major feature launches.*
