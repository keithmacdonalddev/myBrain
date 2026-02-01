# Calendar Implementation - Code Issues & Fixes

## Critical Issues Requiring Action

### Issue 1: All-day Events Not Visible in Week View

**File:** `myBrain-web/src/features/calendar/components/WeekView.jsx`
**Line:** 103
**Severity:** CRITICAL

**Current Code:**
```javascript
{weekDays.map((day, dayIndex) => {
  const dayEvents = getEventsForDay(day).filter(e => !e.allDay);  // ← EXCLUDES ALL-DAY

  return (
    <div>
      {/* Only shows timed events */}
      {dayEvents.map((event) => { ... })}
    </div>
  );
})}
```

**Problem:** All-day events are explicitly filtered out with `.filter(e => !e.allDay)`. They only show in Day view and Month view, but vanish in Week view.

**Expected Behavior:** All-day events should appear in a dedicated section at the top of Week view (similar to Day view).

**User Impact:** User creates an all-day event (e.g., "Holiday", "Birthday"), then switches from Day view to Week view, and the event completely disappears. Very confusing.

**Fix Required:**
```javascript
// Add this section above the hour grid in WeekView
{allDayEvents.length > 0 && (
  <div className="border-b border-border p-2 bg-bg/50">
    <div className="text-xs text-muted mb-2">All day</div>
    <div className="space-y-1">
      {allDayEvents.map((event) => (
        <div
          key={event._id}
          onClick={() => onEventClick?.(event)}
          className="px-2 py-1 rounded text-sm text-white cursor-pointer hover:opacity-80"
          style={{ backgroundColor: event.color || '#3b82f6' }}
        >
          {event.title}
        </div>
      ))}
    </div>
  </div>
)}
```

---

### Issue 2: Multi-day Events Only Show Start Date in Week/Day Views

**File:** `myBrain-web/src/features/calendar/components/WeekView.jsx`
**Lines:** 20-26 and `DayView.jsx` lines 6-12
**Severity:** HIGH

**Current Code (WeekView):**
```javascript
const getEventsForDay = (date) => {
  const dateStr = date.toDateString();
  return events.filter((event) => {
    const eventDate = new Date(event.startDate).toDateString();
    return eventDate === dateStr;  // ← EXACT MATCH ONLY
  });
};
```

**Problem:** Only checks if event START DATE matches the day being rendered. A 5-day event (Jan 20-24) only shows on Jan 20 in week view.

**Expected Behavior:** Event should appear on all days it spans (Jan 20, 21, 22, 23, 24).

**Comparison:** MonthView does this correctly (lines 39-45):
```javascript
const getEventsForDate = (date) => {
  const dateStr = date.toDateString();
  return events.filter((event) => {
    const eventStart = new Date(event.startDate).toDateString();
    const eventEnd = new Date(event.endDate).toDateString();
    return dateStr === eventStart || dateStr === eventEnd ||
      (date >= new Date(event.startDate) && date <= new Date(event.endDate));  // ← RANGE CHECK
  });
};
```

**Fix Required:**
```javascript
const getEventsForDay = (date) => {
  const dateStr = date.toDateString();
  return events.filter((event) => {
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);
    const dayDate = new Date(date);
    return dayDate >= eventStart && dayDate <= eventEnd;  // ← RANGE CHECK
  });
};
```

Apply same fix to DayView.jsx lines 6-12.

---

### Issue 3: Overlapping Events Render Without Separation

**File:** `myBrain-web/src/features/calendar/components/WeekView.jsx`
**Lines:** 131-146 and `DayView.jsx` lines 110-143
**Severity:** HIGH

**Current Code (WeekView):**
```javascript
{dayEvents.map((event) => {
  const position = getEventPosition(event);
  return (
    <div
      className="absolute left-1 right-1 px-2 py-1 rounded..."  // ← FULL WIDTH
      style={{
        ...position,
        backgroundColor: event.color || '#3b82f6',
      }}
    >
      <div className="font-medium truncate">{event.title}</div>
      <div className="opacity-80 truncate">
        {new Date(event.startDate).toLocaleTimeString(...)}
      </div>
    </div>
  );
})}
```

**Problem:** When 2+ events occur at same time, they render `left-1 right-1` (taking full width) with no offset, so they stack on top of each other. Both become unreadable/unclickable.

**Visual Result:**
```
9:00 AM ┌──────────────────┐
        │ Team Meeting ┐   │
        │  - unreadabl│e   │
        │ 1:1 Sync   └─┘   │
        │  - hidden below   │
```

