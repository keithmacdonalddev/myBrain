import { createSlice } from '@reduxjs/toolkit';

let nextId = 1;

const initialState = {
  toasts: [],
};

const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    addToast: (state, action) => {
      const toast = {
        id: nextId++,
        type: 'info', // 'success' | 'error' | 'warning' | 'info'
        duration: 5000,
        ...action.payload,
      };
      state.toasts.push(toast);
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    clearToasts: (state) => {
      state.toasts = [];
    },
  },
});

export const { addToast, removeToast, clearToasts } = toastSlice.actions;

// Helper action creators
export const showToast = (message, options = {}) => (dispatch) => {
  dispatch(addToast({ message, ...options }));
};

export const showSuccess = (message, options = {}) => (dispatch) => {
  dispatch(addToast({ message, type: 'success', ...options }));
};

export const showError = (message, options = {}) => (dispatch) => {
  dispatch(addToast({ message, type: 'error', duration: 8000, ...options }));
};

export const showWarning = (message, options = {}) => (dispatch) => {
  dispatch(addToast({ message, type: 'warning', ...options }));
};

// Toast with undo action
export const showUndoToast = (message, onUndo, options = {}) => (dispatch) => {
  dispatch(
    addToast({
      message,
      type: 'info',
      duration: 8000,
      undoAction: onUndo,
      ...options,
    })
  );
};

export default toastSlice.reducer;
