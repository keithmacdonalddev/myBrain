# Design Log

Long-term memory for design decisions, inspiration analysis, and learned preferences.

---

## Design Option Level

**Current:** C (Hybrid) - Basic design awareness + skills for focused work
**Options:** A (Always-On) | B (Dedicated Subagent) | C (Hybrid)
**Last Reviewed:** 2025-01-20
**Next Review:** 2025-02-20

---

## Inspiration Analysis

Patterns identified from user's inspiration submissions.

| Date | Source | What They Liked | Pattern Identified |
|------|--------|-----------------|-------------------|
| | | | (awaiting first inspiration submission) |

### Emerging Themes

*Patterns that appear across multiple inspirations:*

- (none yet - will populate as inspiration is submitted)

---

## Design Decisions

Architectural and stylistic choices made (don't revisit without reason).

| Date | Decision | Reason | Confidence |
|------|----------|--------|------------|
| 2025-01-20 | Zinc color palette for dark mode | Modern, less harsh than pure gray | High |
| 2025-01-20 | System font stack | Performance, native feel | High |
| 2025-01-20 | 4px spacing scale | Industry standard, flexible | High |
| 2025-01-21 | Typography hierarchy classes | Consistent sizing across components | High |
| 2025-01-21 | Standardized card component | Reusable card, card-hover, card-accent, card-compact | High |
| 2025-01-21 | Personal greeting on dashboard | Giant clock replaced with user-focused greeting | Medium |
| 2025-01-21 | Feature Guide in command bar | Type ? or help to access; always available, no permanent space | High |
| 2025-01-21 | Conditional dashboard hierarchy | Dynamic priority scoring system based on urgency, attention, usage, recency, context | High |
| 2025-01-21 | Separate events from tasks | Events are time-bound (timeline), tasks are priority-bound (list) | High |
| 2025-01-21 | Pinnable dashboard widgets | Users can pin widgets to fixed positions; dynamic widgets arrange around them | High |
| 2025-01-21 | Weather as dashboard widget | Full widget (not just topbar), settings in user preferences | High |
| 2025-01-21 | Time as dashboard widget | Clock + future: stopwatch, timer, alarm | High |
| 2025-01-22 | FocusCard glassmorphism | Glass effect to stand out from other widgets; user chose Option D | High |
| 2025-01-22 | App-wide glassmorphism | Implemented incrementally - glass on Topbar, Sidebar, Dropdowns, Toasts, Tooltips; glass-heavy on slide panels. BaseModal uses glass (not glass-heavy - that broke modals). | High |

---

## Learned Preferences

User preferences discovered through feedback and reactions.

| Preference | Evidence | Confidence |
|------------|----------|------------|
| Mobile implementation is good | "the current mobile structure I do like a lot" | High |
| Dislikes "same old" layouts | Rejected bento grid as "nothing new" | High |
| Values productivity/speed | "most important is productivity" | High |
| Fast capture → convert flow | "add brain thoughts quickly, transition to tasks/projects" | High |
| iOS-style navigation | "meant to act like iPhone... think Apple design" | High |
| Expects Claude to be the expert | "you should be the expert... im relying on you" | High |
| Weather and time important | "weather and time is important to me" | High |
| Calendar should be present | "calendar can be more compact, but it still should be there" | High |

### Preference Notes

*Observations about what the user gravitates toward:*

- Wants genuinely fresh ideas, not rearranged widgets
- Prioritizes function over decoration
- Values the existing mobile patterns - don't change what works
- Expects proactive documentation and expertise from Claude

---

## Prototypes Created

| Date | Prototype | Purpose | Feedback | Status |
|------|-----------|---------|----------|--------|
| 2025-01-21 | dashboard-bento-v1.html | Bento grid layout | "Same old feel, nothing new" | Rejected |
| 2025-01-21 | today-mobile-v1.html | Mobile-first unified timeline | Not needed - mobile is good | N/A |
| 2025-01-21 | dashboard-desktop-v2.html | Command bar + Focus + Timeline | "On the right track" | Approved direction |
| 2025-01-21 | dashboard-desktop-v3.html | Added calendar, compact version | Superseded | - |
| 2025-01-21 | dashboard-desktop-v4.html | Interactive command bar + Feature Guide | Superseded | - |
| 2025-01-21 | dashboard-intelligent.html | Full intelligent dashboard with 6 scenario states | Pending review | Created |
| 2025-01-21 | dashboard-intelligence.md | Priority scoring system specification | Reference | Created |
| 2025-01-21 | focus-card-context-adaptive.html | FocusCard redesign - adapts by time/context | Awaiting feedback | Created |
| 2025-01-21 | focus-card-progressive-disclosure.html | FocusCard redesign - stacked progressive reveal | Awaiting feedback | Created |
| 2025-01-21 | focus-card-timeline-hero.html | FocusCard redesign - chronological timeline | Awaiting feedback | Created |
| 2025-01-22 | focus-card-standout-options.html | 4 approaches to make FocusCard demand attention | Option D (Glassmorphism) chosen | Implemented |
| 2025-01-22 | glassmorphism-app-preview.html | Full app glassmorphism: sidebar, topbar, modals, panels, dropdowns, toasts, command bar | Approved | Implemented |

---

## Design Reviews

| Date | Area Reviewed | Issues Found | Status |
|------|---------------|--------------|--------|
| | | | (none yet) |

---

## Ideas Explored

| Date | Idea | Rating | Outcome |
|------|------|--------|---------|
| | | | (none yet) |

### Rating Scale

- ⭐⭐⭐⭐⭐ - Must have, implement ASAP
- ⭐⭐⭐⭐ - Love it, high priority
- ⭐⭐⭐ - Good idea, medium priority
- ⭐⭐ - Nice to have, low priority
- ⭐ - Interesting but not now

---

## Screenshots Log

| Date | Screen | Notes | Issues Identified |
|------|--------|-------|-------------------|
| 2025-01-21 | Dashboard | Giant clock dominates, lacks personal touch | Replaced with greeting |
| 2025-01-21 | Notes list | Cards have hover states but inconsistent styling | Applied card classes |
| 2025-01-21 | Tasks list | Basic list view, needs visual interest | Added accent hover states |
| 2025-01-21 | Projects | Card layout working well | Standardized with card-interactive |
| 2025-01-21 | Calendar | Clean layout, mini calendar functional | No major issues |
| 2025-01-21 | Settings | Consistent styling | No major issues |

---

## Trend Notes

Current design trends relevant to myBrain.

| Trend | Relevance | Applied? |
|-------|-----------|----------|
| Bento grid layouts | Medium - user found it "same old" | Prototype rejected |
| Command bar centric (Raycast/Linear style) | High - keyboard-first productivity | Prototype v2 |
| Timeline/agenda view | High - unified task+event view | Prototype v2 |
| Focus mode (one thing prominent) | High - reduces cognitive load | Prototype v2 |
| Glassmorphism (subtle) | High - user preferred for FocusCard, expanded app-wide | Yes (app-wide: sidebar, topbar, modals, panels, dropdowns, toasts, tooltips) |
| Micro-interactions | High - adds polish | Yes (hover states) |
| Dark mode first | High - already implemented | Yes |
| Typography hierarchy | High - consistency | Yes |
| Card standardization | High - reusability | Yes |

---

## Next Actions

Design tasks to address:

- [x] Receive first app screenshots to assess current state
- [x] Document comprehensive mobile patterns (mobile-patterns.md)
- [x] Rethink desktop dashboard from first principles
- [ ] Get user feedback on dashboard-desktop-v2.html prototype
- [ ] Receive first inspiration images to understand aesthetic preferences
- [ ] Consider command bar implementation (Cmd+K pattern)
- [x] Review glassmorphism-app-preview.html and decide on implementation scope (approved and implemented)

---

*Last updated: 2025-01-22*
