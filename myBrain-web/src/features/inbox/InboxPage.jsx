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
  Zap,
  Calendar,
  FolderKanban,
  Lightbulb,
  Trash2,
  Keyboard
} from 'lucide-react';
import MobilePageHeader from '../../components/layout/MobilePageHeader';
import {
  useInboxNotes,
  useProcessNote,
  useConvertNoteToTask,
  useTrashNote
} from '../notes/hooks/useNotes';
import { useNotePanel } from '../../contexts/NotePanelContext';
import { useTaskPanel } from '../../contexts/TaskPanelContext';
import { useProjectPanel } from '../../contexts/ProjectPanelContext';
import EventModal from '../calendar/components/EventModal';
import useToast from '../../hooks/useToast';
import { usePageTracking } from '../../hooks/useAnalytics';
import { stripHtmlForPreview } from '../../lib/utils';

// Inbox Note Card
function InboxNoteCard({ note, index, onConvertToEvent }) {
  const { openNote } = useNotePanel();
  const { openTask } = useTaskPanel();
  const { openNewProject } = useProjectPanel();
  const processNote = useProcessNote();
  const convertToTask = useConvertNoteToTask();
  const trashNote = useTrashNote();
  const toast = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  // Keep as Note - mark as processed (moves to Developing)
  const handleKeepAsNote = async (e) => {
    e.stopPropagation();
    setIsProcessing(true);
    try {
      await processNote.mutateAsync(note._id);
      toast.success('Moved to Developing');
    } catch (err) {
      toast.error('Failed to process note');
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert to Task
  const handleConvertToTask = async (e) => {
    e.stopPropagation();
    setIsConverting(true);
    try {
      const response = await convertToTask.mutateAsync({ id: note._id, keepNote: false });
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

  // Convert to Event
  const handleConvertToEvent = (e) => {
    e.stopPropagation();
    onConvertToEvent?.(note);
  };

  // Convert to Project
  const handleConvertToProject = (e) => {
    e.stopPropagation();
    toast.info('Opening new project');
    openNewProject();
  };

  // Discard - move to trash
  const handleDiscard = async (e) => {
    e.stopPropagation();
    setIsDiscarding(true);
    try {
      await trashNote.mutateAsync(note._id);
      toast.success('Note discarded');
    } catch (err) {
      toast.error('Failed to discard note');
    } finally {
      setIsDiscarding(false);
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
      className="group rounded-2xl cursor-pointer transition-all animate-fade-in"
      style={{
        animationDelay: `${index * 50}ms`,
        backgroundColor: 'var(--v2-bg-surface)',
        border: '1px solid var(--v2-border-default)',
        padding: 'var(--v2-spacing-lg)',
      }}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: 'var(--v2-blue-light)',
          }}
        >
          <FileText className="w-5 h-5" style={{ color: 'var(--v2-blue)' }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-sm leading-snug line-clamp-1 mb-1"
            style={{ color: 'var(--v2-text-primary)' }}
          >
            {note.title || 'Untitled Note'}
          </h3>
          {note.body && (
            <p
              className="text-sm line-clamp-2 mb-2"
              style={{ color: 'var(--v2-text-secondary)' }}
            >
              {note.body.substring(0, 150)}
            </p>
          )}
          <p
            className="text-xs"
            style={{ color: 'var(--v2-text-tertiary)' }}
          >
            Added {timeAgo(note.createdAt)}
          </p>
        </div>

        {/* Arrow */}
        <ChevronRight
          className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          style={{ color: 'var(--v2-text-tertiary)' }}
        />
      </div>

      {/* Actions - Two rows */}
      <div
        className="mt-4 pt-4 space-y-2"
        style={{
          borderTop: '1px solid var(--v2-border-default)',
        }}
      >
        {/* Row 1: Convert options */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleConvertToTask}
            disabled={isConverting}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--v2-bg-tertiary)',
              border: '1px solid var(--v2-border-default)',
              color: 'var(--v2-text-primary)',
            }}
            title="Convert to Task"
          >
            {isConverting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckSquare className="w-3.5 h-3.5" />
            )}
            Task
          </button>
          <button
            onClick={handleConvertToEvent}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs transition-colors"
            style={{
              backgroundColor: 'var(--v2-bg-tertiary)',
              border: '1px solid var(--v2-border-default)',
              color: 'var(--v2-text-primary)',
            }}
            title="Convert to Event"
          >
            <Calendar className="w-3.5 h-3.5" />
            Event
          </button>
          <button
            onClick={handleConvertToProject}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs transition-colors"
            style={{
              backgroundColor: 'var(--v2-bg-tertiary)',
              border: '1px solid var(--v2-border-default)',
              color: 'var(--v2-text-primary)',
            }}
            title="Convert to Project"
          >
            <FolderKanban className="w-3.5 h-3.5" />
            Project
          </button>
        </div>
        {/* Row 2: Keep or Discard */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleKeepAsNote}
            disabled={isProcessing}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--v2-blue-light)',
              border: '1px solid var(--v2-blue)',
              color: 'var(--v2-blue)',
            }}
            title="Keep as a developing note"
          >
            {isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Lightbulb className="w-3.5 h-3.5" />
            )}
            Keep as Note
          </button>
          <button
            onClick={handleDiscard}
            disabled={isDiscarding}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--v2-red-light)',
              border: '1px solid var(--v2-red)',
              color: 'var(--v2-red)',
            }}
            title="Discard this capture"
          >
            {isDiscarding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}

