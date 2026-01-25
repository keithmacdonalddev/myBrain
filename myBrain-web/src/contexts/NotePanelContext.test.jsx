import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { NotePanelProvider, useNotePanel } from './NotePanelContext';

describe('NotePanelContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('useNotePanel', () => {
    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useNotePanel());
      }).toThrow('useNotePanel must be used within a NotePanelProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('initial state', () => {
    it('has isOpen set to false initially', () => {
      const { result } = renderHook(() => useNotePanel(), {
        wrapper: NotePanelProvider,
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('has noteId set to null initially', () => {
      const { result } = renderHook(() => useNotePanel(), {
        wrapper: NotePanelProvider,
      });

      expect(result.current.noteId).toBeNull();
    });

    it('has initialData set to null initially', () => {
      const { result } = renderHook(() => useNotePanel(), {
        wrapper: NotePanelProvider,
      });

      expect(result.current.initialData).toBeNull();
    });

    it('provides all expected functions', () => {
      const { result } = renderHook(() => useNotePanel(), {
        wrapper: NotePanelProvider,
      });

      expect(typeof result.current.openNote).toBe('function');
      expect(typeof result.current.openNewNote).toBe('function');
      expect(typeof result.current.closeNote).toBe('function');
    });
  });

  describe('openNote', () => {
    it('opens the panel with specified note id', () => {
      const { result } = renderHook(() => useNotePanel(), {
        wrapper: NotePanelProvider,
      });

      act(() => {
        result.current.openNote('note-123');
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.noteId).toBe('note-123');
    });

    it('clears initialData when opening existing note', () => {
      const { result } = renderHook(() => useNotePanel(), {
        wrapper: NotePanelProvider,
      });

      // First open a new note with initial data
      act(() => {
        result.current.openNewNote({ title: 'Test' });
      });

      expect(result.current.initialData).toEqual({ title: 'Test' });

      // Close the panel first
      act(() => {
        result.current.closeNote();
      });

      // Now open an existing note - should clear initialData
      act(() => {
        result.current.openNote('note-456');
      });

      expect(result.current.initialData).toBeNull();
    });
  });

  describe('openNewNote', () => {
    it('opens the panel for a new note', () => {
      const { result } = renderHook(() => useNotePanel(), {
        wrapper: NotePanelProvider,
      });

      act(() => {
        result.current.openNewNote();
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.noteId).toBeNull();
    });

    it('accepts initial data for pre-filling', () => {
      const { result } = renderHook(() => useNotePanel(), {
        wrapper: NotePanelProvider,
      });

      const initialData = { title: 'Pre-filled title', content: 'Some content' };

      act(() => {
        result.current.openNewNote(initialData);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.noteId).toBeNull();
      expect(result.current.initialData).toEqual(initialData);
    });

    it('sets initialData to null when called without arguments', () => {
      const { result } = renderHook(() => useNotePanel(), {
        wrapper: NotePanelProvider,
      });

      act(() => {
        result.current.openNewNote();
      });

      expect(result.current.initialData).toBeNull();
    });
  });

  describe('closeNote', () => {
    it('sets isOpen to false immediately', () => {
      const { result } = renderHook(() => useNotePanel(), {
        wrapper: NotePanelProvider,
      });

      // Open first
      act(() => {
        result.current.openNote('note-123');
      });

      expect(result.current.isOpen).toBe(true);

      // Close
      act(() => {
        result.current.closeNote();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('clears noteId after animation delay', () => {
      const { result } = renderHook(() => useNotePanel(), {
        wrapper: NotePanelProvider,
      });

      // Open first
      act(() => {
        result.current.openNote('note-123');
      });

      expect(result.current.noteId).toBe('note-123');

      // Close
      act(() => {
        result.current.closeNote();
      });

      // noteId should still be set immediately after close (for animation)
      expect(result.current.noteId).toBe('note-123');

      // Fast forward past the 300ms delay
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.noteId).toBeNull();
    });

    it('clears initialData after animation delay', () => {
      const { result } = renderHook(() => useNotePanel(), {
        wrapper: NotePanelProvider,
      });

      // Open new note with initial data
      act(() => {
        result.current.openNewNote({ title: 'Test' });
      });

      expect(result.current.initialData).toEqual({ title: 'Test' });

      // Close
      act(() => {
        result.current.closeNote();
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
      const { result, rerender } = renderHook(() => useNotePanel(), {
        wrapper: NotePanelProvider,
      });

      const firstRender = {
        openNote: result.current.openNote,
        openNewNote: result.current.openNewNote,
        closeNote: result.current.closeNote,
      };

      rerender();

      expect(result.current.openNote).toBe(firstRender.openNote);
      expect(result.current.openNewNote).toBe(firstRender.openNewNote);
      expect(result.current.closeNote).toBe(firstRender.closeNote);
    });
  });

  describe('workflow scenarios', () => {
    it('can open and close multiple notes in sequence', () => {
      const { result } = renderHook(() => useNotePanel(), {
        wrapper: NotePanelProvider,
      });

      // Open first note
      act(() => {
        result.current.openNote('note-1');
      });
      expect(result.current.noteId).toBe('note-1');

      // Open second note (directly, without closing first)
      act(() => {
        result.current.openNote('note-2');
      });
      expect(result.current.noteId).toBe('note-2');
      expect(result.current.isOpen).toBe(true);
    });

    it('can switch from existing note to new note', () => {
      const { result } = renderHook(() => useNotePanel(), {
        wrapper: NotePanelProvider,
      });

      // Open existing note
      act(() => {
        result.current.openNote('note-123');
      });
      expect(result.current.noteId).toBe('note-123');

      // Switch to new note
      act(() => {
        result.current.openNewNote({ title: 'New Note' });
      });
      expect(result.current.noteId).toBeNull();
      expect(result.current.initialData).toEqual({ title: 'New Note' });
      expect(result.current.isOpen).toBe(true);
    });
  });
});
