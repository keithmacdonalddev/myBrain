import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserActivity } from './useActivity';

// Mock the API module
vi.mock('../../../lib/api', () => ({
  profileApi: {
    getActivity: vi.fn(),
  },
}));

// Import the mocked API
import { profileApi } from '../../../lib/api';

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

describe('useActivity hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Test useUserActivity hook
  describe('useUserActivity', () => {
    it('fetches user activity successfully with default options', async () => {
      const mockActivity = {
        activities: [
          { _id: '1', type: 'note.created', description: 'Created a note', timestamp: '2025-01-25T10:00:00Z' },
          { _id: '2', type: 'task.completed', description: 'Completed a task', timestamp: '2025-01-25T09:00:00Z' },
          { _id: '3', type: 'login', description: 'Logged in', timestamp: '2025-01-25T08:00:00Z' },
        ],
        total: 3,
      };
      profileApi.getActivity.mockResolvedValueOnce({ data: mockActivity });

      const { result } = renderHook(() => useUserActivity(), { wrapper: createWrapper() });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data to load
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockActivity);
      // Default options: days = 30, limit = 50
      expect(profileApi.getActivity).toHaveBeenCalledWith({ days: 30, limit: 50 });
    });

    it('passes custom days option to API call', async () => {
      profileApi.getActivity.mockResolvedValueOnce({ data: { activities: [], total: 0 } });

      renderHook(() => useUserActivity({ days: 7 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(profileApi.getActivity).toHaveBeenCalledWith({ days: 7, limit: 50 })
      );
    });

    it('passes custom limit option to API call', async () => {
      profileApi.getActivity.mockResolvedValueOnce({ data: { activities: [], total: 0 } });

      renderHook(() => useUserActivity({ limit: 100 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(profileApi.getActivity).toHaveBeenCalledWith({ days: 30, limit: 100 })
      );
    });

    it('passes both custom days and limit options to API call', async () => {
      profileApi.getActivity.mockResolvedValueOnce({ data: { activities: [], total: 0 } });

      renderHook(() => useUserActivity({ days: 14, limit: 25 }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(profileApi.getActivity).toHaveBeenCalledWith({ days: 14, limit: 25 })
      );
    });

    it('handles error when fetching activity fails', async () => {
      const error = new Error('Failed to fetch activity');
      profileApi.getActivity.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useUserActivity(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error.message).toBe('Failed to fetch activity');
    });

    it('returns empty array when no activity exists', async () => {
      const emptyActivity = {
        activities: [],
        total: 0,
      };
      profileApi.getActivity.mockResolvedValueOnce({ data: emptyActivity });

      const { result } = renderHook(() => useUserActivity(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(emptyActivity);
      expect(result.current.data.activities).toHaveLength(0);
    });

    it('refetches when options change', async () => {
      profileApi.getActivity.mockResolvedValue({ data: { activities: [], total: 0 } });

      const { result, rerender } = renderHook(
        ({ days, limit }) => useUserActivity({ days, limit }),
        {
          wrapper: createWrapper(),
          initialProps: { days: 30, limit: 50 },
        }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(profileApi.getActivity).toHaveBeenCalledWith({ days: 30, limit: 50 });

      // Note: In a real scenario with proper query key dependencies,
      // changing props would trigger a refetch. This test verifies
      // the hook accepts different options.
      rerender({ days: 7, limit: 100 });

      await waitFor(() => expect(profileApi.getActivity).toHaveBeenCalledTimes(2));
      expect(profileApi.getActivity).toHaveBeenLastCalledWith({ days: 7, limit: 100 });
    });

    it('handles activity data with various event types', async () => {
      const mockActivity = {
        activities: [
          { _id: '1', type: 'note.created', entityType: 'note', entityId: 'note123' },
          { _id: '2', type: 'note.updated', entityType: 'note', entityId: 'note123' },
          { _id: '3', type: 'task.created', entityType: 'task', entityId: 'task123' },
          { _id: '4', type: 'task.completed', entityType: 'task', entityId: 'task456' },
          { _id: '5', type: 'project.created', entityType: 'project', entityId: 'proj123' },
          { _id: '6', type: 'file.uploaded', entityType: 'file', entityId: 'file123' },
        ],
        total: 6,
      };
      profileApi.getActivity.mockResolvedValueOnce({ data: mockActivity });

      const { result } = renderHook(() => useUserActivity(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data.activities).toHaveLength(6);
      expect(result.current.data.activities[0].type).toBe('note.created');
      expect(result.current.data.activities[3].type).toBe('task.completed');
    });

    it('handles network timeout error', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.code = 'ETIMEDOUT';
      profileApi.getActivity.mockRejectedValueOnce(timeoutError);

      const { result } = renderHook(() => useUserActivity(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error.message).toBe('Network timeout');
    });

    it('handles 401 unauthorized error', async () => {
      const unauthorizedError = new Error('Unauthorized');
      unauthorizedError.response = { status: 401 };
      profileApi.getActivity.mockRejectedValueOnce(unauthorizedError);

      const { result } = renderHook(() => useUserActivity(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error.message).toBe('Unauthorized');
    });
  });
});
