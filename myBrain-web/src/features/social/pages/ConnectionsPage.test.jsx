import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/utils';
import ConnectionsPage from './ConnectionsPage';

// Mock child components to isolate ConnectionsPage tests
vi.mock('../components/UserSearch', () => ({
  default: () => <div data-testid="user-search">UserSearch Component</div>,
}));

vi.mock('../components/ConnectionsList', () => ({
  default: ({ initialTab }) => (
    <div data-testid="connections-list" data-initial-tab={initialTab}>
      ConnectionsList Component
    </div>
  ),
}));

vi.mock('../components/SuggestedConnections', () => ({
  default: ({ limit }) => (
    <div data-testid="suggested-connections" data-limit={limit}>
      SuggestedConnections Component
    </div>
  ),
}));

// Mock react-router-dom useSearchParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: vi.fn(() => [new URLSearchParams()]),
  };
});

import { useSearchParams } from 'react-router-dom';

describe('ConnectionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for useSearchParams
    vi.mocked(useSearchParams).mockReturnValue([new URLSearchParams()]);
  });

  it('renders the page header with title and description', () => {
    render(<ConnectionsPage />);

    expect(screen.getByText('Connections')).toBeInTheDocument();
    expect(
      screen.getByText('Manage your connections and find new people')
    ).toBeInTheDocument();
  });

  it('renders UserSearch component', () => {
    render(<ConnectionsPage />);

    expect(screen.getByTestId('user-search')).toBeInTheDocument();
  });

  it('renders ConnectionsList component with default tab', () => {
    render(<ConnectionsPage />);

    const connectionsList = screen.getByTestId('connections-list');
    expect(connectionsList).toBeInTheDocument();
    expect(connectionsList).toHaveAttribute('data-initial-tab', 'connections');
  });

  it('renders ConnectionsList with tab from URL params', () => {
    vi.mocked(useSearchParams).mockReturnValue([
      new URLSearchParams('tab=pending'),
    ]);

    render(<ConnectionsPage />);

    const connectionsList = screen.getByTestId('connections-list');
    expect(connectionsList).toHaveAttribute('data-initial-tab', 'pending');
  });

  it('renders SuggestedConnections component with limit', () => {
    render(<ConnectionsPage />);

    const suggested = screen.getByTestId('suggested-connections');
    expect(suggested).toBeInTheDocument();
    expect(suggested).toHaveAttribute('data-limit', '5');
  });

  it('renders with correct layout structure', () => {
    const { container } = render(<ConnectionsPage />);

    // Check for grid layout
    expect(container.querySelector('.lg\\:grid-cols-3')).toBeInTheDocument();
    expect(container.querySelector('.lg\\:col-span-2')).toBeInTheDocument();
  });
});
