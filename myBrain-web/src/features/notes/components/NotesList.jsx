import { useState } from 'react';
import {
  Pin,
  Archive,
  Trash2,
  MoreHorizontal,
  Tag,
  ChevronRight,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { useNotes, usePinNote, useUnpinNote, useArchiveNote, useUnarchiveNote, useTrashNote, useRestoreNote, useDeleteNote } from '../hooks/useNotes';
import { useNotePanel } from '../../../contexts/NotePanelContext';
import useToast from '../../../hooks/useToast';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';

function NoteRow({ note, onAction, viewStatus, onOpenNote }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const isTrashed = note.status === 'trashed';
  const isArchived = note.status === 'archived';

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onAction('delete', note._id);
    setShowDeleteConfirm(false);
  };

  return (
    <div className="group relative">
      <button
        onClick={() => onOpenNote(note._id)}
        className={`w-full text-left p-4 bg-panel border rounded-lg transition-all shadow-theme-card hover:shadow-theme-elevated ${
          isTrashed
            ? 'border-danger/30 hover:border-danger/50'
            : 'border-border hover:border-primary/50'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {note.pinned && !isTrashed && (
                <Pin className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
              )}
              {isTrashed && (
                <Trash2 className="w-3.5 h-3.5 text-danger flex-shrink-0" />
              )}
              {isArchived && (
                <Archive className="w-3.5 h-3.5 text-muted flex-shrink-0" />
              )}
              <h3 className={`font-medium truncate ${isTrashed ? 'text-muted' : 'text-text'}`}>
                {note.title || 'Untitled note'}
              </h3>
            </div>
            {note.body && (
              <p className="text-sm text-muted mt-1 line-clamp-2">
                {note.body.substring(0, 150)}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-muted">
                {isTrashed && note.trashedAt
                  ? `Trashed ${formatDate(note.trashedAt)}`
                  : formatDate(note.updatedAt)
                }
              </span>
              {note.tags && note.tags.length > 0 && !isTrashed && (
                <div className="flex items-center gap-1">
                  <Tag className="w-3 h-3 text-muted" />
                  <span className="text-xs text-muted">
                    {note.tags.slice(0, 3).join(', ')}
                    {note.tags.length > 3 && ` +${note.tags.length - 3}`}
                  </span>
                </div>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>

      {/* Quick actions menu */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1.5 bg-bg border border-border rounded hover:bg-panel transition-colors"
        >
          <MoreHorizontal className="w-4 h-4 text-muted" />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full mt-1 w-44 bg-panel glass border border-border rounded-lg shadow-theme-floating z-20 py-1 animate-fade-in">
              {/* Actions for TRASHED notes */}
              {isTrashed && (
                <>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onAction('restore', note._id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restore
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-bg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Forever
                  </button>
                </>
              )}

              {/* Actions for ARCHIVED notes */}
              {isArchived && !isTrashed && (
                <>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onAction('unarchive', note._id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg transition-colors"
                  >
                    <Archive className="w-4 h-4" />
                    Unarchive
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onAction('trash', note._id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-bg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Move to Trash
                  </button>
                </>
              )}

              {/* Actions for ACTIVE notes */}
              {!isTrashed && !isArchived && (
                <>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onAction(note.pinned ? 'unpin' : 'pin', note._id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg transition-colors"
                  >
                    <Pin className="w-4 h-4" />
                    {note.pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onAction('archive', note._id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text hover:bg-bg transition-colors"
                  >
                    <Archive className="w-4 h-4" />
                    Archive
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onAction('trash', note._id);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-bg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Move to Trash
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-panel glass-heavy border border-border rounded-lg shadow-theme-2xl z-50 p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-danger/10 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-danger" />
              </div>
              <div>
                <h3 className="font-semibold text-text">Delete Forever?</h3>
                <p className="text-sm text-muted">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-muted mb-6">
              "{note.title || 'Untitled note'}" will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text hover:bg-bg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 bg-danger text-white rounded-lg text-sm hover:bg-danger/90 transition-colors"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NotesList({ filters = {}, onCreateNote }) {
  const { data, isLoading, error, refetch } = useNotes(filters);
  const { openNote } = useNotePanel();
  const pinNote = usePinNote();
  const unpinNote = useUnpinNote();
  const archiveNote = useArchiveNote();
  const unarchiveNote = useUnarchiveNote();
  const trashNote = useTrashNote();
  const restoreNote = useRestoreNote();
  const deleteNote = useDeleteNote();
  const toast = useToast();

  const handleAction = async (action, noteId) => {
    try {
      switch (action) {
        case 'pin':
          await pinNote.mutateAsync(noteId);
          toast.success('Note pinned');
          break;
        case 'unpin':
          await unpinNote.mutateAsync(noteId);
          toast.success('Note unpinned');
          break;
        case 'archive':
          await archiveNote.mutateAsync(noteId);
          toast.undo('Note archived', () => unarchiveNote.mutate(noteId));
          break;
        case 'unarchive':
          await unarchiveNote.mutateAsync(noteId);
          toast.success('Note restored from archive');
          break;
        case 'trash':
          await trashNote.mutateAsync(noteId);
          toast.undo('Note moved to trash', () => restoreNote.mutate(noteId));
          break;
        case 'restore':
          await restoreNote.mutateAsync(noteId);
          toast.success('Note restored');
          break;
        case 'delete':
          await deleteNote.mutateAsync(noteId);
          toast.success('Note permanently deleted');
          break;
      }
    } catch (err) {
      toast.error(`Failed to ${action} note`);
      console.error(`Failed to ${action} note:`, err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton.NoteCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return <EmptyState.Error message={error.message} onRetry={refetch} />;
  }

  const notes = data?.notes || [];

  if (notes.length === 0) {
    if (filters.q) {
      return <EmptyState.Search query={filters.q} />;
    }
    if (filters.status === 'archived') {
      return <EmptyState.Archived />;
    }
    if (filters.status === 'trashed') {
      return <EmptyState.Trash />;
    }
    return <EmptyState.Notes onCreateNote={onCreateNote} />;
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <NoteRow
          key={note._id}
          note={note}
          onAction={handleAction}
          viewStatus={filters.status}
          onOpenNote={openNote}
        />
      ))}
    </div>
  );
}

export default NotesList;
