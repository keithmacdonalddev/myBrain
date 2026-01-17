import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  StickyNote,
  Plus,
  Clock,
  Pin,
  ArrowRight,
  FileText,
  Loader2
} from 'lucide-react';
import {
  useRecentNotes,
  usePinnedNotes,
  useLastOpenedNote,
  useCreateNote
} from '../notes/hooks/useNotes';

// Quick Capture Widget
function QuickCapture() {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const createNote = useCreateNote();

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await createNote.mutateAsync({
        title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
        body: content
      });
      setContent('');
      // Navigate to the new note for editing
      if (response.data?.note?._id) {
        navigate(`/app/notes/${response.data.note._id}`);
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSubmit();
    }
  };

  return (
    <div className="bg-panel border border-border rounded-lg p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Plus className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-medium text-text">Quick Capture</h3>
          <p className="text-xs text-muted">Jot down a quick thought</p>
        </div>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What's on your mind? (Ctrl+Enter to save)"
        className="w-full h-20 px-3 py-2 bg-bg border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-text text-sm placeholder:text-muted"
      />
      <button
        onClick={handleSubmit}
        disabled={!content.trim() || isSubmitting}
        className="mt-3 w-full py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Note'
        )}
      </button>
    </div>
  );
}

// Continue Section (Last Opened Note)
function ContinueSection() {
  const { data: lastNote, isLoading } = useLastOpenedNote();

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-5">
        <div className="h-16 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!lastNote) return null;

  return (
    <Link
      to={`/app/notes/${lastNote._id}`}
      className="block bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-5 hover:border-primary/40 transition-colors group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-primary font-medium mb-1">Continue where you left off</p>
            <h3 className="font-medium text-text">{lastNote.title || 'Untitled Note'}</h3>
            {lastNote.body && (
              <p className="text-sm text-muted mt-1 line-clamp-1">
                {lastNote.body.slice(0, 100)}
              </p>
            )}
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

// Recent Notes Section
function RecentNotesSection() {
  const { data: recentNotes, isLoading } = useRecentNotes(5);

  return (
    <div className="bg-panel border border-border rounded-lg p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
          <Clock className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h3 className="font-medium text-text">Recent Notes</h3>
          <p className="text-xs text-muted">Your latest activity</p>
        </div>
      </div>
      <div className="space-y-2">
        {isLoading ? (
          <div className="py-4 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted" />
          </div>
        ) : recentNotes?.length > 0 ? (
          recentNotes.map((note) => (
            <Link
              key={note._id}
              to={`/app/notes/${note._id}`}
              className="block p-2 -mx-2 rounded-lg hover:bg-bg transition-colors"
            >
              <p className="text-sm text-text truncate">{note.title || 'Untitled Note'}</p>
              <p className="text-xs text-muted mt-0.5">
                {new Date(note.updatedAt).toLocaleDateString()}
              </p>
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted py-4 text-center">
            No recent notes yet.
          </p>
        )}
      </div>
      <Link
        to="/app/notes"
        className="mt-3 block w-full py-2 text-center text-sm text-primary hover:underline"
      >
        View all notes
      </Link>
    </div>
  );
}

// Pinned Notes Section
function PinnedNotesSection() {
  const { data: pinnedNotes, isLoading } = usePinnedNotes();

  return (
    <div className="bg-panel border border-border rounded-lg p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-yellow-500/10 rounded-lg flex items-center justify-center">
          <Pin className="w-5 h-5 text-yellow-500" />
        </div>
        <div>
          <h3 className="font-medium text-text">Pinned Notes</h3>
          <p className="text-xs text-muted">Your important notes</p>
        </div>
      </div>
      <div className="space-y-2">
        {isLoading ? (
          <div className="py-4 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted" />
          </div>
        ) : pinnedNotes?.length > 0 ? (
          pinnedNotes.slice(0, 5).map((note) => (
            <Link
              key={note._id}
              to={`/app/notes/${note._id}`}
              className="block p-2 -mx-2 rounded-lg hover:bg-bg transition-colors"
            >
              <div className="flex items-center gap-2">
                <Pin className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                <p className="text-sm text-text truncate">{note.title || 'Untitled Note'}</p>
              </div>
              {note.tags?.length > 0 && (
                <div className="flex gap-1 mt-1 ml-5">
                  {note.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-xs px-1.5 py-0.5 bg-bg rounded text-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))
        ) : (
          <p className="text-sm text-muted py-4 text-center">
            No pinned notes yet.
          </p>
        )}
      </div>
      {pinnedNotes?.length > 5 && (
        <Link
          to="/app/notes?pinned=true"
          className="mt-3 block w-full py-2 text-center text-sm text-primary hover:underline"
        >
          View all {pinnedNotes.length} pinned
        </Link>
      )}
    </div>
  );
}

function DashboardPage() {
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Welcome section */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-text">
          Welcome back, {user?.email?.split('@')[0]}!
        </h1>
        <p className="text-muted mt-1">Here's what's happening in your brain today.</p>
      </div>

      {/* Continue Section */}
      <div className="mb-6">
        <ContinueSection />
      </div>

      {/* Quick actions grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <QuickCapture />
        <RecentNotesSection />
        <PinnedNotesSection />
      </div>

      {/* Getting Started section */}
      <div className="bg-panel border border-border rounded-lg p-6">
        <h2 className="font-semibold text-text mb-4">Getting Started</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/app/notes"
            className="flex items-center gap-3 p-4 bg-bg rounded-lg border border-border hover:border-primary/50 transition-colors"
          >
            <StickyNote className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-text">Create a note</p>
              <p className="text-xs text-muted">Start capturing ideas</p>
            </div>
          </Link>

          <div className="flex items-center gap-3 p-4 bg-bg rounded-lg border border-border opacity-60">
            <div className="w-5 h-5 bg-muted/20 rounded" />
            <div>
              <p className="text-sm font-medium text-text">Build a workflow</p>
              <p className="text-xs text-muted">Coming soon</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-bg rounded-lg border border-border opacity-60">
            <div className="w-5 h-5 bg-muted/20 rounded" />
            <div>
              <p className="text-sm font-medium text-text">Track fitness</p>
              <p className="text-xs text-muted">Coming soon</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-bg rounded-lg border border-border opacity-60">
            <div className="w-5 h-5 bg-muted/20 rounded" />
            <div>
              <p className="text-sm font-medium text-text">Explore KB</p>
              <p className="text-xs text-muted">Coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
