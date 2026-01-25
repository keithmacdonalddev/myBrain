import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { TaskPanelProvider, useTaskPanel } from './TaskPanelContext';

describe('TaskPanelContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useTaskPanel', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTaskPanel());
      }).toThrow('useTaskPanel must be used within a TaskPanelProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('initial state', () => {
    it('has isOpen set to false initially', () => {
      const { result } = renderHook(() => useTaskPanel(), {
        wrapper: TaskPanelProvider,
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('has taskId set to null initially', () => {
      const { result } = renderHook(() => useTaskPanel(), {
        wrapper: TaskPanelProvider,
      });

      expect(result.current.taskId).toBeNull();
    });

    it('has initialData set to null initially', () => {
      const { result } = renderHook(() => useTaskPanel(), {
        wrapper: TaskPanelProvider,
      });

      expect(result.current.initialData).toBeNull();
    });

    it('provides all expected functions', () => {
      const { result } = renderHook(() => useTaskPanel(), {
        wrapper: TaskPanelProvider,
      });

      expect(typeof result.current.openTask).toBe('function');
      expect(typeof result.current.openNewTask).toBe('function');
      expect(typeof result.current.closeTask).toBe('function');
    });
  });

  describe('openTask', () => {
    it('opens the panel with specified task id', () => {
      const { result } = renderHook(() => useTaskPanel(), {
        wrapper: TaskPanelProvider,
      });

      act(() => {
        result.current.openTask('task-123');
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.taskId).toBe('task-123');
    });

    it('clears initialData when opening existing task', () => {
      const { result } = renderHook(() => useTaskPanel(), {
        wrapper: TaskPanelProvider,
      });

      // First open a new task with initial data
      act(() => {
        result.current.openNewTask({ title: 'Test' });
      });

      expect(result.current.initialData).toEqual({ title: 'Test' });

      // Close the panel first
      act(() => {
        result.current.closeTask();
      });

      // Now open an existing task - should clear initialData
      act(() => {
        result.current.openTask('task-456');
      });

      expect(result.current.initialData).toBeNull();
    });
  });

  describe('openNewTask', () => {
    it('opens the panel for a new task', () => {
      const { result } = renderHook(() => useTaskPanel(), {
        wrapper: TaskPanelProvider,
      });

      act(() => {
        result.current.openNewTask();
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.taskId).toBeNull();
    });

    it('accepts initial data for pre-filling', () => {
      const { result } = renderHook(() => useTaskPanel(), {
        wrapper: TaskPanelProvider,
      });

      const initialData = { title: 'Pre-filled title', priority: 'high' };

      act(() => {
        result.current.openNewTask(initialData);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.taskId).toBeNull();
      expect(result.current.initialData).toEqual(initialData);
    });

    it('sets initialData to null when called without arguments', () => {
      const { result } = renderHook(() => useTaskPanel(), {
        wrapper: TaskPanelProvider,
      });

      act(() => {
        result.current.openNewTask();
      });

      expect(result.current.initialData).toBeNull();
    });
  });

  describe('closeTask', () => {
    it('sets isOpen to false immediately', () => {
      const { result } = renderHook(() => useTaskPanel(), {
        wrapper: TaskPanelProvider,
      });

      // Open first
      act(() => {
        result.current.openTask('task-123');
      });

      expect(result.current.isOpen).toBe(true);

      // Close
      act(() => {
        result.current.closeTask();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('clears taskId after animation delay', () => {
      const { result } = renderHook(() => useTaskPanel(), {
        wrapper: TaskPanelProvider,
      });

      // Open first
      act(() => {
        result.current.openTask('task-123');
      });

      expect(result.current.taskId).toBe('task-123');

      // Close
      act(() => {
        result.current.closeTask();
      });

      // taskId should still be set immediately after close (for animation)
      expect(result.current.taskId).toBe('task-123');

      // Fast forward past the 300ms delay
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.taskId).toBeNull();
    });

    it('clears initialData after animation delay', () => {
      const { result } = renderHook(() => useTaskPanel(), {
        wrapper: TaskPanelProvider,
      });

      // Open new task with initial data
      act(() => {
        result.current.openNewTask({ title: 'Test' });
      });

      expect(result.current.initialData).toEqual({ title: 'Test' });

      // Close
      act(() => {
        result.current.closeTask();
      });

      // initialData should still be set immediately after close (for animation)
      expect(result.current.initialData).toEqual({ title: 'Test' });

      // Fast forward past the 300ms delay
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.initialData).toBeNull();
    });
  });

  describe('callback stability', () => {
    it('returns stable function references', () => {
      const { result, rerender } = renderHook(() => useTaskPanel(), {
        wrapper: TaskPanelProvider,
      });

      const firstRender = {
        openTask: result.current.openTask,
        openNewTask: result.current.openNewTask,
        closeTask: result.current.closeTask,
      };

      rerender();

      expect(result.current.openTask).toBe(firstRender.openTask);
      expect(result.current.openNewTask).toBe(firstRender.openNewTask);
      expect(result.current.closeTask).toBe(firstRender.closeTask);
    });
  });

  describe('workflow scenarios', () => {
    it('can open and close multiple tasks in sequence', () => {
      const { result } = renderHook(() => useTaskPanel(), {
        wrapper: TaskPanelProvider,
      });

      // Open first task
      act(() => {
        result.current.openTask('task-1');
      });
      expect(result.current.taskId).toBe('task-1');

      // Open second task (directly, without closing first)
      act(() => {
        result.current.openTask('task-2');
      });
      expect(result.current.taskId).toBe('task-2');
      expect(result.current.isOpen).toBe(true);
    });

    it('can switch from existing task to new task', () => {
      const { result } = renderHook(() => useTaskPanel(), {
        wrapper: TaskPanelProvider,
      });

      // Open existing task
      act(() => {
        result.current.openTask('task-123');
      });
      expect(result.current.taskId).toBe('task-123');

      // Switch to new task
      act(() => {
        result.current.openNewTask({ title: 'New Task' });
      });
      expect(result.current.taskId).toBeNull();
      expect(result.current.initialData).toEqual({ title: 'New Task' });
      expect(result.current.isOpen).toBe(true);
    });
  });
});
