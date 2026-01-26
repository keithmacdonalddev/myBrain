import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useDebounce from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));

    expect(result.current).toBe('initial');
  });

  it('uses default delay of 300ms when not specified', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'first' } }
    );

    // Update value
    rerender({ value: 'second' });

    // Value should not change before 300ms
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('first');

    // Value should change after 300ms
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('second');
  });

  it('debounces value updates by the specified delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    // Update value
    rerender({ value: 'updated', delay: 500 });

    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Value should not change before delay
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current).toBe('initial');

    // Value should change after delay
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('updated');
  });

  it('resets timer when value changes before delay completes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'first' } }
    );

    // First update
    rerender({ value: 'second' });

    // Advance partially
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current).toBe('first');

    // Second update - timer should reset
    rerender({ value: 'third' });

    // Advance another 400ms (total 800ms from first update, but only 400ms from second)
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current).toBe('first'); // Still first because timer was reset

    // Advance final 100ms to complete delay from second update
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('third');
  });

  it('handles rapid value changes correctly', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    );

    // Rapid updates
    rerender({ value: 'b' });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: 'c' });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: 'd' });
    act(() => { vi.advanceTimersByTime(100); });

    rerender({ value: 'e' });

    // Should still be at initial value
    expect(result.current).toBe('a');

    // Wait for full delay from last update
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should have the final value
    expect(result.current).toBe('e');
  });

  it('works with different value types - numbers', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: 0 } }
    );

    rerender({ value: 42 });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(42);
  });

  it('works with different value types - objects', () => {
    const initialObj = { name: 'test' };
    const updatedObj = { name: 'updated' };

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: initialObj } }
    );

    rerender({ value: updatedObj });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toEqual(updatedObj);
  });

  it('works with different value types - null and undefined', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 200),
      { initialProps: { value: null } }
    );

    expect(result.current).toBe(null);

    rerender({ value: undefined });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe(undefined);
  });

  it('updates immediately when delay changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    // Update both value and delay
    rerender({ value: 'updated', delay: 100 });

    // Wait for new shorter delay
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe('updated');
  });

  it('cleans up timeout on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    const { rerender, unmount } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );

    // Trigger a timeout
    rerender({ value: 'updated' });

    // Unmount before timeout completes
    unmount();

    // clearTimeout should have been called during cleanup
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });

  it('handles zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 0),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    // Even with zero delay, setTimeout is still async
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current).toBe('updated');
  });
});
