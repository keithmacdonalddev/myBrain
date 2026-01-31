# HABIT TRACKER FEATURE PLAN

> **⚠️ ROUGH DRAFT - NOT APPROVED**
>
> This document is a planning draft created for review and discussion.
> Implementation should not begin until this plan receives senior engineer approval.

---

## Metadata

| Property | Value |
|----------|-------|
| **Created By** | Claude Haiku 4.5 |
| **Date Created** | 2026-01-31 |
| **Status** | Draft - Not Approved |
| **Priority** | Medium-High (engagement driver) |
| **Complexity** | Medium |
| **Estimated Effort** | 80-120 dev hours |

---

## Executive Summary

The Habit Tracker feature enables users to build and maintain consistent daily practices through streak tracking, completion grids, and visual motivation. This addresses a core user need: converting one-off task completion into sustained behavioral change through daily commitment and visible progress.

Unlike one-time tasks, habits are **practices to maintain consistently over time**, requiring specialized models, recurrence logic, and streak calculation that differ fundamentally from Task behavior.

---

## Why This Feature

### Problem Statement

Users can create tasks and check them off, but they lack a structured way to build and maintain consistent daily practices. Current system issues:

1. **No recurrence for tasks** - Tasks are one-off, not recurring patterns
2. **No streak visibility** - Users can't see how many days they've maintained a practice
3. **No accountability view** - No weekly/monthly grid to show gaps and consistency
4. **Generic task model** - Habits behave differently from regular tasks (different fields, logic, UI)
5. **Lost motivation** - No visual feedback for building momentum

### User Story: Building an Exercise Habit

```
As a user trying to build an exercise habit,
I want to check off a daily workout each day,
So that I can see my streak grow and maintain motivation
even when I miss occasional days.

Acceptance Criteria:
- I can create a habit: "30-minute workout"
- I check it off each day I do it
- I see my current streak ("15 days in a row")
- I see my best streak ("47 days in August 2025")
- I see a weekly grid showing which days I completed it
- If I miss a day, my active streak resets (or grace period applies)
- I can review past months to see consistency patterns
```

### Origin

Habit formation is well-researched: consistent daily practice + visible progress = behavior change. Users repeatedly request recurring task systems. Separating habits from tasks allows:
- Specialized UI (calendars, grids, streak counters)
- Streak logic (without complicating Task model)
- Flexible scheduling (daily, weekdays-only, specific days)
- Motivational features (best streak, weekly heatmaps)

---

## Critical Decision: Separate Models vs Extending Task

### Recommendation: CREATE SEPARATE HABIT + HABITLOG MODELS

**Why separate models are better:**

| Aspect | Task | Habit |
|--------|------|-------|
| **Recurrence** | None | Required (daily, weekly, custom) |
| **Due Date** | Specific date | Ongoing, repeats forever |
| **Completion** | Check off once | Check off daily for X days |
| **Status** | todo/in_progress/done/cancelled | "active" / "paused" / "archived" |
| **Tracking** | Completion is success | Streak is key metric |
| **Calendar** | Shows single event | Shows daily pattern grid |
| **Data** | ~300 lines fields | ~200 lines (smaller, focused) |
| **Workflow** | "Do this thing" | "Do this thing every day" |

**Architectural benefits:**
1. **Cleaner code** - Habit model doesn't carry unused Task fields (attachments, project links, priority)
2. **Specialized logic** - Streak calculation, grace periods, recurrence don't clutter Task service
3. **Better performance** - HabitLog entries (small, frequent) separate from Task history
4. **UI clarity** - Habit UI focused on streaks/grids, not task status/priority
5. **Future growth** - Habit features (challenges, social streaks, milestones) don't affect Tasks

**Counterargument addressed:**
- "Tasks and habits are both things to do" → **False parity**: Habits are behavioral patterns, tasks are discrete actions. Different models, same principle.

