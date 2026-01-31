/**
 * Tests for Widget component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Widget from './Widget';

describe('Widget', () => {
  it('renders title', () => {
    render(
      <Widget title="Test Widget">
        <div>Content</div>
      </Widget>
    );

    expect(screen.getByText('Test Widget')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(
      <Widget title="Test Widget" icon="📋">
        <div>Content</div>
      </Widget>
    );

    expect(screen.getByText('📋')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <Widget title="Test Widget">
        <div>Test Content</div>
      </Widget>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('shows loading skeleton when loading prop is true', () => {
    render(
      <Widget title="Test Widget" loading={true}>
        <div>Content</div>
      </Widget>
    );

    // Check for skeleton items
    const skeletons = document.querySelectorAll('.skeleton-v2-list-item');
    expect(skeletons.length).toBe(3);

    // Content should not be rendered
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('shows error state when error prop is provided', () => {
    render(
      <Widget title="Test Widget" error="Failed to load">
        <div>Content</div>
      </Widget>
    );

    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    // Content should not be rendered
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('renders dropdown when actions are provided', () => {
    const actions = [
      { label: 'Today', value: 'today' },
      { label: 'This Week', value: 'week' },
      { label: 'All', value: 'all' },
    ];

    render(
      <Widget
        title="Test Widget"
        actions={actions}
        actionValue="today"
        onActionChange={() => {}}
      >
        <div>Content</div>
      </Widget>
    );

    const dropdown = screen.getByRole('combobox');
    expect(dropdown).toBeInTheDocument();
    expect(dropdown.value).toBe('today');

    // Check all options are present
    expect(screen.getByRole('option', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'This Week' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'All' })).toBeInTheDocument();
  });

  it('calls onActionChange when dropdown selection changes', () => {
    const handleActionChange = vi.fn();
    const actions = [
      { label: 'Today', value: 'today' },
      { label: 'This Week', value: 'week' },
    ];

    render(
      <Widget
        title="Test Widget"
        actions={actions}
        actionValue="today"
        onActionChange={handleActionChange}
      >
        <div>Content</div>
      </Widget>
    );

    const dropdown = screen.getByRole('combobox');
    fireEvent.change(dropdown, { target: { value: 'week' } });

    expect(handleActionChange).toHaveBeenCalledWith('week');
  });

  it('does not render dropdown when loading', () => {
    const actions = [{ label: 'Today', value: 'today' }];

    render(
      <Widget
        title="Test Widget"
        actions={actions}
        actionValue="today"
        onActionChange={() => {}}
        loading={true}
      >
        <div>Content</div>
      </Widget>
    );

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('does not render dropdown when error is present', () => {
    const actions = [{ label: 'Today', value: 'today' }];

    render(
      <Widget
        title="Test Widget"
        actions={actions}
        actionValue="today"
        onActionChange={() => {}}
        error="Failed to load"
      >
        <div>Content</div>
      </Widget>
    );

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('applies additional className when provided', () => {
    const { container } = render(
      <Widget title="Test Widget" className="custom-class">
        <div>Content</div>
      </Widget>
    );

    const widget = container.querySelector('.v2-widget');
    expect(widget).toHaveClass('custom-class');
  });

  it('shows default error message when error is empty string', () => {
    render(
      <Widget title="Test Widget" error="">
        <div>Content</div>
      </Widget>
    );

    expect(screen.getByText('Failed to load widget')).toBeInTheDocument();
  });
});