// Empty State - Inbox Zero
function InboxZeroState() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{
            backgroundColor: 'var(--v2-green-light)',
          }}
        >
          <Sparkles className="w-10 h-10" style={{ color: 'var(--v2-green)' }} />
        </div>
        <h2
          className="text-2xl font-bold mb-2"
          style={{ color: 'var(--v2-text-primary)' }}
        >
          Inbox Zero!
        </h2>
        <p
          className="mb-4"
          style={{ color: 'var(--v2-text-secondary)' }}
        >
          You've processed all your quick notes. Time to focus on what matters most.
        </p>
        <div
          className="text-sm p-4 rounded-xl mb-4"
          style={{
            backgroundColor: 'var(--v2-bg-surface)',
            border: '1px solid var(--v2-border-default)',
            color: 'var(--v2-text-secondary)',
          }}
        >
          <strong style={{ color: 'var(--v2-text-secondary)' }}>What's the Inbox?</strong> It's your capture zone for fleeting thoughts.
          Later, organize them into proper notes, tasks, or archive them as reference.
        </div>
        <div className="flex flex-col items-center gap-3 text-sm" style={{ color: 'var(--v2-text-secondary)' }}>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: 'var(--v2-orange)' }} />
            <span>Pro tip: Use Quick Note on the dashboard to capture ideas fast</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--v2-text-tertiary)' }}>
            <Keyboard className="w-3 h-3" />
            <span>
              Or press{' '}
              <kbd
                className="px-1 py-0.5 rounded text-[10px]"
                style={{
                  backgroundColor: 'var(--v2-bg-surface)',
                  border: '1px solid var(--v2-border-default)',
                  color: 'var(--v2-text-primary)',
                }}
              >
                Ctrl
              </kbd>
              {' + '}
              <kbd
                className="px-1 py-0.5 rounded text-[10px]"
                style={{
                  backgroundColor: 'var(--v2-bg-surface)',
                  border: '1px solid var(--v2-border-default)',
                  color: 'var(--v2-text-primary)',
                }}
              >
                Shift
              </kbd>
              {' + '}
              <kbd
                className="px-1 py-0.5 rounded text-[10px]"
                style={{
                  backgroundColor: 'var(--v2-bg-surface)',
                  border: '1px solid var(--v2-border-default)',
                  color: 'var(--v2-text-primary)',
                }}
              >
                Space
              </kbd>
              {' '}from anywhere
            </span>
          </div>
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
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: 'var(--v2-blue-light)',
            }}
          >
            <Inbox className="w-5 h-5" style={{ color: 'var(--v2-blue)' }} />
          </div>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--v2-text-primary)' }}>Inbox</h1>
            <p className="text-sm" style={{ color: 'var(--v2-text-secondary)' }}>
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
              <div className="text-2xl font-bold" style={{ color: 'var(--v2-text-primary)' }}>{remaining}</div>
              <div className="text-xs" style={{ color: 'var(--v2-text-secondary)' }}>Remaining</div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile subtitle */}
      <p className="sm:hidden text-sm mb-4" style={{ color: 'var(--v2-text-secondary)' }}>
        {remaining > 0
          ? `${remaining} item${remaining !== 1 ? 's' : ''} to process`
          : 'Quick captures waiting to be organized'
        }
      </p>

      {/* Progress bar */}
      {remaining > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs mb-2" style={{ color: 'var(--v2-text-secondary)' }}>
            <span>Progress</span>
            <span>{percentage}% complete</span>
          </div>
          <div
            className="h-2 border rounded-full overflow-hidden"
            style={{
              backgroundColor: 'var(--v2-bg-tertiary)',
              borderColor: 'var(--v2-border-default)',
            }}
          >
            <div
              className="h-full bg-gradient-to-r rounded-full transition-all duration-500"
              style={{
                backgroundImage: 'linear-gradient(to right, var(--v2-blue), var(--v2-green))',
                width: `${percentage}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Helper tips */}
      {remaining > 0 && (
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl mb-6"
          style={{
            backgroundColor: 'var(--v2-bg-surface)',
            border: '1px solid var(--v2-border-default)',
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: 'var(--v2-bg-tertiary)',
              }}
            >
              <CheckSquare className="w-3.5 h-3.5" style={{ color: 'var(--v2-blue)' }} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: 'var(--v2-text-primary)' }}>Task</div>
              <div className="text-[10px] truncate" style={{ color: 'var(--v2-text-secondary)' }}>Make actionable</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: 'var(--v2-bg-tertiary)',
              }}
            >
              <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--v2-blue)' }} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: 'var(--v2-text-primary)' }}>Event</div>
              <div className="text-[10px] truncate" style={{ color: 'var(--v2-text-secondary)' }}>Schedule it</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: 'var(--v2-bg-tertiary)',
              }}
            >
              <Lightbulb className="w-3.5 h-3.5" style={{ color: 'var(--v2-blue)' }} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: 'var(--v2-text-primary)' }}>Keep Note</div>
              <div className="text-[10px] truncate" style={{ color: 'var(--v2-text-secondary)' }}>Develop further</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: 'var(--v2-bg-tertiary)',
              }}
            >
              <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--v2-red)' }} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: 'var(--v2-text-primary)' }}>Discard</div>
              <div className="text-[10px] truncate" style={{ color: 'var(--v2-text-secondary)' }}>Not needed</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InboxContent() {
  const { data, isLoading, error } = useInboxNotes();
  const processNote = useProcessNote();
  const toast = useToast();

  // EventModal state for note → event conversion
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventModalData, setEventModalData] = useState(null);

  // Track page view
  usePageTracking();

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

  return (
    <div
      className="h-full flex flex-col"
      style={{
        backgroundColor: 'var(--v2-bg-primary)',
      }}
    >
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
              <div
                key={i}
                className="h-40 rounded-2xl animate-pulse"
                style={{
                  backgroundColor: 'var(--v2-bg-surface)',
                  border: '1px solid var(--v2-border-default)',
                }}
              />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p style={{ color: 'var(--v2-red)' }}>Failed to load inbox</p>
          </div>
        ) : !data?.notes?.length ? (
          <InboxZeroState />
        ) : (
          <div className="space-y-4">
            {data.notes.map((note, index) => (
              <InboxNoteCard
                key={note._id}
                note={note}
                index={index}
                onConvertToEvent={handleConvertToEvent}
              />
            ))}
          </div>
        )}
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

// Note: NotePanelProvider, TaskPanelProvider, and ProjectPanelProvider are already
// provided by AppShell, so we don't need to wrap again here.
function InboxPage() {
  return <InboxContent />;
}

export default InboxPage;
