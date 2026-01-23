import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useEffect } from 'react';
import { analyticsApi } from '../lib/api';
import { useSocketEvent } from './useWebSocket';
import { useToast } from './useToast';

// Query keys
export const claudeUsageKeys = {
  all: ['claude-usage'],
  recent: (days) => [...claudeUsageKeys.all, 'recent', days],
  range: (startDate, endDate) => [...claudeUsageKeys.all, 'range', startDate, endDate],
  syncs: (limit) => [...claudeUsageKeys.all, 'syncs', limit],
  latestSync: () => [...claudeUsageKeys.all, 'syncs', 'latest'],
  // Subscription keys (from /usage command)
  subscription: () => [...claudeUsageKeys.all, 'subscription'],
  subscriptionHistory: (limit) => [...claudeUsageKeys.all, 'subscription', 'history', limit],
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

// =============================================================================
// SUBSCRIPTION USAGE HOOKS (from /usage command)
// =============================================================================

/**
 * Hook to get the latest subscription limit snapshot
 * Shows current session/weekly usage percentages
 */
export function useClaudeSubscription() {
  return useQuery({
    queryKey: claudeUsageKeys.subscription(),
    queryFn: async () => {
      try {
        const response = await analyticsApi.getClaudeSubscription();
        return response.data.data;
      } catch (err) {
        const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to load subscription data';
        const error = new Error(errorMessage);
        error.response = err.response;
        throw error;
      }
    },
    staleTime: 1000 * 60, // 1 minute - subscription data changes frequently
    retry: 2,
  });
}

/**
 * Hook to get subscription usage history
 * @param {number} limit - Number of snapshots to return (default: 20)
 */
export function useClaudeSubscriptionHistory(limit = 20) {
  return useQuery({
    queryKey: claudeUsageKeys.subscriptionHistory(limit),
    queryFn: async () => {
      try {
        const response = await analyticsApi.getClaudeSubscriptionHistory({ limit });
        return response.data.data;
      } catch (err) {
        const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to load subscription history';
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
 * Hook to sync subscription usage data
 * Used internally by the /claude-usage skill
 */
export function useSyncClaudeSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subscription, rawOutput }) => {
      const response = await analyticsApi.syncClaudeSubscription({ subscription, rawOutput });
      return response.data.data;
    },
    onSuccess: () => {
      // Invalidate subscription queries to refetch with new data
      queryClient.invalidateQueries({ queryKey: claudeUsageKeys.subscription() });
      queryClient.invalidateQueries({ queryKey: claudeUsageKeys.all });
    },
  });
}

// =============================================================================
// REAL-TIME WEBSOCKET HOOKS
// =============================================================================

/**
 * Hook that listens for real-time Claude usage sync events via WebSocket.
 * When the CLI syncs usage data, this hook automatically invalidates the
 * TanStack Query cache, causing any mounted components to refetch fresh data.
 *
 * Mount once at app level (e.g., in App.jsx) for global real-time updates.
 */
export function useRealtimeClaudeUsage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const debounceRef = useRef(null);
  const DEBOUNCE_MS = 300;

  const handleSyncEvent = useCallback(
    (syncData) => {
      console.log('[Claude Usage] Real-time sync event received:', {
        syncId: syncData.syncId,
        daysIncluded: syncData.daysIncluded,
        totalCost: `$${syncData.totalCost?.toFixed(2) || '0.00'}`,
      });

      // Clear any pending debounced invalidation
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Debounce invalidation to handle rapid consecutive syncs
      debounceRef.current = setTimeout(() => {
        // Invalidate all Claude usage queries
        queryClient.invalidateQueries({ queryKey: claudeUsageKeys.all });
        debounceRef.current = null;

        // Show toast notification to user
        showToast({
          type: 'success',
          message: `Claude usage synced! ${syncData.daysIncluded} days, $${syncData.totalCost?.toFixed(2) || '0.00'}`,
          duration: 3000,
        });
      }, DEBOUNCE_MS);
    },
    [queryClient, showToast],
  );

  // Subscribe to WebSocket event
  useSocketEvent('claude-usage:synced', handleSyncEvent);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);
}

/**
 * Hook that listens for real-time Claude subscription sync events via WebSocket.
 * When the CLI syncs /usage output, this hook automatically invalidates the
 * TanStack Query cache for subscription limits.
 *
 * Mount once at app level (e.g., in App.jsx) for global real-time updates.
 */
export function useRealtimeClaudeSubscription() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const debounceRef = useRef(null);
  const DEBOUNCE_MS = 300;

  const handleSubscriptionSyncEvent = useCallback(
    (snapshotData) => {
      console.log('[Claude Subscription] Real-time sync event received:', {
        snapshotId: snapshotData.snapshotId,
        sessionUsed: `${snapshotData.session?.usedPercent || 0}%`,
        weeklyUsed: `${snapshotData.weeklyAllModels?.usedPercent || 0}%`,
      });

      // Clear any pending debounced invalidation
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Debounce invalidation
      debounceRef.current = setTimeout(() => {
        // Invalidate subscription queries
        queryClient.invalidateQueries({ queryKey: claudeUsageKeys.subscription() });
        debounceRef.current = null;

        // Show toast notification
        showToast({
          type: 'success',
          message: `Subscription limits updated! Session: ${snapshotData.session?.usedPercent || 0}%`,
          duration: 3000,
        });
      }, DEBOUNCE_MS);
    },
    [queryClient, showToast],
  );

  // Subscribe to WebSocket event
  useSocketEvent('claude-subscription:synced', handleSubscriptionSyncEvent);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);
}

export default useClaudeUsage;
