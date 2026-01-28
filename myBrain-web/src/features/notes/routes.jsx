import { useState, useEffect, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Routes, Route, useNavigate, useSearchParams, useParams, useLocation } from 'react-router-dom';
import { usePageTracking } from '../../hooks/useAnalytics';
import {
  Plus,
  Search,
  Filter,
  X,
  StickyNote,
  Archive,
  Trash2,
  Loader2,
  Command,
  Pin,
  Tag,
  MoreHorizontal,
  ChevronRight,
  RotateCcw,
  AlertTriangle,
  FileText,
  CheckSquare,
  Calendar,
  FolderKanban,
  Lightbulb
} from 'lucide-react';
import { stripHtmlForPreview } from '../../lib/utils';
import NoteEditor from './components/NoteEditor';
import NotesSplitView from './components/NotesSplitView';
import {
  useTags,
  useNotes,
  usePinNote,
  useUnpinNote,
  useArchiveNote,
  useUnarchiveNote,
  useTrashNote,
  useRestoreNote,
  useDeleteNote,
  useConvertNoteToTask,
  useProcessNote
} from './hooks/useNotes';
// Note: NotePanelProvider and NoteSlidePanel are provided by AppShell
import { useNotePanel } from '../../contexts/NotePanelContext';
import { useTaskPanel } from '../../contexts/TaskPanelContext';
import { useProjectPanel } from '../../contexts/ProjectPanelContext';
import useToast from '../../hooks/useToast';
import Tooltip from '../../components/ui/Tooltip';
import EmptyState from '../../components/ui/EmptyState';
import TabNav from '../../components/ui/TabNav';
import MobilePageHeader from '../../components/layout/MobilePageHeader';
import { selectSelectedLifeAreaId } from '../../store/lifeAreasSlice';
import EventModal from '../calendar/components/EventModal';

