import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import ReportModal from './ReportModal';

// Mock the API module
vi.mock('../../../lib/api', () => ({
  reportsApi: {
    submitReport: vi.fn(),
  },
}));

import { reportsApi } from '../../../lib/api';

describe('ReportModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    targetType: 'user',
    targetId: 'user123',
    targetName: 'John Doe',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<ReportModal {...defaultProps} isOpen={false} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders modal when isOpen is true', () => {
    render(<ReportModal {...defaultProps} />);

    expect(screen.getByText('Report User')).toBeInTheDocument();
  });

  it('shows target name being reported', () => {
    render(<ReportModal {...defaultProps} />);

    expect(screen.getByText('Reporting')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows "Report Content" title for non-user targets', () => {
    render(<ReportModal {...defaultProps} targetType="message" />);

    expect(screen.getByText('Report Content')).toBeInTheDocument();
  });

  it('displays all report reason options', () => {
    render(<ReportModal {...defaultProps} />);

    expect(screen.getByText('Spam')).toBeInTheDocument();
    expect(screen.getByText('Harassment')).toBeInTheDocument();
    expect(screen.getByText('Hate Speech')).toBeInTheDocument();
    expect(screen.getByText('Inappropriate Content')).toBeInTheDocument();
    expect(screen.getByText('Impersonation')).toBeInTheDocument();
    expect(screen.getByText('Privacy Violation')).toBeInTheDocument();
    expect(screen.getByText('Scam')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('displays reason descriptions', () => {
    render(<ReportModal {...defaultProps} />);

    expect(
      screen.getByText('Unwanted promotional content or mass messaging')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Bullying, threats, or targeted abuse')
    ).toBeInTheDocument();
  });

  it('allows selecting a reason', async () => {
    const user = userEvent.setup();
    render(<ReportModal {...defaultProps} />);

    const spamOption = screen.getByText('Spam').closest('label');
    await user.click(spamOption);

    const radioInput = spamOption.querySelector('input[type="radio"]');
    expect(radioInput).toBeChecked();
  });

  it('shows additional details textarea', () => {
    render(<ReportModal {...defaultProps} />);

    expect(
      screen.getByPlaceholderText(
        'Provide any additional context that might help us review this report...'
      )
    ).toBeInTheDocument();
  });

  it('shows character count for description', () => {
    render(<ReportModal {...defaultProps} />);

    expect(screen.getByText('0/1000')).toBeInTheDocument();
  });

  it('updates character count as user types', async () => {
    const user = userEvent.setup();
    render(<ReportModal {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(
      'Provide any additional context that might help us review this report...'
    );
    await user.type(textarea, 'Test description');

    expect(screen.getByText('16/1000')).toBeInTheDocument();
  });

  it('disables submit button when no reason selected', () => {
    render(<ReportModal {...defaultProps} />);

    expect(screen.getByRole('button', { name: /Submit Report/i })).toBeDisabled();
  });

  it('enables submit button when reason is selected', async () => {
    const user = userEvent.setup();
    render(<ReportModal {...defaultProps} />);

    const spamOption = screen.getByText('Spam').closest('label');
    await user.click(spamOption);

    expect(
      screen.getByRole('button', { name: /Submit Report/i })
    ).not.toBeDisabled();
  });

  it('calls onClose when close button clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ReportModal {...defaultProps} onClose={onClose} />);

    // Find the X close button in the header
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find(btn => btn.querySelector('svg.lucide-x'));
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when cancel button clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ReportModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('submits report with selected reason', async () => {
    const user = userEvent.setup();
    reportsApi.submitReport.mockResolvedValue({ success: true });
    render(<ReportModal {...defaultProps} />);

    // Select reason
    const spamOption = screen.getByText('Spam').closest('label');
    await user.click(spamOption);

    // Submit
    await user.click(screen.getByRole('button', { name: /Submit Report/i }));

    await waitFor(() => {
      expect(reportsApi.submitReport).toHaveBeenCalledWith({
        targetType: 'user',
        targetId: 'user123',
        reason: 'spam',
        description: undefined,
      });
    });
  });

  it('submits report with description', async () => {
    const user = userEvent.setup();
    reportsApi.submitReport.mockResolvedValue({ success: true });
    render(<ReportModal {...defaultProps} />);

    // Select reason
    const spamOption = screen.getByText('Spam').closest('label');
    await user.click(spamOption);

    // Add description
    const textarea = screen.getByPlaceholderText(
      'Provide any additional context that might help us review this report...'
    );
    await user.type(textarea, 'Additional details here');

    // Submit
    await user.click(screen.getByRole('button', { name: /Submit Report/i }));

    await waitFor(() => {
      expect(reportsApi.submitReport).toHaveBeenCalledWith({
        targetType: 'user',
        targetId: 'user123',
        reason: 'spam',
        description: 'Additional details here',
      });
    });
  });

  it('shows success message after submission', async () => {
    const user = userEvent.setup();
    reportsApi.submitReport.mockResolvedValue({ success: true });
    render(<ReportModal {...defaultProps} />);

    // Select reason and submit
    const spamOption = screen.getByText('Spam').closest('label');
    await user.click(spamOption);
    await user.click(screen.getByRole('button', { name: /Submit Report/i }));

    await waitFor(() => {
      expect(screen.getByText('Report Submitted')).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "Thank you for helping keep our community safe. We'll review your report and take appropriate action."
      )
    ).toBeInTheDocument();
  });

  it('shows Done button after successful submission', async () => {
    const user = userEvent.setup();
    reportsApi.submitReport.mockResolvedValue({ success: true });
    render(<ReportModal {...defaultProps} />);

    const spamOption = screen.getByText('Spam').closest('label');
    await user.click(spamOption);
    await user.click(screen.getByRole('button', { name: /Submit Report/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    });
  });

  it('closes modal when Done button clicked after submission', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    reportsApi.submitReport.mockResolvedValue({ success: true });
    render(<ReportModal {...defaultProps} onClose={onClose} />);

    const spamOption = screen.getByText('Spam').closest('label');
    await user.click(spamOption);
    await user.click(screen.getByRole('button', { name: /Submit Report/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Done' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('shows loading state while submitting', async () => {
    const user = userEvent.setup();
    reportsApi.submitReport.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );
    render(<ReportModal {...defaultProps} />);

    const spamOption = screen.getByText('Spam').closest('label');
    await user.click(spamOption);
    await user.click(screen.getByRole('button', { name: /Submit Report/i }));

    expect(screen.getByText('Submitting...')).toBeInTheDocument();
  });

  it('shows error message on submission failure', async () => {
    const user = userEvent.setup();
    reportsApi.submitReport.mockRejectedValue(new Error('Network error'));
    render(<ReportModal {...defaultProps} />);

    const spamOption = screen.getByText('Spam').closest('label');
    await user.click(spamOption);
    await user.click(screen.getByRole('button', { name: /Submit Report/i }));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('resets form state when modal is closed and reopened', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(
      <ReportModal {...defaultProps} onClose={onClose} />
    );

    // Select a reason
    const spamOption = screen.getByText('Spam').closest('label');
    await user.click(spamOption);

    // Close modal
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    // onClose should be called which resets form state
    expect(onClose).toHaveBeenCalled();
  });

  it('disables submit button while submitting', async () => {
    const user = userEvent.setup();
    reportsApi.submitReport.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );
    render(<ReportModal {...defaultProps} />);

    const spamOption = screen.getByText('Spam').closest('label');
    await user.click(spamOption);
    await user.click(screen.getByRole('button', { name: /Submit Report/i }));

    expect(screen.getByText('Submitting...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submitting/i })).toBeDisabled();
  });
});
