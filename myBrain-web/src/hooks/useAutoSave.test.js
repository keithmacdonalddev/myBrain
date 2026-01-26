import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useAutoSave, { arraysEqual, createChangeDetector } from './useAutoSave';

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const defaultProps = {
    id: 'test-id-123',
    currentData: { title: 'Test', content: 'Content' },
    onSave: vi.fn().mockResolvedValue({}),
    isOpen: true,
    debounceMs: 1500,
    retryMs: 5000,
  };

  describe('initial state', () => {
    it('returns correct initial values', () => {
      const { result } = renderHook(() => useAutoSave(defaultProps));

      expect(result.current.saveStatus).toBe('saved');
      expect(result.current.lastSaved).toBe(null);
      expect(typeof result.current.triggerSave).toBe('function');
      expect(typeof result.current.resetSaveState).toBe('function');
      expect(typeof result.current.setLastSavedData).toBe('function');
      expect(typeof result.current.setSaveStatus).toBe('function');
      expect(typeof result.current.setLastSaved).toBe('function');
    });

    it('does not auto-save when panel is not open', () => {
      const onSave = vi.fn();
      renderHook(() => useAutoSave({
        ...defaultProps,
        isOpen: false,
        onSave,
      }));

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onSave).not.toHaveBeenCalled();
    });

    it('does not auto-save for new items (no id)', () => {
      const onSave = vi.fn();
      renderHook(() => useAutoSave({
        ...defaultProps,
        id: null,
        onSave,
      }));

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('auto-save behavior', () => {
    it('sets status to unsaved when data changes', () => {
      const { result, rerender } = renderHook(
        (props) => useAutoSave(props),
        { initialProps: defaultProps }
      );

      // Change data
      rerender({
        ...defaultProps,
        currentData: { title: 'Updated', content: 'Content' },
      });

      expect(result.current.saveStatus).toBe('unsaved');
    });

    it('auto-saves after debounce delay when data changes', async () => {
      const onSave = vi.fn().mockResolvedValue({});
      const { result, rerender } = renderHook(
        (props) => useAutoSave(props),
        { initialProps: { ...defaultProps, onSave } }
      );

      // Change data
      rerender({
        ...defaultProps,
        onSave,
        currentData: { title: 'Updated', content: 'Content' },
      });

      // Before debounce completes
      act(() => {
        vi.advanceTimersByTime(1499);
      });
      expect(onSave).not.toHaveBeenCalled();

      // After debounce completes
      await act(async () => {
        vi.advanceTimersByTime(1);
        await Promise.resolve();
      });

      expect(onSave).toHaveBeenCalledWith({ title: 'Updated', content: 'Content' });
    });

    it('updates status to saved after successful save', async () => {
      const onSave = vi.fn().mockResolvedValue({});
      const { result, rerender } = renderHook(
        (props) => useAutoSave(props),
        { initialProps: { ...defaultProps, onSave } }
      );

      // Change data
      rerender({
        ...defaultProps,
        onSave,
        currentData: { title: 'Updated', content: 'Content' },
      });

      expect(result.current.saveStatus).toBe('unsaved');

      // Complete save
      await act(async () => {
        vi.advanceTimersByTime(1500);
        await Promise.resolve();
      });

      expect(result.current.saveStatus).toBe('saved');
      expect(result.current.lastSaved).toBeInstanceOf(Date);
    });

    it('sets status to error on save failure', async () => {
      const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));
      const { result, rerender } = renderHook(
        (props) => useAutoSave(props),
        { initialProps: { ...defaultProps, onSave } }
      );

      // Change data
      rerender({
        ...defaultProps,
        onSave,
        currentData: { title: 'Updated', content: 'Content' },
      });

      // Complete save attempt
      await act(async () => {
        vi.advanceTimersByTime(1500);
        await Promise.resolve();
      });

      expect(result.current.saveStatus).toBe('error');
    });

    it('retries after failure with configured retry delay', async () => {
      const onSave = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValueOnce({});

      const { result, rerender } = renderHook(
        (props) => useAutoSave(props),
        { initialProps: { ...defaultProps, onSave, retryMs: 3000 } }
      );

      // Change data to trigger auto-save
      rerender({
        ...defaultProps,
        onSave,
        retryMs: 3000,
        currentData: { title: 'Updated', content: 'Content' },
      });

      // First attempt - fails
      await act(async () => {
        vi.advanceTimersByTime(1500);
        await Promise.resolve();
      });

      expect(result.current.saveStatus).toBe('error');
      expect(onSave).toHaveBeenCalledTimes(1);

      // Retry after retryMs
      await act(async () => {
        vi.advanceTimersByTime(3000);
        await Promise.resolve();
      });

      expect(onSave).toHaveBeenCalledTimes(2);
    });

    it('debounces rapid data changes', async () => {
      const onSave = vi.fn().mockResolvedValue({});
      const { rerender } = renderHook(
        (props) => useAutoSave(props),
        { initialProps: { ...defaultProps, onSave } }
      );

      // Rapid changes
      for (let i = 0; i < 5; i++) {
        rerender({
          ...defaultProps,
          onSave,
          currentData: { title: `Change ${i}`, content: 'Content' },
        });
        act(() => {
          vi.advanceTimersByTime(500);
        });
      }

      // Complete the final debounce
      await act(async () => {
        vi.advanceTimersByTime(1500);
        await Promise.resolve();
      });

      // Should only save once with the final value
      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith({ title: 'Change 4', content: 'Content' });
    });
  });

  describe('triggerSave', () => {
    it('triggers immediate save bypassing debounce', async () => {
      const onSave = vi.fn().mockResolvedValue({});
      const { result, rerender } = renderHook(
        (props) => useAutoSave(props),
        { initialProps: { ...defaultProps, onSave } }
      );

      // Change data
      rerender({
        ...defaultProps,
        onSave,
        currentData: { title: 'Updated', content: 'Content' },
      });

      // Trigger immediate save
      await act(async () => {
        result.current.triggerSave();
        await Promise.resolve();
      });

      expect(onSave).toHaveBeenCalledWith({ title: 'Updated', content: 'Content' });
    });

    it('clears pending debounced save when triggered', async () => {
      const onSave = vi.fn().mockResolvedValue({});
      const { result, rerender } = renderHook(
        (props) => useAutoSave(props),
        { initialProps: { ...defaultProps, onSave } }
      );

      // Change data to start debounce
      rerender({
        ...defaultProps,
        onSave,
        currentData: { title: 'Updated', content: 'Content' },
      });

      // Advance partially then trigger
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await act(async () => {
        result.current.triggerSave();
        await Promise.resolve();
      });

      // Advance past when debounced save would have fired
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should only have saved once from triggerSave
      expect(onSave).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetSaveState', () => {
    it('resets status to saved and updates lastSavedRef', () => {
      const { result, rerender } = renderHook(
        (props) => useAutoSave(props),
        { initialProps: defaultProps }
      );

      // Change data to trigger unsaved status
      rerender({
        ...defaultProps,
        currentData: { title: 'Updated', content: 'Content' },
      });

      expect(result.current.saveStatus).toBe('unsaved');

      // Reset with new data
      act(() => {
        result.current.resetSaveState({ title: 'Updated', content: 'Content' });
      });

      expect(result.current.saveStatus).toBe('saved');
    });

    it('handles null/undefined initial data', () => {
      const { result } = renderHook(() => useAutoSave(defaultProps));

      act(() => {
        result.current.resetSaveState(null);
      });

      expect(result.current.saveStatus).toBe('saved');

      act(() => {
        result.current.resetSaveState(undefined);
      });

      expect(result.current.saveStatus).toBe('saved');
    });
  });

  describe('setLastSavedData', () => {
    it('updates the lastSavedRef without changing status', () => {
      const { result } = renderHook(() => useAutoSave(defaultProps));

      act(() => {
        result.current.setLastSavedData({ title: 'New', content: 'Data' });
      });

      // Status should remain saved since we're just updating the reference
      expect(result.current.saveStatus).toBe('saved');
    });
  });

  describe('custom hasChanges function', () => {
    it('uses custom hasChanges function when provided', async () => {
      const onSave = vi.fn().mockResolvedValue({});
      const customHasChanges = vi.fn().mockReturnValue(true);

      const { rerender } = renderHook(
        (props) => useAutoSave(props),
        {
          initialProps: {
            ...defaultProps,
            onSave,
            hasChanges: customHasChanges,
          }
        }
      );

      rerender({
        ...defaultProps,
        onSave,
        hasChanges: customHasChanges,
        currentData: { title: 'Same', content: 'Same' },
      });

      expect(customHasChanges).toHaveBeenCalled();
    });
  });

  describe('panel close behavior', () => {
    it('saves on panel close if there are unsaved changes', async () => {
      const onSave = vi.fn().mockResolvedValue({});
      const { rerender } = renderHook(
        (props) => useAutoSave(props),
        { initialProps: { ...defaultProps, onSave } }
      );

      // Change data to trigger unsaved status
      rerender({
        ...defaultProps,
        onSave,
        currentData: { title: 'Updated', content: 'Content' },
      });

      // Close panel
      await act(async () => {
        rerender({
          ...defaultProps,
          onSave,
          isOpen: false,
          currentData: { title: 'Updated', content: 'Content' },
        });
        await Promise.resolve();
      });

      expect(onSave).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('clears timeouts on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { rerender, unmount } = renderHook(
        (props) => useAutoSave(props),
        { initialProps: defaultProps }
      );

      // Trigger a pending save
      rerender({
        ...defaultProps,
        currentData: { title: 'Updated', content: 'Content' },
      });

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });
});

describe('arraysEqual', () => {
  it('returns true for equal arrays', () => {
    expect(arraysEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(arraysEqual(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(arraysEqual([], [])).toBe(true);
  });

  it('returns false for unequal arrays', () => {
    expect(arraysEqual([1, 2, 3], [1, 2])).toBe(false);
    expect(arraysEqual([1, 2], [2, 1])).toBe(false);
    expect(arraysEqual(['a'], ['b'])).toBe(false);
  });

  it('handles non-array values', () => {
    expect(arraysEqual(null, null)).toBe(true);
    expect(arraysEqual(undefined, undefined)).toBe(true);
    expect(arraysEqual('test', 'test')).toBe(true);
    expect(arraysEqual('test', 'other')).toBe(false);
    expect(arraysEqual([1], null)).toBe(false);
  });

  it('handles arrays with objects', () => {
    const arr1 = [{ id: 1 }, { id: 2 }];
    const arr2 = [{ id: 1 }, { id: 2 }];
    const arr3 = [{ id: 2 }, { id: 1 }];

    expect(arraysEqual(arr1, arr2)).toBe(true);
    expect(arraysEqual(arr1, arr3)).toBe(false);
  });
});

describe('createChangeDetector', () => {
  it('creates a function that detects changes in specified fields', () => {
    const detector = createChangeDetector(['title', 'content']);

    const current = { title: 'New', content: 'Updated', extra: 'ignored' };
    const saved = { title: 'Old', content: 'Original', extra: 'ignored' };

    expect(detector(current, saved)).toBe(true);
  });

  it('returns false when specified fields are unchanged', () => {
    const detector = createChangeDetector(['title', 'content']);

    const current = { title: 'Same', content: 'Same', extra: 'different' };
    const saved = { title: 'Same', content: 'Same', extra: 'ignored' };

    expect(detector(current, saved)).toBe(false);
  });

  it('handles array fields correctly', () => {
    const detector = createChangeDetector(['tags']);

    expect(detector(
      { tags: ['a', 'b'] },
      { tags: ['a', 'b'] }
    )).toBe(false);

    expect(detector(
      { tags: ['a', 'b', 'c'] },
      { tags: ['a', 'b'] }
    )).toBe(true);
  });

  it('handles undefined fields', () => {
    const detector = createChangeDetector(['title']);

    expect(detector(
      { title: 'defined' },
      { title: undefined }
    )).toBe(true);

    expect(detector(
      { title: undefined },
      { title: undefined }
    )).toBe(false);
  });
});
