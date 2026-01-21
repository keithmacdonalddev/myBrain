import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  MessageSquare,
  Flag,
  Share2,
  ShieldBan,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { adminApi } from '../../lib/api';
import AdminNav from './components/AdminNav';
import UserAvatar from '../../components/ui/UserAvatar';

function StatCard({ icon: Icon, label, value, subValue, trend, color = 'primary' }) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    yellow: 'bg-yellow-500/10 text-yellow-500',
    red: 'bg-red-500/10 text-red-500',
    purple: 'bg-purple-500/10 text-purple-500',
  };

  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-text mb-1">{value.toLocaleString()}</p>
      <p className="text-xs text-muted">{label}</p>
      {subValue && (
        <p className="text-xs text-primary mt-1">{subValue}</p>
      )}
    </div>
  );
}

function TrendChart({ data, label, color = 'primary' }) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data.map(d => d.count), 1);
  const colorClasses = {
    primary: 'bg-primary',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
  };

  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-text mb-4">{label}</h3>
      <div className="flex items-end gap-1 h-24">
        {data.map((day, i) => (
          <div
            key={day.date}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <div
              className={`w-full rounded-t ${colorClasses[color]} transition-all`}
              style={{ height: `${(day.count / max) * 100}%`, minHeight: day.count > 0 ? '4px' : '0' }}
              title={`${day.date}: ${day.count}`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-muted">
        <span>{data[0]?.date?.slice(5)}</span>
        <span>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  );
}

function ReportsByPriority({ data }) {
  if (!data) return null;

  const priorities = [
    { key: 'critical', label: 'Critical', color: 'bg-red-600' },
    { key: 'high', label: 'High', color: 'bg-red-500' },
    { key: 'medium', label: 'Medium', color: 'bg-yellow-500' },
    { key: 'low', label: 'Low', color: 'bg-muted' },
  ];

  const total = Object.values(data).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-text mb-4">Pending Reports by Priority</h3>
      {total === 0 ? (
        <p className="text-sm text-muted text-center py-4">No pending reports</p>
      ) : (
        <div className="space-y-3">
          {priorities.map(p => {
            const count = data[p.key] || 0;
            const percent = total > 0 ? (count / total * 100).toFixed(0) : 0;
            return (
              <div key={p.key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted">{p.label}</span>
                  <span className="text-text font-medium">{count}</span>
                </div>
                <div className="h-2 bg-bg rounded-full overflow-hidden">
                  <div
                    className={`h-full ${p.color} transition-all`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TopActiveUsers({ users, onViewUser }) {
  if (!users || users.length === 0) {
    return (
      <div className="bg-panel border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium text-text mb-4">Top Active Users (7 days)</h3>
        <p className="text-sm text-muted text-center py-4">No activity data</p>
      </div>
    );
  }

  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-text mb-4">Top Active Users (7 days)</h3>
      <div className="space-y-2">
        {users.map((item, index) => (
          <div
            key={item.user?._id || index}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg transition-colors cursor-pointer"
            onClick={() => onViewUser(item.user?._id)}
          >
            <span className="text-xs text-muted w-4">{index + 1}</span>
            <UserAvatar user={item.user} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text truncate">
                {item.user?.profile?.displayName || item.user?.email || 'Unknown'}
              </p>
              <p className="text-xs text-muted">{item.messageCount} messages</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SharesByType({ data }) {
  if (!data) return null;

  const types = [
    { key: 'project', label: 'Projects', color: 'bg-purple-500' },
    { key: 'task', label: 'Tasks', color: 'bg-blue-500' },
    { key: 'note', label: 'Notes', color: 'bg-yellow-500' },
    { key: 'file', label: 'Files', color: 'bg-orange-500' },
  ];

  const total = Object.values(data).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <h3 className="text-sm font-medium text-text mb-4">Shares by Type</h3>
      {total === 0 ? (
        <p className="text-sm text-muted text-center py-4">No shares</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {types.map(t => {
            const count = data[t.key] || 0;
            return (
              <div key={t.key} className="p-2 bg-bg rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${t.color}`} />
                  <span className="text-xs text-muted">{t.label}</span>
                </div>
                <p className="text-lg font-bold text-text">{count}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminSocialDashboardPage() {
  const navigate = useNavigate();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-social-dashboard'],
    queryFn: async () => {
      const response = await adminApi.getSocialDashboard();
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const handleViewUser = (userId) => {
    if (userId) {
      navigate(`/admin/users?user=${userId}`);
    }
  };

  const handleViewReports = () => {
    navigate('/admin/reports');
  };

  if (isLoading) {
    return (
      <div className="px-6 py-8">
        <AdminNav />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-8">
        <AdminNav />
        <div className="text-center py-16">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-500 mb-2">Failed to load social dashboard</p>
          <button
            onClick={() => refetch()}
            className="text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const {
    connections = {},
    messages = {},
    reports = {},
    shares = {},
    blocks = {},
    activeUsers = [],
    trends = {}
  } = data || {};

  return (
    <div className="px-6 py-8">
      <AdminNav
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
      />

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-text mb-1">Social Activity Dashboard</h2>
        <p className="text-sm text-muted">Monitor social features and user interactions</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard
          icon={Users}
          label="Total Connections"
          value={connections.total || 0}
          subValue={`+${connections.new || 0} this week`}
          color="blue"
        />
        <StatCard
          icon={Users}
          label="Pending Requests"
          value={connections.pending || 0}
          color="yellow"
        />
        <StatCard
          icon={MessageSquare}
          label="Total Messages"
          value={messages.totalMessages || 0}
          subValue={`+${messages.newMessages || 0} this week`}
          color="green"
        />
        <StatCard
          icon={Activity}
          label="Active Conversations"
          value={messages.activeConversations || 0}
          color="purple"
        />
        <StatCard
          icon={Share2}
          label="Active Shares"
          value={shares.active || 0}
          subValue={`+${shares.new || 0} this week`}
          color="primary"
        />
        <button
          onClick={handleViewReports}
          className="bg-panel border border-border rounded-lg p-4 hover:border-red-500/50 transition-colors text-left"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Flag className="w-5 h-5 text-red-500" />
            </div>
            <ExternalLink className="w-4 h-4 text-muted" />
          </div>
          <p className="text-2xl font-bold text-text mb-1">{reports.pending || 0}</p>
          <p className="text-xs text-muted">Pending Reports</p>
          {reports.pending > 0 && (
            <p className="text-xs text-red-500 mt-1">Needs attention</p>
          )}
        </button>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <TrendChart
          data={trends.connections}
          label="New Connections (7 days)"
          color="blue"
        />
        <TrendChart
          data={trends.messages}
          label="Message Volume (7 days)"
          color="green"
        />
      </div>

      {/* Details Row */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <ReportsByPriority data={reports.pendingByPriority} />
        <TopActiveUsers users={activeUsers} onViewUser={handleViewUser} />
        <SharesByType data={shares.byType} />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldBan className="w-4 h-4 text-red-500" />
            <span className="text-xs text-muted">User Blocks</span>
          </div>
          <p className="text-xl font-bold text-text">{blocks.total || 0}</p>
          <p className="text-xs text-muted mt-1">+{blocks.new || 0} this week</p>
        </div>

        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-muted">Total Conversations</span>
          </div>
          <p className="text-xl font-bold text-text">{messages.totalConversations || 0}</p>
        </div>

        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Share2 className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted">Total Shares</span>
          </div>
          <p className="text-xl font-bold text-text">{shares.total || 0}</p>
        </div>

        <div className="bg-panel border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Flag className="w-4 h-4 text-muted" />
            <span className="text-xs text-muted">Resolved Reports</span>
          </div>
          <p className="text-xl font-bold text-text">{reports.resolved || 0}</p>
        </div>
      </div>
    </div>
  );
}

export default AdminSocialDashboardPage;
