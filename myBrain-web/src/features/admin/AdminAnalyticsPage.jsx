import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  MousePointer,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  AlertCircle,
  Clock,
  Eye,
  Zap,
  Calendar,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { analyticsApi } from '../../lib/api';
import AdminNav from './components/AdminNav';

// Period selector options
const PERIOD_OPTIONS = [
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' }
];

// Feature color mapping
const FEATURE_COLORS = {
  notes: '#3b82f6',
  tasks: '#10b981',
  calendar: '#f59e0b',
  events: '#8b5cf6',
  projects: '#ec4899',
  weather: '#06b6d4',
  search: '#6366f1',
  inbox: '#f97316',
  dashboard: '#14b8a6',
  settings: '#64748b',
  profile: '#84cc16',
  admin: '#ef4444',
  other: '#9ca3af'
};

// Stat card component
function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'primary' }) {
  return (
    <div className="bg-panel border border-border rounded-lg p-4 shadow-theme-card hover:shadow-theme-elevated transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">{title}</p>
          <p className="text-2xl font-bold text-text mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-${color}/10`}>
          <Icon className={`w-5 h-5 text-${color}`} style={{ color: FEATURE_COLORS[color] || undefined }} />
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-3">
          {trend >= 0 ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          <span className={trend >= 0 ? 'text-green-500' : 'text-red-500'}>
            {Math.abs(trend)}%
          </span>
          <span className="text-muted text-xs">vs previous period</span>
        </div>
      )}
    </div>
  );
}

// Feature usage bar
function FeatureBar({ feature, count, maxCount, color }) {
  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-sm text-text capitalize truncate">{feature}</div>
      <div className="flex-1 h-6 bg-bg rounded overflow-hidden">
        <div
          className="h-full rounded transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: color || FEATURE_COLORS[feature] || FEATURE_COLORS.other
          }}
        />
      </div>
      <div className="w-16 text-sm text-muted text-right">{count.toLocaleString()}</div>
    </div>
  );
}

