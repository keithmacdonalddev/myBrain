# Weekly Summary Feature - Future Plan

**STATUS: ROUGH DRAFT - Not Approved**

---

## Document Metadata

| Field | Value |
|-------|-------|
| **Created By** | Claude Haiku 4.5 |
| **Date Created** | 2026-01-31 |
| **Feature Status** | Draft - Not Approved |
| **Last Updated** | 2026-01-31 |
| **Plan Version** | 1.0 |
| **Target Release** | TBD (Pending Review) |

---

## Warning Box

**⚠️ IMPORTANT: This is a ROUGH DRAFT of a future feature idea.**

This document explores a potential feature that has NOT been approved for implementation. It's a brainstorm/planning document to:
- Validate the feature concept
- Identify technical requirements
- Estimate effort and complexity
- Gather feedback before committing resources

**Do NOT assume this will be built.** This requires:
1. Senior engineer review (see plan-review-process.md)
2. User feedback and validation
3. Priority evaluation against other features
4. Technical feasibility confirmation

---

## Why This Feature

### The Problem It Solves

Users can't see their productivity patterns over time. They may:
- Complete many tasks this week but not realize it
- Not notice they've stopped using certain features
- Miss celebrating wins and progress
- Lack data-driven insights for personal productivity

Current state:
- Dashboard shows real-time data (tasks due today, overdue, etc.)
- No historical comparison or week-over-week context
- Users have to manually track "how am I doing this week?"

### User Story

> As a productivity-focused user, I want to see a summary of my weekly accomplishments so that I can celebrate wins, identify patterns, and adjust my productivity strategies based on concrete data.

### Origin Story

This feature emerged from data analysis work on the dashboard service. The codebase already has:
- `Task.completedAt` timestamps (all completed tasks tracked)
- `Note.createdAt` timestamps (all notes timestamped)
- `Project.completedAt` for finished projects
- `UsageStats.getUsageProfile()` returning feature usage percentages
- Dashboard endpoint calculating `completedToday` and `completedThisWeek`

**Key Insight:** We have all the data needed. We just need to:
1. Expand the dashboard endpoint to include week-over-week comparisons
2. Create a widget to display the summary
3. Optionally: add a dedicated weekly summary page or email

This is a high-ROI feature because the foundational data collection is already built.

---

## Feature Specification

### Core Concept

A "Weekly Summary" that displays:
1. **Task Achievements** - Tasks completed this week vs last week (with comparison delta)
2. **Notes Created** - How many notes added this week
3. **Projects Progressed** - Projects completed, projects in progress
4. **Highlights** - Special accomplishments (cleared overdue, finished major project, long streak)
5. **Busiest Day** - Which day had the most activity
6. **Peak Productive Hours** - When the user is most productive during the day
7. **Trend Line** - Visual indicator of weekly trend (↑ up, → same, ↓ down)

### Presentation Options (To Be Decided)

1. **Option A: Dashboard Widget**
   - Fits alongside existing dashboard widgets
   - Always visible, user can pin/unpin
   - Compact view with "expand" option
   - Pros: Integrated, always visible, familiar context
   - Cons: Competes for dashboard space

2. **Option B: Dedicated Page**
   - New route: `/weekly-summary` or `/insights/weekly`
   - More room for detailed visualizations
   - Can include historical comparisons (last 4 weeks, trends)
   - Pros: Comprehensive, allows deep dives
   - Cons: Users might not visit regularly

3. **Option C: Email Digest**
   - Sent Sunday evening or Monday morning
   - Opt-in feature
   - Shows weekly summary in email
   - Pros: Reaches users proactively
   - Cons: Email deliverability, unsubscribe management

**Recommendation for MVP:** Start with Option A (widget), add B and C later if popular.

---

## Technical Implementation

### Backend: New Endpoint

**Endpoint:** `GET /dashboard/weekly-summary?timezone=America/New_York`

Returns aggregated data for the current week and previous week:

