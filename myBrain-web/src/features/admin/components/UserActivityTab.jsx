import { useState, useMemo } from 'react';
import {
  Activity,
  LogIn,
  FileText,
  Edit,
  Trash2,
  Settings,
  Loader2,
  AlertCircle,
  Calendar,
  BarChart3
} from 'lucide-react';
import { useUserActivity } from '../hooks/useAdminUsers';

function getActivityIcon(eventName, method) {
  if (eventName?.includes('login')) return LogIn;
  if (method === 'DELETE') return Trash2;
  if (method === 'PATCH' || method === 'PUT') return Edit;
  if (method === 'POST') return FileText;
  if (eventName?.includes('settings')) return Settings;
  return Activity;
}

function getActivityColor(method, statusCode) {
  if (statusCode >= 400) return 'text-red-500 bg-red-500/10';
  if (method === 'DELETE') return 'text-red-500 bg-red-500/10';
  if (method === 'POST') return 'text-green-500 bg-green-500/10';
  if (method === 'PATCH' || method === 'PUT') return 'text-blue-500 bg-blue-500/10';
  return 'text-muted bg-bg';
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-bg rounded-lg">
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className="text-lg font-semibold text-text">{value}</p>
        <p className="text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

function ActivityItem({ activity }) {
  const Icon = getActivityIcon(activity.eventName, activity.method);
  const colorClass = getActivityColor(activity.method, activity.statusCode);

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRouteLabel = (route) => {
    if (!route) return 'Unknown';
    // Extract meaningful part of route
    const parts = route.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
    return route;
  };

  return (
    <div className="flex items-start gap-3 py-2">
      <div className={`p-1.5 rounded-lg flex-shrink-0 ${colorClass}`}>
        <Icon className="w-3 h-3" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text">
            {activity.method}
          </span>
          <span className="text-xs text-muted truncate">
            {getRouteLabel(activity.route)}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted">
          <span>{formatTime(activity.timestamp)}</span>
          {activity.statusCode && (
            <span className={activity.statusCode >= 400 ? 'text-red-500' : 'text-green-500'}>
              {activity.statusCode}
            </span>
          )}
          {activity.durationMs && (
            <span>{activity.durationMs}ms</span>
          )}
        </div>
      </div>
    </div>
  );
}

function DayGroup({ date, activities }) {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-3 h-3 text-muted" />
        <span className="text-xs font-medium text-muted">{formatDate(date)}</span>
        <span className="text-xs text-muted">({activities.length} actions)</span>
      </div>
      <div className="border-l-2 border-border pl-3 ml-1.5 space-y-1">
        {activities.map((activity, idx) => (
          <ActivityItem key={activity._id || idx} activity={activity} />
        ))}
      </div>
    </div>
  );
}

export default function UserActivityTab({ user }) {
  const [dateRange, setDateRange] = useState('7d');

  // Memoize date range to prevent infinite re-fetching
  const { from, to } = useMemo(() => {
    const now = new Date();
    const fromDate = new Date();

    switch (dateRange) {
      case '24h':
        fromDate.setHours(fromDate.getHours() - 24);
        break;
      case '7d':
        fromDate.setDate(fromDate.getDate() - 7);
        break;
      case '30d':
        fromDate.setDate(fromDate.getDate() - 30);
        break;
      default:
        fromDate.setDate(fromDate.getDate() - 7);
    }

    return { from: fromDate.toISOString(), to: now.toISOString() };
  }, [dateRange]);

  const { data, isLoading, error } = useUserActivity(user._id, { from, to, limit: 100 });

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500">
        <AlertCircle className="w-5 h-5 mr-2" />
        Failed to load user activity
      </div>
    );
  }

  const stats = data?.stats || {
    totalRequests: 0,
    contentCreated: 0,
    contentUpdated: 0,
    logins: 0,
  };

  const timeline = data?.timeline || [];

  return (
    <div className="space-y-4">
      {/* Date range selector */}
      <div className="flex items-center gap-2">
        {['24h', '7d', '30d'].map((range) => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              dateRange === range
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:border-primary/50 text-muted'
            }`}
          >
            {range === '24h' ? 'Last 24 hours' : range === '7d' ? 'Last 7 days' : 'Last 30 days'}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard icon={Activity} label="Total Requests" value={stats.totalRequests} />
        <StatCard icon={LogIn} label="Logins" value={stats.logins} />
        <StatCard icon={FileText} label="Created" value={stats.contentCreated} />
        <StatCard icon={Edit} label="Updated" value={stats.contentUpdated} />
      </div>

      {/* Activity timeline */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-bg px-3 py-2 border-b border-border flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted" />
          <h4 className="text-sm font-medium text-text">Activity Timeline</h4>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : timeline.length === 0 ? (
          <div className="text-center p-8 text-muted text-sm">
            No activity in selected period
          </div>
        ) : (
          <div className="p-4 max-h-80 overflow-y-auto">
            {timeline.map((day) => (
              <DayGroup
                key={day.date}
                date={day.date}
                activities={day.activities}
              />
            ))}
          </div>
        )}
      </div>

      {/* Last login info */}
      {user.lastLoginAt && (
        <div className="text-xs text-muted text-center">
          Last login: {new Date(user.lastLoginAt).toLocaleString()}
          {user.lastLoginIp && ` from ${user.lastLoginIp}`}
        </div>
      )}
    </div>
  );
}
