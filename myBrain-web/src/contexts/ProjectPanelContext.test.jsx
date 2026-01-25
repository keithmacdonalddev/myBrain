import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ProjectPanelProvider, useProjectPanel } from './ProjectPanelContext';

describe('ProjectPanelContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useProjectPanel', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useProjectPanel());
      }).toThrow('useProjectPanel must be used within a ProjectPanelProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('initial state', () => {
    it('has isOpen set to false initially', () => {
      const { result } = renderHook(() => useProjectPanel(), {
        wrapper: ProjectPanelProvider,
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('has projectId set to null initially', () => {
      const { result } = renderHook(() => useProjectPanel(), {
        wrapper: ProjectPanelProvider,
      });

      expect(result.current.projectId).toBeNull();
    });

    it('provides all expected functions', () => {
      const { result } = renderHook(() => useProjectPanel(), {
        wrapper: ProjectPanelProvider,
      });

      expect(typeof result.current.openProject).toBe('function');
      expect(typeof result.current.openNewProject).toBe('function');
      expect(typeof result.current.closeProject).toBe('function');
    });
  });

  describe('openProject', () => {
    it('opens the panel with specified project id', () => {
      const { result } = renderHook(() => useProjectPanel(), {
        wrapper: ProjectPanelProvider,
      });

      act(() => {
        result.current.openProject('project-123');
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.projectId).toBe('project-123');
    });

    it('can open different projects', () => {
      const { result } = renderHook(() => useProjectPanel(), {
        wrapper: ProjectPanelProvider,
      });

      act(() => {
        result.current.openProject('project-abc');
      });

      expect(result.current.projectId).toBe('project-abc');

      act(() => {
        result.current.openProject('project-xyz');
      });

      expect(result.current.projectId).toBe('project-xyz');
    });
  });

  describe('openNewProject', () => {
    it('opens the panel for a new project', () => {
      const { result } = renderHook(() => useProjectPanel(), {
        wrapper: ProjectPanelProvider,
      });

      act(() => {
        result.current.openNewProject();
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.projectId).toBeNull();
    });

    it('clears projectId when switching from existing project', () => {
      const { result } = renderHook(() => useProjectPanel(), {
        wrapper: ProjectPanelProvider,
      });

      // First open an existing project
      act(() => {
        result.current.openProject('project-123');
      });

      expect(result.current.projectId).toBe('project-123');

      // Now open a new project
      act(() => {
        result.current.openNewProject();
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.projectId).toBeNull();
    });
  });

  describe('closeProject', () => {
    it('sets isOpen to false immediately', () => {
      const { result } = renderHook(() => useProjectPanel(), {
        wrapper: ProjectPanelProvider,
      });

      // Open first
      act(() => {
        result.current.openProject('project-123');
      });

      expect(result.current.isOpen).toBe(true);

      // Close
      act(() => {
        result.current.closeProject();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('clears projectId after animation delay', () => {
      const { result } = renderHook(() => useProjectPanel(), {
        wrapper: ProjectPanelProvider,
      });

      // Open first
      act(() => {
        result.current.openProject('project-123');
      });

      expect(result.current.projectId).toBe('project-123');

      // Close
      act(() => {
        result.current.closeProject();
      });

      // projectId should still be set immediately after close (for animation)
      expect(result.current.projectId).toBe('project-123');

      // Fast forward past the 300ms delay
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.projectId).toBeNull();
    });

    it('keeps projectId during animation period', () => {
      const { result } = renderHook(() => useProjectPanel(), {
        wrapper: ProjectPanelProvider,
      });

      // Open
      act(() => {
        result.current.openProject('project-abc');
      });

      // Close
      act(() => {
        result.current.closeProject();
      });

      // Advance only 200ms (less than 300ms animation delay)
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // projectId should still be set for animation
      expect(result.current.projectId).toBe('project-abc');

      // Advance remaining time
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Now it should be cleared
      expect(result.current.projectId).toBeNull();
    });
  });

  describe('callback stability', () => {
    it('returns stable function references', () => {
      const { result, rerender } = renderHook(() => useProjectPanel(), {
        wrapper: ProjectPanelProvider,
      });

      const firstRender = {
        openProject: result.current.openProject,
        openNewProject: result.current.openNewProject,
        closeProject: result.current.closeProject,
      };

      rerender();

      expect(result.current.openProject).toBe(firstRender.openProject);
      expect(result.current.openNewProject).toBe(firstRender.openNewProject);
      expect(result.current.closeProject).toBe(firstRender.closeProject);
    });
  });

  describe('workflow scenarios', () => {
    it('can open and close multiple projects in sequence', () => {
      const { result } = renderHook(() => useProjectPanel(), {
        wrapper: ProjectPanelProvider,
      });

      // Open first project
      act(() => {
        result.current.openProject('project-1');
      });
      expect(result.current.projectId).toBe('project-1');

      // Open second project (directly, without closing first)
      act(() => {
        result.current.openProject('project-2');
      });
      expect(result.current.projectId).toBe('project-2');
      expect(result.current.isOpen).toBe(true);
    });

    it('can switch from existing project to new project', () => {
      const { result } = renderHook(() => useProjectPanel(), {
        wrapper: ProjectPanelProvider,
      });

      // Open existing project
      act(() => {
        result.current.openProject('project-123');
      });
      expect(result.current.projectId).toBe('project-123');

      // Switch to new project
      act(() => {
        result.current.openNewProject();
      });
      expect(result.current.projectId).toBeNull();
      expect(result.current.isOpen).toBe(true);
    });

    it('can switch from new project to existing project', () => {
      const { result } = renderHook(() => useProjectPanel(), {
        wrapper: ProjectPanelProvider,
      });

      // Open new project
      act(() => {
        result.current.openNewProject();
      });
      expect(result.current.projectId).toBeNull();
      expect(result.current.isOpen).toBe(true);

      // Switch to existing project
      act(() => {
        result.current.openProject('project-456');
      });
      expect(result.current.projectId).toBe('project-456');
      expect(result.current.isOpen).toBe(true);
    });
  });
});
