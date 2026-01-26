/**
 * =============================================================================
 * TASKSWIDGET.TEST.JSX - Tests for Tasks Widget Component
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import TasksWidget from './TasksWidget';

describe('TasksWidget', () => {
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
      render(<TasksWidget />);
      expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
    });

    it('renders tasks link in footer', () => {
      render(<TasksWidget overdueTasks={[{ _id: '1', title: 'Task', dueDate: '2024-01-24T10:00:00' }]} />);
      const link = screen.getByRole('link', { name: /view all tasks/i });
      expect(link).toHaveAttribute('href', '/app/tasks');
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading', () => {
      const { container } = render(<TasksWidget isLoading={true} />);
      expect(container.querySelector('.widget-loading')).toBeInTheDocument();
    });

    it('shows title during loading', () => {
      render(<TasksWidget isLoading={true} />);
      expect(screen.getByText("Today's Tasks")).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no tasks', () => {
      render(<TasksWidget overdueTasks={[]} dueTodayTasks={[]} />);

      expect(screen.getByText('All caught up!')).toBeInTheDocument();
      expect(screen.getByText('No tasks due today.')).toBeInTheDocument();
    });
  });

  describe('Overdue Tasks Section', () => {
    it('displays overdue tasks', () => {
      mockDate('2024-01-25T10:00:00');

      const overdueTasks = [
        { _id: '1', title: 'Overdue Task 1', dueDate: '2024-01-24T10:00:00' },
        { _id: '2', title: 'Overdue Task 2', dueDate: '2024-01-23T10:00:00' }
      ];

      render(<TasksWidget overdueTasks={overdueTasks} />);

      expect(screen.getByText('OVERDUE (2)')).toBeInTheDocument();
      expect(screen.getByText('Overdue Task 1')).toBeInTheDocument();
      expect(screen.getByText('Overdue Task 2')).toBeInTheDocument();
    });

    it('shows days overdue for each task', () => {
      mockDate('2024-01-25T10:00:00');

      const overdueTasks = [
        { _id: '1', title: 'Task', dueDate: '2024-01-24T10:00:00' }
      ];

      render(<TasksWidget overdueTasks={overdueTasks} />);
      expect(screen.getByText('1 day overdue')).toBeInTheDocument();
    });

    it('shows correct plural for multiple days overdue', () => {
      mockDate('2024-01-25T10:00:00');

      const overdueTasks = [
        { _id: '1', title: 'Task', dueDate: '2024-01-22T10:00:00' }
      ];

      render(<TasksWidget overdueTasks={overdueTasks} />);
      expect(screen.getByText('3 days overdue')).toBeInTheDocument();
    });

    it('shows overdue badge in header', () => {
      const overdueTasks = [
        { _id: '1', title: 'Task', dueDate: '2024-01-24T10:00:00' }
      ];

      render(<TasksWidget overdueTasks={overdueTasks} />);
      expect(screen.getByText('1 overdue')).toBeInTheDocument();
    });

    it('limits displayed overdue tasks to 3', () => {
      const overdueTasks = Array.from({ length: 5 }, (_, i) => ({
        _id: String(i + 1),
        title: `Overdue Task ${i + 1}`,
        dueDate: '2024-01-24T10:00:00'
      }));

      render(<TasksWidget overdueTasks={overdueTasks} />);

      expect(screen.getByText('Overdue Task 1')).toBeInTheDocument();
      expect(screen.getByText('Overdue Task 3')).toBeInTheDocument();
      expect(screen.queryByText('Overdue Task 4')).not.toBeInTheDocument();
    });
  });

  describe('Due Today Section', () => {
    it('displays tasks due today', () => {
      mockDate('2024-01-25T10:00:00');

      const dueTodayTasks = [
        { _id: '1', title: 'Task Due Today', dueDate: '2024-01-25T17:00:00' }
      ];

      render(<TasksWidget dueTodayTasks={dueTodayTasks} />);

      expect(screen.getByText('DUE TODAY (1)')).toBeInTheDocument();
      expect(screen.getByText('Task Due Today')).toBeInTheDocument();
    });

    it('shows due time for tasks with specific time', () => {
      mockDate('2024-01-25T10:00:00');

      const dueTodayTasks = [
        { _id: '1', title: 'Task', dueDate: '2024-01-25T14:30:00' }
      ];

      render(<TasksWidget dueTodayTasks={dueTodayTasks} />);
      expect(screen.getByText('2:30 PM')).toBeInTheDocument();
    });

    it('shows "Today" for tasks without specific time', () => {
      mockDate('2024-01-25T10:00:00');

      const dueTodayTasks = [
        { _id: '1', title: 'Task', dueDate: '2024-01-25T00:00:00' }
      ];

      render(<TasksWidget dueTodayTasks={dueTodayTasks} />);
      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('limits displayed today tasks to 3', () => {
      const dueTodayTasks = Array.from({ length: 5 }, (_, i) => ({
        _id: String(i + 1),
        title: `Today Task ${i + 1}`,
        dueDate: '2024-01-25T10:00:00'
      }));

      render(<TasksWidget dueTodayTasks={dueTodayTasks} />);

      expect(screen.getByText('Today Task 1')).toBeInTheDocument();
      expect(screen.getByText('Today Task 3')).toBeInTheDocument();
      expect(screen.queryByText('Today Task 4')).not.toBeInTheDocument();
    });
  });

  describe('Task Priority Indicator', () => {
    it('shows priority dot for urgent tasks', () => {
      const overdueTasks = [
        { _id: '1', title: 'Urgent Task', dueDate: '2024-01-24T10:00:00', priority: 'urgent' }
      ];

      const { container } = render(<TasksWidget overdueTasks={overdueTasks} />);
      expect(container.querySelector('.bg-red-500')).toBeInTheDocument();
    });

    it('shows priority dot for high priority tasks', () => {
      const overdueTasks = [
        { _id: '1', title: 'High Priority', dueDate: '2024-01-24T10:00:00', priority: 'high' }
      ];

      const { container } = render(<TasksWidget overdueTasks={overdueTasks} />);
      expect(container.querySelector('.bg-orange-500')).toBeInTheDocument();
    });

    it('shows priority dot for medium priority tasks', () => {
      const overdueTasks = [
        { _id: '1', title: 'Medium Priority', dueDate: '2024-01-24T10:00:00', priority: 'medium' }
      ];

      const { container } = render(<TasksWidget overdueTasks={overdueTasks} />);
      expect(container.querySelector('.bg-yellow-500')).toBeInTheDocument();
    });
  });

  describe('Task Status Toggle', () => {
    it('shows uncompleted checkbox for pending tasks', () => {
      const dueTodayTasks = [
        { _id: '1', title: 'Task', dueDate: '2024-01-25T10:00:00', status: 'todo' }
      ];

      const { container } = render(<TasksWidget dueTodayTasks={dueTodayTasks} />);

      const checkbox = container.querySelector('button.rounded-full');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toHaveClass('bg-green-500');
    });

    it('shows completed checkbox for done tasks', () => {
      const dueTodayTasks = [
        { _id: '1', title: 'Task', dueDate: '2024-01-25T10:00:00', status: 'done' }
      ];

      const { container } = render(<TasksWidget dueTodayTasks={dueTodayTasks} />);

      const checkbox = container.querySelector('.bg-green-500');
      expect(checkbox).toBeInTheDocument();
    });

    it('calls onToggleStatus when checkbox clicked', async () => {
      const user = userEvent.setup();
      const onToggleStatus = vi.fn();

      const dueTodayTasks = [
        { _id: '1', title: 'Task', dueDate: '2024-01-25T10:00:00', status: 'todo' }
      ];

      const { container } = render(
        <TasksWidget dueTodayTasks={dueTodayTasks} onToggleStatus={onToggleStatus} />
      );

      const checkbox = container.querySelector('button.rounded-full');
      await user.click(checkbox);

      expect(onToggleStatus).toHaveBeenCalledWith('1', 'done');
    });

    it('toggles from done to todo when clicking completed task', async () => {
      const user = userEvent.setup();
      const onToggleStatus = vi.fn();

      const dueTodayTasks = [
        { _id: '1', title: 'Task', dueDate: '2024-01-25T10:00:00', status: 'done' }
      ];

      const { container } = render(
        <TasksWidget dueTodayTasks={dueTodayTasks} onToggleStatus={onToggleStatus} />
      );

      const checkbox = container.querySelector('button.rounded-full.bg-green-500');
      await user.click(checkbox);

      expect(onToggleStatus).toHaveBeenCalledWith('1', 'todo');
    });

    it('applies line-through style to completed task titles', () => {
      const dueTodayTasks = [
        { _id: '1', title: 'Completed Task', dueDate: '2024-01-25T10:00:00', status: 'done' }
      ];

      const { container } = render(<TasksWidget dueTodayTasks={dueTodayTasks} />);

      const titleElement = container.querySelector('.line-through');
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveTextContent('Completed Task');
    });
  });

  describe('Task Click Handler', () => {
    it('calls onTaskClick when task row is clicked', async () => {
      const user = userEvent.setup();
      const onTaskClick = vi.fn();

      const task = { _id: '1', title: 'Clickable Task', dueDate: '2024-01-25T10:00:00' };

      render(<TasksWidget dueTodayTasks={[task]} onTaskClick={onTaskClick} />);

      await user.click(screen.getByText('Clickable Task'));
      expect(onTaskClick).toHaveBeenCalledWith(task);
    });

    it('does not trigger task click when checkbox is clicked', async () => {
      const user = userEvent.setup();
      const onTaskClick = vi.fn();
      const onToggleStatus = vi.fn();

      const task = { _id: '1', title: 'Task', dueDate: '2024-01-25T10:00:00', status: 'todo' };

      const { container } = render(
        <TasksWidget
          dueTodayTasks={[task]}
          onTaskClick={onTaskClick}
          onToggleStatus={onToggleStatus}
        />
      );

      const checkbox = container.querySelector('button.rounded-full');
      await user.click(checkbox);

      expect(onToggleStatus).toHaveBeenCalled();
      // onTaskClick should not be called when clicking checkbox
    });
  });

  describe('Both Sections', () => {
    it('shows both overdue and today sections when both exist', () => {
      mockDate('2024-01-25T10:00:00');

      const overdueTasks = [
        { _id: '1', title: 'Overdue', dueDate: '2024-01-24T10:00:00' }
      ];
      const dueTodayTasks = [
        { _id: '2', title: 'Today', dueDate: '2024-01-25T10:00:00' }
      ];

      render(<TasksWidget overdueTasks={overdueTasks} dueTodayTasks={dueTodayTasks} />);

      expect(screen.getByText('OVERDUE (1)')).toBeInTheDocument();
      expect(screen.getByText('DUE TODAY (1)')).toBeInTheDocument();
      expect(screen.getByText('Overdue')).toBeInTheDocument();
      expect(screen.getByText('Today')).toBeInTheDocument();
    });
  });
});
