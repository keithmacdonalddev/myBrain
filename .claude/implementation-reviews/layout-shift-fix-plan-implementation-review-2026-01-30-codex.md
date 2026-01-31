# Layout Shift (CLS) Fix Implementation Review

Plan: C:\Users\NewAdmin\Desktop\PROJECTS\myBrain\.claude\plans\layout-shift-fix-plan.md
Reviewer: Codex
Date: 2026-01-30
Scope: Full code review + UI/UX review (CLS focus)

---

## Findings (ordered by severity)

### High

1) Dashboard skeleton layout is shorter than the real header + quick capture.
- Header skeleton omits the subtitle and uses different wrapper classes from the real header, so the header grows on load.
- QuickCapture skeleton is a single-row stub, while the real form has input + actions, so the section grows on load.
- Files:
  - myBrain-web/src/features/dashboard/components/DashboardSkeleton.jsx:87
  - myBrain-web/src/features/dashboard/components/DashboardSkeleton.jsx:69
  - myBrain-web/src/features/dashboard/components/DashboardHeader.jsx:44
  - myBrain-web/src/features/dashboard/components/DashboardHeader.jsx:50
  - myBrain-web/src/features/dashboard/components/DashboardCards.jsx:779
  - myBrain-web/src/features/dashboard/components/DashboardCards.jsx:787

2) Dashboard widget placeholders set minHeight below the actual widget min-height.
- Several skeleton widgets are set to 140px/120px but .dash-widget enforces a 180px minimum, so they expand on load.
- Files:
  - myBrain-web/src/features/dashboard/components/DashboardSkeleton.jsx:124
  - myBrain-web/src/features/dashboard/components/DashboardSkeleton.jsx:125
  - myBrain-web/src/features/dashboard/components/DashboardSkeleton.jsx:131
  - myBrain-web/src/features/dashboard/components/DashboardSkeleton.jsx:133
  - myBrain-web/src/styles/dashboard-rich.css:94

3) Full WeatherWidget skeleton reserves only 200px and omits the expanded content.
- The real widget defaults to expanded with hourly + 7-day sections, so the height jump remains significant.
- Files:
  - myBrain-web/src/components/ui/WeatherWidget.jsx:78
  - myBrain-web/src/components/ui/WeatherWidget.jsx:567
  - myBrain-web/src/components/ui/WeatherWidget.jsx:585

4) Calendar skeleton renders 35 cells, but the real calendar renders 42 cells.
- This guarantees a vertical jump in months that require 6 rows (most months).
- Files:
  - myBrain-web/src/features/tasks/components/TasksListSkeleton.jsx:172
  - myBrain-web/src/features/tasks/components/TasksCalendarView.jsx:21

5) Tasks table skeleton has 5 columns while the real table has 6.
- The missing Tags column causes width/scrollbar shifts on load.
- Files:
  - myBrain-web/src/features/tasks/components/TasksListSkeleton.jsx:118
  - myBrain-web/src/features/tasks/components/TasksListSkeleton.jsx:125
  - myBrain-web/src/features/tasks/components/TasksTableView.jsx:38
  - myBrain-web/src/features/tasks/components/TasksTableView.jsx:42

### Medium

6) Board skeleton uses a responsive grid instead of the real horizontal scroll layout.
- Real board uses flex + min-width columns and horizontal scroll; the skeleton does not, so layout and scrollbars change on load.
- Files:
  - myBrain-web/src/features/tasks/components/TasksListSkeleton.jsx:87
  - myBrain-web/src/features/tasks/components/TasksBoardView.jsx:24
  - myBrain-web/src/features/tasks/components/TasksBoardView.jsx:30

7) Tasks list skeleton omits an Overdue section placeholder.
- Real list inserts Overdue section at the top when overdue tasks exist, which causes a visible shift when data loads.
- Files:
  - myBrain-web/src/features/tasks/components/TasksListSkeleton.jsx:66
  - myBrain-web/src/features/tasks/components/TasksList.jsx:656

8) Projects skeleton always renders a Favorites section placeholder.
- If a user has no favorites, the list shifts upward when data loads.
- Files:
  - myBrain-web/src/features/projects/components/ProjectsListSkeleton.jsx:112
  - myBrain-web/src/features/projects/components/ProjectsList.jsx:316

### Low

9) Project list-row skeleton styling doesn’t match the real compact ProjectCard.
- Skeleton uses bordered panel styling, but the real compact row is bg-bg without borders, causing a flash/mismatch on load.
- Files:
  - myBrain-web/src/features/projects/components/ProjectsListSkeleton.jsx:44
  - myBrain-web/src/features/projects/components/ProjectCard.jsx:129

---

## UI/UX Review (CLS + visual parity)

- Skeletons are close, but key structural mismatches still create visible jumps (dashboard header/quick-capture, calendar rows, table columns, weather expansion).
- The Favorites placeholder is a UX tradeoff: it avoids a downward jump for users with favorites but creates an upward jump for users without. If a lightweight “has favorites” signal is available, use it to pick the correct skeleton.
- Weather full view is visually dense and expanded by default; without a matching skeleton, it still pops instead of fading in.

---

## Open Questions / Assumptions

- Is the full WeatherWidget meant to be expanded by default? If not, collapsing by default would reduce required skeleton height.
- Can we cheaply determine whether a user has favorites before the list loads so the placeholder can be conditional?

---

## Testing Gaps

- Lighthouse CLS checks not run.
- Slow 3G visual verification not run.

---

## Summary

The implementation replaced spinners with skeletons, but several skeletons do not match real layout dimensions or structure. These mismatches are large enough to keep CLS visible in common paths (dashboard load, weather full view, tasks calendar/table, board view, tasks list with overdue, projects without favorites).
