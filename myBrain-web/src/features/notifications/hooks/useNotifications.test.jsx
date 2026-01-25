import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  useDeleteReadNotifications,
} from './useNotifications';

// Mock the API module
vi.mock('../../../lib/api', () => ({
  notificationsApi: {
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    deleteReadNotifications: vi.fn(),
  },
}));

// Mock the WebSocket hooks - not testing real-time features here
vi.mock('../../../hooks/useWebSocket.jsx', () => ({
  useSocketEvent: vi.fn(),
}));

// Import the mocked API
import { notificationsApi } from '../../../lib/api';

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

describe('useNotifications hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Test useNotifications hook
  describe('useNotifications', () => {
    it('fetches notifications successfully', async () => {
      const mockNotifications = {
        notifications: [
          { _id: 'notif1', type: 'connection_request', read: false },
          { _id: 'notif2', type: 'message', read: true },
        ],
        total: 2,
      };
      notificationsApi.getNotifications.mockResolvedValueOnce(mockNotifications);

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data to load
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockNotifications);
      expect(notificationsApi.getNotifications).toHaveBeenCalledWith({
        limit: 50,
        unreadOnly: false,
        type: null,
      });
    });

    it('handles error when fetching notifications fails', async () => {
      const error = new Error('Failed to fetch notifications');
      notificationsApi.getNotifications.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error.message).toBe('Failed to fetch notifications');
    });

    it('returns empty array when no notifications exist', async () => {
      notificationsApi.getNotifications.mockResolvedValueOnce({
        notifications: [],
        total: 0,
      });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data.notifications).toEqual([]);
    });

    it('respects custom limit option', async () => {
      notificationsApi.getNotifications.mockResolvedValueOnce({
        notifications: [],
      });

      renderHook(() => useNotifications({ limit: 20 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(notificationsApi.getNotifications).toHaveBeenCalledWith({
          limit: 20,
          unreadOnly: false,
          type: null,
        })
      );
    });

    it('fetches only unread notifications when specified', async () => {
      notificationsApi.getNotifications.mockResolvedValueOnce({
        notifications: [{ _id: 'notif1', read: false }],
      });

      renderHook(() => useNotifications({ unreadOnly: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(notificationsApi.getNotifications).toHaveBeenCalledWith({
          limit: 50,
          unreadOnly: true,
          type: null,
        })
      );
    });

    it('filters notifications by type', async () => {
      notificationsApi.getNotifications.mockResolvedValueOnce({
        notifications: [],
      });

      renderHook(() => useNotifications({ type: 'message' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(notificationsApi.getNotifications).toHaveBeenCalledWith({
          limit: 50,
          unreadOnly: false,
          type: 'message',
        })
      );
    });
  });

  // Test useUnreadNotificationCount hook
  describe('useUnreadNotificationCount', () => {
    it('fetches unread count successfully', async () => {
      const mockCount = { unreadCount: 7 };
      notificationsApi.getUnreadCount.mockResolvedValueOnce(mockCount);

      const { result } = renderHook(() => useUnreadNotificationCount(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockCount);
      expect(notificationsApi.getUnreadCount).toHaveBeenCalled();
    });

    it('returns zero when no unread notifications', async () => {
      notificationsApi.getUnreadCount.mockResolvedValueOnce({ unreadCount: 0 });

      const { result } = renderHook(() => useUnreadNotificationCount(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data.unreadCount).toBe(0);
    });

    it('handles error when fetching unread count fails', async () => {
      notificationsApi.getUnreadCount.mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useUnreadNotificationCount(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useMarkNotificationAsRead mutation
  describe('useMarkNotificationAsRead', () => {
    it('marks a notification as read successfully', async () => {
      notificationsApi.markAsRead.mockResolvedValueOnce({
        notification: { _id: 'notif1', read: true },
      });

      const { result } = renderHook(() => useMarkNotificationAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('notif1');
      });

      expect(notificationsApi.markAsRead).toHaveBeenCalledWith('notif1');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when marking notification as read fails', async () => {
      notificationsApi.markAsRead.mockRejectedValueOnce(
        new Error('Mark read failed')
      );

      const { result } = renderHook(() => useMarkNotificationAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync('notif1');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useMarkAllNotificationsAsRead mutation
  describe('useMarkAllNotificationsAsRead', () => {
    it('marks all notifications as read successfully', async () => {
      notificationsApi.markAllAsRead.mockResolvedValueOnce({
        success: true,
        count: 5,
      });

      const { result } = renderHook(() => useMarkAllNotificationsAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(notificationsApi.markAllAsRead).toHaveBeenCalled();
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when marking all as read fails', async () => {
      notificationsApi.markAllAsRead.mockRejectedValueOnce(
        new Error('Mark all read failed')
      );

      const { result } = renderHook(() => useMarkAllNotificationsAsRead(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync();
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useDeleteNotification mutation
  describe('useDeleteNotification', () => {
    it('deletes a notification successfully', async () => {
      notificationsApi.deleteNotification.mockResolvedValueOnce({
        success: true,
      });

      const { result } = renderHook(() => useDeleteNotification(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('notif1');
      });

      expect(notificationsApi.deleteNotification).toHaveBeenCalledWith('notif1');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when deleting notification fails', async () => {
      notificationsApi.deleteNotification.mockRejectedValueOnce(
        new Error('Delete failed')
      );

      const { result } = renderHook(() => useDeleteNotification(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync('notif1');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useDeleteReadNotifications mutation
  describe('useDeleteReadNotifications', () => {
    it('deletes all read notifications successfully', async () => {
      notificationsApi.deleteReadNotifications.mockResolvedValueOnce({
        success: true,
        count: 10,
      });

      const { result } = renderHook(() => useDeleteReadNotifications(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(notificationsApi.deleteReadNotifications).toHaveBeenCalled();
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when deleting read notifications fails', async () => {
      notificationsApi.deleteReadNotifications.mockRejectedValueOnce(
        new Error('Delete read failed')
      );

      const { result } = renderHook(() => useDeleteReadNotifications(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync();
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
