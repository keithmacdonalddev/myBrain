/**
 * HoverActions - Reusable reveal-on-hover action buttons component
 *
 * Used throughout V2 dashboard widgets (tasks, events, notes, inbox)
 * to provide inline actions that appear when hovering over items.
 *
 * Features:
 * - Hidden by default, revealed on parent hover
 * - Fade in/slide animation
 * - Support for multiple button variants (default, danger, primary)
 * - Keyboard navigable with proper ARIA labels
 * - Uses V2 CSS variables for theming
 *
 * @param {Object} props
 * @param {Array} props.actions - Array of action objects {icon, label, onClick, variant}
 * @param {boolean} props.visible - Optional override to force visibility
 * @param {string} props.position - Position alignment ('right' | 'left'), defaults to 'right'
 * @param {string} props.className - Additional CSS classes to apply
 *
 * @example
 * <HoverActions
 *   actions={[
 *     { icon: <Edit />, label: 'Edit', onClick: handleEdit, variant: 'default' },
 *     { icon: <Trash />, label: 'Delete', onClick: handleDelete, variant: 'danger' }
 *   ]}
 * />
 */

import PropTypes from 'prop-types';
import './HoverActions.css';

function HoverActions({ actions = [], visible = false, position = 'right', className = '' }) {
  // Don't render if no actions provided
  if (actions.length === 0) {
    return null;
  }

  return (
    <div
      className={`v2-hover-actions v2-hover-actions--${position} ${className}`}
      data-visible={visible}
      role="group"
      aria-label="Item actions"
    >
      {actions.map((action, index) => (
        <button
          key={action.label || index}
          onClick={action.onClick}
          className={`v2-hover-action v2-hover-action--${action.variant || 'default'}`}
          title={action.label}
          aria-label={action.label}
          type="button"
          disabled={action.disabled}
        >
          {action.icon}
        </button>
      ))}
    </div>
  );
}

HoverActions.propTypes = {
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      icon: PropTypes.node.isRequired,
      label: PropTypes.string.isRequired,
      onClick: PropTypes.func.isRequired,
      variant: PropTypes.oneOf(['default', 'danger', 'primary', 'success']),
      disabled: PropTypes.bool,
    })
  ).isRequired,
  visible: PropTypes.bool,
  position: PropTypes.oneOf(['right', 'left']),
  className: PropTypes.string,
};

export default HoverActions;
