import { Circle, Clock, CheckCircle2, Plus } from 'lucide-react';
import { useTaskPanel } from '../../../contexts/TaskPanelContext';
import { useUpdateTaskStatus } from '../hooks/useTasks';

const COLUMNS = [
  { id: 'todo', label: 'To Do', icon: Circle, color: 'text-v2-text-tertiary', borderColor: 'border-v2-text-tertiary/30' },
  { id: 'in_progress', label: 'In Progress', icon: Clock, color: 'text-blue-500', borderColor: 'border-blue-500/30' },
  { id: 'done', label: 'Done', icon: CheckCircle2, color: 'text-green-500', borderColor: 'border-green-500/30' },
];

export default function TasksBoardView({ tasks = [] }) {
  const { openTask, openNewTask } = useTaskPanel();
  const updateStatus = useUpdateTaskStatus();

  const groupedTasks = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.status === col.id);
    return acc;
  }, {});

  const handleStatusChange = (taskId, newStatus) => {
    updateStatus.mutate({ id: taskId, status: newStatus });
  };

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {COLUMNS.map(col => {
        const Icon = col.icon;
        const columnTasks = groupedTasks[col.id] || [];
        return (
          <div key={col.id} className={`flex-1 min-w-[280px] flex flex-col bg-v2-bg-secondary/50 border ${col.borderColor} rounded-xl`}>
            {/* Column Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-v2-border-default">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${col.color}`} />
                <span className="text-sm font-semibold text-v2-text-primary">{col.label}</span>
                <span className="text-xs text-v2-text-tertiary bg-v2-bg-tertiary px-1.5 py-0.5 rounded-full">{columnTasks.length}</span>
              </div>
              {col.id === 'todo' && (
                <button
                  onClick={() => openNewTask()}
                  className="p-1 text-v2-text-tertiary hover:text-v2-blue rounded transition-colors"
                  aria-label="Add new task"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Column Cards */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {columnTasks.map(task => (
                <div
                  key={task._id}
                  onClick={() => openTask(task._id)}
                  className="p-3 bg-v2-bg-surface border border-v2-border-default rounded-lg hover:border-v2-blue/50 cursor-pointer transition-all shadow-sm hover:shadow-md"
                >
                  <p className={`text-sm font-medium ${task.status === 'done' ? 'text-v2-text-tertiary line-through' : 'text-v2-text-primary'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {task.priority === 'high' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-v2-red/10 text-v2-red rounded">High</span>
                    )}
                    {task.priority === 'low' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-v2-text-tertiary/10 text-v2-text-tertiary rounded">Low</span>
                    )}
                    {task.dueDate && (
                      <span className="text-[10px] text-v2-text-tertiary">
                        {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {task.projectId && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-v2-blue/10 text-v2-blue rounded truncate max-w-[100px]">
                        {task.projectId?.title || 'Project'}
                      </span>
                    )}
                  </div>
                  {/* Status change buttons */}
                  {col.id !== 'done' && (
                    <div className="flex gap-1 mt-2">
                      {COLUMNS.filter(c => c.id !== col.id).map(targetCol => (
                        <button
                          key={targetCol.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(task._id, targetCol.id);
                          }}
                          className={`text-[10px] px-1.5 py-0.5 rounded border border-v2-border-default hover:border-v2-blue/50 text-v2-text-tertiary hover:text-v2-text-primary transition-colors`}
                          aria-label={`Move to ${targetCol.label}`}
                        >
                          {targetCol.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {columnTasks.length === 0 && (
                <div className="text-center py-8 text-sm text-v2-text-tertiary">
                  No tasks
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
