import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import SuspendUserModal from './SuspendUserModal';

// Mock the API
vi.mock('../../../lib/api', () => ({
  adminApi: {
    getModerationTemplates: vi.fn(() => Promise.resolve({ data: { templates: [] } })),
    useModerationTemplate: vi.fn(() => Promise.resolve()),
  },
}));

describe('SuspendUserModal', () => {
  const mockUser = {
    _id: 'user123',
    email: 'test@example.com',
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
    render(<SuspendUserModal {...defaultProps} />);

    // "Suspend User" appears in both title and button
    expect(screen.getAllByText('Suspend User').length).toBeGreaterThan(0);
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('renders suspension type options', () => {
    render(<SuspendUserModal {...defaultProps} />);

    expect(screen.getByText('Temporary')).toBeInTheDocument();
    expect(screen.getByText('Permanent')).toBeInTheDocument();
  });

  it('renders quick duration buttons when temporary is selected', () => {
    render(<SuspendUserModal {...defaultProps} />);

    expect(screen.getByRole('button', { name: '1 day' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3 days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 week' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '2 weeks' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 month' })).toBeInTheDocument();
  });

  it('renders date input for temporary suspension', () => {
    render(<SuspendUserModal {...defaultProps} />);

    expect(screen.getByRole('textbox', { type: 'date' }) || screen.getByDisplayValue('')).toBeInTheDocument();
  });

  it('renders reason textarea', () => {
    render(<SuspendUserModal {...defaultProps} />);

    expect(screen.getByPlaceholderText(/explain why this user is being suspended/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<SuspendUserModal {...defaultProps} onClose={handleClose} />);

    // Find the X button in the header
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find(btn => btn.querySelector('svg.w-5.h-5'));
    await user.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<SuspendUserModal {...defaultProps} onClose={handleClose} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = vi.fn();
    const { container } = render(<SuspendUserModal {...defaultProps} onClose={handleClose} />);

    const backdrop = container.querySelector('.bg-black\\/50');
    fireEvent.click(backdrop);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('submit button is disabled when reason is empty', () => {
    render(<SuspendUserModal {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /suspend user/i });
    expect(submitButton).toBeDisabled();
  });

  it('submit button is enabled when reason is provided', async () => {
    const user = userEvent.setup();
    render(<SuspendUserModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/explain why this user is being suspended/i);
    await user.type(textarea, 'Violation of terms');

    const submitButton = screen.getByRole('button', { name: /suspend user/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('calls onSubmit with reason and null until for permanent suspension', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<SuspendUserModal {...defaultProps} onSubmit={handleSubmit} />);

    // Select permanent
    await user.click(screen.getByText('Permanent'));

    const textarea = screen.getByPlaceholderText(/explain why this user is being suspended/i);
    await user.type(textarea, '  Violation of terms  ');

    await user.click(screen.getByRole('button', { name: /suspend user/i }));

    expect(handleSubmit).toHaveBeenCalledWith('Violation of terms', null);
  });

  it('calls onSubmit with reason and end date for temporary suspension', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<SuspendUserModal {...defaultProps} onSubmit={handleSubmit} />);

    // Click 1 week quick duration
    await user.click(screen.getByRole('button', { name: '1 week' }));

    const textarea = screen.getByPlaceholderText(/explain why this user is being suspended/i);
    await user.type(textarea, 'Violation of terms');

    await user.click(screen.getByRole('button', { name: /suspend user/i }));

    // Should have been called with reason and a date string
    expect(handleSubmit).toHaveBeenCalled();
    const [reason, until] = handleSubmit.mock.calls[0];
    expect(reason).toBe('Violation of terms');
    expect(until).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
  });

  it('sets date when quick duration button is clicked', async () => {
    const user = userEvent.setup();
    render(<SuspendUserModal {...defaultProps} />);

    // The date input
    const dateInput = screen.getByRole('textbox') || document.querySelector('input[type="date"]');

    // Click 1 day
    await user.click(screen.getByRole('button', { name: '1 day' }));

    // Date should be set
    await waitFor(() => {
      const inputs = document.querySelectorAll('input[type="date"]');
      const dateInput = inputs[0];
      expect(dateInput.value).toBeTruthy();
    });
  });

  it('shows permanent suspension warning when permanent is selected', async () => {
    const user = userEvent.setup();
    render(<SuspendUserModal {...defaultProps} />);

    await user.click(screen.getByText('Permanent'));

    expect(screen.getByText(/permanent suspensions require manual removal/i)).toBeInTheDocument();
  });

  it('hides date input when permanent is selected', async () => {
    const user = userEvent.setup();
    render(<SuspendUserModal {...defaultProps} />);

    await user.click(screen.getByText('Permanent'));

    // Quick duration buttons should not be visible
    expect(screen.queryByRole('button', { name: '1 day' })).not.toBeInTheDocument();
  });

  it('shows date input when temporary is selected after permanent', async () => {
    const user = userEvent.setup();
    render(<SuspendUserModal {...defaultProps} />);

    // Select permanent first
    await user.click(screen.getByText('Permanent'));
    expect(screen.queryByRole('button', { name: '1 day' })).not.toBeInTheDocument();

    // Select temporary
    await user.click(screen.getByText('Temporary'));
    expect(screen.getByRole('button', { name: '1 day' })).toBeInTheDocument();
  });

  it('disables submit button when isLoading is true', () => {
    render(<SuspendUserModal {...defaultProps} isLoading={true} />);

    const submitButton = screen.getByRole('button', { name: /suspending/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows loading state in submit button', () => {
    render(<SuspendUserModal {...defaultProps} isLoading={true} />);

    expect(screen.getByText('Suspending...')).toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    const error = { message: 'Failed to suspend user' };
    render(<SuspendUserModal {...defaultProps} error={error} />);

    expect(screen.getByText('Failed to suspend user')).toBeInTheDocument();
  });

  it('has required attribute on reason textarea', () => {
    render(<SuspendUserModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/explain why this user is being suspended/i);
    expect(textarea).toHaveAttribute('required');
  });

  it('highlights selected suspension type', async () => {
    const user = userEvent.setup();
    render(<SuspendUserModal {...defaultProps} />);

    // Temporary is selected by default
    const temporaryButton = screen.getByText('Temporary').closest('button');
    expect(temporaryButton).toHaveClass('border-red-500');

    // Select permanent
    await user.click(screen.getByText('Permanent'));

    const permanentButton = screen.getByText('Permanent').closest('button');
    expect(permanentButton).toHaveClass('border-red-500');
  });

  it('shows no end date message when date is not set', () => {
    render(<SuspendUserModal {...defaultProps} />);

    expect(screen.getByText(/if no end date is set, the suspension will be indefinite/i)).toBeInTheDocument();
  });
});
