import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import CommentsSection from './CommentsSection';

describe('CommentsSection', () => {
  const mockUser = {
    _id: 'user123',
    id: 'user123',
    name: 'Test User',
    email: 'test@example.com',
  };

  const defaultProps = {
    comments: [],
    onAdd: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    isAdding: false,
    isUpdating: false,
    isDeleting: false,
  };

  const preloadedState = {
    auth: {
      user: mockUser,
      isAuthenticated: true,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders with "Comments" header when no comments', () => {
      render(<CommentsSection {...defaultProps} />, { preloadedState });
      expect(screen.getByText('Comments')).toBeInTheDocument();
    });

    it('renders with comment count when comments exist', () => {
      const comments = [
        { _id: '1', text: 'Comment 1', userId: 'user123', createdAt: new Date().toISOString() },
        { _id: '2', text: 'Comment 2', userId: 'user456', createdAt: new Date().toISOString() },
      ];
      render(<CommentsSection {...defaultProps} comments={comments} />, { preloadedState });
      expect(screen.getByText('2 comments')).toBeInTheDocument();
    });

    it('renders with singular "comment" for single comment', () => {
      const comments = [
        { _id: '1', text: 'Single comment', userId: 'user123', createdAt: new Date().toISOString() },
      ];
      render(<CommentsSection {...defaultProps} comments={comments} />, { preloadedState });
      expect(screen.getByText('1 comment')).toBeInTheDocument();
    });
  });

  describe('Expand/Collapse Behavior', () => {
    it('does not show comments initially', () => {
      const comments = [
        { _id: '1', text: 'Hidden comment', userId: 'user123', createdAt: new Date().toISOString() },
      ];
      render(<CommentsSection {...defaultProps} comments={comments} />, { preloadedState });
      expect(screen.queryByText('Hidden comment')).not.toBeInTheDocument();
    });

    it('shows comments when expanded', async () => {
      const user = userEvent.setup();
      const comments = [
        { _id: '1', text: 'Visible comment', userId: 'user123', createdAt: new Date().toISOString() },
      ];
      render(<CommentsSection {...defaultProps} comments={comments} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));
      expect(screen.getByText('Visible comment')).toBeInTheDocument();
    });

    it('hides comments when collapsed', async () => {
      const user = userEvent.setup();
      const comments = [
        { _id: '1', text: 'Toggle comment', userId: 'user123', createdAt: new Date().toISOString() },
      ];
      render(<CommentsSection {...defaultProps} comments={comments} />, { preloadedState });

      // Expand
      await user.click(screen.getByRole('button', { name: /comment/i }));
      expect(screen.getByText('Toggle comment')).toBeInTheDocument();

      // Collapse
      await user.click(screen.getByRole('button', { name: /comment/i }));
      expect(screen.queryByText('Toggle comment')).not.toBeInTheDocument();
    });

    it('shows input field when expanded', async () => {
      const user = userEvent.setup();
      render(<CommentsSection {...defaultProps} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));
      expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state message when no comments', async () => {
      const user = userEvent.setup();
      render(<CommentsSection {...defaultProps} comments={[]} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));
      expect(screen.getByText('No comments yet')).toBeInTheDocument();
    });
  });

  describe('Adding Comments', () => {
    it('shows add comment input when expanded', async () => {
      const user = userEvent.setup();
      render(<CommentsSection {...defaultProps} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));
      expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
    });

    it('calls onAdd when submit button is clicked', async () => {
      const user = userEvent.setup();
      const handleAdd = vi.fn();
      render(<CommentsSection {...defaultProps} onAdd={handleAdd} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));

      const input = screen.getByPlaceholderText('Add a comment...');
      await user.type(input, 'New comment text');

      // Find the submit button (with Send icon)
      const submitButtons = screen.getAllByRole('button');
      const submitButton = submitButtons.find(btn =>
        btn.className.includes('bg-primary') && !btn.className.includes('hover:bg-panel')
      );
      await user.click(submitButton);

      expect(handleAdd).toHaveBeenCalledWith('New comment text');
    });

    it('calls onAdd when Enter is pressed', async () => {
      const user = userEvent.setup();
      const handleAdd = vi.fn();
      render(<CommentsSection {...defaultProps} onAdd={handleAdd} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));

      const input = screen.getByPlaceholderText('Add a comment...');
      await user.type(input, 'Enter comment{Enter}');

      expect(handleAdd).toHaveBeenCalledWith('Enter comment');
    });

    it('clears input after adding comment', async () => {
      const user = userEvent.setup();
      render(<CommentsSection {...defaultProps} onAdd={() => {}} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));

      const input = screen.getByPlaceholderText('Add a comment...');
      await user.type(input, 'Test comment{Enter}');

      expect(input).toHaveValue('');
    });

    it('does not call onAdd for empty comments', async () => {
      const user = userEvent.setup();
      const handleAdd = vi.fn();
      render(<CommentsSection {...defaultProps} onAdd={handleAdd} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));

      const input = screen.getByPlaceholderText('Add a comment...');
      await user.type(input, '   {Enter}');

      expect(handleAdd).not.toHaveBeenCalled();
    });

    it('trims whitespace from comments', async () => {
      const user = userEvent.setup();
      const handleAdd = vi.fn();
      render(<CommentsSection {...defaultProps} onAdd={handleAdd} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));

      const input = screen.getByPlaceholderText('Add a comment...');
      await user.type(input, '  Trimmed comment  {Enter}');

      expect(handleAdd).toHaveBeenCalledWith('Trimmed comment');
    });

    it('shows loading state when isAdding is true', async () => {
      const user = userEvent.setup();
      render(<CommentsSection {...defaultProps} isAdding={true} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));

      // The submit button should show a spinner
      const container = screen.getByPlaceholderText('Add a comment...').parentElement;
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('disables submit button when input is empty', async () => {
      const user = userEvent.setup();
      render(<CommentsSection {...defaultProps} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));

      const submitButtons = screen.getAllByRole('button');
      const submitButton = submitButtons.find(btn =>
        btn.className.includes('bg-primary') && btn.className.includes('disabled:opacity-50')
      );

      expect(submitButton).toBeDisabled();
    });
  });

  describe('Comment Display', () => {
    it('displays comment text', async () => {
      const user = userEvent.setup();
      const comments = [
        { _id: '1', text: 'Test comment text', userId: 'user123', createdAt: new Date().toISOString() },
      ];
      render(<CommentsSection {...defaultProps} comments={comments} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));
      expect(screen.getByText('Test comment text')).toBeInTheDocument();
    });

    it('displays relative timestamp', async () => {
      const user = userEvent.setup();
      const comments = [
        { _id: '1', text: 'Recent comment', userId: 'user123', createdAt: new Date().toISOString() },
      ];
      render(<CommentsSection {...defaultProps} comments={comments} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));
      // Should show "less than a minute ago" or similar
      expect(screen.getByText(/ago/i)).toBeInTheDocument();
    });

    it('shows "(edited)" label for edited comments', async () => {
      const user = userEvent.setup();
      const createdAt = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
      const updatedAt = new Date().toISOString(); // now
      const comments = [
        { _id: '1', text: 'Edited comment', userId: 'user123', createdAt, updatedAt },
      ];
      render(<CommentsSection {...defaultProps} comments={comments} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));
      expect(screen.getByText('(edited)')).toBeInTheDocument();
    });

    it('does not show "(edited)" for unedited comments', async () => {
      const user = userEvent.setup();
      const timestamp = new Date().toISOString();
      const comments = [
        { _id: '1', text: 'Unedited comment', userId: 'user123', createdAt: timestamp, updatedAt: timestamp },
      ];
      render(<CommentsSection {...defaultProps} comments={comments} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));
      expect(screen.queryByText('(edited)')).not.toBeInTheDocument();
    });
  });

  describe('Comment Ownership', () => {
    it('shows edit/delete buttons for own comments', async () => {
      const user = userEvent.setup();
      const comments = [
        { _id: '1', text: 'My comment', userId: 'user123', createdAt: new Date().toISOString() },
      ];
      render(<CommentsSection {...defaultProps} comments={comments} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));

      // Find the comment container and hover
      const commentText = screen.getByText('My comment');
      const commentContainer = commentText.closest('.group');

      // Edit and Delete buttons should exist (visible on hover)
      expect(commentContainer.querySelector('[title="Edit"]')).toBeInTheDocument();
      expect(commentContainer.querySelector('[title="Delete"]')).toBeInTheDocument();
    });

    it('does not show edit/delete buttons for other users comments', async () => {
      const user = userEvent.setup();
      const comments = [
        { _id: '1', text: 'Other comment', userId: 'other-user', createdAt: new Date().toISOString() },
      ];
      render(<CommentsSection {...defaultProps} comments={comments} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));

      const commentText = screen.getByText('Other comment');
      const commentContainer = commentText.closest('.group');

      expect(commentContainer.querySelector('[title="Edit"]')).not.toBeInTheDocument();
      expect(commentContainer.querySelector('[title="Delete"]')).not.toBeInTheDocument();
    });

    it('handles userId as object with _id', async () => {
      const user = userEvent.setup();
      const comments = [
        { _id: '1', text: 'My comment', userId: { _id: 'user123' }, createdAt: new Date().toISOString() },
      ];
      render(<CommentsSection {...defaultProps} comments={comments} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));

      const commentText = screen.getByText('My comment');
      const commentContainer = commentText.closest('.group');

      // Should show edit/delete for own comment
      expect(commentContainer.querySelector('[title="Edit"]')).toBeInTheDocument();
    });
  });

  describe('Editing Comments', () => {
    it('enters edit mode when edit button is clicked', async () => {
      const user = userEvent.setup();
      const comments = [
        { _id: '1', text: 'Edit me', userId: 'user123', createdAt: new Date().toISOString() },
      ];
      render(<CommentsSection {...defaultProps} comments={comments} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));

      const editButton = screen.getByTitle('Edit');
      await user.click(editButton);

      // Should show edit input with existing text
      const editInput = screen.getByDisplayValue('Edit me');
      expect(editInput).toBeInTheDocument();
    });

    it('calls onUpdate when edit is confirmed', async () => {
      const user = userEvent.setup();
      const handleUpdate = vi.fn();
      const comments = [
        { _id: 'comment1', text: 'Original text', userId: 'user123', createdAt: new Date().toISOString() },
      ];
      render(
        <CommentsSection {...defaultProps} comments={comments} onUpdate={handleUpdate} />,
        { preloadedState }
      );

      await user.click(screen.getByRole('button', { name: /comment/i }));

      const editButton = screen.getByTitle('Edit');
      await user.click(editButton);

      const editInput = screen.getByDisplayValue('Original text');
      await user.clear(editInput);
      await user.type(editInput, 'Updated text{Enter}');

      expect(handleUpdate).toHaveBeenCalledWith('comment1', 'Updated text');
    });

    it('cancels edit mode when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const comments = [
        { _id: '1', text: 'Cancel test', userId: 'user123', createdAt: new Date().toISOString() },
      ];
      render(<CommentsSection {...defaultProps} comments={comments} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));

      const editButton = screen.getByTitle('Edit');
      await user.click(editButton);

      // Find cancel button (X icon)
      const cancelButtons = screen.getAllByRole('button');
      const cancelButton = cancelButtons.find(btn =>
        btn.className.includes('text-muted') && btn.className.includes('hover:bg-bg')
      );
      await user.click(cancelButton);

      // Should show original text, not edit input
      expect(screen.getByText('Cancel test')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Cancel test')).not.toBeInTheDocument();
    });

    it('cancels edit mode when Escape is pressed', async () => {
      const user = userEvent.setup();
      const comments = [
        { _id: '1', text: 'Escape test', userId: 'user123', createdAt: new Date().toISOString() },
      ];
      render(<CommentsSection {...defaultProps} comments={comments} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));

      const editButton = screen.getByTitle('Edit');
      await user.click(editButton);

      screen.getByDisplayValue('Escape test');
      await user.keyboard('{Escape}');

      // Should exit edit mode
      expect(screen.getByText('Escape test')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Escape test')).not.toBeInTheDocument();
    });

    it('shows loading state when isUpdating is true', async () => {
      const user = userEvent.setup();
      const comments = [
        { _id: '1', text: 'Updating...', userId: 'user123', createdAt: new Date().toISOString() },
      ];
      render(<CommentsSection {...defaultProps} comments={comments} isUpdating={true} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));

      const editButton = screen.getByTitle('Edit');
      await user.click(editButton);

      // Should show spinner in confirm button
      const editContainer = screen.getByDisplayValue('Updating...').parentElement;
      expect(editContainer.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Deleting Comments', () => {
    it('calls onDelete when delete button is clicked', async () => {
      const user = userEvent.setup();
      const handleDelete = vi.fn();
      const comments = [
        { _id: 'comment-to-delete', text: 'Delete me', userId: 'user123', createdAt: new Date().toISOString() },
      ];
      render(
        <CommentsSection {...defaultProps} comments={comments} onDelete={handleDelete} />,
        { preloadedState }
      );

      await user.click(screen.getByRole('button', { name: /comment/i }));

      const deleteButton = screen.getByTitle('Delete');
      await user.click(deleteButton);

      expect(handleDelete).toHaveBeenCalledWith('comment-to-delete');
    });

    it('shows loading state when isDeleting is true', async () => {
      const user = userEvent.setup();
      const comments = [
        { _id: '1', text: 'Deleting...', userId: 'user123', createdAt: new Date().toISOString() },
      ];
      render(<CommentsSection {...defaultProps} comments={comments} isDeleting={true} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));

      // Delete button should show spinner
      const commentText = screen.getByText('Deleting...');
      const commentContainer = commentText.closest('.group');
      expect(commentContainer.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('disables delete button when isDeleting is true', async () => {
      const user = userEvent.setup();
      const comments = [
        { _id: '1', text: 'Cannot delete', userId: 'user123', createdAt: new Date().toISOString() },
      ];
      render(<CommentsSection {...defaultProps} comments={comments} isDeleting={true} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));

      const deleteButton = screen.getByTitle('Delete');
      expect(deleteButton).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined comments array', () => {
      render(<CommentsSection {...defaultProps} comments={undefined} />, { preloadedState });
      expect(screen.getByText('Comments')).toBeInTheDocument();
    });

    it('handles comments without timestamps gracefully', async () => {
      const user = userEvent.setup();
      const comments = [
        { _id: '1', text: 'No timestamp', userId: 'user123' },
      ];
      render(<CommentsSection {...defaultProps} comments={comments} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));
      expect(screen.getByText('No timestamp')).toBeInTheDocument();
    });

    it('handles invalid timestamps gracefully', async () => {
      const user = userEvent.setup();
      const comments = [
        { _id: '1', text: 'Invalid timestamp', userId: 'user123', createdAt: 'invalid-date' },
      ];
      render(<CommentsSection {...defaultProps} comments={comments} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));
      expect(screen.getByText('Invalid timestamp')).toBeInTheDocument();
    });

    it('handles multiple comments in order', async () => {
      const user = userEvent.setup();
      const comments = [
        { _id: '1', text: 'First comment', userId: 'user123', createdAt: new Date().toISOString() },
        { _id: '2', text: 'Second comment', userId: 'user456', createdAt: new Date().toISOString() },
        { _id: '3', text: 'Third comment', userId: 'user789', createdAt: new Date().toISOString() },
      ];
      render(<CommentsSection {...defaultProps} comments={comments} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));

      const commentTexts = screen.getAllByText(/comment/i).filter(el =>
        el.textContent.match(/First|Second|Third/)
      );
      expect(commentTexts).toHaveLength(3);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('submits comment on Enter without Shift', async () => {
      const user = userEvent.setup();
      const handleAdd = vi.fn();
      render(<CommentsSection {...defaultProps} onAdd={handleAdd} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));

      const input = screen.getByPlaceholderText('Add a comment...');
      await user.type(input, 'Enter submit');
      await user.keyboard('{Enter}');

      expect(handleAdd).toHaveBeenCalledWith('Enter submit');
    });

    it('does not submit on Shift+Enter (allows multiline in future)', async () => {
      const user = userEvent.setup();
      const handleAdd = vi.fn();
      render(<CommentsSection {...defaultProps} onAdd={handleAdd} />, { preloadedState });

      await user.click(screen.getByRole('button', { name: /comment/i }));

      const input = screen.getByPlaceholderText('Add a comment...');
      await user.type(input, 'No submit');
      await user.keyboard('{Shift>}{Enter}{/Shift}');

      expect(handleAdd).not.toHaveBeenCalled();
    });
  });
});
