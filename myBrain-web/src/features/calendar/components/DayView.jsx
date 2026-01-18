import { useMemo } from 'react';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function DayView({ currentDate, events = [], onTimeClick, onEventClick }) {
  const dayEvents = useMemo(() => {
    const dateStr = currentDate.toDateString();
    return events.filter((event) => {
      const eventDate = new Date(event.startDate).toDateString();
      return eventDate === dateStr;
    });
  }, [currentDate, events]);

  const allDayEvents = dayEvents.filter((e) => e.allDay);
  const timedEvents = dayEvents.filter((e) => !e.allDay);

  const getEventPosition = (event) => {
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const duration = endHour - startHour;

    return {
      top: `${startHour * 60}px`,
      height: `${Math.max(duration * 60, 30)}px`,
    };
  };

  const isToday = currentDate.toDateString() === new Date().toDateString();

  const formatHour = (hour) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  };

  const handleTimeClick = (hour) => {
    const clickedTime = new Date(currentDate);
    clickedTime.setHours(hour, 0, 0, 0);
    onTimeClick?.(clickedTime);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-center py-4 border-b border-border">
        <div className="text-center">
          <div className="text-sm text-muted">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long' })}
          </div>
          <div
            className={`text-3xl font-bold ${
              isToday ? 'text-primary' : 'text-text'
            }`}
          >
            {currentDate.getDate()}
          </div>
          <div className="text-sm text-muted">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="border-b border-border p-2">
          <div className="text-xs text-muted mb-1">All day</div>
          <div className="space-y-1">
            {allDayEvents.map((event) => (
              <div
                key={event._id}
                onClick={() => onEventClick?.(event)}
                className="px-2 py-1 rounded text-sm text-white cursor-pointer hover:opacity-80 transition-opacity"
                style={{ backgroundColor: event.color || '#3b82f6' }}
              >
                {event.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-h-[1440px]">
          {/* Time labels */}
          <div className="w-20 flex-shrink-0">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-[60px] pr-3 text-right text-sm text-muted border-b border-border flex items-start pt-1"
              >
                {formatHour(hour)}
              </div>
            ))}
          </div>

          {/* Event column */}
          <div className="flex-1 border-l border-border relative">
            {/* Hour rows */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                onClick={() => handleTimeClick(hour)}
                className="h-[60px] border-b border-border hover:bg-bg/50 cursor-pointer transition-colors"
              />
            ))}

            {/* Events */}
            {timedEvents.map((event) => {
              const position = getEventPosition(event);
              return (
                <div
                  key={event._id || `${event.originalEventId}-${currentDate.toISOString()}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.(event);
                  }}
                  className="absolute left-2 right-2 px-3 py-2 rounded text-white overflow-hidden cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                  style={{
                    ...position,
                    backgroundColor: event.color || '#3b82f6',
                  }}
                >
                  <div className="font-medium">{event.title}</div>
                  <div className="text-sm opacity-80">
                    {new Date(event.startDate).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}{' '}
                    -{' '}
                    {new Date(event.endDate).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                  {event.location && (
                    <div className="text-sm opacity-80 mt-1">{event.location}</div>
                  )}
                </div>
              );
            })}

            {/* Current time indicator */}
            {isToday && <CurrentTimeIndicator />}
          </div>
        </div>
      </div>
    </div>
  );
}

function CurrentTimeIndicator() {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();

  return (
    <div
      className="absolute left-0 right-0 z-10 pointer-events-none"
      style={{ top: `${minutes}px` }}
    >
      <div className="flex items-center">
        <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5" />
        <div className="flex-1 h-0.5 bg-red-500" />
      </div>
    </div>
  );
}

export default DayView;
