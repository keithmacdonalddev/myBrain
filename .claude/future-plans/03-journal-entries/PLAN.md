# Journal Entries - Future Feature Plan

> **WARNING: ROUGH DRAFT**
>
> This document represents exploratory thinking about a potential feature. It is NOT a committed roadmap item. The approach, scope, and design may change significantly based on user feedback, technical exploration, or shifting priorities. This plan has NOT been reviewed or approved.

---

## Metadata

| Property | Value |
|----------|-------|
| **Created by** | Claude Haiku 4.5 |
| **Date** | 2026-01-31 |
| **Status** | Draft - Not Approved |
| **Priority** | High |
| **Effort Estimate** | Medium (60-80 hours) |
| **Target Release** | Post-V2 Dashboard |

---

## Why This Feature

### Problem Statement

Currently, myBrain has **Notes** which capture information, but with critical limitations:

1. **No custom dates** - Notes only have `createdAt` (auto-generated). Users cannot record "what happened on January 15th" if writing the note on January 31st.
2. **No retroactive journaling** - A professional wanting to track daily work reflections must write entries immediately. Missing a day means losing that record forever.
3. **No reflection structure** - Notes are loose captures. There's no guided reflection with prompts ("What went well?" "What did I learn?").
4. **No mood/energy tracking** - Users can't correlate their emotional state with productivity, tasks, or events.
5. **No calendar view** - Notes appear in lists. There's no visual "see all my journal entries for this month" capability.

### User Story

**Professional (Sarah) wants to journal about her day:**

> "I work long hours and don't always have time to journal at the end of the day. By 9pm I'm exhausted and forget what happened. I'd love to spend 5 minutes Sunday nights reviewing my week - journaling about Monday through Saturday retroactively. I want to record my mood, what went well, what I learned, and link it to the tasks and meetings I did that day. I want to see patterns over time - like 'I'm always energized on Tuesdays but drained on Fridays.'"

**Current limitation:** She writes a Note on Sunday night, but it has no date context. It's just "Sunday's capture" with no way to say "this is about Monday." And she can't see a calendar view of her week.

### Origin of Idea

This idea emerged from user requests about retroactive data entry, combined with the observation that:
- Notes are "inboxes" - they need processing (per 2026-01-28 decision)
- Personal reflection/journaling is a high-value use case for a productivity tool
- Daily mood/energy data is valuable for spotting patterns (complement to Fitness tracking)
- Journaling can naturally link to existing data (tasks from that day, events, projects)

---

## What We're Building

### Feature Overview

A **dedicated journaling system** with:

- **Journal Entry model** - Separate from Notes, optimized for reflection
- **Custom date support** - Create entries for any date (past, present, future)
- **Guided reflection** - Optional daily prompts ("What went well?" etc.)
- **Mood & energy tracking** - Record emotional state, energy level, focus level
- **Daily limit** - One entry per calendar day (enforced by date, not creation time)
- **Calendar view** - Visual grid showing which days have entries
- **Intelligent linking** - Auto-link to tasks, events, projects from that date
- **Search & filter** - Find entries by date range, mood, tags
- **Streak tracking** - Show "journaled X days in a row" motivation

### Key Differences from Notes

| Aspect | Notes | Journal Entries |
|--------|-------|-----------------|
| **Purpose** | Quick captures, inbox items | Structured reflection |
| **Date** | Auto `createdAt` | Custom `entryDate` (any date) |
| **Limit** | Unlimited per day | One per calendar day |
| **Structure** | Title + body (free-form) | Sections (reflection, mood, energy) |
| **Prompts** | None | Optional daily prompts |
| **Mood** | Not tracked | Yes (mood, energy, focus) |
| **Calendar** | List view only | Calendar grid view |
| **Lifecycle** | Active/archived/trashed | Active/archived/trashed |

---

## Detailed Specification

### User Flows

#### Flow 1: Create Journal Entry

```
1. User clicks "New Journal Entry" or "Journal" in nav
2. App shows entry form with:
   - Date picker (defaults to today)
   - "What went well?" prompt (textarea)
   - "What's one thing you learned?" prompt (textarea)
   - Mood selector (😁 Great, 😊 Good, 😐 Okay, 😔 Struggling, 😢 Difficult)
   - Energy level (1-5 slider)
   - Focus level (1-5 slider)
   - Optional tags
3. System auto-links to:
   - All tasks completed on that date
   - All events that day
   - Related projects (if tasks are in projects)
4. User clicks "Save" → Entry is created/updated
5. Success toast, auto-saves to database
```

#### Flow 2: View Calendar

```
1. User navigates to "Journal" section
2. By default, shows calendar view for current month
3. Days with entries show:
   - Visual indicator (colored dot or box)
   - Color intensity = mood level
4. User clicks a day:
   - If entry exists: opens entry view
   - If no entry: opens create form for that date
5. User can navigate months with prev/next arrows
6. Optional: clicking a day with no entry shows stats (# completed tasks that day)
```

#### Flow 3: View Entry

