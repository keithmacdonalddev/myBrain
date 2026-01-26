import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFiles,
  useFile,
  useSearchFiles,
  useRecentFiles,
  useTrashedFiles,
  useFileTags,
  useFileLimits,
  useStorageStats,
  useFileVersions,
  useFileShares,
  useFilesForEntity,
  useUploadFile,
  useUpdateFile,
  useToggleFileFavorite,
  useMoveFile,
  useCopyFile,
  useTrashFile,
  useRestoreFile,
  useDeleteFile,
  useBulkMoveFiles,
  useBulkTrashFiles,
  useBulkDeleteFiles,
  useEmptyTrash,
  useCreateFileShare,
  useRevokeFileShares,
  useLinkFile,
  useUnlinkFile,
  useDownloadFile,
  fileKeys,
} from './useFiles';

// Mock the API module
vi.mock('../../../lib/api', () => ({
  filesApi: {
    getFiles: vi.fn(),
    getFile: vi.fn(),
    searchFiles: vi.fn(),
    getRecentFiles: vi.fn(),
    getTrashedFiles: vi.fn(),
    getFileTags: vi.fn(),
    getFileLimits: vi.fn(),
    getStorageStats: vi.fn(),
    getFileVersions: vi.fn(),
    getFileShares: vi.fn(),
    getFilesForEntity: vi.fn(),
    uploadFile: vi.fn(),
    updateFile: vi.fn(),
    toggleFavorite: vi.fn(),
    moveFile: vi.fn(),
    copyFile: vi.fn(),
    trashFile: vi.fn(),
    restoreFile: vi.fn(),
    deleteFile: vi.fn(),
    bulkMoveFiles: vi.fn(),
    bulkTrashFiles: vi.fn(),
    bulkDeleteFiles: vi.fn(),
    emptyTrash: vi.fn(),
    createFileShare: vi.fn(),
    revokeFileShares: vi.fn(),
    linkFile: vi.fn(),
    unlinkFile: vi.fn(),
    getDownloadUrl: vi.fn(),
  },
}));

// Import the mocked API
import { filesApi } from '../../../lib/api';

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

