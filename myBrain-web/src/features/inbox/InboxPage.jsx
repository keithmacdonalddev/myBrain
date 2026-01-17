import { useState } from 'react';
import { Inbox, CheckSquare, StickyNote, ArrowRight, Check } from 'lucide-react';
import {
  useInboxNotes,
  useProcessNote,
  useConvertNoteToTask
} from '../notes/hooks/useNotes';
import { useNotePanel } from '../../contexts/NotePanelContext';
import { NotePanelProvider } from '../../contexts/NotePanelContext';
import NoteSlidePanel from '../../components/notes/NoteSlidePanel';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import Tooltip from '../../components/ui/Tooltip';

function InboxNoteRow({ note }) {
  const { openNote } = useNotePanel();
  const processNote = useProcessNote();
  const convertToTask = useConvertNoteToTask();

  const handleProcess = async (e) => {
    e.stopPropagation();
    await processNote.mutateAsync(note._id);
  };

  const handleConvertToTask = async (e) => {
    e.stopPropagation();
    await convertToTask.mutateAsync({ id: note._id, keepNote: true });
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div
      onClick={() => openNote(note._id)}
      className="group flex items-start gap-3 px-4 py-3 border-b border-border hover:bg-bg/50 cursor-pointer transition-colors"
    >
      <StickyNote className="w-5 h-5 text-muted flex-shrink-0 mt-0.5" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">
          {note.title || 'Untitled Note'}
        </p>
        {note.body && (
          <p className="text-xs text-muted mt-0.5 line-clamp-2">
            {note.body}
          </p>
        )}
        <p className="text-xs text-muted/70 mt-1">
          {timeAgo(note.createdAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip content="Convert to Task" position="left">
          <button
            onClick={handleConvertToTask}
            disabled={convertToTask.isPending}
            className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors text-muted hover:text-primary"
          >
            <CheckSquare className="w-4 h-4" />
          </button>
        </Tooltip>

        <Tooltip content="Mark as Processed" position="left">
          <button
            onClick={handleProcess}
            disabled={processNote.isPending}
            className="p-1.5 hover:bg-green-500/10 rounded-lg transition-colors text-muted hover:text-green-500"
          >
            <Check className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

function InboxContent() {
  const { data, isLoading, error } = useInboxNotes();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Inbox className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text">Inbox</h1>
            <p className="text-xs text-muted">
              {data?.total || 0} unprocessed note{data?.total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">
            Failed to load inbox
          </div>
        ) : !data?.notes?.length ? (
          <EmptyState
            icon={Inbox}
            title="Inbox Zero!"
            description="All caught up. Create a quick capture note to add items to your inbox."
          />
        ) : (
          <div>
            {data.notes.map((note) => (
              <InboxNoteRow key={note._id} note={note} />
            ))}
          </div>
        )}
      </div>

      {/* Helper text */}
      {data?.notes?.length > 0 && (
        <div className="px-4 py-3 border-t border-border bg-bg/50">
          <div className="flex items-center justify-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1">
              <Check className="w-3 h-3" /> Process = file away
            </span>
            <span className="flex items-center gap-1">
              <CheckSquare className="w-3 h-3" /> Convert = make actionable
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function InboxPage() {
  return (
    <NotePanelProvider>
      <InboxContent />
      <NoteSlidePanel />
    </NotePanelProvider>
  );
}

export default InboxPage;
