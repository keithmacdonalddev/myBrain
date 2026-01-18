import { useMemo } from 'react';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function WeekView({ currentDate, events = [], onTimeClick, onEventClick }) {
  const weekDays = useMemo(() => {
    const days = [];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      days.push(day);
    }

    return days;
  }, [currentDate]);

  const getEventsForDay = (date) => {
    const dateStr = date.toDateString();
    return events.filter((event) => {
      const eventDate = new Date(event.startDate).toDateString();
      return eventDate === dateStr;
    });
  };

  const getEventPosition = (event) => {
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const duration = endHour - startHour;

    return {
      top: `${startHour * 60}px`,
      height: `${Math.max(duration * 60, 20)}px`,
    };
  };

  const isToday = (date) => {
    return date.toDateString() === new Date().toDateString();
  };

  const formatHour = (hour) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  };

  const handleTimeClick = (date, hour) => {
    const clickedTime = new Date(date);
    clickedTime.setHours(hour, 0, 0, 0);
    onTimeClick?.(clickedTime);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header with day names */}
      <div className="flex border-b border-border flex-shrink-0">
        {/* Time column spacer */}
        <div className="w-16 flex-shrink-0" />

        {/* Day headers */}
        {weekDays.map((day, index) => (
          <div
            key={index}
            className={`flex-1 py-2 text-center border-l border-border ${
              isToday(day) ? 'bg-primary/5' : ''
            }`}
          >
            <div className="text-xs text-muted">
              {day.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div
              className={`text-lg font-semibold ${
                isToday(day) ? 'text-primary' : 'text-text'
              }`}
            >
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Scrollable time grid */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-h-[1440px]">
          {/* Time labels */}
          <div className="w-16 flex-shrink-0">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="h-[60px] pr-2 text-right text-xs text-muted border-b border-border"
              >
                {formatHour(hour)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, dayIndex) => {
            const dayEvents = getEventsForDay(day).filter(e => !e.allDay);

            return (
              <div
                key={dayIndex}
                className={`flex-1 border-l border-border relative ${
                  isToday(day) ? 'bg-primary/5' : ''
                }`}
              >
                {/* Hour rows */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    onClick={() => handleTimeClick(day, hour)}
                    className="h-[60px] border-b border-border hover:bg-bg/50 cursor-pointer transition-colors"
                  />
                ))}

                {/* Events */}
                {dayEvents.map((event) => {
                  const position = getEventPosition(event);
                  return (
                    <div
                      key={event._id || `${event.originalEventId}-${day.toISOString()}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                      className="absolute left-1 right-1 px-2 py-1 rounded text-xs text-white overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                      style={{
                        ...position,
                        backgroundColor: event.color || '#3b82f6',
                      }}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      <div className="opacity-80 truncate">
                        {new Date(event.startDate).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Current time indicator */}
                {isToday(day) && (
                  <CurrentTimeIndicator />
                )}
              </div>
            );
          })}
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
        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
        <div className="flex-1 h-0.5 bg-red-500" />
      </div>
    </div>
  );
}

export default WeekView;
