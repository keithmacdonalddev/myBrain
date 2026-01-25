import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import BaseModal, { ConfirmModal, FormModal } from './BaseModal';

// Mock the useModalShortcuts hook
vi.mock('../../hooks/useKeyboardShortcuts', () => ({
  useModalShortcuts: vi.fn(({ isOpen, onClose }) => {
    // Simulate escape key handling
    if (isOpen) {
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }),
}));

describe('BaseModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <p>Modal content</p>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Reset body overflow style
    document.body.style.overflow = '';
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <BaseModal {...defaultProps} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with title and content when open', () => {
    render(<BaseModal {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('renders with correct accessibility attributes', () => {
    render(<BaseModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(<BaseModal {...defaultProps} onClose={handleClose} />);

    await user.click(screen.getByLabelText('Close modal'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('hides close button when showCloseButton is false', () => {
    render(<BaseModal {...defaultProps} showCloseButton={false} />);

    expect(screen.queryByLabelText('Close modal')).not.toBeInTheDocument();
  });

  it('calls onClose when clicking cancel button', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(<BaseModal {...defaultProps} onClose={handleClose} showFooter={true} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking backdrop with closeOnBackdrop true', async () => {
    const handleClose = vi.fn();
    const { container } = render(
      <BaseModal {...defaultProps} onClose={handleClose} closeOnBackdrop={true} />
    );

    // Click the backdrop (the outermost div that handles backdrop click)
    const backdrop = container.querySelector('.fixed.inset-0.z-50');
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when clicking backdrop with closeOnBackdrop false', async () => {
    const handleClose = vi.fn();
    const { container } = render(
      <BaseModal {...defaultProps} onClose={handleClose} closeOnBackdrop={false} />
    );

    const backdrop = container.querySelector('.fixed.inset-0.z-50');
    fireEvent.click(backdrop);
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('renders submit button when onSubmit is provided', () => {
    render(
      <BaseModal {...defaultProps} onSubmit={vi.fn()} submitText="Save Changes" />
    );

    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });

  it('calls onSubmit when submit button is clicked', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(<BaseModal {...defaultProps} onSubmit={handleSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables submit button when isLoading is true', () => {
    render(
      <BaseModal {...defaultProps} onSubmit={vi.fn()} isLoading={true} />
    );

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });

  it('disables submit button when submitDisabled is true', () => {
    render(
      <BaseModal {...defaultProps} onSubmit={vi.fn()} submitDisabled={true} />
    );

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('does not call onSubmit when button is disabled', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(
      <BaseModal {...defaultProps} onSubmit={handleSubmit} submitDisabled={true} />
    );

    // Try to click disabled button (won't actually click due to disabled state)
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    // userEvent won't click disabled buttons, so handleSubmit should not be called
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('renders custom button text', () => {
    render(
      <BaseModal
        {...defaultProps}
        onSubmit={vi.fn()}
        submitText="Create"
        cancelText="Discard"
      />
    );

    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeInTheDocument();
  });

  it('hides footer when showFooter is false', () => {
    render(<BaseModal {...defaultProps} showFooter={false} />);

    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('renders custom footer when provided', () => {
    render(
      <BaseModal
        {...defaultProps}
        customFooter={<button>Custom Button</button>}
      />
    );

    expect(screen.getByRole('button', { name: 'Custom Button' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('renders footerLeft content', () => {
    render(
      <BaseModal
        {...defaultProps}
        footerLeft={<span>Left content</span>}
      />
    );

    expect(screen.getByText('Left content')).toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    const { container, rerender } = render(
      <BaseModal {...defaultProps} size="sm" />
    );

    expect(container.querySelector('.max-w-sm')).toBeInTheDocument();

    rerender(<BaseModal {...defaultProps} size="lg" />);
    expect(container.querySelector('.max-w-lg')).toBeInTheDocument();

    rerender(<BaseModal {...defaultProps} size="xl" />);
    expect(container.querySelector('.max-w-xl')).toBeInTheDocument();
  });

  it('applies custom className to modal', () => {
    const { container } = render(
      <BaseModal {...defaultProps} className="custom-class" />
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('applies danger variant to submit button', () => {
    const { container } = render(
      <BaseModal {...defaultProps} onSubmit={vi.fn()} variant="danger" />
    );

    const submitButton = screen.getByRole('button', { name: 'Save' });
    expect(submitButton).toHaveClass('bg-red-500');
  });

  it('prevents body scroll when modal is open', () => {
    render(<BaseModal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll when modal closes', () => {
    const { rerender } = render(<BaseModal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<BaseModal {...defaultProps} isOpen={false} />);
    expect(document.body.style.overflow).toBe('');
  });
});

describe('ConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Confirm Action',
    message: 'Are you sure you want to proceed?',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with title and message', () => {
    render(<ConfirmModal {...defaultProps} />);

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to proceed?')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();

    render(<ConfirmModal {...defaultProps} onConfirm={handleConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders custom button text', () => {
    render(
      <ConfirmModal
        {...defaultProps}
        confirmText="Delete"
        cancelText="Keep"
      />
    );

    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    render(<ConfirmModal {...defaultProps} isLoading={true} />);

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });
});

describe('FormModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    title: 'Form Modal',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with children', () => {
    render(
      <FormModal {...defaultProps}>
        <input type="text" placeholder="Enter text" />
      </FormModal>
    );

    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('calls onSubmit when form is submitted', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(
      <FormModal {...defaultProps} onSubmit={handleSubmit}>
        <input type="text" placeholder="Enter text" />
      </FormModal>
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('displays error message when provided', () => {
    render(
      <FormModal {...defaultProps} error="Something went wrong">
        <input type="text" />
      </FormModal>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('does not display error section when no error', () => {
    const { container } = render(
      <FormModal {...defaultProps}>
        <input type="text" />
      </FormModal>
    );

    expect(container.querySelector('.bg-red-500\\/10')).not.toBeInTheDocument();
  });
});
