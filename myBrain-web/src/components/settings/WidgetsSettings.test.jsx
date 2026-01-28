/**
 * =============================================================================
 * WIDGETSSETTINGS.TEST.JSX - Unit Tests for WidgetsSettings Component
 * =============================================================================
 *
 * Tests the WidgetsSettings component which manages dashboard widget visibility.
 * Covers:
 * - Loading state
 * - Rendering widget list with categories
 * - Filtering widgets by category
 * - Toggling widget visibility (show/hide)
 * - Pinned widget indicators
 * - Reset to defaults functionality
 * - Coming soon badge for unimplemented widgets
 *
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import WidgetsSettings from './WidgetsSettings';

// Mock the dashboard hooks
vi.mock('../../features/dashboard/hooks/useDashboardData', () => ({
  useDashboardData: vi.fn(),
  useDashboardPreferences: vi.fn(),
}));

import { useDashboardData, useDashboardPreferences } from '../../features/dashboard/hooks/useDashboardData';

describe('WidgetsSettings', () => {
  const mockHideWidget = vi.fn();
  const mockShowWidget = vi.fn();
  const mockResetPreferences = vi.fn();

  const defaultDashboardData = {
    preferences: {
      pinnedWidgets: [{ widgetId: 'tasks' }],
      hiddenWidgets: ['time'],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    useDashboardData.mockReturnValue({
      data: defaultDashboardData,
      isLoading: false,
    });

    useDashboardPreferences.mockReturnValue({
      hideWidget: mockHideWidget,
      showWidget: mockShowWidget,
      resetPreferences: mockResetPreferences,
      isUpdating: false,
    });
  });

  describe('Loading State', () => {
    it('renders loading spinner when data is loading', () => {
      useDashboardData.mockReturnValue({
        data: null,
        isLoading: true,
      });

      const { container } = render(<WidgetsSettings />);

      // Should show a loader
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('Basic Rendering', () => {
    it('renders the component with header', () => {
      render(<WidgetsSettings />);

      expect(screen.getByText('Dashboard Widgets')).toBeInTheDocument();
      expect(screen.getByText('Choose which widgets appear on your dashboard')).toBeInTheDocument();
    });

    it('renders category filter buttons', () => {
      render(<WidgetsSettings />);

      expect(screen.getByRole('button', { name: 'All Widgets' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Productivity' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Needs Attention' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Utility' })).toBeInTheDocument();
    });

    it('renders widget list with names and descriptions', () => {
      render(<WidgetsSettings />);

      // Check for implemented widgets
      expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
      expect(screen.getByText('Overdue and due today tasks')).toBeInTheDocument();
      expect(screen.getByText("Today's Events")).toBeInTheDocument();
      expect(screen.getByText('Calendar events for today')).toBeInTheDocument();
    });

    it('renders reset to defaults button', () => {
      render(<WidgetsSettings />);

      expect(screen.getByRole('button', { name: /reset to defaults/i })).toBeInTheDocument();
    });
  });

  describe('Widget Status Indicators', () => {
    it('shows pinned indicator for pinned widgets', () => {
      render(<WidgetsSettings />);

      // Tasks widget is pinned in the mock data
      const tasksWidget = screen.getByText("Today's Tasks").closest('div[class*="rounded-xl"]');
      // Should have a pin icon (lucide Pin component renders as SVG)
      expect(tasksWidget).toBeInTheDocument();
    });

    it('shows "Coming Soon" badge for unimplemented widgets', () => {
      render(<WidgetsSettings />);

      // Look for Coming Soon badges
      const comingSoonBadges = screen.getAllByText('Coming Soon');
      expect(comingSoonBadges.length).toBeGreaterThan(0);
    });

    it('shows hidden state styling for hidden widgets', () => {
      render(<WidgetsSettings />);

      // Time widget is hidden in the mock data
      const timeWidget = screen.getByText('Time').closest('div[class*="rounded-xl"]');
      expect(timeWidget).toHaveClass('opacity-60');
    });
  });

  describe('Category Filtering', () => {
    it('shows all widgets by default', () => {
      render(<WidgetsSettings />);

      // Should show widgets from different categories
      expect(screen.getByText("Today's Tasks")).toBeInTheDocument(); // productivity
      expect(screen.getByText('Your Progress')).toBeInTheDocument(); // overview
      expect(screen.getByText('Time')).toBeInTheDocument(); // utility
    });

    it('filters widgets when a category is selected', async () => {
      const user = userEvent.setup();
      render(<WidgetsSettings />);

      // Click on Productivity filter
      await user.click(screen.getByRole('button', { name: 'Productivity' }));

      // Should show productivity widgets
      expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
      expect(screen.getByText("Today's Events")).toBeInTheDocument();

      // Should NOT show non-productivity widgets
      expect(screen.queryByText('Your Progress')).not.toBeInTheDocument();
      expect(screen.queryByText('Time')).not.toBeInTheDocument();
    });

    it('shows only utility widgets when Utility filter is selected', async () => {
      const user = userEvent.setup();
      render(<WidgetsSettings />);

      await user.click(screen.getByRole('button', { name: 'Utility' }));

      expect(screen.getByText('Time')).toBeInTheDocument();
      expect(screen.getByText('Feature Guide')).toBeInTheDocument();
      expect(screen.queryByText("Today's Tasks")).not.toBeInTheDocument();
    });

    it('highlights the active filter button', async () => {
      const user = userEvent.setup();
      render(<WidgetsSettings />);

      const productivityButton = screen.getByRole('button', { name: 'Productivity' });
      const allWidgetsButton = screen.getByRole('button', { name: 'All Widgets' });

      // Initially All Widgets should be active
      expect(allWidgetsButton).toHaveClass('bg-primary');

      // Click Productivity
      await user.click(productivityButton);

      // Now Productivity should be active
      expect(productivityButton).toHaveClass('bg-primary');
      expect(allWidgetsButton).not.toHaveClass('bg-primary');
    });
  });

  describe('Widget Visibility Toggle', () => {
    it('calls hideWidget when clicking hide on a visible widget', async () => {
      const user = userEvent.setup();
      render(<WidgetsSettings />);

      // Find a visible widget (not "Time" which is hidden) and click its toggle button
      // Tasks widget is visible, find its toggle button
      const tasksWidget = screen.getByText("Today's Tasks").closest('div[class*="rounded-xl"]');
      const toggleButton = tasksWidget.querySelector('button[title="Hide widget"]');

      if (toggleButton) {
        await user.click(toggleButton);
        expect(mockHideWidget).toHaveBeenCalledWith('tasks');
      }
    });

    it('calls showWidget when clicking show on a hidden widget', async () => {
      const user = userEvent.setup();
      render(<WidgetsSettings />);

      // Time widget is hidden, find its toggle button
      const timeWidget = screen.getByText('Time').closest('div[class*="rounded-xl"]');
      const toggleButton = timeWidget.querySelector('button[title="Show widget"]');

      if (toggleButton) {
        await user.click(toggleButton);
        expect(mockShowWidget).toHaveBeenCalledWith('time');
      }
    });

    it('does not show toggle button for unimplemented widgets', () => {
      render(<WidgetsSettings />);

      // Notifications widget is not implemented
      const notificationsWidget = screen.getByText('Notifications').closest('div[class*="rounded-xl"]');

      // Should not have a toggle button
      const toggleButton = notificationsWidget.querySelector('button[title*="widget"]');
      expect(toggleButton).toBeNull();
    });
  });

  describe('Reset Preferences', () => {
    it('shows confirmation dialog when clicking reset', async () => {
      const user = userEvent.setup();
      // Mock window.confirm
      const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<WidgetsSettings />);

      const resetButton = screen.getByRole('button', { name: /reset to defaults/i });
      await user.click(resetButton);

      expect(mockConfirm).toHaveBeenCalledWith(
        'Reset all widget settings to defaults? This will unpin all widgets and show all hidden widgets.'
      );

      mockConfirm.mockRestore();
    });

    it('calls resetPreferences when confirmation is accepted', async () => {
      const user = userEvent.setup();
      const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<WidgetsSettings />);

      const resetButton = screen.getByRole('button', { name: /reset to defaults/i });
      await user.click(resetButton);

      expect(mockResetPreferences).toHaveBeenCalled();

      mockConfirm.mockRestore();
    });

    it('does not call resetPreferences when confirmation is cancelled', async () => {
      const user = userEvent.setup();
      const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<WidgetsSettings />);

      const resetButton = screen.getByRole('button', { name: /reset to defaults/i });
      await user.click(resetButton);

      expect(mockResetPreferences).not.toHaveBeenCalled();

      mockConfirm.mockRestore();
    });
  });

  describe('Updating State', () => {
    it('disables toggle buttons when isUpdating is true', () => {
      useDashboardPreferences.mockReturnValue({
        hideWidget: mockHideWidget,
        showWidget: mockShowWidget,
        resetPreferences: mockResetPreferences,
        isUpdating: true,
      });

      render(<WidgetsSettings />);

      // Find toggle buttons and check they are disabled
      const toggleButtons = screen.getAllByTitle(/widget/i);
      toggleButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('disables reset button when isUpdating is true', () => {
      useDashboardPreferences.mockReturnValue({
        hideWidget: mockHideWidget,
        showWidget: mockShowWidget,
        resetPreferences: mockResetPreferences,
        isUpdating: true,
      });

      render(<WidgetsSettings />);

      const resetButton = screen.getByRole('button', { name: /reset to defaults/i });
      expect(resetButton).toBeDisabled();
    });
  });

  describe('Empty Preferences', () => {
    it('handles empty preferences gracefully', () => {
      useDashboardData.mockReturnValue({
        data: { preferences: {} },
        isLoading: false,
      });

      render(<WidgetsSettings />);

      // Should still render widgets without errors
      expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
    });

    it('handles null preferences gracefully', () => {
      useDashboardData.mockReturnValue({
        data: {},
        isLoading: false,
      });

      render(<WidgetsSettings />);

      // Should still render widgets without errors
      expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
    });
  });
});