```javascript
{
  weekSummary: {
    currentWeek: {
      startDate: "2026-01-26T00:00:00.000Z",
      endDate: "2026-02-01T23:59:59.999Z",

      tasks: {
        completed: 14,
        total: 23,
        completionRate: 61,
        delta: {
          count: 3,              // 3 more than last week
          percent: 27            // 27% improvement
        }
      },

      notes: {
        created: 8,
        delta: { count: 2 }
      },

      projects: {
        completed: 1,
        inProgress: 3,
        delta: { completed: 1 }
      },

      highlights: [
        {
          type: "cleared_overdue",
          description: "Cleared 5 overdue tasks",
          date: "2026-01-28T14:30:00.000Z"
        },
        {
          type: "project_completed",
          description: "Finished 'Q1 Planning'",
          date: "2026-02-01T09:15:00.000Z"
        },
        {
          type: "streak",
          description: "3-day completion streak",
          days: 3,
          date: "2026-02-01T18:00:00.000Z"
        }
      ],

      activity: {
        busiestDay: {
          day: "Wednesday",
          date: "2026-01-29",
          taskCount: 5,
          noteCount: 3,
          totalInteractions: 18
        },

        peakHours: [
          { hour: 9, interactions: 12, label: "9am" },
          { hour: 14, interactions: 8, label: "2pm" },
          { hour: 20, interactions: 6, label: "8pm" }
        ],

        trend: {
          direction: "up",      // "up" | "down" | "stable"
          percentChange: 15,    // Percentage change from last week
          message: "Great week! 15% more productive than last week."
        }
      }
    },

    previousWeek: {
      startDate: "2026-01-19T00:00:00.000Z",
      endDate: "2026-01-25T23:59:59.999Z",

      tasks: {
        completed: 11,
        total: 20,
        completionRate: 55
      },

      notes: { created: 6 },
      projects: { completed: 0, inProgress: 2 }
      // ... abbreviated for brevity
    }
  }
}
```

### Queries Needed

**Query 1: Completed Tasks for Week (with timestamps)**

```javascript
// In taskService or dashboard service
const getWeeklyCompletedTasks = async (userId, startDate, endDate) => {
  return Task.find({
    userId,
    status: 'done',
    completedAt: { $gte: startDate, $lte: endDate }
  }).select('_id title priority project completedAt');
};
```

**Query 2: Notes Created This Week**

```javascript
const getWeeklyCreatedNotes = async (userId, startDate, endDate) => {
  return Note.find({
    userId,
    createdAt: { $gte: startDate, $lte: endDate }
  }).select('_id title createdAt');
};
```

**Query 3: Projects Completed This Week**

```javascript
const getWeeklyCompletedProjects = async (userId, startDate, endDate) => {
  return Project.find({
    userId,
    status: 'completed',
    completedAt: { $gte: startDate, $lte: endDate }
  }).select('_id name completedAt');
};
```

**Query 4: Busiest Day of Week**

```javascript
const getBusiestDay = async (userId, startDate, endDate) => {
  // Group UsageStats by date within week, sum all interactions
  return UsageStats.aggregate([
    {
      $match: {
        userId: new ObjectId(userId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        totalInteractions: { $sum: '$totalInteractions' },
        taskCompletes: {
          $sum: '$interactions.tasks.completes'
        },
        noteCreates: {
          $sum: '$interactions.notes.creates'
        },
        date: { $first: '$date' }
      }
    },
    { $sort: { totalInteractions: -1 } },
    { $limit: 1 }
  ]);
};
```

**Query 5: Peak Productive Hours**

```javascript
const getPeakHours = async (userId, startDate, endDate) => {
  // Aggregate interactions by hour of day
  // Note: May need UsageStats to store hour data, or calculate from timestamps
  return UsageStats.aggregate([
    {
      $match: {
        userId: new ObjectId(userId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $project: {
        hour: { $hour: '$date' },
        interactions: '$totalInteractions'
      }
    },
    {
      $group: {
        _id: '$hour',
        totalInteractions: { $sum: '$interactions' },
        count: { $sum: 1 }
      }
    },
    { $sort: { totalInteractions: -1 } },
    { $limit: 3 }  // Top 3 hours
  ]);
};

// Note: This assumes hourly granularity in UsageStats
// Currently UsageStats tracks at day level - may need enhancement
```

### Highlights Detection Logic

