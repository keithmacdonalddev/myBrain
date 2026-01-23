import { useState, useMemo } from 'react';
import {
  X,
  Search,
  StickyNote,
  CheckSquare,
  Calendar,
  Loader2,
  Check
} from 'lucide-react';
import { useNotes } from '../../notes/hooks/useNotes';
import { useTasks } from '../../tasks/hooks/useTasks';
import { useEvents } from '../../calendar/hooks/useEvents';
import {
  useLinkNote,
  useLinkTask,
  useLinkEvent
} from '../hooks/useProjects';
import useToast from '../../../hooks/useToast';

const TYPE_CONFIG = {
  notes: {
    icon: StickyNote,
    label: 'Notes',
    singularLabel: 'note',
  },
  tasks: {
    icon: CheckSquare,
    label: 'Tasks',
    singularLabel: 'task',
  },
  events: {
    icon: Calendar,
    label: 'Events',
    singularLabel: 'event',
  },
};

export function LinkItemModal({ projectId, linkedIds = [], type, onClose }) {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Fetch items based on type
  const { data: notesData, isLoading: notesLoading } = useNotes(
    { limit: 100 },
    { enabled: type === 'notes' }
  );
  const { data: tasksData, isLoading: tasksLoading } = useTasks(
    { limit: 100 },
    { enabled: type === 'tasks' }
  );
  const { data: eventsData, isLoading: eventsLoading } = useEvents(
    { limit: 100 },
    { enabled: type === 'events' }
  );

  // Link mutations
  const linkNote = useLinkNote();
  const linkTask = useLinkTask();
  const linkEvent = useLinkEvent();

  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  // Get items and filter out already linked ones
  const items = useMemo(() => {
    let allItems = [];
    if (type === 'notes') allItems = notesData?.notes || [];
    if (type === 'tasks') allItems = tasksData?.tasks || [];
    if (type === 'events') allItems = eventsData?.events || [];

    // Filter out already linked items
    const linkedSet = new Set(linkedIds);
    allItems = allItems.filter(item => !linkedSet.has(item._id));

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      allItems = allItems.filter(item =>
        item.title?.toLowerCase().includes(query) ||
        item.content?.toLowerCase().includes(query)
      );
    }

    return allItems;
  }, [type, notesData, tasksData, eventsData, linkedIds, searchQuery]);

  const isLoading = (type === 'notes' && notesLoading) ||
                    (type === 'tasks' && tasksLoading) ||
                    (type === 'events' && eventsLoading);

  const isLinking = linkNote.isPending || linkTask.isPending || linkEvent.isPending;

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleLink = async () => {
    if (selectedIds.size === 0) return;

    try {
      const promises = Array.from(selectedIds).map(id => {
        if (type === 'notes') return linkNote.mutateAsync({ projectId, noteId: id });
        if (type === 'tasks') return linkTask.mutateAsync({ projectId, taskId: id });
        if (type === 'events') return linkEvent.mutateAsync({ projectId, eventId: id });
      });

      await Promise.all(promises);
      toast.success(`${selectedIds.size} ${selectedIds.size === 1 ? config.singularLabel : config.label.toLowerCase()} linked`);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to link items');
    }
  };

  const getItemTitle = (item) => {
    return item.title || 'Untitled';
  };

  const getItemMeta = (item) => {
    if (type === 'tasks' && item.status) {
      const statusLabels = {
        todo: 'To Do',
        in_progress: 'In Progress',
        completed: 'Completed',
        cancelled: 'Cancelled',
      };
      return statusLabels[item.status] || item.status;
    }
    if (type === 'events' && item.startDate) {
      return new Date(item.startDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    if (type === 'notes' && item.updatedAt) {
      return `Updated ${new Date(item.updatedAt).toLocaleDateString()}`;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-panel glass-heavy border border-border rounded-xl shadow-theme-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-muted" />
            <h2 className="text-lg font-semibold text-text">
              Link {config.label}
            </h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-bg rounded">
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${config.label.toLowerCase()}...`}
              className="w-full pl-9 pr-4 py-2 bg-bg border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          </div>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Icon className="w-10 h-10 mx-auto text-muted/50 mb-2" />
              <p className="text-sm text-muted">
                {searchQuery ? `No ${config.label.toLowerCase()} match your search` : `No ${config.label.toLowerCase()} available to link`}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <button
                  key={item._id}
                  onClick={() => toggleSelect(item._id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    selectedIds.has(item._id)
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-bg border border-transparent'
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    selectedIds.has(item._id)
                      ? 'bg-primary border-primary'
                      : 'border-border'
                  }`}>
                    {selectedIds.has(item._id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text truncate">{getItemTitle(item)}</p>
                    {getItemMeta(item) && (
                      <p className="text-xs text-muted">{getItemMeta(item)}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between flex-shrink-0">
          <span className="text-sm text-muted">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted border border-border rounded-lg hover:bg-bg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLink}
              disabled={selectedIds.size === 0 || isLinking}
              className="px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLinking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Linking...
                </>
              ) : (
                `Link ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LinkItemModal;
