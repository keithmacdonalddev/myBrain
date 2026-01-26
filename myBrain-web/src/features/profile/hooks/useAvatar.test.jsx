import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useUploadAvatar, useDeleteAvatar } from './useAvatar';

// Mock the API module
vi.mock('../../../lib/api', () => ({
  profileApi: {
    uploadAvatar: vi.fn(),
    deleteAvatar: vi.fn(),
  },
}));

// Track setUser calls
let setUserCalls = [];

// Mock the authSlice module - return action creator that returns proper action
vi.mock('../../../store/authSlice', () => ({
  setUser: (user) => {
    setUserCalls.push(user);
    return { type: 'auth/setUser', payload: user };
  },
}));

// Import the mocked API
import { profileApi } from '../../../lib/api';

// Create a mock Redux store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: (state = { user: null, ...initialState }, action) => {
        if (action.type === 'auth/setUser') {
          return { ...state, user: action.payload };
        }
        return state;
      },
    },
  });
};

// Create a wrapper with QueryClientProvider and Redux Provider
const createWrapper = (store) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );
};

describe('useAvatar hooks', () => {
  let mockStore;

  beforeEach(() => {
    vi.clearAllMocks();
    setUserCalls = []; // Reset the calls tracker
    mockStore = createMockStore({ user: { _id: 'user123', name: 'Test User', avatar: null } });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Test useUploadAvatar mutation
  describe('useUploadAvatar', () => {
    it('uploads avatar successfully and updates user state', async () => {
      const mockFile = new File(['avatar'], 'avatar.png', { type: 'image/png' });
      const mockUpdatedUser = {
        _id: 'user123',
        name: 'Test User',
        avatar: 'https://s3.amazonaws.com/bucket/avatar123.png',
      };
      profileApi.uploadAvatar.mockResolvedValueOnce({ data: { user: mockUpdatedUser } });

      const { result } = renderHook(() => useUploadAvatar(), {
        wrapper: createWrapper(mockStore),
      });

      await act(async () => {
        await result.current.mutateAsync(mockFile);
      });

      expect(profileApi.uploadAvatar).toHaveBeenCalledWith(mockFile);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify setUser was called to update Redux state
      expect(setUserCalls).toContainEqual(mockUpdatedUser);
    });

    it('handles error when uploading avatar fails', async () => {
      const mockFile = new File(['avatar'], 'avatar.png', { type: 'image/png' });
      profileApi.uploadAvatar.mockRejectedValueOnce(new Error('Upload failed'));

      const { result } = renderHook(() => useUploadAvatar(), {
        wrapper: createWrapper(mockStore),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync(mockFile);
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error.message).toBe('Upload failed');
    });

    it('handles file too large error', async () => {
      const largeFile = new File(['large content'], 'large.png', { type: 'image/png' });
      const fileTooLargeError = new Error('File too large');
      fileTooLargeError.response = { status: 413, data: { message: 'File exceeds 5MB limit' } };
      profileApi.uploadAvatar.mockRejectedValueOnce(fileTooLargeError);

      const { result } = renderHook(() => useUploadAvatar(), {
        wrapper: createWrapper(mockStore),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync(largeFile);
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error.message).toBe('File too large');
    });

    it('handles invalid file type error', async () => {
      const invalidFile = new File(['document'], 'doc.pdf', { type: 'application/pdf' });
      const invalidTypeError = new Error('Invalid file type');
      invalidTypeError.response = { status: 400, data: { message: 'Only image files are allowed' } };
      profileApi.uploadAvatar.mockRejectedValueOnce(invalidTypeError);

      const { result } = renderHook(() => useUploadAvatar(), {
        wrapper: createWrapper(mockStore),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync(invalidFile);
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error.message).toBe('Invalid file type');
    });

    it('handles network error during upload', async () => {
      const mockFile = new File(['avatar'], 'avatar.png', { type: 'image/png' });
      const networkError = new Error('Network Error');
      networkError.code = 'ERR_NETWORK';
      profileApi.uploadAvatar.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useUploadAvatar(), {
        wrapper: createWrapper(mockStore),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync(mockFile);
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error.message).toBe('Network Error');
    });

    it('handles 401 unauthorized error', async () => {
      const mockFile = new File(['avatar'], 'avatar.png', { type: 'image/png' });
      const unauthorizedError = new Error('Unauthorized');
      unauthorizedError.response = { status: 401 };
      profileApi.uploadAvatar.mockRejectedValueOnce(unauthorizedError);

      const { result } = renderHook(() => useUploadAvatar(), {
        wrapper: createWrapper(mockStore),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync(mockFile);
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error.message).toBe('Unauthorized');
    });

    it('returns updated user data on success', async () => {
      const mockFile = new File(['avatar'], 'avatar.png', { type: 'image/png' });
      const mockUpdatedUser = {
        _id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        avatar: 'https://s3.amazonaws.com/bucket/avatar123.png',
        avatarThumbnail: 'https://s3.amazonaws.com/bucket/avatar123_thumb.png',
      };
      profileApi.uploadAvatar.mockResolvedValueOnce({ data: { user: mockUpdatedUser } });

      const { result } = renderHook(() => useUploadAvatar(), {
        wrapper: createWrapper(mockStore),
      });

      let returnedData;
      await act(async () => {
        returnedData = await result.current.mutateAsync(mockFile);
      });

      expect(returnedData).toEqual({ user: mockUpdatedUser });
    });

    it('calls API with correct file parameter', async () => {
      const mockFile = new File(['avatar content'], 'my-avatar.jpg', { type: 'image/jpeg' });
      const mockUpdatedUser = { _id: 'user123', avatar: 'url' };
      profileApi.uploadAvatar.mockResolvedValueOnce({ data: { user: mockUpdatedUser } });

      const { result } = renderHook(() => useUploadAvatar(), {
        wrapper: createWrapper(mockStore),
      });

      await act(async () => {
        await result.current.mutateAsync(mockFile);
      });

      expect(profileApi.uploadAvatar).toHaveBeenCalledTimes(1);
      expect(profileApi.uploadAvatar).toHaveBeenCalledWith(mockFile);
    });
  });

  // Test useDeleteAvatar mutation
  describe('useDeleteAvatar', () => {
    it('deletes avatar successfully and updates user state', async () => {
      const mockUpdatedUser = {
        _id: 'user123',
        name: 'Test User',
        avatar: null,
      };
      profileApi.deleteAvatar.mockResolvedValueOnce({ data: { user: mockUpdatedUser } });

      const { result } = renderHook(() => useDeleteAvatar(), {
        wrapper: createWrapper(mockStore),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(profileApi.deleteAvatar).toHaveBeenCalled();
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify setUser was called to update Redux state with null avatar
      expect(setUserCalls).toContainEqual(mockUpdatedUser);
    });

    it('handles error when deleting avatar fails', async () => {
      profileApi.deleteAvatar.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useDeleteAvatar(), {
        wrapper: createWrapper(mockStore),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync();
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error.message).toBe('Delete failed');
    });

    it('handles 404 error when avatar does not exist', async () => {
      const notFoundError = new Error('Avatar not found');
      notFoundError.response = { status: 404 };
      profileApi.deleteAvatar.mockRejectedValueOnce(notFoundError);

      const { result } = renderHook(() => useDeleteAvatar(), {
        wrapper: createWrapper(mockStore),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync();
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error.message).toBe('Avatar not found');
    });

    it('handles 401 unauthorized error', async () => {
      const unauthorizedError = new Error('Unauthorized');
      unauthorizedError.response = { status: 401 };
      profileApi.deleteAvatar.mockRejectedValueOnce(unauthorizedError);

      const { result } = renderHook(() => useDeleteAvatar(), {
        wrapper: createWrapper(mockStore),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync();
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error.message).toBe('Unauthorized');
    });

    it('handles server error', async () => {
      const serverError = new Error('Internal Server Error');
      serverError.response = { status: 500 };
      profileApi.deleteAvatar.mockRejectedValueOnce(serverError);

      const { result } = renderHook(() => useDeleteAvatar(), {
        wrapper: createWrapper(mockStore),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync();
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error.message).toBe('Internal Server Error');
    });

    it('returns updated user data on success', async () => {
      const mockUpdatedUser = {
        _id: 'user123',
        name: 'Test User',
        email: 'test@example.com',
        avatar: null,
        avatarThumbnail: null,
      };
      profileApi.deleteAvatar.mockResolvedValueOnce({ data: { user: mockUpdatedUser } });

      const { result } = renderHook(() => useDeleteAvatar(), {
        wrapper: createWrapper(mockStore),
      });

      let returnedData;
      await act(async () => {
        returnedData = await result.current.mutateAsync();
      });

      expect(returnedData).toEqual({ user: mockUpdatedUser });
    });

    it('calls deleteAvatar API without parameters', async () => {
      const mockUpdatedUser = { _id: 'user123', avatar: null };
      profileApi.deleteAvatar.mockResolvedValueOnce({ data: { user: mockUpdatedUser } });

      const { result } = renderHook(() => useDeleteAvatar(), {
        wrapper: createWrapper(mockStore),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(profileApi.deleteAvatar).toHaveBeenCalledTimes(1);
      expect(profileApi.deleteAvatar).toHaveBeenCalledWith();
    });

    it('does not call setUser on error', async () => {
      profileApi.deleteAvatar.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useDeleteAvatar(), {
        wrapper: createWrapper(mockStore),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync();
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      // setUser should not be called on error
      expect(setUserCalls).toHaveLength(0);
    });
  });
});
