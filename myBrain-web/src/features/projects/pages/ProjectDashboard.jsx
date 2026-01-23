import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  CheckSquare,
  StickyNote,
  Calendar,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  Clock,
  CheckCircle2,
  Pause,
  Archive,
  Target,
  AlertCircle,
  Plus,
  Flag,
  TrendingUp,
  Users
} from 'lucide-react';
import {
  useProject,
  useUpdateProject,
  useDeleteProject,
  useUpdateProjectStatus,
  useAddProjectComment,
  useUpdateProjectComment,
  useDeleteProjectComment
} from '../hooks/useProjects';
import { usePageTracking } from '../../../hooks/useAnalytics';
import { TaskPanelProvider, useTaskPanel } from '../../../contexts/TaskPanelContext';
import { NotePanelProvider, useNotePanel } from '../../../contexts/NotePanelContext';
import { useProjectPanel } from '../../../contexts/ProjectPanelContext';
import TaskSlidePanel from '../../../components/tasks/TaskSlidePanel';
import NoteSlidePanel from '../../../components/notes/NoteSlidePanel';
import EventModal from '../../calendar/components/EventModal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import useToast from '../../../hooks/useToast';
import { ProjectTasksBoard } from '../components/dashboard/ProjectTasksBoard';
import { ProjectNotesGrid } from '../components/dashboard/ProjectNotesGrid';
import { ProjectEventsTimeline } from '../components/dashboard/ProjectEventsTimeline';
import { ProjectActivityFeed } from '../components/dashboard/ProjectActivityFeed';

