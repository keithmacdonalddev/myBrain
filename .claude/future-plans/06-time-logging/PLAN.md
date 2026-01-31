# TIME LOGGING FEATURE

> **WARNING: This is a ROUGH DRAFT**
>
> This document represents exploratory thinking and a potential future direction for myBrain. The plan is NOT finalized, NOT approved, and subject to significant change. Do not use this as a basis for implementation without explicit approval.

---

## Metadata

| Field | Value |
|-------|-------|
| **Created by** | Claude Haiku 4.5 |
| **Date** | 2026-01-31 |
| **Status** | Draft - Not Approved |
| **Priority** | Medium |
| **Effort Estimate** | Medium-High (200-250 hours) |
| **Complexity** | High (timer state, accuracy, UX) |

---

## Why This Feature

### Problem Statement

Users of myBrain currently have no visibility into WHERE THEIR TIME GOES.

Tasks have deadlines (when they should be done) but no duration tracking (how long they take). This creates several problems:

1. **No time awareness** - Users don't know if they're being realistic with estimates
2. **Scheduling blindness** - Can't build accurate schedules without knowing task durations
3. **Accuracy gaps** - Estimated vs actual time discrepancies are invisible
4. **Billing friction** - Freelancers can't track billable hours without external tools
5. **Retrospective blindness** - Hard to learn time patterns across projects/tags

### User Story

**Freelancer Scenario:**

> As a freelancer juggling 5 projects, I estimate "write blog post" will take 2 hours. I start working and lose track of time - suddenly it's 4 hours later. I have no record of the actual time spent, no way to tell clients how many hours I spent, and no way to know if future blog posts will really take 2 hours or if that's an unrealistic estimate.
>
> A time logging feature would let me:
> - Set an estimate when creating the task (2 hours)
> - Click "Start timer" while writing (1 click to begin tracking)
> - Glance at how much time has elapsed (visual feedback)
> - Stop the timer when done (1 click to stop)
> - See actual vs estimated (4 hours actual vs 2 hours estimated)
> - Report time to clients ("I spent 4 billable hours on your project this week")
> - Learn from the pattern ("Blog posts consistently take 2x longer than I estimate")

### Origin of Idea

Time tracking is a **foundational part of productivity systems**. The GTD (Getting Things Done) methodology emphasizes understanding time commitments before taking on tasks. Most serious productivity apps (Toggl, Harvest, Clockify) include time tracking as a core feature because:

1. **Data-driven planning** - Understanding time patterns improves future estimates
2. **Accountability** - Visible time creates accountability for how hours are spent
3. **Freelancer requirement** - Billable work requires time documentation
4. **Reflection utility** - "Where did my week go?" is answerable with time data

This feature would elevate myBrain from a task LIST to a productivity SYSTEM.

---

## What We're Building

### Feature Overview

**Optional time tracking on tasks** - Not mandatory for all users, but powerful when enabled.

Users should be able to:

#### 1. Estimate Time (At Creation)
- Set estimated duration when creating a task
- Optional field (time tracking is opt-in)
- Examples: 15 min, 1 hour, 2.5 hours, 3 days

#### 2. Start/Stop Timer (While Working)
- One-click "Start" timer from task view
- Visual indication of elapsed time
- One-click "Stop" when done
- Ability to pause and resume
- See running timer from dashboard

#### 3. Manual Time Entry (Alternative)
- For tasks already completed
- "I spent 2 hours and 15 minutes on this"
- Can add entries retroactively
- Multiple time entries per task

#### 4. Accuracy Insights (After Completion)
- Actual time vs estimated time comparison
- Percentage over/under estimate
- Trend: "Last 5 blog posts: 2x over estimate"
- Learning signals for future tasks

#### 5. Daily/Weekly Totals (Analytics)
- How many hours worked today/week
- By project: "20 hours on Client X, 8 hours on personal"
- By tag: "8 hours on calls, 12 hours on deep work"
- Total billable vs personal time

#### 6. Time Breakdown (Analytics)
- Per project: "How many hours across all tasks?"
- Per tag: "How much time on 'coding' tasks vs 'admin'?"
- Per life area: "Work vs personal time split"
- Historical trends: "Last 4 weeks" view

### Key Design Constraints

1. **Optional** - Not all users want time tracking. Feature flag it, don't force it.
2. **Non-intrusive** - Timer shouldn't distract from actual work
3. **Flexible** - Some tasks will be tracked manually, some with timer
4. **Accurate** - Time entries should be precise (to the minute)
5. **Respectful of focus** - Don't interrupt the user mid-work
6. **Lazy estimate** - Let users estimate loosely; the more rigid the requirement, the less they'll use it

### UI Mockups

#### Task with Timer (While Working)

