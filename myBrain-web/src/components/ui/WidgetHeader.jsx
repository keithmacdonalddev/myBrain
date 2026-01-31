/**
 * =============================================================================
 * WIDGETHEADER.JSX - Reusable Widget Header Component
 * =============================================================================
 *
 * Standardized header for dashboard widgets with:
 * - Title text (uppercase, bold styling)
 * - Optional icon before title
 * - Optional actions slot (dropdowns, buttons, etc.)
 * - Optional bottom border
 *
 * Uses V2 CSS variables for theme consistency.
 *
 * @example
 * // Basic usage
 * <WidgetHeader>Tasks</WidgetHeader>
 *
 * @example
 * // With icon and actions
 * <WidgetHeader
 *   icon={<CheckSquare size={16} />}
 *   actions={
 *     <select>
 *       <option>Today</option>
 *       <option>This Week</option>
 *     </select>
 *   }
 * >
 *   My Tasks
 * </WidgetHeader>
 *
 * @example
 * // Without border
 * <WidgetHeader showBorder={false}>Notes</WidgetHeader>
 *
 * =============================================================================
 */

import PropTypes from 'prop-types';
import './WidgetHeader.css';

/**
 * WidgetHeader - Reusable header component for dashboard widgets
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Title content (left side)
 * @param {React.ReactNode} props.icon - Optional icon before title
 * @param {React.ReactNode} props.actions - Right side content (dropdown, buttons, etc.)
 * @param {boolean} props.showBorder - Whether to show bottom border (default: true)
 */
function WidgetHeader({ children, icon, actions, showBorder = true }) {
  return (
    <div className={`widget-header${!showBorder ? ' widget-header--no-border' : ''}`}>
      <div className="widget-title">
        {icon && <span className="widget-title-icon">{icon}</span>}
        {children}
      </div>
      {actions && <div className="widget-actions">{actions}</div>}
    </div>
  );
}

WidgetHeader.propTypes = {
  children: PropTypes.node,
  icon: PropTypes.node,
  actions: PropTypes.node,
  showBorder: PropTypes.bool
};

export default WidgetHeader;
