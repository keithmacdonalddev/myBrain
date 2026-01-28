import { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEvents } from '../../calendar/hooks/useEvents';

export default function CalendarStripWidget() {
  const [startOffset, setStartOffset] = useState(0);

  const days = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + startOffset + i);
      result.push(d);
    }
    return result;
  }, [startOffset]);

  const [selectedDay, setSelectedDay] = useState(null);

  // Fetch events for the visible range
  const dateRange = useMemo(() => ({
    startDate: days[0].toISOString().split('T')[0],
    endDate: days[6].toISOString().split('T')[0],
  }), [days]);

  const { data } = useEvents(dateRange);
  const events = data?.events || [];

  // Map events to days
  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach(e => {
      const key = new Date(e.startDate).toISOString().split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [events]);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const selectedStr = selectedDay?.toISOString().split('T')[0];
  const selectedEvents = selectedStr ? (eventsByDay[selectedStr] || []) : [];

  return (
    <div className="dash-widget">
      <div className="dash-widget-header">
        <div className="dash-widget-title">
          <span className="dash-widget-icon dash-icon-calendar">
            <Calendar className="w-4 h-4" />
          </span>
          <span>This Week</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setStartOffset(o => o - 7)} className="p-1 hover:bg-panel rounded">
            <ChevronLeft className="w-3.5 h-3.5 text-muted" />
          </button>
          <button onClick={() => { setStartOffset(0); setSelectedDay(new Date()); }} className="text-xs text-muted hover:text-text px-1">Today</button>
          <button onClick={() => setStartOffset(o => o + 7)} className="p-1 hover:bg-panel rounded">
            <ChevronRight className="w-3.5 h-3.5 text-muted" />
          </button>
        </div>
      </div>
      <div className="dash-widget-body">
        {/* Day strip */}
        <div className="dash-calendar-strip">
          {days.map(day => {
            const dateStr = day.toISOString().split('T')[0];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedStr;
            const hasEvents = !!eventsByDay[dateStr]?.length;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`dash-calendar-day ${isSelected ? 'dash-calendar-day-active' : ''} ${isToday && !isSelected ? 'dash-calendar-day-today' : ''}`}
                style={isToday && !isSelected ? { background: 'rgba(59,130,246,0.1)', color: 'var(--primary)' } : undefined}
              >
                <span className="dash-calendar-day-name">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className="dash-calendar-day-num">{day.getDate()}</span>
                {hasEvents && (
                  <span style={{
                    position: 'absolute', bottom: '2px', width: '4px', height: '4px',
                    borderRadius: '50%', background: isSelected ? '#fff' : 'var(--primary)'
                  }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day events */}
        {selectedDay && (
          <div className="dash-calendar-events" style={{ marginTop: '0.5rem' }}>
            {selectedEvents.length > 0 ? (
              selectedEvents.map(event => (
                <div key={event._id} className="dash-calendar-event">
                  <span className="dash-calendar-event-bar" style={{ background: event.color || '#3b82f6' }} />
                  <div className="dash-calendar-event-info">
                    <span className="dash-calendar-event-title">{event.title}</span>
                    <span className="dash-calendar-event-time">
                      {event.allDay ? 'All day' : new Date(event.startDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="dash-widget-empty-sm">No events</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
