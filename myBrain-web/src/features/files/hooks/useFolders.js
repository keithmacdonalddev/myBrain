import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { foldersApi } from '../../../lib/api';
import { fileKeys } from './useFiles';

// Query keys
export const folderKeys = {
  all: ['folders'],
  lists: () => [...folderKeys.all, 'list'],
  list: (params) => [...folderKeys.lists(), params],
  tree: () => [...folderKeys.all, 'tree'],
  details: () => [...folderKeys.all, 'detail'],
  detail: (id) => [...folderKeys.details(), id],
  breadcrumb: (id) => [...folderKeys.all, 'breadcrumb', id],
  stats: (id) => [...folderKeys.all, 'stats', id],
  trash: () => [...folderKeys.all, 'trash'],
};

/**
 * Hook to fetch folders
 */
export function useFolders(params = {}) {
  return useQuery({
    queryKey: folderKeys.list(params),
    queryFn: () => foldersApi.getFolders(params).then(res => res.data.folders),
  });
}

/**
 * Hook to fetch folder tree
 */
export function useFolderTree(params = {}) {
  return useQuery({
    queryKey: folderKeys.tree(),
    queryFn: () => foldersApi.getFolderTree(params).then(res => res.data.tree),
  });
}

/**
 * Hook to fetch a single folder with contents
 */
export function useFolder(id, params = {}) {
  return useQuery({
    queryKey: folderKeys.detail(id),
    queryFn: () => foldersApi.getFolder(id, params).then(res => res.data),
    enabled: !!id,
  });
}

/**
 * Hook to fetch folder breadcrumb
 */
export function useFolderBreadcrumb(id) {
  return useQuery({
    queryKey: folderKeys.breadcrumb(id),
    queryFn: () => foldersApi.getBreadcrumb(id).then(res => res.data.breadcrumb),
    enabled: !!id,
  });
}

/**
 * Hook to fetch folder stats
 */
export function useFolderStats(id) {
  return useQuery({
    queryKey: folderKeys.stats(id),
    queryFn: () => foldersApi.getFolderStats(id).then(res => res.data),
    enabled: !!id,
  });
}

/**
 * Hook to fetch trashed folders
 */
export function useTrashedFolders() {
  return useQuery({
    queryKey: folderKeys.trash(),
    queryFn: () => foldersApi.getTrashedFolders().then(res => res.data.folders),
  });
}

/**
 * Hook to create a folder
 */
export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => foldersApi.createFolder(data).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: folderKeys.tree() });
      if (variables.parentId) {
        queryClient.invalidateQueries({ queryKey: folderKeys.detail(variables.parentId) });
        queryClient.invalidateQueries({ queryKey: folderKeys.stats(variables.parentId) });
      }
    },
  });
}

/**
 * Hook to update a folder
 */
export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => foldersApi.updateFolder(id, data).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: folderKeys.tree() });
      queryClient.invalidateQueries({ queryKey: folderKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: folderKeys.breadcrumb(variables.id) });
    },
  });
}

/**
 * Hook to move a folder
 */
export function useMoveFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, parentId }) => foldersApi.moveFolder(id, parentId).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: folderKeys.tree() });
    },
  });
}

/**
 * Hook to trash a folder
 */
export function useTrashFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => foldersApi.trashFolder(id).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: folderKeys.tree() });
      queryClient.invalidateQueries({ queryKey: folderKeys.trash() });
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fileKeys.trash() });
    },
  });
}

/**
 * Hook to restore a folder from trash
 */
export function useRestoreFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => foldersApi.restoreFolder(id).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: folderKeys.tree() });
      queryClient.invalidateQueries({ queryKey: folderKeys.trash() });
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fileKeys.trash() });
    },
  });
}

/**
 * Hook to delete a folder permanently
 */
export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => foldersApi.deleteFolder(id).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.lists() });
      queryClient.invalidateQueries({ queryKey: folderKeys.tree() });
      queryClient.invalidateQueries({ queryKey: folderKeys.trash() });
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fileKeys.trash() });
      queryClient.invalidateQueries({ queryKey: fileKeys.limits() });
      queryClient.invalidateQueries({ queryKey: fileKeys.stats() });
    },
  });
}
