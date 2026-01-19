import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { filesApi } from '../../../lib/api';

// Query keys
export const fileKeys = {
  all: ['files'],
  lists: () => [...fileKeys.all, 'list'],
  list: (params) => [...fileKeys.lists(), params],
  details: () => [...fileKeys.all, 'detail'],
  detail: (id) => [...fileKeys.details(), id],
  search: (params) => [...fileKeys.all, 'search', params],
  recent: () => [...fileKeys.all, 'recent'],
  trash: () => [...fileKeys.all, 'trash'],
  tags: () => [...fileKeys.all, 'tags'],
  limits: () => [...fileKeys.all, 'limits'],
  stats: () => [...fileKeys.all, 'stats'],
  versions: (id) => [...fileKeys.all, 'versions', id],
  shares: (id) => [...fileKeys.all, 'shares', id],
  entity: (entityType, entityId) => [...fileKeys.all, 'entity', entityType, entityId],
};

/**
 * Hook to fetch files with filtering and sorting
 */
export function useFiles(params = {}) {
  return useQuery({
    queryKey: fileKeys.list(params),
    queryFn: () => filesApi.getFiles(params).then(res => res.data),
  });
}

/**
 * Hook to fetch a single file
 */
export function useFile(id) {
  return useQuery({
    queryKey: fileKeys.detail(id),
    queryFn: () => filesApi.getFile(id).then(res => res.data.file),
    enabled: !!id,
  });
}

/**
 * Hook to search files
 */
export function useSearchFiles(params = {}) {
  return useQuery({
    queryKey: fileKeys.search(params),
    queryFn: () => filesApi.searchFiles(params).then(res => res.data),
    enabled: !!params.q,
  });
}

/**
 * Hook to fetch recent files
 */
export function useRecentFiles(limit = 10) {
  return useQuery({
    queryKey: fileKeys.recent(),
    queryFn: () => filesApi.getRecentFiles(limit).then(res => res.data.files),
  });
}

/**
 * Hook to fetch trashed files
 */
export function useTrashedFiles(params = {}) {
  return useQuery({
    queryKey: fileKeys.trash(),
    queryFn: () => filesApi.getTrashedFiles(params).then(res => res.data),
  });
}

/**
 * Hook to fetch file tags
 */
export function useFileTags() {
  return useQuery({
    queryKey: fileKeys.tags(),
    queryFn: () => filesApi.getFileTags().then(res => res.data.tags),
  });
}

/**
 * Hook to fetch file limits
 */
export function useFileLimits() {
  return useQuery({
    queryKey: fileKeys.limits(),
    queryFn: () => filesApi.getFileLimits().then(res => res.data),
    staleTime: 30000, // Cache for 30 seconds
  });
}

/**
 * Hook to fetch storage stats
 */
export function useStorageStats() {
  return useQuery({
    queryKey: fileKeys.stats(),
    queryFn: () => filesApi.getStorageStats().then(res => res.data),
    staleTime: 60000, // Cache for 1 minute
  });
}

/**
 * Hook to fetch file versions
 */
export function useFileVersions(id) {
  return useQuery({
    queryKey: fileKeys.versions(id),
    queryFn: () => filesApi.getFileVersions(id).then(res => res.data.versions),
    enabled: !!id,
  });
}

/**
 * Hook to fetch file shares
 */
export function useFileShares(id) {
  return useQuery({
    queryKey: fileKeys.shares(id),
    queryFn: () => filesApi.getFileShares(id).then(res => res.data.shares),
    enabled: !!id,
  });
}

/**
 * Hook to fetch files for an entity
 */
export function useFilesForEntity(entityType, entityId) {
  return useQuery({
    queryKey: fileKeys.entity(entityType, entityId),
    queryFn: () => filesApi.getFilesForEntity(entityType, entityId).then(res => res.data.files),
    enabled: !!entityType && !!entityId,
  });
}

/**
 * Hook to upload a file
 */
export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, options }) => filesApi.uploadFile(file, options).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fileKeys.limits() });
      queryClient.invalidateQueries({ queryKey: fileKeys.tags() });
      queryClient.invalidateQueries({ queryKey: fileKeys.stats() });
    },
  });
}

/**
 * Hook to update a file
 */
export function useUpdateFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => filesApi.updateFile(id, data).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fileKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: fileKeys.tags() });
    },
  });
}

/**
 * Hook to toggle favorite status
 */
