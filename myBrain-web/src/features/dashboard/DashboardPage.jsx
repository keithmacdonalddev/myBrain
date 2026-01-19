import { useState, useRef, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { usePageTracking } from '../../hooks/useAnalytics';
import {
  Plus,
  Clock,
  Loader2,
  Sparkles,
  Calendar,
  Inbox,
  CheckCircle2,
  AlertTriangle,
  CalendarPlus,
  CheckSquare,
  ChevronRight,
  ChevronLeft,
  FolderKanban,
  Lightbulb,
  StickyNote,
  CalendarDays,
  Folder,
  Tag
} from 'lucide-react';
import {
  useCreateNote,
  useInboxCount
} from '../notes/hooks/useNotes';
import { useTodayView, useUpdateTaskStatus } from '../tasks/hooks/useTasks';
import { useEvents } from '../calendar/hooks/useEvents';
import { TaskPanelProvider, useTaskPanel } from '../../contexts/TaskPanelContext';
import { NotePanelProvider, useNotePanel } from '../../contexts/NotePanelContext';
import { ProjectPanelProvider, useProjectPanel } from '../../contexts/ProjectPanelContext';
import TaskSlidePanel from '../../components/tasks/TaskSlidePanel';
import NoteSlidePanel from '../../components/notes/NoteSlidePanel';
import ProjectSlidePanel from '../../components/projects/ProjectSlidePanel';
import EventModal from '../calendar/components/EventModal';
import WeatherWidget from '../../components/ui/WeatherWidget';

// Ambient Background Effect
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

// Time Display Component with live clock
function TimeDisplay() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
      <div
        className="text-4xl sm:text-5xl font-extralight tracking-tight text-text"
        style={{
          background: 'linear-gradient(135deg, var(--text) 0%, var(--muted) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}
      >
        {timeStr}
      </div>
      <div className="text-sm sm:text-base text-muted">
        {dateStr}
      </div>
    </div>
  );
}

// Quick Add Button with dropdown
function QuickAddButton({ onNewEvent }) {
  const { openNewNote } = useNotePanel();
  const { openNewTask } = useTaskPanel();
  const { openNewProject } = useProjectPanel();
  const [isOpen, setIsOpen] = useState(false);

  const handleNewNote = () => {
    setIsOpen(false);
    openNewNote();
  };

  const handleNewEvent = () => {
    setIsOpen(false);
    onNewEvent();
  };

  const handleNewTask = () => {
    setIsOpen(false);
    openNewTask();
  };

  const handleNewProject = () => {
    setIsOpen(false);
    openNewProject();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-primary text-white rounded-2xl font-medium transition-all hover:bg-primary-hover hover:scale-105"
        style={{ boxShadow: '0 0 25px var(--primary-glow)' }}
      >
        <Plus className={`w-6 h-6 transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-48 bg-panel border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in">
            <button
              onClick={handleNewNote}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-text hover:bg-bg transition-colors"
            >
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Plus className="w-4 h-4 text-primary" />
              </div>
              <span className="font-medium">New Note</span>
            </button>
            <button
              onClick={handleNewEvent}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-text hover:bg-bg transition-colors border-t border-border"
            >
              <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <CalendarPlus className="w-4 h-4 text-blue-500" />
              </div>
              <span className="font-medium">New Event</span>
            </button>
            <button
              onClick={handleNewTask}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-text hover:bg-bg transition-colors border-t border-border"
            >
              <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <CheckSquare className="w-4 h-4 text-orange-500" />
              </div>
              <span className="font-medium">New Task</span>
            </button>
            <button
              onClick={handleNewProject}
              className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-text hover:bg-bg transition-colors border-t border-border"
            >
              <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <FolderKanban className="w-4 h-4 text-purple-500" />
              </div>
              <span className="font-medium">New Project</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Quick Note Widget
function QuickNoteWidget() {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const textareaRef = useRef(null);
  const createNote = useCreateNote();
  const { data: inboxCount } = useInboxCount();

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await createNote.mutateAsync({
        title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
        body: content
      });
      setContent('');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  return (
    <div className="bg-panel border border-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-text">Quick Note</h3>
        </div>
        <div className="flex items-center gap-3">
          {showSuccess && (
            <div className="flex items-center gap-1.5 text-success text-xs font-medium animate-fade-in">
              <Sparkles className="w-3.5 h-3.5" />
              Saved!
            </div>
          )}
          <Link to="/app/inbox" className="flex items-center gap-1.5 text-muted hover:text-primary transition-colors">
            <Inbox className="w-4 h-4" />
            <span className="text-xs font-medium">Inbox</span>
            {inboxCount > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                {inboxCount > 99 ? '99+' : inboxCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Input */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What's on your mind?"
        rows={2}
        className="w-full px-3 py-2 bg-bg border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text text-sm placeholder:text-muted transition-all"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-muted">
          <kbd className="px-1 py-0.5 bg-panel2 border border-border rounded text-[10px]">Ctrl</kbd>+<kbd className="px-1 py-0.5 bg-panel2 border border-border rounded text-[10px]">Enter</kbd>
        </span>
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          className="px-3 py-1.5 bg-primary text-white text-xs rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
        </button>
      </div>
    </div>
  );
}

// Task Item Component
function TaskItem({ task, isOverdue, onToggle, onClick }) {
  const isCompleted = task.status === 'done';

  // Calculate days overdue
  const getDaysOverdue = () => {
    if (!isOverdue || !task.dueDate) return null;
    const now = new Date();
    const due = new Date(task.dueDate);
    const diffDays = Math.floor((now - due) / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysOverdue = getDaysOverdue();

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-3 bg-panel border border-transparent rounded-xl cursor-pointer transition-all hover:border-border hover:translate-x-1"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
          ${isCompleted
            ? 'bg-success border-success'
            : 'border-muted hover:border-primary'
          }`}
      >
        {isCompleted && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${isCompleted ? 'text-muted line-through' : 'text-text'}`}>
          {task.title}
        </div>
        {isOverdue && daysOverdue !== null && (
          <div className="text-xs text-danger mt-0.5">
            {daysOverdue === 0 ? 'Due today' : `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`}
          </div>
        )}
      </div>
      <div className={`w-2 h-2 rounded-full flex-shrink-0
        ${task.priority === 'high' ? 'bg-danger' :
          task.priority === 'medium' ? 'bg-warning' : 'bg-muted'}`}
      />
    </div>
  );
}

// Tasks Widget with two columns
function TasksWidget() {
  const { data: todayData, isLoading } = useTodayView();
  const { openTask } = useTaskPanel();
  const updateStatus = useUpdateTaskStatus();

  const overdueTasks = todayData?.overdue || [];
  const dueTodayTasks = todayData?.dueToday || [];
  const overdueCount = overdueTasks.length;

  const handleToggleStatus = (task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateStatus.mutate({ id: task._id, status: newStatus });
  };

  return (
    <div className="bg-panel border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-orange-500/10 rounded-xl flex items-center justify-center">
            <CheckSquare className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-orange-500" />
          </div>
          <h3 className="text-sm font-semibold text-text">Today's Tasks</h3>
        </div>
        {overdueCount > 0 && (
          <span className="px-2.5 py-1 bg-danger/10 text-danger text-xs font-medium rounded-full">
            {overdueCount} overdue
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5">
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted" />
          </div>
        ) : (overdueTasks.length > 0 || dueTodayTasks.length > 0) ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {/* Overdue Column */}
            <div className="bg-bg rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wide text-danger">
                <AlertTriangle className="w-3.5 h-3.5" />
                Overdue ({overdueTasks.length})
              </div>
              <div className="space-y-2">
                {overdueTasks.slice(0, 3).map((task) => (
                  <TaskItem
                    key={task._id}
                    task={task}
                    isOverdue={true}
                    onToggle={() => handleToggleStatus(task)}
                    onClick={() => openTask(task._id)}
                  />
                ))}
                {overdueTasks.length === 0 && (
                  <p className="text-sm text-muted text-center py-4">No overdue tasks</p>
                )}
              </div>
            </div>

            {/* Due Today Column */}
            <div className="bg-bg rounded-xl p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
                <Clock className="w-3.5 h-3.5" />
                Due Today ({dueTodayTasks.length})
              </div>
              <div className="space-y-2">
                {dueTodayTasks.slice(0, 3).map((task) => (
                  <TaskItem
                    key={task._id}
                    task={task}
                    isOverdue={false}
                    onToggle={() => handleToggleStatus(task)}
                    onClick={() => openTask(task._id)}
                  />
                ))}
                {dueTodayTasks.length === 0 && (
                  <p className="text-sm text-muted text-center py-4">No tasks due today</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs mt-1">No tasks due today. Create tasks with due dates to see them here.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-5 py-3 border-t border-border text-center">
        <Link to="/app/tasks" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
          View all tasks <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

// Feature Guide Widget - Second Brain Concepts
function FeatureGuideWidget() {
  const [expandedFeature, setExpandedFeature] = useState(null);

  const features = [
    {
      id: 'notes',
      icon: StickyNote,
      title: 'Notes',
      color: 'text-blue-500 bg-blue-500/10',
      summary: 'Capture thoughts, ideas, and reference information',
      description: 'Notes are your digital scratch pad for capturing anything worth remembering. Use them for meeting notes, article summaries, brainstorming sessions, recipes, or any information you want to store and retrieve later. Notes support rich text formatting and can be organized with tags and categories.'
    },
    {
      id: 'tasks',
      icon: CheckSquare,
      title: 'Tasks',
      color: 'text-green-500 bg-green-500/10',
      summary: 'Single actionable items to complete',
      description: 'Tasks are specific actions with a clear completion point. Unlike notes (information) or projects (collections), a task is something you can check off. "Call the dentist", "Review budget spreadsheet", or "Buy groceries" are tasks. Add due dates, priorities, and locations to stay organized.'
    },
    {
      id: 'projects',
      icon: FolderKanban,
      title: 'Projects',
      color: 'text-purple-500 bg-purple-500/10',
      summary: 'Multi-step goals with related tasks and notes',
      description: 'Projects group related tasks and notes toward a larger goal. "Plan vacation", "Launch website", or "Learn Spanish" are projects. They help you break down complex objectives into manageable pieces and track overall progress. Link tasks and notes to projects to see everything in context.'
    },
    {
      id: 'events',
      icon: CalendarDays,
      title: 'Events',
      color: 'text-amber-500 bg-amber-500/10',
      summary: 'Time-based appointments and occurrences',
      description: 'Events are calendar entries with specific dates and times. Meetings, appointments, deadlines, and reminders belong here. Unlike tasks (which you complete), events happen at a point in time. Your calendar view shows all events and tasks with due dates together.'
    },
    {
      id: 'categories',
      icon: Folder,
      title: 'Categories',
      color: 'text-cyan-500 bg-cyan-500/10',
      summary: 'Life areas to organize your content',
      description: 'Categories represent the major areas of your life: Work, Personal, Health, Finance, Learning, etc. Every note, task, and project can belong to a category. Use the sidebar to filter and focus on one area at a time, reducing mental clutter and helping you maintain work-life balance.'
    },
    {
      id: 'tags',
      icon: Tag,
      title: 'Tags',
      color: 'text-rose-500 bg-rose-500/10',
      summary: 'Flexible keywords for cross-cutting organization',
      description: 'Tags provide flexible, cross-cutting organization. While categories are broad life areas, tags can be anything: #urgent, #waiting-for, #ideas, #reading-list. An item can have multiple tags, making it easy to find related content across different categories and types.'
    },
  ];

  const toggleFeature = (id) => {
    setExpandedFeature(expandedFeature === id ? null : id);
  };

  return (
    <div className="bg-panel border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-border">
        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary/10 rounded-xl flex items-center justify-center">
          <Lightbulb className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-text">Your Second Brain</h3>
          <p className="text-xs text-muted">Understanding the building blocks</p>
        </div>
      </div>

      {/* Intro */}
      <div className="px-4 sm:px-5 py-3 bg-bg/50 border-b border-border">
        <p className="text-xs text-muted leading-relaxed">
          <span className="font-medium text-text">myBrain</span> is your external memory system.
          Instead of keeping everything in your head, capture it here. Each feature serves a specific purpose,
          working together to help you think clearly and stay organized.
        </p>
      </div>

      {/* Features List */}
      <div className="divide-y divide-border">
        {features.map((feature) => {
          const Icon = feature.icon;
          const isExpanded = expandedFeature === feature.id;

          return (
            <div key={feature.id}>
              <button
                onClick={() => toggleFeature(feature.id)}
                className="w-full flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-bg/50 transition-colors text-left"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${feature.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-text">{feature.title}</h4>
                  <p className="text-xs text-muted truncate">{feature.summary}</p>
                </div>
                <ChevronRight className={`w-4 h-4 text-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>

              {isExpanded && (
                <div className="px-4 sm:px-5 pb-4 pt-1 bg-bg/30">
                  <p className="text-xs text-muted leading-relaxed pl-11">
                    {feature.description}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Tip */}
      <div className="px-4 sm:px-5 py-3 bg-primary/5 border-t border-primary/10">
        <p className="text-xs text-primary">
          <span className="font-medium">Pro tip:</span> Start by capturing everything in Notes or your Inbox.
          Then organize into Tasks, Projects, and Categories as patterns emerge.
        </p>
      </div>
    </div>
  );
}

// Calendar Sidebar - Combined Calendar + Events widgets with shared state
function CalendarSidebar() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const handleDateClick = (date) => {
    const isAlreadySelected = selectedDate.toDateString() === date.toDateString();
    if (isAlreadySelected) {
      // Second click - navigate to calendar page
      navigate(`/app/calendar?date=${date.toISOString().split('T')[0]}`);
    } else {
      // First click - select the date
      setSelectedDate(date);
    }
  };

  const handleMonthChange = (newMonth) => {
    setCurrentMonth(newMonth);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleCloseModal = () => {
    setShowEventModal(false);
    setSelectedEvent(null);
  };

  return (
    <div className="space-y-6">
      <CalendarWidget
        selectedDate={selectedDate}
        currentMonth={currentMonth}
        onDateClick={handleDateClick}
        onMonthChange={handleMonthChange}
      />
      <UpcomingWidget selectedDate={selectedDate} onEventClick={handleEventClick} />

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          event={selectedEvent}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

// Calendar Widget Wrapper
function CalendarWidget({ selectedDate, currentMonth, onDateClick, onMonthChange }) {
  return (
    <div className="bg-panel border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-border">
        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-500/10 rounded-xl flex items-center justify-center">
          <Calendar className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-blue-500" />
        </div>
        <h3 className="text-sm font-semibold text-text">Calendar</h3>
      </div>

      {/* Body */}
      <div className="p-3 sm:p-4">
        <MiniCalendarContent
          selectedDate={selectedDate}
          currentMonth={currentMonth}
          onDateClick={onDateClick}
          onMonthChange={onMonthChange}
        />
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-5 py-3 border-t border-border text-center">
        <Link to="/app/calendar" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
          Open calendar <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

// Mini Calendar Content
function MiniCalendarContent({ selectedDate, currentMonth, onDateClick, onMonthChange }) {
  const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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

  const getEventsForDay = (date) => {
    const dateStr = date.toDateString();
    return events.filter((event) => {
      const eventDate = new Date(event.startDate).toDateString();
      return eventDate === dateStr;
    });
  };

  const today = new Date();
  const isToday = (date) => date.toDateString() === today.toDateString();
  const isSelected = (date) => selectedDate.toDateString() === date.toDateString();
  const isCurrentMonth = (date) => date.getMonth() === currentMonth.getMonth();

  const goToPreviousMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    onMonthChange(new Date());
  };

  return (
    <>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={goToPreviousMonth}
          className="p-1.5 bg-panel2 border border-border rounded-lg text-muted hover:text-text hover:bg-border transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={goToToday}
          className="text-sm font-semibold text-text hover:text-primary transition-colors"
        >
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </button>
        <button
          onClick={goToNextMonth}
          className="p-1.5 bg-panel2 border border-border rounded-lg text-muted hover:text-text hover:bg-border transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map((day, i) => (
          <div key={i} className="text-center text-[11px] font-medium text-muted py-1.5">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          const dayEvents = getEventsForDay(date);
          const hasEvents = dayEvents.length > 0;
          const selected = isSelected(date);
          const todayDate = isToday(date);

          return (
            <button
              key={index}
              onClick={() => onDateClick(date)}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-xs relative transition-all
                ${todayDate && selected
                  ? 'bg-primary text-white font-semibold ring-2 ring-primary ring-offset-2 ring-offset-panel'
                  : todayDate
                    ? 'bg-primary text-white font-semibold'
                    : selected
                      ? 'bg-primary/20 text-primary font-semibold ring-2 ring-primary/50'
                      : isCurrentMonth(date)
                        ? 'text-text hover:bg-panel2'
                        : 'text-muted/40'
                }
              `}
              style={todayDate && !selected ? { boxShadow: '0 0 15px var(--primary-glow)' } : {}}
            >
              <span>{date.getDate()}</span>
              {hasEvents && (
                <div className={`absolute bottom-1 w-1 h-1 rounded-full ${todayDate || selected ? 'bg-white' : 'bg-primary'}`} />
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}

// Upcoming Events Widget Wrapper
function UpcomingWidget({ selectedDate, onEventClick }) {
  const today = new Date();
  const isToday = selectedDate.toDateString() === today.toDateString();

  const formatSelectedDate = () => {
    if (isToday) return 'Today';
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (selectedDate.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-panel border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-500/10 rounded-xl flex items-center justify-center">
            <Clock className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-blue-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">Events</h3>
            <p className="text-xs text-muted">{formatSelectedDate()}</p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5">
        <UpcomingEventsContent selectedDate={selectedDate} onEventClick={onEventClick} />
      </div>
    </div>
  );
}

// Upcoming Events Content
function UpcomingEventsContent({ selectedDate, onEventClick }) {
  // Get events for the selected date (entire day)
  const dateRange = useMemo(() => {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [selectedDate]);

  const { data, isLoading } = useEvents(dateRange);
  const events = data?.events || [];

  const formatEventTime = (event) => {
    if (event.allDay) return 'All day';
    const date = new Date(event.startDate);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getEventColor = (index) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    return colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <div className="py-4 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-4 text-muted">
        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm font-medium">No events</p>
        <p className="text-xs mt-1">No events scheduled for this day.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {events.map((event, index) => (
        <button
          key={event._id || `${event.originalEventId}-${event.startDate}`}
          onClick={() => onEventClick(event)}
          className="w-full flex gap-3 p-3 bg-bg rounded-xl cursor-pointer transition-all hover:translate-x-1 text-left"
        >
          <div
            className="w-1 rounded-full flex-shrink-0"
            style={{ backgroundColor: event.color || getEventColor(index) }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text truncate">{event.title}</div>
            <div className="text-xs text-muted mt-0.5">{formatEventTime(event)}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

// Main Dashboard Content
function DashboardContent() {
  const { user } = useSelector((state) => state.auth);
  const [showNewEventModal, setShowNewEventModal] = useState(false);

  // Track page view
  usePageTracking();

  const handleNewEvent = () => {
    setShowNewEventModal(true);
  };

  const handleCloseNewEventModal = () => {
    setShowNewEventModal(false);
  };

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />

      <div className="relative z-10 max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <header className="flex items-end justify-between gap-4 mb-6 lg:mb-8">
          <TimeDisplay />
          <QuickAddButton onNewEvent={handleNewEvent} />
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Quick Note + Tasks Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <QuickNoteWidget />
              <TasksWidget />
            </div>
            <FeatureGuideWidget />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <WeatherWidget />
            <CalendarSidebar />
          </div>
        </div>
      </div>

      {/* New Event Modal */}
      {showNewEventModal && (
        <EventModal
          event={null}
          onClose={handleCloseNewEventModal}
        />
      )}
    </div>
  );
}

function DashboardPage() {
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

export default DashboardPage;
