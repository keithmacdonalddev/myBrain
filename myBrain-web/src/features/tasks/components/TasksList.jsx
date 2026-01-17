import { useState } from 'react';
import { Plus, CheckSquare } from 'lucide-react';
import { useTasks, useCreateTask } from '../hooks/useTasks';
import TaskRow from './TaskRow';
import TaskFilters from './TaskFilters';
import EmptyState from '../../../components/ui/EmptyState';
import Skeleton from '../../../components/ui/Skeleton';

function TasksList() {
  const [filters, setFilters] = useState({
    q: '',
    status: '',
    priority: '',
  });
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const { data, isLoading, error } = useTasks(filters);
  const createTask = useCreateTask();

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      await createTask.mutateAsync({ title: newTaskTitle.trim() });
      setNewTaskTitle('');
      setShowNewTask(false);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h1 className="text-xl font-semibold text-text">Tasks</h1>
        <button
          onClick={() => setShowNewTask(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* New task input */}
      {showNewTask && (
        <form onSubmit={handleCreateTask} className="p-4 border-b border-border bg-bg/50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Task title..."
              autoFocus
              className="flex-1 px-3 py-2 bg-panel border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!newTaskTitle.trim() || createTask.isPending}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewTask(false);
                setNewTaskTitle('');
              }}
              className="px-3 py-2 text-muted hover:text-text transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <TaskFilters filters={filters} onFiltersChange={setFilters} />

      {/* Tasks list */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">
            Failed to load tasks
          </div>
        ) : !data?.tasks?.length ? (
          <EmptyState
            icon={CheckSquare}
            title="No tasks yet"
            description={filters.q || filters.status || filters.priority
              ? "No tasks match your filters"
              : "Create your first task to get started"
            }
          />
        ) : (
          <div>
            {data.tasks.map((task) => (
              <TaskRow key={task._id} task={task} />
            ))}
          </div>
        )}
      </div>

      {/* Footer with count */}
      {data?.total > 0 && (
        <div className="px-4 py-2 border-t border-border bg-bg/50">
          <p className="text-xs text-muted text-center">
            {data.total} task{data.total !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}

export default TasksList;
