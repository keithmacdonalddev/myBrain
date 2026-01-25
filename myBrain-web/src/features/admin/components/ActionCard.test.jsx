import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../test/utils';
import { ActionCard, ActionButton, InboxSection, EmptyInbox } from './ActionCard';

describe('ActionCard', () => {
  const defaultProps = {
    title: 'Test Action',
    description: 'Test description',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with title and description', () => {
    render(<ActionCard {...defaultProps} />);

    expect(screen.getByText('Test Action')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('renders without description when not provided', () => {
    render(<ActionCard title="Test Action" />);

    expect(screen.getByText('Test Action')).toBeInTheDocument();
    expect(screen.queryByText('Test description')).not.toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <ActionCard {...defaultProps}>
        <span>Child content</span>
      </ActionCard>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    render(
      <ActionCard
        {...defaultProps}
        actions={<button>Action Button</button>}
      />
    );

    expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
  });

  it('renders dismiss button when onDismiss is provided', () => {
    const handleDismiss = vi.fn();
    render(<ActionCard {...defaultProps} onDismiss={handleDismiss} />);

    const dismissButton = screen.getByTitle('Dismiss');
    expect(dismissButton).toBeInTheDocument();

    fireEvent.click(dismissButton);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not render dismiss button when onDismiss is not provided', () => {
    render(<ActionCard {...defaultProps} />);

    expect(screen.queryByTitle('Dismiss')).not.toBeInTheDocument();
  });

  it('renders avatar when provided', () => {
    render(<ActionCard {...defaultProps} avatar="https://example.com/avatar.jpg" />);

    const avatar = screen.getByRole('img');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('renders meta content when provided', () => {
    render(<ActionCard {...defaultProps} meta={<span>Meta info</span>} />);

    expect(screen.getByText('Meta info')).toBeInTheDocument();
  });

  it('applies urgent priority styles', () => {
    const { container } = render(<ActionCard {...defaultProps} priority="urgent" />);

    expect(container.querySelector('.border-l-red-500')).toBeInTheDocument();
  });

  it('applies warning priority styles', () => {
    const { container } = render(<ActionCard {...defaultProps} priority="warning" />);

    expect(container.querySelector('.border-l-amber-500')).toBeInTheDocument();
  });

  it('applies info priority styles by default', () => {
    const { container } = render(<ActionCard {...defaultProps} />);

    expect(container.querySelector('.border-l-blue-500')).toBeInTheDocument();
  });

  it('falls back to info styles for unknown priority', () => {
    const { container } = render(<ActionCard {...defaultProps} priority="unknown" />);

    expect(container.querySelector('.border-l-blue-500')).toBeInTheDocument();
  });
});

describe('ActionButton', () => {
  it('renders with children text', () => {
    render(<ActionButton>Click Me</ActionButton>);

    expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<ActionButton onClick={handleClick}>Click Me</ActionButton>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies default variant styles', () => {
    render(<ActionButton>Default</ActionButton>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('border');
    expect(button).toHaveClass('text-muted');
  });

  it('applies primary variant styles', () => {
    render(<ActionButton variant="primary">Primary</ActionButton>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-text');
  });

  it('applies warning variant styles', () => {
    render(<ActionButton variant="warning">Warning</ActionButton>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-amber-500');
  });

  it('applies danger variant styles', () => {
    render(<ActionButton variant="danger">Danger</ActionButton>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-red-500');
  });

  it('applies custom className', () => {
    render(<ActionButton className="custom-class">Button</ActionButton>);

    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });
});

describe('InboxSection', () => {
  const defaultProps = {
    priority: 'info',
    title: 'Test Section',
  };

  it('renders with title and children', () => {
    render(
      <InboxSection {...defaultProps}>
        <div>Section content</div>
      </InboxSection>
    );

    expect(screen.getByText('Test Section')).toBeInTheDocument();
    expect(screen.getByText('Section content')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(
      <InboxSection {...defaultProps} subtitle="Some subtitle">
        <div>Content</div>
      </InboxSection>
    );

    expect(screen.getByText('Some subtitle')).toBeInTheDocument();
  });

  it('renders count badge when count is greater than 0', () => {
    render(
      <InboxSection {...defaultProps} count={5}>
        <div>Content</div>
      </InboxSection>
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not render count badge when count is 0', () => {
    render(
      <InboxSection {...defaultProps} count={0}>
        <div>Content</div>
      </InboxSection>
    );

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('returns null when children is empty array', () => {
    const { container } = render(
      <InboxSection {...defaultProps}>
        {[]}
      </InboxSection>
    );

    expect(container.firstChild).toBeNull();
  });

  it('returns null when children is not provided', () => {
    const { container } = render(<InboxSection {...defaultProps} />);

    expect(container.firstChild).toBeNull();
  });

  it('applies urgent priority styles', () => {
    const { container } = render(
      <InboxSection {...defaultProps} priority="urgent" count={3}>
        <div>Content</div>
      </InboxSection>
    );

    expect(container.querySelector('.bg-red-500')).toBeInTheDocument();
  });

  it('applies warning priority styles', () => {
    const { container } = render(
      <InboxSection {...defaultProps} priority="warning" count={3}>
        <div>Content</div>
      </InboxSection>
    );

    expect(container.querySelector('.bg-amber-500')).toBeInTheDocument();
  });
});

describe('EmptyInbox', () => {
  it('renders empty state message', () => {
    render(<EmptyInbox />);

    expect(screen.getByText('All caught up')).toBeInTheDocument();
    expect(screen.getByText('Nothing needs your attention right now.')).toBeInTheDocument();
  });

  it('renders checkmark icon', () => {
    const { container } = render(<EmptyInbox />);

    // Check for the SVG with checkmark path
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
