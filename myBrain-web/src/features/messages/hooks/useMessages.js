import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { messagesApi } from '../../../lib/api';
import { useSocketEvent, useWebSocket } from '../../../hooks/useWebSocket.jsx';

// Get all conversations
export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => messagesApi.getConversations(),
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  });
}

// Get messages for a conversation
export function useMessages(conversationId, options = {}) {
  const { limit = 50 } = options;

  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => messagesApi.getMessages(conversationId, { limit }),
    enabled: !!conversationId,
  });
}

// Get unread count
export function useUnreadCount() {
  return useQuery({
    queryKey: ['messages', 'unread-count'],
    queryFn: () => messagesApi.getUnreadCount(),
    refetchInterval: 30000,
  });
}

// Send a message
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, content, contentType = 'text' }) =>
      messagesApi.sendMessage(conversationId, { content, contentType }),
    onSuccess: (data, variables) => {
      // Invalidate messages for this conversation
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
      // Update conversations list
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Create a conversation
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (participantIds) => messagesApi.createConversation(participantIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Mark conversation as read
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId) => messagesApi.markAsRead(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Hook for real-time message updates
export function useRealtimeMessages(conversationId) {
  const queryClient = useQueryClient();
  const [typingUsers, setTypingUsers] = useState([]);

  // Handle new messages
  const handleNewMessage = useCallback((message) => {
    if (message.conversationId === conversationId) {
      queryClient.setQueryData(['messages', conversationId], (old) => {
        if (!old) return { messages: [message] };
        // Avoid duplicates
        const exists = old.messages?.some(m => m._id === message._id);
        if (exists) return old;
        return {
          ...old,
          messages: [...(old.messages || []), message],
        };
      });
    }
    // Update conversations list
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    queryClient.invalidateQueries({ queryKey: ['messages', 'unread-count'] });
  }, [conversationId, queryClient]);

  // Handle typing indicators
  const handleTyping = useCallback((data) => {
    if (data.conversationId === conversationId) {
      setTypingUsers((prev) => {
        if (data.isTyping) {
          if (!prev.find(u => u.userId === data.userId)) {
            return [...prev, { userId: data.userId, user: data.user }];
          }
        } else {
          return prev.filter(u => u.userId !== data.userId);
        }
        return prev;
      });
    }
  }, [conversationId]);

  // Handle message read receipts
  const handleMessageRead = useCallback((data) => {
    if (data.conversationId === conversationId) {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    }
  }, [conversationId, queryClient]);

  useSocketEvent('message:new', handleNewMessage);
  useSocketEvent('user:typing', handleTyping);
  useSocketEvent('user:stopped_typing', handleTyping);
  useSocketEvent('message:read', handleMessageRead);

  // Clear typing users after timeout
  useEffect(() => {
    const timer = setInterval(() => {
      setTypingUsers([]);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return { typingUsers };
}

// Hook to get or create a conversation with a user
export function useGetOrCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId) => {
      // First try to find existing conversation
      const { conversations } = await messagesApi.getConversations();
      const existing = conversations?.find(
        c => c.type === 'direct' && c.participants.some(p => p._id === userId)
      );
      if (existing) return existing;
      // Create new conversation
      return messagesApi.createConversation([userId]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