```javascript
const detectHighlights = async (userId, startDate, endDate) => {
  const highlights = [];

  // 1. Cleared overdue tasks
  const overdueBefore = await Task.countDocuments({
    userId,
    status: 'done',
    dueDate: { $lt: startDate },
    completedAt: { $gte: startDate, $lte: endDate }
  });
  if (overdueBefore >= 3) {
    highlights.push({
      type: 'cleared_overdue',
      description: `Cleared ${overdueBefore} overdue tasks`,
      severity: 'high'
    });
  }

  // 2. Completed projects
  const completedProjects = await Project.find({
    userId,
    status: 'completed',
    completedAt: { $gte: startDate, $lte: endDate }
  }).select('name completedAt');
  completedProjects.forEach(p => {
    highlights.push({
      type: 'project_completed',
      description: `Finished "${p.name}"`,
      date: p.completedAt,
      severity: 'high'
    });
  });

  // 3. Completion streaks
  const completedDates = await Task.aggregate([
    {
      $match: {
        userId: new ObjectId(userId),
        status: 'done',
        completedAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $project: {
        date: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } }
      }
    },
    {
      $group: {
        _id: '$date'
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const streak = calculateConsecutiveDays(completedDates.map(d => d._id));
  if (streak >= 3) {
    highlights.push({
      type: 'streak',
      description: `${streak}-day completion streak`,
      days: streak,
      severity: 'medium'
    });
  }

  return highlights.sort((a, b) => b.severity - a.severity);
};

// Helper: Calculate consecutive days
function calculateConsecutiveDays(dateStrings) {
  if (dateStrings.length === 0) return 0;

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < dateStrings.length; i++) {
    const prev = new Date(dateStrings[i - 1]);
    const curr = new Date(dateStrings[i]);
    const diffDays = (curr - prev) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      currentStreak++;
    } else {
      maxStreak = Math.max(maxStreak, currentStreak);
      currentStreak = 1;
    }
  }

  return Math.max(maxStreak, currentStreak);
}
```

### Streak Calculation Logic

A streak is a series of consecutive days where the user completed at least one task or created a note.

```javascript
const calculateStreak = async (userId) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let currentStreak = 0;
  let checkDate = new Date(today);

  // Walk backwards from today
  while (true) {
    const hasActivity = await Task.findOne({
      userId,
      status: 'done',
      completedAt: {
        $gte: checkDate,
        $lt: new Date(checkDate.getTime() + 24 * 60 * 60 * 1000)
      }
    }) || await Note.findOne({
      userId,
      createdAt: {
        $gte: checkDate,
        $lt: new Date(checkDate.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (hasActivity) {
      currentStreak++;
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return currentStreak;
};
```

### Frontend: Widget Component

**Location:** `myBrain-web/src/features/dashboard/widgets-v2/WeeklySummaryWidgetV2.jsx`

Component structure:
```jsx
<Widget>
  <WidgetHeader
    title="This Week"
    icon="<chart icon>"
    actions={[
      { label: "View Full Report", onClick: goToPage },
      { label: "Email Summary", onClick: emailSummary }
    ]}
  />

  <MetricsRow>
    <MetricCard label="Completed" value={14} change={+3} />
    <MetricCard label="Created" value={8} change={+2} />
    <MetricCard label="Streak" value={3} unit="days" />
  </MetricsRow>

  <TrendIndicator direction="up" change={15} />

  <HighlightsList highlights={highlights} />

  <BusiestDay day="Wednesday" count={5} />

  <PeakHours hours={peakHours} />
</Widget>
```

---

## Parallel Model Opportunities

These features share infrastructure and could be built in parallel:

1. **Daily Summary** (Light version)
   - Simpler queries, subset of weekly data
   - Could be mini-widget in dashboard
   - Uses same data aggregation patterns
   - Effort: 40% of weekly summary

2. **Monthly Report**
   - Same backend logic, longer date ranges
   - Could include trend charts (4-week history)
   - Uses same queries, aggregations
   - Effort: 50% of weekly summary

3. **Productivity Insights Page**
   - Dedicated page showing all summaries (daily, weekly, monthly)
   - Unified UI/UX for all report types
   - Advanced filtering, date range selection
   - Effort: 30% additional (shares foundation)

4. **Email Digest Service**
   - Subscribe to weekly email
   - Uses same data aggregation
   - Add email template, cron job, unsubscribe logic
   - Effort: 35% additional

