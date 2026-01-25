import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LifeAreaBadge } from './LifeAreaBadge';

describe('LifeAreaBadge', () => {
  const mockLifeArea = {
    _id: '1',
    name: 'Work',
    color: '#6366f1',
    icon: 'Briefcase',
  };

  describe('Basic Rendering', () => {
    it('renders nothing when lifeArea is null', () => {
      const { container } = render(<LifeAreaBadge lifeArea={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when lifeArea is undefined', () => {
      const { container } = render(<LifeAreaBadge lifeArea={undefined} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders the life area name by default', () => {
      render(<LifeAreaBadge lifeArea={mockLifeArea} />);
      expect(screen.getByText('Work')).toBeInTheDocument();
    });

    it('applies the life area color as background and text color', () => {
      render(<LifeAreaBadge lifeArea={mockLifeArea} />);
      const badge = screen.getByText('Work').parentElement;
      expect(badge).toHaveStyle({
        backgroundColor: '#6366f120',
        color: '#6366f1',
      });
    });
  });

  describe('Size Variations', () => {
    it('applies xs size classes', () => {
      render(<LifeAreaBadge lifeArea={mockLifeArea} size="xs" />);
      const badge = screen.getByText('Work').parentElement;
      expect(badge).toHaveClass('text-[10px]', 'px-1.5', 'py-0.5');
    });

    it('applies sm size classes by default', () => {
      render(<LifeAreaBadge lifeArea={mockLifeArea} />);
      const badge = screen.getByText('Work').parentElement;
      expect(badge).toHaveClass('text-xs', 'px-2', 'py-0.5');
    });

    it('applies md size classes', () => {
      render(<LifeAreaBadge lifeArea={mockLifeArea} size="md" />);
      const badge = screen.getByText('Work').parentElement;
      expect(badge).toHaveClass('text-sm', 'px-2.5', 'py-1');
    });
  });

  describe('Name Display Toggle', () => {
    it('shows name when showName is true (default)', () => {
      render(<LifeAreaBadge lifeArea={mockLifeArea} />);
      expect(screen.getByText('Work')).toBeInTheDocument();
    });

    it('hides name when showName is false', () => {
      render(<LifeAreaBadge lifeArea={mockLifeArea} showName={false} />);
      expect(screen.queryByText('Work')).not.toBeInTheDocument();
    });
  });

  describe('Icon Rendering', () => {
    it('renders with Folder icon as default when icon is unknown', () => {
      const areaWithUnknownIcon = { ...mockLifeArea, icon: 'Unknown' };
      const { container } = render(<LifeAreaBadge lifeArea={areaWithUnknownIcon} />);
      // The component should still render without error
      expect(container.firstChild).not.toBeNull();
    });

    it('renders with Folder icon when icon is not specified', () => {
      const areaWithoutIcon = { ...mockLifeArea, icon: undefined };
      const { container } = render(<LifeAreaBadge lifeArea={areaWithoutIcon} />);
      expect(container.firstChild).not.toBeNull();
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className', () => {
      render(<LifeAreaBadge lifeArea={mockLifeArea} className="custom-class" />);
      const badge = screen.getByText('Work').parentElement;
      expect(badge).toHaveClass('custom-class');
    });

    it('merges custom className with default classes', () => {
      render(<LifeAreaBadge lifeArea={mockLifeArea} className="custom-class" />);
      const badge = screen.getByText('Work').parentElement;
      expect(badge).toHaveClass('inline-flex', 'items-center', 'custom-class');
    });
  });

  describe('Different Life Areas', () => {
    it('renders with different colors correctly', () => {
      const healthArea = {
        _id: '2',
        name: 'Health',
        color: '#10b981',
        icon: 'Heart',
      };
      render(<LifeAreaBadge lifeArea={healthArea} />);
      const badge = screen.getByText('Health').parentElement;
      expect(badge).toHaveStyle({
        backgroundColor: '#10b98120',
        color: '#10b981',
      });
    });

    it('renders life area with long name', () => {
      const longNameArea = {
        _id: '3',
        name: 'Personal Development and Growth',
        color: '#f59e0b',
        icon: 'Target',
      };
      render(<LifeAreaBadge lifeArea={longNameArea} />);
      expect(screen.getByText('Personal Development and Growth')).toBeInTheDocument();
    });
  });
});
