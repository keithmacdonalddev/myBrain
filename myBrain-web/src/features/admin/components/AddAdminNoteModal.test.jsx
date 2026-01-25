import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import AddAdminNoteModal from './AddAdminNoteModal';

describe('AddAdminNoteModal', () => {
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
    render(<AddAdminNoteModal {...defaultProps} />);

    expect(screen.getByText('Add Admin Note')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('renders note content textarea', () => {
    render(<AddAdminNoteModal {...defaultProps} />);

    expect(screen.getByPlaceholderText(/add internal notes about this user/i)).toBeInTheDocument();
  });

  it('shows character count', () => {
    render(<AddAdminNoteModal {...defaultProps} />);

    expect(screen.getByText('0/5000 characters')).toBeInTheDocument();
  });

  it('updates character count as user types', async () => {
    const user = userEvent.setup();
    render(<AddAdminNoteModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/add internal notes about this user/i);
    await user.type(textarea, 'Test note');

    expect(screen.getByText('9/5000 characters')).toBeInTheDocument();
  });

  it('renders informational message about admin notes', () => {
    render(<AddAdminNoteModal {...defaultProps} />);

    expect(screen.getByText(/admin notes are internal records/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<AddAdminNoteModal {...defaultProps} onClose={handleClose} />);

    // Find the X button in the header
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find(btn => btn.querySelector('svg'));
    await user.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<AddAdminNoteModal {...defaultProps} onClose={handleClose} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = vi.fn();
    const { container } = render(<AddAdminNoteModal {...defaultProps} onClose={handleClose} />);

    const backdrop = container.querySelector('.bg-black\\/50');
    fireEvent.click(backdrop);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSubmit with trimmed content when form is submitted', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<AddAdminNoteModal {...defaultProps} onSubmit={handleSubmit} />);

    const textarea = screen.getByPlaceholderText(/add internal notes about this user/i);
    await user.type(textarea, '  Test note content  ');

    await user.click(screen.getByRole('button', { name: /add note/i }));

    expect(handleSubmit).toHaveBeenCalledWith('Test note content');
  });

  it('does not submit when content is empty', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<AddAdminNoteModal {...defaultProps} onSubmit={handleSubmit} />);

    await user.click(screen.getByRole('button', { name: /add note/i }));

    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('does not submit when content is only whitespace', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<AddAdminNoteModal {...defaultProps} onSubmit={handleSubmit} />);

    const textarea = screen.getByPlaceholderText(/add internal notes about this user/i);
    await user.type(textarea, '   ');

    await user.click(screen.getByRole('button', { name: /add note/i }));

    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it('disables submit button when isLoading is true', () => {
    render(<AddAdminNoteModal {...defaultProps} isLoading={true} />);

    const submitButton = screen.getByRole('button', { name: /saving/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows loading state in submit button', () => {
    render(<AddAdminNoteModal {...defaultProps} isLoading={true} />);

    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('disables submit button when content is empty', () => {
    render(<AddAdminNoteModal {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /add note/i });
    expect(submitButton).toBeDisabled();
  });

  it('disables submit button when content exceeds 5000 characters', async () => {
    const user = userEvent.setup();
    render(<AddAdminNoteModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/add internal notes about this user/i);
    const longContent = 'a'.repeat(5001);

    // Use fireEvent for long text to avoid timeout
    fireEvent.change(textarea, { target: { value: longContent } });

    const submitButton = screen.getByRole('button', { name: /add note/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when content is valid', async () => {
    const user = userEvent.setup();
    render(<AddAdminNoteModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/add internal notes about this user/i);
    await user.type(textarea, 'Valid note content');

    const submitButton = screen.getByRole('button', { name: /add note/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('displays error message when error prop is provided', () => {
    const error = { message: 'Failed to add note' };
    render(<AddAdminNoteModal {...defaultProps} error={error} />);

    expect(screen.getByText('Failed to add note')).toBeInTheDocument();
  });

  it('does not display error section when there is no error', () => {
    const { container } = render(<AddAdminNoteModal {...defaultProps} />);

    expect(container.querySelector('.bg-red-500\\/10.rounded-lg.text-red-500')).not.toBeInTheDocument();
  });

  it('has required attribute on textarea', () => {
    render(<AddAdminNoteModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/add internal notes about this user/i);
    expect(textarea).toHaveAttribute('required');
  });
});
