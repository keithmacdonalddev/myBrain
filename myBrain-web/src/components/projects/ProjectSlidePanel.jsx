import { useState, useEffect } from 'react';
import {
  X,
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
import SaveStatus from '../ui/SaveStatus';
import useAutoSave, { createChangeDetector } from '../../hooks/useAutoSave';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';

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
          <div className="absolute top-full left-0 mt-1 bg-panel border border-border rounded-lg shadow-theme-floating z-20 py-1 min-w-[140px]">
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
          <div className="absolute top-full left-0 mt-1 bg-panel border border-border rounded-lg shadow-theme-floating z-20 py-1 min-w-[120px]">
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

// Change detector for project fields
const projectChangeDetector = createChangeDetector([
  'title', 'description', 'outcome', 'status', 'priority', 'deadline', 'lifeAreaId', 'tags', 'pinned'
]);

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [linkModalType, setLinkModalType] = useState(null);

  const { data: project, isLoading } = useProject(projectId, true);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const addComment = useAddProjectComment();
  const updateComment = useUpdateProjectComment();
  const deleteComment = useDeleteProjectComment();

  // Current form data for auto-save
  const currentData = { title, description, outcome, status, priority, deadline, lifeAreaId, tags, pinned };

  // Auto-save hook
  const {
    saveStatus,
    lastSaved,
    triggerSave,
    resetSaveState,
    setLastSavedData,
    setSaveStatus
  } = useAutoSave({
    id: projectId,
    currentData,
    isOpen,
    hasChanges: projectChangeDetector,
    onSave: async (data) => {
      await updateProject.mutateAsync({
        id: projectId,
        data: {
          title: data.title,
          description: data.description,
          outcome: data.outcome,
          status: data.status,
          priority: data.priority,
          deadline: data.deadline || null,
          lifeAreaId: data.lifeAreaId || null,
          tags: data.tags,
          pinned: data.pinned
        }
      });
    },
  });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    isOpen,
    onClose: closeProject,
    onSave: triggerSave,
  });

  // Initialize form with project data
  useEffect(() => {
    if (project) {
      const projectData = {
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
      setTitle(projectData.title);
      setDescription(projectData.description);
      setOutcome(projectData.outcome);
      setStatus(projectData.status);
      setPriority(projectData.priority);
      setDeadline(projectData.deadline);
      setLifeAreaId(projectData.lifeAreaId);
      setTags(projectData.tags);
      setPinned(projectData.pinned);
      setLastSavedData(projectData);
      resetSaveState(projectData);
    }
  }, [project, setLastSavedData, resetSaveState]);

  // Reset state when panel opens with new project
  useEffect(() => {
    if (isOpen && isNewProject) {
      const emptyData = {
        title: '', description: '', outcome: '', status: 'active', priority: 'medium',
        deadline: '', lifeAreaId: null, tags: [], pinned: false
      };
      setTitle('');
      setDescription('');
      setOutcome('');
      setStatus('active');
      setPriority('medium');
      setDeadline('');
      setLifeAreaId(null);
      setTags([]);
      setPinned(false);
      resetSaveState(emptyData);
    }
  }, [isOpen, isNewProject, resetSaveState]);

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
      setLinkModalType(null);
    }
  }, [isOpen]);

  // Handle create new project
  const handleCreate = async () => {
    if (!title.trim()) return;

    setSaveStatus('saving');
    try {
      await createProject.mutateAsync({
        title,
        description,
        outcome,
        status,
        priority,
        deadline: deadline || null,
        lifeAreaId: lifeAreaId || null,
        tags,
        pinned
      });
      toast.success('Project created');
      closeProject();
    } catch (err) {
      console.error('Failed to create project:', err);
      setSaveStatus('error');
      toast.error(err.message || 'Failed to create project');
    }
  };

  const handleDelete = async () => {
    await deleteProject.mutateAsync(projectId);
    toast.success('Project deleted');
    closeProject();
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
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-panel border-l border-border shadow-theme-2xl z-50 flex flex-col transition-transform duration-300 ease-out ${
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
