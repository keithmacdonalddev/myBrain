import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Loader2,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useUpcomingEvents, useCreateEvent } from '../../calendar/hooks/useEvents';
import EventModal from '../../calendar/components/EventModal';

function formatEventTime(event) {
  if (event.allDay) return 'All day';

  const start = new Date(event.startDate);
  return start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatEventDate(date) {
  const today = new Date();
  const eventDate = new Date(date);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (eventDate.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (eventDate.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  }

  return eventDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function EventRow({ event, onClick }) {
  return (
    <button
      onClick={() => onClick(event)}
      className="w-full text-left p-2 -mx-2 rounded-lg hover:bg-bg transition-colors group"
    >
      <div className="flex items-start gap-2">
        <div
          className="w-1 h-full min-h-[2.5rem] rounded-full flex-shrink-0"
          style={{ backgroundColor: event.color || '#3b82f6' }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text truncate group-hover:text-primary transition-colors">
            {event.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatEventTime(event)}
            </span>
            {event.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3" />
                {event.location}
              </span>
            )}
            {event.meetingUrl && (
              <span className="flex items-center gap-1">
                <Video className="w-3 h-3" />
                Video
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function UpcomingEvents() {
  const { data, isLoading } = useUpcomingEvents(7);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const events = data?.events || [];

  // Group events by date
  const groupedEvents = events.reduce((groups, event) => {
    const dateKey = new Date(event.startDate).toDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: new Date(event.startDate),
        events: [],
      };
    }
    groups[dateKey].events.push(event);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedEvents).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleNewEvent = () => {
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleCloseModal = () => {
    setShowEventModal(false);
    setSelectedEvent(null);
  };

  return (
    <>
      <div className="bg-panel border border-border rounded-lg p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-indigo-500" />
            </div>
            <h3 className="font-medium text-text text-sm">Upcoming Events</h3>
          </div>
          <button
            onClick={handleNewEvent}
            className="p-1.5 hover:bg-bg rounded-lg transition-colors text-muted hover:text-primary"
            title="New event"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Events list */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted" />
            </div>
          ) : events.length > 0 ? (
            <>
              {sortedDates.slice(0, 3).map((dateKey) => {
                const group = groupedEvents[dateKey];
                return (
                  <div key={dateKey}>
                    <p className="text-xs font-medium text-muted mb-1">
                      {formatEventDate(group.date)}
                    </p>
                    <div className="space-y-1">
                      {group.events.slice(0, 3).map((event) => (
                        <EventRow
                          key={event._id || `${event.originalEventId}-${event.startDate}`}
                          event={event}
                          onClick={handleEventClick}
                        />
                      ))}
                      {group.events.length > 3 && (
                        <p className="text-xs text-muted pl-3">
                          +{group.events.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              {sortedDates.length > 3 && (
                <p className="text-xs text-muted text-center">
                  +{sortedDates.length - 3} more days with events
                </p>
              )}
            </>
          ) : (
            <div className="py-6 text-center">
              <Calendar className="w-8 h-8 text-muted/30 mx-auto mb-2" />
              <p className="text-sm text-muted">No upcoming events</p>
              <button
                onClick={handleNewEvent}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Create an event
              </button>
            </div>
          )}
        </div>

        {/* Footer link */}
        {events.length > 0 && (
          <Link
            to="/app/calendar"
            className="mt-3 flex items-center justify-center gap-1 py-1.5 text-sm text-primary hover:underline"
          >
            View calendar
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          event={selectedEvent}
          initialDate={selectedEvent ? null : new Date()}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}

export default UpcomingEvents;
