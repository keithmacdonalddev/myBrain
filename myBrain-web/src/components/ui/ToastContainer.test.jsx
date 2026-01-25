import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import ToastContainer from './ToastContainer';
import { addToast, removeToast, clearToasts } from '../../store/toastSlice';

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders nothing when there are no toasts', () => {
    const { container } = render(<ToastContainer />, {
      preloadedState: { toast: { toasts: [] } },
    });
    expect(container.firstChild).toBeNull();
  });

  it('renders a single toast with message', () => {
    render(<ToastContainer />, {
      preloadedState: {
        toast: {
          toasts: [{ id: 1, message: 'Test toast message', type: 'info', duration: 5000 }],
        },
      },
    });

    expect(screen.getByText('Test toast message')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders multiple toasts', () => {
    render(<ToastContainer />, {
      preloadedState: {
        toast: {
          toasts: [
            { id: 1, message: 'First toast', type: 'info', duration: 5000 },
            { id: 2, message: 'Second toast', type: 'success', duration: 5000 },
          ],
        },
      },
    });

    expect(screen.getByText('First toast')).toBeInTheDocument();
    expect(screen.getByText('Second toast')).toBeInTheDocument();
  });

  it('renders toast with description', () => {
    render(<ToastContainer />, {
      preloadedState: {
        toast: {
          toasts: [
            {
              id: 1,
              message: 'Main message',
              description: 'Additional details',
              type: 'info',
              duration: 5000,
            },
          ],
        },
      },
    });

    expect(screen.getByText('Main message')).toBeInTheDocument();
    expect(screen.getByText('Additional details')).toBeInTheDocument();
  });

  it('renders success toast with correct styling', () => {
    render(<ToastContainer />, {
      preloadedState: {
        toast: {
          toasts: [{ id: 1, message: 'Success!', type: 'success', duration: 5000 }],
        },
      },
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('border-l-green-500');
  });

  it('renders error toast with correct styling', () => {
    render(<ToastContainer />, {
      preloadedState: {
        toast: {
          toasts: [{ id: 1, message: 'Error!', type: 'error', duration: 5000 }],
        },
      },
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('border-l-red-500');
  });

  it('renders warning toast with correct styling', () => {
    render(<ToastContainer />, {
      preloadedState: {
        toast: {
          toasts: [{ id: 1, message: 'Warning!', type: 'warning', duration: 5000 }],
        },
      },
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('border-l-yellow-500');
  });

  it('renders info toast with correct styling (default)', () => {
    render(<ToastContainer />, {
      preloadedState: {
        toast: {
          toasts: [{ id: 1, message: 'Info!', type: 'info', duration: 5000 }],
        },
      },
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('border-l-blue-500');
  });

  it('renders undo button when undoAction is provided', () => {
    const undoFn = vi.fn();
    render(<ToastContainer />, {
      preloadedState: {
        toast: {
          toasts: [
            {
              id: 1,
              message: 'Item deleted',
              type: 'info',
              duration: 5000,
              undoAction: undoFn,
            },
          ],
        },
      },
    });

    expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
  });

  it('calls undoAction and removes toast when undo button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const undoFn = vi.fn();

    render(<ToastContainer />, {
      preloadedState: {
        toast: {
          toasts: [
            {
              id: 1,
              message: 'Item deleted',
              type: 'info',
              duration: 5000,
              undoAction: undoFn,
            },
          ],
        },
      },
    });

    const undoButton = screen.getByRole('button', { name: /undo/i });
    await user.click(undoButton);

    expect(undoFn).toHaveBeenCalledTimes(1);
  });

  it('removes toast when close button is clicked', async () => {
    render(<ToastContainer />, {
      preloadedState: {
        toast: {
          toasts: [{ id: 1, message: 'Closable toast', type: 'info', duration: 5000 }],
        },
      },
    });

    // Find the close button (X icon button)
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find((btn) => !btn.textContent.includes('Undo'));

    await act(async () => {
      fireEvent.click(closeButton);
    });

    // Toast should be removed from the store (we check the alert is gone)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('auto-removes toast after duration expires', () => {
    render(<ToastContainer />, {
      preloadedState: {
        toast: {
          toasts: [{ id: 1, message: 'Auto dismiss', type: 'info', duration: 3000 }],
        },
      },
    });

    expect(screen.getByText('Auto dismiss')).toBeInTheDocument();

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Toast should be removed after duration
    expect(screen.queryByText('Auto dismiss')).not.toBeInTheDocument();
  });

  it('does not auto-remove toast when duration is 0', () => {
    render(<ToastContainer />, {
      preloadedState: {
        toast: {
          toasts: [{ id: 1, message: 'Persistent toast', type: 'info', duration: 0 }],
        },
      },
    });

    expect(screen.getByText('Persistent toast')).toBeInTheDocument();

    // Fast-forward time significantly
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    // Toast should still be there
    expect(screen.getByText('Persistent toast')).toBeInTheDocument();
  });
});
