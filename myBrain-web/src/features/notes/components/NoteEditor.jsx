import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Pin,
  Archive,
  Trash2,
  RotateCcw,
  MoreHorizontal,
  Tag,
  X,
  Check,
  Loader2
} from 'lucide-react';
import { useNote, useUpdateNote, usePinNote, useUnpinNote, useArchiveNote, useUnarchiveNote, useTrashNote, useRestoreNote, useDeleteNote } from '../hooks/useNotes';

function NoteEditor({ noteId, isNew = false, onSave }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'unsaved'
  const [showMenu, setShowMenu] = useState(false);

  const saveTimeoutRef = useRef(null);
  const lastSavedRef = useRef({ title: '', body: '', tags: [] });

  const { data: note, isLoading } = useNote(isNew ? null : noteId);
  const updateNote = useUpdateNote();
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
    }
  }, [note, isNew]);

  // Auto-save logic
  const saveNote = useCallback(async () => {
    if (isNew) return;

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
    } catch (err) {
      console.error('Failed to save:', err);
      setSaveStatus('unsaved');
    }
  }, [noteId, title, body, tags, isNew, updateNote]);

  // Debounced auto-save
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

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleAddTag = () => {
    const newTag = tagInput.trim().toLowerCase();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
    }
    setTagInput('');
    setShowTagInput(false);
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

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
          <button
            onClick={() => navigate('/app/notes')}
            className="p-2 hover:bg-bg rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted" />
          </button>

          {/* Save status */}
          <div className="flex items-center gap-1.5 text-sm">
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="w-3.5 h-3.5 text-muted animate-spin" />
                <span className="text-muted">Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check className="w-3.5 h-3.5 text-success" />
                <span className="text-muted">Saved</span>
              </>
            )}
            {saveStatus === 'unsaved' && (
              <span className="text-muted">Unsaved changes</span>
            )}
          </div>
        </div>

        {!isNew && (
          <div className="flex items-center gap-2">
            {isPinned && (
              <Pin className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            )}
            {isArchived && (
              <span className="text-xs bg-border px-2 py-0.5 rounded text-muted">Archived</span>
            )}
            {isTrashed && (
              <span className="text-xs bg-danger/20 px-2 py-0.5 rounded text-danger">Trashed</span>
            )}

            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-bg rounded-lg transition-colors"
              >
                <MoreHorizontal className="w-5 h-5 text-muted" />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-panel border border-border rounded-lg shadow-lg z-20 py-1">
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
          className="w-full text-2xl font-semibold text-text bg-transparent border-none focus:outline-none placeholder:text-muted mb-4"
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Start writing..."
          disabled={isTrashed}
          className="w-full min-h-[300px] text-text bg-transparent border-none focus:outline-none placeholder:text-muted resize-none leading-relaxed"
        />
      </div>

      {/* Tags */}
      {!isTrashed && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="w-4 h-4 text-muted" />
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-sm rounded"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-primary/70"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {showTagInput ? (
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTag();
                  if (e.key === 'Escape') setShowTagInput(false);
                }}
                onBlur={handleAddTag}
                placeholder="Add tag..."
                autoFocus
                className="px-2 py-1 bg-bg border border-border rounded text-sm focus:outline-none focus:border-primary w-24"
              />
            ) : (
              <button
                onClick={() => setShowTagInput(true)}
                className="text-sm text-muted hover:text-text transition-colors"
              >
                + Add tag
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NoteEditor;
