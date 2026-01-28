import { Circle, Clock, CheckCircle2, Plus } from 'lucide-react';
import { useTaskPanel } from '../../../contexts/TaskPanelContext';
import { useUpdateTaskStatus } from '../hooks/useTasks';

const COLUMNS = [
  { id: 'todo', label: 'To Do', icon: Circle, color: 'text-muted', borderColor: 'border-muted/30' },
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
          <div key={col.id} className={`flex-1 min-w-[280px] flex flex-col bg-panel/50 border ${col.borderColor} rounded-xl`}>
            {/* Column Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${col.color}`} />
                <span className="text-sm font-semibold text-text">{col.label}</span>
                <span className="text-xs text-muted bg-panel2 px-1.5 py-0.5 rounded-full">{columnTasks.length}</span>
              </div>
              {col.id === 'todo' && (
                <button
                  onClick={() => openNewTask()}
                  className="p-1 text-muted hover:text-primary rounded transition-colors"
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
                  className="p-3 bg-panel border border-border rounded-lg hover:border-primary/50 cursor-pointer transition-all shadow-sm hover:shadow-md"
                >
                  <p className={`text-sm font-medium ${task.status === 'done' ? 'text-muted line-through' : 'text-text'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {task.priority === 'high' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-danger/10 text-danger rounded">High</span>
                    )}
                    {task.priority === 'low' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-muted/10 text-muted rounded">Low</span>
                    )}
                    {task.dueDate && (
                      <span className="text-[10px] text-muted">
                        {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    {task.projectId && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded truncate max-w-[100px]">
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
                          className={`text-[10px] px-1.5 py-0.5 rounded border border-border hover:border-primary/50 text-muted hover:text-text transition-colors`}
                        >
                          {targetCol.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {columnTasks.length === 0 && (
                <div className="text-center py-8 text-sm text-muted">
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