5. **Habit Tracker Integration**
   - Track weekly habit completion rates
   - Uses same streak calculation
   - Habit widgets in summary
   - Effort: 25% additional (shares query patterns)

**Recommendation:** Build weekly summary first. Use it as foundation for daily/monthly versions.

---

## Parallel Execution Cautions

**Critical Dependencies:**

1. **UsageStats Enhancement**
   - Current: Day-level granularity only
   - Needed: Hour-level data for "peak productive hours"
   - **Action:** Decide if to add hour field to UsageStats or calculate on-the-fly from task/note timestamps
   - **Timeline:** Must resolve before peak hours feature

2. **Timezone Handling**
   - Must be consistent across all date calculations
   - Week boundaries vary by timezone (Sunday vs Monday start)
   - **Action:** Verify dashboard service already handles `timezone` param
   - **Timeline:** Critical for accuracy

3. **Performance at Scale**
   - Current user has <1000 tasks, ~500 notes
   - Queries above may slow if aggregating across 10+ years of data
   - **Action:** Add date range limiting, consider caching last week's summary
   - **Timeline:** Test with 1000+ task datasets

4. **Streak Calculation Performance**
   - Walking backwards day-by-day is O(n) where n = days since registration
   - For 5-year users, this is ~1825 lookups
   - **Action:** Consider caching streaks in User model or dedicated cache
   - **Timeline:** Optimize if > 100ms latency observed

---

## Implementation Tasks

### Phase 1: Backend Foundation (2-3 days)

#### 1.1 Create `weeklyService.js`
- **Subtask:** Write `getWeeklyData(userId, startDate, endDate)` master function
- **Subtask:** Implement `getCompletedTasks()` query
- **Subtask:** Implement `getCreatedNotes()` query
- **Subtask:** Implement `getCompletedProjects()` query
- **Subtask:** Add error handling and logging

#### 1.2 Extend Dashboard Service
- **Subtask:** Add `getBusiestDay()` helper
- **Subtask:** Add `getPeakProductiveHours()` helper
- **Subtask:** Integrate weekly summary into `/dashboard` endpoint
- **Subtask:** Add timezone param support (if not already)

#### 1.3 Highlight Detection
- **Subtask:** Implement `detectOverdueCleared()` highlight
- **Subtask:** Implement `detectProjectsCompleted()` highlight
- **Subtask:** Implement `calculateStreak()` helper
- **Subtask:** Implement `detectStreak()` highlight

#### 1.4 Testing
- **Subtask:** Write unit tests for all query functions
- **Subtask:** Write integration tests for `/dashboard/weekly-summary` endpoint
- **Subtask:** Test with sample data (20-30 tasks/notes across 2 weeks)

### Phase 2: Frontend Widget (2-3 days)

#### 2.1 Component Structure
- **Subtask:** Create `WeeklySummaryWidgetV2.jsx` base component
- **Subtask:** Create `MetricRow.jsx` for task/note/project counts
- **Subtask:** Create `TrendIndicator.jsx` component
- **Subtask:** Create `HighlightsList.jsx` component

#### 2.2 Data Integration
- **Subtask:** Create hook `useWeeklySummary()` with TanStack Query
- **Subtask:** Wire up data from `/dashboard/weekly-summary` endpoint
- **Subtask:** Handle loading/error states with Skeleton

#### 2.3 Styling
- **Subtask:** Add to `dashboard-v2.css` or new `weekly-summary.css`
- **Subtask:** Ensure dark mode support with CSS variables
- **Subtask:** Mobile responsive (test at 375px, 768px, 1280px)

#### 2.4 Interactions
- **Subtask:** "View Full Report" button → navigate to dedicated page (future)
- **Subtask:** "Email Summary" button → show opt-in modal (future)
- **Subtask:** Pin/unpin widget functionality

#### 2.5 Testing
- **Subtask:** Component render tests
- **Subtask:** Data loading tests
- **Subtask:** Mobile responsiveness tests

### Phase 3: Polish & Optional Features (1-2 days)

#### 3.1 Performance
- **Subtask:** Profile queries with 100+ tasks
- **Subtask:** Add query caching if needed
- **Subtask:** Optimize aggregation pipelines

