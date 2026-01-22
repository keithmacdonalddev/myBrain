import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiKeysApi } from '../lib/api';

// Query keys for API keys
export const apiKeysKeys = {
  all: ['api-keys'],
  list: () => [...apiKeysKeys.all, 'list'],
};

/**
 * Hook to get list of user's API keys
 * Returns array of API keys with safe info (no full keys)
 */
export function useApiKeys() {
  return useQuery({
    queryKey: apiKeysKeys.list(),
    queryFn: async () => {
      try {
        const response = await apiKeysApi.list();
        return response.data.data;
      } catch (err) {
        // Re-throw with the error message from the API response
        const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to load API keys';
        const error = new Error(errorMessage);
        error.response = err.response;
        throw error;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - keys don't change often
    retry: 2, // Retry twice on failure
  });
}

/**
 * Hook to create a new API key
 * Returns mutation with mutate function and status
 *
 * Usage:
 * const { mutate: createKey, isPending } = useCreateApiKey();
 * createKey({ name: 'My CLI Key' }, {
 *   onSuccess: (data) => {
 *     // data.apiKey is the full key - SHOW IT NOW!
 *     // data.prefix is the partial key
 *   }
 * });
 */
export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name) => {
      try {
        const response = await apiKeysApi.create(name);
        return response.data.data;
      } catch (err) {
        const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to create API key';
        const error = new Error(errorMessage);
        error.response = err.response;
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate the keys list to refetch with new key
      queryClient.invalidateQueries({ queryKey: apiKeysKeys.all });
    },
  });
}

/**
 * Hook to revoke (delete) an API key
 * The key will immediately stop working
 *
 * Usage:
 * const { mutate: revokeKey, isPending } = useRevokeApiKey();
 * revokeKey(keyId, {
 *   onSuccess: () => {
 *     toast.success('API key revoked');
 *   }
 * });
 */
export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyId) => {
      try {
        const response = await apiKeysApi.revoke(keyId);
        return response.data;
      } catch (err) {
        const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to revoke API key';
        const error = new Error(errorMessage);
        error.response = err.response;
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate the keys list to refetch without revoked key
      queryClient.invalidateQueries({ queryKey: apiKeysKeys.all });
    },
  });
}

export default useApiKeys;
