/**
 * =============================================================================
 * FOCUSCARD.TEST.JSX - Tests for Focus Card Component
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import FocusCard from './FocusCard';

describe('FocusCard', () => {
  let originalDate;

  beforeEach(() => {
    originalDate = global.Date;
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  // Helper to mock current date/time
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

  describe('Empty State', () => {
    it('returns null when data is null', () => {
      const { container } = render(<FocusCard data={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('returns null when data is undefined', () => {
      const { container } = render(<FocusCard data={undefined} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Event Now', () => {
    it('shows "HAPPENING NOW" for event in progress', () => {
      mockDate('2024-01-25T10:30:00');

      const data = {
        events: {
          today: [{
            _id: '1',
            title: 'Team Meeting',
            startDate: '2024-01-25T10:00:00',
            endDate: '2024-01-25T11:00:00',
            location: 'Room A'
          }]
        },
        urgentItems: { upcomingEvents: [], overdueTasks: [], dueTodayTasks: [] }
      };

      render(<FocusCard data={data} />);

      expect(screen.getByText('HAPPENING NOW')).toBeInTheDocument();
      expect(screen.getByText('Team Meeting')).toBeInTheDocument();
      expect(screen.getByText('Room A')).toBeInTheDocument();
    });

    it('calls onEventClick when view event button clicked', async () => {
      mockDate('2024-01-25T10:30:00');
      const user = userEvent.setup();
      const onEventClick = vi.fn();

      const event = {
        _id: '1',
        title: 'Team Meeting',
        startDate: '2024-01-25T10:00:00',
        endDate: '2024-01-25T11:00:00'
      };

      const data = {
        events: { today: [event] },
        urgentItems: { upcomingEvents: [], overdueTasks: [], dueTodayTasks: [] }
      };

      render(<FocusCard data={data} onEventClick={onEventClick} />);

      await user.click(screen.getByText('View event'));
      expect(onEventClick).toHaveBeenCalledWith(event);
    });
  });

  describe('Event Starting Soon', () => {
    it('shows "STARTING IN X MIN" for event starting soon', () => {
      mockDate('2024-01-25T09:50:00');

      const data = {
        events: {
          today: [{
            _id: '1',
            title: 'Standup',
            startDate: '2024-01-25T10:00:00',
            endDate: '2024-01-25T10:15:00'
          }]
        },
        urgentItems: { upcomingEvents: [], overdueTasks: [], dueTodayTasks: [] }
      };

      render(<FocusCard data={data} />);

      expect(screen.getByText('STARTING IN 10 MIN')).toBeInTheDocument();
      expect(screen.getByText('Standup')).toBeInTheDocument();
    });

    it('prioritizes events in upcomingEvents', () => {
      mockDate('2024-01-25T09:50:00');

      const data = {
        events: { today: [] },
        urgentItems: {
          upcomingEvents: [{
            _id: '1',
            title: 'Important Meeting',
            startDate: '2024-01-25T10:00:00',
            endDate: '2024-01-25T10:30:00'
          }],
          overdueTasks: [],
          dueTodayTasks: []
        }
      };

      render(<FocusCard data={data} />);

      expect(screen.getByText('STARTING IN 10 MIN')).toBeInTheDocument();
      expect(screen.getByText('Important Meeting')).toBeInTheDocument();
    });
  });

  describe('Overdue Tasks', () => {
    it('shows overdue task when no imminent events', () => {
      mockDate('2024-01-25T10:00:00');

      const data = {
        events: { today: [] },
        urgentItems: {
          upcomingEvents: [],
          overdueTasks: [{
            _id: '1',
            title: 'Complete report',
            dueDate: '2024-01-24T10:00:00'
          }],
          dueTodayTasks: []
        }
      };

      render(<FocusCard data={data} />);

      expect(screen.getByText('OVERDUE')).toBeInTheDocument();
      expect(screen.getByText('Complete report')).toBeInTheDocument();
      expect(screen.getByText('1 day overdue')).toBeInTheDocument();
    });

    it('shows correct plural for multiple days overdue', () => {
      mockDate('2024-01-25T10:00:00');

      const data = {
        events: { today: [] },
        urgentItems: {
          upcomingEvents: [],
          overdueTasks: [{
            _id: '1',
            title: 'Old task',
            dueDate: '2024-01-22T10:00:00'
          }],
          dueTodayTasks: []
        }
      };

      render(<FocusCard data={data} />);

      expect(screen.getByText('3 days overdue')).toBeInTheDocument();
    });

    it('shows "Was due today" for items due today but past', () => {
      mockDate('2024-01-25T14:00:00');

      const data = {
        events: { today: [] },
        urgentItems: {
          upcomingEvents: [],
          overdueTasks: [{
            _id: '1',
            title: 'Morning task',
            dueDate: '2024-01-25T09:00:00'
          }],
          dueTodayTasks: []
        }
      };

      render(<FocusCard data={data} />);

      expect(screen.getByText('Was due today')).toBeInTheDocument();
    });

    it('shows badge for multiple overdue tasks', () => {
      mockDate('2024-01-25T10:00:00');

      const data = {
        events: { today: [] },
        urgentItems: {
          upcomingEvents: [],
          overdueTasks: [
            { _id: '1', title: 'Task 1', dueDate: '2024-01-24T10:00:00' },
            { _id: '2', title: 'Task 2', dueDate: '2024-01-24T10:00:00' },
            { _id: '3', title: 'Task 3', dueDate: '2024-01-24T10:00:00' }
          ],
          dueTodayTasks: []
        }
      };

      render(<FocusCard data={data} />);

      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });

    it('calls onTaskClick when handle now button clicked', async () => {
      mockDate('2024-01-25T10:00:00');
      const user = userEvent.setup();
      const onTaskClick = vi.fn();

      const task = {
        _id: '1',
        title: 'Overdue task',
        dueDate: '2024-01-24T10:00:00'
      };

      const data = {
        events: { today: [] },
        urgentItems: {
          upcomingEvents: [],
          overdueTasks: [task],
          dueTodayTasks: []
        }
      };

      render(<FocusCard data={data} onTaskClick={onTaskClick} />);

      await user.click(screen.getByText('Handle now'));
      expect(onTaskClick).toHaveBeenCalledWith(task);
    });
  });

  describe('Priority Task Due Today', () => {
    it('shows urgent priority task due today', () => {
      mockDate('2024-01-25T10:00:00');

      const data = {
        events: { today: [] },
        urgentItems: {
          upcomingEvents: [],
          overdueTasks: [],
          dueTodayTasks: [{
            _id: '1',
            title: 'Critical task',
            dueDate: '2024-01-25T17:00:00',
            priority: 'urgent'
          }]
        }
      };

      render(<FocusCard data={data} />);

      expect(screen.getByText('URGENT PRIORITY')).toBeInTheDocument();
      expect(screen.getByText('Critical task')).toBeInTheDocument();
      expect(screen.getByText('Due today')).toBeInTheDocument();
    });

    it('shows high priority task due today', () => {
      mockDate('2024-01-25T10:00:00');

      const data = {
        events: { today: [] },
        urgentItems: {
          upcomingEvents: [],
          overdueTasks: [],
          dueTodayTasks: [{
            _id: '1',
            title: 'Important task',
            dueDate: '2024-01-25T17:00:00',
            priority: 'high'
          }]
        }
      };

      render(<FocusCard data={data} />);

      expect(screen.getByText('HIGH PRIORITY')).toBeInTheDocument();
      expect(screen.getByText('Important task')).toBeInTheDocument();
    });

    it('calls onTaskClick when start task button clicked', async () => {
      mockDate('2024-01-25T10:00:00');
      const user = userEvent.setup();
      const onTaskClick = vi.fn();

      const task = {
        _id: '1',
        title: 'Priority task',
        dueDate: '2024-01-25T17:00:00',
        priority: 'urgent'
      };

      const data = {
        events: { today: [] },
        urgentItems: {
          upcomingEvents: [],
          overdueTasks: [],
          dueTodayTasks: [task]
        }
      };

      render(<FocusCard data={data} onTaskClick={onTaskClick} />);

      await user.click(screen.getByText('Start task'));
      expect(onTaskClick).toHaveBeenCalledWith(task);
    });
  });

  describe('Unread Messages', () => {
    it('shows unread messages notification', () => {
      const data = {
        events: { today: [] },
        urgentItems: {
          upcomingEvents: [],
          overdueTasks: [],
          dueTodayTasks: []
        },
        attentionItems: { unreadMessages: 3 },
        messages: [{ participants: [{ name: 'John' }] }]
      };

      render(<FocusCard data={data} />);

      expect(screen.getByText('UNREAD MESSAGES')).toBeInTheDocument();
      expect(screen.getByText('3 messages waiting')).toBeInTheDocument();
      expect(screen.getByText('From John')).toBeInTheDocument();
    });

    it('shows singular message for 1 unread', () => {
      const data = {
        events: { today: [] },
        urgentItems: {
          upcomingEvents: [],
          overdueTasks: [],
          dueTodayTasks: []
        },
        attentionItems: { unreadMessages: 1 }
      };

      render(<FocusCard data={data} />);

      expect(screen.getByText('1 message waiting')).toBeInTheDocument();
    });

    it('has link to messages page', () => {
      const data = {
        events: { today: [] },
        urgentItems: {
          upcomingEvents: [],
          overdueTasks: [],
          dueTodayTasks: []
        },
        attentionItems: { unreadMessages: 1 }
      };

      render(<FocusCard data={data} />);

      const link = screen.getByRole('link', { name: /view messages/i });
      expect(link).toHaveAttribute('href', '/app/messages');
    });
  });

  describe('Accomplishment', () => {
    it('shows completed tasks for the day', () => {
      const data = {
        events: { today: [] },
        urgentItems: {
          upcomingEvents: [],
          overdueTasks: [],
          dueTodayTasks: []
        },
        stats: { tasks: { completedToday: 5 } }
      };

      render(<FocusCard data={data} />);

      expect(screen.getByText("TODAY'S PROGRESS")).toBeInTheDocument();
      expect(screen.getByText('5 tasks completed')).toBeInTheDocument();
      expect(screen.getByText('Great work! Keep the momentum going.')).toBeInTheDocument();
    });

    it('shows singular task for 1 completed', () => {
      const data = {
        events: { today: [] },
        urgentItems: {
          upcomingEvents: [],
          overdueTasks: [],
          dueTodayTasks: []
        },
        stats: { tasks: { completedToday: 1 } }
      };

      render(<FocusCard data={data} />);

      expect(screen.getByText('1 task completed')).toBeInTheDocument();
    });
  });

  describe('Next Up', () => {
    it('shows next event when nothing else is urgent', () => {
      mockDate('2024-01-25T08:00:00');

      const data = {
        events: {
          today: [{
            _id: '1',
            title: 'Later Meeting',
            startDate: '2024-01-25T14:00:00',
            endDate: '2024-01-25T15:00:00'
          }]
        },
        urgentItems: {
          upcomingEvents: [],
          overdueTasks: [],
          dueTodayTasks: []
        }
      };

      render(<FocusCard data={data} />);

      expect(screen.getByText('NEXT UP')).toBeInTheDocument();
      expect(screen.getByText('Later Meeting')).toBeInTheDocument();
    });

    it('shows "All day" for all day events', () => {
      mockDate('2024-01-25T08:00:00');

      const data = {
        events: {
          today: [{
            _id: '1',
            title: 'All Day Event',
            startDate: '2024-01-25T00:00:00',
            allDay: true
          }]
        },
        urgentItems: {
          upcomingEvents: [],
          overdueTasks: [],
          dueTodayTasks: []
        }
      };

      render(<FocusCard data={data} />);

      expect(screen.getByText('All day')).toBeInTheDocument();
    });
  });

  describe('All Clear', () => {
    it('shows all clear state when nothing to show', () => {
      const data = {
        events: { today: [] },
        urgentItems: {
          upcomingEvents: [],
          overdueTasks: [],
          dueTodayTasks: []
        }
      };

      render(<FocusCard data={data} />);

      expect(screen.getByText('ALL CLEAR')).toBeInTheDocument();
      expect(screen.getByText("You're all caught up!")).toBeInTheDocument();
      expect(screen.getByText('No urgent items. Time to plan ahead or take a break.')).toBeInTheDocument();
    });
  });

  describe('Variant Styling', () => {
    it('applies urgent variant for overdue tasks', () => {
      mockDate('2024-01-25T10:00:00');

      const data = {
        events: { today: [] },
        urgentItems: {
          upcomingEvents: [],
          overdueTasks: [{ _id: '1', title: 'Task', dueDate: '2024-01-24T10:00:00' }],
          dueTodayTasks: []
        }
      };

      const { container } = render(<FocusCard data={data} />);
      expect(container.querySelector('.focus-card-urgent')).toBeInTheDocument();
    });

    it('applies event variant for happening now events', () => {
      mockDate('2024-01-25T10:30:00');

      const data = {
        events: {
          today: [{
            _id: '1',
            title: 'Meeting',
            startDate: '2024-01-25T10:00:00',
            endDate: '2024-01-25T11:00:00'
          }]
        },
        urgentItems: { upcomingEvents: [], overdueTasks: [], dueTodayTasks: [] }
      };

      const { container } = render(<FocusCard data={data} />);
      expect(container.querySelector('.focus-card-event')).toBeInTheDocument();
    });

    it('applies success variant for all clear', () => {
      const data = {
        events: { today: [] },
        urgentItems: {
          upcomingEvents: [],
          overdueTasks: [],
          dueTodayTasks: []
        }
      };

      const { container } = render(<FocusCard data={data} />);
      expect(container.querySelector('.focus-card-success')).toBeInTheDocument();
    });
  });
});
