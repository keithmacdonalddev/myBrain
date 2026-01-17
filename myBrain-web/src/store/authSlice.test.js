import { describe, it, expect, vi, beforeEach } from 'vitest';
import authReducer, {
  loginStart,
  loginSuccess,
  loginFailure,
  logoutSuccess,
  setUser,
  clearError,
} from './authSlice';

describe('authSlice', () => {
  const initialState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reducers', () => {
    it('should return initial state', () => {
      expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    it('should handle loginStart', () => {
      const state = authReducer(initialState, loginStart());
      expect(state.isLoading).toBe(true);
      expect(state.error).toBe(null);
    });

    it('should handle loginSuccess', () => {
      const user = { _id: '123', email: 'test@example.com', role: 'user' };
      const state = authReducer(initialState, loginSuccess(user));

      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(user);
      expect(state.error).toBe(null);
    });

    it('should handle loginFailure', () => {
      const state = authReducer(initialState, loginFailure('Invalid credentials'));

      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Invalid credentials');
    });

    it('should handle logoutSuccess', () => {
      const authenticatedState = {
        user: { _id: '123', email: 'test@example.com' },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

      const state = authReducer(authenticatedState, logoutSuccess());

      expect(state.user).toBe(null);
      expect(state.isAuthenticated).toBe(false);
    });

    it('should handle setUser', () => {
      const user = { _id: '123', email: 'test@example.com', role: 'admin' };
      const state = authReducer(initialState, setUser(user));

      expect(state.user).toEqual(user);
      expect(state.isAuthenticated).toBe(true);
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
});