```
┌────────────────────────────────────────────────────────────┐
│  Write quarterly report                        [x close]   │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Estimated:  2 hours 30 minutes                            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Elapsed:   1:47:23                                   │  │
│  │ Remaining: 0:42:37                                   │  │
│  │                                                      │  │
│  │ [  ⏸ PAUSE  ]  [  ⏹ STOP & SAVE  ]  [  ⏱ MANUAL  ]  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Status:  In Progress                                      │
│  Due:     Friday, Feb 7                                    │
│  Tags:    work, writing, quarterly                         │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Notes & Time Log:                                          │
│  • Started at 9:30 AM                                      │
│  • Added 15 minutes manual entry (lunch break return)      │
│  • Currently tracking...                                   │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

#### Task After Completion (Accuracy View)

```
┌────────────────────────────────────────────────────────────┐
│  Write quarterly report                        [x close]   │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ✓ COMPLETED                                          │  │
│  │                                                      │  │
│  │  Estimated:  2:30     ┐                             │  │
│  │  Actual:     3:14     │ 125% of estimate            │  │
│  │  Difference: +0:44    ┘ (+29 minutes over)          │  │
│  │                                                      │  │
│  │  Your accuracy: "Usually 15% over estimate"         │  │
│  │  Next similar task: Estimate +15-20%?               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Time Log:                                                  │
│  • 2026-01-31 9:30 AM - 10:45 AM  (1h 15m)                │
│  • 2026-01-31 1:30 PM - 3:14 PM   (1h 44m)  ← editing    │
│  • Manual entry: 15m (lunch break research)                │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

#### Daily/Weekly Time Summary

```
┌────────────────────────────────────────────────────────────┐
│  Time Summary                                   [week] [v]  │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  This Week:  42 hours 15 minutes                           │
│                                                             │
│  ┌─ By Project ────────────────────────────────────────┐   │
│  │ Client X Project        20h 30m  ████████░░  49%   │   │
│  │ Personal Learning        8h 45m  ████░░░░░░  21%   │   │
│  │ Admin & Planning         7h 00m  ███░░░░░░░  17%   │   │
│  │ Meetings & Calls         5h 30m  ██░░░░░░░░  13%   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─ By Tag ────────────────────────────────────────────┐   │
│  │ Deep Work (coding)      18h 00m  ████████░░  43%   │   │
│  │ Communication           10h 15m  █████░░░░░  24%   │   │
│  │ Admin & Overhead         8h 30m  ████░░░░░░  20%   │   │
│  │ Learning                 5h 30m  ██░░░░░░░░  13%   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Comparison to last week:  +3 hours 15 minutes (↑8%)       │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

#### Dashboard Widget (Time Today)

```
┌──────────────────────────────┐
│  Time Tracking               │
├──────────────────────────────┤
│                              │
│  Today:                      │
│  Tracked:  6h 23m            │
│  Remaining: 1h 37m (est.)    │
│                              │
│  ┌──────────────────────┐    │
│  │ ██████░░░░░ 80%     │    │
│  └──────────────────────┘    │
│                              │
│  Active: Write this plan     │
│  [  ⏸ PAUSE  ] [  ⏹ STOP  ]  │
│                              │
└──────────────────────────────┘
```

---

## Technical Approach

### 1. Data Model Additions to Task Schema

#### Task Model Extensions

```javascript
// NEW FIELDS TO ADD TO Task.js

// Time Estimate & Tracking
estimatedMinutes: {
  type: Number,
  default: null,
  min: [1, 'Estimate must be at least 1 minute'],
  max: [525600, 'Estimate cannot exceed 1 year']
  // 1-525600 minutes = 1 minute to 1 year
}

// Time Entry History - Track all time logged to this task
timeEntries: [{
  // When did the user work on this?
  startedAt: {
    type: Date,
    required: true
  },

  // When did they stop?
  stoppedAt: {
    type: Date,
    required: true
  },

  // Was this auto-tracked or manual?
  type: {
    enum: ['timer', 'manual'],
    default: 'timer'
  },

  // Manual entries might have notes
  notes: {
    type: String,
    default: ''
  }
}]

// Total actual minutes (cached for performance)
actualMinutes: {
  type: Number,
  default: 0,
  // This is a computed field: sum of all timeEntries durations
  // Cache it here so we don't recalculate on every view
}

// When was the timer actually started (for current session)?
timerStartedAt: {
  type: Date,
  default: null
  // Null = no timer running
  // Set when user clicks "Start"
  // Cleared when user clicks "Stop"
}
```

#### TimerSession Model (Optional - for reliability)

```javascript
// Optional: Separate model to track timer sessions
// Benefits: Reliable, handles crashes/browser close gracefully
// Drawback: More complex, another DB model

const timerSessionSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
    index: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // When the user started the timer
  startedAt: {
    type: Date,
    required: true
  },

  // When they stopped (or null if still running)
  stoppedAt: {
    type: Date,
    default: null
  },

  // Was it abandoned? (e.g., browser crashed, user went idle 2+ hours)
  abandoned: {
    type: Boolean,
    default: false
  },

  // Total duration in this session (if stopped)
  durationMinutes: {
    type: Number,
    default: null
  }
}, {
  timestamps: true
});
```

#### TimeLog/Analytics Model (For Insights)

```javascript
// Optional: Pre-computed daily/weekly aggregations
// Benefits: Fast analytics queries, no need to sum at runtime
// Drawback: Need to maintain this in sync with Task.timeEntries

const timeSummarySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  date: {
    type: Date,
    required: true,
    index: true
    // Represents the day (always midnight UTC)
  },

  // Total minutes tracked that day
  totalMinutes: {
    type: Number,
    default: 0
  },

  // Breakdown by project
  byProject: {
    type: Map,
    of: Number,
    default: new Map()
    // Example: { "projectId1": 240, "projectId2": 120 }
  },

  // Breakdown by tag
  byTag: {
    type: Map,
    of: Number,
    default: new Map()
  },

  // Breakdown by life area
  byLifeArea: {
    type: Map,
    of: Number,
    default: new Map()
  },

  // Number of tasks tracked
  taskCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});
```

### 2. Backend Routes & Endpoints

#### Timer Control Routes

```javascript
// POST /api/tasks/:taskId/timer/start
// Start the timer for a task
// Request: {}
// Response: { task, timerStartedAt, message: "Timer started" }

// POST /api/tasks/:taskId/timer/stop
// Stop the timer and save the time entry
// Request: { notes?: "Optional notes" }
// Response: { task, timeEntry, totalTime: "1h 23m" }

// POST /api/tasks/:taskId/timer/pause
// Pause the timer (pause, not stop - keep session alive)
// Request: {}
// Response: { task, elapsedSeconds, message: "Timer paused" }

// POST /api/tasks/:taskId/timer/resume
// Resume a paused timer
// Request: {}
// Response: { task, timerStartedAt, message: "Timer resumed" }

// POST /api/tasks/:taskId/timer/discard
// Discard the current timer without saving (abandon session)
// Request: {}
// Response: { task, message: "Timer discarded" }

// POST /api/tasks/:taskId/timer/status
// Get current timer status (for polling or on mount)
// Request: {}
// Response: {
//   task,
//   running: true/false,
//   elapsedSeconds: 5423,
//   startedAt: ISO date
// }
```

#### Time Entry Management Routes

```javascript
// POST /api/tasks/:taskId/time-entries
// Add a manual time entry
// Request: {
//   startedAt: ISO datetime,
//   stoppedAt: ISO datetime,
//   notes?: "Why this time"
// }
// Response: { task, timeEntry, totalTime: "2h 15m" }

// GET /api/tasks/:taskId/time-entries
// List all time entries for this task
// Request: { }
// Response: {
//   timeEntries: [
//     { startedAt, stoppedAt, type, durationMinutes, notes },
//     ...
//   ],
//   totalMinutes: 135,
//   accuracy: { estimated: 150, actual: 135, percentDifference: -10 }
// }

// PATCH /api/tasks/:taskId/time-entries/:entryId
// Edit a time entry
// Request: { startedAt?, stoppedAt?, notes? }
// Response: { task, timeEntry }

// DELETE /api/tasks/:taskId/time-entries/:entryId
// Delete a time entry
// Request: {}
// Response: { task, message: "Entry deleted" }
```

#### Analytics Routes

```javascript
// GET /api/analytics/time/summary
// Get time summary for a time range
// Query: {
//   from: ISO date,
//   to: ISO date,
//   groupBy: 'project' | 'tag' | 'lifeArea'
// }
// Response: {
//   totalMinutes: 2550,
//   days: [
//     { date, minutes, breakdown },
//     ...
//   ],
//   breakdown: {
//     "projectId1": { minutes, taskCount, tags: [...] },
//     ...
//   }
// }

// GET /api/analytics/time/accuracy
// Get estimate vs actual accuracy trends
// Query: { from?, to?, groupBy: 'project' | 'tag' }
// Response: {
//   overall: { estimatedMinutes, actualMinutes, percentDifference },
//   byProject: { ... },
//   trends: [
//     { period, estimated, actual, diff }
//   ]
// }

// GET /api/tasks/:taskId/accuracy
// Get estimate vs actual for single task
// Request: {}
// Response: {
//   estimated: 150,
//   actual: 187,
//   percentDifference: 24.7,
//   message: "125% of estimate (24m over)",
//   similar: [
//     { taskId, title, estimate, actual, diff },
//     ...
//   ]
// }
```

### 3. Frontend Components

#### Core Timer Component

```javascript
// components/ui/TaskTimer.jsx
// Reusable timer component for tasks
// Props: { task, onStop, onPause, disabled }
// Features:
// - Displays elapsed time
// - Shows estimate vs remaining
// - Start/pause/stop/discard controls
// - Updates every second
// - Handles page close gracefully (localStorage)