describe('useFiles hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Test fileKeys factory functions
  describe('fileKeys', () => {
    it('generates correct query keys', () => {
      expect(fileKeys.all).toEqual(['files']);
      expect(fileKeys.lists()).toEqual(['files', 'list']);
      expect(fileKeys.list({ folderId: '123' })).toEqual([
        'files',
        'list',
        { folderId: '123' },
      ]);
      expect(fileKeys.details()).toEqual(['files', 'detail']);
      expect(fileKeys.detail('file1')).toEqual(['files', 'detail', 'file1']);
      expect(fileKeys.search({ q: 'test' })).toEqual([
        'files',
        'search',
        { q: 'test' },
      ]);
      expect(fileKeys.recent()).toEqual(['files', 'recent']);
      expect(fileKeys.trash()).toEqual(['files', 'trash']);
      expect(fileKeys.tags()).toEqual(['files', 'tags']);
      expect(fileKeys.limits()).toEqual(['files', 'limits']);
      expect(fileKeys.stats()).toEqual(['files', 'stats']);
      expect(fileKeys.versions('file1')).toEqual(['files', 'versions', 'file1']);
      expect(fileKeys.shares('file1')).toEqual(['files', 'shares', 'file1']);
      expect(fileKeys.entity('project', 'proj1')).toEqual([
        'files',
        'entity',
        'project',
        'proj1',
      ]);
    });
  });

  // Test useFiles hook
  describe('useFiles', () => {
    it('fetches files successfully', async () => {
      const mockFiles = {
        files: [
          { _id: 'file1', name: 'doc.pdf', size: 1024 },
          { _id: 'file2', name: 'image.png', size: 2048 },
        ],
        total: 2,
      };
      filesApi.getFiles.mockResolvedValueOnce({ data: mockFiles });

      const { result } = renderHook(() => useFiles(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockFiles);
      expect(filesApi.getFiles).toHaveBeenCalledWith({});
    });

    it('handles error when fetching files fails', async () => {
      filesApi.getFiles.mockRejectedValueOnce(new Error('Failed to fetch'));

      const { result } = renderHook(() => useFiles(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });

    it('passes params to API call', async () => {
      filesApi.getFiles.mockResolvedValueOnce({ data: { files: [] } });

      renderHook(() => useFiles({ folderId: '123', sort: 'name' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(filesApi.getFiles).toHaveBeenCalledWith({
          folderId: '123',
          sort: 'name',
        })
      );
    });
  });

  // Test useFile hook
  describe('useFile', () => {
    it('fetches a single file by ID', async () => {
      const mockFile = { _id: 'file1', name: 'doc.pdf', size: 1024 };
      filesApi.getFile.mockResolvedValueOnce({ data: { file: mockFile } });

      const { result } = renderHook(() => useFile('file1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockFile);
      expect(filesApi.getFile).toHaveBeenCalledWith('file1');
    });

    it('does not fetch when ID is not provided', async () => {
      const { result } = renderHook(() => useFile(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(filesApi.getFile).not.toHaveBeenCalled();
    });

    it('handles error when fetching file fails', async () => {
      filesApi.getFile.mockRejectedValueOnce(new Error('Not found'));

      const { result } = renderHook(() => useFile('file1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useSearchFiles hook
  describe('useSearchFiles', () => {
    it('searches files when query is provided', async () => {
      const mockResults = {
        files: [{ _id: 'file1', name: 'test.pdf' }],
      };
      filesApi.searchFiles.mockResolvedValueOnce({ data: mockResults });

      const { result } = renderHook(() => useSearchFiles({ q: 'test' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockResults);
      expect(filesApi.searchFiles).toHaveBeenCalledWith({ q: 'test' });
    });

    it('does not search when query is empty', async () => {
      const { result } = renderHook(() => useSearchFiles({}), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(filesApi.searchFiles).not.toHaveBeenCalled();
    });

    it('handles error when search fails', async () => {
      filesApi.searchFiles.mockRejectedValueOnce(new Error('Search failed'));

      const { result } = renderHook(() => useSearchFiles({ q: 'test' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useRecentFiles hook
  describe('useRecentFiles', () => {
    it('fetches recent files with default limit', async () => {
      const mockFiles = [{ _id: 'file1', name: 'recent.pdf' }];
      filesApi.getRecentFiles.mockResolvedValueOnce({
        data: { files: mockFiles },
      });

      const { result } = renderHook(() => useRecentFiles(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockFiles);
      expect(filesApi.getRecentFiles).toHaveBeenCalledWith(10);
    });

    it('fetches recent files with custom limit', async () => {
      filesApi.getRecentFiles.mockResolvedValueOnce({ data: { files: [] } });

      renderHook(() => useRecentFiles(5), {
        wrapper: createWrapper(),
      });

      await waitFor(() =>
        expect(filesApi.getRecentFiles).toHaveBeenCalledWith(5)
      );
    });

    it('handles error when fetching recent files fails', async () => {
      filesApi.getRecentFiles.mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useRecentFiles(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useTrashedFiles hook
  describe('useTrashedFiles', () => {
    it('fetches trashed files successfully', async () => {
      const mockFiles = { files: [{ _id: 'file1', name: 'deleted.pdf' }] };
      filesApi.getTrashedFiles.mockResolvedValueOnce({ data: mockFiles });

      const { result } = renderHook(() => useTrashedFiles(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockFiles);
    });

    it('handles error when fetching trashed files fails', async () => {
      filesApi.getTrashedFiles.mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useTrashedFiles(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useFileTags hook
  describe('useFileTags', () => {
    it('fetches file tags successfully', async () => {
      const mockTags = ['work', 'personal', 'important'];
      filesApi.getFileTags.mockResolvedValueOnce({ data: { tags: mockTags } });

      const { result } = renderHook(() => useFileTags(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockTags);
    });

    it('handles error when fetching tags fails', async () => {
      filesApi.getFileTags.mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useFileTags(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useFileLimits hook
  describe('useFileLimits', () => {
    it('fetches file limits successfully', async () => {
      const mockLimits = { maxFileSize: 10485760, maxStorageSize: 1073741824 };
      filesApi.getFileLimits.mockResolvedValueOnce({ data: mockLimits });

      const { result } = renderHook(() => useFileLimits(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockLimits);
    });

    it('handles error when fetching limits fails', async () => {
      filesApi.getFileLimits.mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useFileLimits(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useStorageStats hook
  describe('useStorageStats', () => {
    it('fetches storage stats successfully', async () => {
      const mockStats = { used: 5242880, total: 1073741824, fileCount: 50 };
      filesApi.getStorageStats.mockResolvedValueOnce({ data: mockStats });

      const { result } = renderHook(() => useStorageStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockStats);
    });

    it('handles error when fetching stats fails', async () => {
      filesApi.getStorageStats.mockRejectedValueOnce(new Error('API error'));

      const { result } = renderHook(() => useStorageStats(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useFileVersions hook
  describe('useFileVersions', () => {
    it('fetches file versions successfully', async () => {
      const mockVersions = [
        { _id: 'v1', version: 1, createdAt: '2024-01-01' },
        { _id: 'v2', version: 2, createdAt: '2024-01-02' },
      ];
      filesApi.getFileVersions.mockResolvedValueOnce({
        data: { versions: mockVersions },
      });

      const { result } = renderHook(() => useFileVersions('file1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockVersions);
      expect(filesApi.getFileVersions).toHaveBeenCalledWith('file1');
    });

    it('does not fetch when ID is not provided', async () => {
      const { result } = renderHook(() => useFileVersions(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(filesApi.getFileVersions).not.toHaveBeenCalled();
    });
  });

  // Test useFileShares hook
  describe('useFileShares', () => {
    it('fetches file shares successfully', async () => {
      const mockShares = [{ _id: 'share1', sharedWith: 'user2' }];
      filesApi.getFileShares.mockResolvedValueOnce({
        data: { shares: mockShares },
      });

      const { result } = renderHook(() => useFileShares('file1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockShares);
    });

    it('does not fetch when ID is not provided', async () => {
      const { result } = renderHook(() => useFileShares(null), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(filesApi.getFileShares).not.toHaveBeenCalled();
    });
  });

  // Test useFilesForEntity hook
  describe('useFilesForEntity', () => {
    it('fetches files for entity successfully', async () => {
      const mockFiles = [{ _id: 'file1', name: 'project-file.pdf' }];
      filesApi.getFilesForEntity.mockResolvedValueOnce({
        data: { files: mockFiles },
      });

      const { result } = renderHook(
        () => useFilesForEntity('project', 'proj1'),
        {
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockFiles);
      expect(filesApi.getFilesForEntity).toHaveBeenCalledWith('project', 'proj1');
    });

    it('does not fetch when entityType is not provided', async () => {
      const { result } = renderHook(() => useFilesForEntity(null, 'proj1'), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(filesApi.getFilesForEntity).not.toHaveBeenCalled();
    });

    it('does not fetch when entityId is not provided', async () => {
      const { result } = renderHook(() => useFilesForEntity('project', null), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(filesApi.getFilesForEntity).not.toHaveBeenCalled();
    });
  });

  // Test useUploadFile mutation
  describe('useUploadFile', () => {
    it('uploads file successfully', async () => {
      const mockResponse = { _id: 'file-new', name: 'uploaded.pdf' };
      filesApi.uploadFile.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useUploadFile(), {
        wrapper: createWrapper(),
      });

      const mockFile = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      });

      await act(async () => {
        await result.current.mutateAsync({ file: mockFile, options: {} });
      });

      expect(filesApi.uploadFile).toHaveBeenCalledWith(mockFile, {});
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when upload fails', async () => {
      filesApi.uploadFile.mockRejectedValueOnce(new Error('Upload failed'));

      const { result } = renderHook(() => useUploadFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({ file: new File([''], 'test.pdf') });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUpdateFile mutation
  describe('useUpdateFile', () => {
    it('updates file successfully', async () => {
      const mockResponse = { _id: 'file1', name: 'renamed.pdf' };
      filesApi.updateFile.mockResolvedValueOnce({ data: mockResponse });

      const { result } = renderHook(() => useUpdateFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'file1',
          data: { name: 'renamed.pdf' },
        });
      });

      expect(filesApi.updateFile).toHaveBeenCalledWith('file1', {
        name: 'renamed.pdf',
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when update fails', async () => {
      filesApi.updateFile.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useUpdateFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: 'file1', data: {} });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useToggleFileFavorite mutation
  describe('useToggleFileFavorite', () => {
    it('toggles favorite successfully', async () => {
      filesApi.toggleFavorite.mockResolvedValueOnce({
        data: { _id: 'file1', favorite: true },
      });

      const { result } = renderHook(() => useToggleFileFavorite(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('file1');
      });

      expect(filesApi.toggleFavorite).toHaveBeenCalledWith('file1');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when toggling fails', async () => {
      filesApi.toggleFavorite.mockRejectedValueOnce(new Error('Toggle failed'));

      const { result } = renderHook(() => useToggleFileFavorite(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync('file1');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useMoveFile mutation
  describe('useMoveFile', () => {
    it('moves file successfully', async () => {
      filesApi.moveFile.mockResolvedValueOnce({
        data: { _id: 'file1', folderId: 'folder2' },
      });

      const { result } = renderHook(() => useMoveFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ id: 'file1', folderId: 'folder2' });
      });

      expect(filesApi.moveFile).toHaveBeenCalledWith('file1', 'folder2');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when move fails', async () => {
      filesApi.moveFile.mockRejectedValueOnce(new Error('Move failed'));

      const { result } = renderHook(() => useMoveFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: 'file1', folderId: 'folder2' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useCopyFile mutation
  describe('useCopyFile', () => {
    it('copies file successfully', async () => {
      filesApi.copyFile.mockResolvedValueOnce({
        data: { _id: 'file-copy', name: 'doc-copy.pdf' },
      });

      const { result } = renderHook(() => useCopyFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ id: 'file1', folderId: 'folder2' });
      });

      expect(filesApi.copyFile).toHaveBeenCalledWith('file1', 'folder2');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when copy fails', async () => {
      filesApi.copyFile.mockRejectedValueOnce(new Error('Copy failed'));

      const { result } = renderHook(() => useCopyFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: 'file1', folderId: 'folder2' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useTrashFile mutation
  describe('useTrashFile', () => {
    it('trashes file successfully', async () => {
      filesApi.trashFile.mockResolvedValueOnce({
        data: { _id: 'file1', trashed: true },
      });

      const { result } = renderHook(() => useTrashFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('file1');
      });

      expect(filesApi.trashFile).toHaveBeenCalledWith('file1');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when trash fails', async () => {
      filesApi.trashFile.mockRejectedValueOnce(new Error('Trash failed'));

      const { result } = renderHook(() => useTrashFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync('file1');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useRestoreFile mutation
  describe('useRestoreFile', () => {
    it('restores file successfully', async () => {
      filesApi.restoreFile.mockResolvedValueOnce({
        data: { _id: 'file1', trashed: false },
      });

      const { result } = renderHook(() => useRestoreFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('file1');
      });

      expect(filesApi.restoreFile).toHaveBeenCalledWith('file1');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when restore fails', async () => {
      filesApi.restoreFile.mockRejectedValueOnce(new Error('Restore failed'));

      const { result } = renderHook(() => useRestoreFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync('file1');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useDeleteFile mutation
  describe('useDeleteFile', () => {
    it('deletes file permanently', async () => {
      filesApi.deleteFile.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useDeleteFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('file1');
      });

      expect(filesApi.deleteFile).toHaveBeenCalledWith('file1');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when delete fails', async () => {
      filesApi.deleteFile.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useDeleteFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync('file1');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useBulkMoveFiles mutation
  describe('useBulkMoveFiles', () => {
    it('bulk moves files successfully', async () => {
      filesApi.bulkMoveFiles.mockResolvedValueOnce({
        data: { success: true, count: 3 },
      });

      const { result } = renderHook(() => useBulkMoveFiles(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          ids: ['file1', 'file2', 'file3'],
          folderId: 'folder2',
        });
      });

      expect(filesApi.bulkMoveFiles).toHaveBeenCalledWith(
        ['file1', 'file2', 'file3'],
        'folder2'
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when bulk move fails', async () => {
      filesApi.bulkMoveFiles.mockRejectedValueOnce(new Error('Bulk move failed'));

      const { result } = renderHook(() => useBulkMoveFiles(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({ ids: ['file1'], folderId: 'folder2' });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useBulkTrashFiles mutation
  describe('useBulkTrashFiles', () => {
    it('bulk trashes files successfully', async () => {
      filesApi.bulkTrashFiles.mockResolvedValueOnce({
        data: { success: true, count: 2 },
      });

      const { result } = renderHook(() => useBulkTrashFiles(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(['file1', 'file2']);
      });

      expect(filesApi.bulkTrashFiles).toHaveBeenCalledWith(['file1', 'file2']);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when bulk trash fails', async () => {
      filesApi.bulkTrashFiles.mockRejectedValueOnce(
        new Error('Bulk trash failed')
      );

      const { result } = renderHook(() => useBulkTrashFiles(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync(['file1']);
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useBulkDeleteFiles mutation
  describe('useBulkDeleteFiles', () => {
    it('bulk deletes files successfully', async () => {
      filesApi.bulkDeleteFiles.mockResolvedValueOnce({
        data: { success: true, count: 2 },
      });

      const { result } = renderHook(() => useBulkDeleteFiles(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync(['file1', 'file2']);
      });

      expect(filesApi.bulkDeleteFiles).toHaveBeenCalledWith(['file1', 'file2']);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when bulk delete fails', async () => {
      filesApi.bulkDeleteFiles.mockRejectedValueOnce(
        new Error('Bulk delete failed')
      );

      const { result } = renderHook(() => useBulkDeleteFiles(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync(['file1']);
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useEmptyTrash mutation
  describe('useEmptyTrash', () => {
    it('empties trash successfully', async () => {
      filesApi.emptyTrash.mockResolvedValueOnce({
        data: { success: true, count: 10 },
      });

      const { result } = renderHook(() => useEmptyTrash(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(filesApi.emptyTrash).toHaveBeenCalled();
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when emptying trash fails', async () => {
      filesApi.emptyTrash.mockRejectedValueOnce(new Error('Empty trash failed'));

      const { result } = renderHook(() => useEmptyTrash(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync();
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useCreateFileShare mutation
  describe('useCreateFileShare', () => {
    it('creates file share successfully', async () => {
      const mockShare = { _id: 'share1', shareLink: 'https://example.com/share/abc' };
      filesApi.createFileShare.mockResolvedValueOnce({ data: mockShare });

      const { result } = renderHook(() => useCreateFileShare(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'file1',
          options: { permission: 'view' },
        });
      });

      expect(filesApi.createFileShare).toHaveBeenCalledWith('file1', {
        permission: 'view',
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when creating share fails', async () => {
      filesApi.createFileShare.mockRejectedValueOnce(
        new Error('Create share failed')
      );

      const { result } = renderHook(() => useCreateFileShare(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: 'file1', options: {} });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useRevokeFileShares mutation
  describe('useRevokeFileShares', () => {
    it('revokes file shares successfully', async () => {
      filesApi.revokeFileShares.mockResolvedValueOnce({
        data: { success: true },
      });

      const { result } = renderHook(() => useRevokeFileShares(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('file1');
      });

      expect(filesApi.revokeFileShares).toHaveBeenCalledWith('file1');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when revoking shares fails', async () => {
      filesApi.revokeFileShares.mockRejectedValueOnce(
        new Error('Revoke failed')
      );

      const { result } = renderHook(() => useRevokeFileShares(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync('file1');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useLinkFile mutation
  describe('useLinkFile', () => {
    it('links file to entity successfully', async () => {
      filesApi.linkFile.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useLinkFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'file1',
          entityId: 'proj1',
          entityType: 'project',
        });
      });

      expect(filesApi.linkFile).toHaveBeenCalledWith(
        'file1',
        'proj1',
        'project'
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when linking fails', async () => {
      filesApi.linkFile.mockRejectedValueOnce(new Error('Link failed'));

      const { result } = renderHook(() => useLinkFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            id: 'file1',
            entityId: 'proj1',
            entityType: 'project',
          });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUnlinkFile mutation
  describe('useUnlinkFile', () => {
    it('unlinks file from entity successfully', async () => {
      filesApi.unlinkFile.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useUnlinkFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          id: 'file1',
          entityId: 'proj1',
          entityType: 'project',
        });
      });

      expect(filesApi.unlinkFile).toHaveBeenCalledWith(
        'file1',
        'proj1',
        'project'
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when unlinking fails', async () => {
      filesApi.unlinkFile.mockRejectedValueOnce(new Error('Unlink failed'));

      const { result } = renderHook(() => useUnlinkFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            id: 'file1',
            entityId: 'proj1',
            entityType: 'project',
          });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useDownloadFile mutation
  describe('useDownloadFile', () => {
    it('gets download URL successfully', async () => {
      const mockUrl = { url: 'https://example.com/download/file1' };
      filesApi.getDownloadUrl.mockResolvedValueOnce({ data: mockUrl });

      const { result } = renderHook(() => useDownloadFile(), {
        wrapper: createWrapper(),
      });

      let returnedData;
      await act(async () => {
        returnedData = await result.current.mutateAsync('file1');
      });

      expect(filesApi.getDownloadUrl).toHaveBeenCalledWith('file1');
      expect(returnedData).toEqual(mockUrl);
    });

    it('handles error when getting download URL fails', async () => {
      filesApi.getDownloadUrl.mockRejectedValueOnce(
        new Error('Download URL failed')
      );

      const { result } = renderHook(() => useDownloadFile(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync('file1');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
