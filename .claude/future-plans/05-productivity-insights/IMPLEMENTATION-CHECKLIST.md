# PRODUCTIVITY INSIGHTS - IMPLEMENTATION CHECKLIST

## Quick Start

This checklist breaks down the PLAN.md into actionable tasks. Use it to track progress through all 4 phases of implementation.

**Total Duration:** 4 weeks
**Phases:** Backend Foundation → Backend API → Frontend Components → Integration & Polish

---

## Phase 1: Backend Foundation (Week 1)

### 1.1 - Database Indexes
- [ ] Create compound index on tasks: `{ userId: 1, status: 1, completedAt: -1 }`
- [ ] Create index on tasks: `{ userId: 1, completedAt: 1 }`
- [ ] Create index on usagestats: `{ userId: 1, date: -1 }`
- [ ] Verify with explain() - should see IXSCAN not COLLSCAN
- [ ] Performance test: queries should respond <500ms

### 1.2 - Task.getPeakProductiveHours()
- [ ] Add method to `myBrain-api/src/models/Task.js`
- [ ] Implement MongoDB aggregation (group by $hour of completedAt)
- [ ] Include all 24 hours in output (even zeros)
- [ ] Calculate percentages correctly
- [ ] Add error handling
- [ ] Unit tests: 0 tasks, 1 hour, spread across hours, date filtering
- [ ] Test coverage >80%
- [ ] Performance: 1000 tasks <1 second

### 1.3 - Task.getProductivityStreaks()
- [ ] Add method to Task.js
- [ ] Extract completion dates as YYYY-MM-DD
- [ ] Calculate current streak (consecutive days from today)
- [ ] Calculate best streak (longest gap-free sequence)
- [ ] Handle edge cases: 0, 1, 365 days
- [ ] Unit tests: each edge case + normal cases
- [ ] Test coverage >80%
- [ ] Performance: 10k tasks <2 seconds

### 1.4 - UsageStats.getDayOfWeekBreakdown()
- [ ] Add method to `myBrain-api/src/models/UsageStats.js`
- [ ] Group by $dayOfWeek
- [ ] Convert MongoDB format (0=Sun) to human (1=Mon)
- [ ] Sum interactions per day
- [ ] Calculate percentages
- [ ] Unit tests: all 7 days, percentages, date range
- [ ] Test coverage >80%

### 1.5 - Utility Methods
- [ ] Add UsageStats.getWeekTotal(userId)
- [ ] Add UsageStats.getThirtyDayAverage(userId)
- [ ] Add Task.getLastCompletedDate(userId)
- [ ] Write tests for each
- [ ] All methods callable from Node REPL

### Phase 1 Complete When:
- [ ] All methods implemented
- [ ] All unit tests passing
- [ ] No console errors
- [ ] Code review passed

---

## Phase 2: Backend API (Week 2)

### 2.1 - Create Analytics Route
- [ ] Extend `myBrain-api/src/routes/analytics.js`
- [ ] Add GET /api/analytics/productivity-insights
- [ ] Add requireAuth middleware
- [ ] Parse query param: days (default 30, max 365)
- [ ] Call all methods in parallel with Promise.all()
- [ ] Assemble response payload with all fields
- [ ] Error handling (500 response)
- [ ] Test with curl/Postman

### 2.2 - Add Response Caching
- [ ] Implement cache layer (Redis or in-memory Map)
- [ ] Cache key: `insights:${userId}:${days}`
- [ ] Cache TTL: 1 hour
- [ ] Add cache invalidation on task completion
- [ ] Test: First request slow, second fast
- [ ] Verify cache hit rate >70%

### 2.3 - Optimize Aggregations
- [ ] Run explain() on each aggregation
- [ ] Verify IXSCAN (not COLLSCAN)
- [ ] Move $match early
- [ ] Use $limit to reduce intermediate docs
- [ ] Test with 1k, 10k, 50k documents
- [ ] Goal: All queries <2 seconds

### 2.4 - Write API Tests
- [ ] Test 401 without auth
- [ ] Test 200 with valid auth
- [ ] Test response schema (all fields present)
- [ ] Test days param: 7, 30, 90, 365
- [ ] Test caching behavior
- [ ] Test error handling (DB failure)
- [ ] Performance test <2 seconds
- [ ] Coverage >80%

### 2.5 - Rate Limiting
- [ ] Apply rate limit: 10 req/min per user
- [ ] Return 429 if exceeded
- [ ] Add Retry-After header

### Phase 2 Complete When:
- [ ] API endpoint working
- [ ] Caching verified
- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Code review passed

---

## Phase 3: Frontend Components (Week 3)

### 3.1 - Create Hook & Base Component
- [ ] Create useProductivityInsights hook
- [ ] TanStack Query with staleTime 1 hour
- [ ] Handle loading/error/data states
- [ ] Create ProductivityInsightsWidget container
- [ ] Add Widget wrapper from design system
- [ ] Add header with title and icon
- [ ] Test with mock data

### 3.2 - PeakHoursChart Component
- [ ] Use recharts BarChart
- [ ] Show all 24 hours
- [ ] Highlight top 3 hours
- [ ] Add percentage labels
- [ ] Responsive sizing
- [ ] Test on 375px mobile
- [ ] Add hover tooltips

### 3.3 - DayOfWeekChart Component
- [ ] Use recharts BarChart
- [ ] 7 bars (Mon-Sun)
- [ ] Show interaction counts
- [ ] Hover tooltip
- [ ] Mobile responsive

### 3.4 - FeatureUsageChart Component
- [ ] Use recharts PieChart or DonutChart
- [ ] 5 segments (Tasks, Notes, Projects, Events, Other)
- [ ] Colors: Blue, Purple, Green, Orange, Gray
- [ ] Show percentages
- [ ] Legend with counts
- [ ] Responsive sizing

