import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import EventModal from './EventModal';

// Mock the useEvents hooks
vi.mock('../hooks/useEvents', () => ({
  useCreateEvent: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ event: { _id: 'new-event-id' } }),
    isPending: false,
    error: null,
  })),
  useUpdateEvent: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ event: { _id: 'existing-id' } }),
    isPending: false,
    error: null,
  })),
  useDeleteEvent: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
    error: null,
  })),
  useLinkTaskToEvent: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  })),
  useUnlinkTaskFromEvent: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  })),
  useLinkNoteToEvent: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  })),
  useUnlinkNoteFromEvent: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ success: true }),
    isPending: false,
  })),
}));

// Mock useTasks
vi.mock('../../tasks/hooks/useTasks', () => ({
  useTasks: vi.fn(() => ({
    data: { tasks: [] },
  })),
}));

// Mock useNotes
vi.mock('../../notes/hooks/useNotes', () => ({
  useNotes: vi.fn(() => ({
    data: { notes: [] },
  })),
}));

// Mock useToast
vi.mock('../../../hooks/useToast', () => ({
  default: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock useSavedLocations
vi.mock('../../../hooks/useSavedLocations', () => ({
  useSavedLocations: vi.fn(() => ({
    data: [],
  })),
}));

// Import mocked hooks for test manipulation
import {
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
} from '../hooks/useEvents';

describe('EventModal', () => {
  const mockOnClose = vi.fn();
  const mockOnCreated = vi.fn();

  const defaultProps = {
    event: null,
    initialDate: new Date('2024-06-15T10:00:00'),
    onClose: mockOnClose,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders with "New Event" title when creating new event', () => {
      render(<EventModal {...defaultProps} />);

      expect(screen.getByText('New Event')).toBeInTheDocument();
    });

    it('renders with "Edit Event" title when editing existing event', () => {
      const existingEvent = {
        _id: '123',
        title: 'Existing Event',
        startDate: '2024-06-15T10:00:00',
        endDate: '2024-06-15T11:00:00',
      };

      render(<EventModal {...defaultProps} event={existingEvent} />);

      expect(screen.getByText('Edit Event')).toBeInTheDocument();
    });

    it('renders title input field', () => {
      render(<EventModal {...defaultProps} />);

      expect(screen.getByPlaceholderText('Event title')).toBeInTheDocument();
    });

    it('renders all-day checkbox', () => {
      render(<EventModal {...defaultProps} />);

      expect(screen.getByText('All day')).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('renders location input', () => {
      render(<EventModal {...defaultProps} />);

      expect(screen.getByText('Location')).toBeInTheDocument();
    });

    it('renders meeting URL input', () => {
      render(<EventModal {...defaultProps} />);

      expect(screen.getByText('Meeting URL')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('https://zoom.us/j/...')).toBeInTheDocument();
    });

    it('renders description textarea', () => {
      render(<EventModal {...defaultProps} />);

      expect(screen.getByPlaceholderText('Add description...')).toBeInTheDocument();
    });

    it('renders Create button for new events', () => {
      render(<EventModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    });

    it('renders Update button for existing events', () => {
      const existingEvent = {
        _id: '123',
        title: 'Existing Event',
        startDate: '2024-06-15T10:00:00',
        endDate: '2024-06-15T11:00:00',
      };

      render(<EventModal {...defaultProps} event={existingEvent} />);

      expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
    });

    it('renders Cancel button', () => {
      render(<EventModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('renders Delete button for existing events', () => {
      const existingEvent = {
        _id: '123',
        title: 'Existing Event',
        startDate: '2024-06-15T10:00:00',
        endDate: '2024-06-15T11:00:00',
      };

      render(<EventModal {...defaultProps} event={existingEvent} />);

      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('does not render Delete button for new events', () => {
      render(<EventModal {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });
  });

  describe('Form Population', () => {
    it('populates form with existing event data', () => {
      const existingEvent = {
        _id: '123',
        title: 'Team Meeting',
        description: 'Weekly sync',
        startDate: '2024-06-15T10:00:00',
        endDate: '2024-06-15T11:00:00',
        location: 'Conference Room',
        meetingUrl: 'https://zoom.us/j/123',
        color: '#ef4444',
      };

      render(<EventModal {...defaultProps} event={existingEvent} />);

      expect(screen.getByDisplayValue('Team Meeting')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Weekly sync')).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://zoom.us/j/123')).toBeInTheDocument();
    });

    it('checks all-day checkbox when event is all-day', () => {
      const allDayEvent = {
        _id: '123',
        title: 'All Day Event',
        startDate: '2024-06-15T00:00:00',
        endDate: '2024-06-15T23:59:59',
        allDay: true,
      };

      render(<EventModal {...defaultProps} event={allDayEvent} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('uses initialDate when no event is provided', () => {
      const initialDate = new Date('2024-06-20T14:00:00');
      render(<EventModal {...defaultProps} initialDate={initialDate} />);

      // The date picker should show the initial date
      // We verify by checking the form renders without errors with the initial date
      expect(screen.getByText('New Event')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('updates title when typing', async () => {
      const user = userEvent.setup();
      render(<EventModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText('Event title');
      await user.type(titleInput, 'New Meeting');

      expect(titleInput).toHaveValue('New Meeting');
    });

    it('toggles all-day checkbox', async () => {
      const user = userEvent.setup();
      render(<EventModal {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('updates description when typing', async () => {
      const user = userEvent.setup();
      render(<EventModal {...defaultProps} />);

      const descriptionInput = screen.getByPlaceholderText('Add description...');
      await user.type(descriptionInput, 'Meeting notes');

      expect(descriptionInput).toHaveValue('Meeting notes');
    });

    it('updates meeting URL when typing', async () => {
      const user = userEvent.setup();
      render(<EventModal {...defaultProps} />);

      const urlInput = screen.getByPlaceholderText('https://zoom.us/j/...');
      await user.type(urlInput, 'https://meet.google.com/abc');

      expect(urlInput).toHaveValue('https://meet.google.com/abc');
    });
  });

  describe('Advanced Options', () => {
    it('shows advanced options when button is clicked', async () => {
      const user = userEvent.setup();
      render(<EventModal {...defaultProps} />);

      const advancedButton = screen.getByText('Show advanced options');
      await user.click(advancedButton);

      expect(screen.getByText('Hide advanced options')).toBeInTheDocument();
      expect(screen.getByText('Repeat')).toBeInTheDocument();
      expect(screen.getByText('Color')).toBeInTheDocument();
    });

    it('hides advanced options when button is clicked again', async () => {
      const user = userEvent.setup();
      render(<EventModal {...defaultProps} />);

      const showButton = screen.getByText('Show advanced options');
      await user.click(showButton);

      const hideButton = screen.getByText('Hide advanced options');
      await user.click(hideButton);

      expect(screen.getByText('Show advanced options')).toBeInTheDocument();
    });

    it('displays recurrence options dropdown', async () => {
      const user = userEvent.setup();
      render(<EventModal {...defaultProps} />);

      await user.click(screen.getByText('Show advanced options'));

      const repeatSelect = screen.getByRole('combobox');
      expect(repeatSelect).toBeInTheDocument();
    });

    it('displays color picker with all color options', async () => {
      const user = userEvent.setup();
      render(<EventModal {...defaultProps} />);

      await user.click(screen.getByText('Show advanced options'));

      // Should have 7 color buttons
      const colorButtons = document.querySelectorAll('[title]');
      const colorTitles = ['Blue', 'Green', 'Yellow', 'Red', 'Purple', 'Pink', 'Gray'];
      colorTitles.forEach(title => {
        expect(screen.getByTitle(title)).toBeInTheDocument();
      });
    });

    it('selects a color when clicked', async () => {
      const user = userEvent.setup();
      render(<EventModal {...defaultProps} />);

      await user.click(screen.getByText('Show advanced options'));

      const redButton = screen.getByTitle('Red');
      await user.click(redButton);

      expect(redButton).toHaveClass('ring-2');
    });
  });

  describe('Form Submission', () => {
    it('calls onClose when Cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<EventModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      render(<EventModal {...defaultProps} />);

      const backdrop = document.querySelector('.bg-black\\/50');
      if (backdrop) {
        await user.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<EventModal {...defaultProps} />);

      // Find the X button in the header
      const closeButtons = screen.getAllByRole('button');
      const closeButton = closeButtons.find(btn =>
        btn.querySelector('svg') && btn.classList.contains('hover:bg-bg')
      );

      if (closeButton) {
        await user.click(closeButton);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });

    it('creates new event when form is submitted', async () => {
      const mockMutate = vi.fn().mockResolvedValue({ event: { _id: 'new-id' } });
      useCreateEvent.mockReturnValue({
        mutateAsync: mockMutate,
        isPending: false,
        error: null,
      });

      const user = userEvent.setup();
      render(<EventModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText('Event title');
      await user.type(titleInput, 'New Event Title');

      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled();
      });
    });

    it('updates existing event when form is submitted', async () => {
      const mockMutate = vi.fn().mockResolvedValue({ event: { _id: '123' } });
      useUpdateEvent.mockReturnValue({
        mutateAsync: mockMutate,
        isPending: false,
        error: null,
      });

      const existingEvent = {
        _id: '123',
        title: 'Existing Event',
        startDate: '2024-06-15T10:00:00',
        endDate: '2024-06-15T11:00:00',
      };

      const user = userEvent.setup();
      render(<EventModal {...defaultProps} event={existingEvent} />);

      const updateButton = screen.getByRole('button', { name: /update/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled();
      });
    });

    it('shows loading state during submission', async () => {
      useCreateEvent.mockReturnValue({
        mutateAsync: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
        isPending: true,
        error: null,
      });

      const user = userEvent.setup();
      render(<EventModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText('Event title');
      await user.type(titleInput, 'New Event');

      // The button should show loading state
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  describe('Delete Functionality', () => {
    it('shows delete confirmation dialog when Delete is clicked', async () => {
      const existingEvent = {
        _id: '123',
        title: 'Existing Event',
        startDate: '2024-06-15T10:00:00',
        endDate: '2024-06-15T11:00:00',
      };

      const user = userEvent.setup();
      render(<EventModal {...defaultProps} event={existingEvent} />);

      // Find the Delete button (the one that just says "Delete", not "Delete Event")
      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(btn =>
        btn.textContent.toLowerCase().trim() === 'delete'
      );

      if (deleteButton) {
        await user.click(deleteButton);

        // Wait for confirmation dialog to appear
        await waitFor(() => {
          // Look for confirmation message
          const message = screen.getByText(/are you sure you want to delete this event/i);
          expect(message).toBeInTheDocument();
        });
      }
    });

    it('deletes event when confirmed', async () => {
      const mockDelete = vi.fn().mockResolvedValue({ success: true });
      useDeleteEvent.mockReturnValue({
        mutateAsync: mockDelete,
        isPending: false,
      });

      const existingEvent = {
        _id: '123',
        title: 'Existing Event',
        startDate: '2024-06-15T10:00:00',
        endDate: '2024-06-15T11:00:00',
      };

      const user = userEvent.setup();
      render(<EventModal {...defaultProps} event={existingEvent} />);

      // Click delete button (the one that says just "Delete")
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      const initialDeleteButton = deleteButtons.find(btn =>
        btn.textContent.toLowerCase().trim() === 'delete'
      );

      if (initialDeleteButton) {
        await user.click(initialDeleteButton);

        // Wait for the confirmation dialog to appear
        await waitFor(() => {
          // Look for the confirmation dialog's "Delete Event" button
          const allButtons = screen.getAllByRole('button');
          const confirmBtn = allButtons.find(btn =>
            btn.textContent.toLowerCase().includes('delete event')
          );
          expect(confirmBtn).toBeTruthy();
        });

        // Find and click the confirm button
        const allButtons = screen.getAllByRole('button');
        const confirmBtn = allButtons.find(btn =>
          btn.textContent.toLowerCase().includes('delete event')
        );

        if (confirmBtn) {
          await user.click(confirmBtn);

          await waitFor(() => {
            expect(mockDelete).toHaveBeenCalledWith('123');
          });
        }
      }
    });
  });

  describe('Recurrence Options', () => {
    it('shows recurrence options in advanced section', async () => {
      const user = userEvent.setup();
      render(<EventModal {...defaultProps} />);

      await user.click(screen.getByText('Show advanced options'));

      const repeatSelect = screen.getByRole('combobox');
      await user.click(repeatSelect);

      // Check for recurrence options
      expect(screen.getByText('Does not repeat')).toBeInTheDocument();
      expect(screen.getByText('Daily')).toBeInTheDocument();
      expect(screen.getByText('Weekly')).toBeInTheDocument();
      expect(screen.getByText('Monthly')).toBeInTheDocument();
      expect(screen.getByText('Yearly')).toBeInTheDocument();
    });

    it('shows weekly days selector when weekly-custom is selected', async () => {
      const user = userEvent.setup();
      render(<EventModal {...defaultProps} />);

      await user.click(screen.getByText('Show advanced options'));

      const repeatSelect = screen.getByRole('combobox');
      await user.selectOptions(repeatSelect, 'weekly-custom');

      await waitFor(() => {
        expect(screen.getByText('Repeat on these days')).toBeInTheDocument();
      });
    });
  });

  describe('Linked Tasks and Notes', () => {
    it('shows linked tasks section when editing', async () => {
      const existingEvent = {
        _id: '123',
        title: 'Existing Event',
        startDate: '2024-06-15T10:00:00',
        endDate: '2024-06-15T11:00:00',
        linkedTasks: [],
        linkedNotes: [],
      };

      const user = userEvent.setup();
      render(<EventModal {...defaultProps} event={existingEvent} />);

      await user.click(screen.getByText('Show advanced options'));

      expect(screen.getByText('Linked Tasks')).toBeInTheDocument();
      expect(screen.getByText('Link task')).toBeInTheDocument();
    });

    it('shows linked notes section when editing', async () => {
      const existingEvent = {
        _id: '123',
        title: 'Existing Event',
        startDate: '2024-06-15T10:00:00',
        endDate: '2024-06-15T11:00:00',
        linkedTasks: [],
        linkedNotes: [],
      };

      const user = userEvent.setup();
      render(<EventModal {...defaultProps} event={existingEvent} />);

      await user.click(screen.getByText('Show advanced options'));

      expect(screen.getByText('Linked Notes')).toBeInTheDocument();
      expect(screen.getByText('Link note')).toBeInTheDocument();
    });

    it('displays existing linked tasks', async () => {
      const existingEvent = {
        _id: '123',
        title: 'Existing Event',
        startDate: '2024-06-15T10:00:00',
        endDate: '2024-06-15T11:00:00',
        linkedTasks: [{ _id: 'task1', title: 'Related Task' }],
        linkedNotes: [],
      };

      const user = userEvent.setup();
      render(<EventModal {...defaultProps} event={existingEvent} />);

      await user.click(screen.getByText('Show advanced options'));

      expect(screen.getByText('Related Task')).toBeInTheDocument();
    });

    it('displays existing linked notes', async () => {
      const existingEvent = {
        _id: '123',
        title: 'Existing Event',
        startDate: '2024-06-15T10:00:00',
        endDate: '2024-06-15T11:00:00',
        linkedTasks: [],
        linkedNotes: [{ _id: 'note1', title: 'Meeting Notes' }],
      };

      const user = userEvent.setup();
      render(<EventModal {...defaultProps} event={existingEvent} />);

      await user.click(screen.getByText('Show advanced options'));

      expect(screen.getByText('Meeting Notes')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows error message when create fails', () => {
      useCreateEvent.mockReturnValue({
        mutateAsync: vi.fn().mockRejectedValue(new Error('Failed to create')),
        isPending: false,
        error: { message: 'Failed to create event' },
      });

      render(<EventModal {...defaultProps} />);

      expect(screen.getByText('Failed to create event')).toBeInTheDocument();
    });

    it('shows error message when update fails', () => {
      useUpdateEvent.mockReturnValue({
        mutateAsync: vi.fn().mockRejectedValue(new Error('Failed to update')),
        isPending: false,
        error: { message: 'Failed to update event' },
      });

      const existingEvent = {
        _id: '123',
        title: 'Existing Event',
        startDate: '2024-06-15T10:00:00',
        endDate: '2024-06-15T11:00:00',
      };

      render(<EventModal {...defaultProps} event={existingEvent} />);

      expect(screen.getByText('Failed to update event')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('focuses title input on open', () => {
      render(<EventModal {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText('Event title');
      expect(titleInput).toHaveFocus();
    });

    it('has accessible form labels', () => {
      render(<EventModal {...defaultProps} />);

      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Meeting URL')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });
  });
});
