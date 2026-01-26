import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FileDetailsPanel from './FileDetailsPanel';

// Mock the hooks
vi.mock('../hooks/useFiles', () => ({
  useFile: vi.fn(),
  useUpdateFile: vi.fn(),
  useDeleteFile: vi.fn(),
  useTrashFile: vi.fn(),
  useRestoreFile: vi.fn(),
  useToggleFileFavorite: vi.fn(),
  useDownloadFile: vi.fn(),
}));

vi.mock('../../../hooks/useToast', () => ({
  default: vi.fn(),
}));

vi.mock('../../../components/shared/TagsSection', () => ({
  default: ({ tags, onChange }) => (
    <div data-testid="tags-section">
      <span>Tags: {tags.join(', ')}</span>
      <button onClick={() => onChange([...tags, 'newtag'])}>Add Tag</button>
    </div>
  ),
}));

vi.mock('../../../components/ui/Tooltip', () => ({
  default: ({ children, content }) => (
    <div title={content}>{children}</div>
  ),
}));

vi.mock('../../../components/ui/ConfirmDialog', () => ({
  default: ({ isOpen, onClose, onConfirm, title }) => (
    isOpen ? (
      <div data-testid="confirm-dialog">
        <span>{title}</span>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
  ),
}));

// Import the mocked modules
import {
  useFile,
  useUpdateFile,
  useDeleteFile,
  useTrashFile,
  useRestoreFile,
  useToggleFileFavorite,
  useDownloadFile,
} from '../hooks/useFiles';
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

// Mock file data
const mockFile = {
  _id: 'file-123',
  originalName: 'test-document.pdf',
  title: 'Test Document',
  description: 'A test file description',
  tags: ['work', 'important'],
  size: 1048576, // 1 MB
  mimeType: 'application/pdf',
  extension: '.pdf',
  fileCategory: 'document',
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-15T14:30:00Z',
  favorite: false,
  isTrashed: false,
};

describe('FileDetailsPanel', () => {
  const mockOnClose = vi.fn();
  const mockOnUpdated = vi.fn();
  const mockOnDeleted = vi.fn();
  const mockRefetch = vi.fn();
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    useToast.mockReturnValue(mockToast);

    useFile.mockReturnValue({
      data: mockFile,
      isLoading: false,
      refetch: mockRefetch,
    });

    useUpdateFile.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
    });

    useDeleteFile.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
    });

    useTrashFile.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
    });

    useRestoreFile.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
    });

    useToggleFileFavorite.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
    });

    useDownloadFile.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ url: 'https://example.com/download' }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders file details correctly', () => {
    render(
      <FileDetailsPanel
        file={mockFile}
        onClose={mockOnClose}
        onUpdated={mockOnUpdated}
        onDeleted={mockOnDeleted}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Document')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A test file description')).toBeInTheDocument();
    expect(screen.getByText('File Details')).toBeInTheDocument();
  });

  it('shows loading state when fetching file', () => {
    useFile.mockReturnValue({
      data: null,
      isLoading: true,
      refetch: mockRefetch,
    });

    render(
      <FileDetailsPanel
        file={mockFile}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    // Should show a loader
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows "File not found" when file is null', () => {
    useFile.mockReturnValue({
      data: null,
      isLoading: false,
      refetch: mockRefetch,
    });

    render(
      <FileDetailsPanel
        file={null}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('File not found')).toBeInTheDocument();
  });

  it('closes panel when backdrop is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileDetailsPanel
        file={mockFile}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    // Click on backdrop
    const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
    await user.click(backdrop);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes panel when Escape key is pressed', () => {
    render(
      <FileDetailsPanel
        file={mockFile}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles download action', async () => {
    const mockDownloadMutate = vi.fn().mockResolvedValue({ url: 'https://example.com/download' });
    useDownloadFile.mockReturnValue({
      mutateAsync: mockDownloadMutate,
    });

    const mockOpen = vi.spyOn(window, 'open').mockImplementation(() => {});

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileDetailsPanel
        file={mockFile}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    // Find and click download button
    const downloadButton = screen.getByTitle('Download').querySelector('button');
    await user.click(downloadButton);

    await waitFor(() => {
      expect(mockDownloadMutate).toHaveBeenCalledWith('file-123');
    });

    expect(mockOpen).toHaveBeenCalledWith('https://example.com/download', '_blank');
    mockOpen.mockRestore();
  });

  it('shows error toast when download fails', async () => {
    useDownloadFile.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new Error('Download failed')),
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileDetailsPanel
        file={mockFile}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    const downloadButton = screen.getByTitle('Download').querySelector('button');
    await user.click(downloadButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to get download URL');
    });
  });

  it('toggles favorite status', async () => {
    const mockToggleMutate = vi.fn().mockResolvedValue({});
    useToggleFileFavorite.mockReturnValue({
      mutateAsync: mockToggleMutate,
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileDetailsPanel
        file={mockFile}
        onClose={mockOnClose}
        onUpdated={mockOnUpdated}
      />,
      { wrapper: createWrapper() }
    );

    const favoriteButton = screen.getByTitle('Add to Favorites').querySelector('button');
    await user.click(favoriteButton);

    await waitFor(() => {
      expect(mockToggleMutate).toHaveBeenCalledWith('file-123');
    });

    expect(mockRefetch).toHaveBeenCalled();
    expect(mockOnUpdated).toHaveBeenCalled();
  });

  it('shows error toast when toggle favorite fails', async () => {
    useToggleFileFavorite.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new Error('Failed')),
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileDetailsPanel
        file={mockFile}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    const favoriteButton = screen.getByTitle('Add to Favorites').querySelector('button');
    await user.click(favoriteButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to update favorite status');
    });
  });

  it('trashes file when trash button is clicked', async () => {
    const mockTrashMutate = vi.fn().mockResolvedValue({});
    useTrashFile.mockReturnValue({
      mutateAsync: mockTrashMutate,
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileDetailsPanel
        file={mockFile}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />,
      { wrapper: createWrapper() }
    );

    const trashButton = screen.getByTitle('Move to Trash').querySelector('button');
    await user.click(trashButton);

    await waitFor(() => {
      expect(mockTrashMutate).toHaveBeenCalledWith('file-123');
    });

    expect(mockToast.success).toHaveBeenCalledWith('File moved to trash');
    expect(mockOnDeleted).toHaveBeenCalled();
  });

  it('shows error toast when trash fails', async () => {
    useTrashFile.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new Error('Failed')),
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileDetailsPanel
        file={mockFile}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    const trashButton = screen.getByTitle('Move to Trash').querySelector('button');
    await user.click(trashButton);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to move file to trash');
    });
  });

  it('shows restore and delete buttons for trashed files', () => {
    const trashedFile = { ...mockFile, isTrashed: true };
    useFile.mockReturnValue({
      data: trashedFile,
      isLoading: false,
      refetch: mockRefetch,
    });

    render(
      <FileDetailsPanel
        file={trashedFile}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByTitle('Restore')).toBeInTheDocument();
    expect(screen.getByTitle('Delete Permanently')).toBeInTheDocument();
    expect(screen.queryByTitle('Move to Trash')).not.toBeInTheDocument();
  });

  it('restores trashed file', async () => {
    const trashedFile = { ...mockFile, isTrashed: true };
    useFile.mockReturnValue({
      data: trashedFile,
      isLoading: false,
      refetch: mockRefetch,
    });

    const mockRestoreMutate = vi.fn().mockResolvedValue({});
    useRestoreFile.mockReturnValue({
      mutateAsync: mockRestoreMutate,
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileDetailsPanel
        file={trashedFile}
        onClose={mockOnClose}
        onUpdated={mockOnUpdated}
      />,
      { wrapper: createWrapper() }
    );

    const restoreButton = screen.getByTitle('Restore').querySelector('button');
    await user.click(restoreButton);

    await waitFor(() => {
      expect(mockRestoreMutate).toHaveBeenCalledWith('file-123');
    });

    expect(mockToast.success).toHaveBeenCalledWith('File restored');
    expect(mockRefetch).toHaveBeenCalled();
    expect(mockOnUpdated).toHaveBeenCalled();
  });

  it('shows delete confirmation dialog for trashed file', async () => {
    const trashedFile = { ...mockFile, isTrashed: true };
    useFile.mockReturnValue({
      data: trashedFile,
      isLoading: false,
      refetch: mockRefetch,
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileDetailsPanel
        file={trashedFile}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    const deleteButton = screen.getByTitle('Delete Permanently').querySelector('button');
    await user.click(deleteButton);

    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete File Permanently')).toBeInTheDocument();
  });

  it('permanently deletes file after confirmation', async () => {
    const trashedFile = { ...mockFile, isTrashed: true };
    useFile.mockReturnValue({
      data: trashedFile,
      isLoading: false,
      refetch: mockRefetch,
    });

    const mockDeleteMutate = vi.fn().mockResolvedValue({});
    useDeleteFile.mockReturnValue({
      mutateAsync: mockDeleteMutate,
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileDetailsPanel
        file={trashedFile}
        onClose={mockOnClose}
        onDeleted={mockOnDeleted}
      />,
      { wrapper: createWrapper() }
    );

    // Open confirmation dialog
    const deleteButton = screen.getByTitle('Delete Permanently').querySelector('button');
    await user.click(deleteButton);

    // Confirm deletion
    const confirmButton = screen.getByText('Confirm');
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockDeleteMutate).toHaveBeenCalledWith('file-123');
    });

    expect(mockToast.success).toHaveBeenCalledWith('File permanently deleted');
    expect(mockOnDeleted).toHaveBeenCalled();
  });

  it('displays file metadata correctly', () => {
    render(
      <FileDetailsPanel
        file={mockFile}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    // Should show file type
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();

    // Should show file size
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByText('1 MB')).toBeInTheDocument();

    // Should show category
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Document')).toBeInTheDocument();
  });

  it('shows dimensions for image files', () => {
    const imageFile = {
      ...mockFile,
      mimeType: 'image/jpeg',
      extension: '.jpg',
      fileCategory: 'image',
      width: 1920,
      height: 1080,
    };
    useFile.mockReturnValue({
      data: imageFile,
      isLoading: false,
      refetch: mockRefetch,
    });

    render(
      <FileDetailsPanel
        file={imageFile}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Dimensions')).toBeInTheDocument();
    expect(screen.getByText('1920 × 1080')).toBeInTheDocument();
  });

  it('shows version info for files with version > 1', () => {
    const versionedFile = { ...mockFile, version: 3 };
    useFile.mockReturnValue({
      data: versionedFile,
      isLoading: false,
      refetch: mockRefetch,
    });

    render(
      <FileDetailsPanel
        file={versionedFile}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Version 3')).toBeInTheDocument();
    expect(screen.getByText('This file has been updated 2 times.')).toBeInTheDocument();
  });

  it('shows share info for shared files', () => {
    const sharedFile = {
      ...mockFile,
      shareSettings: {
        publicUrl: 'https://example.com/share/abc123',
        publicUrlExpiry: '2024-02-01T00:00:00Z',
      },
    };
    useFile.mockReturnValue({
      data: sharedFile,
      isLoading: false,
      refetch: mockRefetch,
    });

    render(
      <FileDetailsPanel
        file={sharedFile}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Shared')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/share/abc123')).toBeInTheDocument();
  });

  it('shows linked entities section', () => {
    const linkedFile = {
      ...mockFile,
      linkedProjectIds: ['proj1', 'proj2'],
      linkedTaskIds: ['task1'],
      linkedNoteIds: [],
    };
    useFile.mockReturnValue({
      data: linkedFile,
      isLoading: false,
      refetch: mockRefetch,
    });

    render(
      <FileDetailsPanel
        file={linkedFile}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Linked To')).toBeInTheDocument();
    expect(screen.getByText('2 projects')).toBeInTheDocument();
    expect(screen.getByText('1 task')).toBeInTheDocument();
  });

  it('shows download count when greater than 0', () => {
    const downloadedFile = { ...mockFile, downloadCount: 42 };
    useFile.mockReturnValue({
      data: downloadedFile,
      isLoading: false,
      refetch: mockRefetch,
    });

    render(
      <FileDetailsPanel
        file={downloadedFile}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Downloads')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('displays favorite file with filled star icon', () => {
    const favoriteFile = { ...mockFile, favorite: true };
    useFile.mockReturnValue({
      data: favoriteFile,
      isLoading: false,
      refetch: mockRefetch,
    });

    render(
      <FileDetailsPanel
        file={favoriteFile}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByTitle('Remove from Favorites')).toBeInTheDocument();
  });

  it('triggers auto-save on title change', async () => {
    const mockUpdateMutate = vi.fn().mockResolvedValue({});
    useUpdateFile.mockReturnValue({
      mutateAsync: mockUpdateMutate,
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileDetailsPanel
        file={mockFile}
        onClose={mockOnClose}
        onUpdated={mockOnUpdated}
      />,
      { wrapper: createWrapper() }
    );

    const titleInput = screen.getByDisplayValue('Test Document');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Title');

    // Advance timers to trigger auto-save (1500ms debounce)
    vi.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: 'file-123',
        data: expect.objectContaining({
          title: 'Updated Title',
        }),
      });
    });
  });

  it('saves immediately on Ctrl+S', async () => {
    const mockUpdateMutate = vi.fn().mockResolvedValue({});
    useUpdateFile.mockReturnValue({
      mutateAsync: mockUpdateMutate,
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileDetailsPanel
        file={mockFile}
        onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    // Make a change
    const titleInput = screen.getByDisplayValue('Test Document');
    await user.clear(titleInput);
    await user.type(titleInput, 'Changed Title');

    // Press Ctrl+S
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });

    await waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalled();
    });
  });

  it('copies share link to clipboard', async () => {
    const sharedFile = {
      ...mockFile,
      shareSettings: {
        publicUrl: 'https://example.com/share/abc123',
      },
    };
    useFile.mockReturnValue({
      data: sharedFile,
      isLoading: false,
      refetch: mockRefetch,
    });

    // Mock clipboard using Object.defineProperty for better compatibility
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

      render(
        <FileDetailsPanel
          file={sharedFile}
          onClose={mockOnClose}
      />,
      { wrapper: createWrapper() }
    );

    // Find and click copy button in share section
      const copyButton = screen.getByText('https://example.com/share/abc123')
        .closest('div')
        .querySelector('button');
      fireEvent.click(copyButton);

    expect(mockWriteText).toHaveBeenCalledWith('https://example.com/share/abc123');
    expect(mockToast.success).toHaveBeenCalledWith('Link copied');
  });
});
