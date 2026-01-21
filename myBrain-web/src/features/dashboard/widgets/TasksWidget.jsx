/**
 * =============================================================================
 * TASKSWIDGET.JSX - Priority Tasks Widget
 * =============================================================================
 *
 * Shows overdue tasks and tasks due today with quick completion toggles.
 * Tasks are sorted by priority and due date.
 *
 * SIZE: default or wide (4-6 columns)
 *
 * =============================================================================
 */

import { Link } from 'react-router-dom';
import {
  CheckSquare,
  AlertTriangle,
  Clock,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import {
  WidgetHeader,
  WidgetBody,
  WidgetFooter,
  WidgetEmpty,
  WidgetLoading,
  WidgetBadge,
  WidgetListItem
} from '../components/DashboardGrid';

/**
 * TasksWidget
 * -----------
 * @param {Array} overdueTasks - Tasks past their due date
 * @param {Array} dueTodayTasks - Tasks due today
 * @param {boolean} isLoading - Loading state
 * @param {Function} onTaskClick - Handler for task clicks
 * @param {Function} onToggleStatus - Handler for status toggle
 */
export default function TasksWidget({
  overdueTasks = [],
  dueTodayTasks = [],
  isLoading = false,
  onTaskClick,
  onToggleStatus
}) {
  const totalCount = overdueTasks.length + dueTodayTasks.length;
  const overdueCount = overdueTasks.length;

  const handleToggle = (e, task) => {
    e.stopPropagation();
    onToggleStatus?.(task._id, task.status === 'done' ? 'todo' : 'done');
  };

  const getDaysOverdue = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    now.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return Math.floor((now - due) / (1000 * 60 * 60 * 24));
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  if (isLoading) {
    return (
      <>
        <WidgetHeader
          icon={<CheckSquare className="w-4 h-4 text-orange-500" />}
          iconBg="bg-orange-500/10"
          title="Today's Tasks"
        />
        <WidgetBody>
          <WidgetLoading />
        </WidgetBody>
      </>
    );
  }

  return (
    <>
      <WidgetHeader
        icon={<CheckSquare className="w-4 h-4 text-orange-500" />}
        iconBg="bg-orange-500/10"
        title="Today's Tasks"
        badge={
          <div className="flex items-center gap-2">
            {overdueCount > 0 && (
              <WidgetBadge value={`${overdueCount} overdue`} variant="danger" />
            )}
          </div>
        }
      />

      <WidgetBody>
        {totalCount === 0 ? (
          <WidgetEmpty
            icon={<CheckCircle2 className="w-8 h-8" />}
            title="All caught up!"
            text="No tasks due today."
          />
        ) : (
          <div className="space-y-3">
            {/* Overdue Section */}
            {overdueTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wide text-danger">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Overdue ({overdueTasks.length})
                </div>
                <div className="widget-list">
                  {overdueTasks.slice(0, 3).map((task) => {
                    const days = getDaysOverdue(task.dueDate);
                    return (
                      <TaskListItem
                        key={task._id}
                        task={task}
                        meta={days === 0 ? 'Due today' : `${days} day${days !== 1 ? 's' : ''} overdue`}
                        metaColor="text-danger"
                        priorityColor={getPriorityColor(task.priority)}
                        onClick={() => onTaskClick?.(task)}
                        onToggle={(e) => handleToggle(e, task)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Due Today Section */}
            {dueTodayTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
                  <Clock className="w-3.5 h-3.5" />
                  Due Today ({dueTodayTasks.length})
                </div>
                <div className="widget-list">
                  {dueTodayTasks.slice(0, 3).map((task) => (
                    <TaskListItem
                      key={task._id}
                      task={task}
                      meta={formatDueTime(task.dueDate)}
                      priorityColor={getPriorityColor(task.priority)}
                      onClick={() => onTaskClick?.(task)}
                      onToggle={(e) => handleToggle(e, task)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </WidgetBody>

      <WidgetFooter>
        <Link to="/app/tasks" className="widget-footer-link">
          View all tasks <ChevronRight className="w-4 h-4" />
        </Link>
      </WidgetFooter>
    </>
  );
}

function TaskListItem({ task, meta, metaColor, priorityColor, onClick, onToggle }) {
  const isCompleted = task.status === 'done';

  return (
    <div
      className="widget-list-item"
      onClick={onClick}
    >
      <button
        onClick={onToggle}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all
          ${isCompleted
            ? 'bg-green-500 border-green-500'
            : 'border-gray-400 hover:border-primary'
          }`}
      >
        {isCompleted && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      <div className="widget-list-item-content">
        <div className={`widget-list-item-title ${isCompleted ? 'line-through text-muted' : ''}`}>
          {task.title}
        </div>
        {meta && (
          <div className={`widget-list-item-meta ${metaColor || ''}`}>
            {meta}
          </div>
        )}
      </div>

      <div className={`priority-dot ${priorityColor}`} />
    </div>
  );
}

function formatDueTime(dueDate) {
  const date = new Date(dueDate);
  const now = new Date();

  // If due time is set (not midnight), show time
  if (date.getHours() !== 0 || date.getMinutes() !== 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  return 'Today';
}

TasksWidget.defaultSize = 'default';