```
1. User clicks an entry in calendar or list view
2. Shows:
   - Entry date (prominent)
   - Mood icon + text
   - Energy/focus levels (visual gauges)
   - Reflection text (formatted)
   - Linked tasks (from that date)
   - Linked events (from that date)
   - Tags
3. User can:
   - Edit (click pencil icon)
   - Delete (with confirmation)
   - View linked items
4. Navigation: prev/next day arrows to jump to adjacent entries
```

#### Flow 4: Journal Statistics

```
1. User navigates to "Journal" → "Insights" tab
2. Shows:
   - Streak: "Journaled 12 days in a row"
   - Total entries: "42 entries this month"
   - Mood distribution: Chart showing mood frequency
   - Energy patterns: Average energy by day of week
   - Mood by weekday: Better on Tuesdays? Harder on Fridays?
3. Optional: AI-generated insights ("You're more energized on days with exercise")
```

### UI Mockups

#### Calendar View

```
┌─────────────────────────────────────────┐
│ Journal                          Jan 2026 │
├─────────────────────────────────────────┤
│ < January 2026 >                        │
├──┬──┬──┬──┬──┬──┬──┐
│Su│Mo│Tu│We│Th│Fr│Sa│
├──┼──┼──┼──┼──┼──┼──┤
│  │  │  │  │  │ 1│ 2│
│ 3│ 4│ 5│ 6│ 7│ 8│ 9│
│10│11│12│13│14│15│16│
│17│18│19│20│21│22│23│
│24│25│26│27│28│29│30│
│31│  │  │  │  │  │  │
└──┴──┴──┴──┴──┴──┴──┘

  Days with entries highlighted:
  ◉ = Great mood (bright green)
  ● = Good mood (green)
  ○ = Okay mood (gray)
  ⦿ = Struggling (amber)
  ✕ = Difficult (red)
```

#### Entry Form

```
┌──────────────────────────────────────────┐
│ New Journal Entry                         │
├──────────────────────────────────────────┤
│                                          │
│ Date: [Jan 31, 2026]  ▼                 │
│                                          │
│ ─────────────────────────────────────    │
│                                          │
│ What went well today?                   │
│ ┌────────────────────────────────────┐  │
│ │ Had a great meeting with the team  │  │
│ │ Shipped the new feature ahead of   │  │
│ │ schedule                           │  │
│ └────────────────────────────────────┘  │
│                                          │
│ What's one thing you learned?           │
│ ┌────────────────────────────────────┐  │
│ │ Learned that good documentation    │  │
│ │ saves 10x the time down the road   │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ─────────────────────────────────────    │
│                                          │
│ Mood:    😊 Good                        │
│ Energy:  ████░ (4/5)                    │
│ Focus:   █████ (5/5)                    │
│                                          │
│ ─────────────────────────────────────    │
│                                          │
│ Tags: [work] [shipped] [learning]       │
│ Linked Tasks: 4 completed               │
│ Linked Events: 2                         │
│                                          │
│ [Cancel]                    [Save Entry] │
└──────────────────────────────────────────┘
```

#### Entry View

```
┌──────────────────────────────────────────┐
│ ◄ January 31, 2026        ► [Edit] [•••] │
├──────────────────────────────────────────┤
│                                          │
│ 😊 Good    Energy: ████░  Focus: █████  │
│                                          │
│ ────────────────────────────────────     │
│                                          │
│ What went well today?                   │
│ Had a great meeting with the team...    │
│                                          │
│ What did you learn?                     │
│ Good documentation saves 10x time...    │
│                                          │
│ ────────────────────────────────────     │
│                                          │
│ Tags: [work] [shipped] [learning]       │
│                                          │
│ ────────────────────────────────────     │
│                                          │
│ From this day:                          │
│ ✓ Completed Tasks (4)                   │
│   • Ship Dashboard V2                   │
│   • Code review PR #47                  │
│   • Team standup                        │
│   • Write documentation                 │
│                                          │
│ 📅 Events (2)                           │
│   • Team Standup (9:00 AM)              │
│   • Design Review (3:00 PM)             │
│                                          │
└──────────────────────────────────────────┘
```

#### Insights View

```
┌────────────────────────────────────┐
│ Journal Insights                   │
├────────────────────────────────────┤
│                                    │
│ 🔥 Streak: 12 days in a row        │
│    Your best: 23 days (Jun 2025)   │
│                                    │
│ 📊 42 entries in January            │
│                                    │
│ ─────────────────────────────────  │
│                                    │
│ Mood Distribution                  │
│ ████████░░ Great      (8 days)     │
│ ██████░░░░ Good       (6 days)     │
│ ████░░░░░░ Okay       (4 days)     │
│ ██░░░░░░░░ Struggling (2 days)     │
│ █░░░░░░░░░ Difficult  (1 day)      │
│                                    │
│ ─────────────────────────────────  │
│                                    │
│ Best Days to Work:                 │
│ Tue: 4.6/5 energy | 4.8/5 focus   │
│ Wed: 4.2/5 energy | 4.6/5 focus   │
│                                    │
│ Hardest Days:                      │
│ Mon: 3.1/5 energy | 3.4/5 focus   │
│ Fri: 3.4/5 energy | 3.6/5 focus   │
│                                    │
└────────────────────────────────────┘
```

---

## Technical Design

### CRITICAL DECISION: JournalEntry Model vs Extending Note

