import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Users,
  Activity,
  Clock,
  Loader2,
} from 'lucide-react';
import { adminApi } from '../../lib/api';
import { ActionCard, ActionButton, InboxSection, EmptyInbox } from './components/ActionCard';
import AdminNav from './components/AdminNav';

function formatTimeAgo(date) {
  if (!date) return '';
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function AdminInboxPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dismissedItems, setDismissedItems] = useState(new Set());

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-inbox'],
    queryFn: async () => {
      const response = await adminApi.getInbox();
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const unsuspendUser = useMutation({
    mutationFn: ({ userId }) => adminApi.unsuspendUser(userId, { reason: 'Approved via inbox' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const handleDismiss = (itemId) => {
    setDismissedItems((prev) => new Set([...prev, itemId]));
  };

  const handleViewUser = (userId) => {
    navigate(`/admin/users?user=${userId}`);
  };

  const handleViewLogs = () => {
    navigate('/admin/logs');
  };

  const handleViewUsers = () => {
    navigate('/admin/users');
  };

  const handleUnsuspend = async (userId) => {
    await unsuspendUser.mutateAsync({ userId });
  };

  // Filter out dismissed items
  const filterDismissed = (items) =>
    items?.filter((item) => !dismissedItems.has(item.id)) || [];

  const urgent = filterDismissed(data?.inbox?.urgent);
  const needsReview = filterDismissed(data?.inbox?.needsReview);
  const fyi = filterDismissed(data?.inbox?.fyi);
  const stats = data?.stats;

  const totalItems = urgent.length + needsReview.length + fyi.length;

  return (
    <div className="px-6 py-8">
      <AdminNav
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        badgeCount={totalItems}
      />

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted" />
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-500 mb-2">Failed to load inbox</p>
          <button
            onClick={() => refetch()}
            className="text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      ) : totalItems === 0 ? (
        <EmptyInbox />
      ) : (
        <main>
          {/* Urgent Section */}
          <InboxSection
            priority="urgent"
            title="Urgent"
            subtitle="Requires immediate action"
            count={urgent.length}
          >
            {urgent.map((item) => (
              <ActionCard
                key={item.id}
                priority="urgent"
                title={item.title}
                description={item.description}
                avatar={item.user?.profile?.avatarUrl}
                meta={
                  <>
                    {item.user && (
                      <>
                        <span>{item.user.email}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>{formatTimeAgo(item.timestamp)}</span>
                  </>
                }
                actions={
                  <div className="flex gap-2">
                    {item.type === 'suspended_user' && (
                      <>
                        <ActionButton
                          variant="default"
                          onClick={() => handleViewUser(item.user._id)}
                        >
                          Review
                        </ActionButton>
                        <ActionButton
                          variant="primary"
                          onClick={() => handleUnsuspend(item.user._id)}
                        >
                          Unsuspend
                        </ActionButton>
                      </>
                    )}
                    {item.type === 'error_spike' && (
                      <ActionButton variant="primary" onClick={handleViewLogs}>
                        View Logs
                      </ActionButton>
                    )}
                  </div>
                }
              />
            ))}
          </InboxSection>

          {/* Needs Review Section */}
          <InboxSection
            priority="warning"
            title="Needs Review"
            subtitle="Flagged by automated systems"
            count={needsReview.length}
          >
            {needsReview.map((item) => (
              <ActionCard
                key={item.id}
                priority="warning"
                title={item.title}
                description={item.description}
                avatar={item.user?.profile?.avatarUrl}
                meta={
                  <>
                    {item.user && (
                      <>
                        <span>{item.user.email}</span>
                        <span>•</span>
                        <span className="capitalize">{item.user.role} tier</span>
                        <span>•</span>
                      </>
                    )}
                    <span>{formatTimeAgo(item.timestamp)}</span>
                  </>
                }
                onDismiss={() => handleDismiss(item.id)}
                actions={
                  <div className="flex gap-2">
                    {item.type === 'warned_user' && (
                      <ActionButton
                        variant="warning"
                        onClick={() => handleViewUser(item.user._id)}
                      >
                        Investigate
                      </ActionButton>
                    )}
                    {item.type === 'recent_errors' && (
                      <ActionButton variant="warning" onClick={handleViewLogs}>
                        View Logs
                      </ActionButton>
                    )}
                  </div>
                }
              />
            ))}
          </InboxSection>

          {/* FYI Section */}
          <InboxSection
            priority="info"
            title="FYI"
            subtitle="No action required"
            count={fyi.length}
          >
            {fyi.map((item) => (
              <ActionCard
                key={item.id}
                priority="info"
                title={item.title}
                description={item.description}
                onDismiss={() => handleDismiss(item.id)}
                actions={
                  <div className="flex gap-2">
                    {item.type === 'new_signups' && (
                      <ActionButton variant="default" onClick={handleViewUsers}>
                        View Users
                      </ActionButton>
                    )}
                  </div>
                }
              >
                {item.users && item.users.length > 0 && (
                  <div className="flex items-center gap-1 mt-3">
                    {item.users.slice(0, 5).map((user) => (
                      <img
                        key={user._id}
                        src={user.profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email}`}
                        alt=""
                        className="w-6 h-6 rounded-full border-2 border-panel -ml-1 first:ml-0"
                      />
                    ))}
                    {item.meta?.count > 5 && (
                      <span className="text-xs text-muted ml-2">
                        +{item.meta.count - 5} more
                      </span>
                    )}
                  </div>
                )}
              </ActionCard>
            ))}
          </InboxSection>
        </main>
      )}

      {/* Divider */}
      <hr className="border-border my-8" />

      {/* Platform Stats */}
      {stats && (
        <section className="mb-8">
          <h2 className="text-sm font-medium text-muted uppercase tracking-wide mb-4">
            Platform Status
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-panel border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs">Total Users</span>
              </div>
              <p className="text-2xl font-bold text-text">{stats.totalUsers?.toLocaleString()}</p>
            </div>
            <div className="bg-panel border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted mb-1">
                <Activity className="w-4 h-4" />
                <span className="text-xs">Online Now</span>
              </div>
              <p className="text-2xl font-bold text-text">{stats.onlineNow}</p>
            </div>
            <div className="bg-panel border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Error Rate</span>
              </div>
              <p className={`text-2xl font-bold ${stats.errorRate > 1 ? 'text-red-500' : 'text-green-500'}`}>
                {stats.errorRate}%
              </p>
            </div>
            <div className="bg-panel border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs">New Today</span>
              </div>
              <p className="text-2xl font-bold text-text">{stats.newUsersToday}</p>
            </div>
          </div>
        </section>
      )}

      {/* Footer info */}
      {data?.generatedAt && (
        <p className="text-xs text-muted text-center">
          Last updated: {new Date(data.generatedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

export default AdminInboxPage;
