/**
 * ActivityRings Component Tests
 *
 * Tests for the Apple Watch-style activity rings component.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ActivityRings from './ActivityRings';

describe('ActivityRings', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('renders 3 concentric rings', () => {
      render(<ActivityRings fitness={80} health={50} focus={30} />);

      // Each ring has a background and progress circle
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars).toHaveLength(3);
    });

    it('renders with default props (0% for all)', () => {
      render(<ActivityRings />);

      const progressBars = screen.getAllByRole('progressbar');
      progressBars.forEach((bar) => {
        expect(bar).toHaveAttribute('aria-valuenow', '0');
      });
    });

    it('clamps progress values to 0-100', () => {
      render(<ActivityRings fitness={150} health={-20} focus={50} />);

      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars[0]).toHaveAttribute('aria-valuenow', '100');
      expect(progressBars[1]).toHaveAttribute('aria-valuenow', '0');
      expect(progressBars[2]).toHaveAttribute('aria-valuenow', '50');
    });
  });

  describe('size variants', () => {
    it('renders small size', () => {
      const { container } = render(<ActivityRings size="sm" />);
      const wrapper = container.querySelector('.activity-rings-wrapper');
      expect(wrapper).toHaveStyle({ width: '80px', height: '80px' });
    });

    it('renders medium size (default)', () => {
      const { container } = render(<ActivityRings />);
      const wrapper = container.querySelector('.activity-rings-wrapper');
      expect(wrapper).toHaveStyle({ width: '100px', height: '100px' });
    });

    it('renders large size', () => {
      const { container } = render(<ActivityRings size="lg" />);
      const wrapper = container.querySelector('.activity-rings-wrapper');
      expect(wrapper).toHaveStyle({ width: '120px', height: '120px' });
    });
  });

  describe('labels', () => {
    it('does not show labels by default', () => {
      render(<ActivityRings fitness={80} health={50} focus={30} />);
      expect(screen.queryByText('Fitness')).not.toBeInTheDocument();
    });

    it('shows labels when showLabels is true', () => {
      render(<ActivityRings fitness={80} health={50} focus={30} showLabels />);

      expect(screen.getByText('Fitness')).toBeInTheDocument();
      expect(screen.getByText('Health')).toBeInTheDocument();
      expect(screen.getByText('Focus')).toBeInTheDocument();
    });

    it('shows percentage values with labels', () => {
      render(<ActivityRings fitness={80} health={50} focus={30} showLabels />);

      expect(screen.getByText('80%')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('30%')).toBeInTheDocument();
    });

    it('rounds percentage values', () => {
      render(<ActivityRings fitness={80.7} health={50.2} focus={30.9} showLabels />);

      expect(screen.getByText('81%')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('31%')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows skeleton when loading', () => {
      const { container } = render(<ActivityRings loading />);

      expect(container.querySelector('.skeleton-pulse')).toBeInTheDocument();
    });

    it('shows skeleton labels when loading with showLabels', () => {
      const { container } = render(<ActivityRings loading showLabels />);

      // Should have skeleton elements in labels
      const skeletons = container.querySelectorAll('.skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('does not show progress rings when loading', () => {
      render(<ActivityRings loading fitness={80} health={50} focus={30} />);

      expect(screen.queryAllByRole('progressbar')).toHaveLength(0);
    });
  });

  describe('animation', () => {
    it('animates rings on mount', () => {
      const { container } = render(<ActivityRings fitness={80} health={50} focus={30} />);

      // Initially, progress circles should not have animate class
      const progressCircles = container.querySelectorAll('.activity-ring-progress');
      progressCircles.forEach((circle) => {
        expect(circle).not.toHaveClass('animate');
      });

      // After timeout, they should have animate class
      act(() => {
        vi.advanceTimersByTime(150);
      });

      const animatedCircles = container.querySelectorAll('.activity-ring-progress.animate');
      expect(animatedCircles).toHaveLength(3);
    });
  });

  describe('accessibility', () => {
    it('has correct ARIA attributes on progress rings', () => {
      render(<ActivityRings fitness={75} health={60} focus={45} />);

      const progressBars = screen.getAllByRole('progressbar');

      progressBars.forEach((bar) => {
        expect(bar).toHaveAttribute('aria-valuemin', '0');
        expect(bar).toHaveAttribute('aria-valuemax', '100');
        expect(bar).toHaveAttribute('aria-valuenow');
      });

      // Check specific values
      expect(progressBars[0]).toHaveAttribute('aria-valuenow', '75');
      expect(progressBars[1]).toHaveAttribute('aria-valuenow', '60');
      expect(progressBars[2]).toHaveAttribute('aria-valuenow', '45');
    });
  });

  describe('className prop', () => {
    it('applies custom className', () => {
      const { container } = render(<ActivityRings className="custom-class" />);

      expect(container.querySelector('.activity-rings-container')).toHaveClass('custom-class');
    });
  });
});
