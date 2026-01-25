/**
 * =============================================================================
 * INBOXWIDGET.TEST.JSX - Tests for Inbox Widget Component
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import InboxWidget from './InboxWidget';

describe('InboxWidget', () => {
  let originalDate;

  beforeEach(() => {
    originalDate = global.Date;
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  function mockDate(dateString) {
    const mockDateInstance = new originalDate(dateString);
    global.Date = class extends originalDate {
      constructor(...args) {
        if (args.length === 0) {
          return mockDateInstance;
        }
        return new originalDate(...args);
      }
      static now() {
        return mockDateInstance.getTime();
      }
    };
  }

  describe('Basic Rendering', () => {
    it('renders widget title', () => {
      render(<InboxWidget />);
      expect(screen.getByText('Inbox')).toBeInTheDocument();
    });

    it('renders inbox link in footer', () => {
      render(<InboxWidget notes={[{ _id: '1', title: 'Note' }]} />);
      const link = screen.getByRole('link', { name: /view inbox/i });
      expect(link).toHaveAttribute('href', '/app/inbox');
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading', () => {
      const { container } = render(<InboxWidget isLoading={true} />);
      expect(container.querySelector('.widget-loading')).toBeInTheDocument();
    });

    it('shows title during loading', () => {
      render(<InboxWidget isLoading={true} />);
      expect(screen.getByText('Inbox')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no notes', () => {
      render(<InboxWidget notes={[]} />);

      expect(screen.getByText('Inbox empty')).toBeInTheDocument();
      expect(screen.getByText('All notes have been processed.')).toBeInTheDocument();
    });
  });

  describe('Notes Display', () => {
    it('displays note titles', () => {
      const notes = [
        { _id: '1', title: 'Quick thought' },
        { _id: '2', title: 'Meeting notes' }
      ];

      render(<InboxWidget notes={notes} />);

      expect(screen.getByText('Quick thought')).toBeInTheDocument();
      expect(screen.getByText('Meeting notes')).toBeInTheDocument();
    });

    it('displays "Untitled" for notes without title', () => {
      const notes = [
        { _id: '1' }
      ];

      render(<InboxWidget notes={notes} />);
      expect(screen.getByText('Untitled')).toBeInTheDocument();
    });

    it('displays note count badge', () => {
      const notes = [
        { _id: '1', title: 'Note 1' },
        { _id: '2', title: 'Note 2' },
        { _id: '3', title: 'Note 3' }
      ];

      render(<InboxWidget notes={notes} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('limits displayed notes to 4', () => {
      const notes = Array.from({ length: 6 }, (_, i) => ({
        _id: String(i + 1),
        title: `Note ${i + 1}`
      }));

      render(<InboxWidget notes={notes} />);

      expect(screen.getByText('Note 1')).toBeInTheDocument();
      expect(screen.getByText('Note 4')).toBeInTheDocument();
      expect(screen.queryByText('Note 5')).not.toBeInTheDocument();
    });
  });

  describe('Time Formatting', () => {
    it('shows minutes ago for recent notes', () => {
      mockDate('2024-01-25T14:30:00');

      const notes = [
        { _id: '1', title: 'Note', createdAt: '2024-01-25T14:25:00' }
      ];

      render(<InboxWidget notes={notes} />);
      expect(screen.getByText('5m ago')).toBeInTheDocument();
    });

    it('shows hours ago for notes created today', () => {
      mockDate('2024-01-25T14:00:00');

      const notes = [
        { _id: '1', title: 'Note', createdAt: '2024-01-25T11:00:00' }
      ];

      render(<InboxWidget notes={notes} />);
      expect(screen.getByText('3h ago')).toBeInTheDocument();
    });

    it('shows "Yesterday" for notes from yesterday', () => {
      mockDate('2024-01-25T14:00:00');

      const notes = [
        { _id: '1', title: 'Note', createdAt: '2024-01-24T14:00:00' }
      ];

      render(<InboxWidget notes={notes} />);
      expect(screen.getByText('Yesterday')).toBeInTheDocument();
    });

    it('shows days ago for recent notes', () => {
      mockDate('2024-01-25T14:00:00');

      const notes = [
        { _id: '1', title: 'Note', createdAt: '2024-01-22T14:00:00' }
      ];

      render(<InboxWidget notes={notes} />);
      expect(screen.getByText('3d ago')).toBeInTheDocument();
    });

    it('shows formatted date for old notes', () => {
      mockDate('2024-01-25T14:00:00');

      const notes = [
        { _id: '1', title: 'Note', createdAt: '2024-01-10T14:00:00' }
      ];

      render(<InboxWidget notes={notes} />);
      expect(screen.getByText('Jan 10')).toBeInTheDocument();
    });
  });

  describe('Note Click Handler', () => {
    it('calls onNoteClick when note is clicked', async () => {
      const user = userEvent.setup();
      const onNoteClick = vi.fn();

      const note = { _id: '1', title: 'Clickable Note' };

      render(<InboxWidget notes={[note]} onNoteClick={onNoteClick} />);

      await user.click(screen.getByText('Clickable Note'));
      expect(onNoteClick).toHaveBeenCalledWith(note);
    });
  });

  describe('Note Icons', () => {
    it('shows sticky note icon for each note', () => {
      const notes = [
        { _id: '1', title: 'Note 1' },
        { _id: '2', title: 'Note 2' }
      ];

      const { container } = render(<InboxWidget notes={notes} />);

      const noteIcons = container.querySelectorAll('.lucide-sticky-note');
      expect(noteIcons.length).toBe(2);
    });

    it('applies cyan color to note icons', () => {
      const notes = [
        { _id: '1', title: 'Note' }
      ];

      const { container } = render(<InboxWidget notes={notes} />);
      expect(container.querySelector('.text-cyan-500')).toBeInTheDocument();
    });
  });

  describe('Note Preview', () => {
    // Note: The current implementation doesn't show body preview in the widget
    // but this is the expected behavior from the getPreview helper function

    it('handles notes without body gracefully', () => {
      const notes = [
        { _id: '1', title: 'Empty Note' }
      ];

      render(<InboxWidget notes={notes} />);
      expect(screen.getByText('Empty Note')).toBeInTheDocument();
    });
  });

  describe('Widget Styling', () => {
    it('applies widget-list class to notes container', () => {
      const notes = [
        { _id: '1', title: 'Note' }
      ];

      const { container } = render(<InboxWidget notes={notes} />);
      expect(container.querySelector('.widget-list')).toBeInTheDocument();
    });

    it('applies icon background styling', () => {
      const notes = [
        { _id: '1', title: 'Note' }
      ];

      const { container } = render(<InboxWidget notes={notes} />);
      expect(container.querySelector('.bg-cyan-500\\/10')).toBeInTheDocument();
    });
  });
});
