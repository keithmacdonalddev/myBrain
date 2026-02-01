import { useState, useEffect, useRef } from 'react';
import {
  X,
  Loader2,
  Trash2,
  Calendar,
  CalendarPlus,
  Flag,
  Link as LinkIcon,
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  MapPin,
  ChevronDown,
  Save,
  Archive,
  ArchiveRestore,
  RotateCcw
} from 'lucide-react';
import {
  useTask,
  useCreateTask,
  useUpdateTask,
  useUpdateTaskStatus,
  useDeleteTask,
  useTaskBacklinks,
  useArchiveTask,
  useUnarchiveTask,
  useTrashTask,
  useRestoreTask,
  useAddTaskComment,
  useUpdateTaskComment,
  useDeleteTaskComment,
} from '../../features/tasks/hooks/useTasks';
import { useTaskPanel } from '../../contexts/TaskPanelContext';
import Tooltip from '../ui/Tooltip';
import ConfirmDialog from '../ui/ConfirmDialog';
import BacklinksPanel from '../shared/BacklinksPanel';
import TagsSection from '../shared/TagsSection';
import CommentsSection from '../shared/CommentsSection';
import EventModal from '../../features/calendar/components/EventModal';
import { LifeAreaPicker } from '../../features/lifeAreas/components/LifeAreaPicker';
import { ProjectPicker } from '../../features/projects/components/ProjectPicker';
import LocationPicker from '../ui/LocationPicker';
import { useSavedLocations } from '../../hooks/useSavedLocations';
import useToast from '../../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import SaveStatus from '../ui/SaveStatus';
import useAutoSave, { createChangeDetector } from '../../hooks/useAutoSave';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';

// Status options
const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do', icon: Circle, color: 'text-muted' },
  { value: 'in_progress', label: 'In Progress', icon: Clock, color: 'text-blue-500' },
  { value: 'done', label: 'Done', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle, color: 'text-red-500' },
];

// Priority options
const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'text-gray-400' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-500' },
  { value: 'high', label: 'High', color: 'text-red-500' },
];

