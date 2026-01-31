/**
 * TaskCheckbox - Circular checkbox for task completion
 *
 * Features:
 * - Circular design with smooth transitions
 * - Priority color ring when unchecked
 * - Subtle scale/fade animation on check
 * - V2 CSS variables for styling
 * - Dark mode support
 *
 * @param {Object} props
 * @param {boolean} props.checked - Whether the checkbox is checked
 * @param {Function} props.onChange - Callback when checkbox state changes
 * @param {string} props.priority - Task priority: 'urgent' | 'high' | 'medium' | 'low' | 'none'
 * @param {boolean} props.disabled - Whether the checkbox is disabled
 * @param {string} props.className - Additional CSS classes
 */

import './TaskCheckbox.css';

/**
 * Priority color mapping
 */
const PRIORITY_COLORS = {
  urgent: 'var(--priority-urgent)',
  high: 'var(--priority-high)',
  medium: 'var(--priority-medium)',
  low: 'var(--priority-low)',
  none: 'var(--v2-border-strong)'
};

function TaskCheckbox({
  checked = false,
  onChange,
  priority = 'none',
  disabled = false,
  className = ''
}) {
  /**
   * Handle checkbox click
   */
  const handleClick = (e) => {
    if (disabled) return;
    e.stopPropagation(); // Prevent parent click handlers
    onChange?.(!checked);
  };

  /**
   * Get border color based on priority
   */
  const getBorderColor = () => {
    if (checked) return 'var(--v2-status-success)';
    return PRIORITY_COLORS[priority] || PRIORITY_COLORS.none;
  };

  return (
    <div
      className={`task-checkbox ${checked ? 'task-checkbox--checked' : ''} ${disabled ? 'task-checkbox--disabled' : ''} ${className}`}
      onClick={handleClick}
      style={{ borderColor: getBorderColor() }}
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleClick(e);
        }
      }}
    >
      {checked && (
        <span className="task-checkbox__check">
          &#10003;
        </span>
      )}
    </div>
  );
}

export default TaskCheckbox;
