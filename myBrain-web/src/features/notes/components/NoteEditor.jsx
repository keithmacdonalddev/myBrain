import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pin,
  Archive,
  Trash2,
  RotateCcw,
  MoreHorizontal,
  X,
  Check,
  Loader2,
  Cloud,
  CloudOff,
  AlertCircle,
  Save
} from 'lucide-react';
import { useNote, useUpdateNote, useCreateNote, usePinNote, useUnpinNote, useArchiveNote, useUnarchiveNote, useTrashNote, useRestoreNote, useDeleteNote } from '../hooks/useNotes';
import Tooltip from '../../../components/ui/Tooltip';
import TagsSection from '../../../components/shared/TagsSection';

// Enhanced save status indicator component
function SaveStatusIndicator({ status, lastSaved }) {
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

  // Update time ago every 10 seconds
  useEffect(() => {
    if (status === 'saved' && lastSaved) {
      const interval = setInterval(() => {
        setTimeAgo(getTimeAgo(lastSaved));
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [status, lastSaved]);

  // Update immediately when lastSaved changes
  useEffect(() => {
    setTimeAgo(getTimeAgo(lastSaved));
  }, [lastSaved]);

  return (
    <Tooltip
      content={
        status === 'saved' && lastSaved
          ? `Last saved ${lastSaved.toLocaleTimeString()}`
          : status === 'saving'
          ? 'Saving your changes...'
          : status === 'error'
          ? 'Failed to save. Will retry automatically.'
          : 'Changes will be saved automatically'
      }
      position="bottom"
    >
      <div className="flex items-center gap-1.5 text-sm cursor-default select-none">
        {status === 'saving' && (
          <>
            <div className="relative">
              <Cloud className="w-4 h-4 text-muted" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse-dot" />
              </div>
            </div>
            <span className="text-muted">Saving...</span>
          </>
        )}
        {status === 'saved' && (
          <>
            <Cloud className="w-4 h-4 text-success" />
            <span className="text-muted">Saved {timeAgo}</span>
          </>
        )}
        {status === 'unsaved' && (
          <>
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse-dot" />
            <span className="text-muted">Editing</span>
          </>
        )}
        {status === 'error' && (
          <>
            <CloudOff className="w-4 h-4 text-danger" />
            <span className="text-danger">Save failed</span>
          </>
        )}
      </div>
    </Tooltip>
  );
}

function NoteEditor({ noteId, isNew = false, onSave }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState([]);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'unsaved', 'error'
  const [lastSaved, setLastSaved] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  const saveTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const lastSavedRef = useRef({ title: '', body: '', tags: [] });

  const { data: note, isLoading } = useNote(isNew ? null : noteId);
  const updateNote = useUpdateNote();
  const createNote = useCreateNote();
  const pinNote = usePinNote();
  const unpinNote = useUnpinNote();
  const archiveNote = useArchiveNote();
  const unarchiveNote = useUnarchiveNote();
  const trashNote = useTrashNote();
  const restoreNote = useRestoreNote();
  const deleteNote = useDeleteNote();

  // Initialize form with note data
  useEffect(() => {
    if (note && !isNew) {
      setTitle(note.title || '');
      setBody(note.body || '');
      setTags(note.tags || []);
      lastSavedRef.current = {
        title: note.title || '',
        body: note.body || '',
        tags: note.tags || []
      };
      setLastSaved(new Date(note.updatedAt));
    }
  }, [note, isNew]);

  // Create new note (only when there's content)
  const createNewNote = useCallback(async () => {
    // Don't create if both title and body are empty
    const hasContent = title.trim() || body.trim();
    if (!hasContent) return;

    setSaveStatus('saving');
    try {
      const response = await createNote.mutateAsync({ title, body, tags });
      const newNoteId = response.data?.note?._id;
      if (newNoteId) {
        // Navigate to the created note (replaces current URL so back button works correctly)
        navigate(`/app/notes/${newNoteId}`, { replace: true });
      }
    } catch (err) {
      console.error('Failed to create note:', err);
      setSaveStatus('error');
    }
  }, [title, body, tags, createNote, navigate]);

  // Auto-save logic (for existing notes)
  const saveNote = useCallback(async () => {
    // For new notes, use createNewNote instead
    if (isNew) {
      createNewNote();
      return;
    }

    // Don't save if both title and body are empty (prevents "Untitled note" spam)
    const hasContent = title.trim() || body.trim();
    if (!hasContent) {
      setSaveStatus('saved');
      return;
    }

    const hasChanges =
      title !== lastSavedRef.current.title ||
      body !== lastSavedRef.current.body ||
      JSON.stringify(tags) !== JSON.stringify(lastSavedRef.current.tags);

    if (!hasChanges) {
      setSaveStatus('saved');
      return;
    }

    setSaveStatus('saving');
    try {
      await updateNote.mutateAsync({
        id: noteId,
        data: { title, body, tags }
      });
      lastSavedRef.current = { title, body, tags };
      setSaveStatus('saved');
      setLastSaved(new Date());

      // Clear any retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    } catch (err) {
      console.error('Failed to save:', err);
      setSaveStatus('error');

      // Retry after 5 seconds
      retryTimeoutRef.current = setTimeout(() => {
        saveNote();
      }, 5000);
    }
  }, [noteId, title, body, tags, isNew, updateNote, createNewNote]);

  // Debounced auto-save (for existing notes)
  useEffect(() => {
    if (isNew) return;

    const hasChanges =
      title !== lastSavedRef.current.title ||
      body !== lastSavedRef.current.body ||
      JSON.stringify(tags) !== JSON.stringify(lastSavedRef.current.tags);

    if (hasChanges) {
      setSaveStatus('unsaved');

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveNote();
      }, 2000); // Save after 2 seconds of inactivity
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, body, tags, isNew, saveNote]);

  // Debounced auto-create (for new notes - only when there's content)
  useEffect(() => {
    if (!isNew) return;

    const hasContent = title.trim() || body.trim();
    if (!hasContent) {
      setSaveStatus('saved');
      return;
    }

    setSaveStatus('unsaved');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      createNewNote();
    }, 2000); // Create note after 2 seconds of inactivity

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, body, tags, isNew, createNewNote]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);


  const handleAction = async (action) => {
    setShowMenu(false);
    try {
      switch (action) {
        case 'pin':
          await pinNote.mutateAsync(noteId);
          break;
        case 'unpin':
          await unpinNote.mutateAsync(noteId);
          break;
        case 'archive':
          await archiveNote.mutateAsync(noteId);
          navigate('/app/notes');
          break;
        case 'unarchive':
          await unarchiveNote.mutateAsync(noteId);
          break;
        case 'trash':
          await trashNote.mutateAsync(noteId);
          navigate('/app/notes');
          break;
        case 'restore':
          await restoreNote.mutateAsync(noteId);
          break;
        case 'delete':
          if (confirm('Permanently delete this note? This cannot be undone.')) {
            await deleteNote.mutateAsync(noteId);
            navigate('/app/notes');
          }
          break;
      }
    } catch (err) {
      console.error(`Failed to ${action}:`, err);
    }
  };

  // Keyboard shortcut for manual save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveNote();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveNote]);

  if (isLoading && !isNew) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const isPinned = note?.pinned;
  const isArchived = note?.status === 'archived';
  const isTrashed = note?.status === 'trashed';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Tooltip content="Back to notes" position="bottom">
            <button
              onClick={() => navigate('/app/notes')}
              className="p-2 hover:bg-bg rounded-lg transition-colors"
              aria-label="Back to notes"
            >
              <ArrowLeft className="w-5 h-5 text-muted" />
            </button>
          </Tooltip>

          {/* Save status indicator */}
          {isNew ? (
            <div className="flex items-center gap-1.5 text-sm text-muted">
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating note...</span>
                </>
              ) : saveStatus === 'unsaved' ? (
                <>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse-dot" />
                  <span>New note</span>
                </>
              ) : (
                <span className="text-muted/70">Start typing to create a note</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
              <button
                onClick={() => {
                  if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
                  saveNote();
                }}
                disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                className="px-2 py-1 text-xs bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              >
                {saveStatus === 'saving' ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                Save
              </button>
            </div>
          )}
        </div>

        {!isNew && (
          <div className="flex items-center gap-2">
            {isPinned && (
              <Tooltip content="This note is pinned" position="bottom">
                <Pin className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              </Tooltip>
            )}
            {isArchived && (
              <span className="text-xs bg-border px-2 py-0.5 rounded text-muted">Archived</span>
            )}
            {isTrashed && (
              <span className="text-xs bg-danger/20 px-2 py-0.5 rounded text-danger flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Trashed
              </span>
            )}

            <div className="relative">
              <Tooltip content="More options" position="bottom">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-bg rounded-lg transition-colors"
                  aria-label="Note options"
                  aria-expanded={showMenu}
                >
                  <MoreHorizontal className="w-5 h-5 text-muted" />
                </button>
              </Tooltip>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-panel border border-border rounded-lg shadow-lg z-20 py-1 animate-fade-in">
                    {!isTrashed && (
                      <>
                        <button
                          onClick={() => handleAction(isPinned ? 'unpin' : 'pin')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg transition-colors"
                        >
                          <Pin className="w-4 h-4" />
                          {isPinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button
                          onClick={() => handleAction(isArchived ? 'unarchive' : 'archive')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg transition-colors"
                        >
                          <Archive className="w-4 h-4" />
                          {isArchived ? 'Unarchive' : 'Archive'}
                        </button>
                        <button
                          onClick={() => handleAction('trash')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-bg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Move to Trash
                        </button>
                      </>
                    )}
                    {isTrashed && (
                      <>
                        <button
                          onClick={() => handleAction('restore')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Restore
                        </button>
                        <button
                          onClick={() => handleAction('delete')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-bg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Forever
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto p-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          disabled={isTrashed}
          aria-label="Note title"
          className="w-full text-2xl font-semibold text-text bg-transparent border-none focus:outline-none placeholder:text-muted mb-4"
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Start writing..."
          disabled={isTrashed}
          aria-label="Note content"
          className="w-full min-h-[300px] text-text bg-transparent border-none focus:outline-none placeholder:text-muted resize-none leading-relaxed"
        />
      </div>

      {/* Collapsible Tags Section */}
      {!isTrashed && (
        <TagsSection
          tags={tags}
          onChange={setTags}
          disabled={isTrashed}
        />
      )}
    </div>
  );
}

export default NoteEditor;
