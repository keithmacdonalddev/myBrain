import { describe, it, expect, vi, beforeEach } from 'vitest';
import authReducer, {
  login,
  logout,
  register,
  checkAuth,
  setUser,
  clearError,
} from './authSlice';

describe('authSlice', () => {
  // Current initial state has isLoading: true (to check auth on mount)
  const initialState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reducers', () => {
    it('should return initial state', () => {
      expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    it('should handle setUser', () => {
      const user = { _id: '123', email: 'test@example.com', role: 'admin' };
      const state = authReducer(initialState, setUser(user));

      expect(state.user).toEqual(user);
    });

    it('should handle clearError', () => {
      const errorState = {
        ...initialState,
        error: 'Some error',
      };

      const state = authReducer(errorState, clearError());
      expect(state.error).toBe(null);
    });
  });

  describe('async thunks', () => {
    it('should handle login.pending', () => {
      const state = authReducer(initialState, { type: login.pending.type });
      expect(state.isLoading).toBe(true);
      expect(state.error).toBe(null);
    });

    it('should handle login.fulfilled', () => {
      const user = { _id: '123', email: 'test@example.com', role: 'user' };
      const state = authReducer(initialState, {
        type: login.fulfilled.type,
        payload: user,
      });

      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(user);
    });

    it('should handle login.rejected', () => {
      const state = authReducer(initialState, {
        type: login.rejected.type,
        payload: 'Invalid credentials',
      });

      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Invalid credentials');
    });

    it('should handle logout.fulfilled', () => {
      const authenticatedState = {
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

      const state = authReducer(authenticatedState, {
        type: logout.fulfilled.type,
      });

      expect(state.user).toBe(null);
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe(null);
    });

    it('should handle checkAuth.pending', () => {
      const state = authReducer(
        { ...initialState, isLoading: false },
        { type: checkAuth.pending.type }
      );
      expect(state.isLoading).toBe(true);
    });

    it('should handle checkAuth.fulfilled with user', () => {
      const user = { _id: '123', email: 'test@example.com' };
      const state = authReducer(initialState, {
        type: checkAuth.fulfilled.type,
        payload: user,
      });

      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(user);
    });

    it('should handle checkAuth.fulfilled with null (not authenticated)', () => {
      const state = authReducer(initialState, {
        type: checkAuth.fulfilled.type,
        payload: null,
      });

      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBe(null);
    });

    it('should handle checkAuth.rejected', () => {
      const state = authReducer(initialState, {
        type: checkAuth.rejected.type,
      });

      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBe(null);
    });
  });
});
