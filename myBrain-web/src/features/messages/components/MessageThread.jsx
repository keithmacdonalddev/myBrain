import { useEffect, useRef } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { useSelector } from 'react-redux';
import UserAvatar from '../../../components/ui/UserAvatar';
import Skeleton from '../../../components/ui/Skeleton';

function MessageBubble({ message, isOwn, showAvatar }) {
  const formattedTime = format(new Date(message.createdAt), 'HH:mm');

  return (
    <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {showAvatar ? (
        <UserAvatar user={message.senderId} size="sm" showPresence={false} />
      ) : (
        <div className="w-8" /> // Spacer when avatar is hidden
      )}

      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
          isOwn
            ? 'bg-primary text-white rounded-br-md'
            : 'bg-bg border border-border text-text rounded-bl-md'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <div className={`flex items-center justify-end gap-1 mt-1 ${isOwn ? 'text-white/70' : 'text-muted'}`}>
          <span className="text-xs">{formattedTime}</span>
          {isOwn && message.readBy?.length > 1 && (
            <span className="text-xs">✓✓</span>
          )}
        </div>
      </div>
    </div>
  );
}

function DateSeparator({ date }) {
  let label;
  if (isToday(date)) {
    label = 'Today';
  } else if (isYesterday(date)) {
    label = 'Yesterday';
  } else {
    label = format(date, 'MMMM d, yyyy');
  }

  return (
    <div className="flex items-center justify-center my-4">
      <span className="px-3 py-1 bg-bg rounded-full text-xs text-muted">
        {label}
      </span>
    </div>
  );
}

function TypingIndicator({ users }) {
  if (!users || users.length === 0) return null;

  const names = users.map(u => u.user?.profile?.displayName || 'Someone').join(', ');

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-muted text-sm">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{names} {users.length === 1 ? 'is' : 'are'} typing...</span>
    </div>
  );
}

function MessageThread({ messages, isLoading, typingUsers = [] }) {
  const { user: currentUser } = useSelector((state) => state.auth);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typingUsers]);

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`flex items-end gap-2 ${i % 2 === 0 ? 'flex-row-reverse' : ''}`}>
            <Skeleton className="w-8 h-8 rounded-full" />
            <Skeleton className={`h-12 rounded-2xl ${i % 2 === 0 ? 'w-48' : 'w-64'}`} />
          </div>
        ))}
      </div>
    );
  }

  // Group messages by date
  const messagesByDate = (messages || []).reduce((groups, message) => {
    const date = format(new Date(message.createdAt), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  const sortedDates = Object.keys(messagesByDate).sort();

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4">
      {sortedDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <p className="text-muted">No messages yet</p>
          <p className="text-sm text-muted mt-1">Send a message to start the conversation</p>
        </div>
      ) : (
        sortedDates.map((date) => (
          <div key={date}>
            <DateSeparator date={new Date(date)} />
            <div className="space-y-2">
              {messagesByDate[date].map((message, index) => {
                const isOwn = message.senderId?._id === currentUser?._id ||
                              message.senderId === currentUser?._id;
                const prevMessage = messagesByDate[date][index - 1];
                const showAvatar = !prevMessage ||
                  (prevMessage.senderId?._id || prevMessage.senderId) !==
                  (message.senderId?._id || message.senderId);

                return (
                  <MessageBubble
                    key={message._id}
                    message={message}
                    isOwn={isOwn}
                    showAvatar={showAvatar}
                  />
                );
              })}
            </div>
          </div>
        ))
      )}

      <TypingIndicator users={typingUsers} />
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageThread;
