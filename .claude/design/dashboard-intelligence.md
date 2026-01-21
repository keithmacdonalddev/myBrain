# Dashboard Intelligence System

A dynamic, context-aware dashboard that surfaces what matters based on multiple weighted factors.

---

## Core Principle

The dashboard is not a static layout. It's a **priority-ranked feed** that adapts based on:
1. What needs attention (state)
2. How the user actually uses myBrain (behavior)
3. When they're looking (context)

---

## Priority Score Formula

Every displayable item/section gets a priority score:

```
Priority Score = (U × Urgency) + (A × Attention) + (R × Recency) + (F × Feature Usage) + (C × Context)
```

Where U, A, R, F, C are weights that shift based on situation.

---

## Factor Definitions

### 1. Urgency Factor (0-100)

Time-sensitive pressure. "This needs to happen."

| Condition | Score |
|-----------|-------|
| Overdue (past due date) | 100 |
| Event happening NOW | 100 |
| Event starts in < 15 min | 95 |
| Due within 1 hour | 90 |
| Event starts in < 1 hour | 85 |
| Due today | 70 |
| Event today (not soon) | 60 |
| Due tomorrow | 40 |
| Due this week | 25 |
| Due this month | 10 |
| No deadline / not time-bound | 0 |

### 2. Attention Factor (0-100)

Requires human response. "Someone/something is waiting on you."

| Condition | Score |
|-----------|-------|
| Direct message unread | 25 per message (max 100) |
| Mention (@you) | 30 per mention |
| Shared item pending response | 20 per item |
| Connection request | 15 per request |
| Comment on your content | 15 per comment |
| System notification | 5 per notification |
| No attention needed | 0 |

### 3. Recency Factor (0-100)

Fresh activity. "This just happened."

| Condition | Score |
|-----------|-------|
| Activity in last 15 min | 100 |
| Activity in last hour | 80 |
| Activity today | 60 |
| Activity yesterday | 40 |
| Activity this week | 25 |
| Activity this month | 10 |
| No recent activity | 0 |

### 4. Feature Usage Factor (0-100)

Behavioral weight. "You actually use this."

Calculated from rolling 30-day window:

```
Feature Usage Score = (Feature Interactions / Total Interactions) × 100
```

**Interaction types counted:**
- Create (new item)
- View (open/read)
- Edit (modify)
- Complete (finish task, etc.)
- Share (send to someone)

**Example user profile:**
| Feature | Interactions (30d) | % | Score |
|---------|-------------------|---|-------|
| Tasks | 450 | 35% | 35 |
| Notes | 280 | 22% | 22 |
| Projects | 200 | 16% | 16 |
| Messages | 150 | 12% | 12 |
| Events | 100 | 8% | 8 |
| Images | 60 | 5% | 5 |
| Files | 30 | 2% | 2 |

**Decay and boosting:**
- Recent interactions (last 7 days) count 2×
- Features unused for 14+ days decay by 50%
- New features get a "discovery boost" of +20 for first 7 days

### 5. Context Factor (0-100)

Environmental awareness. "Given the situation..."

**Time of day:**
| Time | Bias |
|------|------|
| Early morning (5-8am) | +20 to Events (agenda), +10 to Tasks (planning) |
| Work hours (9am-5pm) | +15 to Tasks, +15 to Projects, +10 to Messages |
| Evening (6-9pm) | +20 to completed items (reflection), +10 to Social |
| Night (9pm-12am) | +15 to tomorrow preview, -20 to work items |
| Late night (12-5am) | Minimal, only urgent items |

**Day of week:**
| Day | Bias |
|-----|------|
| Monday | +15 to weekly planning, +10 to Projects |
| Friday | +10 to completion/wrap-up, +10 to Social |
| Weekend | -30 to work-tagged items, +20 to Personal life area |

**Detected patterns (learned):**
- User typically checks messages at 9am → boost Messages at 9am
- User does task review at 6pm → boost Tasks at 6pm
- User adds notes after meetings → boost Notes after events end

---

## Weight Distribution

The weights (U, A, R, F, C) shift based on detected mode:

### Default Mode
| Weight | Value | Rationale |
|--------|-------|-----------|
| Urgency (U) | 0.30 | Time-sensitive matters |
| Attention (A) | 0.25 | People waiting on you |
| Feature Usage (F) | 0.20 | Personal relevance |
| Recency (R) | 0.15 | Fresh content |
| Context (C) | 0.10 | Environmental fit |

### "Catching Up" Mode (detected: first open of day, or after 4+ hours away)
| Weight | Value |
|--------|-------|
| Attention (A) | 0.35 |
| Urgency (U) | 0.30 |
| Recency (R) | 0.20 |
| Feature Usage (F) | 0.10 |
| Context (C) | 0.05 |

### "Deep Work" Mode (detected: user hasn't switched contexts in 30+ min)
| Weight | Value |
|--------|-------|
| Feature Usage (F) | 0.35 |
| Urgency (U) | 0.25 |
| Context (C) | 0.20 |
| Recency (R) | 0.15 |
| Attention (A) | 0.05 |

