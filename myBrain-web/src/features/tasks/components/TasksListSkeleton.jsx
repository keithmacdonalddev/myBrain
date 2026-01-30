/**
 * =============================================================================
 * TASKSLISTSKELETON.JSX - Tasks List Loading Skeleton
 * =============================================================================
 *
 * View-aware skeleton for TasksList. Supports all 4 view modes:
 * - list: Grouped sections with task cards
 * - board: 3-column Kanban
 * - table: Table rows
 * - calendar: Month grid
 */

import { Skeleton } from '../../../components/ui/Skeleton';

/**
 * Task card skeleton (~100px height)
 * Matches TaskCard layout with checkbox, title, and meta row
 */
function TaskCardSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 bg-panel border border-border rounded-xl h-[100px]">
      {/* Checkbox */}
      <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0">
        {/* Title */}
        <Skeleton className="h-4 w-3/4 mb-3" />
        {/* Meta row: priority, due date, project */}
        <div className="flex gap-2 flex-wrap">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

/**
 * Task section skeleton
 * Section header with collapsible task cards
 */
function TaskSectionSkeleton({ taskCount = 3 }) {
  return (
    <div className="space-y-3">
      {/* Section header: icon + title + count badge + chevron */}
      <div className="flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-6 rounded-full" />
        <Skeleton className="w-4 h-4 ml-auto rounded" />
      </div>
      {/* Task cards */}
      <div className="space-y-2 pl-6">
        {[...Array(taskCount)].map((_, i) => (
          <TaskCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * List view skeleton
 * Grouped sections: Overdue, Due Today, Upcoming, No Due Date
 */
function TasksListViewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Due Today section */}
      <TaskSectionSkeleton taskCount={3} />
      {/* Upcoming section */}
      <TaskSectionSkeleton taskCount={4} />
      {/* No Due Date section (collapsed by default, fewer items) */}
      <TaskSectionSkeleton taskCount={2} />
    </div>
  );
}

/**
 * Board view skeleton
 * 3-column Kanban: To Do, In Progress, Done
 */
function TasksBoardSkeleton() {
  const columns = ['To Do', 'In Progress', 'Done'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {columns.map((col, colIndex) => (
        <div key={col} className="bg-panel/50 rounded-xl p-3">
          {/* Column header */}
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>
          {/* Column cards */}
          <div className="space-y-2">
            {[...Array(colIndex === 0 ? 4 : colIndex === 1 ? 2 : 1)].map((_, i) => (
              <div key={i} className="bg-panel border border-border rounded-lg p-3 h-[80px]">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2 mb-2" />
                <div className="flex gap-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Table view skeleton
 * Table with header row and data rows
 */
function TasksTableSkeleton() {
  const columnWidths = ['w-2/5', 'w-20', 'w-16', 'w-24', 'w-28'];

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Table header */}
      <div className="bg-panel/50 px-4 py-3 border-b border-border">
        <div className="grid grid-cols-5 gap-4">
          {['Task', 'Status', 'Priority', 'Due Date', 'Project'].map((h, i) => (
            <Skeleton key={h} className={`h-4 ${columnWidths[i]}`} />
          ))}
        </div>
      </div>
      {/* Table rows */}
      {[...Array(8)].map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-border last:border-0">
          <div className="grid grid-cols-5 gap-4 items-center">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Calendar view skeleton
 * Month grid with day cells
 */
function TasksCalendarSkeleton() {
  const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-panel border border-border rounded-xl p-4">
      {/* Calendar header: month/year + nav buttons */}
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayHeaders.map(day => (
          <div key={day} className="text-center py-2">
            <Skeleton className="h-4 w-8 mx-auto" />
          </div>
        ))}
      </div>
      {/* Calendar cells (5 rows x 7 days) */}
      <div className="grid grid-cols-7 gap-1">
        {[...Array(35)].map((_, i) => (
          <div key={i} className="h-20 bg-panel/50 border border-border/50 rounded p-1">
            <Skeleton className="h-3 w-4 mb-1" />
            {/* Random task indicators in some cells */}
            {i % 5 === 0 && <Skeleton className="h-2 w-full rounded mb-0.5" />}
            {i % 7 === 2 && <Skeleton className="h-2 w-3/4 rounded" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * TasksListSkeleton
 *
 * View-aware skeleton that matches the actual TasksList layout.
 * Renders different skeletons based on viewMode.
 *
 * @param {Object} props
 * @param {string} props.viewMode - 'list', 'board', 'table', or 'calendar'
 */
export default function TasksListSkeleton({ viewMode = 'list' }) {
  switch (viewMode) {
    case 'board':
      return <TasksBoardSkeleton />;
    case 'table':
      return <TasksTableSkeleton />;
    case 'calendar':
      return <TasksCalendarSkeleton />;
    default:
      return <TasksListViewSkeleton />;
  }
}

// Export individual components for reuse
export { TaskCardSkeleton, TaskSectionSkeleton };
