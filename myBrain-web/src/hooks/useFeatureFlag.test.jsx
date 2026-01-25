import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useFeatureFlag, useFeatureFlags, useIsAdmin } from './useFeatureFlag';

// Helper to create a mock store with custom auth state
const createMockStore = (authState) => {
  return configureStore({
    reducer: {
      auth: () => authState,
    },
  });
};

// Helper to create wrapper with Redux provider
const createWrapper = (store) => {
  return ({ children }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('useFeatureFlag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useFeatureFlag', () => {
    it('should return false when user is null', () => {
      const store = createMockStore({ user: null });
      const { result } = renderHook(() => useFeatureFlag('fitnessEnabled'), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBe(false);
    });

    it('should return false when user.flags is undefined', () => {
      const store = createMockStore({ user: { _id: '123', email: 'test@example.com' } });
      const { result } = renderHook(() => useFeatureFlag('fitnessEnabled'), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBe(false);
    });

    it('should return true when flag is enabled (plain object)', () => {
      const store = createMockStore({
        user: {
          _id: '123',
          email: 'test@example.com',
          flags: { fitnessEnabled: true, kbEnabled: false },
        },
      });
      const { result } = renderHook(() => useFeatureFlag('fitnessEnabled'), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBe(true);
    });

    it('should return false when flag is disabled (plain object)', () => {
      const store = createMockStore({
        user: {
          _id: '123',
          email: 'test@example.com',
          flags: { fitnessEnabled: true, kbEnabled: false },
        },
      });
      const { result } = renderHook(() => useFeatureFlag('kbEnabled'), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBe(false);
    });

    it('should return false when flag does not exist (plain object)', () => {
      const store = createMockStore({
        user: {
          _id: '123',
          email: 'test@example.com',
          flags: { fitnessEnabled: true },
        },
      });
      const { result } = renderHook(() => useFeatureFlag('nonExistentFlag'), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBe(false);
    });

    it('should return true when flag is enabled (Map)', () => {
      const flagsMap = new Map();
      flagsMap.set('fitnessEnabled', true);
      flagsMap.set('kbEnabled', false);

      const store = createMockStore({
        user: {
          _id: '123',
          email: 'test@example.com',
          flags: flagsMap,
        },
      });
      const { result } = renderHook(() => useFeatureFlag('fitnessEnabled'), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBe(true);
    });

    it('should return false when flag is disabled (Map)', () => {
      const flagsMap = new Map();
      flagsMap.set('fitnessEnabled', true);
      flagsMap.set('kbEnabled', false);

      const store = createMockStore({
        user: {
          _id: '123',
          email: 'test@example.com',
          flags: flagsMap,
        },
      });
      const { result } = renderHook(() => useFeatureFlag('kbEnabled'), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBe(false);
    });
  });

  describe('useFeatureFlags', () => {
    it('should return all flags as false when user is null', () => {
      const store = createMockStore({ user: null });
      const { result } = renderHook(
        () => useFeatureFlags(['fitnessEnabled', 'kbEnabled']),
        { wrapper: createWrapper(store) }
      );

      expect(result.current).toEqual({
        fitnessEnabled: false,
        kbEnabled: false,
      });
    });

    it('should return all flags as false when user.flags is undefined', () => {
      const store = createMockStore({ user: { _id: '123' } });
      const { result } = renderHook(
        () => useFeatureFlags(['fitnessEnabled', 'kbEnabled']),
        { wrapper: createWrapper(store) }
      );

      expect(result.current).toEqual({
        fitnessEnabled: false,
        kbEnabled: false,
      });
    });

    it('should return correct flag values (plain object)', () => {
      const store = createMockStore({
        user: {
          _id: '123',
          flags: { fitnessEnabled: true, kbEnabled: false, messagesEnabled: true },
        },
      });
      const { result } = renderHook(
        () => useFeatureFlags(['fitnessEnabled', 'kbEnabled', 'messagesEnabled']),
        { wrapper: createWrapper(store) }
      );

      expect(result.current).toEqual({
        fitnessEnabled: true,
        kbEnabled: false,
        messagesEnabled: true,
      });
    });

    it('should return correct flag values (Map)', () => {
      const flagsMap = new Map();
      flagsMap.set('fitnessEnabled', true);
      flagsMap.set('kbEnabled', false);
      flagsMap.set('messagesEnabled', true);

      const store = createMockStore({
        user: {
          _id: '123',
          flags: flagsMap,
        },
      });
      const { result } = renderHook(
        () => useFeatureFlags(['fitnessEnabled', 'kbEnabled', 'messagesEnabled']),
        { wrapper: createWrapper(store) }
      );

      expect(result.current).toEqual({
        fitnessEnabled: true,
        kbEnabled: false,
        messagesEnabled: true,
      });
    });

    it('should return false for flags that do not exist', () => {
      const store = createMockStore({
        user: {
          _id: '123',
          flags: { fitnessEnabled: true },
        },
      });
      const { result } = renderHook(
        () => useFeatureFlags(['fitnessEnabled', 'nonExistentFlag']),
        { wrapper: createWrapper(store) }
      );

      expect(result.current).toEqual({
        fitnessEnabled: true,
        nonExistentFlag: false,
      });
    });
  });

  describe('useIsAdmin', () => {
    it('should return false when user is null', () => {
      const store = createMockStore({ user: null });
      const { result } = renderHook(() => useIsAdmin(), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBe(false);
    });

    it('should return false when user has no role', () => {
      const store = createMockStore({ user: { _id: '123', email: 'test@example.com' } });
      const { result } = renderHook(() => useIsAdmin(), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBe(false);
    });

    it('should return false when user role is "user"', () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com', role: 'user' },
      });
      const { result } = renderHook(() => useIsAdmin(), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBe(false);
    });

    it('should return false when user role is "free"', () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com', role: 'free' },
      });
      const { result } = renderHook(() => useIsAdmin(), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBe(false);
    });

    it('should return true when user role is "admin"', () => {
      const store = createMockStore({
        user: { _id: '123', email: 'test@example.com', role: 'admin' },
      });
      const { result } = renderHook(() => useIsAdmin(), {
        wrapper: createWrapper(store),
      });

      expect(result.current).toBe(true);
    });
  });
});
