import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useDashboardData,
  useDashboardPreferences,
  useDashboardSession,
  useRefreshDashboard,
  useDashboardStats,
  useUsageProfile,
} from './useDashboardData';

// Mock the API module
vi.mock('../../../lib/api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

// Import the mocked API
import api from '../../../lib/api';

// Create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Create a wrapper that returns both the wrapper and the queryClient
const createWrapperWithClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
};

describe('useDashboardData hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Test useDashboardData hook
  describe('useDashboardData', () => {
    it('fetches dashboard data successfully', async () => {
      const mockData = {
        stats: { notes: 10, tasks: 20, projects: 5 },
        todayTasks: [{ _id: '1', title: 'Task 1' }],
        recentNotes: [{ _id: '1', title: 'Note 1' }],
        upcomingEvents: [],
        usageProfile: { level: 'active' },
        preferences: { pinnedWidgets: [], hiddenWidgets: [] },
      };
      api.get.mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() => useDashboardData(), { wrapper: createWrapper() });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data to load
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockData);
      expect(api.get).toHaveBeenCalledWith('/dashboard', {
        params: { timezone: expect.any(String) },
      });
    });

    it('passes custom timezone to API call', async () => {
      const mockData = { stats: {}, preferences: {} };
      api.get.mockResolvedValueOnce({ data: mockData });

      renderHook(() => useDashboardData({ timezone: 'America/New_York' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(api.get).toHaveBeenCalledWith('/dashboard', {
          params: { timezone: 'America/New_York' },
        })
      );
    });

    it('handles error when fetching dashboard data fails', async () => {
      const error = new Error('Failed to fetch dashboard');
      // Mock all retries to fail (the hook has retry: 2)
      api.get.mockRejectedValue(error);

      const { result } = renderHook(() => useDashboardData(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      }, { timeout: 5000 });

      expect(result.current.error.message).toBe('Failed to fetch dashboard');
    });

    it('uses default timezone from Intl API', async () => {
      const mockData = { stats: {}, preferences: {} };
      api.get.mockResolvedValueOnce({ data: mockData });

      renderHook(() => useDashboardData(), { wrapper: createWrapper() });

      await waitFor(() => expect(api.get).toHaveBeenCalled());

      const calledParams = api.get.mock.calls[0][1].params;
      expect(calledParams.timezone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    });
  });

  // Test useDashboardPreferences hook
  describe('useDashboardPreferences', () => {
    it('returns preference mutation functions', async () => {
      const { result } = renderHook(() => useDashboardPreferences(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toHaveProperty('pinWidget');
      expect(result.current).toHaveProperty('unpinWidget');
      expect(result.current).toHaveProperty('hideWidget');
      expect(result.current).toHaveProperty('showWidget');
      expect(result.current).toHaveProperty('updateWidgetSettings');
      expect(result.current).toHaveProperty('resetPreferences');
      expect(result.current).toHaveProperty('isUpdating');
    });

    it('pins a widget successfully', async () => {
      api.patch.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useDashboardPreferences(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.pinWidget('weather', 'always-show', 'large');
      });

      expect(api.patch).toHaveBeenCalledWith('/profile/dashboard-preferences', {
        pinnedWidgets: [{ widgetId: 'weather', position: 'always-show', size: 'large' }],
      });
    });

    it('pins a widget with default values', async () => {
      api.patch.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useDashboardPreferences(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.pinWidget('tasks');
      });

      expect(api.patch).toHaveBeenCalledWith('/profile/dashboard-preferences', {
        pinnedWidgets: [{ widgetId: 'tasks', position: 'always-show', size: 'default' }],
      });
    });

    it('unpins a widget successfully', async () => {
      const { wrapper, queryClient } = createWrapperWithClient();

      // Set up existing dashboard data with pinned widgets
      queryClient.setQueryData(['dashboard'], {
        preferences: {
          pinnedWidgets: [
            { widgetId: 'weather' },
            { widgetId: 'tasks' },
          ],
          hiddenWidgets: [],
        },
      });

      api.patch.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useDashboardPreferences(), { wrapper });

      await act(async () => {
        await result.current.unpinWidget('weather');
      });

      expect(api.patch).toHaveBeenCalledWith('/profile/dashboard-preferences', {
        pinnedWidgets: [{ widgetId: 'tasks' }],
      });
    });

    it('hides a widget successfully', async () => {
      const { wrapper, queryClient } = createWrapperWithClient();

      // Set up existing dashboard data
      queryClient.setQueryData(['dashboard'], {
        preferences: {
          pinnedWidgets: [],
          hiddenWidgets: [],
        },
      });

      api.patch.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useDashboardPreferences(), { wrapper });

      await act(async () => {
        await result.current.hideWidget('calendar');
      });

      expect(api.patch).toHaveBeenCalledWith('/profile/dashboard-preferences', {
        hiddenWidgets: ['calendar'],
      });
    });

    it('does not hide widget if already hidden', async () => {
      const { wrapper, queryClient } = createWrapperWithClient();

      queryClient.setQueryData(['dashboard'], {
        preferences: {
          pinnedWidgets: [],
          hiddenWidgets: ['calendar'],
        },
      });

      const { result } = renderHook(() => useDashboardPreferences(), { wrapper });

      await act(async () => {
        await result.current.hideWidget('calendar');
      });

      expect(api.patch).not.toHaveBeenCalled();
    });

    it('shows a hidden widget successfully', async () => {
      const { wrapper, queryClient } = createWrapperWithClient();

      queryClient.setQueryData(['dashboard'], {
        preferences: {
          pinnedWidgets: [],
          hiddenWidgets: ['calendar', 'weather'],
        },
      });

      api.patch.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useDashboardPreferences(), { wrapper });

      await act(async () => {
        await result.current.showWidget('calendar');
      });

      expect(api.patch).toHaveBeenCalledWith('/profile/dashboard-preferences', {
        hiddenWidgets: ['weather'],
      });
    });

    it('updates widget settings successfully', async () => {
      const { wrapper, queryClient } = createWrapperWithClient();

      queryClient.setQueryData(['dashboard'], {
        preferences: {
          pinnedWidgets: [],
          hiddenWidgets: [],
          widgetSettings: { weather: { unit: 'celsius' } },
        },
      });

      api.patch.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useDashboardPreferences(), { wrapper });

      await act(async () => {
        await result.current.updateWidgetSettings('weather', { location: 'NYC' });
      });

      expect(api.patch).toHaveBeenCalledWith('/profile/dashboard-preferences', {
        widgetSettings: {
          weather: { unit: 'celsius', location: 'NYC' },
        },
      });
    });

    it('resets preferences successfully', async () => {
      api.patch.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useDashboardPreferences(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.resetPreferences();
      });

      expect(api.patch).toHaveBeenCalledWith('/profile/dashboard-preferences', {
        pinnedWidgets: [],
        hiddenWidgets: [],
        widgetSettings: {},
      });
    });

    it('handles error when updating preferences fails', async () => {
      api.patch.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useDashboardPreferences(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.pinWidget('weather');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.updatePreferences.isError).toBe(true);
      });
    });
  });

  // Test useDashboardSession hook
  describe('useDashboardSession', () => {
    it('tracks session on mount', async () => {
      api.post.mockResolvedValueOnce({ data: { success: true } });

      renderHook(() => useDashboardSession(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/dashboard/session');
      });
    });

    it('handles session tracking error gracefully', async () => {
      api.post.mockRejectedValueOnce(new Error('Session tracking failed'));

      // Should not throw
      const { result } = renderHook(() => useDashboardSession(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/dashboard/session');
      });

      // Mutation should have failed but not crash the app
      expect(result.current.isError).toBe(true);
    });
  });

  // Test useRefreshDashboard hook
  describe('useRefreshDashboard', () => {
    it('returns a function to invalidate dashboard queries', async () => {
      const { wrapper, queryClient } = createWrapperWithClient();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRefreshDashboard(), { wrapper });

      expect(typeof result.current).toBe('function');

      await act(async () => {
        result.current();
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    });
  });

  // Test useDashboardStats hook
  describe('useDashboardStats', () => {
    it('returns stats from dashboard data', async () => {
      const mockData = {
        stats: { notes: 10, tasks: 20, projects: 5 },
        preferences: {},
      };
      api.get.mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() => useDashboardStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.stats).toEqual({ notes: 10, tasks: 20, projects: 5 });
    });

    it('returns undefined stats while loading', () => {
      api.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useDashboardStats(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.stats).toBeUndefined();
    });

    it('handles error state', async () => {
      api.get.mockRejectedValueOnce(new Error('Stats error'));

      const { result } = renderHook(() => useDashboardStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.error).toBeDefined());

      expect(result.current.stats).toBeUndefined();
    });
  });

  // Test useUsageProfile hook
  describe('useUsageProfile', () => {
    it('returns usage profile from dashboard data', async () => {
      const mockData = {
        stats: {},
        usageProfile: { level: 'power-user', streak: 30 },
        preferences: {},
      };
      api.get.mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() => useUsageProfile(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.usageProfile).toEqual({ level: 'power-user', streak: 30 });
    });

    it('returns undefined usage profile while loading', () => {
      api.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useUsageProfile(), { wrapper: createWrapper() });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.usageProfile).toBeUndefined();
    });

    it('handles error state', async () => {
      api.get.mockRejectedValueOnce(new Error('Usage profile error'));

      const { result } = renderHook(() => useUsageProfile(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.error).toBeDefined());

      expect(result.current.usageProfile).toBeUndefined();
    });
  });
});
