/**
 * AlertCard Component
 *
 * Displays a security alert with severity-based styling.
 * Supports compact mode for overview displays.
 */
import { Info, AlertTriangle, ShieldAlert, X } from 'lucide-react';
import { getRelativeDate } from '../../../lib/dateUtils';

// Severity styles using CSS variables for theme consistency
const severityStyles = {
  info: {
    border: 'border-[var(--primary)]/30',
    bg: 'bg-[var(--primary)]/5',
    icon: Info,
    iconColor: 'text-[var(--primary)]',
  },
  warning: {
    border: 'border-[var(--warning)]/30',
    bg: 'bg-[var(--warning)]/5',
    icon: AlertTriangle,
    iconColor: 'text-[var(--warning)]',
  },
  critical: {
    border: 'border-[var(--danger)]/30',
    bg: 'bg-[var(--danger)]/5',
    icon: ShieldAlert,
    iconColor: 'text-[var(--danger)]',
  },
};

/**
 * Alert card displaying security alert with severity styling
 *
 * @param {Object} props - Component props
 * @param {Object} props.alert - Alert data object
 * @param {Function} props.onDismiss - Callback when dismiss button is clicked
 * @param {boolean} props.compact - Whether to show compact version (default: false)
 */
export default function AlertCard({ alert, onDismiss, compact = false }) {
  // Get styles for this severity level, default to info
  const styles = severityStyles[alert.severity] || severityStyles.info;
  const Icon = styles.icon;

  // Compact view for overview page
  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 border ${styles.border} ${styles.bg} rounded-lg`}>
        <Icon className={`w-4 h-4 flex-shrink-0 ${styles.iconColor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text truncate">{alert.title || alert.message}</p>
          <p className="text-xs text-muted">{getRelativeDate(alert.createdAt)}</p>
        </div>
        {!alert.read && (
          <span className="w-2 h-2 bg-[var(--primary)] rounded-full flex-shrink-0" />
        )}
      </div>
    );
  }

  // Full view for alerts page
  return (
    <div className={`bg-panel border ${styles.border} ${styles.bg} rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        {/* Severity icon */}
        <div className={`p-2 rounded-lg ${styles.bg}`}>
          <Icon className={`w-5 h-5 ${styles.iconColor}`} />
        </div>

        {/* Alert content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium text-text">{alert.title || 'Security Alert'}</h3>
              <p className="text-sm text-muted mt-1">{alert.message}</p>
            </div>

            {/* Dismiss button */}
            {onDismiss && (
              <button
                onClick={() => onDismiss(alert.id)}
                aria-label={`Dismiss alert: ${alert.title || alert.message}`}
                className="p-1 text-muted hover:text-text hover:bg-bg rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Alert metadata */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted">
            <span>{getRelativeDate(alert.createdAt)}</span>
            {alert.location && <span>{alert.location}</span>}
            {alert.device && <span>{alert.device}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