#### 3.2 Accessibility
- **Subtask:** WCAG AA audit of widget
- **Subtask:** Semantic HTML review
- **Subtask:** Screen reader testing

#### 3.3 Documentation
- **Subtask:** Document `weeklyService.js` API
- **Subtask:** Document component props and usage
- **Subtask:** Update architecture.md with new models/endpoints

#### 3.4 Future Work (Not in MVP)
- **Subtask:** Plan dedicated weekly summary page route
- **Subtask:** Plan email digest feature
- **Subtask:** Plan daily/monthly summary variants

---

## ASCII Mockup: Weekly Summary Widget

```
┌─────────────────────────────────────────────────────────────┐
│ This Week                              📊  ...  [View Full]  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Completed        Created         Streak                      │
│     14  ↑3           8  ↑2            3 days                   │
│   Tasks          Notes           Completion                   │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ✓ Great week! 15% more productive than last week            │
│  └─ Trending: ↑ (up from 12 tasks last week)                │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Highlights                                                   │
│  ✨ Cleared 5 overdue tasks (Jan 28)                         │
│  🎉 Finished "Q1 Planning" project (Feb 01)                  │
│  🔥 3-day completion streak                                   │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Busiest Day                                                  │
│  Wednesday, Jan 29  →  5 tasks, 3 notes, 18 interactions   │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Peak Productive Hours                                        │
│  9am   ████████████ 12 interactions                           │
│  2pm   ████████ 8 interactions                                │
│  8pm   ██████ 6 interactions                                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Expanded View (Dedicated Page Mockup)

```
═════════════════════════════════════════════════════════════════
  WEEKLY SUMMARY: Jan 26 - Feb 01, 2026
═════════════════════════════════════════════════════════════════

THIS WEEK vs LAST WEEK
─────────────────────────────────────────────────────────────────

  TASKS                         NOTES                 PROJECTS
  ┌─────────────┐              ┌──────────┐         ┌──────────┐
  │ Completed   │              │ Created  │         │ Completed│
  │    14       │              │    8     │         │    1     │
  │ (+3, +27%)  │              │ (+2)     │         │ (+1)     │
  └─────────────┘              └──────────┘         └──────────┘

TREND ANALYSIS
─────────────────────────────────────────────────────────────────
Overall Productivity:  ↑ 15% above last week
Active Days:           6 out of 7 (missed Monday)
Avg Tasks/Day:         2.3 (last week: 1.9)
Avg Notes/Day:         1.1 (last week: 0.9)

HIGHLIGHTS
─────────────────────────────────────────────────────────────────
✨ Cleared 5 overdue tasks on Jan 28
🎉 Completed "Q1 Planning" on Feb 01
🔥 3-day completion streak (Jan 29-31)
📈 Best day this week: Wednesday (5 tasks)

WEEKLY BREAKDOWN
─────────────────────────────────────────────────────────────────
Mon:  [   ] 1 task
Tue:  [  □ ] 2 tasks, 1 note
Wed:  [  ■ ] 5 tasks, 3 notes  ← Busiest
Thu:  [  □ ] 2 tasks, 2 notes
Fri:  [ □□ ] 3 tasks, 1 note
Sat:  [  □ ] 1 task, 1 note
Sun:  [    ] (off)

PEAK PRODUCTIVE HOURS
─────────────────────────────────────────────────────────────────
  9am   ████████████ 12 interactions  ← Most active
  2pm   ████████     8 interactions
  8pm   ██████       6 interactions

