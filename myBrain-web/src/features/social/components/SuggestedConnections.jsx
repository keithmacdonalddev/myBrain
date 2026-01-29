import { Link } from 'react-router-dom';
import { UserPlus, Loader2, Users } from 'lucide-react';
import UserAvatar from '../../../components/ui/UserAvatar';
import { useSuggestions, useSendConnectionRequest } from '../hooks/useConnections';
import { cn, getDisplayName } from '../../../lib/utils';

export default function SuggestedConnections({ limit = 5, className }) {
  const { data, isLoading, error } = useSuggestions(limit);
  const sendRequest = useSendConnectionRequest();

  const handleConnect = (userId) => {
    sendRequest.mutate({ userId, source: 'suggested' });
  };

  if (isLoading) {
    return (
      <div className={cn('bg-panel rounded-xl border border-border p-4', className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted" />
        </div>
      </div>
    );
  }

  if (error || !data?.suggestions?.length) {
    return null;
  }

  return (
    <div className={cn('bg-panel rounded-xl border border-border', className)}>
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-text flex items-center gap-2">
          <Users className="w-4 h-4" />
          People you may know
        </h3>
      </div>

      <div className="divide-y divide-border">
        {data.suggestions.map((user) => (
          <div
            key={user._id}
            className="flex items-center gap-3 p-4 hover:bg-bg transition-colors"
          >
            <Link to={`/app/social/profile/${user._id}`}>
              <UserAvatar user={user} size="md" showPresence />
            </Link>

            <div className="flex-1 min-w-0">
              <Link
                to={`/app/social/profile/${user._id}`}
                className="font-medium text-sm text-text hover:text-primary transition-colors block truncate"
              >
                {getDisplayName(user)}
              </Link>
              {user.profile?.bio && (
                <p className="text-xs text-muted truncate">
                  {user.profile.bio}
                </p>
              )}
              {user.mutualConnections > 0 ? (
                <p className="text-xs text-muted">
                  {user.mutualConnections} mutual connection{user.mutualConnections !== 1 ? 's' : ''}
                </p>
              ) : user.stats?.connectionCount > 0 && (
                <p className="text-xs text-muted">
                  {user.stats.connectionCount} connection{user.stats.connectionCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <button
              onClick={() => handleConnect(user._id)}
              disabled={sendRequest.isPending}
              className="p-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
              title="Connect"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
