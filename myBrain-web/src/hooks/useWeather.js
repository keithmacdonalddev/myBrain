import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { weatherApi } from '../lib/api';

// Query keys
export const weatherKeys = {
  all: ['weather'],
  current: (location) => [...weatherKeys.all, 'current', location || 'default'],
  locations: () => [...weatherKeys.all, 'locations'],
};

/**
 * Hook to get weather data
 * @param {string} location - Optional location (uses user's profile location if not provided)
 * @param {string} units - 'metric' or 'imperial' (default: 'metric')
 */
export function useWeather(location = null, units = 'metric') {
  return useQuery({
    queryKey: weatherKeys.current(location),
    queryFn: async () => {
      try {
        const response = await weatherApi.getWeather(location, units);
        return response.data.data;
      } catch (err) {
        // Re-throw with the error message from the API response
        const errorMessage = err.response?.data?.error || err.message || 'Failed to load weather';
        const error = new Error(errorMessage);
        error.response = err.response;
        throw error;
      }
    },
    staleTime: 1000 * 60 * 15, // 15 minutes - weather doesn't change that fast
    refetchInterval: 1000 * 60 * 30, // Refetch every 30 minutes
    retry: 1, // Only retry once on failure
  });
}

/**
 * Hook to get saved weather locations
 */
export function useWeatherLocations() {
  return useQuery({
    queryKey: weatherKeys.locations(),
    queryFn: async () => {
      const response = await weatherApi.getLocations();
      return response.data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to add a weather location
 */
export function useAddWeatherLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await weatherApi.addLocation(data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weatherKeys.locations() });
    },
  });
}

/**
 * Hook to remove a weather location
 */
export function useRemoveWeatherLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const response = await weatherApi.removeLocation(id);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weatherKeys.locations() });
    },
  });
}

/**
 * Hook to set default weather location
 */
export function useSetDefaultWeatherLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const response = await weatherApi.setDefaultLocation(id);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weatherKeys.locations() });
    },
  });
}

export default useWeather;
