import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { usePageTracking } from '../../../hooks/useAnalytics';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Loader2,
  Clock,
  MapPin,
  LayoutGrid,
  Rows,
  CalendarDays
} from 'lucide-react';
import { useEvents } from '../hooks/useEvents';
import MonthView from './MonthView';
import WeekView from './WeekView';
import DayView from './DayView';
import EventModal from './EventModal';

const VIEW_OPTIONS = [
  { value: 'month', label: 'Month', icon: LayoutGrid },
  { value: 'week', label: 'Week', icon: Rows },
  { value: 'day', label: 'Day', icon: CalendarDays },
];

// Mini Calendar for Sidebar
function MiniCalendar({ currentDate, onDateSelect }) {
  const [viewMonth, setViewMonth] = useState(new Date(currentDate));

  useEffect(() => {
    setViewMonth(new Date(currentDate));
  }, [currentDate]);

  const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const calendarDays = useMemo(() => {
    const days = [];
    const start = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    start.setDate(start.getDate() - start.getDay());

    for (let i = 0; i < 42; i++) {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  }, [viewMonth]);

  const today = new Date();
  const isToday = (date) => date.toDateString() === today.toDateString();
  const isCurrentMonth = (date) => date.getMonth() === viewMonth.getMonth();
  const isSelected = (date) => date.toDateString() === currentDate.toDateString();

  return (
    <div className="bg-panel border border-border rounded-2xl p-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
          className="p-1.5 hover:bg-bg rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-muted" />
        </button>
        <button
          onClick={() => setViewMonth(new Date())}
          className="text-sm font-semibold text-text hover:text-primary transition-colors"
        >
          {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </button>
        <button
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
          className="p-1.5 hover:bg-bg rounded-lg transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-muted" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map((day, i) => (
          <div key={i} className="text-center text-[11px] font-medium text-muted py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => (
          <button
            key={index}
            onClick={() => onDateSelect(date)}
            className={`
              aspect-square flex items-center justify-center rounded-lg text-xs transition-all
              ${isSelected(date)
                ? 'bg-primary text-white font-semibold'
                : isToday(date)
                  ? 'bg-primary/20 text-primary font-semibold'
                  : isCurrentMonth(date)
                    ? 'text-text hover:bg-bg'
                    : 'text-muted/40'
              }
            `}
          >
            {date.getDate()}
          </button>
        ))}
      </div>
    </div>
  );
}

// Upcoming Events for Sidebar
function UpcomingEvents({ events, onEventClick }) {
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter(e => new Date(e.startDate) >= now)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .slice(0, 5);
  }, [events]);

  const formatEventTime = (event) => {
    const date = new Date(event.startDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const timeStr = event.allDay
      ? 'All day'
      : date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    if (isToday) return `Today, ${timeStr}`;
    if (isTomorrow) return `Tomorrow, ${timeStr}`;
    return `${date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, ${timeStr}`;
  };

  if (upcomingEvents.length === 0) {
    return (
      <div className="bg-panel border border-border rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-text mb-3">Upcoming Events</h3>
        <div className="text-center py-4">
          <p className="text-sm text-muted mb-2">No upcoming events</p>
          <p className="text-xs text-muted">
            Events are time-specific appointments: meetings, deadlines, or activities at a set time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-panel border border-border rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-text mb-3">Upcoming Events</h3>
      <div className="space-y-2">
        {upcomingEvents.map((event) => (
          <button
            key={event._id}
            onClick={() => onEventClick(event)}
            className="w-full flex gap-3 p-3 bg-bg rounded-xl cursor-pointer transition-all hover:translate-x-1 text-left"
          >
            <div
              className="w-1 rounded-full flex-shrink-0"
              style={{ backgroundColor: event.color || '#3b82f6' }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-text truncate">{event.title}</div>
              <div className="text-xs text-muted mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatEventTime(event)}
              </div>
              {event.location && (
                <div className="text-xs text-muted mt-0.5 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3" />
                  {event.location}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CalendarView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const dateParam = searchParams.get('date');

  // Track page view
  usePageTracking();

  const [currentDate, setCurrentDate] = useState(() => {
    if (dateParam) {
      const parsed = new Date(dateParam + 'T12:00:00');
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  });
  const [view, setView] = useState(() => dateParam ? 'day' : 'month');

  useEffect(() => {
    if (dateParam) {
      const parsed = new Date(dateParam + 'T12:00:00');
      if (!isNaN(parsed.getTime())) {
        setCurrentDate(parsed);
        setView('day');
      }
    }
  }, [dateParam]);

  useEffect(() => {
    if (dateParam) {
      setSearchParams({}, { replace: true });
    }
  }, []);

  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  // Calculate date range for fetching events
  const dateRange = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (view === 'month') {
      start.setDate(1);
      start.setDate(start.getDate() - start.getDay());
      end.setMonth(end.getMonth() + 1, 0);
      end.setDate(end.getDate() + (6 - end.getDay()));
    } else if (view === 'week') {
      start.setDate(start.getDate() - start.getDay());
      end.setDate(start.getDate() + 6);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [currentDate, view]);

  const { data, isLoading } = useEvents(dateRange);
  const events = data?.events || [];

  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getTitle = () => {
    if (view === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else if (view === 'week') {
      const weekStart = new Date(currentDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${weekStart.toLocaleDateString('en-US', { month: 'long' })} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`;
      }
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  const handleDateClick = (date) => {
    if (view === 'month') {
      setCurrentDate(date);
      setView('day');
    } else {
      setSelectedDate(date);
      setSelectedEvent(null);
      setShowEventModal(true);
    }
  };

  const handleTimeClick = (dateTime) => {
    setSelectedDate(dateTime);
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setSelectedDate(null);
    setShowEventModal(true);
  };

  const handleNewEvent = () => {
    setSelectedEvent(null);
    const eventDate = new Date(currentDate);
    eventDate.setHours(9, 0, 0, 0);
    setSelectedDate(eventDate);
    setShowEventModal(true);
  };

  const handleCloseModal = () => {
    setShowEventModal(false);
    setSelectedEvent(null);
    setSelectedDate(null);
  };

  const handleMiniCalendarSelect = (date) => {
    setCurrentDate(date);
    if (view === 'month') {
      setView('day');
    }
  };

  return (
    <div className="h-full flex bg-bg">
      {/* Sidebar */}
      <div className="hidden lg:flex flex-col w-80 flex-shrink-0 p-6 space-y-6 overflow-auto border-r border-border">
        {/* New Event Button */}
        <button
          onClick={handleNewEvent}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors"
          style={{ boxShadow: '0 0 20px var(--primary-glow)' }}
        >
          <Plus className="w-5 h-5" />
          New Event
        </button>

        {/* Mini Calendar */}
        <MiniCalendar
          currentDate={currentDate}
          onDateSelect={handleMiniCalendarSelect}
        />

        {/* Upcoming Events */}
        <UpcomingEvents
          events={events}
          onEventClick={handleEventClick}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex-shrink-0 p-6 border-b border-border">
          {/* Title row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <CalendarIcon className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-text">Calendar</h1>
                <p className="text-sm text-muted">Time-bound events and scheduled activities</p>
              </div>
            </div>

            {/* New event button (mobile) */}
            <button
              onClick={handleNewEvent}
              className="lg:hidden flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Event</span>
            </button>
          </div>

          {/* Navigation and controls row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={navigatePrevious}
                  className="p-2 hover:bg-panel rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-muted" />
                </button>
                <button
                  onClick={goToToday}
                  className="px-4 py-2 text-sm font-medium text-text hover:bg-panel rounded-lg transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={navigateNext}
                  className="p-2 hover:bg-panel rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-muted" />
                </button>
              </div>

              {/* Date title */}
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-text">{getTitle()}</h2>
                {isLoading && (
                  <Loader2 className="w-4 h-4 text-muted animate-spin" />
                )}
              </div>
            </div>

            {/* View selector */}
            <div className="flex p-1 bg-panel border border-border rounded-xl">
              {VIEW_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setView(opt.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      view === opt.value
                        ? 'bg-primary text-white'
                        : 'text-muted hover:text-text hover:bg-bg'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <div className="flex-1 overflow-hidden">
          {view === 'month' && (
            <MonthView
              currentDate={currentDate}
              events={events}
              onDateClick={handleDateClick}
              onEventClick={handleEventClick}
            />
          )}
          {view === 'week' && (
            <WeekView
              currentDate={currentDate}
              events={events}
              onTimeClick={handleTimeClick}
              onEventClick={handleEventClick}
            />
          )}
          {view === 'day' && (
            <DayView
              currentDate={currentDate}
              events={events}
              onTimeClick={handleTimeClick}
              onEventClick={handleEventClick}
            />
          )}
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          event={selectedEvent}
          initialDate={selectedDate}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export default CalendarView;
