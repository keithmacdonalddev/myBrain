import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Search, Lightbulb } from 'lucide-react';
import SplitView from '../../../components/layout/SplitView';
import NotesCompactList from './NotesCompactList';
import NotesQuickLinks from './NotesQuickLinks';
import NoteEditor from './NoteEditor';
import { useNotes } from '../hooks/useNotes';
import { useNotePanel } from '../../../contexts/NotePanelContext';

export default function NotesSplitView() {
  const navigate = useNavigate();
  const { id: selectedNoteId } = useParams();
  const { openNewNote } = useNotePanel();
  const [quickFilter, setQuickFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Build filters
  const filters = {
    status: 'active',
    processed: 'true',
    ...(searchQuery && { q: searchQuery }),
    ...(quickFilter === 'pinned' && { pinned: 'true' }),
    ...(quickFilter === 'hasTasks' && { hasLinkedTasks: 'true' }),
  };

  const { data } = useNotes(filters);
  const notes = data?.notes || [];

  const pinnedCount = notes.filter(n => n.pinned).length;
  const hasTasksCount = notes.filter(n => n.linkedTasks?.length > 0).length;

  const handleSelectNote = (noteId) => {
    navigate(`/app/notes/${noteId}`);
  };

  const leftPanel = (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-text">Notes</span>
        </div>
        <button
          onClick={() => openNewNote()}
          className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-bg border border-border rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Quick filters */}
      <NotesQuickLinks
        activeFilter={quickFilter}
        onFilterChange={setQuickFilter}
        counts={{ all: notes.length, pinned: pinnedCount, hasTasks: hasTasksCount }}
      />

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto">
        <NotesCompactList
          notes={notes}
          selectedId={selectedNoteId}
          onSelectNote={handleSelectNote}
        />
      </div>
    </div>
  );

  const rightPanel = selectedNoteId ? (
    <NoteEditor noteId={selectedNoteId} embedded />
  ) : null;

  const emptyState = (
    <div className="flex-1 flex flex-col items-center justify-center text-muted p-8">
      <Lightbulb className="w-12 h-12 mb-4 opacity-30" />
      <p className="text-sm">Select a note to view</p>
      <p className="text-xs mt-1">or create a new one</p>
    </div>
  );

  return (
    <SplitView
      left={leftPanel}
      right={rightPanel}
      emptyState={emptyState}
      defaultLeftWidth={320}
      minLeftWidth={260}
      maxLeftWidth={450}
    />
  );
}
