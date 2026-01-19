import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { imagesApi } from '../../../lib/api';

// Query keys
export const imageKeys = {
  all: ['images'],
  lists: () => [...imageKeys.all, 'list'],
  list: (params) => [...imageKeys.lists(), params],
  details: () => [...imageKeys.all, 'detail'],
  detail: (id) => [...imageKeys.details(), id],
  search: (params) => [...imageKeys.all, 'search', params],
  tags: () => [...imageKeys.all, 'tags'],
  limits: () => [...imageKeys.all, 'limits'],
};

/**
 * Hook to fetch images with filtering and sorting
 */
export function useImages(params = {}) {
  return useQuery({
    queryKey: imageKeys.list(params),
    queryFn: () => imagesApi.getImages(params).then(res => res.data),
  });
}

/**
 * Hook to fetch a single image
 */
export function useImage(id) {
  return useQuery({
    queryKey: imageKeys.detail(id),
    queryFn: () => imagesApi.getImage(id).then(res => res.data.image),
    enabled: !!id,
  });
}

/**
 * Hook to search images
 */
export function useSearchImages(params = {}) {
  return useQuery({
    queryKey: imageKeys.search(params),
    queryFn: () => imagesApi.searchImages(params).then(res => res.data),
    enabled: !!params.q || !!params.tags?.length || params.favorite !== undefined,
  });
}

/**
 * Hook to fetch image tags
 */
export function useImageTags() {
  return useQuery({
    queryKey: imageKeys.tags(),
    queryFn: () => imagesApi.getImageTags().then(res => res.data.tags),
  });
}

/**
 * Hook to fetch image limits
 */
export function useImageLimits() {
  return useQuery({
    queryKey: imageKeys.limits(),
    queryFn: () => imagesApi.getImageLimits().then(res => res.data),
    staleTime: 30000, // Cache for 30 seconds
  });
}

/**
 * Hook to upload an image
 */
export function useUploadImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, options }) => imagesApi.uploadImage(file, options).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: imageKeys.lists() });
      queryClient.invalidateQueries({ queryKey: imageKeys.limits() });
      queryClient.invalidateQueries({ queryKey: imageKeys.tags() });
    },
  });
}

/**
 * Hook to update an image
 */
export function useUpdateImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => imagesApi.updateImage(id, data).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: imageKeys.lists() });
      queryClient.invalidateQueries({ queryKey: imageKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: imageKeys.tags() });
    },
  });
}

/**
 * Hook to toggle favorite status
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => imagesApi.toggleFavorite(id).then(res => res.data),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: imageKeys.detail(id) });

      // Snapshot previous value
      const previousImage = queryClient.getQueryData(imageKeys.detail(id));

      // Optimistically update
      if (previousImage) {
        queryClient.setQueryData(imageKeys.detail(id), {
          ...previousImage,
          favorite: !previousImage.favorite,
        });
      }

      return { previousImage };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousImage) {
        queryClient.setQueryData(imageKeys.detail(id), context.previousImage);
      }
    },
    onSettled: (data, error, id) => {
      queryClient.invalidateQueries({ queryKey: imageKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: imageKeys.lists() });
    },
  });
}

/**
 * Hook to delete an image
 */
export function useDeleteImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => imagesApi.deleteImage(id).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: imageKeys.lists() });
      queryClient.invalidateQueries({ queryKey: imageKeys.limits() });
    },
  });
}

/**
 * Hook to bulk delete images
 */
export function useBulkDeleteImages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids) => imagesApi.bulkDeleteImages(ids).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: imageKeys.lists() });
      queryClient.invalidateQueries({ queryKey: imageKeys.limits() });
    },
  });
}
