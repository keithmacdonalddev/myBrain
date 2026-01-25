import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useConversations,
  useMessages,
  useUnreadCount,
  useSendMessage,
  useCreateConversation,
  useMarkAsRead,
  useGetOrCreateConversation,
} from './useMessages';

// Mock the API module
vi.mock('../../../lib/api', () => ({
  messagesApi: {
    getConversations: vi.fn(),
    getMessages: vi.fn(),
    getUnreadCount: vi.fn(),
    sendMessage: vi.fn(),
    createConversation: vi.fn(),
    markAsRead: vi.fn(),
  },
}));

// Mock the WebSocket hooks - not testing real-time features here
vi.mock('../../../hooks/useWebSocket.jsx', () => ({
  useSocketEvent: vi.fn(),
  useWebSocket: vi.fn(() => ({ socket: null, isConnected: false })),
}));

// Import the mocked API
import { messagesApi } from '../../../lib/api';

// Create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useMessages hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Test useConversations hook
  describe('useConversations', () => {
    it('fetches conversations successfully', async () => {
      const mockConversations = {
        conversations: [
          { _id: 'conv1', type: 'direct', lastMessage: 'Hello' },
          { _id: 'conv2', type: 'group', lastMessage: 'Hi there' },
        ],
      };
      messagesApi.getConversations.mockResolvedValueOnce(mockConversations);

      const { result } = renderHook(() => useConversations(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data to load
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockConversations);
      expect(messagesApi.getConversations).toHaveBeenCalled();
    });

    it('handles error when fetching conversations fails', async () => {
      const error = new Error('Failed to fetch conversations');
      messagesApi.getConversations.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useConversations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error.message).toBe('Failed to fetch conversations');
    });

    it('returns empty array when no conversations exist', async () => {
      messagesApi.getConversations.mockResolvedValueOnce({ conversations: [] });

      const { result } = renderHook(() => useConversations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data.conversations).toEqual([]);
    });
  });

  // Test useMessages hook
  describe('useMessages', () => {
    it('fetches messages for a conversation successfully', async () => {
      const mockMessages = {
        messages: [
          { _id: 'msg1', content: 'Hello', senderId: 'user1' },
          { _id: 'msg2', content: 'Hi', senderId: 'user2' },
        ],
      };
      messagesApi.getMessages.mockResolvedValueOnce(mockMessages);

      const { result } = renderHook(() => useMessages('conv123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockMessages);
      expect(messagesApi.getMessages).toHaveBeenCalledWith('conv123', { limit: 50 });
    });

    it('does not fetch when conversationId is not provided', async () => {
      const { result } = renderHook(() => useMessages(null), {
        wrapper: createWrapper(),
      });

      // Should not be loading because query is disabled
      expect(result.current.fetchStatus).toBe('idle');
      expect(messagesApi.getMessages).not.toHaveBeenCalled();
    });

    it('respects custom limit option', async () => {
      messagesApi.getMessages.mockResolvedValueOnce({ messages: [] });

      renderHook(() => useMessages('conv123', { limit: 100 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(messagesApi.getMessages).toHaveBeenCalledWith('conv123', { limit: 100 })
      );
    });

    it('handles error when fetching messages fails', async () => {
      messagesApi.getMessages.mockRejectedValueOnce(new Error('Fetch failed'));

      const { result } = renderHook(() => useMessages('conv123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUnreadCount hook
  describe('useUnreadCount', () => {
    it('fetches unread count successfully', async () => {
      const mockCount = { unreadCount: 5 };
      messagesApi.getUnreadCount.mockResolvedValueOnce(mockCount);

      const { result } = renderHook(() => useUnreadCount(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockCount);
      expect(messagesApi.getUnreadCount).toHaveBeenCalled();
    });

    it('returns zero when no unread messages', async () => {
      messagesApi.getUnreadCount.mockResolvedValueOnce({ unreadCount: 0 });

      const { result } = renderHook(() => useUnreadCount(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data.unreadCount).toBe(0);
    });

    it('handles error when fetching unread count fails', async () => {
      messagesApi.getUnreadCount.mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useUnreadCount(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useSendMessage mutation
  describe('useSendMessage', () => {
    it('sends a message successfully', async () => {
      const newMessage = {
        _id: 'msg-new',
        content: 'Hello world',
        senderId: 'user1',
      };
      messagesApi.sendMessage.mockResolvedValueOnce(newMessage);

      const { result } = renderHook(() => useSendMessage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          conversationId: 'conv123',
          content: 'Hello world',
        });
      });

      expect(messagesApi.sendMessage).toHaveBeenCalledWith('conv123', {
        content: 'Hello world',
        contentType: 'text',
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('sends a message with custom content type', async () => {
      messagesApi.sendMessage.mockResolvedValueOnce({ _id: 'msg1' });

      const { result } = renderHook(() => useSendMessage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          conversationId: 'conv123',
          content: 'image-url.jpg',
          contentType: 'image',
        });
      });

      expect(messagesApi.sendMessage).toHaveBeenCalledWith('conv123', {
        content: 'image-url.jpg',
        contentType: 'image',
      });
    });

    it('handles error when sending message fails', async () => {
      messagesApi.sendMessage.mockRejectedValueOnce(new Error('Send failed'));

      const { result } = renderHook(() => useSendMessage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            conversationId: 'conv123',
            content: 'Hello',
          });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useCreateConversation mutation
  describe('useCreateConversation', () => {
    it('creates a conversation successfully', async () => {
      const newConversation = {
        _id: 'conv-new',
        type: 'direct',
        participants: ['user1', 'user2'],
      };
      messagesApi.createConversation.mockResolvedValueOnce(newConversation);

      const { result } = renderHook(() => useCreateConversation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(['user2']);
      });

      expect(messagesApi.createConversation).toHaveBeenCalledWith(['user2']);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('creates a group conversation with multiple participants', async () => {
      messagesApi.createConversation.mockResolvedValueOnce({
        _id: 'conv-group',
        type: 'group',
      });

      const { result } = renderHook(() => useCreateConversation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(['user2', 'user3', 'user4']);
      });

      expect(messagesApi.createConversation).toHaveBeenCalledWith([
        'user2',
        'user3',
        'user4',
      ]);
    });

    it('handles error when creating conversation fails', async () => {
      messagesApi.createConversation.mockRejectedValueOnce(
        new Error('Create failed')
      );

      const { result } = renderHook(() => useCreateConversation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync(['user2']);
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useMarkAsRead mutation
  describe('useMarkAsRead', () => {
    it('marks conversation as read successfully', async () => {
      messagesApi.markAsRead.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useMarkAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('conv123');
      });

      expect(messagesApi.markAsRead).toHaveBeenCalledWith('conv123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when marking as read fails', async () => {
      messagesApi.markAsRead.mockRejectedValueOnce(new Error('Mark read failed'));

      const { result } = renderHook(() => useMarkAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync('conv123');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useGetOrCreateConversation mutation
  describe('useGetOrCreateConversation', () => {
    it('returns existing conversation when found', async () => {
      const existingConversation = {
        _id: 'conv-existing',
        type: 'direct',
        participants: [{ _id: 'user1' }, { _id: 'user2' }],
      };
      messagesApi.getConversations.mockResolvedValueOnce({
        conversations: [existingConversation],
      });

      const { result } = renderHook(() => useGetOrCreateConversation(), {
        wrapper: createWrapper(),
      });

      let returnedData;
      await act(async () => {
        returnedData = await result.current.mutateAsync('user2');
      });

      expect(messagesApi.getConversations).toHaveBeenCalled();
      expect(messagesApi.createConversation).not.toHaveBeenCalled();
      expect(returnedData).toEqual(existingConversation);
    });

    it('creates new conversation when not found', async () => {
      const newConversation = {
        _id: 'conv-new',
        type: 'direct',
        participants: [{ _id: 'user1' }, { _id: 'user3' }],
      };
      messagesApi.getConversations.mockResolvedValueOnce({
        conversations: [],
      });
      messagesApi.createConversation.mockResolvedValueOnce(newConversation);

      const { result } = renderHook(() => useGetOrCreateConversation(), {
        wrapper: createWrapper(),
      });

      let returnedData;
      await act(async () => {
        returnedData = await result.current.mutateAsync('user3');
      });

      expect(messagesApi.getConversations).toHaveBeenCalled();
      expect(messagesApi.createConversation).toHaveBeenCalledWith(['user3']);
      expect(returnedData).toEqual(newConversation);
    });

    it('handles error when getting conversations fails', async () => {
      messagesApi.getConversations.mockRejectedValueOnce(new Error('Fetch failed'));

      const { result } = renderHook(() => useGetOrCreateConversation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync('user2');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
