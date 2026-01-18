import { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  StickyNote,
  Plus,
  Clock,
  Pin,
  ArrowRight,
  FileText,
  Loader2,
  Sparkles,
  Zap,
  Target,
  BookOpen,
  Lock,
  Calendar,
  Inbox,
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
  Circle,
  CalendarDays
} from 'lucide-react';
import {
  useRecentNotes,
  usePinnedNotes,
  useLastOpenedNote,
  useCreateNote,
  useInboxCount
} from '../notes/hooks/useNotes';
import { useTodayView, useUpdateTaskStatus } from '../tasks/hooks/useTasks';
import { useNotePanel } from '../../contexts/NotePanelContext';
import { TaskPanelProvider, useTaskPanel } from '../../contexts/TaskPanelContext';
import TaskSlidePanel from '../../components/tasks/TaskSlidePanel';
import NoteSlidePanel from '../../components/notes/NoteSlidePanel';
import { NotePanelProvider } from '../../contexts/NotePanelContext';
import Tooltip from '../../components/ui/Tooltip';
import MiniCalendar from './components/MiniCalendar';
import UpcomingEvents from './components/UpcomingEvents';

// Quick Note Widget - goes to inbox for later processing
function QuickCapture({ autoFocus = true }) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const textareaRef = useRef(null);
  const createNote = useCreateNote();

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await createNote.mutateAsync({
        title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
        body: content
        // Note: processed defaults to false, so it goes to inbox
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
    <div className="bg-panel border border-border rounded-lg p-4 relative">
      {showSuccess && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 text-green-500 text-xs font-medium animate-fade-in">
          <Sparkles className="w-3.5 h-3.5" />
          Added to Inbox!
        </div>
      )}

      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
          <Plus className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-medium text-text text-sm">Quick Note</h3>
          <p className="text-[10px] text-muted">Goes to inbox for later processing</p>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What's on your mind?"
        aria-label="Quick capture note content"
        rows={2}
        className="w-full px-3 py-2 bg-bg border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text text-sm placeholder:text-muted transition-shadow"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted">
          <kbd className="px-1 py-0.5 bg-bg border border-border rounded text-[10px]">Ctrl</kbd>
          {'+'}
          <kbd className="px-1 py-0.5 bg-bg border border-border rounded text-[10px]">Enter</kbd>
        </span>
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Capture'
          )}
        </button>
      </div>
    </div>
  );
}