═════════════════════════════════════════════════════════════════
```

---

## Technical Concerns & Decisions Needed

### 1. **UsageStats Hour-Level Granularity**

Current behavior: UsageStats stores data at day level only.

**Option A: Add hour field to UsageStats**
- Schema change: Add `hourlyBreakdown: { [hour]: count }`
- Tracking: Increment counter when interaction happens
- Query: Easy aggregation
- Pros: Accurate, efficient
- Cons: Schema migration, backward compatibility

**Option B: Calculate peak hours from task/note timestamps**
- No schema change
- Query: Group task.completedAt by hour, group note.createdAt by hour
- Pros: Backward compatible, uses existing data
- Cons: Only counts creates/completes, not all interactions

**Recommendation:** Option B for MVP. It's accurate enough and doesn't require schema changes. If peak hours prove popular, upgrade to Option A later.

### 2. **Week Start Day (Sunday vs Monday)**

Question: Should weeks start on Sunday or Monday?

**Current:** Assuming Sunday (most common)
- Week: Sunday 00:00 UTC - Saturday 23:59:59 UTC

**Alternative:** Monday start
- Week: Monday 00:00 UTC - Sunday 23:59:59 UTC

**Action:** Check if dashboard.js already defines this. If not, add to feature spec and make configurable per user (in settings).

### 3. **Caching Strategy**

Weekly summaries can be expensive to calculate (multiple aggregations).

**Option A: No caching (simple)**
- Calculate fresh on every `/dashboard` request
- Pros: Always current, simple code
- Cons: Slow if 10+ aggregations

**Option B: Cache in Redis**
- Cache weekly summary for 1 hour
- Invalidate when new task/note/project completes
- Pros: Fast, reasonably fresh
- Cons: Adds Redis dependency, cache invalidation complexity

**Option C: Pre-calculate and store**
- Cron job: Every hour, pre-calculate summaries for all active users
- Return cached result immediately
- Pros: Fastest, can handle scale
- Cons: More infra, eventual consistency

**Recommendation:** Start with Option A (no caching). If perf is poor, implement Option B.

### 4. **Date Boundary & Timezone**

Ensuring consistent date calculations across timezones is critical.

Question: When is "this week" for a user in Tokyo vs New York?

**Spec requirement:**
- All date calculations must respect user's timezone
- "This week" boundaries must match user's local calendar
- Peak hours must be based on user's local time

**Example:**
```
User timezone: America/New_York (UTC-5)
User's "today": 2026-01-31 (their local date)
  → UTC equivalent: 2026-02-01 04:00:00 - 2026-02-01 04:59:59

Week start: Sunday Jan 26 (their time)
  → UTC: Jan 26 05:00:00 - Feb 02 04:59:59
