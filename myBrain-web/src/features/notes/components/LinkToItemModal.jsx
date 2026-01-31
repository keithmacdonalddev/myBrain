import { useState, useMemo } from 'react';
import {
  X,
  Search,
  FolderKanban,
  CheckSquare,
  Calendar,
  Loader2,
  Link2
} from 'lucide-react';
import { useProjects } from '../../projects/hooks/useProjects';
import { useTasks } from '../../tasks/hooks/useTasks';
import { useEvents } from '../../calendar/hooks/useEvents';
import { projectsApi, tasksApi, eventsApi } from '../../../lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { noteKeys } from '../hooks/useNotes';
import useToast from '../../../hooks/useToast';

const TYPE_CONFIG = {
  project: {
    icon: FolderKanban,
    label: 'Project',
    pluralLabel: 'Projects',
  },
  task: {
    icon: CheckSquare,
    label: 'Task',
    pluralLabel: 'Tasks',
  },
  event: {
    icon: Calendar,
    label: 'Event',
    pluralLabel: 'Events',
  },
};

export function LinkToItemModal({ noteId, noteTitle, type, onClose, onSuccess }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  // Fetch items based on type
  const { data: projectsData, isLoading: projectsLoading } = useProjects(
    { status: 'active', limit: 100 },
    { enabled: type === 'project' }
  );
  const { data: tasksData, isLoading: tasksLoading } = useTasks(
    { status: 'active', limit: 100 },
    { enabled: type === 'task' }
  );
  const { data: eventsData, isLoading: eventsLoading } = useEvents(
    { limit: 100 },
    { enabled: type === 'event' }
  );

  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  // Get items and filter
  const items = useMemo(() => {
    let allItems = [];
    if (type === 'project') allItems = projectsData?.projects || [];
    if (type === 'task') allItems = tasksData?.tasks || [];
    if (type === 'event') allItems = eventsData?.events || [];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      allItems = allItems.filter(item =>
        item.title?.toLowerCase().includes(query) ||
        item.name?.toLowerCase().includes(query)
      );
    }

    return allItems;
  }, [type, projectsData, tasksData, eventsData, searchQuery]);

  const isLoading = (type === 'project' && projectsLoading) ||
                    (type === 'task' && tasksLoading) ||
                    (type === 'event' && eventsLoading);

  const handleLink = async (itemId) => {
    setIsLinking(true);
    try {
      if (type === 'project') {
        await projectsApi.linkNote(itemId, noteId);
      } else if (type === 'task') {
        await tasksApi.linkNote(itemId, noteId);
      } else if (type === 'event') {
        await eventsApi.linkNote(itemId, noteId);
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: noteKeys.detail(noteId) });
      queryClient.invalidateQueries({ queryKey: noteKeys.backlinks(noteId) });

      toast.success(`Linked to ${config.label.toLowerCase()}`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.message || `Failed to link to ${config.label.toLowerCase()}`);
    } finally {
      setIsLinking(false);
    }
  };

  const getItemTitle = (item) => {
    return item.title || item.name || 'Untitled';
  };

  const getItemMeta = (item) => {
    if (type === 'task' && item.status) {
      const statusLabels = {
        todo: 'To Do',
        in_progress: 'In Progress',
        done: 'Done',
        cancelled: 'Cancelled',
      };
      return statusLabels[item.status] || item.status;
    }
    if (type === 'event' && item.startDate) {
      return new Date(item.startDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    if (type === 'project' && item.status) {
      return item.status.charAt(0).toUpperCase() + item.status.slice(1);
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
            <Link2 className="w-5 h-5 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-text">
                Link to {config.label}
              </h2>
              <p className="text-xs text-muted truncate max-w-[300px]">
                "{noteTitle || 'Untitled note'}"
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-bg rounded" aria-label="Close modal">
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
              placeholder={`Search ${config.pluralLabel.toLowerCase()}...`}
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
                {searchQuery ? `No ${config.pluralLabel.toLowerCase()} match your search` : `No ${config.pluralLabel.toLowerCase()} available`}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <button
                  key={item._id}
                  onClick={() => handleLink(item._id)}
                  disabled={isLinking}
                  className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-primary/10 border border-transparent hover:border-primary/30 disabled:opacity-50"
                  aria-label={`Link to ${getItemTitle(item)}`}
                >
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text truncate">{getItemTitle(item)}</p>
                    {getItemMeta(item) && (
                      <p className="text-xs text-muted">{getItemMeta(item)}</p>
                    )}
                  </div>

                  {/* Link icon */}
                  <Link2 className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="p-3 border-t border-border text-center flex-shrink-0">
          <p className="text-xs text-muted">
            Click a {config.label.toLowerCase()} to link this note to it
          </p>
        </div>
      </div>
    </div>
  );
}

export default LinkToItemModal;