**Fix Required:** Implement collision detection to:
1. Detect overlapping events
2. Calculate offset width (e.g., if 2 overlap, each gets 50% width)
3. Adjust left/right positions accordingly
4. Update z-index for stacking

This is complex - requires layout calculation algorithm.

---

### Issue 4: "+N More" Events Not Clickable in Month View

**File:** `myBrain-web/src/features/calendar/components/MonthView.jsx`
**Lines:** 128-132
**Severity:** HIGH

**Current Code:**
```javascript
{dayEvents.length > 3 && (
  <div className="px-2 text-xs text-muted font-medium">
    +{dayEvents.length - 3} more
  </div>
)}
```

**Problem:** This is a static `<div>` with no onClick handler. Users expect to click it to see all events for that day.

**User Expectation:** Click "+3 more" → expanded view or modal showing all events.

**Current Behavior:** Clicking does nothing.

**Fix Required:**
```javascript
{dayEvents.length > 3 && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      // Either:
      // Option 1: Show modal with all events for this day
      // Option 2: Expand the day cell to show all events
      // Option 3: Switch to day view (current behavior when clicking date works)
      onDateClick?.(date);  // Reuse existing date click which switches to day view
    }}
    className="px-2 text-xs text-primary font-medium hover:underline cursor-pointer"
  >
    +{dayEvents.length - 3} more
  </button>
)}
```

---

### Issue 5: Time Zone Handling Not Visible

**File:** `CalendarView.jsx`, `EventModal.jsx`, all view components
**Lines:** Throughout
**Severity:** CRITICAL

**Current Code Sample (CalendarView.jsx line 79):**
```javascript
const today = new Date();  // ← Uses browser's local timezone
const isToday = (date) => date.toDateString() === today.toDateString();
```

**Problem:**
1. Creates dates using `new Date()` which uses browser's local timezone
2. No visible timezone conversion from API responses
3. If API returns UTC and frontend doesn't convert, times could shift

**Example Failure Scenario:**
- User in UTC-8 (PST) creates event for "10:00 AM"
- Browser creates: `new Date('2026-01-31T10:00:00')` (interprets as local time)
- Sent to backend: `2026-01-31T18:00:00Z` (UTC)
- Another user in UTC+0 views: Shows as "6:00 PM" (6 hours ahead)
- Another user in UTC+8 views: Shows as "2:00 AM next day"

**Required Fix:**
1. **Backend:** Always return ISO 8601 with timezone: `2026-01-31T10:00:00-08:00`
2. **Frontend:** Convert to user's timezone when displaying
3. **EventModal:** Show user's timezone in form: "10:00 AM (PST)"
4. **Verification:** Add tests with different timezones

**Verification Needed:**
- [ ] Check backend response format in Network tab
- [ ] Verify backend stores UTC
- [ ] Verify frontend converts to local time
- [ ] Test event creation across timezone boundaries

---

## High-Priority Issues

### Issue 6: Mobile Touch Target Sizes Below WCAG Standard

**File:** Multiple
**Locations:**
- Mini calendar days: `min-h-[36px]` (CalendarView.jsx line 125)
- Month view event cards: `px-2 py-1` = ~24px height
- Navigation buttons: Check sizing

**Standard:** WCAG 2.1 Level A requires minimum 44x44px for touch targets

**Problem:** Small targets harder to tap on mobile, causes accidental mis-taps.

**Fix Required:**
```javascript
// Mini calendar - increase from 36px to 44px
button className={`
  aspect-square min-h-[44px] flex flex-col items-center justify-center...
`}

// Month view event cards - increase padding
className="flex items-center gap-1.5 px-2 py-2 text-xs rounded-lg..."  // py-2 instead of py-1
```

---

### Issue 7: Event Title Overflow in Day View

**File:** `DayView.jsx`
**Line:** 126
**Severity:** MEDIUM

**Current Code:**
```javascript
<div className="font-medium">{event.title}</div>  // ← NO TRUNCATE
```

**Problem:** Very long titles can overflow the event box, pushing content outside boundaries.

**Comparison (WeekView line 137):**
```javascript
<span className="truncate font-medium">
  {event.allDay ? '' : time}
  {event.title}
</span>
```

**Fix Required:**
```javascript
<div className="font-medium truncate">{event.title}</div>
```

---

### Issue 8: No Validation for Empty Event Titles

**File:** `EventModal.jsx`
**Line:** 112 (title state)
**Severity:** MEDIUM

