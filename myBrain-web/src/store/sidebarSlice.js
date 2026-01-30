import { createSlice } from '@reduxjs/toolkit';

// =============================================================================
// SIDEBAR SLICE
// Manages sidebar collapsed/expanded state with localStorage persistence
// =============================================================================

// Get initial collapsed state from localStorage
const getInitialCollapsed = () => {
  if (typeof window === 'undefined') return false;

  const stored = localStorage.getItem('sidebarCollapsed');
  if (stored !== null) {
    return stored === 'true';
  }

  return false; // Default to expanded
};

const initialState = {
  isCollapsed: getInitialCollapsed(),
};

const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState,
  reducers: {
    // Toggle sidebar collapsed state
    toggleSidebarCollapsed: (state) => {
      state.isCollapsed = !state.isCollapsed;
      localStorage.setItem('sidebarCollapsed', state.isCollapsed.toString());
    },

    // Set sidebar collapsed state explicitly
    setSidebarCollapsed: (state, action) => {
      state.isCollapsed = !!action.payload;
      localStorage.setItem('sidebarCollapsed', state.isCollapsed.toString());
    },
  },
});

export const { toggleSidebarCollapsed, setSidebarCollapsed } = sidebarSlice.actions;

// Selectors
export const selectSidebarCollapsed = (state) => state.sidebar.isCollapsed;

export default sidebarSlice.reducer;
