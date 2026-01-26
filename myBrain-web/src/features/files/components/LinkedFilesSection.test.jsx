import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LinkedFilesSection from './LinkedFilesSection';

// Mock the hooks
vi.mock('../hooks/useFiles', () => ({
  useFilesForEntity: vi.fn(),
  useLinkFile: vi.fn(),
  useUnlinkFile: vi.fn(),
  useDownloadFile: vi.fn(),
}));

vi.mock('../../../hooks/useToast', () => ({
  default: vi.fn(),
}));

// Import the mocked modules
import { useFilesForEntity, useUnlinkFile, useDownloadFile } from '../hooks/useFiles';
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
const mockFiles = [
  {
    _id: 'file-1',
    originalName: 'document.pdf',
    title: 'Project Document',
    size: 1048576, // 1 MB
    fileCategory: 'document',
    thumbnailUrl: null,
  },
  {
    _id: 'file-2',
    originalName: 'photo.jpg',
    title: '',
    size: 2097152, // 2 MB
    fileCategory: 'image',
    thumbnailUrl: 'https://example.com/thumb/photo.jpg',
  },
  {
    _id: 'file-3',
    originalName: 'notes.txt',
    title: 'Meeting Notes',
    size: 512,
    fileCategory: 'document',
    thumbnailUrl: null,
  },
];

