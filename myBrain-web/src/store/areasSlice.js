import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { areasApi } from '../lib/api';

// Async thunks
export const fetchAreas = createAsyncThunk(
  'areas/fetchAreas',
  async (_, { rejectWithValue }) => {
    try {
      const response = await areasApi.getAreas();
      return response.data.areas;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  items: [],
  isLoading: false,
  error: null,
  lastFetched: null,
};

const areasSlice = createSlice({
  name: 'areas',
  initialState,
  reducers: {
    clearAreas: (state) => {
      state.items = [];
      state.lastFetched = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAreas.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAreas.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
        state.lastFetched = Date.now();
      })
      .addCase(fetchAreas.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

// Selectors
export const selectAreas = (state) => state.areas.items;
export const selectActiveAreas = (state) =>
  state.areas.items.filter((area) => area.status === 'active');
export const selectComingSoonAreas = (state) =>
  state.areas.items.filter((area) => area.status === 'coming_soon');
export const selectAreasLoading = (state) => state.areas.isLoading;

export const { clearAreas } = areasSlice.actions;
export default areasSlice.reducer;