const STATUS_CONFIG = {
  active: { label: 'Active', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  completed: { label: 'Completed', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
  on_hold: { label: 'On Hold', icon: Pause, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  someday: { label: 'Someday', icon: Archive, color: 'text-gray-500', bg: 'bg-gray-500/10' },
};

function ProjectDashboardContent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: project, isLoading, error } = useProject(id, true);
  const { openProject } = useProjectPanel();
  const { openNewTask } = useTaskPanel();
  const { openNewNote } = useNotePanel();

  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const updateStatus = useUpdateProjectStatus();
  const addComment = useAddProjectComment();
  const updateComment = useUpdateProjectComment();
  const deleteComment = useDeleteProjectComment();

  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks'); // Mobile tabs

  usePageTracking();

  const handleBack = () => navigate('/app/projects');

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleNewEvent = () => {
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleCloseEventModal = () => {
    setShowEventModal(false);
    setSelectedEvent(null);
  };

  const handleDelete = async () => {
    try {
      await deleteProject.mutateAsync(project._id);
      toast.success('Project deleted');
      navigate('/app/projects');
    } catch (err) {
      toast.error('Failed to delete project');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateStatus.mutateAsync({ id: project._id, status: newStatus });
    } catch (err) {
      toast.error('Failed to update status');
    }
    setShowMenu(false);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-bg">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-bg p-4">
        <p className="text-danger mb-4">{error?.message || 'Project not found'}</p>
        <button onClick={handleBack} className="flex items-center gap-2 text-sm text-primary hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back to projects
        </button>
      </div>
    );
  }

  const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.active;
  const StatusIcon = status.icon;
  const taskCount = project.linkedTasks?.length || 0;
  const completedTasks = project.progress?.completed || 0;
  const noteCount = project.linkedNotes?.length || 0;
  const eventCount = project.linkedEvents?.length || 0;
  const commentCount = project.comments?.length || 0;

  const isOverdue = project.deadline && new Date(project.deadline) < new Date() && project.status !== 'completed';
  const daysUntilDeadline = project.deadline
    ? Math.ceil((new Date(project.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="h-full flex flex-col bg-bg overflow-hidden">
      {/* Command Bar Header */}
      <div className="flex-shrink-0 bg-panel border-b border-border">
        {/* Top Row: Back + Title + Actions */}
        <div className="flex items-center gap-3 px-3 py-2 lg:px-4">
          <button onClick={handleBack} className="p-1.5 text-muted hover:text-text rounded-lg hover:bg-bg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0 flex items-center gap-3">
            <h1 className="text-lg font-semibold text-text truncate">{project.title}</h1>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}
            >
              <StatusIcon className="w-3 h-3" />
              <span className="hidden sm:inline">{status.label}</span>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => openNewTask()}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted hover:text-text hover:bg-bg rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Task
            </button>
            <button
              onClick={() => openNewNote()}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted hover:text-text hover:bg-bg rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Note
            </button>
            <button
              onClick={() => openProject(project._id)}
              className="p-1.5 text-muted hover:text-text rounded-lg hover:bg-bg transition-colors"
              title="Edit Project"
            >
              <Pencil className="w-4 h-4" />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 text-muted hover:text-text rounded-lg hover:bg-bg transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-44 py-1 bg-panel glass border border-border rounded-xl shadow-theme-floating z-20">
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      return (
                        <button
                          key={key}
                          onClick={() => handleStatusChange(key)}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-bg ${project.status === key ? config.color : 'text-text'}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {config.label}
                        </button>
                      );
                    })}
                    <div className="border-t border-border my-1" />
                    <button
                      onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-danger hover:bg-danger/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Project
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 px-3 py-2 lg:px-4 border-t border-border/50 bg-bg/30 overflow-x-auto">
          {/* Progress */}
          <div className="flex items-center gap-2 min-w-fit">
            <div className="w-24 h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${project.progress?.percentage === 100 ? 'bg-green-500' : 'bg-primary'}`}
                style={{ width: `${project.progress?.percentage || 0}%` }}
              />
            </div>
            <span className="text-xs font-medium text-text">{project.progress?.percentage || 0}%</span>
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Stats */}
          <div className="flex items-center gap-1 text-muted">
            <CheckSquare className="w-3.5 h-3.5" />
            <span className="text-xs">{completedTasks}/{taskCount}</span>
          </div>
          <div className="flex items-center gap-1 text-muted">
            <StickyNote className="w-3.5 h-3.5" />
            <span className="text-xs">{noteCount}</span>
          </div>
          <div className="flex items-center gap-1 text-muted">
            <Calendar className="w-3.5 h-3.5" />
            <span className="text-xs">{eventCount}</span>
          </div>
          <div className="flex items-center gap-1 text-muted">
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-xs">{commentCount}</span>
          </div>

          {/* Deadline */}
          {project.deadline && (
            <>
              <div className="h-4 w-px bg-border" />
              <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-danger' : 'text-muted'}`}>
                {isOverdue && <AlertCircle className="w-3.5 h-3.5" />}
                <span className="font-medium">
                  {isOverdue
                    ? `${Math.abs(daysUntilDeadline)}d overdue`
                    : daysUntilDeadline === 0
                      ? 'Due today'
                      : `${daysUntilDeadline}d left`
                  }
                </span>
              </div>
            </>
          )}

          {/* Priority */}
          {project.priority && project.priority !== 'medium' && (
            <>
              <div className="h-4 w-px bg-border" />
              <div className={`flex items-center gap-1 text-xs ${project.priority === 'high' ? 'text-danger' : 'text-muted'}`}>
                <Flag className="w-3.5 h-3.5" />
                <span className="capitalize">{project.priority}</span>
              </div>
            </>
          )}
        </div>

        {/* Mobile Tabs */}
        <div className="lg:hidden flex items-center border-t border-border">
          {[
            { key: 'tasks', label: 'Tasks', icon: CheckSquare, count: taskCount },
            { key: 'notes', label: 'Notes', icon: StickyNote, count: noteCount },
            { key: 'events', label: 'Events', icon: Calendar, count: eventCount },
            { key: 'activity', label: 'Activity', icon: MessageSquare, count: commentCount },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'text-primary border-primary'
                  : 'text-muted border-transparent hover:text-text'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{tab.label}</span>
              {tab.count > 0 && <span className="text-[10px] opacity-70">({tab.count})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content - Bento Grid on Desktop, Tabs on Mobile */}
      <div className="flex-1 overflow-hidden">
        {/* Desktop Layout */}
        <div className="hidden lg:grid h-full grid-cols-12 gap-3 p-3">
          {/* Left Column - Activity & Comments */}
          <div className="col-span-3 flex flex-col gap-3 overflow-hidden">
            <ProjectActivityFeed
              project={project}
              comments={project.comments || []}
              onAddComment={(text) => addComment.mutate({ projectId: project._id, text })}
              onUpdateComment={(commentId, text) => updateComment.mutate({ projectId: project._id, commentId, text })}
              onDeleteComment={(commentId) => deleteComment.mutate({ projectId: project._id, commentId })}
              isAdding={addComment.isPending}
              isUpdating={updateComment.isPending}
              isDeleting={deleteComment.isPending}
            />
          </div>

          {/* Center Column - Tasks (Main Focus) */}
          <div className="col-span-6 overflow-hidden">
            <ProjectTasksBoard
              projectId={project._id}
              tasks={project.linkedTasks || []}
            />
          </div>

          {/* Right Column - Notes & Events */}
          <div className="col-span-3 flex flex-col gap-3 overflow-hidden">
            <ProjectNotesGrid
              projectId={project._id}
              notes={project.linkedNotes || []}
            />
            <ProjectEventsTimeline
              projectId={project._id}
              events={project.linkedEvents || []}
              onEventClick={handleEventClick}
              onNewEvent={handleNewEvent}
            />
          </div>
        </div>

        {/* Mobile Layout - Single Section */}
        <div className="lg:hidden h-full overflow-y-auto p-3">
          {activeTab === 'tasks' && (
            <ProjectTasksBoard projectId={project._id} tasks={project.linkedTasks || []} />
          )}
          {activeTab === 'notes' && (
            <ProjectNotesGrid projectId={project._id} notes={project.linkedNotes || []} />
          )}
          {activeTab === 'events' && (
            <ProjectEventsTimeline
              projectId={project._id}
              events={project.linkedEvents || []}
              onEventClick={handleEventClick}
              onNewEvent={handleNewEvent}
            />
          )}
          {activeTab === 'activity' && (
            <ProjectActivityFeed
              project={project}
              comments={project.comments || []}
              onAddComment={(text) => addComment.mutate({ projectId: project._id, text })}
              onUpdateComment={(commentId, text) => updateComment.mutate({ projectId: project._id, commentId, text })}
              onDeleteComment={(commentId) => deleteComment.mutate({ projectId: project._id, commentId })}
              isAdding={addComment.isPending}
              isUpdating={updateComment.isPending}
              isDeleting={deleteComment.isPending}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {showEventModal && (
        <EventModal
          event={selectedEvent}
          onClose={handleCloseEventModal}
          projectIdToLink={!selectedEvent ? project._id : undefined}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Project"
        message="Are you sure you want to delete this project? Linked items will be unlinked but not deleted."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

function ProjectDashboard() {
  return (
    <NotePanelProvider>
      <TaskPanelProvider>
        <ProjectDashboardContent />
        <NoteSlidePanel />
        <TaskSlidePanel />
      </TaskPanelProvider>
    </NotePanelProvider>
  );
}

export default ProjectDashboard;
