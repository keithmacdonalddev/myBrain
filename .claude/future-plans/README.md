# Future Plans

> **IMPORTANT DISCLAIMER**
>
> All documents in this folder are **rough drafts of future ideas**. They represent exploratory thinking and potential directions, not committed roadmap items. Plans may change significantly or be abandoned based on user feedback, technical discoveries, or shifting priorities.

---

## Purpose

This folder contains detailed planning documents for potential myBrain features. Each plan includes:

- **Why** - The problem being solved and story behind the idea
- **What** - Detailed feature specification
- **How** - Technical approach and implementation tasks
- **Risks** - Cautions and considerations

---

## Plan Index

| # | Feature | Status | Priority | Effort |
|---|---------|--------|----------|--------|
| 01 | [Trends Charts](./01-trends-charts/PLAN.md) | Draft | High | Low |
| 02 | [Weekly Summary](./02-weekly-summary/PLAN.md) | Draft | High | Low |
| 03 | [Journal Entries](./03-journal-entries/PLAN.md) | Draft | High | Medium |
| 04 | [Habit Tracker](./04-habit-tracker/PLAN.md) | Draft | High | Medium |
| 05 | [Productivity Insights](./05-productivity-insights/PLAN.md) | Draft | Medium | Medium |
| 06 | [Time Logging](./06-time-logging/PLAN.md) | Draft | Medium | Medium |

---

## Recommended Build Order

Based on effort vs. impact analysis:

1. **Trends Charts** - Easiest win, 90% of data already exists
2. **Weekly Summary** - High value, builds on trends work
3. **Journal Entries** - High personal value, standalone feature
4. **Habit Tracker** - Strong daily engagement driver
5. **Productivity Insights** - Needs aggregation pipeline work
6. **Time Logging** - Most complex, optional for many users

---

## Plan Standards

Each plan document follows this structure:

```
# Feature Name

## Metadata
- Model, timestamp, status

## Why This Feature
- Problem statement
- User story
- Origin of idea

## What We're Building
- Feature description
- UI mockups/wireframes
- User flows

## Technical Approach
- Data models
- API endpoints
- Frontend components

## Implementation Tasks
- Numbered tasks with subtasks
- Effort estimates
- Dependencies

## Parallel Execution Opportunities
- What can be built simultaneously
- Cautions about parallelization

## Risks & Considerations
- Technical risks
- UX concerns
- Edge cases

## Inspiration
- Reference images
- Similar products
- Design patterns
```

---

## Folder Contents

Each feature folder may contain:

- `PLAN.md` - Main planning document
- `inspiration/` - Reference images and screenshots
- `mockups/` - UI design drafts
- `current-state/` - Screenshots of existing app state

---

## Contributing

When adding new plans:

1. Create numbered folder (e.g., `07-feature-name/`)
2. Copy template from existing plan
3. Fill in all sections
4. Add to index above
5. Include model attribution and timestamp

---

*Last updated: 2026-01-31*