This is the most important architectural decision for this feature.

#### Option A: New `JournalEntry` Model (RECOMMENDED)

**Create dedicated `JournalEntry` model with:**

```javascript
{
  userId: ObjectId,              // Who owns this
  entryDate: Date,               // Journal date (can be past)
  body: String,                  // What went well
  learned: String,               // What you learned
  mood: String,                  // 'great' | 'good' | 'okay' | 'struggling' | 'difficult'
  energyLevel: Number,           // 1-5
  focusLevel: Number,            // 1-5
  tags: [String],               // Optional labels
  linkedTaskIds: [ObjectId],    // Tasks from that day
  linkedEventIds: [ObjectId],   // Events from that day
  linkedProjectIds: [ObjectId], // Projects involved
  status: String,               // 'active' | 'archived' | 'trashed'
  createdAt: Date,              // When written
  updatedAt: Date               // When edited
}
```

**Advantages:**
- Clean separation of concerns - journaling is distinct from quick notes
- `entryDate` is a first-class field, not a workaround
- Can enforce one entry per day (unique index on `userId + entryDate`)
- Mood/energy fields are native, not bolted on
- Calendar view optimizations easier
- Easier to query "all entries in January"
- Reduces Note model bloat

**Disadvantages:**
- New model to maintain
- Separate routes/services for journal vs notes
- Can't easily migrate existing notes to journal entries

**Migration from Notes:**
- Existing notes remain as notes
- If user wants to convert old note → journal entry, that's a future feature (copy content, add date)

#### Option B: Extend Note Model

**Add fields to existing Note:**

```javascript
{
  // existing fields
  userId, title, body, tags, status, etc.

  // NEW fields
  isJournalEntry: Boolean,      // Flag: is this a journal entry?
  entryDate: Date,              // Custom date (null for regular notes)
  learned: String,              // Journal-specific
  mood: String,                 // Journal-specific
  energyLevel: Number,          // Journal-specific
  focusLevel: Number,           // Journal-specific
  linkedTaskIds: [ObjectId],    // Journal-specific
}
```

**Advantages:**
- Single model, fewer code changes
- Can reuse Note routes/services with conditionals
- Notes can optionally have mood/date

**Disadvantages:**
- Note model becomes confused (optional fields for journaling)
- Hard to enforce "one entry per day" - the check becomes complex
- Violates single responsibility principle
- Makes Note schema harder to understand
- Calendar view queries get messy (`isJournalEntry: true, entryDate: ...`)
- UI has to handle "is this a note or journal?" everywhere

#### Decision: **Option A - New JournalEntry Model**

**Rationale:**
- Journaling is a fundamentally different use case than note-taking
- Users need different UI (calendar, mood tracking) for journal vs notes
- The "one entry per day" constraint doesn't make sense for notes
- Cleaner codebase, easier to maintain and extend
- Allows future evolution of journaling without Note model bloat

---

### Backend Data Model

#### JournalEntry Model

```javascript
// myBrain-api/src/models/JournalEntry.js

const journalEntrySchema = new mongoose.Schema({
  // Ownership
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Date and timing
  entryDate: {
    type: Date,
    required: true,  // Date of the journal entry (YYYY-MM-DD)
    index: true      // For calendar queries
  },

  // Reflection content
  body: {
    type: String,
    default: '',
    maxlength: [5000, 'Entry cannot exceed 5000 characters']
  },

  learned: {
    type: String,
    default: '',
    maxlength: [2000, 'Learning cannot exceed 2000 characters']
  },

  // Emotional state
  mood: {
    type: String,
    enum: ['great', 'good', 'okay', 'struggling', 'difficult'],
    default: 'good'
  },

  energyLevel: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },

  focusLevel: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },

  // Organization
  tags: {
    type: [String],
    default: []
  },

  // Links to related content
  linkedTaskIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],

  linkedEventIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],

  linkedProjectIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],

  // Status
  status: {
    type: String,
    enum: ['active', 'archived', 'trashed'],
    default: 'active',
    index: true
  },

  trashedAt: {
    type: Date,
    default: null
  }

}, { timestamps: true });

// Indexes for common queries
journalEntrySchema.index({ userId: 1, entryDate: -1 });           // List by user, date
journalEntrySchema.index({ userId: 1, entryDate: 1, status: 1 }); // One per day check
journalEntrySchema.index({ userId: 1, mood: 1 });                 // Filter by mood
journalEntrySchema.index({ userId: 1, tags: 1 });                 // Filter by tags
journalEntrySchema.index({ entryDate: 1, userId: 1 });            // Calendar queries
```

**Key Design Notes:**
- `entryDate` is required and indexed for calendar queries
- Compound index `(userId, entryDate, status)` enables "one entry per date" checks
- Mood/energy are native fields, not bolted on
- Linked IDs are stored directly for ease of querying
- `trashedAt` enables soft delete with auto-cleanup

#### Methods & Statics

