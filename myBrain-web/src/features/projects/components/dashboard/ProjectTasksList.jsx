import { useState, useMemo } from 'react';
import {
  Plus,
  Circle,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Calendar,
  Flag,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { useTaskPanel } from '../../../../contexts/TaskPanelContext';
import { useRestoreTask } from '../../../tasks/hooks/useTasks';
import useToast from '../../../../hooks/useToast';

const STATUS_GROUPS = [
  { key: 'todo', label: 'To Do', icon: Circle, color: 'text-gray-400', bg: 'bg-gray-500/10' },
  { key: 'in_progress', label: 'In Progress', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { key: 'done', label: 'Done', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
];

const PRIORITY_BADGE = {
  high: 'bg-red-500/10 text-red-500',
  medium: 'bg-amber-500/10 text-amber-500',
  low: 'bg-gray-500/10 text-muted',
};

export function ProjectTasksList({ projectId, tasks = [], trashedTasks = [] }) {
  const { openTask, openNewTask } = useTaskPanel();
  const [collapsed, setCollapsed] = useState({});
  const [showTrash, setShowTrash] = useState(false);
  const restoreTask = useRestoreTask();
  const toast = useToast();

  const handleRestore = async (taskId) => {
    try {
      await restoreTask.mutateAsync(taskId);
      toast.success('Task restored');
    } catch (err) {
      toast.error('Failed to restore task');
    }
  };

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

  const toggleGroup = (key) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
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
          {trashedTasks.length > 0 && (
            <button
              onClick={() => setShowTrash(!showTrash)}
              className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-full transition-colors ${
                showTrash
                  ? 'bg-red-500/10 text-red-500'
                  : 'bg-panel2 text-muted hover:text-text'
              }`}
              title={showTrash ? 'Hide trash' : 'Show trash'}
            >
              <Trash2 className="w-3 h-3" />
              {trashedTasks.length}
            </button>
          )}
        </div>
        <button
          onClick={() => openNewTask({ projectId })}
          className="p-1.5 text-muted hover:text-primary rounded-lg hover:bg-primary/10 transition-colors"
          title="Create new task"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Status Groups */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {STATUS_GROUPS.map(group => {
          const groupTasks = tasksByStatus[group.key] || [];
          const isCollapsed = collapsed[group.key];
          const Icon = group.icon;
          const Chevron = isCollapsed ? ChevronRight : ChevronDown;

          return (
            <div key={group.key}>
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.key)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-bg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Chevron className="w-3.5 h-3.5 text-muted" />
                  <Icon className={`w-3.5 h-3.5 ${group.color}`} />
                  <span className="text-xs font-medium text-text">{group.label}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${group.bg} ${group.color}`}>
                    {groupTasks.length}
                  </span>
                </div>
              </button>

              {/* Task Items */}
              {!isCollapsed && (
                <div className="ml-4 mt-1 space-y-1">
                  {groupTasks.length === 0 ? (
                    <p className="text-[10px] text-muted px-2 py-2">No tasks</p>
                  ) : (
                    groupTasks.map(task => {
                      const dueInfo = formatDueDate(task.dueDate);
                      const priorityClass = PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium;
                      const isDone = group.key === 'done';

                      return (
                        <button
                          key={task._id}
                          onClick={() => openTask(task._id)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg transition-colors text-left group"
                        >
                          <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${group.color}`} />
                          <span className={`flex-1 text-xs truncate ${isDone ? 'text-muted line-through' : 'text-text'}`}>
                            {task.title}
                          </span>
                          {task.priority && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${priorityClass}`}>
                              {task.priority}
                            </span>
                          )}
                          {dueInfo && (
                            <span className={`flex items-center gap-0.5 text-[10px] flex-shrink-0 ${dueInfo.overdue ? 'text-red-500' : 'text-muted'}`}>
                              <Calendar className="w-2.5 h-2.5" />
                              {dueInfo.text}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}

                  {/* Add Task Button */}
                  <button
                    onClick={() => openNewTask({ projectId, status: group.key })}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary/5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="text-xs">Add Task</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Trash Section */}
        {showTrash && trashedTasks.length > 0 && (
          <div className="mt-2 border-t border-border pt-2">
            <button
              onClick={() => setCollapsed(prev => ({ ...prev, trash: !prev.trash }))}
              className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-red-500/5 transition-colors"
            >
              <div className="flex items-center gap-2">
                {collapsed.trash ? (
                  <ChevronRight className="w-3.5 h-3.5 text-red-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-red-500" />
                )}
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-medium text-red-500">Trash</span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500">
                  {trashedTasks.length}
                </span>
              </div>
            </button>

            {!collapsed.trash && (
              <div className="ml-4 mt-1 space-y-1">
                {trashedTasks.map(task => (
                  <div
                    key={task._id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-bg transition-colors"
                  >
                    <button
                      onClick={() => handleRestore(task._id)}
                      className="p-1 text-green-500 hover:bg-green-500/10 rounded transition-colors"
                      title="Restore task"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openTask(task._id)}
                      className="flex-1 text-left"
                    >
                      <span className="text-xs text-muted line-through truncate">{task.title}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectTasksList;
