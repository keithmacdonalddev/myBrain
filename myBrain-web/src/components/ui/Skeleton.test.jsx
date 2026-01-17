import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import Skeleton from './Skeleton';

describe('Skeleton', () => {
  it('renders base skeleton with custom className', () => {
    const { container } = render(<Skeleton className="w-32 h-4" />);
    const skeleton = container.firstChild;
    expect(skeleton).toHaveClass('skeleton', 'rounded', 'w-32', 'h-4');
  });

  it('renders text skeleton with multiple lines', () => {
    const { container } = render(<Skeleton.Text lines={3} />);
    const skeletons = container.querySelectorAll('.skeleton');
    expect(skeletons).toHaveLength(3);
  });

  it('renders avatar skeleton with size variants', () => {
    const { container: smContainer } = render(<Skeleton.Avatar size="sm" />);
    expect(smContainer.firstChild).toHaveClass('w-8', 'h-8');

    const { container: lgContainer } = render(<Skeleton.Avatar size="lg" />);
    expect(lgContainer.firstChild).toHaveClass('w-12', 'h-12');
  });

  it('renders card skeleton with avatar and text', () => {
    const { container } = render(<Skeleton.Card />);
    expect(container.querySelector('.rounded-full')).toBeInTheDocument();
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(1);
  });

  it('renders note card skeleton', () => {
    const { container } = render(<Skeleton.NoteCard />);
    expect(container.querySelector('.bg-panel')).toBeInTheDocument();
  });
});
