import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Tag,
  ChevronDown,
  ChevronUp,
  Cloud,
  CloudOff,
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
  MapPin
} from 'lucide-react';
import {
  useTask,
  useCreateTask,
  useUpdateTask,
  useUpdateTaskStatus,
  useDeleteTask,
  useTaskBacklinks,
} from '../../features/tasks/hooks/useTasks';
import { useTaskPanel } from '../../contexts/TaskPanelContext';
import Tooltip from '../ui/Tooltip';
import ConfirmDialog from '../ui/ConfirmDialog';
import BacklinksPanel from '../shared/BacklinksPanel';
import TagInput from '../ui/TagInput';
import EventModal from '../../features/calendar/components/EventModal';
import { LifeAreaPicker } from '../../features/lifeAreas/components/LifeAreaPicker';
import { ProjectPicker } from '../../features/projects/components/ProjectPicker';
import LocationPicker from '../ui/LocationPicker';
import { useSavedLocations } from '../../hooks/useSavedLocations';
import useToast from '../../hooks/useToast';
import { useNavigate } from 'react-router-dom';

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

// Save status indicator
function SaveStatus({ status, lastSaved }) {
  const getTimeAgo = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const [timeAgo, setTimeAgo] = useState(getTimeAgo(lastSaved));

  useEffect(() => {
    if (status === 'saved' && lastSaved) {
      const interval = setInterval(() => {
        setTimeAgo(getTimeAgo(lastSaved));
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [status, lastSaved]);

  useEffect(() => {
    setTimeAgo(getTimeAgo(lastSaved));
  }, [lastSaved]);

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {status === 'saving' && (
        <>
          <Cloud className="w-3.5 h-3.5 text-muted animate-pulse" />
          <span className="text-muted">Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Cloud className="w-3.5 h-3.5 text-green-500" />
          <span className="text-muted">Saved {timeAgo}</span>
        </>
      )}
      {status === 'unsaved' && (
        <>
          <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
          <span className="text-muted">Editing</span>
        </>
      )}
      {status === 'error' && (
        <>
          <CloudOff className="w-3.5 h-3.5 text-red-500" />
          <span className="text-red-500">Failed</span>
        </>
      )}
    </div>
  );
}

// Status Dropdown
function StatusDropdown({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const current = STATUS_OPTIONS.find(s => s.value === value) || STATUS_OPTIONS[0];
  const Icon = current.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-bg transition-colors text-sm"
      >
        <Icon className={`w-4 h-4 ${current.color}`} />
        <span className="text-text">{current.label}</span>
        <ChevronDown className="w-3 h-3 text-muted" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-panel border border-border rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
            {STATUS_OPTIONS.map((option) => {
              const OptionIcon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-bg text-sm text-left ${
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
        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-bg transition-colors text-sm"
      >
        <Flag className={`w-4 h-4 ${current.color}`} />
        <span className="text-text">{current.label}</span>
        <ChevronDown className="w-3 h-3 text-muted" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-panel border border-border rounded-lg shadow-lg z-20 py-1 min-w-[120px]">
            {PRIORITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-bg text-sm text-left ${
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

// Tags section
function TagsSection({ tags, onChange }) {
  const [isExpanded, setIsExpanded] = useState(tags.length > 0);

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-bg/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Tag className="w-3.5 h-3.5 text-muted" />
          <span className="text-xs text-muted">
            {tags.length === 0 ? 'Add tags' : `${tags.length} tag${tags.length === 1 ? '' : 's'}`}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-3">
          <TagInput
            value={tags}
            onChange={onChange}
            placeholder="Add tags..."
            showPopular={true}
            popularLimit={6}
          />
        </div>
      )}
    </div>
  );
}

function TaskSlidePanel() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, taskId, closeTask } = useTaskPanel();
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
  const [saveStatus, setSaveStatus] = useState('saved');
  const [lastSaved, setLastSaved] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventInitialData, setEventInitialData] = useState(null);

  const saveTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const lastSavedRef = useRef({ title: '', body: '', status: 'todo', priority: 'medium', dueDate: '', location: '', tags: [], lifeAreaId: null, projectId: null });

  const { data: task, isLoading } = useTask(taskId, { enabled: !!taskId });
  const { data: backlinks, isLoading: backlinksLoading } = useTaskBacklinks(taskId);
  const { data: savedLocations = [] } = useSavedLocations();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const updateTaskStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();

  // Initialize form with task data
  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setBody(task.body || '');
      setStatus(task.status || 'todo');
      setPriority(task.priority || 'medium');
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
      setLocation(task.location || '');
      setTags(task.tags || []);
      setLifeAreaId(task.lifeAreaId || null);
      setProjectId(task.projectId || null);
      lastSavedRef.current = {
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
      setLastSaved(new Date(task.updatedAt));
      setSaveStatus('saved');
    }
  }, [task]);

  // Reset state when panel opens with new task
  useEffect(() => {
    if (isOpen && isNewTask) {
      setTitle('');
      setBody('');
      setStatus('todo');
      setPriority('medium');
      setDueDate('');
      setLocation('');
      setTags([]);
      setLifeAreaId(null);
      setProjectId(null);
      setSaveStatus('saved');
      lastSavedRef.current = {
        title: '', body: '', status: 'todo', priority: 'medium',
        dueDate: '', location: '', tags: [], lifeAreaId: null, projectId: null
      };
    }
  }, [isOpen, isNewTask]);

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
      setSaveStatus('saved');
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

  // Auto-save logic
  const saveTask = useCallback(async () => {
    if (!taskId) return;

    if (!title.trim()) {
      setSaveStatus('saved');
      return;
    }

    const hasChanges =
      title !== lastSavedRef.current.title ||
      body !== lastSavedRef.current.body ||
      status !== lastSavedRef.current.status ||
      priority !== lastSavedRef.current.priority ||
      dueDate !== lastSavedRef.current.dueDate ||
      location !== lastSavedRef.current.location ||
      lifeAreaId !== lastSavedRef.current.lifeAreaId ||
      projectId !== lastSavedRef.current.projectId ||
      JSON.stringify(tags) !== JSON.stringify(lastSavedRef.current.tags);

    if (!hasChanges) {
      setSaveStatus('saved');
      return;
    }

    setSaveStatus('saving');
    try {
      await updateTask.mutateAsync({
        id: taskId,
        data: {
          title,
          body,
          status,
          priority,
          dueDate: dueDate || null,
          location,
          tags,
          lifeAreaId: lifeAreaId || null,
          projectId: projectId || null
        }
      });
      lastSavedRef.current = { title, body, status, priority, dueDate, location, tags, lifeAreaId, projectId };
      setSaveStatus('saved');
      setLastSaved(new Date());

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    } catch (err) {
      console.error('Failed to save:', err);
      setSaveStatus('error');

      retryTimeoutRef.current = setTimeout(() => {
        saveTask();
      }, 5000);
    }
  }, [taskId, title, body, status, priority, dueDate, location, tags, lifeAreaId, projectId, updateTask]);

  // Debounced auto-save (only for existing tasks)
  useEffect(() => {
    if (!taskId || !isOpen || isNewTask) return;

    const hasChanges =
      title !== lastSavedRef.current.title ||
      body !== lastSavedRef.current.body ||
      status !== lastSavedRef.current.status ||
      priority !== lastSavedRef.current.priority ||
      dueDate !== lastSavedRef.current.dueDate ||
      location !== lastSavedRef.current.location ||
      lifeAreaId !== lastSavedRef.current.lifeAreaId ||
      projectId !== lastSavedRef.current.projectId ||
      JSON.stringify(tags) !== JSON.stringify(lastSavedRef.current.tags);

    if (hasChanges) {
      setSaveStatus('unsaved');

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveTask();
      }, 1500);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, body, status, priority, dueDate, location, tags, lifeAreaId, projectId, taskId, isOpen, saveTask]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  // Save on close if there are unsaved changes
  useEffect(() => {
    if (!isOpen && saveStatus === 'unsaved') {
      saveTask();
    }
  }, [isOpen, saveStatus, saveTask]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        closeTask();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTask();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeTask, saveTask]);

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    // Immediate optimistic update for status (only for existing tasks)
    if (taskId) {
      updateTaskStatus.mutate({ id: taskId, status: newStatus });
    }
  };

  const handleDelete = async () => {
    await deleteTask.mutateAsync(taskId);
    closeTask();
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
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-panel border-l border-border shadow-xl z-50 flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Tooltip content="Close (Esc)" position="bottom">
              <button
                onClick={closeTask}
                className="p-1.5 hover:bg-bg rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </Tooltip>

            {!isLoading && !isNewTask && <SaveStatus status={saveStatus} lastSaved={lastSaved} />}
            {isNewTask && <span className="text-sm text-muted">New Task</span>}
          </div>

          {!isNewTask && (
            <div className="flex items-center gap-1">
              <Tooltip content="Schedule Event" position="bottom">
                <button
                  onClick={handleScheduleEvent}
                  className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-muted hover:text-primary"
                >
                  <CalendarPlus className="w-4 h-4" />
                </button>
              </Tooltip>
              <Tooltip content="Delete Task" position="bottom">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-muted hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Tooltip>
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
                className={`w-full text-xl font-semibold bg-transparent border-none focus:outline-none placeholder:text-muted mb-4 ${
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
                className="w-full min-h-[150px] text-text bg-transparent border-none focus:outline-none placeholder:text-muted resize-none leading-relaxed text-sm"
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
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3">
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
            </div>

            <TagsSection
              tags={tags}
              onChange={setTags}
            />

            {!isNewTask && (
              <BacklinksPanel
                backlinks={backlinks}
                isLoading={backlinksLoading}
                onNoteClick={(id) => {
                  closeTask();
                  navigate(`/app/notes/${id}`);
                }}
                onTaskClick={(id) => {
                  closeTask();
                  navigate(`/app/tasks`);
                }}
              />
            )}

            {/* Footer */}
            {isNewTask ? (
              <div className="p-4 border-t border-border">
                <button
                  onClick={handleCreateTask}
                  disabled={!title.trim() || createTask.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
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
            ) : (
              <div className="px-4 py-2 border-t border-border bg-bg/50">
                <p className="text-xs text-muted text-center">
                  <kbd className="px-1 py-0.5 bg-bg border border-border rounded text-[10px]">Ctrl</kbd>
                  {'+'}
                  <kbd className="px-1 py-0.5 bg-bg border border-border rounded text-[10px]">S</kbd>
                  {' save · '}
                  <kbd className="px-1 py-0.5 bg-bg border border-border rounded text-[10px]">Esc</kbd>
                  {' close'}
                </p>
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
