import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import MobilePageHeader from './MobilePageHeader';
import { Settings, User } from 'lucide-react';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Helper to create default preloaded state
const createPreloadedState = () => ({
  auth: {
    user: {
      _id: 'user123',
      email: 'test@example.com',
      role: 'user',
    },
    isAuthenticated: true,
    loading: false,
  },
  lifeAreas: {
    items: [],
    loading: false,
    error: null,
    selectedId: null,
  },
  theme: {
    mode: 'light',
    effectiveTheme: 'light',
    accentColor: 'blue',
    reduceMotion: false,
  },
  toast: {
    toasts: [],
  },
});

describe('MobilePageHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the title', () => {
      render(<MobilePageHeader title="Settings" />, {
        preloadedState: createPreloadedState(),
      });

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders the close button', () => {
      render(<MobilePageHeader title="Settings" />, {
        preloadedState: createPreloadedState(),
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('renders with icon when provided', () => {
      const { container } = render(
        <MobilePageHeader title="Settings" icon={Settings} />,
        { preloadedState: createPreloadedState() }
      );

      // Icon should be present (lucide-react Settings icon)
      const svg = container.querySelector('svg.text-primary');
      expect(svg).toBeInTheDocument();
    });

    it('renders without icon when not provided', () => {
      const { container } = render(
        <MobilePageHeader title="Settings" />,
        { preloadedState: createPreloadedState() }
      );

      // Only the X icon in the close button should be present
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBe(1); // Only the X icon
    });

    it('renders right action when provided', () => {
      const actionButton = <button data-testid="action-button">Action</button>;

      render(
        <MobilePageHeader title="Settings" rightAction={actionButton} />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByTestId('action-button')).toBeInTheDocument();
    });

    it('renders spacer when no right action', () => {
      const { container } = render(
        <MobilePageHeader title="Settings" />,
        { preloadedState: createPreloadedState() }
      );

      // Check for the spacer div (w-10)
      const spacer = container.querySelector('.w-10');
      expect(spacer).toBeInTheDocument();
    });
  });

  describe('Close Button Navigation', () => {
    it('navigates to /app when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<MobilePageHeader title="Settings" />, {
        preloadedState: createPreloadedState(),
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockNavigate).toHaveBeenCalledWith('/app/today');
    });
  });

  describe('Styling', () => {
    it('has correct header height', () => {
      const { container } = render(
        <MobilePageHeader title="Settings" />,
        { preloadedState: createPreloadedState() }
      );

      const header = container.querySelector('.h-14');
      expect(header).toBeInTheDocument();
    });

    it('has border-bottom styling', () => {
      const { container } = render(
        <MobilePageHeader title="Settings" />,
        { preloadedState: createPreloadedState() }
      );

      const header = container.querySelector('.border-b');
      expect(header).toBeInTheDocument();
    });

    it('has sm:hidden class for mobile-only visibility', () => {
      const { container } = render(
        <MobilePageHeader title="Settings" />,
        { preloadedState: createPreloadedState() }
      );

      const header = container.querySelector('.sm\\:hidden');
      expect(header).toBeInTheDocument();
    });

    it('has flex layout with items centered', () => {
      const { container } = render(
        <MobilePageHeader title="Settings" />,
        { preloadedState: createPreloadedState() }
      );

      const header = container.querySelector('.flex.items-center');
      expect(header).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('close button has accessible label', () => {
      render(<MobilePageHeader title="Settings" />, {
        preloadedState: createPreloadedState(),
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toHaveAttribute('aria-label', 'Close');
    });

    it('title is rendered as h1 heading', () => {
      render(<MobilePageHeader title="Settings" />, {
        preloadedState: createPreloadedState(),
      });

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Settings');
    });

    it('close button has minimum touch target size', () => {
      const { container } = render(
        <MobilePageHeader title="Settings" />,
        { preloadedState: createPreloadedState() }
      );

      const closeButton = container.querySelector('.min-h-\\[44px\\].min-w-\\[44px\\]');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Different Content Variations', () => {
    it('renders with User icon', () => {
      const { container } = render(
        <MobilePageHeader title="Profile" icon={User} />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Profile')).toBeInTheDocument();
      const iconContainer = container.querySelector('.text-primary');
      expect(iconContainer).toBeInTheDocument();
    });

    it('renders with multiple right action buttons', () => {
      const actions = (
        <>
          <button data-testid="save-button">Save</button>
          <button data-testid="edit-button">Edit</button>
        </>
      );

      render(
        <MobilePageHeader title="Settings" rightAction={actions} />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByTestId('save-button')).toBeInTheDocument();
      expect(screen.getByTestId('edit-button')).toBeInTheDocument();
    });

    it('renders with long title', () => {
      render(
        <MobilePageHeader title="Very Long Page Title That Might Need Truncation" />,
        { preloadedState: createPreloadedState() }
      );

      expect(screen.getByText('Very Long Page Title That Might Need Truncation')).toBeInTheDocument();
    });
  });
});
