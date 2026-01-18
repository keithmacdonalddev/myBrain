import { useMemo } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function MonthView({ currentDate, events = [], onDateClick, onEventClick }) {
  const { weeks, monthStart, monthEnd } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    const calendarStart = new Date(monthStart);
    calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());

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
    <div className="flex flex-col h-full bg-panel">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border bg-bg">
        {DAYS.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-xs font-semibold text-muted uppercase tracking-wide"
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
                  className={`min-h-[100px] p-2 border-r border-border last:border-r-0 cursor-pointer transition-colors group ${
                    !isCurrentMonthDay ? 'bg-bg/50' : 'hover:bg-bg/30'
                  }`}
                >
                  {/* Date number */}
                  <div className="flex justify-between items-start mb-1">
                    <span
                      className={`w-7 h-7 flex items-center justify-center text-sm rounded-lg transition-colors ${
                        isTodayDate
                          ? 'bg-primary text-white font-semibold'
                          : isCurrentMonthDay
                          ? 'text-text group-hover:bg-panel'
                          : 'text-muted/50'
                      }`}
                      style={isTodayDate ? { boxShadow: '0 0 10px var(--primary-glow)' } : {}}
                    >
                      {date.getDate()}
                    </span>
                  </div>

                  {/* Events */}
                  <div className="space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event._id || `${event.originalEventId}-${date.toISOString()}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg cursor-pointer transition-all hover:translate-x-0.5"
                        style={{
                          backgroundColor: `${event.color || '#3b82f6'}15`,
                          color: event.color || '#3b82f6'
                        }}
                        title={event.title}
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: event.color || '#3b82f6' }}
                        />
                        <span className="truncate font-medium">
                          {event.allDay ? '' : new Date(event.startDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ' '}
                          {event.title}
                        </span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="px-2 text-xs text-muted font-medium">
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
