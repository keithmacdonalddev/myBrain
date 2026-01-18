import { useMemo } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function MonthView({ currentDate, events = [], onDateClick, onEventClick }) {
  const { weeks, monthStart, monthEnd } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of the month
    const monthStart = new Date(year, month, 1);
    // Last day of the month
    const monthEnd = new Date(year, month + 1, 0);

    // Start from the Sunday of the week containing the first day
    const calendarStart = new Date(monthStart);
    calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());

    // End at the Saturday of the week containing the last day
    const calendarEnd = new Date(monthEnd);
    calendarEnd.setDate(calendarEnd.getDate() + (6 - calendarEnd.getDay()));

    const weeks = [];
    let currentWeek = [];
    let day = new Date(calendarStart);

    while (day <= calendarEnd) {
      currentWeek.push(new Date(day));

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      day.setDate(day.getDate() + 1);
    }

    return { weeks, monthStart, monthEnd };
  }, [currentDate]);

  const getEventsForDate = (date) => {
    const dateStr = date.toDateString();
    return events.filter((event) => {
      const eventStart = new Date(event.startDate).toDateString();
      const eventEnd = new Date(event.endDate).toDateString();
      return dateStr === eventStart || dateStr === eventEnd ||
        (date >= new Date(event.startDate) && date <= new Date(event.endDate));
    });
  };

  const isToday = (date) => {
    return date.toDateString() === new Date().toDateString();
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-muted"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-rows-6">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {week.map((date, dayIndex) => {
              const dayEvents = getEventsForDate(date);
              const isCurrentMonthDay = isCurrentMonth(date);
              const isTodayDate = isToday(date);

              return (
                <div
                  key={dayIndex}
                  onClick={() => onDateClick?.(date)}
                  className={`min-h-[100px] p-1 border-r border-border last:border-r-0 cursor-pointer hover:bg-bg/50 transition-colors ${
                    !isCurrentMonthDay ? 'bg-bg/30' : ''
                  }`}
                >
                  {/* Date number */}
                  <div className="flex justify-center mb-1">
                    <span
                      className={`w-7 h-7 flex items-center justify-center text-sm rounded-full ${
                        isTodayDate
                          ? 'bg-primary text-white font-semibold'
                          : isCurrentMonthDay
                          ? 'text-text'
                          : 'text-muted'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </div>

                  {/* Events */}
                  <div className="space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event._id || `${event.originalEventId}-${date.toISOString()}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                        className="px-1.5 py-0.5 text-xs rounded truncate text-white cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: event.color || '#3b82f6' }}
                        title={event.title}
                      >
                        {event.allDay ? '' : new Date(event.startDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ' '}
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="px-1.5 text-xs text-muted">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MonthView;
