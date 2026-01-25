import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import ConversationList from './ConversationList';

describe('ConversationList', () => {
  const mockUser = {
    _id: 'user123',
    email: 'test@example.com',
    profile: { displayName: 'Test User' },
  };

  const mockConversations = [
    {
      _id: 'conv1',
      type: 'direct',
      participants: [
        { _id: 'user123', email: 'test@example.com', profile: { displayName: 'Test User' } },
        { _id: 'user456', email: 'john@example.com', profile: { displayName: 'John Doe' } },
      ],
      lastMessage: { content: 'Hello there!', createdAt: new Date().toISOString() },
    },
    {
      _id: 'conv2',
      type: 'direct',
      participants: [
        { _id: 'user123', email: 'test@example.com', profile: { displayName: 'Test User' } },
        { _id: 'user789', email: 'jane@example.com', profile: { displayName: 'Jane Smith' } },
      ],
      lastMessage: { content: 'Hi!', createdAt: new Date().toISOString() },
    },
    {
      _id: 'conv3',
      type: 'group',
      name: 'Team Chat',
      participants: [
        { _id: 'user123', email: 'test@example.com' },
        { _id: 'user456', email: 'john@example.com' },
        { _id: 'user789', email: 'jane@example.com' },
      ],
      lastMessage: { content: 'Group message', createdAt: new Date().toISOString() },
    },
  ];

  const defaultProps = {
    conversations: mockConversations,
    selectedId: null,
    onSelect: vi.fn(),
    unreadCounts: {},
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
    it('renders the search input', () => {
      render(<ConversationList {...defaultProps} />, { preloadedState });
      expect(screen.getByPlaceholderText('Search conversations...')).toBeInTheDocument();
    });

    it('renders all conversations', () => {
      render(<ConversationList {...defaultProps} />, { preloadedState });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Team Chat')).toBeInTheDocument();
    });

    it('shows last message content', () => {
      render(<ConversationList {...defaultProps} />, { preloadedState });

      expect(screen.getByText('Hello there!')).toBeInTheDocument();
      expect(screen.getByText('Hi!')).toBeInTheDocument();
      expect(screen.getByText('Group message')).toBeInTheDocument();
    });

    it('shows "No messages yet" for conversations without last message', () => {
      const conversationsNoMessage = [{
        _id: 'conv1',
        type: 'direct',
        participants: [
          { _id: 'user123', email: 'test@example.com' },
          { _id: 'user456', email: 'john@example.com', profile: { displayName: 'John Doe' } },
        ],
        lastMessage: null,
      }];

      render(
        <ConversationList {...defaultProps} conversations={conversationsNoMessage} />,
        { preloadedState }
      );

      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no conversations exist', () => {
      render(<ConversationList {...defaultProps} conversations={[]} />, { preloadedState });

      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    });

    it('shows "No conversations found" when search has no results', async () => {
      const user = userEvent.setup();
      render(<ConversationList {...defaultProps} />, { preloadedState });

      const searchInput = screen.getByPlaceholderText('Search conversations...');
      await user.type(searchInput, 'nonexistent user');

      expect(screen.getByText('No conversations found')).toBeInTheDocument();
    });
  });

  describe('Conversation Selection', () => {
    it('calls onSelect when a conversation is clicked', async () => {
      const onSelect = vi.fn();
      const user = userEvent.setup();

      render(<ConversationList {...defaultProps} onSelect={onSelect} />, { preloadedState });

      await user.click(screen.getByText('John Doe'));

      expect(onSelect).toHaveBeenCalledWith(mockConversations[0]);
    });

    it('highlights selected conversation', () => {
      render(
        <ConversationList {...defaultProps} selectedId="conv1" />,
        { preloadedState }
      );

      const conversationButton = screen.getByText('John Doe').closest('button');
      expect(conversationButton).toHaveClass('bg-primary/10');
    });

    it('does not highlight non-selected conversations', () => {
      render(
        <ConversationList {...defaultProps} selectedId="conv1" />,
        { preloadedState }
      );

      const janeButton = screen.getByText('Jane Smith').closest('button');
      expect(janeButton).not.toHaveClass('bg-primary/10');
    });
  });

  describe('Search Functionality', () => {
    it('filters conversations by participant name', async () => {
      const user = userEvent.setup();
      render(<ConversationList {...defaultProps} />, { preloadedState });

      const searchInput = screen.getByPlaceholderText('Search conversations...');
      await user.type(searchInput, 'John');

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('filters conversations case-insensitively', async () => {
      const user = userEvent.setup();
      render(<ConversationList {...defaultProps} />, { preloadedState });

      const searchInput = screen.getByPlaceholderText('Search conversations...');
      await user.type(searchInput, 'JOHN');

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('shows all conversations when search is cleared', async () => {
      const user = userEvent.setup();
      render(<ConversationList {...defaultProps} />, { preloadedState });

      const searchInput = screen.getByPlaceholderText('Search conversations...');
      await user.type(searchInput, 'John');
      await user.clear(searchInput);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('filters by email when displayName is not present', async () => {
      const conversationsWithEmail = [{
        _id: 'conv1',
        type: 'direct',
        participants: [
          { _id: 'user123', email: 'test@example.com' },
          { _id: 'user456', email: 'specific@email.com' },
        ],
        lastMessage: { content: 'Test', createdAt: new Date().toISOString() },
      }];

      const user = userEvent.setup();
      render(
        <ConversationList {...defaultProps} conversations={conversationsWithEmail} />,
        { preloadedState }
      );

      const searchInput = screen.getByPlaceholderText('Search conversations...');
      await user.type(searchInput, 'specific');

      expect(screen.getByText('specific@email.com')).toBeInTheDocument();
    });
  });

  describe('Unread Counts', () => {
    it('displays unread count badge', () => {
      const unreadCounts = { conv1: 5, conv2: 0 };

      render(
        <ConversationList {...defaultProps} unreadCounts={unreadCounts} />,
        { preloadedState }
      );

      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('shows 99+ for counts over 99', () => {
      const unreadCounts = { conv1: 150 };

      render(
        <ConversationList {...defaultProps} unreadCounts={unreadCounts} />,
        { preloadedState }
      );

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('does not show badge for zero unread', () => {
      const unreadCounts = { conv1: 0 };

      render(
        <ConversationList {...defaultProps} unreadCounts={unreadCounts} />,
        { preloadedState }
      );

      // The badge element should not exist for zero count
      const johnButton = screen.getByText('John Doe').closest('button');
      const badge = johnButton.querySelector('.bg-primary.text-white.text-xs.rounded-full');
      expect(badge).not.toBeInTheDocument();
    });

    it('applies bold styling to unread conversations', () => {
      const unreadCounts = { conv1: 3 };

      render(
        <ConversationList {...defaultProps} unreadCounts={unreadCounts} />,
        { preloadedState }
      );

      const conversationName = screen.getByText('John Doe');
      expect(conversationName).toHaveClass('text-text');
    });
  });

  describe('Group Conversations', () => {
    it('displays group name for group conversations', () => {
      render(<ConversationList {...defaultProps} />, { preloadedState });

      expect(screen.getByText('Team Chat')).toBeInTheDocument();
    });

    it('prefers group name over participant names', () => {
      const groupConversation = [{
        _id: 'group1',
        type: 'group',
        name: 'Custom Group Name',
        participants: [
          { _id: 'user123', email: 'test@example.com' },
          { _id: 'user456', email: 'john@example.com', profile: { displayName: 'John Doe' } },
        ],
        lastMessage: { content: 'Hi', createdAt: new Date().toISOString() },
      }];

      render(
        <ConversationList {...defaultProps} conversations={groupConversation} />,
        { preloadedState }
      );

      expect(screen.getByText('Custom Group Name')).toBeInTheDocument();
    });
  });

  describe('Timestamp Display', () => {
    it('shows relative timestamp for last message', () => {
      const recentConversation = [{
        _id: 'conv1',
        type: 'direct',
        participants: [
          { _id: 'user123', email: 'test@example.com' },
          { _id: 'user456', email: 'john@example.com', profile: { displayName: 'John Doe' } },
        ],
        lastMessage: {
          content: 'Recent message',
          createdAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
        },
      }];

      render(
        <ConversationList {...defaultProps} conversations={recentConversation} />,
        { preloadedState }
      );

      // formatDistanceToNow returns something like "1 minute"
      expect(screen.getByText(/minute/i)).toBeInTheDocument();
    });
  });

  describe('Fallback Display', () => {
    it('shows email when displayName is not available', () => {
      const conversationWithEmail = [{
        _id: 'conv1',
        type: 'direct',
        participants: [
          { _id: 'user123', email: 'test@example.com' },
          { _id: 'user456', email: 'noname@example.com' },
        ],
        lastMessage: { content: 'Hi', createdAt: new Date().toISOString() },
      }];

      render(
        <ConversationList {...defaultProps} conversations={conversationWithEmail} />,
        { preloadedState }
      );

      expect(screen.getByText('noname@example.com')).toBeInTheDocument();
    });

    it('shows "Unknown" when neither displayName nor email is available', () => {
      const conversationUnknown = [{
        _id: 'conv1',
        type: 'direct',
        participants: [
          { _id: 'user123', email: 'test@example.com' },
          { _id: 'user456' }, // No email or displayName
        ],
        lastMessage: { content: 'Hi', createdAt: new Date().toISOString() },
      }];

      render(
        <ConversationList {...defaultProps} conversations={conversationUnknown} />,
        { preloadedState }
      );

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined conversations array', () => {
      render(
        <ConversationList {...defaultProps} conversations={undefined} />,
        { preloadedState }
      );

      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    });

    it('handles null conversations array', () => {
      render(
        <ConversationList {...defaultProps} conversations={null} />,
        { preloadedState }
      );

      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    });

    it('handles conversations without participants', () => {
      const brokenConversation = [{
        _id: 'conv1',
        type: 'direct',
        participants: [],
        lastMessage: { content: 'Hi', createdAt: new Date().toISOString() },
      }];

      // Should not throw
      expect(() => {
        render(
          <ConversationList {...defaultProps} conversations={brokenConversation} />,
          { preloadedState }
        );
      }).not.toThrow();
    });

    it('handles missing unreadCounts prop', () => {
      render(
        <ConversationList
          conversations={mockConversations}
          selectedId={null}
          onSelect={vi.fn()}
        />,
        { preloadedState }
      );

      // Should render without errors
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
