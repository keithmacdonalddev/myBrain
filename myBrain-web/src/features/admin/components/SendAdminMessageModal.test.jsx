import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import SendAdminMessageModal from './SendAdminMessageModal';

describe('SendAdminMessageModal', () => {
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
    render(<SendAdminMessageModal {...defaultProps} />);

    // "Send Message" appears in both title and button
    expect(screen.getAllByText('Send Message').length).toBeGreaterThan(0);
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('renders subject input field', () => {
    render(<SendAdminMessageModal {...defaultProps} />);

    expect(screen.getByPlaceholderText('Message subject...')).toBeInTheDocument();
  });

  it('renders category dropdown with all options', () => {
    render(<SendAdminMessageModal {...defaultProps} />);

    const categorySelect = screen.getByRole('combobox');
    expect(categorySelect).toBeInTheDocument();

    // Check that categories exist
    expect(screen.getByText(/general - general communication/i)).toBeInTheDocument();
  });

  it('renders priority buttons', () => {
    render(<SendAdminMessageModal {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Low' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Normal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'High' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Urgent' })).toBeInTheDocument();
  });

  it('renders message textarea', () => {
    render(<SendAdminMessageModal {...defaultProps} />);

    expect(screen.getByPlaceholderText('Write your message to the user...')).toBeInTheDocument();
  });

  it('shows character count for message', () => {
    render(<SendAdminMessageModal {...defaultProps} />);

    expect(screen.getByText('0/5000 characters')).toBeInTheDocument();
  });

  it('updates character count as user types message', async () => {
    const user = userEvent.setup();
    render(<SendAdminMessageModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('Write your message to the user...');
    await user.type(textarea, 'Hello there');

    expect(screen.getByText('11/5000 characters')).toBeInTheDocument();
  });

  it('renders informational message about notifications', () => {
    render(<SendAdminMessageModal {...defaultProps} />);

    expect(screen.getByText(/this message will be sent directly to the user/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<SendAdminMessageModal {...defaultProps} onClose={handleClose} />);

    // Find the X button in the header
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find(btn => btn.querySelector('svg.w-5.h-5'));
    await user.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    render(<SendAdminMessageModal {...defaultProps} onClose={handleClose} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = vi.fn();
    const { container } = render(<SendAdminMessageModal {...defaultProps} onClose={handleClose} />);

    const backdrop = container.querySelector('.bg-black\\/50');
    fireEvent.click(backdrop);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('submit button is disabled when subject is empty', async () => {
    const user = userEvent.setup();
    render(<SendAdminMessageModal {...defaultProps} />);

    // Fill only message
    const textarea = screen.getByPlaceholderText('Write your message to the user...');
    await user.type(textarea, 'Some message');

    const submitButton = screen.getByRole('button', { name: /send message/i });
    expect(submitButton).toBeDisabled();
  });

  it('submit button is disabled when message is empty', async () => {
    const user = userEvent.setup();
    render(<SendAdminMessageModal {...defaultProps} />);

    // Fill only subject
    const subjectInput = screen.getByPlaceholderText('Message subject...');
    await user.type(subjectInput, 'Test Subject');

    const submitButton = screen.getByRole('button', { name: /send message/i });
    expect(submitButton).toBeDisabled();
  });

  it('submit button is enabled when subject and message are filled', async () => {
    const user = userEvent.setup();
    render(<SendAdminMessageModal {...defaultProps} />);

    const subjectInput = screen.getByPlaceholderText('Message subject...');
    await user.type(subjectInput, 'Test Subject');

    const textarea = screen.getByPlaceholderText('Write your message to the user...');
    await user.type(textarea, 'Test message content');

    const submitButton = screen.getByRole('button', { name: /send message/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('calls onSubmit with form data when submitted', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<SendAdminMessageModal {...defaultProps} onSubmit={handleSubmit} />);

    const subjectInput = screen.getByPlaceholderText('Message subject...');
    await user.type(subjectInput, '  Test Subject  ');

    const textarea = screen.getByPlaceholderText('Write your message to the user...');
    await user.type(textarea, '  Test message  ');

    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(handleSubmit).toHaveBeenCalledWith({
      subject: 'Test Subject',
      message: 'Test message',
      category: 'general',
      priority: 'normal',
    });
  });

  it('allows changing category', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<SendAdminMessageModal {...defaultProps} onSubmit={handleSubmit} />);

    // Change category
    const categorySelect = screen.getByRole('combobox');
    await user.selectOptions(categorySelect, 'security');

    // Fill required fields
    const subjectInput = screen.getByPlaceholderText('Message subject...');
    await user.type(subjectInput, 'Subject');

    const textarea = screen.getByPlaceholderText('Write your message to the user...');
    await user.type(textarea, 'Message');

    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'security',
      })
    );
  });

  it('allows changing priority', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<SendAdminMessageModal {...defaultProps} onSubmit={handleSubmit} />);

    // Click high priority button
    await user.click(screen.getByRole('button', { name: 'High' }));

    // Fill required fields
    const subjectInput = screen.getByPlaceholderText('Message subject...');
    await user.type(subjectInput, 'Subject');

    const textarea = screen.getByPlaceholderText('Write your message to the user...');
    await user.type(textarea, 'Message');

    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: 'high',
      })
    );
  });

  it('highlights selected priority button', async () => {
    const user = userEvent.setup();
    render(<SendAdminMessageModal {...defaultProps} />);

    // Normal is selected by default
    const normalButton = screen.getByRole('button', { name: 'Normal' });
    expect(normalButton).toHaveClass('border-blue-500');

    // Click urgent
    await user.click(screen.getByRole('button', { name: 'Urgent' }));

    const urgentButton = screen.getByRole('button', { name: 'Urgent' });
    expect(urgentButton).toHaveClass('border-blue-500');
  });

  it('disables submit button when isLoading is true', () => {
    render(<SendAdminMessageModal {...defaultProps} isLoading={true} />);

    const submitButton = screen.getByRole('button', { name: /sending/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows loading state in submit button', () => {
    render(<SendAdminMessageModal {...defaultProps} isLoading={true} />);

    expect(screen.getByText('Sending...')).toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    const error = { message: 'Failed to send message' };
    render(<SendAdminMessageModal {...defaultProps} error={error} />);

    expect(screen.getByText('Failed to send message')).toBeInTheDocument();
  });

  it('has required attribute on subject input', () => {
    render(<SendAdminMessageModal {...defaultProps} />);

    const subjectInput = screen.getByPlaceholderText('Message subject...');
    expect(subjectInput).toHaveAttribute('required');
  });

  it('has required attribute on message textarea', () => {
    render(<SendAdminMessageModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('Write your message to the user...');
    expect(textarea).toHaveAttribute('required');
  });

  it('has maxLength attribute on subject input', () => {
    render(<SendAdminMessageModal {...defaultProps} />);

    const subjectInput = screen.getByPlaceholderText('Message subject...');
    expect(subjectInput).toHaveAttribute('maxLength', '200');
  });

  it('has maxLength attribute on message textarea', () => {
    render(<SendAdminMessageModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText('Write your message to the user...');
    expect(textarea).toHaveAttribute('maxLength', '5000');
  });
});
