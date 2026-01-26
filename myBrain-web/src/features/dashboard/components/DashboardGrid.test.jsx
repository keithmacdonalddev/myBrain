/**
 * =============================================================================
 * DASHBOARDGRID.TEST.JSX - Tests for Dashboard Grid Component
 * =============================================================================
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import DashboardGrid, {
  WidgetHeader,
  WidgetBody,
  WidgetFooter,
  WidgetEmpty,
  WidgetLoading,
  WidgetBadge,
  WidgetListItem
} from './DashboardGrid';

// Mock widget component
const MockWidget = ({ title = 'Mock Widget', isPinned }) => (
  <div data-testid="mock-widget">
    <span>{title}</span>
    {isPinned && <span data-testid="pinned-indicator">Pinned</span>}
  </div>
);

describe('DashboardGrid', () => {
  const defaultWidgets = [
    { id: 'widget1', component: MockWidget, size: 'default', props: { title: 'Widget 1' } },
    { id: 'widget2', component: MockWidget, size: 'wide', props: { title: 'Widget 2' } },
    { id: 'widget3', component: MockWidget, size: 'narrow', props: { title: 'Widget 3' } }
  ];

  describe('Basic Rendering', () => {
    it('renders all widgets', () => {
      render(<DashboardGrid widgets={defaultWidgets} />);

      expect(screen.getByText('Widget 1')).toBeInTheDocument();
      expect(screen.getByText('Widget 2')).toBeInTheDocument();
      expect(screen.getByText('Widget 3')).toBeInTheDocument();
    });

    it('renders empty grid when no widgets provided', () => {
      const { container } = render(<DashboardGrid widgets={[]} />);
      expect(container.querySelector('.dashboard-grid')).toBeInTheDocument();
    });

    it('applies correct size classes to widgets', () => {
      const { container } = render(<DashboardGrid widgets={defaultWidgets} />);

      expect(container.querySelector('.widget-default')).toBeInTheDocument();
      expect(container.querySelector('.widget-wide')).toBeInTheDocument();
      expect(container.querySelector('.widget-narrow')).toBeInTheDocument();
    });
  });

  describe('Pinned Widgets', () => {
    it('renders pinned widgets first', () => {
      const pinnedWidgets = [{ widgetId: 'widget3', position: 'always-show' }];

      render(
        <DashboardGrid
          widgets={defaultWidgets}
          pinnedWidgets={pinnedWidgets}
        />
      );

      const allWidgets = screen.getAllByTestId('mock-widget');
      // Widget 3 should be first since it's pinned
      expect(allWidgets[0]).toHaveTextContent('Widget 3');
    });

    it('shows pin button on hover', () => {
      const onPin = vi.fn();

      render(
        <DashboardGrid
          widgets={defaultWidgets}
          onPin={onPin}
        />
      );

      // Pin buttons should exist in the DOM
      const pinButtons = screen.getAllByTitle('Pin widget');
      expect(pinButtons.length).toBe(defaultWidgets.length);
    });

    it('shows unpin button for pinned widgets', () => {
      const pinnedWidgets = [{ widgetId: 'widget1', position: 'always-show' }];
      const onPin = vi.fn();
      const onUnpin = vi.fn();

      render(
        <DashboardGrid
          widgets={defaultWidgets}
          pinnedWidgets={pinnedWidgets}
          onPin={onPin}
          onUnpin={onUnpin}
        />
      );

      expect(screen.getByTitle('Unpin widget')).toBeInTheDocument();
    });

    it('calls onUnpin when unpin button clicked', async () => {
      const user = userEvent.setup();
      const pinnedWidgets = [{ widgetId: 'widget1', position: 'always-show' }];
      const onPin = vi.fn();
      const onUnpin = vi.fn();

      render(
        <DashboardGrid
          widgets={defaultWidgets}
          pinnedWidgets={pinnedWidgets}
          onPin={onPin}
          onUnpin={onUnpin}
        />
      );

      await user.click(screen.getByTitle('Unpin widget'));
      expect(onUnpin).toHaveBeenCalledWith('widget1');
    });

    it('shows pin position menu when pin button clicked', async () => {
      const user = userEvent.setup();
      const onPin = vi.fn();

      render(
        <DashboardGrid
          widgets={defaultWidgets}
          onPin={onPin}
        />
      );

      await user.click(screen.getAllByTitle('Pin widget')[0]);

      expect(screen.getByText('Pin to position')).toBeInTheDocument();
      expect(screen.getByText('Always Show')).toBeInTheDocument();
      expect(screen.getByText('Top Left')).toBeInTheDocument();
      expect(screen.getByText('Top Right')).toBeInTheDocument();
    });

    it('calls onPin with selected position', async () => {
      const user = userEvent.setup();
      const onPin = vi.fn();

      render(
        <DashboardGrid
          widgets={defaultWidgets}
          onPin={onPin}
        />
      );

      await user.click(screen.getAllByTitle('Pin widget')[0]);
      await user.click(screen.getByText('Always Show'));

      expect(onPin).toHaveBeenCalledWith('widget1', 'always-show', 'default');
    });

    it('closes pin menu when clicking outside', async () => {
      const user = userEvent.setup();
      const onPin = vi.fn();

      render(
        <DashboardGrid
          widgets={defaultWidgets}
          onPin={onPin}
        />
      );

      await user.click(screen.getAllByTitle('Pin widget')[0]);
      expect(screen.getByText('Pin to position')).toBeInTheDocument();

      // Click the backdrop
      const backdrop = document.querySelector('.fixed.inset-0.z-40');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(screen.queryByText('Pin to position')).not.toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('shows all pin buttons in edit mode', () => {
      render(
        <DashboardGrid
          widgets={defaultWidgets}
          editMode={true}
        />
      );

      const pinButtons = screen.getAllByTitle('Pin widget');
      expect(pinButtons.length).toBe(defaultWidgets.length);
    });
  });
});

describe('WidgetHeader', () => {
  it('renders title', () => {
    render(<WidgetHeader title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<WidgetHeader title="Title" subtitle="Subtitle" />);
    expect(screen.getByText('Subtitle')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const Icon = () => <span data-testid="test-icon">Icon</span>;
    render(<WidgetHeader title="Title" icon={<Icon />} />);
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('applies icon background class', () => {
    const Icon = () => <span>Icon</span>;
    const { container } = render(
      <WidgetHeader title="Title" icon={<Icon />} iconBg="bg-blue-500/10" />
    );
    expect(container.querySelector('.bg-blue-500\\/10')).toBeInTheDocument();
  });

  it('renders badge when provided', () => {
    render(<WidgetHeader title="Title" badge={<span>Badge</span>} />);
    expect(screen.getByText('Badge')).toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    render(<WidgetHeader title="Title" actions={<button>Action</button>} />);
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <WidgetHeader title="Title">
        <span>Child content</span>
      </WidgetHeader>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });
});

describe('WidgetBody', () => {
  it('renders children', () => {
    render(
      <WidgetBody>
        <p>Body content</p>
      </WidgetBody>
    );
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('applies compact class when compact prop is true', () => {
    const { container } = render(
      <WidgetBody compact>Content</WidgetBody>
    );
    expect(container.querySelector('.widget-body-compact')).toBeInTheDocument();
  });

  it('applies regular class when compact is false', () => {
    const { container } = render(
      <WidgetBody>Content</WidgetBody>
    );
    expect(container.querySelector('.widget-body')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <WidgetBody className="custom-class">Content</WidgetBody>
    );
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});

describe('WidgetFooter', () => {
  it('renders children', () => {
    render(
      <WidgetFooter>
        <a href="/test">View all</a>
      </WidgetFooter>
    );
    expect(screen.getByRole('link', { name: 'View all' })).toBeInTheDocument();
  });

  it('applies footer class', () => {
    const { container } = render(
      <WidgetFooter>Content</WidgetFooter>
    );
    expect(container.querySelector('.widget-footer')).toBeInTheDocument();
  });
});

describe('WidgetEmpty', () => {
  it('renders title', () => {
    render(<WidgetEmpty title="No items" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('renders text when provided', () => {
    render(<WidgetEmpty title="No items" text="Nothing to show here" />);
    expect(screen.getByText('Nothing to show here')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const Icon = () => <span data-testid="empty-icon">Icon</span>;
    render(<WidgetEmpty title="No items" icon={<Icon />} />);
    expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
  });

  it('applies empty state classes', () => {
    const { container } = render(<WidgetEmpty title="No items" />);
    expect(container.querySelector('.widget-empty')).toBeInTheDocument();
    expect(container.querySelector('.widget-empty-title')).toBeInTheDocument();
  });
});

describe('WidgetLoading', () => {
  it('renders loading spinner', () => {
    const { container } = render(<WidgetLoading />);
    expect(container.querySelector('.widget-loading')).toBeInTheDocument();
    expect(container.querySelector('.widget-loading-spinner')).toBeInTheDocument();
  });
});

describe('WidgetBadge', () => {
  it('renders value', () => {
    render(<WidgetBadge value="5" />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders numeric values', () => {
    render(<WidgetBadge value={10} />);
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('applies primary variant by default', () => {
    const { container } = render(<WidgetBadge value="5" />);
    expect(container.querySelector('.widget-badge-primary')).toBeInTheDocument();
  });

  it('applies danger variant', () => {
    const { container } = render(<WidgetBadge value="5" variant="danger" />);
    expect(container.querySelector('.widget-badge-danger')).toBeInTheDocument();
  });

  it('applies success variant', () => {
    const { container } = render(<WidgetBadge value="5" variant="success" />);
    expect(container.querySelector('.widget-badge-success')).toBeInTheDocument();
  });
});

describe('WidgetListItem', () => {
  it('renders title', () => {
    render(<WidgetListItem title="Item title" />);
    expect(screen.getByText('Item title')).toBeInTheDocument();
  });

  it('renders meta when provided', () => {
    render(<WidgetListItem title="Title" meta="Yesterday" />);
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const Icon = () => <span data-testid="item-icon">Icon</span>;
    render(<WidgetListItem title="Title" icon={<Icon />} />);
    expect(screen.getByTestId('item-icon')).toBeInTheDocument();
  });

  it('renders trailing element', () => {
    render(
      <WidgetListItem
        title="Title"
        trailing={<button>Action</button>}
      />
    );
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<WidgetListItem title="Clickable" onClick={onClick} />);

    await user.click(screen.getByText('Clickable'));
    expect(onClick).toHaveBeenCalled();
  });

  it('has button role when onClick is provided', () => {
    const onClick = vi.fn();
    render(<WidgetListItem title="Clickable" onClick={onClick} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('does not have button role when onClick is not provided', () => {
    render(<WidgetListItem title="Not clickable" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
