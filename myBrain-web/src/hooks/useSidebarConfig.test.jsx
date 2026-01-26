import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useSidebarConfig from './useSidebarConfig';

// Mock the api module
vi.mock('../lib/api', () => ({
  settingsApi: {
    getSidebarConfig: vi.fn(),
  },
}));

// Import the mocked module after mocking
import { settingsApi } from '../lib/api';

// Helper to create a fresh QueryClient for each test
const createQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries for faster tests
      },
    },
  });
};

// Helper to create wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = createQueryClient();
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSidebarConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be loading initially', () => {
    // Mock a delayed response to keep it in loading state
    settingsApi.getSidebarConfig.mockImplementation(
      () => new Promise(() => {}) // Never resolves, stays loading
    );

    const { result } = renderHook(() => useSidebarConfig(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should fetch sidebar config successfully', async () => {
    const mockSidebarConfig = {
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'Home', path: '/app', enabled: true },
        { id: 'notes', label: 'Notes', icon: 'FileText', path: '/app/notes', enabled: true },
        { id: 'tasks', label: 'Tasks', icon: 'CheckSquare', path: '/app/tasks', enabled: true },
        { id: 'calendar', label: 'Calendar', icon: 'Calendar', path: '/app/calendar', enabled: false },
      ],
      isDefault: true,
    };

    settingsApi.getSidebarConfig.mockResolvedValueOnce({ data: mockSidebarConfig });

    const { result } = renderHook(() => useSidebarConfig(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockSidebarConfig);
    expect(result.current.isLoading).toBe(false);
    expect(settingsApi.getSidebarConfig).toHaveBeenCalledTimes(1);
  });

  it('should handle API error', async () => {
    const mockError = new Error('Failed to fetch sidebar config');
    settingsApi.getSidebarConfig.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useSidebarConfig(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(mockError);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('should use "sidebar-config" as query key', async () => {
    const mockSidebarConfig = { items: [], isDefault: true };
    settingsApi.getSidebarConfig.mockResolvedValueOnce({ data: mockSidebarConfig });

    const queryClient = createQueryClient();
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSidebarConfig(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Verify the cache key by checking if data is in the cache
    const cachedData = queryClient.getQueryData(['sidebar-config']);
    expect(cachedData).toEqual(mockSidebarConfig);
  });

  it('should return empty items array when response has no items', async () => {
    const mockSidebarConfig = { items: [], isDefault: false };
    settingsApi.getSidebarConfig.mockResolvedValueOnce({ data: mockSidebarConfig });

    const { result } = renderHook(() => useSidebarConfig(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data.items).toEqual([]);
  });

  it('should not refetch automatically within staleTime', async () => {
    const mockSidebarConfig = { items: [], isDefault: true };
    settingsApi.getSidebarConfig.mockResolvedValueOnce({ data: mockSidebarConfig });

    const queryClient = createQueryClient();
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    // First render
    const { result: result1 } = renderHook(() => useSidebarConfig(), { wrapper });

    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true);
    });

    // Second render - should use cached data
    const { result: result2 } = renderHook(() => useSidebarConfig(), { wrapper });

    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true);
    });

    // API should only be called once (data is cached)
    expect(settingsApi.getSidebarConfig).toHaveBeenCalledTimes(1);
  });
});
