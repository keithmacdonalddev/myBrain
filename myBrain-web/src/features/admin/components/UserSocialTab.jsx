import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Ban,
  MessageSquare,
  Share2,
  Loader2,
  AlertCircle,
  ChevronRight,
  User,
  Clock,
  Eye,
  ExternalLink,
  Flag,
  TrendingUp,
  ShieldAlert,
  Activity,
} from 'lucide-react';
import { adminApi } from '../../../lib/api';
import UserAvatar from '../../../components/ui/UserAvatar';

function StatCard({ icon: Icon, label, value, color = 'text-muted', onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`p-3 bg-bg rounded-lg border border-border text-left transition-colors ${
        onClick ? 'hover:border-primary/50 cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-muted">{label}</span>
      </div>
      <p className="text-lg font-bold text-text">{value}</p>
    </button>
  );
}

function UserCard({ user, meta, onClick }) {
  if (!user) return null;

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 bg-bg rounded-lg border border-border ${
        onClick ? 'hover:border-primary/50 cursor-pointer' : ''
      }`}
    >
      <UserAvatar user={user} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text truncate">
          {user.displayName || user.email}
        </p>
        {meta && <p className="text-xs text-muted">{meta}</p>}
      </div>
      {onClick && <ChevronRight className="w-4 h-4 text-muted" />}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, count, color = 'text-muted' }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className={`w-4 h-4 ${color}`} />
      <h4 className="text-sm font-medium text-text">{title}</h4>
      {count !== undefined && (
        <span className="px-1.5 py-0.5 text-xs bg-bg rounded text-muted">{count}</span>
      )}
    </div>
  );
}

function ConnectionsSection({ userId, onViewUser }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-user-connections', userId],
    queryFn: async () => {
      const response = await adminApi.getUserConnections(userId);
      return response.data;
    },
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
      <div className="text-center py-4 text-red-500 text-sm">
        <AlertCircle className="w-4 h-4 inline mr-2" />
        Failed to load connections
      </div>
    );
  }

  const connections = data?.connections || [];

  if (connections.length === 0) {
    return (
      <p className="text-sm text-muted text-center py-4">No connections</p>
    );
  }

  return (
    <div className="space-y-2">
      {connections.slice(0, 10).map((conn) => (
        <UserCard
          key={conn._id}
          user={conn.connectedUser}
          meta={`Connected ${new Date(conn.updatedAt).toLocaleDateString()}`}
          onClick={() => onViewUser(conn.connectedUser._id)}
        />
      ))}
      {connections.length > 10 && (
        <p className="text-xs text-muted text-center pt-2">
          +{connections.length - 10} more connections
        </p>
      )}
    </div>
  );
}