### "Winding Down" Mode (detected: evening, low activity)
| Weight | Value |
|--------|-------|
| Recency (R) | 0.30 |
| Context (C) | 0.30 |
| Urgency (U) | 0.20 |
| Feature Usage (F) | 0.15 |
| Attention (A) | 0.05 |

### "Urgent" Mode (detected: multiple overdue items, or user clicked from notification)
| Weight | Value |
|--------|-------|
| Urgency (U) | 0.50 |
| Attention (A) | 0.30 |
| Recency (R) | 0.10 |
| Feature Usage (F) | 0.05 |
| Context (C) | 0.05 |

---

## Pinned Widgets

Users can pin widgets to fixed positions. Pinned widgets override dynamic placement.

### Pinning Behavior

| Aspect | Behavior |
|--------|----------|
| Position | User chooses: top-left, top-right, bottom-left, bottom-right, or "always show" |
| Size | User can set: narrow (1/4), default (1/3), wide (1/2) |
| Visibility | Always visible regardless of priority score |
| Content | Still updates dynamically (e.g., pinned calendar still shows current month) |
| Limit | Recommend max 4 pinned widgets to leave room for dynamic content |

### How Pinning Affects Layout

1. **Pinned widgets placed first** - They claim their grid positions
2. **Dynamic widgets fill remaining space** - Algorithm arranges around pinned areas
3. **Collision handling** - If user pins too many, warn about reduced dynamic space
4. **Responsive** - Pinned positions may shift on smaller screens but maintain relative placement

### Pin Storage

```javascript
userPreferences.pinnedWidgets = [
  { widgetId: 'calendar', position: 'top-right', size: 'narrow' },
  { widgetId: 'projects', position: 'bottom-left', size: 'default' }
];
```

### UI for Pinning

- Hover widget → show pin icon
- Click pin → choose position (or "always show")
- Pinned widgets show subtle pin indicator
- Drag to reposition pinned widgets
- Right-click or long-press → unpin

---

## Section Visibility Rules

Each dashboard section has a calculated **Section Score** based on its items' priority scores.

```
Section Score = Average(top 3 item scores) + (item count bonus)
```

Item count bonus: +5 for each item (max +20)

### Display Thresholds

| Section Score | Display State |
|---------------|---------------|
| 80+ | **Prominent**: Large, expanded, at top |
| 60-79 | **Visible**: Standard size, normal position |
| 40-59 | **Compact**: Collapsed, shows count only |
| 20-39 | **Minimal**: Single line or icon only |
| < 20 | **Hidden**: Not shown (accessible via nav) |

### Minimum Guarantees

Some things should always show regardless of score:

| Condition | Guarantee |
|-----------|-----------|
| Event happening NOW | Always prominent |
| Overdue items exist | Always at least visible |
| Unread messages > 0 | Always at least compact |
| User's top 2 used features | Always at least minimal |

---

## Available Widgets

Complete inventory of dashboard widgets:

| Widget | Content | Typical Size | Notes |
|--------|---------|--------------|-------|
| **Time** | Clock, date, stopwatch, timer, alarm | Narrow (1/4) | Expandable features |
| **Weather** | Current conditions, forecast, location | Narrow (1/4) | Settings in user preferences |
| **Calendar** | Mini month view, event dots | Narrow (1/4) | Click day to see events |
| **Today's Events** | Time-based agenda list | Default (1/3) | Only calendar events |
| **Priority Tasks** | Tasks by priority/due date | Default or Wide | Not time-slotted |
| **Overdue** | Past-due items | Default (1/3) | High urgency styling |
| **Active Projects** | Projects with progress | Default (1/3) | Recent activity indicator |
| **Messages** | Unread conversations | Default (1/3) | Grouped by person |
| **Notifications** | System alerts, mentions | Narrow (1/4) | Badges, quick actions |
| **Inbox** | Uncategorized captures | Default (1/3) | Process prompts |
| **Shared With You** | Items from connections | Default (1/3) | Pending response indicator |
| **Activity Feed** | Updates from connections | Default (1/3) | Social activity |
| **Recent Captures** | Recently added content | Default (1/3) | Notes, images, files |
| **Media** | Image/file grid | Default (1/3) | Visual thumbnails |
| **Stats** | Completion, streaks, counts | Wide (1/2) | Motivational |
| **Feature Guide** | Building blocks explainer | Narrow (1/4) | For learning |
| **Tomorrow Preview** | Next day's agenda | Default (1/3) | Evening context |

**Total: 17 widget types**

### Display Limits

| Guideline | Count |
|-----------|-------|
| Minimum | 3-4 |
| Typical | 5-7 |
| Maximum | 8-9 |

Focus card (hero) + 5-7 widgets is the target. Algorithm hides low-score widgets rather than showing everything.

---

## Dashboard Sections

### 1. Focus Card (Dynamic Hero)

Always present. Content determined by highest-scoring single item.

**Selection logic:**
1. Event happening now? → Show it
2. Event in < 15 min? → Show countdown
3. Overdue item with highest score? → Show urgent alert
4. Top priority task due today? → Show it
5. Active project with momentum? → Show progress
6. Nothing pressing? → Show "All clear" or next upcoming

