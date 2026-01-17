import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Pin,
  Archive,
  Trash2,
  MoreHorizontal,
  Tag,
  ChevronRight
} from 'lucide-react';
import { useNotes, usePinNote, useUnpinNote, useArchiveNote, useUnarchiveNote, useTrashNote, useRestoreNote } from '../hooks/useNotes';
import useToast from '../../../hooks/useToast';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';

function NoteRow({ note, onAction }) {
  const [showMenu, setShowMenu] = useState(false);

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

  return (
    <div className="group relative">
      <Link
        to={`/app/notes/${note._id}`}
        className="block p-4 bg-panel border border-border rounded-lg hover:border-primary/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {note.pinned && (
                <Pin className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
              )}
              <h3 className="font-medium text-text truncate">
                {note.title || 'Untitled note'}
              </h3>
            </div>
            {note.body && (
              <p className="text-sm text-muted mt-1 line-clamp-2">
                {note.body.substring(0, 150)}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-muted">{formatDate(note.updatedAt)}</span>
              {note.tags && note.tags.length > 0 && (
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
      </Link>

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
            <div className="absolute right-0 top-full mt-1 w-40 bg-panel border border-border rounded-lg shadow-lg z-20 py-1">
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
                Trash
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function NotesList({ filters = {}, onCreateNote }) {
  const { data, isLoading, error, refetch } = useNotes(filters);
  const pinNote = usePinNote();
  const unpinNote = useUnpinNote();
  const archiveNote = useArchiveNote();
  const unarchiveNote = useUnarchiveNote();
  const trashNote = useTrashNote();
  const restoreNote = useRestoreNote();
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
        case 'trash':
          await trashNote.mutateAsync(noteId);
          toast.undo('Note moved to trash', () => restoreNote.mutate(noteId));
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
        <NoteRow key={note._id} note={note} onAction={handleAction} />
      ))}
    </div>
  );
}

export default NotesList;