### Table of Contents
1. [Data Model Design](#data-model-design)
2. [API Routes & Endpoints](#api-routes--endpoints)
3. [Frontend Architecture](#frontend-architecture)
4. [Streak Logic & Edge Cases](#streak-logic--edge-cases)
5. [Parallel Model Opportunities](#parallel-model-opportunities)
6. [Parallel Execution Cautions](#parallel-execution-cautions)
7. [Visual Mockups](#visual-mockups)
8. [Implementation Phases](#implementation-phases)
9. [Testing Strategy](#testing-strategy)
10. [Risks & Mitigation](#risks--mitigation)

---

## Data Model Design

### Habit Model (Backend)

```javascript
/**
 * Habit.js
 * Mongoose model for user habits - daily/weekly recurring practices
 */

const habitSchema = new mongoose.Schema({
  // OWNERSHIP & IDENTITY
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true  // Fast lookup by user
  },

  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    example: "Morning meditation", "Read 30 minutes", "Workout"
  },

  description: {
    type: String,
    maxlength: 500,
    trim: true,
    example: "10 minutes of mindfulness meditation"
  },

  // RECURRENCE PATTERN (iCalendar-like but simplified)
  schedule: {
    frequency: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'CUSTOM'],
      default: 'DAILY',
      description: "How often does this habit repeat?"
    },

    // For DAILY: which days of week? (0=Sun, 6=Sat)
    daysOfWeek: {
      type: [Number],
      default: [1, 2, 3, 4, 5],  // Mon-Fri default
      validate: {
        validator: (v) => v.every(d => d >= 0 && d <= 6),
        message: "Days must be 0-6 (Sun-Sat)"
      },
      description: "0=Sunday, 1=Monday... 6=Saturday"
    },

    // For CUSTOM: specific dates per month
    customDates: {
      type: [Number],
      // e.g., [1, 15] = 1st and 15th of every month
      validate: {
        validator: (v) => v.every(d => d >= 1 && d <= 31),
        message: "Dates must be 1-31"
      }
    },

    startDate: {
      type: Date,
      default: Date.now,
      description: "When did user start this habit?"
    }
  },

  // STATUS
  status: {
    type: String,
    enum: ['active', 'paused', 'archived'],
    default: 'active',
    description: "active = tracking; paused = not tracking; archived = old habit"
  },

  // STREAK TRACKING
  currentStreak: {
    count: {
      type: Number,
      default: 0,
      description: "Days in current consecutive streak"
    },
    startDate: {
      type: Date,
      description: "When did current streak start?"
    },
    lastLoggedDate: {
      type: Date,
      description: "Last day user logged this habit"
    }
  },

  bestStreak: {
    count: {
      type: Number,
      default: 0,
      description: "Longest streak ever achieved"
    },
    startDate: {
      type: Date,
      description: "When did best streak start?"
    },
    endDate: {
      type: Date,
      description: "When did best streak end?"
    }
  },

  // GRACE PERIOD (optional)
  gracePeriodDays: {
    type: Number,
    default: 0,
    description: "Days user can miss before streak resets (0 = no grace period)"
  },

  // METADATA
  color: {
    type: String,
    default: '#8B5CF6',  // Default purple from design system
    description: "Habit color in UI (hex code)"
  },

  category: {
    type: String,
    enum: ['health', 'productivity', 'learning', 'wellness', 'other'],
    default: 'other',
    description: "Optional categorization for filtering"
  },

  lifeAreaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LifeArea',
    description: "Link to user's life areas for organization"
  },

  // ENGAGEMENT METRICS
  totalCompletions: {
    type: Number,
    default: 0,
    description: "Total days habit was logged (cumulative)"
  },

  weeklyStats: [{
    weekStartDate: Date,
    completions: Number,  // 0-7 days completed
    _id: false
  }],

  // REMINDERS (future feature)
  reminder: {
    enabled: {
      type: Boolean,
      default: false
    },
    time: {
      type: String,
      // e.g., "09:00" for 9 AM
    },
    type: {
      type: String,
      enum: ['notification', 'email'],
      default: 'notification'
    }
  },

  // TIMESTAMPS
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'habits'
});

// INDEX FOR FAST QUERIES
habitSchema.index({ userId: 1, status: 1 });  // User's active habits
habitSchema.index({ userId: 1, 'schedule.startDate': -1 });  // By creation date

module.exports = mongoose.model('Habit', habitSchema);
```

### HabitLog Model (Backend)

```javascript
/**
 * HabitLog.js
 * Mongoose model for daily habit completions
 * One entry per day a user logs a habit (compact logging)
 */

const habitLogSchema = new mongoose.Schema({
  // OWNERSHIP
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  habitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Habit',
    required: true,
    index: true
  },

  // DATE LOGGED
  date: {
    type: Date,
    required: true,
    description: "Which date was this completed? (stored as YYYY-MM-DD for consistency)"
  },

  // COMPLETION INFO
  completed: {
    type: Boolean,
    default: true,
    description: "true = logged today; false = marked as skipped/grace period"
  },

  notes: {
    type: String,
    maxlength: 500,
    trim: true,
    description: "Optional user notes about today's completion"
  },

  // STREAK AT TIME OF LOGGING
  streakCountAtTime: {
    type: Number,
    description: "What was streak count when user logged this? (for history)"
  },

  // TIMESTAMPS
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'habitlogs'
});

// UNIQUE CONSTRAINT: One entry per user+habit+date
habitLogSchema.index({ userId: 1, habitId: 1, date: 1 }, { unique: true });

// FAST QUERIES
habitLogSchema.index({ habitId: 1, date: 1 });  // By date range
habitLogSchema.index({ userId: 1, date: 1 });  // All user logs on date

module.exports = mongoose.model('HabitLog', habitLogSchema);
```

### Data Storage Design

**Habit Fields Summary:**
- Core identity: userId, name, description (30 bytes)
- Recurrence: schedule object (100 bytes)
- Streak tracking: currentStreak, bestStreak (80 bytes)
- Metadata: color, category, lifeAreaId (50 bytes)
- Engagement: totalCompletions, weeklyStats array (variable)
- **Total per habit: ~300 bytes**

**HabitLog Fields Summary:**
- Ownership: userId, habitId (50 bytes)
- Date logged: date (8 bytes)
- Completion: completed boolean, notes (variable)
- Streak history: streakCountAtTime (8 bytes)
- Timestamps: createdAt, updatedAt (16 bytes)
- **Total per log entry: ~80-200 bytes**

**Estimated Storage (Year 1):**
- 100 users × 5 habits each = 500 habits = ~150 KB
- 500 habits × 300 logged days = 150,000 logs = ~15-30 MB
- **Very efficient** - can scale easily

---

## API Routes & Endpoints

### Backend: Express Routes (habits.js)

```javascript
/**
 * GET /api/habits
 * Get all habits for current user
 * Query: ?status=active (filter by status)
 * Query: ?category=health (filter by category)
 */
router.get('/', requireAuth, getHabits);

/**
 * POST /api/habits
 * Create new habit
 * Body: {
 *   name: string (required)
 *   description: string
 *   schedule: {
 *     frequency: 'DAILY' | 'WEEKLY' | 'CUSTOM'
 *     daysOfWeek: [0-6]
 *     customDates: [1-31]
 *   }
 *   gracePeriodDays: number
 * }
 */
router.post('/', requireAuth, createHabit);

/**
 * GET /api/habits/:id
 * Get single habit with full details
 */
router.get('/:id', requireAuth, getHabit);

/**
 * PATCH /api/habits/:id
 * Update habit (name, schedule, status, reminder settings)
 * Body: { name?, schedule?, status?, ... }
 */
router.patch('/:id', requireAuth, updateHabit);

/**
 * DELETE /api/habits/:id
 * Soft delete (archive) habit
 */
router.delete('/:id', requireAuth, deleteHabit);

/**
 * GET /api/habits/:id/logs?startDate=2026-01-01&endDate=2026-01-31
 * Get habit logs for date range (for weekly/monthly grids)
 */
router.get('/:id/logs', requireAuth, getHabitLogs);

/**
 * POST /api/habits/:id/log
 * Log habit completion for today
 * Body: {
 *   date: string (YYYY-MM-DD, default = today)
 *   completed: boolean
 *   notes: string
 * }
 * Returns: Updated streak info, new HabitLog
 */
router.post('/:id/log', requireAuth, logHabit);

/**
 * DELETE /api/habits/:id/log/:date
 * Remove a log entry (undo a day's completion)
 * Recalculates streak immediately
 */
router.delete('/:id/log/:date', requireAuth, deleteHabitLog);

/**
 * GET /api/habits/:id/stats
 * Get habit statistics for overview
 * Returns: currentStreak, bestStreak, totalCompletions, weeklyStats, monthlyStats
 */
router.get('/:id/stats', requireAuth, getHabitStats);

/**
 * GET /api/habits/dashboard/summary
 * Get summary of all habits for dashboard widget
 * Returns: [{ name, currentStreak, color, status }, ...]
 */
router.get('/dashboard/summary', requireAuth, getHabitsSummary);
```

### Backend Service: habitService.js

```javascript
/**
 * habitService.js
 * Business logic for habit operations
 */

export class HabitService {
  /**
   * calculateStreak(habitId, upToDate)
   * Calculate current streak by counting consecutive logged days
   * Working backward from upToDate until finding first gap
   *
   * Returns: { count, startDate, lastLoggedDate }
   */
  async calculateStreak(habitId, upToDate = new Date()) { }

  /**
   * shouldLogToday(habit)
   * Check if habit should be logged today based on schedule
   *
   * Example: Habit with daysOfWeek=[1,2,3,4,5] (Mon-Fri)
   * Should NOT log on Saturday/Sunday
   *
   * Returns: boolean
   */
  shouldLogToday(habit) { }

  /**
   * logHabit(userId, habitId, date, notes)
   * Log a habit completion and recalculate streaks
   * Called when user checks off habit for a day
   *
   * Side effects:
   * - Creates HabitLog entry
   * - Updates Habit.currentStreak
   * - Updates Habit.bestStreak if beat
   * - Updates Habit.totalCompletions
   * - Logs Wide Events analytics
   *
   * Returns: { habit, log, streakInfo }
   */
  async logHabit(userId, habitId, date, notes) { }

  /**
   * handleMissedDay(habitId, date)
   * Called periodically to check if user missed a day
   * If gracePeriodDays=0, resets streak immediately
   * If gracePeriodDays>0, allows days to be skipped
   *
   * Returns: { streakReset: boolean, newStreakCount: number }
   */
  async handleMissedDay(habitId, date) { }

  /**
   * getMonthlyGrid(habitId, year, month)
   * Get habit logs for visual calendar grid
   * Used to render GitHub-style heatmap
   *
   * Returns: Array of { date, completed, notes }
   */
  async getMonthlyGrid(habitId, year, month) { }

  /**
   * getWeeklyGrid(habitId, weekStartDate)
   * Get habit logs for current/past weeks
   *
   * Returns: Array<{ weekStart, days: [{date, completed}] }>
   */
  async getWeeklyGrid(habitId, weekStartDate) { }
}
```

---

## Frontend Architecture

### Feature Structure

```
myBrain-web/src/features/habits/
├── routes.jsx                      # Feature routing
├── pages/
│   ├── HabitsPage.jsx             # Main habits list page
│   ├── HabitDetailPage.jsx        # Single habit view with calendar grid
│   └── CreateHabitPage.jsx        # New habit creation flow
├── components/
│   ├── HabitCard.jsx              # Card in habits list
│   ├── HabitList.jsx              # List of user's habits
│   ├── StreakBadge.jsx            # "15 days" visual badge
│   ├── WeeklyGrid.jsx             # 7-day completion grid
│   ├── MonthlyGrid.jsx            # Month-long calendar heatmap
│   ├── LogModal.jsx               # Quick log (check off today)
│   ├── HabitForm.jsx              # Create/edit habit form
│   ├── ScheduleSelector.jsx       # UI for frequency/days selection
│   └── HabitStats.jsx             # Streak/completion stats display
├── hooks/
│   ├── useHabits.js               # TanStack Query for habits list
│   ├── useHabit.js                # TanStack Query for single habit
│   ├── useHabitLogs.js            # TanStack Query for date range logs
│   └── useHabitActions.js         # Mutations (create, log, delete)
├── services/
│   └── habitApi.js                # API client
└── styles/
    └── habits.css                 # Feature-specific styles
```

### Key Components

**HabitCard.jsx** - Compact habit display in list
```jsx
<HabitCard
  habit={{ name: "Morning Meditation", currentStreak: 15 }}
  onLog={() => logHabit()}  // Quick log
  onEdit={() => navigate(`/habits/${id}/edit`)}
/>
// Shows:
// - Name + description
// - Streak badge ("15 days")
// - Today's status (logged/not logged)
// - Action buttons (log, more, edit)
```

**WeeklyGrid.jsx** - Last 7 days at a glance
```jsx
<WeeklyGrid
  logs={[
    { date: '2026-01-25', completed: true },
    { date: '2026-01-26', completed: true },
    { date: '2026-01-27', completed: false },  // Missed
    { date: '2026-01-28', completed: true },
    // ...
  ]}
  onDayClick={(date) => showLogModal(date)}
/>
// Renders: [✓] [✓] [ ] [✓] [✓] [✓] [✓]
// Color coded, clickable
```

**MonthlyGrid.jsx** - GitHub-style heatmap
```jsx
<MonthlyGrid
  habitId={id}
  month={new Date()}
  logs={monthlyLogs}
/>
// Renders calendar grid:
// Row = week, Column = day
// Color intensity = completion streak
// Dark = 0 days, Medium = 1-5, Light = 6-10, etc.
```

**StreakBadge.jsx** - Motivational display
```jsx
<StreakBadge
  currentStreak={15}
  bestStreak={47}
  isToday={true}
/>
// Shows:
// "15 🔥" (current)
// "Best: 47 days in Aug"
// Green indicator if logged today
```

### Frontend Hooks & Queries

```javascript
// hooks/useHabits.js
export function useHabits(status = 'active') {
  return useQuery({
    queryKey: ['habits', status],
    queryFn: () => api.get(`/habits?status=${status}`),
  });
}

// hooks/useHabitLogs.js
export function useHabitLogs(habitId, startDate, endDate) {
  return useQuery({
    queryKey: ['habitLogs', habitId, startDate, endDate],
    queryFn: () => api.get(`/habits/${habitId}/logs`, {
      params: { startDate, endDate }
    }),
  });
}

// hooks/useHabitActions.js
export function useLogHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ habitId, date, notes }) =>
      api.post(`/habits/${habitId}/log`, { date, notes }),
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habitLogs'] });
      // Show toast: "Logged!"
    },
  });
}
```

---

## Streak Logic & Edge Cases

### Core Streak Algorithm

```javascript
/**
 * calculateCurrentStreak(habitId, upToDate = today)
 *
 * Algorithm:
 * 1. Load all HabitLog entries for habitId where date <= upToDate
 * 2. Sort by date descending (newest first)
 * 3. Starting from upToDate, count backward until:
 *    a. Missing log entry (no log for that date) → BREAK
 *    b. Log entry marked completed=false (user skipped) → BREAK
 *    c. Log entry marked completed=true (user logged) → continue
 * 4. Return count of consecutive completed days
 *
 * Edge Cases Handled:
 * - Habit created mid-week: Start streak from first day user logs
 * - User logs out of order (e.g., log day 5 before day 3): Only consecutive
 * - Habit with daysOfWeek=[1-5]: Only check Mon-Fri; skip Sat/Sun
 * - Today is Saturday but habit is Mon-Fri only: Don't require today's log
 */

async calculateCurrentStreak(habitId, upToDate = new Date()) {
  const habit = await Habit.findById(habitId);
  const logs = await HabitLog.find({ habitId })
    .sort({ date: -1 });

  let streakCount = 0;
  let currentDate = upToDate;
  let streakStartDate = null;

  while (currentDate) {
    // Should this day be logged for this habit?
    if (!shouldLogToday(habit, currentDate)) {
      // Skip this date (e.g., weekend for weekday habit)
      currentDate = subDays(currentDate, 1);
      continue;
    }

    // Was this day logged?
    const log = logs.find(l =>
      isSameDay(l.date, currentDate) && l.completed
    );

    if (log) {
      streakCount++;
      streakStartDate = currentDate;
      currentDate = subDays(currentDate, 1);
    } else {
      // Found a gap, streak ends
      break;
    }

    // Prevent infinite loop for very old habits
    if (streakCount > 1000) break;
  }

  return {
    count: streakCount,
    startDate: streakStartDate,
    lastLoggedDate: upToDate
  };
}
```

### Grace Periods: Handling Missed Days

```javascript
/**
 * Example: gracePeriodDays = 2
 * User logs habit Mon, Tue, Wed
 * User misses Thurs, Fri (2 days)
 * User logs again on Saturday
 * → Streak continues! (within grace period)
 *
 * If user misses Sun, Mon, Tue (3 days) → Streak resets
 */

async logHabit(userId, habitId, date, notes) {
  const habit = await Habit.findById(habitId);
  const { gracePeriodDays = 0 } = habit;

  // Create HabitLog
  let log = await HabitLog.create({
    userId,
    habitId,
    date,
    notes,
    completed: true
  });

  // Check if streak should be recalculated or continued
  const lastLog = await HabitLog.findOne({ habitId })
    .sort({ date: -1 })
    .limit(1);

  if (!lastLog) {
    // First ever log, streak starts today
    habit.currentStreak = { count: 1, startDate: date };
  } else {
    const daysSinceLastLog = daysBetween(lastLog.date, date);

    if (daysSinceLastLog === 1) {
      // Logged yesterday, increment streak
      habit.currentStreak.count++;
      habit.currentStreak.lastLoggedDate = date;
    } else if (daysSinceLastLog <= gracePeriodDays + 1) {
      // Within grace period, streak continues
      habit.currentStreak.count += daysSinceLastLog;
      habit.currentStreak.lastLoggedDate = date;
    } else {
      // Outside grace period, streak resets
      habit.currentStreak = {
        count: 1,
        startDate: date,
        lastLoggedDate: date
      };
    }
  }

  // Update best streak if beaten
  if (habit.currentStreak.count > habit.bestStreak.count) {
    habit.bestStreak = {
      count: habit.currentStreak.count,
      startDate: habit.currentStreak.startDate,
      endDate: date
    };
  }

  habit.totalCompletions++;
  await habit.save();

  return { habit, log };
}
```

### Handling Frequency Schedules

```javascript
/**
 * shouldLogToday(habit, date)
 *
 * Checks if a habit should be logged on a specific date
 * based on its recurrence schedule
 */

function shouldLogToday(habit, date) {
  const { schedule } = habit;
  const dayOfWeek = getDay(date);  // 0=Sun, 6=Sat

  switch (schedule.frequency) {
    case 'DAILY':
      // Check if dayOfWeek is in daysOfWeek list
      return schedule.daysOfWeek.includes(dayOfWeek);

    case 'WEEKLY':
      // For now, treat same as DAILY (repeats same days each week)
      return schedule.daysOfWeek.includes(dayOfWeek);

    case 'CUSTOM':
      // Check if date's day-of-month is in customDates
      return schedule.customDates.includes(getDate(date));

    default:
      return false;
  }
}

// Example: Weekday workout (Mon-Fri)
const habit = {
  schedule: {
    frequency: 'DAILY',
    daysOfWeek: [1, 2, 3, 4, 5]  // Mon-Fri
  }
};

shouldLogToday(habit, new Date('2026-02-01')); // Sunday? false
shouldLogToday(habit, new Date('2026-02-02')); // Monday? true
```

### Missing Data Detection

```javascript
/**
 * periodicalTask: Check for missed habits
 * Run daily at midnight in each user's timezone
 *
 * For each active habit:
 * 1. Get yesterday's date
 * 2. Check if habit should have been logged yesterday
 * 3. Check if HabitLog exists for yesterday
 * 4. If missing and > gracePeriodDays since last log → Streak resets
 *
 * This prevents stale streaks from users who don't open app daily
 */

async function checkForMissedHabits() {
  const yesterday = subDays(new Date(), 1);

  const activeHabits = await Habit.find({ status: 'active' });

  for (const habit of activeHabits) {
    if (!shouldLogToday(habit, yesterday)) continue;

    const log = await HabitLog.findOne({
      habitId: habit._id,
      date: yesterday
    });

    if (!log) {
      // Habit wasn't logged yesterday
      // Check grace period
      const lastLog = await HabitLog.findOne({
        habitId: habit._id
      }).sort({ date: -1 });

      const daysSinceLast = daysBetween(lastLog?.date, yesterday);

      if (daysSinceLast > habit.gracePeriodDays) {
        // Streak resets
        habit.currentStreak = { count: 0 };
        await habit.save();
        // Notify user? Optional
      }
    }
  }
}
```

---

## Parallel Model Opportunities

### Build Alongside Habit Tracker

These features leverage existing habit infrastructure and can start development simultaneously:

#### 1. **Habit Dashboard Widget** (Low-Hanging Fruit)
- **What**: Quick habit summary on dashboard (same as proposed DashboardV2)
- **Depends on**: Habit model + basic API routes
- **Not blocked by**: Full UI implementation
- **Effort**: 6-8 hours frontend
- **Start**: Week 1 of Phase 1

#### 2. **Weekly Stats Aggregation** (Medium)
- **What**: "You completed 4/5 workouts this week"
- **Depends on**: HabitLog model + stats calculation
- **Example output**: `weeklyStats: [{ week: '2026-01', completions: 4 }, ...]`
- **Effort**: 4-6 hours backend service
- **Start**: Phase 1, parallel with core features

#### 3. **Habit Challenges** (Future - Blocked)
- **What**: "30-day workout challenge" - users join group challenges
- **Depends on**: Habit model + social infrastructure
- **Blocked by**: Multi-user challenge logic
- **Effort**: 30-40 hours
- **Start**: Phase 2 (after core features stable)

#### 4. **Mobile Native Notifications** (Low - Can add anytime)
- **What**: Daily reminders to log habits
- **Depends on**: Reminder fields in Habit model
- **Example**: "Have you meditated today?"
- **Effort**: 8-10 hours
- **Start**: Phase 2, parallel implementation

#### 5. **Habit Archive & Statistics** (Medium)
- **What**: View past habits and performance trends
- **Depends on**: HabitLog data + stats queries
- **Example**: "Best month: August 2025 (45 workouts)"
- **Effort**: 6-8 hours
- **Start**: Phase 2

#### 6. **CSV Export & Analytics** (Low)
- **What**: Export habit data for personal analytics
- **Depends on**: HabitLog model + query optimization
- **Effort**: 4-6 hours
- **Start**: Phase 2 or later

### Parallel Development Strategy

```
PHASE 1 (2 weeks)
├─ Backend
│  ├─ Habit model (parallel: 4 devs → 1 day)
│  ├─ HabitLog model (parallel: 4 devs → 1 day)
│  ├─ habitService.js (parallel: 2 devs → 3 days)
│  └─ Routes + CRUD (parallel: 2 devs → 2 days)
│
├─ Frontend (Parallel with backend)
│  ├─ useHabits hook (1 dev → 2 days)
│  ├─ HabitsPage layout (1 dev → 3 days)
│  ├─ HabitCard + List (1 dev → 2 days)
│  └─ Create/Edit Forms (1 dev → 3 days)
│
└─ Tests (Parallel throughout)
   ├─ Model tests (1 dev → 1 day)
   ├─ Service tests (1 dev → 2 days)
   └─ Route tests (1 dev → 2 days)

PHASE 2 (1-2 weeks)
├─ WeeklyGrid + MonthlyGrid visualization
├─ Streak calculation + edge case handling
├─ Dashboard widget integration
└─ Polish + bug fixes
```

---

## Parallel Execution Cautions

### CRITICAL: Streak Logic is Tricky

**Absolute Requirement:** Streak calculation must be tested exhaustively before shipping.

**Why this is risky:**
1. **Users will notice immediately** - "My 47-day streak vanished!"
2. **Data is precious** - Streaks are motivational; losing them breaks trust
3. **Edge cases are subtle**:
   - Grace periods + multiple users = complex logic
   - Timezone handling (user in NY, server in UTC)
   - Leap years, daylight saving time
   - Concurrent requests (user logs same day twice)

### Test Requirements

**Required test coverage for streak logic:**

| Case | Test | Importance |
|------|------|-----------|
| Simple consecutive logs (5 days) | Daily increment | Critical |
| Gap resets streak | Missing day → count=0 | Critical |
| Grace period extends streak | Miss 2 days, grace=2, logs on day 3 → streak continues | Critical |
| Grace period expires | Miss 3 days, grace=2, logs on day 4 → streak resets | Critical |
| Out-of-order logs | Log day 3, then day 1 → only consecutive counted | High |
| Weekday habits | Habit Mon-Fri only → don't penalize Sat/Sun | High |
| Timezone edge cases | User in NY, logs at 11:59 PM Dec 31 → date stored correctly | High |
| Concurrent logs | User clicks "log" twice in 1 second → idempotent, no double-count | High |
| Best streak tracking | After resetting, beats new best → updates bestStreak | Medium |
| Very long streaks | 500+ day streak → no performance degrade | Medium |

### Execution Order

**DO NOT parallelize streak-related code:**

```
✅ OK to parallelize:
  - Habit CRUD (create, read, update delete)
  - HabitLog basic create
  - Form validation
  - UI components (WeeklyGrid, MonthlyGrid, StreakBadge)

⚠️ Serialize these:
  1. HabitService.calculateStreak() → tested in isolation
  2. HabitService.logHabit() → depends on #1
  3. HabitService.handleMissedDay() → depends on #1
  4. All streak-related tests → run together, verify consistency
  5. Integration tests (E2E) → test streak edge cases end-to-end
  6. Frontend streak display → only after backend verified

❌ NEVER parallelize:
  - Multiple developers working on calculateStreak()
  - Shipping without exhaustive edge case tests
  - UI before backend streak logic verified
```

### Code Review Checkpoints

**Before merging to main:**

1. **Backend streak logic**
   - [ ] All edge case tests passing
   - [ ] Code reviewer approved (`/code-reviewer` skill)
   - [ ] calculateStreak() thoroughly commented
   - [ ] No floating-point date math (use date libraries)

2. **Frontend streak display**
   - [ ] Shows actual streak value from backend
   - [ ] No hardcoded test data
   - [ ] Handles loading states gracefully
   - [ ] Design audit passed (`/design-audit` skill)

3. **Integration**
   - [ ] E2E test: Log 5 days → verify streak = 5
   - [ ] E2E test: Miss 1 day → verify streak resets
   - [ ] E2E test: Grace period working
   - [ ] Smoke test passing (`/smoke-test` skill)

---

## Visual Mockups

### ASCII Mockups

#### 1. Habits List Page

```
╔══════════════════════════════════════════════════════════════════╗
║  HABITS                                    [+ New Habit]         ║
║                                                                  ║
║  Active Habits (4)                         Filter: All | Paused  ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  ┌─ Morning Meditation  ────────────────────────────────────┐   ║
║  │ 10 minutes mindfulness                                    │   ║
║  │                                                           │   ║
║  │ 🔥 15 days    Best: 47 days                    ✓ Logged  │   ║
║  │                                                           │   ║
║  │ [Edit] [More options ▼]               [Log Now]          │   ║
║  └───────────────────────────────────────────────────────────┘   ║
║                                                                  ║
║  ┌─ 30-Minute Workout  ─────────────────────────────────────┐   ║
║  │ Weights or cardio                                         │   ║
║  │                                                           │   ║
║  │ 🔥 8 days    Best: 21 days               ✗ Not logged    │   ║
║  │                                                           │   ║
║  │ [Edit] [More options ▼]               [Log Now]          │   ║
║  └───────────────────────────────────────────────────────────┘   ║
║                                                                  ║
║  ┌─ Read 30 Minutes  ───────────────────────────────────────┐   ║
║  │ Fiction or non-fiction                                    │   ║
║  │                                                           │   ║
║  │ 🔥 34 days    Best: 34 days                 ✓ Logged     │   ║
║  │                                                           │   ║
║  │ [Edit] [More options ▼]               [Log Now]          │   ║
║  └───────────────────────────────────────────────────────────┘   ║
║                                                                  ║
║  Paused Habits (1)                                               ║
╠══════════════════════════════════════════════════════════════════╣
║  · Piano Practice  (Paused since Dec 15)  [Resume] [Delete]    ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

#### 2. Habit Detail Page (With Weekly & Monthly Grid)

```
╔══════════════════════════════════════════════════════════════════╗
║  Morning Meditation                [Edit] [More options ▼]       ║
║  10 minutes mindfulness meditation                               ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  STREAK OVERVIEW                                                 ║
║  ┌──────────────────────────────────────────────────────────┐   ║
║  │ Current: 🔥 15 days                                       │   ║
║  │ Best: 47 days (August 2025)                              │   ║
║  │ Total Completions: 124 days                              │   ║
║  │ Week: 5/7 completed                                      │   ║
║  └──────────────────────────────────────────────────────────┘   ║
║                                                                  ║
║  THIS WEEK                                                       ║
║  ┌──────────────────────────────────────────────────────────┐   ║
║  │ Sun  Mon  Tue  Wed  Thu  Fri  Sat                        │   ║
║  │  ✓    ✓    ✓    ✗    ✓    ✓    ✓                        │   ║
║  │ Jan 26 27   28   29   30  31  Feb 1                      │   ║
║  └──────────────────────────────────────────────────────────┘   ║
║   [Click a day to see/edit notes]                                ║
║                                                                  ║
║  FEBRUARY 2026 HEATMAP                                           ║
║  ┌──────────────────────────────────────────────────────────┐   ║
║  │ Week  Sun  Mon  Tue  Wed  Thu  Fri  Sat                  │   ║
║  │  1     □    ■    ■    ■    ■    ■    ■                  │   ║
║  │  2     ■    ■    ■    ■    □    ■    ■                  │   ║
║  │  3     ■    ■    ■    ■    ■    ■    ■                  │   ║
║  │  4     ■    ■    ■    ■    ■    □    □                  │   ║
║  │                                                           │   ║
║  │ ■ = Completed  □ = Missed  • = Partial                  │   ║
║  │ Darker = longer streak                                   │   ║
║  └──────────────────────────────────────────────────────────┘   ║
║                                                                  ║
║  STATISTICS                                                      ║
║  ┌──────────────────────────────────────────────────────────┐   ║
║  │ Jan 2026:  26/31 (84%)   Feb 2026:  20/28 (71%)         │   ║
║  │ Mar 2026:  31/31 (100%)  Apr 2026:  30/30 (100%)        │   ║
║  │                                                           │   ║
║  │ Best Month: April 2026 (100%)                            │   ║
║  │ Lifetime Completion Rate: 87%                            │   ║
║  └──────────────────────────────────────────────────────────┘   ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

#### 3. Create/Edit Habit Form

```
╔══════════════════════════════════════════════════════════════════╗
║  New Habit                                               [×]      ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Habit Name *                                                    ║
║  ┌──────────────────────────────────────────────────────────┐   ║
║  │ Morning Meditation                                       │   ║
║  └──────────────────────────────────────────────────────────┘   ║
║                                                                  ║
║  Description                                                     ║
║  ┌──────────────────────────────────────────────────────────┐   ║
║  │ 10 minutes of mindfulness meditation                     │   ║
║  └──────────────────────────────────────────────────────────┘   ║
║                                                                  ║
║  Frequency *                                                     ║
║  ┌─────────────────┐                                            ║
║  │ ● Daily         │                                            ║
║  │ ○ Weekly        │                                            ║
║  │ ○ Custom        │                                            ║
║  └─────────────────┘                                            ║
║                                                                  ║
║  Which days? (for Daily habits)                                 ║
║  ┌──────────────────────────────────────────────────────────┐   ║
║  │ ☑ Monday     ☑ Tuesday    ☑ Wednesday   ☑ Thursday      │   ║
║  │ ☑ Friday     ☐ Saturday   ☐ Sunday                       │   ║
║  └──────────────────────────────────────────────────────────┘   ║
║                                                                  ║
║  Grace Period Days (miss this many and keep your streak)        ║
║  ┌──────────────┐                                               ║
║  │ 0 days       │  (any gap resets streak)                     ║
║  └──────────────┘                                               ║
║                                                                  ║
║  Color                                                           ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │ ● Purple   ○ Blue    ○ Green   ○ Red    ○ Orange        │   ║
║  │ ○ Pink     ○ Indigo  ○ Cyan    ○ Amber                  │   ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                  ║
║  Category                                                        ║
║  ┌─────────────────┐                                            ║
║  │ ● Health        │                                            ║
║  │ ○ Productivity  │                                            ║
║  │ ○ Learning      │                                            ║
║  │ ○ Wellness      │                                            ║
║  │ ○ Other         │                                            ║
║  └─────────────────┘                                            ║
║                                                                  ║
║  Reminders (future feature)                                      ║
║  ☐ Send me a reminder at 08:00 AM                               ║
║                                                                  ║
║                                                                  ║
║  [Cancel]                               [Create Habit] ●        ║
╚══════════════════════════════════════════════════════════════════╝
```

#### 4. Quick Log Modal

```
┌───────────────────────────────────────┐
│  Morning Meditation                ×  │
├───────────────────────────────────────┤
│                                       │
│  Did you complete it today?           │
│                                       │
│  Date: January 31, 2026  [Change ▼]  │
│                                       │
│  Notes (optional)                     │
│  ┌─────────────────────────────────┐  │
│  │ Did 10 min on the couch         │  │
│  │                                 │  │
│  └─────────────────────────────────┘  │
│                                       │
│  ● Completed   ○ Not completed       │
│                                       │
│          [Cancel]  [Log it! ✓]       │
└───────────────────────────────────────┘
```

#### 5. Dashboard Widget (Habits Summary)

```
┌──────────────────────────────────────┐
│  HABITS               [→ View All]    │
├──────────────────────────────────────┤
│                                      │
│  Morning Meditation    🔥 15 days ✓  │
│  30-Minute Workout     🔥 8 days  ✗  │
│  Read 30 Minutes       🔥 34 days ✓  │
│                                      │
│  Week: 10/21 completed (48%)        │
│                                      │
└──────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Core Habit System (2-3 weeks)

**Deliverables:**
- Habit + HabitLog models
- Complete CRUD API
- Basic frontend list + detail pages
- Streak calculation (basic cases)
- Tests (models + services + routes)

**Not included:**
- Grace periods (implement after basic streak works)
- Calendar grids (implement Phase 2)
- Dashboard widget (implement Phase 2)
- Mobile notifications (implement Phase 2)

**Tasks:**

```
BACKEND
├─ Habit.js model + migration
├─ HabitLog.js model
├─ habitService.js with:
│  ├─ createHabit()
│  ├─ calculateStreak() [basic]
│  ├─ logHabit()
│  └─ getHabitLogs()
├─ habits.js routes [all CRUD + logging]
├─ Wide Events logging [for analytics]
├─ Model tests (Habit, HabitLog schemas)
├─ Service tests (calculateStreak, logHabit)
└─ Route tests (CRUD operations)

FRONTEND
├─ habitApi.js [API client]
├─ useHabits hook [TanStack Query]
├─ useHabitLogs hook
├─ useHabitActions hook [mutations]
├─ HabitsPage.jsx [route wrapper]
├─ HabitList.jsx [list view]
├─ HabitCard.jsx [list item]
├─ HabitDetailPage.jsx [single habit]
├─ HabitForm.jsx [create/edit modal]
├─ ScheduleSelector.jsx [frequency picker]
├─ StreakBadge.jsx [visual display]
├─ LogModal.jsx [quick log modal]
├─ Component tests [HabitForm, HabitCard, LogModal]
└─ Integration tests [Happy path: create → log → view]
```

### Phase 2: Visualization & Polish (1-2 weeks)

**Deliverables:**
- Weekly grid (7-day view)
- Monthly calendar heatmap
- Grace period logic
- Dashboard habit widget
- Stats calculations (monthly, yearly)
- Full design audit compliance

**Tasks:**

```
BACKEND
├─ habitService improvements:
│  ├─ handleMissedDay() [grace periods]
│  ├─ getMonthlyGrid()
│  ├─ getWeeklyGrid()
│  ├─ calculateStats()
│  └─ Check streak consistency
├─ Route: GET /habits/:id/stats
├─ E2E tests [edge cases]:
│  ├─ Grace period scenarios
│  ├─ Weekday habits (skip weekends)
│  ├─ Timezone handling
│  └─ Concurrent logs (idempotency)
└─ Performance tests [1000+ log entries]

FRONTEND
├─ WeeklyGrid.jsx [7-day view]
├─ MonthlyGrid.jsx [calendar heatmap]
├─ HabitStats.jsx [statistics display]
├─ HabitDetailPage updates [add grids + stats]
├─ Dashboard widget integration
├─ Design audit + fixes
├─ Visual regression tests
└─ E2E tests [user flows]
```

### Phase 3: Advanced Features (Future, 1-2 weeks)

**Deliverables:**
- Habit reminders (notifications)
- Habit challenges (group habits)
- Statistics export (CSV)
- Archive & historical analysis
- Mobile push notifications
- Social features (share streaks)

---

## Testing Strategy

### Backend Testing

```javascript
// Habit.test.js
describe('Habit Model', () => {
  describe('Validation', () => {
    test('requires name', () => { });
    test('requires userId', () => { });
    test('defaults to active status', () => { });
    test('validates daysOfWeek values (0-6)', () => { });
  });

  describe('Timestamps', () => {
    test('sets createdAt on creation', () => { });
    test('updates updatedAt on modification', () => { });
  });
});

// habitService.test.js
describe('HabitService.calculateStreak', () => {
  describe('Happy path', () => {
    test('counts consecutive logs (5 days)', async () => {
      // Create habit
      // Create logs for Mon-Fri
      // Assert streak = 5
    });

    test('stops at first gap', async () => {
      // Create logs for Mon, Tue, (gap Wed), Thu, Fri
      // Assert streak = 1 (only Fri)
    });
  });

  describe('Grace periods', () => {
    test('extends streak within grace period', async () => {
      // gracePeriodDays=2
      // Logs: Mon, Tue, (gap Wed, Thu), Fri
      // Assert streak = 3 (Mon-Fri counts)
    });

    test('resets streak beyond grace period', async () => {
      // gracePeriodDays=2
      // Logs: Mon, Tue, (gap Wed, Thu, Fri), Sat
      // Assert streak = 1 (only Sat)
    });
  });

  describe('Frequency schedules', () => {
    test('weekday habit ignores weekends', async () => {
      // daysOfWeek=[1,2,3,4,5]
      // No logs on Sat/Sun
      // Assert streak doesn't penalize missing Sat/Sun
    });

    test('weekly habit on specific days', async () => {
      // daysOfWeek=[3] (Wednesday only)
      // Logs Wed, (gap Thu-Tue), Wed
      // Assert streak = 1 (only latest Wed)
    });
  });

  describe('Edge cases', () => {
    test('very long streak (500+ days)', async () => { });
    test('out-of-order logs', async () => { });
    test('concurrent logs same day', async () => { });
    test('timezone boundaries (midnight)', async () => { });
  });
});

// habits.test.js (Routes)
describe('POST /api/habits/:id/log', () => {
  test('creates HabitLog entry', async () => { });
  test('updates currentStreak', async () => { });
  test('updates bestStreak if beaten', async () => { });
  test('recalculates on concurrent logs', async () => { });
  test('returns 401 if not authenticated', async () => { });
  test('returns 403 if not habit owner', async () => { });
});
```

### Frontend Testing

```javascript
// HabitCard.test.jsx
describe('HabitCard', () => {
  test('displays habit name', () => {
    render(<HabitCard habit={{ name: 'Meditation' }} />);
    expect(screen.getByText('Meditation')).toBeInTheDocument();
  });

  test('shows current streak', () => {
    const habit = { name: 'Workout', currentStreak: { count: 15 } };
    render(<HabitCard habit={habit} />);
    expect(screen.getByText('🔥 15 days')).toBeInTheDocument();
  });

  test('shows logged/not logged status', () => {
    const habit = { name: 'Read', totalCompletions: 10 };
    render(<HabitCard habit={habit} todayLogged={true} />);
    expect(screen.getByText('✓ Logged')).toBeInTheDocument();
  });

  test('calls onLog when log button clicked', () => {
    const onLog = jest.fn();
    render(<HabitCard habit={mockHabit} onLog={onLog} />);
    fireEvent.click(screen.getByText('Log Now'));
    expect(onLog).toHaveBeenCalled();
  });
});

// WeeklyGrid.test.jsx
describe('WeeklyGrid', () => {
  test('renders 7 days', () => {
    render(<WeeklyGrid logs={mockWeeklyLogs} />);
    const cells = screen.getAllByRole('button');
    expect(cells).toHaveLength(7);
  });

  test('marks completed days', () => {
    const logs = [
      { date: '2026-01-25', completed: true },
      { date: '2026-01-26', completed: true },
      { date: '2026-01-27', completed: false },
    ];
    render(<WeeklyGrid logs={logs} />);
    expect(screen.getByText('Sat')).toHaveClass('completed');
    expect(screen.getByText('Sun')).toHaveClass('completed');
    expect(screen.getByText('Mon')).toHaveClass('missed');
  });
});

// Integration tests
describe('Habit Creation & Logging (E2E)', () => {
  test('user creates habit and logs completion', async () => {
    // Visit /habits
    // Click "New Habit"
    // Fill form (name, frequency, days)
    // Submit
    // See habit in list
    // Click "Log Now"
    // See streak increase
  });
});
```

### Streak Calculation: Exhaustive Test Suite

```javascript
/**
 * habitService.calculateStreak.test.js
 * CRITICAL: Every edge case must pass before shipping
 */

describe('calculateStreak - EXHAUSTIVE SUITE', () => {
  const setup = async (habitConfig, logDates) => {
    // Create habit with config
    // Create HabitLog entries for each logDate
    // Return habit + service instance
  };

  // === BASIC CASES ===
  test('1 day = streak 1', async () => {
    const { habit, service } = await setup({}, ['2026-01-31']);
    const streak = await service.calculateStreak(habit._id);
    expect(streak.count).toBe(1);
  });

  test('5 consecutive days = streak 5', async () => {
    const dates = ['2026-01-27', '2026-01-28', '2026-01-29', '2026-01-30', '2026-01-31'];
    const { habit, service } = await setup({}, dates);
    const streak = await service.calculateStreak(habit._id);
    expect(streak.count).toBe(5);
  });

  test('gap in logs resets streak', async () => {
    // Mon, Tue, (gap Wed), Thu, Fri
    // Streak = 1 (only Fri)
    const dates = ['2026-01-27', '2026-01-28', '2026-01-30', '2026-01-31'];
    const { habit, service } = await setup({}, dates);
    const streak = await service.calculateStreak(habit._id);
    expect(streak.count).toBe(1);
  });

  // === GRACE PERIOD CASES ===
  test('grace period=0: gap resets immediately', async () => {
    // Mon-Tue (grace=0), miss Wed, log Thu
    // Streak should = 1
    const dates = ['2026-01-27', '2026-01-28', '2026-01-30'];
    const { habit, service } = await setup(
      { gracePeriodDays: 0 },
      dates
    );
    const streak = await service.calculateStreak(habit._id);
    expect(streak.count).toBe(1);
  });

  test('grace period=1: miss 1 day, streak continues', async () => {
    // Mon-Tue (grace=1), miss Wed, log Thu
    // Streak should = 3
    const dates = ['2026-01-27', '2026-01-28', '2026-01-30'];
    const { habit, service } = await setup(
      { gracePeriodDays: 1 },
      dates
    );
    const streak = await service.calculateStreak(habit._id);
    expect(streak.count).toBe(3);
  });

  test('grace period=2: miss 2 days, streak continues', async () => {
    // Mon-Tue (grace=2), miss Wed-Thu, log Fri
    // Streak should = 4
    const dates = ['2026-01-27', '2026-01-28', '2026-01-31'];
    const { habit, service } = await setup(
      { gracePeriodDays: 2 },
      dates
    );
    const streak = await service.calculateStreak(habit._id);
    expect(streak.count).toBe(4);
  });

  test('grace period=2: miss 3 days, streak resets', async () => {
    // Mon-Tue (grace=2), miss Wed-Fri, log Sat
    // Streak should = 1
    const dates = ['2026-01-27', '2026-01-28', '2026-02-01'];
    const { habit, service } = await setup(
      { gracePeriodDays: 2 },
      dates
    );
    const streak = await service.calculateStreak(habit._id);
    expect(streak.count).toBe(1);
  });

  // === FREQUENCY SCHEDULE CASES ===
  test('weekday habit (Mon-Fri) ignores weekends', async () => {
    // Habit: Mon-Fri only
    // Logs: Mon, Tue, (weekend), Mon, Tue, Wed
    // Streak should = 3 (ignores weekend gap)
    const dates = [
      '2026-01-26', // Mon
      '2026-01-27', // Tue
      // (weekend: Sat, Sun - not in schedule)
      '2026-02-02', // Mon
      '2026-02-03', // Tue
      '2026-02-04', // Wed
    ];
    const { habit, service } = await setup(
      { schedule: { frequency: 'DAILY', daysOfWeek: [1, 2, 3, 4, 5] } },
      dates
    );
    const streak = await service.calculateStreak(habit._id);
    expect(streak.count).toBe(3);
  });

  test('custom dates (1st and 15th): miss on wrong day', async () => {
    // Habit: Custom (1st, 15th only)
    // Logs: Feb 1, Feb 2 (gap), Feb 15
    // Streak should = 1 (Feb 2 not in schedule)
    const dates = [
      '2026-02-01',
      // Feb 2 not in schedule, so no gap penalty
      '2026-02-15',
    ];
    const { habit, service } = await setup(
      { schedule: { frequency: 'CUSTOM', customDates: [1, 15] } },
      dates
    );
    const streak = await service.calculateStreak(habit._id, new Date('2026-02-15'));
    expect(streak.count).toBe(1);
  });

  // === OUT-OF-ORDER LOGS ===
  test('logs out of order: only consecutive counted', async () => {
    // User logs: Day 5, Day 1, Day 3, Day 2, Day 4
    // Backward from Day 5: only Day 5 is consecutive
    // Streak should = 1
    const dates = ['2026-02-01', '2026-02-02', '2026-02-03', '2026-02-04', '2026-02-05'];
    const shuffled = [dates[4], dates[0], dates[2], dates[1], dates[3]];
    const { habit, service } = await setup({}, shuffled);
    const streak = await service.calculateStreak(habit._id, new Date('2026-02-05'));
    expect(streak.count).toBe(1);
  });

  // === VERY LONG STREAKS ===
  test('very long streak (500 days)', async () => {
    const dates = [];
    let current = new Date('2024-12-01');
    for (let i = 0; i < 500; i++) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    const { habit, service } = await setup({}, dates);
    const streak = await service.calculateStreak(habit._id);
    expect(streak.count).toBe(500);
  });

  // === TIMEZONE EDGE CASES ===
  test('timezone boundary: log at 11:59 PM UTC → stored as same date', async () => {
    // User in NY (UTC-5), logs at 11:59 PM (04:59 AM UTC next day)
    // Should be stored as user's date, not UTC date
    // This depends on implementation (use user's timezone when storing)
    expect(true).toBe(true); // Placeholder - needs actual TZ handling
  });
});
```

---

## Risks & Mitigation

### Risk 1: Streak Data Loss

**Risk:** User loses 47-day streak due to bug. Trust eroded.

**Likelihood:** Medium (tricky logic, edge cases)

**Mitigation:**
- Exhaustive test suite (every edge case)
- Code review by 2+ senior engineers
- Streak calculation immutable (never partial updates)
- Backup/recovery: store streak snapshots daily
- Monitoring: alert on streak resets > expected

**Detection:**
- Smoke tests after every change
- User reports of unexpected streak resets

### Risk 2: Timezone Bugs

**Risk:** User logs habit in their timezone, but streak calculated in UTC.

**Likelihood:** Medium-High

**Mitigation:**
- Store dates as YYYY-MM-DD in user's timezone
- Use date-fns with timezone awareness
- Test across multiple timezones (NY, Tokyo, London)
- Document timezone assumptions clearly

### Risk 3: Performance Degradation

**Risk:** Calculating streaks on habits with 1000+ log entries gets slow.

**Likelihood:** Low (but possible for very engaged users)

**Mitigation:**
- Cache currentStreak in Habit model (don't recalculate every request)
- Lazy load HabitLog entries (paginate if > 100)
- Index on (habitId, date) for fast range queries
- Performance tests with 1000+ logs

### Risk 4: Concurrent Requests

**Risk:** User clicks "log" twice in 1 second. Create 2 logs for same day.

**Likelihood:** Medium (users click things twice)

**Mitigation:**
- Unique index on (userId, habitId, date)
- Return 409 Conflict if log already exists
- Frontend disable button after click
- Idempotent API (retry safely)

### Risk 5: Grace Period Logic Too Complex

**Risk:** Grace period off by 1 day. Users lose streaks unexpectedly.

**Likelihood:** High (subtle logic)

**Mitigation:**
- Simple grace period rules (no special cases)
- Clear documentation with examples
- Exhaustive tests covering all combinations
- User education (explain grace period upfront)

### Risk 6: Incomplete Phase 1

**Risk:** Start Phase 2 before Phase 1 fully tested. Bugs cascade.

**Likelihood:** Medium (pressure to ship fast)

**Mitigation:**
- Hard stop after Phase 1: test coverage > 80%
- Deploy Phase 1 solo first, gather feedback
- Only add Phase 2 features after 1 week stable

---

## Success Criteria

### Phase 1 Complete When:

- [ ] Habit + HabitLog models created + migrated
- [ ] CRUD API fully implemented
- [ ] Basic streak calculation working (no grace periods yet)
- [ ] Test coverage > 80% for streak logic
- [ ] Frontend: List + Detail + Create views working
- [ ] All edge case tests passing
- [ ] Code reviewed by 2+ engineers
- [ ] Smoke test passing
- [ ] No console errors in dev/prod

### Phase 2 Complete When:

- [ ] Weekly + Monthly grids displaying correctly
- [ ] Grace period logic tested extensively
- [ ] Dashboard widget integrated
- [ ] Design audit passed
- [ ] Stats calculated accurately
- [ ] User can review past habits
- [ ] Performance tests passing (1000+ logs)
- [ ] Deployment to production successful
- [ ] No user-reported streak issues

---

## Future Enhancements (Not In This Plan)

1. **Habit Streaks (Social)** - Compete with friends
2. **Habit Milestones** - "7-day badge", "100-day achievement"
3. **Habit Reminders** - Daily notifications
4. **Habit Challenges** - Join 30-day group challenges
5. **Analytics Export** - CSV/PDF reports
6. **Habit Templates** - Pre-made habits ("Morning Routine", "Workout")
7. **Habit Bundles** - Group related habits
8. **Apple Health Integration** - Sync workouts automatically
9. **Wearable Integration** - Pull data from Fitbit/Apple Watch
10. **AI Coaching** - Personalized habit suggestions

---

## Conclusion

The Habit Tracker is a high-impact feature that addresses core user needs (consistency, motivation, progress visibility). By creating separate Habit + HabitLog models, we maintain clean architecture while enabling powerful streak logic and engaging visualizations.

The implementation prioritizes correctness over speed: thorough testing upfront prevents costly data loss and trust erosion. Parallel execution opportunities (widgets, stats, notifications) allow distributed work once core features stabilize.

**Next Step:** Present plan to senior engineers for review and approval. Request feedback on:
1. Separate models vs Task extension
2. Grace period behavior
3. Timezone handling approach
4. Testing strategy completeness

---

**Document Status:** Ready for Senior Engineer Review
**Last Updated:** 2026-01-31
**Author:** Claude Haiku 4.5
