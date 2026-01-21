import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Pin,
  Archive,
  Trash2,
  RotateCcw,
  Loader2,
  AlertCircle,
  ExternalLink,
  CheckSquare,
  Save
} from 'lucide-react';
import TagsSection from '../shared/TagsSection';
import { LifeAreaPicker } from '../../features/lifeAreas/components/LifeAreaPicker';
import { ProjectPicker } from '../../features/projects/components/ProjectPicker';
import { useNavigate } from 'react-router-dom';
import {
  useNote,
  useCreateNote,
  useUpdateNote,
  usePinNote,
  useUnpinNote,
  useArchiveNote,
  useUnarchiveNote,
  useTrashNote,
  useRestoreNote,
  useDeleteNote,
  useConvertNoteToTask,
  useNoteBacklinks
} from '../../features/notes/hooks/useNotes';
import useToast from '../../hooks/useToast';
import { useNotePanel } from '../../contexts/NotePanelContext';
import { useTaskPanel } from '../../contexts/TaskPanelContext';
import Tooltip from '../ui/Tooltip';
import ConfirmDialog from '../ui/ConfirmDialog';
import BacklinksPanel from '../shared/BacklinksPanel';
import SaveStatus from '../ui/SaveStatus';
import useAutoSave, { createChangeDetector } from '../../hooks/useAutoSave';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';

// Change detector for note fields
const noteChangeDetector = createChangeDetector(['title', 'body', 'tags', 'lifeAreaId', 'projectId']);

