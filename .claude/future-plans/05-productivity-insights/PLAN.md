# PRODUCTIVITY INSIGHTS FEATURE PLAN

**Status:** ROUGH DRAFT - NOT APPROVED
**Created by:** Claude Haiku 4.5
**Date:** 2026-01-31
**Version:** 1.0

---

## EXECUTIVE SUMMARY

This plan outlines implementation of **PRODUCTIVITY INSIGHTS**, a user-facing analytics feature that surfaces hidden value from existing data. Users will see their productivity patterns (peak hours, active days, feature usage) derived from data already being collected but not currently exposed to them.

**Core Insight:** myBrain already tracks:
- Daily interaction counts per feature (UsageStats)
- Task completion timestamps (Task.completedAt)
- Page views and time spent (AnalyticsEvent)
- Feature usage with decay weighting (UsageStats.getUsageProfile)

**Missing Gap:** No aggregation by hour-of-day, day-of-week, or streak calculations. This plan fills that gap.

---

## WHY THIS FEATURE

### The Problem

Users create data every day through their interactions with myBrain:
- They complete tasks at specific hours
- They're more productive certain days of the week
- They use some features far more than others
- They have streaks of consistent productivity

**But they can't see any of it.** The data is collected internally, used for admin dashboards, but never surfaced to users. This is lost value—personal insights that would help users understand and optimize their own productivity patterns.

### User Story

