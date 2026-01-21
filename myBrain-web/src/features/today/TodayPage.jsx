import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePageTracking } from '../../hooks/useAnalytics';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Inbox,
  ArrowRight,
  Flag,
  MapPin,
  Video,
  Plus
} from 'lucide-react';
import MobilePageHeader from '../../components/layout/MobilePageHeader';
import { useTodayView, useUpdateTaskStatus } from '../tasks/hooks/useTasks';
import { useInboxCount } from '../notes/hooks/useNotes';
import { useDayEvents } from '../calendar/hooks/useEvents';
import { TaskPanelProvider, useTaskPanel } from '../../contexts/TaskPanelContext';
import TaskSlidePanel from '../../components/tasks/TaskSlidePanel';
import EventModal from '../calendar/components/EventModal';
import Skeleton from '../../components/ui/Skeleton';

const PRIORITY_COLORS = {
  low: 'text-gray-400',
  medium: 'text-yellow-500',
  high: 'text-red-500',
};

function TodayTaskRow({ task, isOverdue }) {
  const { openTask } = useTaskPanel();
  const updateStatus = useUpdateTaskStatus();

  const handleStatusClick = (e) => {
    e.stopPropagation();
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateStatus.mutate({ id: task._id, status: newStatus });
  };

  const isCompleted = task.status === 'done';

  return (
    <div
      onClick={() => openTask(task._id)}
      className="group flex items-center gap-3 px-4 py-2.5 hover:bg-bg/50 cursor-pointer transition-colors rounded-lg"
    >
      <button
        onClick={handleStatusClick}
        className={`flex-shrink-0 ${
          isCompleted ? 'text-green-500' : isOverdue ? 'text-red-500 hover:text-red-400' : 'text-muted hover:text-primary'
        }`}
      >
        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5 fill-current" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </button>

      <span className={`flex-1 text-sm ${isCompleted ? 'text-muted line-through' : 'text-text'}`}>
        {task.title}
      </span>

      {task.priority !== 'medium' && (
        <Flag className={`w-3.5 h-3.5 ${PRIORITY_COLORS[task.priority]}`} />
      )}
    </div>
  );
}

function TodayEventRow({ event, onClick }) {
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <button
      onClick={() => onClick(event)}
      className="w-full text-left group flex items-start gap-3 px-4 py-2.5 hover:bg-bg/50 cursor-pointer transition-colors rounded-lg"
    >
      <div
        className="w-1 h-full min-h-[2rem] rounded-full flex-shrink-0 mt-1"
        style={{ backgroundColor: event.color || '#3b82f6' }}
      />
      <div className="flex-1 min-w-0">
        <span className="text-sm text-text group-hover:text-primary transition-colors block truncate">
          {event.title}
        </span>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {event.allDay ? 'All day' : `${formatTime(event.startDate)} - ${formatTime(event.endDate)}`}
          </span>
          {event.location && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3" />
              {event.location}
            </span>
          )}
          {event.meetingUrl && (
            <span className="flex items-center gap-1">
              <Video className="w-3 h-3 text-blue-500" />
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function TodayContent() {
  const { data: todayData, isLoading: todayLoading } = useTodayView();
  const { data: inboxCount, isLoading: inboxLoading } = useInboxCount();

  // Track page view
  usePageTracking();

  const today = new Date();
  // Use local date format (YYYY-MM-DD) to avoid timezone issues with toISOString()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const { data: eventsData, isLoading: eventsLoading } = useDayEvents(todayStr);

  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const dateString = today.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  const overdueCount = todayData?.overdue?.length || 0;
  const dueTodayCount = todayData?.dueToday?.length || 0;
  const inboxTotal = inboxCount || todayData?.inboxCount || 0;
  const events = eventsData?.events || [];
  const eventsCount = events.length;

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
    <div className="h-full flex flex-col overflow-hidden">
      {/* Mobile Header */}
      <MobilePageHeader title="Today" icon={Calendar} />

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-4 sm:p-6">
          {/* Desktop Header */}
          <div className="hidden sm:flex items-center gap-3 mb-8">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text">Today</h1>
              <p className="text-sm text-muted">{dateString}</p>
            </div>
          </div>

          {/* Mobile date subheader */}
          <p className="sm:hidden text-sm text-muted mb-4">{dateString}</p>

        {todayLoading || eventsLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
            <Skeleton className="h-24" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Today's Events Section */}
            <div className="bg-panel border border-border rounded-xl p-4 shadow-theme-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
                    Schedule ({eventsCount})
                  </h2>
                </div>
                <button
                  onClick={handleNewEvent}
                  className="p-1 hover:bg-bg rounded transition-colors text-muted hover:text-primary"
                  title="Add event"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {eventsCount === 0 ? (
                <p className="text-sm text-muted py-4 text-center">
                  No events scheduled for today.
                </p>
              ) : (
                <div className="space-y-1">
                  {events.map((event) => (
                    <TodayEventRow
                      key={event._id || `${event.originalEventId}-${event.startDate}`}
                      event={event}
                      onClick={handleEventClick}
                    />
                  ))}
                </div>
              )}

              <Link
                to="/app/calendar"
                className="mt-2 block w-full py-1.5 text-center text-sm text-primary hover:underline"
              >
                Open Calendar
              </Link>
            </div>

            {/* Overdue Section */}
            {overdueCount > 0 && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wider">
                    Overdue ({overdueCount})
                  </h2>
                </div>

                <div className="space-y-1">
                  {todayData.overdue.map((task) => (
                    <TodayTaskRow key={task._id} task={task} isOverdue />
                  ))}
                </div>
              </div>
            )}

            {/* Due Today Section */}
            <div className="bg-panel border border-border rounded-xl p-4 shadow-theme-card">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
                  Due Today ({dueTodayCount})
                </h2>
              </div>

              {dueTodayCount === 0 ? (
                <p className="text-sm text-muted py-4 text-center">
                  No tasks due today. Nice work!
                </p>
              ) : (
                <div className="space-y-1">
                  {todayData.dueToday.map((task) => (
                    <TodayTaskRow key={task._id} task={task} />
                  ))}
                </div>
              )}
            </div>

            {/* Inbox Preview Section */}
            <div className="bg-panel border border-border rounded-xl p-4 shadow-theme-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-muted" />
                  <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
                    Inbox
                  </h2>
                  {inboxTotal > 0 && (
                    <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
                      {inboxTotal}
                    </span>
                  )}
                </div>
              </div>

              {inboxTotal === 0 ? (
                <p className="text-sm text-muted py-4 text-center">
                  Inbox zero! You're all caught up.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted">
                    You have {inboxTotal} unprocessed note{inboxTotal !== 1 ? 's' : ''} waiting for review.
                  </p>
                  <Link
                    to="/app/inbox"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    View Inbox
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            {(overdueCount === 0 && dueTodayCount === 0 && inboxTotal === 0 && eventsCount === 0) && (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-medium text-text mb-1">All Clear!</h3>
                <p className="text-sm text-muted">
                  Nothing urgent today. Time to work on what matters.
                </p>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          event={selectedEvent}
          initialDate={selectedEvent ? null : new Date()}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

function TodayPage() {
  return (
    <TaskPanelProvider>
      <TodayContent />
      <TaskSlidePanel />
    </TaskPanelProvider>
  );
}

export default TodayPage;
