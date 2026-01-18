import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { lifeAreasApi } from '../lib/api';

// Async thunks
export const fetchLifeAreas = createAsyncThunk(
  'lifeAreas/fetchLifeAreas',
  async (includeArchived = false, { rejectWithValue }) => {
    try {
      const response = await lifeAreasApi.getLifeAreas(includeArchived);
      return response.data.lifeAreas;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  items: [],
  selectedId: null, // Currently selected life area for filtering
  isLoading: false,
  error: null,
  lastFetched: null,
};

const lifeAreasSlice = createSlice({
  name: 'lifeAreas',
  initialState,
  reducers: {
    clearLifeAreas: (state) => {
      state.items = [];
      state.selectedId = null;
      state.lastFetched = null;
    },
    selectLifeArea: (state, action) => {
      state.selectedId = action.payload;
    },
    clearSelectedLifeArea: (state) => {
      state.selectedId = null;
    },
    updateLifeAreaInStore: (state, action) => {
      const index = state.items.findIndex(la => la._id === action.payload._id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
    },
    addLifeAreaToStore: (state, action) => {
      state.items.push(action.payload);
    },
    removeLifeAreaFromStore: (state, action) => {
      state.items = state.items.filter(la => la._id !== action.payload);
      if (state.selectedId === action.payload) {
        state.selectedId = null;
      }
    },
    reorderLifeAreasInStore: (state, action) => {
      state.items = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLifeAreas.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLifeAreas.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchLifeAreas.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

// Selectors
export const selectLifeAreas = (state) => state.lifeAreas.items;
export const selectActiveLifeAreas = (state) =>
  state.lifeAreas.items.filter((la) => !la.isArchived);
export const selectArchivedLifeAreas = (state) =>
  state.lifeAreas.items.filter((la) => la.isArchived);
export const selectDefaultLifeArea = (state) =>
  state.lifeAreas.items.find((la) => la.isDefault);
export const selectSelectedLifeAreaId = (state) => state.lifeAreas.selectedId;
export const selectSelectedLifeArea = (state) =>
  state.lifeAreas.items.find((la) => la._id === state.lifeAreas.selectedId);
export const selectLifeAreasLoading = (state) => state.lifeAreas.isLoading;
export const selectLifeAreaById = (id) => (state) =>
  state.lifeAreas.items.find((la) => la._id === id);

export const {
  clearLifeAreas,
  selectLifeArea,
  clearSelectedLifeArea,
  updateLifeAreaInStore,
  addLifeAreaToStore,
  removeLifeAreaFromStore,
  reorderLifeAreasInStore,
} = lifeAreasSlice.actions;

export default lifeAreasSlice.reducer;
