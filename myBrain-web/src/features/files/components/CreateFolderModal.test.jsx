import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateFolderModal from './CreateFolderModal';

// Mock the hooks
vi.mock('../hooks/useFolders', () => ({
  useCreateFolder: vi.fn(),
}));

vi.mock('../../../hooks/useToast', () => ({
  default: vi.fn(),
}));

// Import the mocked modules
import { useCreateFolder } from '../hooks/useFolders';
import useToast from '../../../hooks/useToast';

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('CreateFolderModal', () => {
  const mockOnClose = vi.fn();
  const mockOnCreated = vi.fn();
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
  };
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue(mockToast);
    useCreateFolder.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
  });

  it('renders nothing when isOpen is false', () => {
    render(
      <CreateFolderModal
        isOpen={false}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByText('New Folder')).not.toBeInTheDocument();
  });

  it('renders modal when isOpen is true', () => {
    render(
      <CreateFolderModal
        isOpen={true}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('New Folder')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter folder name...')).toBeInTheDocument();
    expect(screen.getByText('Folder Name')).toBeInTheDocument();
    expect(screen.getByText('Color')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create folder/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('displays color picker with all preset colors', () => {
    render(
      <CreateFolderModal
        isOpen={true}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    // Check for color buttons by their title
    expect(screen.getByTitle('Default')).toBeInTheDocument();
    expect(screen.getByTitle('Blue')).toBeInTheDocument();
    expect(screen.getByTitle('Green')).toBeInTheDocument();
    expect(screen.getByTitle('Purple')).toBeInTheDocument();
    expect(screen.getByTitle('Orange')).toBeInTheDocument();
    expect(screen.getByTitle('Pink')).toBeInTheDocument();
    expect(screen.getByTitle('Yellow')).toBeInTheDocument();
    expect(screen.getByTitle('Red')).toBeInTheDocument();
  });

  it('disables submit button when name is empty', () => {
    render(
      <CreateFolderModal
        isOpen={true}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    const submitButton = screen.getByRole('button', { name: /create folder/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when name is entered', async () => {
    const user = userEvent.setup();
    render(
      <CreateFolderModal
        isOpen={true}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    const input = screen.getByPlaceholderText('Enter folder name...');
    await user.type(input, 'My New Folder');

    const submitButton = screen.getByRole('button', { name: /create folder/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('creates folder on form submission', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({ _id: 'folder-1', name: 'Test Folder' });

    render(
      <CreateFolderModal
        isOpen={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
      { wrapper: createWrapper() }
    );

    const input = screen.getByPlaceholderText('Enter folder name...');
    await user.type(input, 'Test Folder');

    const submitButton = screen.getByRole('button', { name: /create folder/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        name: 'Test Folder',
        parentId: null,
        color: null,
      });
    });

    expect(mockToast.success).toHaveBeenCalledWith('Folder created');
    expect(mockOnCreated).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('creates folder with selected color', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({ _id: 'folder-1', name: 'Colored Folder' });

    render(
      <CreateFolderModal
        isOpen={true}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />,
      { wrapper: createWrapper() }
    );

    // Select a color
    const blueButton = screen.getByTitle('Blue');
    await user.click(blueButton);

    // Enter folder name
    const input = screen.getByPlaceholderText('Enter folder name...');
    await user.type(input, 'Colored Folder');

    // Submit
    const submitButton = screen.getByRole('button', { name: /create folder/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        name: 'Colored Folder',
        parentId: null,
        color: '#3B82F6', // Blue color value
      });
    });
  });

  it('creates folder with parentId when provided', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({ _id: 'folder-1', name: 'Subfolder' });

    render(
      <CreateFolderModal
        isOpen={true}
        onClose={mockOnClose}
        parentId="parent-folder-123"
      />,
      { wrapper: createWrapper() }
    );

    // Should show info message about parent folder
    expect(screen.getByText('This folder will be created inside the selected folder.')).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Enter folder name...');
    await user.type(input, 'Subfolder');

    const submitButton = screen.getByRole('button', { name: /create folder/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        name: 'Subfolder',
        parentId: 'parent-folder-123',
        color: null,
      });
    });
  });

  it('shows error toast when creation fails', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValueOnce(new Error('Server error'));

    render(
      <CreateFolderModal
        isOpen={true}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    const input = screen.getByPlaceholderText('Enter folder name...');
    await user.type(input, 'Test Folder');

    const submitButton = screen.getByRole('button', { name: /create folder/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Server error');
    });
  });

  it('shows default error message when error has no message', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValueOnce({});

    render(
      <CreateFolderModal
        isOpen={true}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    const input = screen.getByPlaceholderText('Enter folder name...');
    await user.type(input, 'Test Folder');

    const submitButton = screen.getByRole('button', { name: /create folder/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to create folder');
    });
  });

  it('closes modal when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CreateFolderModal
        isOpen={true}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when backdrop is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CreateFolderModal
        isOpen={true}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    // Click on backdrop (first fixed overlay)
    const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50');
    await user.click(backdrop);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when X button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CreateFolderModal
        isOpen={true}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    // Find and click the X button in the header
    const closeButtons = screen.getAllByRole('button');
    const xButton = closeButtons.find(btn => btn.querySelector('svg.lucide-x'));
    await user.click(xButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows loading state during creation', async () => {
    useCreateFolder.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
    });

    render(
      <CreateFolderModal
        isOpen={true}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    // Set a name to enable the button visually (though it will still be disabled due to isPending)
    const input = screen.getByPlaceholderText('Enter folder name...');
    fireEvent.change(input, { target: { value: 'Test Folder' } });

    expect(screen.getByText('Creating...')).toBeInTheDocument();
    const submitButton = screen.getByRole('button', { name: /creating/i });
    expect(submitButton).toBeDisabled();
  });

  it('trims whitespace from folder name before submission', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({ _id: 'folder-1', name: 'Trimmed Name' });

    render(
      <CreateFolderModal
        isOpen={true}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    const input = screen.getByPlaceholderText('Enter folder name...');
    await user.type(input, '  Trimmed Name  ');

    const submitButton = screen.getByRole('button', { name: /create folder/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        name: 'Trimmed Name',
        parentId: null,
        color: null,
      });
    });
  });

  it('does not submit form when name is only whitespace', async () => {
    const user = userEvent.setup();
    render(
      <CreateFolderModal
        isOpen={true}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    const input = screen.getByPlaceholderText('Enter folder name...');
    await user.type(input, '   ');

    const submitButton = screen.getByRole('button', { name: /create folder/i });
    expect(submitButton).toBeDisabled();
  });

  it('resets form state when closed and reopened', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <CreateFolderModal
        isOpen={true}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    // Type in a name
    const input = screen.getByPlaceholderText('Enter folder name...');
    await user.type(input, 'Test Folder');

    // Close modal via cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Reopen modal
    rerender(
      <QueryClientProvider client={new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })}>
        <CreateFolderModal
          isOpen={true}
          onClose={mockOnClose}
        />
      </QueryClientProvider>
    );

    // Input should be cleared (due to how the close handler resets state)
    const newInput = screen.getByPlaceholderText('Enter folder name...');
    expect(newInput.value).toBe('');
  });
});
