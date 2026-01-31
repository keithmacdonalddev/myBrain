import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { profileApi } from '../lib/api';

// =============================================================================
// SIDEBAR SLICE
// Manages sidebar collapsed/expanded state with:
// - localStorage for instant UI response (cache)
// - Server persistence for cross-device sync
// =============================================================================

// =============================================================================
// LOCAL STORAGE HELPERS
// =============================================================================

/**
 * Get initial collapsed state from localStorage
 * Used for instant UI on page load before server data arrives
 */
const getInitialCollapsed = () => {
  if (typeof window === 'undefined') return false;

  const stored = localStorage.getItem('sidebarCollapsed');
  if (stored !== null) {
    return stored === 'true';
  }

  return false; // Default to expanded
};

/**
 * Save collapsed state to localStorage for instant UI
 */
const saveToLocalStorage = (isCollapsed) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sidebarCollapsed', isCollapsed.toString());
  }
};

// =============================================================================
// ASYNC THUNKS
// =============================================================================

/**
 * Sync sidebar collapsed state to server
 * Fire-and-forget: UI updates immediately, server sync happens in background
 */
export const syncSidebarToServer = createAsyncThunk(
  'sidebar/syncToServer',
  async (isCollapsed, { rejectWithValue }) => {
    try {
      await profileApi.updatePreferences({ sidebarCollapsed: isCollapsed });
      return isCollapsed;
    } catch (error) {
      // Log but don't fail - localStorage already has the correct state
      console.error('[Sidebar] Failed to sync to server:', error.message);
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Load sidebar preference from user object (called after auth)
 * User object is already fetched by checkAuth, so we extract preference from it
 */
export const loadSidebarPreference = createAsyncThunk(
  'sidebar/loadPreference',
  async (user, { dispatch }) => {
    // Extract sidebar preference from user object
    const serverCollapsed = user?.preferences?.sidebarCollapsed;

    // If server has a preference, use it
    if (serverCollapsed !== undefined && serverCollapsed !== null) {
      // Update localStorage to match server (server is source of truth)
      saveToLocalStorage(serverCollapsed);
      return serverCollapsed;
    }

    // No server preference - keep localStorage value (first-time user or legacy)
    return getInitialCollapsed();
  }
);

// =============================================================================
// SLICE DEFINITION
// =============================================================================

const initialState = {
  isCollapsed: getInitialCollapsed(),
  // Track if we've synced with server (to avoid overwriting server state)
  isServerSynced: false,
};

const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState,
  reducers: {
    /**
     * Toggle sidebar collapsed state
     * Updates localStorage immediately for instant UI
     * Server sync happens via thunk (fire-and-forget)
     */
    toggleSidebarCollapsed: (state) => {
      state.isCollapsed = !state.isCollapsed;
      saveToLocalStorage(state.isCollapsed);
    },

    /**
     * Set sidebar collapsed state explicitly
     * Updates localStorage immediately for instant UI
     * Server sync happens via thunk (fire-and-forget)
     */
    setSidebarCollapsed: (state, action) => {
      state.isCollapsed = !!action.payload;
      saveToLocalStorage(state.isCollapsed);
    },
  },
  extraReducers: (builder) => {
    builder
      // Load preference from server (via user object)
      .addCase(loadSidebarPreference.fulfilled, (state, action) => {
        state.isCollapsed = action.payload;
        state.isServerSynced = true;
      })
      // Sync to server completed (no state change needed - already updated)
      .addCase(syncSidebarToServer.fulfilled, (state) => {
        state.isServerSynced = true;
      })
      // Sync failed - mark as not synced (will retry on next toggle)
      .addCase(syncSidebarToServer.rejected, (state) => {
        state.isServerSynced = false;
      });
  },
});

export const { toggleSidebarCollapsed, setSidebarCollapsed } = sidebarSlice.actions;

// =============================================================================
// SELECTORS
// =============================================================================

export const selectSidebarCollapsed = (state) => state.sidebar.isCollapsed;
export const selectSidebarServerSynced = (state) => state.sidebar.isServerSynced;

export default sidebarSlice.reducer;