function BlocksSection({ userId, onViewUser }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-user-blocks', userId],
    queryFn: async () => {
      const response = await adminApi.getUserBlocks(userId);
      return response.data;
    },
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
      <div className="text-center py-4 text-red-500 text-sm">
        <AlertCircle className="w-4 h-4 inline mr-2" />
        Failed to load blocks
      </div>
    );
  }

  const { blockedByUser = [], blockedThisUser = [] } = data || {};

  if (blockedByUser.length === 0 && blockedThisUser.length === 0) {
    return (
      <p className="text-sm text-muted text-center py-4">No blocks</p>
    );
  }

  return (
    <div className="space-y-4">
      {blockedByUser.length > 0 && (
        <div>
          <p className="text-xs text-muted mb-2">Users blocked by this user</p>
          <div className="space-y-2">
            {blockedByUser.map((block) => (
              <UserCard
                key={block._id}
                user={block.user}
                meta={`Blocked: ${block.reason}`}
                onClick={() => onViewUser(block.user._id)}
              />
            ))}
          </div>
        </div>
      )}
      {blockedThisUser.length > 0 && (
        <div>
          <p className="text-xs text-muted mb-2">Users who blocked this user</p>
          <div className="space-y-2">
            {blockedThisUser.map((block) => (
              <UserCard
                key={block._id}
                user={block.user}
                meta={`Reason: ${block.reason}`}
                onClick={() => onViewUser(block.user._id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MessagesSection({ userId, onViewUser }) {
  const [selectedConversation, setSelectedConversation] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-user-messages', userId, selectedConversation],
    queryFn: async () => {
      const response = await adminApi.getUserMessages(userId, {
        conversationId: selectedConversation,
      });
      return response.data;
    },
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
      <div className="text-center py-4 text-red-500 text-sm">
        <AlertCircle className="w-4 h-4 inline mr-2" />
        Failed to load messages
      </div>
    );
  }

  // Viewing a specific conversation
  if (selectedConversation && data?.messages) {
    return (
      <div>
        <button
          onClick={() => setSelectedConversation(null)}
          className="text-xs text-primary hover:underline mb-3 flex items-center gap-1"
        >
          ← Back to conversations
        </button>

        <div className="bg-bg rounded-lg border border-border p-3 mb-3">
          <p className="text-xs text-muted mb-1">Participants</p>
          <div className="flex flex-wrap gap-2">
            {data.conversation?.participants?.map((p) => (
              <button
                key={p._id}
                onClick={() => onViewUser(p._id)}
                className="flex items-center gap-1.5 px-2 py-1 bg-panel rounded text-xs hover:bg-primary/10"
              >
                <UserAvatar user={p} size="xs" />
                {p.displayName || p.email}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {data.messages?.map((msg) => (
            <div
              key={msg._id}
              className={`p-3 rounded-lg ${
                msg.sender._id === userId
                  ? 'bg-primary/10 ml-8'
                  : 'bg-bg mr-8'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-text">
                  {msg.sender.displayName || msg.sender.email}
                </span>
                <span className="text-[10px] text-muted">
                  {new Date(msg.createdAt).toLocaleString()}
                </span>
                {msg.isEdited && (
                  <span className="text-[10px] text-muted">(edited)</span>
                )}
                {msg.isDeleted && (
                  <span className="text-[10px] text-red-500">(deleted)</span>
                )}
              </div>
              <p className="text-sm text-text">{msg.content}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Conversation list
  const conversations = data?.conversations || [];

  if (conversations.length === 0) {
    return (
      <p className="text-sm text-muted text-center py-4">No conversations</p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted mb-2">
        Total messages sent: {data?.totalMessagesSent || 0}
      </p>
      {conversations.map((conv) => {
        const otherParticipants = conv.participants.filter(
          (p) => p._id !== userId
        );
        return (
          <button
            key={conv._id}
            onClick={() => setSelectedConversation(conv._id)}
            className="w-full flex items-center gap-3 p-3 bg-bg rounded-lg border border-border hover:border-primary/50 text-left"
          >
            <div className="flex -space-x-2">
              {otherParticipants.slice(0, 2).map((p) => (
                <UserAvatar key={p._id} user={p} size="sm" className="ring-2 ring-panel" />
              ))}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text truncate">
                {otherParticipants.map((p) => p.displayName || p.email).join(', ')}
              </p>
              <p className="text-xs text-muted">
                {conv.messageCount} messages ({conv.userMessageCount} by this user)
              </p>
            </div>
            <Eye className="w-4 h-4 text-muted" />
          </button>
        );
      })}
    </div>
  );
}

function SharesSection({ userId }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-user-shares', userId],
    queryFn: async () => {
      const response = await adminApi.getUserShares(userId);
      return response.data;
    },
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
      <div className="text-center py-4 text-red-500 text-sm">
        <AlertCircle className="w-4 h-4 inline mr-2" />
        Failed to load shares
      </div>
    );
  }

  const { sharedByUser = [], sharedWithUser = [] } = data || {};

  if (sharedByUser.length === 0 && sharedWithUser.length === 0) {
    return (
      <p className="text-sm text-muted text-center py-4">No shared items</p>
    );
  }

  return (
    <div className="space-y-4">
      {sharedByUser.length > 0 && (
        <div>
          <p className="text-xs text-muted mb-2">Items shared by this user</p>
          <div className="space-y-2">
            {sharedByUser.slice(0, 10).map((share) => (
              <div
                key={share._id}
                className="p-3 bg-bg rounded-lg border border-border"
              >
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded capitalize">
                    {share.itemType}
                  </span>
                  <span className="text-xs text-muted">{share.shareType}</span>
                </div>
                {share.sharedWith && (
                  <p className="text-xs text-muted mt-1">
                    Shared with {share.sharedWith.length} user(s)
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {sharedWithUser.length > 0 && (
        <div>
          <p className="text-xs text-muted mb-2">Items shared with this user</p>
          <div className="space-y-2">
            {sharedWithUser.slice(0, 10).map((share) => (
              <div
                key={share._id}
                className="p-3 bg-bg rounded-lg border border-border"
              >
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded capitalize">
                    {share.itemType}
                  </span>
                  <span className="text-xs text-muted">
                    from {share.owner?.displayName || share.owner?.email}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">
                  Permission: {share.permission}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectionPatternsSection({ userId, onViewUser }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-user-connection-patterns', userId],
    queryFn: async () => {
      const response = await adminApi.getUserConnectionPatterns(userId);
      return response.data;
    },
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
      <div className="text-center py-4 text-red-500 text-sm">
        <AlertCircle className="w-4 h-4 inline mr-2" />
        Failed to load patterns
      </div>
    );
  }

  const { requests = {}, blockedBy = {}, riskLevel = 'low' } = data || {};

  const riskColors = {
    low: 'text-green-500 bg-green-500/10',
    medium: 'text-yellow-500 bg-yellow-500/10',
    high: 'text-red-500 bg-red-500/10',
  };

  return (
    <div className="space-y-4">
      {/* Risk Level Badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">Risk Level:</span>
        <span className={`px-2 py-0.5 text-xs rounded font-medium capitalize ${riskColors[riskLevel]}`}>
          {riskLevel}
        </span>
      </div>

      {/* Request Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-bg rounded-lg">
          <p className="text-xs text-muted mb-1">Requests Sent (30d)</p>
          <p className="text-lg font-bold text-text">{requests.sent || 0}</p>
        </div>
        <div className="p-3 bg-bg rounded-lg">
          <p className="text-xs text-muted mb-1">Acceptance Rate</p>
          <p className="text-lg font-bold text-text">
            {requests.rejectionRate !== undefined
              ? `${(100 - requests.rejectionRate).toFixed(0)}%`
              : 'N/A'}
          </p>
        </div>
        <div className="p-3 bg-bg rounded-lg">
          <p className="text-xs text-muted mb-1">Accepted</p>
          <p className="text-lg font-bold text-green-500">{requests.accepted || 0}</p>
        </div>
        <div className="p-3 bg-bg rounded-lg">
          <p className="text-xs text-muted mb-1">Declined</p>
          <p className="text-lg font-bold text-red-500">{requests.declined || 0}</p>
        </div>
      </div>

      {/* Users Who Blocked This User */}
      {blockedBy?.count > 0 && (
        <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
          <p className="text-sm text-red-500 font-medium mb-2">
            <ShieldAlert className="w-4 h-4 inline mr-1" />
            Blocked by {blockedBy.count} user(s)
          </p>
          <div className="space-y-2">
            {blockedBy.users?.slice(0, 5).map((block, i) => (
              <button
                key={i}
                onClick={() => onViewUser(block.user?._id)}
                className="w-full flex items-center gap-2 p-2 bg-panel rounded text-left hover:bg-bg"
              >
                <UserAvatar user={block.user} size="xs" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text truncate">
                    {block.user?.profile?.displayName || block.user?.email}
                  </p>
                  <p className="text-[10px] text-muted">
                    Reason: {block.reason || 'Not specified'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RiskIndicatorsSection({ userId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-connection-patterns', userId],
    queryFn: async () => {
      const response = await adminApi.getUserConnectionPatterns(userId);
      return response.data;
    },
  });

  if (isLoading || !data?.riskIndicators?.length) return null;

  return (
    <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 space-y-2">
      <p className="text-sm font-medium text-yellow-500">
        <AlertCircle className="w-4 h-4 inline mr-1" />
        Risk Indicators
      </p>
      {data.riskIndicators.map((indicator, i) => (
        <div
          key={i}
          className={`text-xs p-2 rounded ${
            indicator.severity === 'high' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-600'
          }`}
        >
          {indicator.message}
        </div>
      ))}
    </div>
  );
}

function ReportsAgainstSection({ userId, onViewReports }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-user-reports', userId],
    queryFn: async () => {
      const response = await adminApi.getUserReports(userId);
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted" />
      </div>
    );
  }

  if (error) {
    return null;
  }

  const { reports = [], total = 0 } = data || {};

  if (total === 0) {
    return (
      <p className="text-sm text-muted text-center py-4">No reports against this user</p>
    );
  }

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">Total reports: {total}</p>
        {pendingCount > 0 && (
          <span className="px-2 py-0.5 text-xs bg-red-500/10 text-red-500 rounded">
            {pendingCount} pending
          </span>
        )}
      </div>

      {reports.slice(0, 5).map((report) => (
        <div
          key={report._id}
          className="p-3 bg-bg rounded-lg border border-border"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-1.5 py-0.5 text-[10px] rounded ${
              report.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
              report.status === 'resolved' ? 'bg-green-500/10 text-green-500' :
              'bg-muted/10 text-muted'
            }`}>
              {report.status}
            </span>
            <span className="text-xs text-muted capitalize">{report.reason?.replace(/_/g, ' ')}</span>
          </div>
          {report.description && (
            <p className="text-xs text-muted truncate">{report.description}</p>
          )}
          <p className="text-[10px] text-muted mt-1">
            {new Date(report.createdAt).toLocaleDateString()}
          </p>
        </div>
      ))}

      {total > 5 && (
        <button
          onClick={onViewReports}
          className="w-full text-center text-xs text-primary hover:underline py-2"
        >
          View all {total} reports
        </button>
      )}
    </div>
  );
}

export default function UserSocialTab({ user }) {
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState('connections');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-user-social-stats', user._id],
    queryFn: async () => {
      const response = await adminApi.getUserSocialStats(user._id);
      return response.data;
    },
  });

  const handleViewUser = (userId) => {
    navigate(`/admin/users?user=${userId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Connections"
          value={stats?.connections?.total || 0}
          color="text-blue-500"
          onClick={() => setExpandedSection('connections')}
        />
        <StatCard
          icon={Ban}
          label="Blocked / By"
          value={`${stats?.blocks?.blocked || 0} / ${stats?.blocks?.blockedBy || 0}`}
          color="text-red-500"
          onClick={() => setExpandedSection('blocks')}
        />
        <StatCard
          icon={MessageSquare}
          label="Messages Sent"
          value={stats?.messaging?.messagesSent || 0}
          color="text-green-500"
          onClick={() => setExpandedSection('messages')}
        />
        <StatCard
          icon={Share2}
          label="Shares"
          value={`${stats?.sharing?.itemsShared || 0} / ${stats?.sharing?.itemsReceived || 0}`}
          color="text-purple-500"
          onClick={() => setExpandedSection('shares')}
        />
      </div>

      {/* Pending Requests */}
      {(stats?.connections?.pendingReceived > 0 || stats?.connections?.pendingSent > 0) && (
        <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
          <p className="text-sm text-yellow-500">
            <Clock className="w-4 h-4 inline mr-1" />
            Pending: {stats.connections.pendingReceived} received, {stats.connections.pendingSent} sent
          </p>
        </div>
      )}

      {/* Risk Indicators (shows if any exist) */}
      <RiskIndicatorsSection userId={user._id} />

      {/* Expandable Sections */}
      <div className="space-y-4">
        {/* Connections */}
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'connections' ? null : 'connections')}
            className="w-full flex items-center justify-between p-3 bg-panel hover:bg-bg transition-colors"
          >
            <SectionHeader
              icon={Users}
              title="Connections"
              count={stats?.connections?.total}
              color="text-blue-500"
            />
            <ChevronRight
              className={`w-4 h-4 text-muted transition-transform ${
                expandedSection === 'connections' ? 'rotate-90' : ''
              }`}
            />
          </button>
          {expandedSection === 'connections' && (
            <div className="p-3 border-t border-border">
              <ConnectionsSection userId={user._id} onViewUser={handleViewUser} />
            </div>
          )}
        </div>

        {/* Blocks */}
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'blocks' ? null : 'blocks')}
            className="w-full flex items-center justify-between p-3 bg-panel hover:bg-bg transition-colors"
          >
            <SectionHeader
              icon={Ban}
              title="Blocks"
              count={(stats?.blocks?.blocked || 0) + (stats?.blocks?.blockedBy || 0)}
              color="text-red-500"
            />
            <ChevronRight
              className={`w-4 h-4 text-muted transition-transform ${
                expandedSection === 'blocks' ? 'rotate-90' : ''
              }`}
            />
          </button>
          {expandedSection === 'blocks' && (
            <div className="p-3 border-t border-border">
              <BlocksSection userId={user._id} onViewUser={handleViewUser} />
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'messages' ? null : 'messages')}
            className="w-full flex items-center justify-between p-3 bg-panel hover:bg-bg transition-colors"
          >
            <SectionHeader
              icon={MessageSquare}
              title="Messages"
              count={stats?.messaging?.conversations}
              color="text-green-500"
            />
            <ChevronRight
              className={`w-4 h-4 text-muted transition-transform ${
                expandedSection === 'messages' ? 'rotate-90' : ''
              }`}
            />
          </button>
          {expandedSection === 'messages' && (
            <div className="p-3 border-t border-border">
              <MessagesSection userId={user._id} onViewUser={handleViewUser} />
            </div>
          )}
        </div>

        {/* Shares */}
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'shares' ? null : 'shares')}
            className="w-full flex items-center justify-between p-3 bg-panel hover:bg-bg transition-colors"
          >
            <SectionHeader
              icon={Share2}
              title="Shared Items"
              count={(stats?.sharing?.itemsShared || 0) + (stats?.sharing?.itemsReceived || 0)}
              color="text-purple-500"
            />
            <ChevronRight
              className={`w-4 h-4 text-muted transition-transform ${
                expandedSection === 'shares' ? 'rotate-90' : ''
              }`}
            />
          </button>
          {expandedSection === 'shares' && (
            <div className="p-3 border-t border-border">
              <SharesSection userId={user._id} />
            </div>
          )}
        </div>

        {/* Connection Patterns */}
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'patterns' ? null : 'patterns')}
            className="w-full flex items-center justify-between p-3 bg-panel hover:bg-bg transition-colors"
          >
            <SectionHeader
              icon={Activity}
              title="Connection Patterns"
              color="text-orange-500"
            />
            <ChevronRight
              className={`w-4 h-4 text-muted transition-transform ${
                expandedSection === 'patterns' ? 'rotate-90' : ''
              }`}
            />
          </button>
          {expandedSection === 'patterns' && (
            <div className="p-3 border-t border-border">
              <ConnectionPatternsSection userId={user._id} onViewUser={handleViewUser} />
            </div>
          )}
        </div>

        {/* Reports Against User */}
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'reports' ? null : 'reports')}
            className="w-full flex items-center justify-between p-3 bg-panel hover:bg-bg transition-colors"
          >
            <SectionHeader
              icon={Flag}
              title="Reports Against User"
              color="text-red-500"
            />
            <ChevronRight
              className={`w-4 h-4 text-muted transition-transform ${
                expandedSection === 'reports' ? 'rotate-90' : ''
              }`}
            />
          </button>
          {expandedSection === 'reports' && (
            <div className="p-3 border-t border-border">
              <ReportsAgainstSection
                userId={user._id}
                onViewReports={() => navigate(`/admin/reports?user=${user._id}`)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
