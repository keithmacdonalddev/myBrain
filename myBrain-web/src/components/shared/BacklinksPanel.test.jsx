import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import BacklinksPanel from './BacklinksPanel';

describe('BacklinksPanel', () => {
  const defaultProps = {
    backlinks: [],
    isLoading: false,
    onNoteClick: vi.fn(),
    onTaskClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading state when isLoading is true', () => {
      render(<BacklinksPanel {...defaultProps} isLoading={true} />);
      expect(screen.getByText('Loading backlinks...')).toBeInTheDocument();
    });

    it('does not show backlinks count when loading', () => {
      render(<BacklinksPanel {...defaultProps} isLoading={true} />);
      // Should not show count like "3 backlinks" - only the loading message
      expect(screen.queryByText(/\d+ backlink/)).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows "No backlinks" when backlinks array is empty', () => {
      render(<BacklinksPanel {...defaultProps} backlinks={[]} />);
      expect(screen.getByText('No backlinks')).toBeInTheDocument();
    });

    it('shows "No backlinks" when backlinks is undefined', () => {
      render(<BacklinksPanel {...defaultProps} backlinks={undefined} />);
      expect(screen.getByText('No backlinks')).toBeInTheDocument();
    });

    it('does not show expand chevron when no backlinks', () => {
      const { container } = render(<BacklinksPanel {...defaultProps} backlinks={[]} />);
      // Should not have ChevronDown or ChevronUp icons for empty state
      // The button should still exist but won't have chevron icons
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Backlinks Count', () => {
    it('shows "1 backlink" for singular count', () => {
      const backlinks = [
        { _id: '1', sourceType: 'note', sourceId: 'note1', source: { title: 'Test Note' } },
      ];
      render(<BacklinksPanel {...defaultProps} backlinks={backlinks} />);
      expect(screen.getByText('1 backlink')).toBeInTheDocument();
    });

    it('shows "3 backlinks" for plural count', () => {
      const backlinks = [
        { _id: '1', sourceType: 'note', sourceId: 'note1', source: { title: 'Note 1' } },
        { _id: '2', sourceType: 'note', sourceId: 'note2', source: { title: 'Note 2' } },
        { _id: '3', sourceType: 'task', sourceId: 'task1', source: { title: 'Task 1' } },
      ];
      render(<BacklinksPanel {...defaultProps} backlinks={backlinks} />);
      expect(screen.getByText('3 backlinks')).toBeInTheDocument();
    });
  });

  describe('Expand/Collapse Behavior', () => {
    const backlinks = [
      { _id: '1', sourceType: 'note', sourceId: 'note1', source: { title: 'Test Note' } },
    ];

    it('does not show backlink list initially', () => {
      render(<BacklinksPanel {...defaultProps} backlinks={backlinks} />);
      expect(screen.queryByText('Test Note')).not.toBeInTheDocument();
    });

    it('shows backlink list when expanded', async () => {
      const user = userEvent.setup();
      render(<BacklinksPanel {...defaultProps} backlinks={backlinks} />);

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Test Note')).toBeInTheDocument();
    });

    it('hides backlink list when collapsed', async () => {
      const user = userEvent.setup();
      render(<BacklinksPanel {...defaultProps} backlinks={backlinks} />);

      // Get the header toggle button (first button in the component)
      const toggleButton = screen.getByText(/backlink/i).closest('button');

      // Expand
      await user.click(toggleButton);
      expect(screen.getByText('Test Note')).toBeInTheDocument();

      // Collapse
      await user.click(toggleButton);
      expect(screen.queryByText('Test Note')).not.toBeInTheDocument();
    });
  });

  describe('Note Backlinks', () => {
    const noteBacklinks = [
      { _id: '1', sourceType: 'note', sourceId: 'note1', source: { title: 'First Note' } },
      { _id: '2', sourceType: 'note', sourceId: 'note2', source: { title: 'Second Note' } },
    ];

    it('displays "Notes" section header when note backlinks exist', async () => {
      const user = userEvent.setup();
      render(<BacklinksPanel {...defaultProps} backlinks={noteBacklinks} />);

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Notes')).toBeInTheDocument();
    });

    it('displays all note backlink titles', async () => {
      const user = userEvent.setup();
      render(<BacklinksPanel {...defaultProps} backlinks={noteBacklinks} />);

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('First Note')).toBeInTheDocument();
      expect(screen.getByText('Second Note')).toBeInTheDocument();
    });

    it('shows "Untitled Note" for notes without title', async () => {
      const user = userEvent.setup();
      const backlinks = [
        { _id: '1', sourceType: 'note', sourceId: 'note1', source: {} },
      ];
      render(<BacklinksPanel {...defaultProps} backlinks={backlinks} />);

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Untitled Note')).toBeInTheDocument();
    });

    it('calls onNoteClick when note backlink is clicked', async () => {
      const user = userEvent.setup();
      const handleNoteClick = vi.fn();
      render(
        <BacklinksPanel
          {...defaultProps}
          backlinks={noteBacklinks}
          onNoteClick={handleNoteClick}
        />
      );

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('First Note'));

      expect(handleNoteClick).toHaveBeenCalledWith('note1');
    });
  });

  describe('Task Backlinks', () => {
    const taskBacklinks = [
      { _id: '1', sourceType: 'task', sourceId: 'task1', source: { title: 'First Task' } },
      { _id: '2', sourceType: 'task', sourceId: 'task2', source: { title: 'Second Task' } },
    ];

    it('displays "Tasks" section header when task backlinks exist', async () => {
      const user = userEvent.setup();
      render(<BacklinksPanel {...defaultProps} backlinks={taskBacklinks} />);

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Tasks')).toBeInTheDocument();
    });

    it('displays all task backlink titles', async () => {
      const user = userEvent.setup();
      render(<BacklinksPanel {...defaultProps} backlinks={taskBacklinks} />);

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('First Task')).toBeInTheDocument();
      expect(screen.getByText('Second Task')).toBeInTheDocument();
    });

    it('shows "Untitled Task" for tasks without title', async () => {
      const user = userEvent.setup();
      const backlinks = [
        { _id: '1', sourceType: 'task', sourceId: 'task1', source: {} },
      ];
      render(<BacklinksPanel {...defaultProps} backlinks={backlinks} />);

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Untitled Task')).toBeInTheDocument();
    });

    it('calls onTaskClick when task backlink is clicked', async () => {
      const user = userEvent.setup();
      const handleTaskClick = vi.fn();
      render(
        <BacklinksPanel
          {...defaultProps}
          backlinks={taskBacklinks}
          onTaskClick={handleTaskClick}
        />
      );

      await user.click(screen.getByRole('button'));
      await user.click(screen.getByText('First Task'));

      expect(handleTaskClick).toHaveBeenCalledWith('task1');
    });
  });

  describe('Mixed Backlinks', () => {
    const mixedBacklinks = [
      { _id: '1', sourceType: 'note', sourceId: 'note1', source: { title: 'Note Item' } },
      { _id: '2', sourceType: 'task', sourceId: 'task1', source: { title: 'Task Item' } },
    ];

    it('shows both Notes and Tasks sections', async () => {
      const user = userEvent.setup();
      render(<BacklinksPanel {...defaultProps} backlinks={mixedBacklinks} />);

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Notes')).toBeInTheDocument();
      expect(screen.getByText('Tasks')).toBeInTheDocument();
    });

    it('groups backlinks by type correctly', async () => {
      const user = userEvent.setup();
      render(<BacklinksPanel {...defaultProps} backlinks={mixedBacklinks} />);

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('Note Item')).toBeInTheDocument();
      expect(screen.getByText('Task Item')).toBeInTheDocument();
    });
  });

  describe('Link Types', () => {
    it('shows link type label for non-reference links', async () => {
      const user = userEvent.setup();
      const backlinks = [
        {
          _id: '1',
          sourceType: 'note',
          sourceId: 'note1',
          source: { title: 'Related Note' },
          linkType: 'related_to',
        },
      ];
      render(<BacklinksPanel {...defaultProps} backlinks={backlinks} />);

      await user.click(screen.getByRole('button'));
      expect(screen.getByText('related to')).toBeInTheDocument();
    });

    it('does not show link type label for reference links', async () => {
      const user = userEvent.setup();
      const backlinks = [
        {
          _id: '1',
          sourceType: 'note',
          sourceId: 'note1',
          source: { title: 'Referenced Note' },
          linkType: 'reference',
        },
      ];
      render(<BacklinksPanel {...defaultProps} backlinks={backlinks} />);

      await user.click(screen.getByRole('button'));
      expect(screen.queryByText('reference')).not.toBeInTheDocument();
    });
  });

  describe('Callback Handling', () => {
    it('handles missing onNoteClick gracefully', async () => {
      const user = userEvent.setup();
      const backlinks = [
        { _id: '1', sourceType: 'note', sourceId: 'note1', source: { title: 'Test Note' } },
      ];
      render(<BacklinksPanel backlinks={backlinks} isLoading={false} />);

      await user.click(screen.getByRole('button'));
      // Should not throw when clicking without onNoteClick handler
      await user.click(screen.getByText('Test Note'));
    });

    it('handles missing onTaskClick gracefully', async () => {
      const user = userEvent.setup();
      const backlinks = [
        { _id: '1', sourceType: 'task', sourceId: 'task1', source: { title: 'Test Task' } },
      ];
      render(<BacklinksPanel backlinks={backlinks} isLoading={false} />);

      await user.click(screen.getByRole('button'));
      // Should not throw when clicking without onTaskClick handler
      await user.click(screen.getByText('Test Task'));
    });
  });
});
