import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { analyticsApi } from '../lib/api';

// Query keys
export const claudeUsageKeys = {
  all: ['claude-usage'],
  recent: (days) => [...claudeUsageKeys.all, 'recent', days],
  range: (startDate, endDate) => [...claudeUsageKeys.all, 'range', startDate, endDate],
  syncs: (limit) => [...claudeUsageKeys.all, 'syncs', limit],
  latestSync: () => [...claudeUsageKeys.all, 'syncs', 'latest'],
};

/**
 * Hook to get Claude Code usage stats for recent N days
 * @param {number} days - Number of days to look back (default: 30)
 */
export function useClaudeUsage(days = 30) {
  return useQuery({
    queryKey: claudeUsageKeys.recent(days),
    queryFn: async () => {
      try {
        const response = await analyticsApi.getClaudeUsage({ days });
        return response.data.data;
      } catch (err) {
        // Re-throw with the error message from the API response
        const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to load Claude usage data';
        const error = new Error(errorMessage);
        error.response = err.response;
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - usage data doesn't change frequently
    retry: 2, // Retry twice on failure
  });
}

/**
 * Hook to get Claude Code usage stats for a custom date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 */
export function useClaudeUsageRange(startDate, endDate) {
  return useQuery({
    queryKey: claudeUsageKeys.range(startDate?.toISOString(), endDate?.toISOString()),
    queryFn: async () => {
      try {
        const response = await analyticsApi.getClaudeUsage({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });
        return response.data.data;
      } catch (err) {
        const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to load Claude usage data';
        const error = new Error(errorMessage);
        error.response = err.response;
        throw error;
      }
    },
    enabled: !!startDate && !!endDate, // Only run if both dates are provided
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
}

/**
 * Hook to sync Claude Code usage data from ccusage CLI
 * Used internally by the /claude-usage skill
 */
export function useSyncClaudeUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (usageData) => {
      const response = await analyticsApi.syncClaudeUsage(usageData);
      return response.data.data;
    },
    onSuccess: () => {
      // Invalidate all claude-usage queries to refetch with new data
      queryClient.invalidateQueries({ queryKey: claudeUsageKeys.all });
    },
  });
}

/**
 * Hook to get last sync timestamp
 * Shows when the user last synced their Claude Code usage data
 */
export function useClaudeUsageLastSync() {
  return useQuery({
    queryKey: [...claudeUsageKeys.all, 'last-sync'],
    queryFn: async () => {
      try {
        const response = await analyticsApi.getClaudeUsageLastSync();
        return response.data.data;
      } catch (err) {
        const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to load sync info';
        const error = new Error(errorMessage);
        error.response = err.response;
        throw error;
      }
    },
    staleTime: 1000 * 30, // 30 seconds
    retry: 2,
  });
}

/**
 * Hook to manually refresh usage data
 * Invalidates query cache to trigger refetch
 */
export function useRefreshClaudeUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // This doesn't call an API - it just invalidates the cache
      // The actual data refresh happens when user runs /claude-usage
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX
      return { refreshed: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: claudeUsageKeys.all });
    },
  });
}

/**
 * Hook to get sync history (list of past syncs)
 * @param {number} limit - Number of syncs to return (default: 10)
 */
export function useClaudeUsageSyncs(limit = 10) {
  return useQuery({
    queryKey: claudeUsageKeys.syncs(limit),
    queryFn: async () => {
      try {
        const response = await analyticsApi.getClaudeUsageSyncs({ limit });
        return response.data.data;
      } catch (err) {
        const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to load sync history';
        const error = new Error(errorMessage);
        error.response = err.response;
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}

/**
 * Hook to get the latest sync event with comparison data
 * Used for "Since Last Sync" card
 */
export function useClaudeUsageLatestSync() {
  return useQuery({
    queryKey: claudeUsageKeys.latestSync(),
    queryFn: async () => {
      try {
        const response = await analyticsApi.getClaudeUsageSyncsLatest();
        return response.data.data;
      } catch (err) {
        const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to load latest sync';
        const error = new Error(errorMessage);
        error.response = err.response;
        throw error;
      }
    },
    staleTime: 1000 * 60, // 1 minute
    retry: 2,
  });
}

export default useClaudeUsage;
