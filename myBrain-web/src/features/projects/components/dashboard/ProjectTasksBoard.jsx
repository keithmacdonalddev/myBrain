import { useState, useMemo } from 'react';
import {
  Plus,
  Circle,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  MoreHorizontal,
  Loader2,
  Link as LinkIcon,
  Flag,
  Pencil,
  Copy,
  Trash2
} from 'lucide-react';
import { useTaskPanel } from '../../../../contexts/TaskPanelContext';
import { useUpdateTaskStatus, useCreateTask, useDeleteTask } from '../../../tasks/hooks/useTasks';
import { LinkItemModal } from '../LinkItemModal';
import useToast from '../../../../hooks/useToast';
import ContextMenu from '../../../../components/ui/ContextMenu';

const COLUMNS = [
  { key: 'todo', label: 'To Do', icon: Circle, color: 'text-gray-400', bg: 'bg-gray-500/5' },
  { key: 'in_progress', label: 'In Progress', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/5' },
  { key: 'done', label: 'Done', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/5' },
];

const PRIORITY_COLORS = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-500',
  low: 'border-l-gray-400',
};

export function ProjectTasksBoard({ projectId, tasks = [] }) {
  const toast = useToast();
  const { openTask, openNewTask } = useTaskPanel();
  const updateTaskStatus = useUpdateTaskStatus();
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();

  const [quickAddColumn, setQuickAddColumn] = useState(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const handleDelete = async (taskId) => {
    try {
      await deleteTask.mutateAsync(taskId);
      toast.success('Task deleted');
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  const handleDuplicate = async (task) => {
    try {
      await createTask.mutateAsync({
        title: `${task.title} (copy)`,
        projectId: projectId,
        status: task.status,
        priority: task.priority,
        tags: task.tags,
        description: task.description
      });
      toast.success('Task duplicated');
    } catch (err) {
      toast.error('Failed to duplicate task');
    }
  };

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped = { todo: [], in_progress: [], done: [] };
    tasks.forEach(task => {
      const status = task.status === 'cancelled' ? 'done' : task.status;
      if (grouped[status]) {
        grouped[status].push(task);
      } else {
        grouped.todo.push(task);
      }
    });
    return grouped;
  }, [tasks]);

  const handleQuickAdd = async (status) => {
    if (!quickAddTitle.trim() || isCreating) return;

    setIsCreating(true);
    try {
      await createTask.mutateAsync({
        title: quickAddTitle.trim(),
        projectId: projectId,
        status: status
      });
      setQuickAddTitle('');
      setQuickAddColumn(null);
      toast.success('Task created');
    } catch (err) {
      toast.error('Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTaskStatus.mutateAsync({ id: taskId, status: newStatus });
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  const formatDueDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));

    if (diff < 0) return { text: `${Math.abs(diff)}d ago`, overdue: true };
    if (diff === 0) return { text: 'Today', overdue: false };
    if (diff === 1) return { text: 'Tomorrow', overdue: false };
    if (diff <= 7) return { text: `${diff}d`, overdue: false };
    return { text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), overdue: false };
  };

  return (
    <div className="h-full flex flex-col bg-panel border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-panel">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text">Tasks</span>
          <span className="text-xs text-muted">({tasks.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowLinkModal(true)}
            className="p-1.5 text-muted hover:text-text rounded-lg hover:bg-bg transition-colors"
            title="Link existing task"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => openNewTask({ projectId })}
            className="p-1.5 text-muted hover:text-primary rounded-lg hover:bg-primary/10 transition-colors"
            title="Create new task"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="flex-1 flex gap-2 p-2 overflow-x-auto">
        {COLUMNS.map(column => {
          const columnTasks = tasksByStatus[column.key] || [];
          const Icon = column.icon;

          return (
            <div
              key={column.key}
              className={`flex-1 min-w-[200px] flex flex-col rounded-lg ${column.bg}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${column.color}`} />
                  <span className="text-xs font-medium text-text">{column.label}</span>
                  <span className="text-[10px] text-muted">({columnTasks.length})</span>
                </div>
                <button
                  onClick={() => setQuickAddColumn(quickAddColumn === column.key ? null : column.key)}
                  className="p-1 text-muted hover:text-text rounded transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Add Input */}
              {quickAddColumn === column.key && (
                <div className="px-2 pb-2">
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={quickAddTitle}
                      onChange={(e) => setQuickAddTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQuickAdd(column.key);
                        if (e.key === 'Escape') { setQuickAddColumn(null); setQuickAddTitle(''); }
                      }}
                      placeholder="Task title..."
                      autoFocus
                      className="flex-1 px-2 py-1 text-xs bg-panel border border-border rounded text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <button
                      onClick={() => handleQuickAdd(column.key)}
                      disabled={!quickAddTitle.trim() || isCreating}
                      className="px-2 py-1 bg-primary text-white text-xs rounded hover:bg-primary-hover disabled:opacity-50 transition-colors"
                    >
                      {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                    </button>
                  </div>
                </div>
              )}

              {/* Tasks List */}
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5">
                {columnTasks.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-[10px] text-muted">No tasks</p>
                  </div>
                ) : (
                  columnTasks.map(task => (
                    <TaskCard
                      key={task._id}
                      task={task}
                      currentStatus={column.key}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      onDuplicate={handleDuplicate}
                      onClick={() => openTask(task._id)}
                      formatDueDate={formatDueDate}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Link Modal */}
      {showLinkModal && (
        <LinkItemModal
          projectId={projectId}
          linkedIds={tasks.map(t => t._id)}
          type="tasks"
          onClose={() => setShowLinkModal(false)}
        />
      )}
    </div>
  );
}

function TaskCard({ task, currentStatus, onStatusChange, onDelete, onDuplicate, onClick, formatDueDate }) {
  const dueInfo = formatDueDate(task.dueDate);
  const priorityClass = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
  const isCompleted = currentStatus === 'done';

  const handleToggle = (e) => {
    e.stopPropagation();
    const newStatus = isCompleted ? 'todo' : 'done';
    onStatusChange(task._id, newStatus);
  };

  // Subtask progress
  const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  // Context menu items
  const contextMenuItems = [
    { label: 'Edit Task', icon: Pencil, onClick: () => onClick() },
    { label: 'Duplicate', icon: Copy, onClick: () => onDuplicate(task) },
    { divider: true },
    { label: 'To Do', icon: Circle, onClick: () => onStatusChange(task._id, 'todo') },
    { label: 'In Progress', icon: Clock, onClick: () => onStatusChange(task._id, 'in_progress') },
    { label: 'Done', icon: CheckCircle2, onClick: () => onStatusChange(task._id, 'done') },
    { divider: true },
    { label: 'Delete', icon: Trash2, onClick: () => onDelete(task._id), variant: 'danger' },
  ];

  return (
    <ContextMenu items={contextMenuItems}>
      <div
        onClick={onClick}
        className={`group relative bg-panel border border-border rounded-lg p-2 cursor-pointer hover:border-primary/30 transition-colors border-l-2 ${priorityClass}`}
      >
        <div className="flex items-start gap-2">
          {/* Checkbox */}
          <button
            onClick={handleToggle}
            className={`mt-0.5 w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center transition-all ${
              isCompleted
                ? 'bg-green-500 border-green-500'
                : 'border-gray-400 hover:border-primary'
            }`}
          >
            {isCompleted && (
              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title row with priority and subtask progress */}
            <div className="flex items-center gap-1.5">
              <p className={`flex-1 text-xs font-medium leading-tight truncate ${isCompleted ? 'text-muted line-through' : 'text-text'}`}>
                {task.title}
              </p>
              {/* Priority badge */}
              {task.priority === 'high' && (
                <Flag className="w-3 h-3 text-red-500 flex-shrink-0" />
              )}
              {task.priority === 'low' && (
                <Flag className="w-3 h-3 text-gray-400 flex-shrink-0" />
              )}
              {/* Subtask progress */}
              {totalSubtasks > 0 && (
                <span className="text-[10px] text-muted flex-shrink-0">
                  {completedSubtasks}/{totalSubtasks}
                </span>
              )}
            </div>

            {/* Tag pills */}
            {task.tags?.length > 0 && (
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {task.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded"
                  >
                    {tag}
                  </span>
                ))}
                {task.tags.length > 2 && (
                  <span className="text-[10px] text-muted">+{task.tags.length - 2}</span>
                )}
              </div>
            )}

            {/* Meta (due date) */}
            {dueInfo && (
              <div className="flex items-center gap-2 mt-1">
                <span className={`flex items-center gap-0.5 text-[10px] ${dueInfo.overdue ? 'text-red-500' : 'text-muted'}`}>
                  <Calendar className="w-2.5 h-2.5" />
                  {dueInfo.text}
                </span>
              </div>
            )}
          </div>

          {/* Quick menu trigger (visible on hover) */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="w-3.5 h-3.5 text-muted" />
          </div>
        </div>
      </div>
    </ContextMenu>
  );
}

export default ProjectTasksBoard;
