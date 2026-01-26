import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FileMoveModal from './FileMoveModal';

// Mock the hooks
vi.mock('../hooks/useFolders', () => ({
  useFolderTree: vi.fn(),
  useMoveFolder: vi.fn(),
}));

vi.mock('../hooks/useFiles', () => ({
  useMoveFile: vi.fn(),
  useBulkMoveFiles: vi.fn(),
}));

vi.mock('../../../hooks/useToast', () => ({
  default: vi.fn(),
}));

// Import the mocked modules
import { useFolderTree, useMoveFolder } from '../hooks/useFolders';
import { useMoveFile, useBulkMoveFiles } from '../hooks/useFiles';
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

// Mock folder tree data
const mockFolderTree = [
  {
    _id: 'folder-1',
    name: 'Documents',
    color: '#3B82F6',
    children: [
      {
        _id: 'folder-1-1',
        name: 'Work',
        children: [],
      },
      {
        _id: 'folder-1-2',
        name: 'Personal',
        children: [],
      },
    ],
  },
  {
    _id: 'folder-2',
    name: 'Images',
    color: '#10B981',
    children: [],
  },
];

// Mock files
const mockFiles = [
  { _id: 'file-1', name: 'document.pdf' },
];

const mockMultipleFiles = [
  { _id: 'file-1', name: 'document.pdf' },
  { _id: 'file-2', name: 'image.png' },
  { _id: 'file-3', name: 'video.mp4' },
];

// Mock folder for folder move operation
const mockFolder = {
  _id: 'folder-to-move',
  name: 'Folder to Move',
  children: [
    { _id: 'child-folder', name: 'Child', children: [] },
  ],
};

