import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import useKeyboardShortcuts, { usePanelShortcuts, useModalShortcuts } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  let onClose;
  let onSave;
  let onClearTimeout;

  beforeEach(() => {
    onClose = vi.fn();
    onSave = vi.fn();
    onClearTimeout = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('when panel is closed (isOpen: false)', () => {
    it('should not trigger any handlers', () => {
      renderHook(() =>
        useKeyboardShortcuts({
          isOpen: false,
          onClose,
          onSave,
        })
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      fireEvent.keyDown(window, { key: 's', ctrlKey: true });

      expect(onClose).not.toHaveBeenCalled();
      expect(onSave).not.toHaveBeenCalled();
    });
  });

  describe('when panel is open (isOpen: true)', () => {
    describe('Escape key', () => {
      it('should call onClose when Escape is pressed', () => {
        renderHook(() =>
          useKeyboardShortcuts({
            isOpen: true,
            onClose,
            onSave,
          })
        );

        fireEvent.keyDown(window, { key: 'Escape' });

        expect(onClose).toHaveBeenCalledTimes(1);
      });

      it('should not call onClose when enableClose is false', () => {
        renderHook(() =>
          useKeyboardShortcuts({
            isOpen: true,
            onClose,
            onSave,
            enableClose: false,
          })
        );

        fireEvent.keyDown(window, { key: 'Escape' });

        expect(onClose).not.toHaveBeenCalled();
      });

      it('should not call onClose when onClose is not provided', () => {
        // Should not throw an error
        renderHook(() =>
          useKeyboardShortcuts({
            isOpen: true,
            onSave,
          })
        );

        fireEvent.keyDown(window, { key: 'Escape' });

        // No error means the test passes
        expect(true).toBe(true);
      });
    });

    describe('Ctrl+S / Cmd+S save shortcut', () => {
      it('should call onSave when Ctrl+S is pressed', () => {
        renderHook(() =>
          useKeyboardShortcuts({
            isOpen: true,
            onClose,
            onSave,
          })
        );

        fireEvent.keyDown(window, { key: 's', ctrlKey: true });

        expect(onSave).toHaveBeenCalledTimes(1);
      });

      it('should call onSave when Cmd+S is pressed (Mac)', () => {
        renderHook(() =>
          useKeyboardShortcuts({
            isOpen: true,
            onClose,
            onSave,
          })
        );

        fireEvent.keyDown(window, { key: 's', metaKey: true });

        expect(onSave).toHaveBeenCalledTimes(1);
      });

      it('should call onClearTimeout before onSave', () => {
        const callOrder = [];
        const trackedOnClearTimeout = vi.fn(() => callOrder.push('clearTimeout'));
        const trackedOnSave = vi.fn(() => callOrder.push('save'));

        renderHook(() =>
          useKeyboardShortcuts({
            isOpen: true,
            onClose,
            onSave: trackedOnSave,
            onClearTimeout: trackedOnClearTimeout,
          })
        );

        fireEvent.keyDown(window, { key: 's', ctrlKey: true });

        expect(trackedOnClearTimeout).toHaveBeenCalledTimes(1);
        expect(trackedOnSave).toHaveBeenCalledTimes(1);
        expect(callOrder).toEqual(['clearTimeout', 'save']);
      });

      it('should not call onSave when enableSave is false', () => {
        renderHook(() =>
          useKeyboardShortcuts({
            isOpen: true,
            onClose,
            onSave,
            enableSave: false,
          })
        );

        fireEvent.keyDown(window, { key: 's', ctrlKey: true });

        expect(onSave).not.toHaveBeenCalled();
      });

      it('should not call onSave when s is pressed without modifier', () => {
        renderHook(() =>
          useKeyboardShortcuts({
            isOpen: true,
            onClose,
            onSave,
          })
        );

        fireEvent.keyDown(window, { key: 's' });

        expect(onSave).not.toHaveBeenCalled();
      });
    });

    describe('custom shortcuts', () => {
      it('should call custom shortcut handler when key is pressed', () => {
        const customHandler = vi.fn();

        renderHook(() =>
          useKeyboardShortcuts({
            isOpen: true,
            onClose,
            customShortcuts: {
              d: customHandler,
            },
          })
        );

        fireEvent.keyDown(window, { key: 'd', altKey: true });

        expect(customHandler).toHaveBeenCalledTimes(1);
      });

      it('should not trigger custom shortcuts when typing in an input', () => {
        const customHandler = vi.fn();

        renderHook(() =>
          useKeyboardShortcuts({
            isOpen: true,
            onClose,
            customShortcuts: {
              d: customHandler,
            },
          })
        );

        // Create an input element and simulate keydown on it
        const input = document.createElement('input');
        document.body.appendChild(input);

        fireEvent.keyDown(input, { key: 'd' });

        expect(customHandler).not.toHaveBeenCalled();

        document.body.removeChild(input);
      });

      it('should trigger custom shortcuts with modifier keys even when typing', () => {
        const customHandler = vi.fn();

        renderHook(() =>
          useKeyboardShortcuts({
            isOpen: true,
            onClose,
            customShortcuts: {
              d: customHandler,
            },
          })
        );

        const input = document.createElement('input');
        document.body.appendChild(input);

        fireEvent.keyDown(input, { key: 'd', ctrlKey: true });

        expect(customHandler).toHaveBeenCalledTimes(1);

        document.body.removeChild(input);
      });
    });

    describe('event cleanup', () => {
      it('should remove event listener on unmount', () => {
        const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

        const { unmount } = renderHook(() =>
          useKeyboardShortcuts({
            isOpen: true,
            onClose,
            onSave,
          })
        );

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith(
          'keydown',
          expect.any(Function)
        );

        removeEventListenerSpy.mockRestore();
      });
    });
  });
});

describe('usePanelShortcuts', () => {
  it('should call onClose on Escape', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const saveTimeoutRef = { current: null };

    renderHook(() =>
      usePanelShortcuts({
        isOpen: true,
        onClose,
        onSave,
        saveTimeoutRef,
      })
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onSave on Ctrl+S', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    const saveTimeoutRef = { current: null };

    renderHook(() =>
      usePanelShortcuts({
        isOpen: true,
        onClose,
        onSave,
        saveTimeoutRef,
      })
    );

    fireEvent.keyDown(window, { key: 's', ctrlKey: true });

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('should clear timeout before saving when saveTimeoutRef has a value', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

    try {
      const onClose = vi.fn();
      const onSave = vi.fn();
      const saveTimeoutRef = { current: setTimeout(() => {}, 1000) };

      renderHook(() =>
        usePanelShortcuts({
          isOpen: true,
          onClose,
          onSave,
          saveTimeoutRef,
        })
      );

      fireEvent.keyDown(window, { key: 's', ctrlKey: true });

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(onSave).toHaveBeenCalledTimes(1);
    } finally {
      // Always restore real timers to prevent test pollution
      vi.useRealTimers();
      clearTimeoutSpy.mockRestore();
    }
  });
});

describe('useModalShortcuts', () => {
  it('should call onClose on Escape', () => {
    const onClose = vi.fn();

    renderHook(() =>
      useModalShortcuts({
        isOpen: true,
        onClose,
      })
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not trigger save shortcut (enableSave is false)', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    renderHook(() =>
      useModalShortcuts({
        isOpen: true,
        onClose,
        onConfirm,
      })
    );

    fireEvent.keyDown(window, { key: 's', ctrlKey: true });

    // Save should not do anything in modal shortcuts
    expect(onConfirm).not.toHaveBeenCalled();
  });

  describe('Enter to confirm', () => {
    it('should call onConfirm on Enter when enableEnterConfirm is true', () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderHook(() =>
        useModalShortcuts({
          isOpen: true,
          onClose,
          onConfirm,
          enableEnterConfirm: true,
        })
      );

      fireEvent.keyDown(window, { key: 'Enter' });

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should not call onConfirm on Enter when enableEnterConfirm is false', () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderHook(() =>
        useModalShortcuts({
          isOpen: true,
          onClose,
          onConfirm,
          enableEnterConfirm: false,
        })
      );

      fireEvent.keyDown(window, { key: 'Enter' });

      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('should not call onConfirm when Enter is pressed in a textarea', () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderHook(() =>
        useModalShortcuts({
          isOpen: true,
          onClose,
          onConfirm,
          enableEnterConfirm: true,
        })
      );

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      fireEvent.keyDown(textarea, { key: 'Enter' });

      expect(onConfirm).not.toHaveBeenCalled();

      document.body.removeChild(textarea);
    });

    it('should not call onConfirm when Enter is pressed on a button', () => {
      const onClose = vi.fn();
      const onConfirm = vi.fn();

      renderHook(() =>
        useModalShortcuts({
          isOpen: true,
          onClose,
          onConfirm,
          enableEnterConfirm: true,
        })
      );

      const button = document.createElement('button');
      document.body.appendChild(button);

      fireEvent.keyDown(button, { key: 'Enter' });

      expect(onConfirm).not.toHaveBeenCalled();

      document.body.removeChild(button);
    });
  });
});