// Timer Logic:
// - Store timerStartedAt in task.timerStartedAt
// - Calculate elapsed = Date.now() - timerStartedAt
// - On stop: POST /api/tasks/:taskId/timer/stop
// - On mount: GET /api/tasks/:taskId/timer/status (resume from crash)
```

#### Time Entry List Component

```javascript
// components/ui/TimeEntryList.jsx
// Show all time entries for a task
// Props: { task, onEdit, onDelete }
// Features:
// - List all time entries with duration
// - Show total time and comparison to estimate
// - Allow editing/deleting entries
// - Add manual entry button
// - Color code: green if under estimate, orange if close, red if over
```

#### Time Summary Analytics Component

```javascript
// features/analytics/components/TimeSummaryWidget.jsx
// Show daily/weekly time breakdown
// Props: { dateRange, groupBy }
// Features:
// - Bar chart or progress rings
// - Breakdown by project/tag/lifeArea
// - Comparison to previous week/month
// - Trends and insights
```

#### Dashboard Timer Widget

```javascript
// features/dashboard/widgets-v2/TimerWidgetV2.jsx
// Show active timer (if running)
// Features:
// - Display running timer prominently
// - Quick pause/stop controls
// - Show current task being tracked
// - Only visible if timer is active
```

### 4. Frontend State Management

#### Redux Slice for Timer

```javascript
// store/timerSlice.js
// Global timer state
// State: {
//   activeTaskId: null,
//   timerStartedAt: null,
//   elapsedSeconds: 0
// }
// Actions:
// - startTimer(taskId)
// - stopTimer()
// - pauseTimer()
// - resumeTimer()
// - updateElapsed(seconds)
```

#### Custom Hooks

```javascript
// hooks/useTaskTimer.js
// Hook for managing timer state
// Returns: { isRunning, elapsedSeconds, start, stop, pause, resume }
// Handles: localStorage persistence, interval cleanup, resume from crash

