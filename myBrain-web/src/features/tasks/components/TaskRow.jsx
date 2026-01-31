import { useState } from 'react';
import { CheckCircle2, Circle, Clock, XCircle, Flag, Calendar } from 'lucide-react';
import { useUpdateTaskStatus } from '../hooks/useTasks';
import { useTaskPanel } from '../../../contexts/TaskPanelContext';
import { getDueDateDisplay } from '../../../lib/dateUtils';

const STATUS_ICONS = {
  todo: Circle,
  in_progress: Clock,
  done: CheckCircle2,
  cancelled: XCircle,
};

const STATUS_COLORS = {
  todo: 'text-v2-text-tertiary hover:text-v2-blue',
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
  const [showBounce, setShowBounce] = useState(false);

  const StatusIcon = STATUS_ICONS[task.status] || Circle;
  const isCompleted = task.status === 'done' || task.status === 'cancelled';

  const handleStatusClick = (e) => {
    e.stopPropagation();
    // Toggle between todo and done
    const newStatus = task.status === 'done' ? 'todo' : 'done';

    // Trigger bounce animation when completing
    if (newStatus === 'done') {
      setShowBounce(true);
      setTimeout(() => setShowBounce(false), 300);
    }

    updateStatus.mutate({ id: task._id, status: newStatus });
  };

  const dueInfo = task.dueDate ? getDueDateDisplay(task.dueDate) : null;

  return (
    <div
      onClick={() => openTask(task._id)}
      className="group flex items-start gap-3 px-4 py-3 border-b border-v2-border-default hover:bg-v2-bg-secondary/50 hover:border-l-2 hover:border-l-v2-blue hover:pl-3.5 cursor-pointer transition-all"
    >
      {/* Status checkbox */}
      <button
        onClick={handleStatusClick}
        className={`flex-shrink-0 mt-0.5 p-0.5 rounded transition-colors ${STATUS_COLORS[task.status]} ${showBounce ? 'animate-check-bounce' : ''}`}
      >
        <StatusIcon className={`w-5 h-5 transition-all duration-200 ${isCompleted ? 'fill-current' : ''}`} />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isCompleted ? 'text-v2-text-tertiary line-through' : 'text-v2-text-primary'}`}>
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
              className="text-xs px-1.5 py-0.5 bg-v2-blue/10 text-v2-blue rounded"
            >
              {tag}
            </span>
          ))}
          {task.tags?.length > 2 && (
            <span className="text-xs text-v2-text-tertiary">+{task.tags.length - 2}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskRow;
