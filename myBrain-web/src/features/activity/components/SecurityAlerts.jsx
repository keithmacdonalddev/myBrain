/**
 * SecurityAlerts Component
 *
 * Displays security alerts sorted by severity with dismiss functionality.
 * Shows unread indicator and allows bulk management.
 */
import { useState } from 'react';
import { ShieldAlert, Check } from 'lucide-react';
import { useSecurityAlerts, useDismissAlert } from '../hooks/useSecurityAlerts';
import AlertCard from './AlertCard';
import Skeleton from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

// Severity priority for sorting (higher = more important)
const SEVERITY_PRIORITY = {
  critical: 3,
  warning: 2,
  info: 1,
};

/**
 * Security alerts list with dismiss functionality
 */
export default function SecurityAlerts() {
  const { data, isLoading } = useSecurityAlerts();
  const dismissMutation = useDismissAlert();
  const [filter, setFilter] = useState('all'); // all, unread

  // Loading state
  if (isLoading) {
    return <Skeleton.List count={3} />;
  }

  // Extract alerts from response
  const alerts = data?.alerts || [];
  const unreadCount = data?.unreadCount || 0;

  // Filter alerts based on current filter
  const filteredAlerts = filter === 'unread'
    ? alerts.filter((a) => !a.read)
    : alerts;

  // Sort alerts by severity (critical first) then by date (newest first)
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    const severityDiff =
      (SEVERITY_PRIORITY[b.severity] || 0) - (SEVERITY_PRIORITY[a.severity] || 0);
    if (severityDiff !== 0) return severityDiff;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // Handle dismiss alert
  const handleDismiss = (alertId) => {
    dismissMutation.mutate({ id: alertId, status: 'dismissed' });
  };

  // Handle mark as read
  const handleMarkRead = (alertId) => {
    dismissMutation.mutate({ id: alertId, status: 'read' });
  };

  // Empty state
  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="No security alerts"
        description="You're all clear! Security alerts will appear here if we detect any unusual activity."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filter and count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-muted">
            {unreadCount > 0 ? (
              <span>{unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}</span>
            ) : (
              <span>All alerts read</span>
            )}
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2">
          {['all', 'unread'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                filter === f
                  ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                  : 'border-border hover:border-[var(--primary)]/50 text-muted'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts list */}
      {sortedAlerts.length === 0 ? (
        <div className="text-center py-8 text-muted">
          <Check className="w-8 h-8 mx-auto mb-2 text-[var(--success)]" />
          <p>No unread alerts</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}

      {/* Info text */}
      <p className="text-xs text-muted text-center pt-4 border-t border-border">
        Security alerts are kept for 90 days
      </p>
    </div>
  );
}
