/**
 * =============================================================================
 * DASHBOARDPAGE.JSX - Rich Feature Dashboard
 * =============================================================================
 *
 * Feature-rich dashboard inspired by modern productivity apps.
 * Dense layouts with grouped sections, tags, progress indicators.
 */

import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { usePageTracking } from '../../hooks/useAnalytics';
import { Loader2, RefreshCw } from 'lucide-react';

// Dashboard components
import DashboardHeader from './components/DashboardHeader';
import DashboardSkeleton from './components/DashboardSkeleton';
import {
  TasksWidget,
  NotesWidget,
  InboxWidget,
  ProjectsWidget,
  QuickCapture,
  ActivityWidget
} from './components/DashboardCards';
import GoalsWidget from './widgets/GoalsWidget';
import CalendarStripWidget from './widgets/CalendarStripWidget';
import RemindersWidget from './widgets/RemindersWidget';
import WidgetErrorBoundary from '../../components/ui/WidgetErrorBoundary';

// Data hooks
import { useDashboardData, useDashboardSession } from './hooks/useDashboardData';
// Slide panels
import { TaskPanelProvider, useTaskPanel } from '../../contexts/TaskPanelContext';
import { NotePanelProvider, useNotePanel } from '../../contexts/NotePanelContext';
import TaskSlidePanel from '../../components/tasks/TaskSlidePanel';
import NoteSlidePanel from '../../components/notes/NoteSlidePanel';
import '../../styles/dashboard.css';
import '../../styles/dashboard-rich.css';

// =============================================================================
// MAIN DASHBOARD
// =============================================================================

function DashboardContent() {
  const { openTask, openNewTask } = useTaskPanel();
  const { openNote, openNewNote } = useNotePanel();
  const navigate = useNavigate();
  const { user: currentUser } = useSelector((state) => state.auth);

  const { data, isLoading, error, refetch } = useDashboardData();
  useDashboardSession();
  usePageTracking();

  // Handlers
  const handleTaskClick = (task) => openTask(task._id);
  const handleNoteClick = (note) => openNote(note._id);
  const handleProjectClick = (project) => navigate(`/app/projects/${project._id}`);
  // When a task is created via quick capture, optionally open it for editing
  const handleTaskCreated = (taskId) => {
    if (taskId) {
      openTask(taskId);
    }
  };

  if (isLoading && !data) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="dash-error">
        <p>Failed to load dashboard</p>
        <button onClick={() => refetch()} className="dash-error-btn">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="dash-container">
      {/* Header */}
      <WidgetErrorBoundary name="dashboard-header">
        <DashboardHeader />
      </WidgetErrorBoundary>

      {/* Quick Capture - adds directly to inbox */}
      <WidgetErrorBoundary name="quick-capture">
        <QuickCapture onTaskCreated={handleTaskCreated} />
      </WidgetErrorBoundary>

      {/* Main Grid - 3 column layout */}
      <div className="dash-layout">
        {/* Left column - Tasks (prominent) */}
        <div className="dash-col">
          <WidgetErrorBoundary name="tasks-widget">
            <TasksWidget
              overdueTasks={data?.urgentItems?.overdueTasks || []}
              dueTodayTasks={data?.urgentItems?.dueTodayTasks || []}
              upcomingTasks={data?.upcomingTasks || []}
              onTaskClick={handleTaskClick}
            />
          </WidgetErrorBoundary>
        </div>

        {/* Middle column - Calendar, Reminders, Goals */}
        <div className="dash-col">
          <WidgetErrorBoundary name="calendar-strip-widget">
            <CalendarStripWidget />
          </WidgetErrorBoundary>
          <WidgetErrorBoundary name="reminders-widget">
            <RemindersWidget />
          </WidgetErrorBoundary>
          <WidgetErrorBoundary name="goals-widget">
            <GoalsWidget />
          </WidgetErrorBoundary>
        </div>

        {/* Right column - Notes, Inbox, Projects, Activity */}
        <div className="dash-col">
          <WidgetErrorBoundary name="notes-widget">
            <NotesWidget
              notes={data?.recentNotes || []}
              onNoteClick={handleNoteClick}
            />
          </WidgetErrorBoundary>
          <WidgetErrorBoundary name="inbox-widget">
            <InboxWidget
              notes={data?.inbox || []}
              onNoteClick={handleNoteClick}
            />
          </WidgetErrorBoundary>
          <WidgetErrorBoundary name="projects-widget">
            <ProjectsWidget
              projects={data?.projects || []}
              onProjectClick={handleProjectClick}
            />
          </WidgetErrorBoundary>
          <WidgetErrorBoundary name="activity-widget">
            <ActivityWidget
              activities={data?.activity || []}
              currentUserId={currentUser?._id}
            />
          </WidgetErrorBoundary>
        </div>
      </div>

    </div>
  );
}

// =============================================================================
// WRAPPER
// =============================================================================

export default function DashboardPage() {
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