// hooks/useTimeAnalytics.js
// Hook for fetching time analytics
// Returns: { data, isLoading, error, refetch }
// Uses TanStack Query for caching
```

---

## Implementation Tasks

### Phase 1: Core Timer Infrastructure (40-50 hours)

#### Task 1.1: Update Task Model
- [ ] Add time tracking fields to Task schema
  - [ ] estimatedMinutes field
  - [ ] timeEntries array with schema
  - [ ] actualMinutes computed field
  - [ ] timerStartedAt field
- [ ] Add indexes for time queries
- [ ] Write validation tests for time fields
- [ ] Verify backward compatibility (old tasks without these fields)

**Subtasks:**
- Test creation with estimatedMinutes
- Test timeEntries structure
- Test actualMinutes calculation
- Test null handling (optional time tracking)

**Effort:** 8 hours

#### Task 1.2: Implement Timer Control Routes
- [ ] POST /api/tasks/:taskId/timer/start
- [ ] POST /api/tasks/:taskId/timer/stop
- [ ] POST /api/tasks/:taskId/timer/pause
- [ ] POST /api/tasks/:taskId/timer/resume
- [ ] POST /api/tasks/:taskId/timer/discard
- [ ] GET /api/tasks/:taskId/timer/status
- [ ] Error handling for invalid transitions (stop without start, etc.)
- [ ] Write comprehensive route tests

**Subtasks:**
- Test timer start creates new session
- Test timer stop saves entry
- Test pause/resume without losing time
- Test discard abandons session
- Test status returns accurate elapsed time
- Test concurrent timer prevention (can't have 2 timers running)

**Effort:** 12 hours

#### Task 1.3: Implement Time Entry Management Routes
- [ ] POST /api/tasks/:taskId/time-entries (manual entry)
- [ ] GET /api/tasks/:taskId/time-entries (list)
- [ ] PATCH /api/tasks/:taskId/time-entries/:entryId (edit)
- [ ] DELETE /api/tasks/:taskId/time-entries/:entryId (delete)
- [ ] Validation: stop > start, entries don't overlap
- [ ] Write tests for edge cases

**Subtasks:**
- Test manual entry creation
- Test entry editing
- Test entry deletion
- Test overlapping detection
- Test accuracy calculation

**Effort:** 10 hours

#### Task 1.4: Implement Timer Session Reliability
- [ ] Create optional TimerSession model
- [ ] Handle browser crash recovery (resume from last session)
- [ ] Add session cleanup (old abandoned sessions)
- [ ] Add idleness detection (auto-stop after 2+ hours)
- [ ] Add cleanup job for orphaned sessions

**Subtasks:**
- Test session recovery after app restart
- Test idle detection and auto-stop
- Test cleanup of abandoned sessions
- Test graceful handling of malformed sessions

**Effort:** 10 hours

---

### Phase 2: Frontend Timer UI (50-60 hours)

#### Task 2.1: Build TaskTimer Component
- [ ] Create reusable TaskTimer component
- [ ] Display elapsed time (MM:SS, HH:MM:SS)
- [ ] Show estimate vs remaining time
- [ ] Progress bar visualization
- [ ] Start/Pause/Stop/Discard buttons
- [ ] Handle timer ticking (update every second)
- [ ] LocalStorage persistence (survive page close)
- [ ] Responsive design

**Subtasks:**
- Test timer rendering with running timer
- Test timer increment logic
- Test localStorage save/restore
- Test button state transitions
- Test display with various time formats
- Test responsive layout on mobile

**Effort:** 14 hours

#### Task 2.2: Build TimeEntryList Component
- [ ] Display all time entries for a task
- [ ] Show start/stop times
- [ ] Show duration calculation
- [ ] Show entry type (timer vs manual)
- [ ] Edit entry modal
- [ ] Delete with confirmation
- [ ] Add manual entry button
- [ ] Color coding for estimate accuracy

**Subtasks:**
- Test rendering time entries
- Test edit functionality
- Test delete with confirmation
- Test color coding logic
- Test manual entry form
- Test responsive layout

**Effort:** 12 hours

#### Task 2.3: Integrate Timer into Task Panel
- [ ] Add timer to task detail sidebar
- [ ] Show timer control near status section
- [ ] Show time entries list below details
- [ ] Add time entry quick-add
- [ ] Handle timer start/stop via sidebar
- [ ] Real-time updates of elapsed time

**Subtasks:**
- Test timer appears when task opened
- Test timer state syncs with server
- Test manual entry integration
- Test responsive behavior

**Effort:** 10 hours

#### Task 2.4: Build Dashboard Timer Widget
- [ ] Create TimerWidgetV2 component (only show if timer running)
- [ ] Display active task title
- [ ] Display elapsed time
- [ ] Quick pause/stop buttons
- [ ] Minimal, unobtrusive design
- [ ] Socket.io support for real-time updates

**Subtasks:**
- Test widget visibility (hidden when no timer)
- Test timer display accuracy
- Test pause/stop from widget
- Test websocket sync

**Effort:** 8 hours

#### Task 2.5: Build Redux Timer State
- [ ] Create timerSlice.js
- [ ] Implement startTimer, stopTimer, pauseTimer, resumeTimer
- [ ] Implement updateElapsed (for continuous updates)
- [ ] Connect to useTaskTimer hook
- [ ] Connect to components

**Subtasks:**
- Test state initialization
- Test action dispatch
- Test state persistence
- Test hook integration

**Effort:** 6 hours

---

### Phase 3: Analytics & Insights (45-55 hours)

#### Task 3.1: Implement Time Analytics Routes
- [ ] GET /api/analytics/time/summary (daily/weekly totals)
- [ ] GET /api/analytics/time/accuracy (estimate vs actual)
- [ ] GET /api/tasks/:taskId/accuracy (single task)
- [ ] Implement grouping (by project, tag, life area)
- [ ] Implement filtering (date range, status)
- [ ] Write aggregation pipeline for performance
- [ ] Cache results for common queries

**Subtasks:**
- Test summary aggregation
- Test accuracy calculations
- Test grouping by project
- Test grouping by tag
- Test filtering by date range
- Test caching strategy

**Effort:** 14 hours

#### Task 3.2: Create TimeSummaryWidget
- [ ] Display total time tracked (today/week/month)
- [ ] Show breakdown by project (bar chart)
- [ ] Show breakdown by tag (progress rings)
- [ ] Show breakdown by life area
- [ ] Period selector (day/week/month)
- [ ] Comparison to previous period
- [ ] Responsive charts

**Subtasks:**
- Test data loading
- Test chart rendering
- Test period switching
- Test responsive layout
- Test drill-down (click project → see tasks)

**Effort:** 16 hours

#### Task 3.3: Create Accuracy Insights
- [ ] Show estimate vs actual for completed tasks
- [ ] Calculate accuracy percentage
- [ ] Show trends ("consistently 20% over")
- [ ] Group similar tasks ("all blog posts")
- [ ] Suggest estimate adjustments
- [ ] Visual indicators (green/orange/red)

**Subtasks:**
- Test accuracy calculation
- Test trend detection
- Test grouping logic
- Test estimate suggestions
- Test color coding

**Effort:** 12 hours

#### Task 3.4: Analytics Page / View
- [ ] Create analytics page with tabs
- [ ] Time summary section
- [ ] Accuracy section
- [ ] Trends section
- [ ] Export capabilities (CSV)
- [ ] Date range picker

**Subtasks:**
- Test page rendering
- Test tab switching
- Test data loading
- Test export functionality
- Test date range filtering

**Effort:** 13 hours

---

### Phase 4: Advanced Features & Polish (30-40 hours)

#### Task 4.1: Auto-Stop Logic
- [ ] Implement idle detection (no activity → auto-stop after 2 hours)
- [ ] Add notification before auto-stop
- [ ] Allow resuming after auto-stop
- [ ] Log auto-stops separately
- [ ] Configuration for idle timeout

**Subtasks:**
- Test idle detection trigger
- Test notification display
- Test resume after auto-stop
- Test timeout configuration

**Effort:** 8 hours

#### Task 4.2: Mobile Optimization
- [ ] Optimize timer UI for mobile
- [ ] Add quick-access timer shortcut
- [ ] Handle background tab behavior
- [ ] Add haptic feedback (mobile)
- [ ] Battery impact optimization
- [ ] Test on iOS and Android

**Subtasks:**
- Test timer on mobile viewport
- Test background behavior
- Test haptic feedback
- Test battery impact
- Test iOS/Android specific behaviors

**Effort:** 10 hours

#### Task 4.3: Feature Flag & Rollout
- [ ] Add timeLoggingEnabled feature flag
- [ ] Make time tracking opt-in
- [ ] Add onboarding/tutorial
- [ ] Add user preference toggle
- [ ] Add admin controls
- [ ] Create migration for existing users

**Subtasks:**
- Test feature flag behavior
- Test onboarding flow
- Test preference toggle
- Test admin controls
- Test existing user migration

**Effort:** 8 hours

#### Task 4.4: Integration Testing & Edge Cases
- [ ] Test timer + offline behavior
- [ ] Test timer + WebSocket disconnect/reconnect
- [ ] Test concurrent timer attempts
- [ ] Test time entry conflicts
- [ ] Test very long timers (8+ hours)
- [ ] Test time zone handling
- [ ] Smoke test complete flow

**Subtasks:**
- Test offline start → online stop
- Test WebSocket reconnect
- Test concurrent start attempts
- Test entry time overlaps
- Test time zone conversions
- Full smoke test flow

**Effort:** 6 hours

---

### Phase 5: Testing & Documentation (20-30 hours)

#### Task 5.1: Backend Testing
- [ ] Write tests for all timer routes
- [ ] Write tests for time entry routes
- [ ] Write tests for analytics routes
- [ ] Write integration tests (start → work → stop → analyze)
- [ ] Write edge case tests
- [ ] Achieve 85%+ coverage for timer code

**Effort:** 12 hours

#### Task 5.2: Frontend Testing
- [ ] Write tests for TaskTimer component
- [ ] Write tests for TimeEntryList component
- [ ] Write tests for timer hooks
- [ ] Write integration tests (timer UI → API)
- [ ] Write visual regression tests
- [ ] Achieve 80%+ coverage for timer UI

**Effort:** 10 hours

#### Task 5.3: Documentation
- [ ] API documentation for timer endpoints
- [ ] Component documentation for timer UI
- [ ] Architecture documentation
- [ ] User guide for time tracking
- [ ] Troubleshooting guide

**Effort:** 5 hours

---

## Parallel Model Opportunities

These tasks can run simultaneously:

### Parallel Group 1 (Frontend & Backend Parallel)
```
├─ Phase 1: Core Timer Infrastructure (Backend)
├─ Phase 2: Frontend Timer UI (Frontend)
└─ Phase 3: Analytics & Insights (Both)
```

**Benefits:**
- Frontend team can build UI components while backend builds routes
- Analytics can use completed timer routes immediately
- Faster overall delivery

**Cautions:**
- Need API contract agreement before starting (routes must be stable)
- Frontend must handle "API not ready" state gracefully
- Need mock API response for testing

### Parallel Group 2 (Within Phase 2)
```
Task 2.1: TaskTimer Component
Task 2.2: TimeEntryList Component
Task 2.4: Dashboard Widget
Task 2.5: Redux State
```

Can build Task 2.1, 2.2, 2.4 in parallel, then integrate with 2.5.

### Sequential Dependencies
```
Phase 1 (Backend) → Phase 2 & 3 (Frontend)
Phase 2 (UI) → Phase 4 (Polish)
Phases 1-4 → Phase 5 (Testing)
```

---

## Parallel Execution Cautions

### Timer State is Tricky

The timer is **stateful**. Issues to watch:

1. **Multiple Timers at Once**
   - Problem: User has Task A running, opens Task B, clicks start
   - Result: Both tasks have timerStartedAt
   - Solution: Enforce "one active timer" at backend + frontend

2. **Browser/App Crashes**
   - Problem: Timer running, user closes tab, comes back later
   - Result: Timer session is orphaned or lost
   - Solution: TimerSession model + auto-stop after 2 hours

3. **WebSocket Sync Issues**
   - Problem: Two browser windows, both timing the same task
   - Result: Time entries double-recorded, inaccurate totals
   - Solution: Use socket.io broadcast + client deduplication

4. **Time Zone Mismatch**
   - Problem: User starts timer at 11:55 PM, completes at 12:05 AM (different date)
   - Result: Time entry spans midnight
   - Solution: Store as UTC ISO strings, calculate duration in milliseconds

### Testing Timer State

Timer logic is tricky to test:

1. **Mock time:** Use Jest's fake timers (`jest.useFakeTimers()`)
2. **Test transitions:** Start → Pause → Resume → Stop (all paths)
3. **Test crashes:** Simulate browser close mid-timer
4. **Test edge cases:**
   - Timer > 1 year (should this be allowed?)
   - Timer 0 seconds (what happens?)
   - Negative duration (should be impossible)
   - Very fast stop (started and stopped same millisecond)

---

## Risks & Considerations

### Major Risks

#### 1. User Friction with Time Tracking

**Risk:** Users find time tracking intrusive or anxiety-inducing.

> "I hate being watched. A timer makes me anxious about productivity."

**Mitigation:**
- Make it completely optional (feature flag)
- Don't show estimate vs actual comparisons in task list (only on demand)
- Focus on learning, not judgment ("data for better planning")
- Don't enable for all users by default

#### 2. Data Accuracy

**Risk:** Time entries are inaccurate or inconsistent.

> "I forgot to stop the timer, it recorded 12 hours for a 2-hour task"

**Mitigation:**
- Auto-stop after 2 hours of inactivity
- Add "Edit" button for entries to correct mistakes
- Manual entry option as fallback
- Validation: stop > start, entries don't overlap

#### 3. Scope Creep

**Risk:** Time tracking could lead to requests for:
- Invoicing/billing integration
- Payroll export
- Team time tracking
- Time tracking rules/policies

**Mitigation:**
- Build for single user first
- Make team features out-of-scope for MVP
- Clear documentation of what's included/excluded

#### 4. Database Performance

**Risk:** Time entries could bloat Task documents.

> 100 tasks × 50 time entries each × 100 bytes = 500 KB per user
>
> For 10,000 users × 500 KB = 5 GB just for time entries

**Mitigation:**
- Keep timeEntries array (small documents)
- Pre-calculate actualMinutes (avoid recalculating)
- Archive old time entries to separate collection after 1 year
- Index on (userId, taskId) for fast lookups

#### 5. Timer State Synchronization

**Risk:** Timer running on one device, stopped on another.

> User starts timer on desktop at 9 AM, switches to phone at 10 AM expecting to see 1 hour elapsed, but phone shows 0 (no sync)

**Mitigation:**
- Use WebSocket to broadcast timer state
- Resume from server state on every page load (GET /api/tasks/:taskId/timer/status)
- Don't trust local state for critical decisions
- Use socket.io + Redux for real-time sync

#### 6. Analytics Complexity

**Risk:** Analytics queries become slow as time data grows.

> Calculating "time by project for last month" has to scan 10,000 entries

**Mitigation:**
- Pre-calculate daily/weekly summaries (TimeSummary model)
- Use MongoDB aggregation pipeline with indexes
- Cache results (Redis)
- Consider time-series DB (InfluxDB) for time tracking data

### Edge Cases to Handle

#### What if user forgets to stop the timer?

**Scenario:** User clicks start at 9 AM, gets distracted, remembers at 5 PM.

**Options:**
1. **Auto-stop after 2 hours** - Safe, prevents 8-hour bogus entries
2. **Notification reminder** - "Timer has been running for 2 hours"
3. **Manual stop required** - Trust the user (risky)
4. **Hybrid:** Warn at 2 hours, auto-stop at 4 hours

**Recommendation:** Auto-stop at 2 hours with ability to resume.

#### What if user wants to break a long task into chunks?

**Scenario:** "I worked on this for 2 hours this morning, 1.5 hours this afternoon"

**Options:**
1. **Multiple time entries** - Add 2 entries, each with start/stop
2. **Pause/resume** - Pause at lunch, resume after (but 1 timer session)
3. **Manual entry** - "I spent 3.5 hours total"

**Recommendation:** Support all three. Multiple entries are most flexible.

#### What if estimate is 0 or negative?

**Validation:**
```javascript
estimatedMinutes: {
  min: [1, 'Estimate must be at least 1 minute'],
  max: [525600, 'Estimate cannot exceed 1 year']
}
```

#### What about time zones?

**Rule:** Always store times as UTC ISO strings. Calculate duration in milliseconds (timezone-agnostic).

**Example:**
```
startedAt: "2026-01-31T14:30:00Z"  (UTC)
stoppedAt: "2026-01-31T15:45:00Z"  (UTC)
durationMinutes: 75  (calculated)
```

#### What if user changes timezone mid-task?

Not a problem if we calculate duration in milliseconds and display in local timezone.

#### What about Daylight Saving Time?

Not an issue if we store UTC and let the frontend handle display.

#### Should we track "paused" time?

**Example:** Timer running, user pauses for 10 minutes (lunch), resumes.

**Options:**
1. **Pause freezes timer** - Elapsed stays same while paused
2. **Pause stops session** - Resumes as separate entry
3. **No pause** - Just stop and restart (equivalent to pause/resume)

**Recommendation:** Pause freezes timer (keep one session, save on stop).

#### Can a user manually edit entries?

**Yes, with validation:**
```
- Can't stop before start
- Can't overlap with other entries
- Can't have negative duration
- Can add notes when editing
```

#### What's the minimum trackable time?

**Recommendation:** 1 minute (simplest). Don't support seconds.

#### Can user track negative time (retroactively add)?

**Example:** "I worked 2 hours yesterday (forgot to track)"

**Answer:** Yes, via manual entry with past date.

**Validation:** Don't allow dates > 365 days in past (avoid abuse).

#### Analytics: What time range makes sense?

**Options:**
1. **Day view** - Today only
2. **Week view** - This week (Mon-Sun)
3. **Month view** - This month
4. **Custom range** - User picks start/end date

**Recommendation:** Day/Week/Month + Custom.

---

## Design Considerations

### Color & Visual Coding

Use the design system from design-system.md:

```css
/* Timer running - active state */
--timer-running: var(--v2-accent);  /* Apple blue */