**As a productivity-focused user, I want to see:**
- Which hours of the day I'm most productive (so I can schedule focus work during peak hours)
- Which days of the week I'm most active (so I can understand my work rhythms)
- What percentage of my time goes to each feature (so I can ensure I'm using the right tools for my goals)
- My current and best-ever productivity streaks (so I can build consistent habits)
- How my productivity compares to my personal average (so I can track improvement)

**Real Example:**
> "I notice I'm most productive 9-11 AM and 3-5 PM. Mondays I'm always slow—I should schedule meetings then instead of focus work. 60% of my interactions are with tasks, 25% notes, 15% projects. My streak is 7 days and my best was 21. I'm above my average this week."

This is the kind of personal intelligence that justifies a **Productivity Insights** widget.

### Origin: Hidden Data, Missing Interface

The infrastructure is already built:
- **UsageStats** tracks creates/views/edits/completes per feature per day
- **Task.completedAt** records exact timestamps of completions
- **AnalyticsEvent** has getHourlyActivity() with $hour aggregation
- **AnalyticsEvent** has timestamp (can be grouped by day of week)

All we need is:
1. Add aggregations to UsageStats (hour-of-day, day-of-week)
2. Add streak calculation logic (continuous completion history)
3. Build a widget UI to display the insights
4. Add backend route to compute and return all insights in one payload

**Why Now:** We already invested in AnalyticsEvent and UsageStats. Not surfacing this to users leaves money on the table (users want personal insights; this is a premium feature differentiator).

---

## FEATURE OVERVIEW

### What Users Will See

#### Productivity Insights Widget (Dashboard V2)

A new widget showing:
1. **Peak Productive Hours** - Histogram showing which hours (0-23) have most task completions
2. **Day of Week Breakdown** - Bar chart showing Mon-Sun activity levels
3. **Feature Usage Breakdown** - Pie/donut chart: Tasks 45%, Notes 28%, Projects 15%, Events 8%, Other 4%
4. **Current & Best Streak** - Banner: "7-day streak 🔥 | Best: 21 days"
5. **Personal Average Comparison** - "Above average this week (+12%)" or "Below average (-5%)"

#### Data Points Exposed

Each section includes:
- **Peak Hours:** Top 3 productive hours + histogram of all 24 hours
- **Day of Week:** Rank days Mon-Sun, show total interactions per day
- **Feature Usage:** Percentages by feature (weighted like dashboard intelligence)
- **Streaks:** Current streak count + best streak count
- **Comparison:** This week vs personal 30-day average (delta + %)

### Data Freshness

- Updated daily (snapshot of yesterday's data + 30-day rolling window)
- Computed async at end of day or on-demand when user views widget
- Cached for 1 hour to avoid repeated expensive aggregations

### What Data Sources Power This

| Insight | Source | How It Works |
|---------|--------|-------------|
| Peak Hours | **AnalyticsEvent** or **Task.completedAt** | Group task completions by hour of day |
| Day of Week | **UsageStats** | Group daily interaction counts by day of week |
| Feature Usage | **UsageStats.getUsageProfile()** | Already implemented, just surface to UI |
| Current Streak | **Task** records | Find consecutive days with ≥1 completion |
| Best Streak | **Task** records | Find longest consecutive days with ≥1 completion |
| Comparison | **UsageStats** | This week's total vs 30-day rolling average |

---

## TECHNICAL ARCHITECTURE

### Backend Changes

#### 1. Add Methods to UsageStats Model

```javascript
/**
 * getProductivityInsights(userId, days = 30)
 * ------------------------------------------
 * One-stop endpoint for all productivity insights.
 * Returns: {
 *   peakHours: [
 *     { hour: 9, completions: 24, percentage: 8 },
 *     { hour: 14, completions: 31, percentage: 10 },
 *     ...
 *   ],
 *   dayOfWeekBreakdown: [
 *     { day: 'Monday', interactions: 145, percentage: 18 },
 *     { day: 'Tuesday', interactions: 142, percentage: 17 },
 *     ...
 *   ],
 *   featureUsage: { tasks: 45, notes: 28, projects: 15, ... },
 *   currentStreak: 7,
 *   bestStreak: 21,
 *   thisWeekTotal: 486,
 *   thirtyDayAverage: 380,
 *   percentAboveAverage: 28
 * }
 */
```

**MongoDB Aggregation Pipeline for Peak Hours:**

```javascript
// Pseudocode - actual implementation in file below
UsageStats.aggregate([
  // Match user and date range
  { $match: { userId: ObjectId(userId), date: { $gte: startDate, $lte: endDate } } },

  // For each day's date, calculate hour of day
  // Note: This requires getting Task.completedAt instead - see below

  // Group by hour (0-23)
  { $group: {
      _id: { $hour: '$date' },  // Won't work directly on date field
      completions: { $sum: 1 },
      percentage: ...
    }
  },

  // Sort by most productive
  { $sort: { completions: -1 } }
]);
```

**IMPORTANT:** UsageStats stores daily aggregates, not hourly data. To get peak hours by time-of-day, we need:
- **Option A:** Use Task.completedAt (already has timestamps) - Extract hour, aggregate
- **Option B:** Add hourly buckets to UsageStats (breaking change, expensive) - NOT recommended
- **Option C:** Use AnalyticsEvent page_view duration data - Less reliable

**CHOSEN APPROACH:** Option A - Use Task.completedAt

**MongoDB Aggregation for Peak Hours (Task-based):**

```javascript
/**
 * Data: Task documents with completedAt timestamps
 * Goal: Group completions by hour of day (0-23) across all dates
 *
 * Example input:
 * Task 1: completedAt = 2026-01-31 09:45:00 UTC
 * Task 2: completedAt = 2026-01-30 09:15:00 UTC
 * Task 3: completedAt = 2026-01-30 14:30:00 UTC
 *
 * Expected output:
 * { hour: 9, count: 2, percentage: 67 }
 * { hour: 14, count: 1, percentage: 33 }
 */

db.tasks.aggregate([
  // 1. Match tasks for this user, completed in date range
  {
    $match: {
      userId: ObjectId("user_id"),
      status: "done",
      completedAt: { $gte: startDate, $lte: endDate }
    }
  },

  // 2. Extract hour of day (0-23) from completedAt timestamp
  {
    $project: {
      hour: { $hour: "$completedAt" },
      _id: 1
    }
  },

  // 3. Group by hour, count completions per hour
  {
    $group: {
      _id: "$hour",
      count: { $sum: 1 }
    }
  },

  // 4. Calculate total and percentages
  {
    $facet: {
      byHour: [
        { $project: { hour: "$_id", count: 1, _id: 0 } },
        { $sort: { hour: 1 } }
      ],
      total: [
        { $group: { _id: null, total: { $sum: "$count" } } }
      ]
    }
  },

  // 5. Add percentage calculations
  {
    $project: {
      peakHours: {
        $map: {
          input: "$byHour",
          as: "item",
          in: {
            hour: "$$item.hour",
            completions: "$$item.count",
            percentage: {
              $round: [
                { $multiply: [
                    { $divide: ["$$item.count", { $arrayElemAt: ["$total.total", 0] }] },
                    100
                  ]
                },
                0
              ]
            }
          }
        }
      },
      totalCompletions: { $arrayElemAt: ["$total.total", 0] }
    }
  }
]);
```

#### 2. Add Methods to Task Model

```javascript
/**
 * getProductivityStreaks(userId, lookbackDays = 365)
 * --------------------------------------------------
 * Calculate current and best-ever productivity streaks.
 * A "streak day" = user completed ≥ 1 task that day
 *
 * Returns: { currentStreak: 7, bestStreak: 21 }
 *
 * Algorithm:
 * 1. Get all distinct days user completed tasks (last N days)
 * 2. Sort by date descending
 * 3. Walk backward from today, counting consecutive days with ≥1 completion
 * 4. Track current streak
 * 5. Find longest gap-free sequence for best streak
 */
```

**Streak Calculation Pseudocode:**

```javascript
Task.aggregate([
  // Match completed tasks for this user
  { $match: { userId, status: "done", completedAt: { $exists: true } } },

  // Extract just the date (midnight UTC) from completedAt
  {
    $project: {
      completedDate: {
        $dateToString: {
          format: "%Y-%m-%d",
          date: "$completedAt",
          timezone: "UTC"
        }
      }
    }
  },

  // Get unique dates with completions
  { $group: { _id: "$completedDate" } },

  // Sort by date descending
  { $sort: { _id: -1 } },

  // Convert to array for processing
  { $group: {
      _id: null,
      daysWithCompletions: { $push: "$_id" }
    }
  }
]);

// Then in application code:
// 1. Convert dates to numbers (YYYYMMDD)
// 2. Walk backward from today
// 3. Count consecutive days (each day number = prev - 1)
// 4. Track current and best streak
```

#### 3. Add Methods to UsageStats Model (continued)

```javascript
/**
 * getDayOfWeekBreakdown(userId, days = 30)
 * ----------------------------------------
 * Group interactions by day of week (Mon-Sun).
 *
 * Returns: [
 *   { day: 'Monday', dayNum: 1, interactions: 145, percentage: 18 },
 *   { day: 'Tuesday', dayNum: 2, interactions: 142, percentage: 17 },
 *   ...
 * ]
 */
```

**MongoDB Aggregation for Day of Week:**

```javascript
db.usagestats.aggregate([
  // Match user, date range
  {
    $match: {
      userId: ObjectId("user_id"),
      date: { $gte: startDate, $lte: endDate }
    }
  },

  // Get day of week (0 = Sunday, 1 = Monday, ... 6 = Saturday)
  // MongoDB uses 0-6, so we'll use 1-7 for readability
  {
    $project: {
      dayOfWeek: {
        $cond: {
          if: { $eq: [{ $dayOfWeek: "$date" }, 1] },
          then: 7,  // Convert Sunday (1) to 7
          else: { $subtract: [{ $dayOfWeek: "$date" }, 1] }
        }
      },
      interactions: "$totalInteractions",
      _id: 0
    }
  },

  // Group by day of week
  {
    $group: {
      _id: "$dayOfWeek",
      totalInteractions: { $sum: "$interactions" }
    }
  },

  // Add day names and percentages
  {
    $project: {
      dayNum: "$_id",
      day: {
        $switch: {
          branches: [
            { case: { $eq: ["$_id", 1] }, then: "Monday" },
            { case: { $eq: ["$_id", 2] }, then: "Tuesday" },
            { case: { $eq: ["$_id", 3] }, then: "Wednesday" },
            { case: { $eq: ["$_id", 4] }, then: "Thursday" },
            { case: { $eq: ["$_id", 5] }, then: "Friday" },
            { case: { $eq: ["$_id", 6] }, then: "Saturday" },
            { case: { $eq: ["$_id", 7] }, then: "Sunday" }
          ]
        }
      },
      interactions: "$totalInteractions",
      _id: 0
    }
  },

  // Sort by day number
  { $sort: { dayNum: 1 } }
]);
```

#### 4. Create New Route: GET /api/analytics/productivity-insights

```javascript
// File: myBrain-api/src/routes/analytics.js (extend existing)

router.get('/productivity-insights', requireAuth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const userId = req.user._id;

    // Get all insights in parallel
    const [peakHours, dayOfWeek, featureUsage, streaks] = await Promise.all([
      Task.getPeakProductiveHours(userId, days),
      UsageStats.getDayOfWeekBreakdown(userId, days),
      UsageStats.getUsageProfile(userId, days),
      Task.getProductivityStreaks(userId)
    ]);

    // Calculate comparison to personal average
    const thisWeekTotal = await UsageStats.getWeekTotal(userId);
    const thirtyDayAverage = await UsageStats.getThirtyDayAverage(userId);
    const percentAboveAverage = Math.round(
      ((thisWeekTotal - thirtyDayAverage) / thirtyDayAverage) * 100
    );

    res.json({
      peakHours,
      dayOfWeek,
      featureUsage,
      currentStreak: streaks.currentStreak,
      bestStreak: streaks.bestStreak,
      thisWeekTotal,
      thirtyDayAverage,
      percentAboveAverage,
      cachedAt: new Date(),
      cacheValidUntil: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Frontend Changes

#### 1. Create ProductivityInsightsWidget Component

```jsx
// File: myBrain-web/src/features/dashboard/widgets-v2/ProductivityInsightsWidget.jsx

export function ProductivityInsightsWidget() {
  const { data, isLoading, error } = useProductivityInsights();

  return (
    <Widget title="Productivity Insights" icon={TrendingUp}>
      {isLoading ? <WidgetSkeleton /> : error ? <ErrorState /> : (
        <div className="insights-container">
          <PeakHoursSection data={data.peakHours} />
          <DayOfWeekSection data={data.dayOfWeek} />
          <FeatureUsageSection data={data.featureUsage} />
          <StreakBanner
            current={data.currentStreak}
            best={data.bestStreak}
          />
          <ComparisonBadge
            thisWeek={data.thisWeekTotal}
            average={data.thirtyDayAverage}
            percent={data.percentAboveAverage}
          />
        </div>
      )}
    </Widget>
  );
}
```

#### 2. Add useProductivityInsights Hook

```jsx
// File: myBrain-web/src/features/dashboard/hooks/useProductivityInsights.js

export function useProductivityInsights(days = 30) {
  return useQuery({
    queryKey: ['productivityInsights', days],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/productivity-insights?days=${days}`);
      return res.json();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    cacheTime: 24 * 60 * 60 * 1000 // 1 day
  });
}
```

#### 3. Create Sub-Components

- `PeakHoursChart` - Histogram showing hours 0-23, highlighting top 3
- `DayOfWeekChart` - Bar chart showing Mon-Sun distribution
- `FeatureUsageChart` - Pie or donut chart
- `StreakBanner` - Large badge showing "7-day streak 🔥"
- `ComparisonBadge` - "Above average +12%" (green) or "Below average -5%" (amber)

---

## ASCII MOCKUPS

### Productivity Insights Widget (Dashboard V2)

```
┌─ PRODUCTIVITY INSIGHTS                                      ⋮ ├─
│
│  Peak Productive Hours
│  ┌────────────────────────────────────────────────────────┐
│  │ 9 AM   ████████ 8%                                     │
│  │ 2 PM   ██████████ 10%  ← Peak hour                    │
│  │ 3 PM   █████████ 9%                                    │
│  │ Other hours: 5%, 4%, 3%, 2%, 2%, 1%, 0%...           │
│  └────────────────────────────────────────────────────────┘
│
│  Day of Week Activity
│  ┌────────────────────────────────────────────────────────┐
│  │ Mon ██████ 145 interactions (18%)                      │
│  │ Tue ██████ 142 interactions (17%)                      │
│  │ Wed ████████ 168 interactions (21%) ← Most active     │
│  │ Thu █████ 135 interactions (17%)                       │
│  │ Fri ████ 98 interactions (12%)                         │
│  │ Sat ██ 45 interactions (6%)                            │
│  │ Sun ███ 72 interactions (9%)                           │
│  └────────────────────────────────────────────────────────┘
│
│  Feature Usage (30-day average)
│  ┌────────────────────────────────────────────────────────┐
│  │ Tasks      ███████████████ 45%                         │
│  │ Notes      ████████ 28%                                │
│  │ Projects   ███ 15%                                     │
│  │ Events     ██ 8%                                       │
│  │ Other      ██ 4%                                       │
│  └────────────────────────────────────────────────────────┘
│
│  🔥 7-day Streak          Best: 21 days
│
│  📈 Above average this week  +12% (486 vs 380 avg)
│
└────────────────────────────────────────────────────────────┘
```

### Mobile View (375px)

```
┌─ PRODUCTIVITY INSIGHTS    ⋮ ├─
│
│ Peak Hours
│ ┌──────────────────────┐
│ │ 9 AM   ████ 8%      │
│ │ 2 PM   █████ 10% ★  │
│ │ 3 PM   ████ 9%      │
│ │ [See more...]       │
│ └──────────────────────┘
│
│ Week Activity
│ ┌──────────────────────┐
│ │ Mon ███ 145         │
│ │ Tue ███ 142         │
│ │ Wed ████ 168 ★      │
│ │ Thu ███ 135         │
│ │ Fri ██ 98           │
│ │ Sat █ 45            │
│ │ Sun ██ 72           │
│ └──────────────────────┘
│
│ Feature Breakdown
│ ┌──────────────────────┐
│ │ [Pie Chart]          │
│ │ Tasks      45%       │
│ │ Notes      28%       │
│ │ Projects   15%       │
│ │ Events     8%        │
│ │ Other      4%        │
│ └──────────────────────┘
│
│ 🔥 7-day Streak
│ Best: 21 days
│
│ 📈 +12% vs average
│
└──────────────────────────┘
```

---

## PARALLEL MODEL OPPORTUNITIES

While implementing Productivity Insights, consider these parallel features:

### 1. **Productivity Score Badge**
  - Composite score (0-100) based on streaks, consistency, and feature adoption
  - Could appear in sidebar next to user profile
  - "Your productivity score this month: 78/100"

### 2. **Intelligent Scheduling Suggestions**
  - "You're most productive 9-11 AM. Schedule focus work then."
  - "You're inactive on Fridays. Try 'Focus Friday' habit."
  - Surface in a banner or suggestions widget

### 3. **Goal-Based Tracking**
  - "I want to complete 5 tasks per day" → Show daily progress vs goal
  - "I want to spend 40% of time on projects" → Show actual vs goal
  - Gamification elements (badges, milestones)

### 4. **Weekly Digest Email**
  - "Last week you completed 35 tasks (+28% vs average)"
  - "Your best 2-hour block: Tuesday 2-4 PM"
  - Link to full Productivity Insights widget

### 5. **Comparison Mode (Future - Premium)**
  - "Your productivity vs the last 3 months"
  - "Your productivity vs your personal best"
  - Trend lines, anomalies, inflection points

---

## PARALLEL EXECUTION CAUTIONS

### Performance Risks

**CRITICAL WARNING:** MongoDB aggregation pipelines on large datasets can be slow.

| Risk | Scenario | Mitigation |
|------|----------|-----------|
| **Slow peak hours query** | User with 10,000+ completed tasks | Use date range filter (default 30 days). Index on (userId, completedAt, status). |
| **Slow streak calculation** | Walking through 365 days of data | Only calculate on demand (not on every page load). Cache result for 24 hours. |
| **Concurrent requests** | Multiple simultaneous calls to /productivity-insights | Use query caching. Return cached result if <1 hour old. Implement rate limiting. |
| **Database load** | Peak hours aggregation on large task collection | Run aggregations off-peak. Pre-compute at midnight. Use materialized views (separate collection). |
| **Memory issues** | Large intermediate result sets | Limit lookback window. Paginate if needed (e.g., top 10 hours). Use $limit early in pipeline. |

### Optimization Strategies

1. **Add Database Indexes** (REQUIRED)
   ```javascript
   // Task collection
   db.tasks.createIndex({ userId: 1, status: 1, completedAt: -1 });
   db.tasks.createIndex({ userId: 1, completedAt: 1 });

   // UsageStats collection
   db.usagestats.createIndex({ userId: 1, date: -1 });
   ```

2. **Cache Aggressively**
   - Productivity insights are not real-time
   - Compute daily at 23:59 UTC, store in Redis or separate collection
   - Serve cached result for 24 hours
   - Invalidate on new task completion (next day)

3. **Limit Aggregation Scope**
   - Default to 30-day window (not 365)
   - Offer "Last 7 days", "Last 30 days", "Last 90 days" options
   - Precompute rolling windows

4. **Monitor Query Performance**
   - Log aggregation query times
   - Alert if /productivity-insights takes >5 seconds
   - Use `explain()` to verify index usage

5. **Consider Materialization**
   - For high-traffic, consider pre-computing daily snapshots
   - Store in separate collection: `ProductivitySnapshots`
   - Schedule nightly job to compute all users' snapshots
   - Serve from cache, not live aggregation

---

## IMPLEMENTATION TASKS

### Phase 1: Backend Foundation (Week 1)

**Task 1.1 - Add Indexes**
- [ ] Create compound index on Task (userId, status, completedAt)
- [ ] Create index on UsageStats (userId, date)
- [ ] Verify indexes with explain()

**Task 1.2 - Implement Task.getPeakProductiveHours()**
- [ ] Write MongoDB aggregation pipeline
- [ ] Extract hour from completedAt timestamps
- [ ] Group by hour, count, calculate percentages
- [ ] Add to Task model with static method
- [ ] Write unit tests
- [ ] Test with sample data: 50, 500, 5000 task records
- [ ] Verify performance (<1 second)

**Task 1.3 - Implement Task.getProductivityStreaks()**
- [ ] Query distinct completion dates
- [ ] Calculate current streak (consecutive days with ≥1 completion)
- [ ] Calculate best streak (longest gap-free sequence)
- [ ] Add to Task model with static method
- [ ] Write unit tests
- [ ] Handle edge cases (no completions, single day, all 365 days)

**Task 1.4 - Implement UsageStats.getDayOfWeekBreakdown()**
- [ ] Extract day of week from date field
- [ ] Group by day of week, sum interactions
- [ ] Add day names (Monday-Sunday)
- [ ] Calculate percentages
- [ ] Add to UsageStats model
- [ ] Write unit tests

**Task 1.5 - Implement Utility Methods**
- [ ] UsageStats.getWeekTotal(userId) - Sum of this week's interactions
- [ ] UsageStats.getThirtyDayAverage(userId) - Average daily interactions
- [ ] Task.getLastCompletedDate(userId) - For comparison calculations

### Phase 2: Backend API (Week 2)

**Task 2.1 - Create Analytics Route**
- [ ] Extend myBrain-api/src/routes/analytics.js
- [ ] Add route: GET /api/analytics/productivity-insights
- [ ] Implement requireAuth middleware
- [ ] Parallel fetch all insights using Promise.all()
- [ ] Assemble response payload
- [ ] Add error handling
- [ ] Test with multiple users

**Task 2.2 - Add Response Caching**
- [ ] Implement in-memory cache (Redis or Node Map)
- [ ] Cache key: `insights:${userId}:${days}`
- [ ] Cache duration: 1 hour
- [ ] Invalidate cache on new task completion
- [ ] Add cache hit/miss metrics

**Task 2.3 - Optimize Aggregations**
- [ ] Profile each aggregation with .explain()
- [ ] Verify index usage (stage: "COLLSCAN" = problem)
- [ ] Add $match early to filter by userId + date range first
- [ ] Use $limit to reduce intermediate documents
- [ ] Test with production-like data volumes

**Task 2.4 - Write API Tests**
- [ ] Test endpoint with 0 days, 7 days, 30 days, 90 days
- [ ] Verify response schema
- [ ] Test auth (401 if not authenticated)
- [ ] Test error handling (invalid user, database failure)
- [ ] Test performance (should return <2 seconds)

### Phase 3: Frontend Components (Week 3)

**Task 3.1 - Create Base Component Structure**
- [ ] ProductivityInsightsWidget.jsx (main container)
- [ ] useProductivityInsights hook (TanStack Query)
- [ ] Create sub-component files (Peak Hours, Day of Week, etc.)
- [ ] Add Widget wrapper with header/loading/error states
- [ ] Style with V2 CSS variables

**Task 3.2 - Implement Charts**
- [ ] PeakHoursChart - Horizontal bar chart (hours 0-23)
  - [ ] Use recharts or Canvas-based solution
  - [ ] Highlight top 3 hours
  - [ ] Show percentage labels
  - [ ] Responsive on mobile

- [ ] DayOfWeekChart - Vertical bar chart (Mon-Sun)
  - [ ] 7 bars, one per day
  - [ ] Sort Mon-Sun
  - [ ] Hover tooltip shows exact counts
  - [ ] Mobile: stack bars vertically

- [ ] FeatureUsageChart - Pie or Donut chart
  - [ ] Colors: tasks (blue), notes (purple), projects (green), events (orange), other (gray)
  - [ ] Show percentages
  - [ ] Legend with counts
  - [ ] Responsive sizing

**Task 3.3 - Implement Info Sections**
- [ ] StreakBanner component
  - [ ] Large number display for current streak
  - [ ] "Best: X days" below
  - [ ] 🔥 emoji for visual impact
  - [ ] Skeleton during loading

- [ ] ComparisonBadge component
  - [ ] Shows "Above/Below average"
  - [ ] Green for above, amber for below, neutral for equal
  - [ ] Percentage delta
  - [ ] Fallback text if insufficient data

**Task 3.4 - Add Loading & Error States**
- [ ] WidgetSkeleton for ProductivityInsightsWidget
- [ ] Error state with retry button
- [ ] Empty state if no data (user with no tasks)
- [ ] Loading skeletons for each chart

### Phase 4: Integration & Polish (Week 4)

**Task 4.1 - Add to Dashboard V2**
- [ ] Register ProductivityInsightsWidget in DashboardPageV2
- [ ] Position in widget grid (e.g., after Activity Log)
- [ ] Test responsive behavior (mobile/tablet/desktop)
- [ ] Ensure widget loads without breaking page

**Task 4.2 - Design System Compliance**
- [ ] Run /design-audit on widget CSS
- [ ] Verify V2 color variables used
- [ ] Check typography hierarchy (titles, labels, values)
- [ ] Verify spacing (24px minimum, 8px grid)
- [ ] Test dark mode appearance

**Task 4.3 - Accessibility Audit**
- [ ] Run /accessibility-audit
- [ ] Verify ARIA labels on charts
- [ ] Test keyboard navigation
- [ ] Verify color contrast (no color-only information)
- [ ] Test with screen reader

**Task 4.4 - Performance Testing**
- [ ] Load test: Widget loads in <2 seconds
- [ ] Memory test: No memory leaks with frequent refreshes
- [ ] Mobile test: Render performance on throttled device
- [ ] Smoke test entire dashboard

**Task 4.5 - Documentation & Tests**
- [ ] Write component prop documentation
- [ ] Add JSDoc comments
- [ ] Create unit tests for useProductivityInsights hook
- [ ] Create E2E tests (widget renders, shows data, interacts)

---

## DETAILED TASKS & SUBTASKS

### Task 1.1: Create Database Indexes

```bash
# Connect to MongoDB
mongo "mongodb+srv://..."

# Create indexes
db.tasks.createIndex({ userId: 1, status: 1, completedAt: -1 });
db.tasks.createIndex({ userId: 1, completedAt: 1 });
db.usagestats.createIndex({ userId: 1, date: -1 });

# Verify they exist
db.tasks.getIndexes();
db.usagestats.getIndexes();
```

**Acceptance Criteria:**
- [ ] Indexes created without errors
- [ ] Queries using indexes (explain shows "COLLSCAN" → "IXSCAN")
- [ ] Performance acceptable (<1 second for test queries)

### Task 1.2: Implement getPeakProductiveHours()

**File:** `myBrain-api/src/models/Task.js`

```javascript
/**
 * getPeakProductiveHours(userId, days = 30)
 * -----------------------------------------
 * Groups completed tasks by hour of day (0-23).
 * Returns hours sorted by completion count.
 */
taskSchema.statics.getPeakProductiveHours = async function(userId, days = 30) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await this.aggregate([
    // Match completed tasks in date range
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        status: "done",
        completedAt: { $gte: startDate, $lte: endDate }
      }
    },
    // Extract hour (0-23)
    {
      $project: {
        hour: { $hour: "$completedAt" }
      }
    },
    // Group by hour
    {
      $group: {
        _id: "$hour",
        completions: { $sum: 1 }
      }
    },
    // Get total for percentage calculation
    {
      $facet: {
        hours: [
          { $project: { hour: "$_id", completions: 1, _id: 0 } }
        ],
        summary: [
          { $group: { _id: null, total: { $sum: "$completions" } } }
        ]
      }
    }
  ]);

  const hours = result[0]?.hours || [];
  const total = result[0]?.summary[0]?.total || 0;

  // Add percentages and fill missing hours
  const fullHours = [];
  for (let h = 0; h < 24; h++) {
    const found = hours.find(x => x.hour === h);
    fullHours.push({
      hour: h,
      completions: found?.completions || 0,
      percentage: total > 0 ? Math.round((found?.completions || 0) / total * 100) : 0
    });
  }

  return fullHours.sort((a, b) => b.completions - a.completions);
};
```

**Subtasks:**
- [ ] Write aggregation pipeline
- [ ] Handle null completedAt values
- [ ] Ensure all 24 hours present in output
- [ ] Calculate percentages correctly
- [ ] Test with 0 tasks (should return 24 zeros)
- [ ] Test with tasks spread across hours
- [ ] Test with all tasks in one hour

### Task 1.3: Implement getProductivityStreaks()

**File:** `myBrain-api/src/models/Task.js`

```javascript
/**
 * getProductivityStreaks(userId, lookbackDays = 365)
 * ------------------------------------------------
 * Calculate current and best-ever productivity streaks.
 * A "streak day" = user completed ≥1 task that day.
 */
taskSchema.statics.getProductivityStreaks = async function(userId, lookbackDays = 365) {
  // Get all distinct completion dates
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);

  const completionDates = await this.find({
    userId,
    status: "done",
    completedAt: { $gte: startDate }
  }).select('completedAt').lean();

  // Convert to date set (YYYY-MM-DD)
  const dateSet = new Set();
  completionDates.forEach(task => {
    const date = new Date(task.completedAt);
    const dateStr = date.toISOString().split('T')[0];
    dateSet.add(dateStr);
  });

  if (dateSet.size === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  // Sort dates
  const sortedDates = Array.from(dateSet).sort().reverse();

  // Calculate current streak (walking backward from today)
  let currentStreak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (dateSet.has(dateStr)) {
      currentStreak++;
    } else {
      break;
    }
    currentDate.setDate(currentDate.getDate() - 1);
  }

  // Calculate best streak (longest consecutive sequence)
  let bestStreak = 0;
  let tempStreak = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1]);
    const currDate = new Date(sortedDates[i]);
    const diffDays = Math.floor((prevDate - currDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      tempStreak++;
    } else {
      bestStreak = Math.max(bestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  bestStreak = Math.max(bestStreak, tempStreak);

  return {
    currentStreak: Math.max(currentStreak, 1), // At least 1 if they completed today
    bestStreak
  };
};
```

**Subtasks:**
- [ ] Extract unique completion dates
- [ ] Sort and deduplicate
- [ ] Walk backward from today for current streak
- [ ] Find longest gap-free sequence for best streak
- [ ] Handle timezone issues (completedAt is UTC)
- [ ] Test with no completions (return 0, 0)
- [ ] Test with single day (return 1, 1)
- [ ] Test with 365 consecutive days

### Task 2.1: Create Analytics Route

**File:** `myBrain-api/src/routes/analytics.js` (extend existing)

```javascript
/**
 * GET /api/analytics/productivity-insights
 * Query params: days=30 (default)
 * Returns: Complete productivity insights for authenticated user
 */
router.get('/productivity-insights', requireAuth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const userId = req.user._id;
    const parsedDays = Math.min(parseInt(days) || 30, 365); // Max 1 year

    // Check cache
    const cacheKey = `insights:${userId}:${parsedDays}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    // Fetch all insights in parallel
    const [peakHours, dayOfWeek, streaks] = await Promise.all([
      Task.getPeakProductiveHours(userId, parsedDays),
      UsageStats.getDayOfWeekBreakdown(userId, parsedDays),
      Task.getProductivityStreaks(userId)
    ]);

    // Get feature usage (already implemented)
    const featureUsage = await UsageStats.getUsageProfile(userId, parsedDays);

    // Calculate comparison metrics
    const thisWeekTotal = await UsageStats.getWeekTotal(userId);
    const thirtyDayAverage = await UsageStats.getThirtyDayAverage(userId);
    const percentAboveAverage = thirtyDayAverage > 0
      ? Math.round(((thisWeekTotal - thirtyDayAverage) / thirtyDayAverage) * 100)
      : 0;

    const insights = {
      peakHours,
      dayOfWeek,
      featureUsage: {
        tasks: featureUsage.tasks,
        notes: featureUsage.notes,
        projects: featureUsage.projects,
        events: featureUsage.events,
        messages: featureUsage.messages,
        images: featureUsage.images,
        files: featureUsage.files
      },
      currentStreak: streaks.currentStreak,
      bestStreak: streaks.bestStreak,
      thisWeekTotal,
      thirtyDayAverage,
      percentAboveAverage,
      generatedAt: new Date()
    };

    // Cache for 1 hour
    await cache.set(cacheKey, insights, 3600);

    res.json(insights);
  } catch (error) {
    console.error('Error fetching productivity insights:', error);
    res.status(500).json({ error: 'Failed to generate productivity insights' });
  }
});
```

**Subtasks:**
- [ ] Add route to existing analytics.js file
- [ ] Implement cache layer (Redis or in-memory)
- [ ] Implement requireAuth middleware
- [ ] Handle query parameter parsing
- [ ] Implement Promise.all() for parallel execution
- [ ] Write error handling
- [ ] Add logging
- [ ] Test with curl/Postman
- [ ] Verify response schema

### Phase 3: Frontend Components (Detailed)

**Task 3.1.1: Create useProductivityInsights Hook**

**File:** `myBrain-web/src/features/dashboard/hooks/useProductivityInsights.js`

```javascript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api';

export function useProductivityInsights(days = 30) {
  return useQuery({
    queryKey: ['productivityInsights', days],
    queryFn: async () => {
      const response = await apiClient.get('/analytics/productivity-insights', {
        params: { days }
      });
      return response.data;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnWindowFocus: false,
    retry: 2,
    onError: (error) => {
      console.error('Failed to fetch productivity insights:', error);
    }
  });
}
```

**Task 3.2.1: Create PeakHoursChart Component**

**File:** `myBrain-web/src/features/dashboard/widgets-v2/components/PeakHoursChart.jsx`

```javascript
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

export function PeakHoursChart({ data }) {
  // Format hour labels (9 AM, 2 PM, etc.)
  const chartData = data.map(item => ({
    ...item,
    hourLabel: formatHour(item.hour)
  }));

  // Get top 3 hours for highlighting
  const top3 = chartData
    .sort((a, b) => b.completions - a.completions)
    .slice(0, 3)
    .map(x => x.hour);

  const getBarColor = (hour) => {
    if (top3.includes(hour)) return 'var(--v2-accent)'; // Bright accent
    return 'var(--v2-secondary)'; // Muted
  };

  return (
    <div className="peak-hours-chart">
      <h3>Peak Productive Hours</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--v2-border)" />
          <XAxis type="number" stroke="var(--v2-text-secondary)" />
          <YAxis
            dataKey="hourLabel"
            type="category"
            width={50}
            tick={{ fontSize: 12 }}
            stroke="var(--v2-text-secondary)"
          />
          <Tooltip
            formatter={(value) => `${value} completions`}
            cursor={{ fill: 'rgba(255,255,255,0.1)' }}
          />
          <Bar dataKey="completions" fill="var(--v2-secondary)" radius={4}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry.hour)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="chart-note">
        Top hour: {chartData[0]?.hourLabel} ({chartData[0]?.completions} completions)
      </p>
    </div>
  );
}

function formatHour(hour) {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12} ${ampm}`;
}
```

**Task 3.3.1: Create StreakBanner Component**

**File:** `myBrain-web/src/features/dashboard/widgets-v2/components/StreakBanner.jsx`

```javascript
import React from 'react';
import './StreakBanner.css';

export function StreakBanner({ current, best }) {
  return (
    <div className="streak-banner">
      <div className="streak-current">
        <div className="streak-number">{current}</div>
        <div className="streak-label">Day Streak</div>
        {current > 0 && <div className="streak-emoji">🔥</div>}
      </div>
      <div className="streak-divider" />
      <div className="streak-best">
        <div className="streak-label">Personal Best</div>
        <div className="streak-number">{best}</div>
      </div>
    </div>
  );
}
```

**CSS:** `myBrain-web/src/features/dashboard/widgets-v2/components/StreakBanner.css`

```css
.streak-banner {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: var(--v2-spacing-md);
  background: linear-gradient(
    135deg,
    var(--v2-accent-light) 0%,
    var(--v2-accent-light-fade) 100%
  );
  border-radius: var(--v2-radius-lg);
  margin-top: var(--v2-spacing-md);
  border: 1px solid var(--v2-accent-border);
}

.streak-current,
.streak-best {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--v2-spacing-xs);
}

.streak-number {
  font-size: 2rem;
  font-weight: 700;
  color: var(--v2-accent);
}

.streak-label {
  font-size: 0.875rem;
  color: var(--v2-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.streak-emoji {
  font-size: 1.5rem;
  animation: pulse 2s infinite;
}

.streak-divider {
  width: 1px;
  height: 60px;
  background: var(--v2-border);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (max-width: 768px) {
  .streak-banner {
    flex-direction: column;
    gap: var(--v2-spacing-md);
  }

  .streak-divider {
    width: 60px;
    height: 1px;
  }

  .streak-number {
    font-size: 1.5rem;
  }
}
```

---

## PERFORMANCE CONSIDERATIONS

### Query Complexity Analysis

| Query | Complexity | Best Case | Worst Case | Mitigation |
|-------|-----------|-----------|-----------|------------|
| getPeakProductiveHours | O(n log n) | 100ms (indexed query) | 3s (10k tasks, no index) | Index on (userId, status, completedAt) |
| getDayOfWeekBreakdown | O(n) | 50ms (30 daily docs) | 500ms (365 days) | Limit lookback window |
| getProductivityStreaks | O(n) | 200ms (in-memory sort) | 2s (10k distinct dates) | Cache result, async computation |
| getUsageProfile | O(n) | 100ms (already optimized) | 500ms (large window) | Use existing implementation |

### Recommended Indexes

```javascript
// Priority 1 (MUST HAVE)
db.tasks.createIndex({ userId: 1, status: 1, completedAt: -1 });

// Priority 2 (SHOULD HAVE)
db.usagestats.createIndex({ userId: 1, date: -1 });
db.tasks.createIndex({ userId: 1, completedAt: 1 });

// Priority 3 (NICE TO HAVE)
db.tasks.createIndex({ userId: 1, createdAt: 1 });
db.tasks.createIndex({ status: 1, completedAt: -1 });
```

### Caching Strategy

```
Request: GET /api/analytics/productivity-insights?days=30
↓
Check cache: insights:${userId}:30
↓
Hit → Return from cache (1ms) + set expiry to 1 hour
↓
Miss → Compute all aggregations in parallel (3-5 seconds)
       ↓
       Cache result
       ↓
       Return to client

Invalidation: On TaskCreated/TaskUpdated with status="done"
  → Invalidate cache for that user
  → Next request will recompute
```

### Production Safeguards

```javascript
// 1. Rate limit the endpoint
router.get('/productivity-insights',
  rateLimit({ windowMs: 60000, max: 10 }), // 10 per minute
  requireAuth,
  async (req, res) => { ... }
);

// 2. Add query timeout
const insights = await Promise.race([
  Promise.all([...]),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Query timeout')), 5000)
  )
]);

// 3. Monitor slow queries
if (Date.now() - startTime > 2000) {
  console.warn(`Slow productivity insights for ${userId}: ${Date.now() - startTime}ms`);
}

// 4. Fallback response
if (error) {
  return res.json({
    peakHours: [],
    dayOfWeek: [],
    featureUsage: {},
    currentStreak: 0,
    bestStreak: 0,
    error: 'Could not compute insights',
    cached: false
  });
}
```

---

## TESTING STRATEGY

### Unit Tests

**File:** `myBrain-api/src/models/__tests__/Task.test.js`

```javascript
describe('Task.getPeakProductiveHours', () => {
  it('should return all 24 hours even if some have 0 completions', async () => {
    // Setup: Create tasks, all in one hour
    // Verify: Result has 24 entries, one with count, others with 0
  });

  it('should calculate percentages correctly', async () => {
    // Setup: 100 completions total: 50 at 9 AM, 30 at 2 PM, 20 at 5 PM
    // Verify: Percentages are 50%, 30%, 20%
  });

  it('should respect date range filter', async () => {
    // Setup: 100 completions in last 30 days, 50 before that
    // Query: getPeakProductiveHours(userId, 7)
    // Verify: Returns only last 7 days of data
  });
});

describe('Task.getProductivityStreaks', () => {
  it('should calculate current streak correctly', async () => {
    // Setup: Completions on yesterday, today, and 5 days ago
    // Verify: Current streak = 2 (today + yesterday, gap at 4 days ago)
  });

  it('should calculate best streak correctly', async () => {
    // Setup: Consecutive completions for 21 days, then gap, then 7 days
    // Verify: Best streak = 21, current streak = 7
  });

  it('should return 0, 0 when no completions', async () => {
    // Setup: New user, no tasks
    // Verify: { currentStreak: 0, bestStreak: 0 }
  });
});
```

### Integration Tests

**File:** `myBrain-api/src/routes/__tests__/analytics.test.js`

```javascript
describe('GET /api/analytics/productivity-insights', () => {
  it('should return complete insights payload', async () => {
    // Setup: Authenticated user with sample data
    // Request: GET /api/analytics/productivity-insights?days=30
    // Verify: Response contains all fields:
    //   - peakHours (array of 24 items)
    //   - dayOfWeek (array of 7 items)
    //   - featureUsage (object with percentages)
    //   - currentStreak, bestStreak (numbers)
    //   - thisWeekTotal, thirtyDayAverage (numbers)
  });

  it('should respect days query parameter', async () => {
    // Setup: Create tasks spread over 90 days
    // Request: GET /api/analytics/productivity-insights?days=7
    // Verify: Only last 7 days are included
  });

  it('should cache results', async () => {
    // Setup: First request, cache miss, compute
    // Request: GET /api/analytics/productivity-insights
    // Verify: First request takes >100ms
    // Request: Second request (same params)
    // Verify: Second request takes <5ms (from cache)
  });

  it('should return 401 without auth', async () => {
    // Request: GET /api/analytics/productivity-insights (no auth)
    // Verify: 401 Unauthorized
  });

  it('should handle performance gracefully', async () => {
    // Setup: User with 10,000 completed tasks
    // Request: GET /api/analytics/productivity-insights
    // Verify: Response in <5 seconds, doesn't crash
  });
});
```

### E2E Tests

**File:** `myBrain-web/src/features/dashboard/ProductivityInsightsWidget.test.jsx`

```javascript
describe('ProductivityInsightsWidget', () => {
  it('should render charts with data', async () => {
    // Setup: Mock useProductivityInsights hook with sample data
    // Render: <ProductivityInsightsWidget />
    // Verify: Peak hours chart visible, day of week chart visible, streak banner visible
  });

  it('should show loading skeleton initially', async () => {
    // Setup: Mock hook in loading state
    // Render: Component
    // Verify: Skeleton visible
    // Trigger: Data load
    // Verify: Skeleton hidden, data visible
  });

  it('should display error state on failure', async () => {
    // Setup: Mock hook in error state
    // Render: Component
    // Verify: Error message visible
  });

  it('should update on days parameter change', async () => {
    // Render: Component with days=7
    // Verify: Chart shows 7-day data
    // Change: days=30
    // Verify: Chart updates with 30-day data
  });
});
```

---

## ROLLOUT PLAN

### Phase 1: Internal Testing (Week 1-2)
- Implement backend
- Test with owner account
- Monitor performance
- Verify data accuracy

### Phase 2: Beta (Week 3)
- Enable for test accounts
- Gather feedback
- Measure engagement
- Fix bugs

### Phase 3: General Availability (Week 4+)
- Enable for all users
- Monitor performance in production
- Watch for slow queries
- Gather usage metrics

### Feature Flag

```javascript
// Add to User model's premium features
if (user.role === 'premium' || user.role === 'admin') {
  flags.set('productivityInsightsEnabled', true);
}

// Frontend gate
if (useFeatureFlag('productivityInsightsEnabled')) {
  return <ProductivityInsightsWidget />;
}
```

---

## MONITORING & ALERTS

### Metrics to Track

```javascript
// Add to observability
observability.trackEvent('productivity_insights_viewed', {
  userId,
  days,
  loadTime,
  cached,
  aggregationTime,
  chartsRendered: 5
});

observability.gauge('productivity_insights_computation_time', computeTime);
observability.gauge('cache_hit_rate', cacheHits / totalRequests);
```

### Alert Conditions

| Condition | Alert | Action |
|-----------|-------|--------|
| Endpoint response time > 5s | Page/email | Investigate slow query |
| Error rate > 5% | Page/email | Check database connectivity |
| Cache miss rate > 50% | Slack/email | Increase cache TTL |
| Database CPU high | Page/email | Optimize aggregations |

---

## FUTURE ENHANCEMENTS

1. **Productivity Score** - Composite metric (0-100)
2. **Goal Tracking** - "Complete 5 tasks/day" with progress
3. **Smart Scheduling** - "You're most productive 9-11 AM, schedule focus then"
4. **Weekly Digest Email** - Productivity summary delivered Friday
5. **Comparison Timeline** - "This month vs last month" charts
6. **Anomaly Detection** - "You completed 3x more tasks than usual today!"
7. **Habit Formation** - "21-day streak: You're building a habit!"
8. **Social Comparison (Premium)** - Anonymous benchmark vs other users

---

## QUESTIONS & DECISIONS NEEDED

1. **Time Zone Handling**
   - Should peak hours be in user's local time or UTC?
   - Recommendation: Local time (user's timezone from profile)

2. **Feature Usage Weighting**
   - Should we use same weighting as dashboard intelligence (recent 2x, decay)?
   - Recommendation: Yes, consistent methodology

3. **Minimum Data Requirements**
   - Should widget show "insufficient data" if user < X completions?
   - Recommendation: Show all available data, even if small

4. **Cache Invalidation Strategy**
   - On new task completion, immediately invalidate?
   - Recommendation: Invalidate on task completion, recompute on demand

5. **Premium vs Free**
   - Should productivity insights be free or premium-only?
   - Recommendation: Include in all tiers (general value-add)

---

## ACCEPTANCE CRITERIA

### Definition of Done

- [ ] All backend methods implemented and tested
- [ ] /api/analytics/productivity-insights endpoint working
- [ ] ProductivityInsightsWidget displays correctly
- [ ] All charts render correctly on mobile/tablet/desktop
- [ ] Performance: Widget loads in <2 seconds
- [ ] Caching working (repeat requests <100ms)
- [ ] Error states handled gracefully
- [ ] Dark mode verified
- [ ] Accessibility audit passed (WCAG AA)
- [ ] Unit tests pass (>80% coverage)
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] No console errors
- [ ] No memory leaks
- [ ] Documentation complete

### User Acceptance Criteria

- [ ] User can view productivity insights widget
- [ ] Charts are readable and understandable
- [ ] Data appears accurate (matches manual spot-check)
- [ ] Widget fits naturally on dashboard
- [ ] Performance acceptable on all devices

---

## REFERENCES & RELATED DOCS

- **UsageStats Model:** `myBrain-api/src/models/UsageStats.js`
- **Task Model:** `myBrain-api/src/models/Task.js`
- **AnalyticsEvent Model:** `myBrain-api/src/models/AnalyticsEvent.js`
- **Design System:** `.claude/design/design-system.md`
- **Dashboard V2:** `.claude/design/dashboard-redesign-2026-01/`
- **Architecture:** `.claude/docs/architecture.md`

---

## SIGN-OFF

This plan is ready for review by senior engineers.

**Next Step:** Present to architecture review board for approval before implementation begins.

**Estimated Effort:** 4 weeks (Week 1-4)
**Estimated Complexity:** Medium (new data aggregations, new UI components)
**Risk Level:** Low (uses existing data, isolated feature)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-31
**Status:** Pending Review
