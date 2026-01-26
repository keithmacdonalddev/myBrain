import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import WarnUserModal from './WarnUserModal';

// Mock the API
vi.mock('../../../lib/api', () => ({
  adminApi: {
    getModerationTemplates: vi.fn(() => Promise.resolve({ data: { templates: [] } })),
    useModerationTemplate: vi.fn(() => Promise.resolve()),
  },
}));

describe('WarnUserModal', () => {
  const mockUser = {
    _id: 'user123',
    email: 'test@example.com',
    moderationStatus: {
      warningCount: 1,
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
    render(<WarnUserModal {...defaultProps} />);

    expect(screen.getByText('Issue Warning')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('renders warning level options', () => {
    render(<WarnUserModal {...defaultProps} />);

    expect(screen.getByText('Minor')).toBeInTheDocument();
    expect(screen.getByText('First offense, gentle reminder')).toBeInTheDocument();

    expect(screen.getByText('Moderate')).toBeInTheDocument();
    expect(screen.getByText('Repeated behavior, formal warning')).toBeInTheDocument();

    expect(screen.getByText('Severe')).toBeInTheDocument();
    expect(screen.getByText('Serious violation, final warning')).toBeInTheDocument();
  });

  it('renders reason textarea', () => {
    render(<WarnUserModal {...defaultProps} />);

    expect(screen.getByPlaceholderText(/explain why this warning is being issued/i)).toBeInTheDocument();
  });

  it('displays existing warning count', () => {
    render(<WarnUserModal {...defaultProps} />);

    expect(screen.getByText(/this user already has 1 warning\(s\)/i)).toBeInTheDocument();
  });

  it('does not display warning count message if user has no warnings', () => {
    const userNoWarnings = {
      ...mockUser,
      moderationStatus: { warningCount: 0 },
    };
    render(<WarnUserModal {...defaultProps} user={userNoWarnings} />);

    expect(screen.queryByText(/this user already has/i)).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<WarnUserModal {...defaultProps} onClose={handleClose} />);

    // Find the X button in the header
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find(btn => btn.querySelector('svg.w-5.h-5'));
    await user.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<WarnUserModal {...defaultProps} onClose={handleClose} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = vi.fn();
    const { container } = render(<WarnUserModal {...defaultProps} onClose={handleClose} />);

    const backdrop = container.querySelector('.bg-black\\/50');
    fireEvent.click(backdrop);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('submit button is disabled when reason is empty', () => {
    render(<WarnUserModal {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /issue warning/i });
    expect(submitButton).toBeDisabled();
  });

  it('submit button is enabled when reason is provided', async () => {
    const user = userEvent.setup();
    render(<WarnUserModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/explain why this warning is being issued/i);
    await user.type(textarea, 'Inappropriate content');

    const submitButton = screen.getByRole('button', { name: /issue warning/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('calls onSubmit with reason and level when form is submitted', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<WarnUserModal {...defaultProps} onSubmit={handleSubmit} />);

    const textarea = screen.getByPlaceholderText(/explain why this warning is being issued/i);
    await user.type(textarea, '  Inappropriate content  ');

    await user.click(screen.getByRole('button', { name: /issue warning/i }));

    expect(handleSubmit).toHaveBeenCalledWith('Inappropriate content', 1);
  });

  it('allows selecting different warning levels', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<WarnUserModal {...defaultProps} onSubmit={handleSubmit} />);

    // Select severe level
    await user.click(screen.getByText('Severe'));

    const textarea = screen.getByPlaceholderText(/explain why this warning is being issued/i);
    await user.type(textarea, 'Serious violation');

    await user.click(screen.getByRole('button', { name: /issue warning/i }));

    expect(handleSubmit).toHaveBeenCalledWith('Serious violation', 3);
  });

  it('highlights selected warning level', async () => {
    const user = userEvent.setup();
    render(<WarnUserModal {...defaultProps} />);

    // Level 1 (Minor) is selected by default
    const minorButton = screen.getByText('Minor').closest('button');
    expect(minorButton).toHaveClass('border-yellow-500');

    // Select moderate
    await user.click(screen.getByText('Moderate'));

    const moderateButton = screen.getByText('Moderate').closest('button');
    expect(moderateButton).toHaveClass('border-yellow-500');
  });

  it('displays level number in circle', () => {
    render(<WarnUserModal {...defaultProps} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not submit when reason is only whitespace', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<WarnUserModal {...defaultProps} onSubmit={handleSubmit} />);

    const textarea = screen.getByPlaceholderText(/explain why this warning is being issued/i);
    await user.type(textarea, '   ');

    // Button should still be disabled
    const submitButton = screen.getByRole('button', { name: /issue warning/i });
    expect(submitButton).toBeDisabled();
  });

  it('disables submit button when isLoading is true', () => {
    render(<WarnUserModal {...defaultProps} isLoading={true} />);

    const submitButton = screen.getByRole('button', { name: /issuing/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows loading state in submit button', () => {
    render(<WarnUserModal {...defaultProps} isLoading={true} />);

    expect(screen.getByText('Issuing...')).toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    const error = { message: 'Failed to issue warning' };
    render(<WarnUserModal {...defaultProps} error={error} />);

    expect(screen.getByText('Failed to issue warning')).toBeInTheDocument();
  });

  it('has required attribute on reason textarea', () => {
    render(<WarnUserModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/explain why this warning is being issued/i);
    expect(textarea).toHaveAttribute('required');
  });

  it('shows level description for each option', () => {
    render(<WarnUserModal {...defaultProps} />);

    expect(screen.getByText('First offense, gentle reminder')).toBeInTheDocument();
    expect(screen.getByText('Repeated behavior, formal warning')).toBeInTheDocument();
    expect(screen.getByText('Serious violation, final warning')).toBeInTheDocument();
  });
});
