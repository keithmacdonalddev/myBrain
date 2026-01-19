import { useState } from 'react';
import {
  Inbox,
  CheckSquare,
  StickyNote,
  Check,
  ChevronRight,
  Sparkles,
  ArrowRight,
  FileText,
  Loader2,
  Zap
} from 'lucide-react';
import MobilePageHeader from '../../components/layout/MobilePageHeader';
import {
  useInboxNotes,
  useProcessNote,
  useConvertNoteToTask
} from '../notes/hooks/useNotes';
import { useNotePanel, NotePanelProvider } from '../../contexts/NotePanelContext';
import { useTaskPanel, TaskPanelProvider } from '../../contexts/TaskPanelContext';
import NoteSlidePanel from '../../components/notes/NoteSlidePanel';
import TaskSlidePanel from '../../components/tasks/TaskSlidePanel';
import useToast from '../../hooks/useToast';
import { usePageTracking } from '../../hooks/useAnalytics';

// Inbox Note Card
function InboxNoteCard({ note, index }) {
  const { openNote } = useNotePanel();
  const { openTask } = useTaskPanel();
  const processNote = useProcessNote();
  const convertToTask = useConvertNoteToTask();
  const toast = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const handleProcess = async (e) => {
    e.stopPropagation();
    setIsProcessing(true);
    try {
      await processNote.mutateAsync(note._id);
      toast.success('Note processed');
    } catch (err) {
      toast.error('Failed to process note');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConvertToTask = async (e) => {
    e.stopPropagation();
    setIsConverting(true);
    try {
      const response = await convertToTask.mutateAsync({ id: note._id, keepNote: true });
      const taskId = response.data?.task?._id;
      toast.success('Converted to task');
      if (taskId) {
        openTask(taskId);
      }
    } catch (err) {
      toast.error('Failed to convert to task');
    } finally {
      setIsConverting(false);
    }
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
      className="group bg-panel border border-border rounded-2xl p-5 hover:border-primary/50 cursor-pointer transition-all hover:shadow-md animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text text-sm leading-snug line-clamp-1 mb-1">
            {note.title || 'Untitled Note'}
          </h3>
          {note.body && (
            <p className="text-sm text-muted line-clamp-2 mb-2">
              {note.body.substring(0, 150)}
            </p>
          )}
          <p className="text-xs text-muted/70">
            Added {timeAgo(note.createdAt)}
          </p>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
        <button
          onClick={handleConvertToTask}
          disabled={isConverting}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-bg border border-border rounded-xl text-sm text-text hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
        >
          {isConverting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckSquare className="w-4 h-4" />
          )}
          Convert to Task
        </button>
        <button
          onClick={handleProcess}
          disabled={isProcessing}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-success/10 border border-success/20 rounded-xl text-sm text-success hover:bg-success/20 transition-colors disabled:opacity-50"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Mark Done
        </button>
      </div>
    </div>
  );
}

// Empty State - Inbox Zero
function InboxZeroState() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-success/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-10 h-10 text-success" />
        </div>
        <h2 className="text-2xl font-bold text-text mb-2">Inbox Zero!</h2>
        <p className="text-muted mb-4">
          You've processed all your quick notes. Time to focus on what matters most.
        </p>
        <div className="text-sm text-muted/70 p-4 bg-panel border border-border rounded-xl mb-4">
          <strong className="text-muted">What's the Inbox?</strong> It's your capture zone for fleeting thoughts.
          Later, organize them into proper notes, tasks, or archive them as reference.
        </div>
        <div className="flex items-center justify-center gap-2 text-sm text-muted">
          <Zap className="w-4 h-4 text-warning" />
          <span>Pro tip: Use Quick Note on the dashboard to capture ideas fast</span>
        </div>
      </div>
    </div>
  );
}

// Progress Header
function ProgressHeader({ total, processed }) {
  const remaining = total;
  const percentage = total > 0 ? Math.round(((processed) / (processed + total)) * 100) : 100;

  return (
    <div className="flex-shrink-0 p-4 sm:p-6 pb-0">
      {/* Desktop Title Row */}
      <div className="hidden sm:flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Inbox className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-text">Inbox</h1>
            <p className="text-sm text-muted">
              {remaining > 0
                ? `${remaining} item${remaining !== 1 ? 's' : ''} to process`
                : 'Quick captures waiting to be organized'
              }
            </p>
          </div>
        </div>

        {/* Stats */}
        {remaining > 0 && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-text">{remaining}</div>
              <div className="text-xs text-muted">Remaining</div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile subtitle */}
      <p className="sm:hidden text-sm text-muted mb-4">
        {remaining > 0
          ? `${remaining} item${remaining !== 1 ? 's' : ''} to process`
          : 'Quick captures waiting to be organized'
        }
      </p>

      {/* Progress bar */}
      {remaining > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-muted mb-2">
            <span>Progress</span>
            <span>{percentage}% complete</span>
          </div>
          <div className="h-2 bg-panel border border-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Helper tips */}
      {remaining > 0 && (
        <div className="flex items-center gap-6 p-4 bg-panel border border-border rounded-xl mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-bg rounded-lg flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-sm font-medium text-text">Convert to Task</div>
              <div className="text-xs text-muted">Make it actionable</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-bg rounded-lg flex items-center justify-center">
              <Check className="w-4 h-4 text-success" />
            </div>
            <div>
              <div className="text-sm font-medium text-text">Mark Done</div>
              <div className="text-xs text-muted">Archive as reference</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InboxContent() {
  const { data, isLoading, error } = useInboxNotes();

  // Track page view
  usePageTracking();

  return (
    <div className="h-full flex flex-col bg-bg">
      {/* Mobile Header */}
      <MobilePageHeader title="Inbox" icon={Inbox} />

      <ProgressHeader
        total={data?.total || 0}
        processed={0}
      />

      {/* Notes list */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 pb-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 bg-panel border border-border rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-danger">Failed to load inbox</p>
          </div>
        ) : !data?.notes?.length ? (
          <InboxZeroState />
        ) : (
          <div className="space-y-4">
            {data.notes.map((note, index) => (
              <InboxNoteCard key={note._id} note={note} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InboxPage() {
  return (
    <NotePanelProvider>
      <TaskPanelProvider>
        <InboxContent />
        <NoteSlidePanel />
        <TaskSlidePanel />
      </TaskPanelProvider>
    </NotePanelProvider>
  );
}

export default InboxPage;