```javascript
// Instance method: Get the mood emoji
journalEntrySchema.methods.getMoodEmoji = function() {
  const emojis = {
    great: '😁',
    good: '😊',
    okay: '😐',
    struggling: '😔',
    difficult: '😢'
  };
  return emojis[this.mood] || '😐';
};

// Instance method: Get formatted date
journalEntrySchema.methods.getFormattedDate = function() {
  return this.entryDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Static: Ensure only one entry per day
journalEntrySchema.statics.ensureOnePerDay = async function(userId, entryDate) {
  const existing = await this.findOne({
    userId,
    entryDate: {
      $gte: new Date(entryDate.setHours(0, 0, 0, 0)),
      $lt: new Date(entryDate.setHours(23, 59, 59, 999))
    },
    status: 'active'
  });
  return existing;
};

// Static: Get entries for a date range
journalEntrySchema.statics.getEntriesForRange = async function(userId, startDate, endDate) {
  return this.find({
    userId,
    entryDate: { $gte: startDate, $lte: endDate },
    status: 'active'
  }).sort({ entryDate: -1 });
};

// Static: Get mood statistics
journalEntrySchema.statics.getMoodStats = async function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        entryDate: { $gte: startDate, $lte: endDate },
        status: 'active'
      }
    },
    {
      $group: {
        _id: '$mood',
        count: { $sum: 1 },
        avgEnergy: { $avg: '$energyLevel' },
        avgFocus: { $avg: '$focusLevel' }
      }
    }
  ]);
};

// Static: Get energy/focus by day of week
journalEntrySchema.statics.getPatternsByDayOfWeek = async function(userId, months = 1) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        entryDate: { $gte: since },
        status: 'active'
      }
    },
    {
      $group: {
        _id: { $dayOfWeek: '$entryDate' },
        avgEnergy: { $avg: '$energyLevel' },
        avgFocus: { $avg: '$focusLevel' },
        avgMood: { $avg: { $cond: [{ $eq: ['$mood', 'great'] }, 5, { $cond: [{ $eq: ['$mood', 'good'] }, 4, { $cond: [{ $eq: ['$mood', 'okay'] }, 3, { $cond: [{ $eq: ['$mood', 'struggling'] }, 2, 1] }] }] } } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

// Static: Get current streak
journalEntrySchema.statics.getStreak = async function(userId) {
  const entries = await this.find({
    userId,
    status: 'active'
  }).sort({ entryDate: -1 }).limit(30);

  if (!entries.length) return 0;

  let streak = 0;
  let checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < entries.length; i++) {
    const entryDate = new Date(entries[i].entryDate);
    entryDate.setHours(0, 0, 0, 0);

    if (entryDate.getTime() === checkDate.getTime()) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
};
```

---

### Backend Routes

#### `journalEntries.js` Route File

```javascript
// myBrain-api/src/routes/journalEntries.js

// POST /api/journal-entries - Create new entry or update existing
// PATCH /api/journal-entries/:id - Edit existing entry
// GET /api/journal-entries - List entries with filters
// GET /api/journal-entries/:id - Get single entry
// DELETE /api/journal-entries/:id - Delete entry
// GET /api/journal-entries/calendar/month/:year/:month - Get entries for month
// GET /api/journal-entries/stats/mood - Get mood statistics
// GET /api/journal-entries/stats/patterns - Get day-of-week patterns
// GET /api/journal-entries/streak - Get current streak

Key endpoints:
1. Create/upsert → ensure one per day
2. List → query by date range, mood, tags
3. Calendar → return only dates with entries
4. Stats → aggregations for insights
5. Delete → soft delete (mark trashed)
```

---

### Frontend Components

#### Components Needed

```
myBrain-web/src/features/journal/
├── pages/
│   ├── JournalPage.jsx         # Main journal hub
│   ├── CalendarView.jsx         # Calendar grid view
│   ├── EntryView.jsx            # Single entry view + prev/next nav
│   ├── InsightsView.jsx         # Stats and patterns
│   └── JournalForm.jsx          # Create/edit entry
├── components/
│   ├── CalendarGrid.jsx         # Reusable calendar widget
│   ├── EntryCard.jsx            # Entry summary card
│   ├── MoodSelector.jsx         # Mood emoji picker
│   ├── LevelSlider.jsx          # Energy/focus 1-5 slider
│   ├── EntryPrompts.jsx         # Reflection prompts section
│   ├── LinkedContent.jsx        # Show tasks/events from that day
│   ├── StreakBanner.jsx         # "X days in a row" display
│   └── MoodChart.jsx            # Mood distribution chart
├── hooks/
│   ├── useJournalEntries.js     # TanStack Query hooks
│   ├── useJournalStats.js       # Stats fetching
│   └── useMood.js               # Mood utilities
└── routes.jsx                   # Feature routing
```

#### Key Components Detail

**CalendarGrid.jsx**
```jsx
// Shows month view with visual indicators
// Days with entries: colored dot (mood-based)
// Days without entries: empty
// Click to view/create entry
// Prev/next arrows to change months

Props:
- year, month
- entries[] (array of { date, mood })
- onDayClick(date)
- onMonthChange(year, month)
```

**MoodSelector.jsx**
```jsx
// Radio button group with emoji
// Options: 😁 Great, 😊 Good, 😐 Okay, 😔 Struggling, 😢 Difficult
// User clicks → updates state
// Selected mood has visual highlight

Props:
- value (mood string)
- onChange(mood)
```

