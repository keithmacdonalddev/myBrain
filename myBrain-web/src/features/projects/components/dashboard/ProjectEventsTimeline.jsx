import { useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  Unlink,
  Loader2,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useUnlinkEvent } from '../../hooks/useProjects';
import { LinkItemModal } from '../LinkItemModal';
import useToast from '../../../../hooks/useToast';

export function ProjectEventsTimeline({ projectId, events = [], onEventClick, onNewEvent }) {
  const toast = useToast();
  const unlinkEvent = useUnlinkEvent();

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState(null);
  const [showPast, setShowPast] = useState(false);

  const handleUnlink = async (eventId, e) => {
    e.stopPropagation();
    setUnlinkingId(eventId);
    try {
      await unlinkEvent.mutateAsync({ projectId, eventId });
      toast.success('Event unlinked');
    } catch (err) {
      toast.error('Failed to unlink event');
    } finally {
      setUnlinkingId(null);
    }
  };

  const formatEventDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

    if (dateOnly.getTime() === todayOnly.getTime()) return 'Today';
    if (dateOnly.getTime() === tomorrowOnly.getTime()) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatEventTime = (event) => {
    if (event.allDay) return 'All day';
    const date = new Date(event.startDate);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const isPastEvent = (dateStr) => {
    const eventDate = new Date(dateStr);
    const now = new Date();
    return eventDate < now;
  };

  const { upcomingEvents, pastEvents } = useMemo(() => {
    const sorted = [...events].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    return {
      upcomingEvents: sorted.filter(e => !isPastEvent(e.startDate)),
      pastEvents: sorted.filter(e => isPastEvent(e.startDate)),
    };
  }, [events]);

  const getEventColor = (index) => {
    const colors = [
      'var(--v2-color-primary)',
      'var(--v2-color-success)',
      'var(--v2-color-warning)',
      'var(--v2-color-accent)',
      'var(--v2-color-secondary)'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="flex flex-col h-[280px] bg-panel border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-text">Events</span>
          <span className="text-xs text-muted">({events.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowLinkModal(true)}
            className="p-1.5 text-muted hover:text-text rounded-lg hover:bg-bg transition-colors"
            title="Link existing event"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onNewEvent}
            className="p-1.5 text-muted hover:text-amber-500 rounded-lg hover:bg-amber-500/10 transition-colors"
            title="Create new event"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 px-3">
            <Calendar className="w-6 h-6 text-muted/30 mb-2" />
            <p className="text-xs text-muted text-center">No events linked</p>
            <button
              onClick={onNewEvent}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Create an event
            </button>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {/* Upcoming Events */}
            {upcomingEvents.map((event, index) => (
              <EventItem
                key={event._id}
                event={event}
                color={event.color || getEventColor(index)}
                isPast={false}
                formatDate={formatEventDate}
                formatTime={formatEventTime}
                onClick={() => onEventClick(event)}
                onUnlink={(e) => handleUnlink(event._id, e)}
                isUnlinking={unlinkingId === event._id}
              />
            ))}

            {/* Past Events Toggle */}
            {pastEvents.length > 0 && (
              <>
                <button
                  onClick={() => setShowPast(!showPast)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] text-muted hover:text-text rounded transition-colors"
                >
                  <span>{pastEvents.length} past event{pastEvents.length !== 1 ? 's' : ''}</span>
                  {showPast ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showPast && pastEvents.map((event, index) => (
                  <EventItem
                    key={event._id}
                    event={event}
                    color={event.color || getEventColor(upcomingEvents.length + index)}
                    isPast={true}
                    formatDate={formatEventDate}
                    formatTime={formatEventTime}
                    onClick={() => onEventClick(event)}
                    onUnlink={(e) => handleUnlink(event._id, e)}
                    isUnlinking={unlinkingId === event._id}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Link Modal */}
      {showLinkModal && (
        <LinkItemModal
          projectId={projectId}
          linkedIds={events.map(e => e._id)}
          type="events"
          onClose={() => setShowLinkModal(false)}
        />
      )}
    </div>
  );
}

function EventItem({ event, color, isPast, formatDate, formatTime, onClick, onUnlink, isUnlinking }) {
  return (
    <div
      onClick={onClick}
      className={`group flex items-start gap-2 p-2 rounded-lg hover:bg-bg cursor-pointer transition-colors ${isPast ? 'opacity-50' : ''}`}
    >
      {/* Color Dot */}
      <div
        className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
        style={{ backgroundColor: color }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${isPast ? 'text-muted' : 'text-text'}`}>
          {event.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted flex items-center gap-0.5">
            <Calendar className="w-2.5 h-2.5" />
            {formatDate(event.startDate)}
          </span>
          <span className="text-[10px] text-muted flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            {formatTime(event)}
          </span>
        </div>
      </div>

      {/* Unlink Button */}
      <button
        onClick={onUnlink}
        disabled={isUnlinking}
        className="p-1 text-muted hover:text-danger rounded opacity-0 group-hover:opacity-100 transition-all"
        title="Unlink"
      >
        {isUnlinking ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Unlink className="w-3 h-3" />
        )}
      </button>
    </div>
  );
}

export default ProjectEventsTimeline;
