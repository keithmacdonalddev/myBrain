import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Tooltip from './Tooltip';
import TooltipsContext from '../../contexts/TooltipsContext';

// Helper to render with TooltipsContext
function renderWithTooltips(ui, { tooltipsEnabled = true, ...options } = {}) {
  return render(
    <TooltipsContext.Provider value={{ tooltipsEnabled }}>
      {ui}
    </TooltipsContext.Provider>,
    options
  );
}

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders children correctly', () => {
    renderWithTooltips(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    );

    expect(screen.getByRole('button', { name: 'Hover me' })).toBeInTheDocument();
  });

  it('does not show tooltip initially', () => {
    renderWithTooltips(
      <Tooltip content="Tooltip text">
        <button>Hover me</button>
      </Tooltip>
    );

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip on hover after delay', async () => {
    renderWithTooltips(
      <Tooltip content="Tooltip text" delay={300}>
        <button>Hover me</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Hover me' }).parentElement;
    fireEvent.mouseEnter(trigger);

    // Tooltip should not appear immediately
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // Advance timers past the delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getByText('Tooltip text')).toBeInTheDocument();
  });

  it('hides tooltip on mouse leave', async () => {
    renderWithTooltips(
      <Tooltip content="Tooltip text" delay={0}>
        <button>Hover me</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Hover me' }).parentElement;

    // Show tooltip
    fireEvent.mouseEnter(trigger);
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    // Hide tooltip
    fireEvent.mouseLeave(trigger);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('does not show tooltip when disabled', () => {
    renderWithTooltips(
      <Tooltip content="Tooltip text" delay={0} disabled={true}>
        <button>Hover me</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Hover me' }).parentElement;
    fireEvent.mouseEnter(trigger);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('does not show tooltip when content is empty', () => {
    renderWithTooltips(
      <Tooltip content="" delay={0}>
        <button>Hover me</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Hover me' }).parentElement;
    fireEvent.mouseEnter(trigger);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('respects global tooltipsEnabled setting from context', () => {
    renderWithTooltips(
      <Tooltip content="Tooltip text" delay={0}>
        <button>Hover me</button>
      </Tooltip>,
      { tooltipsEnabled: false }
    );

    const trigger = screen.getByRole('button', { name: 'Hover me' }).parentElement;
    fireEvent.mouseEnter(trigger);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('ignores global setting when ignoreGlobalSetting is true', () => {
    renderWithTooltips(
      <Tooltip content="Tooltip text" delay={0} ignoreGlobalSetting={true}>
        <button>Hover me</button>
      </Tooltip>,
      { tooltipsEnabled: false }
    );

    const trigger = screen.getByRole('button', { name: 'Hover me' }).parentElement;
    fireEvent.mouseEnter(trigger);

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('works without TooltipsContext (defaults to enabled)', () => {
    // Render without the context provider
    render(
      <Tooltip content="Tooltip text" delay={0}>
        <button>Hover me</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Hover me' }).parentElement;
    fireEvent.mouseEnter(trigger);

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('hides tooltip on scroll', () => {
    renderWithTooltips(
      <Tooltip content="Tooltip text" delay={0}>
        <button>Hover me</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Hover me' }).parentElement;

    // Show tooltip
    fireEvent.mouseEnter(trigger);
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    // Scroll event should hide it
    fireEvent.scroll(window);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('hides tooltip on window resize', () => {
    renderWithTooltips(
      <Tooltip content="Tooltip text" delay={0}>
        <button>Hover me</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Hover me' }).parentElement;

    // Show tooltip
    fireEvent.mouseEnter(trigger);
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    // Resize event should hide it
    fireEvent.resize(window);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('hides tooltip on click anywhere', () => {
    renderWithTooltips(
      <Tooltip content="Tooltip text" delay={0}>
        <button>Hover me</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Hover me' }).parentElement;

    // Show tooltip
    fireEvent.mouseEnter(trigger);
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    // Click event should hide it
    fireEvent.click(window);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('uses custom delay', () => {
    renderWithTooltips(
      <Tooltip content="Tooltip text" delay={500}>
        <button>Hover me</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Hover me' }).parentElement;
    fireEvent.mouseEnter(trigger);

    // Should not be visible at 300ms
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // Should be visible at 500ms
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('clears timeout when mouse leaves before delay completes', () => {
    renderWithTooltips(
      <Tooltip content="Tooltip text" delay={500}>
        <button>Hover me</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button', { name: 'Hover me' }).parentElement;

    // Start hovering
    fireEvent.mouseEnter(trigger);

    // Advance partially
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Leave before delay completes
    fireEvent.mouseLeave(trigger);

    // Complete the remaining time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Tooltip should NOT appear because we left
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('renders with different positions', () => {
    const positions = ['top', 'bottom', 'left', 'right'];

    positions.forEach((position) => {
      const { unmount } = renderWithTooltips(
        <Tooltip content="Tooltip text" delay={0} position={position}>
          <button>Hover me</button>
        </Tooltip>
      );

      const trigger = screen.getByRole('button', { name: 'Hover me' }).parentElement;
      fireEvent.mouseEnter(trigger);

      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      unmount();
    });
  });
});
