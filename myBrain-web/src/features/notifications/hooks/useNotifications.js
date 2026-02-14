import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { notificationsApi } from '../../../lib/api';
import { useSocketEvent } from '../../../hooks/useWebSocket.jsx';

// Get notifications
export function useNotifications(options = {}) {
  const { limit = 50, unreadOnly = false, type = null } = options;

  return useQuery({
    queryKey: ['notifications', { limit, unreadOnly, type }],
    queryFn: () => notificationsApi.getNotifications({ limit, unreadOnly, type }),
    refetchInterval: 60000, // Refetch every minute as fallback
  });
}

// Get unread count
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30000,
  });
}

// Mark single notification as read
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId) => notificationsApi.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Mark all as read
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Delete notification
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId) => notificationsApi.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Delete all read notifications
export function useDeleteReadNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.deleteReadNotifications(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

// Hook for real-time notification updates
export function useRealtimeNotifications() {
  const queryClient = useQueryClient();

  const handleNewNotification = useCallback((notification) => {
    console.log('[WebSocket] Received notification:new', notification);
    // Invalidate all notification queries to trigger refetch
    // This ensures the list updates regardless of query parameters
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  useSocketEvent('notification:new', handleNewNotification);
}
