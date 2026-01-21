import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Search, MessageSquare } from 'lucide-react';
import { connectionsApi } from '../../../lib/api';
import { useCreateConversation } from '../hooks/useMessages';
import UserAvatar from '../../../components/ui/UserAvatar';
import { useDebounce } from '../../../hooks/useDebounce';

function NewConversationModal({ onClose, onConversationCreated }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const createConversationMutation = useCreateConversation();

  // Get connections
  const { data: connectionsData, isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: () => connectionsApi.getConnections(),
  });

  const connections = connectionsData?.connections || [];

  // Filter connections by search
  const filteredConnections = connections.filter((conn) => {
    if (!debouncedSearch) return true;
    const name = conn.profile?.displayName || conn.email || '';
    return name.toLowerCase().includes(debouncedSearch.toLowerCase());
  });

  const handleStartConversation = async () => {
    if (!selectedUser) return;

    try {
      const result = await createConversationMutation.mutateAsync([selectedUser._id]);
      onConversationCreated(result.conversation || result);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-panel border border-border rounded-xl shadow-theme-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text">New Conversation</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-bg rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your connections..."
              className="w-full pl-9 pr-4 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              autoFocus
            />
          </div>
        </div>

        {/* Connections list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted">Loading connections...</div>
          ) : filteredConnections.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted">
                {searchQuery
                  ? 'No connections found'
                  : 'No connections yet. Connect with people to start messaging!'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredConnections.map((conn) => (
                <button
                  key={conn._id}
                  onClick={() => setSelectedUser(selectedUser?._id === conn._id ? null : conn)}
                  className={`w-full flex items-center gap-3 p-4 text-left hover:bg-bg transition-colors ${
                    selectedUser?._id === conn._id ? 'bg-primary/10' : ''
                  }`}
                >
                  <UserAvatar user={conn} size="md" showPresence />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text truncate">
                      {conn.profile?.displayName || conn.email}
                    </p>
                    {conn.profile?.bio && (
                      <p className="text-sm text-muted truncate">{conn.profile.bio}</p>
                    )}
                  </div>
                  {selectedUser?._id === conn._id && (
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-bg/50">
          <button
            onClick={handleStartConversation}
            disabled={!selectedUser || createConversationMutation.isPending}
            className="w-full py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {createConversationMutation.isPending ? (
              'Starting...'
            ) : (
              <>
                <MessageSquare className="w-4 h-4" />
                Start Conversation
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewConversationModal;
