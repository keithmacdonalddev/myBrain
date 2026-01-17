import { CheckCircle2, Circle, Clock, XCircle, Flag, Calendar } from 'lucide-react';
import { useUpdateTaskStatus } from '../hooks/useTasks';
import { useTaskPanel } from '../../../contexts/TaskPanelContext';

const STATUS_ICONS = {
  todo: Circle,
  in_progress: Clock,
  done: CheckCircle2,
  cancelled: XCircle,
};

const STATUS_COLORS = {
  todo: 'text-muted hover:text-primary',
  in_progress: 'text-blue-500',
  done: 'text-green-500',
  cancelled: 'text-red-500',
};

const PRIORITY_COLORS = {
  low: 'text-gray-400',
  medium: 'text-yellow-500',
  high: 'text-red-500',
};

function TaskRow({ task }) {
  const { openTask } = useTaskPanel();
  const updateStatus = useUpdateTaskStatus();

  const StatusIcon = STATUS_ICONS[task.status] || Circle;
  const isCompleted = task.status === 'done' || task.status === 'cancelled';

  const handleStatusClick = (e) => {
    e.stopPropagation();
    // Toggle between todo and done
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateStatus.mutate({ id: task._id, status: newStatus });
  };

  const formatDueDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (d < today) {
      return { text: 'Overdue', className: 'text-red-500 bg-red-500/10' };
    }
    if (d.toDateString() === today.toDateString()) {
      return { text: 'Today', className: 'text-orange-500 bg-orange-500/10' };
    }
    if (d.toDateString() === tomorrow.toDateString()) {
      return { text: 'Tomorrow', className: 'text-blue-500 bg-blue-500/10' };
    }
    return {
      text: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      className: 'text-muted bg-bg'
    };
  };

  const dueInfo = formatDueDate(task.dueDate);

  return (
    <div
      onClick={() => openTask(task._id)}
      className="group flex items-start gap-3 px-4 py-3 border-b border-border hover:bg-bg/50 cursor-pointer transition-colors"
    >
      {/* Status checkbox */}
      <button
        onClick={handleStatusClick}
        className={`flex-shrink-0 mt-0.5 p-0.5 rounded transition-colors ${STATUS_COLORS[task.status]}`}
      >
        <StatusIcon className={`w-5 h-5 ${isCompleted ? 'fill-current' : ''}`} />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isCompleted ? 'text-muted line-through' : 'text-text'}`}>
          {task.title}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-1">
          {/* Priority */}
          {task.priority !== 'medium' && (
            <Flag className={`w-3 h-3 ${PRIORITY_COLORS[task.priority]}`} />
          )}

          {/* Due date */}
          {dueInfo && !isCompleted && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${dueInfo.className}`}>
              {dueInfo.text}
            </span>
          )}

          {/* Tags */}
          {task.tags?.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded"
            >
              {tag}
            </span>
          ))}
          {task.tags?.length > 2 && (
            <span className="text-xs text-muted">+{task.tags.length - 2}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskRow;
