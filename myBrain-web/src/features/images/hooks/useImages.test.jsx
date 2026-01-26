import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useImages,
  useImage,
  useSearchImages,
  useImageTags,
  useImageLimits,
  useUploadImage,
  useUpdateImage,
  useToggleFavorite,
  useDeleteImage,
  useBulkDeleteImages,
  imageKeys,
} from './useImages';

// Mock the API module
vi.mock('../../../lib/api', () => ({
  imagesApi: {
    getImages: vi.fn(),
    getImage: vi.fn(),
    searchImages: vi.fn(),
    getImageTags: vi.fn(),
    getImageLimits: vi.fn(),
    uploadImage: vi.fn(),
    updateImage: vi.fn(),
    toggleFavorite: vi.fn(),
    deleteImage: vi.fn(),
    bulkDeleteImages: vi.fn(),
  },
}));

// Import the mocked API
import { imagesApi } from '../../../lib/api';

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

describe('useImages hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Test imageKeys factory functions
  describe('imageKeys', () => {
    it('generates correct query keys', () => {
      expect(imageKeys.all).toEqual(['images']);
      expect(imageKeys.lists()).toEqual(['images', 'list']);
      expect(imageKeys.list({ page: 1 })).toEqual(['images', 'list', { page: 1 }]);
      expect(imageKeys.details()).toEqual(['images', 'detail']);
      expect(imageKeys.detail('abc')).toEqual(['images', 'detail', 'abc']);
      expect(imageKeys.search({ q: 'test' })).toEqual(['images', 'search', { q: 'test' }]);
      expect(imageKeys.tags()).toEqual(['images', 'tags']);
      expect(imageKeys.limits()).toEqual(['images', 'limits']);
    });
  });

  // Test useImages hook
  describe('useImages', () => {
    it('fetches images successfully', async () => {
      const mockData = {
        images: [
          { _id: '1', filename: 'image1.jpg' },
          { _id: '2', filename: 'image2.png' },
        ],
        total: 2,
      };
      imagesApi.getImages.mockResolvedValueOnce({ data: mockData });

      const { result } = renderHook(() => useImages(), { wrapper: createWrapper() });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data to load
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockData);
      expect(imagesApi.getImages).toHaveBeenCalledWith({});
    });

    it('handles error when fetching images fails', async () => {
      const error = new Error('Failed to fetch images');
      imagesApi.getImages.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useImages(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error.message).toBe('Failed to fetch images');
    });

    it('passes params to API call', async () => {
      imagesApi.getImages.mockResolvedValueOnce({ data: { images: [], total: 0 } });

      renderHook(() => useImages({ page: 2, limit: 20 }), { wrapper: createWrapper() });

      await waitFor(() => expect(imagesApi.getImages).toHaveBeenCalledWith({ page: 2, limit: 20 }));
    });
  });

  // Test useImage hook
  describe('useImage', () => {
    it('fetches a single image by ID', async () => {
      const mockImage = { _id: '123', filename: 'photo.jpg', title: 'My Photo' };
      imagesApi.getImage.mockResolvedValueOnce({ data: { image: mockImage } });

      const { result } = renderHook(() => useImage('123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockImage);
      expect(imagesApi.getImage).toHaveBeenCalledWith('123');
    });

    it('does not fetch when ID is not provided', async () => {
      const { result } = renderHook(() => useImage(null), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(imagesApi.getImage).not.toHaveBeenCalled();
    });

    it('does not fetch when ID is undefined', async () => {
      const { result } = renderHook(() => useImage(undefined), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(imagesApi.getImage).not.toHaveBeenCalled();
    });

    it('does not fetch when ID is empty string', async () => {
      const { result } = renderHook(() => useImage(''), { wrapper: createWrapper() });

      expect(result.current.fetchStatus).toBe('idle');
      expect(imagesApi.getImage).not.toHaveBeenCalled();
    });

    it('handles error when fetching image fails', async () => {
      imagesApi.getImage.mockRejectedValueOnce(new Error('Not found'));

      const { result } = renderHook(() => useImage('999'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useSearchImages hook
  describe('useSearchImages', () => {
    it('searches images when query is provided', async () => {
      const mockResults = {
        images: [{ _id: '1', title: 'Test Image' }],
        total: 1,
      };
      imagesApi.searchImages.mockResolvedValueOnce({ data: mockResults });

      const { result } = renderHook(() => useSearchImages({ q: 'test' }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockResults);
      expect(imagesApi.searchImages).toHaveBeenCalledWith({ q: 'test' });
    });

    it('searches images when tags are provided', async () => {
      const mockResults = { images: [], total: 0 };
      imagesApi.searchImages.mockResolvedValueOnce({ data: mockResults });

      const { result } = renderHook(() => useSearchImages({ tags: ['nature', 'landscape'] }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(imagesApi.searchImages).toHaveBeenCalledWith({ tags: ['nature', 'landscape'] });
    });

    it('searches images when favorite filter is provided', async () => {
      const mockResults = { images: [], total: 0 };
      imagesApi.searchImages.mockResolvedValueOnce({ data: mockResults });

      const { result } = renderHook(() => useSearchImages({ favorite: true }), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(imagesApi.searchImages).toHaveBeenCalledWith({ favorite: true });
    });

    it('does not fetch when no search params provided', async () => {
      const { result } = renderHook(() => useSearchImages({}), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(imagesApi.searchImages).not.toHaveBeenCalled();
    });

    it('does not fetch when query is empty', async () => {
      const { result } = renderHook(() => useSearchImages({ q: '' }), {
        wrapper: createWrapper(),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(imagesApi.searchImages).not.toHaveBeenCalled();
    });
  });

  // Test useImageTags hook
  describe('useImageTags', () => {
    it('fetches image tags successfully', async () => {
      const mockTags = ['nature', 'landscape', 'portrait'];
      imagesApi.getImageTags.mockResolvedValueOnce({ data: { tags: mockTags } });

      const { result } = renderHook(() => useImageTags(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockTags);
      expect(imagesApi.getImageTags).toHaveBeenCalled();
    });

    it('handles error when fetching tags fails', async () => {
      imagesApi.getImageTags.mockRejectedValueOnce(new Error('Tags error'));

      const { result } = renderHook(() => useImageTags(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useImageLimits hook
  describe('useImageLimits', () => {
    it('fetches image limits successfully', async () => {
      const mockLimits = { maxSize: 10485760, maxCount: 1000, currentCount: 50 };
      imagesApi.getImageLimits.mockResolvedValueOnce({ data: mockLimits });

      const { result } = renderHook(() => useImageLimits(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data).toEqual(mockLimits);
      expect(imagesApi.getImageLimits).toHaveBeenCalled();
    });

    it('handles error when fetching limits fails', async () => {
      imagesApi.getImageLimits.mockRejectedValueOnce(new Error('Limits error'));

      const { result } = renderHook(() => useImageLimits(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUploadImage mutation
  describe('useUploadImage', () => {
    it('uploads an image successfully', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const uploadedImage = { _id: 'new-id', filename: 'test.jpg' };
      imagesApi.uploadImage.mockResolvedValueOnce({ data: uploadedImage });

      const { result } = renderHook(() => useUploadImage(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ file: mockFile, options: { title: 'Test' } });
      });

      expect(imagesApi.uploadImage).toHaveBeenCalledWith(mockFile, { title: 'Test' });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('uploads an image without options', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const uploadedImage = { _id: 'new-id', filename: 'test.jpg' };
      imagesApi.uploadImage.mockResolvedValueOnce({ data: uploadedImage });

      const { result } = renderHook(() => useUploadImage(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ file: mockFile });
      });

      expect(imagesApi.uploadImage).toHaveBeenCalledWith(mockFile, undefined);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when uploading image fails', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      imagesApi.uploadImage.mockRejectedValueOnce(new Error('Upload failed'));

      const { result } = renderHook(() => useUploadImage(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ file: mockFile });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useUpdateImage mutation
  describe('useUpdateImage', () => {
    it('updates an image successfully', async () => {
      const updatedImage = { _id: '123', title: 'Updated Title' };
      imagesApi.updateImage.mockResolvedValueOnce({ data: updatedImage });

      const { result } = renderHook(() => useUpdateImage(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync({ id: '123', data: { title: 'Updated Title' } });
      });

      expect(imagesApi.updateImage).toHaveBeenCalledWith('123', { title: 'Updated Title' });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when updating image fails', async () => {
      imagesApi.updateImage.mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useUpdateImage(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync({ id: '123', data: {} });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useToggleFavorite mutation
  describe('useToggleFavorite', () => {
    it('toggles favorite status successfully', async () => {
      const updatedImage = { _id: '123', favorite: true };
      imagesApi.toggleFavorite.mockResolvedValueOnce({ data: updatedImage });

      const { result } = renderHook(() => useToggleFavorite(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(imagesApi.toggleFavorite).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when toggling favorite fails', async () => {
      imagesApi.toggleFavorite.mockRejectedValueOnce(new Error('Toggle failed'));

      const { result } = renderHook(() => useToggleFavorite(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync('123');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useDeleteImage mutation
  describe('useDeleteImage', () => {
    it('deletes an image successfully', async () => {
      imagesApi.deleteImage.mockResolvedValueOnce({ data: { success: true } });

      const { result } = renderHook(() => useDeleteImage(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync('123');
      });

      expect(imagesApi.deleteImage).toHaveBeenCalledWith('123');
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when deleting image fails', async () => {
      imagesApi.deleteImage.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useDeleteImage(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync('123');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });

  // Test useBulkDeleteImages mutation
  describe('useBulkDeleteImages', () => {
    it('bulk deletes images successfully', async () => {
      imagesApi.bulkDeleteImages.mockResolvedValueOnce({ data: { deleted: 3 } });

      const { result } = renderHook(() => useBulkDeleteImages(), { wrapper: createWrapper() });

      await act(async () => {
        await result.current.mutateAsync(['id1', 'id2', 'id3']);
      });

      expect(imagesApi.bulkDeleteImages).toHaveBeenCalledWith(['id1', 'id2', 'id3']);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('handles error when bulk deleting images fails', async () => {
      imagesApi.bulkDeleteImages.mockRejectedValueOnce(new Error('Bulk delete failed'));

      const { result } = renderHook(() => useBulkDeleteImages(), { wrapper: createWrapper() });

      await act(async () => {
        try {
          await result.current.mutateAsync(['id1', 'id2']);
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
    });
  });
});
