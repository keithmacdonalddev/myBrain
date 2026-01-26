import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import ExpandableSection, {
  CollapsibleContent,
  AnimatedExpandableSection,
  Accordion,
} from './ExpandableSection';
import { Star } from 'lucide-react';

describe('ExpandableSection', () => {
  describe('Basic Rendering', () => {
    it('renders with title', () => {
      render(<ExpandableSection title="Test Section">Content</ExpandableSection>);
      expect(screen.getByText('Test Section')).toBeInTheDocument();
    });

    it('renders children when expanded by default', () => {
      render(
        <ExpandableSection title="Section">
          <p>Child content</p>
        </ExpandableSection>
      );
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('hides children when defaultExpanded is false', () => {
      render(
        <ExpandableSection title="Section" defaultExpanded={false}>
          <p>Hidden content</p>
        </ExpandableSection>
      );
      expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
    });

    it('renders with custom icon', () => {
      const { container } = render(
        <ExpandableSection title="Section" icon={Star}>
          Content
        </ExpandableSection>
      );
      // Star icon should be present (rendered as SVG)
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders count badge', () => {
      render(
        <ExpandableSection title="Items" count={5}>
          Content
        </ExpandableSection>
      );
      expect(screen.getByText('(5)')).toBeInTheDocument();
    });

    it('renders count badge with zero', () => {
      render(
        <ExpandableSection title="Items" count={0}>
          Content
        </ExpandableSection>
      );
      expect(screen.getByText('(0)')).toBeInTheDocument();
    });

    it('renders headerRight content', () => {
      render(
        <ExpandableSection title="Section" headerRight={<button>Action</button>}>
          Content
        </ExpandableSection>
      );
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });
  });

  describe('Expand/Collapse Behavior', () => {
    it('toggles content visibility on click', async () => {
      const user = userEvent.setup();
      render(
        <ExpandableSection title="Toggle Me">
          <p>Toggleable content</p>
        </ExpandableSection>
      );

      // Initially expanded
      expect(screen.getByText('Toggleable content')).toBeInTheDocument();

      // Click to collapse
      await user.click(screen.getByRole('button', { name: /toggle me/i }));
      expect(screen.queryByText('Toggleable content')).not.toBeInTheDocument();

      // Click to expand
      await user.click(screen.getByRole('button', { name: /toggle me/i }));
      expect(screen.getByText('Toggleable content')).toBeInTheDocument();
    });

    it('calls onToggle callback with new state', async () => {
      const user = userEvent.setup();
      const handleToggle = vi.fn();

      render(
        <ExpandableSection title="Section" onToggle={handleToggle}>
          Content
        </ExpandableSection>
      );

      await user.click(screen.getByRole('button', { name: /section/i }));
      expect(handleToggle).toHaveBeenCalledWith(false); // Collapsed

      await user.click(screen.getByRole('button', { name: /section/i }));
      expect(handleToggle).toHaveBeenCalledWith(true); // Expanded
    });

    it('does not toggle when disabled', async () => {
      const user = userEvent.setup();
      const handleToggle = vi.fn();

      render(
        <ExpandableSection title="Disabled Section" disabled onToggle={handleToggle}>
          <p>Content should stay visible</p>
        </ExpandableSection>
      );

      await user.click(screen.getByRole('button', { name: /disabled section/i }));
      expect(handleToggle).not.toHaveBeenCalled();
      expect(screen.getByText('Content should stay visible')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading state', () => {
      render(
        <ExpandableSection title="Loading Section" isLoading>
          Content
        </ExpandableSection>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Loading Section')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty text when isEmpty and emptyText provided', () => {
      render(
        <ExpandableSection title="Empty Section" isEmpty emptyText="Nothing here yet">
          <p>Regular content</p>
        </ExpandableSection>
      );

      expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
      expect(screen.queryByText('Regular content')).not.toBeInTheDocument();
    });

    it('shows children when isEmpty false', () => {
      render(
        <ExpandableSection title="Section" isEmpty={false} emptyText="Nothing here">
          <p>Regular content</p>
        </ExpandableSection>
      );

      expect(screen.getByText('Regular content')).toBeInTheDocument();
      expect(screen.queryByText('Nothing here')).not.toBeInTheDocument();
    });
  });

  describe('Chevron Styles', () => {
    it('renders horizontal chevron style by default', () => {
      const { container } = render(
        <ExpandableSection title="Horizontal">Content</ExpandableSection>
      );
      // ChevronDown is shown when expanded with horizontal style
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders vertical chevron style', () => {
      const { container } = render(
        <ExpandableSection title="Vertical" chevronStyle="vertical">
          Content
        </ExpandableSection>
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies bordered class when bordered prop is true', () => {
      const { container } = render(
        <ExpandableSection title="Bordered" bordered>
          Content
        </ExpandableSection>
      );
      expect(container.firstChild).toHaveClass('border-b');
    });

    it('applies custom className', () => {
      const { container } = render(
        <ExpandableSection title="Custom" className="custom-class">
          Content
        </ExpandableSection>
      );
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('HeaderRight Click Propagation', () => {
    it('stops propagation on headerRight click', async () => {
      const user = userEvent.setup();
      const headerRightClick = vi.fn();
      const toggleHandler = vi.fn();

      render(
        <ExpandableSection
          title="Section"
          headerRight={<button onClick={headerRightClick}>Header Button</button>}
          onToggle={toggleHandler}
        >
          Content
        </ExpandableSection>
      );

      await user.click(screen.getByRole('button', { name: 'Header Button' }));
      expect(headerRightClick).toHaveBeenCalled();
      // onToggle should not be called because propagation is stopped
      expect(toggleHandler).not.toHaveBeenCalled();
    });
  });
});

describe('CollapsibleContent', () => {
  it('renders with label and hidden content by default', () => {
    render(
      <CollapsibleContent label="details">
        <p>Hidden details</p>
      </CollapsibleContent>
    );

    expect(screen.getByText('Show details')).toBeInTheDocument();
    expect(screen.queryByText('Hidden details')).not.toBeInTheDocument();
  });

  it('shows content when defaultExpanded is true', () => {
    render(
      <CollapsibleContent label="details" defaultExpanded>
        <p>Visible details</p>
      </CollapsibleContent>
    );

    expect(screen.getByText('Hide details')).toBeInTheDocument();
    expect(screen.getByText('Visible details')).toBeInTheDocument();
  });

  it('toggles content on click', async () => {
    const user = userEvent.setup();
    render(
      <CollapsibleContent label="info">
        <p>Toggleable info</p>
      </CollapsibleContent>
    );

    // Initially hidden
    expect(screen.queryByText('Toggleable info')).not.toBeInTheDocument();

    // Click to show
    await user.click(screen.getByText('Show info'));
    expect(screen.getByText('Toggleable info')).toBeInTheDocument();
    expect(screen.getByText('Hide info')).toBeInTheDocument();

    // Click to hide
    await user.click(screen.getByText('Hide info'));
    expect(screen.queryByText('Toggleable info')).not.toBeInTheDocument();
  });
});

describe('AnimatedExpandableSection', () => {
  it('renders with title and content', () => {
    render(
      <AnimatedExpandableSection title="Animated Section" defaultExpanded>
        <p>Animated content</p>
      </AnimatedExpandableSection>
    );

    expect(screen.getByText('Animated Section')).toBeInTheDocument();
    expect(screen.getByText('Animated content')).toBeInTheDocument();
  });

  it('renders with icon and count', () => {
    render(
      <AnimatedExpandableSection title="With Icon" icon={Star} count={3} defaultExpanded>
        Content
      </AnimatedExpandableSection>
    );

    expect(screen.getByText('With Icon')).toBeInTheDocument();
    expect(screen.getByText('(3)')).toBeInTheDocument();
  });

  it('toggles content on click', async () => {
    const user = userEvent.setup();
    render(
      <AnimatedExpandableSection title="Toggle Section" defaultExpanded>
        <p>Content to toggle</p>
      </AnimatedExpandableSection>
    );

    // Click to collapse - content is still in DOM but hidden via CSS
    await user.click(screen.getByRole('button', { name: /toggle section/i }));

    // Click to expand
    await user.click(screen.getByRole('button', { name: /toggle section/i }));
    expect(screen.getByText('Content to toggle')).toBeInTheDocument();
  });

  it('renders headerRight content', () => {
    render(
      <AnimatedExpandableSection title="Section" headerRight={<span>Extra</span>} defaultExpanded>
        Content
      </AnimatedExpandableSection>
    );

    expect(screen.getByText('Extra')).toBeInTheDocument();
  });
});

describe('Accordion', () => {
  const sections = [
    { key: 'section1', title: 'First Section', content: <p>First content</p> },
    { key: 'section2', title: 'Second Section', content: <p>Second content</p> },
    { key: 'section3', title: 'Third Section', content: <p>Third content</p>, count: 5 },
  ];

  it('renders all section titles', () => {
    render(<Accordion sections={sections} />);

    expect(screen.getByText('First Section')).toBeInTheDocument();
    expect(screen.getByText('Second Section')).toBeInTheDocument();
    expect(screen.getByText('Third Section')).toBeInTheDocument();
  });

  it('shows no content by default', () => {
    render(<Accordion sections={sections} />);

    expect(screen.queryByText('First content')).not.toBeInTheDocument();
    expect(screen.queryByText('Second content')).not.toBeInTheDocument();
    expect(screen.queryByText('Third content')).not.toBeInTheDocument();
  });

  it('shows content for defaultActiveKey', () => {
    render(<Accordion sections={sections} defaultActiveKey="section2" />);

    expect(screen.queryByText('First content')).not.toBeInTheDocument();
    expect(screen.getByText('Second content')).toBeInTheDocument();
    expect(screen.queryByText('Third content')).not.toBeInTheDocument();
  });

  it('expands section on click', async () => {
    const user = userEvent.setup();
    render(<Accordion sections={sections} />);

    await user.click(screen.getByText('First Section'));
    expect(screen.getByText('First content')).toBeInTheDocument();
  });

  it('collapses other sections when one is expanded (accordion behavior)', async () => {
    const user = userEvent.setup();
    render(<Accordion sections={sections} defaultActiveKey="section1" />);

    expect(screen.getByText('First content')).toBeInTheDocument();

    // Click second section - should close first
    await user.click(screen.getByText('Second Section'));
    expect(screen.queryByText('First content')).not.toBeInTheDocument();
    expect(screen.getByText('Second content')).toBeInTheDocument();
  });

  it('collapses section when clicking the same section', async () => {
    const user = userEvent.setup();
    render(<Accordion sections={sections} defaultActiveKey="section1" />);

    expect(screen.getByText('First content')).toBeInTheDocument();

    await user.click(screen.getByText('First Section'));
    expect(screen.queryByText('First content')).not.toBeInTheDocument();
  });

  it('renders section count badge', () => {
    render(<Accordion sections={sections} />);
    expect(screen.getByText('(5)')).toBeInTheDocument();
  });

  it('renders section icon when provided', () => {
    const sectionsWithIcon = [
      { key: 'iconSection', title: 'Icon Section', content: <p>Content</p>, icon: Star },
    ];
    const { container } = render(<Accordion sections={sectionsWithIcon} />);

    // Star icon should be rendered
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
