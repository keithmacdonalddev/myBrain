import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { connectionsApi, usersApi } from '../../../lib/api';
import { useToast } from '../../../hooks/useToast';

// Query keys
export const connectionKeys = {
  all: ['connections'],
  list: () => [...connectionKeys.all, 'list'],
  pending: () => [...connectionKeys.all, 'pending'],
  sent: () => [...connectionKeys.all, 'sent'],
  counts: () => [...connectionKeys.all, 'counts'],
  suggestions: () => [...connectionKeys.all, 'suggestions'],
  blocked: () => [...connectionKeys.all, 'blocked'],
};

export const userKeys = {
  all: ['users'],
  search: (query) => [...userKeys.all, 'search', query],
  profile: (id) => [...userKeys.all, 'profile', id],
  connections: (id) => [...userKeys.all, 'connections', id],
};

/**
 * Hook to get all accepted connections
 */
export function useConnections(options = {}) {
  const { limit = 50, skip = 0 } = options;

  return useQuery({
    queryKey: [...connectionKeys.list(), { limit, skip }],
    queryFn: async () => {
      const { data } = await connectionsApi.getConnections({ limit, skip });
      return data;
    },
  });
}

/**
 * Hook to get pending connection requests
 */
export function usePendingRequests(options = {}) {
  const { limit = 50, skip = 0 } = options;

  return useQuery({
    queryKey: [...connectionKeys.pending(), { limit, skip }],
    queryFn: async () => {
      const { data } = await connectionsApi.getPending({ limit, skip });
      return data;
    },
  });
}

/**
 * Hook to get sent connection requests
 */
export function useSentRequests(options = {}) {
  const { limit = 50, skip = 0 } = options;

  return useQuery({
    queryKey: [...connectionKeys.sent(), { limit, skip }],
    queryFn: async () => {
      const { data } = await connectionsApi.getSent({ limit, skip });
      return data;
    },
  });
}

/**
 * Hook to get connection counts
 */
export function useConnectionCounts() {
  return useQuery({
    queryKey: connectionKeys.counts(),
    queryFn: async () => {
      const { data } = await connectionsApi.getCounts();
      return data;
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to get suggested connections
 */
export function useSuggestions(limit = 10) {
  return useQuery({
    queryKey: [...connectionKeys.suggestions(), { limit }],
    queryFn: async () => {
      const { data } = await connectionsApi.getSuggestions(limit);
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get blocked users
 */
export function useBlockedUsers(options = {}) {
  const { limit = 50, skip = 0 } = options;

  return useQuery({
    queryKey: [...connectionKeys.blocked(), { limit, skip }],
    queryFn: async () => {
      const { data } = await connectionsApi.getBlocked({ limit, skip });
      return data;
    },
  });
}

/**
 * Hook to search users
 */
export function useUserSearch(query, options = {}) {
  const { limit = 20, skip = 0, enabled = true } = options;

  return useQuery({
    queryKey: [...userKeys.search(query), { limit, skip }],
    queryFn: async () => {
      const { data } = await usersApi.search(query, { limit, skip });
      return data;
    },
    enabled: enabled && query?.length >= 2,
  });
}

/**
 * Hook to get a user's public profile
 */
export function useUserProfile(userId) {
  return useQuery({
    queryKey: userKeys.profile(userId),
    queryFn: async () => {
      const { data } = await usersApi.getProfile(userId);
      return data;
    },
    enabled: !!userId,
  });
}

/**
 * Hook to send a connection request
 */
export function useSendConnectionRequest() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ userId, message, source }) => {
      const { data } = await connectionsApi.sendRequest(userId, message, source);
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success('Connection request sent');
      queryClient.invalidateQueries({ queryKey: connectionKeys.sent() });
      queryClient.invalidateQueries({ queryKey: connectionKeys.counts() });
      queryClient.invalidateQueries({ queryKey: connectionKeys.suggestions() });
      queryClient.invalidateQueries({ queryKey: userKeys.profile(variables.userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.search() });
    },
    onError: (error) => {
      if (error.code === 'INCOMING_REQUEST_EXISTS') {
        toast.info('This user already sent you a request. Check your pending requests.');
      } else {
        toast.error(error.message || 'Failed to send connection request');
      }
    },
  });
}

/**
 * Hook to accept a connection request
 */
export function useAcceptConnection() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (connectionId) => {
      const { data } = await connectionsApi.accept(connectionId);
      return data;
    },
    onSuccess: () => {
      toast.success('Connection accepted');
      queryClient.invalidateQueries({ queryKey: connectionKeys.all });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to accept connection');
    },
  });
}

/**
 * Hook to decline a connection request
 */
export function useDeclineConnection() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (connectionId) => {
      const { data } = await connectionsApi.decline(connectionId);
      return data;
    },
    onSuccess: () => {
      toast.success('Connection request declined');
      queryClient.invalidateQueries({ queryKey: connectionKeys.pending() });
      queryClient.invalidateQueries({ queryKey: connectionKeys.counts() });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to decline connection');
    },
  });
}

/**
 * Hook to remove a connection or cancel a request
 */
export function useRemoveConnection() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (connectionId) => {
      const { data } = await connectionsApi.remove(connectionId);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Connection removed');
      queryClient.invalidateQueries({ queryKey: connectionKeys.all });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to remove connection');
    },
  });
}

/**
 * Hook to block a user
 */
export function useBlockUser() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ userId, reason, notes }) => {
      const { data } = await connectionsApi.block(userId, reason, notes);
      return data;
    },
    onSuccess: () => {
      toast.success('User blocked');
      queryClient.invalidateQueries({ queryKey: connectionKeys.all });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to block user');
    },
  });
}

/**
 * Hook to unblock a user
 */
export function useUnblockUser() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (userId) => {
      const { data } = await connectionsApi.unblock(userId);
      return data;
    },
    onSuccess: () => {
      toast.success('User unblocked');
      queryClient.invalidateQueries({ queryKey: connectionKeys.blocked() });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to unblock user');
    },
  });
}

/**
 * Hook to update social settings
 */
export function useUpdateSocialSettings() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (settings) => {
      const { data } = await usersApi.updateSocialSettings(settings);
      return data;
    },
    onSuccess: () => {
      toast.success('Settings updated');
      // Invalidate auth/me to get updated user data
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update settings');
    },
  });
}

/**
 * Hook to update presence status
 */
export function useUpdatePresence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ status, statusMessage }) => {
      const { data } = await usersApi.updatePresence(status, statusMessage);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}
