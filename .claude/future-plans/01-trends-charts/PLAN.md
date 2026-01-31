# TRENDS CHARTS FEATURE - Future Plan

---

## WARNING: DRAFT EXPLORATION

This document is a **ROUGH DRAFT** of a future feature idea. It has NOT been reviewed by senior engineers or approved for implementation. The concepts, architecture, and scope are still exploratory and subject to significant changes.

**Do not treat this as a committed roadmap or use it as basis for decisions without senior review.**

---

## Metadata

| Field | Value |
|-------|-------|
| **Created by** | Claude Haiku 4.5 |
| **Date** | 2026-01-31 |
| **Status** | Draft - Not Approved |
| **Priority** | TBD (post-review) |
| **Complexity** | High - Data aggregation + charting UI |

---

## Why This Feature?

### Problem Statement

Users of myBrain have rich productivity data (tasks completed, notes created, projects finished) but lack visual insights into their patterns and trends. Currently:

- Tasks show `completedToday` and `completedThisWeek` metrics (simple counters)
- No visualization of productivity over time
- No pattern identification or trend analysis
- No comparison to previous periods
- Users can't see if they're becoming more or less productive

### User Story

As a productivity-focused user, I want to see visual charts of my productivity trends so that I can:
- Identify when I'm most productive
- Spot trends (getting better? worse? seasonal patterns?)
- Compare my productivity to previous periods
- Stay motivated by seeing progress over time
- Understand which activities consume most of my time

### Origin & Thought Process

This idea emerged from:

1. **Dashboard V2 Redesign Context** - The new dashboard emphasizes visual hierarchy and at-a-glance insights. Static metrics feel incomplete without trends.

2. **Data Already Available** - The UsageStats model already aggregates daily interaction counts. The Task, Note, and Project models have timestamp fields (`completedAt`, `createdAt`). This means the underlying data exists; we're just not visualizing it.

3. **Competitive Feature** - Productivity apps (Apple Reminders, Todoist, Notion) all show productivity trends. Users expect this.

4. **Minimal Additional Tracking** - No new data collection needed. We leverage existing timestamps and the UsageStats aggregation system already in place.

5. **Progressive Disclosure** - This can be a widget on the dashboard that expands into a full analytics view, keeping the dashboard lean while offering depth for interested users.

---

## Feature Goals & Scope

### Primary Goals

1. **Visual Trends** - Show productivity patterns via charts (bar, line, area graphs)
2. **Time Comparison** - Compare current period to previous period
3. **Pattern Identification** - Highlight best days/weeks, slowdowns, streaks
4. **Feature Attribution** - Show which features (tasks, notes, projects) drive productivity
5. **Mobile-First Presentation** - Works well on phone, expands on desktop

### Out of Scope (For Initial Release)

- Predictive analytics (ML-based forecasting)
- Social comparisons (vs other users)
- Custom date range selection (fixed ranges initially)
- Goal setting / productivity targets
- Export/sharing of charts
- Detailed drill-down into individual items by date

### Success Criteria

- Charts load in < 500ms
- Data aggregation queries run in < 100ms
- Works offline (cached data from last sync)
- Mobile responsive at 375px breakpoint
- At least 3 different chart types working
- Comparisons show meaningful deltas (% change, raw difference)

---

## Data Aggregation Strategy

### Existing Data Sources

```
Task.completedAt            → Task completions per day
Note.createdAt              → Note creations per day
Project.completedAt         → Project completions per day
UsageStats.interactions.*   → Detailed daily interaction counts
UsageStats.sessionCount     → App open frequency
```

### Proposed Data Model

No new models required initially. We'll aggregate from existing data:

