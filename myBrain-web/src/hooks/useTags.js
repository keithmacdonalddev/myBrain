import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsApi } from '../lib/api';

// Query keys
export const tagKeys = {
  all: ['tags'],
  allTags: () => [...tagKeys.all, 'all'],
  popular: () => [...tagKeys.all, 'popular'],
  search: (query) => [...tagKeys.all, 'search', query],
};

/**
 * Hook to get active tags sorted by popularity (for autocomplete)
 */
export function useTags(options = {}) {
  return useQuery({
    queryKey: tagKeys.all,
    queryFn: async () => {
      const response = await tagsApi.getTags(options);
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get ALL tags including inactive (for management)
 */
export function useAllTags(options = {}) {
  return useQuery({
    queryKey: tagKeys.allTags(),
    queryFn: async () => {
      const response = await tagsApi.getAllTags(options);
      return response.data;
    },
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to get popular tags (top N)
 */
export function usePopularTags(limit = 10) {
  return useQuery({
    queryKey: tagKeys.popular(),
    queryFn: async () => {
      const response = await tagsApi.getPopularTags(limit);
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to search tags
 */
export function useSearchTags(query, options = {}) {
  return useQuery({
    queryKey: tagKeys.search(query),
    queryFn: async () => {
      if (!query || query.length < 1) {
        return { tags: [] };
      }
      const response = await tagsApi.searchTags(query);
      return response.data;
    },
    enabled: query?.length >= 1,
    staleTime: 1000 * 60, // 1 minute
    ...options,
  });
}

/**
 * Hook to create a new tag
 */
export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => tagsApi.createTag(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
  });
}

/**
 * Hook to track tag usage (typically called automatically by backend)
 */
export function useTrackTagUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tags) => tagsApi.trackUsage(tags),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
  });
}

/**
 * Hook to rename a tag
 */
export function useRenameTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ oldName, newName }) => tagsApi.renameTag(oldName, newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
  });
}

/**
 * Hook to merge tags
 */
export function useMergeTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sourceTags, targetTag }) => tagsApi.mergeTags(sourceTags, targetTag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
  });
}

/**
 * Hook to update a tag (e.g., set color, isActive)
 */
export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, data }) => tagsApi.updateTag(name, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
  });
}

/**
 * Hook to delete a tag
 */
export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name) => tagsApi.deleteTag(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
    },
  });
}