### 2. Needs Attention (Attention-driven)

Shows when: Attention factor items exist

Contains:
- Unread messages (grouped by conversation)
- Notifications requiring action
- Shared items pending response
- Mentions

### 3. Today's Agenda (Urgency-driven, time-bound)

Shows when: Events exist for today

Contains:
- Calendar events only (not tasks)
- Sorted by time
- Current event highlighted
- Shows gaps between events

### 4. Priority Tasks (Urgency-driven, action items)

Shows when: Tasks exist

Contains:
- Tasks due today (sorted by priority)
- Overdue tasks (always at top, highlighted)
- High-priority tasks due soon

Display: Adapts based on count
- 1-3 tasks: Show full details
- 4-7 tasks: Compact list
- 8+: Top 5 + "and X more"

### 5. Active Projects (Usage + Recency driven)

Shows when: User has projects with recent activity

Contains:
- Projects with activity in last 7 days
- Projects with upcoming deadlines
- Projects user frequently accesses

Display:
- Progress indicator
- Next action / recent activity
- Quick access to project

### 6. Messages (Attention + Usage driven)

Shows when: Unread messages OR high message usage

Contains:
- Unread conversations
- Recent conversations (if high usage)

Display adapts:
- Low message user: Only show if unread
- High message user: Always show recent, prominent if unread

### 7. Recent Captures (Recency driven)

Shows when: Items created in last 24-48 hours

Contains:
- Recently added notes
- Recently uploaded images
- Recently saved files
- Recently created items

Purpose: "What did I put in my brain recently?"

### 8. Social Activity (Attention + Usage driven)

Shows when: Social activity exists OR high social usage

Contains:
- Activity from connections
- Content shared with you
- Reactions/comments on your content

### 9. Quick Stats (Context driven)

Shows when: End of day OR user has completion streak

Contains:
- Tasks completed today
- Completion rate
- Streak data (if applicable)
- Progress toward goals

---

## Section Ordering

Sections are ordered by their Section Score, with constraints:

1. Focus Card is always first
2. "Needs Attention" is always in top 3 if score > 40
3. Maximum 6 sections visible at once (rest in overflow)
4. Related sections group together (Messages + Social, Tasks + Projects)

---

## Learning System

The dashboard improves over time by tracking:

### Click-through Rate (CTR)
- Which sections does the user click into?
- Which items does the user act on from dashboard?
- High CTR → increase Feature Usage weight
- Low CTR → decrease visibility threshold

### Dismissal Patterns
- Does user collapse certain sections?
- Does user ignore certain notifications?
- Frequent dismissal → lower section score

### Time-based Patterns
- When does user typically open app?
- What do they interact with at different times?
- Build personalized Context Factor

### Session Patterns
- Short sessions (< 2 min): User wants quick overview
  → Favor Attention + Urgency items
- Long sessions (> 10 min): User is working
  → Favor Feature Usage + Recency items

---

## Cold Start (New Users)

For users without usage history:

1. **Day 1-3**: Onboarding mode
   - Feature Guide prominent
   - Encourage trying different features
   - Equal weight to all sections

2. **Day 4-14**: Learning mode
   - Start building usage profile
   - Default weights with gradual personalization
   - "Discovery boost" for unused features

3. **Day 15+**: Personalized mode
   - Full algorithm with learned weights
   - Periodic "rediscovery" prompts for unused features

---

## Edge Cases

### All Clear State
When no items have score > 30:
- Show accomplishments (what you did today)
- Show upcoming (tomorrow preview)
- Show suggestions (maybe process inbox, review a project)
- Keep it calm, not empty

### Information Overload State
When many items have score > 70:
- Cap visible items more aggressively
- Add "Focus Mode" prompt
- Sort by urgency primarily
- Clear visual hierarchy (one thing at a time)

### Feature Never Used
If a feature has 0 usage but has urgent content:
- Still surface it (overdue task from imported data)
- Include subtle "new to you" indicator
- Don't penalize in scoring

### Feature Heavily Used but Empty
If user uses Tasks a lot but has none right now:
- Keep Quick Add prominent
- Don't show empty "You have no tasks" card
- Maybe show completion celebration

---

## Data Required

To implement this system, track:

### Per User
- Feature interaction counts (30-day rolling)
- Typical active hours
- Session patterns
- Click-through rates per section
- Dismissal patterns

### Per Item
- Created timestamp
- Modified timestamp
- Due date/time (if applicable)
- Priority/importance
- Completion status
- Associated feature/type
- Attention flags (unread, pending, mentioned)

### Per Session
- Start time
- Duration
- Items interacted with
- Mode detected

---

## Implementation Phases

### Phase 1: Basic Conditional Display
- Implement section visibility thresholds
- Static weights
- Time-of-day context only

### Phase 2: Dynamic Weighting
- Add feature usage tracking
- Implement weight shifting by mode
- Add attention factor

### Phase 3: Learning
- Track CTR and dismissals
- Build personalized patterns
- Implement cold start flow

### Phase 4: Advanced Context
- Detected mode switching
- Day-of-week patterns
- Predictive surfacing

---

*Last updated: 2025-01-21*
