import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { useEvents } from '../../calendar/hooks/useEvents';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function MiniCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Calculate date range for the month view
  const dateRange = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    end.setDate(end.getDate() + (6 - end.getDay()));

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [currentMonth]);

  const { data } = useEvents(dateRange);
  const events = data?.events || [];

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const days = [];
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    start.setDate(start.getDate() - start.getDay());

    for (let i = 0; i < 42; i++) {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      days.push(day);
    }

    return days;
  }, [currentMonth]);

  // Get events for a specific day
  const getEventsForDay = (date) => {
    const dateStr = date.toDateString();
    return events.filter((event) => {
      const eventDate = new Date(event.startDate).toDateString();
      return eventDate === dateStr;
    });
  };

  const today = new Date();
  const isToday = (date) => date.toDateString() === today.toDateString();
  const isCurrentMonth = (date) => date.getMonth() === currentMonth.getMonth();

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-medium text-text text-sm">Calendar</h3>
        </div>
        <Link
          to="/app/calendar"
          className="text-xs text-primary hover:underline"
        >
          Open
        </Link>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={goToPreviousMonth}
          className="p-1 hover:bg-bg rounded transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-muted" />
        </button>
        <button
          onClick={goToToday}
          className="text-sm font-medium text-text hover:text-primary transition-colors"
        >
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </button>
        <button
          onClick={goToNextMonth}
          className="p-1 hover:bg-bg rounded transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-muted" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-medium text-muted py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((date, index) => {
          const dayEvents = getEventsForDay(date);
          const hasEvents = dayEvents.length > 0;

          return (
            <Link
              key={index}
              to={`/app/calendar?date=${date.toISOString().split('T')[0]}`}
              className={`
                aspect-square flex flex-col items-center justify-center rounded text-xs
                transition-colors relative group
                ${isToday(date)
                  ? 'bg-primary text-white font-bold'
                  : isCurrentMonth(date)
                    ? 'text-text hover:bg-bg'
                    : 'text-muted/50 hover:bg-bg/50'
                }
              `}
            >
              <span>{date.getDate()}</span>
              {hasEvents && !isToday(date) && (
                <div className="absolute bottom-0.5 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((event, i) => (
                    <div
                      key={i}
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: event.color || '#3b82f6' }}
                    />
                  ))}
                </div>
              )}
              {hasEvents && isToday(date) && (
                <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-white" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default MiniCalendar;
