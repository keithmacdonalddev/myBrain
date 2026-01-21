/**
 * =============================================================================
 * CALENDARWIDGET.JSX - Mini Calendar Widget
 * =============================================================================
 *
 * A compact monthly calendar widget showing the current month with event
 * indicators and interactive date selection.
 *
 * INTERACTION:
 * - Single click on a date → Selects that date, EventsWidget shows that day's events
 * - Second click on selected date → Navigates to calendar page for that date
 * - Month navigation arrows to view different months
 *
 * SIZE: narrow (3 columns)
 *
 * =============================================================================
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { WidgetHeader, WidgetBody, WidgetFooter, WidgetLoading } from '../components/DashboardGrid';
import { useEvents } from '../../calendar/hooks/useEvents';

const DAY_HEADERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * Check if two dates are the same day
 */
function isSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Format date to YYYY-MM-DD string
 */
function formatDateString(date) {
  return date.toISOString().split('T')[0];
}

/**
 * CalendarWidget
 * --------------
 * @param {Date} selectedDate - Currently selected date
 * @param {Function} onDateSelect - Callback when a date is selected
 */
export default function CalendarWidget({
  selectedDate,
  onDateSelect
}) {
  const navigate = useNavigate();
  const today = new Date();

  // State for the currently viewed month
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const viewYear = viewMonth.getFullYear();
  const viewMonthIndex = viewMonth.getMonth();

  // Calculate first and last day of viewed month for fetching events
  const monthRange = useMemo(() => {
    const startDate = new Date(viewYear, viewMonthIndex, 1);
    const endDate = new Date(viewYear, viewMonthIndex + 1, 0); // Last day of month
    return {
      startDate: formatDateString(startDate),
      endDate: formatDateString(endDate)
    };
  }, [viewYear, viewMonthIndex]);

  // Fetch events for the viewed month
  const { data: monthEventsData, isLoading } = useEvents(monthRange);
  const monthEvents = monthEventsData?.events || [];

  // Get month name and year for header
  const monthYear = viewMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  // Navigation handlers
  const goToPrevMonth = () => {
    setViewMonth(new Date(viewYear, viewMonthIndex - 1, 1));
  };

  const goToNextMonth = () => {
    setViewMonth(new Date(viewYear, viewMonthIndex + 1, 1));
  };

  const goToCurrentMonth = () => {
    setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  // Calculate calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonthIndex, 1);
    const lastDay = new Date(viewYear, viewMonthIndex + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Get days from previous month to fill the first row
    const prevMonthLastDay = new Date(viewYear, viewMonthIndex, 0).getDate();
    const days = [];

    // Previous month days (grayed out)
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = new Date(viewYear, viewMonthIndex - 1, day);
      days.push({
        day,
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, today)
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewYear, viewMonthIndex, day);
      days.push({
        day,
        date,
        isCurrentMonth: true,
        isToday: isSameDay(date, today)
      });
    }

    // Next month days to fill remaining cells (up to 42 for 6 rows)
    const remaining = 42 - days.length;
    for (let day = 1; day <= remaining; day++) {
      const date = new Date(viewYear, viewMonthIndex + 1, day);
      days.push({
        day,
        date,
        isCurrentMonth: false,
        isToday: isSameDay(date, today)
      });
    }

    return days;
  }, [viewYear, viewMonthIndex, today]);

  // Create a Set of days that have events
  const daysWithEvents = useMemo(() => {
    const eventDays = new Set();

    monthEvents.forEach(event => {
      const eventDate = new Date(event.startDate);
      // Only include events from the viewed month
      if (eventDate.getMonth() === viewMonthIndex && eventDate.getFullYear() === viewYear) {
        eventDays.add(eventDate.getDate());
      }
    });

    return eventDays;
  }, [monthEvents, viewMonthIndex, viewYear]);

  // Count events this month
  const eventCount = daysWithEvents.size;

  // Handle date click
  const handleDateClick = (item) => {
    const clickedDate = item.date;
    const isAlreadySelected = selectedDate && isSameDay(clickedDate, selectedDate);

    if (isAlreadySelected) {
      // Second click on same date - navigate to calendar
      navigate(`/app/calendar?date=${formatDateString(clickedDate)}`);
    } else {
      // First click - select the date
      onDateSelect?.(clickedDate);
    }
  };

  // Handle footer click - go to calendar with selected date if any
  const handleOpenCalendar = () => {
    if (selectedDate) {
      navigate(`/app/calendar?date=${formatDateString(selectedDate)}`);
    } else {
      navigate('/app/calendar');
    }
  };

  return (
    <>
      <WidgetHeader
        icon={<Calendar className="w-4 h-4 text-purple-500" />}
        iconBg="bg-purple-500/10"
        title={monthYear}
        subtitle={eventCount > 0 ? `${eventCount} day${eventCount !== 1 ? 's' : ''} with events` : undefined}
      />

      <WidgetBody>
        {isLoading ? (
          <WidgetLoading />
        ) : (
          <div className="mini-calendar">
            {/* Month navigation */}
            <div className="mini-calendar-nav">
              <button
                onClick={goToPrevMonth}
                className="mini-calendar-nav-btn"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToCurrentMonth}
                className="mini-calendar-nav-title"
              >
                {monthYear}
              </button>
              <button
                onClick={goToNextMonth}
                className="mini-calendar-nav-btn"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="mini-calendar-header">
              {DAY_HEADERS.map((day, i) => (
                <div key={i} className="mini-calendar-day-header">{day}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="mini-calendar-grid">
              {calendarDays.map((item, i) => {
                const hasEvent = item.isCurrentMonth && daysWithEvents.has(item.day);
                const isSelected = selectedDate && isSameDay(item.date, selectedDate);

                return (
                  <div
                    key={i}
                    onClick={() => handleDateClick(item)}
                    className={`mini-calendar-day
                      ${!item.isCurrentMonth ? 'other-month' : ''}
                      ${item.isToday && !isSelected ? 'today' : ''}
                      ${isSelected ? 'selected' : ''}`}
                  >
                    {item.day}
                    {hasEvent && <span className="event-dot" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </WidgetBody>

      <WidgetFooter>
        <button onClick={handleOpenCalendar} className="widget-footer-link">
          Open calendar <ChevronRight className="w-4 h-4" />
        </button>
      </WidgetFooter>
    </>
  );
}

CalendarWidget.defaultSize = 'narrow';
