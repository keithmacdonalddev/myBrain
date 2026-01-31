/**
 * =============================================================================
 * METRICCARD.JSX - Dashboard Metric Display Component
 * =============================================================================
 *
 * Displays a single metric/stat in the dashboard's focus hero section.
 * Shows icon (optional), large value, and label in a compact card format.
 *
 * Props:
 * - icon: Lucide icon component or emoji string (optional)
 * - value: Number, percentage, or string to display
 * - label: Descriptive label below the value
 * - type: 'default' | 'danger' | 'success' | 'warning' (affects accent color)
 * - onClick: Optional click handler for interactivity
 *
 * Type affects the value color:
 * - default: --v2-text-primary (neutral)
 * - danger: --v2-red or --danger (red for overdue, critical items)
 * - success: --v2-green or --success (green for completed, positive)
 * - warning: --v2-orange or --warning (orange for attention needed)
 *
 * Uses V2 CSS variables for theme consistency.
 * Includes subtle hover effect when clickable.
 *
 * =============================================================================
 */

import PropTypes from 'prop-types';
import './MetricCard.css';

/**
 * MetricCard - Displays a single metric with optional icon
 *
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon component or emoji
 * @param {string|number} props.value - The metric value to display
 * @param {string} props.label - Label describing the metric
 * @param {string} props.type - Card type: 'default' | 'danger' | 'success' | 'warning'
 * @param {Function} props.onClick - Optional click handler
 */
export default function MetricCard({ icon, value, label, type = 'default', onClick }) {
  // Determine if card should be interactive
  const isClickable = Boolean(onClick);
  const className = `v2-metric-card v2-metric-card--${type}${isClickable ? ' v2-metric-card--clickable' : ''}`;

  return (
    <div
      className={className}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e);
        }
      } : undefined}
      aria-label={isClickable ? `${label}: ${value}` : undefined}
    >
      {icon && <span className="v2-metric-card__icon">{icon}</span>}
      <span className="v2-metric-card__value">{value}</span>
      <span className="v2-metric-card__label">{label}</span>
    </div>
  );
}

MetricCard.propTypes = {
  icon: PropTypes.node,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  label: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['default', 'danger', 'success', 'warning']),
  onClick: PropTypes.func
};