/* Under estimate - good */
--timer-under: var(--v2-success);   /* Green */

/* Close to estimate - warning */
--timer-close: var(--v2-warning);   /* Orange */

/* Over estimate - needs attention */
--timer-over: var(--v2-error);      /* Red (true errors only) */
```

### Mobile Considerations

1. **Screen real estate** - Timer controls should be compact
2. **Thumb-friendly buttons** - Min 44x44 pt touch target
3. **Notification** - Consider local notification when auto-stopping
4. **Battery impact** - Minimize background timer updates
5. **Offline handling** - Timer can continue offline, sync on reconnect

### Accessibility

1. **Timer display** - Use semantic HTML (`<time>` element)
2. **Buttons** - Proper ARIA labels ("Start timer", "Pause timer")
3. **Color coding** - Don't rely on color alone (add icons/text)
4. **Contrast** - Ensure timer display meets WCAG AA
5. **Keyboard** - All controls must be keyboard-accessible

---

## Implementation Notes

### Before Starting

1. **Get user approval** - Confirm timer is wanted, estimate format, analytics scope
2. **Design session** - Review mockups, confirm UI placement, get design approval
3. **API contract** - Define exact endpoint structure and responses
4. **Database plan** - Decide: in-line timeEntries or separate TimerSession model?
5. **Analytics strategy** - Real-time or aggregated? How far back to keep data?

### During Implementation

1. **Start with routes** - Backend first, then frontend can mock
2. **Implement timer state carefully** - This is the most fragile part
3. **Test edge cases aggressively** - Timer state issues are subtle
4. **Use feature flag** - Roll out to test users first
5. **Monitor performance** - Watch for slow analytics queries

### After Launch

1. **Monitor usage** - How many users enable time tracking?
2. **Gather feedback** - What's frustrating? What's missing?
3. **Watch for abuse** - Do time entries make sense?
4. **Iterate analytics** - Do users find insights useful?
5. **Consider team features** - If single-user adoption is high

---

## Related Features to Consider Later

These could extend time tracking in future:

1. **Time Budgets** - "I budgeted 40 hours/week, track usage"
2. **Time Goals** - "I want to do 5 hours of deep work this week"
3. **Time Billing** - "Export time entries for invoicing"
4. **Team Timesheets** - "See team member time (shared projects)"
5. **Time Blocking** - "Schedule blocks of focused time"
6. **Pomodoro Timer** - Integrated work/break intervals
7. **Focus Sessions** - Track uninterrupted deep work time
8. **Time Insights Email** - Weekly summary of where time went

---

## Success Metrics

How to measure if this feature is successful:

1. **Adoption** - % of active users who enable time tracking
2. **Daily Active** - % of adopters who track time daily
3. **Accuracy** - Are time entries reasonable? (not 12-hour entries)
4. **Retention** - Do users continue tracking after first month?
5. **Engagement** - Do users view analytics/insights?
6. **Satisfaction** - NPS from users who tried it

**Target:** 20-30% adoption rate among active users.

---

## Questions for User

Before implementation, clarify:

1. Is time tracking priority? (listed as Medium priority)
2. Is this for personal productivity or freelance billing?
3. Any specific analytics insights you want to see?
4. Would you use this daily or occasionally?
5. Preference: auto-stop at 2 hours, or let timer run?
6. Should time tracking be visible in task list, or only in details?
7. Any estimation format preference? (hours/minutes, hours.fraction, text)
8. Budget: how many hours could you allocate to this?

---

## Summary

**Time Logging is the most complex feature in the roadmap.** It's high-value for productivity but requires careful handling of stateful data (timer sessions), accurate time calculations, and thoughtful UX to avoid user friction.

If built well, it could transform myBrain from a task LIST into a productivity SYSTEM with data-driven insights about time patterns.

If built poorly, it could be intrusive, anxiety-inducing, or unreliable (bogus time entries).

This plan provides a solid technical foundation, but **user feedback is critical** before diving into implementation. The design and feature scope should be validated first.

---

*Plan created: 2026-01-31 | Status: Draft - Not Approved | Next step: User review and feedback*