### 3.5 - StreakBanner Component
- [ ] Large number display
- [ ] "Day Streak" label + "Personal Best"
- [ ] 🔥 emoji with pulse animation
- [ ] Mobile: switch to vertical layout
- [ ] CSS per PLAN.md

### 3.6 - ComparisonBadge Component
- [ ] Green if above average
- [ ] Amber if below
- [ ] Show percentage delta
- [ ] Show this week vs 30-day avg

### 3.7 - Loading & Error States
- [ ] WidgetSkeleton with animations
- [ ] Error state with retry button
- [ ] Empty state (user with 0 completions)
- [ ] Test all states

### 3.8 - Component Tests
- [ ] Unit tests for each sub-component
- [ ] Mock useProductivityInsights hook
- [ ] Test data loading
- [ ] Test error scenarios
- [ ] Responsive tests (375px, 768px, 1280px)
- [ ] Coverage >80%

### Phase 3 Complete When:
- [ ] All components rendering
- [ ] Charts display with sample data
- [ ] All loading/error/empty states working
- [ ] Mobile responsive verified
- [ ] Tests passing
- [ ] Code review passed

---

## Phase 4: Integration & Polish (Week 4)

### 4.1 - Add to Dashboard V2
- [ ] Import ProductivityInsightsWidget in DashboardPageV2
- [ ] Add to widget grid
- [ ] Position after Activity Log
- [ ] Verify no dashboard breakage
- [ ] Test all responsive breakpoints

### 4.2 - Design System Compliance
- [ ] Run `/design-audit` skill
- [ ] Verify V2 color variables (--v2-*)
- [ ] Check typography hierarchy
- [ ] Verify 8px grid spacing
- [ ] Test dark mode appearance
- [ ] Run `/theme-check` skill

### 4.3 - Accessibility Audit
- [ ] Run `/accessibility-audit` skill
- [ ] ARIA labels on charts
- [ ] Keyboard navigation works
- [ ] Color contrast AA standard
- [ ] No color-only information
- [ ] Screen reader test

### 4.4 - Performance Testing
- [ ] Component render <1 second
- [ ] No memory leaks
- [ ] Test on 3G connection
- [ ] Test on low-end device (iPhone 6)
- [ ] Charts render smoothly (60fps)
- [ ] Bundle size impact acceptable

### 4.5 - Smoke Test
- [ ] Run `/smoke-test` skill
- [ ] App starts without errors
- [ ] Dashboard loads
- [ ] Insights widget appears
- [ ] No console errors

### 4.6 - Documentation
- [ ] JSDoc comments on all components
- [ ] Document component props
- [ ] Document hook return values
- [ ] Update architecture.md

### 4.7 - Final Integration Tests
- [ ] Widget loads with real API data
- [ ] Caching works (2nd load instant)
- [ ] Error handling works
- [ ] Responsive across breakpoints
- [ ] Dark mode correct

### Phase 4 Complete When:
- [ ] Widget integrated
- [ ] Design compliance verified
- [ ] Accessibility audit passed
- [ ] Performance acceptable
- [ ] Tests passing
- [ ] Code review passed

---

## Post-Implementation (Rollout)

### 5.1 - Feature Flag
- [ ] Add productivityInsightsEnabled flag
- [ ] Auto-enable for premium/admin
- [ ] Wrap component in feature gate
- [ ] Test flag on/off behavior

### 5.2 - Monitoring
- [ ] Track endpoint calls (userId, response time)
- [ ] Alert if response time >5s
- [ ] Alert if error rate >5%
- [ ] Monitor cache hit rate (goal >70%)

### 5.3 - Rollout Phases
1. **Internal** (Week 1): Owner account only, verify data
2. **Beta** (Week 2): 10% of users, gather feedback
3. **General** (Week 3+): Gradual rollout to 100%

### 5.4 - Communication
- [ ] Release notes
- [ ] In-app tooltip
- [ ] Help center documentation

---

## Acceptance Criteria Checklist

### Backend ✅
- [ ] All aggregation methods working
- [ ] API endpoint returns correct schema
- [ ] Caching verified
- [ ] Performance <2 seconds
- [ ] Error handling implemented
- [ ] Indexes created

### Frontend ✅
- [ ] Widget renders without errors
- [ ] Charts display correctly
- [ ] Loading/error/empty states work
- [ ] Responsive on all breakpoints
- [ ] Accessible (WCAG AA)
- [ ] Dark mode verified

### Quality ✅
- [ ] Unit tests >80% coverage
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] No console errors
- [ ] No memory leaks
- [ ] Code reviewed

---

## Troubleshooting Quick Reference

| Problem | Solution |
|---------|----------|
| Aggregation slow | Check indexes with explain(), add $match early |
| Charts don't render | Check console errors, verify data shape, mock data |
| Tests fail | Clear test DB, check connection, verify mock format |
| Poor performance | Profile code, check cache, reduce date range |
| Accessibility fails | Add ARIA labels, check contrast, keyboard test |

---

## Status Tracking

Use this section to track overall progress:

**Phase 1 Status:** [ ] Not Started  [ ] In Progress  [ ] Complete
**Phase 2 Status:** [ ] Not Started  [ ] In Progress  [ ] Complete
**Phase 3 Status:** [ ] Not Started  [ ] In Progress  [ ] Complete
**Phase 4 Status:** [ ] Not Started  [ ] In Progress  [ ] Complete

**Overall Completion:** ___% (0-100)

**Issues/Blockers:** (document any problems here)

---

**This checklist is living - update as you progress**

*Created: 2026-01-31*