```javascript
// What we need to calculate:
{
  userId: ObjectId,
  dateRange: {
    start: Date,        // e.g., 7 days ago
    end: Date           // e.g., today
  },

  // Chart data - daily breakdowns
  daily: [
    {
      date: Date,
      tasksCompleted: Number,
      notesCreated: Number,
      projectsCompleted: Number,
      totalInteractions: Number,
      sessionCount: Number,
      focusScore: Number  // Derived: quality of work vs quantity
    }
  ],

  // Summary metrics
  summary: {
    periodStart: Date,
    periodEnd: Date,
    previousPeriod: {
      start: Date,
      end: Date
    },

    // Totals
    tasksCompleted: Number,
    notesCreated: Number,
    projectsCompleted: Number,
    totalInteractions: Number,

    // Comparison to previous period
    comparison: {
      tasksCompleted: {
        current: Number,
        previous: Number,
        percentChange: Number,      // +15%, -8%, etc
        trend: 'up' | 'down' | 'flat'
      },
      totalInteractions: { ... },
      projectsCompleted: { ... }
    },

    // Pattern insights
    patterns: {
      bestDay: String,              // "Tuesday"
      bestDayCount: Number,
      slowestDay: String,           // "Saturday"
      slowestDayCount: Number,
      currentStreak: Number,        // Days of non-zero activity
      maxStreak: Number,            // Longest streak in period
      averagePerDay: Number,
      mostActiveFeature: String     // 'tasks' | 'notes' | 'projects'
    },

    // Derived scores
    productivityScore: Number,      // 0-100, based on activity, consistency
    focusScore: Number              // Quality-adjusted score
  }
}
```

### Aggregation Queries

**Query 1: Daily Task Completions (Last 30 Days)**

```javascript
// MongoDB aggregation pipeline
db.tasks
  .aggregate([
    {
      $match: {
        userId: ObjectId(userId),
        completedAt: { $gte: thirtyDaysAgo, $lte: today },
        status: 'done'
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
        count: { $sum: 1 },
        avgPriority: { $avg: '$priority' }  // Higher priority = more focus
      }
    },
    {
      $sort: { _id: 1 }
    }
  ])
```

**Query 2: UsageStats Aggregation (Existing, Enhanced)**

The UsageStats model already tracks daily interactions. We'll use `getUsageProfile()` for feature attribution.

**Query 3: Comparison Period**

Same query as #1, but with dates shifted to previous period (e.g., 30-60 days ago vs 0-30 days ago).

### Caching Strategy

To avoid re-calculating on every page load:

1. **Redis Cache** (if available) - Cache hourly aggregations
2. **Fallback: Database Query** - If no cache, aggregate on-the-fly
3. **Frontend Cache** - Store last 3 days of data in localStorage
4. **Invalidation** - Clear cache when new task/note/project is created or completed

---

## API Endpoints (Backend)

### New Routes

```javascript
// File: routes/analytics.js (or expand existing analytics route)

/**
 * GET /api/analytics/trends/weekly
 *
 * Get weekly productivity trends for the last 8 weeks
 *
 * Response:
 * {
 *   weeks: [
 *     {
 *       weekOf: Date,
 *       tasksCompleted: Number,
 *       notesCreated: Number,
 *       projectsCompleted: Number,
 *       totalInteractions: Number
 *     }
 *   ],
 *   currentWeek: { ... },
 *   previousWeek: { ... },
 *   comparison: { ... }
 * }
 */
GET /api/analytics/trends/weekly

/**
 * GET /api/analytics/trends/daily
 *
 * Get daily productivity trends for a date range
 * Query params:
 *   - days: 7 | 30 | 90 (default: 30)
 *
 * Response:
 * {
 *   daily: [ { date, tasksCompleted, ... } ],
 *   summary: { ... }
 * }
 */
GET /api/analytics/trends/daily?days=30

/**
 * GET /api/analytics/trends/patterns
 *
 * Get identified patterns in productivity
 *
 * Response:
 * {
 *   patterns: {
 *     bestDay: 'Tuesday',
 *     bestDayCount: 12,
 *     slowestDay: 'Sunday',
 *     slowestDayCount: 2,
 *     currentStreak: 5,
 *     maxStreak: 12,
 *     averagePerDay: 6.4
 *   },
 *   insights: [
 *     { type: 'streak', message: 'You've completed tasks 5 days in a row!' },
 *     { type: 'trend', message: 'Tasks completed up 25% vs last week' }
 *   ]
 * }
 */
GET /api/analytics/trends/patterns

/**
 * GET /api/analytics/trends/comparison
 *
 * Compare two time periods
 * Query params:
 *   - currentPeriod: 'week' | 'month' | 'year'
 *
 * Response:
 * {
 *   current: { ... },
 *   previous: { ... },
 *   delta: {
 *     tasksCompleted: { current: 12, previous: 8, change: '+50%' },
 *     notesCreated: { current: 25, previous: 20, change: '+25%' },
 *     ...
 *   }
 * }
 */
GET /api/analytics/trends/comparison?period=month
```