// Status Dropdown
function StatusDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const current = STATUS_OPTIONS.find(s => s.value === value) || STATUS_OPTIONS[0];
  const Icon = current.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change status"
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-bg active:bg-bg/80 transition-colors text-sm min-h-[44px]"
      >
        <Icon className={`w-4 h-4 ${current.color}`} />
        <span className="text-text">{current.label}</span>
        <ChevronDown className="w-3 h-3 text-muted" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-panel glass border border-border rounded-lg shadow-theme-floating z-20 py-1 min-w-[160px]">
            {STATUS_OPTIONS.map((option) => {
              const OptionIcon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 hover:bg-bg active:bg-bg/80 text-sm text-left min-h-[44px] ${
                    value === option.value ? 'bg-bg' : ''
                  }`}
                >
                  <OptionIcon className={`w-4 h-4 ${option.color}`} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Priority Dropdown
function PriorityDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const current = PRIORITY_OPTIONS.find(p => p.value === value) || PRIORITY_OPTIONS[1];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change priority"
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-bg active:bg-bg/80 transition-colors text-sm min-h-[44px]"
      >
        <Flag className={`w-4 h-4 ${current.color}`} />
        <span className="text-text">{current.label}</span>
        <ChevronDown className="w-3 h-3 text-muted" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-panel glass border border-border rounded-lg shadow-theme-floating z-20 py-1 min-w-[140px]">
            {PRIORITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 hover:bg-bg active:bg-bg/80 text-sm text-left min-h-[44px] ${
                  value === option.value ? 'bg-bg' : ''
                }`}
              >
                <Flag className={`w-4 h-4 ${option.color}`} />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Change detector for task fields
const taskChangeDetector = createChangeDetector([
  'title', 'body', 'status', 'priority', 'dueDate', 'location', 'tags', 'lifeAreaId', 'projectId'
]);

function TaskSlidePanel() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, taskId, initialData, closeTask } = useTaskPanel();
  const isNewTask = !taskId;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState([]);
  const [lifeAreaId, setLifeAreaId] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventInitialData, setEventInitialData] = useState(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  // Ref to prevent rapid double-delete (synchronous check prevents race conditions)
  const isDeletingRef = useRef(false);

  const { data: task, isLoading } = useTask(taskId, { enabled: !!taskId });
  const { data: backlinks, isLoading: backlinksLoading } = useTaskBacklinks(taskId);
  const { data: savedLocations = [] } = useSavedLocations();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateTaskStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();
  const archiveTask = useArchiveTask();
  const unarchiveTask = useUnarchiveTask();
  const trashTask = useTrashTask();
  const restoreTask = useRestoreTask();
  const addComment = useAddTaskComment();
  const updateComment = useUpdateTaskComment();
  const deleteComment = useDeleteTaskComment();

  // Current form data for auto-save
  const currentData = { title, body, status, priority, dueDate, location, tags, lifeAreaId, projectId };

  // Auto-save hook
  const {
    saveStatus,
    lastSaved,
    triggerSave,
    resetSaveState,
    setLastSavedData,
    setSaveStatus
  } = useAutoSave({
    id: taskId,
    currentData,
    isOpen,
    hasChanges: taskChangeDetector,
    onSave: async (data) => {
      await updateTask.mutateAsync({
        id: taskId,
        data: {
          title: data.title,
          body: data.body,
          status: data.status,
          priority: data.priority,
          dueDate: data.dueDate || null,
          location: data.location,
          tags: data.tags,
          lifeAreaId: data.lifeAreaId || null,
          projectId: data.projectId || null
        }
      });
    },
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    isOpen,
    onClose: closeTask,
    onSave: triggerSave,
  });

  // Initialize form with task data
  useEffect(() => {
    if (task) {
      const taskData = {
        title: task.title || '',
        body: task.body || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        location: task.location || '',
        tags: task.tags || [],
        lifeAreaId: task.lifeAreaId || null,
        projectId: task.projectId || null
      };
      setTitle(taskData.title);
      setBody(taskData.body);
      setStatus(taskData.status);
      setPriority(taskData.priority);
      setDueDate(taskData.dueDate);
      setLocation(taskData.location);
      setTags(taskData.tags);
      setLifeAreaId(taskData.lifeAreaId);
      setProjectId(taskData.projectId);
      setLastSavedData(taskData);
      resetSaveState(taskData);
    }
  }, [task, setLastSavedData, resetSaveState]);

  // Reset state when panel opens with new task (use initialData if provided)
  useEffect(() => {
    if (isOpen && isNewTask) {
      const newData = {
        title: initialData?.title || '',
        body: initialData?.body || '',
        status: initialData?.status || 'todo',
        priority: initialData?.priority || 'medium',
        dueDate: initialData?.dueDate || '',
        location: initialData?.location || '',
        tags: initialData?.tags || [],
        lifeAreaId: initialData?.lifeAreaId || null,
        projectId: initialData?.projectId || null
      };
      setTitle(newData.title);
      setBody(newData.body);
      setStatus(newData.status);
      setPriority(newData.priority);
      setDueDate(newData.dueDate);
      setLocation(newData.location);
      setTags(newData.tags);
      setLifeAreaId(newData.lifeAreaId);
      setProjectId(newData.projectId);
      resetSaveState(newData);
    }
  }, [isOpen, isNewTask, initialData, resetSaveState]);

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setBody('');
      setStatus('todo');
      setPriority('medium');
      setDueDate('');
      setLocation('');
      setTags([]);
      setLifeAreaId(null);
      setProjectId(null);
    }
  }, [isOpen]);

  // Create new task handler
  const handleCreateTask = async () => {
    if (!title.trim()) return;

    setSaveStatus('saving');
    try {
      await createTask.mutateAsync({
        title,
        body,
        status,
        priority,
        dueDate: dueDate || null,
        location,
        tags,
        lifeAreaId: lifeAreaId || null,
        projectId: projectId || null
      });
      toast.success('Task created');
      closeTask();
    } catch (err) {
      console.error('Failed to create task:', err);
      setSaveStatus('error');
      toast.error(err.message || 'Failed to create task');
    }
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    // Immediate optimistic update for status (only for existing tasks)
    if (taskId) {
      updateTaskStatus.mutate({ id: taskId, status: newStatus });
    }
  };

  const handleDelete = async () => {
    // Synchronous check using ref - prevents race conditions with rapid delete button clicks
    if (isDeletingRef.current) return;
    isDeletingRef.current = true;
    setIsDeletingTask(true);

    try {
      await deleteTask.mutateAsync(taskId);
      toast.success('Task deleted');
      closeTask();
    } finally {
      isDeletingRef.current = false;
      setIsDeletingTask(false);
    }
  };

  const handleArchive = async () => {
    await archiveTask.mutateAsync(taskId);
    toast.success('Task archived');
    closeTask();
  };

  const handleUnarchive = async () => {
    await unarchiveTask.mutateAsync(taskId);
    toast.success('Task restored from archive');
  };

  const handleTrash = async () => {
    await trashTask.mutateAsync(taskId);
    toast.success('Task moved to trash');
    closeTask();
  };

  const handleRestore = async () => {
    await restoreTask.mutateAsync(taskId);
    toast.success('Task restored from trash');
  };

  const handleScheduleEvent = () => {
    // Prepare initial data for the event based on task
    const eventDate = dueDate ? new Date(dueDate + 'T09:00:00') : new Date();
    if (!dueDate) {
      eventDate.setHours(eventDate.getHours() + 1, 0, 0, 0);
    }
    setEventInitialData({
      title: title,
      initialDate: eventDate,
      taskIdToLink: taskId,
    });
    setShowEventModal(true);
  };

  const handleEventCreated = () => {
    // Event was created and linked (handled in EventModal)
    setShowEventModal(false);
    setEventInitialData(null);
  };

  const handleCloseEventModal = () => {
    setShowEventModal(false);
    setEventInitialData(null);
  };

  const isCompleted = status === 'done' || status === 'cancelled';
  const isArchived = task?.status === 'archived';
  const isTrashed = task?.status === 'trashed';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeTask}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-panel glass-heavy border-l border-border z-50 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Tooltip content="Close (Esc)" position="bottom">
              <button
                onClick={closeTask}
                className="p-2.5 sm:p-1.5 hover:bg-bg active:bg-bg/80 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </Tooltip>

            {!isLoading && !isNewTask && (
              <>
                <SaveStatus status={saveStatus} lastSaved={lastSaved} />
                <button
                  onClick={triggerSave}
                  disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                  className="ml-2 px-2 py-1 text-xs bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                >
                  {saveStatus === 'saving' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                  <span className="hidden sm:inline">Save</span>
                </button>
              </>
            )}
            {isNewTask && <span className="text-sm text-muted">New Task</span>}
          </div>

          {!isNewTask && (
            <div className="flex items-center gap-1">
              {/* Show restore button if trashed */}
              {isTrashed && (
                <Tooltip content="Restore from Trash" position="bottom">
                  <button
                    onClick={handleRestore}
                    className="p-2.5 sm:p-1.5 hover:bg-green-500/10 active:bg-green-500/20 rounded-lg transition-colors text-muted hover:text-green-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <RotateCcw className="w-5 h-5 sm:w-4 sm:h-4" />
                  </button>
                </Tooltip>
              )}

              {/* Show unarchive button if archived */}
              {isArchived && (
                <Tooltip content="Restore from Archive" position="bottom">
                  <button
                    onClick={handleUnarchive}
                    className="p-2.5 sm:p-1.5 hover:bg-blue-500/10 active:bg-blue-500/20 rounded-lg transition-colors text-muted hover:text-blue-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <ArchiveRestore className="w-5 h-5 sm:w-4 sm:h-4" />
                  </button>
                </Tooltip>
              )}

              {/* Normal task actions */}
              {!isArchived && !isTrashed && (
                <>
                  <Tooltip content="Schedule Event" position="bottom">
                    <button
                      onClick={handleScheduleEvent}
                      aria-label="Schedule event"
                      className="p-2.5 sm:p-1.5 hover:bg-primary/10 active:bg-primary/20 rounded-lg transition-colors text-muted hover:text-primary min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <CalendarPlus className="w-5 h-5 sm:w-4 sm:h-4" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Archive Task" position="bottom">
                    <button
                      onClick={handleArchive}
                      aria-label="Archive task"
                      className="p-2.5 sm:p-1.5 hover:bg-blue-500/10 active:bg-blue-500/20 rounded-lg transition-colors text-muted hover:text-blue-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Archive className="w-5 h-5 sm:w-4 sm:h-4" />
                    </button>
                  </Tooltip>
                  <Tooltip content="Move to Trash" position="bottom">
                    <button
                      onClick={handleTrash}
                      aria-label="Move to trash"
                      className="p-2.5 sm:p-1.5 hover:bg-red-500/10 active:bg-red-500/20 rounded-lg transition-colors text-muted hover:text-red-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                      <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                    </button>
                  </Tooltip>
                </>
              )}

              {/* Permanent delete (only for trashed items) */}
              {isTrashed && (
                <Tooltip content="Delete Permanently" position="bottom">
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isDeletingTask}
                    className="p-2.5 sm:p-1.5 hover:bg-red-500/10 active:bg-red-500/20 rounded-lg transition-colors text-muted hover:text-red-500 min-h-[44px] min-w-[44px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                  </button>
                </Tooltip>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading && !isNewTask ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto p-4">
              {/* Title */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title..."
                aria-label="Task title"
                className={`w-full text-lg font-semibold px-3 py-2 bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted mb-4 ${
                  isCompleted ? 'text-muted line-through' : 'text-text'
                }`}
                autoFocus={isNewTask}
              />

              {/* Status, Priority, Due Date row */}
              <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-border">
                <StatusDropdown value={status} onChange={handleStatusChange} />
                <PriorityDropdown value={priority} onChange={setPriority} />

                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-muted" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-transparent border-none text-sm text-text focus:outline-none"
                  />
                </div>
              </div>

              {/* Body */}
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Add description..."
                aria-label="Task description"
                className="w-full min-h-[80px] px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none leading-relaxed"
              />

              {/* Location */}
              <div className="mt-4">
                <label className="flex items-center gap-2 text-xs text-muted mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Location
                </label>
                <LocationPicker
                  value={location}
                  onChange={setLocation}
                  placeholder="Add a location..."
                  savedLocations={savedLocations}
                />
              </div>

              {/* Category and Project pickers */}
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">Category</label>
                  <LifeAreaPicker
                    value={lifeAreaId}
                    onChange={setLifeAreaId}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Project</label>
                  <ProjectPicker
                    value={projectId}
                    onChange={setProjectId}
                    placeholder="Select project"
                  />
                </div>
              </div>

              {/* Linked Notes section (placeholder) */}
              {task?.linkedNoteIds?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon className="w-4 h-4 text-muted" />
                    <span className="text-sm text-muted">Linked Notes ({task.linkedNoteIds.length})</span>
                  </div>
                </div>
              )}

              <TagsSection
                tags={tags}
                onChange={setTags}
              />

              {!isNewTask && (
                <CommentsSection
                  comments={task?.comments || []}
                  onAdd={(text) => addComment.mutate({ taskId, text })}
                  onUpdate={(commentId, text) => updateComment.mutate({ taskId, commentId, text })}
                  onDelete={(commentId) => deleteComment.mutate({ taskId, commentId })}
                  isAdding={addComment.isPending}
                  isUpdating={updateComment.isPending}
                  isDeleting={deleteComment.isPending}
                />
              )}
            </div>

            {!isNewTask && (
              <BacklinksPanel
                backlinks={backlinks}
                isLoading={backlinksLoading}
                onNoteClick={(id) => {
                  closeTask();
                  navigate(`/app/notes/${id}`);
                }}
                onTaskClick={() => {
                  closeTask();
                  navigate(`/app/tasks`);
                }}
              />
            )}

            {/* Footer */}
            {isNewTask && (
              <div className="p-4 border-t border-border">
                <button
                  onClick={handleCreateTask}
                  disabled={!title.trim() || createTask.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg btn-interactive hover:bg-primary-hover disabled:opacity-50 disabled:transform-none min-h-[48px] text-sm font-medium"
                >
                  {createTask.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Task'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Event Modal for scheduling */}
      {showEventModal && eventInitialData && (
        <EventModal
          event={{ title: eventInitialData.title }}
          initialDate={eventInitialData.initialDate}
          onClose={handleCloseEventModal}
          onCreated={handleEventCreated}
          taskIdToLink={eventInitialData.taskIdToLink}
        />
      )}
    </>
  );
}

export default TaskSlidePanel;
