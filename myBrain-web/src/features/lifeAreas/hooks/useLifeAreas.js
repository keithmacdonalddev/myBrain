import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { lifeAreasApi } from '../../../lib/api';
import {
  updateLifeAreaInStore,
  addLifeAreaToStore,
  removeLifeAreaFromStore,
  reorderLifeAreasInStore,
} from '../../../store/lifeAreasSlice';

// Query keys
export const lifeAreaKeys = {
  all: ['lifeAreas'],
  lists: () => [...lifeAreaKeys.all, 'list'],
  list: (includeArchived) => [...lifeAreaKeys.lists(), { includeArchived }],
  details: () => [...lifeAreaKeys.all, 'detail'],
  detail: (id) => [...lifeAreaKeys.details(), id],
  items: (id) => [...lifeAreaKeys.all, 'items', id],
};

/**
 * Hook to fetch life areas
 */
export function useLifeAreas(includeArchived = false) {
  return useQuery({
    queryKey: lifeAreaKeys.list(includeArchived),
    queryFn: async () => {
      const response = await lifeAreasApi.getLifeAreas(includeArchived);
      return response.data.lifeAreas;
    },
  });
}

/**
 * Hook to fetch a single life area
 */
export function useLifeArea(id, includeCounts = false) {
  return useQuery({
    queryKey: lifeAreaKeys.detail(id),
    queryFn: async () => {
      const response = await lifeAreasApi.getLifeArea(id, includeCounts);
      return response.data.lifeArea;
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch items in a life area
 */
export function useLifeAreaItems(id, params = {}) {
  return useQuery({
    queryKey: lifeAreaKeys.items(id),
    queryFn: async () => {
      const response = await lifeAreasApi.getLifeAreaItems(id, params);
      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to create a life area
 */
export function useCreateLifeArea() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  return useMutation({
    mutationFn: (data) => lifeAreasApi.createLifeArea(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: lifeAreaKeys.lists() });
      dispatch(addLifeAreaToStore(response.data.lifeArea));
    },
  });
}

/**
 * Hook to update a life area
 */
export function useUpdateLifeArea() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  return useMutation({
    mutationFn: ({ id, data }) => lifeAreasApi.updateLifeArea(id, data),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: lifeAreaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: lifeAreaKeys.detail(id) });
      dispatch(updateLifeAreaInStore(response.data.lifeArea));
    },
  });
}

/**
 * Hook to delete a life area
 */
export function useDeleteLifeArea() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  return useMutation({
    mutationFn: (id) => lifeAreasApi.deleteLifeArea(id),
    onSuccess: (response, id) => {
      queryClient.invalidateQueries({ queryKey: lifeAreaKeys.lists() });
      dispatch(removeLifeAreaFromStore(id));
    },
  });
}

/**
 * Hook to set a life area as default
 */
export function useSetDefaultLifeArea() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => lifeAreasApi.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lifeAreaKeys.lists() });
    },
  });
}

/**
 * Hook to reorder life areas
 */
export function useReorderLifeAreas() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  return useMutation({
    mutationFn: (orderedIds) => lifeAreasApi.reorderLifeAreas(orderedIds),
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: lifeAreaKeys.lists() });

      const previousLifeAreas = queryClient.getQueryData(lifeAreaKeys.list(false));

      if (previousLifeAreas) {
        const reordered = orderedIds
          .map((id) => previousLifeAreas.find((la) => la._id === id))
          .filter(Boolean);
        queryClient.setQueryData(lifeAreaKeys.list(false), reordered);
        dispatch(reorderLifeAreasInStore(reordered));
      }

      return { previousLifeAreas };
    },
    onError: (err, variables, context) => {
      if (context?.previousLifeAreas) {
        queryClient.setQueryData(lifeAreaKeys.list(false), context.previousLifeAreas);
        dispatch(reorderLifeAreasInStore(context.previousLifeAreas));
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: lifeAreaKeys.lists() });
    },
  });
}

/**
 * Hook to archive/unarchive a life area
 */
export function useArchiveLifeArea() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();

  return useMutation({
    mutationFn: ({ id, isArchived }) => lifeAreasApi.archiveLifeArea(id, isArchived),
    onSuccess: (response, { id }) => {
      queryClient.invalidateQueries({ queryKey: lifeAreaKeys.lists() });
      queryClient.invalidateQueries({ queryKey: lifeAreaKeys.detail(id) });
      dispatch(updateLifeAreaInStore(response.data.lifeArea));
    },
  });
}