### Service Layer

```javascript
// File: services/trendsService.js (new)

class TrendsService {
  // Aggregation methods
  async getDailyTrends(userId, days = 30) { }
  async getWeeklyTrends(userId, weeks = 8) { }
  async getPatterns(userId, days = 30) { }
  async compareWithPreviousPeriod(userId, period = 'month') { }

  // Helper methods
  async getTaskCompletions(userId, startDate, endDate) { }
  async getNoteCreations(userId, startDate, endDate) { }
  async getProjectCompletions(userId, startDate, endDate) { }
  async calculateProductivityScore(userId, dailyData) { }
  async identifyPatterns(dailyData) { }
  async detectStreaks(dailyData) { }
}
```

### Authentication & Authorization

- All endpoints require `requireAuth` middleware
- Users can only view their own trends (data isolation)
- Add tests for 401 (no auth) and 403 (wrong user)

---

## Frontend Components

### New Components

Located in `myBrain-web/src/features/dashboard/components/`:

| Component | File | Purpose |
|-----------|------|---------|
| **TrendsWidget** | `TrendsWidget.jsx` | Dashboard widget (preview) |
| **TrendsChart** | `TrendsChart.jsx` | Reusable chart renderer |
| **WeeklyBarChart** | `WeeklyBarChart.jsx` | Bar chart for weekly data |
| **MonthlyLineChart** | `MonthlyLineChart.jsx` | Line chart for month trends |
| **ComparisonMetric** | `ComparisonMetric.jsx` | Single metric with % change |
| **PatternsInsight** | `PatternsInsight.jsx` | Best day, streak, etc display |
| **TrendsFullPage** | `TrendsFullPage.jsx` | Full page view (not just widget) |

### Chart Library

Recommendation: Use **Chart.js** or **Recharts** (React wrapper for charts)

- Pros of Recharts: React-native, responsive, customizable
- Pros of Chart.js: Lightweight, many examples
- Cons: Need to decide on one and integrate with design system

### UI Patterns

Charts will follow design system V2:
- Use `--v2-*` CSS variables
- Glass-morphism container
- Helvetica Neue for labels
- Dark mode support (already in design-system.md)
- Responsive: full-width on mobile, contained on desktop

### Accessibility Considerations

- Provide table data as fallback for charts (for screen readers)
- Alt text for charts describing trends in plain language
- Keyboard navigable (Tab to expand/collapse)
- Color-blind friendly palettes (avoid red/green for trends)

---

## UI/UX Mockup (ASCII)

### Dashboard Widget View (Collapsed)

```
┌─────────────────────────────────────────────────┐
│ Productivity Trends                        [→]   │
├─────────────────────────────────────────────────┤
│                                                 │
│  Tasks This Week      28  (+15% vs last week)   │
│
│  ████████ Mon                                   │
│  ████████ Tue                                   │
│  ████████ Wed                                   │
│  ████████ Thu                                   │
│  ████████ Fri                                   │
│  ██░░░░░░ Sat                                   │
│  ░░░░░░░░ Sun                                   │
│                                                 │
│  Best day: Tuesday (6 completed)                │
│  Current streak: 5 days                         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Full Page View (Left Sidebar)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Productivity Analytics                                              ←       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Period: Last 30 Days  [7d] [30d] [90d] [Year]                            │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │ Weekly Task Completions                                            │   │
│  │                                                                    │   │
│  │    20│     ╱╲                                                       │   │
│  │       │    ╱  ╲                                                     │   │
│  │    15│   ╱    ╲      ╱╲                                             │   │
│  │       │  ╱      ╲    ╱  ╲                                           │   │
│  │    10│─╱────────╲──╱────╲─────                                       │   │
│  │       │          ╲╱       ╲                                         │   │
│  │     5│                      ╲╱  ╲                                   │   │
│  │       └──────────────────────────────────                          │   │
│  │       W1  W2  W3  W4  W5  W6  W7  W8                               │   │
│  │                                                                    │   │
│  │  This Week: 28 tasks  (+15% vs last week)                         │   │
│  │  Average: 18 tasks/week                                           │   │
│  │                                                                    │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │ Feature Breakdown (All Interactions)                               │   │
│  │                                                                    │   │
│  │  Tasks       ████████████████░░  45%  (285 total)                 │   │
│  │  Notes       ██████████░░░░░░░░░  28%  (177 total)                │   │
│  │  Projects    ████████░░░░░░░░░░░░  18%  (114 total)               │   │
│  │  Events      ███░░░░░░░░░░░░░░░░░   6%  (38 total)                │   │
│  │  Messages    ░░░░░░░░░░░░░░░░░░░░   2%  (13 total)                │   │
│  │  Images      ░░░░░░░░░░░░░░░░░░░░   1%  (6 total)                 │   │
│  │                                                                    │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Patterns & Insights                                                       │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │ Most Productive: Tuesday (avg 8.2 completions)                    │   │
│  │ Least Active: Sunday (avg 1.4 completions)                        │   │
│  │ Current Streak: 5 days of activity (personal best!)               │   │
│  │ Trend: ↗ You're 15% more productive than last month              │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation Details

### Backend Aggregation Pipeline

```javascript
// Example: Calculate daily task completions with aggregation

