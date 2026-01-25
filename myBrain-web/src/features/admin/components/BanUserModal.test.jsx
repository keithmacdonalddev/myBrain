import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import BanUserModal from './BanUserModal';

describe('BanUserModal', () => {
  const mockUser = {
    _id: 'user123',
    email: 'test@example.com',
    profile: {
      displayName: 'Test User',
    },
    moderationStatus: {
      warningCount: 2,
    },
  };

  const defaultProps = {
    user: mockUser,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    isLoading: false,
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with title and user email', () => {
    render(<BanUserModal {...defaultProps} />);

    expect(screen.getByText('Permanently Ban User')).toBeInTheDocument();
    expect(screen.getAllByText('test@example.com').length).toBeGreaterThan(0);
  });

  it('displays permanent action warning', () => {
    render(<BanUserModal {...defaultProps} />);

    expect(screen.getByText('Permanent Action')).toBeInTheDocument();
    expect(screen.getByText(/banning is permanent and cannot be automatically reversed/i)).toBeInTheDocument();
  });

  it('displays user information', () => {
    render(<BanUserModal {...defaultProps} />);

    expect(screen.getByText('User being banned:')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('displays warning count if user has warnings', () => {
    render(<BanUserModal {...defaultProps} />);

    expect(screen.getByText('2 warning(s) on record')).toBeInTheDocument();
  });

  it('does not display warning count if user has no warnings', () => {
    const userNoWarnings = {
      ...mockUser,
      moderationStatus: { warningCount: 0 },
    };
    render(<BanUserModal {...defaultProps} user={userNoWarnings} />);

    expect(screen.queryByText(/warning\(s\) on record/)).not.toBeInTheDocument();
  });

  it('renders reason textarea', () => {
    render(<BanUserModal {...defaultProps} />);

    expect(screen.getByPlaceholderText(/explain why this user is being permanently banned/i)).toBeInTheDocument();
  });

  it('renders confirmation checkbox', () => {
    render(<BanUserModal {...defaultProps} />);

    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByText(/i understand this action is permanent/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<BanUserModal {...defaultProps} onClose={handleClose} />);

    // Find the X button in the header
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find(btn => btn.querySelector('svg.w-5.h-5'));
    await user.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<BanUserModal {...defaultProps} onClose={handleClose} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = vi.fn();
    const { container } = render(<BanUserModal {...defaultProps} onClose={handleClose} />);

    const backdrop = container.querySelector('.bg-black\\/50');
    fireEvent.click(backdrop);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('submit button is disabled when reason is empty', () => {
    render(<BanUserModal {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /ban user/i });
    expect(submitButton).toBeDisabled();
  });

  it('submit button is disabled when confirmation is not checked', async () => {
    const user = userEvent.setup();
    render(<BanUserModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/explain why this user is being permanently banned/i);
    await user.type(textarea, 'Violation of terms');

    const submitButton = screen.getByRole('button', { name: /ban user/i });
    expect(submitButton).toBeDisabled();
  });

  it('submit button is enabled when reason is provided and confirmation is checked', async () => {
    const user = userEvent.setup();
    render(<BanUserModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/explain why this user is being permanently banned/i);
    await user.type(textarea, 'Violation of terms');

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const submitButton = screen.getByRole('button', { name: /ban user/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('calls onSubmit with trimmed reason when form is submitted', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<BanUserModal {...defaultProps} onSubmit={handleSubmit} />);

    const textarea = screen.getByPlaceholderText(/explain why this user is being permanently banned/i);
    await user.type(textarea, '  Violation of terms  ');

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    await user.click(screen.getByRole('button', { name: /ban user/i }));

    expect(handleSubmit).toHaveBeenCalledWith('Violation of terms');
  });

  it('does not submit when reason is only whitespace', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<BanUserModal {...defaultProps} onSubmit={handleSubmit} />);

    const textarea = screen.getByPlaceholderText(/explain why this user is being permanently banned/i);
    await user.type(textarea, '   ');

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    // Button should still be disabled because trimmed reason is empty
    const submitButton = screen.getByRole('button', { name: /ban user/i });
    expect(submitButton).toBeDisabled();
  });

  it('disables submit button when isLoading is true', async () => {
    const user = userEvent.setup();
    render(<BanUserModal {...defaultProps} isLoading={true} />);

    const textarea = screen.getByPlaceholderText(/explain why this user is being permanently banned/i);
    await user.type(textarea, 'Reason');

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const submitButton = screen.getByRole('button', { name: /banning/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows loading state in submit button', () => {
    render(<BanUserModal {...defaultProps} isLoading={true} />);

    expect(screen.getByText('Banning...')).toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    const error = { message: 'Failed to ban user' };
    render(<BanUserModal {...defaultProps} error={error} />);

    expect(screen.getByText('Failed to ban user')).toBeInTheDocument();
  });

  it('does not display error section when there is no error', () => {
    render(<BanUserModal {...defaultProps} />);

    // The error section should not exist
    expect(screen.queryByText('Failed to ban user')).not.toBeInTheDocument();
  });

  it('shows helper text about ban reason visibility', () => {
    render(<BanUserModal {...defaultProps} />);

    expect(screen.getByText(/this reason will be logged and shown to the user/i)).toBeInTheDocument();
  });

  it('has required attribute on textarea', () => {
    render(<BanUserModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/explain why this user is being permanently banned/i);
    expect(textarea).toHaveAttribute('required');
  });
});
