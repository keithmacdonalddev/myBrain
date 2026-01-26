/**
 * =============================================================================
 * DASHBOARDPAGE.JSX - Intelligent Dashboard
 * =============================================================================
 *
 * The main dashboard page with intelligent content prioritization.
 * Uses a priority scoring system with 5 weighted factors:
 * 1. Urgency - Time-sensitive items
 * 2. Attention - Items needing response
 * 3. Recency - Recently created/modified
 * 4. Feature Usage - User's preferred features
 * 5. Context - Time of day, day of week
 *
 * FEATURES:
 * - Dynamic Focus Card showing highest-priority item
 * - Widget grid with intelligent ordering
 * - Pinnable widgets for user customization
 * - Responsive design for mobile/tablet/desktop
 *
 * =============================================================================
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { usePageTracking } from '../../hooks/useAnalytics';
import {
  Plus,
  Calendar,
  Inbox,
  CalendarPlus,
  CheckSquare,
  FolderKanban,
  Loader2,
  HelpCircle,
  X,
  RefreshCw
} from 'lucide-react';

// Dashboard-specific components
import DashboardGrid from './components/DashboardGrid';
import FocusCard from './components/FocusCard';
import { useDashboardData, useDashboardPreferences, useDashboardSession } from './hooks/useDashboardData';
import { getVisibleWidgets, detectContextMode } from './utils/priorityScoring';

// Widget components
import TimeWidget from './widgets/TimeWidget';
import TasksWidget from './widgets/TasksWidget';
import EventsWidget from './widgets/EventsWidget';
import ProjectsWidget from './widgets/ProjectsWidget';
import StatsWidget from './widgets/StatsWidget';
import InboxWidget from './widgets/InboxWidget';
import CalendarWidget from './widgets/CalendarWidget';
import FeatureGuideWidget from './widgets/FeatureGuideWidget';

// Shared components and hooks
import { TaskPanelProvider, useTaskPanel } from '../../contexts/TaskPanelContext';
import { NotePanelProvider, useNotePanel } from '../../contexts/NotePanelContext';
import { ProjectPanelProvider, useProjectPanel } from '../../contexts/ProjectPanelContext';
import Tooltip from '../../components/ui/Tooltip';
import TaskSlidePanel from '../../components/tasks/TaskSlidePanel';
import NoteSlidePanel from '../../components/notes/NoteSlidePanel';
import ProjectSlidePanel from '../../components/projects/ProjectSlidePanel';
import EventModal from '../calendar/components/EventModal';
import WeatherWidget from '../../components/ui/WeatherWidget';
import { useInboxCount } from '../notes/hooks/useNotes';
import { useUpdateTaskStatus } from '../tasks/hooks/useTasks';
import { useDayEvents } from '../calendar/hooks/useEvents';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';

// Styles
import '../../styles/dashboard.css';

// =============================================================================
// WIDGET DEFINITIONS
// =============================================================================

// All available widgets with their configurations
const ALL_WIDGETS = [
  { id: 'tasks', component: TasksWidget, size: 'default' },
  { id: 'events', component: EventsWidget, size: 'default' },
  { id: 'projects', component: ProjectsWidget, size: 'default' },
  { id: 'stats', component: StatsWidget, size: 'wide' },
  { id: 'inbox', component: InboxWidget, size: 'default' },
  { id: 'featureGuide', component: FeatureGuideWidget, size: 'default' }
];

// =============================================================================
// AMBIENT BACKGROUND EFFECT
// =============================================================================

function AmbientBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        background: `
          radial-gradient(ellipse at 20% 20%, rgba(59, 130, 246, 0.06) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 80%, rgba(16, 185, 129, 0.04) 0%, transparent 50%)
        `
      }}
    />
  );
}

// =============================================================================
// TIME DISPLAY COMPONENT
// =============================================================================

function TimeDisplay() {
  const { user } = useSelector((state) => state.auth);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = time.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get user's first name from profile (firstName, displayName, or fallback)
  const firstName = user?.profile?.firstName
    || user?.profile?.displayName?.split(' ')[0]
    || 'there';

  const timeStr = time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  const mobileDateStr = time.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-page-title">
        {getGreeting()}, <span className="text-primary">{firstName}</span>
      </h1>
      <div className="flex items-center gap-3 text-small">
        <span className="sm:hidden">{mobileDateStr}</span>
        <span className="hidden sm:inline">{dateStr}</span>
        <span className="text-muted">•</span>
        <span className="tabular-nums">{timeStr}</span>
      </div>
    </div>
  );
}

// =============================================================================
// QUICK ADD BUTTON
// =============================================================================

function QuickAddButton({ onNewEvent }) {
  const { openNewNote } = useNotePanel();
  const { openNewTask } = useTaskPanel();
  const { openNewProject } = useProjectPanel();
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action) => {
    setIsOpen(false);
    action();
  };

  return (
    <div className="relative">
      <Tooltip content="Create new items" position="left">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Create new items"
          className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-primary text-white rounded-2xl font-medium transition-all hover:bg-primary-hover hover:scale-105"
          style={{ boxShadow: '0 0 25px var(--primary-glow)' }}
        >
          <Plus className={`w-6 h-6 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`} />
        </button>
      </Tooltip>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-52 bg-panel glass border border-border rounded-xl shadow-theme-card shadow-theme-floating z-50 overflow-hidden animate-fade-in">
            <button
              onClick={() => handleAction(openNewNote)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-sm text-text hover:bg-bg transition-colors min-h-[52px]"
            >
              <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium">New Note</span>
            </button>
            <button
              onClick={() => handleAction(onNewEvent)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-sm text-text hover:bg-bg transition-colors border-t border-border min-h-[52px]"
            >
              <div className="w-9 h-9 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <CalendarPlus className="w-5 h-5 text-blue-500" />
              </div>
              <span className="font-medium">New Event</span>
            </button>
            <button
              onClick={() => handleAction(openNewTask)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-sm text-text hover:bg-bg transition-colors border-t border-border min-h-[52px]"
            >
              <div className="w-9 h-9 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-orange-500" />
              </div>
              <span className="font-medium">New Task</span>
            </button>
            <button
              onClick={() => handleAction(openNewProject)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-sm text-text hover:bg-bg transition-colors border-t border-border min-h-[52px]"
            >
              <div className="w-9 h-9 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-purple-500" />
              </div>
              <span className="font-medium">New Project</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// QUICK CAPTURE COMPONENT
// =============================================================================

function QuickCapture({ onNewEvent }) {
  const { openNewNote } = useNotePanel();
  const { openNewTask } = useTaskPanel();
  const [thought, setThought] = useState('');

  const handleCapture = (type) => {
    const text = thought.trim();
    if (!text) return;

    // Clear input immediately for snappy feel
    setThought('');

    switch (type) {
      case 'task':
        openNewTask({ title: text });
        break;
      case 'note':
        openNewNote({ title: text });
        break;
      case 'event':
        onNewEvent({ title: text });
        break;
    }
  };

  const handleKeyDown = (e) => {
    // Enter creates a task by default (most common)
    if (e.key === 'Enter' && thought.trim()) {
      handleCapture('task');
    }
  };

  return (
    <div className="quick-capture">
      <div className="capture-input-wrapper">
        <input
          type="text"
          className="capture-input"
          placeholder="Capture a thought..."
          value={thought}
          onChange={(e) => setThought(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="capture-actions">
          <button
            className="capture-btn"
            onClick={() => handleCapture('task')}
            disabled={!thought.trim()}
          >
            Task
          </button>
          <button
            className="capture-btn"
            onClick={() => handleCapture('note')}
            disabled={!thought.trim()}
          >
            Note
          </button>
          <button
            className="capture-btn"
            onClick={() => handleCapture('event')}
            disabled={!thought.trim()}
          >
            Event
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN DASHBOARD CONTENT
// =============================================================================

/**
 * Check if two dates are the same day
 */
function isSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function DashboardContent() {
  const navigate = useNavigate();
  const { openTask } = useTaskPanel();
  const { openNote } = useNotePanel();
  const { openProject } = useProjectPanel();

  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null); // null means "today"

  // Dashboard data hook
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch
  } = useDashboardData();

  // Dashboard preferences
  const { pinWidget, unpinWidget, hideWidget, showWidget, resetPreferences } = useDashboardPreferences();

  // Track dashboard session
  useDashboardSession();

  // Track page view
  usePageTracking();

  // Task status mutation
  const updateStatus = useUpdateTaskStatus();

  // Inbox count for mobile header
  const { data: inboxCount } = useInboxCount();

  // Check if selected date is different from today
  const today = new Date();
  const isSelectedDateToday = !selectedDate || isSameDay(selectedDate, today);

  // Fetch events for selected date (only when not today)
  const { data: selectedDateEventsData, isLoading: isLoadingSelectedEvents } = useDayEvents(
    !isSelectedDateToday ? selectedDate?.toISOString().split('T')[0] : null
  );
  // Extract the events array from the response (API returns { events: [...] } or just [...])
  const selectedDateEvents = Array.isArray(selectedDateEventsData)
    ? selectedDateEventsData
    : (selectedDateEventsData?.events || []);

  // Context mode for priority scoring
  const contextMode = detectContextMode();

  // Get visible widgets based on priority scoring
  const visibleWidgets = useMemo(() => {
    if (!dashboardData) return ALL_WIDGETS;

    return getVisibleWidgets(
      ALL_WIDGETS,
      dashboardData,
      dashboardData.usageProfile,
      dashboardData.preferences
    );
  }, [dashboardData]);

  // Widget props with data
  const getWidgetProps = useCallback((widgetId) => {
    if (!dashboardData) return { isLoading: true };

    const props = { isLoading };

    switch (widgetId) {
      case 'tasks':
        return {
          ...props,
          overdueTasks: dashboardData.urgentItems?.overdueTasks || [],
          dueTodayTasks: dashboardData.urgentItems?.dueTodayTasks || [],
          onTaskClick: (task) => openTask(task._id),
          onToggleStatus: (taskId, status) => updateStatus.mutate({ id: taskId, status })
        };
      case 'events': {
        // Determine which events to show based on selected date
        const eventsToShow = isSelectedDateToday
          ? (dashboardData.events?.today || [])
          : (selectedDateEvents || []);

        // Dynamic title based on selected date
        const getEventsTitle = () => {
          if (!selectedDate || isSelectedDateToday) return "Today's Events";
          const dateStr = selectedDate.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          });
          return `Events for ${dateStr}`;
        };

        return {
          ...props,
          isLoading: isSelectedDateToday ? isLoading : isLoadingSelectedEvents,
          events: eventsToShow,
          onEventClick: (event) => setSelectedEvent(event),
          title: getEventsTitle()
        };
      }
      case 'projects':
        return {
          ...props,
          projects: dashboardData.projects || [],
          onProjectClick: (project) => openProject(project._id)
        };
      case 'stats':
        return {
          ...props,
          stats: dashboardData.stats
        };
      case 'inbox':
        return {
          ...props,
          notes: dashboardData.inbox || [],
          onNoteClick: (note) => openNote(note._id)
        };
      case 'calendar':
        return {
          ...props,
          selectedDate,
          onDateSelect: setSelectedDate
        };
      default:
        return props;
    }
  }, [dashboardData, isLoading, openTask, openNote, openProject, updateStatus, selectedDate, isSelectedDateToday, selectedDateEvents, isLoadingSelectedEvents]);

  // Build widget array with props
  const widgetsWithProps = useMemo(() => {
    return visibleWidgets.map(widget => ({
      ...widget,
      props: getWidgetProps(widget.id)
    }));
  }, [visibleWidgets, getWidgetProps]);

  // Event handlers
  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  const handleTaskClick = (task) => {
    openTask(task._id);
  };

  const handlePin = (widgetId, position = 'always-show', size = 'default') => {
    pinWidget(widgetId, position, size);
  };

  const handleUnpin = (widgetId) => {
    unpinWidget(widgetId);
  };

  // Loading state
  if (isLoading && !dashboardData) {
    return (
      <div className="relative">
        <AmbientBackground />
        <div className="relative z-10 max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="relative">
        <AmbientBackground />
        <div className="relative z-10 max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
          <div className="text-center py-12">
            <p className="text-muted mb-4">Failed to load dashboard data</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <AmbientBackground />

      <div className="relative z-10 max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <header className="flex items-end justify-between gap-4 mb-6 lg:mb-8">
          <TimeDisplay />
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Inbox icon - mobile only */}
            <Link
              to="/app/inbox"
              className="sm:hidden relative flex items-center justify-center w-12 h-12 bg-panel border border-border text-muted rounded-2xl transition-all hover:bg-bg hover:text-text"
            >
              <Inbox className="w-5 h-5" />
              {inboxCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-primary text-white text-xs font-semibold rounded-full flex items-center justify-center">
                  {inboxCount > 99 ? '99+' : inboxCount}
                </span>
              )}
            </Link>
            {/* Calendar icon - mobile only */}
            <button
              onClick={() => setShowCalendarModal(true)}
              className="sm:hidden flex items-center justify-center w-12 h-12 bg-panel border border-border text-muted rounded-2xl transition-all hover:bg-bg hover:text-text"
            >
              <Calendar className="w-5 h-5" />
            </button>
            <QuickAddButton onNewEvent={() => setShowNewEventModal(true)} />
          </div>
        </header>

        {/* Quick Capture */}
        <QuickCapture onNewEvent={(data) => {
          setShowNewEventModal(true);
          // Note: EventModal would need to accept initial data to pre-fill
        }} />

        {/* Focus Card - Shows highest priority item */}
        <FocusCard
          data={dashboardData}
          onTaskClick={handleTaskClick}
          onEventClick={handleEventClick}
        />

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
          {/* Main Content - Widget Grid */}
          <div>
            <DashboardGrid
              widgets={widgetsWithProps}
              pinnedWidgets={dashboardData?.preferences?.pinnedWidgets || []}
              onPin={handlePin}
              onUnpin={handleUnpin}
            />
          </div>

          {/* Sidebar - Weather and Calendar (hidden on mobile) */}
          <div className="hidden xl:block space-y-6">
            <WeatherWidget />
            {/* Mini calendar could go here */}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showNewEventModal && (
        <EventModal
          event={null}
          onClose={() => setShowNewEventModal(false)}
        />
      )}

      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {showCalendarModal && (
        <div className="fixed inset-0 z-50 bg-bg sm:hidden flex flex-col">
          <div className="flex items-center justify-end px-4 py-2 bg-bg">
            <button
              onClick={() => setShowCalendarModal(false)}
              className="p-2 bg-panel border border-border hover:bg-card rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5 text-muted" />
            </button>
          </div>
          <div className="flex-1 overflow-auto px-4 pb-4">
            <p className="text-center text-muted py-8">Calendar view coming soon</p>
          </div>
        </div>
      )}

    </div>
  );
}

// =============================================================================
// DASHBOARD PAGE WRAPPER
// =============================================================================

export default function DashboardPage() {
  return (
    <NotePanelProvider>
      <TaskPanelProvider>
        <ProjectPanelProvider>
          <DashboardContent />
          <NoteSlidePanel />
          <TaskSlidePanel />
          <ProjectSlidePanel />
        </ProjectPanelProvider>
      </TaskPanelProvider>
    </NotePanelProvider>
  );
}
