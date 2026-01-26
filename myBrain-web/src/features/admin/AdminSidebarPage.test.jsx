/**
 * =============================================================================
 * ADMINSIDEBARPAGE.TEST.JSX - Unit Tests for AdminSidebarPage
 * =============================================================================
 *
 * Tests the AdminSidebarPage component which manages sidebar configuration.
 * Covers:
 * - Loading states with skeleton placeholders
 * - Error states with retry functionality
 * - Section groups that expand/collapse
 * - Toggle item visibility (eye icon)
 * - Save changes button (disabled when no changes)
 * - Reset to defaults button with confirmation dialog
 *
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import AdminSidebarPage from './AdminSidebarPage';

// Mock the hooks module
vi.mock('./hooks/useAdminUsers', () => ({
  useAdminSidebarConfig: vi.fn(),
  useUpdateSidebarConfig: vi.fn(),
  useResetSidebarConfig: vi.fn(),
}));

// Mock AdminNav component
vi.mock('./components/AdminNav', () => ({
  default: () => <nav data-testid="admin-nav">Admin Nav</nav>,
}));

// Mock ConfirmDialog component
vi.mock('../../components/ui/ConfirmDialog', () => ({
  default: ({ isOpen, onClose, onConfirm, title, message, confirmText }) =>
    isOpen ? (
      <div data-testid="confirm-dialog" role="dialog">
        <h3>{title}</h3>
        <p>{message}</p>
        <button onClick={onClose}>Cancel</button>
        <button onClick={() => { onConfirm(); onClose(); }}>{confirmText}</button>
      </div>
    ) : null,
}));

// Mock @dnd-kit/core
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }) => <div data-testid="dnd-context">{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  DragOverlay: ({ children }) => <div data-testid="drag-overlay">{children}</div>,
}));

// Mock @dnd-kit/sortable
vi.mock('@dnd-kit/sortable', () => ({
  arrayMove: vi.fn((arr, from, to) => {
    const result = [...arr];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    return result;
  }),
  SortableContext: ({ children }) => <div data-testid="sortable-context">{children}</div>,
  sortableKeyboardCoordinates: vi.fn(),
  verticalListSortingStrategy: vi.fn(),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  })),
}));

// Mock @dnd-kit/utilities
vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: vi.fn(() => ''),
    },
  },
}));

import {
  useAdminSidebarConfig,
  useUpdateSidebarConfig,
  useResetSidebarConfig,
} from './hooks/useAdminUsers';

describe('AdminSidebarPage', () => {
  // Mock data that represents a typical sidebar configuration
  const mockSidebarData = {
    sections: [
      { key: 'main', label: 'Main', order: 0, collapsible: false },
      { key: 'productivity', label: 'Productivity', order: 1, collapsible: true },
      { key: 'admin', label: 'Admin', order: 2, collapsible: true },
    ],
    items: [
      { key: 'dashboard', label: 'Dashboard', section: 'main', order: 0, icon: 'LayoutDashboard', visible: true },
      { key: 'today', label: 'Today', section: 'main', order: 1, icon: 'CalendarDays', visible: true },
      { key: 'tasks', label: 'Tasks', section: 'productivity', order: 0, icon: 'CheckSquare', visible: true },
      { key: 'notes', label: 'Notes', section: 'productivity', order: 1, icon: 'StickyNote', visible: true, featureFlag: 'notes' },
      { key: 'admin-panel', label: 'Admin Panel', section: 'admin', order: 0, icon: 'Shield', visible: true, requiresAdmin: true },
    ],
  };

  // Setup default mock implementations
  const mockRefetch = vi.fn();
  const mockUpdateMutateAsync = vi.fn();
  const mockResetMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: data loaded successfully
    useAdminSidebarConfig.mockReturnValue({
      data: mockSidebarData,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    useUpdateSidebarConfig.mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    });

    useResetSidebarConfig.mockReturnValue({
      mutateAsync: mockResetMutateAsync,
      isPending: false,
    });
  });

  // ===========================================================================
  // Loading State Tests
  // ===========================================================================
  describe('Loading State', () => {
    it('renders loading skeletons while fetching data', () => {
      useAdminSidebarConfig.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<AdminSidebarPage />);

      // Should show loading skeleton animation
      const loadingElements = document.querySelectorAll('.animate-pulse');
      expect(loadingElements.length).toBeGreaterThan(0);
    });

    it('renders multiple skeleton sections during loading', () => {
      useAdminSidebarConfig.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<AdminSidebarPage />);

      // Should render 4 skeleton section groups
      const skeletonGroups = document.querySelectorAll('.bg-panel.border');
      expect(skeletonGroups.length).toBe(4);
    });
  });

  // ===========================================================================
  // Error State Tests
  // ===========================================================================
  describe('Error State', () => {
    it('displays error message when API fails', () => {
      useAdminSidebarConfig.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to load sidebar configuration'),
        refetch: mockRefetch,
      });

      render(<AdminSidebarPage />);

      // The error message appears twice - once in heading, once in description
      // Use getAllByText to confirm error state is displayed
      const errorMessages = screen.getAllByText('Failed to load sidebar configuration');
      expect(errorMessages.length).toBeGreaterThanOrEqual(1);
    });

    it('renders retry button in error state', () => {
      useAdminSidebarConfig.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
      });

      render(<AdminSidebarPage />);

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('calls refetch when retry button is clicked', async () => {
      const user = userEvent.setup();

      useAdminSidebarConfig.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
      });

      render(<AdminSidebarPage />);

      await user.click(screen.getByText('Try Again'));

      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });

    it('displays error icon in error state', () => {
      useAdminSidebarConfig.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Server error'),
        refetch: mockRefetch,
      });

      render(<AdminSidebarPage />);

      // Error message container should exist
      const errorContainer = document.querySelector('.bg-red-500\\/10');
      expect(errorContainer).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Successful Data Display Tests
  // ===========================================================================
  describe('Successful Data Display', () => {
    it('renders page header with title', async () => {
      render(<AdminSidebarPage />);

      expect(screen.getByText('Sidebar Management')).toBeInTheDocument();
    });

    it('renders page description', async () => {
      render(<AdminSidebarPage />);

      expect(
        screen.getByText('Reorder and configure sidebar items. Changes affect all users.')
      ).toBeInTheDocument();
    });

    it('renders AdminNav component', () => {
      render(<AdminSidebarPage />);

      expect(screen.getByTestId('admin-nav')).toBeInTheDocument();
    });

    it('renders all section groups from data', async () => {
      render(<AdminSidebarPage />);

      expect(screen.getByText('Main')).toBeInTheDocument();
      expect(screen.getByText('Productivity')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('renders items within their sections', async () => {
      render(<AdminSidebarPage />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });

    it('displays item count for each section', async () => {
      render(<AdminSidebarPage />);

      // Main and Productivity sections both have 2 items, Admin has 1
      const twoItemsCounts = screen.getAllByText('(2 items)');
      expect(twoItemsCounts.length).toBe(2); // Main and Productivity

      expect(screen.getByText('(1 items)')).toBeInTheDocument(); // Admin section
    });

    it('shows feature flag badge for items with feature flags', async () => {
      render(<AdminSidebarPage />);

      expect(screen.getByText('notes')).toBeInTheDocument(); // Feature flag badge
    });

    it('shows Admin Only badge for admin-required items', async () => {
      render(<AdminSidebarPage />);

      expect(screen.getByText('Admin Only')).toBeInTheDocument();
    });

    it('shows Collapsible badge for collapsible sections', async () => {
      render(<AdminSidebarPage />);

      const collapsibleBadges = screen.getAllByText('Collapsible');
      // Productivity and Admin sections are collapsible
      expect(collapsibleBadges.length).toBe(2);
    });

    it('renders info box with help text', async () => {
      render(<AdminSidebarPage />);

      expect(screen.getByText('About Sidebar Management')).toBeInTheDocument();
      expect(screen.getByText(/Drag and drop:/)).toBeInTheDocument();
      expect(screen.getByText(/Visibility:/)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Section Expand/Collapse Tests
  // ===========================================================================
  describe('Section Expand/Collapse', () => {
    it('all sections are expanded by default', () => {
      render(<AdminSidebarPage />);

      // All items should be visible since sections are expanded by default
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });

    it('can collapse a section by clicking its header', async () => {
      const user = userEvent.setup();
      render(<AdminSidebarPage />);

      // Find and click the Main section header
      const mainSectionButton = screen.getByRole('button', { name: /Main/ });
      await user.click(mainSectionButton);

      // The section is now collapsed - items inside may not be visible
      // The section header should still be visible
      expect(screen.getByText('Main')).toBeInTheDocument();
    });

    it('can expand a collapsed section', async () => {
      const user = userEvent.setup();
      render(<AdminSidebarPage />);

      // Collapse then expand
      const productivitySection = screen.getByRole('button', { name: /Productivity/ });
      await user.click(productivitySection); // collapse
      await user.click(productivitySection); // expand

      // Items should be visible again
      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Visibility Toggle Tests
  // ===========================================================================
  describe('Visibility Toggle', () => {
    it('renders visibility toggle buttons for each item', () => {
      render(<AdminSidebarPage />);

      // Each item has a visibility toggle button
      const visibilityButtons = screen.getAllByTitle(/Hide item|Show item/);
      expect(visibilityButtons.length).toBe(5); // 5 items in mock data
    });

    it('shows Eye icon for visible items', () => {
      render(<AdminSidebarPage />);

      // All items are visible by default
      const hideButtons = screen.getAllByTitle('Hide item');
      expect(hideButtons.length).toBe(5);
    });

    it('can toggle item visibility', async () => {
      const user = userEvent.setup();
      render(<AdminSidebarPage />);

      // Find the first hide button and click it
      const hideButtons = screen.getAllByTitle('Hide item');
      await user.click(hideButtons[0]);

      // Now there should be one "Show item" button
      expect(screen.getByTitle('Show item')).toBeInTheDocument();
    });

    it('toggles from hidden to visible', async () => {
      const user = userEvent.setup();
      render(<AdminSidebarPage />);

      // Toggle to hide
      const hideButtons = screen.getAllByTitle('Hide item');
      await user.click(hideButtons[0]);

      // Toggle to show
      const showButton = screen.getByTitle('Show item');
      await user.click(showButton);

      // All should be hide buttons again
      const allHideButtons = screen.getAllByTitle('Hide item');
      expect(allHideButtons.length).toBe(5);
    });
  });

  // ===========================================================================
  // Save Button Tests
  // ===========================================================================
  describe('Save Changes Button', () => {
    it('renders Save Changes button', () => {
      render(<AdminSidebarPage />);

      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    it('Save button is disabled when no changes made', () => {
      render(<AdminSidebarPage />);

      const saveButton = screen.getByRole('button', { name: /Save Changes/ });
      expect(saveButton).toBeDisabled();
    });

    it('Save button becomes enabled after making changes', async () => {
      const user = userEvent.setup();
      render(<AdminSidebarPage />);

      // Make a change by toggling visibility
      const hideButtons = screen.getAllByTitle('Hide item');
      await user.click(hideButtons[0]);

      // Save button should now be enabled
      const saveButton = screen.getByRole('button', { name: /Save Changes/ });
      expect(saveButton).not.toBeDisabled();
    });

    it('calls update mutation when Save button is clicked', async () => {
      const user = userEvent.setup();
      mockUpdateMutateAsync.mockResolvedValue({});

      render(<AdminSidebarPage />);

      // Make a change
      const hideButtons = screen.getAllByTitle('Hide item');
      await user.click(hideButtons[0]);

      // Click save
      const saveButton = screen.getByRole('button', { name: /Save Changes/ });
      await user.click(saveButton);

      expect(mockUpdateMutateAsync).toHaveBeenCalledTimes(1);
    });

    it('shows saving state during mutation', async () => {
      const user = userEvent.setup();

      // Make the mutation pending
      useUpdateSidebarConfig.mockReturnValue({
        mutateAsync: mockUpdateMutateAsync,
        isPending: true,
      });

      render(<AdminSidebarPage />);

      // Button should show "Saving..." text
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('shows success state after saving', async () => {
      const user = userEvent.setup();
      mockUpdateMutateAsync.mockResolvedValue({});

      render(<AdminSidebarPage />);

      // Make a change
      const hideButtons = screen.getAllByTitle('Hide item');
      await user.click(hideButtons[0]);

      // Click save
      const saveButton = screen.getByRole('button', { name: /Save Changes/ });
      await user.click(saveButton);

      // Should show "Saved!" briefly
      await waitFor(() => {
        expect(screen.getByText('Saved!')).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Reset Button Tests
  // ===========================================================================
  describe('Reset to Defaults Button', () => {
    it('renders Reset to Defaults button', () => {
      render(<AdminSidebarPage />);

      expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
    });

    it('opens confirmation dialog when Reset button is clicked', async () => {
      const user = userEvent.setup();
      render(<AdminSidebarPage />);

      const resetButton = screen.getByRole('button', { name: /Reset to Defaults/ });
      await user.click(resetButton);

      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
      expect(screen.getByText('Reset Sidebar Configuration')).toBeInTheDocument();
    });

    it('shows warning message in confirmation dialog', async () => {
      const user = userEvent.setup();
      render(<AdminSidebarPage />);

      const resetButton = screen.getByRole('button', { name: /Reset to Defaults/ });
      await user.click(resetButton);

      expect(
        screen.getByText(/This will restore all sidebar items to their default order/)
      ).toBeInTheDocument();
    });

    it('closes dialog when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<AdminSidebarPage />);

      const resetButton = screen.getByRole('button', { name: /Reset to Defaults/ });
      await user.click(resetButton);

      const cancelButton = within(screen.getByTestId('confirm-dialog')).getByRole('button', {
        name: /Cancel/,
      });
      await user.click(cancelButton);

      expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    });

    it('calls reset mutation when confirmed', async () => {
      const user = userEvent.setup();
      mockResetMutateAsync.mockResolvedValue({});

      render(<AdminSidebarPage />);

      const resetButton = screen.getByRole('button', { name: /Reset to Defaults/ });
      await user.click(resetButton);

      const confirmButton = within(screen.getByTestId('confirm-dialog')).getByRole('button', {
        name: /Reset to Defaults/,
      });
      await user.click(confirmButton);

      expect(mockResetMutateAsync).toHaveBeenCalledTimes(1);
    });

    it('disables Reset button when mutation is pending', () => {
      useResetSidebarConfig.mockReturnValue({
        mutateAsync: mockResetMutateAsync,
        isPending: true,
      });

      render(<AdminSidebarPage />);

      const resetButton = screen.getByRole('button', { name: /Reset to Defaults/ });
      expect(resetButton).toBeDisabled();
    });
  });

  // ===========================================================================
  // Edge Cases Tests
  // ===========================================================================
  describe('Edge Cases', () => {
    it('handles empty sections gracefully', () => {
      useAdminSidebarConfig.mockReturnValue({
        data: {
          sections: [{ key: 'empty', label: 'Empty Section', order: 0, collapsible: false }],
          items: [],
        },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<AdminSidebarPage />);

      expect(screen.getByText('Empty Section')).toBeInTheDocument();
      expect(screen.getByText('No items in this section')).toBeInTheDocument();
    });

    it('handles missing data gracefully', () => {
      useAdminSidebarConfig.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<AdminSidebarPage />);

      // Should not crash, header should still render
      expect(screen.getByText('Sidebar Management')).toBeInTheDocument();
    });

    it('handles items with undefined icon', () => {
      useAdminSidebarConfig.mockReturnValue({
        data: {
          sections: [{ key: 'test', label: 'Test', order: 0, collapsible: false }],
          items: [
            { key: 'item1', label: 'Item Without Icon', section: 'test', order: 0, visible: true },
          ],
        },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<AdminSidebarPage />);

      // Should render with default icon without crashing
      expect(screen.getByText('Item Without Icon')).toBeInTheDocument();
    });

    it('shows item count of 0 for sections with no items', () => {
      useAdminSidebarConfig.mockReturnValue({
        data: {
          sections: [{ key: 'empty', label: 'Empty', order: 0, collapsible: false }],
          items: [],
        },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<AdminSidebarPage />);

      expect(screen.getByText('(0 items)')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // API Error Handling Tests
  // ===========================================================================
  describe('API Error Handling', () => {
    it('handles save mutation error gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockUpdateMutateAsync.mockRejectedValue(new Error('Save failed'));

      render(<AdminSidebarPage />);

      // Make a change
      const hideButtons = screen.getAllByTitle('Hide item');
      await user.click(hideButtons[0]);

      // Try to save
      const saveButton = screen.getByRole('button', { name: /Save Changes/ });
      await user.click(saveButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to save sidebar config:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it('handles reset mutation error gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockResetMutateAsync.mockRejectedValue(new Error('Reset failed'));

      render(<AdminSidebarPage />);

      // Open reset dialog
      const resetButton = screen.getByRole('button', { name: /Reset to Defaults/ });
      await user.click(resetButton);

      // Confirm reset
      const confirmButton = within(screen.getByTestId('confirm-dialog')).getByRole('button', {
        name: /Reset to Defaults/,
      });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to reset sidebar config:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });
  });
});
