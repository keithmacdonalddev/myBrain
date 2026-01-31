/**
 * Tests for HoverActions component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HoverActions from './HoverActions';
import { Edit, Trash } from 'lucide-react';

describe('HoverActions', () => {
  const mockEditClick = vi.fn();
  const mockDeleteClick = vi.fn();

  const defaultActions = [
    { icon: <Edit />, label: 'Edit', onClick: mockEditClick, variant: 'default' },
    { icon: <Trash />, label: 'Delete', onClick: mockDeleteClick, variant: 'danger' },
  ];

  beforeEach(() => {
    mockEditClick.mockClear();
    mockDeleteClick.mockClear();
  });

  it('renders all action buttons', () => {
    render(<HoverActions actions={defaultActions} />);

    expect(screen.getByLabelText('Edit')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete')).toBeInTheDocument();
  });

  it('calls onClick handler when button is clicked', async () => {
    const user = userEvent.setup();
    render(<HoverActions actions={defaultActions} />);

    await user.click(screen.getByLabelText('Edit'));
    expect(mockEditClick).toHaveBeenCalledTimes(1);

    await user.click(screen.getByLabelText('Delete'));
    expect(mockDeleteClick).toHaveBeenCalledTimes(1);
  });

  it('applies correct variant classes', () => {
    render(<HoverActions actions={defaultActions} />);

    const editButton = screen.getByLabelText('Edit');
    const deleteButton = screen.getByLabelText('Delete');

    expect(editButton).toHaveClass('v2-hover-action--default');
    expect(deleteButton).toHaveClass('v2-hover-action--danger');
  });

  it('renders nothing when actions array is empty', () => {
    const { container } = render(<HoverActions actions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('sets visible attribute when visible prop is true', () => {
    const { container } = render(<HoverActions actions={defaultActions} visible={true} />);
    const actionsContainer = container.querySelector('.v2-hover-actions');
    expect(actionsContainer).toHaveAttribute('data-visible', 'true');
  });

  it('applies position class based on position prop', () => {
    const { container } = render(<HoverActions actions={defaultActions} position="left" />);
    const actionsContainer = container.querySelector('.v2-hover-actions');
    expect(actionsContainer).toHaveClass('v2-hover-actions--left');
  });

  it('disables button when disabled prop is true', () => {
    const disabledActions = [
      { icon: <Edit />, label: 'Edit', onClick: mockEditClick, disabled: true },
    ];

    render(<HoverActions actions={disabledActions} />);
    const button = screen.getByLabelText('Edit');
    expect(button).toBeDisabled();
  });

  it('supports custom className', () => {
    const { container } = render(
      <HoverActions actions={defaultActions} className="custom-class" />
    );
    const actionsContainer = container.querySelector('.v2-hover-actions');
    expect(actionsContainer).toHaveClass('custom-class');
  });

  it('has proper ARIA attributes for accessibility', () => {
    render(<HoverActions actions={defaultActions} />);

    const container = screen.getByRole('group', { name: 'Item actions' });
    expect(container).toBeInTheDocument();

    const editButton = screen.getByLabelText('Edit');
    expect(editButton).toHaveAttribute('title', 'Edit');
    expect(editButton).toHaveAttribute('type', 'button');
  });

  it('supports all variant types', () => {
    const allVariants = [
      { icon: <Edit />, label: 'Default', onClick: vi.fn(), variant: 'default' },
      { icon: <Edit />, label: 'Primary', onClick: vi.fn(), variant: 'primary' },
      { icon: <Edit />, label: 'Danger', onClick: vi.fn(), variant: 'danger' },
      { icon: <Edit />, label: 'Success', onClick: vi.fn(), variant: 'success' },
    ];

    render(<HoverActions actions={allVariants} />);

    expect(screen.getByLabelText('Default')).toHaveClass('v2-hover-action--default');
    expect(screen.getByLabelText('Primary')).toHaveClass('v2-hover-action--primary');
    expect(screen.getByLabelText('Danger')).toHaveClass('v2-hover-action--danger');
    expect(screen.getByLabelText('Success')).toHaveClass('v2-hover-action--success');
  });
});