// Daily active users chart (simple bar chart)
function DailyActiveUsersChart({ data }) {
  if (!data || data.length === 0) {
    return <div className="text-center text-muted py-8">No data available</div>;
  }

  const maxUsers = Math.max(...data.map(d => d.activeUsers || 0));

  return (
    <div className="flex items-end gap-1 h-40">
      {data.map((day, i) => {
        const height = maxUsers > 0 ? ((day.activeUsers || 0) / maxUsers) * 100 : 0;
        const date = new Date(day.date);
        const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });

        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end justify-center" style={{ height: '120px' }}>
              <div
                className="w-full max-w-[30px] bg-primary rounded-t transition-all duration-300 hover:bg-primary-hover cursor-pointer relative group"
                style={{ height: `${Math.max(height, 4)}%` }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-panel glass border border-border rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {day.activeUsers || 0} users
                </div>
              </div>
            </div>
            <span className="text-xs text-muted">{dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

// Page views list
function PageViewsList({ data }) {
  if (!data || data.length === 0) {
    return <div className="text-center text-muted py-4">No page views recorded</div>;
  }

  return (
    <div className="space-y-2">
      {data.slice(0, 8).map((page, i) => (
        <div key={i} className="flex items-center justify-between p-2 hover:bg-bg rounded transition-colors">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted" />
            <span className="text-sm text-text truncate max-w-[200px]">{page.page || '/'}</span>
          </div>
          <span className="text-sm text-muted">{page.count?.toLocaleString()} views</span>
        </div>
      ))}
    </div>
  );
}

// Device breakdown
function DeviceBreakdown({ data }) {
  if (!data) return null;

  const deviceIcons = {
    desktop: Monitor,
    mobile: Smartphone,
    tablet: Tablet,
    unknown: Globe
  };

  const total = (data.desktop || 0) + (data.mobile || 0) + (data.tablet || 0);

  return (
    <div className="space-y-3">
      {['desktop', 'mobile', 'tablet'].map((device) => {
        const count = data[device] || 0;
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        const Icon = deviceIcons[device];

        return (
          <div key={device} className="flex items-center gap-3">
            <Icon className="w-4 h-4 text-muted" />
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text capitalize">{device}</span>
                <span className="text-muted">{percentage}%</span>
              </div>
              <div className="h-2 bg-bg rounded overflow-hidden">
                <div
                  className="h-full bg-primary rounded transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
            <span className="text-sm text-muted w-16 text-right">{count.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

// Popular actions list
function PopularActionsList({ data }) {
  if (!data || data.length === 0) {
    return <div className="text-center text-muted py-4">No actions recorded</div>;
  }

  return (
    <div className="space-y-2">
      {data.slice(0, 8).map((action, i) => (
        <div key={i} className="flex items-center justify-between p-2 hover:bg-bg rounded transition-colors">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: FEATURE_COLORS[action.feature] || FEATURE_COLORS.other }}
            />
            <span className="text-sm text-text">{action.action}</span>
            <span className="text-xs text-muted px-1.5 py-0.5 bg-bg rounded capitalize">{action.feature}</span>
          </div>
          <span className="text-sm text-muted">{action.count?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// Real-time activity panel
function RealtimePanel() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics-realtime'],
    queryFn: async () => {
      const response = await analyticsApi.getRealtime();
      return response.data.data;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <AlertCircle className="w-5 h-5 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-500">Failed to load realtime data</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-muted">Last hour</span>
        </div>
        <span className="text-xs text-muted">{data?.activeUsers || 0} active users</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-bg rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-text">{data?.totalEvents || 0}</p>
          <p className="text-xs text-muted">Events</p>
        </div>
        <div className="bg-bg rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-text">{data?.activeUsers || 0}</p>
          <p className="text-xs text-muted">Users</p>
        </div>
      </div>

      {data?.recentEvents?.length > 0 && (
        <div>
          <p className="text-xs text-muted mb-2">Recent Activity</p>
          <div className="space-y-1 max-h-48 overflow-auto">
            {data.recentEvents.slice(0, 10).map((event, i) => (
              <div key={i} className="flex items-center gap-2 text-xs p-1.5 hover:bg-bg rounded">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: FEATURE_COLORS[event.feature] || FEATURE_COLORS.other }}
                />
                <span className="text-text truncate">{event.action}</span>
                <span className="text-muted ml-auto flex-shrink-0">
                  {new Date(event.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Error analytics panel
function ErrorsPanel({ period }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics-errors', period],
    queryFn: async () => {
      const response = await analyticsApi.getErrors({ period });
      return response.data.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <AlertCircle className="w-5 h-5 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-500">Failed to load error data</p>
      </div>
    );
  }

  if (!data?.errors || data.errors.length === 0) {
    return (
      <div className="text-center py-8">
        <Zap className="w-8 h-8 text-green-500 mx-auto mb-2" />
        <p className="text-sm text-muted">No errors recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-auto">
      {data.errors.map((err, i) => (
        <div key={i} className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-text font-medium truncate">{err.error}</p>
            <span className="text-xs bg-red-500/10 text-red-500 px-2 py-0.5 rounded flex-shrink-0">
              {err.count}x
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted">
            <span>{err.page || 'Unknown page'}</span>
            <span>{err.affectedUsers} user{err.affectedUsers !== 1 ? 's' : ''}</span>
            <span>Last: {new Date(err.lastOccurred).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// User retention panel
function RetentionPanel({ data }) {
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="text-center p-4 bg-bg rounded-lg">
        <p className="text-4xl font-bold text-primary">{data.retentionRate}%</p>
        <p className="text-sm text-muted mt-1">Retention Rate</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-3 bg-bg rounded-lg">
          <p className="text-muted">First Period</p>
          <p className="text-lg font-semibold text-text">{data.firstPeriodUsers}</p>
        </div>
        <div className="p-3 bg-bg rounded-lg">
          <p className="text-muted">Second Period</p>
          <p className="text-lg font-semibold text-text">{data.secondPeriodUsers}</p>
        </div>
      </div>

      <div className="p-3 bg-green-500/10 rounded-lg text-center">
        <p className="text-sm text-green-600 dark:text-green-400">
          {data.retainedUsers} users returned
        </p>
      </div>
    </div>
  );
}

function AdminAnalyticsPage() {
  const [period, setPeriod] = useState('7d');

  // Fetch overview data
  const { data: overview, isLoading: overviewLoading, error: overviewError, refetch } = useQuery({
    queryKey: ['analytics-overview', period],
    queryFn: async () => {
      const response = await analyticsApi.getOverview({ period });
      return response.data.data;
    }
  });

  // Fetch feature analytics
  const { data: features, isLoading: featuresLoading } = useQuery({
    queryKey: ['analytics-features', period],
    queryFn: async () => {
      const response = await analyticsApi.getFeatures({ period });
      return response.data.data;
    }
  });

  // Fetch user analytics
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['analytics-users', period],
    queryFn: async () => {
      const response = await analyticsApi.getUsers({ period });
      return response.data.data;
    }
  });

  const isLoading = overviewLoading || featuresLoading || usersLoading;

  // Calculate max for feature bars
  const maxFeatureCount = overview?.featureUsage
    ? Math.max(...overview.featureUsage.map(f => f.count))
    : 0;

  return (
    <div className="px-6 py-8">
      <AdminNav />

      {/* Analytics Content */}
      <div className="flex flex-col">
        {/* Period Selector */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-text">Analytics</span>
          </div>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 bg-bg border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {PERIOD_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Period info */}
        {overview?.period && (
          <div className="flex items-center gap-2 text-sm text-muted mb-4">
            <Calendar className="w-4 h-4" />
            <span>
              {new Date(overview.period.start).toLocaleDateString()} - {new Date(overview.period.end).toLocaleDateString()}
            </span>
          </div>
        )}
        {overviewError ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-500">Failed to load analytics</p>
            <p className="text-sm text-muted mt-1">{overviewError.message}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Events"
                value={overview?.summary?.totalEvents?.toLocaleString() || '0'}
                subtitle="All tracked events"
                icon={Activity}
                color="notes"
              />
              <StatCard
                title="Unique Users"
                value={overview?.summary?.uniqueUsers?.toLocaleString() || '0'}
                subtitle="Active users"
                icon={Users}
                color="tasks"
              />
              <StatCard
                title="Avg Events/User"
                value={overview?.summary?.avgEventsPerUser || '0'}
                subtitle="User engagement"
                icon={MousePointer}
                color="events"
              />
              <StatCard
                title="Retention Rate"
                value={`${users?.retention?.retentionRate || 0}%`}
                subtitle="Users who returned"
                icon={TrendingUp}
                color="projects"
              />
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column - Feature usage */}
              <div className="lg:col-span-2 space-y-6">
                {/* Feature usage */}
                <div className="bg-panel border border-border rounded-lg p-4 shadow-theme-card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-text">Feature Usage</h2>
                    <span className="text-sm text-muted">Most popular to least</span>
                  </div>
                  {overviewLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-6 bg-bg rounded animate-pulse" />
                      ))}
                    </div>
                  ) : overview?.featureUsage?.length > 0 ? (
                    <div className="space-y-3">
                      {overview.featureUsage.map((feature, i) => (
                        <FeatureBar
                          key={i}
                          feature={feature.feature}
                          count={feature.count}
                          maxCount={maxFeatureCount}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted">No feature usage data</div>
                  )}
                </div>

                {/* Daily active users */}
                <div className="bg-panel border border-border rounded-lg p-4 shadow-theme-card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-text">Daily Active Users</h2>
                    <Clock className="w-4 h-4 text-muted" />
                  </div>
                  {usersLoading ? (
                    <div className="h-40 bg-bg rounded animate-pulse" />
                  ) : (
                    <DailyActiveUsersChart data={users?.dailyActiveUsers} />
                  )}
                </div>

                {/* Popular actions */}
                <div className="bg-panel border border-border rounded-lg p-4 shadow-theme-card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-text">Popular Actions</h2>
                    <ChevronRight className="w-4 h-4 text-muted" />
                  </div>
                  {overviewLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-8 bg-bg rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <PopularActionsList data={overview?.popularActions} />
                  )}
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-6">
                {/* Real-time */}
                <div className="bg-panel border border-border rounded-lg p-4 shadow-theme-card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-text">Real-time</h2>
                    <Zap className="w-4 h-4 text-yellow-500" />
                  </div>
                  <RealtimePanel />
                </div>

                {/* Page views */}
                <div className="bg-panel border border-border rounded-lg p-4 shadow-theme-card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-text">Top Pages</h2>
                    <Eye className="w-4 h-4 text-muted" />
                  </div>
                  {overviewLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-8 bg-bg rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <PageViewsList data={overview?.pageViews} />
                  )}
                </div>

                {/* Device breakdown */}
                <div className="bg-panel border border-border rounded-lg p-4 shadow-theme-card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-text">Devices</h2>
                    <Monitor className="w-4 h-4 text-muted" />
                  </div>
                  {overviewLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-8 bg-bg rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <DeviceBreakdown data={overview?.deviceBreakdown} />
                  )}
                </div>

                {/* User retention */}
                <div className="bg-panel border border-border rounded-lg p-4 shadow-theme-card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-text">Retention</h2>
                    <Users className="w-4 h-4 text-muted" />
                  </div>
                  {usersLoading ? (
                    <div className="space-y-3">
                      <div className="h-24 bg-bg rounded animate-pulse" />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="h-16 bg-bg rounded animate-pulse" />
                        <div className="h-16 bg-bg rounded animate-pulse" />
                      </div>
                    </div>
                  ) : (
                    <RetentionPanel data={users?.retention} />
                  )}
                </div>

                {/* Errors */}
                <div className="bg-panel border border-border rounded-lg p-4 shadow-theme-card">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-text">Errors</h2>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </div>
                  <ErrorsPanel period={period} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminAnalyticsPage;