describe('LinkedFilesSection', () => {
  const mockOnFilesChanged = vi.fn();
  const mockRefetch = vi.fn();
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue(mockToast);

    useFilesForEntity.mockReturnValue({
      data: mockFiles,
      isLoading: false,
      refetch: mockRefetch,
    });

    useUnlinkFile.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
    });

    useDownloadFile.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ url: 'https://example.com/download' }),
    });
  });

  it('renders nothing when entityId is not provided', () => {
    render(
      <LinkedFilesSection
        entityType="project"
        entityId={null}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByText('Files')).not.toBeInTheDocument();
  });

  it('renders section header with file count', () => {
    render(
      <LinkedFilesSection
        entityType="project"
        entityId="project-123"
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/Files/)).toBeInTheDocument();
    // File count is shown as "(3)" but may be within the same element
    expect(screen.getByText(/Files.*\(3\)/)).toBeInTheDocument();
  });

  it('renders linked files', () => {
    render(
      <LinkedFilesSection
        entityType="project"
        entityId="project-123"
      />,
      { wrapper: createWrapper() }
    );

    // Should show file titles or original names
    expect(screen.getByText('Project Document')).toBeInTheDocument();
    expect(screen.getByText('photo.jpg')).toBeInTheDocument(); // Falls back to originalName when no title
    expect(screen.getByText('Meeting Notes')).toBeInTheDocument();
  });

  it('displays file sizes', () => {
    render(
      <LinkedFilesSection
        entityType="project"
        entityId="project-123"
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('1 MB')).toBeInTheDocument();
    expect(screen.getByText('2 MB')).toBeInTheDocument();
    expect(screen.getByText('512 B')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    useFilesForEntity.mockReturnValue({
      data: [],
      isLoading: true,
      refetch: mockRefetch,
    });

    render(
      <LinkedFilesSection
        entityType="project"
        entityId="project-123"
      />,
      { wrapper: createWrapper() }
    );

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no files', () => {
    useFilesForEntity.mockReturnValue({
      data: [],
      isLoading: false,
      refetch: mockRefetch,
    });

    render(
      <LinkedFilesSection
        entityType="project"
        entityId="project-123"
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('No files attached')).toBeInTheDocument();
  });

  it('fetches files for the correct entity', () => {
    render(
      <LinkedFilesSection
        entityType="project"
        entityId="project-123"
      />,
      { wrapper: createWrapper() }
    );

    expect(useFilesForEntity).toHaveBeenCalledWith('project', 'project-123');
  });

  it('fetches files for task entity', () => {
    render(
      <LinkedFilesSection
        entityType="task"
        entityId="task-456"
      />,
      { wrapper: createWrapper() }
    );

    expect(useFilesForEntity).toHaveBeenCalledWith('task', 'task-456');
  });

  it('fetches files for note entity', () => {
    render(
      <LinkedFilesSection
        entityType="note"
        entityId="note-789"
      />,
      { wrapper: createWrapper() }
    );

    expect(useFilesForEntity).toHaveBeenCalledWith('note', 'note-789');
  });

  describe('file removal', () => {
    it('removes file when remove button is clicked', async () => {
      const mockUnlinkMutate = vi.fn().mockResolvedValue({});
      useUnlinkFile.mockReturnValue({
        mutateAsync: mockUnlinkMutate,
      });

      const user = userEvent.setup();
      render(
        <LinkedFilesSection
          entityType="project"
          entityId="project-123"
          onFilesChanged={mockOnFilesChanged}
        />,
        { wrapper: createWrapper() }
      );

      // Find the first file's row and hover to show buttons
      const fileItems = document.querySelectorAll('.bg-bg.rounded-lg');
      const firstItem = fileItems[0];

      // Find and click the remove button (X icon)
      const removeButton = firstItem.querySelector('button:last-child');
      await user.click(removeButton);

      await waitFor(() => {
        expect(mockUnlinkMutate).toHaveBeenCalledWith({
          id: 'file-1',
          entityId: 'project-123',
          entityType: 'project',
        });
      });

      expect(mockRefetch).toHaveBeenCalled();
      expect(mockOnFilesChanged).toHaveBeenCalled();
    });

    it('shows error toast when removal fails', async () => {
      useUnlinkFile.mockReturnValue({
        mutateAsync: vi.fn().mockRejectedValue(new Error('Failed')),
      });

      const user = userEvent.setup();
      render(
        <LinkedFilesSection
          entityType="project"
          entityId="project-123"
        />,
        { wrapper: createWrapper() }
      );

      const fileItems = document.querySelectorAll('.bg-bg.rounded-lg');
      const removeButton = fileItems[0].querySelector('button:last-child');
      await user.click(removeButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to remove file');
      });
    });

    it('shows loading state on remove button while removing', async () => {
      useUnlinkFile.mockReturnValue({
        mutateAsync: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
      });

      const user = userEvent.setup();
      render(
        <LinkedFilesSection
          entityType="project"
          entityId="project-123"
        />,
        { wrapper: createWrapper() }
      );

      const fileItems = document.querySelectorAll('.bg-bg.rounded-lg');
      const removeButton = fileItems[0].querySelector('button:last-child');
      await user.click(removeButton);

      // Should show loading spinner on that button
      await waitFor(() => {
        expect(fileItems[0].querySelector('.animate-spin')).toBeInTheDocument();
      });
    });
  });

  describe('file download', () => {
    it('downloads file when download button is clicked', async () => {
      const mockDownloadMutate = vi.fn().mockResolvedValue({ url: 'https://example.com/download/file1' });
      useDownloadFile.mockReturnValue({
        mutateAsync: mockDownloadMutate,
      });

      const mockOpen = vi.spyOn(window, 'open').mockImplementation(() => {});

      const user = userEvent.setup();
      render(
        <LinkedFilesSection
          entityType="project"
          entityId="project-123"
        />,
        { wrapper: createWrapper() }
      );

      const fileItems = document.querySelectorAll('.bg-bg.rounded-lg');
      // Download button is the first button in the actions area
      const downloadButton = fileItems[0].querySelectorAll('button')[0];
      await user.click(downloadButton);

      await waitFor(() => {
        expect(mockDownloadMutate).toHaveBeenCalledWith('file-1');
      });

      expect(mockOpen).toHaveBeenCalledWith('https://example.com/download/file1', '_blank');
      mockOpen.mockRestore();
    });

    it('shows error toast when download fails', async () => {
      useDownloadFile.mockReturnValue({
        mutateAsync: vi.fn().mockRejectedValue(new Error('Download failed')),
      });

      const user = userEvent.setup();
      render(
        <LinkedFilesSection
          entityType="project"
          entityId="project-123"
        />,
        { wrapper: createWrapper() }
      );

      const fileItems = document.querySelectorAll('.bg-bg.rounded-lg');
      const downloadButton = fileItems[0].querySelectorAll('button')[0];
      await user.click(downloadButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to download file');
      });
    });
  });

  describe('file icon display', () => {
    it('shows thumbnail for image files with thumbnailUrl', () => {
      render(
        <LinkedFilesSection
          entityType="project"
          entityId="project-123"
        />,
        { wrapper: createWrapper() }
      );

      const thumbnail = document.querySelector('img[src="https://example.com/thumb/photo.jpg"]');
      expect(thumbnail).toBeInTheDocument();
    });

    it('shows file icon for non-image files', () => {
      render(
        <LinkedFilesSection
          entityType="project"
          entityId="project-123"
        />,
        { wrapper: createWrapper() }
      );

      // Document files should show FileText icon, not images
      const fileIcons = document.querySelectorAll('.lucide-file-text');
      expect(fileIcons.length).toBeGreaterThan(0);
    });
  });

  describe('compact mode', () => {
    it('uses compact styling when compact prop is true', () => {
      render(
        <LinkedFilesSection
          entityType="project"
          entityId="project-123"
          compact={true}
        />,
        { wrapper: createWrapper() }
      );

      // In compact mode, should have mt-3 class instead of mt-4 pt-4 border-t
      const section = document.querySelector('.mt-3');
      expect(section).toBeInTheDocument();
    });

    it('uses regular styling when compact prop is false', () => {
      render(
        <LinkedFilesSection
          entityType="project"
          entityId="project-123"
          compact={false}
        />,
        { wrapper: createWrapper() }
      );

      const section = document.querySelector('.mt-4.pt-4.border-t');
      expect(section).toBeInTheDocument();
    });
  });

  describe('header display', () => {
    it('shows paperclip icon in header', () => {
      render(
        <LinkedFilesSection
          entityType="project"
          entityId="project-123"
        />,
        { wrapper: createWrapper() }
      );

      expect(document.querySelector('.lucide-paperclip')).toBeInTheDocument();
    });

    it('does not show count when no files', () => {
      useFilesForEntity.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });

      render(
        <LinkedFilesSection
          entityType="project"
          entityId="project-123"
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.queryByText('(0)')).not.toBeInTheDocument();
    });
  });

  describe('file title fallback', () => {
    it('uses originalName when title is empty', () => {
      render(
        <LinkedFilesSection
          entityType="project"
          entityId="project-123"
        />,
        { wrapper: createWrapper() }
      );

      // photo.jpg has no title, should show originalName
      expect(screen.getByText('photo.jpg')).toBeInTheDocument();
    });

    it('uses title when available', () => {
      render(
        <LinkedFilesSection
          entityType="project"
          entityId="project-123"
        />,
        { wrapper: createWrapper() }
      );

      // Project Document has a title
      expect(screen.getByText('Project Document')).toBeInTheDocument();
    });
  });

  describe('actions visibility', () => {
    it('action buttons are visible on hover', () => {
      render(
        <LinkedFilesSection
          entityType="project"
          entityId="project-123"
        />,
        { wrapper: createWrapper() }
      );

      // Action buttons container should have opacity-0 and group-hover:opacity-100 classes
      const actionsContainer = document.querySelector('.opacity-0.group-hover\\:opacity-100');
      expect(actionsContainer).toBeInTheDocument();
    });
  });
});
