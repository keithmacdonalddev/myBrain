/**
 * NavItem - Navigation item component for sidebar navigation
 *
 * Features:
 * - Renders as NavLink when `to` prop is provided (for routing)
 * - Renders as button when `onClick` prop is provided without `to`
 * - Active state with blue background and blue text
 * - Hover state with separator/gray background
 * - Optional badge (red pill) for notification counts
 * - Collapsed mode shows icon only with tooltip
 * - V2 CSS variables for styling
 * - Dark mode support
 * - Keyboard accessible
 *
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon element to display
 * @param {string} props.label - Navigation label text
 * @param {string} props.to - Route path (renders as NavLink)
 * @param {number} props.badge - Optional badge count (shows red pill when > 0)
 * @param {boolean} props.active - Active state override
 * @param {Function} props.onClick - Click handler (renders as button when no `to`)
 * @param {boolean} props.collapsed - If true, hide label and show icon only with tooltip
 * @param {string} props.className - Additional CSS classes
 */

import { NavLink } from 'react-router-dom';
import PropTypes from 'prop-types';
import Tooltip from './Tooltip';
import './NavItem.css';

function NavItem({
  icon,
  label,
  to,
  badge,
  active,
  onClick,
  collapsed = false,
  className = ''
}) {
  /**
   * Check if badge should be displayed
   * Only show when badge is a number greater than 0
   */
  const showBadge = typeof badge === 'number' && badge > 0;

  /**
   * Render the inner content of the nav item
   */
  const renderContent = () => (
    <>
      {/* Icon container - always visible */}
      <span className="nav-item__icon">
        {icon}
      </span>

      {/* Label - hidden when collapsed */}
      {!collapsed && (
        <span className="nav-item__label">
          {label}
        </span>
      )}

      {/* Badge - shows count when > 0, always visible even collapsed */}
      {showBadge && (
        <span className="nav-item__badge" aria-label={`${badge} notifications`}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </>
  );

  /**
   * Common props for both NavLink and button
   */
  const commonProps = {
    className: `nav-item ${collapsed ? 'nav-item--collapsed' : ''} ${active ? 'active' : ''} ${className}`.trim(),
    'aria-label': collapsed ? label : undefined,
  };

  /**
   * Wrap in Tooltip when collapsed
   */
  const wrapWithTooltip = (element) => {
    if (collapsed) {
      return (
        <Tooltip content={label} position="right" delay={200} ignoreGlobalSetting>
          {element}
        </Tooltip>
      );
    }
    return element;
  };

  /**
   * Render as NavLink when `to` prop is provided
   * NavLink automatically handles active state via isActive
   */
  if (to) {
    return wrapWithTooltip(
      <NavLink
        to={to}
        {...commonProps}
        className={({ isActive }) =>
          `nav-item ${collapsed ? 'nav-item--collapsed' : ''} ${isActive || active ? 'active' : ''} ${className}`.trim()
        }
      >
        {renderContent()}
      </NavLink>
    );
  }

  /**
   * Render as button when onClick is provided
   */
  return wrapWithTooltip(
    <button
      type="button"
      onClick={onClick}
      {...commonProps}
    >
      {renderContent()}
    </button>
  );
}

NavItem.propTypes = {
  icon: PropTypes.node.isRequired,
  label: PropTypes.string.isRequired,
  to: PropTypes.string,
  badge: PropTypes.number,
  active: PropTypes.bool,
  onClick: PropTypes.func,
  collapsed: PropTypes.bool,
  className: PropTypes.string,
};

export default NavItem;
