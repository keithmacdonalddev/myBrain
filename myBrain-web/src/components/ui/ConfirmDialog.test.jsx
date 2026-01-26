import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirm Action',
    message: 'Are you sure you want to continue?',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ConfirmDialog {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders with title and message when open', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to continue?')).toBeInTheDocument();
  });

  it('renders with default title and message when not provided', () => {
    render(
      <ConfirmDialog
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    // Title "Confirm" appears in h3, button also has "Confirm" text
    expect(screen.getByRole('heading', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('renders confirm and cancel buttons with default text', () => {
    render(<ConfirmDialog {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('renders with custom button text', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmText="Delete"
        cancelText="Keep"
      />
    );

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(<ConfirmDialog {...defaultProps} onClose={handleClose} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm and onClose when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();
    const handleClose = vi.fn();

    render(
      <ConfirmDialog
        {...defaultProps}
        onConfirm={handleConfirm}
        onClose={handleClose}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when X button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const { container } = render(
      <ConfirmDialog {...defaultProps} onClose={handleClose} />
    );

    // Find the X button (first button with X icon in header)
    const closeButton = container.querySelector('.flex.items-start button');
    await user.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const { container } = render(
      <ConfirmDialog {...defaultProps} onClose={handleClose} />
    );

    // Click the backdrop
    const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/50');
    await user.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(<ConfirmDialog {...defaultProps} onClose={handleClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose on Escape when dialog is closed', () => {
    const handleClose = vi.fn();
    render(<ConfirmDialog {...defaultProps} isOpen={false} onClose={handleClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('applies danger variant styles', () => {
    const { container } = render(
      <ConfirmDialog {...defaultProps} variant="danger" />
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toHaveClass('bg-red-500');

    const iconContainer = container.querySelector('.p-2.rounded-lg');
    expect(iconContainer).toHaveClass('text-red-500', 'bg-red-500/10');
  });

  it('applies warning variant styles', () => {
    const { container } = render(
      <ConfirmDialog {...defaultProps} variant="warning" />
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toHaveClass('bg-yellow-500');

    const iconContainer = container.querySelector('.p-2.rounded-lg');
    expect(iconContainer).toHaveClass('text-yellow-500', 'bg-yellow-500/10');
  });

  it('applies default variant styles', () => {
    const { container } = render(
      <ConfirmDialog {...defaultProps} variant="default" />
    );

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toHaveClass('bg-primary');

    const iconContainer = container.querySelector('.p-2.rounded-lg');
    expect(iconContainer).toHaveClass('text-primary', 'bg-primary/10');
  });

  it('focuses confirm button when dialog opens', async () => {
    render(<ConfirmDialog {...defaultProps} />);

    // Wait for focus to be applied
    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(document.activeElement).toBe(confirmButton);
  });

  it('stops propagation when clicking dialog content', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const { container } = render(
      <ConfirmDialog {...defaultProps} onClose={handleClose} />
    );

    // Click the dialog content (not backdrop)
    const dialogContent = container.querySelector('.bg-panel');
    await user.click(dialogContent);

    // onClose should not be called because click propagation is stopped
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('renders AlertTriangle icon', () => {
    const { container } = render(<ConfirmDialog {...defaultProps} />);

    // Check that the icon container exists
    const iconContainer = container.querySelector('.p-2.rounded-lg');
    expect(iconContainer).toBeInTheDocument();
    expect(iconContainer.querySelector('svg')).toBeInTheDocument();
  });
});
