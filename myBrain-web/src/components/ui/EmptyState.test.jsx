import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders with title and description', () => {
    render(
      <EmptyState
        title="No items"
        description="Create your first item"
      />
    );

    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByText('Create your first item')).toBeInTheDocument();
  });

  it('renders action button with onClick', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <EmptyState
        title="Empty"
        action={{ label: 'Add Item', onClick: handleClick }}
      />
    );

    const button = screen.getByRole('button', { name: /add item/i });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders action link with to prop', () => {
    render(
      <EmptyState
        title="Empty"
        action={{ label: 'Go somewhere', to: '/somewhere' }}
      />
    );

    const link = screen.getByRole('link', { name: /go somewhere/i });
    expect(link).toHaveAttribute('href', '/somewhere');
  });

  it('renders Notes preset', () => {
    const handleCreate = vi.fn();
    render(<EmptyState.Notes onCreateNote={handleCreate} />);

    expect(screen.getByText('No notes yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create note/i })).toBeInTheDocument();
  });

  it('renders Search preset with query', () => {
    render(<EmptyState.Search query="test search" />);

    expect(screen.getByText('No results found')).toBeInTheDocument();
    expect(screen.getByText(/test search/i)).toBeInTheDocument();
  });

  it('renders Archived preset', () => {
    render(<EmptyState.Archived />);
    expect(screen.getByText('No archived notes')).toBeInTheDocument();
  });

  it('renders Trash preset', () => {
    render(<EmptyState.Trash />);
    expect(screen.getByText('Trash is empty')).toBeInTheDocument();
  });

  it('renders Error preset with retry', async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();

    render(<EmptyState.Error message="Something broke" onRetry={handleRetry} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Something broke')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