const result = await Task.aggregate([
  {
    $match: {
      userId: new ObjectId(userId),
      status: 'done',
      completedAt: {
        $gte: new Date(thirtyDaysAgo),
        $lte: new Date(today)
      }
    }
  },
  {
    $group: {
      _id: {
        date: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
        priority: '$priority'
      },
      count: { $sum: 1 }
    }
  },
  {
    $group: {
      _id: '$_id.date',
      total: { $sum: '$count' },
      byPriority: {
        $push: {
          priority: '$_id.priority',
          count: '$count'
        }
      }
    }
  },
  {
    $sort: { _id: 1 }
  },
  {
    $project: {
      date: '$_id',
      tasksCompleted: '$total',
      byPriority: 1,
      _id: 0
    }
  }
]);
```

### Frontend Chart Component Pattern

```jsx
// Example: WeeklyBarChart component
import React from 'react';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';

export function WeeklyBarChart({ data, title, metric }) {
  return (
    <div className="chart-container">
      <h3>{title}</h3>
      <BarChart width={800} height={300} data={data}>
        <XAxis dataKey="week" />
        <YAxis />
        <Bar dataKey={metric} fill="var(--v2-accent)" radius={8} />
      </BarChart>
      <div className="chart-stats">
        <p>Comparison: <strong>+15%</strong> vs previous period</p>
      </div>
    </div>
  );
}
```

### Performance Considerations

**Problem:** Aggregating 30 days of task data could be slow with large datasets.

**Solutions:**

1. **Database Indexing** - Ensure indexes on `(userId, completedAt, status)`
2. **Pre-calculation** - Run aggregations hourly, cache results in Redis
3. **Incremental Updates** - Only recalculate changed dates (since yesterday)
4. **Pagination** - Limit days returned to 30 by default, allow user to expand
5. **Query Optimization** - Use projections to select only needed fields

**Sample Index:**

```javascript
// In Task model or migration
db.tasks.createIndex({ userId: 1, completedAt: -1, status: 1 });
db.usagestats.createIndex({ userId: 1, date: -1 });
```

---

## Parallel Model Opportunities

These are tasks that **can be executed simultaneously** by different agents:

### Opportunity 1: Backend API Routes (Agent A)
- Implement `/api/analytics/trends/*` endpoints
- Build TrendsService aggregation methods
- Add tests (401/403 + happy path)
- Independent: doesn't need frontend code

### Opportunity 2: Frontend Components (Agent B)
- Build TrendsWidget, WeeklyBarChart, ComparisonMetric components
- Implement hooks to fetch trends data
- Add error states and loading skeletons
- Can be done in parallel with backend (uses mock data initially)

### Opportunity 3: Design System Integration (Agent C)
- Ensure CSS variables are applied consistently
- Build chart styling matching design-system.md
- Dark mode verification
- Mobile responsive tests
- Can run in parallel with components

### Opportunity 4: Tests & Documentation (Agent D)
- Write backend aggregation tests
- Write component tests
- Document API in swagger/OpenAPI
- Write usage guide for dashboard
- Can run in parallel once main code is drafted

**Execution Model:**

```
Time →
┌──────────────────────────────────────────────────────┐
│ Agent A: Backend Routes        [████████]           │
├──────────────────────────────────────────────────────┤
│ Agent B: Frontend Components   [████████]           │
├──────────────────────────────────────────────────────┤
│ Agent C: Design Integration    [████████]           │
├──────────────────────────────────────────────────────┤
│ Agent D: Tests & Docs          [        ████████]   │
└──────────────────────────────────────────────────────┘
```

Agent D runs AFTER others are drafted (needs code to test).

---

## Parallel Execution Cautions

These tasks **MUST be sequential** and why:

### Caution 1: Data Model Decisions → API Routes

**Why sequential:** API routes depend on deciding:
- What data structure to return
- Which aggregations to compute
- Caching strategy
- Error handling

**Sequence:** Decide data model → Design API contract → Implement routes

**Estimated blocker time:** ~2 hours of planning

### Caution 2: API Design → Frontend Components

**Why sequential:** Components depend on:
- Knowing API endpoints and response format
- Understanding what queries are available
- Error codes and messages

**Sequence:** Backend API route signatures drafted → Frontend components built to match

**Estimated blocker time:** ~1 hour (API signatures only, not full implementation)

### Caution 3: Component Implementation → Design Review

**Why parallel possible:** Design review can begin as soon as first components drafted (doesn't need to wait for all components).

**Recommendation:** Have Agent B draft 1-2 key components, then Agent C can review/refine design while Agent B continues with others.

### Caution 4: Tests Before Monitoring

**Why:** Monitoring agents need passing tests to verify against (no point monitoring test that doesn't exist).

**Sequence:** Unit tests draft → Code monitor validates implementation → Component tests finalized

---

## Risks & Edge Cases

### Risk 1: Slow Aggregation Queries

**Problem:** First aggregation could be slow if user has 1000+ tasks.

**Mitigation:**
- Pre-calculate and cache
- Use database indexes
- Limit initial range to 30 days
- Lazy-load additional periods

**Fallback:** Show cached data while fresh query runs in background

### Risk 2: Missing Data (Gaps in Trends)

**Problem:** If user doesn't create tasks for a week, data gap appears.

**Mitigation:**
- Fill gaps with zeros (not skipping dates)
- Clearly indicate "no activity" periods
- Don't show misleading trends with gaps

**Example:**
```javascript
// Don't do this:
data = [{ date: '2026-01-20', count: 5 }, { date: '2026-01-23', count: 3 }]

// Do this:
data = [
  { date: '2026-01-20', count: 5 },
  { date: '2026-01-21', count: 0 },
  { date: '2026-01-22', count: 0 },
  { date: '2026-01-23', count: 3 }
]
```

### Risk 3: Timezone Issues

**Problem:** `completedAt` stored as UTC, but user sees different timezone.

**Example:** User completes task at 11pm local (midnight UTC). Should it count as today or tomorrow?

**Mitigation:**
- Store user's timezone (already in User.profile.timezone)
- Convert dates to user's timezone before grouping
- Test with users in different timezones

**Implementation:**
```javascript
const userTimezone = user.profile.timezone; // 'America/New_York'
const localDate = new Date(task.completedAt).toLocaleString('en-US', { timeZone: userTimezone });
const dateKey = localDate.split(',')[0]; // '1/20/2026'
```

### Risk 4: Performance with Large Date Ranges

**Problem:** Querying 365 days of data could slow down dashboard.

**Mitigation:**
- Limit default to 30 days
- Use pagination for additional periods
- Cache year-to-date data separately
- Show loading spinner during aggregation

### Risk 5: Chart Library Bundle Size

**Problem:** Adding Chart.js or Recharts increases JS bundle.

**Mitigation:**
- Evaluate bundle impact before choosing library
- Lazy-load chart library (only when viewing trends)
- Consider lightweight alternatives (Chart.js is ~30kb)

### Risk 6: Mobile Chart Responsiveness

**Problem:** Charts might overflow or become unreadable on 375px phones.

**Mitigation:**
- Use responsive containers (width: 100%)
- Stack charts vertically on mobile
- Reduce axis labels on mobile
- Test at actual breakpoints (375px, 768px, 1280px)

### Edge Case: New Users

**Problem:** User just created account - no data to show.

**Mitigation:**
- Show empty state with encouraging message
- Suggest actions: "Create 3 tasks to see trends"
- Show example chart with sample data
- Hide trends widget until user has 3+ days of data

**Example Empty State:**
```
No productivity data yet

Create tasks, notes, or projects to see your trends.
Get started → [Create Task Button]
```

### Edge Case: Massive Streaks

**Problem:** User completes 1000 tasks in one day (spike in data).

**Mitigation:**
- Scale Y-axis appropriately (don't let outliers squash graph)
- Show tooltip on hover with actual numbers
- Identify potential data anomalies (1000 tasks = data export? API issue?)
- Log unusual spikes for investigation

---

## Testing Strategy

### Unit Tests (Backend)

**Files to test:**
- `services/trendsService.js` - All aggregation methods
- `routes/analytics.js` - All trends endpoints

**Test Examples:**

```javascript
describe('TrendsService', () => {
  describe('getDailyTrends', () => {
    it('should return daily tasks completed for last 30 days', async () => {
      // Setup
      const userId = mongoose.Types.ObjectId();
      const task1 = await Task.create({ userId, completedAt: new Date('2026-01-20'), status: 'done' });
      const task2 = await Task.create({ userId, completedAt: new Date('2026-01-20'), status: 'done' });

      // Execute
      const trends = await TrendsService.getDailyTrends(userId, 30);

      // Verify
      expect(trends.daily).toBeDefined();
      expect(trends.daily[0].date).toEqual(new Date('2026-01-20'));
      expect(trends.daily[0].tasksCompleted).toEqual(2);
    });
  });

  describe('compareWithPreviousPeriod', () => {
    it('should calculate percentage change correctly', async () => {
      // 10 tasks last month, 15 tasks this month = +50%
      const comparison = await TrendsService.compareWithPreviousPeriod(userId, 'month');

      expect(comparison.delta.tasksCompleted.percentChange).toEqual('+50%');
    });
  });
});
```

### Integration Tests

**API Endpoints:**

```javascript
describe('GET /api/analytics/trends/daily', () => {
  it('should require authentication', async () => {
    const res = await request(app).get('/api/analytics/trends/daily');
    expect(res.status).toBe(401);
  });

  it('should reject requests for other users', async () => {
    const userA = await User.create({ email: 'a@test.com', ... });
    const userB = await User.create({ email: 'b@test.com', ... });

    const res = await request(app)
      .get('/api/analytics/trends/daily')
      .set('Authorization', `Bearer ${tokenFor(userA)}`)
      .query({ userId: userB._id });

    expect(res.status).toBe(403);
  });

  it('should return daily trends for authenticated user', async () => {
    const res = await request(app)
      .get('/api/analytics/trends/daily')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ days: 7 });

    expect(res.status).toBe(200);
    expect(res.body.daily).toBeDefined();
    expect(res.body.daily.length).toBeGreaterThan(0);
  });
});
```

### Frontend Component Tests

```javascript
describe('WeeklyBarChart', () => {
  it('should render chart with data', () => {
    const data = [
      { week: 'W1', tasksCompleted: 10 },
      { week: 'W2', tasksCompleted: 15 }
    ];

    const { getByText } = render(<WeeklyBarChart data={data} metric="tasksCompleted" />);

    expect(getByText('W1')).toBeInTheDocument();
    expect(getByText('W2')).toBeInTheDocument();
  });

  it('should show comparison metric', () => {
    const { getByText } = render(<WeeklyBarChart comparison="+15%" />);
    expect(getByText('+15%')).toBeInTheDocument();
  });
});
```

---

## Implementation Phases

### Phase 1: MVP (Minimal Viable Product)

**Duration:** ~2 weeks

**Deliverables:**
- Backend: Daily task completions API
- Frontend: Single bar chart widget on dashboard
- Tests: Basic auth + happy path

**Success Criteria:**
- Dashboard shows this week's task completions
- Compares to last week
- Works on mobile

**Complexity:** Medium

### Phase 2: Enhanced Charts

**Duration:** ~1.5 weeks

**Deliverables:**
- Add notes + projects to charts
- Add line chart for trends
- Feature breakdown widget
- Full-page view

**Complexity:** Medium-High

### Phase 3: Patterns & Insights

**Duration:** ~1.5 weeks

**Deliverables:**
- Pattern detection (best day, streaks)
- Insight messages ("You're 25% more productive!")
- Accessibility features (table fallback)

**Complexity:** High

### Phase 4: Polish & Optimization

**Duration:** ~1 week

**Deliverables:**
- Performance optimization
- Edge case handling
- Documentation + examples

**Complexity:** Low-Medium

---

## Success Metrics

### Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Chart load time | < 500ms | Client-side timing |
| API response time | < 100ms | Server-side timing |
| Chart render time | < 200ms | React profiler |
| Bundle size impact | < 50kb | Webpack analyze |

### User Engagement Metrics

| Metric | Goal |
|--------|------|
| Trends widget views/day | 2+ (user visits twice) |
| Click-through to full page | 20%+ of widget viewers |
| Return visitors (30d) | 40%+ |

### Quality Metrics

| Metric | Target |
|--------|--------|
| Test coverage | 80%+ |
| Accessibility score | 95+ (Lighthouse) |
| Mobile rendering | 100% at 375px + 768px |

---

## Dependencies & Blockers

### External Dependencies

| Dependency | Type | Risk | Mitigation |
|------------|------|------|-----------|
| Chart library (Recharts) | NPM | Bundle bloat | Lazy-load, analyze bundle impact |
| Database performance | Infrastructure | Slow queries | Pre-calculate, cache, index |
| Timezone library (day.js/moment) | NPM | Bundle bloat | Use native Date API where possible |

### Internal Dependencies

| Dependency | Owner | Status |
|------------|-------|--------|
| Design system V2 CSS variables | Design | Complete ✅ |
| UsageStats aggregation infrastructure | Backend | Complete ✅ |
| Dashboard routing (V1 → V2 switch) | Frontend | Complete ✅ |

---

## Future Enhancements (Post-MVP)

These are ideas for after initial release:

1. **Predictive Analytics** - "You're trending toward 30 tasks/week"
2. **Goal Setting** - "Set a goal of 20 tasks/week and track progress"
3. **Social Sharing** - "Share your monthly summary with friends"
4. **Custom Exports** - "Download trends as PDF or CSV"
5. **Filtering** - "Show only high-priority tasks in trends"
6. **Time of Day** - "You're most productive 10am-12pm"
7. **Correlations** - "When you exercise, productivity increases by 12%"
8. **Alerts** - "Your productivity dropped 30% this week"

---

## File Structure (Post-Implementation)

```
myBrain-api/
├── src/
│   ├── routes/
│   │   └── analytics.js (expanded with /trends/*)
│   ├── services/
│   │   └── trendsService.js (NEW)
│   └── models/ (unchanged - uses Task, Note, Project, UsageStats)

myBrain-web/
├── src/
│   ├── features/
│   │   └── dashboard/
│   │       ├── components/
│   │       │   ├── TrendsWidget.jsx (NEW)
│   │       │   ├── TrendsChart.jsx (NEW)
│   │       │   ├── WeeklyBarChart.jsx (NEW)
│   │       │   ├── MonthlyLineChart.jsx (NEW)
│   │       │   ├── ComparisonMetric.jsx (NEW)
│   │       │   ├── PatternsInsight.jsx (NEW)
│   │       │   └── TrendsFullPage.jsx (NEW)
│   │       ├── hooks/
│   │       │   └── useTrends.js (NEW - fetches trends API)
│   │       └── pages/
│   │           └── TrendsPage.jsx (NEW - full page view)
│   └── lib/
│       └── api/
│           └── trendsClient.js (NEW - API calls)

.claude/
└── future-plans/
    └── 01-trends-charts/
        └── PLAN.md (THIS FILE)
```

---

## Summary for Reviewers

### What This Solves

- **User Problem:** Lack of visual insights into productivity patterns
- **Product Gap:** Competitor apps all show trends; we don't
- **Data Problem:** We have the data but don't visualize it

### Key Decisions to Review

1. **Data Aggregation Strategy** - Pre-calculated vs on-demand?
2. **Chart Library Choice** - Recharts vs Chart.js vs custom?
3. **Scope of MVP** - Tasks only? Or include notes/projects immediately?
4. **Caching Strategy** - Redis? Database-level caching? Frontend cache only?

### Open Questions for Senior Engineers

1. Is this feature aligned with roadmap priorities?
2. Should trends be in dashboard widget or separate feature?
3. Do we have performance budget for new aggregation queries?
4. Any existing analytics infrastructure we should leverage?
5. Accessibility requirements beyond WCAG AA?

### Estimated Effort (Team of 2-3)

- **Phase 1 (MVP):** 2 weeks
- **Phase 2-4 (Full feature):** 4 additional weeks
- **Total:** ~6 weeks (if fully staffed)

---

**Status:** DRAFT - Ready for senior engineer review and feedback.

Last updated: 2026-01-31
