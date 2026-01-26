import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/utils';
import { ProjectProgress } from './ProjectProgress';

describe('ProjectProgress', () => {
  describe('Basic Rendering', () => {
    it('renders nothing when progress is null', () => {
      const { container } = render(<ProjectProgress progress={null} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when progress is undefined', () => {
      const { container } = render(<ProjectProgress progress={undefined} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('renders progress bar with correct percentage', () => {
      const progress = { total: 10, completed: 5, percentage: 50 };
      const { container } = render(<ProjectProgress progress={progress} />);

      // Check for progress bar existence
      const progressBar = container.querySelector('[style*="width: 50%"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('displays task count label when showLabel is true', () => {
      const progress = { total: 10, completed: 5, percentage: 50 };
      render(<ProjectProgress progress={progress} showLabel={true} />);

      expect(screen.getByText('5 of 10 tasks')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('hides label when showLabel is false', () => {
      const progress = { total: 10, completed: 5, percentage: 50 };
      render(<ProjectProgress progress={progress} showLabel={false} />);

      expect(screen.queryByText('5 of 10 tasks')).not.toBeInTheDocument();
      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });
  });

  describe('Progress Colors', () => {
    it('shows success color at 100% completion', () => {
      const progress = { total: 10, completed: 10, percentage: 100 };
      const { container } = render(<ProjectProgress progress={progress} />);

      const progressBar = container.querySelector('.bg-success');
      expect(progressBar).toBeInTheDocument();
    });

    it('shows check circle icon at 100% completion', () => {
      const progress = { total: 10, completed: 10, percentage: 100 };
      const { container } = render(<ProjectProgress progress={progress} />);

      // Should have CheckCircle2 icon (text-success class)
      const successIcon = container.querySelector('.text-success');
      expect(successIcon).toBeInTheDocument();
    });

    it('shows primary color at 50-74% completion', () => {
      const progress = { total: 10, completed: 5, percentage: 50 };
      const { container } = render(<ProjectProgress progress={progress} />);

      const progressBar = container.querySelector('.bg-primary');
      expect(progressBar).toBeInTheDocument();
    });

    it('shows muted color at low completion (0-24%)', () => {
      const progress = { total: 10, completed: 1, percentage: 10 };
      const { container } = render(<ProjectProgress progress={progress} />);

      const progressBar = container.querySelector('.bg-muted');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('applies small size classes when size is sm', () => {
      const progress = { total: 10, completed: 5, percentage: 50 };
      const { container } = render(<ProjectProgress progress={progress} size="sm" />);

      const progressBar = container.querySelector('.h-1');
      expect(progressBar).toBeInTheDocument();
    });

    it('applies medium size classes when size is md', () => {
      const progress = { total: 10, completed: 5, percentage: 50 };
      const { container } = render(<ProjectProgress progress={progress} size="md" />);

      const progressBar = container.querySelector('.h-1\\.5');
      expect(progressBar).toBeInTheDocument();
    });

    it('applies large size classes when size is lg', () => {
      const progress = { total: 10, completed: 5, percentage: 50 };
      const { container } = render(<ProjectProgress progress={progress} size="lg" />);

      const progressBar = container.querySelector('.h-2');
      expect(progressBar).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero total tasks', () => {
      const progress = { total: 0, completed: 0, percentage: 0 };
      render(<ProjectProgress progress={progress} />);

      expect(screen.getByText('0 of 0 tasks')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('handles completed more than total (edge case)', () => {
      const progress = { total: 5, completed: 6, percentage: 120 };
      const { container } = render(<ProjectProgress progress={progress} />);

      // Should still render with the provided values
      expect(screen.getByText('6 of 5 tasks')).toBeInTheDocument();
      expect(container.querySelector('[style*="width: 120%"]')).toBeInTheDocument();
    });
  });
});
