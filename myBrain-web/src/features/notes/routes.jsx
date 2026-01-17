import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, X, StickyNote, Archive, Trash2 } from 'lucide-react';
import NotesList from './components/NotesList';
import NoteEditor from './components/NoteEditor';
import { useCreateNote, useTags } from './hooks/useNotes';

// Status tabs config
const STATUS_TABS = [
  { value: 'active', label: 'All Notes', icon: StickyNote },
  { value: 'archived', label: 'Archived', icon: Archive },
  { value: 'trashed', label: 'Trash', icon: Trash2 },
];

function NotesListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'active');
  const [selectedTags, setSelectedTags] = useState(
    searchParams.get('tags')?.split(',').filter(Boolean) || []
  );
  const [showFilters, setShowFilters] = useState(false);

  const createNote = useCreateNote();
  const { data: userTags = [] } = useTags();

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (status !== 'active') params.set('status', status);
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
    setSearchParams(params, { replace: true });
  }, [searchQuery, status, selectedTags, setSearchParams]);

  // Build filters for query
  const filters = {
    q: searchQuery,
    status,
    tags: selectedTags.join(','),
  };

  const handleCreateNote = async () => {
    try {
      const response = await createNote.mutateAsync({
        title: '',
        body: '',
        tags: []
      });
      navigate(`/app/notes/${response.data.note._id}`);
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const handleTagToggle = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setStatus('active');
  };

  const hasActiveFilters = searchQuery || selectedTags.length > 0 || status !== 'active';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-text">Notes</h1>
          <button
            onClick={handleCreateNote}
            disabled={createNote.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            New Note
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted hover:text-text" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 border rounded-lg transition-colors ${
              showFilters || selectedTags.length > 0
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:bg-bg text-muted'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-3 p-3 bg-bg rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text">Filter by tags</span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-primary hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {userTags.length === 0 ? (
                <p className="text-sm text-muted">No tags yet</p>
              ) : (
                userTags.map(({ tag, count }) => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`px-2 py-1 text-sm rounded transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-primary text-white'
                        : 'bg-panel border border-border text-text hover:border-primary/50'
                    }`}
                  >
                    {tag} ({count})
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Status tabs */}
        <div className="flex items-center gap-1 mt-3">
          {STATUS_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                onClick={() => setStatus(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  status === tab.value
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted hover:bg-bg'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-auto p-4">
        <NotesList filters={filters} onCreateNote={handleCreateNote} />
      </div>
    </div>
  );
}

function NoteEditorPage() {
  const navigate = useNavigate();

  // Get noteId from URL - handle the case where we need to extract from path
  const path = window.location.pathname;
  const noteId = path.split('/app/notes/')[1];

  if (!noteId) {
    navigate('/app/notes');
    return null;
  }

  return <NoteEditor noteId={noteId} />;
}

function NotesRoutes() {
  return (
    <Routes>
      <Route index element={<NotesListPage />} />
      <Route path=":id" element={<NoteEditorPage />} />
    </Routes>
  );
}

export default NotesRoutes;
