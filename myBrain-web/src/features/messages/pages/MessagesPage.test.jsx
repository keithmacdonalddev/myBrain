import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import MessagesPage from './MessagesPage';

// Mock the hooks
vi.mock('../hooks/useMessages', () => ({
  useConversations: vi.fn(),
  useMessages: vi.fn(),
  useSendMessage: vi.fn(),
  useMarkAsRead: vi.fn(),
  useRealtimeMessages: vi.fn(),
  useCreateConversation: vi.fn(),
}));

vi.mock('../../../hooks/useWebSocket.jsx', () => ({
  useConversationSocket: vi.fn(() => ({ sendTyping: vi.fn() })),
  useSocketEvent: vi.fn(),
  useWebSocket: vi.fn(() => ({ socket: null, isConnected: false })),
}));

// Import mocked hooks
import {
  useConversations,
  useMessages,
  useSendMessage,
  useMarkAsRead,
  useRealtimeMessages,
  useCreateConversation,
} from '../hooks/useMessages';

describe('MessagesPage', () => {
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
      participantMeta: [{ userId: 'user123', unreadCount: 2 }],
    },
    {
      _id: 'conv2',
      type: 'direct',
      participants: [
        { _id: 'user123', email: 'test@example.com', profile: { displayName: 'Test User' } },
        { _id: 'user789', email: 'jane@example.com', profile: { displayName: 'Jane Smith' } },
      ],
      lastMessage: { content: 'Hi!', createdAt: new Date().toISOString() },
      participantMeta: [{ userId: 'user123', unreadCount: 0 }],
    },
  ];

  const mockMessages = [
    { _id: 'msg1', content: 'Hello', senderId: { _id: 'user456' }, createdAt: new Date().toISOString() },
    { _id: 'msg2', content: 'Hi there', senderId: { _id: 'user123' }, createdAt: new Date().toISOString() },
  ];

  const preloadedState = {
    auth: {
      user: mockUser,
      isAuthenticated: true,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    useConversations.mockReturnValue({
      data: { conversations: mockConversations },
      isLoading: false,
    });

    useMessages.mockReturnValue({
      data: { messages: [] },
      isLoading: false,
    });

    useSendMessage.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    useMarkAsRead.mockReturnValue({
      mutate: vi.fn(),
    });

    useRealtimeMessages.mockReturnValue({
      typingUsers: [],
    });

    useCreateConversation.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  describe('Basic Rendering', () => {
    it('renders the messages header', () => {
      render(<MessagesPage />, { preloadedState });
      expect(screen.getByText('Messages')).toBeInTheDocument();
    });

    it('renders the new conversation button', () => {
      render(<MessagesPage />, { preloadedState });
      expect(screen.getByTitle('New conversation')).toBeInTheDocument();
    });

    it('renders empty state when no conversation is selected', () => {
      render(<MessagesPage />, { preloadedState });
      expect(screen.getByText('Your Messages')).toBeInTheDocument();
      expect(screen.getByText(/Select a conversation/)).toBeInTheDocument();
    });

    it('shows "Start a Conversation" button in empty state', () => {
      render(<MessagesPage />, { preloadedState });
      expect(screen.getByRole('button', { name: /Start a Conversation/i })).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows skeleton loading when conversations are loading', () => {
      useConversations.mockReturnValue({
        data: null,
        isLoading: true,
      });

      render(<MessagesPage />, { preloadedState });

      // Should show skeleton elements (Skeleton component uses .skeleton class)
      const skeletons = document.querySelectorAll('.skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Conversation List Display', () => {
    it('displays conversation list from API', () => {
      render(<MessagesPage />, { preloadedState });

      // Should show the other participant's name
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('displays last message preview', () => {
      render(<MessagesPage />, { preloadedState });

      expect(screen.getByText('Hello there!')).toBeInTheDocument();
      expect(screen.getByText('Hi!')).toBeInTheDocument();
    });
  });

  describe('Conversation Selection', () => {
    it('marks conversation as read when selected', async () => {
      const markAsReadMutate = vi.fn();
      useMarkAsRead.mockReturnValue({ mutate: markAsReadMutate });

      // We need to simulate URL with conversation param
      // Using window.history to set search params
      window.history.pushState({}, '', '?conversation=conv1');

      useMessages.mockReturnValue({
        data: { messages: mockMessages },
        isLoading: false,
      });

      render(<MessagesPage />, { preloadedState });

      await waitFor(() => {
        expect(markAsReadMutate).toHaveBeenCalledWith('conv1');
      });

      // Clean up URL
      window.history.pushState({}, '', '/');
    });

    it('displays selected conversation header with participant name', async () => {
      window.history.pushState({}, '', '?conversation=conv1');

      useMessages.mockReturnValue({
        data: { messages: mockMessages },
        isLoading: false,
      });

      render(<MessagesPage />, { preloadedState });

      // Should show the other participant's name in header
      await waitFor(() => {
        expect(screen.getAllByText('John Doe')[0]).toBeInTheDocument();
      });

      window.history.pushState({}, '', '/');
    });
  });

  describe('Message Sending', () => {
    it('calls send message mutation when message is sent', async () => {
      const sendMutate = vi.fn();
      useSendMessage.mockReturnValue({
        mutate: sendMutate,
        isPending: false,
      });

      window.history.pushState({}, '', '?conversation=conv1');

      useMessages.mockReturnValue({
        data: { messages: mockMessages },
        isLoading: false,
      });

      const user = userEvent.setup();
      render(<MessagesPage />, { preloadedState });

      // Find the message input
      const input = await screen.findByPlaceholderText('Type a message...');
      await user.type(input, 'New message{Enter}');

      expect(sendMutate).toHaveBeenCalledWith({
        conversationId: 'conv1',
        content: 'New message',
      });

      window.history.pushState({}, '', '/');
    });
  });

  describe('New Conversation Modal', () => {
    it('opens new conversation modal when button clicked', async () => {
      const user = userEvent.setup();
      render(<MessagesPage />, { preloadedState });

      await user.click(screen.getByTitle('New conversation'));

      expect(screen.getByText('New Conversation')).toBeInTheDocument();
    });

    it('opens new conversation modal from empty state button', async () => {
      const user = userEvent.setup();
      render(<MessagesPage />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /Start a Conversation/i }));

      expect(screen.getByText('New Conversation')).toBeInTheDocument();
    });
  });

  describe('Mobile View', () => {
    it('shows back button in conversation view (mobile)', async () => {
      window.history.pushState({}, '', '?conversation=conv1');

      useMessages.mockReturnValue({
        data: { messages: mockMessages },
        isLoading: false,
      });

      render(<MessagesPage />, { preloadedState });

      // Back button should be present (hidden on desktop via CSS)
      const backButtons = document.querySelectorAll('button');
      const backButton = Array.from(backButtons).find(btn =>
        btn.querySelector('svg') && btn.classList.contains('md:hidden')
      );

      expect(backButton).toBeInTheDocument();

      window.history.pushState({}, '', '/');
    });
  });

  describe('Online Status', () => {
    it('shows online status for online participants', async () => {
      const conversationsWithOnlineUser = [{
        ...mockConversations[0],
        participants: [
          { _id: 'user123', email: 'test@example.com', profile: { displayName: 'Test User' } },
          {
            _id: 'user456',
            email: 'john@example.com',
            profile: { displayName: 'John Doe' },
            presence: { isOnline: true },
          },
        ],
      }];

      useConversations.mockReturnValue({
        data: { conversations: conversationsWithOnlineUser },
        isLoading: false,
      });

      window.history.pushState({}, '', '?conversation=conv1');

      useMessages.mockReturnValue({
        data: { messages: mockMessages },
        isLoading: false,
      });

      render(<MessagesPage />, { preloadedState });

      await waitFor(() => {
        expect(screen.getByText('Online')).toBeInTheDocument();
      });

      window.history.pushState({}, '', '/');
    });
  });

  describe('Group Conversations', () => {
    it('displays group name for group conversations', () => {
      const groupConversation = {
        _id: 'group1',
        type: 'group',
        name: 'My Group Chat',
        participants: [
          { _id: 'user123', email: 'test@example.com' },
          { _id: 'user456', email: 'john@example.com' },
          { _id: 'user789', email: 'jane@example.com' },
        ],
        lastMessage: { content: 'Group message', createdAt: new Date().toISOString() },
        participantMeta: [],
      };

      useConversations.mockReturnValue({
        data: { conversations: [groupConversation] },
        isLoading: false,
      });

      render(<MessagesPage />, { preloadedState });

      expect(screen.getByText('My Group Chat')).toBeInTheDocument();
    });
  });
});
