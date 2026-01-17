import { describe, it, expect } from 'vitest';
import toastReducer, {
  addToast,
  removeToast,
  clearToasts,
} from './toastSlice';

describe('toastSlice', () => {
  const initialState = {
    toasts: [],
  };

  describe('reducers', () => {
    it('should return initial state', () => {
      expect(toastReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    it('should add toast with default values', () => {
      const state = toastReducer(initialState, addToast({ message: 'Hello' }));

      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0].message).toBe('Hello');
      expect(state.toasts[0].type).toBe('info');
      expect(state.toasts[0].duration).toBe(5000);
      expect(state.toasts[0].id).toBeDefined();
    });

    it('should add toast with custom type', () => {
      const state = toastReducer(initialState, addToast({
        message: 'Success!',
        type: 'success',
      }));

      expect(state.toasts[0].type).toBe('success');
    });

    it('should add toast with custom duration', () => {
      const state = toastReducer(initialState, addToast({
        message: 'Error!',
        type: 'error',
        duration: 10000,
      }));

      expect(state.toasts[0].duration).toBe(10000);
    });

    it('should add multiple toasts', () => {
      let state = toastReducer(initialState, addToast({ message: 'First' }));
      state = toastReducer(state, addToast({ message: 'Second' }));
      state = toastReducer(state, addToast({ message: 'Third' }));

      expect(state.toasts).toHaveLength(3);
      expect(state.toasts[0].message).toBe('First');
      expect(state.toasts[2].message).toBe('Third');
    });

    it('should remove toast by id', () => {
      let state = toastReducer(initialState, addToast({ message: 'First' }));
      state = toastReducer(state, addToast({ message: 'Second' }));

      const toastId = state.toasts[0].id;
      state = toastReducer(state, removeToast(toastId));

      expect(state.toasts).toHaveLength(1);
      expect(state.toasts[0].message).toBe('Second');
    });

    it('should clear all toasts', () => {
      let state = toastReducer(initialState, addToast({ message: 'First' }));
      state = toastReducer(state, addToast({ message: 'Second' }));
      state = toastReducer(state, clearToasts());

      expect(state.toasts).toHaveLength(0);
    });

    it('should add toast with undo action', () => {
      const undoFn = () => {};
      const state = toastReducer(initialState, addToast({
        message: 'Archived',
        undoAction: undoFn,
      }));

      expect(state.toasts[0].undoAction).toBe(undoFn);
    });
  });
});
