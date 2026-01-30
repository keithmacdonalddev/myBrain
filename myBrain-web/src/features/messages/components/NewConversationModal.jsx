import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, MessageSquare } from 'lucide-react';
import { connectionsApi } from '../../../lib/api';
import { useCreateConversation } from '../hooks/useMessages';
import UserAvatar from '../../../components/ui/UserAvatar';
import { useDebounce } from '../../../hooks/useDebounce';
import { getDisplayName } from '../../../lib/utils';
import BaseModal from '../../../components/ui/BaseModal';

function NewConversationModal({ onClose, onConversationCreated }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const createConversationMutation = useCreateConversation();

  // Get connections - destructure data from axios response
  const { data: connectionsData, isLoading } = useQuery({
    queryKey: ['connections', 'for-messaging'],
    queryFn: async () => {
      const { data } = await connectionsApi.getConnections();
      return data;
    },
  });

  const connections = connectionsData?.connections || [];

  // Filter connections by search
  // Note: API returns { user: {...}, connectedAt, ... } - access conn.user for the other user
  const filteredConnections = connections.filter((conn) => {
    if (!debouncedSearch) return true;
    const user = conn.user || conn; // Support both API formats
    const name = getDisplayName(user, { fallback: '' });
    return name.toLowerCase().includes(debouncedSearch.toLowerCase());
  });

  const handleStartConversation = async () => {
    if (!selectedUser) return;

    try {
      // selectedUser is the connection object - get the actual user's ID
      // API expects { userId: 'xxx' } for direct conversations
      const user = selectedUser.user || selectedUser;
      const result = await createConversationMutation.mutateAsync({ userId: user._id });
      onConversationCreated(result.conversation || result);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  // Custom footer with start conversation button
  const modalFooter = (
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
  );

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title="New Conversation"
      size="md"
      showFooter={true}
      customFooter={modalFooter}
    >
      {/* Search */}
      <div className="mb-4">
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
      <div className="max-h-80 overflow-y-auto -mx-4 px-4">
        {isLoading ? (
          <div className="py-4 text-center text-muted">Loading connections...</div>
        ) : filteredConnections.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted">
              {searchQuery
                ? 'No connections found'
                : 'No connections yet. Connect with people to start messaging!'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredConnections.map((conn) => {
              // API returns { user: {...}, ... } - extract user for display
              const user = conn.user || conn;
              const displayName = getDisplayName(user);
              const bio = user.profile?.bio;

              return (
                <button
                  key={conn._id}
                  onClick={() => setSelectedUser(selectedUser?._id === conn._id ? null : conn)}
                  className={`w-full flex items-center gap-3 p-4 text-left hover:bg-bg transition-colors ${
                    selectedUser?._id === conn._id ? 'bg-primary/10' : ''
                  }`}
                >
                  <UserAvatar user={user} size="md" showPresence />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text truncate">
                      {displayName}
                    </p>
                    {bio && (
                      <p className="text-sm text-muted truncate">{bio}</p>
                    )}
                  </div>
                  {selectedUser?._id === conn._id && (
                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">&#10003;</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </BaseModal>
  );
}

export default NewConversationModal;
