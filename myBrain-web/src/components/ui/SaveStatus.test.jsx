import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import SaveStatus from './SaveStatus';

// Mock the dateUtils module
vi.mock('../../lib/dateUtils', () => ({
  getTimeAgo: vi.fn(() => 'just now'),
}));

import { getTimeAgo } from '../../lib/dateUtils';

describe('SaveStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    // Reset mock to default value
    getTimeAgo.mockReturnValue('just now');
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('saving status', () => {
    it('renders saving state correctly', () => {
      render(<SaveStatus status="saving" />);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('shows saving indicator with blue styling', () => {
      render(<SaveStatus status="saving" />);

      const savingText = screen.getByText('Saving...');
      expect(savingText).toHaveClass('text-blue-500');
    });
  });

  describe('saved status', () => {
    it('renders saved state with time ago', () => {
      const lastSaved = new Date();

      render(<SaveStatus status="saved" lastSaved={lastSaved} />);

      expect(screen.getByText(/Saved/)).toBeInTheDocument();
      expect(screen.getByText(/just now/)).toBeInTheDocument();
    });

    it('shows saved indicator with green styling', () => {
      const lastSaved = new Date();

      render(<SaveStatus status="saved" lastSaved={lastSaved} />);

      const savedText = screen.getByText(/Saved just now/);
      expect(savedText).toHaveClass('text-green-600');
    });

    it('updates time ago periodically', () => {
      const lastSaved = new Date();

      render(<SaveStatus status="saved" lastSaved={lastSaved} />);

      expect(screen.getByText(/Saved just now/)).toBeInTheDocument();

      // Change mock return value before advancing time
      getTimeAgo.mockReturnValue('10s ago');

      // Advance time by 10 seconds (interval is every 10 seconds)
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // Check that the time ago was updated
      expect(screen.getByText(/Saved 10s ago/)).toBeInTheDocument();
    });

    it('updates time ago when lastSaved changes', () => {
      const { rerender } = render(
        <SaveStatus status="saved" lastSaved={new Date('2024-01-01T10:00:00')} />
      );

      getTimeAgo.mockReturnValue('5m ago');

      rerender(<SaveStatus status="saved" lastSaved={new Date('2024-01-01T10:05:00')} />);

      expect(getTimeAgo).toHaveBeenCalledWith(new Date('2024-01-01T10:05:00'));
    });
  });

  describe('unsaved status', () => {
    it('renders unsaved state correctly', () => {
      render(<SaveStatus status="unsaved" />);

      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    });

    it('shows unsaved indicator with yellow styling', () => {
      render(<SaveStatus status="unsaved" />);

      const unsavedText = screen.getByText('Unsaved changes');
      expect(unsavedText).toHaveClass('text-yellow-600');
    });

    it('renders pulsing yellow dot for unsaved state', () => {
      const { container } = render(<SaveStatus status="unsaved" />);

      const pulsingDot = container.querySelector('.bg-yellow-500.rounded-full.animate-pulse');
      expect(pulsingDot).toBeInTheDocument();
    });
  });

  describe('error status', () => {
    it('renders error state correctly', () => {
      render(<SaveStatus status="error" />);

      expect(screen.getByText('Save failed')).toBeInTheDocument();
    });

    it('shows error indicator with red styling', () => {
      render(<SaveStatus status="error" />);

      const errorText = screen.getByText('Save failed');
      expect(errorText).toHaveClass('text-red-500');
    });

    it('applies error background styling', () => {
      const { container } = render(<SaveStatus status="error" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('bg-red-500/10');
    });
  });

  describe('flash effect', () => {
    it('shows flash effect when transitioning from saving to saved', () => {
      const { container, rerender } = render(
        <SaveStatus status="saving" lastSaved={new Date()} />
      );

      // Transition to saved
      rerender(<SaveStatus status="saved" lastSaved={new Date()} />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('bg-green-500/10');
    });

    it('flash effect disappears after 500ms', () => {
      const { container, rerender } = render(
        <SaveStatus status="saving" lastSaved={new Date()} />
      );

      // Transition to saved
      rerender(<SaveStatus status="saved" lastSaved={new Date()} />);

      expect(container.firstChild).toHaveClass('bg-green-500/10');

      // Advance past flash duration
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(container.firstChild).not.toHaveClass('bg-green-500/10');
    });

    it('does not show flash when directly rendering saved status', () => {
      const { container } = render(
        <SaveStatus status="saved" lastSaved={new Date()} />
      );

      // Flash should not be shown for initial render
      const wrapper = container.firstChild;
      expect(wrapper).not.toHaveClass('bg-green-500/10');
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <SaveStatus status="saved" lastSaved={new Date()} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('combines custom className with default classes', () => {
      const { container } = render(
        <SaveStatus status="saved" lastSaved={new Date()} className="mt-4" />
      );

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('mt-4');
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('items-center');
    });
  });

  describe('edge cases', () => {
    it('handles missing lastSaved for saved status', () => {
      getTimeAgo.mockReturnValue('');

      render(<SaveStatus status="saved" />);

      // Should still render without crashing
      expect(screen.getByText(/Saved/)).toBeInTheDocument();
    });

    it('does not start interval for non-saved status', () => {
      render(<SaveStatus status="saving" />);

      // Advance time
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // getTimeAgo should only be called initially, not on interval
      // (interval only runs when status is 'saved')
      const callsForInterval = getTimeAgo.mock.calls.filter((call) => call[0] !== undefined);
      expect(callsForInterval.length).toBeLessThanOrEqual(1);
    });

    it('cleans up interval on unmount', () => {
      const { unmount } = render(
        <SaveStatus status="saved" lastSaved={new Date()} />
      );

      const initialCalls = getTimeAgo.mock.calls.length;

      unmount();

      // Advance time after unmount
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // No additional calls should have been made
      expect(getTimeAgo.mock.calls.length).toBe(initialCalls);
    });
  });
});