function NoteSlidePanel() {
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, noteId, closeNote } = useNotePanel();
  const { openTask } = useTaskPanel();
  const isNewNote = !noteId;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState([]);
  const [lifeAreaId, setLifeAreaId] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPinAnimation, setShowPinAnimation] = useState(false);
  const [showArchiveAnimation, setShowArchiveAnimation] = useState(false);

  const { data: note, isLoading } = useNote(noteId, { enabled: !!noteId });
  const { data: backlinks, isLoading: backlinksLoading } = useNoteBacklinks(noteId);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const pinNote = usePinNote();
  const unpinNote = useUnpinNote();
  const archiveNote = useArchiveNote();
  const unarchiveNote = useUnarchiveNote();
  const trashNote = useTrashNote();
  const restoreNote = useRestoreNote();
  const deleteNoteM = useDeleteNote();
  const convertToTask = useConvertNoteToTask();

  // Current form data for auto-save
  const currentData = { title, body, tags, lifeAreaId, projectId };

  // Auto-save hook
  const {
    saveStatus,
    lastSaved,
    triggerSave,
    resetSaveState,
    setLastSavedData,
    setSaveStatus
  } = useAutoSave({
    id: noteId,
    currentData,
    isOpen,
    hasChanges: noteChangeDetector,
    onSave: async (data) => {
      await updateNote.mutateAsync({
        id: noteId,
        data: {
          title: data.title,
          body: data.body,
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
    onClose: closeNote,
    onSave: triggerSave,
  });

  // Initialize form with note data
  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setBody(note.body || '');
      setTags(note.tags || []);
      setLifeAreaId(note.lifeAreaId || null);
      setProjectId(note.projectId || null);
      setLastSavedData({
        title: note.title || '',
        body: note.body || '',
        tags: note.tags || [],
        lifeAreaId: note.lifeAreaId || null,
        projectId: note.projectId || null
      });
      resetSaveState({
        title: note.title || '',
        body: note.body || '',
        tags: note.tags || [],
        lifeAreaId: note.lifeAreaId || null,
        projectId: note.projectId || null
      });
    }
  }, [note, setLastSavedData, resetSaveState]);

  // Reset state when panel opens with new note
  useEffect(() => {
    if (isOpen && isNewNote) {
      setTitle('');
      setBody('');
      setTags([]);
      setLifeAreaId(null);
      setProjectId(null);
      resetSaveState({ title: '', body: '', tags: [], lifeAreaId: null, projectId: null });
    }
  }, [isOpen, isNewNote, resetSaveState]);

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setBody('');
      setTags([]);
      setLifeAreaId(null);
      setProjectId(null);
    }
  }, [isOpen]);

  // Create new note handler
  const handleCreateNote = async () => {
    if (!title.trim() && !body.trim()) return;

    setSaveStatus('saving');
    try {
      await createNote.mutateAsync({
        title: title || 'Untitled',
        body,
        tags,
        lifeAreaId: lifeAreaId || null,
        projectId: projectId || null
      });
      toast.success('Note created');
      closeNote();
    } catch (err) {
      console.error('Failed to create note:', err);
      setSaveStatus('error');
      toast.error(err.message || 'Failed to create note');
    }
  };

  const handleAction = async (action) => {
    try {
      switch (action) {
        case 'pin':
          setShowPinAnimation(true);
          setTimeout(() => setShowPinAnimation(false), 300);
          await pinNote.mutateAsync(noteId);
          break;
        case 'unpin':
          await unpinNote.mutateAsync(noteId);
          break;
        case 'archive':
          setShowArchiveAnimation(true);
          await archiveNote.mutateAsync(noteId);
          setTimeout(() => {
            setShowArchiveAnimation(false);
            closeNote();
          }, 200);
          break;
        case 'unarchive':
          await unarchiveNote.mutateAsync(noteId);
          break;
        case 'trash':
          await trashNote.mutateAsync(noteId);
          closeNote();
          break;
        case 'restore':
          await restoreNote.mutateAsync(noteId);
          break;
        case 'delete':
          setShowDeleteConfirm(true);
          return; // Don't close note yet, wait for confirmation
          break;
        case 'expand':
          closeNote();
          navigate(`/app/notes/${noteId}`);
          break;
        case 'convertToTask':
          const result = await convertToTask.mutateAsync({ id: noteId, keepNote: true });
          const taskId = result.data?.task?._id;
          closeNote();
          if (taskId) {
            openTask(taskId);
          }
          break;
      }
    } catch (err) {
      console.error(`Failed to ${action}:`, err);
    }
  };

  const isPinned = note?.pinned;
  const isArchived = note?.status === 'archived';
  const isTrashed = note?.status === 'trashed';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeNote}
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
                onClick={closeNote}
                className="p-2.5 sm:p-1.5 hover:bg-bg active:bg-bg/80 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5 text-muted" />
              </button>
            </Tooltip>

            {!isLoading && !isNewNote && (
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
            {isNewNote && <span className="text-sm text-muted">New Note</span>}
          </div>

          {!isNewNote && (
          <div className="flex items-center gap-0.5 sm:gap-1">
            {isArchived && (
              <span className="text-xs bg-border px-1.5 py-0.5 rounded text-muted mr-1 hidden sm:inline">Archived</span>
            )}
            {isTrashed && (
              <span className="text-xs bg-red-500/20 px-1.5 py-0.5 rounded text-red-500 flex items-center gap-1 mr-1">
                <AlertCircle className="w-3 h-3" />
                <span className="hidden sm:inline">Trashed</span>
              </span>
            )}

            {/* Direct action buttons */}
            {!isTrashed && (
              <>
                <Tooltip content={isPinned ? 'Unpin' : 'Pin'} position="bottom">
                  <button
                    onClick={() => handleAction(isPinned ? 'unpin' : 'pin')}
                    className={`p-2.5 sm:p-1.5 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                      isPinned ? 'bg-yellow-500/10 text-yellow-500' : 'hover:bg-bg active:bg-bg/80 text-muted hover:text-text'
                    }`}
                  >
                    <Pin className={`w-5 h-5 sm:w-4 sm:h-4 transition-transform ${isPinned ? 'fill-yellow-500' : ''} ${showPinAnimation ? 'animate-pin-in' : ''}`} />
                  </button>
                </Tooltip>

                <Tooltip content={isArchived ? 'Unarchive' : 'Archive'} position="bottom">
                  <button
                    onClick={() => handleAction(isArchived ? 'unarchive' : 'archive')}
                    className="p-2.5 sm:p-1.5 hover:bg-bg active:bg-bg/80 rounded-lg transition-colors text-muted hover:text-text min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Archive className={`w-5 h-5 sm:w-4 sm:h-4 transition-transform duration-200 ${showArchiveAnimation ? 'scale-90 opacity-50' : ''}`} />
                  </button>
                </Tooltip>

                <Tooltip content="Convert to Task" position="bottom">
                  <button
                    onClick={() => handleAction('convertToTask')}
                    className="p-2.5 sm:p-1.5 hover:bg-primary/10 active:bg-primary/20 rounded-lg transition-colors text-muted hover:text-primary min-h-[44px] min-w-[44px] flex items-center justify-center hidden sm:flex"
                  >
                    <CheckSquare className="w-5 h-5 sm:w-4 sm:h-4" />
                  </button>
                </Tooltip>

                <Tooltip content="Move to Trash" position="bottom">
                  <button
                    onClick={() => handleAction('trash')}
                    className="p-2.5 sm:p-1.5 hover:bg-red-500/10 active:bg-red-500/20 rounded-lg transition-colors text-muted hover:text-red-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                  </button>
                </Tooltip>
              </>
            )}

            {/* Trashed note actions */}
            {isTrashed && (
              <>
                <Tooltip content="Restore" position="bottom">
                  <button
                    onClick={() => handleAction('restore')}
                    className="p-2.5 sm:p-1.5 hover:bg-bg active:bg-bg/80 rounded-lg transition-colors text-muted hover:text-text min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <RotateCcw className="w-5 h-5 sm:w-4 sm:h-4" />
                  </button>
                </Tooltip>

                <Tooltip content="Delete Forever" position="bottom">
                  <button
                    onClick={() => handleAction('delete')}
                    className="p-2.5 sm:p-1.5 hover:bg-red-500/10 active:bg-red-500/20 rounded-lg transition-colors text-muted hover:text-red-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                  </button>
                </Tooltip>
              </>
            )}

            <div className="w-px h-5 bg-border mx-0.5 sm:mx-1 hidden sm:block" />

            <Tooltip content="Open full page" position="bottom">
              <button
                onClick={() => handleAction('expand')}
                className="p-2.5 sm:p-1.5 hover:bg-bg active:bg-bg/80 rounded-lg transition-colors text-muted hover:text-text min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ExternalLink className="w-5 h-5 sm:w-4 sm:h-4" />
              </button>
            </Tooltip>
          </div>
          )}
        </div>

        {/* Content */}
        {isLoading && !isNewNote ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto p-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note title..."
                disabled={isTrashed}
                autoFocus={isNewNote}
                className="w-full text-lg font-semibold text-text px-3 py-2 bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted mb-3"
              />

              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Start writing..."
                disabled={isTrashed}
                className="w-full min-h-[80px] px-3 py-2 bg-bg border border-border rounded-lg text-text text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none leading-relaxed"
              />

              {/* Category and Project pickers */}
              {!isTrashed && (
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
              )}

              <TagsSection
                tags={tags}
                onChange={setTags}
                disabled={isTrashed}
              />
            </div>

            {!isNewNote && (
              <BacklinksPanel
                backlinks={backlinks}
                isLoading={backlinksLoading}
                onNoteClick={(id) => {
                  closeNote();
                  // Navigate to the note page since we can't reopen the same panel
                  navigate(`/app/notes/${id}`);
                }}
                onTaskClick={(id) => {
                  closeNote();
                  navigate(`/app/tasks`);
                }}
              />
            )}

            {/* Footer */}
            {isNewNote && (
              <div className="p-4 border-t border-border">
                <button
                  onClick={handleCreateNote}
                  disabled={(!title.trim() && !body.trim()) || createNote.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg btn-interactive hover:bg-primary-hover disabled:opacity-50 disabled:transform-none min-h-[48px] text-sm font-medium"
                >
                  {createNote.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Note'
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
        onConfirm={async () => {
          await deleteNoteM.mutateAsync(noteId);
          closeNote();
        }}
        title="Delete Note"
        message="Are you sure you want to permanently delete this note? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}

export default NoteSlidePanel;
