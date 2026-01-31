/**
 * Widget - Reusable dashboard widget container component
 *
 * Standardized container for all V2 dashboard widgets with:
 * - Header with title, optional icon, and optional dropdown menu
 * - Flexible content area for children
 * - Loading state with skeleton
 * - Error state with message
 * - FadeIn animation with stagger support via animationDelay prop
 * - Uses v2 CSS variables for styling consistency
 *
 * @example
 * <Widget
 *   title="Tasks"
 *   icon="📋"
 *   actions={[
 *     { label: 'Today', value: 'today' },
 *     { label: 'This Week', value: 'week' }
 *   ]}
 *   onActionChange={(value) => setFilter(value)}
 *   animationDelay="0.1s"
 * >
 *   <TaskList tasks={tasks} />
 * </Widget>
 */

import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import './Widget.css';

/**
 * WidgetDropdown - Dropdown menu for widget actions
 *
 * @param {Object} props
 * @param {Array} props.actions - Array of action objects: { label: string, value: string }
 * @param {string} props.value - Currently selected value
 * @param {Function} props.onChange - Callback when selection changes
 */
function WidgetDropdown({ actions, value, onChange }) {
  if (!actions || actions.length === 0) return null;

  return (
    <select
      className="widget-dropdown v2-widget-dropdown"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {actions.map((action) => (
        <option key={action.value} value={action.value}>
          {action.label}
        </option>
      ))}
    </select>
  );
}

WidgetDropdown.propTypes = {
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ),
  value: PropTypes.string,
  onChange: PropTypes.func,
};

/**
 * WidgetSkeleton - Loading skeleton for widget content
 */
function WidgetSkeleton() {
  return (
    <div className="v2-widget__content">
      {/* Skeleton items */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="skeleton-v2-list-item">
          <div className="skeleton-v2" style={{ width: '20px', height: '20px', borderRadius: '50%' }}></div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div className="skeleton-v2" style={{ width: '60%', height: '14px' }}></div>
            <div className="skeleton-v2" style={{ width: '40%', height: '12px' }}></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * WidgetError - Error state display for widget
 *
 * @param {Object} props
 * @param {string} props.message - Error message to display
 */
function WidgetError({ message }) {
  return (
    <div className="v2-widget__content">
      <div className="v2-empty-state">
        <span className="v2-icon-lg">⚠️</span>
        <p style={{ color: 'var(--v2-status-error)' }}>
          {message || 'Failed to load widget'}
        </p>
      </div>
    </div>
  );
}

WidgetError.propTypes = {
  message: PropTypes.string,
};

/**
 * Widget - Main widget container component
 *
 * @param {Object} props
 * @param {string} props.title - Widget title
 * @param {string|React.ReactNode} props.icon - Optional icon (emoji string or React element)
 * @param {React.ReactNode} props.children - Widget content
 * @param {Array} props.actions - Optional dropdown menu items
 * @param {string} props.actionValue - Currently selected action value (for controlled dropdown)
 * @param {Function} props.onActionChange - Callback when action selection changes
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.loading - Show loading state
 * @param {string} props.error - Error message to display
 * @param {string} props.animationDelay - Animation delay for staggered entry (e.g., "0.1s", "0.2s")
 */
function Widget({
  title,
  icon,
  children,
  actions,
  actionValue,
  onActionChange,
  className = '',
  loading = false,
  error = null,
  animationDelay,
}) {
  // Build style object for animation delay
  const widgetStyle = animationDelay ? { '--widget-delay': animationDelay } : undefined;

  return (
    <div
      className={`v2-widget widget ${className}`}
      style={widgetStyle}
    >
      {/* Widget header */}
      <div className="v2-widget__header widget-header">
        <div className="v2-widget__title widget-title">
          {icon && <span className="v2-widget__icon">{icon}</span>}
          <h3>{title}</h3>
        </div>
        {actions && !loading && !error && (
          <WidgetDropdown
            actions={actions}
            value={actionValue}
            onChange={onActionChange}
          />
        )}
      </div>

      {/* Widget content */}
      {loading ? (
        <WidgetSkeleton />
      ) : error ? (
        <WidgetError message={error} />
      ) : (
        <div className="v2-widget__content">
          {children}
        </div>
      )}
    </div>
  );
}

Widget.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  children: PropTypes.node,
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ),
  actionValue: PropTypes.string,
  onActionChange: PropTypes.func,
  className: PropTypes.string,
  loading: PropTypes.bool,
  error: PropTypes.string,
  animationDelay: PropTypes.string, // For staggering: "0.1s", "0.2s", etc.
};

export default Widget;
