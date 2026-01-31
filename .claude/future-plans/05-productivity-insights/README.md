# Productivity Insights Feature Plan

## Quick Navigation

**Main Plan Document:** [PLAN.md](PLAN.md) (1,663 lines)

---

## What's In This Plan

### Executive Overview
- **Status:** Rough draft - pending senior engineer review
- **Effort:** 4 weeks (Week 1-4)
- **Complexity:** Medium
- **Risk Level:** Low

### Key Sections

| Section | Purpose | Lines |
|---------|---------|-------|
| Executive Summary | High-level overview | 15-45 |
| Why This Feature | Problem statement + user story | 46-80 |
| Feature Overview | What users will see | 90-150 |
| Technical Architecture | Backend + frontend design | 170-400 |
| ASCII Mockups | Visual mockups for review | 410-470 |
| Parallel Opportunities | Related features to build | 475-510 |
| Parallel Execution Cautions | Performance warnings | 515-600 |
| Implementation Tasks | Detailed 4-phase plan | 610-1100 |
| Detailed Tasks | Code examples + acceptance criteria | 1100-1350 |
| Performance Considerations | Query complexity + caching | 1350-1450 |
| Testing Strategy | Unit + integration + E2E tests | 1450-1550 |
| Rollout Plan | Phased deployment + feature flags | 1550-1620 |
| Monitoring & Alerts | Observability setup | 1620-1650 |

---

## Core Insight: Why Now?

**Hidden Value Problem:**
- myBrain already collects productivity data (UsageStats, Task.completedAt, AnalyticsEvent)
- Data is used internally but never shown to users
- Users can't see their own patterns (peak hours, active days, feature usage, streaks)

**Solution:**
- Add aggregation methods for hour-of-day and day-of-week breakdown
- Calculate productivity streaks (current + best)
- Create widget UI to display insights
- One new API endpoint surfaces everything

**Payoff:**
- Personal analytics are premium feature differentiator
- Users get actionable insights to optimize their productivity
- Minimal backend work (leverages existing data structures)

---

## The Feature at a Glance

### What Users See

A dashboard widget showing:
1. **Peak Productive Hours** - Histogram of all 24 hours, highlighting top 3
2. **Day of Week Breakdown** - Bar chart showing Mon-Sun activity levels
3. **Feature Usage** - Pie chart: Tasks 45%, Notes 28%, Projects 15%, etc.
4. **Streaks** - "7-day streak 🔥 | Best: 21 days"
5. **Personal Comparison** - "Above average this week +12%"

### Data Sources (Already Exist!)

| Insight | Source Model | Method |
|---------|-------------|--------|
| Peak Hours | **Task** | Extract hour from completedAt, aggregate |
| Day of Week | **UsageStats** | Group daily interactions by day of week |
| Feature Usage | **UsageStats** | Use existing getUsageProfile() |
| Streaks | **Task** | Find consecutive days with ≥1 completion |
| Comparison | **UsageStats** | This week vs 30-day average |

---

## Implementation Overview

### Phase 1: Backend Foundation (Week 1)
- Add database indexes
- Implement Task.getPeakProductiveHours()
- Implement Task.getProductivityStreaks()
- Implement UsageStats.getDayOfWeekBreakdown()

### Phase 2: Backend API (Week 2)
- Create GET /api/analytics/productivity-insights endpoint
- Implement caching (1-hour TTL)
- Optimize aggregations with indexes

### Phase 3: Frontend Components (Week 3)
- Create ProductivityInsightsWidget component
- Create charts (peak hours, day of week, feature usage)
- Create info sections (streaks, comparison)

### Phase 4: Integration & Polish (Week 4)
- Add to Dashboard V2
- Design system compliance audit
- Accessibility audit
- Performance testing + monitoring

---

## Code Examples in Plan

### MongoDB Aggregation Pipelines
- Peak hours (group Task.completedAt by hour 0-23)
- Day of week breakdown (group UsageStats by day of week)
- Streak calculation (find consecutive days with completions)

### Backend Methods (with full code)
- Task.getPeakProductiveHours(userId, days)
- Task.getProductivityStreaks(userId, lookbackDays)
- UsageStats.getDayOfWeekBreakdown(userId, days)
- GET /api/analytics/productivity-insights (express route)

### Frontend Components (with full code)
- useProductivityInsights hook (TanStack Query)
- ProductivityInsightsWidget (main container)
- PeakHoursChart (Recharts bar chart)
- StreakBanner (CSS-styled display)
- DayOfWeekChart (Recharts bar chart)
- FeatureUsageChart (Recharts pie chart)

---

## Critical Sections for Review

### Performance Cautions (READ THIS!)
**Warning:** Aggregations on large task collections can be slow.

Key mitigations:
1. **Add indexes** - Compound index on (userId, status, completedAt)
2. **Cache aggressively** - 1-hour TTL, invalidate on task completion
3. **Limit scope** - Default 30-day window, max 365 days
4. **Monitor in production** - Alert if endpoint exceeds 5 seconds

See "Parallel Execution Cautions" section (line 515+) for full analysis.

### Testing Strategy (READ THIS!)
Comprehensive test suite with unit, integration, and E2E tests.

See "Testing Strategy" section (line 1450+) for code examples.

### Acceptance Criteria (READ THIS!)
Complete checklist for "Definition of Done".

See line 1655+ for acceptance criteria.

---

## Parallel Opportunities

While building this feature, consider:

1. **Productivity Score Badge** - Composite metric (0-100) in sidebar
2. **Scheduling Suggestions** - "You're most productive 9-11 AM, schedule focus work then"
3. **Goal-Based Tracking** - "I want 5 tasks/day" progress tracking
4. **Weekly Digest Email** - Productivity summary email every Friday
5. **Comparison Timeline** - "This month vs last month" charts

See "Parallel Model Opportunities" section (line 475+) for details.

---

## Dependencies & Prerequisites

### Backend
- MongoDB indexes (must create before implementation)
- Express route extension (in analytics.js)
- Cache layer (Redis or in-memory)

### Frontend
- Dashboard V2 widget system (already exists)
- Recharts library (for charts)
- TanStack Query (for data fetching)
- V2 design system CSS variables (already exists)

### Data Requirements
- Users must have at least 1 task completion for meaningful insights
- Recommendation: Show "insufficient data" gracefully if user < 7 task completions

---

## Performance Snapshot

| Query | Complexity | Best Case | Worst Case | With Index |
|-------|-----------|-----------|-----------|-----------|
| Peak Hours | O(n log n) | 100ms | 3s | <500ms |
| Streaks | O(n) | 200ms | 2s | <800ms |
| Day of Week | O(n) | 50ms | 500ms | <200ms |
| Combined (cached) | - | <5ms | 3-5s | <2s |

Caching reduces repeat requests from 3-5s to <5ms (99% improvement).

---

## Checklist for Approval

Before implementation, senior engineers should verify:

- [ ] Feature scope aligns with product roadmap
- [ ] Technical approach is sound (MongoDB aggregations are appropriate)
- [ ] Performance estimates realistic
- [ ] Caching strategy acceptable
- [ ] Test strategy comprehensive
- [ ] Rollout plan (feature flag + phased enablement) approved

---

## Contact & Questions

This is a forward-looking design document. Questions should be directed to the senior engineer review board.

**Document Status:** Ready for senior engineer review
**Next Step:** Schedule architecture review meeting

---

**Created:** 2026-01-31
**By:** Claude Haiku 4.5
**Plan Version:** 1.0
