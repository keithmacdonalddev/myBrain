import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import UserLimitsTab from './UserLimitsTab';

// Mock the hooks
vi.mock('../hooks/useAdminUsers', () => ({
  useUserLimits: vi.fn(),
  useUpdateUserLimits: vi.fn(),
}));

import { useUserLimits, useUpdateUserLimits } from '../hooks/useAdminUsers';

describe('UserLimitsTab', () => {
  const mockUser = {
    _id: 'user123',
    email: 'test@example.com',
    role: 'user',
  };

  const mockLimitsData = {
    usage: {
      notes: 50,
      tasks: 30,
      projects: 5,
      events: 10,
      images: 20,
      categories: 8,
      storageBytes: 1073741824, // 1 GB
    },
    roleDefaults: {
      maxNotes: 100,
      maxTasks: 100,
      maxProjects: 20,
      maxEvents: 50,
      maxImages: 100,
      maxCategories: 20,
      maxStorageBytes: 5368709120, // 5 GB
    },
    userOverrides: {},
  };

  const mockUpdateLimits = {
    mutateAsync: vi.fn(),
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useUpdateUserLimits.mockReturnValue(mockUpdateLimits);
  });

  it('renders user role information', () => {
    useUserLimits.mockReturnValue({
      data: mockLimitsData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UserLimitsTab user={mockUser} />);

    expect(screen.getByText('User Role: user')).toBeInTheDocument();
    expect(screen.getByText('Role defaults apply unless overridden')).toBeInTheDocument();
  });

  it('renders all limit rows', () => {
    useUserLimits.mockReturnValue({
      data: mockLimitsData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UserLimitsTab user={mockUser} />);

    // Some labels may appear multiple times (in header and details)
    expect(screen.getAllByText('Notes').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tasks').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Projects').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Events').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Images').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Categories').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Storage').length).toBeGreaterThan(0);
  });

  it('displays usage and limit values', () => {
    useUserLimits.mockReturnValue({
      data: mockLimitsData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UserLimitsTab user={mockUser} />);

    // Check for usage values in the quick stats
    expect(screen.getByText('50')).toBeInTheDocument(); // Notes used
    expect(screen.getByText('30')).toBeInTheDocument(); // Tasks used
  });

  it('displays role defaults', () => {
    useUserLimits.mockReturnValue({
      data: mockLimitsData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UserLimitsTab user={mockUser} />);

    // Role defaults should be shown
    expect(screen.getAllByText(/Role default:/)[0]).toBeInTheDocument();
  });

  it('shows loading state', () => {
    useUserLimits.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<UserLimitsTab user={mockUser} />);

    expect(screen.getByText('Loading limits...')).toBeInTheDocument();
  });

  it('shows error state with retry button', () => {
    const mockRefetch = vi.fn();
    useUserLimits.mockReturnValue({
      data: null,
      isLoading: false,
      error: { message: 'Network error' },
      refetch: mockRefetch,
    });

    render(<UserLimitsTab user={mockUser} />);

    expect(screen.getByText('Failed to load limits')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('calls refetch when Try Again is clicked', async () => {
    const user = userEvent.setup();
    const mockRefetch = vi.fn();
    useUserLimits.mockReturnValue({
      data: null,
      isLoading: false,
      error: { message: 'Network error' },
      refetch: mockRefetch,
    });

    render(<UserLimitsTab user={mockUser} />);

    await user.click(screen.getByRole('button', { name: 'Try Again' }));

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('shows Set Override buttons for each limit', () => {
    useUserLimits.mockReturnValue({
      data: mockLimitsData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UserLimitsTab user={mockUser} />);

    const setOverrideButtons = screen.getAllByRole('button', { name: 'Set Override' });
    expect(setOverrideButtons.length).toBeGreaterThan(0);
  });

  it('shows Edit button when override exists', () => {
    const dataWithOverride = {
      ...mockLimitsData,
      userOverrides: {
        maxNotes: 200,
      },
    };
    useUserLimits.mockReturnValue({
      data: dataWithOverride,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UserLimitsTab user={mockUser} />);

    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('shows Override badge when override is set', () => {
    const dataWithOverride = {
      ...mockLimitsData,
      userOverrides: {
        maxNotes: 200,
      },
    };
    useUserLimits.mockReturnValue({
      data: dataWithOverride,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UserLimitsTab user={mockUser} />);

    expect(screen.getByText('Override')).toBeInTheDocument();
  });

  it('shows Save Changes button when there are pending changes', async () => {
    const user = userEvent.setup();
    useUserLimits.mockReturnValue({
      data: mockLimitsData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UserLimitsTab user={mockUser} />);

    // Click Set Override on first item
    const setOverrideButtons = screen.getAllByRole('button', { name: 'Set Override' });
    await user.click(setOverrideButtons[0]);

    // Type a value
    const input = screen.getByRole('spinbutton');
    await user.type(input, '200');

    // Click save on the row
    const saveButton = screen.getByTitle('Save');
    await user.click(saveButton);

    // Save Changes button should appear
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('calls updateLimits when Save Changes is clicked', async () => {
    const user = userEvent.setup();
    const mockMutate = vi.fn().mockResolvedValue({});
    useUpdateUserLimits.mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    });
    useUserLimits.mockReturnValue({
      data: mockLimitsData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UserLimitsTab user={mockUser} />);

    // Click Set Override on first item
    const setOverrideButtons = screen.getAllByRole('button', { name: 'Set Override' });
    await user.click(setOverrideButtons[0]);

    // Type a value
    const input = screen.getByRole('spinbutton');
    await user.type(input, '200');

    // Click save on the row
    const saveButton = screen.getByTitle('Save');
    await user.click(saveButton);

    // Click Save Changes
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(mockMutate).toHaveBeenCalledWith({
      userId: 'user123',
      limits: expect.any(Object),
    });
  });

  it('shows success message after saving', async () => {
    const user = userEvent.setup();
    const mockMutate = vi.fn().mockResolvedValue({});
    useUpdateUserLimits.mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    });
    useUserLimits.mockReturnValue({
      data: mockLimitsData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UserLimitsTab user={mockUser} />);

    // Click Set Override on first item
    const setOverrideButtons = screen.getAllByRole('button', { name: 'Set Override' });
    await user.click(setOverrideButtons[0]);

    // Type a value
    const input = screen.getByRole('spinbutton');
    await user.type(input, '200');

    // Click save on the row
    await user.click(screen.getByTitle('Save'));

    // Click Save Changes
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText('Limits updated successfully')).toBeInTheDocument();
    });
  });

  it('can cancel editing', async () => {
    const user = userEvent.setup();
    useUserLimits.mockReturnValue({
      data: mockLimitsData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UserLimitsTab user={mockUser} />);

    // Click Set Override on first item
    const setOverrideButtons = screen.getAllByRole('button', { name: 'Set Override' });
    await user.click(setOverrideButtons[0]);

    // Input should appear
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();

    // Click cancel
    await user.click(screen.getByTitle('Cancel'));

    // Input should disappear
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('displays infinity icon for unlimited limits', () => {
    const dataWithUnlimited = {
      ...mockLimitsData,
      roleDefaults: {
        ...mockLimitsData.roleDefaults,
        maxNotes: -1, // Unlimited
      },
    };
    useUserLimits.mockReturnValue({
      data: dataWithUnlimited,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<UserLimitsTab user={mockUser} />);

    // Check for "Role default: Unlimited" text (Unlimited appears within this phrase)
    expect(screen.getByText(/Role default:.*Unlimited/)).toBeInTheDocument();
    // Also verify infinity icon exists
    expect(container.querySelector('.lucide-infinity')).toBeInTheDocument();
  });

  it('displays help text at the bottom', () => {
    useUserLimits.mockReturnValue({
      data: mockLimitsData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<UserLimitsTab user={mockUser} />);

    expect(screen.getByText(/overrides take precedence over role defaults/i)).toBeInTheDocument();
    expect(screen.getByText(/use -1 or click the infinity icon to set unlimited/i)).toBeInTheDocument();
  });

  it('shows loading state in Save Changes button when saving', () => {
    useUpdateUserLimits.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    });
    useUserLimits.mockReturnValue({
      data: mockLimitsData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    // Render with pending changes (need to simulate this)
    render(<UserLimitsTab user={mockUser} />);

    // The Save Changes button would show loading when isPending is true and there are changes
  });
});
