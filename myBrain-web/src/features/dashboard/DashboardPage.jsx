import { useState, useRef, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
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
  ChevronLeft
} from 'lucide-react';
import {
  useCreateNote,
  useInboxCount
} from '../notes/hooks/useNotes';
import { useTodayView, useUpdateTaskStatus } from '../tasks/hooks/useTasks';
import { useEvents } from '../calendar/hooks/useEvents';
import { TaskPanelProvider, useTaskPanel } from '../../contexts/TaskPanelContext';
import TaskSlidePanel from '../../components/tasks/TaskSlidePanel';
import NoteSlidePanel from '../../components/notes/NoteSlidePanel';
import { NotePanelProvider } from '../../contexts/NotePanelContext';

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

// Header Stats Component
function HeaderStats() {
  const { data: todayData, isLoading } = useTodayView();

  const overdueCount = todayData?.overdue?.length || 0;
  const dueTodayCount = todayData?.dueToday?.length || 0;
  const completedCount = todayData?.completed?.length || 0;

  if (isLoading) {
    return (
      <div className="flex gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="px-4 py-2 bg-panel border border-border rounded-xl min-w-[70px] animate-pulse">
            <div className="h-6 bg-muted/20 rounded mb-1" />
            <div className="h-3 bg-muted/10 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 sm:gap-4">
      <div className="px-3 sm:px-4 py-2 bg-panel border border-border rounded-xl text-center min-w-[60px] sm:min-w-[70px]">
        <div className="text-xl sm:text-2xl font-semibold text-danger">{overdueCount}</div>
        <div className="text-[10px] sm:text-xs text-muted uppercase tracking-wide">Overdue</div>
      </div>
      <div className="px-3 sm:px-4 py-2 bg-panel border border-border rounded-xl text-center min-w-[60px] sm:min-w-[70px]">
        <div className="text-xl sm:text-2xl font-semibold text-warning">{dueTodayCount}</div>
        <div className="text-[10px] sm:text-xs text-muted uppercase tracking-wide">Due Today</div>
      </div>
      <div className="px-3 sm:px-4 py-2 bg-panel border border-border rounded-xl text-center min-w-[60px] sm:min-w-[70px]">
        <div className="text-xl sm:text-2xl font-semibold text-success">{completedCount}</div>
        <div className="text-[10px] sm:text-xs text-muted uppercase tracking-wide">Completed</div>
      </div>
    </div>
  );
}

// Quick Actions Bar
function QuickActions() {
  const navigate = useNavigate();
  const createNote = useCreateNote();
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  const handleNewNote = async () => {
    setIsCreatingNote(true);
    try {
      const result = await createNote.mutateAsync({
        title: '',
        body: ''
      });
      navigate(`/app/notes/${result._id}`);
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setIsCreatingNote(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 sm:gap-3">
      <button
        onClick={handleNewNote}
        disabled={isCreatingNote}
        className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-primary text-white rounded-xl font-medium text-sm transition-all hover:bg-primary-hover disabled:opacity-50"
        style={{ boxShadow: '0 0 20px var(--primary-glow)' }}
      >
        {isCreatingNote ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
        New Note
      </button>
      <Link
        to="/app/calendar"
        className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-panel border border-border text-text rounded-xl font-medium text-sm transition-all hover:bg-panel2 hover:border-primary"
      >
        <CalendarPlus className="w-4 h-4" />
        New Event
      </Link>
      <Link
        to="/app/tasks"
        className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-panel border border-border text-text rounded-xl font-medium text-sm transition-all hover:bg-panel2 hover:border-primary"
      >
        <CheckSquare className="w-4 h-4" />
        New Task
      </Link>
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
    <div className="bg-panel border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary/10 rounded-xl flex items-center justify-center">
            <Plus className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-text">Quick Note</h3>
        </div>
        {showSuccess && (
          <div className="flex items-center gap-1.5 text-success text-xs font-medium animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            Added to Inbox!
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's on your mind? Press Ctrl+Enter to save to inbox..."
          rows={3}
          className="w-full px-3 sm:px-4 py-3 bg-bg border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text text-sm placeholder:text-muted transition-all"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-muted">
            <kbd className="px-1.5 py-0.5 bg-panel2 border border-border rounded text-[10px]">Ctrl</kbd>
            {' + '}
            <kbd className="px-1.5 py-0.5 bg-panel2 border border-border rounded text-[10px]">Enter</kbd>
            {' to save'}
          </span>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
          </button>
        </div>
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
            <p className="text-sm">All caught up! No tasks for today.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-5 py-3 border-t border-border text-center">
        <Link to="/app/today" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
          View all tasks <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

// Daily Progress Widget
function DailyProgressWidget() {
  const { data: todayData, isLoading } = useTodayView();

  const totalTasks = (todayData?.overdue?.length || 0) + (todayData?.dueToday?.length || 0) + (todayData?.completed?.length || 0);
  const completedCount = todayData?.completed?.length || 0;
  const percentage = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // SVG circle calculations
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-panel border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-border">
        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-success/10 rounded-xl flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-success" />
        </div>
        <h3 className="text-sm font-semibold text-text">Daily Progress</h3>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5">
        {isLoading ? (
          <div className="py-4 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted" />
          </div>
        ) : (
          <div className="flex items-center gap-5">
            {/* Progress Ring */}
            <div className="relative w-[70px] h-[70px] flex-shrink-0">
              <svg width="70" height="70" viewBox="0 0 70 70" className="-rotate-90">
                <circle
                  cx="35"
                  cy="35"
                  r={radius}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="6"
                />
                <circle
                  cx="35"
                  cy="35"
                  r={radius}
                  fill="none"
                  stroke="var(--success)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-base font-semibold text-text">
                {percentage}%
              </div>
            </div>

            {/* Progress Info */}
            <div>
              <h4 className="text-sm sm:text-base font-semibold text-text mb-1">
                {completedCount} of {totalTasks} tasks completed
              </h4>
              <p className="text-xs sm:text-sm text-muted">
                {percentage >= 80 ? 'Excellent work! Almost there.' :
                 percentage >= 50 ? 'Great progress! Keep it up.' :
                 percentage > 0 ? 'Good start! Keep the momentum.' :
                 'Ready to tackle your tasks?'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Inbox Widget (Sidebar version)
function InboxWidget() {
  const { data: inboxCount, isLoading } = useInboxCount();

  return (
    <div className="bg-panel border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-border">
        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary/10 rounded-xl flex items-center justify-center">
          <Inbox className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-text">Inbox</h3>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5">
        {isLoading ? (
          <div className="py-4 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted" />
          </div>
        ) : (
          <div className="flex items-center gap-4 p-4 bg-bg rounded-xl">
            <div className="text-3xl sm:text-4xl font-bold text-primary">
              {inboxCount || 0}
            </div>
            <div className="text-sm text-muted leading-snug">
              {inboxCount === 0 ? (
                <>All caught up!</>
              ) : (
                <>notes waiting<br />for processing</>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-5 py-3 border-t border-border text-center">
        <Link to="/app/inbox" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
          Process inbox <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

// Calendar Widget Wrapper (uses existing MiniCalendar but with new styling)
function CalendarWidget() {
  return (
    <div className="bg-panel border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-border">
        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-500/10 rounded-xl flex items-center justify-center">
          <Calendar className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-blue-500" />
        </div>
        <h3 className="text-sm font-semibold text-text">Calendar</h3>
      </div>

      {/* Body - Use existing MiniCalendar internals */}
      <div className="p-3 sm:p-4">
        <MiniCalendarContent />
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

// Mini Calendar Content (extracted from MiniCalendar for embedding)
function MiniCalendarContent() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

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

          return (
            <Link
              key={index}
              to={`/app/calendar?date=${date.toISOString().split('T')[0]}`}
              className={`
                aspect-square flex items-center justify-center rounded-lg text-xs relative transition-all
                ${isToday(date)
                  ? 'bg-primary text-white font-semibold'
                  : isCurrentMonth(date)
                    ? 'text-text hover:bg-panel2'
                    : 'text-muted/40'
                }
              `}
              style={isToday(date) ? { boxShadow: '0 0 15px var(--primary-glow)' } : {}}
            >
              <span>{date.getDate()}</span>
              {hasEvents && (
                <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isToday(date) ? 'bg-white' : 'bg-primary'}`} />
              )}
            </Link>
          );
        })}
      </div>
    </>
  );
}

// Upcoming Events Widget Wrapper
function UpcomingWidget() {
  return (
    <div className="bg-panel border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-border">
        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-500/10 rounded-xl flex items-center justify-center">
          <Clock className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-blue-500" />
        </div>
        <h3 className="text-sm font-semibold text-text">Upcoming</h3>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5">
        <UpcomingEventsContent />
      </div>
    </div>
  );
}

// Upcoming Events Content
function UpcomingEventsContent() {
  const dateRange = useMemo(() => ({
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  }), []);

  const { data, isLoading } = useEvents(dateRange);
  const events = data?.events?.slice(0, 3) || [];

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
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`;
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
        <p className="text-sm">No upcoming events</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {events.map((event, index) => (
        <Link
          key={event._id}
          to={`/app/calendar?date=${new Date(event.startDate).toISOString().split('T')[0]}`}
          className="flex gap-3 p-3 bg-bg rounded-xl cursor-pointer transition-all hover:translate-x-1"
        >
          <div
            className="w-1 rounded-full flex-shrink-0"
            style={{ backgroundColor: event.color || getEventColor(index) }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text truncate">{event.title}</div>
            <div className="text-xs text-muted mt-0.5">{formatEventTime(event)}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

// Main Dashboard Content
function DashboardContent() {
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="relative min-h-screen">
      <AmbientBackground />

      <div className="relative z-10 max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 lg:gap-6 mb-6 lg:mb-8">
          <TimeDisplay />
          <HeaderStats />
        </header>

        {/* Quick Actions */}
        <div className="mb-6">
          <QuickActions />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Quick Note + Inbox Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <QuickNoteWidget />
              <InboxWidget />
            </div>
            <TasksWidget />
            <DailyProgressWidget />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <CalendarWidget />
            <UpcomingWidget />
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  return (
    <NotePanelProvider>
      <TaskPanelProvider>
        <DashboardContent />
        <NoteSlidePanel />
        <TaskSlidePanel />
      </TaskPanelProvider>
    </NotePanelProvider>
  );
}

export default DashboardPage;
