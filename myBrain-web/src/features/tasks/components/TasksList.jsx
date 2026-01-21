import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Inbox as InboxIcon,
  Archive,
  Trash2,
  RotateCcw,
  ArchiveRestore
} from 'lucide-react';
import MobilePageHeader from '../../../components/layout/MobilePageHeader';
import { useSelector } from 'react-redux';
import { useTasks, useUpdateTaskStatus, useTodayView, useUnarchiveTask, useRestoreTask } from '../hooks/useTasks';
import { useTaskPanel } from '../../../contexts/TaskPanelContext';
import { selectSelectedLifeAreaId } from '../../../store/lifeAreasSlice';
import { LifeAreaBadge } from '../../lifeAreas/components/LifeAreaBadge';
import EmptyState from '../../../components/ui/EmptyState';

// Tab definitions
const TABS = [
  { id: 'active', label: 'Active', icon: Circle, statuses: 'todo,in_progress' },
  { id: 'archived', label: 'Archived', icon: Archive, statuses: 'done,cancelled,archived' },
  { id: 'trash', label: 'Trash', icon: Trash2, statuses: 'trashed' },
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

// Search and Filter Bar (no status pills - using tabs instead)
function SearchFilterBar({ filters, onFiltersChange }) {
  const [showFilters, setShowFilters] = useState(false);
  const hasActiveFilters = filters.priority;

  return (
    <div className="space-y-3">
      {/* Search and filter toggle */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={filters.q || ''}
            onChange={(e) => onFiltersChange({ ...filters, q: e.target.value })}
            placeholder="Search tasks..."
            className="w-full pl-10 pr-10 py-2.5 bg-panel border border-border rounded-xl text-sm focus:outline-none focus:border-primary transition-colors min-h-[44px]"
          />
          {filters.q && (
            <button
              onClick={() => onFiltersChange({ ...filters, q: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text p-1 min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors min-h-[44px] ${
            hasActiveFilters
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-panel hover:bg-panel2 active:bg-panel2 text-muted'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">Filter</span>
          {hasActiveFilters && <span className="w-1.5 h-1.5 bg-primary rounded-full" />}
        </button>
      </div>

      {/* Filter options - just priority now */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-2 p-4 bg-panel border border-border rounded-xl">
          {/* Priority pills */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-1">
            <span className="text-xs text-muted sm:mr-1">Priority:</span>
            <div className="flex flex-wrap gap-1.5 sm:gap-1">
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onFiltersChange({ ...filters, priority: option.value })}
                  className={`px-3 py-2 sm:px-2.5 sm:py-1 text-xs rounded-lg transition-colors min-h-[36px] sm:min-h-0 ${
                    filters.priority === option.value
                      ? 'bg-primary text-white'
                      : 'bg-bg hover:bg-panel2 active:bg-panel2 text-muted'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => onFiltersChange({ ...filters, priority: '' })}
              className="sm:ml-auto flex items-center gap-1 px-3 py-2 sm:px-2.5 sm:py-1 text-xs text-muted hover:text-text active:text-text min-h-[36px] sm:min-h-0"
            >
              <X className="w-3 h-3" />
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Tab Navigation Component
function TabNav({ activeTab, onTabChange, counts }) {
  return (
    <div className="flex border-b border-border">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const count = counts[tab.id] || 0;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-text hover:border-border'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-primary/10 text-primary' : 'bg-panel2 text-muted'
              }`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Task Card Component
function TaskCard({ task }) {
  const { openTask } = useTaskPanel();
  const updateStatus = useUpdateTaskStatus();
  const unarchiveTask = useUnarchiveTask();
  const restoreTask = useRestoreTask();

  const isCompleted = task.status === 'done' || task.status === 'cancelled';
  const isManuallyArchived = task.status === 'archived'; // Manually archived (not just completed)
  const isTrashed = task.status === 'trashed';

  const handleToggle = (e) => {
    e.stopPropagation();
    // Toggle between done and todo
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateStatus.mutate({ id: task._id, status: newStatus });
  };

  const handleRestore = (e) => {
    e.stopPropagation();
    if (isManuallyArchived) {
      unarchiveTask.mutate(task._id);
    } else if (isTrashed) {
      restoreTask.mutate(task._id);
    }
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
      className={`group flex items-start gap-3 p-4 bg-panel border border-border rounded-xl hover:border-primary/50 active:border-primary/50 cursor-pointer transition-all shadow-theme-card hover:shadow-theme-elevated active:scale-[0.99] ${
        (isManuallyArchived || isTrashed) ? 'opacity-75' : ''
      }`}
    >
      {/* Action button: Restore for archived/trashed, Checkbox for others */}
      {isManuallyArchived || isTrashed ? (
        // Restore button for manually archived or trashed tasks
        <button
          onClick={handleRestore}
          className="flex-shrink-0 w-10 h-10 -m-2 flex items-center justify-center hover:bg-primary/10 rounded-lg transition-colors"
          title={isManuallyArchived ? 'Restore from archive' : 'Restore from trash'}
        >
          {isManuallyArchived ? (
            <ArchiveRestore className="w-5 h-5 text-blue-500" />
          ) : (
            <RotateCcw className="w-5 h-5 text-green-500" />
          )}
        </button>
      ) : (
        // Checkbox for active and completed tasks (can toggle done status)
        <button
          onClick={handleToggle}
          className="flex-shrink-0 w-10 h-10 -m-2 flex items-center justify-center"
          title={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
        >
          <span className={`w-6 h-6 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            isCompleted
              ? 'bg-success border-success'
              : 'border-muted hover:border-primary'
          }`}>
            {isCompleted && (
              <svg className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </span>
        </button>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${isCompleted || isManuallyArchived || isTrashed ? 'text-muted' : 'text-text'} ${isCompleted ? 'line-through' : ''}`}>
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

          {/* Status badge for completed */}
          {task.status === 'done' && (
            <span className="flex items-center gap-1 text-xs text-success">
              <CheckCircle2 className="w-3 h-3" />
              Completed
            </span>
          )}

          {/* Status badge for cancelled */}
          {task.status === 'cancelled' && (
            <span className="flex items-center gap-1 text-xs text-muted">
              <XCircle className="w-3 h-3" />
              Cancelled
            </span>
          )}

          {/* Status badge for manually archived */}
          {isManuallyArchived && (
            <span className="flex items-center gap-1 text-xs text-blue-500">
              <Archive className="w-3 h-3" />
              Archived
            </span>
          )}

          {/* Status badge for trashed */}
          {isTrashed && (
            <span className="flex items-center gap-1 text-xs text-red-500">
              <Trash2 className="w-3 h-3" />
              In Trash
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
  const selectedLifeAreaId = useSelector(selectSelectedLifeAreaId);
  const [searchParams, setSearchParams] = useSearchParams();
  const { openNewTask } = useTaskPanel();
  const [activeTab, setActiveTab] = useState('active');
  const [filters, setFilters] = useState({
    q: '',
    priority: '',
  });

  // Handle ?new=true query parameter
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      openNewTask();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, openNewTask]);

  // Get the current tab config
  const currentTab = TABS.find(t => t.id === activeTab) || TABS[0];

  // Build query params based on active tab
  const queryParams = useMemo(() => {
    const params = { ...filters, status: currentTab.statuses };
    if (selectedLifeAreaId) {
      params.lifeAreaId = selectedLifeAreaId;
    }
    return params;
  }, [filters, selectedLifeAreaId, currentTab.statuses]);

  const { data, isLoading, error } = useTasks(queryParams);

  // Fetch counts for all tabs (for the tab badges)
  const { data: activeData } = useTasks({ status: 'todo,in_progress', limit: 1 });
  const { data: archivedData } = useTasks({ status: 'done,cancelled,archived', limit: 1 });
  const { data: trashData } = useTasks({ status: 'trashed', limit: 1 });

  const tabCounts = {
    active: activeData?.total || 0,
    archived: archivedData?.total || 0,
    trash: trashData?.total || 0,
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
      {/* Mobile Header */}
      <MobilePageHeader
        title="Tasks"
        icon={CheckSquare}
        rightAction={
          <button
            onClick={() => openNewTask()}
            className="p-2 text-primary hover:text-primary-hover transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Plus className="w-6 h-6" />
          </button>
        }
      />

      {/* Desktop Header */}
      <div className="hidden sm:block flex-shrink-0 p-6 pb-0">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-text">Tasks</h1>
              <p className="text-sm text-muted">Single actionable items to complete</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <HeaderStats />
            <button
              onClick={() => openNewTask()}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-hover transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">New Task</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation - Desktop */}
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} counts={tabCounts} />

        {/* Filters */}
        <div className="py-4">
          <SearchFilterBar filters={filters} onFiltersChange={setFilters} />
        </div>
      </div>

      {/* Mobile Tab Navigation and Filters */}
      <div className="sm:hidden flex-shrink-0">
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} counts={tabCounts} />
        <div className="px-4 py-3">
          <SearchFilterBar filters={filters} onFiltersChange={setFilters} />
        </div>
      </div>

      {/* Tasks Content */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 pb-6">
        <div key={activeTab} className="animate-tab-fade-in">
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
          <div className="text-center py-12 max-w-md mx-auto">
            {activeTab === 'active' ? (
              <>
                <CheckSquare className="w-16 h-16 mx-auto text-muted/30 mb-4" />
                <h3 className="text-lg font-medium text-text mb-2">No active tasks</h3>
                {filters.q || filters.priority ? (
                  <p className="text-sm text-muted">No tasks match your filters</p>
                ) : (
                  <div className="text-sm text-muted space-y-2">
                    <p>
                      <strong className="text-text">Tasks</strong> are single, actionable items that can be
                      completed in one sitting.
                    </p>
                    <button
                      onClick={() => openNewTask()}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create a task
                    </button>
                  </div>
                )}
              </>
            ) : activeTab === 'archived' ? (
              <>
                <Archive className="w-16 h-16 mx-auto text-muted/30 mb-4" />
                <h3 className="text-lg font-medium text-text mb-2">No archived tasks</h3>
                <p className="text-sm text-muted">Completed tasks will appear here</p>
              </>
            ) : (
              <>
                <Trash2 className="w-16 h-16 mx-auto text-muted/30 mb-4" />
                <h3 className="text-lg font-medium text-text mb-2">Trash is empty</h3>
                <p className="text-sm text-muted">Deleted tasks will appear here</p>
              </>
            )}
          </div>
        ) : activeTab === 'archived' ? (
          /* Archived tasks - simple list with restore option */
          <div className="space-y-3">
            <p className="text-sm text-muted mb-4">
              Completed and archived tasks. Click the restore icon to move back to active.
            </p>
            {data.tasks.map((task) => (
              <TaskCard key={task._id} task={task} />
            ))}
          </div>
        ) : activeTab === 'trash' ? (
          /* Trashed tasks - simple list with restore/delete options */
          <div className="space-y-3">
            <p className="text-sm text-muted mb-4">
              Click the restore icon to recover tasks, or open them to permanently delete.
            </p>
            {data.tasks.map((task) => (
              <TaskCard key={task._id} task={task} />
            ))}
          </div>
        ) : (
          /* Active tasks - grouped view */
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
              emptyText={!filters.priority ? "No tasks due today" : undefined}
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
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default TasksList;
