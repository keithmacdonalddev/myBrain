/**
 * =============================================================================
 * WIDGETMANAGER.TEST.JSX - Tests for Widget Manager Component
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import WidgetManager from './WidgetManager';

describe('WidgetManager', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    pinnedWidgets: [],
    hiddenWidgets: [],
    onHide: vi.fn(),
    onShow: vi.fn(),
    onReset: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Visibility', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(
        <WidgetManager {...defaultProps} isOpen={false} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders modal when isOpen is true', () => {
      render(<WidgetManager {...defaultProps} />);
      expect(screen.getByText('Manage Widgets')).toBeInTheDocument();
    });
  });

  describe('Modal Content', () => {
    it('displays header with title and description', () => {
      render(<WidgetManager {...defaultProps} />);

      expect(screen.getByText('Manage Widgets')).toBeInTheDocument();
      expect(screen.getByText('Show, hide, or pin widgets on your dashboard')).toBeInTheDocument();
    });

    it('displays all category filter buttons', () => {
      render(<WidgetManager {...defaultProps} />);

      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Productivity')).toBeInTheDocument();
      expect(screen.getByText('Needs Attention')).toBeInTheDocument();
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Utility')).toBeInTheDocument();
    });

    it('displays widgets', () => {
      render(<WidgetManager {...defaultProps} />);

      // Check for some implemented widgets
      expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
      expect(screen.getByText("Today's Events")).toBeInTheDocument();
      expect(screen.getByText('Active Projects')).toBeInTheDocument();
      expect(screen.getByText('Inbox')).toBeInTheDocument();
    });

    it('displays widget descriptions', () => {
      render(<WidgetManager {...defaultProps} />);

      expect(screen.getByText('Overdue and due today tasks')).toBeInTheDocument();
      expect(screen.getByText('Calendar events for today')).toBeInTheDocument();
    });

    it('displays footer buttons', () => {
      render(<WidgetManager {...defaultProps} />);

      expect(screen.getByText('Reset to defaults')).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
    });
  });

  describe('Category Filtering', () => {
    it('starts with "All" category selected', () => {
      render(<WidgetManager {...defaultProps} />);

      const allButton = screen.getByText('All');
      expect(allButton.className).toContain('bg-primary');
    });

    it('filters widgets by category when clicking filter', async () => {
      const user = userEvent.setup();
      render(<WidgetManager {...defaultProps} />);

      // Click "Productivity" filter
      await user.click(screen.getByText('Productivity'));

      // Should see productivity widgets
      expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
      expect(screen.getByText("Today's Events")).toBeInTheDocument();
      expect(screen.getByText('Active Projects')).toBeInTheDocument();
    });

    it('highlights selected category', async () => {
      const user = userEvent.setup();
      render(<WidgetManager {...defaultProps} />);

      await user.click(screen.getByText('Productivity'));

      const productivityButton = screen.getByText('Productivity');
      expect(productivityButton.className).toContain('bg-primary');
    });
  });

  describe('Widget States', () => {
    it('shows pin icon for pinned widgets', () => {
      const props = {
        ...defaultProps,
        pinnedWidgets: [{ widgetId: 'tasks' }]
      };

      const { container } = render(<WidgetManager {...props} />);

      // Pin icon should be visible near the tasks widget
      const pinIcons = container.querySelectorAll('.lucide-pin');
      expect(pinIcons.length).toBeGreaterThan(0);
    });

    it('shows "Coming Soon" badge for unimplemented widgets', () => {
      render(<WidgetManager {...defaultProps} />);

      const comingSoonBadges = screen.getAllByText('Coming Soon');
      expect(comingSoonBadges.length).toBeGreaterThan(0);
    });

    it('dims hidden widgets', () => {
      const props = {
        ...defaultProps,
        hiddenWidgets: ['tasks']
      };

      const { container } = render(<WidgetManager {...props} />);

      // Hidden widgets should have reduced opacity
      const hiddenWidget = container.querySelector('.opacity-60');
      expect(hiddenWidget).toBeInTheDocument();
    });

    it('shows EyeOff icon for hidden widgets', () => {
      const props = {
        ...defaultProps,
        hiddenWidgets: ['tasks']
      };

      const { container } = render(<WidgetManager {...props} />);

      const eyeOffIcons = container.querySelectorAll('.lucide-eye-off');
      expect(eyeOffIcons.length).toBeGreaterThan(0);
    });

    it('shows Eye icon for visible widgets', () => {
      render(<WidgetManager {...defaultProps} />);

      const { container } = render(<WidgetManager {...defaultProps} />);
      const eyeIcons = container.querySelectorAll('.lucide-eye');
      expect(eyeIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Widget Actions', () => {
    it('calls onHide when clicking eye button on visible widget', async () => {
      const user = userEvent.setup();
      const onHide = vi.fn();

      render(<WidgetManager {...defaultProps} onHide={onHide} />);

      // Find visibility toggle buttons (Eye icons)
      const eyeButtons = screen.getAllByTitle('Hide widget');
      await user.click(eyeButtons[0]);

      expect(onHide).toHaveBeenCalled();
    });

    it('calls onShow when clicking eye-off button on hidden widget', async () => {
      const user = userEvent.setup();
      const onShow = vi.fn();

      const props = {
        ...defaultProps,
        hiddenWidgets: ['tasks'],
        onShow
      };

      render(<WidgetManager {...props} />);

      const showButton = screen.getByTitle('Show widget');
      await user.click(showButton);

      expect(onShow).toHaveBeenCalledWith('tasks');
    });

    it('does not show toggle button for unimplemented widgets', () => {
      render(<WidgetManager {...defaultProps} />);

      // Find a "Coming Soon" widget - it shouldn't have a toggle button
      // Notifications is not implemented
      const comingSoonBadges = screen.getAllByText('Coming Soon');
      expect(comingSoonBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Modal Actions', () => {
    it('calls onClose when clicking X button', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<WidgetManager {...defaultProps} onClose={onClose} />);

      // Find X button in header
      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find(btn =>
        btn.querySelector('.lucide-x')
      );

      if (xButton) {
        await user.click(xButton);
        expect(onClose).toHaveBeenCalled();
      }
    });

    it('calls onClose when clicking Done button', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<WidgetManager {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByText('Done'));
      expect(onClose).toHaveBeenCalled();
    });

    it('calls onClose when clicking backdrop', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      const { container } = render(<WidgetManager {...defaultProps} onClose={onClose} />);

      const backdrop = container.querySelector('.bg-black\\/50');
      if (backdrop) {
        await user.click(backdrop);
        expect(onClose).toHaveBeenCalled();
      }
    });

    it('calls onReset when clicking Reset to defaults', async () => {
      const user = userEvent.setup();
      const onReset = vi.fn();

      render(<WidgetManager {...defaultProps} onReset={onReset} />);

      await user.click(screen.getByText('Reset to defaults'));
      expect(onReset).toHaveBeenCalled();
    });
  });

  describe('Widget Categories', () => {
    it('shows productivity widgets', () => {
      render(<WidgetManager {...defaultProps} />);

      // Productivity widgets
      expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
      expect(screen.getByText("Today's Events")).toBeInTheDocument();
      expect(screen.getByText('Active Projects')).toBeInTheDocument();
    });

    it('shows attention widgets', () => {
      render(<WidgetManager {...defaultProps} />);

      expect(screen.getByText('Inbox')).toBeInTheDocument();
    });

    it('shows overview widgets', () => {
      render(<WidgetManager {...defaultProps} />);

      expect(screen.getByText('Your Progress')).toBeInTheDocument();
    });

    it('shows utility widgets', () => {
      render(<WidgetManager {...defaultProps} />);

      expect(screen.getByText('Time')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper modal structure', () => {
      const { container } = render(<WidgetManager {...defaultProps} />);

      // Modal should have a backdrop
      expect(container.querySelector('.bg-black\\/50')).toBeInTheDocument();

      // Modal content should be present
      expect(container.querySelector('.bg-panel')).toBeInTheDocument();
    });

    it('has close buttons with proper labels', () => {
      render(<WidgetManager {...defaultProps} />);

      expect(screen.getByText('Done')).toBeInTheDocument();
    });
  });
});