**EntryForm.jsx**
```jsx
// Form with:
// - Date picker (defaults to today)
// - "What went well?" textarea
// - "What did you learn?" textarea
// - MoodSelector
// - LevelSlider (energy, focus)
// - Tag input
// - Preview of linked tasks/events (read-only)
// - Cancel/Save buttons

Props:
- entry (for edit mode, null for create)
- onSave(entry)
- onCancel()
```

---

### Frontend State Management

Use TanStack Query for server state:

```javascript
// hooks/useJournalEntries.js

export const useCreateJournalEntry = () => {
  return useMutation(
    async (data) => api.post('/journal-entries', data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['journalEntries']);
      }
    }
  );
};

export const useJournalEntriesForMonth = (year, month) => {
  return useQuery(
    ['journalEntries', 'month', year, month],
    () => api.get(`/journal-entries/calendar/month/${year}/${month}`)
  );
};

export const useJournalStats = () => {
  return useQuery(
    ['journalStats'],
    () => api.get('/journal-entries/stats/mood')
  );
};

export const useCurrentStreak = () => {
  return useQuery(
    ['journalStreak'],
    () => api.get('/journal-entries/streak')
  );
};
```

---

### Frontend Design Tokens

Use design system `--v2-*` variables:

```css
/* Journal-specific color additions */
:root.dark {
  --journal-mood-great: #10B981;      /* Green */
  --journal-mood-good: #3B82F6;       /* Blue */
  --journal-mood-okay: #9CA3AF;       /* Gray */
  --journal-mood-struggling: #F59E0B; /* Amber */
  --journal-mood-difficult: #EF4444;  /* Red */
}

/* Calendar styling */
.calendar-day {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
}

.calendar-day--has-entry {
  background: var(--journal-mood-good);
}

.calendar-day--mood-great {
  background: var(--journal-mood-great);
}

/* Mood selector */
.mood-option {
  font-size: 32px;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.mood-option--selected {
  border-color: var(--v2-blue);
  background: var(--v2-bg-tertiary);
}
```

---

## Implementation Tasks

### Phase 1: Backend Foundation (Week 1)

1. **Create JournalEntry Model**
   - [ ] Write `models/JournalEntry.js` with full schema
   - [ ] Add all indexes
   - [ ] Implement instance methods (getMoodEmoji, getFormattedDate)
   - [ ] Implement static methods (ensureOnePerDay, getEntriesForRange, getMoodStats, getPatternsByDayOfWeek, getStreak)
   - [ ] Write model tests
   - **Subtasks:**
     - Test unique index on (userId, entryDate)
     - Test date range queries
     - Test mood statistics aggregation
     - Test streak calculation

