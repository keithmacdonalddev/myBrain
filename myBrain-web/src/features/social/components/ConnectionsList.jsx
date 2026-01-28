import { useState } from 'react';
import { Loader2, Users, Inbox, Send, Ban } from 'lucide-react';
import ConnectionCard from './ConnectionCard';
import {
  useConnections,
  usePendingRequests,
  useSentRequests,
  useBlockedUsers,
  useConnectionCounts,
  useUnblockUser,
} from '../hooks/useConnections';
import { cn, getDisplayName } from '../../../lib/utils';
import UserAvatar from '../../../components/ui/UserAvatar';

const TABS = [
  { id: 'connections', label: 'Connections', icon: Users },
  { id: 'pending', label: 'Pending', icon: Inbox },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'blocked', label: 'Blocked', icon: Ban },
];

export default function ConnectionsList({ initialTab = 'connections', className }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const countsQuery = useConnectionCounts();
  const connectionsQuery = useConnections({ enabled: activeTab === 'connections' });
  const pendingQuery = usePendingRequests({ enabled: activeTab === 'pending' });
  const sentQuery = useSentRequests({ enabled: activeTab === 'sent' });
  const blockedQuery = useBlockedUsers({ enabled: activeTab === 'blocked' });
  const unblockMutation = useUnblockUser();

  const counts = countsQuery.data || { connections: 0, pending: 0, sent: 0 };

  const getCount = (tabId) => {
    switch (tabId) {
      case 'connections':
        return counts.connections;
      case 'pending':
        return counts.pending;
      case 'sent':
        return counts.sent;
      case 'blocked':
        return blockedQuery.data?.total || 0;
      default:
        return 0;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'connections': {
        if (connectionsQuery.isLoading) {
          return <LoadingState />;
        }
        if (!connectionsQuery.data?.connections?.length) {
          return (
            <EmptyState
              icon={Users}
              title="No connections yet"
              description="Search for people to connect with or check your pending requests."
            />
          );
        }
        return (
          <div className="space-y-2">
            {connectionsQuery.data.connections.map((connection) => (
              <ConnectionCard
                key={connection._id}
                connection={connection}
                type="connection"
              />
            ))}
          </div>
        );
      }

      case 'pending': {
        if (pendingQuery.isLoading) {
          return <LoadingState />;
        }
        if (!pendingQuery.data?.requests?.length) {
          return (
            <EmptyState
              icon={Inbox}
              title="No pending requests"
              description="When someone sends you a connection request, it will appear here."
            />
          );
        }
        return (
          <div className="space-y-2">
            {pendingQuery.data.requests.map((request) => (
              <ConnectionCard
                key={request._id}
                connection={request}
                type="pending"
              />
            ))}
          </div>
        );
      }

      case 'sent': {
        if (sentQuery.isLoading) {
          return <LoadingState />;
        }
        if (!sentQuery.data?.requests?.length) {
          return (
            <EmptyState
              icon={Send}
              title="No sent requests"
              description="Connection requests you've sent will appear here."
            />
          );
        }
        return (
          <div className="space-y-2">
            {sentQuery.data.requests.map((request) => (
              <ConnectionCard
                key={request._id}
                connection={request}
                type="sent"
              />
            ))}
          </div>
        );
      }

      case 'blocked': {
        if (blockedQuery.isLoading) {
          return <LoadingState />;
        }
        if (!blockedQuery.data?.blocked?.length) {
          return (
            <EmptyState
              icon={Ban}
              title="No blocked users"
              description="Users you block will appear here."
            />
          );
        }
        return (
          <div className="space-y-2">
            {blockedQuery.data.blocked.map((block) => (
              <div
                key={block._id}
                className="flex items-center gap-3 p-3 rounded-lg bg-panel border border-border"
              >
                <UserAvatar user={block.user} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text truncate">
                    {getDisplayName(block.user)}
                  </div>
                  <div className="text-xs text-muted">
                    Blocked {new Date(block.blockedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => unblockMutation.mutate(block.user._id)}
                  disabled={unblockMutation.isPending}
                  className="px-3 py-1.5 text-sm rounded-lg bg-bg hover:bg-panel2 text-text transition-colors disabled:opacity-50"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className={cn('', className)}>
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-panel border border-border rounded-xl mb-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = getCount(tab.id);
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-muted hover:text-text hover:bg-bg'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 text-xs rounded-full',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-muted/20 text-muted'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-muted" />
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="text-center py-12">
      <Icon className="w-12 h-12 mx-auto text-muted/50 mb-4" />
      <h3 className="font-medium text-lg text-text mb-2">{title}</h3>
      <p className="text-sm text-muted max-w-sm mx-auto">{description}</p>
    </div>
  );
}