// Status tabs config (using TabNav pill variant)
const STATUS_TABS = [
  { id: 'active', label: 'All Notes', icon: StickyNote },
  { id: 'archived', label: 'Archived', icon: Archive },
  { id: 'trashed', label: 'Trash', icon: Trash2 },
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

// Note Card Component
function NoteCard({ note, onAction, onOpenNote, onConvertToTask, onConvertToEvent, onConvertToProject }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isTrashed = note.status === 'trashed';
  const isArchived = note.status === 'archived';
  const isActive = !isTrashed && !isArchived;

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
      <div
        onClick={() => onOpenNote(note._id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onOpenNote(note._id)}
        className={`w-full text-left p-5 bg-panel border rounded-2xl transition-all h-full flex flex-col cursor-pointer ${
          isTrashed
            ? 'border-danger/30 hover:border-danger/50'
            : 'border-border hover:border-primary/50 hover:shadow-md'
        }`}
      >
        {/* Header with icon and title */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isTrashed ? 'bg-danger/10' : isArchived ? 'bg-muted/10' : note.pinned ? 'bg-yellow-500/10' : 'bg-primary/10'
          }`}>
            {isTrashed ? (
              <Trash2 className="w-4 h-4 text-danger" />
            ) : note.pinned ? (
              <Pin className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            ) : isArchived ? (
              <Archive className="w-4 h-4 text-muted" />
            ) : (
              <Lightbulb className="w-4 h-4 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-sm leading-snug line-clamp-2 ${isTrashed ? 'text-muted' : 'text-text'}`}>
              {note.title || 'Untitled note'}
            </h3>
          </div>
        </div>

        {/* Body preview - strip HTML for clean display */}
        {note.body && (
          <p className="text-sm text-muted line-clamp-3 flex-1 mb-3">
            {stripHtmlForPreview(note.body, 200)}
          </p>
        )}

        {/* Processing actions for active notes - notes must be acted upon */}
        {isActive && (
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            {/* Convert options */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConvertToTask?.(note);
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-bg border border-border rounded-lg text-muted hover:text-primary hover:border-primary/50 transition-colors"
              title="Convert to Task"
            >
              <CheckSquare className="w-3 h-3" />
              Task
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConvertToEvent?.(note);
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-bg border border-border rounded-lg text-muted hover:text-primary hover:border-primary/50 transition-colors"
              title="Convert to Event"
            >
              <Calendar className="w-3 h-3" />
              Event
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConvertToProject?.(note);
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-bg border border-border rounded-lg text-muted hover:text-primary hover:border-primary/50 transition-colors"
              title="Convert to Project"
            >
              <FolderKanban className="w-3 h-3" />
              Project
            </button>
            {/* Divider */}
            <span className="w-px h-4 bg-border mx-0.5" />
            {/* Archive - done developing but want to keep */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction('archive', note._id);
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-bg border border-border rounded-lg text-muted hover:text-warning hover:border-warning/50 transition-colors"
              title="Archive - keep but done"
            >
              <Archive className="w-3 h-3" />
              Archive
            </button>
            {/* Discard - not needed */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction('trash', note._id);
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-bg border border-border rounded-lg text-muted hover:text-danger hover:border-danger/50 transition-colors"
              title="Discard - not needed"
            >
              <Trash2 className="w-3 h-3" />
              Discard
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
          <span className="text-xs text-muted">
            {isTrashed && note.trashedAt
              ? `Trashed ${formatDate(note.trashedAt)}`
              : formatDate(note.updatedAt)
            }
          </span>

          {/* Tags */}
          {note.tags && note.tags.length > 0 && !isTrashed && (
            <div className="flex items-center gap-1">
              {note.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded"
                >
                  {tag}
                </span>
              ))}
              {note.tags.length > 2 && (
                <span className="text-[10px] text-muted">+{note.tags.length - 2}</span>
              )}
            </div>
          )}
        </div>

        {/* Hover arrow */}
        <ChevronRight className="absolute bottom-5 right-5 w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Quick actions menu button */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1.5 bg-bg border border-border rounded-lg hover:bg-panel transition-colors"
        >
          <MoreHorizontal className="w-4 h-4 text-muted" />
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-full mt-1 w-44 bg-panel glass border border-border rounded-xl shadow-theme-floating z-20 py-1 animate-fade-in overflow-hidden">
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
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-panel glass-heavy border border-border rounded-2xl shadow-theme-2xl z-50 p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-danger/10 rounded-xl flex items-center justify-center">
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
                className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm text-text hover:bg-bg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 bg-danger text-white rounded-xl text-sm hover:bg-danger/90 transition-colors"
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

// Notes Grid Component
function NotesGrid({ filters, onCreateNote, onConvertToEvent }) {
  const { data, isLoading, error, refetch } = useNotes(filters);
  const { openNote } = useNotePanel();
  const { openTask } = useTaskPanel();
  const { openNewProject } = useProjectPanel();
  const pinNote = usePinNote();
  const unpinNote = useUnpinNote();
  const archiveNote = useArchiveNote();
  const unarchiveNote = useUnarchiveNote();
  const trashNote = useTrashNote();
  const restoreNote = useRestoreNote();
  const deleteNote = useDeleteNote();
  const convertToTask = useConvertNoteToTask();
  const toast = useToast();

  // Convert note to task
  const handleConvertToTask = async (note) => {
    try {
      const response = await convertToTask.mutateAsync({
        id: note._id,
        keepNote: false,
      });
      toast.success('Converted to task');
      if (response?.data?.task?._id) {
        openTask(response.data.task._id);
      }
    } catch (err) {
      toast.error('Failed to convert to task');
      console.error('Convert to task error:', err);
    }
  };

  // Convert note to event (opens EventModal with prefilled data)
  const handleConvertToEvent = (note) => {
    onConvertToEvent?.(note);
  };

  // Convert note to project (opens ProjectSlidePanel)
  // Note: Currently opens blank panel - prefill support can be added later
  const handleConvertToProject = (note) => {
    toast.info('Opening new project - copy note content as needed');
    openNewProject();
  };

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-48 bg-panel border border-border rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-danger mb-4">Failed to load notes</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
        >
          Retry
        </button>
      </div>
    );
  }

  const notes = data?.notes || [];

  // Separate pinned and regular notes
  const pinnedNotes = notes.filter(n => n.pinned && n.status === 'active');
  const regularNotes = notes.filter(n => !n.pinned || n.status !== 'active');

  if (notes.length === 0) {
    if (filters.q) {
      return (
        <EmptyState
          icon={Search}
          title="No notes found"
          description={`No notes match "${filters.q}"`}
        />
      );
    }
    if (filters.status === 'archived') {
      return (
        <EmptyState
          icon={Archive}
          title="No archived notes"
          description="Archive notes you want to keep but don't need regularly. They're hidden from your main view but still searchable."
        />
      );
    }
    if (filters.status === 'trashed') {
      return (
        <EmptyState
          icon={Trash2}
          title="Trash is empty"
          description="Deleted notes stay here for 30 days before permanent removal. You can restore them anytime."
        />
      );
    }
    return (
      <div className="text-center py-12 max-w-md mx-auto">
        <Lightbulb className="w-16 h-16 mx-auto text-muted/30 mb-4" />
        <h3 className="text-lg font-medium text-text mb-2">All caught up!</h3>
        <div className="text-sm text-muted mb-6 space-y-2">
          <p>
            No notes awaiting action. Notes are <strong className="text-text">temporary</strong> —
            they should become tasks, events, projects, or be archived when done.
          </p>
          <p className="text-xs">
            Use Quick Capture on the dashboard or Inbox for new thoughts.
          </p>
        </div>
        <button
          onClick={onCreateNote}
          className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors flex items-center gap-2 mx-auto"
        >
          <Plus className="w-4 h-4" />
          Start a Note
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pinned notes section */}
      {pinnedNotes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Pin className="w-4 h-4 text-yellow-500" />
            <h2 className="text-sm font-semibold text-text">Pinned</h2>
            <span className="text-xs text-muted bg-panel2 px-2 py-0.5 rounded-full">{pinnedNotes.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedNotes.map((note) => (
              <NoteCard
                key={note._id}
                note={note}
                onAction={handleAction}
                onOpenNote={openNote}
                onConvertToTask={handleConvertToTask}
                onConvertToEvent={handleConvertToEvent}
                onConvertToProject={handleConvertToProject}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular notes */}
      {regularNotes.length > 0 && (
        <div>
          {pinnedNotes.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-muted" />
              <h2 className="text-sm font-semibold text-text">Awaiting Action</h2>
              <span className="text-xs text-muted bg-panel2 px-2 py-0.5 rounded-full">{regularNotes.length}</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularNotes.map((note) => (
              <NoteCard
                key={note._id}
                note={note}
                onAction={handleAction}
                onOpenNote={openNote}
                onConvertToTask={handleConvertToTask}
                onConvertToEvent={handleConvertToEvent}
                onConvertToProject={handleConvertToProject}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NotesListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const inputRef = useRef(null);
  const selectedLifeAreaId = useSelector(selectSelectedLifeAreaId);
  const { openNewNote } = useNotePanel();
  const processNote = useProcessNote();
  const toast = useToast();

  // Track page view
  usePageTracking();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'active');
  const [selectedTags, setSelectedTags] = useState(
    searchParams.get('tags')?.split(',').filter(Boolean) || []
  );
  const [showFilters, setShowFilters] = useState(false);

  // EventModal state for note → event conversion
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventModalData, setEventModalData] = useState(null);

  // Handle convert to event
  const handleConvertToEvent = (note) => {
    setEventModalData({
      title: note.title || stripHtmlForPreview(note.body, 50) || 'Untitled',
      description: note.body,
      sourceNoteId: note._id,
    });
    setShowEventModal(true);
  };

  // Handle event creation completion
  const handleEventCreated = async (newEventId) => {
    if (eventModalData?.sourceNoteId && newEventId) {
      try {
        await processNote.mutateAsync({
          id: eventModalData.sourceNoteId,
          convertedTo: { type: 'event', id: newEventId },
        });
        toast.success('Converted to event');
      } catch (err) {
        console.error('Failed to process source note:', err);
      }
    }
    setShowEventModal(false);
    setEventModalData(null);
  };

  // Debounce search query
  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data: userTags = [] } = useTags();

  // Build filters for query including life area filter
  // Notes page shows only processed notes (developing thoughts), not inbox items
  const filters = useMemo(() => {
    const params = {
      q: debouncedQuery,
      status,
      tags: selectedTags.join(','),
      processed: 'true', // Only show developing notes, not inbox items
    };
    if (selectedLifeAreaId) {
      params.lifeAreaId = selectedLifeAreaId;
    }
    return params;
  }, [debouncedQuery, status, selectedTags, selectedLifeAreaId]);

  // Get notes data for counts
  const { data: notesData, isFetching } = useNotes(filters);
  const { data: totalData } = useNotes({ status, tags: selectedTags.join(',') });

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (status !== 'active') params.set('status', status);
    if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, status, selectedTags, setSearchParams]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleCreateNote();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        if (searchQuery) {
          setSearchQuery('');
        } else {
          inputRef.current?.blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  const handleCreateNote = () => {
    openNewNote();
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

  const hasActiveFilters = debouncedQuery || selectedTags.length > 0;
  const isTyping = searchQuery !== debouncedQuery;

  return (
    <div className="h-full flex flex-col bg-bg">
      {/* Mobile Header */}
      <MobilePageHeader
        title="Developing"
        icon={Lightbulb}
        rightAction={
          <button
            onClick={handleCreateNote}
            className="p-2 text-primary hover:text-primary-hover transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Plus className="w-6 h-6" />
          </button>
        }
      />

      {/* Desktop Header */}
      <div className="hidden sm:block flex-shrink-0 p-6 pb-0">
        {/* Title row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text">Developing</h1>
              <p className="text-sm text-muted">
                Notes awaiting action — convert to task, event, project, or archive when done
              </p>
            </div>
          </div>
          <button
            onClick={handleCreateNote}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors"
            style={{ boxShadow: '0 0 20px var(--primary-glow)' }}
          >
            <Plus className="w-4 h-4" />
            New Note
          </button>
        </div>
      </div>

      {/* Search and filters - visible on all screen sizes */}
      <div className="flex-shrink-0 px-4 sm:px-6 pb-4 sm:pb-0">
        <div className="space-y-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            {/* Search input */}
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                {isTyping || isFetching ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-muted" />
                )}
              </div>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes... (Ctrl+K)"
                className="w-full pl-10 pr-20 py-2.5 bg-panel border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {debouncedQuery && notesData && (
                  <span className="text-xs text-muted">
                    {notesData.notes?.length || 0} result{notesData.notes?.length !== 1 ? 's' : ''}
                  </span>
                )}
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="p-1 hover:bg-bg rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-muted hover:text-text" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
                showFilters || selectedTags.length > 0
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-panel hover:bg-panel2 text-muted'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filter</span>
              {selectedTags.length > 0 && (
                <span className="w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                  {selectedTags.length}
                </span>
              )}
            </button>
          </div>

          {/* Tag filters */}
          {showFilters && (
            <div className="p-4 bg-panel border border-border rounded-xl animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted" />
                  <span className="text-sm font-medium text-text">Filter by tags</span>
                  <span className="text-xs text-muted">(categorize notes with keywords)</span>
                </div>
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
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-primary text-white'
                          : 'bg-bg hover:bg-panel2 text-text'
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
          <TabNav
            tabs={STATUS_TABS}
            activeTab={status}
            onTabChange={setStatus}
            variant="pill"
          />

          {/* Active filters summary */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted">Showing:</span>
              {debouncedQuery && (
                <span className="px-2.5 py-1 bg-primary/10 text-primary text-sm rounded-lg flex items-center gap-1">
                  "{debouncedQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:text-primary/70">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedTags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 bg-primary/10 text-primary text-sm rounded-lg flex items-center gap-1">
                  {tag}
                  <button onClick={() => handleTagToggle(tag)} className="hover:text-primary/70">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notes grid */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 pb-6">
        <NotesGrid
          filters={filters}
          onCreateNote={handleCreateNote}
          onConvertToEvent={handleConvertToEvent}
        />
      </div>

      {/* EventModal for note → event conversion */}
      {showEventModal && (
        <EventModal
          event={eventModalData}
          onClose={() => {
            setShowEventModal(false);
            setEventModalData(null);
          }}
          onCreated={handleEventCreated}
        />
      )}
    </div>
  );
}

function NewNotePage() {
  return <NoteEditor isNew={true} />;
}

function NoteEditorPage() {
  const navigate = useNavigate();

  const path = window.location.pathname;
  const noteId = path.split('/app/notes/')[1];

  if (!noteId || noteId === 'new') {
    navigate('/app/notes');
    return null;
  }

  return <NoteEditor noteId={noteId} />;
}

// Unified page component that shows split view on desktop, traditional nav on mobile
function NotesPage() {
  const { id } = useParams();
  const location = useLocation();
  const isNew = location.pathname.endsWith('/new');

  return (
    <>
      {/* Desktop: Split view */}
      <div className="hidden md:block h-full">
        <NotesSplitView />
      </div>

      {/* Mobile: Traditional page-based navigation */}
      <div className="md:hidden h-full">
        {isNew ? <NewNotePage /> : id ? <NoteEditorPage /> : <NotesListPage />}
      </div>
    </>
  );
}

// Note: NotePanelProvider and NoteSlidePanel are provided by AppShell
function NotesRoutes() {
  return (
    <Routes>
      <Route index element={<NotesPage />} />
      <Route path="new" element={<NotesPage />} />
      <Route path=":id" element={<NotesPage />} />
    </Routes>
  );
}

export default NotesRoutes;
