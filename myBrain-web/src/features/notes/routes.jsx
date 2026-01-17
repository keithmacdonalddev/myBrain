import { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Filter, X, StickyNote, Archive, Trash2, Loader2, Command } from 'lucide-react';
import NotesList from './components/NotesList';
import NoteEditor from './components/NoteEditor';
import { useTags, useNotes } from './hooks/useNotes';
import Tooltip from '../../components/ui/Tooltip';

// Status tabs config
const STATUS_TABS = [
  { value: 'active', label: 'All Notes', icon: StickyNote },
  { value: 'archived', label: 'Archived', icon: Archive },
  { value: 'trashed', label: 'Trash', icon: Trash2 },
];

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Enhanced search input with instant feedback
function SearchInput({ value, onChange, isSearching, resultCount, totalCount }) {
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  // Keyboard shortcut: Ctrl/Cmd + K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Escape to clear and blur
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        if (value) {
          onChange('');
        } else {
          inputRef.current?.blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [value, onChange]);

  const showResultCount = value && !isSearching && resultCount !== undefined;

  return (
    <div className="relative flex-1">
      {/* Search icon or loading spinner */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2">
        {isSearching ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        ) : (
          <Search className={`w-4 h-4 transition-colors ${isFocused ? 'text-primary' : 'text-muted'}`} />
        )}
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Search notes..."
        aria-label="Search notes"
        className={`w-full pl-10 pr-24 py-2.5 bg-bg border rounded-lg text-sm transition-all
          ${isFocused
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-border hover:border-muted'
          }
          focus:outline-none text-text placeholder:text-muted`}
      />

      {/* Right side: result count, clear button, and keyboard hint */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {/* Result count */}
        {showResultCount && (
          <span className="text-xs text-muted whitespace-nowrap animate-fade-in">
            {resultCount === 0 ? 'No results' : `${resultCount} of ${totalCount}`}
          </span>
        )}

        {/* Clear button */}
        {value && (
          <button
            onClick={() => onChange('')}
            className="p-1 hover:bg-panel rounded transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4 text-muted hover:text-text" />
          </button>
        )}

        {/* Keyboard shortcut hint (only when not focused and no value) */}
        {!isFocused && !value && (
          <Tooltip content="Press Ctrl+K to search" position="bottom">
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-panel border border-border rounded text-[10px] text-muted">
              <Command className="w-3 h-3" />
              <span>K</span>
            </div>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

function NotesListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'active');
  const [selectedTags, setSelectedTags] = useState(
    searchParams.get('tags')?.split(',').filter(Boolean) || []
  );
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search query
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data: userTags = [] } = useTags();

  // Build filters for query
  const filters = {
    q: debouncedQuery,
    status,
    tags: selectedTags.join(','),
  };

  // Get notes data for search result count
  const { data: notesData, isLoading: isSearching, isFetching } = useNotes(filters);

  // Get total count (without search filter)
  const { data: totalData } = useNotes({ status, tags: selectedTags.join(',') });

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (status !== 'active') params.set('status', status);
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, status, selectedTags, setSearchParams]);

  const handleCreateNote = () => {
    // Navigate to new note page - note will only be created when user adds content
    navigate('/app/notes/new');
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

  const hasActiveFilters = debouncedQuery || selectedTags.length > 0 || status !== 'active';

  // Show searching state when query is different from debounced
  const isTyping = searchQuery !== debouncedQuery;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-text">Notes</h1>
          <Tooltip content="Create new note (Ctrl+N)" position="bottom">
            <button
              onClick={handleCreateNote}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Note
            </button>
          </Tooltip>
        </div>

        {/* Enhanced Search */}
        <div className="flex items-center gap-2">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            isSearching={isTyping || isFetching}
            resultCount={debouncedQuery ? notesData?.notes?.length : undefined}
            totalCount={totalData?.total}
          />
          <Tooltip content={showFilters ? 'Hide filters' : 'Show filters'} position="bottom">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 border rounded-lg transition-colors ${
                showFilters || selectedTags.length > 0
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-bg text-muted'
              }`}
              aria-expanded={showFilters}
              aria-label="Toggle filters"
            >
              <Filter className="w-5 h-5" />
              {selectedTags.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[10px] rounded-full flex items-center justify-center">
                  {selectedTags.length}
                </span>
              )}
            </button>
          </Tooltip>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-3 p-3 bg-bg rounded-lg border border-border animate-fade-in">
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
                <p className="text-sm text-muted">No tags yet. Add tags to your notes to filter by them.</p>
              ) : (
                userTags.map(({ tag, count }) => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`px-2.5 py-1 text-sm rounded-lg transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-primary text-white'
                        : 'bg-panel border border-border text-text hover:border-primary/50'
                    }`}
                  >
                    {tag}
                    <span className={`ml-1.5 ${selectedTags.includes(tag) ? 'text-white/70' : 'text-muted'}`}>
                      {count}
                    </span>
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

        {/* Active filters summary */}
        {hasActiveFilters && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted">
            <span>Showing:</span>
            {debouncedQuery && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">
                "{debouncedQuery}"
              </span>
            )}
            {selectedTags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-primary/10 text-primary rounded flex items-center gap-1">
                {tag}
                <button onClick={() => handleTagToggle(tag)} className="hover:text-primary/70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {status !== 'active' && (
              <span className="px-2 py-0.5 bg-muted/20 text-muted rounded">
                {status === 'archived' ? 'Archived' : 'Trash'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-auto p-4">
        <NotesList filters={filters} onCreateNote={handleCreateNote} />
      </div>
    </div>
  );
}

function NewNotePage() {
  return <NoteEditor isNew={true} />;
}

function NoteEditorPage() {
  const navigate = useNavigate();

  // Get noteId from URL - handle the case where we need to extract from path
  const path = window.location.pathname;
  const noteId = path.split('/app/notes/')[1];

  if (!noteId || noteId === 'new') {
    navigate('/app/notes');
    return null;
  }

  return <NoteEditor noteId={noteId} />;
}

function NotesRoutes() {
  return (
    <Routes>
      <Route index element={<NotesListPage />} />
      <Route path="new" element={<NewNotePage />} />
      <Route path=":id" element={<NoteEditorPage />} />
    </Routes>
  );
}

export default NotesRoutes;