2. **Create Journal Service**
   - [ ] Write `services/journalService.js` with business logic
   - [ ] Create entry (validate one per day)
   - [ ] Update entry (preserve entryDate)
   - [ ] Delete entry (soft delete → trash)
   - [ ] Auto-link tasks/events from that date
   - [ ] Archive entry
   - **Subtasks:**
     - Auto-discovery of tasks completed on entryDate
     - Auto-discovery of events on entryDate
     - Validation: entryDate cannot be future (or allow future?)
     - Handle timezone considerations (entryDate should be user's local date)

3. **Create Journal Routes**
   - [ ] Write `routes/journalEntries.js`
   - [ ] POST /api/journal-entries (create)
   - [ ] PATCH /api/journal-entries/:id (update)
   - [ ] GET /api/journal-entries (list with filters: dateRange, mood, tags)
   - [ ] GET /api/journal-entries/:id (detail)
   - [ ] DELETE /api/journal-entries/:id (soft delete)
   - [ ] GET /api/journal-entries/calendar/month/:year/:month (calendar data)
   - [ ] GET /api/journal-entries/stats/mood (mood distribution)
   - [ ] GET /api/journal-entries/stats/patterns (by weekday)
   - [ ] GET /api/journal-entries/streak (current streak)
   - **Subtasks:**
     - Auth checks (requireAuth middleware)
     - Validation for all inputs
     - Test one-entry-per-day constraint
     - Test mood statistics accuracy
     - Test streak calculation
     - Test timezone handling

### Phase 2: Frontend Foundation (Week 2)

4. **Create Feature Folder Structure**
   - [ ] Create `features/journal/` folder
   - [ ] Create all subdirectories (pages, components, hooks, styles)
   - [ ] Create `routes.jsx` with feature routing

5. **Create Core Hooks**
   - [ ] Write `hooks/useJournalEntries.js` (TanStack Query)
   - [ ] Write `hooks/useJournalStats.js`
   - [ ] Write `hooks/useMood.js` (utilities)
   - **Subtasks:**
     - Test query caching behavior
     - Test mutation side effects (invalidation)

6. **Create Base Components**
   - [ ] CalendarGrid.jsx (reusable month view)
   - [ ] MoodSelector.jsx (emoji radio)
   - [ ] LevelSlider.jsx (1-5 energy/focus)
   - [ ] StreakBanner.jsx (motivation)
   - [ ] EntryCard.jsx (summary display)
   - **Subtasks:**
     - Match design system `--v2-*` variables
     - Test keyboard navigation
     - Test mobile responsiveness
     - Test accessibility (ARIA labels, contrast)

### Phase 3: Main Pages (Week 2-3)

7. **Create JournalPage**
   - [ ] Main hub with tabs: Calendar, Insights, Settings
   - [ ] Tab routing logic
   - [ ] Navigation integration (sidebar link)
   - [ ] Responsive layout (mobile: list view, desktop: calendar)

8. **Create CalendarView**
   - [ ] Render CalendarGrid component
   - [ ] Handle month navigation
   - [ ] Display entry indicators (mood-based colors)
   - [ ] Click handling → open EntryView or EntryForm
   - [ ] Performance: optimize for 365+ items

9. **Create EntryForm**
   - [ ] Form with all fields (date, body, learned, mood, energy, focus, tags)
   - [ ] Date picker validation (today or past)
   - [ ] Auto-discover and display linked tasks/events
   - [ ] Save handler (create or update)
   - [ ] Cancel handler
   - [ ] Optimistic updates
   - **Subtasks:**
     - Test one-entry-per-day validation (show error if exists)
     - Test form dirty state (warn before leaving)
     - Test date picker timezone handling
     - Test tag autocomplete
     - Test touch interactions (mobile)

10. **Create EntryView**
    - [ ] Display single entry with all metadata
    - [ ] Linked tasks section (with check icons)
    - [ ] Linked events section
    - [ ] Prev/next day navigation
    - [ ] Edit button → EntryForm
    - [ ] Delete button (with confirmation)
    - [ ] Mood emoji large display
    - [ ] Energy/focus visual gauges
    - **Subtasks:**
      - Test prev/next at month boundaries
      - Test navigation to days without entries
      - Test delete with undo (trash + restore)

11. **Create InsightsView**
    - [ ] Streak banner (current + best)
    - [ ] Mood distribution chart (bar/pie)
    - [ ] Energy/focus by weekday
    - [ ] Statistics cards (total entries, this month)
    - [ ] Date range filter (this month, last 3 months, all time)
    - **Subtasks:**
      - Test chart rendering with various data
      - Test empty state (no entries)
      - Test date range updates
      - Test responsiveness of charts on mobile

### Phase 4: Integration & Polish (Week 3-4)

12. **Auto-Linking Logic**
    - [ ] Query tasks completed on entry date
    - [ ] Query events on entry date
    - [ ] Display as read-only in EntryForm
    - [ ] Allow manual add/remove (future enhancement)

13. **Search & Filter**
    - [ ] Filter by date range
    - [ ] Filter by mood
    - [ ] Filter by tags
    - [ ] Search in body/learned text
    - [ ] Save filters (optional)

14. **Navigation Integration**
    - [ ] Add "Journal" link to sidebar
    - [ ] Add to main navigation
    - [ ] Add keyboard shortcut (e.g., 'J')
    - [ ] Command palette support

15. **Styling & Theming**
    - [ ] Apply `--v2-*` CSS variables
    - [ ] Dark mode support (already in system)
    - [ ] Mobile responsiveness (375px+)
    - [ ] Touch interactions (larger tap targets)
    - [ ] Animations (300ms cubic-bezier transitions)

16. **Testing**
    - [ ] Unit tests for all services
    - [ ] Unit tests for all hooks
    - [ ] Component tests for complex components
    - [ ] E2E test flow: create → view → edit → delete
    - [ ] Streak calculation tests
    - [ ] One-entry-per-day validation tests

17. **Documentation**
    - [ ] Add JournalEntry to `architecture.md`
    - [ ] Add new routes to `architecture.md`
    - [ ] Add new hooks to `architecture.md`
    - [ ] Comment all new code per commenter skill
    - [ ] Create feature README (optional)

---

## Parallel Model Opportunities

These features can be built **simultaneously** with the core journal system:

### 1. Journal Widget for Dashboard

Once JournalEntry model exists, add a dashboard widget:
- Show today's entry (if exists)
- Streak counter
- Quick action button: "Add entry"
- Tomorrow's entry preview (if exists)

**When to build:** Phase 2 or 3 (doesn't block core journal)
**Dependencies:** JournalEntry model, useJournalEntries hook
**Effort:** 8-10 hours

### 2. Reflection Prompts System

Create a PromptTemplate model with optional daily prompts:
- "What went well?"
- "What's one thing you learned?"
- "Who did you help today?"
- "What are you grateful for?"
- User can customize prompts

**When to build:** Phase 2 (can ship without this initially)
**Dependencies:** JournalEntry model only
**Effort:** 6-8 hours

### 3. Mood Integration with Fitness

Correlate mood with fitness activities:
- "On days you exercise, mood is X% better"
- Link journal entries to fitness tracking
- Heatmap: mood vs workouts

**When to build:** Phase 4 (after core + fitness mature)
**Dependencies:** Fitness feature maturity
**Effort:** 12-16 hours

### 4. Export & Archive

Export journal entries as:
- PDF (monthly summary)
- JSON (full backup)
- Plain text (markdown)

**When to build:** Phase 3-4 (lower priority)
**Dependencies:** Core journal + design decisions
**Effort:** 6-10 hours

### 5. Sharing & Collaboration

Share entries with trusted users:
- Share single entry
- Share mood statistics
- Private journal vs shared journal sections

**When to build:** Future (after social features mature)
**Dependencies:** Sharing infrastructure, ItemShare model
**Effort:** 16-20 hours

---

## Parallel Execution Cautions

### CRITICAL: Model Must Exist First

The **JournalEntry model must be fully created and tested** before any parallel work begins.

**Why:**
- All hooks depend on the API
- API depends on the model
- Features like "auto-link tasks" need model logic
- Database schema must be finalized before parallel coding

**Sequential order (non-negotiable):**
1. Model + Service (Phase 1, tasks 1-3)
2. Then: Routes + Hooks (Phase 1-2, tasks 3-5) - can parallelize
3. Then: Components + Pages (Phase 2-4, tasks 6-15) - can parallelize heavily

### Frontend Components CAN Be Built in Parallel

Once hooks exist:
- CalendarGrid, MoodSelector, LevelSlider, EntryCard
- JournalForm, EntryView, CalendarView
- InsightsView, etc.

These are independent and can be built by multiple agents simultaneously.

### Dashboard Widget Can Start Early

Once JournalEntry model and hooks exist (after Phase 1), dashboard widget work can begin in parallel with frontend pages.

---

## Risks & Considerations

### Technical Risks

#### 1. Timezone Handling (Medium Risk)

**Problem:** `entryDate` needs to be user's local date, not UTC. If user in PST creates entry, it should be "Jan 31" not "Feb 1".

**Mitigation:**
- Frontend sends `entryDate` as date string "YYYY-MM-DD" (no time component)
- Backend stores as `new Date(dateString + 'T00:00:00')` → consistent UTC
- Calendar queries use date range: `$gte startOfDay, $lt startOfNextDay`
- Document timezone approach in API docs

#### 2. One-Entry-Per-Day Enforcement (Medium Risk)

**Problem:** Race condition - two simultaneous requests could create two entries for same day.

**Mitigation:**
- Database unique index on `(userId, entryDate)` - this prevents the issue
- Before creating, check `ensureOnePerDay()` and return existing if found
- Return 409 Conflict if collision detected
- Frontend should disable form if entry exists for that date

#### 3. Query Performance on Large Datasets (Low Risk)

**Problem:** If user has 5+ years of entries, calendar queries could slow down.

**Mitigation:**
- Index on `(userId, entryDate)`
- Calendar endpoint returns only dates, not full entries → lightweight
- For insights (aggregations), add date range filter
- Monitor query performance before shipping

#### 4. Auto-Linking Correctness (Medium Risk)

**Problem:** Linking to tasks "from that date" - what if task was created on day 1 but marked done on day 30?

**Mitigation:**
- Link to tasks where `completedAt` date matches entryDate (not createdAt)
- Link to events where `eventDate` matches entryDate
- Document this clearly in code
- Add tests for edge cases (multi-day tasks, recurring events)

### UX Risks

#### 1. Decision: Allow Past/Future Entries? (Design Risk)

**Question:** Should users be able to create entries for the future?

**Options:**
- A: Only today or past (makes sense for journaling - reflection)
- B: Allow future (enables pre-planning, intention-setting)
- C: Past only (strict journaling philosophy)

**Recommendation: Option A** (today or past, based on use case)

**Implementation:**
- Frontend date picker: disable future dates
- Backend validation: reject entryDate > today
- Error message: "You can only journal about today or the past"

#### 2. Empty State UX (Low Risk)

**Problem:** User first uses journal - what do they see?

**Solution:**
- CalendarView shows empty calendar with empty state message
- "Start journaling today" button
- Show example entry or onboarding tooltip
- First entry has all prompts visible (later can minimize)

#### 3. Streak Gamification (Low Risk)

**Problem:** Showing streaks might create unhealthy pressure.

**Solution (Calm Productivity Principle):**
- Show streak but no shame for breaks
- No notifications ("You'll break your streak!")
- No badges or badges (soft design)
- Reframe as "personal consistency tracker" not "high score"

### Data Risks

#### 1. Privacy of Journal Entries (Medium Risk)

**Problem:** Journal entries are personal and sensitive.

**Mitigation:**
- Treat like personal notes - strict user:entry relationship
- No admin access to user journals (even admins respect privacy)
- No sharing by default (explicit user action required)
- Export feature allows user to get their own data
- GDPR compliance: export/delete on request

#### 2. Data Migration from Notes (Low Risk)

**Problem:** Users might want to convert old notes into journal entries.

**Mitigation (Future Feature):**
- Add "Convert to Journal Entry" option on notes
- UI guide: "This note has a custom date" → journal entry is better
- Don't auto-convert (preserve notes as-is)

---

## Anti-Patterns to Avoid

### 1. Don't Make Journal Entries Just Notes with Mood

**Wrong:** Extend Note model with `isJournalEntry` flag.

**Right:** Separate JournalEntry model with purpose-built schema.

### 2. Don't Allow Unlimited Entries Per Day

**Wrong:** Treat like notes - create multiple "journal entries" for one day.

**Right:** Enforce one entry per calendar day (one reflection window).

**Exception:** Could allow "morning reflection" and "evening reflection" as separate system, but start with one.

### 3. Don't Auto-Create Entries

**Wrong:** Daily email with prompts → auto-creates blank entry if not filled.

**Right:** Send optional reminders, user explicitly creates entries.

**Rationale:** Aligns with "calm productivity" - no forced capturing.

### 4. Don't Require All Fields

**Wrong:** Mood, energy, focus, body, learned - all required.

**Right:** Only `entryDate` required, all reflection fields optional.

**Rationale:** Flexibility. User might just want to log mood some days.

### 5. Don't Expose Raw Aggregation Results

**Wrong:** Return MongoDB aggregation results directly to frontend.

**Right:** Format stats as simple objects/numbers for display.

**Example:**
```javascript
// Wrong (technical data model)
{ _id: 'great', count: 8, avgEnergy: 4.6 }

// Right (user-facing format)
{ mood: 'great', emoji: '😁', count: 8, avgEnergy: 4.6 }
```

---

## Success Criteria

Feature is ready to ship when:

1. **Functional**
   - [x] User can create journal entry for any past/today date
   - [x] User can edit existing entry
   - [x] User can view entry with all metadata
   - [x] User can see calendar view of entries
   - [x] User can view insights/stats
   - [x] One entry per calendar day enforced
   - [x] Auto-linking to tasks/events works

2. **Quality**
   - [x] All backend tests passing (services, routes, models)
   - [x] All frontend components tested
   - [x] E2E test: create → view → edit → delete works
   - [x] No console errors on happy path
   - [x] Mobile responsive (375px+)

3. **Design System**
   - [x] Uses `--v2-*` CSS variables
   - [x] Dark mode works
   - [x] Animations smooth (300ms cubic-bezier)
   - [x] Touch targets 44px+
   - [x] Contrast ratios 4.5:1+
   - [x] Typography follows hierarchy (48-64px hero, 32-40px primary, etc.)

4. **Performance**
   - [x] Calendar loads in <500ms (even with 365+ entries)
   - [x] Entry form responds instantly to input
   - [x] Stats/insights load in <1s
   - [x] No unnecessary re-renders

5. **Documentation**
   - [x] Model added to architecture.md
   - [x] Routes documented
   - [x] Hooks documented
   - [x] All code commented per commenter skill standard
   - [x] Feature is discoverable (sidebar, nav integration)

6. **User Experience**
   - [x] Clear empty state (new users understand what to do)
   - [x] Error messages are helpful ("You already have an entry for Jan 31")
   - [x] Success feedback (toast on save)
   - [x] Can navigate between entries (prev/next arrows)
   - [x] Keyboard shortcuts work (if applicable)

---

## Open Questions

These should be answered before implementation begins:

1. **Prompts System:** Should prompts be customizable per user? System-provided templates? Both?
2. **Future Entries:** Strictly past+today, or allow future date planning entries?
3. **Multiple Entries Per Day:** One entry per day enforced, or allow multiple?
4. **Privacy by Default:** Should entries be private by default (sharing opt-in)? Or vice versa?
5. **Notifications:** Send daily prompt reminder? If so, what time? User-configurable?
6. **AI Insights:** Future - generate AI-powered insights from entries? ("You're generally happier on Tuesdays")
7. **Integration with Tasks:** Should completing a task auto-open journal entry dialog? Too aggressive?
8. **Export Format:** What format(s) priority? (PDF, JSON, Markdown, all?)
9. **Streak Terminology:** Call it "streak", "consistency track", "journaling habit"?
10. **Archival:** Can user archive old entries? Should they be hideable but searchable?

---

## Appendix: Inspiration & Reference

### Similar Products & Patterns

- **Day One** (journaling app) - beautiful entry view, markdown support, tagging, statistics
- **Apple Health** (fitness) - the "rings" visual for daily goals (could inspire energy/focus visual)
- **Roam Research** (notes) - daily note pages, backlinking
- **Notion** (all-in-one) - database approach, relational entries
- **Journey** (journaling) - calendar view, mood tracking, search

### Design System References

- `.claude/design/design-system.md` - myBrain color system, typography, anti-patterns
- `.claude/design/design-log.md` - V2 design decisions (Apple Command Center, Material Cockpit)
- `.claude/docs/architecture.md` - Component patterns, modal usage, widget structure

### Code Reuse References

Check these before implementing:
- `components/ui/BaseModal.jsx` - for modals if needed
- `components/ui/Skeleton.jsx` - loading states
- `hooks/useAutoSave.js` - auto-save pattern (might apply)
- `lib/dateUtils.js` - date formatting utilities
- `hooks/useDebounce.js` - debouncing for form inputs

---

## Next Steps

1. **User Feedback** - Review this plan with user
2. **Decision Making** - Answer the 10 open questions
3. **Design Mockups** - Create interactive prototype (HTML/CSS/JS) showing calendar + entry form
4. **API Specification** - Finalize endpoint contracts with examples
5. **Architecture Review** - Senior engineer review of model/service design
6. **Implementation Planning** - Break into 2-week sprints
7. **Begin Phase 1** - Start with backend model + service

---

*Plan created: 2026-01-31*
*Status: Draft - Awaiting User Feedback & Review*
*Model: Claude Haiku 4.5*
