/**
 * =============================================================================
 * USEPRESENCE.JS - Online Status Tracking
 * =============================================================================
 *
 * Hook for tracking user online presence via WebSocket.
 * Listens for presence:update events and maintains a local cache of online users.
 *
 * =============================================================================
 */

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket, useSocketEvent } from './useWebSocket';

/**
 * usePresence() - Track online status of users
 *
 * This hook:
 * 1. Listens for presence:update WebSocket events
 * 2. Maintains a local Map of online users
 * 3. Updates React Query cache when presence changes
 *
 * @returns {Object} - { onlineUsers, isUserOnline }
 */
export function usePresence() {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useWebSocket();

  // Local cache of online users: Map<userId, presenceData>
  const [onlineUsers, setOnlineUsers] = useState(new Map());

  // Handle presence update from WebSocket
  const handlePresenceUpdate = useCallback((data) => {
    const { userId, isOnline, status, statusMessage, lastSeenAt } = data;

    setOnlineUsers(prev => {
      const next = new Map(prev);
      if (isOnline) {
        next.set(userId, {
          isOnline: true,
          currentStatus: status || 'available',
          statusMessage,
        });
      } else {
        // User went offline - keep lastSeenAt but mark offline
        next.set(userId, {
          isOnline: false,
          currentStatus: 'offline',
          lastSeenAt,
        });
      }
      return next;
    });

    // Update any cached user data in React Query
    // This ensures components showing user profiles see the updated status
    queryClient.setQueriesData({ queryKey: ['connections'] }, (oldData) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        connections: oldData.connections?.map(conn => {
          if (conn.user?._id === userId) {
            return {
              ...conn,
              user: {
                ...conn.user,
                presence: {
                  ...conn.user.presence,
                  isOnline,
                  currentStatus: status || (isOnline ? 'available' : 'offline'),
                  lastSeenAt: isOnline ? null : lastSeenAt,
                }
              }
            };
          }
          return conn;
        })
      };
    });

    // Update conversations cache too
    queryClient.setQueriesData({ queryKey: ['conversations'] }, (oldData) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        conversations: oldData.conversations?.map(conv => ({
          ...conv,
          participants: conv.participants?.map(p => {
            if (p._id === userId) {
              return {
                ...p,
                presence: {
                  ...p.presence,
                  isOnline,
                  currentStatus: status || (isOnline ? 'available' : 'offline'),
                  lastSeenAt: isOnline ? null : lastSeenAt,
                }
              };
            }
            return p;
          })
        }))
      };
    });
  }, [queryClient]);

  // Subscribe to presence updates
  useSocketEvent('presence:update', handlePresenceUpdate);

  // Check if a specific user is online
  const isUserOnline = useCallback((userId) => {
    if (!userId) return false;
    const presence = onlineUsers.get(userId);
    return presence?.isOnline ?? false;
  }, [onlineUsers]);

  // Get presence data for a specific user
  const getPresence = useCallback((userId) => {
    if (!userId) return { isOnline: false, currentStatus: 'offline' };
    return onlineUsers.get(userId) || { isOnline: false, currentStatus: 'offline' };
  }, [onlineUsers]);

  return {
    onlineUsers,
    isUserOnline,
    getPresence,
    isConnected,
  };
}

/**
 * useUserPresence(userId) - Track a specific user's online status
 *
 * Convenience hook for tracking a single user's presence.
 *
 * @param {string} userId - ID of user to track
 * @returns {Object} - { isOnline, status, statusMessage }
 */
export function useUserPresence(userId) {
  const { getPresence } = usePresence();
  const presence = getPresence(userId);

  return {
    isOnline: presence.isOnline,
    status: presence.currentStatus,
    statusMessage: presence.statusMessage,
    lastSeenAt: presence.lastSeenAt,
  };
}

export default usePresence;