describe('FileMoveModal', () => {
  const mockOnClose = vi.fn();
  const mockOnMoved = vi.fn();
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue(mockToast);

    useFolderTree.mockReturnValue({
      data: mockFolderTree,
      isLoading: false,
    });

    useMoveFile.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    });

    useBulkMoveFiles.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    });

    useMoveFolder.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    });
  });

  it('renders nothing when isOpen is false', () => {
    render(
      <FileMoveModal
        isOpen={false}
        onClose={mockOnClose}
        files={mockFiles}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByText('Move file')).not.toBeInTheDocument();
  });

  it('renders modal for single file', () => {
    render(
      <FileMoveModal
        isOpen={true}
        onClose={mockOnClose}
        files={mockFiles}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Move file')).toBeInTheDocument();
    expect(screen.getByText('Select a destination folder:')).toBeInTheDocument();
    expect(screen.getByText('Root (No folder)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /move here/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders modal for multiple files', () => {
    render(
      <FileMoveModal
        isOpen={true}
        onClose={mockOnClose}
        files={mockMultipleFiles}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Move 3 files')).toBeInTheDocument();
  });

  it('renders modal for folder', () => {
    render(
      <FileMoveModal
        isOpen={true}
        onClose={mockOnClose}
        files={[]}
        folder={mockFolder}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Move folder')).toBeInTheDocument();
  });

  it('displays folder tree', () => {
    render(
      <FileMoveModal
        isOpen={true}
        onClose={mockOnClose}
        files={mockFiles}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Images')).toBeInTheDocument();
  });

  it('shows loading state while fetching folder tree', () => {
    useFolderTree.mockReturnValue({
      data: [],
      isLoading: true,
    });

    render(
      <FileMoveModal
        isOpen={true}
        onClose={mockOnClose}
        files={mockFiles}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Loading folders...')).toBeInTheDocument();
  });

  it('shows empty state when no folders exist', () => {
    useFolderTree.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(
      <FileMoveModal
        isOpen={true}
        onClose={mockOnClose}
        files={mockFiles}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('No folders available')).toBeInTheDocument();
    // Root option should still be available
    expect(screen.getByText('Root (No folder)')).toBeInTheDocument();
  });

  it('selects root folder by default', () => {
    render(
      <FileMoveModal
        isOpen={true}
        onClose={mockOnClose}
        files={mockFiles}
      />,
      { wrapper: createWrapper() }
    );

    const rootOption = screen.getByText('Root (No folder)').closest('div');
    expect(rootOption).toHaveClass('bg-primary/10');
  });

  it('selects a folder when clicked', async () => {
    const user = userEvent.setup();
    render(
      <FileMoveModal
        isOpen={true}
        onClose={mockOnClose}
        files={mockFiles}
      />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByText('Documents'));

    const documentsFolder = screen.getByText('Documents').closest('div');
    expect(documentsFolder).toHaveClass('bg-primary/10');
  });

  it('expands and collapses folder tree', async () => {
    const user = userEvent.setup();
    render(
      <FileMoveModal
        isOpen={true}
        onClose={mockOnClose}
        files={mockFiles}
      />,
      { wrapper: createWrapper() }
    );

    // Initially children should not be visible (folders are collapsed)
    expect(screen.queryByText('Work')).not.toBeInTheDocument();

    // Click expand button on Documents folder
    const documentsRow = screen.getByText('Documents').closest('div[class*="flex items-center"]');
    const expandButton = documentsRow.querySelector('button');
    await user.click(expandButton);

    // Children should now be visible
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  it('moves single file to selected folder', async () => {
    const mockMoveFileMutate = vi.fn().mockResolvedValue({});
    useMoveFile.mockReturnValue({
      mutateAsync: mockMoveFileMutate,
      isPending: false,
    });

    const user = userEvent.setup();
    render(
      <FileMoveModal
        isOpen={true}
        onClose={mockOnClose}
        onMoved={mockOnMoved}
        files={mockFiles}
      />,
      { wrapper: createWrapper() }
    );

    // Select a folder
    await user.click(screen.getByText('Images'));

    // Click move button
    await user.click(screen.getByRole('button', { name: /move here/i }));

    await waitFor(() => {
      expect(mockMoveFileMutate).toHaveBeenCalledWith({
        id: 'file-1',
        folderId: 'folder-2',
      });
    });

    expect(mockToast.success).toHaveBeenCalledWith('File moved');
    expect(mockOnMoved).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('moves single file to root', async () => {
    const mockMoveFileMutate = vi.fn().mockResolvedValue({});
    useMoveFile.mockReturnValue({
      mutateAsync: mockMoveFileMutate,
      isPending: false,
    });

    const user = userEvent.setup();
    render(
      <FileMoveModal
        isOpen={true}
        onClose={mockOnClose}
        onMoved={mockOnMoved}
        files={mockFiles}
      />,
      { wrapper: createWrapper() }
    );

    // Root is selected by default, just click move
    await user.click(screen.getByRole('button', { name: /move here/i }));

    await waitFor(() => {
      expect(mockMoveFileMutate).toHaveBeenCalledWith({
        id: 'file-1',
        folderId: null,
      });
    });

    expect(mockToast.success).toHaveBeenCalledWith('File moved');
  });

  it('bulk moves multiple files', async () => {
    const mockBulkMoveMutate = vi.fn().mockResolvedValue({});
    useBulkMoveFiles.mockReturnValue({
      mutateAsync: mockBulkMoveMutate,
      isPending: false,
    });

    const user = userEvent.setup();
    render(
      <FileMoveModal
        isOpen={true}
        onClose={mockOnClose}
        onMoved={mockOnMoved}
        files={mockMultipleFiles}
      />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByText('Documents'));
    await user.click(screen.getByRole('button', { name: /move here/i }));

    await waitFor(() => {
      expect(mockBulkMoveMutate).toHaveBeenCalledWith({
        fileIds: ['file-1', 'file-2', 'file-3'],
        folderId: 'folder-1',
      });
    });

    expect(mockToast.success).toHaveBeenCalledWith('3 files moved');
  });

  it('moves folder to selected destination', async () => {
    const mockMoveFolderMutate = vi.fn().mockResolvedValue({});
    useMoveFolder.mockReturnValue({
      mutateAsync: mockMoveFolderMutate,
      isPending: false,
    });

    const user = userEvent.setup();
    render(
      <FileMoveModal
        isOpen={true}
        onClose={mockOnClose}
        onMoved={mockOnMoved}
        files={[]}
        folder={mockFolder}
      />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByText('Documents'));
    await user.click(screen.getByRole('button', { name: /move here/i }));

    await waitFor(() => {
      expect(mockMoveFolderMutate).toHaveBeenCalledWith({
        id: 'folder-to-move',
        parentId: 'folder-1',
      });
    });

    expect(mockToast.success).toHaveBeenCalledWith('Folder moved');
  });

  it('shows error toast when move fails', async () => {
    useMoveFile.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new Error('Move failed')),
      isPending: false,
    });

    const user = userEvent.setup();
    render(
      <FileMoveModal
        isOpen={true}
        onClose={mockOnClose}
        files={mockFiles}
      />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByRole('button', { name: /move here/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Move failed');
    });
  });

  it('shows default error message when error has no message', async () => {
    useMoveFile.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue({}),
      isPending: false,
    });

    const user = userEvent.setup();
    render(
      <FileMoveModal
        isOpen={true}
        onClose={mockOnClose}
        files={mockFiles}
      />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByRole('button', { name: /move here/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to move');
    });
  });

  it('closes modal when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(
      <FileMoveModal
        isOpen={true}
        onClose={mockOnClose}
        files={mockFiles}
      />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when backdrop is clicked', async () => {
    const user = userEvent.setup();
    render(
      <FileMoveModal
        isOpen={true}
        onClose={mockOnClose}
        files={mockFiles}
      />,
      { wrapper: createWrapper() }
    );

    const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/50');
    await user.click(backdrop);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes modal when X button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <FileMoveModal
        isOpen={true}
        onClose={mockOnClose}
        files={mockFiles}
      />,
      { wrapper: createWrapper() }
    );

    const closeButtons = screen.getAllByRole('button');
    const xButton = closeButtons.find(btn => btn.querySelector('svg.lucide-x'));
    await user.click(xButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows loading state during move', () => {
    useMoveFile.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    });

    render(
      <FileMoveModal
        isOpen={true}
        onClose={mockOnClose}
        files={mockFiles}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Moving...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /moving/i })).toBeDisabled();
  });

  it('disables folder being moved in the tree', () => {
    // Add the folder being moved to the tree
    const treeWithMovedFolder = [
      ...mockFolderTree,
      mockFolder,
    ];
    useFolderTree.mockReturnValue({
      data: treeWithMovedFolder,
      isLoading: false,
    });

    render(
      <FileMoveModal
        isOpen={true}
        onClose={mockOnClose}
        files={[]}
        folder={mockFolder}
      />,
      { wrapper: createWrapper() }
    );

    const folderToMove = screen.getByText('Folder to Move').closest('div');
    expect(folderToMove).toHaveClass('opacity-50');
    expect(folderToMove).toHaveClass('cursor-not-allowed');
  });

  it('resets selection state when modal is closed and reopened', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <FileMoveModal
        isOpen={true}
        onClose={mockOnClose}
        files={mockFiles}
      />,
      { wrapper: createWrapper() }
    );

    // Select a folder
    await user.click(screen.getByText('Documents'));

    // Close modal
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    // Rerender as closed then open
    rerender(
      <QueryClientProvider client={new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      })}>
        <FileMoveModal
          isOpen={true}
          onClose={mockOnClose}
          files={mockFiles}
        />
      </QueryClientProvider>
    );

    // Root should be selected again (default)
    const rootOption = screen.getByText('Root (No folder)').closest('div');
    expect(rootOption).toHaveClass('bg-primary/10');
  });

  it('allows selecting nested folders', async () => {
    const user = userEvent.setup();
    render(
      <FileMoveModal
        isOpen={true}
        onClose={mockOnClose}
        files={mockFiles}
      />,
      { wrapper: createWrapper() }
    );

    // Expand Documents folder
    const documentsRow = screen.getByText('Documents').closest('div[class*="flex items-center"]');
    const expandButton = documentsRow.querySelector('button');
    await user.click(expandButton);

    // Select Work subfolder
    await user.click(screen.getByText('Work'));

    const workFolder = screen.getByText('Work').closest('div');
    expect(workFolder).toHaveClass('bg-primary/10');
  });
});
