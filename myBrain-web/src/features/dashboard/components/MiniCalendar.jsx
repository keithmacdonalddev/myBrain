import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useEvents } from '../../calendar/hooks/useEvents';

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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

  // Build calendar grid (35 days = 5 weeks)
  const calendarDays = useMemo(() => {
    const days = [];
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    start.setDate(start.getDate() - start.getDay());

    for (let i = 0; i < 35; i++) {
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
    <div className="bg-panel border border-border rounded-lg p-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
          <Calendar className="w-4 h-4 text-blue-500" />
        </div>
        <h3 className="font-medium text-text text-sm">Calendar</h3>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={goToPreviousMonth}
          className="p-0.5 hover:bg-bg rounded transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-muted" />
        </button>
        <button
          onClick={goToToday}
          className="text-xs font-medium text-text hover:text-primary transition-colors"
        >
          {currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </button>
        <button
          onClick={goToNextMonth}
          className="p-0.5 hover:bg-bg rounded transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5 text-muted" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {DAYS.map((day, i) => (
          <div
            key={i}
            className="text-center text-[9px] font-medium text-muted py-0.5"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((date, index) => {
          const dayEvents = getEventsForDay(date);
          const hasEvents = dayEvents.length > 0;

          return (
            <Link
              key={index}
              to={`/app/calendar?date=${date.toISOString().split('T')[0]}`}
              className={`
                h-6 flex items-center justify-center rounded text-[10px]
                transition-colors relative
                ${isToday(date)
                  ? 'bg-primary text-white font-bold'
                  : isCurrentMonth(date)
                    ? 'text-text hover:bg-bg'
                    : 'text-muted/40'
                }
              `}
            >
              <span>{date.getDate()}</span>
              {hasEvents && (
                <div className={`absolute bottom-0 w-1 h-1 rounded-full ${isToday(date) ? 'bg-white' : 'bg-primary'}`} />
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer link */}
      <Link
        to="/app/calendar"
        className="block text-center text-[10px] text-primary hover:underline mt-2"
      >
        Open Calendar
      </Link>
    </div>
  );
}

export default MiniCalendar;
