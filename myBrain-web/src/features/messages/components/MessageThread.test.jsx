import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/utils';
import MessageThread from './MessageThread';

describe('MessageThread', () => {
  const mockUser = {
    _id: 'user123',
    email: 'test@example.com',
    profile: { displayName: 'Test User' },
  };

  // Helper to create dates for testing
  const createDate = (daysAgo = 0, hoursAgo = 0) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(date.getHours() - hoursAgo);
    return date.toISOString();
  };

  const mockMessages = [
    {
      _id: 'msg1',
      content: 'Hello there!',
      senderId: { _id: 'user456', email: 'john@example.com', profile: { displayName: 'John' } },
      createdAt: createDate(0, 1), // 1 hour ago today
    },
    {
      _id: 'msg2',
      content: 'Hi, how are you?',
      senderId: { _id: 'user123', email: 'test@example.com', profile: { displayName: 'Test User' } },
      createdAt: createDate(0, 0), // Now
    },
  ];

  const defaultProps = {
    messages: mockMessages,
    isLoading: false,
    typingUsers: [],
  };

  const preloadedState = {
    auth: {
      user: mockUser,
      isAuthenticated: true,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders messages', () => {
      render(<MessageThread {...defaultProps} />, { preloadedState });

      expect(screen.getByText('Hello there!')).toBeInTheDocument();
      expect(screen.getByText('Hi, how are you?')).toBeInTheDocument();
    });

    it('renders empty state when no messages', () => {
      render(<MessageThread {...defaultProps} messages={[]} />, { preloadedState });

      expect(screen.getByText('No messages yet')).toBeInTheDocument();
      expect(screen.getByText('Send a message to start the conversation')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows skeleton loading when isLoading is true', () => {
      render(<MessageThread {...defaultProps} isLoading={true} />, { preloadedState });

      // Should show skeleton elements (Skeleton component uses .skeleton class)
      const skeletons = document.querySelectorAll('.skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('does not show messages when loading', () => {
      render(
        <MessageThread {...defaultProps} isLoading={true} />,
        { preloadedState }
      );

      expect(screen.queryByText('Hello there!')).not.toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('displays message content', () => {
      render(<MessageThread {...defaultProps} />, { preloadedState });

      expect(screen.getByText('Hello there!')).toBeInTheDocument();
    });

    it('displays message timestamp', () => {
      render(<MessageThread {...defaultProps} />, { preloadedState });

      // Time format is HH:mm
      const timestamps = document.querySelectorAll('.text-xs');
      expect(timestamps.length).toBeGreaterThan(0);
    });

    it('shows read receipts for own messages that have been read', () => {
      const messagesWithRead = [{
        _id: 'msg1',
        content: 'Read message',
        senderId: { _id: 'user123' },
        createdAt: createDate(),
        readBy: ['user123', 'user456'], // Read by 2 users
      }];

      render(
        <MessageThread {...defaultProps} messages={messagesWithRead} />,
        { preloadedState }
      );

      // Should show double check mark
      expect(screen.getByText(/✓✓/)).toBeInTheDocument();
    });
  });

  describe('Message Ownership', () => {
    it('applies different styling for own messages', () => {
      const ownMessage = [{
        _id: 'msg1',
        content: 'My message',
        senderId: { _id: 'user123' },
        createdAt: createDate(),
      }];

      render(
        <MessageThread {...defaultProps} messages={ownMessage} />,
        { preloadedState }
      );

      // The message bubble (inner div with bg-primary) contains the text
      const messageText = screen.getByText('My message');
      const messageBubble = messageText.closest('div.rounded-2xl');
      expect(messageBubble).toHaveClass('bg-primary');
    });

    it('applies different styling for other users messages', () => {
      const otherMessage = [{
        _id: 'msg1',
        content: 'Their message',
        senderId: { _id: 'user456' },
        createdAt: createDate(),
      }];

      render(
        <MessageThread {...defaultProps} messages={otherMessage} />,
        { preloadedState }
      );

      // The message bubble (inner div with bg-bg) contains the text
      const messageText = screen.getByText('Their message');
      const messageBubble = messageText.closest('div.rounded-2xl');
      expect(messageBubble).toHaveClass('bg-bg');
    });

    it('handles senderId as string (not object)', () => {
      const messageWithStringId = [{
        _id: 'msg1',
        content: 'String sender ID',
        senderId: 'user123', // String, not object
        createdAt: createDate(),
      }];

      render(
        <MessageThread {...defaultProps} messages={messageWithStringId} />,
        { preloadedState }
      );

      expect(screen.getByText('String sender ID')).toBeInTheDocument();
    });
  });

  describe('Date Separators', () => {
    it('shows "Today" for today messages', () => {
      const todayMessages = [{
        _id: 'msg1',
        content: 'Today message',
        senderId: { _id: 'user456' },
        createdAt: new Date().toISOString(),
      }];

      render(
        <MessageThread {...defaultProps} messages={todayMessages} />,
        { preloadedState }
      );

      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('shows "Yesterday" for yesterday messages', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const yesterdayMessages = [{
        _id: 'msg1',
        content: 'Yesterday message',
        senderId: { _id: 'user456' },
        createdAt: yesterday.toISOString(),
      }];

      render(
        <MessageThread {...defaultProps} messages={yesterdayMessages} />,
        { preloadedState }
      );

      expect(screen.getByText('Yesterday')).toBeInTheDocument();
    });

    it('shows full date for older messages', () => {
      const oldDate = new Date('2024-06-15');

      const oldMessages = [{
        _id: 'msg1',
        content: 'Old message',
        senderId: { _id: 'user456' },
        createdAt: oldDate.toISOString(),
      }];

      render(
        <MessageThread {...defaultProps} messages={oldMessages} />,
        { preloadedState }
      );

      expect(screen.getByText('June 15, 2024')).toBeInTheDocument();
    });

    it('groups messages by date', () => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const multiDayMessages = [
        { _id: 'msg1', content: 'Yesterday 1', senderId: { _id: 'user456' }, createdAt: yesterday.toISOString() },
        { _id: 'msg2', content: 'Today 1', senderId: { _id: 'user456' }, createdAt: today.toISOString() },
      ];

      render(
        <MessageThread {...defaultProps} messages={multiDayMessages} />,
        { preloadedState }
      );

      expect(screen.getByText('Yesterday')).toBeInTheDocument();
      expect(screen.getByText('Today')).toBeInTheDocument();
    });
  });

  describe('Avatar Display', () => {
    it('shows avatar for first message in sequence', () => {
      const singleMessage = [{
        _id: 'msg1',
        content: 'First message',
        senderId: { _id: 'user456', profile: { displayName: 'John' } },
        createdAt: createDate(),
      }];

      render(
        <MessageThread {...defaultProps} messages={singleMessage} />,
        { preloadedState }
      );

      // UserAvatar should be rendered (check for avatar container)
      const avatars = document.querySelectorAll('[class*="rounded-full"]');
      expect(avatars.length).toBeGreaterThan(0);
    });

    it('hides avatar for consecutive messages from same sender', () => {
      const consecutiveMessages = [
        { _id: 'msg1', content: 'First', senderId: { _id: 'user456' }, createdAt: createDate() },
        { _id: 'msg2', content: 'Second', senderId: { _id: 'user456' }, createdAt: createDate() },
      ];

      render(
        <MessageThread {...defaultProps} messages={consecutiveMessages} />,
        { preloadedState }
      );

      // Should have a spacer div (w-8) for the second message
      const spacers = document.querySelectorAll('.w-8');
      expect(spacers.length).toBeGreaterThan(0);
    });
  });

  describe('Typing Indicator', () => {
    it('shows typing indicator when users are typing', () => {
      const typingUsers = [
        { user: { profile: { displayName: 'John' } } },
      ];

      render(
        <MessageThread {...defaultProps} typingUsers={typingUsers} />,
        { preloadedState }
      );

      expect(screen.getByText(/John is typing/)).toBeInTheDocument();
    });

    it('shows correct grammar for multiple typing users', () => {
      const typingUsers = [
        { user: { profile: { displayName: 'John' } } },
        { user: { profile: { displayName: 'Jane' } } },
      ];

      render(
        <MessageThread {...defaultProps} typingUsers={typingUsers} />,
        { preloadedState }
      );

      expect(screen.getByText(/are typing/)).toBeInTheDocument();
    });

    it('shows "Someone" when displayName is not available', () => {
      const typingUsers = [{ user: {} }];

      render(
        <MessageThread {...defaultProps} typingUsers={typingUsers} />,
        { preloadedState }
      );

      expect(screen.getByText(/Someone is typing/)).toBeInTheDocument();
    });

    it('does not show typing indicator when empty', () => {
      render(
        <MessageThread {...defaultProps} typingUsers={[]} />,
        { preloadedState }
      );

      expect(screen.queryByText(/typing/)).not.toBeInTheDocument();
    });

    it('does not show typing indicator when null', () => {
      render(
        <MessageThread {...defaultProps} typingUsers={null} />,
        { preloadedState }
      );

      expect(screen.queryByText(/typing/)).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined messages array', () => {
      render(
        <MessageThread {...defaultProps} messages={undefined} />,
        { preloadedState }
      );

      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });

    it('handles null messages array', () => {
      render(
        <MessageThread {...defaultProps} messages={null} />,
        { preloadedState }
      );

      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });

    it('handles messages without senderId', () => {
      const messageMissingSender = [{
        _id: 'msg1',
        content: 'No sender',
        createdAt: createDate(),
      }];

      // Should not throw
      expect(() => {
        render(
          <MessageThread {...defaultProps} messages={messageMissingSender} />,
          { preloadedState }
        );
      }).not.toThrow();
    });

    it('preserves whitespace in message content', () => {
      const messageWithWhitespace = [{
        _id: 'msg1',
        content: 'Line 1\nLine 2',
        senderId: { _id: 'user456' },
        createdAt: createDate(),
      }];

      render(
        <MessageThread {...defaultProps} messages={messageWithWhitespace} />,
        { preloadedState }
      );

      const messageBubble = screen.getByText(/Line 1/);
      expect(messageBubble).toHaveClass('whitespace-pre-wrap');
    });

    it('handles very long messages with word break', () => {
      const longMessage = [{
        _id: 'msg1',
        content: 'A'.repeat(500),
        senderId: { _id: 'user456' },
        createdAt: createDate(),
      }];

      render(
        <MessageThread {...defaultProps} messages={longMessage} />,
        { preloadedState }
      );

      const messageBubble = screen.getByText(/A{100,}/);
      expect(messageBubble).toHaveClass('break-words');
    });
  });

  describe('Message Ordering', () => {
    it('sorts messages by date', () => {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const unorderedMessages = [
        { _id: 'msg2', content: 'Today message', senderId: { _id: 'user456' }, createdAt: today.toISOString() },
        { _id: 'msg1', content: 'Yesterday message', senderId: { _id: 'user456' }, createdAt: yesterday.toISOString() },
      ];

      render(
        <MessageThread {...defaultProps} messages={unorderedMessages} />,
        { preloadedState }
      );

      // Yesterday should appear before Today in the DOM (sorted by date)
      const allText = document.body.textContent;
      const yesterdayIndex = allText.indexOf('Yesterday');
      const todayIndex = allText.indexOf('Today');

      expect(yesterdayIndex).toBeLessThan(todayIndex);
    });
  });

  describe('Scroll Behavior', () => {
    it('has scroll container', () => {
      render(<MessageThread {...defaultProps} />, { preloadedState });

      const scrollContainer = document.querySelector('.overflow-y-auto');
      expect(scrollContainer).toBeInTheDocument();
    });
  });
});
