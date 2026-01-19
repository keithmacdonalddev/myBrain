import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Cloud,
  CloudOff,
  Loader2,
  Trash2,
  Calendar,
  Flag,
  Target,
  Pin,
  PinOff,
  Clock,
  CheckCircle2,
  Pause,
  Archive,
  ChevronDown,
  Save
} from 'lucide-react';
import {
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useAddProjectComment,
  useUpdateProjectComment,
  useDeleteProjectComment
} from '../../features/projects/hooks/useProjects';
import { useLifeAreas } from '../../features/lifeAreas/hooks/useLifeAreas';
import { useProjectPanel } from '../../contexts/ProjectPanelContext';
import { LinkedItemsSection } from '../../features/projects/components/LinkedItemsSection';
import { LinkItemModal } from '../../features/projects/components/LinkItemModal';
import { ProjectProgress } from '../../features/projects/components/ProjectProgress';
import { LifeAreaPicker } from '../../features/lifeAreas/components/LifeAreaPicker';
import Tooltip from '../ui/Tooltip';
import ConfirmDialog from '../ui/ConfirmDialog';
import TagsSection from '../shared/TagsSection';
import CommentsSection from '../shared/CommentsSection';
import useToast from '../../hooks/useToast';

// Status options
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', icon: Clock, color: 'text-primary' },
  { value: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-success' },
  { value: 'on_hold', label: 'On Hold', icon: Pause, color: 'text-warning' },
  { value: 'someday', label: 'Someday', icon: Archive, color: 'text-muted' },
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

function ProjectSlidePanel() {
  const toast = useToast();
  const { isOpen, projectId, closeProject } = useProjectPanel();
  const isNewProject = !projectId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [outcome, setOutcome] = useState('');
  const [status, setStatus] = useState('active');
  const [priority, setPriority] = useState('medium');
  const [deadline, setDeadline] = useState('');
  const [lifeAreaId, setLifeAreaId] = useState(null);
  const [tags, setTags] = useState([]);
  const [pinned, setPinned] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [lastSaved, setLastSaved] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [linkModalType, setLinkModalType] = useState(null);

  const saveTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const lastSavedRef = useRef({
    title: '', description: '', outcome: '', status: 'active', priority: 'medium',
    deadline: '', lifeAreaId: null, tags: [], pinned: false
  });

  const { data: project, isLoading } = useProject(projectId, true);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const addComment = useAddProjectComment();
  const updateComment = useUpdateProjectComment();
  const deleteComment = useDeleteProjectComment();

  // Initialize form with project data
  useEffect(() => {
    if (project) {
      setTitle(project.title || '');
      setDescription(project.description || '');
      setOutcome(project.outcome || '');
      setStatus(project.status || 'active');
      setPriority(project.priority || 'medium');
      setDeadline(project.deadline ? project.deadline.split('T')[0] : '');
      setLifeAreaId(project.lifeAreaId || null);
      setTags(project.tags || []);
      setPinned(project.pinned || false);
      lastSavedRef.current = {
        title: project.title || '',
        description: project.description || '',
        outcome: project.outcome || '',
        status: project.status || 'active',
        priority: project.priority || 'medium',
        deadline: project.deadline ? project.deadline.split('T')[0] : '',
        lifeAreaId: project.lifeAreaId || null,
        tags: project.tags || [],
        pinned: project.pinned || false
      };
      setLastSaved(new Date(project.updatedAt));
      setSaveStatus('saved');
    }
  }, [project]);

  // Reset state when panel opens with new project
  useEffect(() => {
    if (isOpen && isNewProject) {
      setTitle('');
      setDescription('');
      setOutcome('');
      setStatus('active');
      setPriority('medium');
      setDeadline('');
      setLifeAreaId(null);
      setTags([]);
      setPinned(false);
      setSaveStatus('saved');
      setLastSaved(null);
      lastSavedRef.current = {
        title: '', description: '', outcome: '', status: 'active', priority: 'medium',
        deadline: '', lifeAreaId: null, tags: [], pinned: false
      };
    }
  }, [isOpen, isNewProject]);

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
      setOutcome('');
      setStatus('active');
      setPriority('medium');
      setDeadline('');
      setLifeAreaId(null);
      setTags([]);
      setPinned(false);
      setSaveStatus('saved');
      setLinkModalType(null);
    }
  }, [isOpen]);

  // Save logic
  const saveProject = useCallback(async () => {
    if (!title.trim()) {
      if (!isNewProject) setSaveStatus('saved');
      return;
    }

    const currentData = {
      title, description, outcome, status, priority,
      deadline, lifeAreaId, tags, pinned
    };

    const hasChanges = Object.keys(currentData).some(key => {
      if (key === 'tags') {
        return JSON.stringify(currentData.tags) !== JSON.stringify(lastSavedRef.current.tags);
      }
      return currentData[key] !== lastSavedRef.current[key];
    });

    if (!hasChanges && !isNewProject) {
      setSaveStatus('saved');
      return;
    }

    setSaveStatus('saving');
    try {
      const data = {
        title,
        description,
        outcome,
        status,
        priority,
        deadline: deadline || null,
        lifeAreaId: lifeAreaId || null,
        tags,
        pinned
      };

      if (isNewProject) {
        const result = await createProject.mutateAsync(data);
        toast.success('Project created');
        closeProject();
        return;
      } else {
        await updateProject.mutateAsync({ id: projectId, data });
      }

      lastSavedRef.current = currentData;
      setSaveStatus('saved');
      setLastSaved(new Date());

      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    } catch (err) {
      console.error('Failed to save:', err);
      setSaveStatus('error');
      toast.error(err.message || 'Failed to save project');

      if (!isNewProject) {
        retryTimeoutRef.current = setTimeout(() => {
          saveProject();
        }, 5000);
      }
    }
  }, [projectId, isNewProject, title, description, outcome, status, priority, deadline, lifeAreaId, tags, pinned, createProject, updateProject, closeProject, toast]);

  // Debounced auto-save (only for existing projects)
  useEffect(() => {
    if (!projectId || !isOpen || isNewProject) return;

    const currentData = {
      title, description, outcome, status, priority,
      deadline, lifeAreaId, tags, pinned
    };

    const hasChanges = Object.keys(currentData).some(key => {
      if (key === 'tags') {
        return JSON.stringify(currentData.tags) !== JSON.stringify(lastSavedRef.current.tags);
      }
      return currentData[key] !== lastSavedRef.current[key];
    });

    if (hasChanges) {
      setSaveStatus('unsaved');

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveProject();
      }, 1500);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, description, outcome, status, priority, deadline, lifeAreaId, tags, pinned, projectId, isOpen, isNewProject, saveProject]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []);

  // Save on close if there are unsaved changes
  useEffect(() => {
    if (!isOpen && saveStatus === 'unsaved' && !isNewProject) {
      saveProject();
    }
  }, [isOpen, saveStatus, isNewProject, saveProject]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        closeProject();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveProject();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeProject, saveProject]);

  const handleDelete = async () => {
    await deleteProject.mutateAsync(projectId);
    toast.success('Project deleted');
    closeProject();
  };

  const handleCreate = () => {
    saveProject();
  };

  const handleLinkClick = (type) => {
    setLinkModalType(type);
  };

  const getLinkedIds = (type) => {
    if (!project) return [];
    if (type === 'notes') return project.linkedNoteIds || [];
    if (type === 'tasks') return project.linkedTaskIds || [];
    if (type === 'events') return project.linkedEventIds || [];
    return [];
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeProject}
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
                onClick={closeProject}
                className="p-1.5 hover:bg-bg rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </Tooltip>

            {!isLoading && !isNewProject && (
              <>
                <SaveStatus status={saveStatus} lastSaved={lastSaved} />
                <button
                  onClick={() => {
                    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                    saveProject();
                  }}
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
            {isNewProject && <span className="text-sm text-muted">New Project</span>}
          </div>

          <div className="flex items-center gap-1">
            {!isNewProject && (
              <>
                <Tooltip content={pinned ? "Unpin" : "Pin"} position="bottom">
                  <button
                    onClick={() => setPinned(!pinned)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      pinned ? 'text-primary bg-primary/10' : 'text-muted hover:text-primary hover:bg-primary/10'
                    }`}
                  >
                    {pinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
                  </button>
                </Tooltip>
                <Tooltip content="Delete Project" position="bottom">
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-muted hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </Tooltip>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        {isLoading && !isNewProject ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto">
              <div className="p-4">
                {/* Title */}
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Project title..."
                  className="w-full text-lg font-semibold px-3 py-2 bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted mb-4 text-text"
                  autoFocus={isNewProject}
                />

                {/* Status, Priority row */}
                <div className="flex flex-wrap items-center gap-2 mb-4 pb-4 border-b border-border">
                  <StatusDropdown value={status} onChange={setStatus} />
                  <PriorityDropdown value={priority} onChange={setPriority} />

                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-muted" />
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="bg-transparent border-none text-sm text-text focus:outline-none"
                      placeholder="Deadline"
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="mb-4">
                  <label className="block text-xs text-muted mb-1">Category</label>
                  <LifeAreaPicker
                    value={lifeAreaId}
                    onChange={setLifeAreaId}
                  />
                </div>

                {/* Outcome */}
                <div className="mb-4">
                  <label className="flex items-center gap-1.5 text-xs text-muted mb-1">
                    <Target className="w-3.5 h-3.5" />
                    Desired Outcome
                  </label>
                  <input
                    type="text"
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    placeholder="What does success look like?"
                    maxLength={500}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Description */}
                <div className="mb-4">
                  <label className="block text-xs text-muted mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Project details..."
                    rows={2}
                    className="w-full px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  />
                </div>

                {/* Progress (only for existing projects) */}
                {!isNewProject && project?.progress?.total > 0 && (
                  <div className="mb-4 p-3 bg-bg rounded-lg">
                    <ProjectProgress progress={project.progress} />
                  </div>
                )}
              </div>

              {/* Linked Items (only for existing projects) */}
              {!isNewProject && (
                <div className="border-t border-border">
                  <LinkedItemsSection
                    projectId={projectId}
                    type="notes"
                    items={project?.linkedNotes || []}
                    onLinkClick={handleLinkClick}
                  />
                  <LinkedItemsSection
                    projectId={projectId}
                    type="tasks"
                    items={project?.linkedTasks || []}
                    onLinkClick={handleLinkClick}
                  />
                  <LinkedItemsSection
                    projectId={projectId}
                    type="events"
                    items={project?.linkedEvents || []}
                    onLinkClick={handleLinkClick}
                  />
                </div>
              )}

              <TagsSection
                tags={tags}
                onChange={setTags}
              />

              {!isNewProject && (
                <CommentsSection
                  comments={project?.comments || []}
                  onAdd={(text) => addComment.mutate({ projectId, text })}
                  onUpdate={(commentId, text) => updateComment.mutate({ projectId, commentId, text })}
                  onDelete={(commentId) => deleteComment.mutate({ projectId, commentId })}
                  isAdding={addComment.isPending}
                  isUpdating={updateComment.isPending}
                  isDeleting={deleteComment.isPending}
                />
              )}
            </div>

            {/* Footer */}
            {isNewProject && (
              <div className="p-4 border-t border-border">
                <button
                  onClick={handleCreate}
                  disabled={!title.trim() || createProject.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {createProject.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Project'
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
        title="Delete Project"
        message="Are you sure you want to delete this project? Linked items will be unlinked but not deleted."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Link Item Modal */}
      {linkModalType && (
        <LinkItemModal
          projectId={projectId}
          linkedIds={getLinkedIds(linkModalType)}
          type={linkModalType}
          onClose={() => setLinkModalType(null)}
        />
      )}
    </>
  );
}

export default ProjectSlidePanel;
