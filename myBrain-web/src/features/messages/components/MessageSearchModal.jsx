/**
 * =============================================================================
 * MESSAGESEARCHMODAL.JSX - Search Messages Across Conversations
 * =============================================================================
 *
 * Modal that allows users to search through their message history.
 * Clicking a result navigates to that conversation and highlights the message.
 *
 * =============================================================================
 */

import { useState, useCallback, useEffect } from 'react';
import { Search, X, MessageSquare, Loader2 } from 'lucide-react';
import { useMessageSearch } from '../hooks/useMessages';
import { useDebounce } from '../../../hooks/useDebounce';
import UserAvatar from '../../../components/ui/UserAvatar';

export default function MessageSearchModal({ onClose, onSelectResult }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading, error } = useMessageSearch(debouncedQuery);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSelectResult = (result) => {
    onSelectResult(result);
    onClose();
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Highlight matching text in content
  const highlightMatch = (content, searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) return content;

    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = content.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-primary/20 text-primary rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-panel glass-heavy border border-border rounded-xl shadow-theme-2xl w-full max-w-xl mx-4 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-border">
          <Search className="w-5 h-5 text-muted flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages..."
            className="flex-1 py-4 bg-transparent text-text placeholder-muted focus:outline-none"
            autoFocus
          />
          {isLoading && <Loader2 className="w-5 h-5 text-muted animate-spin" />}
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Initial state */}
          {!query && (
            <div className="py-12 text-center">
              <MessageSquare className="w-12 h-12 text-muted/50 mx-auto mb-3" />
              <p className="text-muted">Type to search your messages</p>
              <p className="text-xs text-muted/70 mt-1">
                Search across all your conversations
              </p>
            </div>
          )}

          {/* Loading state */}
          {query && query.length < 2 && (
            <div className="py-8 text-center">
              <p className="text-muted text-sm">Type at least 2 characters to search</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="py-8 text-center">
              <p className="text-red-500 text-sm">Failed to search messages</p>
            </div>
          )}

          {/* No results */}
          {data && data.results?.length === 0 && (
            <div className="py-12 text-center">
              <Search className="w-12 h-12 text-muted/50 mx-auto mb-3" />
              <p className="text-muted">No messages found</p>
              <p className="text-xs text-muted/70 mt-1">
                Try different keywords
              </p>
            </div>
          )}

          {/* Results list */}
          {data?.results?.length > 0 && (
            <div className="divide-y divide-border">
              {data.results.map((result) => (
                <button
                  key={result._id}
                  onClick={() => handleSelectResult(result)}
                  className="w-full text-left px-4 py-3 hover:bg-bg transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar user={result.sender} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-text truncate">
                          {result.sender?.profile?.displayName || result.sender?.email || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted flex-shrink-0">
                          {formatDate(result.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted mt-0.5 line-clamp-2">
                        {highlightMatch(result.content, debouncedQuery)}
                      </p>
                      {result.conversation?.name && (
                        <p className="text-xs text-muted/70 mt-1">
                          in {result.conversation.name}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Results count footer */}
          {data?.results?.length > 0 && (
            <div className="px-4 py-3 border-t border-border bg-bg/50">
              <p className="text-xs text-muted">
                Found {data.total} result{data.total !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