**Current Code:**
```javascript
const [title, setTitle] = useState(initialTitle);
// ... later ...
// No validation visible on save
```

**Problem:** Form doesn't require title, allowing creation of events with blank names.

**Fix Required:**
```javascript
const handleSave = async () => {
  if (!title.trim()) {
    toast.error('Event title is required');
    return;
  }
  // ... proceed with save
};
```

---

### Issue 9: Missing Disabled State on Navigation Buttons

**File:** `CalendarView.jsx`, `MonthView.jsx` mini calendar
**Lines:** 89-106 (mini calendar), 460-477 (main nav)
**Severity:** LOW

**Current Code:**
```javascript
<button
  onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
  className="p-2 hover:bg-bg active:bg-bg/80..."  // ← Always enabled
>
  <ChevronLeft className="w-4 h-4" />
</button>
```

**Problem:** Can navigate forever backward/forward. No feedback at year boundaries. User might get lost.

**Fix Required:**
```javascript
const canGoBack = viewMonth.getFullYear() > 1900;  // Arbitrary limit
<button
  onClick={() => canGoBack && setViewMonth(...)}
  disabled={!canGoBack}
  className={`p-2 rounded-lg transition-colors ${
    canGoBack
      ? 'hover:bg-bg active:bg-bg/80'
      : 'opacity-50 cursor-not-allowed'
  }`}
>
```

---

### Issue 10: Event Colors May Have Accessibility Issues

**File:** `EventModal.jsx`
**Lines:** 38-46
**Severity:** MEDIUM

**Current Code:**
```javascript
const EVENT_COLORS = [
  { value: '#3b82f6', label: 'Blue' },    // ✅ Good contrast
  { value: '#10b981', label: 'Green' },   // ✅ Good contrast
  { value: '#f59e0b', label: 'Yellow' },  // ⚠️ Poor contrast in light mode
  { value: '#ef4444', label: 'Red' },     // ✅ Good contrast
  { value: '#8b5cf6', label: 'Purple' },  // ✅ Good contrast
  { value: '#ec4899', label: 'Pink' },    // ⚠️ Medium contrast
  { value: '#6b7280', label: 'Gray' },    // ⚠️ Poor contrast
];
```

**Problem:** Yellow (#f59e0b) on light background is hard to read. Gray (#6b7280) has poor contrast.

**Test Required:** Check WCAG AA contrast ratios for all colors in both light and dark modes.

**Fix Options:**
1. Test with contrast checker and adjust if needed
2. Add white text shadow for low-contrast colors
3. Use different colors entirely

---

## Summary Table

| Issue | File | Line | Severity | Type | Status |
|-------|------|------|----------|------|--------|
| All-day in Week view | WeekView.jsx | 103 | CRITICAL | Missing Feature | Not Implemented |
| Multi-day event range | WeekView.jsx | 20-26 | HIGH | Logic Error | Incorrect Logic |
| Overlapping events | WeekView.jsx | 131-146 | HIGH | Visual Bug | No Collision Detection |
| "+N more" not clickable | MonthView.jsx | 128-132 | HIGH | UX Issue | No Handler |
| Time zone handling | Throughout | Various | CRITICAL | Data Integrity | Unverified |
| Touch target sizes | Multiple | Various | HIGH | Accessibility | Below Standard |
| Title overflow | DayView.jsx | 126 | MEDIUM | CSS Issue | Missing Truncate |
| Empty titles allowed | EventModal.jsx | 112+ | MEDIUM | Validation | Missing Check |
| No disabled buttons | CalendarView.jsx | 89-106 | LOW | UX Polish | Missing State |
| Color contrast | EventModal.jsx | 38-46 | MEDIUM | Accessibility | Unverified |

---

## Recommended Fix Priority

### Fix Immediately (Before Shipping)
1. All-day events in Week view (CRITICAL - data visibility)
2. Time zone verification (CRITICAL - data integrity)
3. Overlapping events (HIGH - UX issue)
4. "+N more" clickability (HIGH - expected feature)
5. Multi-day event range (HIGH - data visibility)
6. Touch target sizes (HIGH - accessibility)

### Fix Soon (Next Sprint)
7. Title truncation in Day view
8. Empty title validation
9. Color contrast verification
10. Button disabled states

### Fix Later (Polish)
11. Additional UX improvements
12. Performance optimizations

---

*This document is a reference for developers fixing calendar issues.*
*Use in conjunction with qa-calendar-2026-01-31.md for full context.*
