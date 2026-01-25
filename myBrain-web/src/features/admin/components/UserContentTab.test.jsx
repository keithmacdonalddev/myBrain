import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import UserContentTab from './UserContentTab';

// Mock the hook
vi.mock('../hooks/useAdminUsers', () => ({
  useUserContent: vi.fn(),
}));

import { useUserContent } from '../hooks/useAdminUsers';

describe('UserContentTab', () => {
  const mockUser = {
    _id: 'user123',
    email: 'test@example.com',
  };

  const mockContentData = {
    counts: {
      notes: 15,
      tasks: 25,
      projects: 5,
      images: 10,
      total: 55,
    },
    notes: [
      {
        _id: 'note1',
        title: 'Test Note 1',
        contentPreview: 'This is a preview of the note content...',
        status: 'active',
        updatedAt: '2026-01-20T10:00:00Z',
      },
      {
        _id: 'note2',
        title: 'Test Note 2',
        contentPreview: 'Another note preview...',
        status: 'archived',
        createdAt: '2026-01-15T10:00:00Z',
      },
    ],
    total: 15,
  };

  const mockTasksData = {
    counts: mockContentData.counts,
    tasks: [
      {
        _id: 'task1',
        title: 'Test Task 1',
        status: 'completed',
        priority: 'high',
        updatedAt: '2026-01-20T10:00:00Z',
      },
    ],
    total: 25,
  };

  const mockImagesData = {
    counts: mockContentData.counts,
    images: [
      {
        _id: 'img1',
        originalName: 'photo.jpg',
        url: 'https://example.com/photo.jpg',
        thumbnailUrl: 'https://example.com/photo-thumb.jpg',
      },
    ],
    total: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders content type cards with counts', () => {
    useUserContent.mockReturnValue({
      data: mockContentData,
      isLoading: false,
      error: null,
    });

    render(<UserContentTab user={mockUser} />);

    expect(screen.getByText('15')).toBeInTheDocument(); // Notes
    expect(screen.getByText('25')).toBeInTheDocument(); // Tasks
    expect(screen.getByText('5')).toBeInTheDocument(); // Projects
    expect(screen.getByText('10')).toBeInTheDocument(); // Images
  });

  it('renders content type labels', () => {
    useUserContent.mockReturnValue({
      data: mockContentData,
      isLoading: false,
      error: null,
    });

    render(<UserContentTab user={mockUser} />);

    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Images')).toBeInTheDocument();
  });

  it('displays total content count', () => {
    useUserContent.mockReturnValue({
      data: mockContentData,
      isLoading: false,
      error: null,
    });

    render(<UserContentTab user={mockUser} />);

    expect(screen.getByText('Total content: 55 items')).toBeInTheDocument();
  });

  it('shows notes as active tab by default', () => {
    useUserContent.mockReturnValue({
      data: mockContentData,
      isLoading: false,
      error: null,
    });

    render(<UserContentTab user={mockUser} />);

    // Notes tab should be active (first content type)
    const notesButton = screen.getByText('Notes').closest('button');
    expect(notesButton).toHaveClass('border-primary');
  });

  it('renders note items with title and preview', () => {
    useUserContent.mockReturnValue({
      data: mockContentData,
      isLoading: false,
      error: null,
    });

    render(<UserContentTab user={mockUser} />);

    expect(screen.getByText('Test Note 1')).toBeInTheDocument();
    expect(screen.getByText('This is a preview of the note content...')).toBeInTheDocument();
  });

  it('shows status badges for items', () => {
    useUserContent.mockReturnValue({
      data: mockContentData,
      isLoading: false,
      error: null,
    });

    render(<UserContentTab user={mockUser} />);

    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('archived')).toBeInTheDocument();
  });

  it('changes content type when card is clicked', async () => {
    const user = userEvent.setup();
    useUserContent
      .mockReturnValueOnce({
        data: mockContentData,
        isLoading: false,
        error: null,
      })
      .mockReturnValue({
        data: mockTasksData,
        isLoading: false,
        error: null,
      });

    render(<UserContentTab user={mockUser} />);

    // Click Tasks card
    const tasksButton = screen.getByText('Tasks').closest('button');
    await user.click(tasksButton);

    // Tasks should now be active
    expect(tasksButton).toHaveClass('border-primary');
  });

  it('shows loading state', () => {
    useUserContent.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    const { container } = render(<UserContentTab user={mockUser} />);

    // Check for spinning loader
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error state', () => {
    useUserContent.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch'),
    });

    render(<UserContentTab user={mockUser} />);

    expect(screen.getByText('Failed to load user content')).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    useUserContent.mockReturnValue({
      data: {
        counts: { notes: 0, tasks: 0, projects: 0, images: 0, total: 0 },
        notes: [],
        total: 0,
      },
      isLoading: false,
      error: null,
    });

    render(<UserContentTab user={mockUser} />);

    expect(screen.getByText('No notes found')).toBeInTheDocument();
  });

  it('displays total count in content list header', () => {
    useUserContent.mockReturnValue({
      data: mockContentData,
      isLoading: false,
      error: null,
    });

    render(<UserContentTab user={mockUser} />);

    expect(screen.getByText('15 total')).toBeInTheDocument();
  });

  it('shows priority badge for tasks', async () => {
    const user = userEvent.setup();
    useUserContent
      .mockReturnValueOnce({
        data: mockContentData,
        isLoading: false,
        error: null,
      })
      .mockReturnValue({
        data: mockTasksData,
        isLoading: false,
        error: null,
      });

    render(<UserContentTab user={mockUser} />);

    // Click Tasks card
    await user.click(screen.getByText('Tasks').closest('button'));

    await waitFor(() => {
      expect(screen.getByText('high')).toBeInTheDocument();
    });
  });

  it('renders pagination when total exceeds limit', () => {
    useUserContent.mockReturnValue({
      data: { ...mockContentData, total: 50 },
      isLoading: false,
      error: null,
    });

    render(<UserContentTab user={mockUser} />);

    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
  });

  it('disables Previous button on first page', () => {
    useUserContent.mockReturnValue({
      data: { ...mockContentData, total: 50 },
      isLoading: false,
      error: null,
    });

    render(<UserContentTab user={mockUser} />);

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  });

  it('enables Next button when there are more pages', () => {
    useUserContent.mockReturnValue({
      data: { ...mockContentData, total: 50 },
      isLoading: false,
      error: null,
    });

    render(<UserContentTab user={mockUser} />);

    expect(screen.getByRole('button', { name: 'Next' })).not.toBeDisabled();
  });

  it('does not render pagination when total is less than limit', () => {
    useUserContent.mockReturnValue({
      data: mockContentData, // total is 15, limit is 20
      isLoading: false,
      error: null,
    });

    render(<UserContentTab user={mockUser} />);

    expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();
  });

  it('formats dates correctly', () => {
    useUserContent.mockReturnValue({
      data: mockContentData,
      isLoading: false,
      error: null,
    });

    render(<UserContentTab user={mockUser} />);

    // Check that dates are formatted (Jan 20, 2026 or Jan 15, 2026)
    expect(screen.getByText(/Jan 20, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Jan 15, 2026/)).toBeInTheDocument();
  });

  it('resets page when changing content type', async () => {
    const user = userEvent.setup();
    useUserContent.mockReturnValue({
      data: { ...mockContentData, total: 50 },
      isLoading: false,
      error: null,
    });

    render(<UserContentTab user={mockUser} />);

    // Go to page 2
    await user.click(screen.getByRole('button', { name: 'Next' }));

    // Change to Tasks
    await user.click(screen.getByText('Tasks').closest('button'));

    // Should be back on page 1
    expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
  });

  it('displays default counts when data is null', () => {
    useUserContent.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    render(<UserContentTab user={mockUser} />);

    // Should show 0 for all counts
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(4);
  });
});
