/**
 * Sessions Hook
 *
 * Provides hooks for managing user sessions including:
 * - Fetching active sessions
 * - Revoking individual sessions
 * - Logging out from all other sessions
 *
 * All mutations include toast feedback for user communication.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activityKeys } from './useActivityData';
import { activityApi } from '../../../lib/api';
import useToast from '../../../hooks/useToast';

/**
 * Hook to fetch all active sessions for the current user
 * Returns sessions array with current session marked
 */
export function useSessions() {
  return useQuery({
    queryKey: activityKeys.sessions(),
    queryFn: async () => {
      const response = await activityApi.getSessions();
      return response.data;
    },
  });
}

/**
 * Hook to revoke a specific session
 * Shows toast feedback on success/error
 */
export function useRevokeSession() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (sessionId) => activityApi.revokeSession(sessionId),
    onSuccess: () => {
      // Invalidate sessions cache to refetch updated list
      queryClient.invalidateQueries({ queryKey: activityKeys.sessions() });
      toast.success('Session revoked successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to revoke session');
    },
  });
}

/**
 * Hook to log out from all other sessions except current
 * Shows toast feedback on success/error
 */
export function useLogoutAll() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: () => activityApi.logoutAll(),
    onSuccess: (response) => {
      // Invalidate sessions cache to show only current session
      queryClient.invalidateQueries({ queryKey: activityKeys.sessions() });
      const revokedCount = response.data?.revokedCount || 0;
      toast.success(`Signed out of ${revokedCount} other session${revokedCount !== 1 ? 's' : ''}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to sign out of other sessions');
    },
  });
}
