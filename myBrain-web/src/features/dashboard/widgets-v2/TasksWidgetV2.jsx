/**
 * TasksWidgetV2 - Tasks widget matching prototype design
 *
 * Features:
 * - Flat task list with OVERDUE/TODAY badges
 * - Filter dropdown in header (Today/This Week/All)
 * - Task items: checkbox, title, project + priority meta, badge
 * - Hover actions: Done (checkmark) and Defer (arrow) buttons
 * - Color-coded left border for overdue items
 * - Clicking task opens task panel
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { useTaskPanel } from '../../../contexts/TaskPanelContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/api';
import { addDays, startOfDay, nextMonday, endOfWeek } from 'date-fns';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';

/**
 * Capitalize first letter of a string
 */
const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

/**
 * TasksWidgetV2 Component
 *
 * @param {Object} props - Component props
 * @param {Array} props.tasks - Upcoming tasks (not overdue, not due today)
 * @param {Array} props.overdueTasks - Tasks past their due date
 * @param {Array} props.dueTodayTasks - Tasks due today
 */
function TasksWidgetV2({ tasks = [], overdueTasks = [], dueTodayTasks = [] }) {
  // Get task panel context for opening task details
  const { openTask, openNewTask } = useTaskPanel();

  // Query client for cache invalidation after mutations
  const queryClient = useQueryClient();

  // Filter state: 'today' | 'week' | 'all'
  const [filter, setFilter] = useState('today');

  // State for defer dropdown and delete confirmation
  const [deferMenuTaskId, setDeferMenuTaskId] = useState(null);
  const [deleteConfirmTaskId, setDeleteConfirmTaskId] = useState(null);
  const deferMenuRef = useRef(null);

  /**
   * Close defer menu when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (deferMenuRef.current && !deferMenuRef.current.contains(e.target)) {
        setDeferMenuTaskId(null);
      }
    };

    if (deferMenuTaskId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [deferMenuTaskId]);

  /**
   * Combine and filter tasks based on selected filter
   * Each task gets a badge type: 'overdue' | 'today' | null
   */
  const filteredTasks = useMemo(() => {
    // Tag each task with its badge type
    const taggedOverdue = overdueTasks.map(t => ({ ...t, badgeType: 'overdue' }));
    const taggedToday = dueTodayTasks.map(t => ({ ...t, badgeType: 'today' }));
    const taggedUpcoming = tasks.map(t => ({ ...t, badgeType: null }));

    // Combine all tasks
    const allTasks = [...taggedOverdue, ...taggedToday, ...taggedUpcoming];

    // Apply filter
    switch (filter) {
      case 'today':
        // Show overdue + due today
        return [...taggedOverdue, ...taggedToday];
      case 'week': {
        // Show tasks due within the week
        const weekEnd = endOfWeek(new Date());
        return allTasks.filter(task => {
          if (!task.dueDate) return false;
          const dueDate = new Date(task.dueDate);
          return dueDate <= weekEnd;
        });
      }
      case 'all':
      default:
        return allTasks;
    }
  }, [tasks, overdueTasks, dueTodayTasks, filter]);

  /**
   * Mutation for toggling task completion status
   */
  const toggleComplete = useMutation({
    mutationFn: async (taskId) => {
      // Find the task across all groups
      const allTasks = [...tasks, ...overdueTasks, ...dueTodayTasks];
      const task = allTasks.find((t) => t._id === taskId);
      // Toggle between 'completed' and 'todo'
      const newStatus = task?.status === 'completed' ? 'todo' : 'completed';
      return api.post(`/tasks/${taskId}/status`, { status: newStatus });
    },
    onSuccess: () => {
      // Refresh dashboard data after successful toggle
      queryClient.invalidateQueries(['dashboard']);
    },
  });

  /**
   * Mutation for updating task due date (defer)
   */
  const deferTask = useMutation({
    mutationFn: async ({ taskId, dueDate }) => {
      return api.put(`/tasks/${taskId}`, { dueDate: dueDate.toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboard']);
      setDeferMenuTaskId(null);
    },
  });

  /**
   * Mutation for deleting a task
   */
  const deleteTask = useMutation({
    mutationFn: async (taskId) => {
      return api.delete(`/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['dashboard']);
    },
  });

  /**
   * Handle checkbox click - marks task as complete
   */
  const handleCheckboxClick = (e, taskId) => {
    e.stopPropagation();
    toggleComplete.mutate(taskId);
  };

  /**
   * Handle Done button click - marks task as complete
   */
  const handleDoneClick = (e, taskId) => {
    e.stopPropagation();
    toggleComplete.mutate(taskId);
  };

  /**
   * Handle defer button click - shows defer menu
   */
  const handleDeferClick = (e, taskId) => {
    e.stopPropagation();
    setDeferMenuTaskId(deferMenuTaskId === taskId ? null : taskId);
  };

  /**
   * Handle defer option selection
   */
  const handleDeferOption = (e, taskId, option) => {
    e.stopPropagation();
    const today = startOfDay(new Date());
    let newDueDate;

    switch (option) {
      case 'tomorrow':
        newDueDate = addDays(today, 1);
        break;
      case 'nextWeek':
        newDueDate = nextMonday(today);
        break;
      default:
        return;
    }

    deferTask.mutate({ taskId, dueDate: newDueDate });
  };

  /**
   * Handle delete button click - shows confirmation dialog
   */
  const handleDeleteClick = (e, taskId) => {
    e.stopPropagation();
    setDeleteConfirmTaskId(taskId);
  };

  /**
   * Handle delete confirmation
   */
  const handleDeleteConfirm = () => {
    if (deleteConfirmTaskId) {
      deleteTask.mutate(deleteConfirmTaskId);
      setDeleteConfirmTaskId(null);
    }
  };

  /**
   * Handle filter change
   */
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  /**
   * Format priority for display
   */
  const formatPriority = (priority) => {
    if (!priority || priority === 'none') return null;
    return `${capitalize(priority)} Priority`;
  };

  const isEmpty = filteredTasks.length === 0;

  return (
    <>
      <div className="widget">
        {/* Widget header with title and filter dropdown */}
        <div className="widget-header">
          <span className="widget-title">
            <span className="widget-title-icon" role="img" aria-label="Tasks">&#128203;</span>
            Tasks
          </span>
          <select
            className="widget-dropdown"
            value={filter}
            onChange={handleFilterChange}
            aria-label="Filter tasks"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="all">All</option>
          </select>
        </div>

        {/* Task list */}
        <div className="task-list">
          {isEmpty ? (
            <div className="v2-empty-state">
              <p>No tasks to show</p>
              <button className="v2-btn v2-btn--secondary" onClick={openNewTask} aria-label="Create a task">
                Create a task
              </button>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task._id}
                className={`task-item ${task.badgeType === 'overdue' ? 'overdue' : ''}`}
                onClick={() => openTask(task._id)}
              >
                {/* Checkbox */}
                <div
                  className={`task-checkbox ${task.status === 'completed' ? 'checked' : ''}`}
                  onClick={(e) => handleCheckboxClick(e, task._id)}
                >
                  {task.status === 'completed' && <span>&#10003;</span>}
                </div>

                {/* Task content: title and meta */}
                <div className="task-content">
                  <p className={`task-name ${task.status === 'completed' ? 'completed' : ''}`}>
                    {task.title}
                  </p>
                  <p className="task-meta">
                    {task.projectId?.name || task.project?.name || 'No Project'}
                    {task.priority && task.priority !== 'none' && (
                      <> - {formatPriority(task.priority)}</>
                    )}
                  </p>
                </div>

                {/* Badge: OVERDUE or TODAY */}
                {task.badgeType === 'overdue' && (
                  <span className="task-tag overdue">Overdue</span>
                )}
                {task.badgeType === 'today' && (
                  <span className="task-tag today">Today</span>
                )}

                {/* Hover actions: Done and Defer */}
                <div className="task-actions">
                  {/* Done button */}
                  <button
                    className="task-action-btn done"
                    title="Complete"
                    onClick={(e) => handleDoneClick(e, task._id)}
                    aria-label="Complete task"
                  >
                    &#10003;
                  </button>

                  {/* Defer button with dropdown */}
                  <div
                    className="defer-container"
                    ref={deferMenuTaskId === task._id ? deferMenuRef : null}
                  >
                    <button
                      className="task-action-btn defer"
                      title="Defer"
                      onClick={(e) => handleDeferClick(e, task._id)}
                      aria-label="Defer task"
                    >
                      &#8594;
                    </button>

                    {/* Defer dropdown menu */}
                    {deferMenuTaskId === task._id && (
                      <div className="defer-menu">
                        <button
                          className="defer-option"
                          onClick={(e) => handleDeferOption(e, task._id, 'tomorrow')}
                          aria-label="Defer until tomorrow"
                        >
                          Tomorrow
                        </button>
                        <button
                          className="defer-option"
                          onClick={(e) => handleDeferOption(e, task._id, 'nextWeek')}
                          aria-label="Defer until next week"
                        >
                          Next Week
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add task button */}
        {!isEmpty && (
          <button className="add-task-btn" onClick={openNewTask} aria-label="Add task">
            + Add task
          </button>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirmTaskId}
        onClose={() => setDeleteConfirmTaskId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}

export default TasksWidgetV2;
