/**
 * TaskItem - Complete task row component for dashboard widgets
 *
 * Features:
 * - TaskCheckbox on left
 * - Title with strikethrough when completed
 * - Optional tags (OVERDUE, TODAY badges)
 * - Hover actions on right (edit, delete icons)
 * - V2 CSS variables for styling
 * - Dark mode support
 * - Reusable across the app
 *
 * @param {Object} props
 * @param {Object} props.task - Task object with _id, title, status, priority, etc.
 * @param {Function} props.onComplete - Callback when task is marked complete/incomplete
 * @param {Function} props.onEdit - Callback when edit button is clicked
 * @param {Function} props.onDelete - Callback when delete button is clicked
 * @param {Function} props.onClick - Callback when task row is clicked
 * @param {boolean} props.showHoverActions - Whether to show hover actions (default: true)
 * @param {string} props.badge - Badge type: 'overdue' | 'today' | null
 * @param {string} props.meta - Meta text to display below title (e.g., "Project - Priority")
 * @param {string} props.className - Additional CSS classes
 */

import PropTypes from 'prop-types';
import TaskCheckbox from './TaskCheckbox';
import './TaskItem.css';

function TaskItem({
  task,
  onComplete,
  onEdit,
  onDelete,
  onClick,
  showHoverActions = true,
  badge = null,
  meta = null,
  className = ''
}) {
  /**
   * Handle checkbox toggle
   */
  const handleCheckboxChange = (checked) => {
    onComplete?.(task._id, checked);
  };

  /**
   * Handle task row click
   */
  const handleRowClick = () => {
    onClick?.(task._id);
  };

  /**
   * Handle edit button click
   */
  const handleEditClick = (e) => {
    e.stopPropagation();
    onEdit?.(task._id);
  };

  /**
   * Handle delete button click
   */
  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete?.(task._id);
  };

  /**
   * Get badge element based on badge type
   */
  const getBadge = () => {
    if (!badge) return null;

    const badges = {
      overdue: <span className="task-item__badge task-item__badge--overdue">Overdue</span>,
      today: <span className="task-item__badge task-item__badge--today">Today</span>
    };

    return badges[badge] || null;
  };

  const isCompleted = task.status === 'completed';
  const isOverdue = badge === 'overdue';

  return (
    <div
      className={`task-item ${isOverdue ? 'task-item--overdue' : ''} ${isCompleted ? 'task-item--completed' : ''} ${className}`}
      onClick={handleRowClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleRowClick();
        }
      }}
    >
      {/* Checkbox */}
      <TaskCheckbox
        checked={isCompleted}
        onChange={handleCheckboxChange}
        priority={task.priority || 'none'}
      />

      {/* Task content: title and meta */}
      <div className="task-item__content">
        <p className={`task-item__title ${isCompleted ? 'task-item__title--completed' : ''}`}>
          {task.title}
        </p>
        {meta && (
          <p className="task-item__meta">
            {meta}
          </p>
        )}
      </div>

      {/* Badge */}
      {getBadge()}

      {/* Hover actions */}
      {showHoverActions && (
        <div className="task-item__actions">
          {onEdit && (
            <button
              type="button"
              className="task-item__action-btn task-item__action-btn--edit"
              onClick={handleEditClick}
              title="Edit task"
              aria-label="Edit task"
            >
              &#9998;
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="task-item__action-btn task-item__action-btn--delete"
              onClick={handleDeleteClick}
              title="Delete task"
              aria-label="Delete task"
            >
              &#128465;
            </button>
          )}
        </div>
      )}
    </div>
  );
}

TaskItem.propTypes = {
  task: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    status: PropTypes.string,
    priority: PropTypes.oneOf(['urgent', 'high', 'medium', 'low', 'none']),
  }).isRequired,
  onComplete: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onClick: PropTypes.func,
  showHoverActions: PropTypes.bool,
  badge: PropTypes.oneOf(['overdue', 'today', null]),
  meta: PropTypes.string,
  className: PropTypes.string,
};

export default TaskItem;