```

**Action:** Implement timezone-aware helpers in a utility module.

---

## Success Metrics

How will we know if this feature is successful?

### Usage Metrics
- % of users who view the weekly summary widget (target: 60%+)
- Avg time spent viewing summary (target: >30 seconds)
- Click-through rate to "View Full Report" (when implemented)

### Engagement Metrics
- Daily active users (should increase if feature resonates)
- Weekly task completion rates (track if summary motivates users)
- Feature flag adoption (if optional, target 70%+ of beta users enable it)

### Quality Metrics
- Error rate on `/dashboard/weekly-summary` endpoint (target: <0.1%)
- P95 latency (target: <500ms)
- Widget render time (target: <200ms)

### User Feedback
- Net Promoter Score (NPS) for feature (target: >40)
- User comments/reviews
- Support tickets about feature

---

## Open Questions

Questions to resolve before implementation:

1. **Widget vs Page vs Email?**
   - Which should be MVP?
   - Should all three be built eventually?

2. **Highlight Categories?**
   - Are the 3 highlighted types (overdue cleared, projects completed, streaks) sufficient?
   - Should we add more: "Most productive day", "New personal best", etc?

3. **Data Retention**
   - How far back should users be able to see summaries?
   - Should we calculate summaries for all past weeks or just current?

4. **Comparison Granularity**
   - Week-over-week only, or month-over-month too?
   - Should we track 4-week trends?

5. **Sharing**
   - Should users be able to share their weekly summary?
   - Privacy implications?

6. **Gamification**
   - Should we add badges, achievements, milestones?
   - Weekly "streaks" leaderboard (against user's own history)?

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Query performance slow at scale | Medium | Test with 100+ tasks, add caching if needed |
| Timezone edge cases | Medium | Thorough testing across timezones |
| Incorrect streak calculation | Medium | Unit test all date math |
| Missing schema migration | Medium | Add UsageStats enhancement before launch |
| Low adoption | Low | Start as dashboard widget (high visibility) |
| Data inconsistency | Low | Single source of truth: task/note/project timestamps |

---

## Not in Scope (Future Work)

These features are out of scope for this plan but could follow:

- [ ] Habit tracking integration
- [ ] Email digest subscriptions
- [ ] Dedicated analytics page
- [ ] Monthly/quarterly reports
- [ ] Productivity score calculation
- [ ] Peer comparisons (benchmarks)
- [ ] AI-powered insights ("You work best on Wednesdays")
- [ ] Goal tracking against summary data

---

## Next Steps

1. **Senior Engineer Review** - Submit plan to senior engineers for feedback
2. **Technical Validation** - Confirm UsageStats queries are viable
3. **Design Review** - Get approval on widget mockup
4. **Feasibility Check** - Estimate total effort (days)
5. **Priority Evaluation** - Rank against other features
6. **Approval Decision** - Proceed or iterate?

---

## Appendix: Example Data Structures

### Weekly Summary Response (Full Example)

```json
{
  "weekSummary": {
    "currentWeek": {
      "startDate": "2026-01-26T00:00:00.000Z",
      "endDate": "2026-02-01T23:59:59.999Z",
      "weekRange": "Jan 26 - Feb 1",

      "tasks": {
        "completed": 14,
        "total": 23,
        "completionRate": 61,
        "delta": {
          "count": 3,
          "percent": 27,
          "comparison": "+3 from last week"
        }
      },

      "notes": {
        "created": 8,
        "delta": {
          "count": 2,
          "comparison": "+2 from last week"
        }
      },

      "projects": {
        "completed": 1,
        "inProgress": 3,
        "delta": {
          "completed": 1,
          "comparison": "1 new completion vs 0 last week"
        }
      },

      "highlights": [
        {
          "type": "cleared_overdue",
          "severity": "high",
          "description": "Cleared 5 overdue tasks",
          "count": 5,
          "date": "2026-01-28T14:30:00.000Z"
        },
        {
          "type": "project_completed",
          "severity": "high",
          "description": "Finished 'Q1 Planning'",
          "projectName": "Q1 Planning",
          "projectId": "507f1f77bcf86cd799439011",
          "date": "2026-02-01T09:15:00.000Z"
        },
        {
          "type": "streak",
          "severity": "medium",
          "description": "3-day completion streak",
          "days": 3,
          "startDate": "2026-01-29T00:00:00.000Z",
          "endDate": "2026-01-31T23:59:59.999Z"
        }
      ],

      "activity": {
        "busiestDay": {
          "day": "Wednesday",
          "date": "2026-01-29",
          "dayOfWeek": 3,
          "taskCompletions": 5,
          "noteCreates": 3,
          "totalInteractions": 18,
          "percentOfWeek": 27
        },

        "peakHours": [
          {
            "hour": 9,
            "label": "9:00 AM",
            "interactions": 12,
            "percentOfDay": 35
          },
          {
            "hour": 14,
            "label": "2:00 PM",
            "interactions": 8,
            "percentOfDay": 24
          },
          {
            "hour": 20,
            "label": "8:00 PM",
            "interactions": 6,
            "percentOfDay": 18
          }
        ],

        "trend": {
          "direction": "up",
          "percentChange": 15,
          "message": "Great week! 15% more productive than last week.",
          "comparisonMetric": "tasks_completed"
        }
      }
    },

    "previousWeek": {
      "startDate": "2026-01-19T00:00:00.000Z",
      "endDate": "2026-01-25T23:59:59.999Z",
      "weekRange": "Jan 19 - Jan 25",

      "tasks": {
        "completed": 11,
        "total": 20,
        "completionRate": 55
      },

      "notes": {
        "created": 6
      },

      "projects": {
        "completed": 0,
        "inProgress": 2
      }
    }
  },

  "metadata": {
    "timezone": "America/New_York",
    "generatedAt": "2026-02-01T18:30:00.000Z",
    "daysActive": 6
  }
}
```

---

## References

- Dashboard service: `myBrain-api/src/services/dashboardService.js`
- Task model: `myBrain-api/src/models/Task.js`
- Note model: `myBrain-api/src/models/Note.js`
- UsageStats model: `myBrain-api/src/models/UsageStats.js`
- Architecture docs: `.claude/docs/architecture.md`

---

**End of Plan Document**

*This is a living document. It will be updated as feedback is received and technical exploration reveals new insights.*
