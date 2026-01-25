/**
 * =============================================================================
 * STATSWIDGET.TEST.JSX - Tests for Stats Widget Component
 * =============================================================================
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/utils';
import StatsWidget from './StatsWidget';

describe('StatsWidget', () => {
  describe('Basic Rendering', () => {
    it('renders widget title', () => {
      render(<StatsWidget />);
      expect(screen.getByText('Your Progress')).toBeInTheDocument();
    });

    it('renders subtitle', () => {
      render(<StatsWidget />);
      expect(screen.getByText('Tasks & Projects')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading', () => {
      const { container } = render(<StatsWidget isLoading={true} />);
      expect(container.querySelector('.widget-loading')).toBeInTheDocument();
    });

    it('shows title during loading', () => {
      render(<StatsWidget isLoading={true} />);
      expect(screen.getByText('Your Progress')).toBeInTheDocument();
    });
  });

  describe('Stats Display', () => {
    const stats = {
      tasks: {
        completedToday: 5,
        completedThisWeek: 23,
        totalActive: 12,
        overdue: 3
      },
      projects: {
        active: 4,
        completedThisMonth: 2
      }
    };

    it('displays completed today count', () => {
      render(<StatsWidget stats={stats} />);
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Completed Today')).toBeInTheDocument();
    });

    it('displays this week count', () => {
      render(<StatsWidget stats={stats} />);
      expect(screen.getByText('23')).toBeInTheDocument();
      expect(screen.getByText('This Week')).toBeInTheDocument();
    });

    it('displays active tasks count', () => {
      render(<StatsWidget stats={stats} />);
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('Active Tasks')).toBeInTheDocument();
    });

    it('displays overdue count', () => {
      render(<StatsWidget stats={stats} />);
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Overdue')).toBeInTheDocument();
    });

    it('displays active projects count', () => {
      render(<StatsWidget stats={stats} />);
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('Active Projects')).toBeInTheDocument();
    });

    it('displays completed this month count', () => {
      render(<StatsWidget stats={stats} />);
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Completed This Month')).toBeInTheDocument();
    });
  });

  describe('Empty Stats', () => {
    it('shows zero values when stats are empty', () => {
      render(<StatsWidget stats={{}} />);

      // All values should be 0
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(6);
    });

    it('handles null stats gracefully', () => {
      render(<StatsWidget stats={null} />);

      // Should still render with 0 values
      expect(screen.getByText('Completed Today')).toBeInTheDocument();
    });

    it('handles undefined stats gracefully', () => {
      render(<StatsWidget />);

      expect(screen.getByText('Completed Today')).toBeInTheDocument();
    });
  });

  describe('Stat Icons and Colors', () => {
    const stats = {
      tasks: {
        completedToday: 5,
        completedThisWeek: 10,
        totalActive: 8,
        overdue: 2
      },
      projects: {
        active: 3,
        completedThisMonth: 1
      }
    };

    it('shows green color for completed today', () => {
      const { container } = render(<StatsWidget stats={stats} />);
      expect(container.querySelector('.text-green-500')).toBeInTheDocument();
      expect(container.querySelector('.bg-green-500\\/10')).toBeInTheDocument();
    });

    it('shows blue color for this week', () => {
      const { container } = render(<StatsWidget stats={stats} />);
      expect(container.querySelector('.text-blue-500')).toBeInTheDocument();
    });

    it('shows purple color for active tasks', () => {
      const { container } = render(<StatsWidget stats={stats} />);
      expect(container.querySelector('.text-purple-500')).toBeInTheDocument();
    });

    it('shows red color when there are overdue tasks', () => {
      const statsWithOverdue = {
        tasks: { overdue: 5 }
      };

      const { container } = render(<StatsWidget stats={statsWithOverdue} />);
      expect(container.querySelector('.text-red-500')).toBeInTheDocument();
    });

    it('shows muted color when no overdue tasks', () => {
      const statsWithoutOverdue = {
        tasks: { overdue: 0 }
      };

      const { container } = render(<StatsWidget stats={statsWithoutOverdue} />);
      // Overdue should show muted color
      expect(container.querySelector('.text-muted')).toBeInTheDocument();
    });

    it('shows orange color for active projects', () => {
      const { container } = render(<StatsWidget stats={stats} />);
      expect(container.querySelector('.text-orange-500')).toBeInTheDocument();
    });

    it('shows emerald color for completed this month', () => {
      const { container } = render(<StatsWidget stats={stats} />);
      expect(container.querySelector('.text-emerald-500')).toBeInTheDocument();
    });
  });

  describe('Grid Layout', () => {
    it('renders stats in grid layout', () => {
      const stats = {
        tasks: {
          completedToday: 1,
          completedThisWeek: 2,
          totalActive: 3,
          overdue: 0
        },
        projects: {
          active: 1,
          completedThisMonth: 0
        }
      };

      const { container } = render(<StatsWidget stats={stats} />);
      expect(container.querySelector('.stats-grid')).toBeInTheDocument();
    });

    it('renders all 6 stat items', () => {
      const { container } = render(<StatsWidget stats={{}} />);
      const statItems = container.querySelectorAll('.stat-item');
      expect(statItems.length).toBe(6);
    });
  });

  describe('Partial Stats', () => {
    it('handles missing tasks object', () => {
      const stats = {
        projects: { active: 2 }
      };

      render(<StatsWidget stats={stats} />);

      expect(screen.getByText('Completed Today')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('handles missing projects object', () => {
      const stats = {
        tasks: { completedToday: 3 }
      };

      render(<StatsWidget stats={stats} />);

      expect(screen.getByText('Active Projects')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });
});
