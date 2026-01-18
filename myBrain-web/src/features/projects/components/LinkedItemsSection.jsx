import { useState } from 'react';
import {
  StickyNote,
  CheckSquare,
  Calendar,
  Plus,
  Unlink,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useUnlinkNote,
  useUnlinkTask,
  useUnlinkEvent
} from '../hooks/useProjects';
import useToast from '../../../hooks/useToast';

const SECTION_CONFIG = {
  notes: {
    icon: StickyNote,
    label: 'Notes',
    emptyText: 'No linked notes',
    linkPath: '/app/notes',
  },
  tasks: {
    icon: CheckSquare,
    label: 'Tasks',
    emptyText: 'No linked tasks',
    linkPath: '/app/tasks',
  },
  events: {
    icon: Calendar,
    label: 'Events',
    emptyText: 'No linked events',
    linkPath: '/app/calendar',
  },
};

function LinkedItem({ item, type, projectId, onUnlink }) {
  const navigate = useNavigate();
  const toast = useToast();
  const unlinkNote = useUnlinkNote();
  const unlinkTask = useUnlinkTask();
  const unlinkEvent = useUnlinkEvent();

  const [isUnlinking, setIsUnlinking] = useState(false);

  const handleUnlink = async (e) => {
    e.stopPropagation();
    setIsUnlinking(true);

    try {
      if (type === 'notes') {
        await unlinkNote.mutateAsync({ projectId, noteId: item._id });
      } else if (type === 'tasks') {
        await unlinkTask.mutateAsync({ projectId, taskId: item._id });
      } else if (type === 'events') {
        await unlinkEvent.mutateAsync({ projectId, eventId: item._id });
      }
      toast.success('Item unlinked');
      if (onUnlink) onUnlink();
    } catch (err) {
      toast.error(err.message || 'Failed to unlink');
    } finally {
      setIsUnlinking(false);
    }
  };

  const handleNavigate = (e) => {
    e.stopPropagation();
    const config = SECTION_CONFIG[type];
    navigate(`${config.linkPath}/${item._id}`);
  };

  const getItemTitle = () => {
    if (type === 'notes') return item.title || 'Untitled Note';
    if (type === 'tasks') return item.title || 'Untitled Task';
    if (type === 'events') return item.title || 'Untitled Event';
    return 'Untitled';
  };

  const getItemMeta = () => {
    if (type === 'tasks' && item.status) {
      const statusColors = {
        todo: 'bg-muted',
        in_progress: 'bg-primary',
        completed: 'bg-success',
        cancelled: 'bg-danger',
      };
      return (
        <span className={`w-2 h-2 rounded-full ${statusColors[item.status] || 'bg-muted'}`} />
      );
    }
    if (type === 'events' && item.startDate) {
      return (
        <span className="text-xs text-muted">
          {new Date(item.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-bg group transition-colors">
      {getItemMeta()}
      <span className="flex-1 text-sm text-text truncate">{getItemTitle()}</span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleNavigate}
          className="p-1 text-muted hover:text-primary rounded transition-colors"
          title="Go to item"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleUnlink}
          disabled={isUnlinking}
          className="p-1 text-muted hover:text-danger rounded transition-colors disabled:opacity-50"
          title="Unlink"
        >
          {isUnlinking ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Unlink className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

export function LinkedItemsSection({
  projectId,
  type,
  items = [],
  onLinkClick,
  defaultExpanded = true
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const config = SECTION_CONFIG[type];
  const Icon = config.icon;

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-3 hover:bg-bg transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted" />
        )}
        <Icon className="w-4 h-4 text-muted" />
        <span className="text-sm font-medium text-text">{config.label}</span>
        <span className="text-xs text-muted">({items.length})</span>
        <div className="flex-1" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLinkClick(type);
          }}
          className="p-1 text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors"
          title={`Link ${config.label.toLowerCase()}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </button>

      {/* Items */}
      {isExpanded && (
        <div className="px-3 pb-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted py-2 px-2">{config.emptyText}</p>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <LinkedItem
                  key={item._id}
                  item={item}
                  type={type}
                  projectId={projectId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LinkedItemsSection;
