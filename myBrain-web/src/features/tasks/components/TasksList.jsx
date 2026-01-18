import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  CheckSquare,
  Search,
  Filter,
  X,
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  Flag,
  AlertTriangle,
  Calendar,
  ChevronRight,
  Loader2,
  Inbox as InboxIcon
} from 'lucide-react';
import { useTasks, useCreateTask, useUpdateTaskStatus, useTodayView } from '../hooks/useTasks';
import { useTaskPanel } from '../../../contexts/TaskPanelContext';
import EmptyState from '../../../components/ui/EmptyState';

const STATUS_OPTIONS = [
  { value: '', label: 'All', icon: null },
  { value: 'todo', label: 'To Do', icon: Circle },
  { value: 'in_progress', label: 'In Progress', icon: Clock },
  { value: 'done', label: 'Done', icon: CheckCircle2 },
  { value: 'cancelled', label: 'Cancelled', icon: XCircle },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'high', label: 'High', color: 'text-red-500' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-500' },
  { value: 'low', label: 'Low', color: 'text-muted' },
];

// Header Stats Component
function HeaderStats() {
  const { data: todayData, isLoading } = useTodayView();

  if (isLoading) {
    return (
      <div className="flex gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="px-3 py-1.5 bg-panel border border-border rounded-lg min-w-[60px] animate-pulse">
            <div className="h-5 bg-muted/20 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const overdueCount = todayData?.overdue?.length || 0;
  const dueTodayCount = todayData?.dueToday?.length || 0;
  const completedCount = todayData?.completed?.length || 0;

  return (
    <div className="flex gap-2">
      {overdueCount > 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-danger/10 text-danger rounded-lg text-sm font-medium">
          <AlertTriangle className="w-3.5 h-3.5" />
          {overdueCount} overdue
        </div>
      )}
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-warning/10 text-warning rounded-lg text-sm font-medium">
        <Clock className="w-3.5 h-3.5" />
        {dueTodayCount} today
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-success/10 text-success rounded-lg text-sm font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {completedCount} done
      </div>
    </div>
  );
}

// Quick Add Input
function QuickAddTask({ onAdd, isAdding }) {
  const [title, setTitle] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim());
    setTitle('');
  };

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-center gap-3 p-4 bg-panel border border-border rounded-2xl">
        <div className="w-5 h-5 rounded-full border-2 border-dashed border-muted flex items-center justify-center">
          <Plus className="w-3 h-3 text-muted" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a new task... (Ctrl+N)"
          className="flex-1 bg-transparent border-none text-text placeholder:text-muted focus:outline-none text-sm"
        />
        {title.trim() && (
          <button
            type="submit"
            disabled={isAdding}
            className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add
          </button>
        )}
      </div>
    </form>
  );
}

