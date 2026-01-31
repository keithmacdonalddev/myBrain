/**
 * =============================================================================
 * METRICCARD.TEST.JSX - MetricCard Component Tests
 * =============================================================================
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MetricCard from './MetricCard';

describe('MetricCard', () => {
  it('renders with value and label', () => {
    render(<MetricCard value={5} label="Overdue" />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('renders with optional icon', () => {
    render(<MetricCard icon="⚠️" value={3} label="Alerts" />);

    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('applies correct type class', () => {
    const { container } = render(<MetricCard value={10} label="Test" type="danger" />);
    const card = container.querySelector('.v2-metric-card');

    expect(card).toHaveClass('v2-metric-card--danger');
  });

  it('calls onClick when clickable', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<MetricCard value={5} label="Clickable" onClick={handleClick} />);

    const card = screen.getByRole('button');
    await user.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard interaction when clickable', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<MetricCard value={5} label="Keyboard" onClick={handleClick} />);

    const card = screen.getByRole('button');
    card.focus();
    await user.keyboard('{Enter}');

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is not interactive when onClick is not provided', () => {
    render(<MetricCard value={5} label="Static" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders string values like percentages', () => {
    render(<MetricCard value="75%" label="Progress" />);

    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});
