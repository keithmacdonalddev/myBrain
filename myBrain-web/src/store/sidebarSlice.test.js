import { describe, it, expect, beforeEach, vi } from 'vitest';
import sidebarReducer, {
  toggleSidebarCollapsed,
  setSidebarCollapsed,
  selectSidebarCollapsed,
  selectSidebarServerSynced,
  loadSidebarPreference,
  syncSidebarToServer,
} from './sidebarSlice';

// =============================================================================
// SIDEBAR SLICE TESTS
// Tests for sidebar collapsed state management with server sync
// =============================================================================

describe('sidebarSlice', () => {
  // Mock localStorage
  const localStorageMock = {
    store: {},
    getItem: vi.fn((key) => localStorageMock.store[key] || null),
    setItem: vi.fn((key, value) => {
      localStorageMock.store[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete localStorageMock.store[key];
    }),
    clear: vi.fn(() => {
      localStorageMock.store = {};
    }),
  };

  beforeEach(() => {
    localStorageMock.store = {};
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  });

  describe('initial state', () => {
    it('should have isCollapsed false by default', () => {
      const state = sidebarReducer(undefined, { type: 'unknown' });
      expect(state.isCollapsed).toBe(false);
    });

    it('should have isServerSynced false by default', () => {
      const state = sidebarReducer(undefined, { type: 'unknown' });
      expect(state.isServerSynced).toBe(false);
    });
  });

  describe('toggleSidebarCollapsed', () => {
    it('should toggle isCollapsed from false to true', () => {
      const initialState = { isCollapsed: false, isServerSynced: false };
      const state = sidebarReducer(initialState, toggleSidebarCollapsed());
      expect(state.isCollapsed).toBe(true);
    });

    it('should toggle isCollapsed from true to false', () => {
      const initialState = { isCollapsed: true, isServerSynced: false };
      const state = sidebarReducer(initialState, toggleSidebarCollapsed());
      expect(state.isCollapsed).toBe(false);
    });

    it('should persist to localStorage', () => {
      const initialState = { isCollapsed: false, isServerSynced: false };
      sidebarReducer(initialState, toggleSidebarCollapsed());
      expect(localStorageMock.setItem).toHaveBeenCalledWith('sidebarCollapsed', 'true');
    });
  });

  describe('setSidebarCollapsed', () => {
    it('should set isCollapsed to true', () => {
      const initialState = { isCollapsed: false, isServerSynced: false };
      const state = sidebarReducer(initialState, setSidebarCollapsed(true));
      expect(state.isCollapsed).toBe(true);
    });

    it('should set isCollapsed to false', () => {
      const initialState = { isCollapsed: true, isServerSynced: false };
      const state = sidebarReducer(initialState, setSidebarCollapsed(false));
      expect(state.isCollapsed).toBe(false);
    });

    it('should coerce truthy values to boolean', () => {
      const initialState = { isCollapsed: false, isServerSynced: false };
      const state = sidebarReducer(initialState, setSidebarCollapsed(1));
      expect(state.isCollapsed).toBe(true);
    });

    it('should coerce falsy values to boolean', () => {
      const initialState = { isCollapsed: true, isServerSynced: false };
      const state = sidebarReducer(initialState, setSidebarCollapsed(0));
      expect(state.isCollapsed).toBe(false);
    });

    it('should persist to localStorage', () => {
      const initialState = { isCollapsed: false, isServerSynced: false };
      sidebarReducer(initialState, setSidebarCollapsed(true));
      expect(localStorageMock.setItem).toHaveBeenCalledWith('sidebarCollapsed', 'true');
    });
  });

  describe('loadSidebarPreference async thunk', () => {
    it('should set isCollapsed from user preferences and mark as synced', () => {
      const initialState = { isCollapsed: false, isServerSynced: false };
      const action = { type: loadSidebarPreference.fulfilled.type, payload: true };
      const state = sidebarReducer(initialState, action);
      expect(state.isCollapsed).toBe(true);
      expect(state.isServerSynced).toBe(true);
    });

    it('should set isCollapsed to false from user preferences', () => {
      const initialState = { isCollapsed: true, isServerSynced: false };
      const action = { type: loadSidebarPreference.fulfilled.type, payload: false };
      const state = sidebarReducer(initialState, action);
      expect(state.isCollapsed).toBe(false);
      expect(state.isServerSynced).toBe(true);
    });
  });

  describe('syncSidebarToServer async thunk', () => {
    it('should mark as synced on success', () => {
      const initialState = { isCollapsed: true, isServerSynced: false };
      const action = { type: syncSidebarToServer.fulfilled.type, payload: true };
      const state = sidebarReducer(initialState, action);
      expect(state.isServerSynced).toBe(true);
    });

    it('should mark as not synced on failure', () => {
      const initialState = { isCollapsed: true, isServerSynced: true };
      const action = { type: syncSidebarToServer.rejected.type };
      const state = sidebarReducer(initialState, action);
      expect(state.isServerSynced).toBe(false);
    });
  });

  describe('selectSidebarCollapsed', () => {
    it('should select isCollapsed from state', () => {
      const state = { sidebar: { isCollapsed: true, isServerSynced: false } };
      expect(selectSidebarCollapsed(state)).toBe(true);
    });

    it('should return false when not collapsed', () => {
      const state = { sidebar: { isCollapsed: false, isServerSynced: false } };
      expect(selectSidebarCollapsed(state)).toBe(false);
    });
  });

  describe('selectSidebarServerSynced', () => {
    it('should select isServerSynced from state', () => {
      const state = { sidebar: { isCollapsed: false, isServerSynced: true } };
      expect(selectSidebarServerSynced(state)).toBe(true);
    });

    it('should return false when not synced', () => {
      const state = { sidebar: { isCollapsed: false, isServerSynced: false } };
      expect(selectSidebarServerSynced(state)).toBe(false);
    });
  });
});
