import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useWeather,
  useWeatherLocations,
  useAddWeatherLocation,
  useRemoveWeatherLocation,
  useSetDefaultWeatherLocation,
  weatherKeys,
} from './useWeather';

// Mock the API module
vi.mock('../lib/api', () => ({
  weatherApi: {
    getWeather: vi.fn(),
    getLocations: vi.fn(),
    addLocation: vi.fn(),
    removeLocation: vi.fn(),
    setDefaultLocation: vi.fn(),
  },
}));

// Import the mocked API
import { weatherApi } from '../lib/api';

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

describe('useWeather hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Test weatherKeys factory functions
  describe('weatherKeys', () => {
    it('generates correct query keys', () => {
      expect(weatherKeys.all).toEqual(['weather']);
      expect(weatherKeys.current(null)).toEqual(['weather', 'current', 'default']);
      expect(weatherKeys.current('New York')).toEqual(['weather', 'current', 'New York']);
      expect(weatherKeys.locations()).toEqual(['weather', 'locations']);
    });
  });

  // Test useWeather hook
  describe('useWeather', () => {
    it('fetches weather data successfully with default location', async () => {
      const mockWeather = {
        temperature: 72,
        condition: 'sunny',
        humidity: 45,
        location: 'New York',
      };
      weatherApi.getWeather.mockResolvedValueOnce({
        data: { data: mockWeather },
      });

      const { result } = renderHook(() => useWeather(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data to load
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockWeather);
      expect(weatherApi.getWeather).toHaveBeenCalledWith(null, 'metric');
    });

    it('fetches weather data for a specific location', async () => {
      const mockWeather = {
        temperature: 68,
        condition: 'cloudy',
        location: 'Los Angeles',
      };
      weatherApi.getWeather.mockResolvedValueOnce({
        data: { data: mockWeather },
      });

      const { result } = renderHook(() => useWeather('Los Angeles'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockWeather);
      expect(weatherApi.getWeather).toHaveBeenCalledWith('Los Angeles', 'metric');
    });

    it('uses imperial units when specified', async () => {
      weatherApi.getWeather.mockResolvedValueOnce({
        data: { data: { temperature: 72 } },
      });

      renderHook(() => useWeather('Boston', 'imperial'), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(weatherApi.getWeather).toHaveBeenCalledWith('Boston', 'imperial')
      );
    });

    it('handles error when fetching weather fails', async () => {
      const errorResponse = {
        response: {
          data: { error: 'Location not found' },
        },
        message: 'Request failed',
      };
      // Mock rejection twice because useWeather has retry: 1 built into the hook
      weatherApi.getWeather
        .mockRejectedValueOnce(errorResponse)
        .mockRejectedValueOnce(errorResponse);

      const { result } = renderHook(() => useWeather('Invalid Location'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });

      expect(result.current.error.message).toBe('Location not found');
    });

    it('uses generic error message when API error is not available', async () => {
      const error = new Error('Network error');
      // Mock rejection twice because useWeather has retry: 1 built into the hook
      weatherApi.getWeather
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error);

      const { result } = renderHook(() => useWeather(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });

      expect(result.current.error.message).toBe('Network error');
    });

    it('uses fallback error message when no message is available', async () => {
      const error = {};
      // Mock rejection twice because useWeather has retry: 1 built into the hook
      weatherApi.getWeather
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error);

      const { result } = renderHook(() => useWeather(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });

      expect(result.current.error.message).toBe('Failed to load weather');
    });
  });

  // Test useWeatherLocations hook
  describe('useWeatherLocations', () => {
    it('fetches weather locations successfully', async () => {
      const mockLocations = [
        { _id: '1', name: 'New York', isDefault: true },
        { _id: '2', name: 'Los Angeles', isDefault: false },
      ];
      weatherApi.getLocations.mockResolvedValueOnce({
        data: { data: mockLocations },
      });

      const { result } = renderHook(() => useWeatherLocations(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data to load
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockLocations);
      expect(weatherApi.getLocations).toHaveBeenCalled();
    });

    it('handles error when fetching locations fails', async () => {
      weatherApi.getLocations.mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useWeatherLocations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('returns empty array when no locations exist', async () => {
      weatherApi.getLocations.mockResolvedValueOnce({
        data: { data: [] },
      });

      const { result } = renderHook(() => useWeatherLocations(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual([]);
    });
  });

  // Test useAddWeatherLocation mutation
  describe('useAddWeatherLocation', () => {
    it('adds a weather location successfully', async () => {
      const newLocation = { name: 'Chicago', lat: 41.8781, lng: -87.6298 };
      const addedLocation = { _id: 'new-id', ...newLocation, isDefault: false };
      weatherApi.addLocation.mockResolvedValueOnce({
        data: { data: addedLocation },
      });

      const { result } = renderHook(() => useAddWeatherLocation(), {
        wrapper: createWrapper(),
      });

      let returnedData;
      await act(async () => {
        returnedData = await result.current.mutateAsync(newLocation);
      });

      expect(weatherApi.addLocation).toHaveBeenCalledWith(newLocation);
      expect(returnedData).toEqual(addedLocation);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when adding location fails', async () => {
      weatherApi.addLocation.mockRejectedValueOnce(new Error('Add failed'));

      const { result } = renderHook(() => useAddWeatherLocation(), {
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

  // Test useRemoveWeatherLocation mutation
  describe('useRemoveWeatherLocation', () => {
    it('removes a weather location successfully', async () => {
      weatherApi.removeLocation.mockResolvedValueOnce({
        data: { data: { success: true } },
      });

      const { result } = renderHook(() => useRemoveWeatherLocation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('location-id');
      });

      expect(weatherApi.removeLocation).toHaveBeenCalledWith('location-id');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when removing location fails', async () => {
      weatherApi.removeLocation.mockRejectedValueOnce(new Error('Remove failed'));

      const { result } = renderHook(() => useRemoveWeatherLocation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync('location-id');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useSetDefaultWeatherLocation mutation
  describe('useSetDefaultWeatherLocation', () => {
    it('sets a weather location as default successfully', async () => {
      const defaultLocation = { _id: '123', name: 'Boston', isDefault: true };
      weatherApi.setDefaultLocation.mockResolvedValueOnce({
        data: { data: defaultLocation },
      });

      const { result } = renderHook(() => useSetDefaultWeatherLocation(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(weatherApi.setDefaultLocation).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when setting default fails', async () => {
      weatherApi.setDefaultLocation.mockRejectedValueOnce(
        new Error('Set default failed')
      );

      const { result } = renderHook(() => useSetDefaultWeatherLocation(), {
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
});
