import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import toastReducer from '../store/toastSlice';
import useToast from './useToast';

// Create a wrapper with Redux Provider
function createWrapper(preloadedState = {}) {
  const store = configureStore({
    reducer: {
      toast: toastReducer,
    },
    preloadedState,
  });

  return {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    store,
  };
}

describe('useToast', () => {
  it('returns all toast functions', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useToast(), { wrapper });

    expect(typeof result.current.toast).toBe('function');
    expect(typeof result.current.success).toBe('function');
    expect(typeof result.current.error).toBe('function');
    expect(typeof result.current.warning).toBe('function');
    expect(typeof result.current.undo).toBe('function');
  });

  describe('toast', () => {
    it('dispatches showToast action with message', () => {
      const { wrapper, store } = createWrapper();
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.toast('Test message');
      });

      const state = store.getState();
      expect(state.toast.toasts).toHaveLength(1);
      expect(state.toast.toasts[0].message).toBe('Test message');
      expect(state.toast.toasts[0].type).toBe('info'); // default type
    });

    it('dispatches showToast action with options', () => {
      const { wrapper, store } = createWrapper();
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.toast('Test message', { duration: 10000 });
      });

      const state = store.getState();
      expect(state.toast.toasts[0].duration).toBe(10000);
    });
  });

  describe('success', () => {
    it('dispatches showSuccess action with success type', () => {
      const { wrapper, store } = createWrapper();
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.success('Success message');
      });

      const state = store.getState();
      expect(state.toast.toasts).toHaveLength(1);
      expect(state.toast.toasts[0].message).toBe('Success message');
      expect(state.toast.toasts[0].type).toBe('success');
    });

    it('accepts additional options', () => {
      const { wrapper, store } = createWrapper();
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.success('Success', { duration: 3000 });
      });

      const state = store.getState();
      expect(state.toast.toasts[0].duration).toBe(3000);
    });
  });

  describe('error', () => {
    it('dispatches showError action with error type', () => {
      const { wrapper, store } = createWrapper();
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.error('Error message');
      });

      const state = store.getState();
      expect(state.toast.toasts).toHaveLength(1);
      expect(state.toast.toasts[0].message).toBe('Error message');
      expect(state.toast.toasts[0].type).toBe('error');
    });

    it('uses longer default duration for errors (8000ms)', () => {
      const { wrapper, store } = createWrapper();
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.error('Error message');
      });

      const state = store.getState();
      expect(state.toast.toasts[0].duration).toBe(8000);
    });
  });

  describe('warning', () => {
    it('dispatches showWarning action with warning type', () => {
      const { wrapper, store } = createWrapper();
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.warning('Warning message');
      });

      const state = store.getState();
      expect(state.toast.toasts).toHaveLength(1);
      expect(state.toast.toasts[0].message).toBe('Warning message');
      expect(state.toast.toasts[0].type).toBe('warning');
    });
  });

  describe('undo', () => {
    it('dispatches showUndoToast with undo action', () => {
      const { wrapper, store } = createWrapper();
      const { result } = renderHook(() => useToast(), { wrapper });

      const undoFn = vi.fn();

      act(() => {
        result.current.undo('Item deleted', undoFn);
      });

      const state = store.getState();
      expect(state.toast.toasts).toHaveLength(1);
      expect(state.toast.toasts[0].message).toBe('Item deleted');
      expect(state.toast.toasts[0].type).toBe('info');
      expect(state.toast.toasts[0].undoAction).toBe(undoFn);
    });

    it('uses 8000ms duration for undo toasts', () => {
      const { wrapper, store } = createWrapper();
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.undo('Item deleted', () => {});
      });

      const state = store.getState();
      expect(state.toast.toasts[0].duration).toBe(8000);
    });

    it('accepts additional options', () => {
      const { wrapper, store } = createWrapper();
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.undo('Item deleted', () => {}, { duration: 15000 });
      });

      const state = store.getState();
      expect(state.toast.toasts[0].duration).toBe(15000);
    });
  });

  describe('multiple toasts', () => {
    it('can show multiple toasts', () => {
      const { wrapper, store } = createWrapper();
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.success('First');
        result.current.error('Second');
        result.current.warning('Third');
      });

      const state = store.getState();
      expect(state.toast.toasts).toHaveLength(3);
      expect(state.toast.toasts[0].message).toBe('First');
      expect(state.toast.toasts[1].message).toBe('Second');
      expect(state.toast.toasts[2].message).toBe('Third');
    });

    it('assigns unique ids to each toast', () => {
      const { wrapper, store } = createWrapper();
      const { result } = renderHook(() => useToast(), { wrapper });

      act(() => {
        result.current.toast('First');
        result.current.toast('Second');
      });

      const state = store.getState();
      expect(state.toast.toasts[0].id).not.toBe(state.toast.toasts[1].id);
    });
  });

  describe('callback stability', () => {
    it('returns stable function references', () => {
      const { wrapper } = createWrapper();
      const { result, rerender } = renderHook(() => useToast(), { wrapper });

      const firstRender = {
        toast: result.current.toast,
        success: result.current.success,
        error: result.current.error,
        warning: result.current.warning,
        undo: result.current.undo,
      };

      rerender();

      expect(result.current.toast).toBe(firstRender.toast);
      expect(result.current.success).toBe(firstRender.success);
      expect(result.current.error).toBe(firstRender.error);
      expect(result.current.warning).toBe(firstRender.warning);
      expect(result.current.undo).toBe(firstRender.undo);
    });
  });
});