export function useToggleFileFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => filesApi.toggleFavorite(id).then(res => res.data),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: fileKeys.detail(id) });
      const previousFile = queryClient.getQueryData(fileKeys.detail(id));

      if (previousFile) {
        queryClient.setQueryData(fileKeys.detail(id), {
          ...previousFile,
          favorite: !previousFile.favorite,
        });
      }

      return { previousFile };
    },
    onError: (err, id, context) => {
      if (context?.previousFile) {
        queryClient.setQueryData(fileKeys.detail(id), context.previousFile);
      }
    },
    onSettled: (data, error, id) => {
      queryClient.invalidateQueries({ queryKey: fileKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
    },
  });
}

/**
 * Hook to move a file
 */
export function useMoveFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, folderId }) => filesApi.moveFile(id, folderId).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fileKeys.detail(variables.id) });
    },
  });
}

/**
 * Hook to copy a file
 */
export function useCopyFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, folderId }) => filesApi.copyFile(id, folderId).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fileKeys.limits() });
      queryClient.invalidateQueries({ queryKey: fileKeys.stats() });
    },
  });
}

/**
 * Hook to trash a file
 */
export function useTrashFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => filesApi.trashFile(id).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fileKeys.trash() });
      queryClient.invalidateQueries({ queryKey: fileKeys.stats() });
    },
  });
}

/**
 * Hook to restore a file from trash
 */
export function useRestoreFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => filesApi.restoreFile(id).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fileKeys.trash() });
      queryClient.invalidateQueries({ queryKey: fileKeys.stats() });
    },
  });
}

/**
 * Hook to delete a file permanently
 */
export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => filesApi.deleteFile(id).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fileKeys.trash() });
      queryClient.invalidateQueries({ queryKey: fileKeys.limits() });
      queryClient.invalidateQueries({ queryKey: fileKeys.stats() });
    },
  });
}

/**
 * Hook to bulk move files
 */
export function useBulkMoveFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ids, folderId }) => filesApi.bulkMoveFiles(ids, folderId).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
    },
  });
}

/**
 * Hook to bulk trash files
 */
export function useBulkTrashFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids) => filesApi.bulkTrashFiles(ids).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fileKeys.trash() });
      queryClient.invalidateQueries({ queryKey: fileKeys.stats() });
    },
  });
}

/**
 * Hook to bulk delete files
 */
export function useBulkDeleteFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids) => filesApi.bulkDeleteFiles(ids).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      queryClient.invalidateQueries({ queryKey: fileKeys.trash() });
      queryClient.invalidateQueries({ queryKey: fileKeys.limits() });
      queryClient.invalidateQueries({ queryKey: fileKeys.stats() });
    },
  });
}

/**
 * Hook to empty trash
 */
export function useEmptyTrash() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => filesApi.emptyTrash().then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: fileKeys.trash() });
      queryClient.invalidateQueries({ queryKey: fileKeys.limits() });
      queryClient.invalidateQueries({ queryKey: fileKeys.stats() });
    },
  });
}

/**
 * Hook to create a file share
 */
export function useCreateFileShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, options }) => filesApi.createFileShare(id, options).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: fileKeys.shares(variables.id) });
      queryClient.invalidateQueries({ queryKey: fileKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: fileKeys.limits() });
    },
  });
}

/**
 * Hook to revoke file shares
 */
export function useRevokeFileShares() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => filesApi.revokeFileShares(id).then(res => res.data),
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: fileKeys.shares(id) });
      queryClient.invalidateQueries({ queryKey: fileKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: fileKeys.limits() });
    },
  });
}

/**
 * Hook to link a file to an entity
 */
export function useLinkFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, entityId, entityType }) =>
      filesApi.linkFile(id, entityId, entityType).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: fileKeys.detail(variables.id) });
      queryClient.invalidateQueries({
        queryKey: fileKeys.entity(variables.entityType, variables.entityId),
      });
    },
  });
}

/**
 * Hook to unlink a file from an entity
 */
export function useUnlinkFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, entityId, entityType }) =>
      filesApi.unlinkFile(id, entityId, entityType).then(res => res.data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: fileKeys.detail(variables.id) });
      queryClient.invalidateQueries({
        queryKey: fileKeys.entity(variables.entityType, variables.entityId),
      });
    },
  });
}

/**
 * Hook to get download URL
 */
export function useDownloadFile() {
  return useMutation({
    mutationFn: (id) => filesApi.getDownloadUrl(id).then(res => res.data),
  });
}