// Today's Tasks Widget
function TodayTasksWidget() {
  const { data: todayData, isLoading } = useTodayView();
  const { openTask } = useTaskPanel();
  const updateStatus = useUpdateTaskStatus();

  const overdueCount = todayData?.overdue?.length || 0;
  const dueTodayCount = todayData?.dueToday?.length || 0;
  const totalTasks = overdueCount + dueTodayCount;

  const handleToggleStatus = (e, task) => {
    e.stopPropagation();
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateStatus.mutate({ id: task._id, status: newStatus });
  };

  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-orange-500" />
          </div>
          <h3 className="font-medium text-text text-sm">Today</h3>
        </div>
        {overdueCount > 0 && (
          <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 text-xs font-medium rounded">
            {overdueCount} overdue
          </span>
        )}
      </div>

      <div className="space-y-1">
        {isLoading ? (
          <div className="py-4 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted" />
          </div>
        ) : totalTasks > 0 ? (
          <>
            {/* Show up to 4 tasks */}
            {[...(todayData?.overdue || []), ...(todayData?.dueToday || [])].slice(0, 4).map((task) => {
              const isOverdue = todayData?.overdue?.some(t => t._id === task._id);
              const isCompleted = task.status === 'done';
              return (
                <button
                  key={task._id}
                  onClick={() => openTask(task._id)}
                  className="w-full text-left p-2 -mx-2 rounded-lg hover:bg-bg transition-colors flex items-center gap-2"
                >
                  <button
                    onClick={(e) => handleToggleStatus(e, task)}
                    className={`flex-shrink-0 ${isCompleted ? 'text-green-500' : isOverdue ? 'text-red-500' : 'text-muted hover:text-primary'}`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>
                  <span className={`text-sm truncate ${isCompleted ? 'text-muted line-through' : isOverdue ? 'text-red-500' : 'text-text'}`}>
                    {task.title}
                  </span>
                </button>
              );
            })}
            {totalTasks > 4 && (
              <p className="text-xs text-muted text-center py-1">
                +{totalTasks - 4} more
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted py-4 text-center">
            No tasks due today
          </p>
        )}
      </div>

      <Link
        to="/app/today"
        className="mt-2 block w-full py-1.5 text-center text-sm text-primary hover:underline"
      >
        View Today
      </Link>
    </div>
  );
}

// Inbox Widget
function InboxWidget() {
  const { data: inboxCount, isLoading } = useInboxCount();

  return (
    <Link
      to="/app/inbox"
      className="bg-panel border border-border rounded-lg p-4 hover:border-primary/50 transition-colors block group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
          <Inbox className="w-5 h-5 text-blue-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-text text-sm group-hover:text-primary transition-colors">Inbox</h3>
          {isLoading ? (
            <p className="text-xs text-muted">Loading...</p>
          ) : inboxCount > 0 ? (
            <p className="text-xs text-muted">
              {inboxCount} item{inboxCount !== 1 ? 's' : ''} to process
            </p>
          ) : (
            <p className="text-xs text-green-500">All caught up!</p>
          )}
        </div>
        {!isLoading && inboxCount > 0 && (
          <span className="px-2 py-1 bg-primary/10 text-primary text-sm font-medium rounded-lg">
            {inboxCount}
          </span>
        )}
        <ArrowRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

// Continue Section (Last Opened Note)
function ContinueSection() {
  const { data: lastNote, isLoading } = useLastOpenedNote();
  const { openNote } = useNotePanel();

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-5">
        <div className="h-16 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!lastNote) return null;

  return (
    <button
      onClick={() => openNote(lastNote._id)}
      className="w-full text-left bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-5 hover:border-primary/40 transition-colors group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-primary font-medium mb-1">Continue where you left off</p>
            <h3 className="font-medium text-text">{lastNote.title || 'Untitled Note'}</h3>
            {lastNote.body && (
              <p className="text-sm text-muted mt-1 line-clamp-1">
                {lastNote.body.slice(0, 100)}
              </p>
            )}
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
}

// Recent Notes Section
function RecentNotesSection() {
  const { data: recentNotes, isLoading } = useRecentNotes(3);
  const { openNote } = useNotePanel();

  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
          <Clock className="w-4 h-4 text-purple-500" />
        </div>
        <h3 className="font-medium text-text text-sm">Recent Notes</h3>
      </div>
      <div className="space-y-1">
        {isLoading ? (
          <div className="py-4 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted" />
          </div>
        ) : recentNotes?.length > 0 ? (
          recentNotes.map((note) => (
            <button
              key={note._id}
              onClick={() => openNote(note._id)}
              className="w-full text-left p-2 -mx-2 rounded-lg hover:bg-bg transition-colors"
            >
              <p className="text-sm text-text truncate">{note.title || 'Untitled Note'}</p>
              <p className="text-xs text-muted mt-0.5">
                {new Date(note.updatedAt).toLocaleDateString()}
              </p>
            </button>
          ))
        ) : (
          <p className="text-sm text-muted py-4 text-center">
            No recent notes yet.
          </p>
        )}
      </div>
      <Link
        to="/app/notes"
        className="mt-2 block w-full py-1.5 text-center text-sm text-primary hover:underline"
      >
        View all notes
      </Link>
    </div>
  );
}

// Pinned Notes Section
function PinnedNotesSection() {
  const { data: pinnedNotes, isLoading } = usePinnedNotes();
  const { openNote } = useNotePanel();

  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-yellow-500/10 rounded-lg flex items-center justify-center">
          <Pin className="w-4 h-4 text-yellow-500" />
        </div>
        <h3 className="font-medium text-text text-sm">Pinned Notes</h3>
      </div>
      <div className="space-y-1">
        {isLoading ? (
          <div className="py-4 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted" />
          </div>
        ) : pinnedNotes?.length > 0 ? (
          pinnedNotes.slice(0, 3).map((note) => (
            <button
              key={note._id}
              onClick={() => openNote(note._id)}
              className="w-full text-left p-2 -mx-2 rounded-lg hover:bg-bg transition-colors"
            >
              <div className="flex items-center gap-2">
                <Pin className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                <p className="text-sm text-text truncate">{note.title || 'Untitled Note'}</p>
              </div>
            </button>
          ))
        ) : (
          <p className="text-sm text-muted py-4 text-center">
            No pinned notes yet.
          </p>
        )}
      </div>
      {pinnedNotes?.length > 3 && (
        <Link
          to="/app/notes?pinned=true"
          className="mt-2 block w-full py-1.5 text-center text-sm text-primary hover:underline"
        >
          View all {pinnedNotes.length} pinned
        </Link>
      )}
    </div>
  );
}

// Quick nav card
function QuickNavCard({ to, icon: Icon, iconBg, title, description }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-4 bg-bg rounded-lg border border-border hover:border-primary/50 hover:shadow-sm transition-all group"
    >
      <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text group-hover:text-primary transition-colors">
          {title}
        </p>
        <p className="text-xs text-muted">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

// Coming Soon Card
function ComingSoonCard({ icon: Icon, title, description }) {
  return (
    <Tooltip content={`${title} is coming soon! We're working on it.`} position="top">
      <div
        className="flex items-center gap-3 p-4 bg-bg rounded-lg border border-dashed border-border cursor-not-allowed select-none"
        aria-disabled="true"
        role="button"
        tabIndex={-1}
      >
        <div className="w-8 h-8 bg-muted/10 rounded-lg flex items-center justify-center relative">
          <Icon className="w-4 h-4 text-muted" />
          <Lock className="w-3 h-3 text-muted absolute -bottom-1 -right-1" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="text-xs text-muted/70">{description}</p>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-1 bg-muted/10 text-muted rounded">
          Soon
        </span>
      </div>
    </Tooltip>
  );
}

// First-time user welcome section
function WelcomeSection({ userName }) {
  return (
    <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border border-primary/20 rounded-xl p-8 mb-8">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-text mb-2">
            Welcome to myBrain, {userName}!
          </h1>
          <p className="text-muted mb-4">
            Your personal space to capture thoughts, manage tasks, and build your second brain.
            Start by capturing a quick thought or creating your first task.
          </p>
          <div className="flex items-center gap-3">
            <Link
              to="/app/tasks"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              <CheckSquare className="w-4 h-4" />
              Create a task
            </Link>
            <Link
              to="/app/notes"
              className="inline-flex items-center gap-2 px-4 py-2 bg-bg border border-border text-text rounded-lg hover:bg-bg/80 transition-colors"
            >
              <StickyNote className="w-4 h-4" />
              Write a note
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Returning user welcome
function ReturningUserWelcome({ userName }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold text-text">
        Welcome back, {userName}!
      </h1>
      <p className="text-muted mt-1">Here's what needs your attention today.</p>
    </div>
  );
}

// Helper to get display name from user object
function getDisplayName(user) {
  if (user?.profile?.displayName) return user.profile.displayName;
  if (user?.profile?.firstName) {
    return user.profile.lastName
      ? `${user.profile.firstName} ${user.profile.lastName}`
      : user.profile.firstName;
  }
  return user?.email?.split('@')[0] || 'there';
}

function DashboardContent() {
  const { user } = useSelector((state) => state.auth);
  const { data: recentNotes, isLoading: isLoadingRecent } = useRecentNotes(5);
  const userName = getDisplayName(user);

  const isFirstTimeUser = !isLoadingRecent && (!recentNotes || recentNotes.length === 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Welcome section */}
      {isFirstTimeUser ? (
        <WelcomeSection userName={userName} />
      ) : (
        <ReturningUserWelcome userName={userName} />
      )}

      {/* Inbox alert - show prominently if items need processing */}
      {!isFirstTimeUser && (
        <div className="mb-6">
          <InboxWidget />
        </div>
      )}

      {/* Continue Section - only show for returning users with notes */}
      {!isFirstTimeUser && (
        <div className="mb-6">
          <ContinueSection />
        </div>
      )}

      {/* Main widgets grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <QuickCapture autoFocus={!isFirstTimeUser} />
        <TodayTasksWidget />
        <UpcomingEvents />
      </div>

      {/* Secondary widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <MiniCalendar />
        <RecentNotesSection />
        <PinnedNotesSection />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link
          to="/app/today"
          className="flex items-center gap-3 p-4 bg-panel border border-border rounded-lg hover:border-primary/50 transition-colors group"
        >
          <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-orange-500" />
          </div>
          <span className="text-sm font-medium text-text group-hover:text-primary transition-colors">Today</span>
        </Link>
        <Link
          to="/app/calendar"
          className="flex items-center gap-3 p-4 bg-panel border border-border rounded-lg hover:border-primary/50 transition-colors group"
        >
          <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-indigo-500" />
          </div>
          <span className="text-sm font-medium text-text group-hover:text-primary transition-colors">Calendar</span>
        </Link>
        <Link
          to="/app/tasks"
          className="flex items-center gap-3 p-4 bg-panel border border-border rounded-lg hover:border-primary/50 transition-colors group"
        >
          <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
            <CheckSquare className="w-4 h-4 text-green-500" />
          </div>
          <span className="text-sm font-medium text-text group-hover:text-primary transition-colors">Tasks</span>
        </Link>
        <Link
          to="/app/notes"
          className="flex items-center gap-3 p-4 bg-panel border border-border rounded-lg hover:border-primary/50 transition-colors group"
        >
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
            <StickyNote className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-medium text-text group-hover:text-primary transition-colors">Notes</span>
        </Link>
      </div>

      {/* Explore section */}
      <div className="bg-panel border border-border rounded-lg p-6">
        <h2 className="font-semibold text-text mb-4">Explore</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickNavCard
            to="/app/today"
            icon={Calendar}
            iconBg="bg-orange-500/10 text-orange-500"
            title="Today"
            description="Focus on what matters"
          />

          <QuickNavCard
            to="/app/tasks"
            icon={CheckSquare}
            iconBg="bg-green-500/10 text-green-500"
            title="Tasks"
            description="Manage your to-dos"
          />

          <QuickNavCard
            to="/app/notes"
            icon={StickyNote}
            iconBg="bg-primary/10 text-primary"
            title="Notes"
            description="Capture your thoughts"
          />

          <ComingSoonCard
            icon={BookOpen}
            title="Knowledge Base"
            description="Organize information"
          />
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