// Filter Pills
function FilterPills({ filters, onFiltersChange }) {
  const [showFilters, setShowFilters] = useState(false);
  const hasActiveFilters = filters.status || filters.priority;

  return (
    <div className="space-y-3">
      {/* Search and filter toggle */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={filters.q || ''}
            onChange={(e) => onFiltersChange({ ...filters, q: e.target.value })}
            placeholder="Search tasks..."
            className="w-full pl-10 pr-4 py-2.5 bg-panel border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
          />
          {filters.q && (
            <button
              onClick={() => onFiltersChange({ ...filters, q: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
            hasActiveFilters
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-panel hover:bg-panel2 text-muted'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filter</span>
          {hasActiveFilters && <span className="w-1.5 h-1.5 bg-primary rounded-full" />}
        </button>
      </div>

      {/* Filter options */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 p-4 bg-panel border border-border rounded-xl">
          {/* Status pills */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted mr-1">Status:</span>
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onFiltersChange({ ...filters, status: option.value })}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                  filters.status === option.value
                    ? 'bg-primary text-white'
                    : 'bg-bg hover:bg-panel2 text-muted'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Priority pills */}
          <div className="flex items-center gap-1 ml-4">
            <span className="text-xs text-muted mr-1">Priority:</span>
            {PRIORITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onFiltersChange({ ...filters, priority: option.value })}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                  filters.priority === option.value
                    ? 'bg-primary text-white'
                    : 'bg-bg hover:bg-panel2 text-muted'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => onFiltersChange({ ...filters, status: '', priority: '' })}
              className="ml-auto flex items-center gap-1 px-2.5 py-1 text-xs text-muted hover:text-text"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Task Card Component
function TaskCard({ task }) {
  const { openTask } = useTaskPanel();
  const updateStatus = useUpdateTaskStatus();

  const isCompleted = task.status === 'done' || task.status === 'cancelled';

  const handleToggle = (e) => {
    e.stopPropagation();
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateStatus.mutate({ id: task._id, status: newStatus });
  };

  const formatDueDate = (date) => {
    if (!date) return null;

    // Get today's date in local timezone as YYYY-MM-DD
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Get tomorrow's date string
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    // Extract date part from task's dueDate (avoids timezone issues)
    const dueDateStr = date.split('T')[0];

    if (dueDateStr < todayStr) {
      // Calculate days overdue
      const dueDate = new Date(dueDateStr + 'T00:00:00');
      const todayDate = new Date(todayStr + 'T00:00:00');
      const days = Math.floor((todayDate - dueDate) / (1000 * 60 * 60 * 24));
      return { text: `${days}d overdue`, className: 'text-danger' };
    }
    if (dueDateStr === todayStr) {
      return { text: 'Today', className: 'text-warning' };
    }
    if (dueDateStr === tomorrowStr) {
      return { text: 'Tomorrow', className: 'text-primary' };
    }
    // Format the date for display
    const d = new Date(dueDateStr + 'T12:00:00'); // Use noon to avoid timezone edge cases
    return {
      text: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      className: 'text-muted'
    };
  };

  const dueInfo = formatDueDate(task.dueDate);

  return (
    <div
      onClick={() => openTask(task._id)}
      className="group flex items-start gap-3 p-4 bg-panel border border-border rounded-xl hover:border-primary/50 cursor-pointer transition-all hover:shadow-sm"
    >
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          isCompleted
            ? 'bg-success border-success'
            : 'border-muted hover:border-primary'
        }`}
      >
        {isCompleted && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${isCompleted ? 'text-muted line-through' : 'text-text'}`}>
          {task.title}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {/* Priority */}
          {task.priority === 'high' && (
            <span className="flex items-center gap-1 text-xs text-danger">
              <Flag className="w-3 h-3" />
              High
            </span>
          )}
          {task.priority === 'low' && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <Flag className="w-3 h-3" />
              Low
            </span>
          )}

          {/* Due date */}
          {dueInfo && !isCompleted && (
            <span className={`flex items-center gap-1 text-xs ${dueInfo.className}`}>
              <Calendar className="w-3 h-3" />
              {dueInfo.text}
            </span>
          )}

          {/* Status badge for in-progress */}
          {task.status === 'in_progress' && (
            <span className="flex items-center gap-1 text-xs text-blue-500">
              <Clock className="w-3 h-3" />
              In Progress
            </span>
          )}

          {/* Tags */}
          {task.tags?.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded"
            >
              {tag}
            </span>
          ))}
          {task.tags?.length > 2 && (
            <span className="text-xs text-muted">+{task.tags.length - 2}</span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </div>
  );
}

// Task Section
function TaskSection({ title, icon: Icon, iconColor, tasks, emptyText, defaultOpen = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (tasks.length === 0 && !emptyText) return null;

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left"
      >
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className="text-sm font-semibold text-text">{title}</span>
        <span className="text-xs text-muted bg-panel2 px-2 py-0.5 rounded-full">{tasks.length}</span>
        <ChevronRight className={`w-4 h-4 text-muted ml-auto transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {isOpen && (
        <div className="space-y-2 pl-6">
          {tasks.length > 0 ? (
            tasks.map((task) => <TaskCard key={task._id} task={task} />)
          ) : emptyText ? (
            <p className="text-sm text-muted py-4 text-center">{emptyText}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function TasksList() {
  const [filters, setFilters] = useState({
    q: '',
    status: '',
    priority: '',
  });

  const { data, isLoading, error } = useTasks(filters);
  const createTask = useCreateTask();

  const handleCreateTask = async (title) => {
    try {
      await createTask.mutateAsync({ title });
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  // Group tasks by section
  const groupedTasks = useMemo(() => {
    const tasks = data?.tasks || [];

    // Get today's date components in LOCAL timezone
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    // Create date string for comparison (YYYY-MM-DD format)
    const todayStr = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDate).padStart(2, '0')}`;

    const overdue = [];
    const dueToday = [];
    const upcoming = [];
    const completed = [];
    const noDate = [];

    tasks.forEach((task) => {
      if (task.status === 'done' || task.status === 'cancelled') {
        completed.push(task);
        return;
      }

      if (!task.dueDate) {
        noDate.push(task);
        return;
      }

      // Extract just the date part from the ISO string (YYYY-MM-DD)
      // This avoids timezone conversion issues since we compare date strings directly
      const dueDateStr = task.dueDate.split('T')[0];

      if (dueDateStr < todayStr) {
        overdue.push(task);
      } else if (dueDateStr === todayStr) {
        dueToday.push(task);
      } else {
        upcoming.push(task);
      }
    });

    // Sort by due date
    const sortByDue = (a, b) => new Date(a.dueDate) - new Date(b.dueDate);
    overdue.sort(sortByDue);
    dueToday.sort(sortByDue);
    upcoming.sort(sortByDue);

    return { overdue, dueToday, upcoming, completed, noDate };
  }, [data?.tasks]);

  return (
    <div className="h-full flex flex-col bg-bg">
      {/* Header */}
      <div className="flex-shrink-0 p-6 pb-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <CheckSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text">Tasks</h1>
              <p className="text-sm text-muted">Manage your to-dos</p>
            </div>
          </div>
          <HeaderStats />
        </div>

        {/* Quick Add */}
        <div className="mb-4">
          <QuickAddTask onAdd={handleCreateTask} isAdding={createTask.isPending} />
        </div>

        {/* Filters */}
        <div className="mb-6">
          <FilterPills filters={filters} onFiltersChange={setFilters} />
        </div>
      </div>

      {/* Tasks Content */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-panel border border-border rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-danger">Failed to load tasks</p>
          </div>
        ) : !data?.tasks?.length ? (
          <EmptyState
            icon={CheckSquare}
            title="No tasks yet"
            description={
              filters.q || filters.status || filters.priority
                ? "No tasks match your filters"
                : "Add your first task above to get started"
            }
          />
        ) : (
          <div className="space-y-6">
            {/* Overdue */}
            {groupedTasks.overdue.length > 0 && (
              <TaskSection
                title="Overdue"
                icon={AlertTriangle}
                iconColor="text-danger"
                tasks={groupedTasks.overdue}
              />
            )}

            {/* Due Today */}
            <TaskSection
              title="Due Today"
              icon={Clock}
              iconColor="text-warning"
              tasks={groupedTasks.dueToday}
              emptyText={!filters.status && !filters.priority ? "No tasks due today" : undefined}
            />

            {/* Upcoming */}
            <TaskSection
              title="Upcoming"
              icon={Calendar}
              iconColor="text-primary"
              tasks={groupedTasks.upcoming}
              defaultOpen={groupedTasks.overdue.length === 0 && groupedTasks.dueToday.length === 0}
            />

            {/* No Due Date */}
            {groupedTasks.noDate.length > 0 && (
              <TaskSection
                title="No Due Date"
                icon={InboxIcon}
                iconColor="text-muted"
                tasks={groupedTasks.noDate}
                defaultOpen={false}
              />
            )}

            {/* Completed */}
            {groupedTasks.completed.length > 0 && (
              <TaskSection
                title="Completed"
                icon={CheckCircle2}
                iconColor="text-success"
                tasks={groupedTasks.completed}
                defaultOpen={false}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default TasksList;
