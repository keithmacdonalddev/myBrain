import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savedLocationsApi } from '../lib/api';

// Query keys
export const savedLocationsKeys = {
  all: ['savedLocations'],
  list: () => [...savedLocationsKeys.all, 'list'],
  detail: (id) => [...savedLocationsKeys.all, 'detail', id],
};

/**
 * Hook to get all saved locations
 */
export function useSavedLocations() {
  return useQuery({
    queryKey: savedLocationsKeys.list(),
    queryFn: async () => {
      const response = await savedLocationsApi.getLocations();
      return response.data.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get a single saved location
 */
export function useSavedLocation(id) {
  return useQuery({
    queryKey: savedLocationsKeys.detail(id),
    queryFn: async () => {
      const response = await savedLocationsApi.getLocation(id);
      return response.data.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to create a saved location
 */
export function useCreateSavedLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await savedLocationsApi.createLocation(data);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedLocationsKeys.all });
    },
  });
}

/**
 * Hook to update a saved location
 */
export function useUpdateSavedLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await savedLocationsApi.updateLocation(id, data);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: savedLocationsKeys.all });
      queryClient.setQueryData(savedLocationsKeys.detail(data._id), data);
    },
  });
}

/**
 * Hook to delete a saved location
 */
export function useDeleteSavedLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const response = await savedLocationsApi.deleteLocation(id);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedLocationsKeys.all });
    },
  });
}

/**
 * Hook to set a location as default
 */
export function useSetDefaultLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const response = await savedLocationsApi.setDefault(id);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedLocationsKeys.all });
    },
  });
}

/**
 * Hook to reorder saved locations
 */
export function useReorderSavedLocations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds) => {
      const response = await savedLocationsApi.reorderLocations(orderedIds);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: savedLocationsKeys.all });
    },
  });
}

export default {
  useSavedLocations,
  useSavedLocation,
  useCreateSavedLocation,
  useUpdateSavedLocation,
  useDeleteSavedLocation,
  useSetDefaultLocation,
  useReorderSavedLocations,
};
