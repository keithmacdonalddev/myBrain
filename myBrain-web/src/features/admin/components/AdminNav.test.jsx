import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../test/utils';
import userEvent from '@testing-library/user-event';
import AdminNav from './AdminNav';

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/admin' }),
  };
});

describe('AdminNav', () => {
  const defaultProps = {
    onRefresh: vi.fn(),
    isRefreshing: false,
    badgeCount: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders admin title', () => {
    render(<AdminNav {...defaultProps} />);

    // Check for both mobile and desktop title
    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
  });

  it('renders all navigation tabs', () => {
    render(<AdminNav {...defaultProps} />);

    // Tab labels (may appear in both mobile and desktop views)
    expect(screen.getAllByText('Attention').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Reports').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Social').length).toBeGreaterThan(0);
    expect(screen.getAllByText('All Users').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Roles & Limits').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Sidebar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Logs').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Analytics').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Database').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0);
  });

  it('renders mobile labels', () => {
    render(<AdminNav {...defaultProps} />);

    // Mobile labels (in hidden spans)
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Roles')).toBeInTheDocument();
    expect(screen.getByText('Stats')).toBeInTheDocument();
    expect(screen.getByText('DB')).toBeInTheDocument();
  });

  it('navigates to correct path when tab is clicked', async () => {
    const user = userEvent.setup();
    render(<AdminNav {...defaultProps} />);

    // Click on Reports tab (use first match for desktop view)
    await user.click(screen.getAllByText('Reports')[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/admin/reports');
  });

  it('navigates to users page when All Users tab is clicked', async () => {
    const user = userEvent.setup();
    render(<AdminNav {...defaultProps} />);

    await user.click(screen.getAllByText('All Users')[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/admin/users');
  });

  it('navigates to database page when Database tab is clicked', async () => {
    const user = userEvent.setup();
    render(<AdminNav {...defaultProps} />);

    await user.click(screen.getAllByText('Database')[0]);

    expect(mockNavigate).toHaveBeenCalledWith('/admin/database');
  });

  it('displays badge count when greater than 0', () => {
    render(<AdminNav {...defaultProps} badgeCount={5} />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not display badge when count is 0', () => {
    render(<AdminNav {...defaultProps} badgeCount={0} />);

    // Badge should not be rendered
    const badges = screen.queryAllByText('0');
    expect(badges.length).toBe(0);
  });

  it('renders refresh button when onRefresh is provided', () => {
    render(<AdminNav {...defaultProps} />);

    // Desktop refresh button
    expect(screen.getByText('Refresh')).toBeInTheDocument();
  });

  it('calls onRefresh when refresh button is clicked', async () => {
    const user = userEvent.setup();
    const handleRefresh = vi.fn();
    render(<AdminNav {...defaultProps} onRefresh={handleRefresh} />);

    await user.click(screen.getByText('Refresh'));

    expect(handleRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables refresh button when isRefreshing is true', () => {
    render(<AdminNav {...defaultProps} isRefreshing={true} />);

    const refreshButton = screen.getByText('Refresh').closest('button');
    expect(refreshButton).toBeDisabled();
  });

  it('applies spin animation to refresh icon when isRefreshing is true', () => {
    const { container } = render(<AdminNav {...defaultProps} isRefreshing={true} />);

    const spinningIcon = container.querySelector('.animate-spin');
    expect(spinningIcon).toBeInTheDocument();
  });

  it('renders close button in mobile header', () => {
    render(<AdminNav {...defaultProps} />);

    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });

  it('close button links to /app', () => {
    render(<AdminNav {...defaultProps} />);

    const closeLink = screen.getByLabelText('Close');
    expect(closeLink).toHaveAttribute('href', '/app');
  });

  it('does not render refresh button when onRefresh is not provided', () => {
    render(<AdminNav onRefresh={null} isRefreshing={false} badgeCount={0} />);

    expect(screen.queryByText('Refresh')).not.toBeInTheDocument();
  });

  it('renders platform name in desktop header', () => {
    render(<AdminNav {...defaultProps} />);

    expect(screen.getByText('myBrain Platform')).toBeInTheDocument();
  });
});

describe('AdminNav active state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies active styles to current route', () => {
    // Mock location to /admin (Attention tab)
    vi.doMock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useNavigate: () => mockNavigate,
        useLocation: () => ({ pathname: '/admin' }),
      };
    });

    const { container } = render(
      <AdminNav onRefresh={vi.fn()} isRefreshing={false} badgeCount={0} />
    );

    // The Attention tab should have active styles
    const attentionButton = screen.getByRole('button', { name: /attention/i });
    expect(attentionButton).toHaveClass('text-text');
    expect(attentionButton).toHaveClass('bg-bg');
  });
});
