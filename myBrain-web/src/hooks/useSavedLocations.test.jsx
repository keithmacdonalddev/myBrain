import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useSavedLocations,
  useSavedLocation,
  useCreateSavedLocation,
  useUpdateSavedLocation,
  useDeleteSavedLocation,
  useSetDefaultLocation,
  useReorderSavedLocations,
  savedLocationsKeys,
} from './useSavedLocations';

// Mock the API module
vi.mock('../lib/api', () => ({
  savedLocationsApi: {
    getLocations: vi.fn(),
    getLocation: vi.fn(),
    createLocation: vi.fn(),
    updateLocation: vi.fn(),
    deleteLocation: vi.fn(),
    setDefault: vi.fn(),
    reorderLocations: vi.fn(),
  },
}));

// Import the mocked API
import { savedLocationsApi } from '../lib/api';

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

describe('useSavedLocations hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Test savedLocationsKeys factory functions
  describe('savedLocationsKeys', () => {
    it('generates correct query keys', () => {
      expect(savedLocationsKeys.all).toEqual(['savedLocations']);
      expect(savedLocationsKeys.list()).toEqual(['savedLocations', 'list']);
      expect(savedLocationsKeys.detail('123')).toEqual(['savedLocations', 'detail', '123']);
    });
  });

  // Test useSavedLocations hook
  describe('useSavedLocations', () => {
    it('fetches saved locations successfully', async () => {
      const mockLocations = [
        { _id: '1', name: 'Home', lat: 40.7128, lng: -74.006 },
        { _id: '2', name: 'Work', lat: 40.758, lng: -73.9855 },
      ];
      savedLocationsApi.getLocations.mockResolvedValueOnce({
        data: { data: mockLocations },
      });

      const { result } = renderHook(() => useSavedLocations(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data to load
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockLocations);
      expect(savedLocationsApi.getLocations).toHaveBeenCalled();
    });

    it('handles error when fetching locations fails', async () => {
      const error = new Error('Failed to fetch locations');
      savedLocationsApi.getLocations.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useSavedLocations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error.message).toBe('Failed to fetch locations');
    });

    it('returns empty array when no locations exist', async () => {
      savedLocationsApi.getLocations.mockResolvedValueOnce({
        data: { data: [] },
      });

      const { result } = renderHook(() => useSavedLocations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual([]);
    });
  });

  // Test useSavedLocation hook
  describe('useSavedLocation', () => {
    it('fetches a single location by ID', async () => {
      const mockLocation = { _id: '123', name: 'Home', lat: 40.7128, lng: -74.006 };
      savedLocationsApi.getLocation.mockResolvedValueOnce({
        data: { data: mockLocation },
      });

      const { result } = renderHook(() => useSavedLocation('123'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockLocation);
      expect(savedLocationsApi.getLocation).toHaveBeenCalledWith('123');
    });

    it('does not fetch when ID is not provided', async () => {
      const { result } = renderHook(() => useSavedLocation(null), {
        wrapper: createWrapper(),
      });

      // Should not be loading because query is disabled
      expect(result.current.fetchStatus).toBe('idle');
      expect(savedLocationsApi.getLocation).not.toHaveBeenCalled();
    });

    it('does not fetch when ID is undefined', async () => {
      const { result } = renderHook(() => useSavedLocation(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(savedLocationsApi.getLocation).not.toHaveBeenCalled();
    });

    it('handles error when fetching single location fails', async () => {
      savedLocationsApi.getLocation.mockRejectedValueOnce(new Error('Not found'));

      const { result } = renderHook(() => useSavedLocation('999'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useCreateSavedLocation mutation
  describe('useCreateSavedLocation', () => {
    it('creates a saved location successfully', async () => {
      const newLocation = { name: 'New Place', lat: 41.0, lng: -75.0 };
      const createdLocation = { _id: 'new-id', ...newLocation };
      savedLocationsApi.createLocation.mockResolvedValueOnce({
        data: { data: createdLocation },
      });

      const { result } = renderHook(() => useCreateSavedLocation(), {
        wrapper: createWrapper(),
      });

      let returnedData;
      await act(async () => {
        returnedData = await result.current.mutateAsync(newLocation);
      });

      expect(savedLocationsApi.createLocation).toHaveBeenCalledWith(newLocation);
      expect(returnedData).toEqual(createdLocation);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when creating location fails', async () => {
      savedLocationsApi.createLocation.mockRejectedValueOnce(new Error('Create failed'));

      const { result } = renderHook(() => useCreateSavedLocation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({ name: 'Bad Location' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUpdateSavedLocation mutation
  describe('useUpdateSavedLocation', () => {
    it('updates a saved location successfully', async () => {
      const updatedLocation = { _id: '123', name: 'Updated Home', lat: 40.72, lng: -74.01 };
      savedLocationsApi.updateLocation.mockResolvedValueOnce({
        data: { data: updatedLocation },
      });

      const { result } = renderHook(() => useUpdateSavedLocation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: '123',
          data: { name: 'Updated Home' },
        });
      });

      expect(savedLocationsApi.updateLocation).toHaveBeenCalledWith('123', {
        name: 'Updated Home',
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when updating location fails', async () => {
      savedLocationsApi.updateLocation.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useUpdateSavedLocation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: '123', data: {} });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useDeleteSavedLocation mutation
  describe('useDeleteSavedLocation', () => {
    it('deletes a saved location successfully', async () => {
      savedLocationsApi.deleteLocation.mockResolvedValueOnce({
        data: { data: { success: true } },
      });

      const { result } = renderHook(() => useDeleteSavedLocation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(savedLocationsApi.deleteLocation).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when deleting location fails', async () => {
      savedLocationsApi.deleteLocation.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useDeleteSavedLocation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync('123');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useSetDefaultLocation mutation
  describe('useSetDefaultLocation', () => {
    it('sets a location as default successfully', async () => {
      const defaultLocation = { _id: '123', name: 'Home', isDefault: true };
      savedLocationsApi.setDefault.mockResolvedValueOnce({
        data: { data: defaultLocation },
      });

      const { result } = renderHook(() => useSetDefaultLocation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(savedLocationsApi.setDefault).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when setting default fails', async () => {
      savedLocationsApi.setDefault.mockRejectedValueOnce(new Error('Set default failed'));

      const { result } = renderHook(() => useSetDefaultLocation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync('123');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useReorderSavedLocations mutation
  describe('useReorderSavedLocations', () => {
    it('reorders saved locations successfully', async () => {
      const orderedIds = ['id3', 'id1', 'id2'];
      savedLocationsApi.reorderLocations.mockResolvedValueOnce({
        data: { data: { success: true } },
      });

      const { result } = renderHook(() => useReorderSavedLocations(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(orderedIds);
      });

      expect(savedLocationsApi.reorderLocations).toHaveBeenCalledWith(orderedIds);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when reordering fails', async () => {
      savedLocationsApi.reorderLocations.mockRejectedValueOnce(new Error('Reorder failed'));

      const { result } = renderHook(() => useReorderSavedLocations(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync(['id1', 'id2']);
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
