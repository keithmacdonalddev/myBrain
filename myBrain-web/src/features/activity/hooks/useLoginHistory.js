/**
 * Login History Hook
 *
 * Provides hooks for fetching login history with pagination.
 * Uses skip/limit pattern for pagination (not infinite query).
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activityKeys } from './useActivityData';
import { activityApi } from '../../../lib/api';

// Default page size for login history
const DEFAULT_LIMIT = 20;

/**
 * Hook to fetch login history with pagination
 *
 * @param {Object} options - Hook options
 * @param {number} options.limit - Items per page (default: 20)
 * @returns {Object} Query result with pagination helpers
 */
export function useLoginHistory(options = {}) {
  const limit = options.limit || DEFAULT_LIMIT;
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: activityKeys.loginHistory({ page, limit }),
    queryFn: async () => {
      const response = await activityApi.getLoginHistory({
        skip: (page - 1) * limit,
        limit,
      });
      return response.data;
    },
    // Keep previous data while fetching next page for smooth UX
    placeholderData: (previousData) => previousData,
  });

  // Calculate pagination info
  const totalPages = query.data?.total
    ? Math.ceil(query.data.total / limit)
    : 1;

  return {
    ...query,
    // Pagination state
    page,
    totalPages,
    hasMore: page < totalPages,
    hasPrevious: page > 1,
    // Pagination actions
    nextPage: () => setPage((p) => Math.min(p + 1, totalPages)),
    previousPage: () => setPage((p) => Math.max(p - 1, 1)),
    goToPage: (newPage) => setPage(Math.max(1, Math.min(newPage, totalPages))),
    // Data shortcuts
    logins: query.data?.logins || [],
    total: query.data?.total || 0,
  };
}
