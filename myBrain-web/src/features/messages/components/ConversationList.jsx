import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Search } from 'lucide-react';
import { useState } from 'react';
import UserAvatar from '../../../components/ui/UserAvatar';
import { useSelector } from 'react-redux';

function ConversationList({ conversations, selectedId, onSelect, unreadCounts = {} }) {
  const [searchQuery, setSearchQuery] = useState('');
  const { user: currentUser } = useSelector((state) => state.auth);

  // Filter conversations by search
  const filteredConversations = conversations?.filter((conv) => {
    if (!searchQuery) return true;
    const otherParticipant = conv.participants?.find(p => p._id !== currentUser?._id);
    const name = otherParticipant?.profile?.displayName || otherParticipant?.email || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const getOtherParticipant = (conv) => {
    return conv.participants?.find(p => p._id !== currentUser?._id);
  };

  const getConversationName = (conv) => {
    if (conv.type === 'group' && conv.name) {
      return conv.name;
    }
    const other = getOtherParticipant(conv);
    return other?.profile?.displayName || other?.email || 'Unknown';
  };

  const getUnreadCount = (convId) => {
    return unreadCounts[convId] || 0;
  };

  return (
    <div className="flex flex-col h-full border-r border-border">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-4 py-2 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <MessageSquare className="w-12 h-12 text-muted mb-2" />
            <p className="text-muted text-sm">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const other = getOtherParticipant(conv);
            const unread = getUnreadCount(conv._id);
            const isSelected = selectedId === conv._id;

            return (
              <button
                key={conv._id}
                onClick={() => onSelect(conv)}
                className={`w-full flex items-center gap-3 p-3 text-left hover:bg-bg transition-colors ${
                  isSelected ? 'bg-primary/10 border-l-2 border-primary' : ''
                }`}
              >
                <UserAvatar user={other} size="md" showPresence />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`font-medium text-sm truncate ${unread > 0 ? 'text-text' : 'text-muted'}`}>
                      {getConversationName(conv)}
                    </span>
                    {conv.lastMessage?.createdAt && (
                      <span className="text-xs text-muted">
                        {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-0.5">
                    <p className={`text-xs truncate ${unread > 0 ? 'text-text font-medium' : 'text-muted'}`}>
                      {conv.lastMessage?.content || 'No messages yet'}
                    </p>
                    {unread > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-primary text-white text-xs rounded-full min-w-[20px] text-center">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ConversationList;
