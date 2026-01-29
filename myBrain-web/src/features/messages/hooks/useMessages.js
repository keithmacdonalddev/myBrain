import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { messagesApi } from '../../../lib/api';
import { useSocketEvent, useWebSocket } from '../../../hooks/useWebSocket.jsx';

// Get all conversations
export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data } = await messagesApi.getConversations();
      return data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds as fallback
  });
}

// Get messages for a conversation
export function useMessages(conversationId, options = {}) {
  const { limit = 50 } = options;

  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data } = await messagesApi.getMessages(conversationId, { limit });
      return data;
    },
    enabled: !!conversationId,
  });
}

// Get unread count
export function useUnreadCount() {
  return useQuery({
    queryKey: ['messages', 'unread-count'],
    queryFn: async () => {
      const { data } = await messagesApi.getUnreadCount();
      return data;
    },
    refetchInterval: 30000,
  });
}

// Send a message
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, content, contentType = 'text', attachments = [] }) => {
      const { data } = await messagesApi.sendMessage(conversationId, { content, contentType, attachments });
      return data;
    },
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
    mutationFn: async (data) => {
      const { data: responseData } = await messagesApi.createConversation(data);
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Mark conversation as read
// Note: The GET messages endpoint automatically marks conversation as read,
// so this mutation is only for explicit marking (e.g., without loading messages)
// The API endpoint /messages/:conversationId/mark-read is not yet implemented,
// so this silently succeeds to avoid errors
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId) => {
      // GET messages already marks as read automatically
      // This is a no-op for now until explicit endpoint is added
      return { success: true, conversationId };
    },
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

  // Handle message reactions
  const handleMessageReaction = useCallback((data) => {
    if (data.messageId) {
      queryClient.setQueryData(['messages', conversationId], (old) => {
        if (!old?.messages) return old;
        return {
          ...old,
          messages: old.messages.map(msg =>
            msg._id === data.messageId
              ? { ...msg, reactions: data.reactions }
              : msg
          ),
        };
      });
    }
  }, [conversationId, queryClient]);

  useSocketEvent('message:new', handleNewMessage);
  useSocketEvent('user:typing', handleTyping);
  useSocketEvent('user:stopped_typing', handleTyping);
  useSocketEvent('message:read', handleMessageRead);
  useSocketEvent('message:reaction', handleMessageReaction);

  // Clear typing users after timeout
  useEffect(() => {
    const timer = setInterval(() => {
      setTypingUsers([]);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return { typingUsers };
}

// Toggle reaction on a message
export function useToggleReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, emoji }) => {
      const { data } = await messagesApi.toggleReaction(messageId, emoji);
      return data;
    },
    onSuccess: (data, { messageId, conversationId }) => {
      // Optimistically update the cache
      queryClient.setQueryData(['messages', conversationId], (old) => {
        if (!old?.messages) return old;
        return {
          ...old,
          messages: old.messages.map(msg =>
            msg._id === messageId
              ? { ...msg, reactions: data.reactions }
              : msg
          ),
        };
      });
    },
  });
}

// Hook to get or create a conversation with a user
export function useGetOrCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId) => {
      // First try to find existing conversation
      const { data } = await messagesApi.getConversations();
      const existing = data.conversations?.find(
        c => c.type === 'direct' && c.participants.some(p => p._id === userId)
      );
      if (existing) return existing;
      // Create new conversation
      const { data: newConv } = await messagesApi.createConversation({ userId });
      return newConv;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Add member to group conversation
export function useAddMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, userId }) => {
      const { data } = await messagesApi.addMember(conversationId, userId);
      return data;
    },
    onSuccess: (data, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Remove member from group conversation
export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, userId }) => {
      const { data } = await messagesApi.removeMember(conversationId, userId);
      return data;
    },
    onSuccess: (data, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Update member role in group conversation
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, userId, role }) => {
      const { data } = await messagesApi.updateMemberRole(conversationId, userId, role);
      return data;
    },
    onSuccess: (data, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Search messages across all conversations
export function useMessageSearch(query, options = {}) {
  const { enabled = true, conversationId } = options;

  return useQuery({
    queryKey: ['messages', 'search', query, conversationId],
    queryFn: async () => {
      const { data } = await messagesApi.search(query, { conversationId });
      return data;
    },
    enabled: enabled && query?.length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
