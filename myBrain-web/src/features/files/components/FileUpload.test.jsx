import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FileUpload from './FileUpload';

// Mock the hooks
vi.mock('../hooks/useFiles', () => ({
  useUploadFile: vi.fn(),
}));

vi.mock('../../../hooks/useToast', () => ({
  default: vi.fn(),
}));

// Import the mocked modules
import { useUploadFile } from '../hooks/useFiles';
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

// Helper to create mock files
const createMockFile = (name, size = 1024, type = 'application/pdf') => {
  const file = new File(['content'.repeat(size / 7)], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('FileUpload', () => {
  const mockOnUploadComplete = vi.fn();
  const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
  };
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    useToast.mockReturnValue(mockToast);
    useUploadFile.mockReturnValue({
      mutateAsync: mockMutateAsync,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders drop zone with upload instructions', () => {
    render(
      <FileUpload onUploadComplete={mockOnUploadComplete} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/click to upload/i)).toBeInTheDocument();
    expect(screen.getByText(/drag and drop/i)).toBeInTheDocument();
    expect(screen.getByText(/max 100MB per file/i)).toBeInTheDocument();
  });

  it('has a hidden file input for click-to-upload', () => {
    render(
      <FileUpload onUploadComplete={mockOnUploadComplete} />,
      { wrapper: createWrapper() }
    );

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('multiple');
  });

  it('uploads file when selected via file input', async () => {
    mockMutateAsync.mockResolvedValue({});

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileUpload onUploadComplete={mockOnUploadComplete} />,
      { wrapper: createWrapper() }
    );

    const file = createMockFile('test.pdf', 1024);
    const fileInput = document.querySelector('input[type="file"]');

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        file,
        options: expect.objectContaining({
          folderId: undefined,
        }),
      });
    });
  });

  it('uploads file with folderId when provided', async () => {
    mockMutateAsync.mockResolvedValue({});

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileUpload
        folderId="folder-123"
        onUploadComplete={mockOnUploadComplete}
      />,
      { wrapper: createWrapper() }
    );

    const file = createMockFile('test.pdf', 1024);
    const fileInput = document.querySelector('input[type="file"]');

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        file,
        options: expect.objectContaining({
          folderId: 'folder-123',
        }),
      });
    });
  });

  it('uploads multiple files', async () => {
    mockMutateAsync.mockResolvedValue({});

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileUpload onUploadComplete={mockOnUploadComplete} />,
      { wrapper: createWrapper() }
    );

    const files = [
      createMockFile('file1.pdf', 1024),
      createMockFile('file2.pdf', 2048),
      createMockFile('file3.pdf', 512),
    ];
    const fileInput = document.querySelector('input[type="file"]');

    await user.upload(fileInput, files);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(3);
    });
  });

  it('shows upload progress for each file', async () => {
    mockMutateAsync.mockImplementation(({ options }) => {
      // Simulate progress
      if (options.onProgress) {
        options.onProgress({ loaded: 50, total: 100 });
      }
      return new Promise(resolve => setTimeout(resolve, 100));
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileUpload onUploadComplete={mockOnUploadComplete} />,
      { wrapper: createWrapper() }
    );

    const file = createMockFile('test.pdf', 1024);
    const fileInput = document.querySelector('input[type="file"]');

    await user.upload(fileInput, file);

    // Should show the file in the upload list
    expect(screen.getByText('test.pdf')).toBeInTheDocument();

    // Should show progress (50%)
    await waitFor(() => {
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  it('shows success indicator when upload completes', async () => {
    mockMutateAsync.mockResolvedValue({});

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileUpload onUploadComplete={mockOnUploadComplete} />,
      { wrapper: createWrapper() }
    );

    const file = createMockFile('test.pdf', 1024);
    const fileInput = document.querySelector('input[type="file"]');

    await user.upload(fileInput, file);

    await waitFor(() => {
      // Should show check circle icon (complete status)
      expect(document.querySelector('.lucide-check-circle')).toBeInTheDocument();
    });
  });

  it('shows success toast and calls onUploadComplete when all uploads complete', async () => {
    mockMutateAsync.mockResolvedValue({});

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileUpload onUploadComplete={mockOnUploadComplete} />,
      { wrapper: createWrapper() }
    );

    const file = createMockFile('test.pdf', 1024);
    const fileInput = document.querySelector('input[type="file"]');

    await user.upload(fileInput, file);

    // Advance timers to trigger completion check
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Uploaded 1 file');
      expect(mockOnUploadComplete).toHaveBeenCalled();
    });
  });

  it('shows pluralized success message for multiple files', async () => {
    mockMutateAsync.mockResolvedValue({});

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileUpload onUploadComplete={mockOnUploadComplete} />,
      { wrapper: createWrapper() }
    );

    const files = [
      createMockFile('file1.pdf', 1024),
      createMockFile('file2.pdf', 2048),
    ];
    const fileInput = document.querySelector('input[type="file"]');

    await user.upload(fileInput, files);

    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Uploaded 2 files');
    });
  });

  it('shows error state when upload fails', async () => {
    mockMutateAsync.mockRejectedValue(new Error('Upload failed'));

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileUpload onUploadComplete={mockOnUploadComplete} />,
      { wrapper: createWrapper() }
    );

    const file = createMockFile('test.pdf', 1024);
    const fileInput = document.querySelector('input[type="file"]');

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });

    expect(mockToast.error).toHaveBeenCalledWith('Failed to upload test.pdf: Upload failed');
  });

  it('allows removing failed upload from list', async () => {
    mockMutateAsync.mockRejectedValue(new Error('Upload failed'));

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileUpload onUploadComplete={mockOnUploadComplete} />,
      { wrapper: createWrapper() }
    );

    const file = createMockFile('test.pdf', 1024);
    const fileInput = document.querySelector('input[type="file"]');

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    // Find and click the remove button (X icon)
    const removeButton = screen.getByRole('button', { hidden: true });
    await user.click(removeButton);

    // File should be removed from list
    expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
  });

  it('displays file size in upload list', async () => {
    mockMutateAsync.mockImplementation(() => new Promise(() => {})); // Never resolve

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileUpload onUploadComplete={mockOnUploadComplete} />,
      { wrapper: createWrapper() }
    );

    const file = createMockFile('test.pdf', 1048576); // 1 MB
    const fileInput = document.querySelector('input[type="file"]');

    await user.upload(fileInput, file);

    expect(screen.getByText('1 MB')).toBeInTheDocument();
  });

  it('handles drag over state', () => {
    render(
      <FileUpload onUploadComplete={mockOnUploadComplete} />,
      { wrapper: createWrapper() }
    );

    const dropZone = document.querySelector('.border-dashed');

    fireEvent.dragOver(dropZone, {
      dataTransfer: { files: [] },
    });

    expect(dropZone).toHaveClass('border-primary');
    expect(dropZone).toHaveClass('bg-primary/5');
  });

  it('handles drag leave state', () => {
    render(
      <FileUpload onUploadComplete={mockOnUploadComplete} />,
      { wrapper: createWrapper() }
    );

    const dropZone = document.querySelector('.border-dashed');

    // First drag over
    fireEvent.dragOver(dropZone, {
      dataTransfer: { files: [] },
    });

    // Then leave
    fireEvent.dragLeave(dropZone);

    expect(dropZone).not.toHaveClass('border-primary');
    expect(dropZone).not.toHaveClass('bg-primary/5');
  });

  it('handles file drop', async () => {
    mockMutateAsync.mockResolvedValue({});

    render(
      <FileUpload onUploadComplete={mockOnUploadComplete} />,
      { wrapper: createWrapper() }
    );

    const dropZone = document.querySelector('.border-dashed');
    const file = createMockFile('dropped.pdf', 1024);

    const dataTransfer = {
      files: [file],
    };

    fireEvent.drop(dropZone, { dataTransfer });

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        file,
        options: expect.objectContaining({
          folderId: undefined,
        }),
      });
    });
  });

  it('resets dragging state after drop', () => {
    render(
      <FileUpload onUploadComplete={mockOnUploadComplete} />,
      { wrapper: createWrapper() }
    );

    const dropZone = document.querySelector('.border-dashed');

    // Drag over
    fireEvent.dragOver(dropZone, {
      dataTransfer: { files: [] },
    });

    expect(dropZone).toHaveClass('border-primary');

    // Drop
    fireEvent.drop(dropZone, {
      dataTransfer: { files: [] },
    });

    expect(dropZone).not.toHaveClass('border-primary');
  });

  it('clears file input after selection', async () => {
    mockMutateAsync.mockResolvedValue({});

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileUpload onUploadComplete={mockOnUploadComplete} />,
      { wrapper: createWrapper() }
    );

    const file = createMockFile('test.pdf', 1024);
    const fileInput = document.querySelector('input[type="file"]');

    await user.upload(fileInput, file);

    // Input value should be cleared
    expect(fileInput.value).toBe('');
  });

  it('shows upload list only when there are uploads', () => {
    render(
      <FileUpload onUploadComplete={mockOnUploadComplete} />,
      { wrapper: createWrapper() }
    );

    // No upload list initially
    expect(document.querySelectorAll('.bg-panel.border').length).toBe(0);
  });

  it('shows pending state before upload starts', async () => {
    // Make upload hang
    mockMutateAsync.mockImplementation(() => new Promise(() => {}));

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileUpload onUploadComplete={mockOnUploadComplete} />,
      { wrapper: createWrapper() }
    );

    const file = createMockFile('test.pdf', 1024);
    const fileInput = document.querySelector('input[type="file"]');

    // Don't await, we want to catch the pending state
    user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });
  });

  it('clears upload list after all uploads complete', async () => {
    mockMutateAsync.mockResolvedValue({});

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileUpload onUploadComplete={mockOnUploadComplete} />,
      { wrapper: createWrapper() }
    );

    const file = createMockFile('test.pdf', 1024);
    const fileInput = document.querySelector('input[type="file"]');

    await user.upload(fileInput, file);

    // Advance timer to trigger cleanup
    vi.advanceTimersByTime(600);

    await waitFor(() => {
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    });
  });

  it('handles uploads with mixed success and failure', async () => {
    let callCount = 0;
    mockMutateAsync.mockImplementation(() => {
      callCount++;
      if (callCount === 2) {
        return Promise.reject(new Error('Failed'));
      }
      return Promise.resolve({});
    });

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <FileUpload onUploadComplete={mockOnUploadComplete} />,
      { wrapper: createWrapper() }
    );

    const files = [
      createMockFile('success1.pdf', 1024),
      createMockFile('fail.pdf', 1024),
      createMockFile('success2.pdf', 1024),
    ];
    const fileInput = document.querySelector('input[type="file"]');

    await user.upload(fileInput, files);

    await waitFor(() => {
      // Should show error toast for failed file
      expect(mockToast.error).toHaveBeenCalledWith('Failed to upload fail.pdf: Failed');
    });

    vi.advanceTimersByTime(600);

    await waitFor(() => {
      // Should still show success for completed files
      expect(mockToast.success).toHaveBeenCalledWith('Uploaded 2 files');
    });
  });
});
