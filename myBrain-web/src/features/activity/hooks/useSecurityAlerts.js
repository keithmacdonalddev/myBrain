/**
 * Security Alerts Hook
 *
 * Provides hooks for managing security alerts including:
 * - Fetching alerts with unread count
 * - Dismissing/marking alerts as read
 *
 * All mutations include toast feedback for user communication.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activityKeys } from './useActivityData';
import { activityApi } from '../../../lib/api';
import useToast from '../../../hooks/useToast';

/**
 * Hook to fetch security alerts for the current user
 * Returns alerts array with unread count
 *
 * @param {Object} params - Query parameters
 * @param {string} params.status - Filter by status (unread, read, dismissed)
 * @param {number} params.limit - Max alerts to return
 */
export function useSecurityAlerts(params = {}) {
  return useQuery({
    queryKey: activityKeys.alerts(),
    queryFn: async () => {
      const response = await activityApi.getSecurityAlerts(params);
      return response.data;
    },
  });
}

/**
 * Hook to dismiss or mark an alert as read
 * Shows toast feedback on success/error
 */
export function useDismissAlert() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, status }) => activityApi.dismissAlert(id, { status }),
    onSuccess: (_, variables) => {
      // Invalidate alerts cache to refetch updated list
      queryClient.invalidateQueries({ queryKey: activityKeys.alerts() });
      if (variables.status === 'dismissed') {
        toast.success('Alert dismissed');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update alert');
    },
  });
}
