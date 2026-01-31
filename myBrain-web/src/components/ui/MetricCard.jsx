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
 * - variant: 'default' | 'danger' | 'success' | 'warning' (affects accent color)
 * - type: Alias for variant (for backwards compatibility)
 * - onClick: Optional click handler for interactivity
 * - loading: Shows skeleton placeholder when true
 *
 * Variant affects the value color:
 * - default: --v2-text-primary (neutral)
 * - danger: Red for critical items (dark mode: #FF6B6B)
 * - success: Green for completed/positive (dark mode: #4ADE80)
 * - warning: Orange for attention needed
 *
 * Uses V2 CSS variables for theme consistency.
 * Includes subtle hover lift effect on all cards (translateY -2px).
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
 * @param {string} props.variant - Card variant: 'default' | 'danger' | 'success' | 'warning'
 * @param {string} props.type - Alias for variant (backwards compatibility)
 * @param {Function} props.onClick - Optional click handler
 * @param {boolean} props.loading - Show skeleton placeholder
 */
export default function MetricCard({ icon, value, label, variant, type = 'default', onClick, loading = false }) {
  // Use variant if provided, otherwise fall back to type for backwards compatibility
  const cardVariant = variant || type;

  // Determine if card should be interactive
  const isClickable = Boolean(onClick);
  const className = `v2-metric-card v2-metric-card--${cardVariant}${isClickable ? ' v2-metric-card--clickable' : ''}${loading ? ' v2-metric-card--loading' : ''}`;

  // Show skeleton when loading
  if (loading) {
    return (
      <div className={className} aria-busy="true" aria-label="Loading metric">
        {icon && <span className="v2-metric-card__icon v2-metric-card__skeleton">&nbsp;</span>}
        <span className="v2-metric-card__value v2-metric-card__skeleton">&nbsp;&nbsp;</span>
        <span className="v2-metric-card__label v2-metric-card__skeleton">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
      </div>
    );
  }

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
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  label: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'danger', 'success', 'warning']),
  type: PropTypes.oneOf(['default', 'danger', 'success', 'warning']), // Backwards compatibility
  onClick: PropTypes.func,
  loading: PropTypes.bool
};
