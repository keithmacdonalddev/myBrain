/**
 * =============================================================================
 * USEDASHBOARDDATA.JS - Dashboard Data Hooks
 * =============================================================================
 *
 * Custom hooks for fetching and managing dashboard data.
 * Uses TanStack Query for caching, automatic refetching, and state management.
 *
 * HOOKS:
 * - useDashboardData: Fetches all dashboard data
 * - useDashboardPreferences: Manages pinned/hidden widgets
 * - useDashboardSession: Tracks dashboard visits
 *
 * =============================================================================
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import api from '../../../lib/api';

// =============================================================================
// DASHBOARD DATA HOOK
// =============================================================================

/**
 * useDashboardData()
 * ------------------
 * Fetches all dashboard data from the aggregated endpoint.
 *
 * Features:
 * - Caches data for 30 seconds
 * - Auto-refetches every 60 seconds
 * - Refetches on window focus
 *
 * @param {Object} options - Query options
 * @param {string} options.timezone - User's timezone
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export function useDashboardData(options = {}) {
  const { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone } = options;

  return useQuery({
    queryKey: ['dashboard', timezone],
    queryFn: async () => {
      const response = await api.get('/dashboard', {
        params: { timezone }
      });
      return response.data;
    },
    staleTime: 30 * 1000,       // Data is fresh for 30 seconds
    refetchInterval: 60 * 1000, // Auto-refetch every 60 seconds
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    retry: 2                    // Retry failed requests twice
  });
}

// =============================================================================
// DASHBOARD PREFERENCES HOOK
// =============================================================================

/**
 * useDashboardPreferences()
 * -------------------------
 * Manages user's dashboard preferences (pinned widgets, hidden widgets, etc.)
 *
 * @returns {Object} Preferences data and mutation functions
 */
export function useDashboardPreferences() {
  const queryClient = useQueryClient();

  // Mutation for updating preferences
  const updatePreferences = useMutation({
    mutationFn: async (preferences) => {
      const response = await api.patch('/profile/dashboard-preferences', preferences);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate dashboard data to refetch with new preferences
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    }
  });

  // Pin a widget
  const pinWidget = (widgetId, position = 'always-show', size = 'default') => {
    return updatePreferences.mutateAsync({
      pinnedWidgets: [
        // This will be merged with existing pinned widgets on the backend
        { widgetId, position, size }
      ]
    });
  };

  // Unpin a widget
  const unpinWidget = async (widgetId) => {
    // Get current preferences from dashboard data
    const dashboardData = queryClient.getQueryData(['dashboard']);
    const currentPinned = dashboardData?.preferences?.pinnedWidgets || [];

    // Filter out the widget to unpin
    const newPinned = currentPinned.filter(p => p.widgetId !== widgetId);

    return updatePreferences.mutateAsync({
      pinnedWidgets: newPinned
    });
  };

  // Hide a widget
  const hideWidget = async (widgetId) => {
    const dashboardData = queryClient.getQueryData(['dashboard']);
    const currentHidden = dashboardData?.preferences?.hiddenWidgets || [];

    if (!currentHidden.includes(widgetId)) {
      return updatePreferences.mutateAsync({
        hiddenWidgets: [...currentHidden, widgetId]
      });
    }
  };

  // Show a hidden widget
  const showWidget = async (widgetId) => {
    const dashboardData = queryClient.getQueryData(['dashboard']);
    const currentHidden = dashboardData?.preferences?.hiddenWidgets || [];

    return updatePreferences.mutateAsync({
      hiddenWidgets: currentHidden.filter(id => id !== widgetId)
    });
  };

  // Update widget-specific settings
  const updateWidgetSettings = (widgetId, settings) => {
    const dashboardData = queryClient.getQueryData(['dashboard']);
    const currentSettings = dashboardData?.preferences?.widgetSettings || {};

    return updatePreferences.mutateAsync({
      widgetSettings: {
        ...currentSettings,
        [widgetId]: {
          ...(currentSettings[widgetId] || {}),
          ...settings
        }
      }
    });
  };

  // Reset all dashboard preferences to defaults
  const resetPreferences = () => {
    return updatePreferences.mutateAsync({
      pinnedWidgets: [],
      hiddenWidgets: [],
      widgetSettings: {}
    });
  };

  return {
    updatePreferences,
    pinWidget,
    unpinWidget,
    hideWidget,
    showWidget,
    updateWidgetSettings,
    resetPreferences,
    isUpdating: updatePreferences.isPending
  };
}

// =============================================================================
// DASHBOARD SESSION HOOK
// =============================================================================

/**
 * useDashboardSession()
 * ---------------------
 * Tracks dashboard visits for usage analytics.
 * Automatically sends a session event when the component mounts.
 */
export function useDashboardSession() {
  const trackSession = useMutation({
    mutationFn: async () => {
      await api.post('/dashboard/session');
    }
  });

  useEffect(() => {
    // Track session on mount
    trackSession.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return trackSession;
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * useRefreshDashboard()
 * ---------------------
 * Returns a function to manually refresh dashboard data.
 */
export function useRefreshDashboard() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

/**
 * useDashboardStats()
 * -------------------
 * Returns just the stats portion of dashboard data.
 * Useful for components that only need statistics.
 */
export function useDashboardStats() {
  const { data, isLoading, error } = useDashboardData();

  return {
    stats: data?.stats,
    isLoading,
    error
  };
}

/**
 * useUsageProfile()
 * -----------------
 * Returns just the usage profile portion of dashboard data.
 */
export function useUsageProfile() {
  const { data, isLoading, error } = useDashboardData();

  return {
    usageProfile: data?.usageProfile,
    isLoading,
    error
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  useDashboardData,
  useDashboardPreferences,
  useDashboardSession,
  useRefreshDashboard,
  useDashboardStats,
  useUsageProfile
};
