/**
 * =============================================================================
 * FEATUREGUIDEWIDGET.TEST.JSX - Tests for Feature Guide Widget Component
 * =============================================================================
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import FeatureGuideWidget from './FeatureGuideWidget';

describe('FeatureGuideWidget', () => {
  describe('Basic Rendering', () => {
    it('renders widget title', () => {
      render(<FeatureGuideWidget />);
      expect(screen.getByText('Building Blocks')).toBeInTheDocument();
    });

    it('renders subtitle', () => {
      render(<FeatureGuideWidget />);
      expect(screen.getByText('Tap to learn')).toBeInTheDocument();
    });
  });

  describe('Feature Grid', () => {
    it('displays all feature buttons', () => {
      render(<FeatureGuideWidget />);

      expect(screen.getByText('Tasks')).toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Calendar')).toBeInTheDocument();
      expect(screen.getByText('Images')).toBeInTheDocument();
      expect(screen.getByText('Files')).toBeInTheDocument();
      expect(screen.getByText('Inbox')).toBeInTheDocument();
      expect(screen.getByText('Messages')).toBeInTheDocument();
    });

    it('renders feature grid container', () => {
      const { container } = render(<FeatureGuideWidget />);
      expect(container.querySelector('.feature-guide-grid')).toBeInTheDocument();
    });

    it('renders feature buttons as clickable', () => {
      render(<FeatureGuideWidget />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(8);
    });
  });

  describe('Feature Selection', () => {
    it('shows feature description when feature is clicked', async () => {
      const user = userEvent.setup();
      render(<FeatureGuideWidget />);

      await user.click(screen.getByText('Tasks'));

      expect(screen.getByText(/Create and manage your to-do items/)).toBeInTheDocument();
    });

    it('shows feature info panel with title', async () => {
      const user = userEvent.setup();
      render(<FeatureGuideWidget />);

      await user.click(screen.getByText('Notes'));

      // Should show Notes title in the info panel
      const notesElements = screen.getAllByText('Notes');
      expect(notesElements.length).toBeGreaterThanOrEqual(2); // Grid + info panel
    });

    it('shows close button in feature info panel', async () => {
      const user = userEvent.setup();
      const { container } = render(<FeatureGuideWidget />);

      await user.click(screen.getByText('Projects'));

      const closeButton = container.querySelector('.feature-guide-info-close');
      expect(closeButton).toBeInTheDocument();
    });

    it('closes feature info when clicking close button', async () => {
      const user = userEvent.setup();
      const { container } = render(<FeatureGuideWidget />);

      await user.click(screen.getByText('Calendar'));
      expect(screen.getByText(/Schedule events and appointments/)).toBeInTheDocument();

      const closeButton = container.querySelector('.feature-guide-info-close');
      await user.click(closeButton);

      expect(screen.queryByText(/Schedule events and appointments/)).not.toBeInTheDocument();
    });

    it('toggles feature off when clicking same feature again', async () => {
      const user = userEvent.setup();
      render(<FeatureGuideWidget />);

      await user.click(screen.getByText('Images'));
      expect(screen.getByText(/Store and organize your images/)).toBeInTheDocument();

      await user.click(screen.getByText('Images'));
      expect(screen.queryByText(/Store and organize your images/)).not.toBeInTheDocument();
    });

    it('switches to new feature when clicking different feature', async () => {
      const user = userEvent.setup();
      render(<FeatureGuideWidget />);

      await user.click(screen.getByText('Files'));
      expect(screen.getByText(/Upload and manage documents/)).toBeInTheDocument();

      await user.click(screen.getByText('Inbox'));
      expect(screen.queryByText(/Upload and manage documents/)).not.toBeInTheDocument();
      expect(screen.getByText(/Quick capture for unprocessed items/)).toBeInTheDocument();
    });

    it('highlights selected feature', async () => {
      const user = userEvent.setup();
      const { container } = render(<FeatureGuideWidget />);

      await user.click(screen.getByText('Messages'));

      const selectedItem = container.querySelector('.feature-guide-item.selected');
      expect(selectedItem).toBeInTheDocument();
    });
  });

  describe('Feature Descriptions', () => {
    it('shows Tasks description', async () => {
      const user = userEvent.setup();
      render(<FeatureGuideWidget />);

      await user.click(screen.getByText('Tasks'));
      expect(screen.getByText(/Set due dates, priorities, and track completion/)).toBeInTheDocument();
    });

    it('shows Notes description', async () => {
      const user = userEvent.setup();
      render(<FeatureGuideWidget />);

      await user.click(screen.getByText('Notes'));
      expect(screen.getByText(/Capture thoughts, ideas, and information/)).toBeInTheDocument();
    });

    it('shows Projects description', async () => {
      const user = userEvent.setup();
      render(<FeatureGuideWidget />);

      await user.click(screen.getByText('Projects'));
      expect(screen.getByText(/Group related tasks together into projects/)).toBeInTheDocument();
    });

    it('shows Calendar description', async () => {
      const user = userEvent.setup();
      render(<FeatureGuideWidget />);

      await user.click(screen.getByText('Calendar'));
      expect(screen.getByText(/Schedule events and appointments/)).toBeInTheDocument();
    });

    it('shows Images description', async () => {
      const user = userEvent.setup();
      render(<FeatureGuideWidget />);

      await user.click(screen.getByText('Images'));
      expect(screen.getByText(/Store and organize your images/)).toBeInTheDocument();
    });

    it('shows Files description', async () => {
      const user = userEvent.setup();
      render(<FeatureGuideWidget />);

      await user.click(screen.getByText('Files'));
      expect(screen.getByText(/Upload and manage documents/)).toBeInTheDocument();
    });

    it('shows Inbox description', async () => {
      const user = userEvent.setup();
      render(<FeatureGuideWidget />);

      await user.click(screen.getByText('Inbox'));
      expect(screen.getByText(/Quick capture for unprocessed items/)).toBeInTheDocument();
    });

    it('shows Messages description', async () => {
      const user = userEvent.setup();
      render(<FeatureGuideWidget />);

      await user.click(screen.getByText('Messages'));
      expect(screen.getByText(/Communicate with your connections/)).toBeInTheDocument();
    });
  });

  describe('Feature Colors', () => {
    it('displays Tasks in orange', () => {
      const { container } = render(<FeatureGuideWidget />);
      expect(container.querySelector('.text-orange-500')).toBeInTheDocument();
    });

    it('displays Notes in yellow', () => {
      const { container } = render(<FeatureGuideWidget />);
      expect(container.querySelector('.text-yellow-500')).toBeInTheDocument();
    });

    it('displays Projects in purple', () => {
      const { container } = render(<FeatureGuideWidget />);
      expect(container.querySelector('.text-purple-500')).toBeInTheDocument();
    });

    it('displays Calendar in blue', () => {
      const { container } = render(<FeatureGuideWidget />);
      expect(container.querySelector('.text-blue-500')).toBeInTheDocument();
    });

    it('displays Images in pink', () => {
      const { container } = render(<FeatureGuideWidget />);
      expect(container.querySelector('.text-pink-500')).toBeInTheDocument();
    });

    it('displays Files in green', () => {
      const { container } = render(<FeatureGuideWidget />);
      expect(container.querySelector('.text-green-500')).toBeInTheDocument();
    });

    it('displays Inbox in cyan', () => {
      const { container } = render(<FeatureGuideWidget />);
      expect(container.querySelector('.text-cyan-500')).toBeInTheDocument();
    });

    it('displays Messages in indigo', () => {
      const { container } = render(<FeatureGuideWidget />);
      expect(container.querySelector('.text-indigo-500')).toBeInTheDocument();
    });
  });

  describe('Info Panel Styling', () => {
    it('shows info header with icon and title', async () => {
      const user = userEvent.setup();
      const { container } = render(<FeatureGuideWidget />);

      await user.click(screen.getByText('Tasks'));

      expect(container.querySelector('.feature-guide-info-header')).toBeInTheDocument();
      expect(container.querySelector('.feature-guide-info-icon')).toBeInTheDocument();
      expect(container.querySelector('.feature-guide-info-title')).toBeInTheDocument();
    });

    it('shows info description', async () => {
      const user = userEvent.setup();
      const { container } = render(<FeatureGuideWidget />);

      await user.click(screen.getByText('Tasks'));

      expect(container.querySelector('.feature-guide-info-desc')).toBeInTheDocument();
    });
  });

  describe('Initial State', () => {
    it('does not show info panel initially', () => {
      const { container } = render(<FeatureGuideWidget />);
      expect(container.querySelector('.feature-guide-info')).not.toBeInTheDocument();
    });

    it('no features are selected initially', () => {
      const { container } = render(<FeatureGuideWidget />);
      expect(container.querySelector('.feature-guide-item.selected')).not.toBeInTheDocument();
    });
  });
});
