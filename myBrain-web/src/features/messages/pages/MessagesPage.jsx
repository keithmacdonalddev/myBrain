import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, ArrowLeft } from 'lucide-react';
import { useSelector } from 'react-redux';
import ConversationList from '../components/ConversationList';
import MessageThread from '../components/MessageThread';
import MessageInput from '../components/MessageInput';
import UserAvatar from '../../../components/ui/UserAvatar';
import Skeleton from '../../../components/ui/Skeleton';
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkAsRead,
  useRealtimeMessages,
} from '../hooks/useMessages';
import { useConversationSocket } from '../../../hooks/useWebSocket.jsx';
import NewConversationModal from '../components/NewConversationModal';

function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedConversationId = searchParams.get('conversation');
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [isMobileListView, setIsMobileListView] = useState(true);
  const { user: currentUser } = useSelector((state) => state.auth);

  // Queries
  const { data: conversationsData, isLoading: loadingConversations } = useConversations();
  const { data: messagesData, isLoading: loadingMessages } = useMessages(selectedConversationId);
  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkAsRead();

  // Real-time updates
  const { typingUsers } = useRealtimeMessages(selectedConversationId);
  const { sendTyping } = useConversationSocket(selectedConversationId);

  const conversations = conversationsData?.conversations || [];
  const messages = messagesData?.messages || [];

  // Find selected conversation
  const selectedConversation = conversations.find(c => c._id === selectedConversationId);

  // Mark as read when selecting a conversation
  useEffect(() => {
    if (selectedConversationId) {
      markAsReadMutation.mutate(selectedConversationId);
      setIsMobileListView(false);
    }
  }, [selectedConversationId]);

  const handleSelectConversation = (conv) => {
    setSearchParams({ conversation: conv._id });
  };

  const handleSendMessage = (content) => {
    if (!selectedConversationId) return;
    sendMessageMutation.mutate({
      conversationId: selectedConversationId,
      content,
    });
  };

  const handleBack = () => {
    setSearchParams({});
    setIsMobileListView(true);
  };

  const getOtherParticipant = (conv) => {
    return conv?.participants?.find(p => p._id !== currentUser?._id);
  };

  // Build unread counts map
  const unreadCounts = conversations.reduce((acc, conv) => {
    const meta = conv.participantMeta?.find(m => m.userId === currentUser?._id);
    acc[conv._id] = meta?.unreadCount || 0;
    return acc;
  }, {});

  if (loadingConversations) {
    return (
      <div className="h-full flex bg-bg">
        <div className="w-80 border-r border-border p-4 space-y-4 bg-panel flex-shrink-0">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center bg-bg">
          <Skeleton className="w-64 h-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-bg">
      {/* Conversation list - hidden on mobile when viewing messages */}
      <div className={`w-full md:w-80 flex-shrink-0 border-r border-border bg-panel ${
        !isMobileListView && selectedConversationId ? 'hidden md:flex' : 'flex'
      } flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <h1 className="text-lg font-semibold text-text">Messages</h1>
          <button
            onClick={() => setShowNewConversation(true)}
            className="p-2 hover:bg-bg rounded-lg transition-colors"
            title="New conversation"
          >
            <Plus className="w-5 h-5 text-muted" />
          </button>
        </div>

        <ConversationList
          conversations={conversations}
          selectedId={selectedConversationId}
          onSelect={handleSelectConversation}
          unreadCounts={unreadCounts}
        />
      </div>

      {/* Message thread */}
      <div className={`flex-1 flex flex-col min-w-0 ${
        isMobileListView && !selectedConversationId ? 'hidden md:flex' : 'flex'
      }`}>
        {selectedConversation ? (
          <>
            {/* Conversation header */}
            <div className="flex items-center gap-3 p-4 border-b border-border bg-panel flex-shrink-0">
              <button
                onClick={handleBack}
                className="md:hidden p-1 hover:bg-bg rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <UserAvatar
                user={getOtherParticipant(selectedConversation)}
                size="md"
                showPresence
              />

              <div className="flex-1">
                <h2 className="font-medium text-text">
                  {selectedConversation.type === 'group' && selectedConversation.name
                    ? selectedConversation.name
                    : getOtherParticipant(selectedConversation)?.profile?.displayName ||
                      getOtherParticipant(selectedConversation)?.email}
                </h2>
                {getOtherParticipant(selectedConversation)?.presence?.isOnline && (
                  <p className="text-xs text-green-500">Online</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <MessageThread
              messages={messages}
              isLoading={loadingMessages}
              typingUsers={typingUsers}
            />

            {/* Input */}
            <MessageInput
              onSend={handleSendMessage}
              onTyping={sendTyping}
              disabled={sendMessageMutation.isPending}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquare className="w-16 h-16 text-muted mb-4" />
            <h2 className="text-xl font-semibold text-text mb-2">Your Messages</h2>
            <p className="text-muted max-w-sm">
              Select a conversation from the list or start a new one to begin messaging.
            </p>
            <button
              onClick={() => setShowNewConversation(true)}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Start a Conversation
            </button>
          </div>
        )}
      </div>

      {/* New conversation modal */}
      {showNewConversation && (
        <NewConversationModal
          onClose={() => setShowNewConversation(false)}
          onConversationCreated={(conv) => {
            setShowNewConversation(false);
            handleSelectConversation(conv);
          }}
        />
      )}
    </div>
  );
}

export default MessagesPage;
