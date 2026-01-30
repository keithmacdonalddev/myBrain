/**
 * ActivityOverview Component
 *
 * Dashboard view showing current session, activity stats, and recent alerts.
 * Provides a quick summary of account activity and security status.
 */
import { Link } from 'react-router-dom';
import { Activity, LogIn, Calendar, FileText, Loader2 } from 'lucide-react';
import { useSessions } from '../hooks/useSessions';
import { useActivityStats } from '../hooks/useActivityStats';
import { useSecurityAlerts } from '../hooks/useSecurityAlerts';
import SessionCard from './SessionCard';
import AlertCard from './AlertCard';
import Skeleton from '../../../components/ui/Skeleton';

/**
 * Stat card for displaying activity statistics
 */
function StatCard({ label, value, icon: Icon, subtext }) {
  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="text-2xl font-bold text-text mt-1">{value}</p>
          {subtext && <p className="text-xs text-muted mt-1">{subtext}</p>}
        </div>
        <div className="p-2 rounded-lg bg-[var(--primary)]/10">
          <Icon className="w-5 h-5 text-[var(--primary)]" />
        </div>
      </div>
    </div>
  );
}

/**
 * Overview tab content with current session, stats, and alerts preview
 */
export default function ActivityOverview() {
  const { data: sessionsData, isLoading: sessionsLoading } = useSessions();
  const { data: statsData, isLoading: statsLoading } = useActivityStats('30d');
  const { data: alertsData, isLoading: alertsLoading } = useSecurityAlerts();

  // Find the current session from the sessions list
  const currentSession = sessionsData?.sessions?.find((s) => s.isCurrent);

  return (
    <div className="space-y-6">
      {/* Current Session Section */}
      <section>
        <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">
          Current Session
        </h2>
        {sessionsLoading ? (
          <Skeleton.Card />
        ) : currentSession ? (
          <SessionCard session={currentSession} showRevoke={false} />
        ) : (
          <div className="bg-panel border border-border rounded-lg p-4 text-center text-muted">
            No active session found
          </div>
        )}
      </section>

      {/* Stats Grid Section */}
      <section>
        <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">
          Last 30 Days
        </h2>
        {statsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-panel border border-border rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Actions"
              value={statsData?.summary?.totalActions?.toLocaleString() || '0'}
              icon={Activity}
            />
            <StatCard
              label="Login Sessions"
              value={statsData?.summary?.loginCount?.toLocaleString() || '0'}
              icon={LogIn}
            />
            <StatCard
              label="Most Active"
              value={statsData?.summary?.mostActiveDay || 'N/A'}
              icon={Calendar}
              subtext="day of week"
            />
            <StatCard
              label="Content Actions"
              value={statsData?.byCategory?.content?.toLocaleString() || '0'}
              icon={FileText}
            />
          </div>
        )}
      </section>

      {/* Recent Alerts Section */}
      {alertsLoading ? (
        <section>
          <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-3">
            Recent Alerts
          </h2>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-panel border border-border rounded-lg animate-pulse" />
            ))}
          </div>
        </section>
      ) : alertsData?.alerts?.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted uppercase tracking-wide">
              Recent Alerts
            </h2>
            <Link
              to="/app/settings/activity?tab=alerts"
              className="text-sm text-[var(--primary)] hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {alertsData.alerts.slice(0, 3).map((alert) => (
              <AlertCard key={alert.id} alert={alert} compact />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
