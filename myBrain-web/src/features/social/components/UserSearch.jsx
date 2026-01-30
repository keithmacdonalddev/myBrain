import { useState, useEffect, useRef } from 'react';
import { Search, X, UserPlus, Clock, Check, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import UserAvatar from '../../../components/ui/UserAvatar';
import { useUserSearch, useSendConnectionRequest } from '../hooks/useConnections';
import { cn, getDisplayName } from '../../../lib/utils';
import { useDebounce } from '../../../hooks/useDebounce';

export default function UserSearch({ className }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const { data, isLoading, isFetching } = useUserSearch(debouncedQuery, {
    limit: 10,
    enabled: isOpen && debouncedQuery.length >= 2,
  });

  const sendRequest = useSendConnectionRequest();

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConnect = (userId) => {
    sendRequest.mutate({ userId, source: 'search' });
  };

  const getConnectionButton = (user) => {
    if (user.connectionStatus === 'accepted') {
      return (
        <span className="flex items-center gap-1 text-xs text-green-500">
          <Check className="w-3 h-3" />
          Connected
        </span>
      );
    }
    if (user.connectionStatus === 'pending') {
      if (user.isRequester) {
        return (
          <span className="flex items-center gap-1 text-xs text-muted">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      }
      return (
        <Link
          to="/app/social/connections?tab=pending"
          className="text-xs text-primary hover:underline"
        >
          View request
        </Link>
      );
    }
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleConnect(user._id);
        }}
        disabled={sendRequest.isPending}
        className="p-1.5 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        title="Connect"
        aria-label="Send connection request"
      >
        <UserPlus className="w-3.5 h-3.5" />
      </button>
    );
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search users..."
          className="w-full pl-9 pr-8 py-2.5 text-sm rounded-xl border border-border bg-panel text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && debouncedQuery.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-panel glass border border-border rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
          {isLoading || isFetching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted" />
            </div>
          ) : data?.users?.length > 0 ? (
            <div className="py-1">
              {data.users.map((user) => (
                <Link
                  key={user._id}
                  to={`/app/social/profile/${user._id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-bg transition-colors"
                >
                  <UserAvatar user={user} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-text truncate">
                      {getDisplayName(user)}
                    </div>
                    {user.profile?.bio && (
                      <div className="text-xs text-muted truncate">
                        {user.profile.bio}
                      </div>
                    )}
                  </div>
                  {getConnectionButton(user)}
                </Link>
              ))}
              {data.hasMore && (
                <div className="px-3 py-2 text-xs text-center text-muted">
                  {data.total - data.users.length} more results...
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted">
              No users found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
