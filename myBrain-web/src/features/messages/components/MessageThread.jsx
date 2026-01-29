import { useEffect, useRef, useState } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { useSelector } from 'react-redux';
import { Smile, File, Download, ExternalLink } from 'lucide-react';
import UserAvatar from '../../../components/ui/UserAvatar';
import Skeleton from '../../../components/ui/Skeleton';
import { useToggleReaction } from '../hooks/useMessages';

// Common emoji reactions
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

// Format file size
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

function AttachmentDisplay({ attachments, isOwn }) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      {attachments.map((attachment, index) => {
        // Image attachments - show preview
        if (attachment.type === 'image') {
          return (
            <a
              key={index}
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block max-w-[200px] rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
            >
              <img
                src={attachment.thumbnailUrl || attachment.url}
                alt={attachment.name}
                className="w-full h-auto"
              />
            </a>
          );
        }

        // Other file types - show download link
        return (
          <a
            key={index}
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              isOwn
                ? 'bg-white/10 hover:bg-white/20'
                : 'bg-bg border border-border hover:bg-panel'
            }`}
          >
            <File className={`w-4 h-4 ${isOwn ? 'text-white/70' : 'text-muted'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs truncate ${isOwn ? 'text-white' : 'text-text'}`}>
                {attachment.name}
              </p>
              <p className={`text-[10px] ${isOwn ? 'text-white/60' : 'text-muted'}`}>
                {formatFileSize(attachment.size)}
              </p>
            </div>
            <Download className={`w-4 h-4 ${isOwn ? 'text-white/70' : 'text-muted'}`} />
          </a>
        );
      })}
    </div>
  );
}

function ReactionPicker({ onSelect, onClose }) {
  return (
    <div className="absolute bottom-full mb-1 left-0 bg-panel border border-border rounded-lg shadow-lg p-1 flex gap-0.5 z-10">
      {QUICK_REACTIONS.map(emoji => (
        <button
          key={emoji}
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="w-8 h-8 flex items-center justify-center hover:bg-bg rounded transition-colors text-base"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

function ReactionDisplay({ reactions, currentUserId, onToggle }) {
  if (!reactions || reactions.length === 0) return null;

  // Group reactions by emoji
  const grouped = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) {
      acc[r.emoji] = { emoji: r.emoji, count: 0, userIds: [], hasOwn: false };
    }
    acc[r.emoji].count++;
    acc[r.emoji].userIds.push(r.userId);
    if (r.userId === currentUserId || r.userId?._id === currentUserId) {
      acc[r.emoji].hasOwn = true;
    }
    return acc;
  }, {});

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.values(grouped).map(({ emoji, count, hasOwn }) => (
        <button
          key={emoji}
          onClick={() => onToggle(emoji)}
          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-colors ${
            hasOwn
              ? 'bg-primary/20 border border-primary/30 text-primary'
              : 'bg-bg border border-border text-muted hover:bg-panel'
          }`}
        >
          <span>{emoji}</span>
          <span>{count}</span>
        </button>
      ))}
    </div>
  );
}

function MessageBubble({ message, isOwn, showAvatar, conversationId }) {
  const { user: currentUser } = useSelector((state) => state.auth);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const toggleReaction = useToggleReaction();
  const formattedTime = format(new Date(message.createdAt), 'HH:mm');

  const handleReaction = (emoji) => {
    toggleReaction.mutate({
      messageId: message._id,
      emoji,
      conversationId
    });
  };

  return (
    <div className={`group flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {showAvatar ? (
        <UserAvatar user={message.senderId} size="sm" showPresence={false} />
      ) : (
        <div className="w-8" /> // Spacer when avatar is hidden
      )}

      <div className="relative max-w-[70%]">
        {/* Reaction picker button - shows on hover */}
        <div className={`absolute top-0 ${isOwn ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'} opacity-0 group-hover:opacity-100 transition-opacity`}>
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="p-1 text-muted hover:text-text hover:bg-bg rounded transition-colors"
          >
            <Smile className="w-4 h-4" />
          </button>
        </div>

        {/* Reaction picker popup */}
        {showReactionPicker && (
          <ReactionPicker
            onSelect={handleReaction}
            onClose={() => setShowReactionPicker(false)}
          />
        )}

        {/* Message bubble */}
        <div
          className={`rounded-2xl px-4 py-2 ${
            isOwn
              ? 'bg-primary text-white rounded-br-md'
              : 'bg-bg border border-border text-text rounded-bl-md'
          }`}
        >
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}
          {/* Attachments */}
          <AttachmentDisplay attachments={message.attachments} isOwn={isOwn} />
          <div className={`flex items-center justify-end gap-1 mt-1 ${isOwn ? 'text-white/70' : 'text-muted'}`}>
            <span className="text-xs">{formattedTime}</span>
            {isOwn && message.readBy?.length > 1 && (
              <span className="text-xs">✓✓</span>
            )}
          </div>
        </div>

        {/* Reaction display */}
        <ReactionDisplay
          reactions={message.reactions}
          currentUserId={currentUser?._id}
          onToggle={handleReaction}
        />
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

function MessageThread({ messages, isLoading, typingUsers = [], conversationId }) {
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
                    conversationId={conversationId}
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
