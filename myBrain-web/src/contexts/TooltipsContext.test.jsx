import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipsProvider, useTooltips } from './TooltipsContext';
import authReducer from '../store/authSlice';

// Mock the API module
vi.mock('../lib/api', () => ({
  profileApi: {
    updatePreferences: vi.fn(),
  },
}));

// Import the mocked API
import { profileApi } from '../lib/api';

// Helper to create a mock store with custom auth state
const createMockStore = (authState = { user: null }) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: authState,
    },
  });
};

// Helper to create wrapper with both Redux Provider and QueryClientProvider
const createWrapper = (authState = { user: null }) => {
  const store = createMockStore(authState);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <TooltipsProvider>{children}</TooltipsProvider>
      </QueryClientProvider>
    </Provider>
  );

  return { wrapper: Wrapper, store, queryClient };
};

describe('TooltipsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('useTooltips', () => {
    it('returns default values when used outside provider', () => {
      // TooltipsContext is created with default values, so it returns sensible defaults
      // when used outside the provider (unlike other panel contexts)
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      });
      const store = createMockStore({ user: null });

      const NoTooltipsWrapper = ({ children }) => (
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </Provider>
      );

      const { result } = renderHook(() => useTooltips(), { wrapper: NoTooltipsWrapper });

      // Should return the default context values
      expect(result.current.tooltipsEnabled).toBe(true);
      expect(result.current.isUpdating).toBe(false);
      expect(typeof result.current.toggleTooltips).toBe('function');
      expect(typeof result.current.setTooltipsEnabled).toBe('function');
    });
  });

  describe('initial state', () => {
    it('defaults tooltipsEnabled to true when user has no preferences', () => {
      const { wrapper } = createWrapper({ user: { _id: '123', email: 'test@example.com' } });
      const { result } = renderHook(() => useTooltips(), { wrapper });

      expect(result.current.tooltipsEnabled).toBe(true);
    });

    it('defaults tooltipsEnabled to true when user is null', () => {
      const { wrapper } = createWrapper({ user: null });
      const { result } = renderHook(() => useTooltips(), { wrapper });

      expect(result.current.tooltipsEnabled).toBe(true);
    });

    it('reads tooltipsEnabled from user preferences when set to true', () => {
      const { wrapper } = createWrapper({
        user: {
          _id: '123',
          email: 'test@example.com',
          preferences: { tooltipsEnabled: true },
        },
      });
      const { result } = renderHook(() => useTooltips(), { wrapper });

      expect(result.current.tooltipsEnabled).toBe(true);
    });

    it('reads tooltipsEnabled from user preferences when set to false', () => {
      const { wrapper } = createWrapper({
        user: {
          _id: '123',
          email: 'test@example.com',
          preferences: { tooltipsEnabled: false },
        },
      });
      const { result } = renderHook(() => useTooltips(), { wrapper });

      expect(result.current.tooltipsEnabled).toBe(false);
    });

    it('has isUpdating set to false initially', () => {
      const { wrapper } = createWrapper({ user: { _id: '123' } });
      const { result } = renderHook(() => useTooltips(), { wrapper });

      expect(result.current.isUpdating).toBe(false);
    });

    it('provides all expected functions', () => {
      const { wrapper } = createWrapper({ user: { _id: '123' } });
      const { result } = renderHook(() => useTooltips(), { wrapper });

      expect(typeof result.current.toggleTooltips).toBe('function');
      expect(typeof result.current.setTooltipsEnabled).toBe('function');
    });
  });

  describe('setTooltipsEnabled', () => {
    it('calls API to update preferences with true', async () => {
      profileApi.updatePreferences.mockResolvedValueOnce({
        data: {
          user: {
            _id: '123',
            email: 'test@example.com',
            preferences: { tooltipsEnabled: true },
          },
        },
      });

      const { wrapper } = createWrapper({
        user: {
          _id: '123',
          email: 'test@example.com',
          preferences: { tooltipsEnabled: false },
        },
      });
      const { result } = renderHook(() => useTooltips(), { wrapper });

      act(() => {
        result.current.setTooltipsEnabled(true);
      });

      await waitFor(() => {
        expect(profileApi.updatePreferences).toHaveBeenCalledWith({
          tooltipsEnabled: true,
        });
      });
    });

    it('calls API to update preferences with false', async () => {
      profileApi.updatePreferences.mockResolvedValueOnce({
        data: {
          user: {
            _id: '123',
            email: 'test@example.com',
            preferences: { tooltipsEnabled: false },
          },
        },
      });

      const { wrapper } = createWrapper({
        user: {
          _id: '123',
          email: 'test@example.com',
          preferences: { tooltipsEnabled: true },
        },
      });
      const { result } = renderHook(() => useTooltips(), { wrapper });

      act(() => {
        result.current.setTooltipsEnabled(false);
      });

      await waitFor(() => {
        expect(profileApi.updatePreferences).toHaveBeenCalledWith({
          tooltipsEnabled: false,
        });
      });
    });

    it('sets isUpdating to true while mutation is pending', async () => {
      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      profileApi.updatePreferences.mockReturnValueOnce(promise);

      const { wrapper } = createWrapper({
        user: { _id: '123', preferences: { tooltipsEnabled: true } },
      });
      const { result } = renderHook(() => useTooltips(), { wrapper });

      act(() => {
        result.current.setTooltipsEnabled(false);
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(true);
      });

      // Resolve the promise
      act(() => {
        resolvePromise({
          data: {
            user: { _id: '123', preferences: { tooltipsEnabled: false } },
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });
    });
  });

  describe('toggleTooltips', () => {
    it('toggles from true to false', async () => {
      profileApi.updatePreferences.mockResolvedValueOnce({
        data: {
          user: {
            _id: '123',
            email: 'test@example.com',
            preferences: { tooltipsEnabled: false },
          },
        },
      });

      const { wrapper } = createWrapper({
        user: {
          _id: '123',
          email: 'test@example.com',
          preferences: { tooltipsEnabled: true },
        },
      });
      const { result } = renderHook(() => useTooltips(), { wrapper });

      expect(result.current.tooltipsEnabled).toBe(true);

      act(() => {
        result.current.toggleTooltips();
      });

      await waitFor(() => {
        expect(profileApi.updatePreferences).toHaveBeenCalledWith({
          tooltipsEnabled: false,
        });
      });
    });

    it('toggles from false to true', async () => {
      profileApi.updatePreferences.mockResolvedValueOnce({
        data: {
          user: {
            _id: '123',
            email: 'test@example.com',
            preferences: { tooltipsEnabled: true },
          },
        },
      });

      const { wrapper } = createWrapper({
        user: {
          _id: '123',
          email: 'test@example.com',
          preferences: { tooltipsEnabled: false },
        },
      });
      const { result } = renderHook(() => useTooltips(), { wrapper });

      expect(result.current.tooltipsEnabled).toBe(false);

      act(() => {
        result.current.toggleTooltips();
      });

      await waitFor(() => {
        expect(profileApi.updatePreferences).toHaveBeenCalledWith({
          tooltipsEnabled: true,
        });
      });
    });
  });

  describe('API integration', () => {
    it('updates Redux store on successful API call', async () => {
      const updatedUser = {
        _id: '123',
        email: 'test@example.com',
        preferences: { tooltipsEnabled: false },
      };

      profileApi.updatePreferences.mockResolvedValueOnce({
        data: { user: updatedUser },
      });

      const { wrapper, store } = createWrapper({
        user: {
          _id: '123',
          email: 'test@example.com',
          preferences: { tooltipsEnabled: true },
        },
      });
      const { result } = renderHook(() => useTooltips(), { wrapper });

      act(() => {
        result.current.setTooltipsEnabled(false);
      });

      await waitFor(() => {
        const state = store.getState();
        expect(state.auth.user.preferences.tooltipsEnabled).toBe(false);
      });
    });

    it('handles API error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      profileApi.updatePreferences.mockRejectedValueOnce(new Error('API Error'));

      const { wrapper } = createWrapper({
        user: {
          _id: '123',
          email: 'test@example.com',
          preferences: { tooltipsEnabled: true },
        },
      });
      const { result } = renderHook(() => useTooltips(), { wrapper });

      act(() => {
        result.current.setTooltipsEnabled(false);
      });

      // Should not throw, and isUpdating should return to false after error
      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });

      consoleSpy.mockRestore();
    });
  });
});
