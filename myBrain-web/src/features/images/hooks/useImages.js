import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { imagesApi } from '../../../lib/api';

export function useImages(params = {}) {
  return useQuery({
    queryKey: ['images', params],
    queryFn: () => imagesApi.getImages(params).then(res => res.data),
  });
}

export function useImage(id) {
  return useQuery({
    queryKey: ['images', id],
    queryFn: () => imagesApi.getImage(id).then(res => res.data),
    enabled: !!id,
  });
}

export function useUploadImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, options }) => imagesApi.uploadImage(file, options).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] });
    },
  });
}

export function useUpdateImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => imagesApi.updateImage(id, data).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['images'] });
      queryClient.invalidateQueries({ queryKey: ['images', variables.id] });
    },
  });
}

export function useDeleteImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => imagesApi.deleteImage(id).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['images'] });
    },
  });
}
