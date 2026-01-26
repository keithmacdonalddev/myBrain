/**
 * =============================================================================
 * PROJECTSWIDGET.TEST.JSX - Tests for Projects Widget Component
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import ProjectsWidget from './ProjectsWidget';

describe('ProjectsWidget', () => {
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
      render(<ProjectsWidget />);
      expect(screen.getByText('Active Projects')).toBeInTheDocument();
    });

    it('renders projects link in footer', () => {
      render(<ProjectsWidget projects={[{ _id: '1', title: 'Project' }]} />);
      const link = screen.getByRole('link', { name: /view all projects/i });
      expect(link).toHaveAttribute('href', '/app/projects');
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading', () => {
      const { container } = render(<ProjectsWidget isLoading={true} />);
      expect(container.querySelector('.widget-loading')).toBeInTheDocument();
    });

    it('shows title during loading', () => {
      render(<ProjectsWidget isLoading={true} />);
      expect(screen.getByText('Active Projects')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no projects', () => {
      render(<ProjectsWidget projects={[]} />);

      expect(screen.getByText('No active projects')).toBeInTheDocument();
      expect(screen.getByText('Create a project to track your goals.')).toBeInTheDocument();
    });
  });

  describe('Projects Display', () => {
    it('displays project titles', () => {
      const projects = [
        { _id: '1', title: 'Project Alpha' },
        { _id: '2', title: 'Project Beta' }
      ];

      render(<ProjectsWidget projects={projects} />);

      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
      expect(screen.getByText('Project Beta')).toBeInTheDocument();
    });

    it('displays project count badge', () => {
      const projects = [
        { _id: '1', title: 'Project 1' },
        { _id: '2', title: 'Project 2' }
      ];

      render(<ProjectsWidget projects={projects} />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('limits displayed projects to 4', () => {
      const projects = Array.from({ length: 6 }, (_, i) => ({
        _id: String(i + 1),
        title: `Project ${i + 1}`
      }));

      render(<ProjectsWidget projects={projects} />);

      expect(screen.getByText('Project 1')).toBeInTheDocument();
      expect(screen.getByText('Project 4')).toBeInTheDocument();
      expect(screen.queryByText('Project 5')).not.toBeInTheDocument();
    });
  });

  describe('Project Progress', () => {
    it('displays progress percentage', () => {
      const projects = [
        { _id: '1', title: 'Project', progress: 75 }
      ];

      render(<ProjectsWidget projects={projects} />);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('calculates progress from task counts', () => {
      const projects = [
        {
          _id: '1',
          title: 'Project',
          taskCounts: { total: 10, completed: 5 }
        }
      ];

      render(<ProjectsWidget projects={projects} />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('shows 0% when no tasks completed', () => {
      const projects = [
        {
          _id: '1',
          title: 'Project',
          taskCounts: { total: 10, completed: 0 }
        }
      ];

      render(<ProjectsWidget projects={projects} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('handles progress as object with percentage', () => {
      const projects = [
        {
          _id: '1',
          title: 'Project',
          progress: { percentage: 60 }
        }
      ];

      render(<ProjectsWidget projects={projects} />);
      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    it('displays progress bar', () => {
      const projects = [
        { _id: '1', title: 'Project', progress: 50 }
      ];

      const { container } = render(<ProjectsWidget projects={projects} />);

      const progressBar = container.querySelector('[style*="width: 50%"]');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Task Counts', () => {
    it('displays task completion count', () => {
      const projects = [
        {
          _id: '1',
          title: 'Project',
          taskCounts: { total: 20, completed: 15 }
        }
      ];

      render(<ProjectsWidget projects={projects} />);
      expect(screen.getByText('15/20 tasks')).toBeInTheDocument();
    });

    it('shows 0/0 when no task counts', () => {
      const projects = [
        { _id: '1', title: 'Project' }
      ];

      render(<ProjectsWidget projects={projects} />);
      expect(screen.getByText('0/0 tasks')).toBeInTheDocument();
    });
  });

  describe('Project Color', () => {
    it('displays project color indicator', () => {
      const projects = [
        { _id: '1', title: 'Project', color: '#ff5722' }
      ];

      const { container } = render(<ProjectsWidget projects={projects} />);

      const colorIndicator = container.querySelector('[style*="background-color"]');
      expect(colorIndicator).toBeInTheDocument();
    });

    it('does not show color indicator when no color set', () => {
      const projects = [
        { _id: '1', title: 'Project' }
      ];

      const { container } = render(<ProjectsWidget projects={projects} />);

      const colorIndicators = container.querySelectorAll('.rounded-full[style*="background-color"]');
      expect(colorIndicators.length).toBe(0);
    });
  });

  describe('Project Deadline', () => {
    it('shows "Overdue" for past deadlines', () => {
      mockDate('2024-01-25T10:00:00');

      const projects = [
        { _id: '1', title: 'Project', deadline: '2024-01-20T10:00:00' }
      ];

      render(<ProjectsWidget projects={projects} />);
      expect(screen.getByText('Overdue')).toBeInTheDocument();
    });

    it('shows "Due today" for today deadlines', () => {
      mockDate('2024-01-25T10:00:00');

      // Deadline must be within 0-1 day difference to get "Due today"
      // Using a time slightly before "now" ensures diffDays rounds to 0
      const projects = [
        { _id: '1', title: 'Project', deadline: '2024-01-25T09:00:00' }
      ];

      render(<ProjectsWidget projects={projects} />);
      expect(screen.getByText('Due today')).toBeInTheDocument();
    });

    it('shows "Due tomorrow" for tomorrow deadlines', () => {
      mockDate('2024-01-25T10:00:00');

      const projects = [
        { _id: '1', title: 'Project', deadline: '2024-01-26T10:00:00' }
      ];

      render(<ProjectsWidget projects={projects} />);
      expect(screen.getByText('Due tomorrow')).toBeInTheDocument();
    });

    it('shows days left for upcoming deadlines', () => {
      mockDate('2024-01-25T10:00:00');

      const projects = [
        { _id: '1', title: 'Project', deadline: '2024-01-30T10:00:00' }
      ];

      render(<ProjectsWidget projects={projects} />);
      expect(screen.getByText('5 days left')).toBeInTheDocument();
    });

    it('shows formatted date for far future deadlines', () => {
      mockDate('2024-01-25T10:00:00');

      const projects = [
        { _id: '1', title: 'Project', deadline: '2024-03-15T10:00:00' }
      ];

      render(<ProjectsWidget projects={projects} />);
      expect(screen.getByText('Mar 15')).toBeInTheDocument();
    });

    it('does not show deadline when not set', () => {
      const projects = [
        { _id: '1', title: 'Project' }
      ];

      render(<ProjectsWidget projects={projects} />);
      expect(screen.queryByText(/due|overdue|days/i)).not.toBeInTheDocument();
    });

    it('applies danger color to overdue deadlines', () => {
      mockDate('2024-01-25T10:00:00');

      const projects = [
        { _id: '1', title: 'Project', deadline: '2024-01-20T10:00:00' }
      ];

      const { container } = render(<ProjectsWidget projects={projects} />);
      expect(container.querySelector('.text-danger')).toBeInTheDocument();
    });

    it('applies warning color to today/tomorrow deadlines', () => {
      mockDate('2024-01-25T10:00:00');

      const projects = [
        { _id: '1', title: 'Project', deadline: '2024-01-25T23:59:59' }
      ];

      const { container } = render(<ProjectsWidget projects={projects} />);
      expect(container.querySelector('.text-warning')).toBeInTheDocument();
    });
  });

  describe('Project Click Handler', () => {
    it('calls onProjectClick when project is clicked', async () => {
      const user = userEvent.setup();
      const onProjectClick = vi.fn();

      const project = { _id: '1', title: 'Clickable Project' };

      render(<ProjectsWidget projects={[project]} onProjectClick={onProjectClick} />);

      await user.click(screen.getByText('Clickable Project'));
      expect(onProjectClick).toHaveBeenCalledWith(project);
    });

    it('has hover effect on project card', () => {
      const projects = [
        { _id: '1', title: 'Project' }
      ];

      const { container } = render(<ProjectsWidget projects={projects} />);

      const card = container.querySelector('.cursor-pointer');
      expect(card).toBeInTheDocument();
    });
  });
});
