/**
 * Activity Stats Hook
 *
 * Provides hooks for fetching activity statistics.
 * Supports different time periods for filtering.
 */
import { useQuery } from '@tanstack/react-query';
import { activityKeys } from './useActivityData';
import { activityApi } from '../../../lib/api';

/**
 * Hook to fetch activity statistics for a given period
 *
 * @param {string} period - Time period ('7d', '30d', '90d')
 * @returns {Object} Query result with stats data
 */
export function useActivityStats(period = '30d') {
  return useQuery({
    queryKey: activityKeys.stats(period),
    queryFn: async () => {
      const response = await activityApi.getActivityStats({ period });
      return response.data;
    },
  });
}
