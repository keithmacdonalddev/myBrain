/**
 * =============================================================================
 * QUICKSTATCARD.JSX - Compact Statistic Display Component
 * =============================================================================
 *
 * Displays a single statistic in a compact format for quick reference.
 * Used in the Quick Stats widget to show key metrics at a glance.
 *
 * Props:
 * - value: The statistic value (number or string)
 * - label: Small uppercase label describing the stat
 * - color: Color variant: 'blue' | 'green' | 'purple' | 'orange' | 'default'
 * - icon: Optional React node to display before the value
 * - loading: Shows skeleton placeholder when true
 *
 * Features:
 * - Large, bold value (28px)
 * - Small uppercase label (11px)
 * - Optional icon display before value
 * - Color-coded values for quick recognition
 * - Hover lift effect
 * - Skeleton loading state
 *
 * Usage:
 * <QuickStatsGrid>
 *   <QuickStatCard value={5} label="Active Projects" color="blue" icon={<FolderIcon />} />
 *   <QuickStatCard value={12} label="Due Today" color="orange" />
 * </QuickStatsGrid>
 *
 * Uses V2 CSS variables for theme consistency.
 *
 * =============================================================================
 */

import PropTypes from 'prop-types';
import './QuickStatCard.css';

/**
 * QuickStatCard - Displays a single compact statistic
 *
 * @param {Object} props
 * @param {string|number} props.value - The statistic value to display
 * @param {string} props.label - Small label describing the stat
 * @param {string} props.color - Color variant for the value text
 * @param {React.ReactNode} props.icon - Optional icon to display before the value
 * @param {boolean} props.loading - Show skeleton placeholder
 */
export default function QuickStatCard({ value, label, color = 'default', icon, loading = false }) {
  // Build class name with color variant
  const className = `quick-stat${color !== 'default' ? ` ${color}` : ''}${loading ? ' skeleton' : ''}`;

  // Show skeleton when loading
  if (loading) {
    return (
      <div className={className} aria-busy="true" aria-label="Loading statistic">
        <div className="quick-stat-value-skeleton" />
        <div className="quick-stat-label-skeleton" />
      </div>
    );
  }

  return (
    <div className={className}>
      {icon && <div className="quick-stat-icon">{icon}</div>}
      <div className="quick-stat-value">{value}</div>
      <div className="quick-stat-label">{label}</div>
    </div>
  );
}

QuickStatCard.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  label: PropTypes.string.isRequired,
  color: PropTypes.oneOf(['blue', 'green', 'purple', 'orange', 'default']),
  icon: PropTypes.node,
  loading: PropTypes.bool
};

/**
 * QuickStatsGrid - Container for QuickStatCard components
 *
 * Renders a 2-column grid layout for compact stat display.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - QuickStatCard components
 */
export function QuickStatsGrid({ children }) {
  return (
    <div className="quick-stats-grid">
      {children}
    </div>
  );
}

QuickStatsGrid.propTypes = {
  children: PropTypes.node
};
